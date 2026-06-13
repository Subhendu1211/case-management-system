import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type {
	CaseListItem,
	CaseStatus,
	CaseDispatch,
	CaseDocument,
	DispatchChannel,
	DispatchType,
	ComplaintDocumentLinked,
	ForwardingLetter,
	OrderSheet,
	PagedResult,
	SectionAssigned,
	WorkflowTransition,
	AuditLogEntry,
	QueryLetter,
	IssueRegisterEntry,
	CasePriority
	, IssueRegisterPaged
} from '../types';

export function useCases(params: {
	q?: string;
	status?: CaseStatus;
	sectionAssigned?: SectionAssigned;
	assignedTo?: string;
	caseYear?: number;
	view?: 'processing_house';
	page: number;
	pageSize: number;
}) {
	const search = new URLSearchParams();
	if (params.q) search.set('q', params.q);
	if (params.status) search.set('status', params.status);
	if (params.sectionAssigned) search.set('sectionAssigned', params.sectionAssigned);
	if (params.assignedTo) search.set('assignedTo', params.assignedTo);
	if (params.caseYear) search.set('caseYear', String(params.caseYear));
	if (params.view) search.set('view', params.view);
	search.set('page', String(params.page));
	search.set('pageSize', String(params.pageSize));

	return useQuery({
		queryKey: ['cases', params],
		queryFn: () => api<PagedResult<CaseListItem>>('GET', `/cases?${search.toString()}`)
	});
}

export function useCaseDetail(caseYear: number, caseId: string) {
	return useQuery({
		queryKey: ['cases', caseYear, caseId],
		queryFn: () => api<any>('GET', `/cases/${caseYear}/${caseId}`)
	});
}

export function useCaseTransitions(caseYear: number, caseId: string) {
	return useQuery({
		queryKey: ['cases', caseYear, caseId, 'transitions'],
		queryFn: () => api<WorkflowTransition[]>('GET', `/cases/${caseYear}/${caseId}/transitions`)
	});
}

export function useQueryLetters(caseYear: number, caseId: string) {
	return useQuery({
		queryKey: ['cases', caseYear, caseId, 'query-letters'],
		queryFn: () => api<QueryLetter[]>('GET', `/cases/${caseYear}/${caseId}/query-letters`)
	});
}

export function useCreateQueryLetter(caseYear: number, caseId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { recipientType: 'complainant' | 'accused'; channel: DispatchChannel; subject: string; body?: string }) =>
			api<QueryLetter>('POST', `/cases/${caseYear}/${caseId}/query-letters`, input),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId] });
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId, 'transitions'] });
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId, 'query-letters'] });
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId, 'issue-register'] });
		}
	});
}

export function useDispatchQueryLetter(caseYear: number, caseId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { queryLetterId: string }) => api<any>('POST', `/cases/${caseYear}/${caseId}/query-letters/${input.queryLetterId}/dispatch`, {}),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId, 'issue-register'] });
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId, 'dispatch'] });
		}
	});
}

export function useIssueRegister(caseYear: number, caseId: string) {
	return useQuery({
		queryKey: ['cases', caseYear, caseId, 'issue-register'],
		queryFn: () => api<IssueRegisterEntry[]>('GET', `/cases/${caseYear}/${caseId}/issue-register`)
	});
}

export function useGlobalIssueRegister(params: { page: number; pageSize: number; q?: string; caseYear?: number; kind?: string; enabled?: boolean }) {
	const search = new URLSearchParams();
	search.set('page', String(params.page));
	search.set('pageSize', String(params.pageSize));
	if (params.q) search.set('q', params.q);
	if (params.caseYear) search.set('caseYear', String(params.caseYear));
	if (params.kind) search.set('kind', params.kind);

	return useQuery({
		queryKey: ['issue-register', params],
		queryFn: () => api<IssueRegisterPaged>('GET', `/issue-register?${search.toString()}`),
		enabled: params.enabled ?? true
	});
}

export function useUploadCaseDocuments(caseYear: number, caseId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (files: File[]) => {
			const form = new FormData();
			files.forEach((file) => form.append('files', file));
			return api<CaseDocument[]>('POST', `/cases/${caseYear}/${caseId}/documents`, form);
		},
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId, 'documents'] });
		}
	});
}

