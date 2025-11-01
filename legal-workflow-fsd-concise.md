# Functional Specification Document (FSD)
## Legal Workflows System

**Version:** 1.0
**Date:** October 2025
**Status:** Draft

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | October 2025 | Development Team | Initial draft |

---

## 1. Executive Summary

### 1.1 Purpose

This Functional Specification Document defines the requirements for the Legal Workflows System, a SharePoint Online solution that automates legal and compliance review processes for marketing communications. The system replaces manual email-based workflows with a centralized, auditable platform.

### 1.2 Project Overview

**Current State:** Email-driven submissions with manual tracking in Excel spreadsheets. Approvals scattered across emails, no centralized visibility, inconsistent turnaround times.

**Future State:** Automated SharePoint workflow with centralized submissions, automated routing, complete audit trails, real-time dashboards, and 15 notification types.

### 1.3 Key Benefits

- **Efficiency:** 20% reduction in average turnaround time (from 7 to 5.6 business days)
- **Compliance:** 100% audit trail for all requests; documented approvals with evidence
- **Transparency:** Role-based dashboards showing workload and status
- **Adoption:** Target 90% user adoption within 3 months

### 1.4 Stakeholders

| Role | Description |
|------|-------------|
| **Submitters** | Marketing/Business staff creating requests |
| **Legal Admin** | Gatekeepers triaging and assigning requests |
| **Attorney Assigner** | Committee members assigning attorneys |
| **Attorneys** | Legal reviewers |
| **Compliance Users** | Regulatory reviewers |
| **IT Admins** | System administrators |

---

## 2. Scope

### 2.1 In-Scope (Phase 1)

| Feature Category | Details |
|------------------|---------|
| **Request Types** | Communication request type (marketing materials, shareholder letters, fact sheets, websites) |
| **Workflow** | Complete workflow: Draft → Legal Intake → Assign Attorney (optional) → In Review → Closeout → Completed |
| **Notifications** | 15 automated notification types |
| **Dashboards** | Role-based dashboards with filtering and reporting |
| **Security** | Item-level security and permissions |
| **Technology Stack** | SPFx 1.21.1 Form Customizer, Azure Functions, Power Automate |

### 2.2 Out-of-Scope (Phase 1)

| Item | Reason |
|------|--------|
| General Review and IMA Review request types | Phase 2 enhancement |
| External user access | Phase 2 enhancement |
| Mobile app | Phase 2 enhancement |
| Integration with external systems (Seismic, DocuSign) | Phase 2 enhancement |
| Company holiday calendar | Phase 1 excludes weekends only; holidays in Phase 2 |

### 2.3 Assumptions & Dependencies

| Type | Item | Details |
|------|------|---------|
| **Assumption** | SharePoint Online Availability | Available to all users with appropriate licenses |
| **Assumption** | User Group Management | User groups managed manually by IT Admin |
| **Assumption** | Business Day Calculation | Business holidays not tracked in Phase 1 (weekends only) |
| **Assumption** | Browser Support | Users have modern browsers (Chrome 90+, Edge 90+, Firefox 85+, Safari 14+) |
| **Dependency** | SharePoint Site | Site collection provisioned and configured |
| **Dependency** | Azure Functions | Deployment environment available |
| **Dependency** | Power Automate | Licensing and environment configured |
| **Dependency** | Email Service | Exchange Online available for notifications |

---

## 3. Business Drivers

### 3.1 Strategic Objectives

| Objective | Description |
|-----------|-------------|
| **Enhance Operational Efficiency** | Reduce manual processes and administrative overhead |
| **Improve Compliance** | Ensure proper approvals with documented proof |
| **Enable Data-Driven Decisions** | Provide visibility into metrics and performance |
| **Support Digital Transformation** | Move to modern, cloud-based tools |

### 3.2 Pain Points Addressed

| Current Challenge | Solution |
|-------------------|----------|
| Email-based submissions lack traceability | Centralized SharePoint system with unique Request IDs |
| Scattered approvals (screenshots, email chains) | Required approval uploads with validation |
| No central visibility or dashboards | Role-based views showing workload and status |
| Difficult to enforce turnaround times | Automatic SLA calculation and rush request flagging |
| Inefficient back-and-forth communication | Comments section with @mentions and notifications |

### 3.3 Success Metrics

| Metric | Current | Target (6 months) |
|--------|---------|-------------------|
| Average Turnaround Time | 7 days | 5.6 days |
| Requests with Complete Approvals | 75% | 100% |
| Audit Trail Completeness | 60% | 100% |
| User Adoption (Non-Email) | 10% | 90% |
| SLA Compliance Rate | 70% | 95% |

---

## 4. Current vs. Proposed Process

### 4.1 Current Process (Email-Based)

| Step | Action | Issues |
|------|--------|--------|
| 1 | Submitter emails Legal Admin with documents and screenshots of approvals | No standardized template |
| 2 | Legal Admin manually logs request in Excel spreadsheet | Manual tracking, time-consuming |
| 3 | Legal Admin assigns attorney via email (or committee discussion) | Scattered communication |
| 4 | Attorney reviews and replies via email with feedback | Version control issues |
| 5 | Compliance forwards materials if needed (separate email chain) | Disconnected workflows |
| 6 | Submitter receives approval via email, saves as proof | No central repository |
| 7 | Tracking ID communicated via email (if required) | Inconsistent documentation |
| 8 | Emails archived in individual mailboxes; no central repository | Difficult to find, no audit trail |

**Pain Points:** Lost emails, unclear status, incomplete submissions (40%), manual tracking (5-10 hrs/week), no SLA enforcement, limited search.

### 4.2 Proposed Process (Automated SharePoint)

| Step | Status | Action | System Automation |
|------|--------|--------|-------------------|
| 1 | **Draft** | Submitter creates request with required fields and approvals | Validation, field requirements enforced |
| 2 | **Submit** | System validates and generates Request ID (CRR-{YEAR}-{COUNTER}) | Auto-ID generation, permission breaking, notification to Legal Admin |
| 3 | **Legal Intake** | Legal Admin reviews, assigns attorney OR sends to committee | Permission updates, notifications |
| 4 | **Assign Attorney** (optional) | Committee reviews and assigns attorney | Committee notifications, permission updates |
| 5 | **In Review** | Attorney/Compliance perform reviews | Notifications, "Waiting On Submitter" cycle support |
| 6 | **Closeout** | Submitter provides Tracking ID (if required), completes request | Conditional validation, completion workflow |
| 7 | **Completed** | All stakeholders notified; audit trail preserved | Final notifications, archival |

**Special Actions Available to Legal Admin:** Cancel, Hold, Resume, Reassign Attorney

---

## 5. Business Requirements

Requirements organized by priority: **P1** (Must Have), **P2** (Should Have), **P3** (Could Have), **P5** (Phase 2).

### 5.1 Core Workflow (P1)

| Requirement | Description | Priority |
|-------------|-------------|----------|
| Draft Status Support | Support save/edit/delete capability for draft requests | P1 |
| Auto-generate Request ID | Generate unique ID: CRR-{YEAR}-{COUNTER} | P1 |
| Approval Enforcement | Enforce ≥1 approval (type, date, approver, document) before submission | P1 |
| Direct Assignment Path | Support Legal Intake → In Review (direct assignment) | P1 |
| Committee Assignment Path | Support Legal Intake → Assign Attorney → In Review (committee) | P1 |
| Closeout with Tracking ID | Support conditional Tracking ID requirement | P1 |
| Terminal Statuses | Support Completed and Cancelled as final states | P1 |

### 5.2 Turnaround Time & Rush Requests (P1)

| Requirement | Description | Priority |
|-------------|-------------|----------|
| Submission Items List | Maintain configurable list with turnaround times (business days) | P1 |
| Expected Date Calculation | Auto-calculate Expected Date = Request Date + SLA (exclude weekends) | P1 |
| Rush Flag | Auto-flag Rush Request if Target Return Date < Expected Date | P1 |
| Rush Rationale | Require justification (min 10 chars) for all rush requests | P1 |
| Date Display | Display Expected Date and Target Date side-by-side for visibility | P1 |

