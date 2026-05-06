import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { Input } from '../../components/Input';
import { Table, type Column } from '../../components/Table';
import type { CaseListItem, CaseStatus } from '../../lib/types';
import { useCases } from '../../lib/queries/cases.queries';
import { useMe } from '../../lib/queries/auth.queries';
import { navForRole } from '../admin/AdminShell';
import { Button } from '../../components/Button';
import { HomeIcon } from '../../components/Icons';
import { formatCaseStatus, formatCasePriority } from '../../lib/formatters';

export function CaseListPage() {
	const nav = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const view = searchParams.get('view') as 'processing_house' | null;
	const [q, setQ] = useState('');
	const initialStatus = (searchParams.get('status') as CaseStatus | null) ?? '';
	const [status, setStatus] = useState<CaseStatus | ''>(initialStatus);
	const [page, setPage] = useState(1);
	const pageSize = 20;
	const me = useMe();

	const navItems = navForRole(me.data?.user.role);

	const cases = useCases({
		q: q || undefined,
		status: status || undefined,
		sectionAssigned: undefined,
		assignedTo: undefined,
		caseYear: undefined,
		view: view || undefined,
		page,
		pageSize
	});

	const columns = useMemo<Column<CaseListItem>[]>(
		() => {
			const baseColumns: Column<CaseListItem>[] = [
				{ key: 'registrationNo', header: 'Registration No', cell: (r) => r.registrationNo },
				{ key: 'caseYear', header: 'Year', cell: (r) => r.caseYear },
				{ key: 'status', header: 'Status', cell: (r) => formatCaseStatus(r.status) },
				{ key: 'sectionAssigned', header: 'Section', cell: (r) => r.sectionAssigned },
			];
			
			// Add priority column only in Processing House view
			if (view === 'processing_house') {
				baseColumns.push({
					key: 'priority',
					header: 'Priority',
					cell: (r) => formatCasePriority(r.priority)
				});
			}
			
			baseColumns.push(
				{ key: 'complainantName', header: 'Complainant', cell: (r) => r.complainantName },
				{ key: 'createdAt', header: 'Created', cell: (r) => new Date(r.createdAt).toLocaleString() }
			);
			
			return baseColumns;
		},
		[view]
	);

	const canCreate = me.data?.user.role === 'ADMIN' || me.data?.user.role === 'PRIVATE_SECRETARY';

	return (
		<AppShell title="SCPD CMS" nav={navItems}>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<h1 className="text-xl font-semibold">{view === 'processing_house' ? 'Processing House' : 'Cases'}</h1>
					<button onClick={() => nav('/')} className="p-1 hover:bg-neutral-100 rounded-lg">
						<HomeIcon className="h-5 w-5" />
					</button>
				</div>
				{canCreate && !view ? (
					<Button onClick={() => nav('/cases/new')}>Create Case</Button>
				) : null}
			</div>
			<div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
				<Input label="Search" placeholder="registration no / case no / complainant" value={q} onChange={(e) => setQ(e.target.value)} />
				{!view && (
					<label className="block text-sm font-medium text-neutral-800">
						<span className="mb-1 block text-xs text-neutral-700">Status</span>
						<select
							className="w-full rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-600"
							value={status}
							onChange={(e) => {
								const next = (e.target.value as CaseStatus) || '';
								setStatus(next);
								setPage(1);
								const nextParams = new URLSearchParams(searchParams);
								if (next) nextParams.set('status', next);
								else nextParams.delete('status');
								setSearchParams(nextParams);
							}}
						>
							<option value="">All</option>
							{(
								[
									'DIARY_ENTERED',
									'UNDER_REVIEW',
									'CASE_ACCEPTED',
									'PS_POST_ACCEPTANCE',
									'ROUTED_TO_LEGAL',
									'REGISTRAR_INITIAL_REVIEW',
									'PROGRAMMER_REVIEW',
									'STATIONERY_REVIEW',
									'REGISTERED',
									'ORDER_SHEET_DRAFTED',
									'REGISTRAR_REVIEW',
									'PA_TO_COMMISSIONER',
									'COMMISSIONER_APPROVAL',
									'APPROVED',
									'PA_POST_APPROVAL',
									'REGISTRAR_HANDOVER',
									'LEGAL_FORWARDING',
									'FORWARDING_STATIONERY',
									'REGISTRAR_SIGNING',
									'DISPATCH_PENDING',
									'DISPATCHED',
									'CLOSED'
								] as CaseStatus[]
							).map((s) => (
								<option key={s} value={s}>
									{formatCaseStatus(s)}
								</option>
							))}
						</select>
					</label>
				)}
			</div>
			<div className="mt-4">
				{cases.isLoading ? (
					<div className="p-4" role="status" aria-live="polite">
						Loading…
					</div>
				) : null}
				{cases.error ? <div className="p-4 text-semantic-danger">{(cases.error as any).message}</div> : null}
				{cases.data ? (
					<Table
						caption="Cases"
						ariaLabel="Cases table"
						columns={columns}
						rows={cases.data.items}
						getRowKey={(r) => `${r.caseYear}:${r.id}`}
						rowAriaLabel={(r) => `Case ${r.registrationNo}`}
						onRowClick={(row) => nav(`/cases/${row.caseYear}/${row.id}`)}
					/>
				) : null}
			</div>
			{
				cases.data ? (
					<div className="mt-4 flex items-center gap-3">
						<button className="rounded-lg bg-neutral-100 px-3 py-2 text-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
							Prev
						</button>
						<div className="text-sm text-neutral-700">
							Page {cases.data.page} / {Math.max(1, Math.ceil(cases.data.total / cases.data.pageSize))}
						</div>
						<button
							className="rounded-lg bg-neutral-100 px-3 py-2 text-sm"
							disabled={page >= Math.ceil(cases.data.total / cases.data.pageSize)}
							onClick={() => setPage((p) => p + 1)}
						>
							Next
						</button>
					</div>
				) : null
			}
		</AppShell >
	);
}
