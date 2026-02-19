# Legal Review System - QA Test Cases

## Document Information

| Attribute | Value |
|-----------|-------|
| Version | 1.0 |
| Last Updated | January 2026 |
| Application | Legal Review System (LRS) |
| Test Environment | UAT |

---

## Test Case Categories

1. [User Access & Permissions](#1-user-access--permissions)
2. [Request Creation (Draft)](#2-request-creation-draft)
3. [Request Submission](#3-request-submission)
4. [Legal Intake](#4-legal-intake)
5. [Attorney Assignment (Committee)](#5-attorney-assignment-committee)
6. [Legal Review](#6-legal-review)
7. [Compliance Review](#7-compliance-review)
8. [Respond To Comments & Resubmit Workflow](#8-respond-to-comments--resubmit-workflow)
9. [Closeout](#9-closeout)
10. [Hold & Resume](#10-hold--resume)
11. [Cancellation](#11-cancellation)
12. [Notifications](#12-notifications)
13. [Document Management](#13-document-management)
14. [Validation & Business Rules](#14-validation--business-rules)
15. [Dashboard & Navigation](#15-dashboard--navigation)
16. [Search & Filtering](#16-search--filtering)
17. [UI/UX & Accessibility](#17-uiux--accessibility)
18. [Performance & Load](#18-performance--load)
19. [Browser Compatibility](#19-browser-compatibility)
20. [Error Handling](#20-error-handling)

---

## 1. User Access & Permissions

### TC-UAP-001: Submitter Role Access
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | User is member of "LW - Submitters" group |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to LRS application | Application loads successfully |
| 2 | Verify navigation menu | "New Request" option is visible |
| 3 | Create a new request | Request form opens in Draft status |
| 4 | View request list | Only own requests are editable; others are read-only |
| 5 | Attempt to access Legal Intake section | Section is not visible or disabled |

---

### TC-UAP-002: Legal Admin Role Access
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | User is member of "LW - Legal Admin" group |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to LRS application | Application loads with admin options visible |
| 2 | View request list | All requests are visible |
| 3 | Open a request in Legal Intake status | Legal Intake section is editable |
| 4 | Verify attorney assignment options | "Assign Attorney" and "Send to Committee" buttons are enabled |
| 5 | Verify Review Audience override | Can modify Review Audience field |

---

### TC-UAP-003: Attorney Role Access
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | User is member of "LW - Attorneys" group and assigned to a request |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to LRS application | Application loads successfully |
| 2 | View request list | Only assigned requests are visible with edit access |
| 3 | Open assigned request | Legal Review section is editable |
| 4 | Attempt to access unassigned request | Access denied or read-only view |
| 5 | Submit legal review | Review is saved and status updates |

---

### TC-UAP-004: Compliance Role Access
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | User is member of "LW - Compliance Users" group |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to LRS application | Application loads successfully |
| 2 | View request list | Requests requiring compliance review are visible |
| 3 | Open request requiring compliance review | Compliance Review section is editable |
| 4 | Attempt to edit Legal Review section | Section is read-only |

---

### TC-UAP-005: Attorney Assigner Role Access
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | User is member of "LW - Attorney Assigner" group |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to LRS application | Application loads successfully |
| 2 | View requests in "Assign Attorney" status | Requests are visible and accessible |
| 3 | Open request awaiting assignment | Attorney selection dropdown is enabled |
| 4 | Assign an attorney | Request moves to "In Review" status |

---

### TC-UAP-006: Unauthorized User Access
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | User is not member of any LRS group |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to LRS application | Access denied message displayed |
| 2 | Attempt direct URL to a request | Access denied or redirect to error page |

---

## 2. Request Creation (Draft)

### TC-DRF-001: Create New Request - Basic
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | User logged in as Submitter |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Request" button | New request form opens |
| 2 | Verify form is in Draft status | Status shows "Draft" |
| 3 | Enter Title: "Test Request 001" | Field accepts input |
| 4 | Enter Purpose: "Testing purposes" | Field accepts input |
| 5 | Select Submission Type from dropdown | Options load from SubmissionItems list |
| 6 | Select Target Return Date (future date) | Date picker works correctly |
| 7 | Click "Save" | Request saves, Request ID generated (format: CRR-YY-N, e.g., CRR-26-1) |

---

### TC-DRF-002: Auto-Generated Request ID
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | User logged in as Submitter |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create new request | Form opens with no Request ID |
| 2 | Fill minimum required fields | Fields populated |
| 3 | Click "Save" for first time | Request ID generated in format CRR-YY-N (e.g., CRR-26-1) |
| 4 | Note the generated ID | ID follows sequential pattern |
| 5 | Create another new request and save | New ID is incremented from previous |

---

### TC-DRF-003: Save Incomplete Draft
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | User logged in as Submitter |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create new request | Form opens |
| 2 | Enter only Title field | Single field populated |
| 3 | Click "Save" | Request saves successfully |
| 4 | Close and reopen the request | All entered data persisted |
| 5 | Verify Submit button state | Submit button disabled (validation incomplete) |

---

### TC-DRF-004: Draft Only Visible to Creator
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Two test users: User A (creator), User B (another submitter) |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | User A creates and saves a Draft request | Request saved successfully |
| 2 | User A views request list | Draft request is visible |
| 3 | Log in as User B | Different user session |
| 4 | User B views request list | User A's Draft request NOT visible |
| 5 | User B attempts direct URL to User A's Draft | Access denied |

---

### TC-DRF-005: Delete Draft Request
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | User logged in as Submitter with existing Draft |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open existing Draft request | Request form loads |
| 2 | Click "Delete" button | Confirmation dialog appears |
| 3 | Confirm deletion | Request is permanently deleted |
| 4 | Verify in request list | Request no longer appears |

---

### TC-DRF-006: Review Audience Selection
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | User logged in as Submitter |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create new request | Form opens |
| 2 | Locate Review Audience field | Field has options: Legal, Compliance, Both |
| 3 | Select "Legal" | Only Legal review will be required |
| 4 | Change to "Compliance" | Only Compliance review will be required |
| 5 | Change to "Both" | Both reviews will be required |
| 6 | Save request | Selection persists |

---

### TC-DRF-007: FINRA Audience Fields
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | User logged in as Submitter |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create new request | Form opens |
| 2 | Select FINRA Audience Category | Dropdown options available |
| 3 | Select Audience type | Options based on category |
| 4 | Fill US Funds field | Multi-select or text field works |
| 5 | Fill UCITS field | Field accepts input |
| 6 | Select Separate Account Strategies | Checkbox/toggle works |
| 7 | Save request | All FINRA fields persist |

---

## 3. Request Submission

### TC-SUB-001: Submit Complete Request
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Preconditions** | User has complete Draft request |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open complete Draft request | All required fields filled |
| 2 | Verify at least one approval exists | Approval section shows valid approval |
| 3 | Verify at least one attachment exists | Attachment uploaded |
| 4 | Click "Submit" button | Confirmation dialog appears |
| 5 | Confirm submission | Status changes to "Legal Intake" |
| 6 | Verify submitter can no longer edit | Form becomes read-only for submitter |

---

### TC-SUB-002: Submit Without Required Fields
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | User has incomplete Draft request |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Draft with missing required fields | Form loads |
| 2 | Click "Submit" button | Validation errors displayed |
| 3 | Verify error messages | Clear indication of missing fields |
| 4 | Verify status remains Draft | Status unchanged |

---

### TC-SUB-003: Submit Without Approval
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | User has Draft with no approvals |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Fill all fields except approvals | Form nearly complete |
| 2 | Click "Submit" button | Validation error: "At least one approval required" |
| 3 | Add approval with date, approver, and document | Approval section valid |
| 4 | Click "Submit" button | Submission succeeds |

---

### TC-SUB-004: Submit Without Attachments
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | User has Draft with no attachments |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Fill all fields, no attachments | Form nearly complete |
| 2 | Click "Submit" button | Validation error: "At least one attachment required" |
| 3 | Upload an attachment | Attachment section valid |
| 4 | Click "Submit" button | Submission succeeds |

---

### TC-SUB-005: Rush Request Detection
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Know turnaround time for selected submission type |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create new request | Form opens |
| 2 | Select Submission Type (e.g., 5-day turnaround) | Type selected |
| 3 | Set Target Return Date to 3 business days from now | Date set before normal turnaround |
| 4 | Save and verify Rush indicator | Request flagged as Rush |
| 5 | Submit request | Rush alert notification sent |

---

### TC-SUB-006: Non-Rush Request
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Know turnaround time for selected submission type |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create new request | Form opens |
| 2 | Select Submission Type (e.g., 5-day turnaround) | Type selected |
| 3 | Set Target Return Date to 10 business days from now | Date after normal turnaround |
| 4 | Save and verify Rush indicator | Request NOT flagged as Rush |
| 5 | Submit request | Standard notification sent (no Rush alert) |

---

## 4. Legal Intake

### TC-LIN-001: Legal Admin Views Submitted Request
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request submitted, user is Legal Admin |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as Legal Admin | Dashboard loads |
| 2 | View requests in "Legal Intake" status | Submitted request visible |
| 3 | Open the request | Legal Intake section is editable |
| 4 | Verify all submitted data visible | All submitter data displayed |

---

### TC-LIN-002: Direct Attorney Assignment
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Preconditions** | Request in Legal Intake status |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open request in Legal Intake | Form loads |
| 2 | Select attorney from dropdown | Attorney options from LW - Attorneys group |
| 3 | Add assignment notes (optional) | Notes field accepts input |
| 4 | Click "Assign Attorney" button | Confirmation dialog |
| 5 | Confirm assignment | Status changes to "In Review" |
| 6 | Verify attorney notification sent | AttorneyAssigned email sent |

---

### TC-LIN-003: Send to Committee
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request in Legal Intake status |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open request in Legal Intake | Form loads |
| 2 | Add assignment notes for committee | Notes entered |
| 3 | Click "Send to Committee" button | Confirmation dialog |
| 4 | Confirm action | Status changes to "Assign Attorney" |
| 5 | Verify notification sent | ReadyForAttorneyAssignment email sent |

---

### TC-LIN-004: Override Review Audience
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request in Legal Intake, submitter selected "Legal" only |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open request in Legal Intake | Review Audience shows "Legal" |
| 2 | Change Review Audience to "Both" | Field is editable |
| 3 | Save changes | New audience persists |
| 4 | Assign attorney | Request requires both reviews |

---

### TC-LIN-005: Legal Admin Places Request On Hold
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Request in Legal Intake status |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open request in Legal Intake | Form loads |
| 2 | Click "Place On Hold" button | Hold dialog opens |
| 3 | Enter hold reason | Reason field required |
| 4 | Confirm hold action | Status changes to "On Hold" |
| 5 | Verify hold notification sent | RequestOnHold email sent to submitter |

---

### TC-LIN-006: Legal Admin Cancels Request
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Request in Legal Intake status |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open request in Legal Intake | Form loads |
| 2 | Click "Cancel Request" button | Cancel dialog opens |
| 3 | Enter cancellation reason | Reason field required |
| 4 | Confirm cancellation | Status changes to "Cancelled" |
| 5 | Verify cancel notification sent | RequestCancelled email sent |

---

## 5. Attorney Assignment (Committee)

### TC-AAC-001: Committee Member Assigns Attorney
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request in "Assign Attorney" status, user is Attorney Assigner |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as Attorney Assigner | Dashboard loads |
| 2 | View requests in "Assign Attorney" status | Request visible |
| 3 | Open the request | Assignment section editable |
| 4 | View Legal Admin's notes | Notes displayed if any |
| 5 | Select attorney from dropdown | Attorney options available |
| 6 | Add committee notes (optional) | Notes field works |
| 7 | Click "Assign Attorney" | Status changes to "In Review" |
| 8 | Verify notification | AttorneyAssigned email sent |

---

### TC-AAC-002: Non-Committee Member Cannot Assign
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request in "Assign Attorney" status, user is NOT Attorney Assigner |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as regular Submitter | Dashboard loads |
| 2 | Attempt to view "Assign Attorney" requests | Requests not visible or read-only |
| 3 | Attempt direct URL to request | Assignment controls disabled |

---

## 6. Legal Review

### TC-LRV-001: Attorney Views Assigned Request
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request assigned to attorney, user is that attorney |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as assigned Attorney | Dashboard loads |
| 2 | View assigned requests | Request visible in list |
| 3 | Open the request | Legal Review section editable |
| 4 | View all request details | Submitter info, documents visible |
| 5 | Download attached documents | Documents download successfully |

---

### TC-LRV-002: Submit Legal Review - Approved
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Preconditions** | Request in Review, attorney assigned |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open assigned request | Legal Review section visible |
| 2 | Review Status automatically "In Progress" | Status updates on first access |
| 3 | Select Outcome: "Approved" | Dropdown selection |
| 4 | Add review notes (optional) | Notes field works |
| 5 | Click "Submit Review" | Confirmation dialog |
| 6 | Confirm submission | Legal Review Status = "Completed" |
| 7 | Verify notification | LegalReviewApproved email sent |
| 8 | Check request status | Moves to Closeout (if only legal required) |

---

### TC-LRV-003: Submit Legal Review - Approved With Comments
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request in Review, attorney assigned |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open assigned request | Legal Review section visible |
| 2 | Select Outcome: "Approved With Comments" | Dropdown selection |
| 3 | Add review notes (required for this outcome) | Notes entered |
| 4 | Click "Submit Review" | Review submitted |
| 5 | Verify status | Legal Review = Completed |
| 6 | Verify notification | LegalReviewApproved email sent |
| 7 | At Closeout, verify comments visible | Submitter sees acknowledgment requirement |

---

### TC-LRV-004: Submit Legal Review - Not Approved
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request in Review, attorney assigned |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open assigned request | Legal Review section visible |
| 2 | Select Outcome: "Not Approved" | Dropdown selection |
| 3 | Add review notes (required) | Notes explaining rejection |
| 4 | Click "Submit Review" | Review submitted |
| 5 | Verify notification | LegalReviewNotApproved email sent |
| 6 | Verify request status | Moves directly to "Completed" (bypasses Closeout) |

---

### TC-LRV-005: Attorney Places Request On Hold
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Request in Review, attorney assigned |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open assigned request | Form loads |
| 2 | Click "Place On Hold" | Hold dialog opens |
| 3 | Enter hold reason | Required field |
| 4 | Confirm hold | Status = "On Hold" |
| 5 | Verify notification | RequestOnHold email sent |
| 6 | Previous status stored | Can resume to "In Review" |

---

## 7. Compliance Review

### TC-CRV-001: Compliance User Views Request
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request requires compliance review, user is Compliance User |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as Compliance User | Dashboard loads |
| 2 | View requests requiring compliance | Request visible |
| 3 | Open the request | Compliance Review section editable |
| 4 | Legal Review section | Read-only for compliance |

---

### TC-CRV-002: Submit Compliance Review - Approved
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Preconditions** | Request requires compliance, in Review status |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open request | Compliance Review section visible |
| 2 | Select Outcome: "Approved" | Dropdown selection |
| 3 | Set IsForesideReviewRequired flag | Yes/No toggle |
| 4 | Set IsRetailUse flag | Yes/No toggle |
| 5 | Add notes (optional) | Notes field works |
| 6 | Click "Submit Review" | Review submitted |
| 7 | Verify notification | ComplianceReviewApproved email sent |

---

### TC-CRV-003: Compliance Sets Foreside Required
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request in compliance review |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open request | Compliance section visible |
| 2 | Set IsForesideReviewRequired = Yes | Flag enabled |
| 3 | Complete and submit review | Review saved |
| 4 | At Closeout | Tracking ID becomes required |
| 5 | Foreside documents section visible | Upload option available |

---

### TC-CRV-004: Parallel Legal and Compliance Review
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request requires Both reviews |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Attorney submits Legal Review (Approved) | Legal = Completed |
| 2 | Verify request status | Still "In Review" (waiting on Compliance) |
| 3 | Compliance submits review (Approved) | Compliance = Completed |
| 4 | Verify request status | Moves to "Closeout" |

---

### TC-CRV-005: Legal Approved, Compliance Not Approved
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request requires Both reviews |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Attorney submits Legal Review (Approved) | Legal = Completed |
| 2 | Compliance submits review (Not Approved) | Compliance = Completed |
| 3 | Verify request status | Moves to "Completed" (bypasses Closeout) |
| 4 | Verify notification | ComplianceReviewNotApproved email sent |

---

## 8. Respond To Comments & Resubmit Workflow

### TC-RCR-001: Attorney Requests Changes
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Preconditions** | Request in Review, attorney assigned |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open assigned request | Legal Review section visible |
| 2 | Select Outcome: "Respond To Comments And Resubmit" | Dropdown selection |
| 3 | Add detailed review notes | Notes required for this outcome |
| 4 | Click "Submit Review" | Review submitted |
| 5 | Verify Legal Review Status | Changes to "Waiting On Submitter" |
| 6 | Verify notification | LegalChangesRequested email sent (High Priority) |

---

### TC-RCR-002: Submitter Views Changes Requested
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Attorney requested changes |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as Submitter | Dashboard loads |
| 2 | Open the request | Request loads |
| 3 | Verify warning banner displayed | "Action Required" message visible |
| 4 | View attorney's comments | Comments prominently displayed |
| 5 | Verify editable sections | Request info, documents sections editable |

---

### TC-RCR-003: Submitter Resubmits Request
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Preconditions** | Changes requested, submitter viewing request |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Make required changes to request | Fields updated |
| 2 | Upload new documents if needed | Documents added |
| 3 | Add response notes explaining changes | Notes field available |
| 4 | Click "Resubmit for Review" | Confirmation dialog |
| 5 | Confirm resubmission | Status updates |
| 6 | Verify Legal Review Status | Changes to "Waiting On Attorney" |
| 7 | Verify notification | ResubmissionReceivedLegal email sent |

---

### TC-RCR-004: Attorney Reviews Resubmission
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Submitter resubmitted request |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as Attorney | Dashboard loads |
| 2 | Open the resubmitted request | Request loads |
| 3 | View submitter's response notes | Notes visible |
| 4 | View updated documents | Changes accessible |
| 5 | Can select any outcome | All options available |
| 6 | Select "Approved" | Review completes normally |

---

### TC-RCR-005: Multiple Resubmission Cycles
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Request in Review |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Attorney requests changes (1st time) | Status: Waiting On Submitter |
| 2 | Submitter resubmits | Status: Waiting On Attorney |
| 3 | Attorney requests changes again (2nd time) | Status: Waiting On Submitter |
| 4 | Submitter resubmits again | Status: Waiting On Attorney |
| 5 | Attorney approves | Review completes |
| 6 | Verify all cycles tracked | History/audit trail shows all iterations |

---

### TC-RCR-006: Compliance Requests Changes
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request requires compliance review |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Compliance selects "Respond To Comments And Resubmit" | Outcome selected |
| 2 | Add compliance notes | Notes entered |
| 3 | Submit review | Review submitted |
| 4 | Verify Compliance Review Status | "Waiting On Submitter" |
| 5 | Verify notification | ComplianceChangesRequested email sent |

---

### TC-RCR-007: Submitter Resubmits for Compliance
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Compliance requested changes |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submitter makes changes | Updates applied |
| 2 | Click "Resubmit for Compliance Review" | Resubmission initiated |
| 3 | Verify Compliance Review Status | "Waiting On Compliance" |
| 4 | Verify notification | ResubmissionReceivedCompliance email sent |

---

## 9. Closeout

### TC-CLO-001: Basic Closeout
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Preconditions** | All reviews Approved, request in Closeout status |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as Submitter | Dashboard loads |
| 2 | Open request in Closeout | Closeout section visible |
| 3 | Review approval outcomes | All shown as Approved |
| 4 | Click "Complete Closeout" | Confirmation dialog |
| 5 | Confirm completion | Status changes to "Completed" |
| 6 | Verify notification | RequestCompleted email sent |

---

### TC-CLO-002: Closeout With Comment Acknowledgment
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Review outcome was "Approved With Comments" |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open request in Closeout | Form loads |
| 2 | Verify reviewer comments displayed | Comments visible |
| 3 | Verify acknowledgment checkbox | Checkbox present and required |
| 4 | Attempt closeout without checking | Validation error |
| 5 | Check acknowledgment box | Checkbox selected |
| 6 | Complete closeout | Status = Completed |

---

### TC-CLO-003: Closeout With Tracking ID Required
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Compliance review with IsForesideReviewRequired=Yes |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open request in Closeout | Form loads |
| 2 | Verify Tracking ID field visible | Field displayed |
| 3 | Attempt closeout without Tracking ID | Validation error |
| 4 | Enter Tracking ID | Field accepts input |
| 5 | Complete closeout | Status = Completed |

---

### TC-CLO-004: Closeout With Foreside Documents
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Compliance set IsForesideReviewRequired=Yes |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open request in Closeout | Form loads |
| 2 | Verify Foreside Documents section | Upload option visible |
| 3 | Upload Foreside documents | Documents upload successfully |
| 4 | Enter Tracking ID | ID entered |
| 5 | Complete closeout | Status = Completed |

---

### TC-CLO-005: Request Routed to Awaiting Foreside Documents
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Request in Closeout, Compliance review marked "Is Foreside Review Required" = true |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open request in Closeout | Form loads, Tracking ID field visible (required) |
| 2 | Enter Tracking ID | Field accepts input |
| 3 | Click "Complete Request" | Submission processes |
| 4 | Verify status | Status = "Awaiting Foreside Documents" (not Completed) |
| 5 | Open request in Awaiting Foreside Documents | Foreside Documents section visible |
| 6 | Upload Foreside document(s) | Documents uploaded successfully |
| 7 | Click "Complete Request" | Status = Completed |

---

### TC-CLO-006: Closeout After Both Reviews
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Both Legal and Compliance reviews completed with Approved |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open request in Closeout | Form loads |
| 2 | Verify both review outcomes visible | Legal: Approved, Compliance: Approved |
| 3 | Complete closeout | Status = Completed |

---

## 10. Hold & Resume

### TC-HLD-001: Place Request On Hold
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request in any active status (not Draft, Completed, Cancelled) |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open request | Form loads |
| 2 | Click "Place On Hold" | Hold dialog opens |
| 3 | Enter hold reason: "Awaiting client feedback" | Reason entered |
| 4 | Confirm hold | Status = "On Hold" |
| 5 | Verify previous status stored | Can resume to correct status |
| 6 | Verify notification | RequestOnHold email sent |

---

### TC-HLD-002: Resume Request From Hold
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request is On Hold |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open On Hold request | Form loads |
| 2 | View hold reason | Reason displayed |
| 3 | Click "Resume" | Confirmation dialog |
| 4 | Confirm resume | Status returns to previous status |
| 5 | Verify notification | RequestResumed email sent |

---

### TC-HLD-003: Hold Time Excluded from SLA
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Request with time tracking |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Note current time tracking | Times recorded |
| 2 | Place request on hold | On Hold status |
| 3 | Wait measurable time (e.g., 1 hour) | Time passes |
| 4 | Resume request | Previous status restored |
| 5 | Verify time tracking | Hold time not counted in reviewer SLA |

---

## 11. Cancellation

### TC-CAN-001: Cancel Draft Request (Submitter)
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Submitter has own Draft request |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open own Draft request | Form loads |
| 2 | Click "Cancel" or "Delete" | Confirmation dialog |
| 3 | Enter reason (optional for Draft) | Reason field |
| 4 | Confirm cancellation | Request removed or Cancelled status |

---

### TC-CAN-002: Cancel Submitted Request (Legal Admin)
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request in Legal Intake or later |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as Legal Admin | Dashboard loads |
| 2 | Open request | Form loads |
| 3 | Click "Cancel Request" | Cancel dialog opens |
| 4 | Enter cancellation reason | Required field |
| 5 | Confirm cancellation | Status = "Cancelled" |
| 6 | Verify notification | RequestCancelled email sent to submitter and attorney |

---

### TC-CAN-003: Submitter Cannot Cancel After Submission
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Submitter's request in Legal Intake or later |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as original Submitter | Dashboard loads |
| 2 | Open submitted request | Form loads (read-only) |
| 3 | Verify Cancel button | Not visible or disabled |

---

### TC-CAN-004: Cancelled Request is Read-Only
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Cancelled request exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open cancelled request | Form loads |
| 2 | Verify all fields read-only | No edit capability |
| 3 | Verify cancellation details | Who, when, why displayed |
| 4 | Verify no actions available | No buttons except close/back |

---

## 12. Notifications

### TC-NOT-001: Request Submitted Notification
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Preconditions** | Request submitted from Draft |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submit request | Status = Legal Intake |
| 2 | Check Legal Admin inbox | Email received |
| 3 | Verify email subject | "[Action Required] New Legal Review Request: {{RequestId}} - {{RequestTitle}}" |
| 4 | Verify email content | Request details, submitter, target date visible |
| 5 | Click link in email | Opens request in LRS |

---

### TC-NOT-002: Rush Request Notification
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Rush request submitted |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submit rush request | Status = Legal Intake |
| 2 | Check Legal Admin inbox | Two emails received |
| 3 | Verify rush email | Subject contains "[RUSH]" |
| 4 | Verify email priority | High importance |
| 5 | Verify rush rationale in body | Reason displayed |

---

### TC-NOT-003: Attorney Assigned Notification
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request in Legal Intake |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Legal Admin assigns attorney | Attorney selected |
| 2 | Check Attorney inbox | Email received |
| 3 | Verify CC to submitter | Submitter also received email |
| 4 | Verify attachments | Request documents attached |
| 5 | Click link in email | Opens request |

---

### TC-NOT-004: Changes Requested Notification
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request in Review |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Attorney selects "Respond To Comments And Resubmit" | Outcome selected |
| 2 | Submit review | Review saved |
| 3 | Check Submitter inbox | Email received |
| 4 | Verify email priority | High importance |
| 5 | Verify attorney comments in body | Notes visible |
| 6 | Verify call-to-action | "Address Comments & Resubmit" button |

---

### TC-NOT-005: Resubmission Notification
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Changes requested by attorney |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submitter resubmits request | Resubmission completed |
| 2 | Check Attorney inbox | Email received |
| 3 | Verify subject | "[Action Required] Resubmission Received..." |
| 4 | Verify submitter's response notes | Notes in email body |
| 5 | Verify updated documents attached | Attachments present |

---

### TC-NOT-006: Review Approved Notification
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request in Review |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Attorney approves request | Outcome = Approved |
| 2 | Check Submitter inbox | Email received |
| 3 | Verify subject | "Legal Review Approved: {{RequestId}}..." |
| 4 | Verify green header in email | Success color scheme |

---

### TC-NOT-007: Not Approved Notification
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request in Review |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Attorney rejects request | Outcome = Not Approved |
| 2 | Check Submitter inbox | Email received |
| 3 | Verify subject | "Legal Review Not Approved: {{RequestId}}..." |
| 4 | Verify rejection reason in body | Notes displayed |
| 5 | Verify red header in email | Rejection color scheme |

---

### TC-NOT-008: Ready for Closeout Notification
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | All reviews completed successfully |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Final review submitted (Approved) | Reviews complete |
| 2 | Check Submitter inbox | Email received |
| 3 | Verify subject | "[Action Required] Ready for Closeout..." |
| 4 | Verify review outcomes in body | Both outcomes displayed |

---

### TC-NOT-009: Request Completed Notification
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request in Closeout |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submitter completes closeout | Closeout submitted |
| 2 | Check Submitter inbox | Email received |
| 3 | Verify subject | "Request Completed: {{RequestId}}..." |
| 4 | Verify Tracking ID if present | ID in email body |

---

### TC-NOT-010: Hold/Resume Notifications
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Request in active status |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Place request on hold | On Hold status |
| 2 | Check Submitter inbox | RequestOnHold email received |
| 3 | Verify hold reason in body | Reason displayed |
| 4 | Resume request | Previous status restored |
| 5 | Check Submitter inbox | RequestResumed email received |

---

### TC-NOT-011: Cancellation Notification
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Request in active status |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Legal Admin cancels request | Status = Cancelled |
| 2 | Check Submitter inbox | RequestCancelled email received |
| 3 | Check Attorney inbox (if assigned) | CC email received |
| 4 | Verify cancellation reason | Reason in email body |

---

### TC-NOT-012: Email Rendering (Desktop)
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Any notification email |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open email in Outlook Desktop | Email renders |
| 2 | Verify header color | Correct color for notification type |
| 3 | Verify content layout | Table format readable |
| 4 | Verify button clickable | CTA button works |
| 5 | Verify footer | Standard footer present |

---

### TC-NOT-013: Email Rendering (Mobile)
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Any notification email |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open email on mobile device | Email renders |
| 2 | Verify responsive layout | Content fits screen |
| 3 | Verify text readable | No horizontal scrolling |
| 4 | Verify button tappable | CTA button works |

---

## 13. Document Management

### TC-DOC-001: Upload Single Attachment
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request in Draft |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Attachments section | Upload area visible |
| 2 | Click upload or drag file | File selected |
| 3 | Select PDF file (5MB) | File accepted |
| 4 | Verify upload progress | Progress indicator shown |
| 5 | Verify file listed | File appears in list |
| 6 | Save request | Document persists |

---

### TC-DOC-002: Upload Multiple Attachments
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Request in Draft |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select multiple files (3 files) | Files selected |
| 2 | Upload all | Progress shown for each |
| 3 | Verify all listed | 3 files in list |

---

### TC-DOC-003: Upload Large File (Near Limit)
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Request in Draft, max size = 250MB |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select file of 240MB | File selected |
| 2 | Upload | Chunked upload proceeds |
| 3 | Verify completion | File uploaded successfully |

---

### TC-DOC-004: Upload File Exceeding Limit
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request in Draft |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select file of 260MB | File selected |
| 2 | Attempt upload | Error message displayed |
| 3 | Verify message | "File exceeds maximum size of 250MB" |

---

### TC-DOC-005: Upload Invalid File Type
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request in Draft, allowed extensions configured |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select .exe file | File selected |
| 2 | Attempt upload | Error message displayed |
| 3 | Verify message | "File type not allowed" |

---

### TC-DOC-006: Delete Uploaded Document
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Request in Draft with uploaded document |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View uploaded documents | Documents listed |
| 2 | Click delete on document | Confirmation prompt |
| 3 | Confirm deletion | Document removed from list |
| 4 | Save request | Deletion persists |

---

### TC-DOC-007: Rename Document
| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Preconditions** | Request with uploaded document |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click rename on document | Edit field appears |
| 2 | Enter new name | Name changed |
| 3 | Save | New name persists |

---

### TC-DOC-008: Download Document
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request with documents, user has access |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open request | Documents section visible |
| 2 | Click download on document | Download initiates |
| 3 | Verify file | File opens correctly |

---

### TC-DOC-009: Upload Approval Document
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request in Draft, creating approval |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add new approval | Approval form opens |
| 2 | Fill date and approver | Fields populated |
| 3 | Upload approval document | Document attached |
| 4 | Save approval | All data persists |

---

### TC-DOC-010: Document Type Change
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Request with attachment |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View Attachments | Documents listed |
| 2 | Change document type to "Prior Submission" | Type dropdown |
| 3 | Save | Document moved to Prior Submissions |

---

## 14. Validation & Business Rules

### TC-VAL-001: Required Fields Validation
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Preconditions** | New request form |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Leave Title empty | Field marked required |
| 2 | Leave Purpose empty | Field marked required |
| 3 | Leave Submission Type empty | Field marked required |
| 4 | Leave Target Return Date empty | Field marked required |
| 5 | Attempt submit | All errors displayed |

---

### TC-VAL-002: Title Length Validation
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Request form |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter title with 3 characters | Below minimum (if any) |
| 2 | Enter title with 255 characters | At maximum |
| 3 | Enter title with 256 characters | Truncated or error |

---

### TC-VAL-003: Target Return Date - Past Date
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request form |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select date in past | Date selected |
| 2 | Attempt save | Validation error: "Date must be in future" |

---

### TC-VAL-004: Target Return Date - Weekend
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Request form |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select Saturday | Date selected |
| 2 | Save request | Warning or auto-adjust to Monday |

---

### TC-VAL-005: Approval Required Validation
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request with no approvals |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Fill all other required fields | Form nearly complete |
| 2 | No approvals added | Approval section empty |
| 3 | Click Submit | Error: "At least one approval required" |

---

### TC-VAL-006: Approval Completeness Validation
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request form |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add approval with date only | Missing approver and document |
| 2 | Click Submit | Error: Approval incomplete |
| 3 | Add approver | Missing document |
| 4 | Click Submit | Error: Approval document required |
| 5 | Upload document | Approval complete |
| 6 | Click Submit | Submission succeeds |

---

### TC-VAL-007: Attachment Required Validation
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request with no attachments |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Fill all required fields | Form complete except attachments |
| 2 | Click Submit | Error: "At least one attachment required" |
| 3 | Upload attachment | Attachment added |
| 4 | Click Submit | Submission succeeds |

---

### TC-VAL-008: Review Notes Required for Certain Outcomes
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request in Review, attorney viewing |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select "Respond To Comments And Resubmit" | Outcome selected |
| 2 | Leave notes empty | Notes field |
| 3 | Click Submit Review | Error: Notes required for this outcome |
| 4 | Add notes | Notes entered |
| 5 | Submit | Review saved |

---

### TC-VAL-009: Tracking ID Required at Closeout
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request in Closeout, Foreside Review Required flagged |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open request in Closeout | Form loads |
| 2 | Verify Tracking ID field visible | Field present |
| 3 | Leave Tracking ID empty | Empty field |
| 4 | Click Complete | Error: Tracking ID required |
| 5 | Enter Tracking ID | ID entered |
| 6 | Complete closeout | Success |

---

### TC-VAL-010: Comment Acknowledgment Required at Closeout
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request in Closeout with "Approved With Comments" outcome |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open request in Closeout | Form loads |
| 2 | Verify reviewer comments displayed | Comments visible |
| 3 | Verify acknowledgment checkbox | Checkbox unchecked |
| 4 | Click Complete without checking | Error: Must acknowledge comments |
| 5 | Check acknowledgment | Checkbox checked |
| 6 | Complete closeout | Success |

---

## 15. Dashboard & Navigation

### TC-DSH-001: Home Dashboard Display
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | User logged in |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to LRS application | Dashboard loads |
| 2 | Verify request cards displayed | Cards show for accessible requests |
| 3 | Verify card content | Each card shows: Title, Request ID, Status, Target Date |
| 4 | Verify status badge colors | Colors match status (blue=In Review, green=Completed, etc.) |
| 5 | Verify progress bar | Shows workflow progress percentage |

---

### TC-DSH-002: Role-Specific Dashboards
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | User with specific role (Legal Admin, Attorney, Compliance) |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as Legal Admin | Legal Admin dashboard visible in toolbar |
| 2 | Click Legal Admin dashboard | Shows requests in Legal Intake status |
| 3 | Log in as Attorney | Attorney dashboard visible |
| 4 | Click Attorney dashboard | Shows assigned requests |
| 5 | Log in as Compliance | Compliance dashboard visible |
| 6 | Click Compliance dashboard | Shows requests requiring compliance review |

---

### TC-DSH-003: Dashboard Toolbar Navigation
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | User logged in |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify toolbar buttons | Home, My Requests, New Request visible |
| 2 | Click Home button | Returns to home dashboard |
| 3 | Click My Requests | Shows only user's requests |
| 4 | Click New Request | Opens new request form |
| 5 | Verify role-specific buttons | Additional buttons based on user role |

---

### TC-DSH-004: My Requests Dashboard Tabs
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | User has multiple requests in different statuses |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to My Requests | Dashboard loads |
| 2 | Verify tabs present | All, Active, Drafts, Completed tabs visible |
| 3 | Click "All" tab | Shows all user's requests |
| 4 | Click "Active" tab | Shows only in-progress requests |
| 5 | Click "Drafts" tab | Shows only Draft status requests |
| 6 | Click "Completed" tab | Shows only Completed/Cancelled requests |

---

### TC-DSH-005: Request Card Click
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Dashboard with request cards |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View dashboard with requests | Cards displayed |
| 2 | Click on a request card | Request form opens |
| 3 | Verify correct request | Request ID matches clicked card |

---

### TC-DSH-006: Request Hover Card
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Dashboard with request cards |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Hover over a request card | Hover card appears after brief delay |
| 2 | Verify hover card content | Shows: Submitter, Submitted Date, Review Audience, Target Date |
| 3 | Move mouse away | Hover card disappears |
| 4 | Verify no flicker | Card appears/disappears smoothly |

---

## 16. Search & Filtering

### TC-SRC-001: Spotlight Search Access
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | User logged in |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click search icon in toolbar | Search dialog opens |
| 2 | Verify search input | Text input field focused |
| 3 | Press Escape | Search dialog closes |
| 4 | Use keyboard shortcut (Ctrl+K or Cmd+K) | Search dialog opens |

---

### TC-SRC-002: Search by Request ID
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Preconditions** | Known request ID exists (e.g., CRR-26-1) |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open search | Search dialog opens |
| 2 | Enter "CRR-26-1" | Search executes |
| 3 | Verify results | Matching request appears in results |
| 4 | Click result | Request form opens |

---

### TC-SRC-003: Search by Title
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request with known title exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open search | Search dialog opens |
| 2 | Enter partial title text | Search executes after debounce |
| 3 | Verify results | Requests with matching titles appear |
| 4 | Verify result display | Shows Request ID, Title, Status |

---

### TC-SRC-004: Search Debounce
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Search dialog open |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type quickly "test request" | No search during typing |
| 2 | Stop typing | Search executes after 300ms delay |
| 3 | Verify no excessive API calls | Single search call (not per keystroke) |

---

### TC-SRC-005: Recent Searches
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | User has performed searches |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Perform search for "marketing" | Results displayed |
| 2 | Close and reopen search | Recent searches visible |
| 3 | Verify recent search shown | "marketing" appears in recent list |
| 4 | Click recent search | Search re-executes |
| 5 | Verify limit | Maximum 5 recent searches stored |

---

### TC-SRC-006: Search No Results
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Search dialog open |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter search term with no matches | "xyz123nonexistent" |
| 2 | Verify message | "No results found" message displayed |
| 3 | Verify UI | No empty list, helpful message shown |

---

### TC-SRC-007: Search Keyboard Navigation
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Search results displayed |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Perform search with results | Results displayed |
| 2 | Press Down Arrow | Focus moves to first result |
| 3 | Press Down Arrow again | Focus moves to next result |
| 4 | Press Enter | Selected request opens |
| 5 | Press Escape | Search closes |

---

### TC-SRC-008: Quick Filters
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Dashboard with multiple requests |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View dashboard | All requests visible |
| 2 | Click status filter (e.g., "In Review") | Only In Review requests shown |
| 3 | Click filter again | Filter removed, all requests shown |
| 4 | Apply multiple filters | Filters combine (AND logic) |

---

### TC-SRC-009: Sort Requests
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Dashboard with multiple requests |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click sort dropdown | Sort options appear |
| 2 | Select "Target Date" | Requests sorted by target date |
| 3 | Toggle sort direction | Ascending/Descending switches |
| 4 | Select "Submitted Date" | Requests sorted by submission date |

---

### TC-SRC-010: View Selector
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Dashboard loaded |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click view selector | View options appear |
| 2 | Select different view | Dashboard updates to selected view |
| 3 | Verify view-specific columns | Correct columns for selected view |
| 4 | Change view again | Previous selection cleared |

---

## 17. UI/UX & Accessibility

### TC-UX-001: Form Layout - 70/30 Split
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Request form on desktop |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open request form | Form loads |
| 2 | Verify layout | Left panel ~70%, Right panel ~30% |
| 3 | Left panel contains | Request form sections |
| 4 | Right panel contains | Comments/Activity |

---

### TC-UX-002: Workflow Stepper Visibility
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Request in any status |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open request | Form loads |
| 2 | Verify stepper | Shows all workflow stages |
| 3 | Verify current stage highlighted | Current status visually distinct |
| 4 | Verify completed stages | Past stages show completion |

---

### TC-UX-003: Loading States
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Any data load action |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open request | Loading indicator appears |
| 2 | Data loads | Indicator disappears, content shows |
| 3 | Submit action | Button shows loading state |
| 4 | Action completes | Button returns to normal |

---

### TC-UX-004: Error Display
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Form with validation errors |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Trigger validation error | Error state |
| 2 | Verify field highlight | Invalid field has red border |
| 3 | Verify error message | Message displayed below field |
| 4 | Verify summary | Error summary at top if multiple |

---

### TC-UX-005: Success Messages
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Any save action |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Save request | Save action triggers |
| 2 | Verify success message | Toast/banner shows success |
| 3 | Message auto-dismisses | Disappears after few seconds |

---

### TC-UX-006: Keyboard Navigation
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request form |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tab through form | Focus moves to each field |
| 2 | Enter on button | Button activates |
| 3 | Space on checkbox | Checkbox toggles |
| 4 | Escape on modal | Modal closes |
| 5 | Verify focus visible | Focus indicator always visible |

---

### TC-UX-007: Screen Reader Compatibility
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Screen reader enabled (NVDA/JAWS) |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate form | All labels read correctly |
| 2 | Hear validation errors | Errors announced |
| 3 | Navigate buttons | Button labels read |
| 4 | Hear status changes | Live regions announce updates |

---

### TC-UX-008: ARIA Labels
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Browser dev tools |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Inspect form fields | aria-label present |
| 2 | Inspect buttons | aria-label describes action |
| 3 | Inspect status | role="status" for loading |
| 4 | Inspect errors | role="alert" for errors |

---

### TC-UX-009: High Contrast Mode
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Windows high contrast enabled |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open application | Renders correctly |
| 2 | All text visible | Sufficient contrast |
| 3 | Buttons distinguishable | Clear boundaries |
| 4 | Focus indicators visible | High contrast focus |

---

## 18. Performance & Load

### TC-PRF-001: Initial Page Load
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Fresh browser, cleared cache |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to LRS | Load timer starts |
| 2 | Measure time to interactive | < 3 seconds |
| 3 | All content visible | No layout shift after load |

---

### TC-PRF-002: Request Form Load
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Application loaded |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click to open request | Timer starts |
| 2 | Form fully loaded | < 2 seconds |
| 3 | All dropdowns populated | Data loads from lists |

---

### TC-PRF-003: Large Request List
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | 500+ requests in system |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View request list | List loads |
| 2 | Verify pagination | Paged results (30 per page) |
| 3 | Navigate pages | < 1 second per page |
| 4 | Sort column | Sorting completes < 2 seconds |

---

### TC-PRF-004: Document Upload Performance
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Stable network connection |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Upload 50MB file | Upload starts |
| 2 | Verify progress | Progress indicator updates |
| 3 | Upload completes | Reasonable time for file size |
| 4 | No timeout | Upload doesn't time out |

---

### TC-PRF-005: Concurrent User Load
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Load testing tool configured |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Simulate 50 concurrent users | Load test runs |
| 2 | Monitor response times | < 5 seconds average |
| 3 | Monitor error rate | < 1% errors |
| 4 | No crashes | Application remains stable |

---

## 19. Browser Compatibility

### TC-BRW-001: Chrome (Latest)
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Preconditions** | Chrome 90+ |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open LRS in Chrome | Application loads |
| 2 | Complete full workflow | All features work |
| 3 | Verify styling | Correct appearance |
| 4 | Test file upload | Works correctly |

---

### TC-BRW-002: Edge (Latest)
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Preconditions** | Edge 90+ |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open LRS in Edge | Application loads |
| 2 | Complete full workflow | All features work |
| 3 | Verify styling | Correct appearance |

---

### TC-BRW-003: Firefox (Latest)
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Firefox 85+ |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open LRS in Firefox | Application loads |
| 2 | Complete full workflow | All features work |
| 3 | Verify styling | Correct appearance |

---

### TC-BRW-004: Safari (Latest)
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Safari 14+ |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open LRS in Safari | Application loads |
| 2 | Complete full workflow | All features work |
| 3 | Test date picker | Safari date input works |

---

## 20. Error Handling

### TC-ERR-001: Network Disconnection During Save
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request form with unsaved changes |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Make changes to request | Changes pending |
| 2 | Disconnect network | Connection lost |
| 3 | Click Save | Error message displayed |
| 4 | Reconnect network | Connection restored |
| 5 | Save again | Changes saved successfully |

---

### TC-ERR-002: Session Timeout
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Logged in, idle for extended period |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Leave application idle | Session expires |
| 2 | Attempt action | Redirect to login or error message |
| 3 | Re-authenticate | Return to previous state |

---

### TC-ERR-003: Concurrent Edit Conflict
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Two users viewing same request |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | User A opens request | Form loads |
| 2 | User B opens same request | Form loads |
| 3 | User A saves changes | Changes saved |
| 4 | User B saves changes | Conflict warning or merge |

---

### TC-ERR-004: API Error Response
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Application running |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Trigger API error (e.g., invalid data) | API returns error |
| 2 | Verify error displayed | User-friendly message shown |
| 3 | Verify no crash | Application remains functional |
| 4 | Retry action | Can attempt again |

---

### TC-ERR-005: Document Upload Failure
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request form |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start file upload | Upload begins |
| 2 | Simulate failure (network/timeout) | Upload fails |
| 3 | Verify error message | Clear error displayed |
| 4 | Verify retry option | Can attempt again |
| 5 | Other uploads unaffected | Partial uploads preserved |

---

### TC-ERR-006: Invalid URL Access
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Logged in user |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to non-existent request ID | URL entered |
| 2 | Verify error page | "Request not found" message |
| 3 | Link to return home | Navigation available |

---

## End-to-End Scenarios

### TC-E2E-001: Complete Request Lifecycle (Legal Only)
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Preconditions** | All test users configured |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submitter creates and submits request | Status = Legal Intake |
| 2 | Legal Admin assigns attorney directly | Status = In Review |
| 3 | Attorney approves | Legal Review = Completed |
| 4 | Submitter completes closeout | Status = Completed |

---

### TC-E2E-002: Complete Request Lifecycle (Both Reviews)
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Preconditions** | Request requires both reviews |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submitter creates request (Review Audience = Both) | Draft saved |
| 2 | Submitter submits | Status = Legal Intake |
| 3 | Legal Admin assigns attorney | Status = In Review |
| 4 | Attorney approves | Legal = Completed, still In Review |
| 5 | Compliance approves | Compliance = Completed |
| 6 | Request moves to Closeout | Status = Closeout |
| 7 | Submitter completes closeout | Status = Completed |

---

### TC-E2E-003: Request with Resubmission Cycle
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | All test users configured |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submitter submits request | Status = Legal Intake |
| 2 | Legal Admin assigns attorney | Status = In Review |
| 3 | Attorney requests changes | Waiting On Submitter |
| 4 | Submitter resubmits | Waiting On Attorney |
| 5 | Attorney approves | Legal = Completed |
| 6 | Closeout completed | Status = Completed |

---

### TC-E2E-004: Request with Committee Assignment
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | All test users configured |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submitter submits request | Status = Legal Intake |
| 2 | Legal Admin sends to committee | Status = Assign Attorney |
| 3 | Committee member assigns attorney | Status = In Review |
| 4 | Attorney approves | Legal = Completed |
| 5 | Closeout completed | Status = Completed |

---

### TC-E2E-005: Request Rejected at Legal Review
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Request in Review |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Attorney selects "Not Approved" | Outcome selected |
| 2 | Attorney submits review | Review saved |
| 3 | Request bypasses Closeout | Status = Completed |
| 4 | Submitter receives notification | Not Approved email |

---

### TC-E2E-006: Request with Hold and Resume
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Preconditions** | Request in Review |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Attorney places on hold | Status = On Hold |
| 2 | Submitter notified | Hold email received |
| 3 | Attorney resumes | Status = In Review |
| 4 | Submitter notified | Resume email received |
| 5 | Normal workflow continues | Request completes |

---

### TC-E2E-007: Rush Request Full Lifecycle
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Preconditions** | Submission type with known turnaround |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create request with early target date | Rush flagged |
| 2 | Submit request | Rush notification sent |
| 3 | Legal Admin sees rush indicator | Rush visible in list |
| 4 | Complete expedited review | Request completed |

---

## Test Data Requirements

### Users Required

| User | Group Membership | Purpose |
|------|------------------|---------|
| Test Submitter 1 | LW - Submitters | Create and submit requests |
| Test Submitter 2 | LW - Submitters | Test cross-user visibility |
| Test Legal Admin | LW - Legal Admin | Intake and assignment |
| Test Attorney 1 | LW - Attorneys | Legal review |
| Test Attorney 2 | LW - Attorneys | Alternative attorney |
| Test Compliance | LW - Compliance Users | Compliance review |
| Test Assigner | LW - Attorney Assigner | Committee assignment |
| Test Admin | LW - Admin | System administration |

### Submission Types Required

| Type | Turnaround Days |
|------|-----------------|
| Standard Publication | 5 |
| Quick Review | 2 |
| Complex Review | 10 |

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | QA Team | Initial test cases |