### 5.3 Approvals (P1)

| Requirement | Description | Priority |
|-------------|-------------|----------|
| Approval Types | Support 6 types: Communications, Portfolio Manager, Research Analyst, SME, Performance Review, Other | P1 |
| Required Components | Require Type, Date (not future), Approver, Document for each approval | P1 |
| Multiple Approvals | Allow multiple approvals (max 6 efficiently supported) | P1 |
| Validation | Validate approval completeness before submission | P1 |

### 5.4 Review Process (P1)

| Requirement | Description | Priority |
|-------------|-------------|----------|
| Independent Tracking | Track Legal and Compliance Review status independently | P1 |
| Review Outcomes | Support: Approved, Approved With Comments, Not Approved | P1 |
| Rejection Logic | If ANY review = Not Approved → Status = Completed (bypass Closeout) | P1 |
| Approval Logic | If ALL reviews = Approved/Approved With Comments → Status = Closeout | P1 |
| Waiting On Submitter | Support status for requesting additional info from submitter | P1 |

### 5.5 Notifications (P1)

| Notification Type | Trigger | Recipients | Priority |
|-------------------|---------|------------|----------|
| Request Submitted | Draft → Legal Intake | Legal Admin | P1 |
| Attorney Assigned (Direct) | Legal Intake → In Review | Assigned Attorney | P1 |
| Sent to Committee | Legal Intake → Assign Attorney | Attorney Assigner group | P1 |
| Attorney Assigned (Committee) | Assign Attorney → In Review | Assigned Attorney | P1 |
| Compliance Review Required | In Review + Compliance audience | Compliance Users | P1 |
| Attorney Reassigned | Attorney field changed | Old and New Attorneys | P1 |
| Waiting On Submitter | Review status change | Submitter | P1 |
| Submitter Response | Document uploaded while waiting | Attorney/Compliance | P1 |
| Ready for Closeout | Status → Closeout | Submitter | P1 |
| Request Completed | Status → Completed | All stakeholders | P1 |
| Request Cancelled | Status → Cancelled | All stakeholders | P1 |
| Request On Hold | Status → On Hold | All stakeholders | P1 |
| Request Resumed | On Hold → Previous status | Active participants | P1 |
| User Tagged in Comment | @mention in comment | Tagged user | P2 |
| Review Completed (Single) | Single review completed | Submitter, Legal Admin | P2 |

**Additional Requirements:**
- Include Request ID, Title, link to request, contextual information in all emails
- Log all notifications to NotificationLog list

### 5.6 Permissions & Security (P1)

| Requirement | Description | Priority |
|-------------|-------------|----------|
| Break Permissions | Break item-level permissions when Draft → Legal Intake | P1 |
| Submitter Access | Grant Read access only after submission (no edit) | P1 |
| Legal Admin Access | Grant Full Control on all non-Draft requests | P1 |
| Attorney Access | Grant assigned Attorney Edit access to specific request | P1 |
| Compliance Access | Grant Compliance Users Edit access when Review Audience = Compliance or Both | P1 |
| Automated Updates | Update permissions via Azure Function triggered by Power Automate | P1 |

### 5.7 Dashboards & Reporting (P1)

| Dashboard View | Target Audience | Key Columns | Priority |
|----------------|-----------------|-------------|----------|
| My Requests | Submitters | Request ID, Title, Status, Attorney, Target Date | P1 |
| All Requests | Legal Admin | Request ID, Title, Submitter, Status, Attorney, Target Date, Rush Flag | P1 |
| My Assigned Requests | Attorneys | Request ID, Title, Submitter, Status, Target Date, Days Since Assignment | P1 |
| Compliance Reviews | Compliance Users | Request ID, Title, Status, Compliance Status, Target Date | P1 |
| Pending Legal Intake | Legal Admin | Request ID, Title, Submitter, Submitted On, Rush Flag | P1 |
| Pending Committee Assignment | Attorney Assigner | Request ID, Title, Target Date, Sent to Committee On | P1 |
| Closeout Pending | Submitters, Legal Admin | Request ID, Title, Target Date, Tracking ID Required | P1 |
| Completed Requests | All | Request ID, Title, Completed On, Turnaround Days, Outcomes | P2 |
| Cancelled Requests | All | Request ID, Title, Cancelled On, Cancellation Reason | P2 |
| On Hold Requests | All | Request ID, Title, Previous Status, Hold Reason | P2 |

**Additional Requirements:**
- Highlight Rush Requests with red flag icon
- Support filtering, sorting, grouping, export to Excel

### 5.8 Audit Trail (P1)

| Log Type | Information Captured | Priority |
|----------|---------------------|----------|
| Status Changes | Old value, new value, user, timestamp | P1 |
| Field Modifications | Field name, old value, new value, user, timestamp | P1 |
| Document Operations | Upload/deletion events, user, timestamp | P1 |
| Permission Changes | Permission type, user affected, changed by, timestamp | P1 |
| Data Retention | Retain audit logs for 7 years minimum | P1 |

### 5.9 Data Validation (P1)

| Field | Validation Rule | Priority |
|-------|----------------|----------|
| Request Title | 3-255 chars, required | P1 |
| Purpose | 10-10,000 chars, required | P1 |
| Target Return Date | Future date, required | P1 |
| Rush Rationale | 10+ chars if rush request | P1 |
| Tracking ID | Required if Compliance reviewed AND (Foreside OR Retail); max 50 chars | P1 |
| Approvals | At least 1 approval before submission | P1 |
| Review Documents | At least 1 review document before submission | P1 |

---

## 6. Functional Requirements Summary

### 6.1 Request Creation & Submission

**Draft Management:**
- "New Request" button creates list item with Status = Draft
- Submitter populates required fields (17 Request Information fields)
- Save Draft, Edit Draft, Delete Draft actions available
- Permissions inherited (submitter has full control)

**Submission:**
- "Submit Request" validates: all required fields, ≥1 approval, ≥1 review document
- System auto-generates Request ID, sets Status = Legal Intake, populates SubmittedBy/On
- Power Automate flow breaks permissions and sends notification to Legal Admin

**Key Fields:**

| Field Category | Fields | Count |
|----------------|--------|-------|
| **Request Information** | Title (Request ID), Department, RequestType, RequestTitle, Purpose, SubmissionType, SubmissionItem, DistributionMethod, TargetReturnDate, IsRushRequest, RushRationale, ReviewAudience, PriorSubmissions, PriorSubmissionNotes, DateOfFirstUse, AdditionalParty, ExpectedTurnaroundDate | 17 |
| **Approvals** | 6 types × (Approval Date, Approver, Approval Document, Custom Title if Other) | 18 |
| **Review Documents** | Multi-file upload, max 250MB per file | Variable |

### 6.2 Legal Intake & Attorney Assignment

**Legal Intake Review:**
- Legal Admin reviews request for completeness
- Legal Admin can override Review Audience (Legal, Compliance, Both)
- Two assignment paths: Direct OR Committee

**Direct Assignment:**
- Legal Admin selects Attorney, adds notes, clicks "Assign Attorney"
- Status: Legal Intake → In Review
- Power Automate updates permissions, notifies Attorney

**Committee Assignment:**
- Legal Admin clicks "Send to Committee"
- Status: Legal Intake → Assign Attorney
- Power Automate notifies Attorney Assigner group
- Committee member selects Attorney, clicks "Assign Attorney"
- Status: Assign Attorney → In Review
- Power Automate updates permissions, notifies Attorney

**Attorney Reassignment:**
- Legal Admin can reassign at any time (requires reason)
- Power Automate updates permissions, notifies old and new attorneys

### 6.3 Review Process

**Legal Review:**
- Attorney opens request, reviews materials
- Legal Review section: Status (Not Started, In Progress, Waiting On Submitter, Completed), Outcome (Approved, Approved With Comments, Not Approved), Notes (required), Reviewer (auto), Date (auto)
- Can request more info from Submitter (triggers "Waiting On Submitter" notification)
- Submit Legal Review: sets outcome, system evaluates overall status

