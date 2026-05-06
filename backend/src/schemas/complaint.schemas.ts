import { z } from 'zod';

export const createComplaintSchema = z.object({
	referenceNo: z.string().trim().min(1).max(64).optional(),
	name: z.string().min(2).max(200),
	createdBySource: z.enum(['SELF', 'DISTRICT_DEPARTMENT_OFFICER', 'OTHER']),
	createdByOtherName: z.string().min(2).max(200).optional(),
	complainantType: z.enum(['INDIVIDUAL', 'ORGANIZATION']),
	contact: z.string().max(200).optional(),
	district: z.string().min(2).max(200),
	complainantAddressLine1: z.string().min(3).max(500),
	complainantAddressLine2: z.string().max(500).optional(),
	complainantBlock: z.string().min(2).max(200).optional(),
	complainantPoliceStation: z.string().min(2).max(200).optional(),
	complainantPostOffice: z.string().min(2).max(200).optional(),
	complainantCity: z.string().min(2).max(200),
	complainantState: z.string().min(2).max(200),
	complainantPostalCode: z.string().min(2).max(50),
	accusedName: z.string().min(2).max(200),
	accusedType: z.enum(['INDIVIDUAL', 'ORGANIZATION']),
	accusedAddressLine1: z.string().min(3).max(500),
	accusedAddressLine2: z.string().max(500).optional(),
	accusedBlock: z.string().min(2).max(200).optional(),
	accusedPoliceStation: z.string().min(2).max(200).optional(),
	accusedPostOffice: z.string().min(2).max(200).optional(),
	accusedDistrict: z.string().min(2).max(200),
	accusedCity: z.string().min(2).max(200),
	accusedState: z.string().min(2).max(200),
	accusedPostalCode: z.string().min(2).max(50),
	subject: z.string().min(3).max(500),
	description: z.string().min(3).max(10_000),
	channel: z.enum(['EMAIL', 'PHONE', 'IN_PERSON', 'LETTER', 'ONLINE_PORTAL']),
	disabilityTypeId: z.string().uuid().optional(),
	linkedCaseYear: z.coerce.number().int().min(2000).max(2100).optional(),
	linkedCaseId: z.string().uuid().optional()
});

export const updateComplaintSchema = createComplaintSchema
	.omit({ referenceNo: true, linkedCaseYear: true, linkedCaseId: true })
	.partial();

export const listComplaintsSchema = z.object({
	q: z.string().optional(),
	diary: z.enum(['missing', 'created', 'all']).optional(),
	channel: z.enum(['EMAIL', 'PHONE', 'IN_PERSON', 'LETTER', 'ONLINE_PORTAL']).optional(),
	linkedCaseYear: z.coerce.number().int().min(2000).max(2100).optional(),
	linkedCaseId: z.string().uuid().optional(),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(200).default(20)
});

export const diaryEntrySchema = z.object({
	caseYear: z.coerce.number().int().min(2000).max(2100),
	registrationNo: z.string().min(1).max(64),
	sectionAssigned: z.enum(['LEGAL', 'OE', 'REGISTRAR', 'STATIONERY', 'COMMISSIONER']).default('COMMISSIONER')
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type ListComplaintsQuery = z.infer<typeof listComplaintsSchema>;
export type DiaryEntryInput = z.infer<typeof diaryEntrySchema>;
export type UpdateComplaintInput = z.infer<typeof updateComplaintSchema>;
