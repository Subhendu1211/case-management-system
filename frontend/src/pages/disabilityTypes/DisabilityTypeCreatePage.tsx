import { useState } from 'react';
import { AdminShell } from '../admin/AdminShell';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Table, type Column } from '../../components/Table';
import type { DisabilityType } from '../../lib/types';
import { useCreateDisabilityType, useDisabilityTypes } from '../../lib/queries/disabilityTypes.queries';

export function DisabilityTypeCreatePage() {
	const list = useDisabilityTypes({ includeInactive: true });
	const create = useCreateDisabilityType();

	const [form, setForm] = useState({ name: '', code: '', isActive: true });

	const columns: Column<DisabilityType>[] = [
		{ key: 'name', header: 'Name', cell: (r) => r.name },
		{ key: 'code', header: 'Code', cell: (r) => r.code ?? '—' },
		{ key: 'isActive', header: 'Active', cell: (r) => (r.isActive ? 'Yes' : 'No') }
	];

	return (
		<AdminShell title="Disability types">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="text-xl font-semibold">Disability types</h1>
				<form
					className="flex flex-wrap items-end gap-3"
					onSubmit={async (e) => {
						e.preventDefault();
						await create.mutateAsync({
							name: form.name.trim(),
							code: form.code.trim() || undefined,
							isActive: form.isActive
						});
						setForm({ name: '', code: '', isActive: true });
					}}
				>
					<Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
					<Input label="Code (optional)" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
					<label className="flex items-center gap-2 text-sm font-medium text-neutral-800">
						<input
							type="checkbox"
							className="h-4 w-4 rounded border-neutral-300 text-brand-600"
							checked={form.isActive}
							onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
						/>
						<span>Active</span>
					</label>
					<Button type="submit" disabled={create.isPending || !form.name.trim()}>
						{create.isPending ? 'Saving…' : 'Add type'}
					</Button>
				</form>
			</div>

			{create.error ? (
				<div className="mt-3 text-sm text-semantic-danger" role="alert" aria-live="assertive">
					{(create.error as any).message}
				</div>
			) : null}

			<div className="mt-4">
				{list.isLoading ? (
					<div className="p-4" role="status" aria-live="polite">
						Loading…
					</div>
				) : null}
				{list.error ? <div className="p-4 text-semantic-danger">{(list.error as any).message}</div> : null}
				{list.data ? (
					<Table
						caption="Disability types"
						ariaLabel="Disability types table"
						columns={columns}
						rows={list.data}
						getRowKey={(r) => r.id}
						rowAriaLabel={(r) => `Disability type ${r.name}`}
					/>
				) : null}
			</div>
		</AdminShell>
	);
}