**Compliance Review:**
- If Review Audience = Compliance or Both, Compliance Users notified and granted access
- Compliance Review section: Status, Outcome, Notes, Reviewer, Date, Is Foreside Review Required, Is Retail Use, Compliance Flags
- Submit Compliance Review: sets outcome, system evaluates overall status

**Status Evaluation:**
- Review Audience = Legal: Legal outcome determines next status
- Review Audience = Compliance: Compliance outcome determines next status
- Review Audience = Both: BOTH outcomes must be Approved/Approved With Comments to proceed
- If ANY review = Not Approved → Status = Completed (skip Closeout)
- If ALL reviews = Approved/Approved With Comments → Status = Closeout

### 6.4 Closeout & Completion

**Closeout:**
- Submitter receives "Ready for Closeout" notification
- Tracking ID required if: Compliance reviewed AND (IsForesideReviewRequired OR IsRetailUse)
- Submitter enters Tracking ID (if required), adds notes, clicks "Complete Request"
- Status: Closeout → Completed
- System calculates TotalTurnaroundDays (business days from SubmittedOn to CompletedOn)
- Power Automate sends "Request Completed" notification to all stakeholders

**Admin Override:**
- Legal Admin can "Mark as Completed" from any status (emergency; requires reason)

---

## 7. Use Cases (Key Scenarios)

### 7.1 Submit New Communication Request

**Actor:** Submitter
**Steps:**
1. Navigate to SharePoint site, click "New Request"
2. Fill required fields: Request Title, Purpose, Submission Item, Target Return Date
3. Add ≥1 approval (type, date, approver, upload document)
4. Upload ≥1 review document
5. Click "Submit Request"
6. System validates, generates CRR-{YEAR}-{COUNTER}, changes Status to Legal Intake
7. Legal Admin receives notification

**Acceptance Criteria:** Request ID generated, Status = Legal Intake, Submitter has Read access only, Legal Admin has Full Control, notification sent

### 7.2 Direct Attorney Assignment

**Actor:** Legal Admin
**Steps:**
1. Receive notification, open request
2. Review completeness
3. Select Attorney from dropdown, add notes
4. Click "Assign Attorney"
5. Status changes to In Review, Attorney receives notification

**Acceptance Criteria:** Status = In Review, Attorney assigned, Attorney has Edit access, notification sent

### 7.3 Attorney Performs Legal Review

**Actor:** Attorney
**Steps:**
1. Receive notification, open request
2. Review materials
3. Set Legal Review Outcome (Approved, Approved With Comments, or Not Approved)
4. Add Legal Review Notes
5. Click "Submit Legal Review"
6. System evaluates: If Approved/Approved With Comments → Closeout; If Not Approved → Completed

**Acceptance Criteria:** Legal Review Status = Completed, Legal Review Date recorded, Status updated based on outcome, Submitter notified

### 7.4 Dual Review (Legal and Compliance)

**Actor:** Attorney, Compliance User
**Steps:**
1. Request enters In Review with Review Audience = Both
2. Attorney and Compliance both receive notifications
3. Attorney submits Legal Review: Approved
4. Compliance submits Compliance Review: Approved (sets Foreside Required = Yes, Retail Use = Yes)
5. System evaluates: BOTH Approved → Status = Closeout
6. Submitter receives "Ready for Closeout" notification (Tracking ID required)

**Acceptance Criteria:** Both reviews completed, Status = Closeout, Tracking ID determined as required

### 7.5 Submitter Completes Closeout

**Actor:** Submitter
**Steps:**
1. Receive "Ready for Closeout" notification
2. Open request, enter Tracking ID (required)
3. Click "Complete Request"
4. Status changes to Completed, all stakeholders notified

**Acceptance Criteria:** Status = Completed, Tracking ID captured, TotalTurnaroundDays calculated, all stakeholders notified

---

## 8. User Interface Requirements

### 8.1 Form Layout

- **70/30 Layout:** Form fields (left 70%), Comments/Activity Feed (right 30%)
- **Collapsible Sections:** Request Information, Approvals, Review Documents, Legal Intake (role-based), Legal Review (role-based), Compliance Review (role-based), Closeout (role-based)
- **Workflow Stepper:** Top of form showing current status in workflow

### 8.2 Field Controls

- Text fields: DevExtreme TextBox with character count and inline validation
- Rich text: DevExtreme HtmlEditor with formatting toolbar
- Dates: DevExtreme DateBox with calendar picker (MM/DD/YYYY)
- People pickers: PnP React PeoplePicker with type-ahead search
- Choice fields: Fluent UI Dropdown (searchable if >5 options)
- File uploads: Drag-and-drop, multi-file, progress bar, max 250MB per file

### 8.3 Conditional Visibility

- Rush Rationale field only visible if IsRushRequest = true
- Legal Intake section only visible to Legal Admin
- Attorney Assignment section only visible to Attorney Assigner group and Legal Admin
- Legal Review section only visible to assigned Attorney and Legal Admin
- Compliance Review section only visible to Compliance Users and Legal Admin (when Review Audience includes Compliance)
- Closeout section only visible when Status = Closeout

### 8.4 Action Buttons (Role-Based)

| Role | Context | Available Actions |
|------|---------|-------------------|
| **Submitter** | Draft status | Save Draft, Delete Draft, Submit Request |
| **Submitter** | Closeout status | Complete Request |
| **Legal Admin** | Any active status | Assign Attorney, Send to Committee, Reassign Attorney, Cancel Request, Place On Hold, Resume Request, Mark as Completed |
| **Attorney Assigner** | Assign Attorney status | Assign Attorney |
| **Attorney** | In Review status | Submit Legal Review, Request More Info |
| **Compliance User** | In Review status | Submit Compliance Review, Request More Info |

### 8.5 Dashboards

| # | View Name | Target Audience | Key Features |
|---|-----------|-----------------|--------------|
| 1 | My Requests | Submitters | Shows user's own requests with status, attorney, target date |
| 2 | All Requests | Legal Admin | Shows all requests with submitter, status, attorney, rush flag |
| 3 | My Assigned Requests | Attorneys | Shows assigned requests with target date, days since assignment |
| 4 | Compliance Reviews | Compliance Users | Shows requests requiring compliance review |
| 5 | Pending Legal Intake | Legal Admin | Shows requests awaiting triage (FIFO) |
| 6 | Pending Committee Assignment | Attorney Assigner | Shows requests sent to committee |
| 7 | Closeout Pending | Submitters, Legal Admin | Shows requests ready for closeout |
| 8 | Completed Requests | All | Shows completed requests with outcomes and turnaround days |
| 9 | Cancelled Requests | All | Shows cancelled requests with reasons |
| 10 | On Hold Requests | All | Shows paused requests with hold reasons |

**Common Features:**
- Rush requests highlighted with red flag icon
- Filtering, sorting, grouping support
- Export to Excel

### 8.6 Comments & Activity Feed

| Component | Details |
|-----------|---------|
| **Layout** | Right panel (30% of screen), chronological feed (newest first) |
| **User Comments** | Rich text editor with @mention support, user avatar, timestamp, edit/delete options |
| **System Activity** | Auto-generated entries (status changes, assignments, document uploads), styled with gray background to differentiate from user comments |
| **@Mention Functionality** | @mentioned users receive notification and granted Read access automatically |
| **Real-time Updates** | Feed refreshes when new comments/activity added |

### 8.7 Accessibility

| Requirement | Implementation |
|-------------|----------------|
| **WCAG Compliance** | WCAG 2.1 AA compliance mandatory for all UI components |
| **Keyboard Navigation** | Tab (focus next), Shift+Tab (focus previous), Enter/Space (activate), Esc (close dialogs) |
| **Screen Reader Support** | Compatible with JAWS, NVDA, VoiceOver; proper ARIA labels, roles, and live regions |
| **Color Contrast** | ≥4.5:1 for normal text, ≥3:1 for large text (18pt+) and UI components |
| **Focus Indicators** | Visible focus indicators on all interactive elements (buttons, links, form fields) |
| **Alternative Text** | All images and icons include descriptive alt text |

