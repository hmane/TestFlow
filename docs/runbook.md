# Legal Review System (LRS) - SharePoint Admin Runbook

> **Version:** 1.0
> **Last Updated:** March 2026
> **Audience:** SharePoint Administrators
> **Escalation:** Development Team (see Section 12)

---

## Table of Contents

1. [Application Overview](#1-application-overview)
2. [Site Architecture](#2-site-architecture)
3. [SharePoint Groups & Permissions](#3-sharepoint-groups--permissions)
4. [List Schemas & Field Reference](#4-list-schemas--field-reference)
5. [Configuration Management](#5-configuration-management)
6. [Workflow Statuses & Transitions](#6-workflow-statuses--transitions)
7. [Notification Templates](#7-notification-templates)
8. [Azure Functions Integration](#8-azure-functions-integration)
9. [Document Management](#9-document-management)
10. [Common Admin Tasks & Procedures](#10-common-admin-tasks--procedures)
11. [Troubleshooting Guide](#11-troubleshooting-guide)
12. [Deployment & Provisioning](#12-deployment--provisioning)
13. [Escalation Procedures](#13-escalation-procedures)
14. [Appendix A: Quick Reference Card](#appendix-a)
15. [Appendix B: SPFx Components — Web Parts, Form Customizers & Field Customizers](#appendix-b-spfx-components--web-parts-form-customizers--field-customizers)
16. [Appendix C: Lists & Libraries Reference](#appendix-c-lists--libraries-reference)
17. [Appendix D: Request Flow — Events on Create & Modify](#appendix-d-request-flow--events-on-create--modify)

---

## 1. Application Overview

### What Is LRS?

The Legal Review System (LRS) is a SharePoint Framework (SPFx) Form Customizer extension that automates legal and compliance review workflows for marketing communications. It replaces manual email-based tracking with a centralized, auditable SharePoint system.

### Key Capabilities

- Automated routing of review requests through Legal and/or Compliance teams
- Enforced documentation and approval collection
- Real-time status tracking with audit trail
- Role-based access control with item-level permissions
- Email notifications at every workflow stage
- Time tracking for review stages (business hours)
- Document management with structured folder hierarchy

### Solution Details

| Property | Value |
|----------|-------|
| **Solution ID** | `877d48f8-af3b-4965-be4c-d9c00cf239b2` |
| **Solution Version** | 1.0.0.0 |
| **Package File** | `legal-workflow.sppkg` |
| **Extension Type** | SPFx Form Customizer |
| **Target List** | Requests |

### User Roles Summary

| Role | Group | Primary Actions |
|------|-------|-----------------|
| Submitter | LW - Submitters | Create requests, upload documents, closeout |
| Legal Admin | LW - Legal Admin | Triage, assign attorneys, override settings |
| Attorney Assigner | LW - Attorney Assigner | Committee-based attorney assignment |
| Attorney | LW - Attorneys | Legal review of assigned requests |
| Compliance User | LW - Compliance Users | Compliance review |
| Admin | LW - Admin | Full system administration |

---

## 2. Site Architecture

### Lists & Libraries

| List Name | URL | Type | Versioning | Purpose |
|-----------|-----|------|------------|---------|
| **Requests** | `/Lists/Requests` | Generic List (100) | Enabled | Main workflow list (~80 fields) |
| **RequestDocuments** | `/RequestDocuments` | Document Library (101) | Enabled | Approval documents, attachments |
| **SubmissionItems** | `/Lists/SubmissionItems` | Generic List (100) | Enabled | Submission types and turnaround times |
| **Configuration** | `/Lists/Configuration` | Generic List (100) | Enabled | Application settings (key-value) |
| **RequestIds** | `/Lists/RequestIds` | Generic List (100) | Disabled | Hidden - sequential ID generation |
| **Notifications** | `/Lists/Notifications` | Generic List (100) | Enabled | Email notification templates |

### Request ID Format

Request IDs are auto-generated in the format: `{PREFIX}-{YY}-{N}`

| Prefix | Request Type | Example |
|--------|-------------|---------|
| CRR | Communication Review | CRR-26-1, CRR-26-42 |
| GRR | General Review (Phase 2) | GRR-26-1 |
| IMA | IMA Review (Phase 2) | IMA-26-1 |

The `RequestIds` list (hidden) stores the sequence counter per prefix per year.

---

## 3. SharePoint Groups & Permissions

### 3.1 Security Groups

| Group Name | Owner | Member Management | View Membership | Description |
|------------|-------|-------------------|-----------------|-------------|
| **LW - Admin** | Self | Admins only | Members only | Full system access |
| **LW - Submitters** | LW - Admin | Closed | Members only | Create and manage own requests |
| **LW - Legal Admin** | LW - Admin | Closed | Members only | Triage, manage all requests |
| **LW - Attorney Assigner** | LW - Admin | Closed | Members only | Committee attorney assignment |
| **LW - Attorneys** | LW - Admin | Closed | Members only | Legal review of assigned requests |
| **LW - Compliance Users** | LW - Admin | Closed | Members only | Compliance review |

**Group Settings (All Groups):**
- `AllowMembersEditMembership`: false (except LW - Admin: true)
- `AllowRequestToJoinLeave`: false
- `AutoAcceptRequestToJoinLeave`: false
- `OnlyAllowMembersViewMembership`: true

### 3.2 Custom Permission Levels

| Permission Level | Base | Removed Rights | Applied To |
|------------------|------|----------------|------------|
| **Contributor Without Delete** | Contribute | DeleteListItems, DeleteVersions | Attorneys, Compliance Users on Requests |
| **Admin Without Delete** | Full Control | DeleteListItems, DeleteVersions | LW - Admin on Requests |

> **Why no delete?** Audit trail integrity requires that no request can be deleted. Version history must be preserved for compliance. Site Collection Admins can still delete (SharePoint platform constraint) - train them on audit policy.

### 3.3 List-Level Permissions

| List | Inheritance | LW - Admin | LW - Submitters | LW - Legal Admin | LW - Attorneys | LW - Compliance |
|------|-------------|------------|------------------|------------------|----------------|-----------------|
| **Requests** | Broken | Admin Without Delete | Read (+ Contribute on own items) | Contribute Without Delete | Contribute Without Delete | Contribute Without Delete |
| **RequestDocuments** | Broken | Full Control | Read/Contribute (own) | Full Control | Contribute | Contribute |
| **SubmissionItems** | Broken | Full Control | Read | Read | Read | Read |
| **Configuration** | Broken | Full Control | Read | Read | Read | Read |
| **RequestIds** | Inherited | Inherited | Inherited | Inherited | Inherited | Inherited |
| **Notifications** | Inherited | Inherited | Inherited | Inherited | Inherited | Inherited |

> **Important:** Grid editing is disabled on the Requests list (`DisableGridEditing=true`) to prevent accidental bulk modifications.

### 3.4 Item-Level Permissions (Requests)

Item-level permissions are broken when a request transitions from **Draft** to **Legal Intake**:

| Stage | Submitter | Assigned Attorney | Compliance Users | Legal Admin | Admin |
|-------|-----------|-------------------|------------------|-------------|-------|
| **Draft** | Full Control (owner) | N/A | N/A | Full Control | Full Control |
| **Legal Intake** | Read | N/A | N/A | Contribute | Full Control |
| **In Review** | Read | Contribute Without Delete | Contribute Without Delete | Contribute | Full Control |
| **Closeout** | Contribute (closeout fields) | Read | Read | Contribute | Full Control |
| **Completed** | Read | Read | Read | Read | Full Control |

### 3.5 Derived Permissions (Application-Level)

These permissions are calculated at runtime and control UI visibility:

| Permission | Granted To |
|------------|-----------|
| `canCreateRequest` | Submitters, Admin |
| `canViewAllRequests` | Legal Admin, Attorney Assigner, Attorneys, Compliance Users, Admin |
| `canAssignAttorney` | Legal Admin, Attorney Assigner, Admin |
| `canReviewLegal` | Attorneys, Legal Admin, Admin |
| `canReviewCompliance` | Compliance Users, Admin |
| `canCloseout` | Legal Admin, Admin (submitter for own request) |
| `canCancel` | Legal Admin, Admin (submitter for own Draft) |
| `canHold` | Legal Admin, Admin |

---

## 4. List Schemas & Field Reference

### 4.1 Requests List (~80 Fields)

#### System (1 field)

| Internal Name | Display Name | Type | Required | Notes |
|---------------|--------------|------|----------|-------|
| Title | Request ID | Text | Yes | Auto-generated (CRR-26-1 format), has field customizer |

#### Request Information (17 fields)

| Internal Name | Display Name | Type | Required | Max Length | Notes |
|---------------|--------------|------|----------|------------|-------|
| Department | Department | Text | No | 100 | Auto-populated, hidden from form |
| RequestType | Request Type | Choice | Yes | - | `Communication`, `General Review`, `IMA Review` |
| RequestTitle | Request Title | Text | Yes | 255 | 3-255 characters |
| Purpose | Purpose | Note | Yes | - | Multi-line, 6 lines, no rich text |
| SubmissionType | Submission Type | Choice | Yes | - | `New`, `Material Updates` |
| SubmissionItem | Submission Item | Text | Yes | 255 | Linked to SubmissionItems list |
| DistributionMethod | Distribution Method | MultiChoice | No | - | Fill-In enabled. Choices: `Dodge & Cox Website - U.S.`, `Dodge & Cox Website - Non-U.S.`, `Third Party Website`, `Email / Mail`, `Mobile App`, `Display Card / Signage`, `Handout`, `Live - Talking Points`, `Social Media`, `Internal Use Only` |
| TargetReturnDate | Target Return Date | DateTime | Yes | - | Future dates only, has field customizer |
| IsRushRequest | Is Rush Request | Boolean | No | - | Auto-calculated, badge formatting |
| RushRationale | Rush Rationale | Note | Conditional | - | Required if IsRushRequest = Yes (min 10 chars) |
| ReviewAudience | Review Audience | Choice | Yes | - | `Legal`, `Compliance`, `Both` (overridable by Legal Admin) |
| ContentId | Content Id | Text | No | 255 | Business Tracking / Content Id |
| PriorSubmissions | Prior Submissions | LookupMulti | No | - | Links to other Requests |
| PriorSubmissionNotes | Prior Submission Notes | Note | No | - | Multi-line, 6 lines |
| DateOfFirstUse | Date of First Use | DateTime | No | - | Informational |
| AdditionalParty | Additional Party | UserMulti | No | - | People only |

#### FINRA Audience & Product (7 fields)

| Internal Name | Display Name | Type | Required | Notes |
|---------------|--------------|------|----------|-------|
| FINRAAudienceCategory | FINRA Audience Category | MultiChoice | No | `Institutional`, `Retail / Public` |
| Audience | Audience | MultiChoice | No | Fill-In enabled. `Prospective Separate Acct Client`, `Existing Separate Acct Client`, `Prospective Fund Shareholder`, `Existing Fund Shareholder`, `Consultant` |
| USFunds | U.S. Funds | MultiChoice | No | `All Funds`, `Balanced Fund`, `EM Stock Fund`, `Global Stock Fund`, `Income Fund`, `International Stock Fund`, `Stock Fund`, `Global Bond Fund` |
| USFundShares | U.S. Fund Shares | MultiChoice | No | `I Shares`, `X Shares` |
| UCITS | UCITS | MultiChoice | No | `All UCITS Funds`, `EM Stock Fund`, `Global Bond Fund`, `Global Stock Fund`, `U.S. Stock Fund` |
| SeparateAcctStrategies | Separate Account Strategies | MultiChoice | No | `All Separate Account Strategies`, `Equity`, `Fixed Income`, `Balanced` |
| SeparateAcctStrategiesIncl | Separate Acct Strategies Includes | MultiChoice | No | `Client-related data only`, `Representative account`, `Composite data` |

#### Approvals (25 fields)

Each approval type has the following structure:

| Field Pattern | Type | Notes |
|---------------|------|-------|
| `Has{Type}Approval` or `RequiresCommunicationsApproval` | Boolean | Whether this approval was provided |
| `{Type}ApprovalDate` | DateTime | When approval was given |
| `{Type}Approver` or `{Type}` (Person) | User | Who approved |
| `{Type}ApprovalNotes` | Note | Approval notes |

**Approval Types:**
1. Communications (+ `CommunicationsOnly` boolean)
2. Portfolio Manager
3. Research Analyst
4. Subject Matter Expert (SME)
5. Performance
6. Other (+ `OtherApprovalTitle` text field)

#### Legal Intake (2 fields)

| Internal Name | Display Name | Type | Required | Notes |
|---------------|--------------|------|----------|-------|
| Attorney | Attorney | UserMulti | No | Assigned by Legal Admin |
| AttorneyAssignNotes | Attorney Assign Notes | Note | No | Append-only (versioned) |

#### Legal Review (7 fields)

| Internal Name | Display Name | Type | Required | Notes |
|---------------|--------------|------|----------|-------|
| LegalReviewStatus | Legal Review Status | Choice | No | `Not Required`, `Not Started`, `In Progress`, `Waiting On Submitter`, `Waiting On Attorney`, `Completed` |
| LegalStatusUpdatedOn | Legal Status Updated On | DateTime | No | Auto-set on status change |
| LegalStatusUpdatedBy | Legal Status Updated By | User | No | Auto-set on status change |
| LegalReviewOutcome | Legal Review Outcome | Choice | No | `Approved`, `Approved With Comments`, `Respond To Comments And Resubmit`, `Not Approved` |
| LegalReviewNotes | Legal Review Notes | Note | No | Append-only (versioned) |
| LegalReviewCompletedOn | Legal Review Completed On | DateTime | No | Auto-set on completion |
| LegalReviewCompletedBy | Legal Review Completed By | User | No | Auto-set on completion |

#### Compliance Review (10 fields)

| Internal Name | Display Name | Type | Required | Notes |
|---------------|--------------|------|----------|-------|
| ComplianceReviewStatus | Compliance Review Status | Choice | No | `Not Required`, `Not Started`, `In Progress`, `Waiting On Submitter`, `Waiting On Compliance`, `Completed` |
| ComplianceStatusUpdatedOn | Compliance Status Updated On | DateTime | No | Auto-set |
| ComplianceStatusUpdatedBy | Compliance Status Updated By | User | No | Auto-set |
| ComplianceReviewOutcome | Compliance Review Outcome | Choice | No | Same choices as Legal |
| ComplianceReviewNotes | Compliance Review Notes | Note | No | Append-only |
| IsForesideReviewRequired | Is Foreside Review Required | Boolean | No | Controls FINRA fields visibility |
| RecordRetentionOnly | Record Retention Only | Boolean | No | Visible only when IsForesideReviewRequired = true |
| IsRetailUse | Is Retail Use | Boolean | No | Visible only when IsForesideReviewRequired = true |
| ComplianceReviewCompletedOn | Compliance Review Completed On | DateTime | No | Auto-set |
| ComplianceReviewCompletedBy | Compliance Review Completed By | User | No | Auto-set |

#### Closeout (4 fields)

| Internal Name | Display Name | Type | Required | Notes |
|---------------|--------------|------|----------|-------|
| TrackingId | Tracking ID | Text | Conditional | Required if IsForesideReviewRequired = true. Free text, max 50 chars |
| CloseoutNotes | Closeout Notes | Note | No | Max 2,000 chars |
| CommentsAcknowledged | Comments Acknowledged | Boolean | No | Required if outcome = Approved With Comments |
| CommentsAcknowledgedOn | Comments Acknowledged On | DateTime | No | Auto-set |

#### FINRA Documents (6 fields)

| Internal Name | Display Name | Type | Required | Notes |
|---------------|--------------|------|----------|-------|
| FINRACompletedBy | FINRA Completed By | User | No | Auto-set |
| FINRACompletedOn | FINRA Completed On | DateTime | No | Auto-set |
| FINRANotes | FINRA Notes | Note | No | Append-only |
| AwaitingFINRASince | Awaiting FINRA Since | DateTime | No | Auto-set when entering Awaiting FINRA Documents |
| FINRACommentsReceived | FINRA Comments Received | Boolean | No | Controls FINRA Comment field visibility |
| FINRAComment | FINRA Comment | Note | No | Visible only when FINRACommentsReceived = true |

#### System Tracking (19 fields)

| Internal Name | Display Name | Type | Notes |
|---------------|--------------|------|-------|
| Status | Status | Choice | `Draft`, `Legal Intake`, `Assign Attorney`, `In Review`, `Closeout`, `Awaiting FINRA Documents`, `Completed`, `Cancelled`, `On Hold` |
| SubmittedBy | Submitted By | User | Auto-set |
| SubmittedOn | Submitted On | DateTime | Auto-set |
| SubmittedToAssignAttorneyBy | Submitted To Assign Attorney By | User | Auto-set |
| SubmittedToAssignAttorneyOn | Submitted To Assign Attorney On | DateTime | Auto-set |
| SubmittedForReviewBy | Submitted For Review By | User | Auto-set |
| SubmittedForReviewOn | Submitted For Review On | DateTime | Auto-set |
| CloseoutBy | Closeout By | User | Auto-set |
| CloseoutOn | Closeout On | DateTime | Auto-set |
| CancelledBy | Cancelled By | User | Auto-set |
| CancelledOn | Cancelled On | DateTime | Auto-set |
| CancelReason | Cancel Reason | Note | Required on cancellation, max 1,000 chars |
| OnHoldBy | On Hold By | User | Auto-set |
| OnHoldSince | On Hold Since | DateTime | Auto-set |
| OnHoldReason | On Hold Reason | Note | Required on hold, max 1,000 chars |
| PreviousStatus | Previous Status | Text | Stored for Resume from Hold |
| TotalTurnaroundDays | Total Turnaround Days | Number | Calculated |
| ExpectedTurnaroundDate | Expected Turnaround Date | DateTime | Calculated |
| AdminOverrideNotes | Admin Override Notes | Note | Append-only |

#### Time Tracking (10 fields)

| Internal Name | Display Name | Type | Notes |
|---------------|--------------|------|-------|
| LegalIntakeLegalAdminHours | Legal Intake - Legal Admin Hours | Number | 2 decimals |
| LegalIntakeSubmitterHours | Legal Intake - Submitter Hours | Number | 2 decimals |
| LegalReviewAttorneyHours | Legal Review - Attorney Hours | Number | 2 decimals |
| LegalReviewSubmitterHours | Legal Review - Submitter Hours | Number | 2 decimals |
| ComplianceReviewReviewerHours | Compliance Review - Reviewer Hours | Number | 2 decimals |
| ComplianceReviewSubmitterHours | Compliance Review - Submitter Hours | Number | 2 decimals |
| CloseoutReviewerHours | Closeout - Reviewer Hours | Number | 2 decimals |
| CloseoutSubmitterHours | Closeout - Submitter Hours | Number | 2 decimals |
| TotalReviewerHours | Total Reviewer Hours | Number | 2 decimals |
| TotalSubmitterHours | Total Submitter Hours | Number | 2 decimals |

### 4.2 SubmissionItems List

| Internal Name | Display Name | Type | Required | Notes |
|---------------|--------------|------|----------|-------|
| Title | Title | Text | Yes | Submission item name |
| TurnAroundTimeInDays | Turn Around Time In Days | Number | Yes | Business days for standard review |
| Description | Description | Note | No | Item description |
| DisplayOrder | Display Order | Number | No | Sort order for dropdown |

**Default Data:**

| Title | Turnaround (Days) | Display Order |
|-------|-------------------|---------------|
| New Exhibit | 3 | 10 |
| Updated Exhibit | 2 | 20 |
| Insights Paper | 5 | 30 |
| Website Update - Substantial (4+ pages) | 5 | 40 |
| Website Update - Non-Substantial (1-3 pages) | 5 | 50 |
| Email Blast | 1 | 60 |
| FAQ/Talking Points | 3 | 70 |
| Shareholder Letter (Final Review) | 1 | 80 |
| Separate Account Letter (Final Review) | 1 | 90 |
| Investment Commentary (Final Review) | 1 | 100 |
| Standard Mutual Fund Presentation | 2 | 110 |
| Client-Specific Mutual Fund Presentation | 2 | 120 |
| Custom Presentation | 2 | 130 |
| Fact Sheet | 3 | 140 |
| Shareholder Report (Annual/Semi-Annual) | 5 | 150 |
| RFP Related Review Substantial (Multiple Pages) | 3 | 160 |
| RFP Related Review Substantial (1 Page) | 1 | 170 |
| Social Media | 3 | 180 |
| Other | 3 | 190 |

> **Admin Note:** To add a new submission type, add a new item to this list. The application reads from this list dynamically. No code change is required.

### 4.3 Configuration List

| Internal Name | Display Name | Type | Notes |
|---------------|--------------|------|-------|
| Title | Title | Text | Configuration key |
| ConfigValue | Config Value | Note | Configuration value |
| Description | Description | Note | Description of the setting |
| Category | Category | Choice | `Integration`, `Limits`, `Features`, `TimeTracking`, `Search`, `FileUpload` |
| IsActive | Is Active | Boolean | Must be true for setting to be used |

**Default Configuration Items:**

| Key | Default Value | Category | Description |
|-----|---------------|----------|-------------|
| WorkingHoursStart | 8 | TimeTracking | Start of business day (hour, PST/PDT) |
| WorkingHoursEnd | 17 | TimeTracking | End of business day (hour, PST/PDT) |
| WorkingDays | 1,2,3,4,5 | TimeTracking | Working days (1=Mon, 5=Fri) |
| maxFileSizeMB | 250 | FileUpload | Maximum upload file size in MB |
| allowedFileExtensions | .pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.zip | FileUpload | Allowed file extensions |
| SearchResultLimit | 10 | Search | Max search results shown |
| RecentSearchesLimit | 5 | Search | Max recent searches stored |
| ApimBaseUrl | *(set on deployment)* | Integration | Azure API Management base URL |
| ApimApiClientId | *(set on deployment)* | Integration | Azure AD Client ID for API |

> **Admin Note:** Changes to Configuration values take effect within 5 minutes (cache TTL). To force immediate refresh, users can reload their browser.

### 4.4 RequestDocuments Library

| Internal Name | Display Name | Type | Notes |
|---------------|--------------|------|-------|
| DocumentType | Document Type | Choice | `Review`, `Supplemental`, `Communication Approval`, `Portfolio Manager Approval`, `Research Analyst Approval`, `Subject Matter Expert Approval`, `Performance Approval`, `Other Approval`, `Review Final` |
| Request | Request | Lookup | Links document to Requests list item |

### 4.5 Column Formatting (Visual Indicators)

| Field | Formatting |
|-------|-----------|
| **Status** | Color-coded pills: Draft (Gray), Legal Intake (Blue), Assign Attorney (Blue), In Review (Blue), Closeout (Gold), Awaiting FINRA (Gold), Completed (Green), Cancelled (Red), On Hold (Orange) |
| **IsRushRequest** | Warning icon with "RUSH" badge (red) when true, hidden when false |
| **TargetReturnDate** | Red text for overdue, orange for within 24 hours, black for future |
| **Review Status** | Color-coded dots matching review status |
| **Review Outcome** | Color-coded badges matching outcome |

---

## 5. Configuration Management

### 5.1 Modifying Configuration

To update an application setting:

1. Navigate to **Site Contents > Configuration** list
2. Find the configuration item by Title
3. Edit the **ConfigValue** field
4. Ensure **IsActive** is checked
5. Save the item
6. Wait up to 5 minutes for cache to refresh (or instruct users to refresh browser)

### 5.2 Adding a New Submission Item

1. Navigate to **Site Contents > SubmissionItems** list
2. Click **+ New**
3. Fill in:
   - **Title**: Name of the submission type
   - **TurnAroundTimeInDays**: Standard business days for review
   - **Description**: Brief description
   - **DisplayOrder**: Numeric sort order (use gaps like 10, 20, 30 for future inserts)
4. Save - the new item appears in the form dropdown immediately

### 5.3 Modifying Working Hours

Update the following Configuration list items:

| Key | What to Change | Example |
|-----|---------------|---------|
| WorkingHoursStart | Business day start hour (24h format) | 9 |
| WorkingHoursEnd | Business day end hour (24h format) | 18 |
| WorkingDays | Comma-separated day numbers (1=Mon, 7=Sun) | 1,2,3,4,5 |

> **Impact:** Changes affect time tracking calculations for all new stage transitions. Existing calculated hours are not retroactively updated.

### 5.4 Managing File Upload Limits

| Key | What to Change | Default |
|-----|---------------|---------|
| maxFileSizeMB | Maximum file size in MB | 250 |
| allowedFileExtensions | Comma-separated extensions | .pdf,.doc,.docx,... |

> **Note:** SharePoint has a platform maximum of 250MB per file. Setting this higher has no effect.

---

## 6. Workflow Statuses & Transitions

### 6.0 Request Lifecycle — End-to-End Flow

A request moves through the following stages from creation to completion:

**1. Draft** — Submitter creates a new request, fills in request information (title, purpose, submission type, target return date, review audience), uploads documents for review, and provides at least one approval (e.g., Communications, Portfolio Manager). The request remains editable until submitted.

**2. Submit** — Submitter clicks "Submit." The system validates required fields, auto-generates the Request ID (e.g., CRR-26-42), calculates whether the request is a rush, breaks item-level permissions, and notifies the Legal Admin group. Status changes to **Legal Intake**.

**3. Legal Intake** — Legal Admin triages the request. They can override the review audience (Legal, Compliance, or Both) and choose one of two paths:
   - **Direct Assignment** — Legal Admin selects an attorney and assigns directly. Status moves to **In Review**.
   - **Committee Assignment** — Legal Admin sends the request to the Attorney Assigner committee. Status moves to **Assign Attorney**, then to **In Review** once the committee assigns an attorney.

**4. In Review** — The assigned attorney (and/or compliance reviewer, if required) reviews the request. Each reviewer can:
   - **Approve** or **Approve With Comments** — Review is complete. If all required reviews are done with positive outcomes, the request automatically moves to **Closeout**.
   - **Respond To Comments And Resubmit** — Reviewer requests changes. The submitter is notified, updates the request, and resubmits. This cycle can repeat multiple times.
   - **Not Approved** — The request is rejected and moves directly to **Completed**, bypassing Closeout.

   When the review audience is "Both," legal and compliance reviews run in parallel. Both must complete before the request can advance.

**5. Closeout** — The submitter completes the closeout:
   - Acknowledges reviewer comments (if outcome was "Approved With Comments")
   - Uploads final documents showing how comments were addressed
   - Provides a Tracking ID (if FINRA/Foreside review was required)
   - Optionally moves to **Awaiting FINRA Documents** if Foreside review is required, or clicks "Complete Request"

**6. Awaiting FINRA Documents** *(conditional)* — If Foreside/FINRA review was required, the submitter uploads FINRA approval documents, optionally marks whether FINRA comments were received, and then completes the request.

**7. Completed** — Terminal state. All permissions are set to read-only. The full audit trail (field changes, timestamps, review notes, documents) is preserved in version history.

**Special Actions** (available at most stages):
- **On Hold** — Legal Admin or Admin can pause a request. Time tracking stops. Resumes to the previous status.
- **Cancel** — Legal Admin or Admin can cancel a request (submitter can cancel own Draft). Records the reason and notifies all parties.

### 6.1 Status Flow Diagram

```
                                      +-----------+
                                      | Cancelled |
                                      +-----------+
                                           ^
                                           | (from Draft, Legal Intake,
                                           |  Assign Attorney, In Review,
                                           |  Closeout)
                                           |
+-------+    +-------------+    +----------------+    +-----------+
| Draft | -> | Legal Intake | -> | Assign Attorney | -> | In Review |
+-------+    +-------------+    +----------------+    +-----------+
                   |                                     |       |
                   |  (direct assignment)                |       |
                   +------------------------------------+       |
                                                         |       |
                                          +---------+   |       v
                                          | On Hold |<--+   +----------+
                                          +---------+       | Closeout |
                                              |             +----------+
                                              v                  |
                                          (resumes to            v
                                           previous       +------------------+
                                           status)        | Awaiting FINRA   |
                                                          | Documents        |
                                                          +------------------+
                                                                 |
                                                                 v
                                                          +-----------+
                                                          | Completed |
                                                          +-----------+
```

### 6.2 Valid Status Transitions

| From | To | Triggered By | Notes |
|------|----|-------------|-------|
| Draft | Legal Intake | Submitter clicks "Submit" | Breaks item-level permissions |
| Draft | Cancelled | Submitter or Admin | Only from Draft |
| Legal Intake | Assign Attorney | Legal Admin sends to committee | Committee assignment path |
| Legal Intake | In Review | Legal Admin assigns attorney directly | Direct assignment path |
| Legal Intake | On Hold | Legal Admin or Admin | |
| Legal Intake | Cancelled | Legal Admin or Admin | |
| Assign Attorney | In Review | Attorney Assigner assigns attorney | |
| Assign Attorney | On Hold | Legal Admin or Admin | |
| Assign Attorney | Cancelled | Legal Admin or Admin | |
| In Review | Closeout | Auto - all reviews approved/with comments | |
| In Review | Completed | Auto - any review = Not Approved | Bypasses Closeout |
| In Review | On Hold | Legal Admin or Admin | |
| In Review | Cancelled | Legal Admin or Admin | |
| Closeout | Completed | Submitter completes closeout | Normal completion |
| Closeout | Awaiting FINRA Documents | System - FINRA review required | When IsForesideReviewRequired = true |
| Closeout | On Hold | Legal Admin or Admin | |
| Closeout | Cancelled | Legal Admin or Admin | |
| Awaiting FINRA Documents | Completed | Submitter uploads FINRA docs | |
| On Hold | *(Previous Status)* | Legal Admin or Admin resumes | Restores the status it was in before hold |
| Completed | *(none)* | Terminal state | |
| Cancelled | *(none)* | Terminal state | |

### 6.3 Review Outcomes & Their Effects

| Outcome | Effect |
|---------|--------|
| **Approved** | Review complete, moves to next stage |
| **Approved With Comments** | Review complete, submitter must acknowledge comments at Closeout |
| **Respond To Comments And Resubmit** | Back-and-forth cycle: reviewer requests changes, submitter resubmits |
| **Not Approved** | Request moves directly to Completed (bypasses Closeout) |

### 6.4 Respond To Comments And Resubmit Cycle

1. **Reviewer** sets outcome to "Respond To Comments And Resubmit"
   - Review status changes to **Waiting On Submitter**
2. **Submitter** sees warning banner, reviews comments
   - Updates documents/approvals as needed
   - Adds response notes, clicks "Resubmit for Review"
   - Review status changes to **Waiting On Attorney** / **Waiting On Compliance**
3. **Reviewer** receives resubmission notification
   - Can approve, request more changes (repeat cycle), or reject

### 6.5 Rush Request Calculation

A request is flagged as **Rush** if:

```
TargetReturnDate < (RequestedDate + SubmissionItem.TurnAroundTimeInDays)
```

- Calculation uses **business days only** (weekends excluded)
- Company holidays not yet integrated (Phase 2)
- Rush requests trigger a high-importance notification to Legal Admin

### 6.6 Special Rules

| Rule | Details |
|------|---------|
| **RFP Exemption** | Submission items starting with "RFP Related Review Substantial" are exempt from: approval requirements at submission, distribution method requirement, date of first use requirement, and final document upload at closeout |
| **Review Audience Override** | Legal Admin can override the review audience during Legal Intake (e.g., change from "Legal" to "Both") |
| **Tracking ID** | Required at Closeout only if `IsForesideReviewRequired = true` |
| **Comments Acknowledgment** | Required at Closeout if any review outcome = "Approved With Comments" |

---

## 7. Notification Templates

### 7.1 All Notification Templates (19)

#### Submission Notifications

| Template ID | Trigger | Recipients | Subject | Importance |
|-------------|---------|------------|---------|------------|
| RequestSubmitted | Draft -> Legal Intake | LW - Legal Admin group | [Action Required] New Legal Review Request | Normal |
| RushRequestAlert | Draft -> Legal Intake (Rush) | LW - Legal Admin group | [RUSH] Urgent Legal Review Request | High |

#### Assignment Notifications

| Template ID | Trigger | Recipients | Subject | Importance |
|-------------|---------|------------|---------|------------|
| ReadyForAttorneyAssignment | Status -> Assign Attorney | LW - Attorney Assigner group | [Action Required] Attorney Assignment Needed | Normal |
| AttorneyAssigned | Attorney assigned | Assigned Attorney; CC: Submitter | [Action Required] Legal Review Assigned | Normal |
| AttorneyReassigned | Attorney field changed | New Attorney; CC: Submitter, Legal Admin | [Legal Review] Attorney Reassigned | Normal |
| ComplianceReviewRequired | Status -> In Review (compliance needed) | LW - Compliance Users; CC: Submitter | [Compliance Review] Review Required | Normal |

#### Legal Review Notifications

| Template ID | Trigger | Recipients | Subject | Importance |
|-------------|---------|------------|---------|------------|
| LegalReviewApproved | Legal outcome = Approved/With Comments | Submitter; CC: Additional Parties | [Legal Review] Review Complete | Normal |
| LegalChangesRequested | Legal status -> Waiting On Submitter | Submitter; CC: Additional Parties | [Action Required] Changes Requested | High |
| LegalReviewNotApproved | Legal outcome = Not Approved | Submitter; CC: Additional Parties | [Legal Review] Not Approved | Normal |
| ResubmissionReceivedLegal | Legal status -> Waiting On Attorney | Assigned Attorney | [Action Required] Resubmission Received | Normal |

#### Compliance Review Notifications

| Template ID | Trigger | Recipients | Subject | Importance |
|-------------|---------|------------|---------|------------|
| ComplianceReviewApproved | Compliance outcome = Approved/With Comments | Submitter; CC: Additional Parties | [Compliance Review] Review Complete | Normal |
| ComplianceChangesRequested | Compliance status -> Waiting On Submitter | Submitter; CC: Additional Parties | [Action Required] Compliance Changes Requested | High |
| ComplianceReviewNotApproved | Compliance outcome = Not Approved | Submitter; CC: Additional Parties | [Compliance Review] Not Approved | Normal |
| ResubmissionReceivedCompliance | Compliance status -> Waiting On Compliance | LW - Compliance Users | [Action Required] Compliance Resubmission | Normal |

#### Status Change Notifications

| Template ID | Trigger | Recipients | Subject | Importance |
|-------------|---------|------------|---------|------------|
| RequestOnHold | Any -> On Hold | Submitter; CC: Additional Parties | Request Placed On Hold | Normal |
| RequestResumed | On Hold -> Previous Status | Submitter; CC: Additional Parties | Request Resumed | Normal |
| RequestCancelled | Any -> Cancelled | Submitter; CC: Attorney, Additional Parties | Request Cancelled | Normal |
| ReadyForCloseout | In Review -> Closeout | Submitter | Request Ready for Closeout | Normal |
| RequestCompleted | Any -> Completed | Submitter; CC: Additional Parties | Request Completed | Normal |

### 7.2 Template Variables

Templates use Handlebars syntax (`{{variable}}`):

| Variable | Description |
|----------|-------------|
| `{{RequestId}}` | Request ID (e.g., CRR-26-1) |
| `{{RequestTitle}}` | Request title |
| `{{RequestLink}}` | URL to open the request |
| `{{SubmitterName}}` | Request creator display name |
| `{{SubmitterEmail}}` | Request creator email |
| `{{AssignedAttorneyName}}` | Assigned attorney display name |
| `{{AssignedAttorneyEmail}}` | Assigned attorney email |
| `{{TargetReturnDate}}` | Target completion date |
| `{{ReviewAudience}}` | Legal / Compliance / Both |
| `{{Purpose}}` | Request purpose text |
| `{{LegalReviewNotes}}` | Legal reviewer's comments |
| `{{ComplianceReviewNotes}}` | Compliance reviewer's comments |
| `{{DistributionMethod}}` | Selected distribution methods |
| `{{DateOfFirstUse}}` | Date of first use |
| `{{LegalAdminGroup}}` | Legal Admin group email |
| `{{AttorneyAssignerGroup}}` | Attorney Assigner group email |
| `{{ComplianceGroup}}` | Compliance Users group email |

### 7.3 Managing Notifications

**To disable a notification:**
1. Open the Notifications list
2. Find the template by Title (Template ID)
3. Set **IsActive** to `No`
4. Save

**To modify a notification subject or body:**
1. Open the Notifications list
2. Edit the template item
3. Modify the **Subject** or **Body** (HTML) field
4. Save - changes take effect on the next trigger

> **Important:** Do not change the **Title** (Template ID) field. The application matches templates by this ID.

---

## 8. Azure Functions Integration

### 8.1 Overview

Azure Functions handle permission management when item-level permissions need to be set. They are called via Azure API Management (APIM).

**Current Status:** Feature flag `AZURE_FUNCTIONS_ENABLED` controls whether Azure Functions are called. When disabled, all permission operations return success immediately.

### 8.2 Endpoints

| Endpoint | Method | Purpose | Called By |
|----------|--------|---------|-----------|
| `/api/permissions/initialize` | POST | Break inheritance, set initial item permissions | SPFx App (Draft -> Legal Intake) |
| `/api/permissions/manage` | POST | Update permissions on status change | SPFx App |
| `/api/permissions/add-user` | POST | Add Read permission for a user | SPFx App (Manage Access) |
| `/api/permissions/remove-user` | POST | Remove user permission | SPFx App (Manage Access) |
| `/api/permissions/complete` | POST | Set final read-only permissions | Power Automate |
| `/api/notifications/send` | POST | Process and send notification | Power Automate |
| `/api/notifications/health` | GET | Health check | Monitoring |

### 8.3 Configuration Required

In the Configuration list, set:

| Key | Value | Example |
|-----|-------|---------|
| ApimBaseUrl | APIM gateway URL | `https://legalworkflow-apim.azure-api.net` |
| ApimApiClientId | Azure AD App Client ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

### 8.4 Authentication Flow

1. SPFx app acquires Azure AD bearer token for the APIM API
2. Token sent as `Authorization: Bearer {token}` header
3. APIM validates JWT (issuer, audience, expiry)
4. Valid token forwarded to Azure Function
5. Function extracts user identity from token
6. Function verifies user membership in SharePoint groups
7. Operation performed based on authorization

### 8.5 Authorization Rules

| Endpoint | Required Groups | Additional Rules |
|----------|-----------------|------------------|
| `initialize` | Any LW group | User must be in at least one group |
| `add-user` | Admin, Legal Admin, or Submitter | Submitter can only modify own request |
| `remove-user` | Admin, Legal Admin, or Submitter | Submitter can only modify own request |
| `complete` | Admin only | Or Power Automate via function key |
| `notifications/send` | Any authorized group | Or Power Automate via function key |

### 8.6 Monitoring

- **Health Check:** `GET /api/notifications/health` - returns 200 if healthy
- **Timeout:** Default 30 seconds per call
- **Errors:** Logged via `SPContext.logger.error()` with correlation IDs

---

## 9. Document Management

### 9.1 Folder Structure

Documents are organized in the **RequestDocuments** library:

```
RequestDocuments/
├── {ItemID}/                          (Request-level folder)
│   ├── document1.pdf                  (Review documents)
│   ├── supplement.docx                (Supplemental documents)
│   ├── FINRADocuments/                (FINRA submission documents)
│   │   └── finra-filing.pdf
│   ├── CommunicationsApproval/        (Communications approval evidence)
│   │   └── approval-email.pdf
│   ├── PortfolioManagerApproval/      (PM approval evidence)
│   ├── ResearchAnalystApproval/
│   ├── SubjectMatterExpertApproval/
│   ├── PerformanceApproval/
│   └── OtherApproval/
```

### 9.2 Document Types

| Document Type | Folder Location | Purpose |
|---------------|----------------|---------|
| Review | `{ItemID}/` | Main documents for review |
| Supplemental | `{ItemID}/` | Supporting documents |
| Communication Approval | `{ItemID}/CommunicationsApproval/` | Proof of comms approval |
| Portfolio Manager Approval | `{ItemID}/PortfolioManagerApproval/` | Proof of PM approval |
| Research Analyst Approval | `{ItemID}/ResearchAnalystApproval/` | Proof of RA approval |
| Subject Matter Expert Approval | `{ItemID}/SubjectMatterExpertApproval/` | Proof of SME approval |
| Performance Approval | `{ItemID}/PerformanceApproval/` | Proof of performance approval |
| Other Approval | `{ItemID}/OtherApproval/` | Proof of other approval |
| Review Final | `{ItemID}/` | Final reviewed document |

### 9.3 File Limits

| Constraint | Value |
|------------|-------|
| Max file size | 250 MB (SharePoint limit) |
| Max files per batch | 50 |
| Allowed extensions | .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .txt, .jpg, .jpeg, .png, .gif, .zip |

> **To modify allowed file types:** Update the `allowedFileExtensions` value in the Configuration list.

---

## 10. Common Admin Tasks & Procedures

### 10.1 Adding a User to a Group

1. Navigate to **Site Settings > People and Groups**
2. Select the appropriate group (e.g., LW - Submitters)
3. Click **New > Add Users**
4. Search for and add the user
5. Click **Share/Add**

> **Note:** Group membership changes take effect immediately. No cache delay.

### 10.2 Removing a User from a Group

1. Navigate to **Site Settings > People and Groups**
2. Select the group
3. Check the box next to the user
4. Click **Actions > Remove Users from Group**
5. Confirm

### 10.3 Checking a User's Permissions on a Request

1. Navigate to the Requests list
2. Click the item's "..." menu > **Manage Access** (or **Sharing**)
3. Review the permission assignments
4. Alternatively, use **Check Permissions** to verify a specific user's effective permissions

### 10.4 Resetting Item Permissions

If a request's permissions are incorrect:

1. Navigate to the request item
2. Click "..." > **Manage Access**
3. Click **Advanced**
4. Review current permission assignments
5. If needed, click **Delete unique permissions** to re-inherit from the list, then reconfigure

> **Caution:** Only do this if the item is in an incorrect permission state. The application manages permissions automatically during workflow transitions.

### 10.5 Adding a New Choice to Distribution Method

Since Distribution Method has **Fill In Choices enabled**, users can type custom values. However, to add a new permanent choice:

1. Navigate to **List Settings > Columns > Distribution Method**
2. Add the new choice to the choices list
3. Update the application code to include the new enum value (requires dev team)

> **For Fill-In values:** No admin action needed. Users can type custom values directly.

### 10.6 Modifying Submission Items

To add, edit, or deactivate a submission type:

1. Navigate to **Site Contents > SubmissionItems**
2. **Add:** Create new item with Title, TurnAroundTimeInDays, Description, DisplayOrder
3. **Edit:** Modify existing item values
4. **Deactivate:** There is no IsActive flag; coordinate with dev team to handle retirement

### 10.7 Viewing Audit Trail

To review the complete history of a request:

1. Open the request item
2. Click "..." > **Version History**
3. Review field-by-field changes with timestamps and users

Key audit fields to check:
- Status changes (Status field)
- Review outcomes (LegalReviewOutcome, ComplianceReviewOutcome)
- Assignment changes (Attorney field)
- Hold/Resume/Cancel actions (OnHoldBy, CancelledBy, etc.)

### 10.8 Recovering a Deleted Item

If an item was accidentally deleted by a Site Collection Admin:

1. Navigate to **Site Settings > Recycle Bin**
2. Find the deleted item
3. Select it and click **Restore**
4. Verify the item's permissions are correct after restoration

> **Second-stage recycle bin:** If not in the first-stage recycle bin, check the second-stage recycle bin (Site Collection Administration > Recycle Bin > "Deleted from end user Recycle Bin")

---

## 11. Troubleshooting Guide

### 11.1 Common User-Reported Issues

#### "I can't see the request / Access Denied"

**Possible Causes:**
- User is not in the correct SharePoint group
- Item-level permissions not correctly set after status transition
- Azure Functions failed during permission initialization

**Resolution Steps:**
1. Verify user's group membership (Site Settings > People and Groups)
2. Check the request item's permissions (item > Manage Access)
3. If permissions are missing, manually add the user with appropriate permission level
4. Check browser console for errors (F12 > Console)

---

#### "The form won't load / blank screen"

**Possible Causes:**
- SPFx extension not deployed or activated
- SPContext initialization failure
- Browser cache issue

**Resolution Steps:**
1. Verify the solution is deployed in the App Catalog
2. Check that the form customizer is associated with the Requests list
3. Have the user clear browser cache and reload
4. Check browser console for "SPContext is not initialized" error
5. If persistent, escalate to dev team

---

#### "I can't submit my request"

**Possible Causes:**
- Validation errors (required fields missing)
- Request not in Draft status
- User doesn't have Submitter role

**Resolution Steps:**
1. Check the user is in "LW - Submitters" group
2. Verify the request Status is "Draft"
3. Check for red validation error messages on the form
4. Common missing fields: Request Title, Purpose, Target Return Date, Review Audience
5. At least ONE approval is required (unless RFP submission)

---

#### "Notifications are not being sent"

**Possible Causes:**
- Notification template disabled (IsActive = false)
- Power Automate flow not running
- Azure Function not reachable
- Email throttling

**Resolution Steps:**
1. Check the Notifications list - verify template **IsActive** = Yes
2. Check Power Automate flow run history for errors
3. Verify Azure Function health: `GET /api/notifications/health`
4. Check APIM configuration in Configuration list
5. Review Azure Function logs for send errors

---

#### "Permissions didn't update after status change"

**Possible Causes:**
- `AZURE_FUNCTIONS_ENABLED` = false (permissions not being managed)
- Azure Function call failed silently
- APIM configuration missing

**Resolution Steps:**
1. Check Configuration list for `ApimBaseUrl` and `ApimApiClientId` values
2. If Azure Functions disabled, permissions must be managed manually or via Power Automate
3. Manually set permissions on the item if needed (see Section 10.4)
4. Check browser console for "Permission initialization failed" errors

---

#### "Time tracking shows incorrect hours"

**Possible Causes:**
- Working hours configuration changed mid-request
- Hold/Resume cycle not properly tracked
- Stage handoff timestamps incorrect

**Resolution Steps:**
1. Check Configuration list for WorkingHoursStart, WorkingHoursEnd, WorkingDays values
2. Review the request's time tracking fields in version history
3. Check OnHoldSince and related fields for proper timestamps
4. Note: Time tracking uses business hours only (excludes weekends per WorkingDays config)
5. Escalate to dev team if calculation appears wrong

---

#### "Rush request not flagged correctly"

**Possible Causes:**
- SubmissionItems turnaround time changed after request created
- Target return date set incorrectly

**Resolution Steps:**
1. Check the SubmissionItem's TurnAroundTimeInDays value
2. Verify TargetReturnDate on the request
3. Rush = TargetReturnDate < (SubmittedOn + TurnAroundDays in business days)
4. Note: Only weekends are excluded; company holidays are not yet integrated

---

#### "Documents won't upload"

**Possible Causes:**
- File exceeds 250MB limit
- File extension not allowed
- Folder creation failed in document library
- Insufficient permissions on RequestDocuments library

**Resolution Steps:**
1. Check file size (max 250MB)
2. Check file extension against allowed list in Configuration
3. Verify user has Contribute permission on RequestDocuments
4. Check if the item folder exists in RequestDocuments (`/{ItemID}/`)
5. If folder is missing, it will be auto-created on next upload attempt
6. Check browser console for specific error messages

---

### 11.2 Error Messages Reference

| Error Message | Meaning | Admin Action |
|--------------|---------|-------------|
| "SPContext is not initialized" | App failed to initialize | Verify SPFx solution is deployed and form customizer is active |
| "Access Denied" | User lacks permission | Check group membership and item permissions |
| "Configuration key not found: {key}" | Missing config item | Add the key to Configuration list |
| "ApimBaseUrl not configured" | Azure Function URL missing | Add ApimBaseUrl to Configuration list |
| "ApimApiClientId not configured" | Azure AD Client ID missing | Add ApimApiClientId to Configuration list |
| "Permission initialization failed" | Azure Function call failed | Check APIM connectivity and function health |
| "Cannot transition from X to Y" | Invalid status change | Check workflow transition rules (Section 6.2) |
| "User does not have required role" | Permission denied | Verify user is in the correct SharePoint group |
| "Only the request owner or admin can submit" | Wrong user trying to submit | Only the creator or Admin can submit a Draft |
| "Legal review has already been completed" | Duplicate review attempt | Review already submitted; no action needed |
| "No attorney has been assigned" | Missing attorney | Legal Admin needs to assign an attorney first |
| "File exceeds maximum size of 250MB" | File too large | User must reduce file size |
| "STATUS MISMATCH after update!" | Concurrent modification | Request was modified by another user; refresh and retry |

### 11.3 Toast Notification Behavior

The application shows toast notifications to users:

| Type | Auto-Dismiss | Duration | Meaning |
|------|-------------|----------|---------|
| Success (green) | Yes | 3 seconds | Operation completed successfully |
| Info (blue) | Yes | 5 seconds | Informational message |
| Warning (yellow) | Yes | 5 seconds | Non-critical warning |
| Error (red) | **No** | Manual close | Error occurred, user action needed |

> **Note:** If users report seeing persistent red error banners, ask them to screenshot the error message and report it.

---

## 12. Deployment & Provisioning

### 12.1 Prerequisites

- PnP PowerShell v1.12.0+ installed
- SharePoint admin or Site Collection Admin access
- Access to App Catalog (tenant or site-level)

### 12.2 Provisioning Order

Deploy in this order to satisfy dependencies:

```
1. Security.xml           (Groups and permission levels)
2. Lists/Configuration.xml    (App settings - no dependencies)
3. Lists/SubmissionItems.xml  (Submission types - no dependencies)
4. Lists/RequestIds.xml       (ID generation - hidden list)
5. Lists/Requests.xml         (Main list - depends on SubmissionItems for lookups)
6. Lists/RequestDocuments.xml (Document library - depends on Requests for lookup)
7. Lists/Notifications.xml   (Email templates)
8. Column formatting          (Apply-ColumnFormatting.ps1)
9. SPFx solution              (legal-workflow.sppkg to App Catalog)
```

### 12.3 Provisioning Commands

```powershell
# Connect to SharePoint
Connect-PnPOnline -Url "https://tenant.sharepoint.com/sites/LegalWorkflow" -Interactive

# Option A: Full deployment
.\provisioning\Deploy-All.ps1 -SiteUrl "https://tenant.sharepoint.com/sites/LegalWorkflow"

# Option B: Selective deployment
Apply-PnPProvisioningTemplate -Path .\provisioning\Security.xml -Handlers SiteSecurityPermissions,SiteGroups
Apply-PnPProvisioningTemplate -Path .\provisioning\Lists\Configuration.xml -Handlers Lists
Apply-PnPProvisioningTemplate -Path .\provisioning\Lists\SubmissionItems.xml -Handlers Lists
Apply-PnPProvisioningTemplate -Path .\provisioning\Lists\RequestIds.xml -Handlers Lists
Apply-PnPProvisioningTemplate -Path .\provisioning\Lists\Requests.xml -Handlers Lists
Apply-PnPProvisioningTemplate -Path .\provisioning\Lists\RequestDocuments.xml -Handlers Lists
Apply-PnPProvisioningTemplate -Path .\provisioning\Lists\Notifications.xml -Handlers Lists

# Apply column formatting
.\provisioning\Apply-ColumnFormatting.ps1 -SiteUrl "https://tenant.sharepoint.com/sites/LegalWorkflow"
```

### 12.4 SPFx Solution Deployment

```powershell
# Build production package (dev team provides .sppkg file)
# Deploy to App Catalog:
Add-PnPApp -Path .\sharepoint\solution\legal-workflow.sppkg -Scope Tenant -Publish -Overwrite

# Or site-level:
Add-PnPApp -Path .\sharepoint\solution\legal-workflow.sppkg -Scope Site -Publish -Overwrite
```

### 12.5 Post-Deployment Checklist

- [ ] All 6 SharePoint groups created with correct membership policies
- [ ] Users added to appropriate groups
- [ ] All lists created with correct fields and field GUIDs
- [ ] List permissions broken where required (Requests, RequestDocuments, SubmissionItems, Configuration)
- [ ] Grid editing disabled on Requests list
- [ ] SubmissionItems populated with default data (19 items)
- [ ] Configuration list populated with default settings (9 items)
- [ ] Notification templates loaded (19 templates)
- [ ] Column formatting applied (Status, IsRushRequest, TargetReturnDate)
- [ ] SPFx solution deployed and form customizer active on Requests list
- [ ] Azure Functions deployed (if using permission management)
- [ ] APIM configured (if using Azure Functions)
- [ ] Configuration list updated with APIM URL and Client ID
- [ ] Power Automate flows configured for notifications
- [ ] End-to-end test with a test request through full workflow
- [ ] Recycle bin retention policy reviewed

### 12.6 Updating the Application

To deploy a new version:

1. **Dev team** provides updated `.sppkg` file
2. Upload to App Catalog (overwrites previous version)
3. If schema changes are needed, dev team provides updated provisioning scripts
4. Run provisioning scripts for affected lists only
5. Verify form customizer loads correctly
6. Test affected workflows

> **Important:** SPFx solutions auto-update when deployed to the App Catalog. No per-site action needed unless the manifest changed.

---

## 13. Escalation Procedures

### When to Handle Internally (Admin)

- User not in correct group -> Add/remove group membership
- Notification not sending -> Check IsActive flag, Power Automate flow
- Configuration value needs updating -> Update Configuration list
- Permission missing on specific item -> Manually adjust item permissions
- New submission item needed -> Add to SubmissionItems list
- User can't find their request -> Help with search or verify permissions

### When to Escalate to Dev Team

| Issue | What to Provide |
|-------|----------------|
| Form won't load (blank screen) | Browser console screenshot, SPFx version, user role |
| Status transition fails with error | Error message, request ID, user role, current status |
| Time tracking calculation appears wrong | Request ID, expected vs actual hours, working hours config |
| Azure Function errors | Error message, correlation ID (from browser console), APIM URL |
| "STATUS MISMATCH after update!" | Request ID, timestamp, user who triggered it |
| Data corruption (fields have unexpected values) | Request ID, version history screenshot |
| Performance issues (slow loading) | Number of items in list, browser, network conditions |
| New feature request | Business requirements description |

### Contact Information

| Team | Contact Method | Response Time |
|------|---------------|---------------|
| Dev Team | *(update with team contact)* | Within 1 business day |
| SharePoint Platform Team | *(update with team contact)* | Per SLA |
| Azure/Cloud Team | *(update with team contact)* | Per SLA |

---

## Appendix A: Quick Reference Card {#appendix-a}

### Key URLs

| Resource | URL |
|----------|-----|
| LRS Site | `https://{tenant}.sharepoint.com/sites/LegalWorkflow` |
| Requests List | `https://{tenant}.sharepoint.com/sites/LegalWorkflow/Lists/Requests` |
| App Catalog | `https://{tenant}.sharepoint.com/sites/appcatalog` |
| Azure Function Health | `https://{apim-url}/api/notifications/health` |

### Key Configuration Items

| Setting | List | Key |
|---------|------|-----|
| Business Hours | Configuration | WorkingHoursStart, WorkingHoursEnd, WorkingDays |
| File Limits | Configuration | maxFileSizeMB, allowedFileExtensions |
| Azure Functions | Configuration | ApimBaseUrl, ApimApiClientId |
| Submission Types | SubmissionItems | *(add/edit items directly)* |
| Email Templates | Notifications | *(edit templates directly)* |

### Status Color Reference

| Status | Color | Meaning |
|--------|-------|---------|
| Draft | Gray | Not yet submitted |
| Legal Intake | Blue | Under triage by Legal Admin |
| Assign Attorney | Blue | Waiting for committee assignment |
| In Review | Blue | Under legal/compliance review |
| Closeout | Gold | Awaiting submitter closeout |
| Awaiting FINRA Documents | Gold | FINRA filing in progress |
| Completed | Green | Workflow complete |
| Cancelled | Red | Request cancelled |
| On Hold | Orange | Temporarily paused |

---

## Appendix B: SPFx Components — Web Parts, Form Customizers & Field Customizers

All SPFx components packaged in the `legal-workflow.sppkg` solution.

**Solution Details:**

| Property | Value |
|----------|-------|
| **Solution Name** | `legal-workflow-client-side-solution` |
| **Solution ID** | `877d48f8-af3b-4965-be4c-d9c00cf239b2` |
| **Feature ID** | `e7c39642-dc0c-4a54-913a-77ae7871d79a` |
| **Package File** | `legal-workflow.sppkg` |
| **Skip Feature Deployment** | Yes (tenant-scoped) |
| **Domain Isolated** | No |

---

### Web Parts

#### Request Dashboard

| Property | Value |
|----------|-------|
| **Component ID** | `714bf59c-3cd3-4c4a-b3e2-25db6e7f5eee` |
| **Alias** | `ReportDashboardWebPart` |
| **Component Type** | WebPart |
| **Group** | Legal Workflow |
| **Icon** | ViewList |
| **Supported Hosts** | SharePoint Web Part, Teams Personal App, Teams Tab, SharePoint Full Page |
| **Theme Variants** | Supported |
| **Source** | `src/webparts/reportDashboard/` |

**Description:** Navigation toolbar web part with quick links to dashboards and request search. Provides the main entry point for users to browse, filter, and navigate to review requests.

---

#### Analytics Dashboard

| Property | Value |
|----------|-------|
| **Component ID** | `a8c3f2d1-5e7b-4a9c-8d6e-3f1b2c4d5e6f` |
| **Alias** | `AnalyticsDashboardWebPart` |
| **Component Type** | WebPart |
| **Group** | Legal Workflow |
| **Icon** | AnalyticsReport |
| **Supported Hosts** | SharePoint Web Part, Teams Personal App, Teams Tab, SharePoint Full Page |
| **Full Bleed** | Supported |
| **Source** | `src/webparts/analyticsDashboard/` |

**Description:** Admin analytics dashboard for Legal Review System metrics and reporting. Displays KPIs (pending reviews, average turnaround, completion rates), trend charts, and filterable data for a configurable date range (default: 30 days). Intended for Legal Admin and Admin users.

**Properties:**

| Property | Default | Description |
|----------|---------|-------------|
| `title` | Analytics Dashboard | Web part title |
| `useMockData` | false | Use sample data instead of live SharePoint data |
| `defaultDateRange` | 30 | Default number of days for date range filter |

---

### Form Customizers

#### Legal Workflow Form Customizer

| Property | Value |
|----------|-------|
| **Component ID** | `419289ae-db48-48cf-84d8-bd90dcbc6aab` |
| **Alias** | `LegalWorkflowFormCustomizer` |
| **Component Type** | Extension (FormCustomizer) |
| **Target List** | Requests |
| **Source** | `src/extensions/legalWorkflow/` |

**Description:** The primary SPFx Form Customizer that replaces the default SharePoint New/Edit/Display forms on the Requests list. Renders the full legal workflow application — a React-based form with card-based layout (70/30 split: form on the left, comments on the right). Handles all workflow stages: request creation (Draft), submission, legal intake, attorney assignment, legal/compliance review, closeout, and FINRA document handling. Integrates React Hook Form + Zod validation, Zustand state management, and spfx-toolkit for SharePoint operations.

**Association:** Must be registered as the form customizer on the Requests list for New, Edit, and Display forms. This is configured during provisioning.

---

### Field Customizers

#### Request ID Field Customizer

| Property | Value |
|----------|-------|
| **Component ID** | `9e11eae7-2de7-45de-b558-0976203f13aa` |
| **Alias** | `RequestIdFieldCustomizer` |
| **Component Type** | Extension (FieldCustomizer) |
| **Target Field** | Title (Request ID) |
| **Target List** | Requests |
| **Source** | `src/extensions/requestId/` |

**Description:** Renders a clickable Request ID link with a hover card in the Title column of the Requests list view. Clicking the link opens the request edit form. The hover card shows a request summary: request title, status, request type, review audience, target return date, and created/modified info. Provides a compact card preview on quick hover.

---

#### Request Title Field Customizer

| Property | Value |
|----------|-------|
| **Component ID** | `f356df03-765c-466e-bc0f-d61304b1cde1` |
| **Alias** | `RequestTitleFieldCustomizer` |
| **Component Type** | Extension (FieldCustomizer) |
| **Target Field** | RequestTitle |
| **Target List** | Requests |
| **Source** | `src/extensions/requestTitle/` |

**Description:** Renders a custom display for the RequestTitle field in the Requests list view. Provides truncation with tooltip for long titles to keep list views clean and readable.

---

#### Request Status Field Customizer

| Property | Value |
|----------|-------|
| **Component ID** | `e55dcdea-8fa3-4708-9fbe-35c866026289` |
| **Alias** | `RequestStatusFieldCustomizer` |
| **Component Type** | Extension (FieldCustomizer) |
| **Target Field** | Status |
| **Target List** | Requests |
| **Source** | `src/extensions/requestStatus/` |

**Description:** Renders a visual progress bar with a hover card in the Status column of the Requests list view. The progress bar shows workflow stage completion with color-coded indicators: blue for active stages, green for completed, red for cancelled, and yellow/orange for on hold. The hover card displays detailed status information including current workflow stage, review progress (Legal/Compliance), time in current stage, and key dates and assignees.

---

#### Turn Around Date Field Customizer

| Property | Value |
|----------|-------|
| **Component ID** | `2836aed3-5ad3-4495-a1b0-ff3924feec4e` |
| **Alias** | `TurnAroundDateFieldCustomizer` |
| **Component Type** | Extension (FieldCustomizer) |
| **Target Field** | TargetReturnDate |
| **Target List** | Requests |
| **Source** | `src/extensions/turnAroundDate/` |

**Description:** Renders a smart date display with a hover card in the TargetReturnDate column of the Requests list view. Dates are color-coded: red for overdue (past target date), orange for due soon (within 2 business days), and green for on track. Rush requests display a bolt icon indicator. The hover card shows days remaining/overdue, rush rationale (if applicable), and submission date context. Only shows countdown for active requests (not Completed or Cancelled).

---

### Component Summary

| Component | Type | ID | Target |
|-----------|------|----|--------|
| Request Dashboard | WebPart | `714bf59c-...5eee` | Any page |
| Analytics Dashboard | WebPart | `a8c3f2d1-...5e6f` | Any page |
| Legal Workflow Form | FormCustomizer | `419289ae-...6aab` | Requests list (New/Edit/Display) |
| Request ID | FieldCustomizer | `9e11eae7-...3aa` | Requests → Title |
| Request Title | FieldCustomizer | `f356df03-...cde1` | Requests → RequestTitle |
| Request Status | FieldCustomizer | `e55dcdea-...6289` | Requests → Status |
| Turn Around Date | FieldCustomizer | `2836aed3-...ec4e` | Requests → TargetReturnDate |

---

## Appendix C: Lists & Libraries Reference {#appendix-c}

A consolidated reference of every SharePoint list and library in the LRS site, including purpose, key fields, and permission assignments.

### Requests

| Property | Value |
|----------|-------|
| **URL** | `/Lists/Requests` |
| **Type** | Generic List (100) |
| **Versioning** | Enabled |
| **Grid Editing** | Disabled (`DisableGridEditing=true`) |
| **Item Count** | ~80 fields |
| **Description** | The main workflow list. Each item represents a single legal/compliance review request that moves through the full lifecycle: Draft → Legal Intake → In Review → Closeout → Completed. Contains request information, approvals, legal review, compliance review, closeout, FINRA, time tracking, and system tracking fields. |

**Permissions (Inheritance Broken):**

| Group | Permission Level | Notes |
|-------|-----------------|-------|
| LW - Admin | Admin Without Delete | Full control except delete (audit trail protection) |
| LW - Submitters | Read + Contribute on own items | Can create and edit own Draft requests; read-only on others |
| LW - Legal Admin | Contribute Without Delete | Full management of all requests except delete |
| LW - Attorneys | Contribute Without Delete | Edit assigned requests during review |
| LW - Compliance Users | Contribute Without Delete | Edit requests during compliance review |

**Item-Level Permissions:** Broken on transition from Draft → Legal Intake. See [Section 3.4](#34-item-level-permissions-requests) for per-stage breakdown.

---

### RequestDocuments

| Property | Value |
|----------|-------|
| **URL** | `/RequestDocuments` |
| **Type** | Document Library (101) |
| **Versioning** | Enabled |
| **Description** | Stores all documents associated with review requests. Organized into per-request folders (`/{ItemID}/`) with subfolders for each approval type and FINRA documents. Contains review documents, supplemental materials, approval evidence, and final reviewed documents. |

**Permissions (Inheritance Broken):**

| Group | Permission Level | Notes |
|-------|-----------------|-------|
| LW - Admin | Full Control | Complete document management |
| LW - Submitters | Read / Contribute on own | Can upload to own request folders |
| LW - Legal Admin | Full Control | Manage all documents |
| LW - Attorneys | Contribute | Upload/edit documents for assigned reviews |
| LW - Compliance Users | Contribute | Upload/edit documents for compliance reviews |

**Folder Structure:** `/{ItemID}/` root contains review and supplemental documents; subfolders for each approval type (`CommunicationsApproval/`, `PortfolioManagerApproval/`, etc.) and `FINRADocuments/`.

---

### SubmissionItems

| Property | Value |
|----------|-------|
| **URL** | `/Lists/SubmissionItems` |
| **Type** | Generic List (100) |
| **Versioning** | Enabled |
| **Item Count** | 19 default items |
| **Description** | Configuration list that defines the types of submissions available (e.g., New Exhibit, Email Blast, Custom Presentation). Each item specifies a turnaround time in business days used to calculate rush requests. The form reads this list dynamically — no code changes needed to add new submission types. |

**Key Fields:** Title, TurnAroundTimeInDays, Description, DisplayOrder

**Permissions (Inheritance Broken):**

| Group | Permission Level |
|-------|-----------------|
| LW - Admin | Full Control |
| LW - Submitters | Read |
| LW - Legal Admin | Read |
| LW - Attorneys | Read |
| LW - Compliance Users | Read |

---

### Configuration

| Property | Value |
|----------|-------|
| **URL** | `/Lists/Configuration` |
| **Type** | Generic List (100) |
| **Versioning** | Enabled |
| **Item Count** | 9 default items |
| **Description** | Key-value store for application settings. Controls business hours (time tracking), file upload limits, Azure integration URLs, and search settings. Changes take effect within 5 minutes (cache TTL). Only items with `IsActive = true` are used. |

**Key Fields:** Title (key), ConfigValue, Description, Category, IsActive

**Permissions (Inheritance Broken):**

| Group | Permission Level |
|-------|-----------------|
| LW - Admin | Full Control |
| LW - Submitters | Read |
| LW - Legal Admin | Read |
| LW - Attorneys | Read |
| LW - Compliance Users | Read |

---

### RequestIds

| Property | Value |
|----------|-------|
| **URL** | `/Lists/RequestIds` |
| **Type** | Generic List (100) |
| **Versioning** | Disabled |
| **Hidden** | Yes |
| **Description** | System list used internally for sequential request ID generation. Stores a counter per request type prefix (CRR, GRR, IMA) per year. When a new request is created, the application increments the counter and generates the ID in `{PREFIX}-{YY}-{N}` format (e.g., CRR-26-42). Not visible in Site Contents or to end users. |

**Permissions:** Inherited from site (not broken). Access controlled at the application level.

---

### Notifications

| Property | Value |
|----------|-------|
| **URL** | `/Lists/Notifications` |
| **Type** | Generic List (100) |
| **Versioning** | Enabled |
| **Item Count** | 19 templates |
| **Description** | Stores email notification templates used by the system. Each item defines a trigger event, recipient list (using template variables), subject, HTML body, importance level, and active flag. Power Automate flows read templates from this list and call Azure Functions to send emails. Admins can modify subjects, bodies, or disable templates without code changes. |

**Key Fields:** Title (template ID), Category, TriggerEvent, ToRecipients, CcRecipients, Subject, Body (HTML), IncludeDocuments, Importance, IsActive

**Permissions:** Inherited from site (not broken). Only admins should modify templates.

---

## Appendix D: Request Flow — Events on Create & Modify

This section documents what happens at each stage when a request is created or modified, including field updates, permission changes, notifications, and time tracking events.

### New Request Created (Draft)

| Event | Detail |
|-------|--------|
| **Trigger** | User clicks "New" on the Requests list |
| **Status Set** | `Draft` |
| **Request ID** | Auto-generated from RequestIds list (e.g., CRR-26-1) |
| **Permissions** | Inherited from list — creator has Full Control, Legal Admin and Admin have access via list permissions |
| **Notifications** | None |
| **Time Tracking** | Not started |

**What the user sees:** Custom SPFx form loads with empty request fields. User fills in request information, uploads documents, and provides at least one approval before submitting.

---

### Draft → Legal Intake (Submit)

| Event | Detail |
|-------|--------|
| **Trigger** | Submitter clicks "Submit" on a Draft request |
| **Who Can Do This** | Request owner (Submitter) or Admin |
| **Validation** | Required fields checked (Request Title, Purpose, Target Return Date, Review Audience, Submission Item, at least one approval unless RFP exemption) |

**Field Updates:**

| Field | Value |
|-------|-------|
| Status | `Legal Intake` |
| SubmittedBy | Current user |
| SubmittedOn | Current timestamp |
| IsRushRequest | Calculated (`TargetReturnDate < SubmittedOn + TurnAroundDays`) |

**Permission Changes:**
- Item-level permissions **broken** (Azure Function: `POST /api/permissions/initialize`)
- Submitter: demoted to **Read**
- Legal Admin: granted **Contribute**
- Admin: **Full Control**

**Notifications Sent:**

| Template | To | Importance |
|----------|-----|-----------|
| `RequestSubmitted` | LW - Legal Admin group | Normal |
| `RushRequestAlert` | LW - Legal Admin group | High (only if rush) |

**Time Tracking:** Legal Intake stage timer starts (Legal Admin is current owner).

---

### Legal Intake → Assign Attorney (Send to Committee)

| Event | Detail |
|-------|--------|
| **Trigger** | Legal Admin clicks "Send to Committee" |
| **Who Can Do This** | Legal Admin, Admin |

**Field Updates:**

| Field | Value |
|-------|-------|
| Status | `Assign Attorney` |
| SubmittedToAssignAttorneyBy | Current user |
| SubmittedToAssignAttorneyOn | Current timestamp |
| ReviewAudience | May be overridden by Legal Admin |

**Notifications Sent:**

| Template | To | Importance |
|----------|-----|-----------|
| `ReadyForAttorneyAssignment` | LW - Attorney Assigner group | Normal |

**Time Tracking:** Legal Intake stage time calculated and saved. Assign Attorney timer starts.

---

### Legal Intake → In Review (Direct Assignment)

| Event | Detail |
|-------|--------|
| **Trigger** | Legal Admin assigns attorney directly and clicks "Assign" |
| **Who Can Do This** | Legal Admin, Admin |

**Field Updates:**

| Field | Value |
|-------|-------|
| Status | `In Review` |
| Attorney | Selected attorney(s) |
| AttorneyAssignNotes | Notes (if provided) |
| SubmittedForReviewBy | Current user |
| SubmittedForReviewOn | Current timestamp |
| LegalReviewStatus | `Not Started` |
| ComplianceReviewStatus | `Not Started` (if compliance needed) or `Not Required` |

**Permission Changes:**
- Assigned Attorney: granted **Contribute Without Delete**
- Compliance Users: granted **Contribute Without Delete** (if review audience includes Compliance)

**Notifications Sent:**

| Template | To | Importance |
|----------|-----|-----------|
| `AttorneyAssigned` | Assigned Attorney; CC: Submitter, Additional Parties | Normal |
| `ComplianceReviewRequired` | LW - Compliance Users (only if compliance review needed) | Normal |

**Time Tracking:** Legal Intake stage time calculated. In Review timer starts.

---

### Assign Attorney → In Review (Committee Assignment)

| Event | Detail |
|-------|--------|
| **Trigger** | Attorney Assigner selects attorney and clicks "Assign" |
| **Who Can Do This** | Attorney Assigner, Legal Admin, Admin |

**Field Updates:** Same as direct assignment above.

**Notifications Sent:** Same as direct assignment above.

---

### In Review — Legal Review Started

| Event | Detail |
|-------|--------|
| **Trigger** | Attorney opens the request and begins review |

**Field Updates:**

| Field | Value |
|-------|-------|
| LegalReviewStatus | `In Progress` |
| LegalStatusUpdatedOn | Current timestamp |
| LegalStatusUpdatedBy | Current user |

---

### In Review — Legal Review Completed

| Event | Detail |
|-------|--------|
| **Trigger** | Attorney submits legal review outcome |

**Field Updates:**

| Field | Value |
|-------|-------|
| LegalReviewStatus | `Completed` |
| LegalReviewOutcome | `Approved`, `Approved With Comments`, or `Not Approved` |
| LegalReviewNotes | Attorney's review notes |
| LegalReviewCompletedOn | Current timestamp |
| LegalReviewCompletedBy | Current user |
| LegalStatusUpdatedOn | Current timestamp |

**Notifications Sent:**

| Outcome | Template | To |
|---------|----------|-----|
| Approved / Approved With Comments | `LegalReviewApproved` | Submitter; CC: Additional Parties |
| Not Approved | `LegalReviewNotApproved` | Submitter; CC: Legal Admin |

**Time Tracking:** Attorney review time calculated and saved to `LegalReviewAttorneyHours`.

---

### In Review — Legal Changes Requested (Respond To Comments And Resubmit)

| Event | Detail |
|-------|--------|
| **Trigger** | Attorney sets outcome to "Respond To Comments And Resubmit" |

**Field Updates:**

| Field | Value |
|-------|-------|
| LegalReviewStatus | `Waiting On Submitter` |
| LegalReviewOutcome | `Respond To Comments And Resubmit` |
| LegalReviewNotes | Attorney's comments |
| LegalStatusUpdatedOn | Current timestamp |

**Notifications Sent:**

| Template | To | Importance |
|----------|-----|-----------|
| `LegalChangesRequested` | Submitter; CC: Additional Parties | **High** |

**Time Tracking:** Attorney review time calculated up to this handoff point.

---

### In Review — Submitter Resubmits for Legal Review

| Event | Detail |
|-------|--------|
| **Trigger** | Submitter updates request and clicks "Resubmit for Review" |

**Field Updates:**

| Field | Value |
|-------|-------|
| LegalReviewStatus | `Waiting On Attorney` |
| LegalStatusUpdatedOn | Current timestamp |

**Notifications Sent:**

| Template | To | Importance |
|----------|-----|-----------|
| `ResubmissionReceivedLegal` | Assigned Attorney | Normal |

**Time Tracking:** Submitter response time calculated and saved to `LegalReviewSubmitterHours`.

---

### In Review — Compliance Review Started / Completed / Changes Requested / Resubmitted

Compliance review follows the same pattern as Legal review above:

| Legal Event | Compliance Equivalent |
|------------|----------------------|
| LegalReviewStatus | ComplianceReviewStatus |
| LegalReviewOutcome | ComplianceReviewOutcome |
| LegalReviewNotes | ComplianceReviewNotes |
| Waiting On Attorney | Waiting On Compliance |
| `LegalReviewApproved` | `ComplianceReviewApproved` |
| `LegalChangesRequested` | `ComplianceChangesRequested` |
| `LegalReviewNotApproved` | `ComplianceReviewNotApproved` |
| `ResubmissionReceivedLegal` | `ResubmissionReceivedCompliance` |
| LegalReviewAttorneyHours | ComplianceReviewReviewerHours |
| LegalReviewSubmitterHours | ComplianceReviewSubmitterHours |

**Additional compliance-only fields set during review:**
- `IsForesideReviewRequired` (Boolean) — controls Tracking ID and FINRA fields visibility
- `RecordRetentionOnly` (Boolean) — visible when `IsForesideReviewRequired = true`
- `IsRetailUse` (Boolean) — visible when `IsForesideReviewRequired = true`

---

### In Review → Closeout (All Reviews Approved)

| Event | Detail |
|-------|--------|
| **Trigger** | All required reviews completed with Approved or Approved With Comments |
| **Automatic** | System transitions status after final review is submitted |

**Field Updates:**

| Field | Value |
|-------|-------|
| Status | `Closeout` |

**Permission Changes:**
- Submitter: upgraded to **Contribute** (closeout fields only)
- Attorney: demoted to **Read**
- Compliance Users: demoted to **Read**

**Notifications Sent:**

| Template | To | Importance |
|----------|-----|-----------|
| `ReadyForCloseout` | Submitter | Normal |

**Time Tracking:** In Review stage time finalized. Closeout timer starts.

---

### In Review → Completed (Not Approved)

| Event | Detail |
|-------|--------|
| **Trigger** | Any review outcome = "Not Approved" |
| **Automatic** | System transitions status, bypassing Closeout |

**Field Updates:**

| Field | Value |
|-------|-------|
| Status | `Completed` |

**Permission Changes:** All users set to **Read** (except Admin: Full Control).

**Notifications Sent:**

| Template | To | Importance |
|----------|-----|-----------|
| `RequestCompleted` | Submitter; CC: Additional Parties | Normal |

---

### Closeout → Completed (Normal Completion)

| Event | Detail |
|-------|--------|
| **Trigger** | Submitter completes closeout and clicks "Complete Request" |
| **Who Can Do This** | Submitter (own request), Legal Admin, Admin |

**Validation:**
- Comments acknowledged (if any outcome = Approved With Comments)
- Tracking ID provided (if `IsForesideReviewRequired = true`)
- Final document uploaded (unless RFP exemption)

**Field Updates:**

| Field | Value |
|-------|-------|
| Status | `Completed` |
| CloseoutBy | Current user |
| CloseoutOn | Current timestamp |
| CommentsAcknowledged | `true` (if applicable) |
| CommentsAcknowledgedOn | Current timestamp (if applicable) |
| TrackingId | Provided value (if applicable) |
| CloseoutNotes | Closeout notes (if provided) |

**Permission Changes:** All users set to **Read** (except Admin: Full Control).

**Notifications Sent:**

| Template | To | Importance |
|----------|-----|-----------|
| `RequestCompleted` | Submitter; CC: Additional Parties | Normal |

**Time Tracking:** Closeout stage time finalized. Total reviewer and submitter hours calculated.

---

### Closeout → Awaiting FINRA Documents

| Event | Detail |
|-------|--------|
| **Trigger** | Submitter clicks "Awaiting FINRA Documents" during closeout |
| **Condition** | `IsForesideReviewRequired = true` |

**Field Updates:**

| Field | Value |
|-------|-------|
| Status | `Awaiting FINRA Documents` |
| AwaitingFINRASince | Current timestamp |

---

### Awaiting FINRA Documents → Completed

| Event | Detail |
|-------|--------|
| **Trigger** | Submitter uploads FINRA documents and clicks "Complete Request" |

**Field Updates:**

| Field | Value |
|-------|-------|
| Status | `Completed` |
| FINRACompletedBy | Current user |
| FINRACompletedOn | Current timestamp |
| FINRACommentsReceived | `true` / `false` |
| FINRAComment | Comments (if `FINRACommentsReceived = true`) |

**Notifications Sent:**

| Template | To | Importance |
|----------|-----|-----------|
| `RequestCompleted` | Submitter; CC: Additional Parties | Normal |

---

### Any Status → On Hold

| Event | Detail |
|-------|--------|
| **Trigger** | Legal Admin or Admin clicks "Place On Hold" |
| **Available From** | Legal Intake, Assign Attorney, In Review, Closeout |

**Field Updates:**

| Field | Value |
|-------|-------|
| Status | `On Hold` |
| PreviousStatus | Status before hold |
| OnHoldBy | Current user |
| OnHoldSince | Current timestamp |
| OnHoldReason | Required notes |

**Notifications Sent:**

| Template | To | Importance |
|----------|-----|-----------|
| `RequestOnHold` | Submitter, Attorney; CC: Legal Admin | Normal |

**Time Tracking:** Stage timer paused. Hold time excluded from SLA calculations.

---

### On Hold → Previous Status (Resume)

| Event | Detail |
|-------|--------|
| **Trigger** | Legal Admin or Admin clicks "Resume" |

**Field Updates:**

| Field | Value |
|-------|-------|
| Status | Restored from `PreviousStatus` |
| PreviousStatus | Cleared |

**Notifications Sent:**

| Template | To | Importance |
|----------|-----|-----------|
| `RequestResumed` | Submitter, Attorney; CC: Legal Admin | Normal |

**Time Tracking:** Stage timer resumes from where it was paused.

---

### Any Status → Cancelled

| Event | Detail |
|-------|--------|
| **Trigger** | Legal Admin or Admin clicks "Cancel" (Submitter can cancel own Draft) |
| **Available From** | Draft, Legal Intake, Assign Attorney, In Review, Closeout |

**Field Updates:**

| Field | Value |
|-------|-------|
| Status | `Cancelled` |
| PreviousStatus | Status before cancellation (for audit) |
| CancelledBy | Current user |
| CancelledOn | Current timestamp |
| CancelReason | Required notes |

**Notifications Sent:**

| Template | To | Importance |
|----------|-----|-----------|
| `RequestCancelled` | Submitter; CC: Attorney, Legal Admin, Additional Parties | Normal |

---

### Attorney Reassigned

| Event | Detail |
|-------|--------|
| **Trigger** | Legal Admin changes the Attorney field on a request in In Review |

**Field Updates:**

| Field | Value |
|-------|-------|
| Attorney | New attorney(s) |

**Permission Changes:**
- Previous attorney: permissions removed
- New attorney: granted **Contribute Without Delete**

**Notifications Sent:**

| Template | To | Importance |
|----------|-----|-----------|
| `AttorneyReassigned` | New Attorney; CC: Submitter, Legal Admin | Normal |
