import { useMemo, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Input } from '../../components/Input';
import { Table, type Column } from '../../components/Table';
import { useGlobalIssueRegister } from '../../lib/queries/cases.queries';
import { useMe } from '../../lib/queries/auth.queries';
import { navForRole } from '../admin/AdminShell';
import type { IssueRegisterEntry } from '../../lib/types';

export function IssueRegisterPage() {
	const me = useMe();
	const [q, setQ] = useState('');
	const [page, setPage] = useState(1);
	const pageSize = 20;

	const navItems = navForRole(me.data?.user.role);

	const register = useGlobalIssueRegister({
		page,
		pageSize,
		q: q || undefined,
		enabled: me.data?.user.role !== 'CITIZEN'
	});

	if (me.data?.user.role === 'CITIZEN') {
		return (
			<AppShell title="Issue register" nav={navItems}>
				<div className="rounded-lg border border-neutral-200 bg-white p-6 text-sm text-neutral-700">
					You do not have access to the issue register.
				</div>
			</AppShell>
		);
	}

	const columns = useMemo<Column<IssueRegisterEntry>[]>(
		() => [
			{ key: 'createdAt', header: 'Date', cell: (r) => new Date(r.createdAt).toLocaleString() },
			{ key: 'kind', header: 'Type', cell: (r) => r.kind },
			{ key: 'subject', header: 'Subject', cell: (r) => r.subject ?? '-' },
			{ key: 'recipient', header: 'Recipient', cell: (r) => r.recipient ?? '-' },
			{ key: 'channel', header: 'Channel', cell: (r) => r.channel ?? '-' },
			{ key: 'case', header: 'Case', cell: (r) => r.case?.registrationNo ?? '-' },
			{ key: 'status', header: 'Status', cell: (r) => r.case?.status ?? '-' }
		],
		[]
	);

	const totalPages = Math.max(1, Math.ceil((register.data?.total ?? 0) / pageSize));

	return (
		<AppShell title="Issue register" nav={navItems}>
			<h1 className="text-xl font-semibold">Issue register</h1>
			<div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
				<Input label="Search" placeholder="subject / recipient / case" value={q} onChange={(e) => setQ(e.target.value)} />
			</div>
			<div className="mt-4">
				{register.isLoading ? <div className="text-sm text-neutral-700">Loading…</div> : null}
				{register.error ? (
					<div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-800">
						Unable to load issue register.
					</div>
				) : null}
				{register.data ? (
					<Table columns={columns} rows={register.data.items} />
				) : null}
			</div>
			<div className="mt-4 flex items-center justify-between text-sm">
				<div>Page {page} of {totalPages}</div>
				<div className="flex gap-2">
					<button
						className="rounded border border-neutral-200 px-3 py-1 disabled:opacity-50"
						disabled={page <= 1}
						onClick={() => setPage((p) => Math.max(1, p - 1))}
					>
						Prev
					</button>
					<button
						className="rounded border border-neutral-200 px-3 py-1 disabled:opacity-50"
						disabled={page >= totalPages}
						onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
					>
						Next
					</button>
				</div>
			</div>
		</AppShell>
	);
}
