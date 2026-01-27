# Legal Review System - Workflow Definition

## Document Information

| Attribute | Value |
|-----------|-------|
| Version | 1.0 |
| Last Updated | January 2026 |
| Status | Active |
| Owner | Legal Operations |

---

## 1. Overview

The Legal Review System (LRS) automates the review and approval process for marketing communications and other materials requiring legal and/or compliance review. This document defines the complete workflow including roles, statuses, transitions, notifications, and business rules.

---

## 2. User Roles & Permissions

### 2.1 Role Definitions

| Role | SharePoint Group | Description |
|------|------------------|-------------|
| **Submitter** | LW - Submitters | Creates and submits requests for review. Can view all requests (read-only for others' requests). |
| **Legal Admin** | LW - Legal Admin | Triages incoming requests, assigns attorneys (directly or to committee), manages intake settings. |
| **Attorney Assigner** | LW - Attorney Assigner | Committee members who assign attorneys when requests are sent to committee. |
| **Attorney** | LW - Attorneys | Reviews assigned requests and submits legal review decisions. |
| **Compliance User** | LW - Compliance Users | Reviews requests requiring compliance approval, sets compliance flags. |
| **Admin** | LW - Admin | Full system administration, configuration management. |

### 2.2 Permission Matrix

| Action | Submitter | Legal Admin | Attorney Assigner | Attorney | Compliance | Admin |
|--------|:---------:|:-----------:|:-----------------:|:--------:|:----------:|:-----:|
| Create Request | Yes | Yes | No | No | No | Yes |
| Edit Own Draft | Yes | Yes | No | No | No | Yes |
| Submit Request | Yes | Yes | No | No | No | Yes |
| View All Requests | Read Only | Yes | Yes | Assigned Only | Compliance Only | Yes |
| Perform Legal Intake | No | Yes | No | No | No | Yes |
| Assign Attorney (Direct) | No | Yes | No | No | No | Yes |
| Send to Committee | No | Yes | No | No | No | Yes |
| Assign Attorney (Committee) | No | Yes | Yes | No | No | Yes |
| Submit Legal Review | No | No | No | Yes (Assigned) | No | Yes |
| Submit Compliance Review | No | No | No | No | Yes | Yes |
| Complete Closeout | Yes (Own) | Yes | No | No | No | Yes |
| Place On Hold | No | Yes | No | Yes (Assigned) | Yes | Yes |
| Resume from Hold | No | Yes | No | Yes (Assigned) | Yes | Yes |
| Cancel Request | Yes (Own Draft) | Yes | No | No | No | Yes |
| Manage Configuration | No | No | No | No | No | Yes |

---

## 3. Workflow Statuses

### 3.1 Status Definitions

| Status | Description | Who Can Access | Editable By |
|--------|-------------|----------------|-------------|
| **Draft** | Request is being created, not yet submitted | Submitter (Owner) | Submitter |
| **Legal Intake** | Request submitted, awaiting triage by Legal Admin | Legal Admin | Legal Admin |
| **Assign Attorney** | Sent to committee for attorney assignment | Attorney Assigners | Attorney Assigners |
| **In Review** | Under active legal and/or compliance review | Assigned reviewers | Reviewers |
| **Closeout** | All reviews complete, awaiting submitter closeout | Submitter | Submitter |
| **Awaiting Foreside Documents** | Waiting for external Foreside documentation | Submitter | Submitter |
| **Completed** | Request fully processed and closed | All (Read Only) | None |
| **On Hold** | Temporarily paused (can resume) | Original accessors | None |
| **Cancelled** | Request terminated before completion | All (Read Only) | None |

### 3.2 Status Flow Diagram

```
                                    ┌──────────────┐
                                    │   On Hold    │
                                    └──────┬───────┘
                                           │ Resume
                                           ▼
┌─────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────┐
│  Draft  │───▶│ Legal Intake │───▶│  In Review   │───▶│  Closeout │
└─────────┘    └──────────────┘    └──────────────┘    └───────────┘
                      │                    │                  │
                      │                    │                  │
                      ▼                    │                  ▼
               ┌──────────────┐            │           ┌───────────────────────┐
               │   Assign     │────────────┘           │ Awaiting Foreside     │
               │   Attorney   │                        │ Documents (optional)  │
               └──────────────┘                        └───────────────────────┘
                                                                  │
                      │                                           │
                      ▼                                           ▼
               ┌──────────────┐                        ┌───────────────┐
               │  Cancelled   │                        │   Completed   │
               └──────────────┘                        └───────────────┘
```

---

## 4. Workflow Stages - Detailed

### 4.1 Stage: Draft

**Purpose:** Allow submitter to create and prepare a request before formal submission.

| Attribute | Details |
|-----------|---------|
| **Entry Condition** | New request created |
| **Who Can Edit** | Request creator (Submitter) |
| **Required Fields** | None (can save incomplete) |
| **Available Actions** | Save, Submit, Delete |
| **Exit Conditions** | Submit → Legal Intake, Delete → Removed |
| **Permissions** | Only creator can view/edit |

**Business Rules:**
- Request ID is auto-generated on submission (format: CRR-YY-N for Communication requests, e.g., CRR-25-1)
- Documents can be uploaded but are not required
- No notifications sent during Draft stage
- Request does not appear in any shared views

---

### 4.2 Stage: Legal Intake

**Purpose:** Legal Admin triages the request, verifies information, and determines next steps.

| Attribute | Details |
|-----------|---------|
| **Entry Condition** | Submitter clicks "Submit" from Draft |
| **Who Can Edit** | Legal Admin only |
| **Available Actions** | Assign Attorney (Direct), Send to Committee, Place On Hold, Cancel |
| **Exit Conditions** | Direct Assign → In Review, Send to Committee → Assign Attorney |

**Trigger Event:** `Draft → Legal Intake`

**Notification:** `RequestSubmitted`
| Field | Value |
|-------|-------|
| To | Legal Admin Group |
| Subject | [Action Required] New Legal Review Request: {{RequestId}} - {{RequestTitle}} |
| When | Immediately on status change |

**Additional Notification (if Rush):** `RushRequestAlert`
| Field | Value |
|-------|-------|
| To | Legal Admin Group |
| Subject | [RUSH] Urgent Legal Review Request: {{RequestId}} - {{RequestTitle}} |
| Importance | High |

**Legal Admin Actions:**

1. **Review Audience Selection**
   - Legal Only: Only legal review required
   - Compliance Only: Only compliance review required
   - Both: Both reviews required

2. **Attorney Assignment Options**
   - **Direct Assignment:** Select attorney → Request moves to In Review
   - **Send to Committee:** Request moves to Assign Attorney status

3. **Override Options**
   - Can modify Review Audience from submitter's selection
   - Can add assignment notes for attorney

**Business Rules:**
- Item-level permissions are broken at this stage
- Submitter retains read access
- Legal Admin group gets full access
- Rush requests are flagged if `TargetReturnDate < (SubmittedOn + TurnAroundTime)`

---

### 4.3 Stage: Assign Attorney

**Purpose:** Committee reviews request and assigns appropriate attorney.

| Attribute | Details |
|-----------|---------|
| **Entry Condition** | Legal Admin selects "Send to Committee" |
| **Who Can Edit** | Attorney Assigner Group |
| **Available Actions** | Assign Attorney, Place On Hold, Cancel |
| **Exit Conditions** | Assign Attorney → In Review |

**Trigger Event:** `Legal Intake → Assign Attorney`

**Notification:** `ReadyForAttorneyAssignment`
| Field | Value |
|-------|-------|
| To | Attorney Assigner Group |
| Subject | [Action Required] Attorney Assignment Needed: {{RequestId}} - {{RequestTitle}} |

**Business Rules:**
- Only members of Attorney Assigner group can assign
- Assignment notes from Legal Admin are visible
- Committee can add their own notes

---

### 4.4 Stage: In Review

**Purpose:** Assigned attorney and/or compliance team reviews the request.

| Attribute | Details |
|-----------|---------|
| **Entry Condition** | Attorney assigned (direct or via committee) |
| **Who Can Edit** | Assigned Attorney, Compliance Users (if required) |
| **Available Actions** | Submit Review, Request Changes, Place On Hold |
| **Exit Conditions** | All reviews complete → Closeout or Completed |

**Trigger Event:** Attorney Assigned (when ReviewAudience = Legal or Both)

**Notification:** `AttorneyAssigned`
| Field | Value |
|-------|-------|
| To | Assigned Attorney |
| CC | Submitter |
| Subject | [Action Required] Legal Review Assigned: {{RequestId}} - {{RequestTitle}} |
| Attachments | Request documents |

**Trigger Event:** Compliance Review Required (when ReviewAudience = Compliance Only)

**Notification:** `ComplianceReviewRequired`
| Field | Value |
|-------|-------|
| To | Compliance Group |
| CC | Submitter |
| Subject | [Action Required] Compliance Review Required: {{RequestId}} - {{RequestTitle}} |

**Trigger Event:** Attorney Reassigned (attorney field changes during In Review)

**Notification:** `AttorneyReassigned`
| Field | Value |
|-------|-------|
| To | New Attorney |
| CC | Submitter, Previous Attorney |
| Subject | [Attorney Change] Legal Review Reassigned: {{RequestId}} - {{RequestTitle}} |

#### 4.4.1 Legal Review Process

**Review Statuses:**
| Status | Description |
|--------|-------------|
| Not Required | Legal review not needed |
| Not Started | Attorney assigned, review not begun |
| In Progress | Attorney actively reviewing |
| Waiting On Submitter | Changes requested, awaiting resubmission |
| Waiting On Attorney | Submitter resubmitted, awaiting attorney review |
| Completed | Review finished |

**Review Outcomes:**
| Outcome | Description | Next Step |
|---------|-------------|-----------|
| Approved | Request approved as-is | Proceed to next review or Closeout |
| Approved With Comments | Approved but submitter must acknowledge comments | Proceed, comments shown at Closeout |
| Respond To Comments And Resubmit | Changes needed | Status → Waiting On Submitter |
| Not Approved | Request rejected | Move directly to Completed (bypass Closeout) |

**"Respond To Comments And Resubmit" Workflow:**

1. **Attorney Requests Changes:**
   - Review Status: In Progress → Waiting On Submitter
   - Outcome: Respond To Comments And Resubmit
   - **Notification:** `LegalChangesRequested` (High Priority)

2. **Submitter Addresses Comments:**
   - Reviews attorney's notes
   - Updates request information/documents as needed
   - Adds response notes
   - Clicks "Resubmit for Review"

3. **Resubmission:**
   - Review Status: Waiting On Submitter → Waiting On Attorney
   - **Notification:** `ResubmissionReceivedLegal` to Attorney

4. **Attorney Reviews Resubmission:**
   - Can approve, approve with comments, request more changes, or reject
   - Cycle repeats if more changes needed

#### 4.4.2 Compliance Review Process

**Review Statuses:**
| Status | Description |
|--------|-------------|
| Not Required | Compliance review not needed |
| Not Started | Awaiting compliance review |
| In Progress | Compliance actively reviewing |
| Waiting On Submitter | Changes requested, awaiting resubmission |
| Waiting On Compliance | Submitter resubmitted, awaiting compliance review |
| Completed | Review finished |

**Compliance-Specific Fields:**
- `IsForesideReviewRequired`: External Foreside review needed
- `IsRetailUse`: Material intended for retail audience
- `ComplianceReviewNotes`: Reviewer comments

**Compliance Notifications:**
- `ComplianceReviewApproved` - On approval
- `ComplianceChangesRequested` - On changes requested (High Priority)
- `ResubmissionReceivedCompliance` - On resubmission

#### 4.4.3 Parallel vs Sequential Reviews

**When Review Audience = "Both":**
- Legal and Compliance reviews happen in parallel
- Both must complete before moving to Closeout
- Either reviewer can request changes independently
- Request moves to Closeout only when:
  - Legal: Approved or Approved With Comments
  - Compliance: Approved or Approved With Comments

**When Any Review = "Not Approved":**
- Request immediately moves to Completed (bypasses Closeout)
- **Notification:** `LegalReviewNotApproved` or equivalent

---

### 4.5 Stage: Closeout

**Purpose:** Submitter acknowledges review comments and provides final information.

| Attribute | Details |
|-----------|---------|
| **Entry Condition** | All required reviews completed with Approved/Approved With Comments |
| **Who Can Edit** | Original Submitter |
| **Required Fields** | Tracking ID (conditional), Acknowledge Comments (if any) |
| **Available Actions** | Complete Closeout, Request Foreside Documents |
| **Exit Conditions** | Complete → Completed, Foreside Needed → Awaiting Foreside Documents |

**Trigger Event:** `In Review → Closeout`

**Notification:** `ReadyForCloseout`
| Field | Value |
|-------|-------|
| To | Submitter |
| Subject | [Action Required] Ready for Closeout: {{RequestId}} - {{RequestTitle}} |

**Closeout Requirements:**

1. **Tracking ID Required When:**
   - Compliance reviewed the request AND
   - (`IsForesideReviewRequired = true` OR `IsRetailUse = true`)

2. **Comment Acknowledgment:**
   - If any review outcome was "Approved With Comments"
   - Submitter must check acknowledgment box
   - Comments from reviewers displayed prominently

3. **Foreside Documents:**
   - If Foreside review was required
   - Submitter can upload Foreside approval documents
   - Or request "Awaiting Foreside Documents" status

---

### 4.6 Stage: Awaiting Foreside Documents

**Purpose:** Request is complete except for external Foreside documentation.

| Attribute | Details |
|-----------|---------|
| **Entry Condition** | Submitter requests to wait for Foreside docs at Closeout |
| **Who Can Edit** | Original Submitter |
| **Available Actions** | Upload Documents, Complete Closeout |
| **Exit Conditions** | Complete → Completed |

**Business Rules:**
- No notifications for this stage
- Submitter can complete closeout once documents are uploaded
- No time limit enforced

---

### 4.7 Stage: Completed

**Purpose:** Request is fully processed and closed.

| Attribute | Details |
|-----------|---------|
| **Entry Condition** | Closeout completed OR Review = Not Approved |
| **Who Can Edit** | None (Read Only) |
| **Available Actions** | View only |

**Trigger Event:** Any → Completed

**Notification:** `RequestCompleted`
| Field | Value |
|-------|-------|
| To | Submitter |
| Subject | Request Completed: {{RequestId}} - {{RequestTitle}} |

**Business Rules:**
- No further edits allowed
- All parties retain read access
- Request included in reporting/analytics
- Documents preserved for audit trail

---

### 4.8 Stage: On Hold

**Purpose:** Temporarily pause request processing.

| Attribute | Details |
|-----------|---------|
| **Entry Condition** | Authorized user places request on hold |
| **Who Can Place On Hold** | Legal Admin, Assigned Attorney, Compliance Users |
| **Required Fields** | Hold Reason |
| **Available Actions** | Resume |
| **Exit Conditions** | Resume → Previous Status |

**Trigger Event:** Any Status → On Hold

**Notification:** `RequestOnHold`
| Field | Value |
|-------|-------|
| To | Submitter |
| Subject | Request Placed On Hold: {{RequestId}} - {{RequestTitle}} |

**Trigger Event:** On Hold → Previous Status

**Notification:** `RequestResumed`
| Field | Value |
|-------|-------|
| To | Submitter |
| Subject | Request Resumed: {{RequestId}} - {{RequestTitle}} |

**Business Rules:**
- Previous status is stored and restored on resume
- Hold duration is tracked for reporting
- Time on hold excluded from SLA calculations

---

### 4.9 Stage: Cancelled

**Purpose:** Request terminated before completion.

| Attribute | Details |
|-----------|---------|
| **Entry Condition** | Authorized user cancels request |
| **Who Can Cancel** | Submitter (own Draft only), Legal Admin, Admin |
| **Required Fields** | Cancel Reason |
| **Exit Conditions** | None (Terminal State) |

**Trigger Event:** Any Status → Cancelled

**Notification:** `RequestCancelled`
| Field | Value |
|-------|-------|
| To | Submitter |
| CC | Assigned Attorney (if any) |
| Subject | Request Cancelled: {{RequestId}} - {{RequestTitle}} |

**Business Rules:**
- Cancelled requests cannot be reopened
- Previous status stored for audit
- Excluded from SLA reporting

---

## 5. Business Rules Summary

### 5.1 Rush Request Calculation

A request is classified as "Rush" when:
```
TargetReturnDate < (RequestedDate + SubmissionType.TurnAroundTimeInDays)
```

**Calculation Details:**
- Only business days counted (Monday-Friday)
- Weekends excluded
- Company holidays excluded (Phase 2)

### 5.2 Review Audience Logic

| Submitter Selection | Legal Admin Override | Final Requirement |
|---------------------|---------------------|-------------------|
| Legal | - | Legal Review Only |
| Compliance | - | Compliance Review Only |
| Both | - | Legal AND Compliance |
| Any | Legal Admin changes | Legal Admin selection wins |

### 5.3 Approval Requirements

At least ONE approval must be present before submission:
- Approval Date (required)
- Approver Name (required)
- Approval Document (required - uploaded file)
- Approval Notes (optional)

**Approval Types:**
- Communications Approval
- Portfolio Manager Approval
- Research Analyst Approval
- SME Approval
- Performance Approval
- Other Approval

### 5.4 Document Requirements

**Document Types:**
| Type | Required | Description |
|------|----------|-------------|
| Attachments | Yes (at least 1) | Materials being reviewed |
| Prior Submissions | No | Reference to previous versions |
| Approval Documents | Yes (at least 1) | Internal approval evidence |
| Foreside Documents | Conditional | External Foreside approval |

### 5.5 Time Tracking

Time is tracked at each stage for SLA monitoring:
- Submission to Legal Intake: Auto-captured
- Legal Intake to Assignment: Tracked
- Time in Review (Legal): Tracked per reviewer
- Time in Review (Compliance): Tracked per reviewer
- Time Waiting on Submitter: Tracked (excluded from reviewer SLA)
- Total Turnaround Time: Submission to Completion

---

## 6. Notification Reference

### 6.1 Notification Matrix

| Event | Notification | To | CC | Priority |
|-------|--------------|----|----|----------|
| Request Submitted | RequestSubmitted | Legal Admin Group | - | Normal |
| Rush Request Submitted | RushRequestAlert | Legal Admin Group | - | High |
| Sent to Committee | ReadyForAttorneyAssignment | Attorney Assigner Group | - | Normal |
| Attorney Assigned | AttorneyAssigned | Assigned Attorney | Submitter | Normal |
| Attorney Reassigned | AttorneyReassigned | New Attorney | Submitter, Previous Attorney | Normal |
| Compliance Review Required | ComplianceReviewRequired | Compliance Group | Submitter | Normal |
| Legal Approved | LegalReviewApproved | Submitter | Additional Parties | Normal |
| Legal Changes Requested | LegalChangesRequested | Submitter | Additional Parties | High |
| Legal Not Approved | LegalReviewNotApproved | Submitter | Additional Parties | Normal |
| Compliance Approved | ComplianceReviewApproved | Submitter | Additional Parties | Normal |
| Compliance Changes Requested | ComplianceChangesRequested | Submitter | Additional Parties | High |
| Compliance Not Approved | ComplianceReviewNotApproved | Submitter | Additional Parties | Normal |
| Resubmitted (Legal) | ResubmissionReceivedLegal | Assigned Attorney | - | Normal |
| Resubmitted (Compliance) | ResubmissionReceivedCompliance | Compliance Group | - | Normal |
| Placed On Hold | RequestOnHold | Submitter | Additional Parties | Normal |
| Resumed from Hold | RequestResumed | Submitter | Additional Parties | Normal |
| Cancelled | RequestCancelled | Submitter | Assigned Attorney | Normal |
| Ready for Closeout | ReadyForCloseout | Submitter | Additional Parties | Normal |
| Completed | RequestCompleted | Submitter | Additional Parties | Normal |

### 6.2 Token Reference

| Token | Description | Example |
|-------|-------------|---------|
| `{{RequestId}}` | Unique request identifier | CRR-26-1 |
| `{{RequestTitle}}` | Request title/name | Q1 Marketing Brochure |
| `{{RequestLink}}` | Direct URL to request | https://... |
| `{{SubmitterName}}` | Name of person who created request | John Smith |
| `{{SubmitterEmail}}` | Email of submitter | john.smith@company.com |
| `{{SubmissionType}}` | Type of submission | New Publication |
| `{{TargetReturnDate}}` | Requested completion date | January 15, 2026 |
| `{{ReviewAudience}}` | Who needs to review | Legal, Compliance, Both |
| `{{AssignedAttorneyName}}` | Name of assigned attorney | Jane Doe |
| `{{AssignedAttorneyEmail}}` | Email of assigned attorney | jane.doe@company.com |
| `{{LegalReviewOutcome}}` | Legal review decision | Approved |
| `{{LegalReviewNotes}}` | Attorney's notes | - |
| `{{ComplianceReviewOutcome}}` | Compliance review decision | Approved With Comments |
| `{{ComplianceReviewNotes}}` | Compliance notes | - |
| `{{Status}}` | Current request status | In Review |
| `{{PreviousStatus}}` | Previous status | Legal Intake |
| `{{OnHoldByName}}` | Who placed on hold | Admin User |
| `{{OnHoldSince}}` | Date placed on hold | January 10, 2026 |
| `{{OnHoldReason}}` | Reason for hold | Awaiting additional information |
| `{{CancelledByName}}` | Who cancelled | Admin User |
| `{{CancelledOn}}` | Date cancelled | January 10, 2026 |
| `{{CancelReason}}` | Reason for cancellation | Duplicate request |
| `{{RushRationale}}` | Why rush was requested | Urgent client deadline |
| `{{TrackingId}}` | External tracking ID | FINRA-2026-12345 |
| `{{CompletedOn}}` | Completion date | January 20, 2026 |
| `{{ResubmittedOn}}` | Resubmission date | January 12, 2026 |
| `{{SubmitterResponseNotes}}` | Submitter's response to comments | - |

---

## 7. Appendix

### 7.1 Field Reference by Status

| Field | Draft | Legal Intake | Assign Attorney | In Review | Closeout |
|-------|:-----:|:------------:|:---------------:|:---------:|:--------:|
| Title | Edit | View | View | View | View |
| Purpose | Edit | View | View | View | View |
| Submission Type | Edit | View | View | View | View |
| Target Return Date | Edit | View | View | View | View |
| Review Audience | Edit | Edit | View | View | View |
| Attachments | Edit | View | View | View | View |
| Approvals | Edit | View | View | View | View |
| Attorney Assignment | - | Edit | Edit | View | View |
| Legal Review | - | - | - | Edit (Attorney) | View |
| Compliance Review | - | - | - | Edit (Compliance) | View |
| Tracking ID | - | - | - | - | Edit |

### 7.2 Glossary

| Term | Definition |
|------|------------|
| **SLA** | Service Level Agreement - target time for completion |
| **Foreside** | External compliance review service |
| **FINRA** | Financial Industry Regulatory Authority |
| **Turnaround Time** | Standard number of business days for review |
| **Rush Request** | Request with expedited timeline |
| **Resubmission** | Updated request after addressing reviewer comments |
| **Closeout** | Final stage where submitter acknowledges completion |

---

## 8. Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Legal Operations | Initial document |
| 1.1 | January 2026 | Legal Operations | Added AttorneyReassigned, ComplianceReviewRequired, ComplianceReviewNotApproved notifications |
