# Legal Workflow Site Schema

This document provides a comprehensive reference for the SharePoint site schema including security groups, lists, fields, and default data.

---

## Table of Contents

1. [Security Groups](#security-groups)
2. [Lists Overview](#lists-overview)
3. [Requests List](#requests-list)
4. [RequestDocuments Library](#requestdocuments-library)
5. [SubmissionItems List](#submissionitems-list)
6. [Configuration List](#configuration-list)
7. [RequestIds List](#requestids-list)
8. [Notifications List](#notifications-list)

---

## Security Groups

| Group Name | Description | Owner | Permissions |
|------------|-------------|-------|-------------|
| **LW - Admin** | System administrators with full access to Legal Workflow | Self-owned | Full Control - Can manage all lists, items, and site settings |
| **LW - Submitters** | Users who can submit legal review requests | LW - Admin | Contribute - Create requests, view all requests (read-only for others' requests) |
| **LW - Legal Admin** | Legal administrators who can triage and manage all requests | LW - Admin | Full Control on Requests - Triage, assign attorneys, override settings, manage all requests |
| **LW - Attorney Assigner** | Committee members who can assign attorneys to requests | LW - Admin | Edit on Assign Attorney stage - Can assign attorneys to requests pending assignment |
| **LW - Attorneys** | Attorneys who can review and approve assigned legal requests | LW - Admin | Edit on assigned items - Review and submit legal reviews for assigned requests |
| **LW - Compliance Users** | Compliance users who can review compliance aspects of requests | LW - Admin | Edit on compliance items - Review and submit compliance reviews |

### Group Settings (All Groups)

| Setting | Value |
|---------|-------|
| AllowMembersEditMembership | false (except LW - Admin: true) |
| AllowRequestToJoinLeave | false |
| AutoAcceptRequestToJoinLeave | false |
| OnlyAllowMembersViewMembership | true |

---

## Lists Overview

| List Name | URL | Template Type | Description |
|-----------|-----|---------------|-------------|
| Requests | /Lists/Requests | 100 (Generic) | Main list for legal review requests |
| RequestDocuments | /RequestDocuments | 101 (Document Library) | Document library for attachments and approvals |
| SubmissionItems | /Lists/SubmissionItems | 100 (Generic) | Configuration for submission types and turnaround times |
| Configuration | /Lists/Configuration | 100 (Generic) | Application configuration settings |
| RequestIds | /Lists/RequestIds | 100 (Generic) | Hidden system list for tracking request ID sequences |
| Notifications | /Lists/Notifications | 100 (Generic) | Email notification templates |

---

## Requests List

**URL:** `/Lists/Requests`
**Template:** Generic List (100)
**Versioning:** Enabled
**Attachments:** Disabled
**Folders:** Disabled

### Fields by Category

#### System (1 field)

| Internal Name | Display Name | Type | Required | Max Length | Default | Notes |
|---------------|--------------|------|----------|------------|---------|-------|
| Title | Request ID | Text | Yes | 255 | - | Has field customizer (RequestStatus) |

#### Request Information (17 fields)

| Internal Name | Display Name | Type | Required | Max Length | Default | Choices/Options |
|---------------|--------------|------|----------|------------|---------|-----------------|
| Department | Department | Text | No | 100 | - | - |
| RequestType | Request Type | Choice | Yes | - | Communication | `Communication`, `General Review`, `IMA Review` |
| RequestTitle | Request Title | Text | Yes | 255 | - | - |
| Purpose | Purpose | Note (Multi-line) | Yes | - | - | 6 lines, no rich text |
| SubmissionType | Submission Type | Choice | Yes | - | - | `New`, `Material Updates` |
| SubmissionItem | Submission Item | Text | Yes | 255 | - | Linked to SubmissionItems list |
| DistributionMethod | Distribution Method | MultiChoice | No | - | - | `Dodge & Cox Website - U.S.`, `Dodge & Cox Website - Non-U.S.`, `Third Party Website`, `Email / Mail`, `Mobile App`, `Display Card / Signage`, `Hangout`, `Live - Talking Points`, `Social Media` |
| TargetReturnDate | Target Return Date | DateTime | Yes | - | - | Has field customizer (TurnAroundDate) |
| IsRushRequest | Is Rush Request | Boolean | No | - | 0 (No) | - |
| RushRationale | Rush Rationale | Note (Multi-line) | No | - | - | 6 lines, no rich text |
| ReviewAudience | Review Audience | Choice | Yes | - | - | `Legal`, `Compliance`, `Both` |
| PriorSubmissions | Prior Submissions | LookupMulti | No | - | - | Lookup to Requests list (Title field) |
| PriorSubmissionNotes | Prior Submission Notes | Note (Multi-line) | No | - | - | 6 lines, no rich text |
| DateOfFirstUse | Date Of First Use | DateTime | No | - | - | - |
| AdditionalParty | Additional Party | UserMulti | No | - | - | People only |

#### FINRA Audience & Product Fields (6 fields)

| Internal Name | Display Name | Type | Required | Choices |
|---------------|--------------|------|----------|---------|
| FINRAAudienceCategory | FINRA Audience Category | MultiChoice | No | `Institutional`, `Retail / Public` |
| Audience | Audience | MultiChoice | No | `Prospective Separate Acct Client`, `Existing Separate Acct Client`, `Prospective Fund Shareholder`, `Existing Fund Shareholder`, `Consultant` (FillInChoice enabled) |
| USFunds | U.S. Funds | MultiChoice | No | `All Funds`, `Balanced Fund`, `EM Stock Fund`, `Global Stock Fund`, `Income Fund`, `International Stock Fund`, `Stock Fund`, `Global Bond Fund (I Shares)`, `Global Bond Fund (X Shares)` |
| UCITS | UCITS | MultiChoice | No | `All UCITS Funds`, `EM Stock Fund`, `Global Bond Fund`, `Global Stock Fund`, `U.S. Stock Fund` |
| SeparateAcctStrategies | Separate Account Strategies | MultiChoice | No | `All Separate Account Strategies`, `Equity`, `Fixed Income`, `Balanced` |
| SeparateAcctStrategiesIncl | Separate Account Strategies Includes | MultiChoice | No | `Client-related data only`, `Representative account`, `Composite data` |

#### Approvals (24 fields)

| Internal Name | Display Name | Type | Required | Default | Notes |
|---------------|--------------|------|----------|---------|-------|
| RequiresCommunicationsApproval | Requires Communications Approval | Boolean | No | 0 | - |
| CommunicationsApprovalDate | Communications Approval Date | DateTime | No | - | DateOnly format |
| CommunicationsApprover | Communications Approver | User | No | - | People only |
| CommunicationsApprovalNotes | Communications Approval Notes | Note (Multi-line) | No | - | 4 lines, no rich text |
| HasPortfolioManagerApproval | Has Portfolio Manager Approval | Boolean | No | 0 | - |
| PortfolioManagerApprovalDate | Portfolio Manager Approval Date | DateTime | No | - | DateOnly format |
| PortfolioManager | Portfolio Manager | User | No | - | People only |
| PortfolioMgrApprovalNotes | Portfolio Manager Approval Notes | Note (Multi-line) | No | - | 4 lines, no rich text |
| HasResearchAnalystApproval | Has Research Analyst Approval | Boolean | No | 0 | - |
| ResearchAnalystApprovalDate | Research Analyst Approval Date | DateTime | No | - | DateOnly format |
| ResearchAnalyst | Research Analyst | User | No | - | People only |
| ResearchAnalystApprovalNotes | Research Analyst Approval Notes | Note (Multi-line) | No | - | 4 lines, no rich text |
| HasSMEApproval | Has SME Approval | Boolean | No | 0 | - |
| SMEApprovalDate | SME Approval Date | DateTime | No | - | DateOnly format |
| SubjectMatterExpert | Subject Matter Expert | User | No | - | People only |
| SMEApprovalNotes | SME Approval Notes | Note (Multi-line) | No | - | 4 lines, no rich text |
| HasPerformanceApproval | Has Performance Approval | Boolean | No | 0 | - |
| PerformanceApprovalDate | Performance Approval Date | DateTime | No | - | DateOnly format |
| PerformanceApprover | Performance Approver | User | No | - | People only |
| PerformanceApprovalNotes | Performance Approval Notes | Note (Multi-line) | No | - | 4 lines, no rich text |
| HasOtherApproval | Has Other Approval | Boolean | No | 0 | - |
| OtherApprovalTitle | Other Approval Title | Text | No | 100 | - |
| OtherApprovalDate | Other Approval Date | DateTime | No | - | DateOnly format |
| OtherApproval | Other Approval | User | No | - | People only |
| OtherApprovalNotes | Other Approval Notes | Note (Multi-line) | No | - | 4 lines, no rich text |

#### Legal Intake (2 fields)

| Internal Name | Display Name | Type | Required | Notes |
|---------------|--------------|------|----------|-------|
| Attorney | Attorney | User | No | People only, assigned attorney |
| AttorneyAssignNotes | Attorney Assign Notes | Note (Multi-line) | No | AppendOnly, 6 lines |

#### Legal Review (7 fields)

| Internal Name | Display Name | Type | Required | Default | Choices |
|---------------|--------------|------|----------|---------|---------|
| LegalReviewStatus | Legal Review Status | Choice | No | Not Started | `Not Required`, `Not Started`, `In Progress`, `Waiting On Submitter`, `Waiting On Attorney`, `Completed` |
| LegalStatusUpdatedOn | Legal Status Updated On | DateTime | No | - | - |
| LegalStatusUpdatedBy | Legal Status Updated By | User | No | - | People only |
| LegalReviewOutcome | Legal Review Outcome | Choice | No | - | `Approved`, `Approved With Comments`, `Respond To Comments And Resubmit`, `Not Approved` |
| LegalReviewNotes | Legal Review Notes | Note (Multi-line) | No | - | AppendOnly, 6 lines |
| LegalReviewCompletedOn | Legal Review Completed On | DateTime | No | - | - |
| LegalReviewCompletedBy | Legal Review Completed By | User | No | - | People only |

#### Compliance Review (9 fields)

| Internal Name | Display Name | Type | Required | Default | Choices |
|---------------|--------------|------|----------|---------|---------|
| ComplianceReviewStatus | Compliance Review Status | Choice | No | Not Started | `Not Required`, `Not Started`, `In Progress`, `Waiting On Submitter`, `Waiting On Compliance`, `Completed` |
| ComplianceStatusUpdatedOn | Compliance Status Updated On | DateTime | No | - | - |
| ComplianceStatusUpdatedBy | Compliance Status Updated By | User | No | - | People only |
| ComplianceReviewOutcome | Compliance Review Outcome | Choice | No | - | `Approved`, `Approved With Comments`, `Respond To Comments And Resubmit`, `Not Approved` |
| ComplianceReviewNotes | Compliance Review Notes | Note (Multi-line) | No | - | AppendOnly, 6 lines |
| IsForesideReviewRequired | Is Foreside Review Required | Boolean | No | 0 | - |
| IsRetailUse | Is Retail Use | Boolean | No | 0 | - |
| ComplianceReviewCompletedOn | Compliance Review Completed On | DateTime | No | - | - |
| ComplianceReviewCompletedBy | Compliance Review Completed By | User | No | - | People only |

#### Closeout (4 fields)

| Internal Name | Display Name | Type | Required | Max Length | Notes |
|---------------|--------------|------|----------|------------|-------|
| TrackingId | Tracking Id | Text | No | 50 | Required at closeout if compliance reviewed AND (IsForesideReviewRequired OR IsRetailUse) |
| CloseoutNotes | Closeout Notes | Note (Multi-line) | No | - | 6 lines |
| CommentsAcknowledged | Comments Acknowledged | Boolean | No | - | Default: 0 (No) |
| CommentsAcknowledgedOn | Comments Acknowledged On | DateTime | No | - | - |

#### Foreside Documents (4 fields)

| Internal Name | Display Name | Type | Required | Notes |
|---------------|--------------|------|----------|-------|
| ForesideCompletedBy | Foreside Completed By | User | No | People only |
| ForesideCompletedOn | Foreside Completed On | DateTime | No | - |
| ForesideNotes | Foreside Notes | Note (Multi-line) | No | AppendOnly, 6 lines |
| AwaitingForesideSince | Awaiting Foreside Since | DateTime | No | Set when status changes to Awaiting Foreside Documents |

#### System Tracking (18 fields)

| Internal Name | Display Name | Type | Required | Default | Choices/Notes |
|---------------|--------------|------|----------|---------|---------------|
| Status | Status | Choice | Yes | Draft | `Draft`, `Legal Intake`, `Assign Attorney`, `In Review`, `Closeout`, `Awaiting Foreside Documents`, `Completed`, `Cancelled`, `On Hold` - Has field customizer |
| SubmittedBy | Submitted By | User | No | - | People only |
| SubmittedOn | Submitted On | DateTime | No | - | - |
| SubmittedToAssignAttorneyBy | Submitted To Assign Attorney By | User | No | - | People only |
| SubmittedToAssignAttorneyOn | Submitted To Assign Attorney On | DateTime | No | - | - |
| SubmittedForReviewBy | Submitted For Review By | User | No | - | People only |
| SubmittedForReviewOn | Submitted For Review On | DateTime | No | - | - |
| CloseoutBy | Closeout By | User | No | - | People only |
| CloseoutOn | Closeout On | DateTime | No | - | - |
| CancelledBy | Cancelled By | User | No | - | People only |
| CancelledOn | Cancelled On | DateTime | No | - | - |
| CancelReason | Cancel Reason | Note (Multi-line) | No | - | 6 lines |
| OnHoldBy | On Hold By | User | No | - | People only |
| OnHoldSince | On Hold Since | DateTime | No | - | - |
| OnHoldReason | On Hold Reason | Note (Multi-line) | No | - | 6 lines |
| PreviousStatus | Previous Status | Text | No | 50 | Stores status before On Hold/Cancelled |
| TotalTurnaroundDays | Total Turnaround Days | Number | No | - | Min: 0, Max: 365, Decimals: 0 |
| ExpectedTurnaroundDate | Expected Turnaround Date | DateTime | No | - | DateOnly format |
| AdminOverrideNotes | Admin Override Notes | Note (Multi-line) | No | - | AppendOnly, 10 lines |

#### Time Tracking (10 fields)

| Internal Name | Display Name | Type | Required | Min | Max | Decimals |
|---------------|--------------|------|----------|-----|-----|----------|
| LegalIntakeLegalAdminHours | Legal Intake Legal Admin Hours | Number | No | 0 | 10000 | 2 |
| LegalIntakeSubmitterHours | Legal Intake Submitter Hours | Number | No | 0 | 10000 | 2 |
| LegalReviewAttorneyHours | Legal Review Attorney Hours | Number | No | 0 | 10000 | 2 |
| LegalReviewSubmitterHours | Legal Review Submitter Hours | Number | No | 0 | 10000 | 2 |
| ComplianceReviewReviewerHours | Compliance Review Reviewer Hours | Number | No | 0 | 10000 | 2 |
| ComplianceReviewSubmitterHours | Compliance Review Submitter Hours | Number | No | 0 | 10000 | 2 |
| CloseoutReviewerHours | Closeout Reviewer Hours | Number | No | 0 | 10000 | 2 |
| CloseoutSubmitterHours | Closeout Submitter Hours | Number | No | 0 | 10000 | 2 |
| TotalReviewerHours | Total Reviewer Hours | Number | No | 0 | 10000 | 2 |
| TotalSubmitterHours | Total Submitter Hours | Number | No | 0 | 10000 | 2 |

### Requests List Views

#### Home Dashboard Views (Submitters & Admins)

| View Name | Display Name | Default | Row Limit | Description |
|-----------|--------------|---------|-----------|-------------|
| AllItems | All Requests | Yes | 100 | All requests ordered by Modified descending |
| MyOpenRequests | My Open Requests | No | 50 | Current user's requests in open status (Draft, Legal Intake, Assign Attorney, In Review, Closeout, On Hold) |
| MyCompletedRequests | My Completed Requests | No | 50 | Current user's Completed or Cancelled requests |
| MyAwaitingForesideDocuments | My Awaiting Foreside Documents | No | 50 | Current user's requests awaiting Foreside documents |
| AllOpenRequests | All Open Requests | No | 100 | All requests in open status (Admin view) |
| AllCompletedRequests | All Completed Requests | No | 100 | All Completed or Cancelled requests (Admin view) |

#### Legal Admin Dashboard Views

| View Name | Display Name | Default | Row Limit | Description |
|-----------|--------------|---------|-----------|-------------|
| LegalIntakeQueue | Legal Intake Queue | No | 50 | Requests in Legal Intake status |
| PendingAttorneyAssignment | Pending Attorney Assignment | No | 50 | Requests in Assign Attorney status |
| AllInReview | All In Review | No | 50 | All requests in In Review status |

#### Attorney Dashboard Views

| View Name | Display Name | Default | Row Limit | Description |
|-----------|--------------|---------|-----------|-------------|
| MyAssignedRequests | My Assigned Requests | No | 50 | Requests assigned to current attorney in open status |
| PendingMyReview | Pending My Review | No | 50 | Attorney's requests with LegalReviewStatus = Not Started, In Progress, or Waiting On Attorney |
| MyCompletedReviews | My Completed Reviews | No | 50 | Attorney's Completed or Cancelled requests |

#### Attorney Assigner Dashboard Views

| View Name | Display Name | Default | Row Limit | Description |
|-----------|--------------|---------|-----------|-------------|
| AwaitingAttorneyAssignment | Awaiting Attorney Assignment | No | 50 | Requests in Assign Attorney status |

#### Compliance Dashboard Views

| View Name | Display Name | Default | Row Limit | Description |
|-----------|--------------|---------|-----------|-------------|
| PendingComplianceReview | Pending Compliance Review | No | 50 | Requests needing compliance review (ReviewAudience = Compliance or Both, ComplianceReviewStatus = Not Started, In Progress, or Waiting On Compliance) |
| CompletedComplianceReviews | Completed Compliance Reviews | No | 50 | Completed compliance reviews |

#### Closeout & Foreside Views

| View Name | Display Name | Default | Row Limit | Description |
|-----------|--------------|---------|-----------|-------------|
| CloseoutQueue | Closeout Queue | No | 50 | Requests in Closeout status |
| AwaitingForesideDocuments | Awaiting Foreside Documents | No | 50 | Requests in Awaiting Foreside Documents status |

#### General Views

| View Name | Display Name | Default | Row Limit | Description |
|-----------|--------------|---------|-----------|-------------|
| OnHoldRequests | On Hold Requests | No | 50 | Requests in On Hold status |
| RushRequests | Rush Requests | No | 50 | Active rush requests (IsRushRequest = true, in open status) |

---

## RequestDocuments Library

**URL:** `/RequestDocuments`
**Template:** Document Library (101)
**Versioning:** Enabled
**Folders:** Disabled

### Fields

| Internal Name | Display Name | Type | Required | Choices/Notes |
|---------------|--------------|------|----------|---------------|
| DocumentType | Document Type | Choice | Yes | `Review`, `Supplemental`, `Communication Approval`, `Portfolio Manager Approval`, `Research Analyst Approval`, `Subject Matter Expert Approval`, `Performance Approval`, `Other Approval` |
| Request | Request | Lookup | Yes | Lookup to Requests list (Title field) |
| Description | Description | Note (Multi-line) | No | 6 lines, no rich text |

### Views

| View Name | Display Name | Default | Row Limit |
|-----------|--------------|---------|-----------|
| AllDocuments | All Documents | Yes | 30 |
| ByDocumentType | By Document Type | No | 30 |
| ByRequest | By Request | No | 30 |

---

## SubmissionItems List

**URL:** `/Lists/SubmissionItems`
**Template:** Generic List (100)
**Versioning:** Enabled
**Attachments:** Disabled

### Fields

| Internal Name | Display Name | Type | Required | Min | Max | Default | Decimals |
|---------------|--------------|------|----------|-----|-----|---------|----------|
| Title | Title | Text | Yes | - | - | - | - |
| TurnAroundTimeInDays | Turn Around Time In Days | Number | Yes | 1 | 30 | 5 | 0 |
| Description | Description | Note (Multi-line) | No | - | - | - | - |
| DisplayOrder | Display Order | Number | No | 0 | 999 | 0 | 0 |

### Default Data

| Title | Turn Around Time (Days) | Description | Display Order |
|-------|-------------------------|-------------|---------------|
| New Exhibit | 3 | New exhibit submission | 10 |
| Updated Exhibit | 2 | Updates to existing exhibit | 20 |
| White Paper | 5 | White paper review | 30 |
| Website Update - Substantial (4 pages or more) | 5 | Major website updates | 40 |
| Marketing Communication | 3 | Marketing communication materials | 50 |

### Views

| View Name | Display Name | Default | Row Limit |
|-----------|--------------|---------|-----------|
| AllItems | All Items | Yes | 30 |

---

## Configuration List

**URL:** `/Lists/Configuration`
**Template:** Generic List (100)
**Versioning:** Enabled
**Attachments:** Disabled

### Fields

| Internal Name | Display Name | Type | Required | Max Length | Default |
|---------------|--------------|------|----------|------------|---------|
| Title | Title | Text | Yes | 255 | - |
| ConfigValue | Config Value | Text | No | 255 | - |
| Description | Description | Note (Multi-line) | No | - | - |
| IsActive | Is Active | Boolean | No | - | 1 (Yes) |
| Category | Category | Text | No | 100 | - |

### Default Data

| Title | Config Value | Description | Is Active | Category |
|-------|--------------|-------------|-----------|----------|
| azureFunctionUrl | https://your-function.azurewebsites.net/api | Azure Function endpoint for permission management | Yes | Integration |
| maxFileSizeMB | 250 | Maximum file upload size in megabytes | Yes | Limits |
| enablePhase2RequestTypes | false | Enable Phase 2 request types (General Review, IMA Review) | Yes | Features |
| WorkingHoursStart | 8 | Business day start hour (0-23, PST/PDT timezone). Default: 8 AM | Yes | TimeTracking |
| WorkingHoursEnd | 17 | Business day end hour (0-23, PST/PDT timezone). Default: 5 PM | Yes | TimeTracking |
| WorkingDays | 1,2,3,4,5 | Working days of week (1=Monday through 5=Friday). Weekends excluded. | Yes | TimeTracking |
| SearchResultLimit | 10 | Maximum number of search results to display in spotlight search | Yes | Search |
| RecentSearchesLimit | 5 | Maximum number of recent searches to store and display | Yes | Search |
| allowedFileExtensions | .pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.zip | Comma-separated list of allowed file extensions for document uploads | Yes | FileUpload |

### Views

| View Name | Display Name | Default | Row Limit |
|-----------|--------------|---------|-----------|
| AllItems | All Items | Yes | 30 |
| ActiveConfigurations | Active Configurations | No | 30 |

---

## RequestIds List

**URL:** `/Lists/RequestIds`
**Template:** Generic List (100)
**Versioning:** Disabled
**Attachments:** Disabled
**Quick Launch:** Hidden

### Purpose

This hidden system list tracks request ID sequences independently of item-level permissions on the Requests list. It ensures unique sequential numbering across all request types.

### Request ID Format

`{PREFIX}-{YY}-{N}`

| Prefix | Request Type |
|--------|--------------|
| CRR | Communication Review Request |
| GRR | General Review Request (Phase 2) |
| IMA | IMA Review Request (Phase 2) |

**Examples:** `CRR-25-1`, `CRR-25-2`, `GRR-25-1`

### Fields

| Internal Name | Display Name | Type | Required | Min | Max | Indexed | Notes |
|---------------|--------------|------|----------|-----|-----|---------|-------|
| Title | Title | Text | Yes | - | - | No | Full request ID (e.g., CRR-25-1) |
| Year | Year | Number | Yes | 2020 | 2099 | Yes | 2-digit year extracted |
| Prefix | Prefix | Text | Yes | - | - | Yes | Request type prefix (max 10 chars) |
| Sequence | Sequence | Number | Yes | 1 | - | No | Sequential number for year/prefix |

### Views

| View Name | Display Name | Default | Row Limit |
|-----------|--------------|---------|-----------|
| AllItems | All Items | Yes | 100 |
| ByYearAndPrefix | By Year and Prefix | No | 50 |

---

## Field Type Reference

| Type | SharePoint Type | Notes |
|------|-----------------|-------|
| Text | Single line of text | MaxLength attribute limits characters |
| Note | Multiple lines of text | NumLines sets display height, AppendOnly for comments |
| Choice | Choice | Single selection from CHOICES |
| MultiChoice | Choice (Mult="TRUE") | Multiple selections allowed |
| Boolean | Yes/No | Default: 0=No, 1=Yes |
| DateTime | Date and Time | Format: DateTime or DateOnly |
| Number | Number | Min, Max, Decimals attributes |
| User | Person or Group | UserSelectionMode: PeopleOnly or PeopleAndGroups |
| UserMulti | Person or Group (Multi) | Multiple people allowed |
| Lookup | Lookup | List and ShowField attributes |
| LookupMulti | Lookup (Mult="TRUE") | Multiple lookups allowed |

---

## Notifications List

**URL:** `/Lists/Notifications`
**Template:** Generic List (100)
**Versioning:** Enabled
**Attachments:** Disabled

### Purpose

Email notification templates for the Legal Review System. Each row defines a notification type with its recipients, subject, body (HTML template), and configuration.

### Fields

| Internal Name | Display Name | Type | Required | Default | Choices/Notes |
|---------------|--------------|------|----------|---------|---------------|
| Title | Title | Text | Yes | - | Notification identifier (e.g., RequestSubmitted, AttorneyAssigned) |
| Category | Category | Choice | Yes | Submission | `Submission`, `Assignment`, `Review`, `Status Change`, `Closeout`, `System` |
| TriggerEvent | Trigger Event | Choice | Yes | StatusChange | `StatusChange`, `ReviewComplete`, `ReviewChangesRequested`, `AttorneyAssigned`, `Resubmission`, `HoldResume`, `Cancellation` |
| ToRecipients | To Recipients | Note (Multi-line) | Yes | - | Template for recipients (e.g., `{{LegalAdminGroup}}`, `{{Attorney}}`) |
| CcRecipients | CC Recipients | Note (Multi-line) | No | - | Template for CC recipients |
| BccRecipients | BCC Recipients | Note (Multi-line) | No | - | Template for BCC recipients |
| Subject | Subject | Text | Yes | - | Email subject with placeholders |
| Body | Body | Note (RichHTML) | Yes | - | HTML email body template |
| IncludeDocuments | Include Documents | Boolean | No | 0 | Whether to attach request documents |
| Importance | Importance | Choice | No | Normal | `Low`, `Normal`, `High` |
| IsActive | Is Active | Boolean | No | 1 | Enable/disable notification |
| Description | Description | Note (Multi-line) | No | - | Description of when notification is sent |

### Default Notification Templates

| Title | Category | Trigger Event | To Recipients | Subject |
|-------|----------|---------------|---------------|---------|
| RequestSubmitted | Submission | StatusChange | {{LegalAdminGroup}} | [Action Required] New Legal Review Request: {{RequestId}} - {{RequestTitle}} |
| RushRequestAlert | Submission | StatusChange | {{LegalAdminGroup}} | [RUSH] Urgent Legal Review Request: {{RequestId}} - {{RequestTitle}} |
| AttorneyAssigned | Assignment | AttorneyAssigned | {{Attorney}} | [Action Required] New Assignment: {{RequestId}} - {{RequestTitle}} |
| ReadyForAttorneyAssignment | Assignment | StatusChange | {{AttorneyAssignerGroup}} | [Action Required] Request Pending Attorney Assignment: {{RequestId}} - {{RequestTitle}} |
| ComplianceReviewRequired | Assignment | StatusChange | {{ComplianceGroup}} | [Action Required] Compliance Review Required: {{RequestId}} - {{RequestTitle}} |
| LegalReviewApproved | Review | ReviewComplete | {{Submitter}} | Legal Review Approved: {{RequestId}} - {{RequestTitle}} |
| LegalReviewNotApproved | Review | ReviewComplete | {{Submitter}} | Legal Review Not Approved: {{RequestId}} - {{RequestTitle}} |
| ComplianceReviewApproved | Review | ReviewComplete | {{Submitter}} | Compliance Review Approved: {{RequestId}} - {{RequestTitle}} |
| ComplianceReviewNotApproved | Review | ReviewComplete | {{Submitter}} | Compliance Review Not Approved: {{RequestId}} - {{RequestTitle}} |
| LegalChangesRequested | Review | ReviewChangesRequested | {{Submitter}} | [Action Required] Changes Requested: {{RequestId}} - {{RequestTitle}} |
| ComplianceChangesRequested | Review | ReviewChangesRequested | {{Submitter}} | [Action Required] Compliance Changes Requested: {{RequestId}} - {{RequestTitle}} |
| ResubmissionReceivedLegal | Review | Resubmission | {{Attorney}} | [Action Required] Resubmission Received: {{RequestId}} - {{RequestTitle}} |
| ResubmissionReceivedCompliance | Review | Resubmission | {{ComplianceReviewer}} | [Action Required] Resubmission Received: {{RequestId}} - {{RequestTitle}} |
| ReadyForCloseout | Closeout | StatusChange | {{Submitter}} | [Action Required] Ready for Closeout: {{RequestId}} - {{RequestTitle}} |
| RequestCompleted | Status Change | StatusChange | {{Submitter}}, {{Attorney}} | Request Completed: {{RequestId}} - {{RequestTitle}} |
| RequestOnHold | Status Change | HoldResume | {{Submitter}}, {{Attorney}} | Request On Hold: {{RequestId}} - {{RequestTitle}} |
| RequestResumed | Status Change | HoldResume | {{Submitter}}, {{Attorney}} | Request Resumed: {{RequestId}} - {{RequestTitle}} |
| RequestCancelled | Status Change | Cancellation | {{Submitter}}, {{Attorney}} | Request Cancelled: {{RequestId}} - {{RequestTitle}} |

### Template Placeholders

| Placeholder | Description |
|-------------|-------------|
| `{{RequestId}}` | Request ID (e.g., CRR-25-1) |
| `{{RequestTitle}}` | Request title |
| `{{RequestLink}}` | Direct URL to the request |
| `{{SubmitterName}}` | Name of the person who submitted the request |
| `{{Submitter}}` | Email of the submitter (for recipients) |
| `{{Attorney}}` | Email of the assigned attorney |
| `{{LegalAdminGroup}}` | Legal Admin SharePoint group |
| `{{AttorneyAssignerGroup}}` | Attorney Assigner SharePoint group |
| `{{ComplianceGroup}}` | Compliance Users SharePoint group |
| `{{ComplianceReviewer}}` | Email of compliance reviewer |
| `{{RequestType}}` | Request type (Communication, General Review, etc.) |
| `{{SubmissionType}}` | Submission type (New, Material Updates) |
| `{{SubmissionItem}}` | Selected submission item |
| `{{TargetReturnDate}}` | Target return date |
| `{{ReviewAudience}}` | Review audience (Legal, Compliance, Both) |
| `{{Purpose}}` | Request purpose |
| `{{RushRationale}}` | Rush rationale (for rush requests) |
| `{{ReviewerNotes}}` | Notes from reviewer |
| `{{Status}}` | Current request status |

### Views

| View Name | Display Name | Default | Row Limit |
|-----------|--------------|---------|-----------|
| AllItems | All Notifications | Yes | 30 |
| ActiveNotifications | Active Notifications | No | 30 |
| ByCategory | By Category | No | 30 |

---

## Notes

1. **Item-Level Permissions:** The Requests list uses item-level permissions that are broken when status changes from Draft to Legal Intake. Permissions are managed by Azure Functions.

2. **Field Customizers:** The following fields have custom rendering:
   - `Title` (Request ID) - RequestStatus field customizer
   - `Status` - RequestStatus field customizer with colored badges
   - `TargetReturnDate` - TurnAroundDate field customizer with urgency coloring

3. **AppendOnly Fields:** Comments fields (AttorneyAssignNotes, LegalReviewNotes, ComplianceReviewNotes, CloseoutNotes, AdminOverrideNotes) use AppendOnly to maintain full comment history.

4. **Rush Request Calculation:** A request is considered "rush" if `TargetReturnDate < (SubmittedOn + SubmissionItem.TurnAroundTimeInDays)` (business days only).

5. **Notifications:** Email notifications are stored as templates in the Notifications list and processed by Azure Functions/Power Automate to generate actual emails with populated placeholders.
