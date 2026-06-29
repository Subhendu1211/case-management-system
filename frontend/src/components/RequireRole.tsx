import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { roleHome } from '../lib/auth';
import { useMe } from '../lib/queries/auth.queries';
import type { Role } from '../lib/types';

export function RequireRole({ allowed, children }: { allowed: Role[]; children: ReactNode }) {
	const me = useMe();
	const location = useLocation();

	if (me.isLoading) {
		return (
			<div className="p-6" role="status" aria-live="polite">
				Loading...
			</div>
		);
	}

	const user = me.data?.user;
	if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
	if (!allowed.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;

	return <>{children}</>;
}