---

## 9. Integration Requirements

### 9.1 SharePoint Integration

| Component | Details |
|-----------|---------|
| **Technology** | SPFx 1.21.1 Form Customizer |
| **Requests List** | 73 fields (17 Request Info, 18 Approvals, 2 Legal Intake, 5 Legal Review, 7 Compliance Review, 1 Closeout, 16 System Tracking) |
| **SubmissionItems List** | 4 fields (Title, TurnAroundTimeInDays, Description, IsActive) |
| **RequestDocuments Library** | 5 metadata fields (RequestID, DocumentType, UploadedBy, UploadedOn, ApprovalType) |
| **SharePoint Groups** | LW - Submitters, LW - Legal Admin, LW - Attorney Assigner, LW - Attorneys, LW - Compliance Users, LW - Admin |
| **Versioning** | Enabled on Requests list and RequestDocuments library |
| **Indexing** | Status, SubmittedOn, Attorney, TargetReturnDate, RequestID |

### 9.2 Azure Functions

| Function | Endpoint | Purpose | Input Parameters | Output |
|----------|----------|---------|------------------|--------|
| **Permission Management** | POST /api/PermissionManagement | Break inheritance, update item-level permissions based on status/role | requestId, newStatus, assignedAttorney, reviewAudience, siteUrl | Success/failure, permissions applied, timestamp |
| **Notification Content Generation** | POST /api/NotificationGeneration | Fetch request details, generate email content from template | requestId, notificationType, siteUrl, recipientRole | Email subject, body (HTML), recipient list |

### 9.3 Power Automate Flows

**Overview:** 15 automated flows orchestrate workflow progression, permissions management, and notifications. All flows are triggered by SharePoint list item changes in the Requests list.

#### Flow 1: Request Submitted

| Aspect | Details |
|--------|---------|
| **Trigger** | When an item is created or modified: Status changes to "Legal Intake" |
| **Condition** | Status = "Legal Intake" AND Modified = "Draft" (previous value) |
| **Actions** | 1. Get item details (RequestID, Title, Submitter, TargetReturnDate, IsRushRequest)<br>2. Call Azure Function: POST /api/PermissionManagement (break inheritance, grant Legal Admin Full Control)<br>3. Call Azure Function: POST /api/NotificationGeneration (notificationType = "Request Submitted")<br>4. Get Legal Admin group members<br>5. Send email (V2) to Legal Admin group with notification content<br>6. Log to WorkflowLogs list (FlowName, RequestID, ExecutionStatus, Timestamp) |
| **Error Handling** | Retry Azure Functions (2 attempts, 5 min apart); log failures to WorkflowLogs; send alert to Admin group |
| **Run Mode** | Asynchronous (non-blocking) |

#### Flow 2: Attorney Assigned (Direct)

| Aspect | Details |
|--------|---------|
| **Trigger** | When an item is modified: Status changes from "Legal Intake" to "In Review" |
| **Condition** | Status = "In Review" AND Modified = "Legal Intake" AND Attorney field is not empty |
| **Actions** | 1. Get item details (RequestID, Title, Attorney, AttorneyAssignNotes, TargetReturnDate)<br>2. Call Azure Function: POST /api/PermissionManagement (grant Attorney Edit permissions for review fields only)<br>3. Call Azure Function: POST /api/NotificationGeneration (notificationType = "Attorney Assigned Direct")<br>4. Send email (V2) to assigned Attorney<br>5. Update AttorneyAssignedBy and AttorneyAssignedOn fields<br>6. Log to WorkflowLogs |
| **Error Handling** | Retry logic; rollback status if permission update fails; alert Legal Admin |
| **Run Mode** | Asynchronous |

#### Flow 3: Sent to Committee

| Aspect | Details |
|--------|---------|
| **Trigger** | When an item is modified: Status changes from "Legal Intake" to "Assign Attorney" |
| **Condition** | Status = "Assign Attorney" AND Modified = "Legal Intake" |
| **Actions** | 1. Get item details (RequestID, Title, AttorneyAssignNotes, SubmissionItem, Purpose)<br>2. Call Azure Function: POST /api/PermissionManagement (grant Attorney Assigner group Edit permissions for Attorney field only)<br>3. Call Azure Function: POST /api/NotificationGeneration (notificationType = "Sent to Committee")<br>4. Get Attorney Assigner group members<br>5. Send email (V2) to Attorney Assigner group<br>6. Log to WorkflowLogs |
| **Error Handling** | Retry logic; alert Legal Admin if notification fails |
| **Run Mode** | Asynchronous |

#### Flow 4: Attorney Assigned (Committee)

| Aspect | Details |
|--------|---------|
| **Trigger** | When an item is modified: Status changes from "Assign Attorney" to "In Review" |
| **Condition** | Status = "In Review" AND Modified = "Assign Attorney" AND Attorney field is not empty |
| **Actions** | 1. Get item details (RequestID, Title, Attorney, AttorneyAssignNotes)<br>2. Call Azure Function: POST /api/PermissionManagement (grant Attorney Edit permissions)<br>3. Call Azure Function: POST /api/NotificationGeneration (notificationType = "Attorney Assigned Committee")<br>4. Send email (V2) to assigned Attorney<br>5. Update AttorneyAssignedBy and AttorneyAssignedOn fields<br>6. Log to WorkflowLogs |
| **Error Handling** | Retry logic; rollback if fails; alert Legal Admin and Attorney Assigner |
| **Run Mode** | Asynchronous |

#### Flow 5: Compliance Review Required

| Aspect | Details |
|--------|---------|
| **Trigger** | When an item is modified: Status = "In Review" AND ReviewAudience contains "Compliance" or "Both" |
| **Condition** | Status = "In Review" AND (ReviewAudience = "Compliance" OR ReviewAudience = "Both") AND Compliance notification not already sent (check NotificationLog) |
| **Actions** | 1. Get item details (RequestID, Title, TargetReturnDate, Purpose)<br>2. Call Azure Function: POST /api/PermissionManagement (grant Compliance Users Edit permissions for compliance review fields)<br>3. Call Azure Function: POST /api/NotificationGeneration (notificationType = "Compliance Review Required")<br>4. Get Compliance Users group members<br>5. Send email (V2) to Compliance Users group<br>6. Log to NotificationLog and WorkflowLogs |
| **Error Handling** | Retry logic; alert Legal Admin if compliance users cannot be notified |
| **Run Mode** | Asynchronous |

#### Flow 6: Attorney Reassigned

| Aspect | Details |
|--------|---------|
| **Trigger** | When an item is modified: Attorney field value changes |
| **Condition** | Attorney field modified AND Status = "In Review" AND OldAttorney ≠ NewAttorney |
| **Actions** | 1. Get OldAttorney value from version history<br>2. Get item details (RequestID, Title, NewAttorney, ReassignmentReason)<br>3. Call Azure Function: POST /api/PermissionManagement (remove OldAttorney permissions, grant NewAttorney permissions)<br>4. Call Azure Function: POST /api/NotificationGeneration (notificationType = "Attorney Reassigned")<br>5. Send email (V2) to OldAttorney (notification of reassignment)<br>6. Send email (V2) to NewAttorney (assignment notification)<br>7. Update AttorneyAssignedBy and AttorneyAssignedOn<br>8. Log to AuditLog (Attorney field change) and WorkflowLogs |
| **Error Handling** | Critical flow: rollback Attorney change if permission update fails; alert Legal Admin |
| **Run Mode** | Synchronous (blocking until complete) |

#### Flow 7: Waiting On Submitter

