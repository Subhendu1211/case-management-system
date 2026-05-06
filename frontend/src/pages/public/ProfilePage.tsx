import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { Input } from '../../components/Input';
import { useMe } from '../../lib/queries/auth.queries';
import { useProfile, useSaveProfile } from '../../lib/queries/profile.queries';
import { districts } from '../../lib/constants/districts';
import type { Gender, PublicRegistrationCreate } from '../../lib/types';
import { t, useLang } from '../../i18n';

const selectCls =
	'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/20 hover:border-neutral-400';

const textareaCls =
	'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/20 hover:border-neutral-400 resize-none';

function SectionHeader({ step, label, icon }: { step: number; label: string; icon: string }) {
	return (
		<div className="mb-5 flex items-center gap-3">
			<div
				className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
				style={{ background: 'rgb(var(--color-gov-blue))' }}
			>
				{step}
			</div>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				strokeWidth={1.7}
				stroke="currentColor"
				className="h-4 w-4 flex-shrink-0"
				style={{ color: 'rgb(var(--color-gov-blue))' }}
			>
				<path strokeLinecap="round" strokeLinejoin="round" d={icon} />
			</svg>
			<span className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-gov-blue))' }}>
				{label}
			</span>
			<div className="h-px flex-1 bg-neutral-200" />
		</div>
	);
}

function QuickAction({
	label,
	sublabel,
	to,
	icon,
	cls
}: {
	label: string;
	sublabel: string;
	to: string;
	icon: string;
	cls: string;
}) {
	return (
		<Link
			to={to}
			className={`flex items-start gap-3 rounded-xl border p-4 transition-all hover:shadow-sm ${cls}`}
		>
			<div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/60">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					strokeWidth={1.7}
					stroke="currentColor"
					className="h-4 w-4"
				>
					<path strokeLinecap="round" strokeLinejoin="round" d={icon} />
				</svg>
			</div>
			<div className="min-w-0 flex-1">
				<div className="text-sm font-semibold">{label}</div>
				<div className="mt-0.5 text-xs opacity-70">{sublabel}</div>
			</div>
			<svg
				className="ml-auto mt-1 h-4 w-4 flex-shrink-0 opacity-40"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				strokeWidth={2}
			>
				<path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
			</svg>
		</Link>
	);
}

function getInitials(name: string): string {
	return name
		.split(' ')
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0].toUpperCase())
		.join('');
}

function calcCompletion(form: PublicRegistrationCreate): number {
	const fields: (keyof PublicRegistrationCreate)[] = [
		'fullName', 'email', 'mobile', 'gender', 'dateOfBirth',
		'guardianName', 'addressLine1', 'state', 'district', 'pinCode'
	];
	const filled = fields.filter((f) => {
		const v = form[f];
		return v !== null && v !== undefined && String(v).trim() !== '';
	}).length;
	return Math.round((filled / fields.length) * 100);
}

