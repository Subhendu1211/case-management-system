# IEEE 730 Compliant Test Cases - SCPD Case Management System

> Standard: IEEE 730 (Software Quality Assurance Plans). This document provides structured test cases aligned to SQA objectives, with traceability to functional areas and quality attributes.

## 1) Document Control

- System: SCPD Case Management System (CMS)
- Version: 1.0
- Date: 2026-02-22
- Scope: Functional, security, workflow, and data integrity validation

## 2) Test Case Format (IEEE 730-aligned)

Each test case includes:

- ID
- Objective
- Preconditions
- Inputs
- Steps
- Expected Results
- Pass/Fail Criteria
- Quality Attributes (e.g., correctness, security, reliability)
- Traceability (module/feature)

## 3) Test Cases

### TC-001 - Login Success (Role-Based Access)

- Objective: Verify successful login and role-based access establishment.
- Preconditions: Valid user exists in DB.
- Inputs: username/password for role LEGAL_ASSISTANT.
- Steps:
  1. Open login page.
  2. Enter credentials.
  3. Click Login.
- Expected Results:
  - User is authenticated.
  - JWT tokens are issued.
  - Role displayed in UI (if applicable).
- Pass/Fail Criteria: Login succeeds and user session is created.
- Quality Attributes: Correctness, Security.
- Traceability: Auth, RBAC.

### TC-002 - Login Failure (Invalid Credentials)

- Objective: Ensure invalid credentials are rejected.
- Preconditions: User exists.
- Inputs: invalid password.
- Steps:
  1. Open login page.
  2. Enter invalid credentials.
  3. Click Login.
- Expected Results:
  - Error message displayed.
  - No session created.
- Pass/Fail Criteria: Login denied with proper error.
- Quality Attributes: Security, Robustness.
- Traceability: Auth.

### TC-003 - Role Restricted Access to Actions

- Objective: Verify disallowed actions are not available.
- Preconditions: User with role OE.
- Inputs: Case in REGISTERED status.
- Steps:
  1. Login as OE.
  2. Open case detail.
  3. Check available actions.
- Expected Results:
  - OE cannot see or execute Legal/Registrar actions.
- Pass/Fail Criteria: No restricted action button visible; API rejects unauthorized calls.
- Quality Attributes: Security, Correctness.
- Traceability: RBAC, Workflow.

### TC-004 - Case Diary Entry Creation

- Objective: Validate diary entry creation.
- Preconditions: Private Secretary role.
- Inputs: Complaint details.
- Steps:
  1. Create complaint.
  2. Create diary entry.
- Expected Results:
  - Status moves to DIARY_ENTERED.
  - Case record created.
- Pass/Fail Criteria: Case and diary entry visible.
- Quality Attributes: Correctness.
- Traceability: Complaints, Cases.

### TC-005 - Commissioner Review Routing

- Objective: Validate commissioner can route case.
- Preconditions: Case in UNDER_REVIEW.
- Inputs: Route to LEGAL.
- Steps:
  1. Login as Commissioner.
  2. Open case.
  3. Select "Route to Legal".
- Expected Results:
  - Status moves to ROUTED_TO_LEGAL.
  - Section assigned = LEGAL.
- Pass/Fail Criteria: Status + section updated.
- Quality Attributes: Correctness.
- Traceability: Workflow.

### TC-006 - Legal Registration

- Objective: Validate Legal Assistant can register case.
- Preconditions: Case in ROUTED_TO_LEGAL.
- Inputs: None.
- Steps:
  1. Login as Legal Assistant.
  2. Open case.
  3. Click "Register case".
- Expected Results:
  - Status moves to REGISTERED.
- Pass/Fail Criteria: Status updated and logged in timeline.
- Quality Attributes: Correctness.
- Traceability: Workflow transitions.

### TC-007 - Order Sheet Create

- Objective: Ensure Legal Assistant can create order sheet.
- Preconditions: Case in REGISTERED.
- Inputs: Order sheet title and body.
- Steps:
  1. Open Order Sheets tab.
  2. Click "New order sheet".
  3. Save.
- Expected Results:
  - Order sheet created with DRAFT status.
- Pass/Fail Criteria: Order sheet appears in list.
- Quality Attributes: Correctness, Usability.
- Traceability: Orders.

