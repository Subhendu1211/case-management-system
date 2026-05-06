import { Navigate } from 'react-router-dom';
import { useMe } from '../lib/queries/auth.queries';
import { roleHome } from '../lib/auth';

export function DashboardRedirect() {
	const me = useMe();
	if (me.isLoading)
		return (
			<div className="p-6" role="status" aria-live="polite">
				Loading…
			</div>
		);
	if (!me.data?.user) return <Navigate to="/login" replace />;
	return <Navigate to={roleHome(me.data.user.role)} replace />;
}