export function ProfilePage() {
	const lang = useLang();
	const locale = lang === 'or' ? 'or-IN' : 'en-IN';
	const me = useMe();
	const profile = useProfile();
	const saveProfile = useSaveProfile();
	const [saved, setSaved] = useState(false);
	const [hover, setHover] = useState(false);

	const genders: { value: Gender; label: string }[] = useMemo(
		() => [
			{ value: 'MALE', label: t('profile.gender.male') },
			{ value: 'FEMALE', label: t('profile.gender.female') },
			{ value: 'OTHER', label: t('profile.gender.other') }
		],
		[lang]
	);

	const navItems = [
		{ to: '/profile', label: t('profile.nav.profile') },
		{ to: '/complaints', label: t('profile.nav.complaints') },
		{ to: '/cases', label: t('profile.nav.cases') }
	];

	const [form, setForm] = useState<PublicRegistrationCreate>({
		fullName: '',
		email: me.data?.user.email ?? '',
		mobile: '',
		alternateMobile: '',
		dateOfBirth: '',
		guardianName: '',
		gender: null,
		addressLine1: '',
		addressLine2: '',
		state: 'Odisha',
		district: districts[0] ?? '',
		pinCode: ''
	});
	const [errors, setErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		if (!profile.data) return;
		setForm({
			fullName: profile.data.fullName ?? '',
			email: profile.data.email ?? me.data?.user.email ?? '',
			mobile: profile.data.mobile ?? '',
			alternateMobile: profile.data.alternateMobile ?? '',
			dateOfBirth: profile.data.dateOfBirth ? profile.data.dateOfBirth.slice(0, 10) : '',
			guardianName: profile.data.guardianName ?? '',
			gender: profile.data.gender ?? null,
			addressLine1: profile.data.addressLine1 ?? '',
			addressLine2: profile.data.addressLine2 ?? '',
			state: profile.data.state ?? 'Odisha',
			district: profile.data.district ?? districts[0] ?? '',
			pinCode: profile.data.pinCode ?? ''
		});
	}, [profile.data, me.data?.user.email]);

	const disabled = useMemo(() => saveProfile.isPending, [saveProfile.isPending]);
	const completion = calcCompletion(form);
	const firstName = form.fullName?.split(' ')[0] || me.data?.user?.name?.split(' ')[0] || t('profile.fallbackName');
	const initials = getInitials(form.fullName || me.data?.user?.name || t('profile.fallbackInitials'));

	const updateField = (key: keyof PublicRegistrationCreate, value: string | null) => {
		setForm((prev) => ({ ...prev, [key]: value }));
		setSaved(false);
	};

	const validate = () => {
		const next: Record<string, string> = {};
		if (!form.fullName.trim()) next.fullName = t('profile.errors.fullName');
		if (!form.email.trim()) next.email = t('profile.errors.email');
		if (!form.mobile.trim()) next.mobile = t('profile.errors.mobile');
		if (!form.gender) next.gender = t('profile.errors.gender');
		if (!form.addressLine1.trim()) next.addressLine1 = t('profile.errors.address1');
		if (!form.state.trim()) next.state = t('profile.errors.state');
		if (!form.district.trim()) next.district = t('profile.errors.district');
		if (!form.pinCode.trim()) next.pinCode = t('profile.errors.pin');
		setErrors(next);
		return Object.keys(next).length === 0;
	};

	const onSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setSaved(false);
		if (!validate()) return;
		try {
			await saveProfile.mutateAsync({
				...form,
				alternateMobile: form.alternateMobile?.trim() || undefined,
				dateOfBirth: form.dateOfBirth?.toString().trim() || undefined,
				guardianName: form.guardianName?.trim() || undefined,
				addressLine2: form.addressLine2?.trim() || undefined
			});
			setSaved(true);
		} catch (err: any) {
			setErrors({ form: err?.message ?? t('profile.errors.form') });
		}
	};

	const completionColor =
		completion >= 80 ? '#059669' : completion >= 50 ? '#d97706' : '#dc2626';

	return (
		<AppShell title={t('profile.title')} nav={navItems}>
			{/* Welcome Banner */}
			<div
				className="mb-6 overflow-hidden rounded-xl px-6 py-5 text-white"
				style={{ background: 'linear-gradient(135deg, rgb(var(--color-gov-blue)) 0%, rgb(15 36 105) 100%)' }}
			>
				<div className="flex flex-wrap items-center gap-4">
					{/* Avatar */}
					<div
						className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border-2 border-white/30 text-lg font-bold"
						style={{ background: 'rgba(255,255,255,0.15)' }}
					>
						{initials}
					</div>

					<div className="flex-1">
						<p className="text-xs font-semibold uppercase tracking-widest text-white/60">
							{new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
						</p>
						<h2 className="mt-0.5 text-xl font-bold">{t('profile.welcome', { name: firstName })}</h2>
						<p className="mt-0.5 text-sm text-white/70">
							{t('profile.portalLine')}
						</p>
					</div>

					{/* Registration badge */}
					{profile.data?.registrationNo && (
						<div className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth={1.7}
								stroke="currentColor"
								className="h-4 w-4 text-yellow-300"
							>
								<path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
							</svg>
							<div>
								<div className="text-xs text-white/60">{t('profile.registration.label')}</div>
								<div className="text-sm font-bold text-yellow-300">{profile.data.registrationNo}</div>
							</div>
						</div>
					)}
				</div>

				{/* Profile Completion Bar */}
				<div className="mt-5">
					<div className="mb-1.5 flex items-center justify-between">
						<span className="text-xs font-medium text-white/70">{t('profile.completion.label')}</span>
						<span className="text-xs font-bold text-white">{completion}%</span>
					</div>
					<div className="h-1.5 w-full rounded-full bg-white/20">
						<div
							className="h-1.5 rounded-full transition-all duration-500"
							style={{ width: `${completion}%`, background: completionColor }}
						/>
					</div>
					{completion < 100 && (
						<p className="mt-1 text-xs text-white/50">
							{t('profile.completion.tip')}
						</p>
					)}
				</div>
			</div>

			{/* Quick Actions */}
			<div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
				<QuickAction
					label={t('profile.quickActions.fileComplaint.label')}
					sublabel={t('profile.quickActions.fileComplaint.sublabel')}
					to="/complaints/new"
					icon="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
					cls="text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100"
				/>
				<QuickAction
					label={t('profile.quickActions.myComplaints.label')}
					sublabel={t('profile.quickActions.myComplaints.sublabel')}
					to="/complaints"
					icon="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
					cls="text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100"
				/>
				<QuickAction
					label={t('profile.quickActions.myCases.label')}
					sublabel={t('profile.quickActions.myCases.sublabel')}
					to="/cases"
					icon="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
					cls="text-teal-700 border-teal-200 bg-teal-50 hover:bg-teal-100"
				/>
			</div>

			{/* Profile Form Card */}
			<div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
				{/* Card header */}
				<div
					className="flex items-center gap-3 rounded-t-xl px-6 py-4"
					style={{ background: 'rgb(var(--color-gov-blue))' }}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={1.7}
						stroke="currentColor"
						className="h-5 w-5 text-white/80"
					>
						<path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
					<div>
						<h2 className="text-sm font-bold text-white">{t('profile.card.title')}</h2>
						<p className="text-xs text-white/60">{t('profile.card.subtitle')}</p>
					</div>
				</div>

				<form className="p-6" onSubmit={onSubmit}>
					{/* Success notice */}
					{saved && (
						<div className="mb-5 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
							<svg className="h-4 w-4 flex-shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							{t('profile.success')}
						</div>
					)}

					{/* Section 1: Personal Information */}
					<SectionHeader
						step={1}
						label={t('profile.sections.personal')}
						icon="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
					/>

					<div className="mb-6 grid gap-4 md:grid-cols-2">
						<Input
							label={t('profile.fields.fullName')}
							required
							value={form.fullName}
							onChange={(e) => updateField('fullName', e.target.value)}
							error={errors.fullName}
							placeholder={t('profile.placeholders.fullName')}
						/>
						<Input
							label={t('profile.fields.email')}
							type="email"
							required
							value={form.email}
							onChange={(e) => updateField('email', e.target.value)}
							error={errors.email}
							placeholder={t('profile.placeholders.email')}
						/>
						<Input
							label={t('profile.fields.mobile')}
							required
							value={form.mobile}
							onChange={(e) => updateField('mobile', e.target.value)}
							error={errors.mobile}
							placeholder={t('profile.placeholders.mobile')}
						/>
						<Input
							label={t('profile.fields.altMobile')}
							value={form.alternateMobile ?? ''}
							onChange={(e) => updateField('alternateMobile', e.target.value)}
							placeholder={t('profile.placeholders.altMobile')}
						/>
						<Input
							label={t('profile.fields.dob')}
							type="date"
							value={form.dateOfBirth ?? ''}
							onChange={(e) => updateField('dateOfBirth', e.target.value)}
						/>
						<Input
							label={t('profile.fields.guardian')}
							value={form.guardianName ?? ''}
							onChange={(e) => updateField('guardianName', e.target.value)}
							placeholder={t('profile.placeholders.guardian')}
						/>

						{/* Gender Select */}
						<label className="block">
							<div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">
								{t('profile.fields.gender')} <span className="text-red-500">*</span>
							</div>
							<select
								className={selectCls}
								value={form.gender ?? ''}
								onChange={(e) => updateField('gender', e.target.value || null)}
							>
								<option value="">{t('profile.fields.genderPlaceholder')}</option>
								{genders.map((g) => (
									<option key={g.value} value={g.value}>
										{g.label}
									</option>
								))}
							</select>
							{errors.gender && (
								<div className="mt-1 flex items-center gap-1 text-xs text-red-600">
									<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
										<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
									</svg>
									{errors.gender}
								</div>
							)}
						</label>
					</div>

					{/* Section 2: Address Details */}
					<SectionHeader
						step={2}
						label={t('profile.sections.address')}
						icon="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
					/>

					<div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4">
						<div className="grid gap-4 md:grid-cols-2">
							{/* Address Line 1 */}
							<label className="block md:col-span-2">
								<div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">
									{t('profile.fields.address1')} <span className="text-red-500">*</span>
								</div>
								<textarea
									className={`${textareaCls} min-h-[72px]`}
									value={form.addressLine1}
									onChange={(e) => updateField('addressLine1', e.target.value)}
									placeholder={t('profile.placeholders.address1')}
								/>
								{errors.addressLine1 && (
									<div className="mt-1 flex items-center gap-1 text-xs text-red-600">
										<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
											<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
										</svg>
										{errors.addressLine1}
									</div>
								)}
							</label>

							{/* Address Line 2 */}
							<label className="block md:col-span-2">
								<div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">
									{t('profile.fields.address2')}
								</div>
								<textarea
									className={`${textareaCls} min-h-[52px]`}
									value={form.addressLine2 ?? ''}
									onChange={(e) => updateField('addressLine2', e.target.value)}
									placeholder={t('profile.placeholders.address2')}
								/>
							</label>

							{/* State */}
							<label className="block">
								<div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">
									{t('profile.fields.state')} <span className="text-red-500">*</span>
								</div>
								<input
									className={selectCls}
									value={form.state}
									onChange={(e) => updateField('state', e.target.value)}
								/>
								{errors.state && (
									<div className="mt-1 flex items-center gap-1 text-xs text-red-600">
										<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
											<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
										</svg>
										{errors.state}
									</div>
								)}
							</label>

							{/* District */}
							<label className="block">
								<div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">
									{t('profile.fields.district')} <span className="text-red-500">*</span>
								</div>
								<select
									className={selectCls}
									value={form.district}
									onChange={(e) => updateField('district', e.target.value)}
								>
									<option value="">{t('profile.fields.districtPlaceholder')}</option>
									{districts.map((d) => (
										<option key={d} value={d}>
											{d}
										</option>
									))}
								</select>
								{errors.district && (
									<div className="mt-1 flex items-center gap-1 text-xs text-red-600">
										<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
											<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
										</svg>
										{errors.district}
									</div>
								)}
							</label>

							{/* PIN Code */}
							<label className="block">
								<div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">
									{t('profile.fields.pin')} <span className="text-red-500">*</span>
								</div>
								<input
									className={selectCls}
									value={form.pinCode}
									onChange={(e) => updateField('pinCode', e.target.value)}
									placeholder={t('profile.placeholders.pin')}
									maxLength={6}
								/>
								{errors.pinCode && (
									<div className="mt-1 flex items-center gap-1 text-xs text-red-600">
										<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
											<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
										</svg>
										{errors.pinCode}
									</div>
								)}
							</label>
						</div>
					</div>

					{/* Form-level error */}
					{errors.form && (
						<div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
							<svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
							</svg>
							{errors.form}
						</div>
					)}

					{/* Submit */}
					<div className="mt-6 flex items-center gap-3 border-t border-neutral-100 pt-5">
						<button
							type="submit"
							disabled={disabled}
							onMouseEnter={() => setHover(true)}
							onMouseLeave={() => setHover(false)}
							className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-60"
							style={{
								background: hover && !disabled
									? 'rgb(var(--color-gov-blue-dark))'
									: 'rgb(var(--color-gov-blue))'
							}}
						>
							{disabled ? (
								<>
									<svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
									</svg>
									{t('profile.save.saving')}
								</>
							) : (
								<>
									<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
										<path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									{t('profile.save.save')}
								</>
							)}
						</button>
						<span className="text-xs text-neutral-500">
							{t('profile.save.requiredNote').replace('*', '')} <span className="text-red-500">*</span>
						</span>
					</div>
				</form>
			</div>
		</AppShell>
	);
}