| Aspect | Details |
|--------|---------|
| **Trigger** | When an item is modified: LegalReviewStatus OR ComplianceReviewStatus changes to "Waiting On Submitter" |
| **Condition** | (LegalReviewStatus = "Waiting On Submitter" OR ComplianceReviewStatus = "Waiting On Submitter") AND Status = "In Review" |
| **Actions** | 1. Get item details (RequestID, Title, LegalReviewNotes, ComplianceReviewNotes, Reviewer)<br>2. Call Azure Function: POST /api/NotificationGeneration (notificationType = "Waiting On Submitter")<br>3. Get Submitter email<br>4. Send email (V2) to Submitter with reviewer comments and required actions<br>5. Log to NotificationLog and WorkflowLogs |
| **Error Handling** | Retry notification; alert Legal Admin if submitter cannot be reached |
| **Run Mode** | Asynchronous |

#### Flow 8: Submitter Response

| Aspect | Details |
|--------|---------|
| **Trigger** | When an item is created in RequestDocuments library: UploadedBy = Submitter AND parent request has review status "Waiting On Submitter" |
| **Condition** | Get parent request item by RequestID; check if LegalReviewStatus = "Waiting On Submitter" OR ComplianceReviewStatus = "Waiting On Submitter" |
| **Actions** | 1. Get document details (FileName, UploadedBy, UploadedOn, SubmitterComment)<br>2. Get parent request details (RequestID, Title, Attorney, ComplianceReviewer)<br>3. Call Azure Function: POST /api/NotificationGeneration (notificationType = "Submitter Response")<br>4. Send email (V2) to Attorney (if LegalReviewStatus = "Waiting On Submitter")<br>5. Send email (V2) to ComplianceReviewer (if ComplianceReviewStatus = "Waiting On Submitter")<br>6. Log to NotificationLog and WorkflowLogs |
| **Error Handling** | Non-critical: log failure and continue; retry notification once |
| **Run Mode** | Asynchronous |

#### Flow 9: Ready for Closeout

| Aspect | Details |
|--------|---------|
| **Trigger** | When an item is modified: Status changes to "Closeout" |
| **Condition** | Status = "Closeout" AND Modified ≠ "Closeout" |
| **Actions** | 1. Get item details (RequestID, Title, LegalReviewOutcome, ComplianceReviewOutcome, IsForesideReviewRequired, IsRetailUse)<br>2. Determine if TrackingID is required (Compliance reviewed AND (Foreside = true OR Retail = true))<br>3. Call Azure Function: POST /api/NotificationGeneration (notificationType = "Ready for Closeout", include tracking ID requirement)<br>4. Get Submitter email<br>5. Send email (V2) to Submitter with closeout instructions<br>6. Log to NotificationLog and WorkflowLogs |
| **Error Handling** | Retry notification; critical to inform submitter; alert Legal Admin if fails |
| **Run Mode** | Asynchronous |

#### Flow 10: Request Completed

| Aspect | Details |
|--------|---------|
| **Trigger** | When an item is modified: Status changes to "Completed" |
| **Condition** | Status = "Completed" AND Modified ≠ "Completed" |
| **Actions** | 1. Get item details (RequestID, Title, FinalOutcome, CompletedBy, CompletedOn, TotalTurnaroundDays)<br>2. Get all stakeholders (Submitter, Attorney, ComplianceReviewer, Legal Admin group, any ad-hoc stakeholders)<br>3. Call Azure Function: POST /api/NotificationGeneration (notificationType = "Request Completed")<br>4. Send email (V2) to all stakeholders<br>5. Update permissions: set all to Read-only except Legal Admin and LW - Admin<br>6. Log final audit entry to AuditLog<br>7. Log to WorkflowLogs |
| **Error Handling** | Non-critical for notification (log failure); critical for permission update (alert Admin if fails) |
| **Run Mode** | Asynchronous |

#### Flow 11: Request Cancelled

| Aspect | Details |
|--------|---------|
| **Trigger** | When an item is modified: Status changes to "Cancelled" |
| **Condition** | Status = "Cancelled" AND Modified ≠ "Cancelled" |
| **Actions** | 1. Get item details (RequestID, Title, CancelledBy, CancelledOn, CancellationReason)<br>2. Get all stakeholders (same as Flow 10)<br>3. Call Azure Function: POST /api/NotificationGeneration (notificationType = "Request Cancelled")<br>4. Send email (V2) to all stakeholders<br>5. Update permissions: set all to Read-only except Legal Admin and LW - Admin<br>6. Log cancellation to AuditLog<br>7. Log to WorkflowLogs |
| **Error Handling** | Non-critical; log failures and continue |
| **Run Mode** | Asynchronous |

#### Flow 12: Request On Hold

| Aspect | Details |
|--------|---------|
| **Trigger** | When an item is modified: Status changes to "On Hold" |
| **Condition** | Status = "On Hold" AND Modified ≠ "On Hold" |
| **Actions** | 1. Get item details (RequestID, Title, OnHoldBy, OnHoldOn, HoldReason, PreviousStatus)<br>2. Store PreviousStatus field (for resume functionality)<br>3. Get all active stakeholders (exclude stakeholders from inactive statuses)<br>4. Call Azure Function: POST /api/NotificationGeneration (notificationType = "Request On Hold")<br>5. Send email (V2) to all stakeholders<br>6. Log to AuditLog and WorkflowLogs |
| **Error Handling** | Ensure PreviousStatus is stored; alert Legal Admin if storage fails |
| **Run Mode** | Asynchronous |

#### Flow 13: Request Resumed

| Aspect | Details |
|--------|---------|
| **Trigger** | When an item is modified: PreviousStatus field is not empty AND Status changes FROM "On Hold" |
| **Condition** | Modified = "On Hold" AND Status ≠ "On Hold" AND PreviousStatus is not empty |
| **Actions** | 1. Verify Status = PreviousStatus (business rule: must resume to previous status)<br>2. Get item details (RequestID, Title, ResumedBy, ResumedOn, Status)<br>3. Get active participants (Attorney, ComplianceReviewer, Submitter, Legal Admin)<br>4. Call Azure Function: POST /api/NotificationGeneration (notificationType = "Request Resumed")<br>5. Send email (V2) to active participants<br>6. Clear PreviousStatus field<br>7. Update ResumedBy and ResumedOn fields<br>8. Log to AuditLog and WorkflowLogs |
| **Error Handling** | Critical: rollback if Status ≠ PreviousStatus; alert Legal Admin |
| **Run Mode** | Synchronous (blocking) |

#### Flow 14: User Tagged in Comment

| Aspect | Details |
|--------|---------|
| **Trigger** | When a comment is added to a request (custom event from SPFx component) OR when an item's Comments field is modified and contains @mention |
| **Condition** | Comment text contains "@" AND user mention syntax detected |
| **Actions** | 1. Parse comment text for @mentions (regex: @\[DisplayName\]\(email\))<br>2. Extract tagged user email addresses<br>3. Get item details (RequestID, Title, CommenterName, CommentExcerpt, CommentTimestamp)<br>4. For each tagged user:<br>   - Check if user has permissions to view request<br>   - If not, call Azure Function: POST /api/PermissionManagement (grant Read access)<br>   - Call Azure Function: POST /api/NotificationGeneration (notificationType = "User Tagged in Comment")<br>   - Send email (V2) to tagged user<br>   - Log to NotificationLog<br>5. Log to WorkflowLogs |
| **Error Handling** | Non-critical; log failures; if permission grant fails, still send notification with note that access is pending |
| **Run Mode** | Asynchronous |

#### Flow 15: Review Completed (Single)

