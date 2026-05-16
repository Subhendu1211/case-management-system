export type Role =
	| 'PRIVATE_SECRETARY'
	| 'PRIVATE_ASSISTANT'
	| 'COMMISSIONER'
	| 'LEGAL_ASSISTANT'
	| 'REGISTRAR'
	| 'PROGRAMMER'
	| 'STATIONERY'
	| 'COMPUTER_ASSISTANT'
	| 'ADMIN'
	| 'CITIZEN';

export type PartyType = 'INDIVIDUAL' | 'ORGANIZATION';

export type User = {
	id: string;
	email: string;
	name: string;
	role: Role;
};

export type AuthLoginSuccess = {
	accessToken: string;
	refreshToken: string;
	user: User;
};

export type AuthLoginOtpChallenge = {
	requiresOtp: true;
	otpRequestId: string;
	channel: 'EMAIL' | 'SMS';
	recipientHint: string;
	message: string;
};

export type AuthLoginResult = AuthLoginSuccess | AuthLoginOtpChallenge;

export type UserAdmin = User & {
	isActive: boolean;
	createdAt: string;
};

export type AuditLogEntry = {
	createdAt: string;
	id: string;
	module: string;
	action: string;
	entityType: string;
	entityId?: string | null;
	statusCode: number;
	ip?: string | null;
	ipAddress?: string | null;
	userAgent?: string | null;
	payloadSnapshot?: any;
	user?: { id: string; name: string; email: string; role: Role } | null;
};

export type CaseStatus =
	| 'DRAFT'
	| 'DIARY_ENTERED'
	| 'REGISTERED'
	| 'UNDER_REVIEW'
	| 'REVIEW_DONE'
	| 'CASE_ACCEPTED'
	| 'PS_POST_ACCEPTANCE'
	| 'PA_INITIAL_REVIEW'
	| 'PENDING_QUERY'
	| 'ROUTED_TO_LEGAL'
	| 'REGISTRAR_INITIAL_REVIEW'
	| 'PROGRAMMER_REVIEW'
	| 'STATIONERY_REVIEW'
	| 'ROUTED_TO_OE'
	| 'NOT_RELATED'
	| 'ORDER_SHEET_DRAFTED'
	| 'REGISTRAR_REVIEW'
	| 'PA_TO_COMMISSIONER'
	| 'COMMISSIONER_APPROVAL'
	| 'APPROVED'
	| 'PA_POST_APPROVAL'
	| 'REGISTRAR_HANDOVER'
	| 'LEGAL_FORWARDING'
	| 'FORWARDING_STATIONERY'
	| 'REGISTRAR_SIGNING'
	| 'DISPATCH_PENDING'
	| 'DISPATCHED'
	| 'REGISTRAR_FINAL_REVIEW'
	| 'CLOSED';
export type SectionAssigned = 'LEGAL' | 'OE' | 'REGISTRAR' | 'STATIONERY' | 'COMMISSIONER' | 'PROGRAMMER';

export type CasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type CaseListItem = {
	caseYear: number;
	id: string;
	registrationNo: string;
	caseNo?: string | null;
	slNo?: number | null;
	status: CaseStatus;
	sectionAssigned: SectionAssigned;
	priority: CasePriority;
	assignedToId?: string | null;
	complainantName: string;
	subject: string;
	createdAt: string;
};

export type PagedResult<T> = {
	items: T[];
	page: number;
	pageSize: number;
	total: number;
};

export type WorkflowTransition = {
	fromStatus: CaseStatus | null;
	toStatus: CaseStatus;
	autoTransition: boolean;
	description?: string | null;
};

export type QueryLetter = {
	id: string;
	caseYear: number;
	caseId: string;
	recipientType: 'complainant' | 'accused';
	channel: DispatchChannel;
	subject: string;
	body: string;
	createdAt: string;
	createdBy?: { id: string; name: string; role: Role; email?: string };
};

export type IssueRegisterEntry = {
	id: string;
	caseYear: number;
	caseId: string;
	kind: string;
	recipient?: string | null;
	channel?: string | null;
	subject?: string | null;
	body?: string | null;
	referenceId?: string | null;
	downloadUrl?: string | null;
	createdAt: string;
	createdBy?: { id: string; name: string; role: Role; email?: string } | null;
	case?: { caseYear: number; id: string; registrationNo: string; subject: string; status: CaseStatus; sectionAssigned: SectionAssigned };
};

export type IssueRegisterPaged = {
	items: IssueRegisterEntry[];
	page: number;
	pageSize: number;
	total: number;
};

export type OrderSheetStatus =
	| 'DRAFT'
	| 'SUBMITTED'
	| 'REVISIONS_REQUESTED_BY_REGISTRAR'
	| 'FORWARDED_BY_REGISTRAR'
	| 'REVISIONS_REQUESTED_BY_COMMISSIONER'
	| 'APPROVED_BY_COMMISSIONER'
	| 'CANCELLED';

