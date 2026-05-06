import { z } from 'zod';

export const createDispatchSchema = z.object({
	type: z.enum(['INWARD', 'OUTWARD']),
	channel: z.enum(['BY_HAND', 'POST', 'COURIER', 'EMAIL']),
	addressTo: z.string().max(2000).optional(),
	trackingNo: z.string().max(200).optional()
});

export const updateDispatchDeliverySchema = z.object({
	channel: z.enum(['BY_HAND', 'POST', 'COURIER', 'EMAIL']).optional(),
	addressTo: z.string().max(2000).optional(),
	trackingNo: z.string().max(200).optional()
});

export const dispatchActionSchema = z.object({
	remarks: z.string().max(2000).optional()
});

export type CreateDispatchInput = z.infer<typeof createDispatchSchema>;
export type UpdateDispatchDeliveryInput = z.infer<typeof updateDispatchDeliverySchema>;
export type DispatchActionInput = z.infer<typeof dispatchActionSchema>;
