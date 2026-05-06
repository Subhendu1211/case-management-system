import { prisma } from '../db/prisma.js';

function jsonSafeBigInt(value: unknown): unknown {
	if (typeof value !== 'bigint') return value;

	const asNumber = Number(value);
	return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
}

function jsonSafeRow(row: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = { ...row };

	for (const [key, value] of Object.entries(out)) {
		out[key] = jsonSafeBigInt(value);
	}

	return out;
}

function jsonSafeResult<T>(result: T): T {
	if (Array.isArray(result)) {
		return result.map((row) => {
			if (!row || typeof row !== 'object' || row instanceof Date) return row;
			return jsonSafeRow(row as Record<string, unknown>);
		}) as T;
	}

	if (!result || typeof result !== 'object' || result instanceof Date) return result;
	return jsonSafeRow(result as Record<string, unknown>) as T;
}

export async function getDashboardCards() {
	// These are backed by MVs in db/schema.sql
	// Prisma doesn't model MVs; use raw queries.
	const rows = (await prisma.$queryRawUnsafe(`SELECT * FROM mv_dashboard_cards`)) as any[];
	return jsonSafeResult(rows);
}

export async function getCaseSummary() {
	const rows = (await prisma.$queryRawUnsafe(
		`SELECT * FROM mv_case_summary ORDER BY case_year DESC, section_assigned, status`
	)) as any[];
	return jsonSafeResult(rows);
}

export async function getLegalPendency() {
	const rows = (await prisma.$queryRawUnsafe(`SELECT * FROM mv_legal_pendency ORDER BY age_days DESC`)) as any[];
	return jsonSafeResult(rows);
}

export async function getCommissionerWorkload() {
	const rows = (await prisma.$queryRawUnsafe(`SELECT * FROM mv_commissioner_workload`)) as any[];
	return jsonSafeResult(rows);
}

export async function getRegistrarQueue() {
	const rows = (await prisma.$queryRawUnsafe(`SELECT * FROM mv_registrar_queue ORDER BY created_at ASC`)) as any[];
	return jsonSafeResult(rows);
}

export async function getDispatchTracking() {
	const rows = (await prisma.$queryRawUnsafe(`SELECT * FROM mv_dispatch_tracking ORDER BY dispatched_at DESC`)) as any[];
	return jsonSafeResult(rows);
}

export async function getRolePendency() {
	// Pending = any case not closed; grouped by assignee role (or UNASSIGNED when null)
	const rows = (await prisma.$queryRawUnsafe(
		`SELECT COALESCE(u.role::text, 'UNASSIGNED') AS role, COUNT(*)::bigint AS count
FROM cases c
LEFT JOIN users u ON c.assigned_to_id = u.id
WHERE c.status <> 'CLOSED'
GROUP BY COALESCE(u.role::text, 'UNASSIGNED')
ORDER BY role`
	)) as any[];
	return jsonSafeResult(rows);
}

export async function getComplaintPendingCount() {
	const count = await prisma.complaint.count({ where: { linkedCaseId: null } });
	return { pending_complaints: count };
}

export async function getProcessingHouseCount() {
	const count = await prisma.case.count({ where: { status: 'DISPATCHED' } });
	return { processing_house: count };
}
