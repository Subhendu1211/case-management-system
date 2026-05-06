import { useMemo, useState } from 'react';
import { AdminShell } from './AdminShell';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Table, type Column } from '../../components/Table';
import type { AuditLogEntry } from '../../lib/types';
import { useAuditLogs } from '../../lib/queries/audit.queries';

function toIsoOrUndefined(value: string) {
	if (!value) return undefined;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function AdminAuditLogsPage() {
	const [q, setQ] = useState('');
	const [module, setModule] = useState('');
	const [action, setAction] = useState('');
	const [from, setFrom] = useState('');
	const [to, setTo] = useState('');
	const [page, setPage] = useState(1);
	const pageSize = 20;

	const logs = useAuditLogs({
		q: q || undefined,
		module: module || undefined,
		action: action || undefined,
		from: toIsoOrUndefined(from),
		to: toIsoOrUndefined(to),
		page,
		pageSize
	});

	const [selected, setSelected] = useState<AuditLogEntry | null>(null);

	const columns = useMemo<Column<AuditLogEntry>[]>(
		() => [
			{ key: 'createdAt', header: 'Time', cell: (r) => new Date(r.createdAt).toLocaleString() },
			{ key: 'user', header: 'Actor', cell: (r) => r.user?.email ?? '—' },
			{ key: 'module', header: 'Module', cell: (r) => r.module },
			{ key: 'action', header: 'Action', cell: (r) => r.action },
			{ key: 'entityType', header: 'Entity', cell: (r) => r.entityType },
			{ key: 'entityId', header: 'Entity ID', cell: (r) => r.entityId ?? '—' },
			{ key: 'statusCode', header: 'Status', cell: (r) => r.statusCode }
		],
		[]
	);

	return (
		<AdminShell title="Admin">
			<div className="flex items-center justify-between gap-3">
				<h1 className="text-xl font-semibold">Audit logs</h1>
				<Button variant="secondary" onClick={() => logs.refetch()}>
					Refresh
				</Button>
			</div>

			<div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
				<Input label="Search" placeholder="module, action, user" value={q} onChange={(e) => setQ(e.target.value)} />
				<Input label="Module" placeholder="e.g. cases" value={module} onChange={(e) => setModule(e.target.value)} />
				<Input label="Action" placeholder="e.g. status" value={action} onChange={(e) => setAction(e.target.value)} />
				<div className="grid grid-cols-1 gap-3">
					<Input label="From" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
					<Input label="To" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
				</div>
			</div>

			<div className="mt-4">
				{logs.isLoading ? (
					<div className="p-4" role="status" aria-live="polite">
						Loading…
					</div>
				) : null}
				{logs.error ? <div className="p-4 text-semantic-danger">{(logs.error as any).message}</div> : null}
				{logs.data ? (
					<Table
						caption="Audit logs"
						ariaLabel="Audit logs table"
						columns={columns}
						rows={logs.data.items}
						getRowKey={(r) => `${r.createdAt}:${r.id}`}
						rowAriaLabel={(r) => `Audit log ${r.module} ${r.action}`}
						onRowClick={(row) => setSelected(row)}
					/>
				) : null}
			</div>

			{logs.data ? (
				<div className="mt-4 flex items-center gap-3">
					<Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
						Prev
					</Button>
					<div className="text-sm text-neutral-700">
						Page {logs.data.page} / {Math.max(1, Math.ceil(logs.data.total / logs.data.pageSize))}
					</div>
					<Button
						variant="secondary"
						disabled={page >= Math.ceil(logs.data.total / logs.data.pageSize)}
						onClick={() => setPage((p) => p + 1)}
					>
						Next
					</Button>
				</div>
			) : null}

			<Modal open={!!selected} title="Audit log details" onClose={() => setSelected(null)}>
				{selected ? (
					<div className="grid grid-cols-1 gap-3">
						<div className="text-sm text-neutral-700">
							<div>
								<strong>Time:</strong> {new Date(selected.createdAt).toLocaleString()}
							</div>
							<div>
								<strong>Actor:</strong> {selected.user?.email ?? '—'}
							</div>
							<div>
								<strong>Module:</strong> {selected.module}
							</div>
							<div>
								<strong>Action:</strong> {selected.action}
							</div>
							<div>
								<strong>Entity:</strong> {selected.entityType} {selected.entityId ? `(${selected.entityId})` : ''}
							</div>
						</div>

						<div>
							<div className="mb-1 text-xs font-medium text-neutral-700">Payload snapshot</div>
							<pre className="max-h-80 overflow-auto rounded-lg bg-neutral-50 p-3 text-xs text-neutral-800">
{JSON.stringify(selected.payloadSnapshot ?? null, null, 2)}
							</pre>
						</div>
					</div>
				) : null}
			</Modal>
		</AdminShell>
	);
}
