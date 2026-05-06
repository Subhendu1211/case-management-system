import { AppShell } from '../../components/layout/AppShell';
import { KpiCard } from '../../components/KpiCard';
import { useDashboardCards, useComplaintPending } from '../../lib/queries/dashboard.queries';

import { Link } from 'react-router-dom';

function SvgIcon({ d }: { d: string }) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5">
			<path strokeLinecap="round" strokeLinejoin="round" d={d} />
		</svg>
	);
}

const quickLinks = [
	{ label: 'All Complaints', to: '/complaints', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z', cls: 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100' },
	{ label: 'Diary Pending', to: '/complaints?diary=missing', icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z', cls: 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100' },
	{ label: 'All Cases', to: '/cases', icon: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z', cls: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100' },
];
import { navForRole } from '../admin/AdminShell';
import { useMe } from '../../lib/queries/auth.queries';

import { useNavigate } from 'react-router-dom';

export function PrivateSecretaryDashboard() {
	const cards = useDashboardCards();
	const me = useMe();
	const complaints = useComplaintPending();
	const map = new Map((cards.data ?? []).map((c) => [c.card_key, c.value]));
	const nav = useNavigate();

	return (
		<AppShell
			title="Private Secretary"
			nav={navForRole(me.data?.user.role)}
		>
			<h1 className="text-xl font-semibold">Private Secretary dashboard</h1>
			<div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
				<button
					className="text-left rounded-lg focus:outline-none"
					onClick={() => nav('/cases?status=DIARY_ENTERED')}
				>
					<KpiCard label="Open cases" value={map.get('open_cases') ?? '—'} />
				</button>

				<KpiCard label="New cases (30d)" value={map.get('new_cases_30d') ?? '—'} />
				<KpiCard label="Legal SLA breaches" value={map.get('legal_sla_breaches') ?? '—'} />

				<button
					className="text-left rounded-lg focus:outline-none"
					onClick={() => nav('/complaints?diary=missing')}
				>
					<KpiCard label="Complaints pending" value={complaints.data?.pending_complaints ?? '—'} />
				</button>
			</div>

			{/* KPIs */}
			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<KpiCard label="Open Cases" value={map.get('open_cases') ?? '—'} color="blue" sublabel="Active"
					icon={<SvgIcon d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />}
				/>
				<KpiCard label="New Cases (30d)" value={map.get('new_cases_30d') ?? '—'} color="green" sublabel="This month"
					icon={<SvgIcon d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />}
				/>
				<KpiCard label="SLA Breaches" value={map.get('legal_sla_breaches') ?? '—'} color="red" sublabel="Overdue"
					icon={<SvgIcon d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />}
				/>
				<KpiCard label="Complaints Pending" value={complaints.data?.pending_complaints ?? '—'} color="purple" sublabel="Awaiting diary"
					icon={<SvgIcon d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />}
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

			{/* Pending complaints notice */}
			{(complaints.data?.pending_complaints ?? 0) > 0 && (
				<div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
					<svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
					</svg>
					<span>You have <strong>{complaints.data?.pending_complaints}</strong> complaint(s) pending diary entry. Please process them under <strong className="mx-1">Complaints &rarr; Diary Pending</strong>.</span>
				</div>
			)}
		</AppShell>
	);
}
