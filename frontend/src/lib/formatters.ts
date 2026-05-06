import type { CaseStatus, CasePriority } from './types';

/**
 * Formats a CaseStatus for display in the UI.
 * Uses custom UI labels for selected workflow statuses.
 */
export function formatCaseStatus(status: CaseStatus): string {
    const statusLabels: Partial<Record<CaseStatus, string>> = {
        CLOSED: 'Waiting for response',
        UNDER_REVIEW: 'Under Discution',
        REVIEW_DONE: 'Verification Done',
        REGISTRAR_INITIAL_REVIEW: 'Registara Intial Verification',
        PROGRAMMER_REVIEW: 'Programmer',
        STATIONERY_REVIEW: 'Stationery Works',
        REGISTRAR_REVIEW: 'Registrar Verifications'
    };

    return statusLabels[status] ?? status.replace(/_/g, ' ');
}

/**
 * Formats a CasePriority for display in the UI.
 */
export function formatCasePriority(priority: CasePriority): string {
    const priorityLabels: Record<CasePriority, string> = {
        LOW: 'Low',
        MEDIUM: 'Normal',
        HIGH: '🔴 Urgent',
        CRITICAL: '🔴 Immediate'
    };
    return priorityLabels[priority] || priority;
}
