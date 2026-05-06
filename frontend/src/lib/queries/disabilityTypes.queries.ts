import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { DisabilityType } from '../types';

export function useDisabilityTypes(options?: { includeInactive?: boolean }) {
	const params = new URLSearchParams();
	if (options?.includeInactive) params.set('includeInactive', 'true');
	return useQuery({
		queryKey: ['disability-types', options],
		queryFn: () => api<DisabilityType[]>('GET', `/disability-types${params.toString() ? `?${params.toString()}` : ''}`)
	});
}

export function useCreateDisabilityType() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { name: string; code?: string; isActive?: boolean }) => api<DisabilityType>('POST', '/disability-types', input),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['disability-types'] });
		}
	});
}
