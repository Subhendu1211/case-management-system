import { AdminShell } from './AdminShell';
import { useCaseSummary } from '../../lib/queries/dashboard.queries';
import { Table, type Column } from '../../components/Table';
import { useMemo } from 'react';

export function AdminReportsPage() {
	const summary = useCaseSummary();

	const rows = (summary.data ?? []).map((r: any, idx: number) => ({ idx, ...r }));
	const columns = useMemo<Column<any>[]>(
		() =>
			Object.keys(rows[0] ?? {})
				.filter((k) => k !== 'idx')
				.map((k) => ({ key: k, header: k, cell: (r) => String(r[k] ?? '—') })),
		[rows]
	);

	return (
		<AdminShell title="Admin">
			<h1 className="text-xl font-semibold">Reports</h1>
			<p className="mt-2 text-sm text-neutral-700">Basic reports sourced from the dashboard summary endpoint.</p>

			<div className="mt-4">
				{summary.isLoading ? (
					<div className="p-4" role="status" aria-live="polite">
						Loading…
					</div>
				) : null}
				{summary.error ? <div className="p-4 text-semantic-danger">{(summary.error as any).message}</div> : null}
				{rows.length ? <Table caption="Reports" ariaLabel="Reports table" columns={columns} rows={rows} getRowKey={(r) => String(r.idx)} /> : null}
				{!summary.isLoading && !rows.length ? <div className="p-4 text-sm text-neutral-700">No report data.</div> : null}
			</div>
		</AdminShell>
	);
}
