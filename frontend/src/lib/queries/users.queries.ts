import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { PagedResult, Role, UserAdmin } from '../types';

export function useUsers(params: { q?: string; role?: Role; page: number; pageSize: number }) {
	const search = new URLSearchParams();
	if (params.q) search.set('q', params.q);
	if (params.role) search.set('role', params.role);
	search.set('page', String(params.page));
	search.set('pageSize', String(params.pageSize));

	return useQuery({
		queryKey: ['users', params],
		queryFn: () => api<PagedResult<UserAdmin>>('GET', `/users?${search.toString()}`)
	});
}

export function useCreateUser() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { name: string; email: string; mobile: string; password: string; role: Role }) =>
			api<UserAdmin>('POST', '/users', input),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['users'] });
		}
	});
}
