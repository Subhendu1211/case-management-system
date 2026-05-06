import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { HomeIcon, BriefcaseIcon, BuildingIcon } from '../../components/Icons';
import { AppShell } from '../../components/layout/AppShell';
import { useMe } from '../../lib/queries/auth.queries';

const adminNav = [
	{ to: '/dashboard/admin', label: 'Dashboard', icon: HomeIcon },
	{ to: '/cases?view=processing_house', label: 'Processing House', icon: BuildingIcon },
	{ to: '/cases', label: 'Cases', icon: BriefcaseIcon },
	{ to: '/complaints', label: 'Complaints' },
	{ to: '/issue-register', label: 'Issue register' },
	{ to: '/admin/disability-types', label: 'Disability types' },
	{ to: '/admin/users', label: 'Users' },
	{ to: '/admin/audit-logs', label: 'Audit logs' },
	{ to: '/admin/notifications', label: 'Notifications' },
	{ to: '/admin/reports', label: 'Reports' },
	{ to: '/admin/settings', label: 'Settings' }
];

const programmerNav = [
	{ to: '/cases?view=processing_house', label: 'Processing House', icon: BuildingIcon },
	{ to: '/cases', label: 'Cases', icon: BriefcaseIcon },
	{ to: '/complaints', label: 'Complaints' },
	{ to: '/issue-register', label: 'Issue register' }
];

const citizenNav = [
	{ to: '/profile', label: 'Profile' },
	{ to: '/complaints', label: 'Complaints' },
	{ to: '/cases', label: 'Cases' }
];

const staffNav = [
	{ to: '/dashboard', label: 'Dashboard', icon: HomeIcon },
	{ to: '/cases?view=processing_house', label: 'Processing House', icon: BuildingIcon },
	{ to: '/cases', label: 'Cases', icon: BriefcaseIcon },
	{ to: '/issue-register', label: 'Issue register' }
];

const privateSecretaryNav = [
    { to: '/dashboard/private-secretary', label: 'Dashboard', icon: HomeIcon },
    { to: '/cases?view=processing_house', label: 'Processing House', icon: BuildingIcon },
    { to: '/cases', label: 'Cases', icon: BriefcaseIcon },
    { to: '/complaints', label: 'Complaints' },
    { to: '/issue-register', label: 'Issue register' }
];

export function navForRole(role?: string | null) {
	if (!role) return staffNav;
	if (role === 'ADMIN') return adminNav;
	if (role === 'PROGRAMMER') return programmerNav;
	if (role === 'PRIVATE_SECRETARY') return privateSecretaryNav;
	if (role === 'LEGAL_ASSISTANT') return staffNav;
	if (role === 'CITIZEN') return citizenNav;
	return staffNav;
}

export function AdminShell(props: { title: string; children: ReactNode }) {
	const me = useMe();
	const loc = useLocation();

	if (me.isLoading) {
		return (
			<div className="p-6" role="status" aria-live="polite">
				Loading…
			</div>
		);
	}

	if (!me.data?.user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;

	const role = me.data.user.role;
	const isAdminPage = loc.pathname.startsWith('/admin');

	if (isAdminPage && role !== 'ADMIN' && role !== 'PROGRAMMER') {
		return (
			<AppShell title={props.title} nav={navForRole(role)}>
				<h1 className="text-xl font-semibold">{props.title}</h1>
				<p className="mt-2 text-sm text-neutral-700">You don’t have permission to view this page.</p>
			</AppShell>
		);
	}

	return (
		<AppShell title={props.title} nav={navForRole(role)}>
			{props.children}
		</AppShell>
	);
}

export { adminNav };
