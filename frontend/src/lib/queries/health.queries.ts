import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export function useHealth() {
	return useQuery({
		queryKey: ['health'],
		queryFn: () => api<{ ok: boolean; service: string; version: string }>('GET', '/health')
	});
}
