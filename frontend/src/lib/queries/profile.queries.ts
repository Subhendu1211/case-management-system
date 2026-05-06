import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { PublicRegistration, PublicRegistrationCreate } from '../types';

export function useProfile() {
	return useQuery({
		queryKey: ['profile'],
		queryFn: () => api<PublicRegistration | null>('GET', '/profile')
	});
}

export function useSaveProfile() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: PublicRegistrationCreate) => api<PublicRegistration>('PUT', '/profile', input),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['profile'] });
		}
	});
}
