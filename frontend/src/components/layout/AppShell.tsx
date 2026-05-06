import type { ReactNode } from 'react';
import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '../Sidebar';
import { clearTokens } from '../../lib/auth';
import { useMe } from '../../lib/queries/auth.queries';
import { setLang, t, useLang } from '../../i18n';

export function AppShell(props: { title: string; nav: { to: string; label: string }[]; children: ReactNode }) {
	const lang = useLang();
	useEffect(() => {
		const base = t('appShell.titleBase');
		document.title = props.title ? `${props.title} | ${base}` : base;
	}, [props.title, lang]);

	const navigate = useNavigate();
	const qc = useQueryClient();
	const me = useMe();
	const isOdia = lang === 'or';

	const focusMain = useCallback(() => {
		requestAnimationFrame(() => {
			(document.getElementById('main-content') as HTMLElement | null)?.focus();
		});
	}, []);

	const handleLogout = useCallback(() => {
		clearTokens();
		qc.clear();
		navigate('/login', { replace: true });
	}, [navigate, qc]);

	const fallbackUser = t('appShell.user.fallback');
	const initials = me.data?.user?.name
		? me.data.user.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
		: fallbackUser;

	return (
		<div className="flex min-h-screen font-sans">
			{/* Skip link */}
			<a
				href="#main-content"
				onClick={focusMain}
				className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-neutral-900 focus:shadow focus:ring-1 focus:ring-neutral-200"
			>
				{t('appShell.skipToContent')}
			</a>

			{/* Sidebar */}
			<Sidebar
				title={props.title}
				items={props.nav}
				onLogout={handleLogout}
				user={me.data?.user}
				isLoadingUser={me.isLoading}
				userError={me.error as any}
			/>

			{/* Main area */}
			<div className="flex min-w-0 flex-1 flex-col bg-neutral-100">
				{/* Mobile top bar */}
				<div
					className="flex flex-shrink-0 items-center justify-between gap-3 px-4 py-3 md:hidden"
					style={{ background: 'rgb(var(--color-gov-blue))' }}
				>
					<div>
						<div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgb(var(--color-gov-gold-light))' }}>
							{t('appShell.mobile.gov')}
						</div>
						<div className="text-xs font-semibold text-white">{props.title}</div>
					</div>
					<div className="flex items-center gap-2">
						<div className="flex items-center rounded-full bg-white/10 p-0.5 text-[11px] font-semibold text-white">
							<button
								type="button"
								onClick={() => setLang('en')}
								className={`rounded-full px-2 py-1 transition ${isOdia ? 'text-white/70' : 'bg-white text-slate-900'}`}
								aria-pressed={!isOdia}
							>
								{t('authLayout.lang.en')}
							</button>
							<button
								type="button"
								onClick={() => setLang('or')}
								className={`rounded-full px-2 py-1 transition ${isOdia ? 'bg-white text-slate-900' : 'text-white/70'}`}
								aria-pressed={isOdia}
							>
								{t('authLayout.lang.or')}
							</button>
						</div>
						<div
							className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
							style={{ background: 'rgb(var(--color-gov-gold-light) / 0.2)', outline: '1px solid rgb(var(--color-gov-gold-light) / 0.5)' }}
						>
							{initials}
						</div>
					</div>
				</div>

				{/* Page header */}
				<header className="flex-shrink-0 border-b border-neutral-200 bg-white px-6 py-4 shadow-sm">
					<div className="flex items-center justify-between gap-4">
						<div>
							<h1 className="text-lg font-bold text-neutral-900">{props.title}</h1>
							<p className="mt-0.5 text-xs text-neutral-400">
								{t('appShell.header.subtitle')}
							</p>
						</div>
						{/* Desktop user pill */}
						<div className="hidden items-center gap-3 md:flex">
							<div className="flex items-center rounded-full border border-neutral-200 bg-neutral-50 p-0.5 text-xs font-semibold text-neutral-700">
								<button
									type="button"
									onClick={() => setLang('en')}
									className={`rounded-full px-3 py-1 transition ${isOdia ? 'text-neutral-500' : 'bg-white text-slate-900 shadow-sm'}`}
									aria-pressed={!isOdia}
								>
									{t('authLayout.lang.en')}
								</button>
								<button
									type="button"
									onClick={() => setLang('or')}
									className={`rounded-full px-3 py-1 transition ${isOdia ? 'bg-white text-slate-900 shadow-sm' : 'text-neutral-500'}`}
									aria-pressed={isOdia}
								>
									{t('authLayout.lang.or')}
								</button>
							</div>
							<div className="text-right">
								<div className="text-sm font-semibold text-neutral-800">
									{me.data?.user?.name ?? (me.isLoading ? t('appShell.user.loading') : '')}
								</div>
								<div className="text-xs text-neutral-400">
									{me.data?.user?.role?.split('_').join(' ') ?? t('appShell.user.roleEmpty')}
								</div>
							</div>
							<div
								className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
								style={{ background: 'rgb(var(--color-gov-blue))' }}
							>
								{initials}
							</div>
						</div>
					</div>
				</header>

				{/* Content */}
				<main
					id="main-content"
					tabIndex={-1}
					role="main"
					aria-label={props.title || 'Main content'}
					className="flex-1 p-5 pb-20 focus:outline-none md:pb-6 lg:p-6"
				>
					{props.children}
				</main>

				{/* Footer */}
				<footer className="hidden flex-shrink-0 items-center justify-between border-t border-neutral-200 bg-white px-6 py-2.5 text-xs text-neutral-400 md:flex">
					<span>&copy; {new Date().getFullYear()} {t('appShell.footer.left')}</span>
					<span>{t('appShell.footer.right')}</span>
				</footer>
			</div>
		</div>
	);
}
