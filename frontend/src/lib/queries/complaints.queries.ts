import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { Complaint, ComplaintDocument, ComplaintListItem, PagedResult } from '../types';

export function useComplaints(params: {
	q?: string;
	diary?: 'missing' | 'created' | 'all';
	channel?: 'EMAIL' | 'PHONE' | 'IN_PERSON' | 'LETTER';
	page: number;
	pageSize: number;
}) {
	const searchParams = new URLSearchParams();
	Object.entries(params).forEach(([key, value]) => {
		if (value === undefined || value === null || value === '') return;
		searchParams.append(key, String(value));
	});

	return useQuery({
		queryKey: ['complaints', params],
		queryFn: () => api<PagedResult<ComplaintListItem>>('GET', `/complaints?${searchParams.toString()}`)
	});
}

export function useComplaint(id: string) {
	return useQuery({
		queryKey: ['complaints', id],
		queryFn: () => api<Complaint>('GET', `/complaints/${id}`),
		enabled: Boolean(id)
	});
}

export function useCreateComplaint() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: any) => api<Complaint>('POST', '/complaints', input),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['complaints'] });
		}
	});
}

export function useUpdateComplaint() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: any }) => api<Complaint>('PATCH', `/complaints/${id}`, data),
		onSuccess: async (_result, { id }) => {
			await Promise.all([
				qc.invalidateQueries({ queryKey: ['complaints', id] }),
				qc.invalidateQueries({ queryKey: ['complaints'] })
			]);
		}
	});
}

export function useUploadComplaintDocuments() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ complaintId, files }: { complaintId: string; files: File[] }) => {
			const formData = new FormData();
			files.forEach((file) => formData.append('files', file));
			return api<ComplaintDocument[]>('POST', `/complaints/${complaintId}/documents`, formData);
		},
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['complaints'] });
		}
	});
}
