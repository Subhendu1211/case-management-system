import { AdminShell } from './AdminShell';

export function AdminNotificationsPage() {
	return (
		<AdminShell title="Admin">
			<h1 className="text-xl font-semibold">Notifications</h1>
			<p className="mt-2 text-sm text-neutral-700">
				This screen is ready, but server-side notifications are not wired in this codebase yet.
			</p>
			<div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-0 p-4">
				<h2 className="text-sm font-semibold">Planned capabilities</h2>
				<ul className="mt-2 list-disc pl-5 text-sm text-neutral-700">
					<li>Delivery channels (in-app, email, SMS)</li>
					<li>Rules (e.g. SLA breaches, new case registered, dispatch received)</li>
					<li>User preferences and opt-outs</li>
				</ul>
			</div>
		</AdminShell>
	);
}
