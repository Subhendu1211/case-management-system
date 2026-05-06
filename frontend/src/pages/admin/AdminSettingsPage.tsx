import { AdminShell } from './AdminShell';
import { useHealth } from '../../lib/queries/health.queries';

export function AdminSettingsPage() {
	const health = useHealth();
	const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string;

	return (
		<AdminShell title="Admin">
			<h1 className="text-xl font-semibold">Settings</h1>
			<p className="mt-2 text-sm text-neutral-700">Runtime configuration and connectivity checks.</p>

			<div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
				<div className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
					<div className="text-sm font-semibold">Frontend</div>
					<div className="mt-2 text-sm text-neutral-700">
						<div>
							<strong>API base URL:</strong> {apiBaseUrl}
						</div>
					</div>
				</div>

				<div className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
					<div className="text-sm font-semibold">API health</div>
					<div className="mt-2 text-sm text-neutral-700">
						{health.isLoading ? (
							<span role="status" aria-live="polite">
								Checking…
							</span>
						) : null}
						{health.error ? <span className="text-semantic-danger">{(health.error as any).message}</span> : null}
						{health.data ? (
							<div>
								<div>
									<strong>Service:</strong> {health.data.service}
								</div>
								<div>
									<strong>Version:</strong> {health.data.version}
								</div>
							</div>
						) : null}
					</div>
				</div>
			</div>
		</AdminShell>
	);
}
