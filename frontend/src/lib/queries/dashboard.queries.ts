import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export function useDashboardCards() {
	return useQuery({
		queryKey: ['dashboard', 'cards'],
		queryFn: () => api<Array<{ card_key: string; value: number }>>('GET', '/dashboard/cards')
	});
}

export function useCaseSummary() {
	return useQuery({
		queryKey: ['dashboard', 'case-summary'],
		queryFn: () => api<any[]>('GET', '/dashboard/case-summary')
	});
}

export function useRolePendency() {
	return useQuery({
		queryKey: ['dashboard', 'role-pendency'],
		queryFn: () => api<Array<{ role: string; count: number }>>('GET', '/dashboard/role-pendency')
	});
}

export function useProcessingHouseCount() {
	return useQuery({
		queryKey: ['dashboard', 'processing-house'],
		queryFn: () => api<{ processing_house: number }>('GET', '/dashboard/processing-house')
	});
}

export function useComplaintPending() {
	return useQuery({
		queryKey: ['dashboard', 'complaint-pending'],
		queryFn: () => api<{ pending_complaints: number }>('GET', '/dashboard/complaint-pending')
	});
}
