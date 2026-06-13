import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { Tabs } from '../../components/Tabs';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import type { CaseDispatch, CaseStatus, DispatchChannel, DispatchType, ForwardingLetter, OrderSheet, Role, SectionAssigned, CasePriority } from '../../lib/types';
import { downloadFile, resolveFileUrl } from '../../lib/api';
import {
	useCaseDetail,
	useCaseDispatch,
	useCaseTransitions,
	useCaseDocuments,
	useCaseActivity,
	useCreateForwardingLetter,
	useCreateDispatch,
	useCreateOrderSheet,
	useUploadCaseDocuments,
	useForwardingLetterAction,
	useForwardingLetters,
	useMarkDispatchReceived,
	useOrderSheetAction,
	useOrderSheets,
	useUpdateCaseStatus,
	useAssignCaseSection,
	useUpdateDispatchDelivery,
	useUpdateForwardingLetter,
	useUpdateOrderSheet,
	useQueryLetters,
	useCreateQueryLetter,
	useIssueRegister,
	useDispatchQueryLetter,
	useSetCaseNo,
	useUpdateCasePriority
} from '../../lib/queries/cases.queries';
import { useMe } from '../../lib/queries/auth.queries';
import { navForRole } from '../admin/AdminShell';
import { formatCaseStatus } from '../../lib/formatters';