| Aspect | Details |
|--------|---------|
| **Trigger** | When an item is modified: LegalReviewOutcome OR ComplianceReviewOutcome changes to "Approved", "Approved With Comments", or "Not Approved" |
| **Condition** | (LegalReviewOutcome ≠ "Pending" AND LegalReviewOutcome ≠ "In Progress" AND LegalReviewStatus = "Completed") OR (ComplianceReviewOutcome ≠ "Pending" AND ComplianceReviewOutcome ≠ "In Progress" AND ComplianceReviewStatus = "Completed") |
| **Actions** | 1. Get item details (RequestID, Title, ReviewerName, ReviewOutcome, ReviewNotes, ReviewDate)<br>2. Determine which review completed (Legal or Compliance)<br>3. Check if all required reviews are completed:<br>   - If ReviewAudience = "Legal": check only LegalReviewStatus<br>   - If ReviewAudience = "Compliance": check only ComplianceReviewStatus<br>   - If ReviewAudience = "Both": check both statuses<br>4. If ANY review outcome = "Not Approved":<br>   - Update Status to "Completed" (bypass Closeout)<br>5. If ALL reviews outcome = "Approved" OR "Approved With Comments":<br>   - Update Status to "Closeout"<br>6. Call Azure Function: POST /api/NotificationGeneration (notificationType = "Review Completed Single")<br>7. Send email (V2) to Submitter and Legal Admin<br>8. Log to NotificationLog and WorkflowLogs |
| **Error Handling** | Critical flow: retry status update; alert Legal Admin if status transition fails |
| **Run Mode** | Synchronous (must complete status update before continuing) |

#### Common Flow Patterns

| Pattern | Implementation |
|---------|----------------|
| **Error Handling** | Try-Catch scope for all critical actions; retry logic (2 attempts, 5 min apart); log failures to WorkflowLogs; send alert email to LW - Admin group for critical failures |
| **Logging** | All flows log execution to WorkflowLogs list (FlowName, RequestID, TriggerType, ExecutionStatus, StartTime, EndTime, ErrorDetails) |
| **Notification Logging** | All notifications logged to NotificationLog list (RequestID, NotificationType, Recipient, SentOn, DeliveryStatus) |
| **Concurrency Control** | Use SharePoint "When an item is modified" trigger with concurrency set to 1 to prevent race conditions |
| **Timeout Settings** | Azure Function calls: 30-second timeout; Email actions: 2-minute timeout; Overall flow timeout: 5 minutes |
| **Run Mode** | Asynchronous (default) for non-critical flows; Synchronous for critical state transitions (Flow 6, Flow 13, Flow 15) |
| **Termination Conditions** | Flow terminates on critical error; non-critical errors logged and flow continues |

### 9.4 Email Notifications

| Component | Details |
|-----------|---------|
| **Delivery Method** | Power Automate "Send an email (V2)" via Exchange Online |
| **Templates** | HTML files stored in SharePoint "EmailTemplates" library |
| **Placeholders** | {RequestID}, {RequestTitle}, {Submitter}, {TargetReturnDate}, {RushFlag}, {Status}, {Attorney}, {ReviewerNotes}, {TrackingID}, {RequestURL}, etc. |
| **Tracking** | Logged to NotificationLog list (RequestID, Type, Recipient, SentOn, DeliveryStatus) |
| **Retry Policy** | 2 retries (1 hour apart) if delivery fails |

---

## 10. Data Management Requirements

### 10.1 Data Model

**Requests List (73 fields):**

| Field Category | Field Count | Key Fields |
|----------------|-------------|------------|
| **Request Information** | 17 | Title (Request ID), Department, RequestType, RequestTitle, Purpose, SubmissionType, SubmissionItem, DistributionMethod, TargetReturnDate, IsRushRequest, RushRationale, ReviewAudience, PriorSubmissions, PriorSubmissionNotes, DateOfFirstUse, AdditionalParty, ExpectedTurnaroundDate |
| **Approvals** | 18 | 6 approval types × 3 fields each (Date, Approver, Document): CommunicationsApproval, PortfolioManagerApproval, ResearchAnalystApproval, SMEApproval, PerformanceReviewApproval, OtherApproval |
| **Legal Intake** | 2 | Attorney (Person), AttorneyAssignNotes (MultiLine Text) |
| **Legal Review** | 5 | LegalReviewStatus, LegalReviewOutcome, LegalReviewNotes, LegalReviewer (Person), LegalReviewDate |
| **Compliance Review** | 7 | ComplianceReviewStatus, ComplianceReviewOutcome, ComplianceReviewNotes, ComplianceReviewer (Person), ComplianceReviewDate, IsForesideReviewRequired (Yes/No), IsRetailUse (Yes/No) |
| **Closeout** | 1 | TrackingId (Single Line Text, 50 chars max) |
| **System Tracking** | 16 | Status (Choice), SubmittedBy, SubmittedOn, AttorneyAssignedBy, AttorneyAssignedOn, CompletedBy, CompletedOn, CancelledBy, CancelledOn, CancellationReason, OnHoldBy, OnHoldOn, HoldReason, PreviousStatus, ResumedBy, ResumedOn, TotalTurnaroundDays (Number) |
| **Total** | **73** | Includes all sections above |

**Supporting Lists:**

| List Name | Purpose | Key Fields |
|-----------|---------|------------|
| **SubmissionItems** | Configuration list for submission types and SLA times | Title (Single Line Text), TurnAroundTimeInDays (Number), Description (MultiLine Text), IsActive (Yes/No) |
| **AuditLog** | Immutable audit trail for all field changes | EventType (Choice), RequestID (Single Line Text), FieldName (Single Line Text), OldValue (MultiLine Text), NewValue (MultiLine Text), ChangedBy (Person), ChangedOn (DateTime) |
| **NotificationLog** | Tracks all email notifications sent | RequestID (Single Line Text), NotificationType (Choice), Recipient (Person), SentOn (DateTime), DeliveryStatus (Choice: Sent/Failed/Retrying) |
| **WorkflowLogs** | Power Automate flow execution logs | FlowName (Single Line Text), RequestID (Single Line Text), TriggerType (Choice), ExecutionStatus (Choice: Success/Failed/Warning), StartTime (DateTime), EndTime (DateTime) |

### 10.2 Data Validation

| Field | Validation Rule | Error Message |
|-------|----------------|---------------|
| **Request Title** | 3-255 characters | "Request title must be between 3 and 255 characters" |
| **Purpose** | 10-10,000 characters | "Purpose must be between 10 and 10,000 characters" |
| **Target Return Date** | Must be future date (≥ today) | "Target return date must be today or later" |
| **Rush Rationale** | Required if IsRushRequest = true, minimum 10 characters | "Rush rationale is required for rush requests (minimum 10 characters)" |
| **Approval Date** | Cannot be future date | "Approval date cannot be in the future" |
| **Approval Document** | File type: PDF, DOCX, XLSX, MSG, PNG, JPG; Max size: 250MB | "Invalid file type or file exceeds 250MB limit" |
| **Tracking ID** | 50 characters max, required if Compliance reviewed AND (IsForesideReviewRequired = true OR IsRetailUse = true) | "Tracking ID is required for compliance materials with Foreside review or retail use" |
| **Minimum Approvals** | At least 1 approval required (all 5 fields: Type, Title, Date, Approver, Document) | "At least one complete approval is required before submission" |
| **Review Documents** | At least 1 document must be uploaded for review | "At least one document must be uploaded for legal/compliance review" |

### 10.3 Data Integrity

| Mechanism | Implementation | Purpose |
|-----------|----------------|---------|
| **Optimistic Concurrency** | SharePoint version check on save (ETags) | Prevents lost updates when multiple users edit simultaneously |
| **Orphaned Document Detection** | Weekly scheduled Power Automate flow scans RequestDocuments library for items without matching RequestID | Flags orphaned documents for review/cleanup |
| **Audit Log Immutability** | Append-only list, no edit/delete permissions except for Admins | Ensures tamper-proof audit trail |
| **Data Retention** | 7-year minimum retention policy enforced via SharePoint retention labels | Meets regulatory compliance (SOX, FINRA, SEC) |
| **Referential Integrity** | Attorney field must be valid M365 user, SubmissionItem must exist in SubmissionItems list | Prevents broken references and invalid data |

---

## 11. Non-Functional Requirements

### 11.1 Performance

| Metric | Target |
|--------|--------|
| Page Load Time (Form) | ≤6 seconds |
| Document Upload (10MB) | ≤10 seconds |
| Search Results | ≤3 seconds |
| Notification Delivery | ≤2 minutes |
| Power Automate Flow Execution | ≤30 seconds |
| Azure Function Response | ≤5 seconds |
| Concurrent User Support | 50 users |

### 11.2 Scalability