### TC-008 - Order Sheet Submit to Registrar

- Objective: Validate submission flow.
- Preconditions: Order sheet DRAFT.
- Inputs: Remarks (if required).
- Steps:
  1. Click "Submit" on order sheet.
  2. Enter remarks.
- Expected Results:
  - Order sheet status = SUBMITTED.
  - Case status moves to REGISTRAR_REVIEW.
- Pass/Fail Criteria: Status updated and timeline entry created.
- Quality Attributes: Correctness, Reliability.
- Traceability: Orders, Workflow.

### TC-009 - Registrar Requests Revision

- Objective: Validate revision loop.
- Preconditions: Order sheet SUBMITTED.
- Steps:
  1. Login as Registrar.
  2. Request revision.
- Expected Results:
  - Order sheet status = REVISIONS_REQUESTED_BY_REGISTRAR.
  - Case status moves to ORDER_SHEET_DRAFTED.
- Pass/Fail Criteria: Status updated, remarks stored.
- Quality Attributes: Correctness.
- Traceability: Orders, Workflow.

### TC-010 - Registrar Forwards to Commissioner

- Objective: Validate forward flow.
- Preconditions: Order sheet SUBMITTED.
- Steps:
  1. Login as Registrar.
  2. Click "Forward".
- Expected Results:
  - Order sheet status = FORWARDED_BY_REGISTRAR.
  - Case status = COMMISSIONER_APPROVAL.
- Pass/Fail Criteria: Status updated and visible to Commissioner.
- Quality Attributes: Correctness.
- Traceability: Orders, Workflow.

### TC-011 - Commissioner Approves Order Sheet

- Objective: Validate approval.
- Preconditions: Order sheet FORWARDED_BY_REGISTRAR.
- Steps:
  1. Login as Commissioner.
  2. Click "Approve".
- Expected Results:
  - Order sheet status = APPROVED_BY_COMMISSIONER.
  - Case can move to APPROVED.
- Pass/Fail Criteria: Status updated and timeline recorded.
- Quality Attributes: Correctness.
- Traceability: Orders, Workflow.

### TC-012 - Approve Case After Order Sheet Approval

- Objective: Ensure case cannot be approved without approved order sheet.
- Preconditions: Case in COMMISSIONER_APPROVAL without approved order sheet.
- Steps:
  1. Attempt to approve case.
- Expected Results:
  - System blocks action with error message.
- Pass/Fail Criteria: Approval denied.
- Quality Attributes: Integrity, Correctness.
- Traceability: Cases, Workflow.

### TC-013 - Query Letter Creation

- Objective: Ensure Legal can create query letter.
- Preconditions: Case in ROUTED_TO_LEGAL or ORDER_SHEET_DRAFTED.
- Steps:
  1. Open Query Letters tab.
  2. Create query letter.
- Expected Results:
  - Query letter saved.
- Pass/Fail Criteria: Query letter visible in list.
- Quality Attributes: Correctness.
- Traceability: Query letters.

### TC-014 - Send Query to Dispatch

- Objective: Validate dispatch of query letter.
- Preconditions: Query letter exists.
- Steps:
  1. Click "Send to dispatch".
- Expected Results:
  - Query letter dispatch event logged.
  - Issue register updated.
- Pass/Fail Criteria: Entry added to Issue Register.
- Quality Attributes: Correctness, Auditability.
- Traceability: Issue register.

### TC-015 - Forwarding Letter Create

- Objective: Validate forwarding letter creation.
- Preconditions: Case in APPROVED or LEGAL_FORWARDING.
- Steps:
  1. Open Forwarding Letters tab.
  2. Create new letter.
- Expected Results:
  - Letter saved with DRAFT status.
- Pass/Fail Criteria: Letter appears in list.
- Quality Attributes: Correctness.
- Traceability: Forwarding letters.

### TC-016 - Registrar Signs Forwarding Letter

- Objective: Validate letter signature.
- Preconditions: Letter in PENDING_SIGNATURE.
- Steps:
  1. Login as Registrar.
  2. Click "Sign".
- Expected Results:
  - Letter status = SIGNED.
- Pass/Fail Criteria: Status updated.
- Quality Attributes: Correctness.
- Traceability: Forwarding letters.