export function CaseDetailPage() {
	const { caseYear, caseId } = useParams();
	const cy = Number(caseYear ?? 0);
	const cid = caseId ?? '';
	const nav = useNavigate();
	const me = useMe();
	const role = me.data?.user?.role;
	const userId = me.data?.user?.id;
	const [tab, setTab] = useState<'timeline' | 'documents' | 'orders' | 'letters' | 'dispatch' | 'activity' | 'queries' | 'issue-register'>('timeline');
	const [orderModalOpen, setOrderModalOpen] = useState(false);
	const [orderEditing, setOrderEditing] = useState<OrderSheet | null>(null);
	const [orderTitle, setOrderTitle] = useState('');
	const [orderBody, setOrderBody] = useState('');
	const [actionMessage, setActionMessage] = useState<string | null>(null);
	const [queryModalOpen, setQueryModalOpen] = useState(false);
	const [queryRecipient, setQueryRecipient] = useState<'complainant' | 'accused'>('complainant');
	const [queryChannel, setQueryChannel] = useState<DispatchChannel>('EMAIL');
	const [querySubject, setQuerySubject] = useState('');
	const [queryBody, setQueryBody] = useState('');
	const [letterModalOpen, setLetterModalOpen] = useState(false);
	const [letterEditing, setLetterEditing] = useState<ForwardingLetter | null>(null);
	const [letterSubject, setLetterSubject] = useState('');
	const [letterBody, setLetterBody] = useState('');
	const [letterRecipient, setLetterRecipient] = useState<'complainant' | 'accused'>('complainant');

	const [remarksModal, setRemarksModal] = useState<null | { kind: 'order'; orderSheetId: string; action: any; title: string }>(null);
	const [remarks, setRemarks] = useState('');
	const [remarksError, setRemarksError] = useState<string | null>(null);
	const [statusModal, setStatusModal] = useState<null | { toStatus: CaseStatus; label: string }>(null);
	const [statusRemarks, setStatusRemarks] = useState('');
	const [statusError, setStatusError] = useState<string | null>(null);

	const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
	const [dispatchEditing, setDispatchEditing] = useState<CaseDispatch | null>(null);
	const [dispatchType, setDispatchType] = useState<DispatchType>('OUTWARD');
	const [dispatchChannel, setDispatchChannel] = useState<DispatchChannel>('BY_HAND');
	const [dispatchAddressTo, setDispatchAddressTo] = useState('');
	const [dispatchTrackingNo, setDispatchTrackingNo] = useState('');
	const [assignSection, setAssignSection] = useState<SectionAssigned | undefined>(undefined);
	const [assignReason, setAssignReason] = useState('');
	const [assignReasonError, setAssignReasonError] = useState<string | null>(null);

	const [activityPage, setActivityPage] = useState(1);
	const [caseNoInput, setCaseNoInput] = useState('');
	const [caseNoError, setCaseNoError] = useState<string | null>(null);
	const [priorityModalOpen, setPriorityModalOpen] = useState(false);
	const [selectedPriority, setSelectedPriority] = useState<CasePriority>('MEDIUM');
	const [priorityRemarks, setPriorityRemarks] = useState('');
	const [priorityError, setPriorityError] = useState<string | null>(null);

	const detail = useCaseDetail(cy, cid);
	const transitions = useCaseTransitions(cy, cid);
	const documents = useCaseDocuments(cy, cid);
	const updateStatus = useUpdateCaseStatus();
	const assignSectionMutation = useAssignCaseSection(cy, cid);
	const uploadDocuments = useUploadCaseDocuments(cy, cid);
	const setCaseNo = useSetCaseNo(cy, cid);
	const updatePriority = useUpdateCasePriority(cy, cid);

	const navItems = navForRole(role);

	const orderSheets = useOrderSheets(cy, cid);
	const createOrder = useCreateOrderSheet(cy, cid);
	const updateOrder = useUpdateOrderSheet(cy, cid);
	const orderAction = useOrderSheetAction(cy, cid);

	const forwardingLetters = useForwardingLetters(cy, cid);
	const createLetter = useCreateForwardingLetter(cy, cid);
	const updateLetter = useUpdateForwardingLetter(cy, cid);
	const letterAction = useForwardingLetterAction(cy, cid);

	const queryLetters = useQueryLetters(cy, cid);
	const createQueryLetter = useCreateQueryLetter(cy, cid);
	const issueRegister = useIssueRegister(cy, cid);
	const dispatchQueryLetter = useDispatchQueryLetter(cy, cid);

	const dispatches = useCaseDispatch(cy, cid);
	const createDispatch = useCreateDispatch(cy, cid);
	const updateDispatchDelivery = useUpdateDispatchDelivery(cy, cid);
	const markDispatchReceived = useMarkDispatchReceived(cy, cid);
	const activity = useCaseActivity({ caseYear: cy, caseId: cid, page: activityPage, pageSize: 20 });
	const handleTabChange = (id: string) => setTab(id as typeof tab);

	function isForbidden(err: any) {
		const msg = (err as any)?.message?.toString().toLowerCase?.() ?? '';
		return (err as any)?.status === 403 || msg.includes('forbidden');
	}

	function friendlyError(err: any, fallback: string) {
		if (isForbidden(err)) return 'You do not have access to this section with your current role.';
		return (err as any)?.message ?? fallback;
	}

	const tabs = useMemo(
		() => [
			{ id: 'timeline', label: 'Timeline' },
			{ id: 'documents', label: 'Documents' },
			{ id: 'orders', label: 'Order sheets' },
			{ id: 'letters', label: 'Forwarding letters' },
			{ id: 'queries', label: 'Query letters' },
			{ id: 'dispatch', label: 'Dispatch' },
			{ id: 'issue-register', label: 'Issue register' },
			{ id: 'activity', label: 'Activity log' }
		],
		[]
	);

	const sectionOptions: SectionAssigned[] = ['LEGAL', 'OE', 'REGISTRAR', 'STATIONERY', 'COMMISSIONER'];

	function isPrivilegedRole(r?: Role) {
		return r === 'ADMIN' || r === 'PRIVATE_SECRETARY' || r === 'COMMISSIONER' || r === 'PRIVATE_ASSISTANT';
	}

	function mapRoleToSection(r?: Role): SectionAssigned | null {
		switch (r) {
			case 'LEGAL_ASSISTANT':
				return 'LEGAL';
			case 'REGISTRAR':
				return 'REGISTRAR';
			case 'PROGRAMMER':
				return 'PROGRAMMER';
			case 'STATIONERY':
				return 'STATIONERY';
			case 'COMPUTER_ASSISTANT':
				return 'STATIONERY';
			case 'COMMISSIONER':
				return 'COMMISSIONER';
			default:
				return null;
		}
	}

	function sectionForStatus(status: CaseStatus): SectionAssigned | null {
		switch (status) {
			case 'PA_INITIAL_REVIEW':
			case 'ROUTED_TO_LEGAL':
			case 'PA_TO_COMMISSIONER':
			case 'PA_POST_APPROVAL':
				return 'COMMISSIONER';
			case 'REGISTRAR_INITIAL_REVIEW':
			case 'REGISTRAR_REVIEW':
			case 'REGISTRAR_HANDOVER':
			case 'REGISTRAR_SIGNING':
				return 'REGISTRAR';
			case 'PROGRAMMER_REVIEW':
			case 'LEGAL_FORWARDING':
				return 'PROGRAMMER';
			case 'STATIONERY_REVIEW':
			case 'DISPATCH_PENDING':
				return 'STATIONERY';
			case 'FORWARDING_STATIONERY':
				return 'COMMISSIONER';
			case 'ROUTED_TO_OE':
				return 'OE';
			case 'REGISTERED':
			case 'ORDER_SHEET_DRAFTED':
			case 'PENDING_QUERY':
				return 'LEGAL';
			case 'UNDER_REVIEW':
			case 'REVIEW_DONE':
			case 'CASE_ACCEPTED':
			case 'COMMISSIONER_APPROVAL':
			case 'APPROVED':
				return 'COMMISSIONER';
			default:
				return null;
		}
	}

	function canCreateOrder(r?: Role) {
		return r === 'LEGAL_ASSISTANT' || r === 'REGISTRAR' || r === 'ADMIN';
	}

	function canCreateLetter(r?: Role) {
		return r === 'REGISTRAR' || r === 'PRIVATE_SECRETARY' || r === 'LEGAL_ASSISTANT' || r === 'PROGRAMMER' || r === 'ADMIN';
	}

	function canManageDispatch(r?: Role) {
		return r === 'STATIONERY' || r === 'COMPUTER_ASSISTANT' || r === 'ADMIN';
	}

	function canUploadDocuments(r?: Role) {
		return !!r;
	}

	function formatAddress(parts: Array<string | undefined | null>) {
		return parts.filter((p) => p && String(p).trim().length > 0).join(', ');
	}

	function buildOrderTemplate(item?: any) {
		const complaint = item?.complaints?.[0];
		const complainantAddress = complaint
			? formatAddress([
				complaint.complainantAddressLine1,
				complaint.complainantAddressLine2,
				complaint.complainantCity,
				complaint.complainantDistrict ?? complaint.district,
				complaint.complainantState,
				complaint.complainantPostalCode
			])
			: '';
		const accusedAddress = complaint
			? formatAddress([
				complaint.accusedAddressLine1,
				complaint.accusedAddressLine2,
				complaint.accusedCity,
				complaint.accusedDistrict,
				complaint.accusedState,
				complaint.accusedPostalCode
			])
			: '';

		const header = [
			'IN THE COURT OF STATE COMMISSIONER FOR PERSONS WITH DISABILITIES, ODISHA',
			'BLOCK-A-1, GROUND FLOOR, TOSHALI BHAWAN,',
			'SATYANAGAR, BHUBANESWAR',
			'Email: scpdorissa@gmail.com, Phone No-0674-2571006'
		].join('\n');
		const caseLine = `SCPD Case No. ${item?.caseNo ?? item?.registrationNo ?? ''}/${item?.caseYear ?? ''}`.trim();
		const letterLine = 'Letter No. _____ /SCPD    Date: _____';
		const firstParty = item?.complainantName ? `First party: ${item.complainantName}` : 'First party: ____________________';
		const firstAddress = `Address: ${complainantAddress || '______________________________'}`;
		const secondParty = complaint?.accusedName ? `Second party: ${complaint.accusedName}` : 'Second party: ____________________';
		const secondAddress = `Address: ${accusedAddress || '______________________________'}`;
		const subjectLine = item?.subject ? `Subject: ${item.subject}` : 'Subject: ____________________';

		return [
			header,
			'',
			caseLine,
			letterLine,
			'',
			firstParty,
			firstAddress,
			'',
			secondParty,
			secondAddress,
			'',
			subjectLine,
			'',
			'Body:',
			'',
			'',
			'Enclosures:',
			'1. ____________________'
		].join('\n');
	}

	function buildForwardingLetterTemplate(recipient: 'complainant' | 'accused') {
		const complaint = detail.data?.complaints?.[0];
		const caseLabel = `SCPD Case No. ${detail.data?.caseNo ?? detail.data?.registrationNo ?? ''}/${detail.data?.caseYear ?? ''}`.trim();
		const firstParty = complaint?.complainantName ?? detail.data?.complainantName ?? 'First party';
		const secondParty = complaint?.accusedName ?? 'Second party';
		const toAddressParts = recipient === 'complainant'
			? [
				complaint?.name ?? complaint?.complainantName ?? detail.data?.complainantName ?? '',
				complaint?.complainantAddressLine1,
				complaint?.complainantAddressLine2,
				complaint?.complainantCity,
				complaint?.complainantDistrict ?? complaint?.district,
				complaint?.complainantState,
				complaint?.complainantPostalCode
			]
			: [
				complaint?.accusedName ?? detail.data?.accusedName ?? '',
				complaint?.accusedAddressLine1,
				complaint?.accusedAddressLine2,
				complaint?.accusedCity,
				complaint?.accusedDistrict,
				complaint?.accusedState,
				complaint?.accusedPostalCode
			];

		const headerLines = [
			'IN THE COURT OF STATE COMMISSIONER FOR PERSONS WITH DISABILITIES,',
			'ODISHA',
			'BLOCK-A-1, GROUND FLOOR, TOSHALI BHAWAN,',
			'SATYANAGAR, BHUBANESWAR',
			'Email: scpdorissa@gmail.com , Phone No-0674-2571006',
			caseLabel,
			firstParty,
			'Vs',
			secondParty,
			'Lr. No. ____ /SCPD     Date: ____'
		];

		const toBlock = ['To', ...toAddressParts.filter((p) => p && String(p).trim().length > 0).map((p) => String(p))];

		const bodyLines = [
			'', 'Sir,', '',
			'I am to forward herewith the copy of order dated ____ of State Commissioner for Persons with Disabilities passed in',
			`${caseLabel} for your information and necessary action.`,
			'',
			'By order of',
			'State Commissioner for',
			'Persons with Disabilities',
			'Registrar',
			'',
			'Enclosures:',
			'1. Copy of Order No.__ dated ____.',
		];

		return [...headerLines, '', ...toBlock, ...bodyLines].join('\n');
	}

	function escapeForHtml(text: string) {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function downloadOrderDoc(os: OrderSheet) {
		const content = os.body || buildOrderTemplate(detail.data);
		const lines = content.split('\n');
		const centerUntil = Math.min(lines.length, 14); // center-align header, case meta, parties (matches sample)
		const centerBlock = lines.slice(0, centerUntil).map(escapeForHtml).join('<br>');
		const bodyBlock = lines.slice(centerUntil).map(escapeForHtml).join('<br>');
		const html = `<!doctype html><html><head><meta charset="utf-8"></head><body style="font-family: serif;">
		<div style="text-align: center; line-height: 1.4;">${centerBlock}</div>
		<div style="white-space: pre-wrap; margin-top: 8px; line-height: 1.4;">${bodyBlock}</div>
		</body></html>`;
		const blob = new Blob([html], { type: 'application/msword' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${os.title || 'order-sheet'}.doc`;
		link.click();
		URL.revokeObjectURL(url);
	}

	const combinedDocuments = useMemo(() => {
		const list = [...(documents.data?.caseDocuments ?? []), ...(documents.data?.complaintDocuments ?? [])];
		return list.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
	}, [documents.data]);

	const complaint = detail.data?.complaints?.[0];
	const complainantAddress = useMemo(() => {
		if (!complaint) return '';
		return formatAddress([
			complaint.complainantAddressLine1,
			complaint.complainantAddressLine2,
			complaint.complainantCity,
			complaint.complainantDistrict ?? complaint.district,
			complaint.complainantState,
			complaint.complainantPostalCode
		]);
	}, [complaint]);

	const accusedAddress = useMemo(() => {
		if (!complaint) return '';
		return formatAddress([
			complaint.accusedAddressLine1,
			complaint.accusedAddressLine2,
			complaint.accusedCity,
			complaint.accusedDistrict,
			complaint.accusedState,
			complaint.accusedPostalCode
		]);
	}, [complaint]);

	const activityTotalPages = useMemo(() => {
		const total = activity.data?.total ?? 0;
		const size = activity.data?.pageSize ?? 20;
		return Math.max(1, Math.ceil(total / size));
	}, [activity.data]);

	const nextStepHints = useMemo(() => {
		if (!detail.data) return [] as string[];
		const status = detail.data.status;
		const section = detail.data.sectionAssigned;
		const hints: string[] = [];
		const availableActions = (transitions.data ?? []).map((t) => labelFor(t.toStatus, t.description));

		if (availableActions.length) hints.push(`Available actions for your role: ${availableActions.join(', ')}`);
		if (!availableActions.length) hints.push('No direct actions for your role right now.');

		switch (status) {
			case 'DIARY_ENTERED':
				hints.push('Role: Private Secretary/Admin â€” send to Commissioner for review.');
				break;
			case 'UNDER_REVIEW':
				hints.push('Role: Commissioner â€” accept case for processing or return to PS.');
				break;
			case 'CASE_ACCEPTED':
				hints.push('Role: Private Secretary â€” receive accepted case.');
				break;
			case 'PS_POST_ACCEPTANCE':
				hints.push('Role: Private Secretary â€” send to PA for initial review.');
				break;
			case 'PA_INITIAL_REVIEW':
				hints.push('Role: Private Assistant â€” perform initial review and send to Registrar.');
				break;
			case 'REGISTRAR_INITIAL_REVIEW':
				hints.push('Role: Registrar â€” review and sign, then send to PA to route to legal.');
				break;
			case 'ROUTED_TO_LEGAL':
				hints.push('Role: Private Assistant â€” route to Programmer for case registration.');
				break;
			case 'PROGRAMMER_REVIEW':
				hints.push('Role: Programmer â€” perform case registration, then send to Stationery.');
				break;
			case 'STATIONERY_REVIEW':
				hints.push('Role: Stationery â€” print and send for order sheet preparation.');
				break;
			case 'REGISTERED':
				hints.push('Role: Legal Assistant / Registrar â€” received from Stationery; attach documents and draft the order sheet.');
				break;
			case 'ORDER_SHEET_DRAFTED':
				hints.push('Role: Legal Assistant / Registrar â€” submit to Registrar review stage.');
				break;
			case 'REGISTRAR_REVIEW':
				hints.push('Role: Registrar â€” review draft order and send to PA for Commissioner.');
				break;
			case 'PA_TO_COMMISSIONER':
				hints.push('Role: Private Assistant â€” route to Commissioner for approval.');
				break;
			case 'COMMISSIONER_APPROVAL':
				hints.push('Role: Commissioner â€” approve the order sheet.');
				break;
			case 'APPROVED':
				hints.push('Role: Commissioner â€” approved; routing to PA.');
				break;
			case 'PA_POST_APPROVAL':
				hints.push('Role: Private Assistant â€” send to Registrar.');
				break;
			case 'REGISTRAR_HANDOVER':
				hints.push('Role: Registrar â€” send to Programmer for forwarding letter.');
				break;
			case 'LEGAL_FORWARDING':
				hints.push('Role: Programmer â€” prepare forwarding letter and send to Registrar for signing.');
				break;
			case 'REGISTRAR_SIGNING':
				hints.push('Role: Registrar â€” sign forwarding letter and send to PS for letter number.');
				break;
			case 'FORWARDING_STATIONERY':
				hints.push('Role: Private Secretary â€” assign letter number and send to Stationery for dispatch.');
				break;
			case 'DISPATCH_PENDING':
				hints.push('Role: Stationery / Computer Assistant â€” dispatch the case.');
				break;
			case 'CLOSED':
				hints.push('Case is in Processing House (Waiting for response).');
				if (role === 'LEGAL_ASSISTANT' || role === 'ADMIN') {
					hints.push('Re-open by creating a new Order Sheet if communication is received.');
				}
				break;
			default:
				break;
		}

		if (section === 'LEGAL' && status !== 'CLOSED') {
			hints.push('Legal: keep remarks clear and attach supporting documents before submitting.');
		}

		return hints;
	}, [detail.data, transitions.data]);

	useEffect(() => {
		if (activityPage > activityTotalPages) {
			setActivityPage(activityTotalPages);
		}
	}, [activityPage, activityTotalPages]);

	useEffect(() => {
		if (detail.data?.sectionAssigned) {
			setAssignSection(detail.data.sectionAssigned as SectionAssigned);
		}
	}, [detail.data?.sectionAssigned]);

	async function handleAssignSave() {
		if (!assignSection) return;
		const reasonTrim = assignReason.trim();
		if (reasonTrim.length < 3) {
			setAssignReasonError('Reason must be at least 3 characters');
			return;
		}
		try {
			await assignSectionMutation.mutateAsync({ sectionAssigned: assignSection as SectionAssigned, reason: reasonTrim });
			setActionMessage('Section reassigned');
			setAssignReason('');
			setAssignReasonError(null);
		} catch (e) {
			// mutation error handled by mutation state
		}
	}

	function openCreateOrder() {
		setOrderEditing(null);
		setOrderTitle(detail.data ? `Order - ${detail.data.registrationNo}` : 'Order sheet');
		setOrderBody(buildOrderTemplate(detail.data));
		setOrderModalOpen(true);
	}

	function openEditOrder(os: OrderSheet) {
		setOrderEditing(os);
		setOrderTitle(os.title);
		setOrderBody(os.body || buildOrderTemplate(detail.data));
		setOrderModalOpen(true);
	}

	function openCreateLetter() {
		setLetterEditing(null);
		setLetterSubject('');
		setLetterBody('');
		setLetterRecipient('complainant');
		setLetterModalOpen(true);
	}

	function openCreateQuery() {
		setQueryRecipient('complainant');
		setQueryChannel('EMAIL');
		setQuerySubject(detail.data?.subject ? `Query: ${detail.data.subject}` : 'Query');
		setQueryBody('');
		setQueryModalOpen(true);
	}

	function openEditLetter(fl: ForwardingLetter) {
		setLetterEditing(fl);
		setLetterSubject(fl.subject);
		setLetterBody(fl.body);
		setLetterRecipient('complainant');
		setLetterModalOpen(true);
	}

	function openCreateDispatch() {
		setDispatchEditing(null);
		setDispatchType('OUTWARD');
		setDispatchChannel('BY_HAND');
		setDispatchAddressTo('');
		setDispatchTrackingNo('');
		setDispatchModalOpen(true);
	}

	function openEditDispatch(d: CaseDispatch) {
		setDispatchEditing(d);
		setDispatchType(d.type);
		setDispatchChannel(d.channel);
		setDispatchAddressTo(String(d.addressTo ?? ''));
		setDispatchTrackingNo(String(d.trackingNo ?? ''));
		setDispatchModalOpen(true);
	}

	async function saveOrder() {
		setActionMessage(null);
		if (orderEditing) {
			await updateOrder.mutateAsync({ orderSheetId: orderEditing.id, title: orderTitle, body: orderBody });
			setActionMessage('Order sheet updated');
		} else {
			await createOrder.mutateAsync({ title: orderTitle, body: orderBody });
			setActionMessage('Order sheet created');
		}
		setOrderModalOpen(false);
	}

	async function saveLetter() {
		setActionMessage(null);
		if (letterEditing) {
			await updateLetter.mutateAsync({ letterId: letterEditing.id, subject: letterSubject, body: letterBody });
			setActionMessage('Forwarding letter updated');
		} else {
			await createLetter.mutateAsync({ subject: letterSubject, body: letterBody });
			setActionMessage('Forwarding letter created');
		}
		setLetterModalOpen(false);
	}

	async function saveQueryLetter() {
		setActionMessage(null);
		await createQueryLetter.mutateAsync({
			recipientType: queryRecipient,
			channel: queryChannel,
			subject: querySubject,
			body: queryBody
		});
		setActionMessage('Query letter created');
		setQueryModalOpen(false);
	}

	async function sendQueryToDispatch(queryLetterId: string) {
		setActionMessage(null);
		await dispatchQueryLetter.mutateAsync({ queryLetterId });
		setActionMessage('Query sent to dispatch');
	}

	async function saveDispatch() {
		setActionMessage(null);
		if (dispatchEditing) {
			await updateDispatchDelivery.mutateAsync({
				dispatchId: dispatchEditing.id,
				channel: dispatchChannel,
				addressTo: dispatchAddressTo || undefined,
				trackingNo: dispatchTrackingNo || undefined
			});
			setActionMessage('Dispatch delivery updated');
		} else {
			await createDispatch.mutateAsync({
				type: dispatchType,
				channel: dispatchChannel,
				addressTo: dispatchAddressTo || undefined,
				trackingNo: dispatchTrackingNo || undefined
			});
			setActionMessage('Dispatch created');
		}
		setDispatchModalOpen(false);
	}

	function requestOrderRemarks(input: { orderSheetId: string; action: any; title: string }) {
		setRemarks('');
		setRemarksError(null);
		setRemarksModal({ kind: 'order', ...input });
	}

	async function submitRemarks() {
		if (!remarksModal) return;
		setRemarksError(null);
		try {
			await orderAction.mutateAsync({ orderSheetId: remarksModal.orderSheetId, action: remarksModal.action, remarks });
			setActionMessage('Action completed');
			setRemarks('');
			setRemarksModal(null);
		} catch (e: any) {
			setRemarksError(e?.message ?? 'Failed to submit');
		}
	}

	async function handleUpload(files: FileList | null) {
		if (!files || files.length === 0) return;
		setActionMessage(null);
		await uploadDocuments.mutateAsync(Array.from(files));
		setActionMessage('Documents uploaded');
	}

	async function handleDocumentDownload(downloadUrl?: string | null, preferredName?: string | null) {
		setActionMessage(null);
		const resolvedUrl = resolveFileUrl(downloadUrl);
		if (!resolvedUrl) {
			setActionMessage('Document link is unavailable.');
			return;
		}
		try {
			const blob = await downloadFile(resolvedUrl);
			const objectUrl = window.URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = objectUrl;
			if (preferredName?.trim()) {
				anchor.download = preferredName.trim();
			}
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
		} catch (e) {
			setActionMessage(friendlyError(e, 'Unable to download document.'));
		}
	}


	function buildQueryLetterTemplate(recipient: 'complainant' | 'accused') {
		const complaint = detail.data?.complaints?.[0];
		const caseLabel = `SCPD Case No. ${detail.data?.caseNo ?? detail.data?.registrationNo ?? ''}/${detail.data?.caseYear ?? ''}`.trim();
		const toAddressParts = recipient === 'complainant'
			? [
				complaint?.name ?? detail.data?.complainantName ?? '',
				complaint?.complainantAddressLine1,
				complaint?.complainantAddressLine2,
				complaint?.complainantCity,
				complaint?.complainantDistrict ?? complaint?.district,
				complaint?.complainantState,
				complaint?.complainantPostalCode
			]
			: [
				complaint?.accusedName ?? '',
				complaint?.accusedAddressLine1,
				complaint?.accusedAddressLine2,
				complaint?.accusedCity,
				complaint?.accusedDistrict,
				complaint?.accusedState,
				complaint?.accusedPostalCode
			];

		const headerLines = [
			'IN THE COURT OF STATE COMMISSIONER FOR PERSONS WITH DISABILITIES,',
			'ODISHA',
			'BLOCK-A-1, GROUND FLOOR, TOSHALI BHAWAN,',
			'SATYANAGAR, BHUBANESWAR',
			'Email: scpdorissa@gmail.com, Phone No-0674-2571006'
		];
		const toAddressLines = toAddressParts.filter(Boolean).map((line) => String(line));
		const letterLine = 'Letter No. _____ /SCPD    Date: _____';
		const subjectLine = 'Subject: ____________________';

		return [
			...headerLines,
			'',
			caseLabel,
			letterLine,
			'',
			...toAddressLines,
			'',
			subjectLine,
			'',
			'Body:',
			'',
			''
		].join('\n');
	}
	function labelFor(toStatus: CaseStatus, description?: string | null) {
		if (description) {
			const frontendLabelOverrides: Record<string, string> = {
				'Re-open case from Processing House (New Communication)': 'To be Process from Processing House',
				'Re-open closed case to Registered when PA uploads new communication': 'To be Process to Registered'
			};
			return frontendLabelOverrides[description] ?? description;
		}
		switch (toStatus) {
			case 'UNDER_REVIEW':
				return 'Send to Commissioner for review';
			case 'CASE_ACCEPTED':
				return 'Accept case';
			case 'PS_POST_ACCEPTANCE':
				return 'Receive accepted case';
			case 'PA_INITIAL_REVIEW':
				return 'Send to PA for initial review';
			case 'REGISTRAR_INITIAL_REVIEW':
				return 'Send to Registrar for review and sign';
			case 'ROUTED_TO_LEGAL':
				return 'Send to PA to route to legal';
			case 'PROGRAMMER_REVIEW':
				return 'Route to Programmer for registration';
			case 'STATIONERY_REVIEW':
				return 'Send to Stationery';
			case 'REGISTERED':
				return 'Send for order sheet preparation';
			case 'ORDER_SHEET_DRAFTED':
				return 'Mark order sheet drafted';
			case 'REGISTRAR_REVIEW':
				return 'Submit to Registrar for review';
			case 'PA_TO_COMMISSIONER':
				return 'Send to PA for Commissioner';
			case 'COMMISSIONER_APPROVAL':
				return 'Route to Commissioner for approval';
			case 'APPROVED':
				return 'Approve order';
			case 'PA_POST_APPROVAL':
				return 'Send to PA';
			case 'REGISTRAR_HANDOVER':
				return 'Send to Registrar';
			case 'LEGAL_FORWARDING':
				return 'Send to Programmer for forwarding letter';
			case 'FORWARDING_STATIONERY':
				return 'Send to PS for letter number';
			case 'REGISTRAR_SIGNING':
				return 'Send to Registrar for signing';
			case 'DISPATCH_PENDING':
				return 'Send to Stationery for dispatch';
			case 'DISPATCHED':
				return 'Mark as dispatched';
			case 'CLOSED':
				return 'Dispatch and close case';
			case 'DIARY_ENTERED':
				return 'Return to PS';
			default:
				return description || `Move to ${toStatus.replace(/_/g, ' ')}`;
		}
	}

	function stripESignTag(remarks: string | null | undefined) {
		if (!remarks) return '';
		return remarks.replace(/\s*\[ESIGN_(?:REGISTRAR|COMMISSIONER):[^\]]+\]\s*/g, ' ').trim();
	}

	function resetStatusActionState() {
		setStatusRemarks('');
		setStatusError(null);
	}

	async function runTransition(toStatus: CaseStatus) {
		setActionMessage(null);
		setStatusError(null);
		try {
			await updateStatus.mutateAsync({ caseYear: cy, caseId: cid, newStatus: toStatus, remarks: statusRemarks.trim() });
			setActionMessage(`Status updated to ${formatCaseStatus(toStatus)}`);
			setStatusModal(null);
			resetStatusActionState();

			const nextSection = sectionForStatus(toStatus);
			if (nextSection && !isPrivilegedRole(role)) {
				const roleSection = mapRoleToSection(role);
				if (roleSection && roleSection !== nextSection) {
					nav('/cases');
				}
			}
		} catch (err: any) {
			setStatusError(friendlyError(err, 'Unable to complete this action.'));
		}
	}

	return (
		<AppShell title="SCPD CMS" nav={navItems}>
			<h1 className="text-xl font-semibold">Case detail</h1>
			{detail.isLoading ? (
				<div className="mt-4" role="status" aria-live="polite">
					Loading...
				</div>
			) : null}
			{detail.error ? (
				<div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-800" role="alert" aria-live="assertive">
					{friendlyError(detail.error, 'Unable to load case.')}
				</div>
			) : null}
			{actionMessage ? (
				<div className="mt-4 rounded-lg bg-semantic-success/10 p-3 text-sm text-semantic-success" role="status" aria-live="polite">
					{actionMessage}
				</div>
			) : null}
			{updateStatus.error ? (
				<div className="mt-4 rounded-lg bg-semantic-danger/10 p-3 text-sm text-semantic-danger" role="alert" aria-live="assertive">
					{friendlyError(updateStatus.error, 'Unable to update status.')}
				</div>
			) : null}
			{detail.data ? (
				<div className="mt-4">
					<div className="glass-card p-4">
						<div className="flex flex-wrap items-center gap-4 border-b border-neutral-200 pb-3 mb-3">
							<div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
								<svg className="h-4 w-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
								<div>
									<div className="text-xs font-semibold uppercase tracking-wide text-blue-600">Dy. No.</div>
									<div className="font-bold text-blue-900">{detail.data.registrationNo}</div>
								</div>
							</div>
							{detail.data.caseNo ? (
								<div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
									<svg className="h-4 w-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
									<div>
										<div className="text-xs font-semibold uppercase tracking-wide text-green-600">Case No.</div>
										<div className="font-bold text-green-900">{detail.data.caseNo}/{detail.data.caseYear}</div>
									</div>
								</div>
							) : null}
						</div>
						<div className="text-sm text-neutral-700">{detail.data.registrationNo}</div>
						<div className="mt-1 text-lg font-semibold">{detail.data.subject}</div>
						<div className="mt-2 text-sm text-neutral-700">
							Status: <span className="font-medium">{formatCaseStatus(detail.data.status)}</span> · Section:{' '}
							<span className="font-medium">{detail.data.sectionAssigned}</span>
						</div>
						{nextStepHints.length ? (
							<div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-800">
								<div className="font-medium text-neutral-900">Next steps</div>
								<ul className="mt-2 list-disc space-y-1 pl-5">
									{nextStepHints.map((hint) => (
										<li key={hint}>{hint}</li>
									))}
								</ul>
							</div>
						) : null}

						{role === 'ADMIN' || role === 'COMMISSIONER' ? (
							<div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-800">
								<div className="flex items-center justify-between gap-2">
									<div className="font-medium text-neutral-900">Reassign section</div>
									{assignSectionMutation.isPending ? <span className="text-xs text-neutral-600">Saving...</span> : null}
								</div>
								{assignSectionMutation.error ? (
									<div className="mt-2 rounded-md bg-semantic-danger/10 px-3 py-2 text-semantic-danger" role="alert" aria-live="assertive">
										{friendlyError(assignSectionMutation.error, 'Unable to reassign section.')}
									</div>
								) : null}
								<div className="mt-3 grid gap-3 md:grid-cols-2">
									<label className="block text-sm text-neutral-800">
										<span className="mb-1 block text-xs text-neutral-700">Section</span>
										<select
											className="w-full rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-600"
											value={assignSection ?? ''}
											onChange={(e) => setAssignSection(e.target.value as SectionAssigned)}
										>
											<option value="">Select section</option>
											{sectionOptions.map((s) => (
												<option key={s} value={s}>
													{s}
												</option>
											))}
										</select>
									</label>
									<label className="block text-sm text-neutral-800">
										<span className="mb-1 block text-xs text-neutral-700">Reason</span>
										<textarea
											className="w-full rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-600"
											rows={3}
											value={assignReason}
											onChange={(e) => {
												setAssignReason(e.target.value);
												setAssignReasonError(null);
											}}
										/>
										{assignReasonError ? <div className="mt-2 text-sm text-semantic-danger" role="alert">{assignReasonError}</div> : null}
									</label>
								</div>
								<div className="mt-3 flex justify-end gap-2">
									<Button
										variant="secondary"
										onClick={() => {
											setAssignSection(detail.data?.sectionAssigned as SectionAssigned);
											setAssignReason('');
										}}
									>
										Reset
									</Button>
									<Button
										variant="primary"
										disabled={!assignSection || assignReason.trim().length < 3 || assignSectionMutation.isPending}
										onClick={handleAssignSave}
									>
										Save
									</Button>
								</div>
							</div>
						) : null}

						{role === 'ADMIN' || role === 'COMMISSIONER' ? (
							<div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-800">
								<div className="flex items-center justify-between gap-2">
									<div className="font-medium text-neutral-900">Case Priority</div>
									{updatePriority.isPending ? <span className="text-xs text-neutral-600">Saving...</span> : null}
								</div>
								{updatePriority.error ? (
									<div className="mt-2 rounded-md bg-semantic-danger/10 px-3 py-2 text-semantic-danger" role="alert" aria-live="assertive">
										{friendlyError(updatePriority.error, 'Unable to update priority.')}
									</div>
								) : null}
								<div className="mt-3">
									<div className="mb-3 text-sm">
										<span className="text-neutral-700">Current:</span>{' '}
										<span className="ml-2 inline-block rounded-full px-3 py-1 text-xs font-semibold"
											style={{
												background: detail.data?.priority === 'CRITICAL' ? '#fef2f2' :
													detail.data?.priority === 'HIGH' ? '#fef3c7' :
													detail.data?.priority === 'MEDIUM' ? '#ecfdf5' : '#f3f4f6',
												color: detail.data?.priority === 'CRITICAL' ? '#991b1b' :
													detail.data?.priority === 'HIGH' ? '#92400e' :
													detail.data?.priority === 'MEDIUM' ? '#065f46' : '#374151'
											}}
										>
											{detail.data?.priority === 'LOW' ? 'Low' :
												detail.data?.priority === 'MEDIUM' ? 'Normal' :
												detail.data?.priority === 'HIGH' ? 'Urgent' :
												'Immediate'}
										</span>
									</div>
									<Button
										variant="secondary"
										onClick={() => {
											setSelectedPriority(detail.data?.priority ?? 'MEDIUM');
											setPriorityRemarks('');
											setPriorityError(null);
											setPriorityModalOpen(true);
										}}
									>
										Set Priority
									</Button>
								</div>
							</div>
						) : null}

						<div className="mt-4 flex flex-wrap gap-2">
							{transitions.isLoading ? <div className="text-sm text-neutral-700">Loading actions...</div> : null}
							{transitions.error ? (
								<div className="text-sm text-neutral-700">{friendlyError(transitions.error, 'No actions available.')}</div>
							) : null}
							{(transitions.data ?? []).map((t) => (
								<Button
									key={t.toStatus}
									variant="secondary"
									disabled={updateStatus.isPending}
									onClick={() => {
										setStatusModal({ toStatus: t.toStatus, label: labelFor(t.toStatus, t.description) });
										resetStatusActionState();
									}}
								>
									{labelFor(t.toStatus, t.description)}
								</Button>
							))}
							{transitions.data && transitions.data.length === 0 ? (
								<div className="text-sm text-neutral-700">No actions available for your role.</div>
							) : null}
						</div>
						<div className="mt-4">
							<Tabs tabs={tabs} activeId={tab} onChange={handleTabChange} />
						</div>
					</div>

						{tab === 'documents' ? (
						<div className="mt-4 glass-card p-4">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div className="font-medium">Documents</div>
								{canUploadDocuments(role) ? (
									<label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 text-sm font-medium text-brand-700 transition hover:bg-neutral-200">
										<input
											type="file"
											multiple
											className="hidden"
											onChange={(e) => {
												handleUpload(e.target.files);
												e.target.value = '';
											}}
										/>
										<span>Upload files</span>
									</label>
								) : null}
							</div>

							{uploadDocuments.isPending ? (
								<div className="mt-3 text-sm text-neutral-700" role="status" aria-live="polite">
									Uploadingâ€¦
								</div>
							) : null}
							{uploadDocuments.error ? (
								<div className="mt-3 text-sm text-neutral-700">{friendlyError(uploadDocuments.error, 'Upload not allowed.')}</div>
							) : null}

							{documents.isLoading ? (
								<div className="mt-3 text-sm text-neutral-700" role="status" aria-live="polite">
									Loadingâ€¦
								</div>
							) : null}
							{documents.error ? <div className="mt-3 text-sm text-neutral-700">{friendlyError(documents.error, 'Unable to load documents.')}</div> : null}

							<div className="mt-3 space-y-2">
								{combinedDocuments.map((doc) => (
									<div key={`${doc.source ?? 'case'}-${doc.id}`} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-neutral-200 p-3">
										<div>
											<div className="flex items-center gap-2 text-sm font-medium">
												<span>{doc.fileName}</span>
												<span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700">
													{doc.source === 'complaint' ? 'Complaint' : 'Case'}
												</span>
												{doc.source === 'complaint' && doc.complaint?.referenceNo ? (
													<span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
														{doc.complaint.referenceNo}
													</span>
												) : null}
											</div>
											<div className="mt-1 text-xs text-neutral-700">
												{doc.mimeType} Â· {(doc.sizeBytes / 1024).toFixed(1)} KB
												{doc.createdAt ? ` Â· Uploaded ${new Date(doc.createdAt).toLocaleString()}` : ''}
												{doc.uploadedBy?.name ? ` by ${doc.uploadedBy.name}` : ''}
											</div>
										</div>
										<div className="flex flex-wrap gap-2">
											{doc.downloadUrl ? (
												<button
													type="button"
													className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-neutral-50"
													onClick={() => handleDocumentDownload(doc.downloadUrl, doc.fileName)}
												>
													Download
												</button>
											) : null}
										</div>
									</div>
								))}
								{combinedDocuments.length === 0 ? (
									<div className="rounded-lg border border-dashed border-neutral-200 p-3 text-sm text-neutral-700">No documents yet.</div>
								) : null}
							</div>
						</div>
					) : null}

					{tab === 'timeline' ? (
						<div className="mt-4 space-y-4">
							{complaint ? (
								<div className="glass-card p-4">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div className="font-medium">Complaint summary</div>
										<div className="text-xs text-neutral-700">Ref: {complaint.referenceNo}</div>
									</div>
									<div className="mt-2 grid gap-3 text-sm md:grid-cols-2">
										<div className="rounded-lg border border-neutral-200 p-3">
											<div className="text-xs uppercase tracking-wide text-neutral-600">Complainant</div>
											<div className="font-semibold text-neutral-900">{complaint.name}</div>
											<div className="text-xs text-neutral-700">{complaint.complainantType}</div>
											<div className="mt-1 text-neutral-800">{complainantAddress || 'No address on file'}</div>
											<div className="mt-1 text-xs text-neutral-700">District: {complaint.complainantDistrict ?? complaint.district ?? 'â€”'}</div>
										</div>
										<div className="rounded-lg border border-neutral-200 p-3">
											<div className="text-xs uppercase tracking-wide text-neutral-600">Opposite Party (Respondent)</div>
											<div className="font-semibold text-neutral-900">{complaint.accusedName}</div>
											<div className="text-xs text-neutral-700">{complaint.accusedType}</div>
											<div className="mt-1 text-neutral-800">{accusedAddress || 'No address on file'}</div>
											<div className="mt-1 text-xs text-neutral-700">District: {complaint.accusedDistrict ?? 'â€”'}</div>
										</div>
									</div>
									<div className="mt-2 text-sm text-neutral-900">Channel: {complaint.channel}</div>
									<div className="mt-1 text-sm text-neutral-900">Subject: {complaint.subject}</div>

									<div className="mt-1 whitespace-pre-wrap text-sm text-neutral-800">{complaint.description}</div>
								</div>
							) : null}

							{/* â”€â”€ Programmer: assign Case Number â”€â”€ */}
							{(role === 'PROGRAMMER' || role === 'ADMIN') && detail.data?.status === 'PROGRAMMER_REVIEW' ? (
								<div className="glass-card p-4 border-l-4 border-green-500">
									<div className="font-medium text-neutral-900">ðŸ“‹ Case Registration â€” Assign Case Number</div>
									<div className="mt-1 text-xs text-neutral-600">Enter the official SCPD case number for this case. This will be permanently recorded.</div>
									{setCaseNo.error ? (
										<div className="mt-2 rounded-md bg-semantic-danger/10 px-3 py-2 text-sm text-semantic-danger" role="alert">{(setCaseNo.error as any)?.message ?? 'Failed to set case number'}</div>
									) : null}
									<div className="mt-3 flex items-center gap-3">
										<input
											id="prog-case-no-input"
											type="text"
											placeholder={`e.g. ${detail.data.caseYear}/SCPD/001`}
											value={caseNoInput}
											onChange={(e) => { setCaseNoInput(e.target.value); setCaseNoError(null); }}
											className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-600"
										/>
										<Button
											variant="primary"
											disabled={!caseNoInput.trim() || setCaseNo.isPending}
											onClick={async () => {
												if (!caseNoInput.trim()) { setCaseNoError('Case number is required'); return; }
												try {
													await setCaseNo.mutateAsync({ caseNo: caseNoInput.trim() });
													setActionMessage('Case number assigned successfully');
													setCaseNoInput('');
												} catch (e: any) {
													setCaseNoError(e?.message ?? 'Failed to set case number');
												}
											}}
										>
											{setCaseNo.isPending ? 'Savingâ€¦' : 'Assign Case No.'}
										</Button>
									</div>
									{caseNoError ? <div className="mt-1 text-sm text-semantic-danger">{caseNoError}</div> : null}
									{detail.data.caseNo ? (
										<div className="mt-2 text-sm text-green-700 font-medium">âœ“ Current case number: <strong>{detail.data.caseNo}/{detail.data.caseYear}</strong></div>
									) : null}
								</div>
							) : null}

							<div className="glass-card p-4">
								<div className="font-medium">Timeline</div>
								<div className="mt-2 space-y-2 text-sm">
									{(detail.data.statusHistory ?? []).map((h: any) => (
										<div key={h.id} className="rounded-lg border border-neutral-200 p-3">
											<div>
												{h.oldStatus} â†’ <span className="font-medium">{h.newStatus}</span>
											</div>
											<div className="text-xs text-neutral-700">{new Date(h.changedAt).toLocaleString()}</div>
											{stripESignTag(h.remarks) ? <div className="mt-1 text-neutral-700">{stripESignTag(h.remarks)}</div> : null}
										</div>
									))}
								</div>
							</div>
						</div>
					) : null}

					{tab === 'orders' ? (
						<div className="mt-4 glass-card p-4">
							<div className="flex items-center justify-between">
								<div className="font-medium">Order sheets</div>
								{canCreateOrder(role) ? (
									<Button variant="secondary" onClick={openCreateOrder}>
										New order sheet
									</Button>
								) : null}
							</div>

							{orderSheets.isLoading ? (
								<div className="mt-3 text-sm text-neutral-700" role="status" aria-live="polite">
									Loadingâ€¦
								</div>
							) : null}
							{orderSheets.error ? <div className="mt-3 text-sm text-neutral-700">{friendlyError(orderSheets.error, 'Unable to load order sheets.')}</div> : null}

							<div className="mt-3 space-y-2">
								{(orderSheets.data ?? []).map((os) => {
									const isOwner = !!userId && os.preparedById === userId;
									const canEditAsOwnerOrAdmin =
										os.status === 'DRAFT' ||
										os.status === 'REVISIONS_REQUESTED_BY_REGISTRAR' ||
										os.status === 'REVISIONS_REQUESTED_BY_COMMISSIONER';
									const canRegistrarEditLegalPreparedSubmitted =
										role === 'REGISTRAR' &&
										os.preparedBy?.role === 'LEGAL_ASSISTANT' &&
										os.status === 'SUBMITTED';
									const canEdit =
										((role === 'ADMIN' || isOwner) && canEditAsOwnerOrAdmin) ||
										canRegistrarEditLegalPreparedSubmitted;

									return (
										<div key={os.id} className="rounded-lg border border-neutral-200 p-3">
											<div className="flex flex-wrap items-start justify-between gap-2">
												<div>
													<div className="font-medium">{os.title}</div>
													<div className="mt-1 text-xs text-neutral-700">
														Status: <span className="font-medium">{os.status}</span>
														{os.preparedBy?.name ? <> Â· Prepared by: {os.preparedBy.name}</> : null}
													</div>
												</div>
												<div className="flex flex-wrap gap-2">
													<Button variant="ghost" onClick={() => downloadOrderDoc(os)}>
														Download .doc
													</Button>
													{canEdit ? (
														<Button variant="secondary" onClick={() => openEditOrder(os)}>
															Edit
														</Button>
													) : null}

													{(role === 'LEGAL_ASSISTANT' || role === 'ADMIN') && (role === 'ADMIN' || isOwner) && canEdit ? (
														<Button
															variant="primary"
															disabled={orderAction.isPending}
															onClick={() => requestOrderRemarks({ orderSheetId: os.id, action: 'submit', title: 'Submit to Registrar' })}
														>
															Submit
														</Button>
													) : null}

													{(role === 'REGISTRAR' || role === 'ADMIN') && os.status === 'SUBMITTED' ? (
														<>
															<Button
																variant="secondary"
																disabled={orderAction.isPending}
																onClick={() => requestOrderRemarks({ orderSheetId: os.id, action: 'registrar_revise', title: 'Request Revision' })}
															>
																Request revision
															</Button>
															<Button
																variant="primary"
																disabled={orderAction.isPending}
																onClick={() => requestOrderRemarks({ orderSheetId: os.id, action: 'registrar_forward', title: 'Forward to Commissioner' })}
															>
																Forward
															</Button>
														</>
													) : null}

													{(role === 'COMMISSIONER' || role === 'ADMIN') && os.status === 'FORWARDED_BY_REGISTRAR' ? (
														<>
															<Button
																variant="secondary"
																disabled={orderAction.isPending}
																onClick={() => requestOrderRemarks({ orderSheetId: os.id, action: 'commissioner_revise', title: 'Request Revision' })}
															>
																Request revision
															</Button>
															<Button
																variant="primary"
																disabled={orderAction.isPending}
																onClick={() => requestOrderRemarks({ orderSheetId: os.id, action: 'commissioner_approve', title: 'Approve Order Sheet' })}
															>
																Approve
															</Button>
														</>
													) : null}
												</div>
											</div>

											<div className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">{os.body}</div>
										</div>
									);
								})}
								{orderSheets.data && orderSheets.data.length === 0 ? (
									<div className="rounded-lg border border-dashed border-neutral-200 p-3 text-sm text-neutral-700">No order sheets yet.</div>
								) : null}
							</div>
						</div>
					) : null}

					{tab === 'letters' ? (
						<div className="mt-4 glass-card p-4">
							<div className="flex items-center justify-between">
								<div className="font-medium">Forwarding letters</div>
								{canCreateLetter(role) ? (
									<Button variant="secondary" onClick={openCreateLetter}>
										New letter
									</Button>
								) : null}
							</div>

							{forwardingLetters.isLoading ? (
								<div className="mt-3 text-sm text-neutral-700" role="status" aria-live="polite">
									Loadingâ€¦
								</div>
							) : null}
							{forwardingLetters.error ? <div className="mt-3 text-sm text-neutral-700">{friendlyError(forwardingLetters.error, 'Unable to load forwarding letters.')}</div> : null}

							<div className="mt-3 space-y-2">
								{(forwardingLetters.data ?? []).map((fl) => {
									const isOwner = !!userId && fl.preparedById === userId;
									return (
										<div key={fl.id} className="rounded-lg border border-neutral-200 p-3">
											<div className="flex flex-wrap items-start justify-between gap-2">
												<div>
													<div className="font-medium">{fl.subject}</div>
													<div className="mt-1 text-xs text-neutral-700">
														Status: <span className="font-medium">{fl.status}</span>
														{fl.signedBy?.name ? <> Â· Signed by: {fl.signedBy.name}</> : null}
													</div>
												</div>
												<div className="flex flex-wrap gap-2">
													{(role === 'ADMIN' || role === 'REGISTRAR') &&
													(fl.status === 'DRAFT' || fl.status === 'PENDING_SIGNATURE') ? (
														<Button variant="secondary" onClick={() => openEditLetter(fl)}>
															Edit
														</Button>
													) : null}

													{(role === 'ADMIN' || isOwner) && fl.status === 'DRAFT' ? (
														<Button variant="primary" disabled={letterAction.isPending} onClick={() => letterAction.mutateAsync({ letterId: fl.id, action: 'submit' }).then(() => setActionMessage('Submitted for signature'))}>
															Submit for signature
														</Button>
													) : null}

													{(role === 'REGISTRAR' || role === 'ADMIN') && fl.status === 'PENDING_SIGNATURE' ? (
														<Button variant="primary" disabled={letterAction.isPending} onClick={() => letterAction.mutateAsync({ letterId: fl.id, action: 'sign' }).then(() => setActionMessage('Letter signed'))}>
															Sign
														</Button>
													) : null}
												</div>
											</div>

											<div className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">{fl.body}</div>
										</div>
									);
								})}
								{forwardingLetters.data && forwardingLetters.data.length === 0 ? (
									<div className="rounded-lg border border-dashed border-neutral-200 p-3 text-sm text-neutral-700">No forwarding letters yet.</div>
								) : null}
							</div>
						</div>
					) : null}

					{tab === 'queries' ? (
						<div className="mt-4 glass-card p-4">
							<div className="flex items-center justify-between">
								<div className="font-medium">Query letters</div>
								{(role === 'LEGAL_ASSISTANT' || role === 'ADMIN') ? (
									<Button variant="secondary" onClick={openCreateQuery}>
										New query letter
									</Button>
								) : null}
							</div>

							{queryLetters.isLoading ? (
								<div className="mt-3 text-sm text-neutral-700" role="status" aria-live="polite">
									Loadingâ€¦
								</div>
							) : null}
							{queryLetters.error ? (
								<div className="mt-3 text-sm text-neutral-700">{friendlyError(queryLetters.error, 'Unable to load query letters.')}</div>
							) : null}

							<div className="mt-3 space-y-2">
								{(queryLetters.data ?? []).map((ql) => (
									<div key={ql.id} className="rounded-lg border border-neutral-200 p-3">
										<div className="flex flex-wrap items-start justify-between gap-2">
											<div>
												<div className="font-medium">{ql.subject}</div>
												<div className="mt-1 text-xs text-neutral-700">
													To: {ql.recipientType === 'complainant' ? 'First party' : 'Second party'} Â· Channel: {ql.channel}
													{ql.createdAt ? ` Â· ${new Date(ql.createdAt).toLocaleString()}` : ''}
												</div>
											</div>
											<div className="flex flex-wrap gap-2">
												{(role === 'LEGAL_ASSISTANT' || role === 'STATIONERY' || role === 'ADMIN') ? (
													<Button
														variant="secondary"
														disabled={dispatchQueryLetter.isPending}
														onClick={() => sendQueryToDispatch(ql.id)}
													>
														Send to dispatch
													</Button>
												) : null}
											</div>
										</div>
										{ql.body ? <div className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">{ql.body}</div> : null}
									</div>
								))}
								{(queryLetters.data ?? []).length === 0 ? (
									<div className="rounded-lg border border-dashed border-neutral-200 p-3 text-sm text-neutral-700">No query letters yet.</div>
								) : null}
							</div>
						</div>
					) : null}

					{tab === 'issue-register' ? (
						<div className="mt-4 glass-card p-4">
							<div className="font-medium">Issue register</div>

							{issueRegister.isLoading ? (
								<div className="mt-3 text-sm text-neutral-700" role="status" aria-live="polite">
									Loadingâ€¦
								</div>
							) : null}
							{issueRegister.error ? (
								<div className="mt-3 text-sm text-neutral-700">{friendlyError(issueRegister.error, 'Unable to load issue register.')}</div>
							) : null}

							<div className="mt-3 space-y-2">
								{(issueRegister.data ?? []).map((entry) => (
									<div key={entry.id} className="rounded-lg border border-neutral-200 p-3">
										<div className="flex flex-wrap items-start justify-between gap-2">
											<div>
												<div className="font-medium">{entry.kind}</div>
												<div className="mt-1 text-xs text-neutral-700">
													{entry.subject ? `Subject: ${entry.subject} Â· ` : ''}
													{entry.recipient ? `To: ${entry.recipient} Â· ` : ''}
													{entry.channel ? `Channel: ${entry.channel} Â· ` : ''}
													{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ''}
												</div>
											</div>
											{entry.downloadUrl ? (
												<button
													type="button"
													className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-neutral-50"
													onClick={() => handleDocumentDownload(entry.downloadUrl, null)}
												>
													Download
												</button>
											) : null}
										</div>
										{entry.body ? <div className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">{entry.body}</div> : null}
									</div>
								))}
								{(issueRegister.data ?? []).length === 0 ? (
									<div className="rounded-lg border border-dashed border-neutral-200 p-3 text-sm text-neutral-700">No outgoing communications logged yet.</div>
								) : null}
							</div>
						</div>
					) : null}

					{tab === 'dispatch' ? (
						<div className="mt-4 glass-card p-4">
							<div className="flex items-center justify-between">
								<div className="font-medium">Dispatch</div>
								{canManageDispatch(role) ? (
									<Button
										variant="secondary"
										onClick={openCreateDispatch}
										disabled={detail.data?.status !== 'DISPATCH_PENDING'}
									>
										New dispatch
									</Button>
								) : null}
							</div>
							{detail.data?.status !== 'DISPATCH_PENDING' && canManageDispatch(role) ? (
								<div className="mt-2 text-xs text-neutral-700">Case must be in DISPATCH_PENDING to create a dispatch.</div>
							) : null}

							{dispatches.isLoading ? (
								<div className="mt-3 text-sm text-neutral-700" role="status" aria-live="polite">
									Loadingâ€¦
								</div>
							) : null}
							{dispatches.error ? <div className="mt-3 text-sm text-neutral-700">{friendlyError(dispatches.error, 'Unable to load dispatch records.')}</div> : null}

							<div className="mt-3 space-y-2">
								{(dispatches.data ?? []).map((d) => (
									<div key={d.id} className="rounded-lg border border-neutral-200 p-3">
										<div className="flex flex-wrap items-start justify-between gap-2">
											<div>
												<div className="font-medium">
													{d.type} Â· {d.channel} Â· <span className="font-semibold">{d.status}</span>
												</div>
												<div className="mt-1 text-xs text-neutral-700">
													Dispatched: {new Date(d.dispatchedAt).toLocaleString()}
													{d.trackingNo ? <> Â· Tracking: {d.trackingNo}</> : null}
													{d.receivedAt ? <> Â· Received: {new Date(d.receivedAt).toLocaleString()}</> : null}
												</div>
												{d.addressTo ? <div className="mt-2 text-sm text-neutral-800 whitespace-pre-wrap">To: {d.addressTo}</div> : null}
											</div>
											<div className="flex flex-wrap gap-2">
												{canManageDispatch(role) && d.status !== 'RECEIVED' ? (
													<Button variant="secondary" onClick={() => openEditDispatch(d)}>
														Edit delivery
													</Button>
												) : null}
												{canManageDispatch(role) && d.status !== 'RECEIVED' ? (
													<Button
														variant="primary"
														disabled={markDispatchReceived.isPending}
														onClick={() =>
															markDispatchReceived
																.mutateAsync({ dispatchId: d.id })
																.then(() => setActionMessage('Marked as received'))
														}
													>
														Mark received
													</Button>
												) : null}
											</div>
										</div>
									</div>
								))}
								{dispatches.data && dispatches.data.length === 0 ? (
									<div className="rounded-lg border border-dashed border-neutral-200 p-3 text-sm text-neutral-700">No dispatch records yet.</div>
								) : null}
							</div>
						</div>
					) : null}

					{null}
				</div>
			) : null}

			{tab === 'activity' ? (
				<div className="mt-4 glass-card p-4">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="font-medium">Activity log</div>
						<div className="text-xs text-neutral-700">Audit trail for this case</div>
					</div>

					{activity.isLoading ? (
						<div className="mt-3 text-sm text-neutral-700" role="status" aria-live="polite">
							Loadingâ€¦
						</div>
					) : null}
					{activity.error ? <div className="mt-3 text-sm text-neutral-700">{friendlyError(activity.error, 'Unable to load activity log.')}</div> : null}

					<div className="mt-3 space-y-2">
						{(activity.data?.items ?? []).map((log) => (
							<div key={log.id} className="rounded-lg border border-neutral-200 p-3">
								<div className="flex flex-wrap items-start justify-between gap-2">
									<div>
										<div className="text-sm font-semibold">
											{log.action} Â· {log.module}
										</div>
										<div className="mt-1 text-xs text-neutral-700">
											{new Date(log.createdAt).toLocaleString()} Â· Status {log.statusCode}
											{log.user?.name ? ` Â· ${log.user.name}` : ''}
										</div>
										{log.entityId ? (
											<div className="text-xs text-neutral-700">Entity: {log.entityType ?? 'case'} Â· {log.entityId}</div>
										) : null}
										{(log.payloadSnapshot as any)?.path ? (
											<div className="text-xs text-neutral-700">Path: {(log.payloadSnapshot as any).path}</div>
										) : null}
									</div>
								</div>
							</div>
						))}
						{activity.data && (activity.data.items ?? []).length === 0 ? (
							<div className="rounded-lg border border-dashed border-neutral-200 p-3 text-sm text-neutral-700">No activity yet.</div>
						) : null}
					</div>

					<div className="mt-3 flex flex-wrap items-center justify-between gap-2">
						<div className="text-sm text-neutral-700">
							Page {activity.data?.page ?? activityPage} of {activityTotalPages}
						</div>
						<div className="flex gap-2">
							<Button variant="secondary" disabled={activityPage <= 1 || activity.isLoading} onClick={() => setActivityPage(Math.max(1, activityPage - 1))}>
								Prev
							</Button>
							<Button
								variant="secondary"
								disabled={activityPage >= activityTotalPages || activity.isLoading}
								onClick={() => setActivityPage(activityPage + 1)}
							>
								Next
							</Button>
						</div>
					</div>
				</div>
			) : null}

			<Modal
				open={orderModalOpen}
				title={orderEditing ? 'Edit order sheet' : 'New order sheet'}
				onClose={() => setOrderModalOpen(false)}
			>
				<div className="space-y-3">
					<Input label="Title" value={orderTitle} onChange={(e) => setOrderTitle(e.target.value)} />
					<label className="block">
						<div className="mb-1 text-xs font-medium text-neutral-700">Body</div>
						<textarea
							className="w-full rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
							rows={10}
							value={orderBody}
							onChange={(e) => setOrderBody(e.target.value)}
						/>
					</label>
					<div className="flex justify-end gap-2">
						<Button variant="secondary" onClick={() => setOrderModalOpen(false)}>
							Cancel
						</Button>
						<Button variant="primary" disabled={createOrder.isPending || updateOrder.isPending} onClick={saveOrder}>
							Save
						</Button>
					</div>
				</div>
			</Modal>

			<Modal
				open={letterModalOpen}
				title={letterEditing ? 'Edit forwarding letter' : 'New forwarding letter'}
				onClose={() => setLetterModalOpen(false)}
			>
				<div className="space-y-3">
					<Input label="Subject" value={letterSubject} onChange={(e) => setLetterSubject(e.target.value)} />
					<label className="block">
						<div className="mb-1 text-xs font-medium text-neutral-700">Body</div>
						<textarea
							className="w-full rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
							rows={10}
							value={letterBody}
							onChange={(e) => setLetterBody(e.target.value)}
						/>
					</label>
					<div className="flex flex-wrap items-center gap-3 text-sm">
						<label className="flex items-center gap-2 text-neutral-800">
							<input
								type="radio"
								name="letterRecipient"
								value="complainant"
								checked={letterRecipient === 'complainant'}
								onChange={() => setLetterRecipient('complainant')}
							/>
							<span>Send to first party</span>
						</label>
						<label className="flex items-center gap-2 text-neutral-800">
							<input
								type="radio"
								name="letterRecipient"
								value="accused"
								checked={letterRecipient === 'accused'}
								onChange={() => setLetterRecipient('accused')}
							/>
							<span>Send to second party</span>
						</label>
						<Button
							variant="secondary"
							onClick={() => {
								setLetterSubject(letterSubject || 'Forwarding of Order');
								setLetterBody(buildForwardingLetterTemplate(letterRecipient));
							}}
						>
							Use template
						</Button>
					</div>
					<div className="flex justify-end gap-2">
						<Button variant="secondary" onClick={() => setLetterModalOpen(false)}>
							Cancel
						</Button>
						<Button variant="primary" disabled={createLetter.isPending || updateLetter.isPending} onClick={saveLetter}>
							Save
						</Button>
					</div>
				</div>
			</Modal>

			<Modal open={queryModalOpen} title="New query letter" onClose={() => setQueryModalOpen(false)}>
				<div className="space-y-3">
					{createQueryLetter.error ? (
						<div className="rounded-md bg-semantic-danger/10 px-3 py-2 text-sm text-semantic-danger" role="alert" aria-live="assertive">
							{friendlyError(createQueryLetter.error, 'Unable to create query letter.')}
						</div>
					) : null}
					<Input label="Subject" value={querySubject} onChange={(e) => setQuerySubject(e.target.value)} />
					<label className="block">
						<div className="mb-1 text-xs font-medium text-neutral-700">Body</div>
						<textarea
							className="w-full rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
							rows={10}
							value={queryBody}
							onChange={(e) => setQueryBody(e.target.value)}
						/>
					</label>
					<div className="flex flex-wrap items-center gap-3 text-sm">
						<label className="flex items-center gap-2 text-neutral-800">
							<input
								type="radio"
								name="queryRecipient"
								value="complainant"
								checked={queryRecipient === 'complainant'}
								onChange={() => setQueryRecipient('complainant')}
							/>
							<span>Send to first party</span>
						</label>
						<label className="flex items-center gap-2 text-neutral-800">
							<input
								type="radio"
								name="queryRecipient"
								value="accused"
								checked={queryRecipient === 'accused'}
								onChange={() => setQueryRecipient('accused')}
							/>
							<span>Send to second party</span>
						</label>
						<select
							className="rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-600"
							value={queryChannel}
							onChange={(e) => setQueryChannel(e.target.value as DispatchChannel)}
						>
							<option value="EMAIL">Email</option>
							<option value="POST">Post</option>
							<option value="COURIER">Courier</option>
							<option value="BY_HAND">By hand</option>
						</select>
						<Button
							variant="secondary"
							onClick={() => {
								setQuerySubject(querySubject || 'Query');
								setQueryBody(buildQueryLetterTemplate(queryRecipient));
							}}
						>
							Use template
						</Button>
					</div>
					<div className="flex justify-end gap-2">
						<Button variant="secondary" onClick={() => setQueryModalOpen(false)}>
							Cancel
						</Button>
						<Button variant="primary" disabled={createQueryLetter.isPending || !querySubject.trim()} onClick={saveQueryLetter}>
							Save
						</Button>
					</div>
				</div>
			</Modal>

			<Modal open={!!remarksModal} title={remarksModal?.title ?? ''} onClose={() => setRemarksModal(null)}>
				<div className="space-y-3">
					{remarksError ? (
						<div className="rounded-md bg-semantic-danger/10 px-3 py-2 text-sm text-semantic-danger" role="alert" aria-live="assertive">
							{remarksError}
						</div>
					) : null}
					<label className="block">
						<div className="mb-1 text-xs font-medium text-neutral-700">Remarks (optional)</div>
						<textarea
							className="w-full rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
							rows={4}
							value={remarks}
							onChange={(e) => setRemarks(e.target.value)}
						/>
					</label>
					<div className="flex justify-end gap-2">
						<Button variant="secondary" onClick={() => setRemarksModal(null)}>
							Cancel
						</Button>
						<Button variant="primary" disabled={orderAction.isPending} onClick={submitRemarks}>
							Continue
						</Button>
					</div>
				</div>
			</Modal>

			<Modal
				open={!!statusModal}
				title={statusModal ? `Confirm: ${statusModal.label}` : ''}
				onClose={() => {
					if (updateStatus.isPending) return;
					setStatusModal(null);
					resetStatusActionState();
				}}
			>
				<div className="space-y-3">
					<div className="text-sm text-neutral-700">A comment is required for this action.</div>
					{statusError ? (
						<div className="rounded-md bg-semantic-danger/10 px-3 py-2 text-sm text-semantic-danger" role="alert">
							{statusError}
						</div>
					) : null}
					<label className="block">
						<div className="mb-1 text-xs font-medium text-neutral-700">Comment</div>
						<textarea
							className="w-full rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
							rows={4}
							value={statusRemarks}
							onChange={(e) => setStatusRemarks(e.target.value)}
						/>
					</label>
					<div className="flex justify-end gap-2">
						<Button
							variant="secondary"
							onClick={() => {
								setStatusModal(null);
								resetStatusActionState();
							}}
							disabled={updateStatus.isPending}
						>
							Cancel
						</Button>
						<Button
							variant="primary"
							disabled={
								!statusRemarks.trim() ||
								updateStatus.isPending ||
								!statusModal
							}
							onClick={() => statusModal && runTransition(statusModal.toStatus)}
						>
							{updateStatus.isPending ? 'Processing...' : 'Confirm'}
						</Button>
					</div>
				</div>
			</Modal>

			<Modal
				open={dispatchModalOpen}
				title={dispatchEditing ? 'Edit dispatch delivery' : 'New dispatch'}
				onClose={() => setDispatchModalOpen(false)}
			>
				<div className="space-y-3">
					{!dispatchEditing ? (
						<label className="block text-xs font-medium text-neutral-700">
							Type
							<select
								className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm"
								value={dispatchType}
								onChange={(e) => setDispatchType(e.target.value as DispatchType)}
							>
								<option value="OUTWARD">OUTWARD</option>
								<option value="INWARD">INWARD</option>
							</select>
						</label>
					) : null}

					<label className="block text-xs font-medium text-neutral-700">
						Channel
						<select
							className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm"
							value={dispatchChannel}
							onChange={(e) => setDispatchChannel(e.target.value as DispatchChannel)}
						>
							<option value="BY_HAND">BY_HAND</option>
							<option value="POST">POST</option>
							<option value="COURIER">COURIER</option>
							<option value="EMAIL">EMAIL</option>
						</select>
					</label>

					<Input label="Address to" value={dispatchAddressTo} onChange={(e) => setDispatchAddressTo(e.target.value)} />
					<Input label="Tracking no" value={dispatchTrackingNo} onChange={(e) => setDispatchTrackingNo(e.target.value)} />

					<div className="flex justify-end gap-2">
						<Button variant="secondary" onClick={() => setDispatchModalOpen(false)}>
							Cancel
						</Button>
						<Button
							variant="primary"
							disabled={createDispatch.isPending || updateDispatchDelivery.isPending}
							onClick={saveDispatch}
						>
							Save
						</Button>
					</div>
				</div>
			</Modal>

			<Modal
				open={priorityModalOpen}
				title="Set Case Priority"
				onClose={() => {
					if (updatePriority.isPending) return;
					setPriorityModalOpen(false);
					setPriorityError(null);
				}}
			>
				<div className="space-y-3">
					{priorityError ? (
						<div className="rounded-md bg-semantic-danger/10 px-3 py-2 text-sm text-semantic-danger" role="alert" aria-live="assertive">
							{priorityError}
						</div>
					) : null}

					<label className="block text-xs font-medium text-neutral-700">
						Priority Level
						<select
							className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-600"
							value={selectedPriority}
							onChange={(e) => setSelectedPriority(e.target.value as CasePriority)}
							disabled={updatePriority.isPending}
						>
							<option value="LOW">Low</option>
							<option value="MEDIUM">Normal (Default)</option>
							<option value="HIGH">ðŸ”´ Urgent</option>
							<option value="CRITICAL">ðŸ”´ Immediate</option>
						</select>
					</label>

					<label className="block text-xs font-medium text-neutral-700">
						Remarks (Optional)
						<textarea
							className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-600"
							rows={3}
							value={priorityRemarks}
							onChange={(e) => setPriorityRemarks(e.target.value)}
							placeholder="e.g., Urgent case - deadline approaching"
							disabled={updatePriority.isPending}
						/>
					</label>

					<div className="flex justify-end gap-2">
						<Button
							variant="secondary"
							onClick={() => setPriorityModalOpen(false)}
							disabled={updatePriority.isPending}
						>
							Cancel
						</Button>
						<Button
							variant="primary"
							disabled={updatePriority.isPending}
							onClick={async () => {
								try {
									await updatePriority.mutateAsync({
										priority: selectedPriority,
										remarks: priorityRemarks
									});
									setPriorityModalOpen(false);
									setPriorityError(null);
									setActionMessage('Priority updated successfully');
									setTimeout(() => setActionMessage(null), 3000);
								} catch (err) {
									setPriorityError(friendlyError(err, 'Unable to update priority'));
								}
							}}
						>
							{updatePriority.isPending ? 'Savingâ€¦' : 'Save Priority'}
						</Button>
					</div>
				</div>
			</Modal>
		</AppShell>
	);
}

export default CaseDetailPage;

