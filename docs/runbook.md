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

## Appendix A: Quick Reference Card

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
