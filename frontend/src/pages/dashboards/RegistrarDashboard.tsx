import { AppShell } from '../../components/layout/AppShell';
import { KpiCard } from '../../components/KpiCard';
import { useDashboardCards } from '../../lib/queries/dashboard.queries';
import { useMe } from '../../lib/queries/auth.queries';
import { Link } from 'react-router-dom';

function SvgIcon({ d }: { d: string }) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5">
			<path strokeLinecap="round" strokeLinejoin="round" d={d} />
		</svg>
	);
}

const quickLinks = [
	{ label: 'Registrar Review Queue', to: '/cases?status=REGISTRAR_REVIEW', icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z', cls: 'text-teal-600 bg-teal-50 border-teal-200 hover:bg-teal-100' },
	{ label: 'Order Sheet Drafts', to: '/cases?status=ORDER_SHEET_DRAFTED', icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10', cls: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100' },
	{ label: 'All Cases', to: '/cases', icon: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z', cls: 'text-neutral-600 bg-neutral-50 border-neutral-200 hover:bg-neutral-100' },
];

export function RegistrarDashboard() {
	const cards = useDashboardCards();
	const me = useMe();
	const map = new Map((cards.data ?? []).map((c) => [c.card_key, c.value]));
	const firstName = me.data?.user?.name?.split(' ')[0] ?? 'Registrar';

	return (
		<AppShell title="Registrar" nav={[{ to: '/dashboard/registrar', label: 'Dashboard' }, { to: '/cases', label: 'Cases' }]}>
			{/* Welcome banner */}
			<div className="mb-6 overflow-hidden rounded-xl px-6 py-5 text-white" style={{ background: 'linear-gradient(135deg, #0f766e 0%, rgb(var(--color-gov-blue)) 100%)' }}>
				<div className="flex items-center justify-between gap-4">
					<div>
						<p className="text-xs font-semibold uppercase tracking-widest text-white/60">
							{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
						</p>
						<h2 className="mt-1 text-xl font-bold">Welcome, {firstName}</h2>
						<p className="mt-0.5 text-sm text-white/70">Registrar &mdash; State Commissioner for Persons with Disabilities</p>
					</div>
					<div className="hidden h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 sm:flex">
						<SvgIcon d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
					</div>
				</div>
			</div>

			{/* KPIs */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<KpiCard label="Open Cases" value={map.get('open_cases') ?? '—'} color="teal" sublabel="Under registry"
					icon={<SvgIcon d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />}
				/>
				<KpiCard label="New Cases (30 days)" value={map.get('new_cases_30d') ?? '—'} color="green" sublabel="Last 30 days"
					icon={<SvgIcon d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />}
				/>
				<KpiCard label="Legal SLA Breaches" value={map.get('legal_sla_breaches') ?? '—'} color="red" sublabel="Needs action"
					icon={<SvgIcon d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />}
				/>
			</div>

			{/* Quick links */}
			<div className="mt-6">
				<h3 className="mb-3 text-sm font-semibold text-neutral-600">Quick Access</h3>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					{quickLinks.map((l) => (
						<Link key={l.to} to={l.to} className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-medium transition-all hover:shadow-sm ${l.cls}`}>
							<SvgIcon d={l.icon} />
							{l.label}
							<svg className="ml-auto h-4 w-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
							</svg>
						</Link>
					))}
				</div>
			</div>

			<div className="mt-5 flex items-start gap-3 rounded-xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-800">
				<svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
				</svg>
				Review cases in the <strong className="mx-1">Registrar Review</strong> queue and ensure order sheets are correctly prepared before Commissioner approval.
			</div>
		</AppShell>
	);
}