export function useCaseDocuments(caseYear: number, caseId: string) {
	return useQuery({
		queryKey: ['cases', caseYear, caseId, 'documents'],
		queryFn: () => api<{ caseDocuments: CaseDocument[]; complaintDocuments: ComplaintDocumentLinked[] }>('GET', `/cases/${caseYear}/${caseId}/documents`)
	});
}

export function useCaseActivity(params: { caseYear: number; caseId: string; page: number; pageSize: number; q?: string }) {
	return useQuery({
		queryKey: ['cases', params.caseYear, params.caseId, 'activity', params.page, params.pageSize, params.q],
		queryFn: () => {
			const search = new URLSearchParams();
			search.set('page', String(params.page));
			search.set('pageSize', String(params.pageSize));
			if (params.q) search.set('q', params.q);
			return api<PagedResult<AuditLogEntry>>('GET', `/cases/${params.caseYear}/${params.caseId}/activity?${search.toString()}`);
		}
	});
}

export function useCreateCase() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: {
			caseYear: number;
			registrationNo: string;
			complainantName: string;
			subject: string;
			sectionAssigned: SectionAssigned;
		}) => api<any>('POST', '/cases', input),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['cases'] });
		}
	});
}

export function useUpdateCaseStatus() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { caseYear: number; caseId: string; newStatus: CaseStatus; remarks: string }) =>
			api<any>('POST', `/cases/${input.caseYear}/${input.caseId}/status`, { newStatus: input.newStatus, remarks: input.remarks }),
		onSuccess: (_data, vars) => {
			qc.invalidateQueries({ queryKey: ['cases'] });
			qc.invalidateQueries({ queryKey: ['cases', vars.caseYear, vars.caseId] });
			qc.invalidateQueries({ queryKey: ['cases', vars.caseYear, vars.caseId, 'transitions'] });
		}
	});
}

export function useAssignCaseSection(caseYear: number, caseId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { sectionAssigned: SectionAssigned; reason: string }) =>
			api<any>('POST', `/cases/${caseYear}/${caseId}/assign-section`, input),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['cases'] });
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId] });
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId, 'activity'] });
		}
	});
}

// Order sheets
export function useOrderSheets(caseYear: number, caseId: string) {
	return useQuery({
		queryKey: ['cases', caseYear, caseId, 'order-sheets'],
		queryFn: () => api<OrderSheet[]>('GET', `/cases/${caseYear}/${caseId}/order-sheets`)
	});
}

export function useCreateOrderSheet(caseYear: number, caseId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { title: string; body: string }) => api<OrderSheet>('POST', `/cases/${caseYear}/${caseId}/order-sheets`, input),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId] });
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId, 'transitions'] });
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId, 'order-sheets'] });
		}
	});
}

export function useUpdateOrderSheet(caseYear: number, caseId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { orderSheetId: string; title?: string; body?: string }) =>
			api<OrderSheet>('PATCH', `/cases/order-sheets/${input.orderSheetId}`, { title: input.title, body: input.body }),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId] });
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId, 'order-sheets'] });
		}
	});
}

export function useOrderSheetAction(caseYear: number, caseId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { orderSheetId: string; action: 'submit' | 'registrar_forward' | 'registrar_revise' | 'commissioner_approve' | 'commissioner_revise'; remarks?: string }) => {
			switch (input.action) {
				case 'submit':
					return api<OrderSheet>('POST', `/cases/order-sheets/${input.orderSheetId}/submit`, { remarks: input.remarks });
				case 'registrar_forward':
					return api<OrderSheet>('POST', `/cases/order-sheets/${input.orderSheetId}/registrar/forward`, { remarks: input.remarks });
				case 'registrar_revise':
					return api<OrderSheet>('POST', `/cases/order-sheets/${input.orderSheetId}/registrar/revise`, { remarks: input.remarks });
				case 'commissioner_approve':
					return api<OrderSheet>('POST', `/cases/order-sheets/${input.orderSheetId}/commissioner/approve`, { remarks: input.remarks });
				case 'commissioner_revise':
					return api<OrderSheet>('POST', `/cases/order-sheets/${input.orderSheetId}/commissioner/revise`, { remarks: input.remarks });
				default:
					throw new Error('Unknown action');
			}
		},
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId] });
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId, 'transitions'] });
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId, 'order-sheets'] });
		}
	});
}