| Resource | Capacity | Implementation Strategy |
|----------|----------|------------------------|
| **Annual Request Volume** | Up to 10,000 requests per year | List indexing, optimized queries, caching |
| **Total Requests** | Up to 50,000 requests (5-year horizon) | SharePoint list threshold management, list views with filters |
| **Document Storage** | Up to 200,000 documents | Document library with metadata, organized by RequestID folders |
| **Active Users** | Up to 200 concurrent users | Load balancing via SharePoint Online, optimized SPFx bundle size |
| **Performance Optimization** | SharePoint list indexing on Status, SubmittedOn, Attorney, TargetReturnDate, RequestID | Indexed columns for faster filtering and sorting |
| **Archival Strategy** | Requests >2 years old moved to archive list (Phase 2) | Automated Power Automate flow, retention policies |

### 11.3 Availability

| Aspect | Details |
|--------|---------|
| **Business Hours** | Monday-Friday, 7 AM - 7 PM Eastern Time (ET) |
| **Target Availability** | 99.5% during business hours |
| **Service Dependencies** | SharePoint Online (99.9% SLA), Power Automate (99.9% SLA), Azure Functions (99.95% SLA) |
| **Overall Availability** | Dependent on Microsoft 365 platform SLAs |
| **Fallback Procedure** | Email submissions to Legal Admin group during outages; requests entered manually when system restored |
| **Monitoring** | Microsoft 365 Admin Center health dashboard, Azure Application Insights for custom telemetry |

### 11.4 Security

| Security Layer | Implementation |
|----------------|----------------|
| **Authentication** | Microsoft Entra ID (Azure AD) with Multi-Factor Authentication (MFA) required for all users |
| **Authorization** | Role-Based Access Control (RBAC) via SharePoint groups; item-level permissions managed by Azure Functions |
| **Data Protection** | AES-256 encryption at rest (SharePoint storage); TLS 1.2+ in transit (all API calls) |
| **Input Validation** | XSS prevention (React escaping, DOMPurify); file upload validation (type, size); malware scanning (SharePoint ATP) |
| **Audit & Compliance** | 100% of actions logged to AuditLog list; 7-year retention; annual penetration testing; quarterly security reviews |
| **Principle of Least Privilege** | Users granted minimum permissions required for role; no global admin access for regular operations |

### 11.5 Compliance

| Compliance Requirement | Regulation | Implementation |
|------------------------|-----------|----------------|
| **Audit Trail** | SOX | Complete audit trail for all actions; immutable AuditLog list; version history on lists and libraries |
| **Segregation of Duties** | SOX | Role-based permissions; submitters cannot approve own requests; attorneys cannot modify submissions |
| **Communication Review** | FINRA | Complete record of legal/compliance reviews; approvals documented with date, approver, supporting document |
| **Recordkeeping** | SEC | 7-year retention policy; all requests, documents, comments, and audit logs preserved |
| **Data Subject Rights** | GDPR | Right to access (data export); right to erasure (manual process with Legal Admin approval) |

**Compliance Reporting:**

| Report Type | Frequency | Owner |
|-------------|-----------|-------|
| **Approvals Completeness Report** | Monthly | Legal Admin |
| **SLA Compliance Report** | Monthly | Legal Admin |
| **Audit Trail Review** | Quarterly | Legal Admin + Compliance |
| **External Audit** | Annual | Independent auditor |

### 11.6 Usability

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Time to First Request** | New users submit first request within 10 minutes | Track time from account creation to first successful submission |
| **Average Submission Time** | <5 minutes per request | Track time from form open to submission |
| **Error Rate** | <5% on first submission attempt | Track validation errors requiring correction |
| **User Satisfaction** | ≥80% satisfaction rating | Post-deployment survey (quarterly) |
| **System Usability Scale (SUS)** | ≥70 score | Standardized SUS questionnaire (semi-annual) |
| **Training & Support** | Role-based guides, video tutorials, in-app help, monthly office hours | User feedback, support ticket volume, help resource usage analytics |

### 11.7 Browser Support

| Browser | Minimum Version | Support Level | Notes |
|---------|----------------|---------------|-------|
| **Chrome** | 90+ | Recommended | Primary development and testing browser |
| **Edge** | 90+ (Chromium-based) | Fully Supported | Chromium engine ensures compatibility |
| **Firefox** | 85+ | Fully Supported | Tested on quarterly basis |
| **Safari** | 14+ | Fully Supported | macOS and iOS; tested on major releases |
| **Internet Explorer 11** | N/A | NOT Supported | Microsoft ended support; users redirected to download Edge |

---

## 12. Status Transition Matrix

| From Status | To Status | Trigger | Authorized Roles |
|-------------|-----------|---------|------------------|
| Draft | Legal Intake | Submit Request | Submitter |
| Draft | Cancelled | Delete Draft | Submitter |
| Legal Intake | In Review | Assign Attorney (direct) | Legal Admin |
| Legal Intake | Assign Attorney | Send to Committee | Legal Admin |
| Legal Intake | Cancelled/On Hold | Cancel/Hold | Legal Admin |
| Assign Attorney | In Review | Assign Attorney | Attorney Assigner |
| Assign Attorney | Cancelled/On Hold | Cancel/Hold | Legal Admin |
| In Review | Closeout | All reviews Approved | System (auto) |
| In Review | Completed | Any review Not Approved | System (auto) |
| In Review | Cancelled/On Hold | Cancel/Hold | Legal Admin |
| Closeout | Completed | Complete Request | Submitter |
| Closeout | Cancelled/On Hold | Cancel/Hold | Legal Admin |
| On Hold | [Previous Status] | Resume Request | Legal Admin |
| Completed | - | Terminal state | - |
| Cancelled | - | Terminal state | - |

**Business Rules:**

