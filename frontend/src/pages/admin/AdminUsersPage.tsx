import { useMemo, useState } from 'react';
import { AdminShell } from './AdminShell';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Table, type Column } from '../../components/Table';
import type { Role, UserAdmin } from '../../lib/types';
import { useCreateUser, useUsers } from '../../lib/queries/users.queries';
import { validatePasswordPolicy } from '../../lib/passwordPolicy';

const roles: Role[] = [
	'PRIVATE_SECRETARY',
	'PRIVATE_ASSISTANT',
	'COMMISSIONER',
	'LEGAL_ASSISTANT',
	'REGISTRAR',
	'PROGRAMMER',
	'STATIONERY',
	'COMPUTER_ASSISTANT',
	'ADMIN',
	'CITIZEN'
];

export function AdminUsersPage() {
	const [q, setQ] = useState('');
	const [role, setRole] = useState<Role | ''>('');
	const [page, setPage] = useState(1);
	const pageSize = 20;

	const users = useUsers({ q: q || undefined, role: role || undefined, page, pageSize });

	const [open, setOpen] = useState(false);
	const create = useCreateUser();
	const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '', role: 'ADMIN' as Role });
	const [passwordError, setPasswordError] = useState<string | null>(null);

	const columns = useMemo<Column<UserAdmin>[]>(
		() => [
			{ key: 'name', header: 'Name', cell: (r) => r.name },
			{ key: 'email', header: 'Email', cell: (r) => r.email },
			{ key: 'mobile', header: 'Mobile', cell: (r) => r.mobile ?? '—' },
			{ key: 'role', header: 'Role', cell: (r) => r.role },
			{ key: 'isActive', header: 'Active', cell: (r) => (r.isActive ? 'Yes' : 'No') },
			{ key: 'createdAt', header: 'Created', cell: (r) => new Date(r.createdAt).toLocaleString() }
		],
		[]
	);

	return (
		<AdminShell title="Admin">
			<div className="flex items-center justify-between gap-3">
				<h1 className="text-xl font-semibold">User management</h1>
				<Button onClick={() => setOpen(true)}>New user</Button>
			</div>

			<div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
				<Input label="Search" placeholder="name, email, or mobile" value={q} onChange={(e) => setQ(e.target.value)} />
				<label className="block">
					<div className="mb-1 text-xs font-medium text-neutral-700">Role</div>
					<select
						className="w-full rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
						value={role}
						onChange={(e) => setRole(e.target.value as any)}
					>
						<option value="">All</option>
						{roles.map((r) => (
							<option key={r} value={r}>
								{r}
							</option>
						))}
					</select>
				</label>
			</div>

			<div className="mt-4">
				{users.isLoading ? (
					<div className="p-4" role="status" aria-live="polite">
						Loading…
					</div>
				) : null}
				{users.error ? <div className="p-4 text-semantic-danger">{(users.error as any).message}</div> : null}
				{users.data ? (
					<Table
						caption="Users"
						ariaLabel="Users table"
						columns={columns}
						rows={users.data.items}
						getRowKey={(r) => r.id}
						rowAriaLabel={(r) => `User ${r.name} (${r.email})`}
					/>
				) : null}
			</div>

			{users.data ? (
				<div className="mt-4 flex items-center gap-3">
					<Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
						Prev
					</Button>
					<div className="text-sm text-neutral-700">
						Page {users.data.page} / {Math.max(1, Math.ceil(users.data.total / users.data.pageSize))}
					</div>
					<Button
						variant="secondary"
						disabled={page >= Math.ceil(users.data.total / users.data.pageSize)}
						onClick={() => setPage((p) => p + 1)}
					>
						Next
					</Button>
				</div>
			) : null}

			<Modal open={open} title="Create user" onClose={() => setOpen(false)}>
				<form
					className="grid grid-cols-1 gap-3"
					onSubmit={async (e) => {
						e.preventDefault();
						const nextPasswordError = validatePasswordPolicy(form.password);
						if (nextPasswordError) {
							setPasswordError(nextPasswordError);
							return;
						}
						await create.mutateAsync(form);
						setOpen(false);
						setPasswordError(null);
						setForm({ name: '', email: '', mobile: '', password: '', role: 'ADMIN' });
					}}
				>
					<Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
					<Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
					<Input
						label="Mobile number"
						type="tel"
						inputMode="numeric"
						autoComplete="tel"
						placeholder="10 to 15 digit mobile number"
						value={form.mobile}
						onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, '').slice(0, 15) }))}
						required
						minLength={10}
						maxLength={15}
						pattern="[0-9]{10,15}"
					/>
					<Input
						label="Password"
						type="password"
						value={form.password}
						onChange={(e) => {
							setPasswordError(null);
							setForm((f) => ({ ...f, password: e.target.value }));
						}}
						required
						minLength={12}
						error={passwordError ?? undefined}
					/>
					<label className="block">
						<div className="mb-1 text-xs font-medium text-neutral-700">Role</div>
						<select
							className="w-full rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
							value={form.role}
							onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
						>
							{roles.map((r) => (
								<option key={r} value={r}>
									{r}
								</option>
							))}
						</select>
					</label>

					{create.error ? (
						<div className="text-sm text-semantic-danger" role="alert" aria-live="assertive">
							{(create.error as any).message}
						</div>
					) : null}

					<div className="mt-2 flex items-center justify-end gap-2">
						<Button type="button" variant="ghost" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={create.isPending}>
							{create.isPending ? 'Creating…' : 'Create'}
						</Button>
					</div>
				</form>
			</Modal>
		</AdminShell>
	);
}
