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

function normalizeDepartmentId(value: string | undefined | null) {
	const cleaned = cleanProviderValue(value);
	if (/^D[Oo]\d+$/i.test(cleaned)) {
		return `D0${cleaned.slice(2)}`;
	}
	return cleaned;
}

function normalizePhoneDigits(phone: string) {
	const digits = String(phone ?? '').replace(/\D+/g, '');
	if (digits.length < 10 || digits.length > 15) return null;
	if (env.GOVT_SMS_FORCE_COUNTRY_CODE && digits.length === 10) {
		const code = String(env.GOVT_SMS_COUNTRY_CODE || '91').replace(/\D+/g, '');
		return code ? `${code}${digits}` : digits;
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

function buildTemplatedSms(
	template: string,
	replacements: Record<string, string | number | undefined>,
	variableFallback?: string
) {
	const withNamedTokens = buildMessageTemplate(template, replacements);
	if (!variableFallback) return withNamedTokens;
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

async function sendGovtSms(payload: SmsPayload) {
	if (!hasGovtSmsConfig()) {
		logger.info({ to: payload.to, text: payload.text }, '[SMS_NOTIFICATION_DISABLED]');
		return;
	}

	const source = cleanProviderValue(env.GOVT_SMS_SOURCE);
	const departmentId = normalizeDepartmentId(env.GOVT_SMS_DEPARTMENT_ID);
	const templateId = cleanProviderValue(payload.templateId || env.GOVT_SMS_TEMPLATE_ID);
	const phone = normalizePhoneDigits(payload.to);
	if (!source || !departmentId || !templateId || !phone) {
		logger.warn(
			{ to: payload.to, hasSource: Boolean(source), hasDepartmentId: Boolean(departmentId), hasTemplateId: Boolean(templateId) },
			'[SMS_NOTIFICATION_INVALID_CONFIG]'
		);
		return;
	}

	const requestUrl = new URL(env.GOVT_SMS_API_URL);
	const params = new URLSearchParams({
		action: cleanProviderValue(payload.action || env.GOVT_SMS_DEFAULT_ACTION || 'singleSMS'),
		source,
		department_id: departmentId,
		template_id: templateId,
		sms_content: payload.text,
		phonenumber: phone
	});

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
							resolve();
							return;
						}
						reject(new Error(parsed.message || 'Govt SMS provider rejected request.'));
					} catch {
						if (/Message Send Successfully/i.test(body)) {
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
				templateId: env.GOVT_SMS_REGISTRATION_TEMPLATE_ID || env.GOVT_SMS_TEMPLATE_ID
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
	const jobs: Promise<unknown>[] = [];

	if (input.email) {
		jobs.push(sendEmailNotification({ to: input.email, subject: 'Complaint Submitted Successfully', text: emailMessage }));
	}
	if (input.mobile) {
		jobs.push(
			sendSmsNotification({
				to: input.mobile,
				text: smsMessage,
				templateId: env.GOVT_SMS_COMPLAINT_TEMPLATE_ID || env.GOVT_SMS_TEMPLATE_ID
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
	const otpTemplate = env.GOVT_SMS_OTP_CONTENT || DEFAULT_OTP_SMS_TEMPLATE;
	const smsText = buildSmsContent(otpTemplate, input.otp);
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

	await sendSmsNotification({
		to: input.identifier,
		text: smsText,
		action: env.GOVT_SMS_OTP_ACTION,
		templateId: env.GOVT_SMS_OTP_TEMPLATE_ID || env.GOVT_SMS_TEMPLATE_ID
	});
}
