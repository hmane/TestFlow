# Legal Review System - Complete System Documentation

**Version:** 1.0 | **Date:** September 29, 2025 | **Status:** Phase 1 Active Development

---

## 📚 Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [User Roles & Responsibilities](#2-user-roles--responsibilities)
3. [SharePoint Architecture](#3-sharepoint-architecture)
4. [Technical Architecture](#4-technical-architecture)
5. [Complete Workflow Process](#5-complete-workflow-process)
6. [Integration Points](#6-integration-points)
7. [UI/UX Design & Components](#7-uiux-design--components)ß
8. [Security & Permissions](#8-security--permissions)
9. [Notifications & Communication](#9-notifications--communication)
10. [Testing Strategy](#10-testing-strategy)
11. [Documentation & Deliverables](#11-documentation--deliverables)
12. [Future Enhancements](#12-future-enhancements)
13. [Success Metrics](#13-success-metrics)
14. [Known Limitations](#14-known-limitations)
15. [Appendices](#15-appendices)

---å

## 1. Executive Summary

### 1.1 Purpose

Automate and streamline legal/compliance review process for marketing communications, replacing manual email-based workflows with centralized, auditable SharePoint system.

### 1.2 Business Problem - Current State

**Manual Tracking Process:**

- Documents copied to shared network drives
- Email requests sent to legal department
- Back-and-forth via email chains
- Approvals tracked via email screenshots
- No centralized visibility or audit trail
- Difficult to track turnaround times
- Hard to report and measure metrics

### 1.3 Solution - Future State

**Automated System:**

- Centralized request submission in SharePoint
- Automated routing to legal admins, attorneys, compliance
- Enforced approval documentation
- Real-time status tracking and dashboards
- Complete version control and audit trail
- Automated notifications at each step
- Easy reporting and metrics

### 1.4 Success Criteria

1. 100% of manual email requests moved to system
2. All approvals documented with proof
3. Complete audit trail for all requests
4. Measurable turnaround time compliance
5. 90% user adoption within 3 months

---

## 2. User Roles & Responsibilities

### 2.1 Submitters (LW - Submitters Group)

**Who:** Marketing, Communications, Business departments
**Permissions:** Create requests, edit own drafts, view all requests (read-only for others)
**Key Responsibilities:**

- Create complete review requests
- Provide at least one pre-approval with proof
- Upload documents for review
- Respond to feedback and upload revisions
- Perform closeout when approved

### 2.2 Legal Admin (LW - Legal Admin Group)

**Who:** Legal department administrators (gatekeepers)
**Permissions:** View/edit all requests, override review audience, assign attorneys
**Key Responsibilities:**

- Triage incoming requests at Legal Intake
- Validate review audience (Legal/Compliance/Both)
- Assign attorneys directly OR send to committee
- Monitor workflow health across all stages
- Handle reassignments and exceptions

### 2.3 Attorney Assigner (LW - Attorney Assigner Group)

**Who:** Committee members for attorney assignment
**Permissions:** View pending assignments, assign attorneys
**Key Responsibilities:**

- Review requests sent by Legal Admin
- Assign appropriate attorney based on expertise/workload
- Provide assignment rationale
- **Note:** Any committee member can act (not specific person required)

### 2.4 Attorneys (LW - Attorneys Group)

**Who:** Legal department attorneys
**Permissions:** View all, edit assigned only
**Key Responsibilities:**

- Review assigned documents for legal compliance
- Update Legal Review Status (In Progress, Waiting On Submitter, etc.)
- Submit review with outcome (Approved, Approved With Comments, Respond To Comments And Resubmit, Not Approved) and notes
- Communicate via comments for changes/questions

### 2.5 Compliance Users (LW - Compliance Users Group)

**Who:** Compliance department staff
**Permissions:** View all, edit compliance requests
**Key Responsibilities:**

- Review documents for regulatory compliance
- Submit compliance review with outcome and notes
- Set compliance flags (`isForesideReviewRequired`, `isRetailUse`)
- **Note:** No specific assignment - any compliance user can review

### 2.6 Application Admin (LW - Admin Group)

**Who:** IT administrators, developers
**Permissions:** Full control
**Responsibilities:** System maintenance, exception handling, support

### 2.7 Additional Party & Ad-hoc Users

**Who:** Stakeholders added by submitter OR granted access via ManageAccess
**Permissions:** Read-only
**Responsibilities:** Stay informed, provide input via comments

---

## 3. SharePoint Architecture

### 3.1 Lists Overview

| List Name            | Purpose           | Fields     | Permissions       |
| -------------------- | ----------------- | ---------- | ----------------- |
| **Requests**         | Main data         | 66 fields  | Broken per item   |
| **SubmissionItems**  | Configuration     | 3 fields   | Read-only         |
| **Configuration**    | Settings (future) | 3 fields   | Admin only        |
| **RequestDocuments** | Document library  | 6 metadata | Broken per folder |

### 3.2 Requests List - Complete Field Structure (73 Fields)

#### A. Request Information (17 fields)

```
Title (Text) - Auto-generated Request ID, Starts with CRR-{YEAR}-{COUNTER_FOR_YEAR}. example: CRR-2025-10, Next year CRR-2025-1
Department (Text) - Auto-populated, hidden
RequestType (Choice) - Communication, General Review, IMA Review
RequestTitle (Text) - 3-255 chars, required
Purpose (Note/Rich) - 10-10,000 chars, required
SubmissionType (Choice) - New, Material Updates
SubmissionItem (Text) - Display value for submission item, selected from Submission Items list. If other then specified.
DistributionMethod (Multi-Choice) - Dodge & Cox Website - U.S., Dodge & Cox Website - Non-U.S., Third Party Website, Email / Mail, Mobile App, Display Card / Signage, Hangout, Live - Talking Points, Social Media
TargetReturnDate (DateTime) - Future date only, required
IsRushRequest (Boolean) - Auto-calculated
RushRationale (Note) - Required if rush, min 10 chars
ReviewAudience (Choice) - Legal, Compliance, Both (overridable by Legal Admin)
PriorSubmissions (Lookup Multi) - Links to prior requests
PriorSubmissionNotes (Note) - Context about prior submissions
DateOfFirstUse (DateTime) - Future date, informational
AdditionalParty (Person Multi) - Stakeholder objects
```

#### B. Approval Fields (18 fields)

```
RequiresCommunicationsApproval (Boolean) - Yes/No. If Requires then only User will provide Communication Approval details.

```

**Pattern for each type:** Date + Approver

- Communication Approval
  ```
  CommunicationsApprovalDate (Date) - Past or Todays date.
  CommunicationsApprover (Person) - User who approved communications
  ```
- Portfolio Manager Approval
  ```
  HasPortfolioManagerApproval (Boolean) - Yes/No - If yes then provide date and person
  PortfolioManagerApprovalDate (Date) - Past or Todays date.
  PortfolioManager (Person) - User who approved
  ```
- Research Analyst Approval
  ```
  HasResearchAnalystApproval (Boolean) - Yes/No - If yes then provide date and person
  ResearchAnalystApprovalDate (Date) - Past or Todays date.
  ResearchAnalyst (Person) - User who approved
  ```
- Subject Matter Expert Approval
  ```
  HasSMEApproval (Boolean) - Yes/No - If yes then provide date and person
  SMEApprovalDate (Date) - Past or Todays date.
  SubjectMatterExpert (Person) - User who approved
  ```
- Performance Review Approval
  ```
  HasPerformanceApproval (Boolean) - Yes/No - If yes then provide date and person
  PerformanceApprovalDate (Date) - Past or Todays date.
  PerformanceApprover (Person) - User who approved
  ```
- Other Approval (with custom title field)
  ```
  HasOtherApproval (Boolean) - Yes/No - If yes then provide date and person
  OtherApprovalTitle (Text) - Title for other approval
  OtherApprovalDate (Date) - Past or Todays date.
  OtherApproval (Person) - User who approved
  ```

**Rule:** At least ONE approval required (date + approver + uploaded document)

#### C. Legal Intake (2 fields)

```
Attorney (Person) - Attorney object
AttorneyAssignNotes (Note/Append-only) - Assignment context
```

#### D. Legal Review (5 fields)

```
LegalReviewStatus (Choice) - Not Required, Not Started, In Progress, Waiting On Submitter, Waiting On Attorney, Completed
LegalStatusUpdatedOn (Date) - When legal review status was last updated
LegalStatusUpdatedBy (Person) - Who updated last legal status
LegalReviewOutcome (Choice) - Approved, Approved With Comments, Respond To Comments And Resubmit, Not Approved
legalReviewNotes (Note/Append-only) - Min 10 chars
```

#### E. Compliance Review (7 fields)

```
ComplianceReviewStatus (Choice) - Not Required, Not Started, In Progress, Waiting On Submitter, Waiting On Compliance, Completed
ComplianceStatusUpdatedOn (Date) - When compliance review status was last updated
ComplianceStatusUpdatedBy (Person) - Who updated last compliance status
ComplianceReviewOutcome (Choice) - Approved, Approved With Comments, Respond To Comments And Resubmit, Not Approved
ComplianceReviewNotes (Note/Append-only) - Min 10 chars
IsForesideReviewRequired (Boolean) - If true, tracking ID required
IsRetailUse (Boolean) - If true, tracking ID required
```

#### F. Closeout (1 field)

```
TrackingId (Text) - Required if either compliance flag is true for IsForesideReviewRequired and IsRetailUse
```

#### G. System Tracking (16 fields)

```
Status (Choice) - Draft, Legal Intake, Assign Attorney, In Review, Closeout, Completed, Cancelled, On Hold
SubmittedBy (User) - Auto-set current user
SubmittedOn (DateTime) - Auto-set to today
SubmittedToAssignAttorneyBy (User) - Auto-set current user
SubmittedToAssignAttorneyOn (DateTime) - Auto-set to today
SubmittedForReviewBy (User) - Auto-set current user
SubmittedForReviewOn (DateTime) - Auto-set to today
CloseoutBy (User) - Auto-set current user
CloseoutOn (DateTime) - Auto-set to today
CancelledBy (User) - Auto-set current user
CancelledOn (DateTime) - Auto-set to today
CancelReason (Note) - Reason to cancel the request
OnHoldBy (User) - Auto-set current user
OnHoldSince (DateTime) - Auto-set to today
OnHoldReason (Note) - Reason to put request on hold
PreviousStatus (Text) - For resume functionality
```

### 3.3 SubmissionItems List

```
Title (Text) - "White Papers", "Marketing Brochures", etc.
TurnAroundTimeInDays (Number) - Business days for review
Description (Note) - Optional description
```

**Sample Data:**

- New Exhibit : 3 days
- Updated Exhibit : 2 days
- White Paper : 5 days
- Website Update - Substantial (4 pages or more) : 5 days
- Website Update - Non-Substantial (1-3 pages) : 5 days
- Email Blast : 1 day
- FAQ/Talking Points : 3 days
- Shareholder Letter (Final Review) : 1 day
- Separate Account Letter (Final Review) : 1 day
- Investment Commentary (Final Review) : 1 day
- Standard Mutual Fund Presentation : 2 days
- Client-Specific Mutual Fund Presentation : 2 days
- Custom Presentation : 2 days
- Fact Sheet : 3 days
- Shareholder Report (Annual/Semi-Annual) : 5 days
- RFP Related Review Substantial (Multiple Pages) : 3 days
- RFP Related Review Substantial (1 Page) : 1 days
- Social Media - 3 days
- Other - 3 days

### 3.4 RequestDocuments Library

**Structure:** One folder per request (folder name = Request ID)

```
RequestDocuments/
├── 1/
│   ├── review_document.pdf
│   ├── supplemental.docx
│   └── comm_approval.png
├── 2/
└── 3/
```

**Metadata:**

```
DocumentType (Choice) - Review, Supplemental, Communication Approval, Portfolio Manager Approval, Research Analyst Approval, Subject Matter Expert Approval, Performance Approval, Other Approval
Request (Lookup) - Links to Request
Description (Note) - Optional
```

---

## 4. Technical Architecture

### 4.1 Technology Stack

**Frontend:**

- SPFx 1.21.1 + React 18 + TypeScript
- Zustand (state), React Hook Form + Zod (forms/validation)
- Fluent UI v8.106.4, DevExtreme React v22.2.3, @pnp/spfx-controls-react v3.22.0
- spfx-toolkit (Card, spForm, WorkflowStepper, ManageAccess)

**Backend:**

- SharePoint Online (data storage)
- Azure Functions Node.js (permissions, notifications)
- Power Automate Flow - Trigger on Item Update - Send notifications if status is changed, update permissions.

**Integration:**

- @pnp/sp v3.20.1 (SharePoint operations)
- SPContext utility (context management)
- List Item Helper (data extraction/updates)
- spfx-toolkit (Reusable components and utilities)

### 4.2 Solution Structure

```
src/
├── components/
│   ├── RequestContainer/ (70/30 layout)
│   ├── RequestForm/ (left column sections)
│   ├── RequestHeader/ (stepper)
│   ├── CommentsContainer/ (right column)
│   ├── DocumentUpload/
│   ├── RequestTypeSelector/
│   └── Dashboard/ (role-based views)
├── stores/ (Zustand)
│   ├── requestFormStore.ts
│   ├── fieldChoicesStore.ts
│   └── submissionItemsStore.ts
├── hooks/
│   ├── useRequestForm.ts
│   ├── useFormValidation.ts
│   └── useBusinessDays.ts
├── schemas/ (Zod validation)
├── types/ (TypeScript)
├── services/ (business logic)
├── utilities/ (SPContext, List Item Helper)
└── webparts/
```

### 4.3 Key Business Logic

#### Rush Request Calculation

```typescript
function calculateRushRequest(
  submissionItemId: number,
  targetReturnDate: Date,
  requestedDate: Date
): boolean {
  const submissionItem = getSubmissionItem(submissionItemId);
  const turnaroundDays = submissionItem.turnAroundTimeInDays;
  const expectedDate = addBusinessDays(requestedDate, turnaroundDays);
  return targetReturnDate < expectedDate; // Rush if target < expected
}

function addBusinessDays(startDate: Date, days: number): Date {
  // Skip weekends (Saturday=6, Sunday=0)
  // Company holidays: Phase 2
}
```

#### Closeout Readiness Logic

```typescript
// Move to Closeout when ALL required reviews complete with Approved/Needs Changes
// Move to Completed if ANY review = Rejected

if (anyReviewRejected) {
  status = 'Completed'; // Rejected = Completed (not Cancelled)
} else if (allRequiredReviewsComplete) {
  status = 'Closeout';
}
```

#### Tracking ID Requirement

```typescript
function isTrackingIdRequired(request: Request): boolean {
  // Only check if compliance reviewed
  if (reviewAudience includes 'Compliance') {
    return isForesideReviewRequired === true || isRetailUse === true;
  }
  return false; // Optional if only legal
}
```

---

## 5. Complete Workflow Process

### 5.1 Workflow Overview

```
Draft → Legal Intake → Assign Attorney → In Review → Closeout → Completed
                            ↓
                    (Direct Assignment)
                            ↓
                       In Review

Special Actions (any stage): Cancel, Hold, Resume
```

### 5.2 Detailed Stage Descriptions

#### Stage 1: Draft

**Who:** Creator (Submitter)
**Actions:** Create, edit, save draft, submit
**Requirements to Submit:**

- All required fields (RequestTitle, Purpose, SubmissionType, SubmissionItem, TargetReturnDate, ReviewAudience)
- At least one approval (date + approver + document)
- At least one review document uploaded
- Rush rationale if IsRushRequest = true

**On Submit:**

- Status → Legal Intake
- Set SubmittedBy, SubmittedOn
- Auto-populate Department (hidden)
- Break permissions on item and folder
- Notify Legal Admin group

#### Stage 2: Legal Intake

**Who:** Legal Admin
**Actions:**

- Review request details
- Override review audience if needed
- Choose path:
  - **Direct Assignment** → assign attorney → In Review
  - **Committee Assignment** → send to committee → Assign Attorney

**Decision Factors:**

- Know the right attorney? → Direct
- Unsure or need input? → Committee
- Prior submission by same attorney? → Direct to same attorney

#### Stage 3: Assign Attorney (Committee Path Only)

**Who:** Attorney Assigner committee (any member)
**Actions:** Review request, assign attorney with notes
**On Assignment:** Status → In Review

#### Stage 4: In Review

**Who:** Assigned Attorney and/or Compliance Users

**Legal Review Status:**

- Not Required / Not Started / In Progress / Waiting On Submitter / Waiting On Attorney / Completed

**Compliance Review Status:**

- Not Required / Not Started / In Progress / Waiting On Submitter / Waiting On Compliance / Completed

**Back-and-Forth Process:**

- Reviewer sets status to "Waiting On Submitter"
- Reviewer adds comment requesting changes/docs
- Submitter uploads revised documents
- Submitter adds comment notifying reviewer
- Reviewer sets status back to "In Progress"
- Continue until review complete

**On Review Complete:**

- Set outcome (Approved, Approved With Comments, Respond To Comments And Resubmit, Not Approved)
- Add review notes (min 10 chars, append-only field)
- Update review status to Completed
- **If ANY review = Rejected:** Status → Completed (request ends)
- **If ALL required reviews = Approved/Needs Changes:** Status → Closeout

#### Stage 5: Closeout

**Who:** Creator (Submitter)
**Actions:**

- Provide Tracking ID (if required)
- Close request

**Tracking ID Logic:**

```
IF compliance reviewed AND (isForesideReviewRequired OR isRetailUse):
  Tracking ID REQUIRED
ELSE:
  Tracking ID OPTIONAL
```

**On Close:** Status → Completed

#### Stage 6: Completed

**Who:** Read-only for all
**Two Types:**

1. Successful closeout (approved)
2. Rejection completion (rejected by reviewer)

### 5.3 Special Actions

**Cancel Request:**

- **Who:** Creator (own), Legal Admin (any), App Admin (any)
- **When:** Any status except Draft and Completed
- **Requires:** Cancel reason (10-1000 chars)
- **Result:** Status → Cancelled, request becomes read-only

**Hold Request:**

- **Who:** Creator (own), Legal Admin (any), App Admin (any)
- **When:** Any status except Draft and Completed
- **Requires:** Hold reason (10-1000 chars)
- **Result:** Status → On Hold, previousStatus stored, request becomes read-only

**Resume Request:**

- **Who:** Creator (own), Legal Admin (any), App Admin (any)
- **When:** Status = On Hold only
- **Result:** Status → previousStatus, workflow continues

**Reassign Attorney:**

- **Who:** Legal Admin, App Admin
- **When:** Status = In Review
- **Process:** Seamless - update attorneyId, no status change
- **Notifications:** New and old attorney notified

---

## 6. Integration Points

### 6.1 Azure Functions

**Function App:** Node.js 18+, Azure AD authentication

#### Endpoint 1: POST /api/permissions/manage

```typescript
Request: {
  requestId: number;
  action: 'breakInheritance' | 'addUser' | 'reassignAttorney';
  context: {
    siteUrl,
      listId,
      libraryId,
      requestStatus,
      creatorId,
      attorneyId,
      additionalPartyIds,
      reviewAudience;
  }
}

Response: {
  success: boolean;
  message: string;
}
```

**Logic:**

- Break inheritance on list item and folder
- Assign permissions:
  - Creator: Edit
  - Additional Party: Read
  - LW - Submitters: Read
  - LW - Legal Admin: Contributor Without Delete
  - LW - Compliance Users: Contributor Without Delete (if applicable)
  - Assigned Attorney: Contributor Without Delete
  - LW - Admin: Full Control

#### Endpoint 2: POST /api/notifications/generate

```typescript
Request: {
  requestId: number;
  triggerType: 'statusChange' | 'comment' | 'reviewUpdate';
  previousStatus, currentStatus;
  context: { request, currentUser };
}

Response: {
  sendNotification: boolean;
  notificationType?: string;
  recipients?: string[];
  subject?: string;
  body?: string; // HTML
}
```

**Returns null if no notification needed, triggering flow to stop**

### 6.2 Power Automate Flows

#### Flow 1: Request Status Change

- **Trigger:** Item modified in Requests list
- **Condition:** Status field changed
- **Actions:**
  1. Get request details
  2. HTTP call to Azure Function (notification endpoint)
  3. If sendNotification = true, send email
  4. HTTP call to Azure Function (permission endpoint if needed)

#### Flow 2: Document Uploaded

- **Trigger:** File added to RequestDocuments
- **Actions:**
  1. Get associated request
  2. If status = "Waiting On Submitter", notify reviewers
  3. Update document metadata

---

## 7. UI/UX Design & Components

### 7.1 Page Layout - RequestContainer (70/30 Split)

```
┌─────────────────────────────────────────────────────────────┐
│ RequestHeader (Full Width)                                   │
│ - Request ID, Title, Status Badge                            │
│ - WorkflowStepper (visual progress)                          │
│ - ManageAccess button                                        │
├────────────────────────────────┬────────────────────────────┤
│ Left Column (70%)              │ Right Column (30%)         │
│                                │                            │
│ Request Form                   │ List Item Comments         │
│ ├─ Request Info Card           │ (Collapsible)              │
│ ├─ Approvals Card              │                            │
│ ├─ Legal Intake Card (cond.)   │ - Add comment              │
│ ├─ Legal Review Card (cond.)   │ - @mention users           │
│ ├─ Compliance Review (cond.)   │ - View history             │
│ ├─ Closeout Card (cond.)       │ - Reply to comments        │
│ └─ Form Actions (buttons)      │                            │
│                                │ Hidden when status=Draft   │
└────────────────────────────────┴────────────────────────────┘
```

**Responsive:**

- Desktop (>1024px): 70/30
- Tablet (768-1024px): 60/40
- Mobile (<768px): Single column, comments in accordion

### 7.2 Card Component System (spfx-toolkit)

**All sections use Card component:**

- Expandable/Collapsible
- Summary view (post-submission)
- Edit toggle button
- Visual indicators (status colors)
- Smooth animations

**Card Variants:**

- `success` - Completed sections
- `warning` - Needs attention
- `error` - Validation errors
- `info` - Informational
- `default` - Standard

### 7.3 Form Components (spForm from spfx-toolkit)

**Components:**

- FormItem (container)
- FormLabel (with required indicator, info tooltips)
- FormValue (field wrapper)
- FormDescription (helper text)
- FormError (validation errors)
- DevExtremeTextBox, SelectBox, DateBox, TextArea, TagBox
- PnPPeoplePicker

**Features:**

- Responsive (horizontal desktop, vertical mobile)
- Real-time validation
- Accessibility (WCAG 2.1 AA)
- Keyboard navigation

### 7.4 WorkflowStepper (spfx-toolkit)

**Steps:**

1. Draft
2. Legal Intake
3. Assign Attorney (conditional - committee path only)
4. In Review
5. Closeout
6. Completed

**States:**

- Completed (green checkmark)
- Active (blue circle)
- Upcoming (gray)
- Skipped (grayed out - direct assignment skips step 3)
- On Hold (orange pause icon)
- Cancelled/Rejected (red X)

### 7.5 Dashboard Views

**Submitter Dashboard:**

- My In-Progress Requests
- My Completed Requests
- All Other In-Progress (read-only)
- All Other Completed (read-only)

**Legal Admin Dashboard:**

- Pending Review (Legal Intake)
- Attorney Assigned (In Review)
- Pending Committee Assignment
- Ready for Closeout
- Recently Completed
- On Hold
- All Requests

**Attorney Dashboard:**

- Assigned to Me (Active)
- Waiting on Submitter
- Completed Reviews
- All Requests (view-only)

**Compliance Dashboard:**

- Pending Compliance Review
- Waiting on Submitter
- Completed Reviews
- All Requests (view-only)

**Attorney Assigner Dashboard:**

- Pending Assignment
- Recently Assigned

### 7.6 Form Action Buttons

**Context-Based Display:**

| Status          | User                  | Buttons                                          |
| --------------- | --------------------- | ------------------------------------------------ |
| Draft           | Creator               | Save Draft, Submit, Cancel                       |
| Legal Intake    | Legal Admin           | Assign Attorney, Send to Committee, Hold, Cancel |
| Assign Attorney | Legal Admin/Committee | Assign Attorney, Hold, Cancel                    |
| In Review       | Attorney              | Update Status, Submit Review, Hold, Cancel       |
| In Review       | Compliance            | Update Status, Submit Review, Hold, Cancel       |
| Closeout        | Creator               | Close Request, Hold                              |
| On Hold         | Allowed users         | Resume, Cancel                                   |
| Completed       | All                   | None (read-only)                                 |

---

## 8. Security & Permissions

### 8.1 SharePoint Groups

| Group Name             | Members           | Purpose                  |
| ---------------------- | ----------------- | ------------------------ |
| LW - Submitters        | All requesters    | Create and view requests |
| LW - Legal Admin       | Legal admins      | Triage and routing       |
| LW - Attorney Assigner | Committee members | Attorney assignment      |
| LW - Attorneys         | All attorneys     | Legal reviews            |
| LW - Compliance Users  | Compliance staff  | Compliance reviews       |
| LW - Admin             | IT/Developers     | System administration    |

**Membership:** Managed by SharePoint Admins via ServiceNow tickets

### 8.2 Permission Levels

**Standard:**

- Full Control (LW - Admin)
- Read (base level for all at site)

**Custom:**

- **Contributor Without Delete**
  - Add items: Yes
  - Edit items: Yes
  - Delete items: **No**
  - Delete versions: **No**
  - Based on Contribute level

### 8.3 Item-Level Permissions (Broken Inheritance)

**Triggered:** When status changes from Draft to Legal Intake

**Permissions Applied:**

| User/Group             | Request Item               | Document Folder            | Notes                  |
| ---------------------- | -------------------------- | -------------------------- | ---------------------- |
| Creator                | Contributor Without Delete | Contributor                | Only own requests      |
| Additional Party       | Read                       | Read                       | Stakeholders           |
| LW - Submitters        | Read                       | Read                       | All requests           |
| LW - Legal Admin       | Contributor Without Delete | Contributor Without Delete | All requests           |
| LW - Attorney Assigner | Read                       | Read                       | All requests           |
| Assigned Attorney      | Contributor Without Delete | Contributor Without Delete | Assigned only          |
| LW - Compliance Users  | Contributor Without Delete | Contributor Without Delete | If compliance required |
| LW - Admin             | Contributor Without Delete | Contributor Without Delete | All requests           |
| Ad-hoc Users           | Read                       | Read                       | Via ManageAccess       |

### 8.4 Access Control Matrix

| Action          | Creator | Stakeholder | Submitters | Legal Admin | Attorney Assigner | Attorney | Compliance | App Admin |
| --------------- | ------- | ----------- | ---------- | ----------- | ----------------- | -------- | ---------- | --------- |
| Create          | ✅      | ❌          | ✅         | ✅          | ❌                | ❌       | ❌         | ✅        |
| View Own        | ✅      | ✅          | ✅         | ✅          | ✅                | ✅       | ✅         | ✅        |
| View All        | 👁️      | ❌          | 👁️         | ✅          | 👁️                | 👁️       | 👁️         | ✅        |
| Edit Own Draft  | ✅      | ❌          | ❌         | ✅          | ❌                | ❌       | ❌         | ✅        |
| Edit Any        | ❌      | ❌          | ❌         | ✅          | ❌                | ⚠️\*     | ⚠️\*\*     | ✅        |
| Assign Attorney | ❌      | ❌          | ❌         | ✅          | ✅                | ❌       | ❌         | ✅        |
| Submit Review   | ❌      | ❌          | ❌         | ❌          | ❌                | ✅       | ✅         | ✅        |
| Closeout        | ✅      | ❌          | ❌         | ❌          | ❌                | ❌       | ❌         | ✅        |
| Cancel          | ✅      | ❌          | ❌         | ✅          | ❌                | ❌       | ❌         | ✅        |
| Hold            | ✅      | ❌          | ❌         | ✅          | ❌                | ❌       | ❌         | ✅        |
| Upload Docs     | ✅      | ❌          | ❌         | ✅          | ❌                | ⚠️\*     | ⚠️\*\*     | ✅        |
| Delete Docs     | ❌      | ❌          | ❌         | ❌          | ❌                | ❌       | ❌         | ✅        |
| Add Comments    | ✅      | ✅          | ✅         | ✅          | ✅                | ✅       | ✅         | ✅        |

**Legend:**

- ✅ Full access
- 👁️ Read-only
- ⚠️\* Assigned requests only
- ⚠️\*\* Compliance requests only
- ❌ No access

---

## 9. Notifications & Communication

### 9.1 Email Notification Types (15 Total)

| #   | Notification                  | Trigger                              | Recipients              |
| --- | ----------------------------- | ------------------------------------ | ----------------------- |
| 1   | Request Submitted             | Status → Legal Intake                | Legal Admin group       |
| 2   | Attorney Assigned (Direct)    | Legal Intake → In Review             | Assigned attorney       |
| 3   | Sent to Committee             | Legal Intake → Assign Attorney       | Attorney Assigner group |
| 4   | Attorney Assigned (Committee) | Assign Attorney → In Review          | Assigned attorney       |
| 5   | Compliance Review Required    | reviewAudience includes Compliance   | Compliance group        |
| 6   | Attorney Reassigned           | attorneyId changes                   | New/old attorney        |
| 7   | Waiting On Submitter          | Review status → Waiting On Submitter | Creator                 |
| 8   | Submitter Response            | Document uploaded while waiting      | Attorney/Compliance     |
| 9   | Review Completed (Single)     | Legal OR Compliance → Completed      | Creator, Legal Admin    |
| 10  | Ready for Closeout            | Status → Closeout                    | Creator                 |
| 11  | Request Completed             | Status → Completed                   | All stakeholders        |
| 12  | Request Cancelled             | Status → Cancelled                   | All stakeholders        |
| 13  | Request On Hold               | Status → On Hold                     | All stakeholders        |
| 14  | Request Resumed               | On Hold → previous status            | Active participants     |
| 15  | User Tagged                   | @mention in comment                  | Tagged user             |

### 9.2 List Item Comments (PnP Component)

**Features:**

- Add comments with rich text
- @mention users (triggers notification)
- Reply to comments (threading)
- Edit/delete own comments
- Real-time updates

**Location:** Right column (30% width), collapsible panel
**Visibility:** Hidden when status = Draft
**Usage:**

- Reviewer → Submitter: Request changes
- Submitter → Reviewer: Explain revisions
- Legal Admin → Attorney: Provide context
- Anyone → Stakeholders: Keep informed

---

## 10. Testing Strategy

### 10.1 Testing Levels

**Unit Testing (Jest + React Testing Library):**

- Zustand stores (state management)
- Custom hooks
- Utility functions (business days, rush calculation)
- Validation schemas (Zod)
- Target: 80% code coverage

**Integration Testing (Jest + MSW):**

- SPContext integration with PnP
- Form submission to SharePoint
- Document upload workflow
- Permission management

**End-to-End Testing (Playwright/Cypress):**

- Complete request lifecycle
- Committee assignment path
- Rejection scenario
- Hold and resume
- Document management
- Permission verification

**User Acceptance Testing (UAT):**

- 2-3 Submitters, 2 Legal Admins, 1 Attorney Assigner, 2 Attorneys, 1 Compliance
- Real-world use cases and edge cases
- 2 weeks duration
- Acceptance: All workflows successful, no critical bugs, <3s page load

### 10.2 Performance Testing

**Targets:**

- Page load: <3 seconds
- Form submission: <2 seconds
- Document upload (10MB): <30 seconds
- Dashboard (100 items): <2 seconds

**Load Testing:**

- 50 concurrent users
- Mixed operations (view, edit, submit)
- Monitor SharePoint throttling
- Test Azure Function scalability

---

# Legal Review System - Documentation & Deliverables

## 11. Documentation & Deliverables

### 11.1 For Development Team

#### 1. Technical Design Document (TDD) - 40-50 pages

**Contents:**

- **Solution Architecture**

  - Component hierarchy diagrams
  - Data flow diagrams (initialization, field update, save/submit)
  - State management architecture (Zustand stores)
  - Integration architecture (SPFx → SharePoint → Azure Functions → Power Automate)

- **API Specifications**

  - SharePoint REST API usage patterns
  - Azure Function endpoints (detailed request/response)
  - Power Automate trigger/action specifications
  - Custom hooks API reference

- **Database Schema**

  - Complete field definitions (all 73 fields)
  - Field types, constraints, validation rules
  - Relationships (lookups, multi-lookups)
  - Calculated fields logic

- **Integration Details**

  - Permission management flow
  - Notification generation flow
  - Document upload and versioning
  - Comment integration (PnP)

- **Security Implementation**

  - Permission breaking logic
  - Role-based access control
  - Item-level security
  - Folder-level security

- **Error Handling**

  - Error boundaries
  - Retry logic
  - User-friendly error messages
  - Logging strategy (SPContext logger)

- **Performance Optimization**
  - Zustand selector patterns
  - Memoization strategies
  - Lazy loading
  - Change detection optimization (listItemHelper)
  - Batching SharePoint operations

---

#### 2. High-Level Design (HLD) - 20-30 pages

**Contents:**

- **System Overview**

  - Context diagram
  - System boundaries
  - External dependencies

- **Architectural Patterns**

  - State management pattern (Zustand)
  - Form management pattern (React Hook Form + Zod)
  - Data access pattern (SPContext + listItemHelper)
  - Component composition pattern (Card-based sections)

- **Technology Stack Justification**

  - Why SPFx 1.21.1
  - Why Zustand over Redux
  - Why Zod for validation
  - Why spfx-toolkit components

- **Deployment Architecture**

  - Environment strategy (Debug, Dev, UAT, Prod)
  - CI/CD pipeline (if applicable)
  - Azure Function deployment
  - Power Automate deployment

- **Scalability Considerations**

  - SharePoint list throttling mitigation
  - Azure Function scaling
  - Performance under load
  - Storage growth management

- **Disaster Recovery**
  - Backup strategy (SharePoint versioning)
  - Rollback procedures
  - Data recovery procedures

---

#### 3. Developer Guide - 30-40 pages

**Contents:**

- **Development Environment Setup**

  - Prerequisites (Node.js version, SPFx CLI)
  - Repository setup
  - Local development configuration
  - Debug environment setup

- **Code Organization**

  - Folder structure explained
  - Naming conventions
  - File organization standards
  - Component structure patterns

- **Component Usage Guide**

  - How to use Card components (spfx-toolkit)
  - How to use spForm components
  - How to use SPContext
  - How to use listItemHelper

- **Store Patterns**

  - Creating new Zustand stores
  - Connecting components to stores
  - Store action patterns
  - State update patterns

- **Adding New Features**

  - Adding new field to request
  - Adding new workflow stage
  - Adding new validation rule
  - Adding new notification type

- **Debugging Techniques**

  - Using SPContext debug mode
  - Browser DevTools tips
  - SharePoint API debugging
  - Power Automate debugging

- **Common Issues & Solutions**

  - Permission errors
  - CORS issues with Azure Functions
  - Validation not triggering
  - State not updating

- **Git Workflow**
  - Branch naming conventions
  - Commit message format
  - Pull request process
  - Code review checklist

---

#### 4. API Documentation - 25-35 pages

**Contents:**

- **SharePoint Lists Schema**

  - Requests list (complete field reference)
  - SubmissionItems list
  - Configuration list
  - RequestDocuments library metadata

- **Azure Function APIs**

  - POST /api/permissions/manage
    - Request body schema
    - Response schema
    - Error codes
    - Usage examples
  - POST /api/notifications/generate
    - Request body schema
    - Response schema
    - Notification types
    - Usage examples

- **Power Automate Specifications**

  - Flow triggers
  - Flow actions
  - Variables and expressions
  - Error handling

- **Custom Hooks Reference**

  - useRequestForm()
    - Methods and properties
    - Usage examples
  - useFormValidation()
    - Methods and properties
    - Usage examples
  - useDocumentUpload()
  - useBusinessDays()

- **Store Actions Reference**

  - requestFormStore actions
    - initializeNew()
    - initializeEdit()
    - updateField()
    - saveAsDraft()
    - submitRequest()
    - All workflow actions
  - fieldChoicesStore actions
  - submissionItemsStore actions

- **Utility Functions**
  - SPContext methods
  - listItemHelper functions
  - Date calculation utilities
  - Validation helpers

---

### 11.2 For Business Stakeholders

#### 5. Business Requirements Document (BRD) - 15-20 pages

**Contents:**

- **Executive Summary**

  - Project overview
  - Business objectives
  - Expected benefits
  - Investment required

- **Current State Analysis**

  - Current process flow (detailed)
  - Pain points and challenges
  - Manual effort quantification
  - Risk of current process

- **Future State Vision**

  - Automated process flow
  - Benefits and improvements
  - Success metrics
  - Timeline to value

- **User Personas**

  - Submitter persona
  - Legal Admin persona
  - Attorney persona
  - Compliance User persona
  - Detailed day-in-the-life scenarios

- **Business Objectives**

  - Reduce turnaround time by 20%
  - Achieve 90% user adoption
  - 100% audit trail compliance
  - Eliminate email-based approvals

- **Success Criteria & KPIs**

  - Adoption metrics
  - Efficiency metrics
  - Quality metrics
  - User satisfaction metrics

- **Assumptions & Constraints**

  - User access to SharePoint
  - Training requirements
  - Change management needs
  - Technical constraints

- **Risk Analysis**

  - User adoption risk
  - Technical risks
  - Process risks
  - Mitigation strategies

- **Project Timeline**
  - Phase 1 (Communication Requests) - timeline
  - Phase 2 (General Review, IMA) - timeline
  - Phase 3 (Advanced features) - timeline

---

#### 6. Functional Requirements Specification (FRS) - 35-45 pages

**Contents:**

- **Feature Descriptions**

  - Request submission process
  - Approval documentation
  - Attorney assignment (direct and committee)
  - Legal review process
  - Compliance review process
  - Closeout process
  - Special actions (cancel, hold, resume)

- **User Stories with Acceptance Criteria**

  - Format: As a [role], I want [feature] so that [benefit]
  - Example:

    ```
    As a Submitter,
    I want to create a communication review request
    So that I can get legal approval for my marketing materials

    Acceptance Criteria:
    - Can select Communication request type
    - Can fill all required fields
    - Can upload multiple documents
    - Can provide at least one approval
    - System validates all requirements before submission
    - Receives confirmation email upon submission
    ```

- **Workflow Diagrams**

  - Complete workflow with all paths
  - Decision points clearly marked
  - Timing and SLAs noted
  - Exception handling paths

- **Screen Mockups**

  - Request type selection
  - Request form (all sections)
  - Attorney assignment screen
  - Review screens (legal and compliance)
  - Dashboard views (all roles)

- **Business Rules Matrix**

  | Rule ID | Description            | Logic                                                             | Impact                            |
  | ------- | ---------------------- | ----------------------------------------------------------------- | --------------------------------- |
  | BR-001  | Rush Request Detection | targetDate < (submissionDate + turnaroundDays)                    | Requires rush rationale           |
  | BR-002  | Approval Required      | At least one approval with date + approver + document             | Blocks submission                 |
  | BR-003  | Tracking ID Required   | Compliance reviewed AND (isForesideReviewRequired OR isRetailUse) | Required at closeout              |
  | BR-004  | Rejection Completion   | Any review outcome = Rejected                                     | Status → Completed (not closeout) |
  | BR-005  | Closeout Trigger       | All required reviews = Completed AND no rejections                | Status → Closeout                 |

- **Validation Rules**

  - Field-level validation
  - Form-level validation
  - Action-specific validation (save vs submit)
  - Cross-field validation

- **Approval Requirements**

  - Types of approvals
  - Required documentation per type
  - Minimum approval count
  - Approval proof requirements

- **Reporting Requirements**
  - Dashboard views by role
  - Standard reports (future)
  - Export capabilities
  - Metrics to track

---

#### 7. User Guide - 25-35 pages

**Contents:**

- **Getting Started**

  - Accessing the system
  - Understanding your role
  - Dashboard overview
  - Navigation basics

- **Creating a Request (Submitter)**

  - Step-by-step walkthrough with screenshots
  - Selecting request type
  - Filling request information
  - Understanding rush requests
  - Providing approvals (with examples)
  - Uploading documents
  - Saving as draft vs. submitting
  - What happens after submission

- **Legal Admin Workflow**

  - Reviewing incoming requests
  - Understanding request details
  - Overriding review audience
  - Direct attorney assignment
  - Sending to committee
  - Monitoring requests
  - Reassigning attorneys

- **Attorney Assignment (Committee)**

  - Accessing pending assignments
  - Reviewing request context
  - Considering prior submissions
  - Assigning appropriate attorney
  - Adding assignment notes

- **Legal Review (Attorney)**

  - Viewing assigned requests
  - Understanding review status
  - Conducting legal review
  - Requesting changes via comments
  - Setting review status
  - Submitting review with outcome
  - Working with submitter revisions

- **Compliance Review (Compliance User)**

  - Finding compliance requests
  - Conducting compliance review
  - Setting compliance flags
  - Submitting compliance review

- **Closeout (Submitter)**

  - Understanding closeout readiness
  - Providing tracking ID (when required)
  - Closing the request

- **Special Actions**

  - Putting requests on hold (with reasons)
  - Resuming held requests
  - Cancelling requests

- **Document Management**

  - Uploading documents
  - Document types explained
  - Viewing version history
  - Downloading documents

- **Using Comments**

  - Adding comments
  - @mentioning users
  - Replying to comments
  - Comment notifications

- **Dashboard Navigation**

  - Understanding your dashboard
  - Filtering and searching
  - Sorting requests
  - Viewing request details

- **Common Tasks Quick Reference**

  - How to create a rush request
  - How to link prior submissions
  - How to add stakeholders
  - How to grant ad-hoc access
  - How to track my requests

- **FAQs**

  - What if I made a mistake in my request?
  - Can I edit a submitted request?
  - What does "Waiting On Submitter" mean?
  - How do I know my request was approved?
  - What is a tracking ID?
  - How long does review typically take?

- **Troubleshooting**
  - Cannot access a request
  - Upload failed
  - Validation errors
  - Email notifications not received
  - Who to contact for help

---

#### 8. Training Materials

**Video Tutorials** (5-10 minutes each)

1. **Introduction to Legal Review System** (8 min)

   - Overview of the system
   - Benefits and key features
   - Roles and responsibilities

2. **Creating Your First Request** (7 min)

   - Step-by-step demonstration
   - Tips for complete submissions
   - Common mistakes to avoid

3. **Legal Admin Workflow** (6 min)

   - Triaging requests
   - Assignment decisions
   - Monitoring dashboard

4. **Attorney Review Process** (8 min)

   - Reviewing documents
   - Providing feedback
   - Submitting outcomes

5. **Compliance Review Process** (6 min)

   - Compliance considerations
   - Setting flags
   - Submitting reviews

6. **Document Management** (5 min)
   - Uploading and organizing
   - Version control
   - Best practices

**Quick Reference Cards** (1-2 pages per role)

- **Submitter Card**

  - Creating a request checklist
  - Required approvals
  - Dashboard key indicators
  - Who to contact

- **Legal Admin Card**

  - Triage checklist
  - Assignment decision tree
  - Key shortcuts
  - Escalation contacts

- **Attorney Card**

  - Review checklist
  - Status meanings
  - Common actions
  - Support contacts

- **Compliance Card**
  - Compliance checklist
  - Flag guidance
  - Review outcomes
  - Help resources

**Interactive Demos**

- Sandbox environment with sample data
- Guided walkthroughs
- Practice scenarios

**Hands-on Exercises**

- Exercise 1: Submit a complete request
- Exercise 2: Provide feedback as reviewer
- Exercise 3: Handle a rush request
- Exercise 4: Use comments effectively

---

### 11.3 For Support Team

#### 9. Admin Support Guide / Runbook - 20-30 pages

**Contents:**

- **System Administration**

  - User group management
  - Permission troubleshooting
  - Configuration updates
  - Performance monitoring

- **User Management**

  - Adding users to SharePoint groups (ServiceNow process)
  - Removing users from groups
  - Handling access requests
  - Temporary access provisioning

- **Troubleshooting Guide**

  - **Issue:** User cannot access request

    - Check user group membership
    - Verify item-level permissions
    - Check if Additional Party or ad-hoc access needed
    - Resolution steps

  - **Issue:** Document upload fails

    - Check file size (<250MB)
    - Check file type restrictions
    - Verify folder permissions
    - Check quota limits
    - Resolution steps

  - **Issue:** Email notifications not received

    - Verify Power Automate flow is running
    - Check Azure Function logs
    - Verify user email address
    - Check spam/junk folder
    - Resolution steps

  - **Issue:** Request stuck in status

    - Check required fields
    - Verify workflow logic
    - Check for system errors
    - Manual intervention steps

  - **Issue:** Permission denied errors

    - Common causes
    - Check permission inheritance
    - Verify Azure Function ran successfully
    - Manual permission fix steps

  - **Issue:** Validation errors blocking submission
    - Common validation issues
    - How to identify missing requirements
    - Helping users understand errors

- **Common Errors & Fixes**

  | Error Message            | Cause                       | Fix                                                            |
  | ------------------------ | --------------------------- | -------------------------------------------------------------- |
  | "Access Denied"          | Permissions not propagated  | Wait 30 seconds, retry. If persists, check Azure Function logs |
  | "Required field missing" | Form validation failed      | Review validation errors, ensure all required fields completed |
  | "File too large"         | File exceeds 250MB          | Split file or compress                                         |
  | "Cannot submit draft"    | Validation failed           | Check validation errors in form                                |
  | "Attorney not found"     | Attorney no longer in group | Reassign to different attorney                                 |

- **Performance Monitoring**

  - Key metrics to watch
    - Page load times
    - Document upload times
    - Form submission times
    - Azure Function response times
    - Power Automate flow success rate
  - How to identify performance issues
  - When to escalate to development team

- **Backup & Restore**

  - SharePoint versioning as backup
  - Restoring previous item version
  - Recovering deleted items (Recycle Bin)
  - Document recovery procedures

- **Escalation Procedures**

  - **Level 1 (SharePoint Admin):** User access, permissions, general "how to"
  - **Level 2 (Development Team):** Application errors, data issues, bugs
  - **Level 3 (Microsoft Support):** Platform issues, infrastructure

- **Contact Information**

  - SharePoint Admin Team: helpdesk@company.com
  - Development Lead: dev-lead@company.com
  - After-hours support: +1-XXX-XXX-XXXX
  - ServiceNow for access requests

- **Maintenance Windows**
  - Scheduled maintenance procedures
  - User communication plan
  - Rollback procedures if needed

---

#### 10. Deployment Guide - 15-20 pages

**Contents:**

- **Prerequisites Checklist**

  - [ ] SharePoint site created
  - [ ] SharePoint groups created (6 groups)
  - [ ] Lists created (Requests, SubmissionItems, Configuration)
  - [ ] Document library created (RequestDocuments)
  - [ ] Custom permission level created (Contributor Without Delete)
  - [ ] Azure Function deployed
  - [ ] Power Automate flows imported
  - [ ] App Catalog access confirmed

- **Environment Setup**

  - **Debug Environment**

    - Local development setup
    - Workbench configuration
    - Test data creation

  - **Dev Environment**

    - SharePoint site URL
    - App Catalog deployment
    - Configuration values
    - Test user accounts

  - **UAT Environment**

    - SharePoint site URL
    - Production-like configuration
    - UAT user accounts
    - Data migration from Dev

  - **Production Environment**
    - SharePoint site URL
    - Production configuration
    - Real user groups
    - Change management process

- **SharePoint Configuration**

  - **Step 1: Create Lists**

    - Requests list creation script
    - Field creation (all 73 fields with correct types)
    - Choice values configuration
    - Lookup relationships setup

  - **Step 2: Create Document Library**

    - RequestDocuments library creation
    - Metadata columns setup
    - Versioning configuration
    - Content type setup (if applicable)

  - **Step 3: Configure Permissions**

    - Create SharePoint groups
    - Assign base permissions
    - Create custom permission level
    - Test permission setup

  - **Step 4: Load Configuration Data**
    - Populate SubmissionItems list
    - Add initial configuration values
    - Verify data integrity

- **Azure Function Deployment**

  - **Step 1: Create Function App**

    - Azure portal steps
    - Configuration settings
    - Authentication setup

  - **Step 2: Deploy Code**

    - Build process
    - Deployment method (VS Code, CLI, or Azure DevOps)
    - Environment variables configuration

  - **Step 3: Configure CORS**

    - Allow SharePoint domain
    - Test from SharePoint

  - **Step 4: Test Endpoints**
    - Test permission management
    - Test notification generation
    - Verify logs

- **Power Automate Setup**

  - **Step 1: Import Flows**

    - Request Status Change flow
    - Comment Added flow
    - Document Uploaded flow

  - **Step 2: Configure Connections**

    - SharePoint connection
    - HTTP connection (Azure Function)
    - Office 365 Outlook connection

  - **Step 3: Update Flow Variables**

    - Site URL
    - List IDs
    - Azure Function URL
    - Function keys

  - **Step 4: Test Flows**
    - Trigger each flow manually
    - Verify notifications sent
    - Check error handling

- **SPFx Solution Deployment**

  - **Step 1: Build Solution**

    ```bash
    gulp clean
    gulp bundle --ship
    gulp package-solution --ship
    ```

  - **Step 2: Upload to App Catalog**

    - Navigate to App Catalog
    - Upload .sppkg file
    - Check "Make solution available to all sites"
    - Deploy

  - **Step 3: Add App to Site**

    - Navigate to target site
    - Site Contents → Add an app
    - Select Legal Review System
    - Grant permissions if prompted

  - **Step 4: Configure Web Part**
    - Add web part to page
    - Configure web part properties (if any)
    - Test functionality

- **Testing Procedures**

  - **Smoke Testing**

    - [ ] App loads without errors
    - [ ] User groups recognized
    - [ ] Can create new request
    - [ ] Can submit request
    - [ ] Notifications sent
    - [ ] Permissions broken correctly

  - **Integration Testing**

    - [ ] End-to-end workflow
    - [ ] Document upload/download
    - [ ] Comments working
    - [ ] All dashboards load
    - [ ] Azure Functions responding
    - [ ] Power Automate flows triggered

  - **User Acceptance Testing**
    - [ ] UAT users trained
    - [ ] Test scenarios completed
    - [ ] Feedback collected
    - [ ] Issues logged and resolved
    - [ ] Sign-off obtained

- **Post-Deployment Verification**

  - [ ] All users can access
  - [ ] Permissions working correctly
  - [ ] Notifications being received
  - [ ] Performance acceptable
  - [ ] No errors in logs
  - [ ] Documentation published
  - [ ] Training scheduled

- **Rollback Procedures**

  - **If SPFx deployment fails:**

    - Remove app from site
    - Delete from App Catalog
    - Redeploy previous version

  - **If data issues occur:**

    - Use SharePoint versioning to restore
    - Document issues for fix
    - Communicate to users

  - **If Azure Function issues:**
    - Revert to previous deployment
    - Check configuration
    - Review logs

---

## 12. Future Enhancements

### 12.1 Phase 2 Features (Q2-Q4 2026)

**1. General Review Request Type**

- Purpose: Review of contracts, policies, agreements, NDAs
- Different submission items (Contract Review, Policy Review, NDA Review)
- May require different approvals
- Similar workflow to Communication requests
- Timeline: Q2 2026

**2. IMA Review Request Type**

- Purpose: Investment Management Agreement reviews
- Specialized submission items
- May require additional review stages
- Integration with investment systems (TBD)
- Timeline: Q3 2026

**3. Seismic Database Integration**

- Browse Seismic documents from LRS
- Import documents for review
- Version synchronization with Seismic
- Post-approval status update in Seismic
- Metadata sync
- Timeline: Q4 2026

**4. Advanced Reporting & Analytics**

- Power BI dashboards
- Real-time metrics and KPIs
- Trend analysis (turnaround times, approval rates)
- Predictive analytics (forecast turnaround times)
- Executive summary reports
- Custom report builder
- Timeline: Q1 2027

**5. Mobile Application**

- Native iOS and Android apps
- Submit requests on mobile
- Approve/review on mobile
- Push notifications
- Offline document viewing
- Camera integration for approval photos
- Timeline: Q3 2027

### 12.2 Phase 3 Considerations (2027+)

**AI-Powered Features:**

- Document analysis (auto-detect potential issues)
- Risk scoring
- Suggested attorney assignment (ML-based on history)
- Auto-categorization of documents
- Sentiment analysis of review notes

**External System Integrations:**

- DocuSign for electronic signatures
- Contract lifecycle management systems
- Marketing automation platforms
- CRM integration

**Enhanced Collaboration:**

- Real-time co-editing of documents
- Video conferencing integration for review discussions
- Screen sharing for feedback sessions
- Collaborative whiteboard for markups

---

## 13. Success Metrics & KPIs

### 13.1 Adoption Metrics

| Metric             | Target                  | Measurement                             |
| ------------------ | ----------------------- | --------------------------------------- |
| User Adoption Rate | 90% within 3 months     | % of target users actively using system |
| Request Volume     | 100% of manual requests | Number of requests per month in system  |
| Repeat Usage       | 80% create 2+ requests  | Users creating multiple requests        |

### 13.2 Efficiency Metrics

| Metric                      | Target                          | Measurement                           |
| --------------------------- | ------------------------------- | ------------------------------------- |
| Average Turnaround Time     | 20% reduction vs manual         | Days from submission to completion    |
| Time in Legal Intake        | <1 day                          | Average time request spends in triage |
| Time in Attorney Assignment | <1 day                          | Average time for committee to assign  |
| Time in Review              | Meet submission item turnaround | Actual vs target turnaround time      |
| Time in Closeout            | <2 days                         | Average time for submitter to close   |
| Rush Request Rate           | <15%                            | % of requests marked as rush          |

### 13.3 Quality Metrics

| Metric                            | Target | Measurement                           |
| --------------------------------- | ------ | ------------------------------------- |
| First-Time Approval Rate          | 60%    | % approved without revisions          |
| Rejection Rate                    | <5%    | % of requests rejected                |
| Approval Documentation Compliance | 100%   | % with all required approval docs     |
| Tracking ID Compliance            | 100%   | % providing tracking ID when required |

### 13.4 User Satisfaction

| Metric                       | Target                       | Measurement                               |
| ---------------------------- | ---------------------------- | ----------------------------------------- |
| User Satisfaction Score      | 4.0+ out of 5.0              | Post-submission survey                    |
| System Usability Score (SUS) | 75+ (Grade B)                | Standard usability assessment             |
| Support Ticket Volume        | <10 per month                | System-related issues after stabilization |
| Training Effectiveness       | 90% confident after training | Post-training survey                      |

### 13.5 Process Metrics

| Metric                     | Target | Measurement                          |
| -------------------------- | ------ | ------------------------------------ |
| Manual Process Elimination | 100%   | % of email-based requests eliminated |
| Audit Trail Completeness   | 100%   | % of requests with complete history  |
| Compliance                 | 100%   | % meeting all policy requirements    |
| Document Version Control   | 100%   | % with proper version tracking       |

---

## 14. Known Limitations & Constraints

### 14.1 Technical Limitations

1. **Browser Support**

   - Chrome 90+, Edge 90+, Firefox 85+, Safari 14+
   - IE11 not supported
   - Best experience on Chrome/Edge

2. **File Size Limits**

   - Maximum file size: 250 MB (SharePoint limit)
   - Large files may take time to upload
   - Recommendation: Multiple smaller files preferred

3. **Concurrent User Load**

   - SharePoint throttling may occur with 100+ concurrent users
   - Mitigation: Stagger submissions, avoid peak times

4. **Mobile Experience**

   - Responsive design but not native app (Phase 1)
   - Some features better on desktop
   - Native mobile apps: Phase 2

5. **Offline Capability**
   - No offline mode
   - Requires internet connection
   - Draft auto-save prevents data loss

### 14.2 Business Constraints

1. **Manual Group Management**

   - Users added to SharePoint groups via ServiceNow
   - Not real-time (may take hours)
   - Testing may require manual adds

2. **Holiday Calendar**

   - Business days calculation excludes weekends only
   - Company holidays not yet integrated
   - Phase 2: holiday calendar integration

3. **Attorney Workload Balancing**

   - No automatic load balancing
   - Legal Admin manually considers workload
   - Phase 2: automated workload tracking and recommendations

4. **Document Versioning**

   - SharePoint version limits apply
   - Old versions consume storage
   - Retention policy must be defined

5. **Tracking ID Format**
   - No enforced format currently (free text)
   - External system integration TBD
   - May require update when system identified

### 14.3 Security Constraints

1. **Permission Propagation Delay**

   - Azure Function may take seconds to update permissions
   - User may briefly see "Access Denied"
   - Solution: Retry after few seconds

2. **External Sharing**

   - No external user access
   - Internal employees only
   - Additional Party must be internal users

3. **Data Retention**

   - Manual archival process for old requests
   - No automatic deletion
   - Storage costs may increase over time
   - Follows company retention policy

4. **Audit Trail**
   - Version history provides audit trail
   - Cannot delete versions (by design)
   - Manual review required for compliance audits

---

## 15. Appendices

### 15.1 Glossary of Terms

| Term                        | Definition                                                                         |
| --------------------------- | ---------------------------------------------------------------------------------- |
| **LRS**                     | Legal Review System                                                                |
| **SPFx**                    | SharePoint Framework                                                               |
| **Communication Request**   | Review of marketing communications and materials                                   |
| **Rush Request**            | Request with target date sooner than standard turnaround time                      |
| **Submission Item**         | Type of document being reviewed (determines turnaround time)                       |
| **Review Audience**         | Who should review: Legal, Compliance, or Both                                      |
| **Attorney Assigner**       | Committee that assigns attorneys when Legal Admin is unsure                        |
| **Additional Party**        | Read-only stakeholders on a request                                                |
| **Closeout**                | Final step where submitter confirms completion and optionally provides tracking ID |
| **Tracking ID**             | External system reference number (required if compliance flags set)                |
| **Business Days**           | Weekdays only (excludes weekends, future: company holidays)                        |
| **Foreside Review**         | Compliance flag that requires tracking ID if true                                  |
| **Retail Use**              | Compliance flag that requires tracking ID if true                                  |
| **Prior Submissions**       | Previous related requests linked for context                                       |
| **Manual Tracking Process** | Current email-based process being replaced                                         |

### 15.2 Acronyms

| Acronym  | Full Form                                           |
| -------- | --------------------------------------------------- |
| **BRD**  | Business Requirements Document                      |
| **CR**   | Change Request                                      |
| **FRS**  | Functional Requirements Specification               |
| **HLD**  | High-Level Design                                   |
| **IMA**  | Investment Management Agreement (exact meaning TBD) |
| **KPI**  | Key Performance Indicator                           |
| **LRS**  | Legal Review System                                 |
| **PnP**  | Patterns and Practices (SharePoint community)       |
| **SLA**  | Service Level Agreement                             |
| **SME**  | Subject Matter Expert                               |
| **SPFx** | SharePoint Framework                                |
| **SUS**  | System Usability Scale                              |
| **TBD**  | To Be Determined                                    |
| **TDD**  | Technical Design Document                           |
| **UAT**  | User Acceptance Testing                             |

### 15.3 SharePoint Group Reference

| Group Name                 | Purpose                                  | Typical Members                           |
| -------------------------- | ---------------------------------------- | ----------------------------------------- |
| **LW - Submitters**        | Create and submit requests               | Marketing, Communications, Business units |
| **LW - Legal Admin**       | Triage and route requests                | Legal department administrators           |
| **LW - Attorney Assigner** | Assign attorneys when Legal Admin unsure | Senior legal staff, committee members     |
| **LW - Attorneys**         | Perform legal reviews                    | All legal department attorneys            |
| **LW - Compliance Users**  | Perform compliance reviews               | Compliance department staff               |
| **LW - Admin**             | System administration                    | IT staff, developers, system admins       |

### 15.4 Request Status Reference (Continued)

| Status              | Description                             | Who Can Action                  | Next Status                  |
| ------------------- | --------------------------------------- | ------------------------------- | ---------------------------- |
| **Draft**           | Being created by submitter              | Creator                         | Legal Intake (on submit)     |
| **Legal Intake**    | Legal Admin triaging                    | Legal Admin                     | Assign Attorney OR In Review |
| **Assign Attorney** | Awaiting committee assignment           | Attorney Assigner               | In Review                    |
| **In Review**       | Legal/Compliance reviewing              | Attorney, Compliance            | Closeout OR Completed        |
| **Closeout**        | Awaiting submitter to close             | Creator                         | Completed                    |
| **Completed**       | Request finished (approved or rejected) | None (read-only)                | Terminal state               |
| **Cancelled**       | Request cancelled                       | None (read-only)                | Terminal state               |
| **On Hold**         | Temporarily paused                      | Creator, Legal Admin, App Admin | Previous status (on resume)  |

### 15.5 Review Status Reference

**Used for both Legal Review Status and Compliance Review Status**

| Review Status                      | Description                                  | Usage                                               |
| ---------------------------------- | -------------------------------------------- | --------------------------------------------------- |
| **Not Required**                   | This review type not needed for this request | Auto-set based on reviewAudience                    |
| **Not Started**                    | Review assigned but not yet begun            | Attorney assigned but hasn't started                |
| **In Progress**                    | Actively reviewing documents                 | Reviewer is working on it                           |
| **Waiting On Attorney**            | Internal legal consultation needed           | Attorney needs input from another attorney          |
| **Waiting On Compliance Reviewer** | Internal compliance consultation needed      | Compliance needs input from another compliance user |
| **Waiting On Submitter**           | Changes or additional documents requested    | Submitter needs to upload revisions                 |
| **Completed**                      | Review finished with outcome                 | Reviewer submitted final outcome                    |

### 15.6 Document Type Reference

| Document Type                      | Purpose                                           | Who Uploads         | Required For                          |
| ---------------------------------- | ------------------------------------------------- | ------------------- | ------------------------------------- |
| **Review**                         | Primary documents needing legal/compliance review | Submitter, Reviewer | Request submission                    |
| **Supplemental**                   | Supporting documents, background information      | Submitter, Reviewer | Optional                              |
| **Communication Approval**         | Proof of communication approval                   | Submitter           | If Communication Approval provided    |
| **Portfolio Manager Approval**     | Proof of portfolio manager approval               | Submitter           | If Portfolio Approval provided        |
| **Research Analyst Approval**      | Proof of research analyst approval                | Submitter           | If Research Analyst Approval provided |
| **Subject Matter Expert Approval** | Proof of SME approval                             | Submitter           | If SME Approval provided              |
| **Performance Approval**           | Proof of performance review approval              | Submitter           | If Performance Approval provided      |
| **Other Approval**                 | Proof of other custom approval                    | Submitter           | If Other Approval provided            |

### 15.7 Email Notification Type Reference

| #   | Notification Type             | Trigger                              | Recipients              | Purpose                                 |
| --- | ----------------------------- | ------------------------------------ | ----------------------- | --------------------------------------- |
| 1   | Request Submitted             | Draft → Legal Intake                 | Legal Admin group       | Alert Legal Admin of new request        |
| 2   | Attorney Assigned (Direct)    | Legal Intake → In Review (direct)    | Assigned Attorney       | Notify attorney of assignment           |
| 3   | Sent to Committee             | Legal Intake → Assign Attorney       | Attorney Assigner group | Request committee to assign attorney    |
| 4   | Attorney Assigned (Committee) | Assign Attorney → In Review          | Assigned Attorney       | Notify attorney of committee assignment |
| 5   | Compliance Review Required    | reviewAudience includes Compliance   | Compliance group        | Alert compliance of new review needed   |
| 6   | Attorney Reassigned           | attorneyId changes                   | New/Old Attorney        | Notify both attorneys of reassignment   |
| 7   | Waiting On Submitter          | Review status → Waiting On Submitter | Creator                 | Alert submitter changes needed          |
| 8   | Submitter Response            | Document upload while waiting        | Attorney/Compliance     | Notify reviewer of submitter update     |
| 9   | Review Completed (Single)     | Legal OR Compliance → Completed      | Creator, Legal Admin    | Inform one review is complete           |
| 10  | Ready for Closeout            | Status → Closeout                    | Creator                 | Request submitter to close              |
| 11  | Request Completed             | Status → Completed                   | All stakeholders        | Final completion notification           |
| 12  | Request Cancelled             | Status → Cancelled                   | All stakeholders        | Cancellation notification               |
| 13  | Request On Hold               | Status → On Hold                     | All stakeholders        | Hold notification                       |
| 14  | Request Resumed               | On Hold → previous status            | Active participants     | Resume notification                     |
| 15  | User Tagged in Comment        | @mention in comment                  | Tagged user             | Alert user they were mentioned          |

### 15.8 Field Validation Rules Reference

| Field                     | Rule                                                | Error Message                                                                  |
| ------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------ |
| `requestTitle`            | Required, 3-255 chars                               | "Request title must be between 3 and 255 characters"                           |
| `purpose`                 | Required, 10-10,000 chars                           | "Purpose must be between 10 and 10,000 characters"                             |
| `submissionItemId`        | Required, valid lookup                              | "Please select a submission item"                                              |
| `targetReturnDate`        | Required, future date                               | "Target return date must be in the future"                                     |
| `rushRationale`            | Required if isRushRequest=true, min 10 chars        | "Rush rationale is required and must be at least 10 characters"                |
| `reviewAudience`          | Required                                            | "Please select a review audience"                                              |
| Approvals                 | At least one with date+approver+document            | "At least one approval is required with date, approver, and uploaded document" |
| `legalReviewOutcome`      | Required when submitting legal review               | "Please select a legal review outcome"                                         |
| `legalReviewNotes`        | Required when submitting, min 10 chars              | "Legal review notes must be at least 10 characters"                            |
| `complianceReviewOutcome` | Required when submitting compliance review          | "Please select a compliance review outcome"                                    |
| `complianceReviewNotes`   | Required when submitting, min 10 chars              | "Compliance review notes must be at least 10 characters"                       |
| `trackingId`              | Required if isForesideReviewRequired OR isRetailUse | "Tracking ID is required when Foreside Review or Retail Use is indicated"      |
| `cancelReason`            | Required when cancelling, 10-1000 chars             | "Cancel reason must be between 10 and 1,000 characters"                        |
| `onHoldReason`            | Required when holding, 10-1000 chars                | "Hold reason must be between 10 and 1,000 characters"                          |

### 15.9 Zod Schema Action Reference

| Action                       | Schema Used                    | Validation Level | Key Requirements                                                     |
| ---------------------------- | ------------------------------ | ---------------- | -------------------------------------------------------------------- |
| **Save as Draft**            | `saveAsDraftSchema`            | Minimal          | Optional fields, allows incomplete data                              |
| **Submit Request**           | `submitRequestSchema`          | Full             | All required fields, at least one approval, rush rationale if needed |
| **Assign Attorney**          | `assignAttorneySchema`         | Targeted         | Attorney selection required, optional notes                          |
| **Submit to Committee**      | `submitToAssignAttorneySchema` | Minimal          | Optional notes only                                                  |
| **Submit Legal Review**      | `submitLegalReviewSchema`      | Targeted         | Outcome + notes (min 10 chars) required                              |
| **Submit Compliance Review** | `submitComplianceReviewSchema` | Targeted         | Outcome + notes (min 10 chars) required, optional flags              |
| **Submit Closeout**          | `submitCloseoutSchema`         | Conditional      | Tracking ID required if compliance flags set                         |
| **Cancel Request**           | `cancelRequestSchema`          | Targeted         | Cancel reason (10-1000 chars) required                               |
| **Hold Request**             | `holdRequestSchema`            | Targeted         | Hold reason (10-1000 chars) required                                 |

### 15.10 Business Rules Summary

| Rule ID    | Rule Name                  | Logic                                                                           | Impact                                                     |
| ---------- | -------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **BR-001** | Rush Request Detection     | `targetReturnDate < (requestedDate + submissionItem.turnAroundTimeInDays)`      | Sets `isRushRequest=true`, requires `rushRationale`         |
| **BR-002** | Approval Minimum           | At least one approval must have: date + approver + document                     | Blocks submission if not met                               |
| **BR-003** | Tracking ID Requirement    | Compliance reviewed AND (`isForesideReviewRequired=true` OR `isRetailUse=true`) | Tracking ID required at closeout                           |
| **BR-004** | Rejection Completion       | Any review outcome = "Rejected"                                                 | Status → Completed (bypasses Closeout)                     |
| **BR-005** | Closeout Trigger           | All required reviews completed with "Approved" or "Needs Changes"               | Status → Closeout                                          |
| **BR-006** | Review Audience Override   | Legal Admin can change reviewAudience during Legal Intake                       | May change required reviews                                |
| **BR-007** | Prior Submission Context   | If priorSubmissions linked, suggest same attorney                               | Helps with assignment decisions                            |
| **BR-008** | Business Days Only         | Weekend days excluded from turnaround calculation                               | Saturday (6) and Sunday (0) not counted                    |
| **BR-009** | Department Auto-Population | User's department auto-filled from profile                                      | Hidden from user, used for prior submission search         |
| **BR-010** | Permission Breaking        | Permissions broken when status changes from Draft to Legal Intake               | Item and folder inherit stopped, role-based access applied |

### 15.11 Support Contact Information

| Issue Type               | Contact               | Method                    | Hours           | SLA                 |
| ------------------------ | --------------------- | ------------------------- | --------------- | ------------------- |
| **User Access Issues**   | SharePoint Admin Team | helpdesk@company.com      | 8 AM - 5 PM EST | 4 hours response    |
| **Permission Problems**  | SharePoint Admin Team | ServiceNow Ticket         | 8 AM - 5 PM EST | 24 hours resolution |
| **Application Errors**   | Development Team      | dev-lead@company.com      | 8 AM - 5 PM EST | 2 hours response    |
| **Training Questions**   | Training Coordinator  | training@company.com      | 8 AM - 5 PM EST | 1 business day      |
| **Critical System Down** | On-Call Developer     | +1-XXX-XXX-XXXX           | 24/7            | 1 hour response     |
| **General "How To"**     | User Guide            | Check documentation first | Self-service    | N/A                 |

### 15.12 Environment URLs

| Environment    | Purpose                 | SharePoint Site URL                              | App Catalog      | Notes                                |
| -------------- | ----------------------- | ------------------------------------------------ | ---------------- | ------------------------------------ |
| **Debug**      | Local development       | localhost:4321                                   | N/A              | Developer workbench                  |
| **Dev**        | QA testing              | https://contoso.sharepoint.com/sites/LRS-Dev     | Dev App Catalog  | Test data, verbose logging           |
| **UAT**        | User acceptance testing | https://contoso.sharepoint.com/sites/LRS-UAT     | UAT App Catalog  | Staging data, production-like config |
| **Production** | Live system             | https://contoso.sharepoint.com/sites/LegalReview | Prod App Catalog | Real users, real data                |

**Note:** Replace "contoso" with actual tenant name

### 15.13 Azure Function Endpoints

| Environment    | Function App Name  | Base URL                                     | Authentication |
| -------------- | ------------------ | -------------------------------------------- | -------------- |
| **Dev**        | lrs-functions-dev  | https://lrs-functions-dev.azurewebsites.net  | Azure AD       |
| **UAT**        | lrs-functions-uat  | https://lrs-functions-uat.azurewebsites.net  | Azure AD       |
| **Production** | lrs-functions-prod | https://lrs-functions-prod.azurewebsites.net | Azure AD       |

**Endpoints:**

- `POST /api/permissions/manage` - Permission management
- `POST /api/notifications/generate` - Notification content generation

### 15.14 Power Automate Flow Reference

| Flow Name                       | Trigger                            | Key Actions                                                             | Environment     |
| ------------------------------- | ---------------------------------- | ----------------------------------------------------------------------- | --------------- |
| **LRS - Request Status Change** | When item modified (Requests list) | Get item, HTTP call (notification), Send email, HTTP call (permissions) | Per environment |
| **LRS - Comment Added**         | When comment added                 | Parse comment, Send notifications to @mentioned users                   | Per environment |
| **LRS - Document Uploaded**     | When file added (RequestDocuments) | Get request, Check status, Notify reviewers if waiting on submitter     | Per environment |

### 15.15 Change Log

| Version | Date       | Author       | Changes                             |
| ------- | ---------- | ------------ | ----------------------------------- |
| 1.0     | 2025-09-29 | Project Team | Initial complete documentation      |
|         |            |              | - All 15 sections documented        |
|         |            |              | - 73 fields defined                 |
|         |            |              | - Complete workflow documented      |
|         |            |              | - All roles and permissions defined |
|         |            |              | - Integration points specified      |
|         |            |              | - Testing strategy outlined         |
|         |            |              | - 11 deliverables detailed          |

### 15.16 Document Maintenance

**Document Owner:** Legal Review System Project Team

**Review Frequency:** Quarterly or after major updates

**Update Process:**

1. Identify changes needed
2. Update relevant sections
3. Update change log
4. Increment version number
5. Notify stakeholders
6. Publish updated version

**Version Numbering:**

- Major updates (1.0 → 2.0): Significant changes, new features
- Minor updates (1.0 → 1.1): Small changes, clarifications
- Patches (1.1 → 1.1.1): Typos, formatting

---

## 16. Quick Reference Summary

### 16.1 System At-A-Glance

**What:** SharePoint-based legal review workflow application
**Who:** Submitters, Legal Admins, Attorneys, Compliance, Admins
**Why:** Replace manual email process with automated, auditable system
**How:** SPFx React app with Zustand state management, React Hook Form validation
**When:** Phase 1 (Communication Requests) - 2025, Phase 2 (General/IMA) - 2026

### 16.2 Key Numbers

- **73** total fields in Requests list
- **6** SharePoint security groups
- **8** workflow statuses
- **7** review statuses
- **8** document types
- **15** email notification types
- **6** user roles
- **2** Azure Function endpoints
- **3** Power Automate flows
- **4** environments (Debug, Dev, UAT, Prod)

### 16.3 Technology Summary

**Frontend:**

- SPFx 1.21.1
- React 18
- TypeScript
- Zustand
- React Hook Form + Zod
- Fluent UI v8.x
- DevExtreme React
- spfx-toolkit (Card, spForm, WorkflowStepper, ManageAccess)

**Backend:**

- SharePoint Online
- Azure Functions (Node.js)
- Power Automate

**Integration:**

- @pnp/sp v3.20.1
- SPContext utility
- List Item Helper

### 16.4 Critical Business Rules

1. **Rush = Target < Turnaround Days** (automatic calculation)
2. **At Least One Approval Required** (date + approver + document)
3. **Tracking ID Required IF** (Compliance reviewed AND (Foreside OR Retail flag))
4. **Rejection = Completed** (bypasses Closeout)
5. **All Reviews Must Pass** to reach Closeout

### 16.5 Common User Journeys

**Submitter Journey:**
Draft → Submit → (Wait for Review) → Respond to Feedback → Closeout → Done

**Legal Admin Journey:**
Legal Intake → Review Request → Assign Attorney → Monitor Progress

**Attorney Journey:**
Receive Assignment → Review Documents → Request Changes OR Approve → Done

**Compliance Journey:**
Receive Request → Review Documents → Set Flags → Approve OR Reject → Done

### 16.6 Key Files & Locations

**Code Repository:** `[Repository URL]`

**Important Folders:**

- `/src/components/` - React components
- `/src/stores/` - Zustand stores
- `/src/schemas/` - Zod validation schemas
- `/src/services/` - Business logic
- `/src/types/` - TypeScript types

**Documentation:**

- Technical docs in `/docs/technical/`
- User guides in `/docs/user/`
- Training materials in `/docs/training/`

**Configuration:**

- SubmissionItems list on SharePoint site
- Configuration list on SharePoint site
- Azure Function app settings in Azure Portal
- Power Automate flows in Power Automate portal

---

## 17. Final Notes

### 17.1 Document Usage

**This document should be used for:**
✅ Understanding the complete system
✅ Creating formal requirement documents (BRD, FRS, TDD, HLD)
✅ Onboarding new team members
✅ Training users
✅ Troubleshooting issues
✅ Planning enhancements
✅ Answering stakeholder questions

**This document should NOT be:**
❌ Modified without proper change control
❌ Distributed outside project team without approval
❌ Considered final until reviewed and approved
❌ Used as the only source (verify with actual system)

### 17.2 Next Steps

**For Development:**

1. Review and validate this documentation
2. Create detailed TDD and HLD
3. Set up development environment
4. Begin Sprint 0 (architecture setup)
5. Start Phase 1 development

**For Business:**

1. Review and approve BRD and FRS
2. Identify UAT testers
3. Plan training schedule
4. Prepare change management plan
5. Set up communication plan

**For Support:**

1. Review Admin Support Guide
2. Set up support processes
3. Configure ServiceNow for access requests
4. Prepare for handoff
5. Schedule knowledge transfer sessions

### 17.3 Success Factors

**Critical Success Factors:**

1. Executive sponsorship and support
2. User adoption and engagement
3. Proper training and documentation
4. Robust technical implementation
5. Effective change management
6. Ongoing support and maintenance

**Risks to Monitor:**

1. User resistance to change
2. Technical complexity
3. Integration challenges
4. Performance issues
5. Security concerns

### 17.4 Acknowledgments

**Project Team:**

- Business Stakeholders (Legal, Compliance, Marketing)
- Development Team (SPFx developers)
- SharePoint Administrators
- IT Support Team
- Training Coordinators

**Special Thanks:**

- Legal department for process expertise
- Marketing for user input
- IT for infrastructure support

---

## Document End

**For questions, clarifications, or updates to this documentation, contact:**

**Project Lead:** [Name] - [Email]
**Technical Lead:** [Name] - [Email]
**Business Owner:** [Name] - [Email]

**Last Updated:** September 29, 2025
**Document Version:** 1.0
**Status:** Complete - Ready for formal document creation

---

_This comprehensive documentation serves as the foundation for creating all formal project deliverables including BRD, FRS, TDD, HLD, User Guides, and Training Materials._
