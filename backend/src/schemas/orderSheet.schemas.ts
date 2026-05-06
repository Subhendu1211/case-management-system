import { z } from 'zod';

export const createOrderSheetSchema = z.object({
	title: z.string().min(3).max(300),
	body: z.string().min(10).max(20000)
});

export const updateOrderSheetSchema = z.object({
	title: z.string().min(3).max(300).optional(),
	body: z.string().min(10).max(20000).optional()
});

export const orderSheetActionSchema = z.object({
	remarks: z.string().max(2000).optional()
});

export type CreateOrderSheetInput = z.infer<typeof createOrderSheetSchema>;
export type UpdateOrderSheetInput = z.infer<typeof updateOrderSheetSchema>;
export type OrderSheetActionInput = z.infer<typeof orderSheetActionSchema>;
