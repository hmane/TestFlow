# General Review - Requirements Document

**Version:** 1.0 Draft
**Date:** February 2026
**Status:** Draft - For Review
**Phase:** Phase 2

---

## 1. Overview

### 1.1 Purpose

The General Review request type extends Legal Workflows to support **non-communication legal review requests** such as guidelines, account documentation, and other materials requiring legal sign-off. This replaces the current paper-based General Review form with a digital workflow in the same SharePoint system used for Communication requests.

### 1.2 Current Process (Paper Form)

The existing General Review process uses a physical form that captures:
- Requestor, Manager, Account Name, Account Number
- Submission category (Guidelines / Other) with description
- Target return date and rush flag
- Manager, Research Analyst, Performance, and Other approvals
- Legal review outcome (Approved, Approved with comments, Resubmit, Schedule a meeting)
- Tracking number assigned manually

### 1.3 Goals

- Eliminate paper-based submissions
- Reuse existing Legal Workflows infrastructure (same list, same dashboards, same roles)
- Maintain separate form components per request type (no complex show/hide logic)
- Support the simpler General Review workflow (Legal only, no Compliance)

---

## 2. Workflow

### 2.1 Status Flow

```
Draft --> Legal Intake --> [Assign Attorney] --> In Review --> Closeout --> Completed
                               (optional)
```

Special statuses (shared with Communication): **Cancelled**, **On Hold**

### 2.2 Key Differences from Communication

| Aspect | Communication | General Review |
|--------|--------------|----------------|
| Compliance Review | Yes (if audience = Compliance/Both) | No |
| FINRA Documents stage | Yes (if compliance flagged) | No |
| FINRA Audience/Product fields | Yes (6 fields) | No |
| Distribution Method | Yes | No |
| Communications Approval | Yes | No |
| Account (Taxonomy) | No | Yes |
| Manager Approval | No (has Portfolio Manager) | Yes |
| Guidelines/Other text | No | Yes |
| Return To | No | Yes |
| Electronic Version flag | No | Yes |
| General Tracking Number | No | Yes |
| Review Audience | User selects (Legal/Compliance/Both) | Auto-set to "Legal" (hidden) |

### 2.3 Workflow Rules

- **ReviewAudience**: Automatically set to "Legal" on submission. Not editable by submitter. Legal Admin can override during Legal Intake.
- **Compliance Review fields**: Remain at default values (ComplianceReviewStatus = "Not Required"). Not displayed on General Review form.
- **FINRA Documents**: Stage is skipped entirely. `AwaitingFINRASince` and related fields unused.
- **Closeout**: Same as Communication. TrackingId (Closeout) is separate from GeneralTrackingNumber.
- **Rush calculation**: Same logic as Communication — `targetReturnDate < (submittedOn + turnAroundDays)`.

---

## 3. SharePoint Fields

### 3.1 New Fields

| Display Name | Internal Name | Type | Group | Required | Notes |
|---|---|---|---|---|---|
| Account | `Account` | TaxonomyFieldType | General Review | Yes | Term set: "Account". Stores account number as term label. |
| General Tracking Number | `GeneralTrackingNumber` | Text (max 50) | General Review | No | Reference number from paper process. Distinct from Closeout `TrackingId`. |
| Guidelines/Other | `GeneralGuidelines` | Note (multiline) | General Review | No | Describes what is being reviewed (e.g., guidelines text, other material description). |
| Return To | `ReturnTo` | User | General Review | No | People picker. Person to return the reviewed document to. |
| Electronic Version | `LegalReceivesElectronic` | Boolean | General Review | No | Whether legal receives an electronic version. Default: false. |
| Has Manager Approval | `HasManagerApproval` | Boolean | Approvals | No | Whether manager approval is provided. Default: false. |
| Manager Approver | `ManagerApprover` | User | Approvals | No | People picker. Auto-populated from current user's Azure AD manager; editable. |
| Manager Approval Date | `ManagerApprovalDate` | DateTime (DateOnly) | Approvals | No | Date approval was given. |
| Manager Approval Notes | `ManagerApprovalNotes` | Note (multiline, 4 lines) | Approvals | No | Notes from manager approval. |

### 3.2 Modified Fields

| Field | Change |
|---|---|
| `LegalReviewOutcome` | Add choice: **"Schedule A Meeting To Discuss"** |

### 3.3 Existing Fields Reused (No Changes)