// Forwarding letters
export function useForwardingLetters(caseYear: number, caseId: string) {
	return useQuery({
		queryKey: ['cases', caseYear, caseId, 'forwarding-letters'],
		queryFn: () => api<ForwardingLetter[]>('GET', `/cases/${caseYear}/${caseId}/forwarding-letters`)
	});
}

export function useCreateForwardingLetter(caseYear: number, caseId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { subject: string; body: string }) => api<ForwardingLetter>('POST', `/cases/${caseYear}/${caseId}/forwarding-letters`, input),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId] });
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId, 'forwarding-letters'] });
		}
	});
}

export function useUpdateForwardingLetter(caseYear: number, caseId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { letterId: string; subject?: string; body?: string }) =>
			api<ForwardingLetter>('PATCH', `/cases/forwarding-letters/${input.letterId}`, { subject: input.subject, body: input.body }),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId, 'forwarding-letters'] });
		}
	});
}

export function useForwardingLetterAction(caseYear: number, caseId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { letterId: string; action: 'submit' | 'sign'; remarks?: string }) => {
			if (input.action === 'submit') return api<ForwardingLetter>('POST', `/cases/forwarding-letters/${input.letterId}/submit`, { remarks: input.remarks });
			if (input.action === 'sign') return api<ForwardingLetter>('POST', `/cases/forwarding-letters/${input.letterId}/sign`, { remarks: input.remarks });
			throw new Error('Unknown action');
		},
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId, 'forwarding-letters'] });
		}
	});
}

// Dispatch
export function useCaseDispatch(caseYear: number, caseId: string) {
	return useQuery({
		queryKey: ['cases', caseYear, caseId, 'dispatch'],
		queryFn: () => api<CaseDispatch[]>('GET', `/cases/${caseYear}/${caseId}/dispatch`)
	});
}

export function useCreateDispatch(caseYear: number, caseId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { type: DispatchType; channel: DispatchChannel; addressTo?: string; trackingNo?: string }) =>
			api<CaseDispatch>('POST', `/cases/${caseYear}/${caseId}/dispatch`, input),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId] });
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId, 'transitions'] });
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId, 'dispatch'] });
		}
	});
}

export function useUpdateDispatchDelivery(caseYear: number, caseId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { dispatchId: string; channel?: DispatchChannel; addressTo?: string; trackingNo?: string }) =>
			api<CaseDispatch>('PATCH', `/dispatch/${input.dispatchId}/delivery`, {
				channel: input.channel,
				addressTo: input.addressTo,
				trackingNo: input.trackingNo
			}),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId] });
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId, 'dispatch'] });
		}
	});
}

export function useMarkDispatchReceived(caseYear: number, caseId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { dispatchId: string; remarks?: string }) => api<CaseDispatch>('POST', `/dispatch/${input.dispatchId}/mark-received`, { remarks: input.remarks }),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId] });
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId, 'dispatch'] });
		}
	});
}

export function useSetCaseNo(caseYear: number, caseId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { caseNo: string }) =>
			api<any>('PATCH', `/cases/${caseYear}/${caseId}/case-no`, { caseNo: input.caseNo }),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId] });
		}
	});
}

export function useUpdateCasePriority(caseYear: number, caseId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { priority: CasePriority; remarks?: string }) =>
			api<any>('PATCH', `/cases/${caseYear}/${caseId}/priority`, { priority: input.priority, remarks: input.remarks ?? '' }),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['cases'] });
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId] });
			await qc.invalidateQueries({ queryKey: ['cases', caseYear, caseId, 'activity'] });
			await qc.invalidateQueries({ queryKey: ['cases'] });
		}
	});
}
