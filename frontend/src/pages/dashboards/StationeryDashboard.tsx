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
	{ label: 'Dispatch Pending', to: '/cases?status=DISPATCH_PENDING', icon: 'M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5', cls: 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100' },
	{ label: 'Dispatched Cases', to: '/cases?status=DISPATCHED', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z', cls: 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100' },
	{ label: 'All Cases', to: '/cases', icon: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z', cls: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100' },
];

export function StationeryDashboard() {
	const cards = useDashboardCards();
	const me = useMe();
	const map = new Map((cards.data ?? []).map((c) => [c.card_key, c.value]));
	const firstName = me.data?.user?.name?.split(' ')[0] ?? 'Officer';

	return (
		<AppShell title="Stationery" nav={[{ to: '/dashboard/stationery', label: 'Dashboard' }, { to: '/cases', label: 'Cases' }]}>
			{/* Welcome banner */}
			<div className="mb-6 overflow-hidden rounded-xl px-6 py-5 text-white" style={{ background: 'linear-gradient(135deg, #b45309 0%, rgb(var(--color-gov-blue)) 100%)' }}>
				<div className="flex items-center justify-between gap-4">
					<div>
						<p className="text-xs font-semibold uppercase tracking-widest text-white/60">
							{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
						</p>
						<h2 className="mt-1 text-xl font-bold">Welcome, {firstName}</h2>
						<p className="mt-0.5 text-sm text-white/70">Stationery &mdash; State Commissioner for Persons with Disabilities</p>
					</div>
					<div className="hidden h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 sm:flex">
						<SvgIcon d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
					</div>
				</div>
			</div>

			{/* KPIs */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<KpiCard label="Open Cases" value={map.get('open_cases') ?? '—'} color="amber" sublabel="Awaiting dispatch"
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

			<div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
				<svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
				</svg>
				Process all approved orders under <strong className="mx-1">Dispatch Pending</strong> and update dispatch records promptly.
			</div>
		</AppShell>
	);
}