**Request Information (shared):**
- Title (Request ID), RequestType, RequestTitle, Purpose, SubmissionType, SubmissionItem, TargetReturnDate, IsRushRequest, RushRationale, ReviewAudience, PriorSubmissions, PriorSubmissionNotes, ContentId, DateOfFirstUse, AdditionalParty, Department

**Approvals (shared):**
- Research Analyst (HasResearchAnalystApproval, ResearchAnalyst, ResearchAnalystApprovalDate, ResearchAnalystApprovalNotes)
- Performance (HasPerformanceApproval, PerformanceApprover, PerformanceApprovalDate, PerformanceApprovalNotes)
- Other (HasOtherApproval, OtherApproval, OtherApprovalDate, OtherApprovalTitle, OtherApprovalNotes)

**Legal Intake:** Attorney, AttorneyAssignNotes

**Legal Review:** LegalReviewStatus, LegalStatusUpdatedOn, LegalStatusUpdatedBy, LegalReviewOutcome, LegalReviewNotes, LegalReviewCompletedOn, LegalReviewCompletedBy

**Closeout:** TrackingId, CloseoutNotes, CommentsAcknowledged, CommentsAcknowledgedOn

**System Tracking:** All existing fields (Status, SubmittedBy, SubmittedOn, etc.)

**Time Tracking:** All existing fields

### 3.4 Fields NOT Used by General Review

These fields exist on the Requests list but are not displayed or populated for General Review requests:

- FINRA Audience & Product: FINRAAudienceCategory, Audience, USFunds, USFundShares, UCITS, SeparateAcctStrategies, SeparateAcctStrategiesIncl
- Communications Approval: RequiresCommunicationsApproval, CommunicationsOnly, CommunicationsApprovalDate, CommunicationsApprover, CommunicationsApprovalNotes
- Portfolio Manager Approval: HasPortfolioManagerApproval, PortfolioManagerApprovalDate, PortfolioManager, PortfolioMgrApprovalNotes
- SME Approval: HasSMEApproval, SMEApprovalDate, SubjectMatterExpert, SMEApprovalNotes
- Distribution Method: DistributionMethod
- Compliance Review: All ComplianceReview* fields, IsForesideReviewRequired, RecordRetentionOnly, IsRetailUse
- FINRA Documents: FINRACompletedBy, FINRACompletedOn, FINRANotes, AwaitingFINRASince, FINRACommentsReceived

---

## 4. Approvals

### 4.1 Available Approval Types

| Approval | Auto-Populate | Required? |
|----------|--------------|-----------|
| Manager | Yes - from current user's Azure AD manager (Graph API) | No |
| Research Analyst | No | No |
| Performance | No | No |
| Other | No | No |

### 4.2 Approval Rules

- At least **one approval** must be provided before submission (same as Communication).
- Each approval requires: date + approver name + uploaded approval document.
- Manager field is auto-populated on form load from the current user's Azure AD `manager` property via Microsoft Graph. The user can change it.

---

## 5. Legal Review

### 5.1 Outcomes

| Outcome | Behavior |
|---------|----------|
| **Approved** | Review complete. Moves to Closeout. |
| **Approved With Comments** | Review complete. Submitter must acknowledge comments at Closeout. |
| **Respond To Comments And Resubmit** | Triggers resubmit workflow (same as Communication). Status changes to "Waiting On Submitter". |
| **Schedule A Meeting To Discuss** | **New.** Attorney requests a meeting. Behaves like "Respond To Comments And Resubmit" — status changes to "Waiting On Submitter", submitter must resubmit after the meeting. |
| **Not Approved** | Request rejected. Moves directly to Completed (bypasses Closeout). |

### 5.2 "Schedule A Meeting To Discuss" Details

- Sets `LegalReviewStatus` to "Waiting On Submitter" (same as Respond To Comments And Resubmit)
- Attorney adds notes explaining what needs to be discussed
- Submitter sees a banner indicating a meeting is requested
- After the meeting, submitter can resubmit or the attorney can set a final outcome
- Time tracking follows the same handoff logic as Respond To Comments And Resubmit

---

## 6. Component Architecture

### 6.1 Approach

Separate component trees per request type. Shared components for common sections. No conditional show/hide of individual fields within components.

### 6.2 Component Structure