export type OrderSheet = {
	id: string;
	caseYear: number;
	caseId: string;
	title: string;
	body: string;
	status: OrderSheetStatus;
	preparedById: string;
	preparedBy?: { id: string; name: string; role: Role; email?: string };
	createdAt: string;
	updatedAt: string;
	reviewHistory?: Array<{
		id: string;
		action: string;
		remarks?: string | null;
		createdAt: string;
		actor?: { id: string; name: string; role: Role };
	}>;
};

export type ForwardingLetterStatus = 'DRAFT' | 'PENDING_SIGNATURE' | 'SIGNED' | 'CANCELLED';

export type ForwardingLetter = {
	id: string;
	caseYear: number;
	caseId: string;
	subject: string;
	body: string;
	status: ForwardingLetterStatus;
	preparedById: string;
	preparedBy?: { id: string; name: string; role: Role; email?: string };
	signedById?: string | null;
	signedBy?: { id: string; name: string; role: Role; email?: string } | null;
	signedAt?: string | null;
	createdAt: string;
};

export type DispatchType = 'INWARD' | 'OUTWARD';
export type DispatchChannel = 'BY_HAND' | 'POST' | 'COURIER' | 'EMAIL';

export type CaseDispatch = {
	dispatchedAt: string;
	id: string;
	caseYear: number;
	caseId: string;
	type: DispatchType;
	channel: DispatchChannel;
	addressTo?: string | null;
	trackingNo?: string | null;
	receivedAt?: string | null;
	status: string;
	createdAt: string;
};

export type ComplaintChannel = 'EMAIL' | 'PHONE' | 'IN_PERSON' | 'LETTER' | 'ONLINE_PORTAL';
export type CreatedBySource = 'SELF' | 'DISTRICT_DEPARTMENT_OFFICER' | 'OTHER';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export type PublicRegistration = {
	id: string;
	registrationNo: string;
	fullName: string;
	email: string;
	mobile: string;
	alternateMobile?: string | null;
	dateOfBirth?: string | null;
	guardianName?: string | null;
	gender?: Gender | null;
	addressLine1: string;
	addressLine2?: string | null;
	state: string;
	district: string;
	pinCode: string;
	createdAt: string;
	userId?: string | null;
};

export type PublicRegistrationCreate = {
	fullName: string;
	email: string;
	mobile: string;
	alternateMobile?: string | null;
	dateOfBirth?: string | null;
	guardianName?: string | null;
	gender?: Gender | null;
	addressLine1: string;
	addressLine2?: string | null;
	state: string;
	district: string;
	pinCode: string;
};

export type DisabilityType = {
	id: string;
	name: string;
	code?: string | null;
	isActive: boolean;
	createdAt?: string;
};

export type ComplaintListItem = {
	id: string;
	referenceNo: string;
	name: string;
	createdBySource: CreatedBySource;
	createdByOtherName?: string | null;
	complainantType: PartyType;
	contact?: string | null;
	district: string;
	complainantAddressLine1: string;
	complainantAddressLine2?: string | null;
	complainantBlock?: string | null;
	complainantPoliceStation?: string | null;
	complainantPostOffice?: string | null;
	complainantCity: string;
	complainantState: string;
	complainantPostalCode: string;
	accusedName: string;
	accusedType: PartyType;
	accusedAddressLine1: string;
	accusedAddressLine2?: string | null;
	accusedBlock?: string | null;
	accusedPoliceStation?: string | null;
	accusedPostOffice?: string | null;
	accusedDistrict: string;
	accusedCity: string;
	accusedState: string;
	accusedPostalCode: string;
	disabilityTypeId?: string | null;
	disabilityType?: DisabilityType | null;
	subject: string;
	description: string;
	channel: ComplaintChannel;
	createdAt: string;
	linkedCaseYear?: number | null;
	linkedCaseId?: string | null;
};

export type Complaint = ComplaintListItem & {
	linkedCase?: {
		caseYear: number;
		id: string;
		registrationNo: string;
		subject: string;
		status: CaseStatus;
	} | null;
	documents?: ComplaintDocument[];
};

export type ComplaintDocument = {
	id: string;
	complaintId: string;
	fileName: string;
	mimeType: string;
	storageKey: string;
	sizeBytes: number;
	uploadedById?: string | null;
	uploadedBy?: { id: string; name: string; email: string; role: Role } | null;
	createdAt?: string;
	downloadUrl?: string;
};

export type CaseDocument = {
	id: string;
	caseYear: number;
	caseId: string;
	fileName: string;
	mimeType: string;
	storageKey: string;
	sizeBytes: number;
	uploadedById?: string | null;
	uploadedBy?: { id: string; name: string; email: string; role: Role } | null;
	createdAt?: string;
	downloadUrl?: string;
	source: 'case';
};

export type ComplaintDocumentLinked = ComplaintDocument & {
	complaint?: { id: string; referenceNo: string; subject: string } | null;
	uploadedBy?: { id: string; name: string; email: string; role: Role } | null;
	downloadUrl?: string;
	source: 'complaint';
};