### TC-017 - Dispatch Creation

- Objective: Validate dispatch creation for approved cases.
- Preconditions: Case status = DISPATCH_PENDING.
- Steps:
  1. Login as Stationery.
  2. Create dispatch with channel and tracking.
- Expected Results:
  - Dispatch record created.
- Pass/Fail Criteria: Dispatch listed with correct details.
- Quality Attributes: Correctness.
- Traceability: Dispatch.

### TC-018 - Dispatch Completion

- Objective: Validate marking dispatch completed.
- Preconditions: Dispatch exists.
- Steps:
  1. Mark dispatch as completed.
- Expected Results:
  - Case status = DISPATCHED.
- Pass/Fail Criteria: Status updated and timeline entry created.
- Quality Attributes: Correctness.
- Traceability: Dispatch, Workflow.

### TC-019 - Close Case

- Objective: Ensure closure after dispatch.
- Preconditions: Case in DISPATCHED.
- Steps:
  1. Login as Private Secretary/Admin.
  2. Close case.
- Expected Results:
  - Case status = CLOSED.
- Pass/Fail Criteria: Case no longer appears in active lists.
- Quality Attributes: Correctness.
- Traceability: Workflow.

### TC-020 - Activity Log Entry

- Objective: Validate system logs key actions.
- Preconditions: Any case action performed.
- Steps:
  1. Perform a workflow transition.
  2. Open Activity log.
- Expected Results:
  - Event is listed with timestamp and user.
- Pass/Fail Criteria: Log entry exists.
- Quality Attributes: Auditability, Reliability.
- Traceability: Activity log.

### TC-021 - Document Upload Access Control

- Objective: Ensure only authorized roles can upload documents.
- Preconditions: Role CITIZEN or OE.
- Steps:
  1. Attempt to upload on Documents tab.
- Expected Results:
  - Upload button hidden or API blocked.
- Pass/Fail Criteria: Upload not allowed.
- Quality Attributes: Security.
- Traceability: Documents, RBAC.

### TC-022 - Data Integrity: Order Sheet Requires Case

- Objective: Ensure order sheets cannot be created without valid case.
- Preconditions: None.
- Steps:
  1. Attempt to create order sheet with invalid case ID.
- Expected Results:
  - API returns error.
- Pass/Fail Criteria: No orphan order sheet created.
- Quality Attributes: Integrity.
- Traceability: Orders.

### TC-023 - Section Auto-Assignment

- Objective: Validate section auto-assignment on status change.
- Preconditions: Case in UNDER_REVIEW.
- Steps:
  1. Route to LEGAL.
- Expected Results:
  - sectionAssigned = LEGAL.
- Pass/Fail Criteria: Section updated.
- Quality Attributes: Correctness.
- Traceability: Workflow.

### TC-024 - Search and Filter Cases

- Objective: Ensure case list search and filter works.
- Preconditions: Multiple cases with different statuses.
- Steps:
  1. Apply status filter.
  2. Search by registration number.
- Expected Results:
  - List updates correctly.
- Pass/Fail Criteria: Correct cases displayed.
- Quality Attributes: Usability.
- Traceability: Cases list.

### TC-025 - Security: Unauthorized API Access

- Objective: Verify API rejects unauthorized calls.
- Preconditions: Valid token for role without access.
- Steps:
  1. Call restricted endpoint (e.g., approve case).
- Expected Results:
  - 403 Forbidden.
- Pass/Fail Criteria: Request denied.
- Quality Attributes: Security.
- Traceability: API, RBAC.

## 4) Traceability Matrix (Summary)

- Auth, RBAC: TC-001, TC-002, TC-003, TC-025
- Workflow: TC-004 through TC-019, TC-023
- Orders: TC-007 to TC-012
- Letters: TC-013 to TC-016
- Dispatch: TC-017, TC-018
- Documents: TC-021
- Activity log: TC-020
- Search/Filter: TC-024

## 5) Exit Criteria

- 100% pass rate on critical workflow cases (TC-004 through TC-019).
- 0 unresolved high severity defects.
- RBAC enforcement verified on all restricted actions.

## 6) Reporting

Record each test run with:

- Date
- Tester
- Build version
- Environment
- Pass/Fail counts
- Defects raised (IDs)