```
components/
  LegalWorkflow.tsx                      # Router: switches by RequestType
  shared/
    RequestHeaderCard/                   # Title, Status, Stepper (all types)
    ApprovalCard/                        # Generic approval row (reusable)
    LegalReviewCard/                     # Legal review section (all types)
    ComplianceReviewCard/                # Compliance review (Communication only)
    CloseoutCard/                        # Closeout section (all types)
    CommentsPanel/                       # Right-side comments panel (all types)
    DocumentsCard/                       # Document upload/view (all types)
  Communication/
    CommunicationForm.tsx                # Orchestrator
    CommunicationRequestInfo.tsx         # FINRA audience, distribution, comm fields
    CommunicationApprovals.tsx           # Comms, PM, Research, SME, Perf, Other
    CommunicationSummary.tsx             # Read-only summary
  GeneralReview/
    GeneralForm.tsx                      # Orchestrator
    GeneralRequestInfo.tsx               # Account, Guidelines, Return To, Electronic
    GeneralApprovals.tsx                 # Manager, Research, Performance, Other
    GeneralSummary.tsx                   # Read-only summary
  IMAReview/                             # Future
    ...
```

### 6.3 Router Logic

```tsx
switch (request.requestType) {
  case 'Communication':   return <CommunicationForm />;
  case 'General Review':  return <GeneralForm />;
  case 'IMA Review':      return <IMAReviewForm />;  // future
}
```

### 6.4 Shared Components

| Component | Used By | Notes |
|-----------|---------|-------|
| RequestHeaderCard | All | Shows Request ID, title, status badge, workflow stepper |
| ApprovalCard | All | Generic: takes approval type config, renders date/approver/notes/doc |
| LegalReviewCard | All | Identical for Communication and General Review |
| ComplianceReviewCard | Communication only | Not rendered for General Review |
| CloseoutCard | All | Same logic. General Review skips FINRA-related checks. |
| CommentsPanel | All | Right-side panel, identical |
| DocumentsCard | All | Document library integration, identical |

---

## 7. Form Sections by Stage

### 7.1 Draft (Submitter)

| Section | Fields |
|---------|--------|
| Request Info | RequestType, RequestTitle, Purpose, Account (taxonomy picker), GeneralTrackingNumber, GeneralGuidelines, SubmissionType, SubmissionItem, TargetReturnDate, IsRushRequest, RushRationale, ReturnTo, LegalReceivesElectronic, PriorSubmissions, PriorSubmissionNotes, ContentId, DateOfFirstUse, AdditionalParty, Department |
| Approvals | Manager, Research Analyst, Performance, Other (at least 1 required) |
| Documents | Upload area for supporting documents |

### 7.2 Legal Intake (Legal Admin)

| Section | Fields |
|---------|--------|
| Request Info | Read-only summary of submitter's input |
| Legal Intake | Attorney assignment (direct or committee), AttorneyAssignNotes, ReviewAudience override |

### 7.3 In Review (Attorney)

| Section | Fields |
|---------|--------|
| Request Info | Read-only summary |
| Legal Review | LegalReviewStatus, LegalReviewOutcome, LegalReviewNotes |

### 7.4 Closeout (Submitter)

| Section | Fields |
|---------|--------|
| Request Info | Read-only summary |
| Closeout | CloseoutNotes, CommentsAcknowledged (if outcome was "Approved With Comments") |
| TrackingId | Required if applicable (same rules as Communication minus FINRA) |

---

## 8. Taxonomy: Account Term Set

### 8.1 Structure

```
Term Store
  └── [Term Group]
      └── Account                        # Term Set
          ├── 12345                       # Term (account number)
          ├── 67890
          └── ...
```

### 8.2 Field Behavior

- Taxonomy picker control in the form
- User types to search/filter accounts
- Stores the term ID + label (account number) in the SharePoint taxonomy field
- If the user's account is not in the term set, they cannot select it (closed term set, no fill-in)

### 8.3 Provisioning

- Term set must be created manually or via a separate provisioning script before site template is applied
- The `Account` field in Requests.xml references the term set by ID
- PnP provisioning supports taxonomy field definitions with `SspId` and `TermSetId`

---

## 9. Manager Auto-Population

### 9.1 Approach

On form load (Draft mode for new General Review requests):
1. Call Microsoft Graph API: `GET /me/manager`
2. If a manager is returned, auto-populate `ManagerApprover` field
3. User can change the value (people picker remains editable)
4. If Graph call fails or no manager is set, field remains empty

### 9.2 Permissions

- Requires `User.Read.All` or `People.Read` Graph API permission
- SPFx context provides the access token via `msGraphClientFactory`

---

## 10. Dashboard & Views Impact

### 10.1 Existing Views

