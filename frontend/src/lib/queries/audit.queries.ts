import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import type { AuditLogEntry, PagedResult } from '../types';

export function useAuditLogs(params: {
	q?: string;
	module?: string;
	action?: string;
	entityType?: string;
	entityId?: string;
	userId?: string;
	statusCode?: number;
	from?: string; // ISO string
	to?: string; // ISO string
	page: number;
	pageSize: number;
}) {
	const search = new URLSearchParams();
	if (params.q) search.set('q', params.q);
	if (params.module) search.set('module', params.module);
	if (params.action) search.set('action', params.action);
	if (params.entityType) search.set('entityType', params.entityType);
	if (params.entityId) search.set('entityId', params.entityId);
	if (params.userId) search.set('userId', params.userId);
	if (params.statusCode) search.set('statusCode', String(params.statusCode));
	if (params.from) search.set('from', params.from);
	if (params.to) search.set('to', params.to);
	search.set('page', String(params.page));
	search.set('pageSize', String(params.pageSize));

	return useQuery({
		queryKey: ['audit-logs', params],
		queryFn: () => api<PagedResult<AuditLogEntry>>('GET', `/audit-logs?${search.toString()}`)
	});
}
