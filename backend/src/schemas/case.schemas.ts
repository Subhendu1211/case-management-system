import { z } from 'zod';

export const createCaseSchema = z.object({
	caseYear: z.coerce.number().int().min(2000).max(2100),
	registrationNo: z.string().min(3),
	complainantName: z.string().min(2),
	subject: z.string().min(3),
	sectionAssigned: z.enum(['LEGAL', 'OE', 'REGISTRAR', 'STATIONERY', 'COMMISSIONER', 'PROGRAMMER'])
});

export const listCasesSchema = z.object({
	q: z.string().optional(),
	status: z
		.enum([
			'DRAFT',
			'DIARY_ENTERED',
			'REGISTERED',
			'UNDER_REVIEW',
			'REVIEW_DONE',
			'CASE_ACCEPTED',
			'PS_POST_ACCEPTANCE',
			'PA_INITIAL_REVIEW',
			'PENDING_QUERY',
			'ROUTED_TO_LEGAL',
			'REGISTRAR_INITIAL_REVIEW',
			'PROGRAMMER_REVIEW',
			'STATIONERY_REVIEW',
			'ROUTED_TO_OE',
			'NOT_RELATED',
			'ORDER_SHEET_DRAFTED',
			'REGISTRAR_REVIEW',
			'PA_TO_COMMISSIONER',
			'COMMISSIONER_APPROVAL',
			'APPROVED',
			'PA_POST_APPROVAL',
			'REGISTRAR_HANDOVER',
			'LEGAL_FORWARDING',
			'FORWARDING_STATIONERY',
			'REGISTRAR_SIGNING',
			'DISPATCH_PENDING',
			'DISPATCHED',
			'REGISTRAR_FINAL_REVIEW',
			'CLOSED'
		])
		.optional(),
	sectionAssigned: z.enum(['LEGAL', 'OE', 'REGISTRAR', 'STATIONERY', 'COMMISSIONER', 'PROGRAMMER']).optional(),
	assignedTo: z.string().uuid().optional(),
	caseYear: z.coerce.number().int().min(2000).max(2100).optional(),
	view: z.enum(['processing_house']).optional(),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(200).default(20)
});

export const updateCaseStatusSchema = z.object({
	newStatus: z.enum([
		'DIARY_ENTERED',
		'REGISTERED',
		'UNDER_REVIEW',
		'REVIEW_DONE',
		'CASE_ACCEPTED',
		'PS_POST_ACCEPTANCE',
		'PA_INITIAL_REVIEW',
		'PENDING_QUERY',
		'ROUTED_TO_LEGAL',
		'REGISTRAR_INITIAL_REVIEW',
		'PROGRAMMER_REVIEW',
		'STATIONERY_REVIEW',
		'ROUTED_TO_OE',
		'NOT_RELATED',
		'ORDER_SHEET_DRAFTED',
		'REGISTRAR_REVIEW',
		'PA_TO_COMMISSIONER',
		'COMMISSIONER_APPROVAL',
		'APPROVED',
		'PA_POST_APPROVAL',
		'REGISTRAR_HANDOVER',
		'LEGAL_FORWARDING',
		'FORWARDING_STATIONERY',
		'REGISTRAR_SIGNING',
		'DISPATCH_PENDING',
		'DISPATCHED',
		'REGISTRAR_FINAL_REVIEW',
		'CLOSED'
	]),
	remarks: z.string().trim().min(1, 'Comment is required').max(2000)
});

export const assignCaseSectionSchema = z.object({
	sectionAssigned: z.enum(['LEGAL', 'OE', 'REGISTRAR', 'STATIONERY', 'COMMISSIONER']),
	reason: z.string().trim().min(3).max(2000)
});

export const updateCasePrioritySchema = z.object({
	priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
	remarks: z.string().trim().optional().default('')
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type ListCasesQuery = z.infer<typeof listCasesSchema>;
export type UpdateCaseStatusInput = z.infer<typeof updateCaseStatusSchema>;
export type UpdateCasePriorityInput = z.infer<typeof updateCasePrioritySchema>;