All existing dashboard views filter by Status, not by RequestType. General Review requests will automatically appear in the appropriate views:
- All Open Requests, All Completed Requests, My Open Requests, etc.
- Legal Intake Queue, Pending Attorney Assignment, etc.
- Attorney Dashboard views (Pending My Review, My Assigned Requests, etc.)

**No new views needed** for General Review. The `RequestType` column can be added to views if users want to distinguish types at a glance.

### 10.2 Optional View Enhancement

Consider adding `RequestType` field to key views so users can visually distinguish Communication vs General Review items in mixed lists.

### 10.3 Views NOT Applicable

General Review requests will never appear in:
- Compliance Dashboard views (ReviewAudience = "Legal", so compliance filters exclude them)
- Awaiting FINRA Documents views (status never reaches "Awaiting FINRA Documents")

---

## 11. Analytics Dashboard Impact

### 11.1 Metrics

General Review requests count toward all existing KPIs:
- Total Requests, Avg Turnaround, Rush %, SLA Compliance
- Pending Reviews (snapshot)
- Attorney Workload
- Volume Trends

### 11.2 Segmentation

The existing `requestType` segmentation filter allows users to view Communication-only or General Review-only metrics.

### 11.3 Excluded Metrics

General Review requests will not contribute to:
- Awaiting FINRA Documents count
- FINRA Comments Received count
- Compliance Review outcomes
- Communications Only distribution

---

## 12. Notifications

### 12.1 Applicable Notifications

All existing notification types apply to General Review with the same triggers:
- Request submitted
- Attorney assigned
- Legal review started / completed
- Resubmit requested
- Comments acknowledged
- Request completed / cancelled / on hold / resumed

### 12.2 Not Applicable

- Compliance review notifications (not triggered since ComplianceReviewStatus = "Not Required")
- FINRA document notifications

---

## 13. Validation Rules

### 13.1 Submission Validation (Draft -> Legal Intake)

| Rule | Description |
|------|-------------|
| RequestTitle required | Min 3 characters |
| Purpose required | Min 10 characters |
| Account required | Must select from taxonomy |
| TargetReturnDate required | Must be a future date |
| SubmissionType required | New or Material Updates |
| At least 1 approval | One of Manager/Research/Performance/Other must have date + approver + document |
| At least 1 document | Must upload supporting documents |

### 13.2 Legal Review Validation

Same as Communication:
- Outcome required to complete review
- Notes required for non-Approved outcomes

### 13.3 Closeout Validation

- CommentsAcknowledged required if outcome was "Approved With Comments" or "Schedule A Meeting To Discuss"
- TrackingId (Closeout) rules: same as Communication minus FINRA-specific conditions

---

## 14. Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | Should `SubmissionItem` use the same SubmissionItems config list (with turnaround days), or should General Review have its own set? | Open |
| 2 | Does "Schedule A Meeting To Discuss" need a date/time field for the meeting, or is it just a notes-based handoff? | Open |
| 3 | Should `GeneralTrackingNumber` be required at submission or optional? | Open |
| 4 | Account term set: closed (no fill-in) or open (allow custom values)? | Open |
| 5 | Should `RequestType` column be added to existing dashboard views? | Open |
| 6 | Does General Review need its own SubmissionItems entries in the config list for turnaround time calculation? | Open |

---

## 15. Implementation Phases

### Phase 2a: Schema & Provisioning
- Add new fields to Requests.xml
- Add "Schedule A Meeting To Discuss" to LegalReviewOutcome choices
- Create/document Account term set provisioning
- Update RequestsFields.ts, requestTypes.ts, and related TypeScript mappings
- Update site-schema.md documentation

### Phase 2b: Component Architecture Refactor
- Create shared/ component directory and extract common components
- Refactor existing Communication form into Communication/ directory
- Ensure all existing tests pass after refactor

### Phase 2c: General Review Form
- Build GeneralReview/ components (GeneralForm, GeneralRequestInfo, GeneralApprovals, GeneralSummary)
- Implement Account taxonomy picker
- Implement Manager auto-population via Graph API
- Add router logic in LegalWorkflow.tsx

### Phase 2d: Workflow & Services
- Update workflow action services to handle "Schedule A Meeting To Discuss" outcome
- Update requestLoadService to load new fields
- Update payloadBuilder for General Review saves
- Update time tracking for General Review (no compliance stage)

### Phase 2e: Testing & Validation
- Update Zod schemas for General Review validation
- Unit tests for new components
- Integration tests for General Review workflow
- UAT with business users