| Transition | Automated Actions | Business Logic |
|------------|-------------------|----------------|
| **Draft → Legal Intake** | Generate Request ID (CRR-YYYY-####), break item permissions via Azure Function, send notification to Legal Admin | Validation: All required fields completed, minimum 1 approval, minimum 1 document uploaded |
| **In Review → Closeout** | Send notification to Submitter | Condition: All required reviews completed with outcome = Approved OR Approved With Comments |
| **In Review → Completed** | Send notification to all stakeholders | Condition: ANY required review outcome = Not Approved (bypasses Closeout stage) |
| **Any → On Hold** | Store PreviousStatus field, send notification to all stakeholders | Legal Admin provides HoldReason; PreviousStatus used for Resume |
| **On Hold → [Previous]** | Restore status from PreviousStatus field, send notification to active participants | Legal Admin can resume; returns to stored PreviousStatus |

---

## 13. Permission & Security Matrix

| Status | Submitter | Legal Admin | Attorney Assigner | Assigned Attorney | Compliance Users | LW - Admin |
|--------|-----------|-------------|-------------------|-------------------|------------------|------------|
| **Draft** | Full Control (own) | Full Control | - | - | - | Full Control |
| **Legal Intake** | Read | Full Control | Read | - | - | Full Control |
| **Assign Attorney** | Read | Full Control | Edit (assign only) | - | - | Full Control |
| **In Review (Legal)** | Read* | Full Control | Read | Edit (review only) | - | Full Control |
| **In Review (Compliance/Both)** | Read* | Full Control | Read | Edit (review only) | Edit (review only) | Full Control |
| **Closeout** | Edit (closeout only) | Full Control | - | Read | Read | Full Control |
| **Completed/Cancelled** | Read | Full Control | Read | Read | Read | Full Control |

\* Can upload documents if Waiting On Submitter

**Key Points:**

| Aspect | Details |
|--------|---------|
| **Permission Breaking** | Item permissions broken when Draft → Legal Intake (via Azure Function API call) |
| **Dynamic Updates** | Permissions updated automatically when status changes or attorney assigned |
| **Ad-hoc Stakeholders** | Legal Admin can manually add read-only observers to specific requests |
| **Inheritance** | Draft items inherit site permissions; all other statuses have item-level permissions |

---

## 14. Notification Templates Summary

15 notification types with HTML templates stored in SharePoint "EmailTemplates" library:

| # | Notification Type | Trigger | Recipients | Description |
|---|-------------------|---------|------------|-------------|
| 1 | Request Submitted | Draft → Legal Intake | Legal Admin | Notifies Legal Admin that a new request has been submitted and requires triage. Includes rush flag indicator and target return date for prioritization. |
| 2 | Attorney Assigned (Direct) | Legal Intake → In Review (direct) | Assigned Attorney | Informs attorney that they have been directly assigned to review a request by Legal Admin. Includes assignment notes explaining why they were selected and request context. |
| 3 | Sent to Committee | Legal Intake → Assign Attorney | Attorney Assigner group | Alerts the Attorney Assigner Committee that a request requires attorney assignment. Includes Legal Admin's context notes to help committee make informed assignment decision. |
| 4 | Attorney Assigned (Committee) | Assign Attorney → In Review | Assigned Attorney | Notifies attorney that they have been assigned to a request by the Attorney Assigner Committee. Includes assignment notes and committee's reasoning for the selection. |
| 5 | Compliance Review Required | Review Audience includes Compliance | Compliance Users | Informs Compliance team that their review is required on a request. Sent when ReviewAudience is set to "Compliance" or "Both" during Legal Intake. |
| 6 | Attorney Reassigned | Attorney field changed | Old & New Attorney | Notifies both the previous and newly assigned attorney when a request is reassigned. Includes reason for reassignment and current request status. |
| 7 | Waiting On Submitter | Review Status → Waiting On Submitter | Submitter | Alerts submitter that the reviewer needs additional information or clarification. Includes reviewer's comments detailing what is required to proceed. |
| 8 | Submitter Response | Document uploaded while Waiting On Submitter | Attorney/Compliance | Notifies reviewer that submitter has provided requested information or uploaded new documents. Includes submitter's response comment explaining the updates. |
| 9 | Review Completed (Single) | Review outcome → Completed | Submitter, Legal Admin | Informs submitter and Legal Admin that a review (Legal or Compliance) has been completed. Includes review outcome and any comments or conditions from the reviewer. |
| 10 | Ready for Closeout | Status → Closeout | Submitter | Notifies submitter that all reviews are approved and request is ready for closeout. Indicates if Tracking ID is required based on compliance flags. |
| 11 | Request Completed | Status → Completed | All stakeholders | Informs all participants that the request has been fully completed. Includes final status, total turnaround time, and completion details. |
| 12 | Request Cancelled | Status → Cancelled | All stakeholders | Notifies all participants that the request has been cancelled. Includes who cancelled, when, and the reason for cancellation. |
| 13 | Request On Hold | Status → On Hold | All stakeholders | Alerts all participants that the request has been placed on hold. Includes who placed it on hold, when, and the reason requiring the pause. |
| 14 | Request Resumed | On Hold → Previous Status | Active participants | Notifies relevant participants that a request has been resumed from hold status. Indicates the restored status and any notes about the resumption. |
| 15 | User Tagged in Comment | @mention in comment | Tagged user | Alerts user when they are @mentioned in a comment thread. Automatically grants read access if user doesn't already have permissions to view the request. |

**Template Structure:**

| Component | Content |
|-----------|---------|
| **Header** | Company logo, "Legal Workflows System" branding |
| **Body** | Greeting, context paragraph, request summary table (RequestID, Title, Status, Submitter, Target Date), call-to-action button ("View Request") |
| **Footer** | Support contact email, system links, confidentiality notice |

**Template Placeholders:** {RequestID}, {RequestTitle}, {Submitter}, {TargetReturnDate}, {RushFlag}, {Status}, {Attorney}, {ReviewerNotes}, {TrackingID}, {RequestURL}, {CurrentUser}, {CompanyName}

---

## 15. Approval Workflow Details

### 15.1 Approval Types (6 Total)

| Type | Description | Typical Approver |
|------|-------------|------------------|
| Communications Approval | Messaging, tone, brand compliance | Communications Director |
| Portfolio Manager Approval | Investment strategy, portfolio composition | Portfolio Manager, CIO |
| Research Analyst Approval | Research findings, data accuracy | Senior Research Analyst |
| SME Approval | Technical accuracy, subject matter | Product Specialist, Technical Expert |
| Performance Review Approval | Performance data accuracy, methodology | Performance Analyst |
| Other Approval | Custom approval (user specifies title) | Varies |

### 15.2 Approval Requirements

Each approval must include the following components:

| Component | Field Type | Validation | Required |
|-----------|-----------|------------|----------|
| **Approval Type** | Dropdown (Choice) | Must select one of 6 types | Yes |
| **Custom Approval Title** | Single Line Text | Required only if "Other Approval" selected; 3-100 characters | Conditional |
| **Approval Date** | Date | Cannot be future date; must be ≤ today | Yes |
| **Approver** | Person (M365 user) | Must be valid M365 user in organization | Yes |
| **Approval Document** | File Upload (Hyperlink) | File types: PDF, DOCX, XLSX, MSG, PNG, JPG; Max size: 250MB | Yes |

**Business Rules:**

| Rule | Description |
|------|-------------|
| **Minimum Approvals** | At least 1 complete approval required before submission |
| **Completeness Check** | All 5 components must be provided (incomplete approvals block submission) |
| **Document Storage** | Approval documents stored in RequestDocuments library with ApprovalType metadata |
| **Immutability** | Approval documents never deleted, even if request cancelled (audit requirement) |
| **Multiple Approvals** | Up to 6 approvals can be added per request (one of each type) |

---

## 16. Appendices

### Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Business Days** | Monday-Friday, excluding weekends (Phase 1); weekends and holidays (Phase 2) |
| **Expected Turnaround Date** | System-calculated SLA date based on Submission Item turnaround time |
| **Legal Intake** | Initial workflow stage where Legal Admin triages request and assigns attorney |
| **Request ID** | Auto-generated unique identifier: CRR-{YEAR}-{COUNTER} |
| **Rush Request** | Request flagged for expedited processing (Target Date < Expected Date) |
| **Tracking ID** | Foreside (or similar) identifier required for certain compliance materials |

### Appendix B: Acronyms

| Acronym | Full Term |
|---------|-----------|
| **ATP** | Advanced Threat Protection |
| **BRD** | Business Requirements Document |
| **CRR** | Communication Review Request |
| **FINRA** | Financial Industry Regulatory Authority |
| **FRD** | Functional Requirements Document |
| **FSD** | Functional Specification Document |
| **HLD** | High-Level Design Document |
| **LW** | Legal Workflows |
| **M365** | Microsoft 365 |
| **MFA** | Multi-Factor Authentication |
| **RBAC** | Role-Based Access Control |
| **SEC** | Securities and Exchange Commission |
| **SLA** | Service Level Agreement |
| **SME** | Subject Matter Expert |
| **SOX** | Sarbanes-Oxley |
| **SPFx** | SharePoint Framework |
| **TDD** | Technical Design Document |
| **WCAG** | Web Content Accessibility Guidelines |

### Appendix C: References

1. Business Requirements Document (BRD): `legal-workflows-brd-draft.md`
2. Functional Requirements Document (FRD): `legal-workflow-frd.md`
3. High-Level Design Document (HLD): `legal-workflow-hld.md`
4. Technical Design Document (TDD): `legal-workflow-tdd.md`
5. System Readme: `legal-review-system-readme.md`

### Appendix D: Sign-Off

| Stakeholder | Role | Signature | Date |
|-------------|------|-----------|------|
| [Name] | Legal Department Sponsor | _______________ | ______ |
| [Name] | Compliance Department Sponsor | _______________ | ______ |
| [Name] | IT Department Sponsor | _______________ | ______ |
| [Name] | Project Manager | _______________ | ______ |

**Approval Status:** ☐ Draft | ☐ Under Review | ☐ Approved | ☐ Rejected

---

**END OF DOCUMENT**

**Total Pages:** Approximately 25-30 (formatted)
**Document Status:** v1.0 Draft for Review
