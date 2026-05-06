import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useCreateCase } from '../../lib/queries/cases.queries';
import type { SectionAssigned } from '../../lib/types';
import { useMe } from '../../lib/queries/auth.queries';
import { navForRole } from '../admin/AdminShell';

const sectionOptions: SectionAssigned[] = ['LEGAL', 'OE', 'REGISTRAR', 'STATIONERY', 'COMMISSIONER'];

export function CaseCreatePage() {
	const nav = useNavigate();
	const createCase = useCreateCase();
	const me = useMe();

	const navItems = navForRole(me.data?.user.role);

	const [form, setForm] = useState({
		caseYear: new Date().getFullYear(),
		registrationNo: '',
		complainantName: '',
		subject: '',
		sectionAssigned: 'LEGAL' as SectionAssigned
	});

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		createCase.mutate(form, {
			onSuccess: (created) => {
				const targetYear = created?.caseYear ?? form.caseYear;
				const targetId = created?.id ?? created?.caseId ?? undefined;
				if (targetYear && targetId) {
					nav(`/cases/${targetYear}/${targetId}`);
				} else {
					nav('/cases');
				}
			}
		});
	};

	return (
		<AppShell title="Create Case" nav={navItems}>
			<div className="mb-4 flex items-center justify-between">
				<h1 className="text-xl font-semibold">Create Case</h1>
			</div>
			<form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
				<Input
					label="Registration No"
					value={form.registrationNo}
					onChange={(e) => setForm((f) => ({ ...f, registrationNo: e.target.value }))}
					required
				/>
				<Input
					label="Year"
					type="number"
					value={form.caseYear}
					onChange={(e) => setForm((f) => ({ ...f, caseYear: Number(e.target.value) }))}
					required
				/>
				<Input
					label="Complainant Name"
					value={form.complainantName}
					onChange={(e) => setForm((f) => ({ ...f, complainantName: e.target.value }))}
					required
				/>
				<Input
					label="Subject"
					value={form.subject}
					onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
					required
				/>
				<label className="flex flex-col gap-2 text-sm font-medium">
					<span>Section Assigned</span>
					<select
						className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary-500"
						value={form.sectionAssigned}
						onChange={(e) => setForm((f) => ({ ...f, sectionAssigned: e.target.value as SectionAssigned }))}
						required
					>
						{sectionOptions.map((opt) => (
							<option key={opt} value={opt}>
								{opt}
							</option>
						))}
					</select>
				</label>
				<div className="md:col-span-2">
					<Button type="submit" disabled={createCase.isPending}>
						{createCase.isPending ? 'Creating…' : 'Create Case'}
					</Button>
					{createCase.error ? (
						<span className="ml-3 text-sm text-semantic-danger" role="alert" aria-live="polite">
							{(createCase.error as any).message}
						</span>
					) : null}
				</div>
			</form>
		</AppShell>
	);
}