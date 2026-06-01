import http from 'node:http';
import https from 'node:https';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

type NotificationChannel = 'EMAIL' | 'SMS';

type EmailPayload = {
	to: string;
	subject: string;
	text: string;
};

type SmsPayload = {
	to: string;
	text: string;
	templateId?: string;
	action?: string;
};

const DEFAULT_OTP_SMS_TEMPLATE =
	'SCPD, Govt. of Odisha: {#var#} is your OTP for login to SCPD Portal. Valid for 15 minutes only. Do not disclose it to anyone. For assistance call 0674-2954518.';
const DEFAULT_REGISTRATION_SMS_TEMPLATE =
	'SCPD, Govt. of Odisha: Your registration on the SCPD Portal has been completed successfully. You may now login using your registered credentials to access services. For assistance call 0674-2954518.';
const DEFAULT_COMPLAINT_SMS_TEMPLATE =
	'SCPD, Govt. of Odisha: Your complaint has been successfully submitted on SCPD Portal. It will be reviewed and necessary action will be taken. For assistance call 0674-2954518.';
const DEFAULT_OTP_EMAIL_TEMPLATE = `Dear Citizen,

{OTP} is your One Time Password (OTP) for login to the SCPD Portal. This OTP is confidential and valid for 15 minutes. You are advised not to share it with anyone. If you have not requested this OTP, please ignore this email.

For any assistance, you may contact: Phone: 0674-2954518

Regards,
State Commissioner for Persons with Disabilities (SCPD)
Government of Odisha`;
const DEFAULT_REGISTRATION_EMAIL_TEMPLATE = `Dear Citizen,

Greetings from the State Commissioner for Persons with Disabilities (SCPD), Government of Odisha.
This is to inform you that your registration on the SCPD Portal has been successfully completed. You may now log in to the portal using your registered credentials to access the services available.
You are advised to keep your login credentials confidential and not share them with any unauthorized person.
If you have not performed this registration, you are requested to contact the office immediately.

For any assistance, you may contact: Phone: 0674-2954518

Regards,
State Commissioner for Persons with Disabilities (SCPD)
Government of Odisha`;
const DEFAULT_COMPLAINT_EMAIL_TEMPLATE = `Dear Citizen,

Greetings from the State Commissioner for Persons with Disabilities (SCPD), Government of Odisha.
This is to acknowledge that your grievance has been successfully received on the SCPD Portal. The concerned authority will examine your submission and take necessary action per the applicable procedures.
You will be informed of further updates in due course. as If you have not submitted this grievance, you are advised to contact the office immediately.

For any assistance, you may contact: Phone: 0674-2954518

Regards,
State Commissioner for Persons with Disabilities (SCPD)
Government of Odisha`;

let emailTransport: any | null | undefined;

function maskEmail(value: string) {
	const [local, domain] = value.split('@');
	if (!domain) return value;
	if (local.length <= 2) return `**@${domain}`;
	return `${local.slice(0, 2)}***@${domain}`;
}

function maskMobile(value: string) {
	const digits = value.replace(/\D/g, '');
	if (digits.length <= 4) return '****';
	return `${'*'.repeat(Math.max(digits.length - 4, 2))}${digits.slice(-4)}`;
}

function cleanProviderValue(value: string | undefined | null) {
	return String(value ?? '')
		.trim()
		.replace(/^['"]+|['"]+$/g, '');
}

function toSingleLine(value: string, limit = 300) {
	return value.replace(/\s+/g, ' ').trim().slice(0, limit);
}

function normalizeDepartmentId(value: string | undefined | null) {
	const cleaned = cleanProviderValue(value);
	if (/^D[Oo]\d+$/i.test(cleaned)) {
		return `D0${cleaned.slice(2)}`;
	}
	return cleaned;
}

function getGovtSmsSourceCandidates() {
	const forced = cleanProviderValue(env.GOVT_SMS_FORCE_SOURCE);
	const primary = forced || cleanProviderValue(env.GOVT_SMS_SOURCE);
	const fallbacks = String(env.GOVT_SMS_SOURCE_FALLBACKS ?? '')
		.split(',')
		.map((value) => cleanProviderValue(value))
		.filter(Boolean);
	return Array.from(new Set([primary, ...fallbacks].filter(Boolean)));
}

function isSenderDeptTemplateMismatchError(message: string) {
	return /Sender\s*Id,\s*department\s*id\s*&\s*template\s*id\s*is\s*not\s*match/i.test(String(message || ''));
}

function normalizePhoneDigits(phone: string) {
	let digits = String(phone ?? '').replace(/\D+/g, '');
	if (digits.length < 10 || digits.length > 15) return null;

	const forceCountryCode = Boolean(env.GOVT_SMS_FORCE_COUNTRY_CODE);
	const stripCountryCode = Boolean(env.GOVT_SMS_STRIP_COUNTRY_CODE);
	const countryCode = String(env.GOVT_SMS_COUNTRY_CODE || '91').replace(/\D+/g, '').trim();

	// Normalize common entered patterns:
	// 0091XXXXXXXXXX -> 91XXXXXXXXXX
	// 0XXXXXXXXXX -> XXXXXXXXXX
	// 091XXXXXXXXXX -> 91XXXXXXXXXX
	if (digits.startsWith('00') && digits.length >= 12) {
		digits = digits.slice(2);
	}
	if (digits.startsWith('0') && digits.length === 11) {
		digits = digits.slice(1);
	}
	if (countryCode && digits.length === countryCode.length + 11 && digits.startsWith(`0${countryCode}`)) {
		digits = digits.slice(1);
	}

	// For Indian DLT routes, 10-digit recipient numbers are usually expected.
	if (!forceCountryCode && stripCountryCode && countryCode && digits.length === countryCode.length + 10 && digits.startsWith(countryCode)) {
		return digits.slice(countryCode.length);
	}

	if (forceCountryCode && digits.length === 10) {
		return countryCode ? `${countryCode}${digits}` : digits;
	}

	// Guard malformed lengths for Indian local delivery when strip mode is enabled.
	if (!forceCountryCode && stripCountryCode && countryCode === '91' && digits.length !== 10) {
		return null;
	}

	return digits;
}

function buildSmsContent(template: string, value?: string) {
	if (!value) return template;
	if (template.includes('{#var#}')) {
		return template.replace('{#var#}', value);
	}
	return `${template} ${value}`.trim();
}

function hasLegacySmsVariableToken(template: string) {
	return /\{#\s*var\s*#\}/i.test(template) || /#\s*numeric\s*#/i.test(template) || /#\s*number\s*#/i.test(template);
}

function getGovtSmsOtpTemplate() {
	const configured = cleanProviderValue(env.GOVT_SMS_OTP_CONTENT);
	if (!configured) return DEFAULT_OTP_SMS_TEMPLATE;

	const trimmed = String(configured).trim();
	const hasOtpToken = /\{#\s*var\s*#\}/i.test(trimmed) || /#\s*numeric\s*#/i.test(trimmed) || /#\s*number\s*#/i.test(trimmed);

	if (!hasOtpToken && /:\s*\{\s*$/.test(trimmed)) {
		logger.warn('[GOVT_SMS] GOVT_SMS_OTP_CONTENT appears truncated; using default OTP template.');
		return DEFAULT_OTP_SMS_TEMPLATE;
	}

	return configured;
}

function buildGovtSmsOtpContent(code: string) {
	const template = getGovtSmsOtpTemplate();
	const otp = String(code || '').trim();
	const replaced = template
		.replace(/\{#\s*var\s*#\}/gi, otp)
		.replace(/#\s*numeric\s*#/gi, otp)
		.replace(/#\s*number\s*#/gi, otp);
	if (replaced !== template) return replaced;
	return `${template} ${otp}`.trim();
}

function buildTemplatedSms(
	template: string,
	replacements: Record<string, string | number | undefined>,
	variableFallback?: string
) {
	const withNamedTokens = buildMessageTemplate(template, replacements);
	if (!variableFallback) return withNamedTokens;
	// Only apply fallback when template uses legacy DLT variable placeholders.
	// This avoids appending extra text that can cause template mismatch downstream.
	if (!hasLegacySmsVariableToken(template)) return withNamedTokens;
	return buildSmsContent(withNamedTokens, variableFallback);
}

function buildMessageTemplate(template: string, replacements: Record<string, string | number | undefined>) {
	let text = template;
	for (const [token, rawValue] of Object.entries(replacements)) {
		text = text.split(`{${token}}`).join(String(rawValue ?? ''));
	}
	return text;
}

function getEmailTransport() {
	if (emailTransport !== undefined) return emailTransport;
	if (!env.SMTP_HOST || !env.SMTP_FROM) {
		emailTransport = null;
		return emailTransport;
	}

	emailTransport = nodemailer.createTransport({
		host: env.SMTP_HOST,
		port: env.SMTP_PORT,
		secure: env.SMTP_PORT === 465,
		requireTLS: env.SMTP_REQUIRE_TLS,
		auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
	});
	return emailTransport;
}

function hasGovtSmsConfig() {
	return Boolean(env.GOVT_SMS_SOURCE && env.GOVT_SMS_DEPARTMENT_ID);
}

export function inferNotificationChannel(identifier: string): NotificationChannel {
	return identifier.includes('@') ? 'EMAIL' : 'SMS';
}

export function maskRecipient(identifier: string, channel: NotificationChannel) {
	return channel === 'EMAIL' ? maskEmail(identifier) : maskMobile(identifier);
}

async function postWebhook(url: string, payload: Record<string, string>, channel: NotificationChannel) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), env.NOTIFICATION_WEBHOOK_TIMEOUT_MS);
	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload),
			signal: controller.signal
		});
		if (!response.ok) {
			const body = await response.text().catch(() => '');
			throw new Error(`${channel} webhook failed with status ${response.status}. ${body}`.trim());
		}
	} finally {
		clearTimeout(timer);
	}
}

async function sendGovtSmsMessage(payload: SmsPayload & { sourceOverride?: string }) {
	const source = cleanProviderValue(payload.sourceOverride || env.GOVT_SMS_SOURCE);
	const departmentId = normalizeDepartmentId(env.GOVT_SMS_DEPARTMENT_ID);
	const templateId = cleanProviderValue(payload.templateId || env.GOVT_SMS_TEMPLATE_ID);
	const phone = normalizePhoneDigits(payload.to);
	const action = cleanProviderValue(payload.action || env.GOVT_SMS_DEFAULT_ACTION || 'singleSMS');
	if (!source || !departmentId || !templateId || !phone) {
		logger.warn(
			{
				to: payload.to,
				hasSource: Boolean(source),
				hasDepartmentId: Boolean(departmentId),
				hasTemplateId: Boolean(templateId),
				hasPhone: Boolean(phone)
			},
			'[SMS_NOTIFICATION_INVALID_CONFIG]'
		);
		throw new Error('Govt SMS configuration is invalid or phone format is unsupported.');
	}

	if (env.SMS_DELIVERY_DEBUG_LOG) {
		logger.info(
			{
				destination: maskMobile(phone),
				phoneLength: phone.length,
				countryCodePrefixed: phone.startsWith(String(env.GOVT_SMS_COUNTRY_CODE || '91').replace(/\D+/g, '')),
				action,
				source,
				departmentId,
				templateId
			},
			'[SMS_NOTIFICATION_ATTEMPT]'
		);
	}

	const requestUrl = new URL(env.GOVT_SMS_API_URL);
	const params = new URLSearchParams({
		action,
		source,
		department_id: departmentId,
		template_id: templateId,
		sms_content: payload.text,
		phonenumber: phone
	});
	if (/\{#\s*var\s*#\}/i.test(String(payload.text)) || /#\s*numeric\s*#/i.test(String(payload.text)) || /#\s*number\s*#/i.test(String(payload.text))) {
		throw new Error('OTP placeholder was not replaced in GOVT_SMS_OTP_CONTENT.');
	}

	await new Promise<void>((resolve, reject) => {
		const transport = requestUrl.protocol === 'http:' ? http : https;
		const request = transport.request(
			{
				method: 'POST',
				hostname: requestUrl.hostname,
				port: requestUrl.port || undefined,
				path: `${requestUrl.pathname}${requestUrl.search || ''}`,
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Content-Length': Buffer.byteLength(params.toString())
				}
			},
			(response) => {
				let body = '';
				response.on('data', (chunk) => {
					body += chunk;
				});
				response.on('end', () => {
					if (!(response.statusCode && response.statusCode >= 200 && response.statusCode < 300)) {
						reject(new Error(`Govt SMS failed: ${response.statusCode || 'unknown'} ${body}`));
						return;
					}
					try {
						const parsed = JSON.parse(body || '{}');
						if (String(parsed.status) === '1') {
							logger.info(
								{
									destination: maskMobile(phone),
									action,
									templateId,
									statusCode: response.statusCode,
									providerStatus: String(parsed.status),
									providerMessage: toSingleLine(String(parsed.message ?? ''))
								},
								'[SMS_NOTIFICATION_SENT]'
							);
							resolve();
							return;
						}
						reject(new Error(parsed.message || 'Govt SMS provider rejected request.'));
					} catch {
						if (/Message Send Successfully/i.test(body)) {
							logger.info(
								{
									destination: maskMobile(phone),
									action,
									templateId,
									statusCode: response.statusCode,
									providerBody: toSingleLine(body)
								},
								'[SMS_NOTIFICATION_SENT]'
							);
							resolve();
							return;
						}
						reject(new Error(`Govt SMS returned unexpected response: ${body}`));
					}
				});
			}
		);

		request.on('error', reject);
		request.write(params.toString());
		request.end();
	});
}

async function sendGovtSms(payload: SmsPayload) {
	if (!hasGovtSmsConfig()) {
		logger.info({ to: payload.to, text: payload.text }, '[SMS_NOTIFICATION_DISABLED]');
		return;
	}

	const candidates = getGovtSmsSourceCandidates();
	if (!candidates.length) {
		throw new Error('Govt SMS OTP is not configured. Set GOVT_SMS_SOURCE.');
	}

	let lastError: unknown = null;
	for (let index = 0; index < candidates.length; index += 1) {
		const sourceCandidate = candidates[index];
		try {
			await sendGovtSmsMessage({ ...payload, sourceOverride: sourceCandidate });
			return;
		} catch (error) {
			lastError = error;
			const canRetrySource =
				index < candidates.length - 1 &&
				isSenderDeptTemplateMismatchError(error instanceof Error ? error.message : String(error));
			if (!canRetrySource) {
				throw error;
			}
			logger.warn(
				{
					source: sourceCandidate,
					reason: error instanceof Error ? error.message : String(error)
				},
				'[GOVT_SMS_SOURCE_RETRY]'
			);
		}
	}

	throw (lastError as Error) || new Error('Govt SMS provider rejected request.');
}

function logNotificationFailures(
	results: PromiseSettledResult<unknown>[],
	context: { type: string; toEmail?: string | null; toMobile?: string | null; ref?: string }
) {
	const errors = results
		.filter((result): result is PromiseRejectedResult => result.status === 'rejected')
		.map((result) => String(result.reason));
	if (errors.length === 0) return;
	logger.warn({ ...context, errors }, '[NOTIFICATION_DELIVERY_FAILED]');
}

export async function sendEmailNotification(payload: EmailPayload) {
	if (env.EMAIL_NOTIFICATION_WEBHOOK_URL) {
		await postWebhook(env.EMAIL_NOTIFICATION_WEBHOOK_URL, payload, 'EMAIL');
		return;
	}

	const transport = getEmailTransport();
	if (!transport || !env.SMTP_FROM) {
		logger.info({ to: payload.to, subject: payload.subject, text: payload.text }, '[EMAIL_NOTIFICATION_DISABLED]');
		return;
	}

	await transport.sendMail({
		from: env.SMTP_FROM,
		to: payload.to,
		subject: payload.subject,
		text: payload.text
	});
}

export async function sendSmsNotification(payload: SmsPayload) {
	if (env.SMS_NOTIFICATION_WEBHOOK_URL) {
		await postWebhook(env.SMS_NOTIFICATION_WEBHOOK_URL, { to: payload.to, text: payload.text }, 'SMS');
		return;
	}

	await sendGovtSms(payload);
}

export async function sendRegistrationSuccessNotification(input: {
	name: string;
	email?: string | null;
	mobile?: string | null;
	registrationNo?: string | null;
}) {
	const smsTemplate = env.GOVT_SMS_REGISTRATION_CONTENT || DEFAULT_REGISTRATION_SMS_TEMPLATE;
	const smsMessage = buildTemplatedSms(
		smsTemplate,
		{
			NAME: input.name,
			REGISTRATION_NO: input.registrationNo ?? ''
		},
		input.registrationNo ?? undefined
	);
	const emailTemplate = env.EMAIL_REGISTRATION_CONTENT || DEFAULT_REGISTRATION_EMAIL_TEMPLATE;
	const emailMessage = buildMessageTemplate(emailTemplate, {
		NAME: input.name,
		REGISTRATION_NO: input.registrationNo ?? ''
	});

	const jobs: Promise<unknown>[] = [];
	if (input.email) {
		jobs.push(sendEmailNotification({ to: input.email, subject: 'Registration Successful', text: emailMessage }));
	}
	if (input.mobile) {
		jobs.push(
			sendSmsNotification({
				to: input.mobile,
				text: smsMessage,
				templateId: env.GOVT_SMS_REGISTRATION_TEMPLATE_ID || env.GOVT_SMS_TEMPLATE_ID,
				action: env.GOVT_SMS_REGISTRATION_ACTION || env.GOVT_SMS_DEFAULT_ACTION || 'singleSMS'
			})
		);
	}
	const results = await Promise.allSettled(jobs);
	logNotificationFailures(results, {
		type: 'registration_success',
		toEmail: input.email,
		toMobile: input.mobile,
		ref: input.registrationNo ?? undefined
	});
}

export async function sendComplaintSubmittedNotification(input: {
	name: string;
	email?: string | null;
	mobile?: string | null;
	referenceNo: string;
	subject: string;
}) {
	const smsTemplate = env.GOVT_SMS_COMPLAINT_CONTENT || DEFAULT_COMPLAINT_SMS_TEMPLATE;
	const smsMessage = buildTemplatedSms(
		smsTemplate,
		{
			NAME: input.name,
			REFERENCE_NO: input.referenceNo,
			SUBJECT: input.subject
		},
		input.referenceNo
	);
	const emailTemplate = env.EMAIL_COMPLAINT_CONTENT || DEFAULT_COMPLAINT_EMAIL_TEMPLATE;
	const emailMessage = buildMessageTemplate(emailTemplate, {
		NAME: input.name,
		REFERENCE_NO: input.referenceNo,
		SUBJECT: input.subject
	});

	if (env.SMS_DELIVERY_DEBUG_LOG) {
		logger.info(
			{
				referenceNo: input.referenceNo,
				templateId: env.GOVT_SMS_COMPLAINT_TEMPLATE_ID || env.GOVT_SMS_TEMPLATE_ID,
				renderedSms: toSingleLine(smsMessage, 240)
			},
			'[COMPLAINT_SMS_TEMPLATE_RENDERED]'
		);
	}
	const jobs: Promise<unknown>[] = [];

	if (input.email) {
		jobs.push(sendEmailNotification({ to: input.email, subject: 'Complaint Submitted Successfully', text: emailMessage }));
	}
	if (input.mobile) {
		jobs.push(
			sendSmsNotification({
				to: input.mobile,
				text: smsMessage,
				templateId: env.GOVT_SMS_COMPLAINT_TEMPLATE_ID || env.GOVT_SMS_TEMPLATE_ID,
				action: env.GOVT_SMS_COMPLAINT_ACTION || env.GOVT_SMS_DEFAULT_ACTION || 'singleSMS'
			})
		);
	}

	const results = await Promise.allSettled(jobs);
	logNotificationFailures(results, {
		type: 'complaint_submitted',
		toEmail: input.email,
		toMobile: input.mobile,
		ref: input.referenceNo
	});
}

export async function sendCaseCreatedNotification(input: {
	name: string;
	email?: string | null;
	mobile?: string | null;
	caseYear: number;
	registrationNo: string;
	subject: string;
}) {
	const message = `Case created successfully. Year: ${input.caseYear}, Registration No: ${input.registrationNo}, Subject: ${input.subject}.`;
	const jobs: Promise<unknown>[] = [];

	if (input.email) {
		jobs.push(sendEmailNotification({ to: input.email, subject: 'Case Created Successfully', text: `Dear ${input.name}, ${message}` }));
	}
	if (input.mobile) {
		jobs.push(sendSmsNotification({ to: input.mobile, text: message, templateId: env.GOVT_SMS_TEMPLATE_ID }));
	}

	const results = await Promise.allSettled(jobs);
	logNotificationFailures(results, {
		type: 'case_created',
		toEmail: input.email,
		toMobile: input.mobile,
		ref: input.registrationNo
	});
}

export async function sendLoginOtp(input: {
	channel: NotificationChannel;
	identifier: string;
	otp: string;
	expiresInSeconds: number;
}) {
	const smsText = buildGovtSmsOtpContent(input.otp);
	const emailTemplate = env.EMAIL_OTP_CONTENT || DEFAULT_OTP_EMAIL_TEMPLATE;
	const emailText = buildMessageTemplate(emailTemplate, {
		OTP: input.otp,
		EXPIRES_MINUTES: Math.ceil(input.expiresInSeconds / 60)
	});

	if (input.channel === 'EMAIL') {
		await sendEmailNotification({
			to: input.identifier,
			subject: 'Your Login OTP',
			text: emailText
		});
		return;
	}

	const primaryAction = cleanProviderValue(env.GOVT_SMS_OTP_ACTION || env.GOVT_SMS_DEFAULT_ACTION || 'singleSMS') || 'singleSMS';
	const secondaryAction = 'singleSMS';
	const shouldSendSecondary = Boolean(env.GOVT_SMS_OTP_SEND_BOTH_ACTIONS);
	if (env.SMS_DELIVERY_DEBUG_LOG) {
		logger.info(
			{
				destination: maskMobile(input.identifier),
				primaryAction,
				secondaryAction,
				shouldSendSecondary
			},
			'[OTP_SMS_ACTION_PLAN]'
		);
	}

	try {
		await sendSmsNotification({
			to: input.identifier,
			text: smsText,
			action: primaryAction,
			templateId: env.GOVT_SMS_OTP_TEMPLATE_ID || env.GOVT_SMS_TEMPLATE_ID
		});
	} catch (error) {
		if (primaryAction.toLowerCase() !== secondaryAction.toLowerCase()) {
			logger.warn(
				{
					destination: maskMobile(input.identifier),
					primaryAction,
					secondaryAction,
					reason: error instanceof Error ? error.message : String(error)
				},
				'[OTP_SMS_PRIMARY_ACTION_FAILED_RETRYING]'
			);
			await sendSmsNotification({
				to: input.identifier,
				text: smsText,
				action: secondaryAction,
				templateId: env.GOVT_SMS_OTP_TEMPLATE_ID || env.GOVT_SMS_TEMPLATE_ID
			});
			return;
		}
		throw error;
	}

	if (!shouldSendSecondary || primaryAction.toLowerCase() === secondaryAction.toLowerCase()) {
		return;
	}

	try {
		await sendSmsNotification({
			to: input.identifier,
			text: smsText,
			action: secondaryAction,
			templateId: env.GOVT_SMS_OTP_TEMPLATE_ID || env.GOVT_SMS_TEMPLATE_ID
		});
		logger.info(
			{
				destination: maskMobile(input.identifier),
				primaryAction,
				secondaryAction
			},
			'[OTP_SMS_SECONDARY_ACTION_SENT]'
		);
	} catch (error) {
		logger.warn(
			{
				destination: maskMobile(input.identifier),
				primaryAction,
				secondaryAction,
				reason: error instanceof Error ? error.message : String(error)
			},
			'[OTP_SMS_SECONDARY_ACTION_FAILED]'
		);
	}
}
