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

### 1.1 Document Purpose

This Functional Specification Document (FSD) provides a comprehensive specification for the Legal Workflows System, a SharePoint Online-based application designed to automate and streamline legal and compliance review processes for marketing and business communications. This document serves as the primary reference for business stakeholders, developers, quality assurance teams, and future system maintainers.

### 1.2 Project Overview

The Legal Workflows System replaces the current manual, email-driven workflow with a centralized, auditable SharePoint Online system. The solution enables organizations to:

- Centralize submission of legal/compliance review requests
- Automate routing to Legal Admins, Attorneys, and Compliance reviewers
- Maintain complete audit trails and version control
- Provide real-time dashboards by role
- Send automated notifications at every workflow stage
- Reduce turnaround times and improve compliance

### 1.3 Business Value

**Current Challenges Addressed:**
- Email-based submissions lack traceability and central visibility
- Approvals stored in scattered email chains and screenshots
- No dashboards or reporting capabilities
- Difficult to enforce turnaround times and SLAs
- Inefficient back-and-forth communication with submitters

**Expected Benefits:**
- 20% reduction in average turnaround time
- 100% audit trail for every request
- 90% user adoption within 3 months
- Documented approvals with proof in all cases
- Measurable compliance with turnaround times

### 1.4 Key Stakeholders

- **Submitters:** Marketing/Business staff creating review requests
- **Legal Admin:** Gatekeepers triaging and managing requests
- **Attorney Assigner:** Committee members assigning attorneys
- **Attorneys:** Legal reviewers performing legal reviews
- **Compliance Users:** Regulatory reviewers performing compliance reviews
- **IT Admins:** Technical and system administrators
- **Ad-hoc Stakeholders:** Read-only observers added to specific requests

---

## 2. Scope of the Document

### 2.1 In-Scope (Phase 1)

This document covers the following functionality for Phase 1 implementation:

**Request Types:**
- Communication requests (marketing materials, shareholder letters, fact sheets, websites, etc.)

**Core Workflow:**
- Request submission with required approvals
- Legal intake and triage
- Attorney assignment (direct and committee-based)
- Legal review process
- Compliance review process
- Closeout with tracking ID
- Request completion

**Supporting Features:**
- 15 automated notification types
- Role-based dashboards and reporting
- Submission items with defined turnaround times
- Rush request handling
- Hold, cancel, and resume actions
- Item-level security and permissions
- Complete audit trail

**Technical Components:**
- SharePoint Online lists and document libraries
- SPFx 1.21.1 Form Customizer extension
- Azure Functions for permission management and notification generation
- Power Automate flows for workflow orchestration
- React-based user interface with Fluent UI v8

### 2.2 Out-of-Scope (Phase 1)

The following items are explicitly excluded from Phase 1:

- General Review and IMA Review request types (Phase 2)
- External user access
- Offline capabilities and mobile app
- Integration with external systems (Seismic, DocuSign, etc.)
- Company holiday calendar integration (weekends only excluded in Phase 1)
- Advanced analytics and reporting beyond basic dashboards
- Automated tracking ID validation
- Multi-language support

### 2.3 Assumptions

1. SharePoint Online is available and accessible to all users
2. User groups and permissions are managed manually by IT Admins
3. Business holidays are not tracked in Phase 1 (only weekends excluded)
4. All users have appropriate M365 licenses
5. Network connectivity is reliable
6. Azure Functions and Power Automate are approved and available
7. Users have modern browsers (Chrome 90+, Edge 90+, Firefox 85+, Safari 14+)

### 2.4 Dependencies

1. SharePoint Online site collection provisioned
2. Azure Functions deployment environment
3. Power Automate licensing and environment
4. User group creation and membership management
5. SharePoint list schema deployment
6. Email service availability for notifications

### 2.5 Constraints

1. SharePoint list view threshold (5000 items)
2. Maximum file upload size: 250MB per file
3. SPFx framework limitations and supported features
4. Azure Functions execution time limits
5. Power Automate action limits per flow
6. Browser compatibility requirements
7. No IE11 support

---

## 3. Business Drivers

### 3.1 Strategic Alignment

The Legal Workflows System aligns with the organization's strategic objectives to:

1. **Enhance Operational Efficiency:** Reduce manual processes and administrative overhead in legal/compliance review workflows
2. **Improve Compliance and Risk Management:** Ensure all communications have proper legal and compliance approvals with documented proof
3. **Enable Data-Driven Decision Making:** Provide visibility into workflow metrics, bottlenecks, and performance
4. **Support Digital Transformation:** Move from email-based processes to modern, cloud-based collaboration tools
5. **Improve User Experience:** Provide intuitive, role-based interfaces that reduce friction and training requirements

### 3.2 Business Objectives

| Objective | Description | Success Criteria |
|-----------|-------------|------------------|
| **Efficiency** | Reduce average turnaround time for legal/compliance reviews | 20% reduction in average turnaround time within 6 months |
| **Compliance** | Ensure every request has proper approvals and audit history | 100% of requests have documented approvals with supporting evidence |
| **Transparency** | Provide real-time visibility into request status and workload | Role-based dashboards available to all users; 90% stakeholder satisfaction |
| **Adoption** | Achieve widespread user participation | 90% of target users submit requests via system within 3 months |
| **Accountability** | Clear assignment of responsibilities and tracking | 95% of requests meet SLA turnaround times; zero lost or missing requests |
| **Audit Readiness** | Complete audit trail for compliance and regulatory reviews | 100% of requests have complete audit logs; pass internal and external audits |

### 3.3 Pain Points Addressed

**Current State Challenges:**

1. **Lack of Traceability:**
   - Requests submitted via email with no central tracking
   - Difficult to determine status or who is responsible
   - Lost emails and missing attachments
   - No historical record for audits

2. **Scattered Approvals:**
   - Screenshots and email replies used as proof
   - Inconsistent approval documentation
   - Difficult to verify authenticity
   - No standardized approval format

3. **No Central Visibility:**
   - Legal Admin cannot see all pending requests
   - Attorneys do not know their workload
   - Submitters cannot track progress
   - Management has no reporting or metrics

4. **Inconsistent Turnaround Times:**
   - No formal SLA tracking
   - Rush requests not clearly identified
   - No visibility into bottlenecks
   - Reactive rather than proactive management

5. **Inefficient Communication:**
   - Back-and-forth email chains
   - Unclear communication history
   - Multiple parties not synchronized
   - No threaded conversations tied to requests

**Solution Benefits:**

1. **Centralized Request Management:** All requests in one location with standardized forms and required fields
2. **Automated Routing:** Requests automatically assigned to appropriate reviewers based on expertise and workload
3. **Complete Audit Trail:** Every action, comment, approval, and status change logged and timestamped
4. **Real-Time Dashboards:** Role-based views showing workload, pending actions, and SLA compliance
5. **Automated Notifications:** 15 notification types keep all stakeholders informed of progress and required actions
6. **Enforced Approvals:** System requires at least one approval with date, approver, and supporting document before submission
7. **Turnaround Time Tracking:** Automatic calculation of expected dates and rush request flagging
8. **Version Control:** All document versions tracked in SharePoint with metadata
9. **Permission Management:** Item-level security ensures users only see relevant requests
10. **Reporting and Analytics:** Built-in dashboards and exportable reports for management and compliance

### 3.4 Business Case Summary

| Metric | Current State | Target State (6 months) | Improvement |
|--------|---------------|------------------------|-------------|
| Average Turnaround Time | 7 business days | 5.6 business days | 20% reduction |
| Requests with Complete Approvals | 75% | 100% | 25% increase |
| Audit Trail Completeness | 60% | 100% | 40% increase |
| User Adoption (Non-Email) | 10% | 90% | 80% increase |
| SLA Compliance Rate | 70% | 95% | 25% increase |
| Time Spent on Status Inquiries | 10 hrs/week | 1 hr/week | 90% reduction |
| Lost/Missing Requests | 5% | 0% | 100% elimination |

---

## 4. Current Process

### 4.1 Overview of Current State

The current legal and compliance review process is primarily email-driven with manual tracking in shared drives and spreadsheets. This approach has evolved organically over time without formal process design, resulting in inefficiencies, lack of visibility, and compliance risks.

### 4.2 Current Workflow Steps

**Step 1: Request Initiation**
- Submitter (Marketing/Business staff) drafts communication material in various formats (Word, PowerPoint, PDF, etc.)
- Submitter obtains informal approvals from managers via email or verbal communication
- Submitter may take screenshots of email approvals or save approval emails

**Step 2: Submission to Legal**
- Submitter sends email to Legal Admin mailbox with:
  - Subject line indicating urgency (e.g., "RUSH: Marketing Email Review")
  - Attached documents for review
  - Description of purpose and intended audience in email body
  - Screenshots or forwarded emails showing prior approvals
- No standardized template or required information
- Legal Admin manually logs request in Excel spreadsheet

**Step 3: Legal Intake and Assignment**
- Legal Admin reviews email and attachments
- Legal Admin determines if request is complete (often requires follow-up emails)
- Legal Admin assigns to attorney via:
  - Direct email if straightforward
  - Committee discussion if complex or specialized expertise needed
- Assignment decision and rationale documented in spreadsheet notes
- Assigned attorney may or may not receive complete context

**Step 4: Legal Review**
- Attorney reviews materials and provides feedback via:
  - Reply-all email with comments
  - Redlined document attachments
  - Track changes in Word documents
- If questions arise, email chain grows with multiple parties
- Difficult to track which version is current
- Comments may be scattered across multiple emails

**Step 5: Compliance Review (if required)**
- Legal Admin or Attorney forwards request to Compliance team via email
- Compliance reviews materials and responds via email
- Compliance may not have complete context from earlier email threads
- Approval or rejection communicated via email reply

**Step 6: Submitter Revisions (if needed)**
- Submitter receives feedback via email
- Submitter makes revisions and replies with updated documents
- May create confusion about which version is latest
- Cycle repeats until approved

**Step 7: Final Approval and Closeout**
- Attorney/Compliance send final approval via email
- Submitter saves approval email as proof
- For certain materials, tracking ID required (communicated via email)
- No formal closeout process or verification

**Step 8: Archival and Record Keeping**
- Emails archived in individual mailboxes
- Documents saved in personal drives or shared folders
- Spreadsheet updated with completion date
- No centralized repository or audit trail

### 4.3 Current Process Pain Points

| Pain Point | Impact | Frequency |
|------------|--------|-----------|
| Lost or missing emails | Delays in processing; inability to verify submissions | Weekly |
| Unclear request status | Submitters constantly inquire about status; Legal Admin spends time responding | Daily |
| Incomplete submissions | Back-and-forth to gather required information; delays in review start | 40% of requests |
| Scattered approval documentation | Difficult to prove approvals during audits; compliance risk | Every audit |
| No workload visibility | Uneven attorney assignments; bottlenecks not identified | Ongoing |
| Version control issues | Reviewers comment on outdated versions; rework required | 25% of requests |
| Manual tracking overhead | Legal Admin spends 5-10 hours/week updating spreadsheet | Weekly |
| No SLA enforcement | Rush requests not prioritized consistently; turnaround times unpredictable | 30% of requests |
| Limited search capability | Difficult to find prior submissions or historical approvals | As needed |
| No automated notifications | Stakeholders not informed of status changes; requires manual emails | Every status change |

### 4.4 Current Technology Landscape

- **Email:** Primary communication and submission tool (Microsoft Outlook)
- **Excel Spreadsheet:** Manual request tracking log maintained by Legal Admin
- **Shared Drives:** Document storage (inconsistent folder structure)
- **SharePoint (limited use):** Some teams use SharePoint document libraries for storage, but no workflow automation
- **No integrated system:** No single source of truth for requests, status, or approvals

### 4.5 Current Metrics and Performance

| Metric | Current Performance | Data Source |
|--------|---------------------|-------------|
| Average Turnaround Time | 7 business days | Legal Admin spreadsheet |
| Requests Submitted per Month | 40-60 | Email count and spreadsheet |
| Requests with Complete Approvals | ~75% | Audit sample review |
| Rush Requests (as % of total) | ~30% | Spreadsheet notes |
| Time Spent on Status Inquiries | 10 hours/week | Legal Admin estimate |
| Audit Trail Completeness | ~60% | Compliance audit findings |
| User Satisfaction (Submitters) | 65% | Informal survey |
| Attorney Workload Balance | Uneven | Spreadsheet analysis |

---

## 5. Proposed Process

### 5.1 Overview of Proposed Solution

The proposed Legal Workflows System provides a centralized, automated SharePoint Online-based workflow that eliminates email-driven processes and provides complete visibility, traceability, and automation. The system enforces business rules, automates routing and notifications, and maintains comprehensive audit trails.

### 5.2 Proposed Workflow Steps

**Step 1: Request Creation (Draft Status)**
- Submitter logs into SharePoint site and clicks "New Request"
- System presents custom SPFx form with required fields:
  - Request Title, Purpose, Submission Type, Submission Item, Distribution Method
  - Target Return Date (validated against expected turnaround date)
  - Review Audience (Legal, Compliance, or Both)
  - At least one approval (type, date, approver, uploaded document)
  - At least one document for review
- System validates all required fields before allowing submission
- System auto-calculates Expected Turnaround Date based on Submission Item SLA
- System automatically flags as Rush Request if Target Return Date < Expected Date
- If Rush Request, system requires Rush Rationale (minimum 10 characters)
- Submitter can save as Draft and return later

**Step 2: Request Submission (Legal Intake Status)**
- When Submitter clicks "Submit," system performs final validation
- System auto-generates Request ID in format CRR-{YEAR}-{COUNTER} (e.g., CRR-2025-42)
- System changes status from Draft → Legal Intake
- System breaks item-level permissions (via Azure Function):
  - Submitter: Read access only
  - Legal Admin group: Full control
  - Attorney Assigner group: Read access
  - Attorneys: No access yet
  - Compliance: No access yet
- System sends Notification #1: "Request Submitted" email to Legal Admin group with:
  - Request ID, Title, Submitter, Target Date, Rush flag, link to request

**Step 3: Legal Intake Review and Assignment**
- Legal Admin receives notification and opens request in SharePoint
- Legal Admin reviews for completeness:
  - Verifies all required approvals are uploaded
  - Reviews documents for review
  - Confirms submission item is appropriate
  - May override Review Audience if needed
- Legal Admin decides on attorney assignment:
  - **Option A: Direct Assignment**
    - Legal Admin selects Attorney from dropdown
    - Legal Admin adds Assignment Notes
    - Legal Admin clicks "Assign Attorney"
    - System changes status from Legal Intake → In Review
    - System updates permissions (Attorney gets Edit access to this request)
    - System sends Notification #2: "Attorney Assigned (Direct)" to assigned Attorney
  - **Option B: Committee Assignment**
    - Legal Admin clicks "Send to Committee"
    - System changes status from Legal Intake → Assign Attorney
    - System sends Notification #3: "Sent to Committee" to Attorney Assigner group
    - Committee members review request and discuss (outside system)
    - Committee member selects Attorney and clicks "Assign Attorney"
    - System changes status from Assign Attorney → In Review
    - System updates permissions (Attorney gets Edit access)
    - System sends Notification #4: "Attorney Assigned (Committee)" to assigned Attorney

**Step 4: Review Process (In Review Status)**
- Assigned Attorney receives notification and opens request
- If Review Audience = Compliance or Both:
  - System sends Notification #5: "Compliance Review Required" to Compliance Users group
  - System grants Compliance Users Edit access to this request
- Attorney/Compliance review materials and perform one of the following actions:
  - **Approve:** Select "Approved" outcome, add notes, click Submit Review
  - **Approve with Comments:** Select "Approved With Comments" outcome, add notes, click Submit Review
  - **Request More Information:** Select "Waiting On Submitter" status, add comments describing what's needed
    - System sends Notification #7: "Waiting On Submitter" to Creator with required changes
    - Submitter uploads additional documents or adds comments
    - System sends Notification #8: "Submitter Response" to Attorney/Compliance
    - Attorney/Compliance review and continue
  - **Reject:** Select "Not Approved" outcome, add detailed rejection reason, click Submit Review
- System tracks Legal Review Status and Compliance Review Status independently
- System updates Overall Request Status based on review outcomes:
  - If ANY review = Not Approved → Move to Completed (bypass Closeout)
  - If ALL required reviews = Approved or Approved With Comments → Move to Closeout
  - Otherwise → Remain In Review

**Step 5: Closeout (Closeout Status)**
- System sends Notification #10: "Ready for Closeout" to Creator
- Submitter opens request and sees closeout form
- If Tracking ID required (Compliance reviewed AND (Foreside OR Retail Use)):
  - Submitter enters Tracking ID (free text)
- Submitter reviews all approvals and final documents
- Submitter clicks "Complete Request"
- System changes status from Closeout → Completed

**Step 6: Completion (Completed Status)**
- System sends Notification #11: "Request Completed" to all stakeholders
- System updates permissions (all stakeholders retain Read access for audit)
- System archives request in Completed view
- Request remains searchable and accessible for reporting/audits

**Special Actions (Available at Any Stage):**
- **Cancel Request:**
  - Legal Admin or Submitter can cancel request
  - System sends Notification #12: "Request Cancelled" to all stakeholders
  - Status changes to Cancelled (terminal state)
- **Hold Request:**
  - Legal Admin can place request on hold
  - System sends Notification #13: "Request On Hold" to all stakeholders
  - Status changes to On Hold
- **Resume Request:**
  - Legal Admin can resume held request
  - System sends Notification #14: "Request Resumed" to active participants
  - Status returns to previous active status
- **Reassign Attorney:**
  - Legal Admin can change assigned attorney
  - System sends Notification #6: "Attorney Reassigned" to new and old attorneys
  - Permissions updated accordingly

**Commenting and Mentions:**
- Any stakeholder with access can add comments at any time
- Comments support @mentions to tag specific users
- System sends Notification #15: "User Tagged in Comment" when @mentioned

### 5.3 Proposed Technology Architecture

The proposed solution leverages the following technology stack:

**Frontend:**
- SPFx 1.21.1 Form Customizer extension (replaces default SharePoint form)
- React 17.0.1 for component-based UI
- Fluent UI v8 for M365-consistent components
- DevExtreme 22.2.3 for advanced form controls
- React Hook Form + Zod for form management and validation
- Zustand for state management

**Backend:**
- SharePoint Online Lists: Requests (73 fields), SubmissionItems, RequestDocuments
- Azure Functions: Permission management, notification content generation
- Power Automate: Workflow orchestration, email notifications, permission triggers
- PnP/sp 3.20.1 for SharePoint REST API operations

**Security:**
- SharePoint groups for role-based access control
- Item-level permissions managed dynamically by Azure Functions
- Audit logging built into SharePoint (modified by, modified date, version history)

### 5.4 Expected Benefits and Improvements

| Benefit Area | Expected Improvement | Measurement |
|--------------|---------------------|-------------|
| **Traceability** | 100% of requests tracked in central system with complete audit trail | System reports; audit compliance |
| **Turnaround Time** | 20% reduction in average turnaround time (from 7 to 5.6 business days) | System analytics dashboard |
| **Approval Documentation** | 100% of requests have documented approvals with uploaded proof | System enforcement; audit findings |
| **User Adoption** | 90% of users submit via system (vs. 10% currently using informal SharePoint) | System analytics; email volume reduction |
| **Visibility** | Real-time dashboards for all roles showing workload and status | User surveys; stakeholder satisfaction |
| **SLA Compliance** | 95% of requests meet turnaround time SLAs (up from 70%) | System analytics; SLA reports |
| **Administrative Overhead** | 90% reduction in time spent on status inquiries and manual tracking | Legal Admin time tracking |
| **Version Control** | Zero confusion about document versions; all versions tracked | User surveys; incident reports |
| **Notification Automation** | 100% of status changes result in automated notifications | System logs; user surveys |
| **Audit Readiness** | 100% audit trail completeness; pass all compliance audits | Audit results |

### 5.5 Change Management and Rollout

**Training:**
- Role-based training sessions for Submitters, Legal Admin, Attorneys, Compliance Users
- Video tutorials and quick reference guides
- "Office hours" support during first 2 weeks

**Communication:**
- Announcement email 2 weeks before go-live
- Weekly status updates during rollout
- Feedback channels (email, Teams channel)

**Phased Rollout:**
- Pilot with 5-10 users (1 week)
- Department-by-department rollout (2 weeks)
- Full organization rollout (week 4)
- Email process sunset (week 5)

**Success Tracking:**
- Weekly adoption metrics review
- Monthly user satisfaction surveys
- Quarterly audit and compliance reviews

---

## 6. Business Requirements

This section outlines the high-level business requirements for the Legal Workflows System. Each requirement is assigned a priority using the P1-P5 scale:

- **P1 (Critical):** Must Have - Essential for Phase 1 go-live; system cannot function without these
- **P2 (High):** Should Have - Important for Phase 1; significant impact on user experience or business value
- **P3 (Medium):** Could Have - Desirable for Phase 1; enhances functionality but can be deferred if needed
- **P4 (Low):** Nice to Have - Future enhancement for Phase 2
- **P5 (Future):** Won't Have in Phase 1 - Explicitly deferred to Phase 2 or beyond

### 6.1 Core Workflow Requirements

| Req ID | Requirement | Priority | Rationale |
|--------|-------------|----------|-----------|
| BR-001 | The system shall support request creation with Draft status where submitters can save partial requests and return later to complete | P1 | Essential for user experience; prevents data loss |
| BR-002 | The system shall auto-generate unique Request IDs in format CRR-{YEAR}-{COUNTER} upon submission | P1 | Critical for tracking and audit trail |
| BR-003 | The system shall enforce at least one approval (type, date, approver, document) before allowing submission | P1 | Core compliance requirement |
| BR-004 | The system shall support Legal Intake status where Legal Admin reviews and triages requests | P1 | Central to workflow process |
| BR-005 | The system shall support direct attorney assignment path (Legal Intake → In Review) | P1 | Primary assignment method for straightforward requests |
| BR-006 | The system shall support committee attorney assignment path (Legal Intake → Assign Attorney → In Review) | P1 | Required for complex requests needing expertise matching |
| BR-007 | The system shall support In Review status where attorneys and compliance users perform reviews | P1 | Core review functionality |
| BR-008 | The system shall support Closeout status where submitters provide tracking IDs and final documentation | P1 | Required for compliance materials |
| BR-009 | The system shall support Completed status as terminal success state | P1 | Workflow completion requirement |
| BR-010 | The system shall support Cancelled status as terminal cancellation state | P2 | Important for managing withdrawn requests |
| BR-011 | The system shall support On Hold status with ability to resume to prior status | P2 | Important for managing paused requests |
| BR-012 | The system shall support attorney reassignment at any time by Legal Admin | P2 | Important for workload management and expertise changes |

### 6.2 Turnaround Time and Rush Request Requirements

| Req ID | Requirement | Priority | Rationale |
|--------|-------------|----------|-----------|
| BR-020 | The system shall maintain a configurable list of Submission Items each with defined turnaround time in business days | P1 | Essential for SLA management |
| BR-021 | The system shall automatically calculate Expected Turnaround Date based on Submission Item SLA and request creation date | P1 | Critical for SLA tracking |
| BR-022 | The system shall exclude weekends (Saturday/Sunday) from business day calculations | P1 | Standard business day definition |
| BR-023 | The system shall automatically flag requests as Rush Request if Target Return Date < Expected Date | P1 | Automatic rush identification |
| BR-024 | The system shall require Rush Rationale (minimum 10 characters) for all Rush Requests | P1 | Accountability for expedited processing |
| BR-025 | The system shall exclude company holidays from business day calculations | P5 | Phase 2 enhancement; manual workaround acceptable in Phase 1 |
| BR-026 | The system shall display Expected Turnaround Date and Target Return Date side-by-side during request creation | P2 | User awareness of SLA implications |

### 6.3 Approval Requirements

| Req ID | Requirement | Priority | Rationale |
|--------|-------------|----------|-----------|
| BR-030 | The system shall support Communications Approval type with date, approver, and uploaded document | P1 | Primary approval type |
| BR-031 | The system shall support Portfolio Manager Approval type with date, approver, and uploaded document | P1 | Investment-specific approval |
| BR-032 | The system shall support Research Analyst Approval type with date, approver, and uploaded document | P1 | Research-specific approval |
| BR-033 | The system shall support Subject Matter Expert (SME) Approval type with date, approver, and uploaded document | P1 | Domain expertise approval |
| BR-034 | The system shall support Performance Review Approval type with date, approver, and uploaded document | P1 | Performance data approval |
| BR-035 | The system shall support Other Approval type with custom title, date, approver, and uploaded document | P1 | Flexibility for non-standard approvals |
| BR-036 | The system shall allow multiple approvals of different types for a single request | P2 | Common scenario for complex materials |
| BR-037 | The system shall validate that approval date is not in the future | P2 | Data quality enforcement |
| BR-038 | The system shall display all uploaded approval documents in a dedicated Approvals section | P2 | User visibility and audit readiness |

### 6.4 Review and Outcome Requirements

| Req ID | Requirement | Priority | Rationale |
|--------|-------------|----------|-----------|
| BR-040 | The system shall track Legal Review Status independently from Compliance Review Status | P1 | Parallel review workflows |
| BR-041 | The system shall support Legal Review Outcomes: Approved, Approved With Comments, Not Approved | P1 | Standard legal review outcomes |
| BR-042 | The system shall support Compliance Review Outcomes: Approved, Approved With Comments, Not Approved | P1 | Standard compliance review outcomes |
| BR-043 | The system shall move request to Completed status (bypass Closeout) if ANY review outcome is Not Approved | P1 | Rejection handling |
| BR-044 | The system shall move request to Closeout status if ALL required reviews have Approved or Approved With Comments outcome | P1 | Success path to closeout |
| BR-045 | The system shall support "Waiting On Submitter" review status when reviewers need additional information | P2 | Common review cycle scenario |
| BR-046 | The system shall allow submitters to upload additional documents and add comments when in Waiting On Submitter status | P2 | Response mechanism for submitters |
| BR-047 | The system shall require reviewers to provide notes when selecting any review outcome | P2 | Documentation and feedback quality |

### 6.5 Review Audience Requirements

| Req ID | Requirement | Priority | Rationale |
|--------|-------------|----------|-----------|
| BR-050 | The system shall support Review Audience choice: Legal, Compliance, Both | P1 | Determines review routing |
| BR-051 | The system shall allow Legal Admin to override Review Audience during Legal Intake | P1 | Expert triage capability |
| BR-052 | The system shall automatically grant Compliance Users access when Review Audience includes Compliance | P1 | Permission automation |
| BR-053 | The system shall send notification to Compliance Users when Review Audience includes Compliance | P1 | Reviewer awareness |

### 6.6 Tracking ID and Closeout Requirements

| Req ID | Requirement | Priority | Rationale |
|--------|-------------|----------|-----------|
| BR-060 | The system shall require Tracking ID at Closeout if: Compliance reviewed AND (IsForesideReviewRequired OR IsRetailUse) | P1 | Compliance material tracking |
| BR-061 | The system shall make Tracking ID optional at Closeout for all other requests | P1 | Conditional requirement logic |
| BR-062 | The system shall allow Legal Admin to mark request as Completed from Closeout status | P2 | Admin override capability |
| BR-063 | The system shall validate Tracking ID format (future enhancement: integrate with external system) | P5 | Phase 2 integration |

### 6.7 Notification Requirements

| Req ID | Requirement | Priority | Rationale |
|--------|-------------|----------|-----------|
| BR-070 | The system shall send "Request Submitted" notification to Legal Admin when status changes to Legal Intake | P1 | Critical workflow trigger |
| BR-071 | The system shall send "Attorney Assigned (Direct)" notification when Legal Admin directly assigns attorney | P1 | Attorney awareness |
| BR-072 | The system shall send "Sent to Committee" notification to Attorney Assigner group when sent for committee review | P1 | Committee awareness |
| BR-073 | The system shall send "Attorney Assigned (Committee)" notification when committee assigns attorney | P1 | Attorney awareness |
| BR-074 | The system shall send "Compliance Review Required" notification to Compliance Users when Review Audience includes Compliance | P1 | Compliance reviewer awareness |
| BR-075 | The system shall send "Attorney Reassigned" notification to both old and new attorneys when reassignment occurs | P2 | Transparency in reassignment |
| BR-076 | The system shall send "Waiting On Submitter" notification to Creator when reviewer requests additional information | P1 | Submitter action required |
| BR-077 | The system shall send "Submitter Response" notification to Attorney/Compliance when submitter uploads documents while Waiting On Submitter | P2 | Reviewer awareness of response |
| BR-078 | The system shall send "Review Completed (Single)" notification when Legal OR Compliance review completes | P2 | Progress visibility |
| BR-079 | The system shall send "Ready for Closeout" notification to Creator when status changes to Closeout | P1 | Submitter action required |
| BR-080 | The system shall send "Request Completed" notification to all stakeholders when status changes to Completed | P1 | Workflow completion awareness |
| BR-081 | The system shall send "Request Cancelled" notification to all stakeholders when request is cancelled | P2 | Stakeholder awareness |
| BR-082 | The system shall send "Request On Hold" notification to all stakeholders when request is placed on hold | P2 | Stakeholder awareness |
| BR-083 | The system shall send "Request Resumed" notification to active participants when request is resumed from hold | P2 | Stakeholder awareness |
| BR-084 | The system shall send "User Tagged in Comment" notification when a user is @mentioned in a comment | P3 | Enhanced collaboration |
| BR-085 | All notifications shall include: Request ID, Request Title, link to request, contextual information | P1 | Consistent notification format |

### 6.8 Permission and Security Requirements

| Req ID | Requirement | Priority | Rationale |
|--------|-------------|----------|-----------|
| BR-090 | The system shall break item-level permission inheritance when status changes from Draft to Legal Intake | P1 | Security and privacy |
| BR-091 | The system shall grant Submitter Read access to own requests after submission (no Edit access) | P1 | Prevent post-submission changes |
| BR-092 | The system shall grant Legal Admin group Full Control access to all non-Draft requests | P1 | Admin management capability |
| BR-093 | The system shall grant Attorney Assigner group Read access to requests in Assign Attorney status | P1 | Committee visibility |
| BR-094 | The system shall grant assigned Attorney Edit access to specific assigned request | P1 | Reviewer capability |
| BR-095 | The system shall grant Compliance Users group Edit access when Review Audience includes Compliance | P1 | Reviewer capability |
| BR-096 | The system shall update permissions via Azure Function triggered by Power Automate on status changes | P1 | Automated permission management |
| BR-097 | The system shall allow Legal Admin to manually add Ad-hoc Stakeholders with Read access to specific requests | P2 | Flexibility for observers |
| BR-098 | The system shall maintain audit log of all permission changes | P1 | Compliance and security audit |

### 6.9 Dashboard and Reporting Requirements

| Req ID | Requirement | Priority | Rationale |
|--------|-------------|----------|-----------|
| BR-100 | The system shall provide Submitter Dashboard showing: My Requests, Status, Assigned Attorney, Target Date | P1 | Submitter visibility |
| BR-101 | The system shall provide Legal Admin Dashboard showing: All Requests, Status filter, Rush flag, Assigned Attorney, Days in status | P1 | Admin workload management |
| BR-102 | The system shall provide Attorney Dashboard showing: My Assigned Requests, Status, Target Date, Days since assignment | P1 | Attorney workload visibility |
| BR-103 | The system shall provide Compliance Dashboard showing: Requests requiring compliance review, Status, Target Date | P1 | Compliance workload visibility |
| BR-104 | The system shall support filtering by Date Range, Submission Type, Status, Attorney, Rush flag | P2 | Dashboard flexibility |
| BR-105 | The system shall display Request Count by Status on all dashboards | P2 | Workload awareness |
| BR-106 | The system shall highlight Rush Requests visually (red flag or icon) on all dashboards | P2 | Priority visibility |
| BR-107 | The system shall provide exportable reports in Excel format | P3 | Offline analysis capability |
| BR-108 | The system shall provide analytics on Average Turnaround Time by Submission Item | P3 | Performance metrics |
| BR-109 | The system shall provide analytics on SLA Compliance Rate (% meeting Expected Date) | P3 | Performance metrics |

### 6.10 Audit Trail Requirements

| Req ID | Requirement | Priority | Rationale |
|--------|-------------|----------|-----------|
| BR-110 | The system shall log all status changes with timestamp and user | P1 | Core audit requirement |
| BR-111 | The system shall log all field modifications with old value, new value, timestamp, user | P1 | Core audit requirement |
| BR-112 | The system shall log all document uploads and deletions with timestamp and user | P1 | Document chain of custody |
| BR-113 | The system shall log all permission changes with timestamp and trigger | P1 | Security audit |
| BR-114 | The system shall log all notification sends with timestamp, recipient, notification type | P2 | Notification audit |
| BR-115 | The system shall provide Audit Log view accessible by Legal Admin showing all logged events | P2 | Audit review capability |
| BR-116 | The system shall retain audit logs for minimum 7 years (configurable) | P1 | Compliance retention policy |

### 6.11 Data Validation Requirements

| Req ID | Requirement | Priority | Rationale |
|--------|-------------|----------|-----------|
| BR-120 | The system shall validate Request Title is 3-255 characters | P1 | Data quality |
| BR-121 | The system shall validate Purpose is 10-10,000 characters | P1 | Meaningful descriptions |
| BR-122 | The system shall validate Target Return Date is a future date | P1 | Logical date constraint |
| BR-123 | The system shall validate at least one Review Document is uploaded before submission | P1 | Core requirement |
| BR-124 | The system shall validate at least one Approval is provided before submission | P1 | Core requirement |
| BR-125 | The system shall validate Rush Rationale is minimum 10 characters when request is Rush | P1 | Meaningful justification |
| BR-126 | The system shall validate file uploads do not exceed 250MB per file | P2 | SharePoint constraint |
| BR-127 | The system shall validate approval date is not in the future | P2 | Data integrity |
| BR-128 | The system shall prevent submission if required fields are empty | P1 | Data completeness |

### 6.12 User Experience Requirements

| Req ID | Requirement | Priority | Rationale |
|--------|-------------|----------|-----------|
| BR-130 | The system shall provide inline validation with real-time error messages | P2 | User-friendly form experience |
| BR-131 | The system shall display progress indicator during long operations (save, submit, upload) | P2 | User awareness |
| BR-132 | The system shall display success confirmation messages for all major actions | P2 | User feedback |
| BR-133 | The system shall provide contextual help text for complex fields | P3 | User guidance |
| BR-134 | The system shall autosave Draft requests every 2 minutes | P3 | Data loss prevention |
| BR-135 | The system shall support keyboard navigation for all interactive elements | P2 | Accessibility |
| BR-136 | The system shall comply with WCAG 2.1 AA accessibility standards | P1 | Legal compliance and inclusivity |
| BR-137 | The system shall load pages within 6 seconds under normal conditions | P2 | Performance requirement |

---

## 7. Functional Requirements

This section provides detailed functional requirements organized by feature area. These requirements expand on the business requirements in Section 6 with specific implementation details.

### 7.1 Request Creation and Submission

#### 7.1.1 Draft Request Management

**FR-001:** The system shall provide a "New Request" button on the Requests list homepage accessible to all Submitters.

**FR-002:** When a Submitter clicks "New Request," the system shall open a custom SPFx Form Customizer interface replacing the default SharePoint form.

**FR-003:** The system shall create a new list item with Status = "Draft" and Creator = current user.

**FR-004:** The system shall allow Submitters to populate required and optional fields in Draft status without validation (except field-level type validation).

**FR-005:** The system shall provide a "Save Draft" button that saves the current state and closes the form.

**FR-006:** The system shall allow Submitters to reopen Draft requests via "Edit" action to continue editing.

**FR-007:** The system shall allow Submitters to delete Draft requests via "Delete" action.

**FR-008:** The system shall not break item-level permissions for Draft requests (submitter retains full control).

#### 7.1.2 Request Information Fields

**FR-010:** The system shall auto-populate Department field from user profile metadata (hidden from form UI).

**FR-011:** The system shall provide Request Type as a dropdown choice field with values: Communication, General Review, IMA Review (Phase 1: Communication only).

**FR-012:** The system shall provide Request Title as a single-line text field with validation: 3-255 characters, required.

**FR-013:** The system shall provide Purpose as a rich text field with validation: 10-10,000 characters, required.

**FR-014:** The system shall provide Submission Type as a dropdown choice field with values: New, Material Updates.

**FR-015:** The system shall provide Submission Item as a lookup field to SubmissionItems list, displaying Title field, required.

**FR-016:** The system shall provide Distribution Method as a multi-choice field with options:
- Email
- Website
- Social Media
- Print Collateral
- Presentation
- Video
- Webinar
- Client Portal
- Other

**FR-017:** The system shall provide Target Return Date as a date picker with validation: must be future date, required.

**FR-018:** The system shall calculate Expected Turnaround Date when Submission Item is selected using formula: Created Date + Submission Item.TurnAroundTimeInDays (business days, excluding weekends).

**FR-019:** The system shall display Expected Turnaround Date as read-only field next to Target Return Date.

**FR-020:** The system shall auto-calculate IsRushRequest field: true if Target Return Date < Expected Date, otherwise false.

**FR-021:** The system shall conditionally display Rush Rationale rich text field (required, min 10 chars) if IsRushRequest = true.

**FR-022:** The system shall provide Review Audience as a dropdown choice field with values: Legal, Compliance, Both (default: Legal).

**FR-023:** The system shall provide Prior Submissions as a multi-lookup field to Requests list (optional).

**FR-024:** The system shall provide Prior Submission Notes as a multi-line text field (optional, max 500 chars).

**FR-025:** The system shall provide Date of First Use as a date picker (optional, future date).

**FR-026:** The system shall provide Additional Party as a people picker field allowing multiple selections (optional).

#### 7.1.3 Approval Management

**FR-030:** The system shall provide an Approvals repeater section where Submitters can add 1-6 approvals.

**FR-031:** Each approval shall capture:
- Approval Type (choice: Communications, Portfolio Manager, Research Analyst, SME, Performance Review, Other)
- Custom Approval Title (required if Approval Type = Other)
- Approval Date (date picker, required, must not be future date)
- Approver (person picker, required, single selection)
- Approval Document (file upload, required, one file per approval)

**FR-032:** The system shall store approval documents in RequestDocuments library with metadata linking to parent request.

**FR-033:** The system shall enforce minimum one approval before allowing submission.

**FR-034:** The system shall validate each approval is complete (all fields populated) before allowing submission.

**FR-035:** The system shall display all approvals in a grid view with columns: Type, Approver, Date, Document Name.

**FR-036:** The system shall allow Submitters to edit or delete approvals while in Draft status.

#### 7.1.4 Review Documents Management

**FR-040:** The system shall provide a Review Documents upload section where Submitters upload materials for review.

**FR-041:** The system shall support file uploads with validation: max 250MB per file, any file type accepted.

**FR-042:** The system shall store review documents in RequestDocuments library with metadata linking to parent request and DocumentType = "Review Material".

**FR-043:** The system shall enforce minimum one review document before allowing submission.

**FR-044:** The system shall display all review documents in a grid view with columns: File Name, Size, Uploaded Date.

**FR-045:** The system shall allow Submitters to upload additional documents or delete documents while in Draft status.

**FR-046:** The system shall prevent deletion of review documents after submission (Legal Admin can delete if needed).

#### 7.1.5 Request Submission

**FR-050:** The system shall provide a "Submit Request" button on the form (disabled if validation fails).

**FR-051:** When Submitter clicks "Submit Request," the system shall perform comprehensive validation:
- All required fields populated
- At least one approval with complete information
- At least one review document uploaded
- Target Return Date is future date
- Rush Rationale provided if IsRushRequest = true
- All field-level validations passed

**FR-052:** If validation fails, the system shall display error messages inline next to each invalid field and prevent submission.

**FR-053:** If validation passes, the system shall:
1. Auto-generate Request ID (Title field) in format CRR-{YEAR}-{COUNTER} where YEAR = current year (4 digits) and COUNTER = sequential number resetting each year
2. Set Status = "Legal Intake"
3. Set SubmittedBy = current user
4. Set SubmittedOn = current date/time
5. Save the list item

**FR-054:** After saving, the system shall trigger Power Automate flow "Request Submitted" which:
1. Calls Azure Function to break permission inheritance and set item-level permissions
2. Generates and sends "Request Submitted" notification email to Legal Admin group

**FR-055:** The system shall display success message: "Request {Request ID} submitted successfully. Legal Admin has been notified."

**FR-056:** The system shall close the form and redirect Submitter to request display mode (read-only view).

### 7.2 Legal Intake and Attorney Assignment

#### 7.2.1 Legal Intake Review

**FR-100:** When a request enters Legal Intake status, Legal Admin group members shall receive email notification with Request ID, Title, Submitter, Target Date, Rush flag, and link to request.

**FR-101:** Legal Admin shall open request in SharePoint and review for completeness:
- Verify all required fields populated
- Review approval documents
- Review materials for review
- Assess complexity and expertise required

**FR-102:** The system shall provide a Legal Intake section on the form (visible only to Legal Admin) with fields:
- Review Audience Override (dropdown: Legal, Compliance, Both) - allows Legal Admin to change Review Audience
- Direct Attorney Assignment (person picker: single selection from Attorneys group)
- Attorney Assignment Notes (rich text, max 1000 chars)
- Assignment Path choice: "Assign Directly" or "Send to Committee"

#### 7.2.2 Direct Attorney Assignment

**FR-110:** If Legal Admin selects "Assign Directly" path, the system shall:
1. Require selection of Attorney from people picker (filtered to Attorneys group)
2. Optionally allow Assignment Notes
3. Provide "Assign Attorney" button

**FR-111:** When Legal Admin clicks "Assign Attorney" (direct path), the system shall:
1. Set Attorney field = selected attorney
2. Set AttorneyAssignedBy = current user (Legal Admin)
3. Set AttorneyAssignedOn = current date/time
4. Set Status = "In Review"
5. Save the list item

**FR-112:** After saving, the system shall trigger Power Automate flow "Attorney Assigned Direct" which:
1. Updates item-level permissions to grant assigned Attorney Edit access
2. Generates and sends "Attorney Assigned (Direct)" notification to assigned Attorney

#### 7.2.3 Committee Attorney Assignment

**FR-120:** If Legal Admin selects "Send to Committee" path, the system shall provide "Send to Committee" button.

**FR-121:** When Legal Admin clicks "Send to Committee," the system shall:
1. Set Status = "Assign Attorney"
2. Set SentToCommitteeBy = current user
3. Set SentToCommitteeOn = current date/time
4. Save the list item

**FR-122:** After saving, the system shall trigger Power Automate flow "Sent to Committee" which:
1. Updates item-level permissions to grant Attorney Assigner group Read access
2. Generates and sends "Sent to Committee" notification to Attorney Assigner group

**FR-123:** Attorney Assigner committee members shall review request and discuss assignment (outside system).

**FR-124:** A committee member shall open the request and use the Attorney Assignment section (visible to Attorney Assigner group) to:
- Select Attorney from people picker (filtered to Attorneys group)
- Add Assignment Notes
- Click "Assign Attorney"

**FR-125:** When committee member clicks "Assign Attorney," the system shall:
1. Set Attorney field = selected attorney
2. Set AttorneyAssignedBy = current user (committee member)
3. Set AttorneyAssignedOn = current date/time
4. Set Status = "In Review"
5. Save the list item

**FR-126:** After saving, the system shall trigger Power Automate flow "Attorney Assigned Committee" which:
1. Updates item-level permissions to grant assigned Attorney Edit access
2. Generates and sends "Attorney Assigned (Committee)" notification to assigned Attorney

#### 7.2.4 Attorney Reassignment

**FR-130:** Legal Admin shall be able to reassign attorney at any time after initial assignment.

**FR-131:** The system shall provide "Reassign Attorney" action button visible only to Legal Admin.

**FR-132:** When Legal Admin clicks "Reassign Attorney," the system shall display a modal dialog with:
- Current Attorney (read-only display)
- New Attorney (people picker, required, filtered to Attorneys group)
- Reassignment Reason (rich text, required, max 500 chars)

**FR-133:** When Legal Admin confirms reassignment, the system shall:
1. Store old Attorney value in PreviousAttorney field (for audit)
2. Set Attorney field = new attorney
3. Set ReassignedBy = current user
4. Set ReassignedOn = current date/time
5. Set ReassignmentReason = provided reason
6. Save the list item

**FR-134:** After saving, the system shall trigger Power Automate flow "Attorney Reassigned" which:
1. Updates item-level permissions (remove old Attorney Edit access, grant new Attorney Edit access)
2. Generates and sends "Attorney Reassigned" notification to both old and new attorneys

### 7.3 Review Process

#### 7.3.1 Legal Review

**FR-200:** When request enters In Review status with Attorney assigned, Attorney shall receive email notification.

**FR-201:** Attorney shall open request and review all materials including:
- Request information fields
- Approval documents
- Review documents
- Any comments from Legal Admin or committee

**FR-202:** The system shall provide a Legal Review section on the form (visible only to assigned Attorney and Legal Admin) with fields:
- Legal Review Status (choice: Not Started, In Progress, Waiting On Submitter, Completed)
- Legal Review Outcome (choice: Approved, Approved With Comments, Not Approved)
- Legal Review Notes (rich text, required when Outcome is set, max 5000 chars)
- Legal Reviewer (auto-populated from Attorney field)
- Legal Review Date (auto-populated when Outcome is set)

**FR-203:** Attorney shall be able to upload additional reference documents (optional) using "Upload Reference Document" button.

**FR-204:** If Attorney needs additional information from Submitter:
1. Attorney sets Legal Review Status = "Waiting On Submitter"
2. Attorney adds comments describing what is needed in Legal Review Notes
3. Attorney clicks "Request More Info"
4. System triggers Power Automate flow sending "Waiting On Submitter" notification to Creator

**FR-205:** When Legal Review Status = "Waiting On Submitter," Submitter shall receive notification and be able to:
- Upload additional documents
- Add comments responding to Attorney's request
- Click "Respond to Reviewer"
- System triggers Power Automate flow sending "Submitter Response" notification to Attorney

**FR-206:** Attorney shall complete review by:
1. Setting Legal Review Outcome (Approved, Approved With Comments, or Not Approved)
2. Adding Legal Review Notes explaining decision and any required changes
3. Clicking "Submit Legal Review"
4. System sets Legal Review Status = "Completed", LegalReviewDate = current date/time, LegalReviewer = Attorney

**FR-207:** After Attorney submits Legal Review, system shall evaluate overall request status and update accordingly (see FR-250).

#### 7.3.2 Compliance Review

**FR-220:** If Review Audience = "Compliance" or "Both," the system shall trigger Power Automate flow when status changes to In Review, which:
1. Grants Compliance Users group Edit access to request
2. Sends "Compliance Review Required" notification to Compliance Users group

**FR-221:** Compliance Users shall open request and review all materials.

**FR-222:** The system shall provide a Compliance Review section on the form (visible only to Compliance Users and Legal Admin) with fields:
- Compliance Review Status (choice: Not Started, In Progress, Waiting On Submitter, Completed)
- Compliance Review Outcome (choice: Approved, Approved With Comments, Not Approved)
- Compliance Review Notes (rich text, required when Outcome is set, max 5000 chars)
- Compliance Reviewer (person picker, single selection)
- Compliance Review Date (auto-populated when Outcome is set)
- Is Foreside Review Required (Yes/No choice)
- Is Retail Use (Yes/No choice)
- Compliance Flags (multi-line text, optional, any compliance-specific flags or concerns)

**FR-223:** Compliance User shall complete review by:
1. Setting Compliance Review Outcome (Approved, Approved With Comments, or Not Approved)
2. Setting Is Foreside Review Required and Is Retail Use flags (required for compliance reviews)
3. Adding Compliance Review Notes
4. Setting Compliance Reviewer = current user
5. Clicking "Submit Compliance Review"
6. System sets Compliance Review Status = "Completed", ComplianceReviewDate = current date/time

**FR-224:** Compliance Users shall have same "Waiting On Submitter" capability as Legal reviewers (see FR-204, FR-205).

#### 7.3.3 Overall Status Determination

**FR-250:** After any review is submitted (Legal or Compliance), the system shall evaluate overall request status based on the following logic:

**If Review Audience = "Legal":**
- If Legal Review Outcome = "Not Approved" → Status = "Completed"
- If Legal Review Outcome = "Approved" or "Approved With Comments" → Status = "Closeout"

**If Review Audience = "Compliance":**
- If Compliance Review Outcome = "Not Approved" → Status = "Completed"
- If Compliance Review Outcome = "Approved" or "Approved With Comments" → Status = "Closeout"

**If Review Audience = "Both":**
- If Legal Review Outcome = "Not Approved" OR Compliance Review Outcome = "Not Approved" → Status = "Completed"
- If BOTH Legal Review Outcome AND Compliance Review Outcome = "Approved" or "Approved With Comments" → Status = "Closeout"
- Otherwise → Remain in "In Review"

**FR-251:** When status changes to Closeout, the system shall trigger Power Automate flow sending "Ready for Closeout" notification to Creator.

**FR-252:** When status changes to Completed due to rejection, the system shall trigger Power Automate flow sending "Review Completed (Single)" notification to Creator and Legal Admin.

### 7.4 Closeout and Completion

#### 7.4.1 Closeout Requirements

**FR-300:** When request enters Closeout status, Submitter shall receive "Ready for Closeout" notification.

**FR-301:** The system shall provide a Closeout section on the form (visible to Submitter and Legal Admin) with fields:
- Tracking ID (single-line text, max 50 chars, conditional required)
- Closeout Notes (multi-line text, optional, max 500 chars)

**FR-302:** The system shall determine if Tracking ID is required using logic:
- Required if: Review Audience included Compliance AND (IsForesideReviewRequired = Yes OR IsRetailUse = Yes)
- Optional otherwise

**FR-303:** If Tracking ID is required, the system shall display validation error if Submitter attempts to complete without providing it.

**FR-304:** Submitter shall review all information, approvals, reviews, and final documents, then click "Complete Request."

**FR-305:** When Submitter clicks "Complete Request," the system shall:
1. Validate Tracking ID if required
2. Set Status = "Completed"
3. Set CompletedBy = current user
4. Set CompletedOn = current date/time
5. Calculate TotalTurnaroundDays = business days between SubmittedOn and CompletedOn
6. Save the list item

**FR-306:** After saving, the system shall trigger Power Automate flow sending "Request Completed" notification to all stakeholders.

#### 7.4.2 Admin Closeout Override

**FR-310:** Legal Admin shall have the ability to mark request as Completed from any status (emergency override).

**FR-311:** The system shall provide "Mark as Completed" action button visible only to Legal Admin.

**FR-312:** When Legal Admin clicks "Mark as Completed," the system shall display confirmation dialog explaining this bypasses normal workflow.

**FR-313:** Upon confirmation, the system shall set Status = "Completed" and follow same logic as FR-305.

---

## 8. Use Cases

This section describes detailed use cases with scenarios, acceptance criteria, and branching paths for key workflows in the Legal Workflows System.

### 8.1 Use Case: Submit New Communication Request for Legal Review

**Actor:** Submitter (Marketing/Business Staff)

**Preconditions:**
- User is a member of LW - Submitters SharePoint group
- User has at least one approval document ready for upload
- User has communication material ready for legal review

**Main Success Scenario:**

1. Submitter navigates to Legal Workflows SharePoint site
2. Submitter clicks "New Request" button on Requests list
3. System opens custom SPFx form in new mode with Status = "Draft"
4. Submitter fills in required fields:
   - Request Title: "Q4 2025 Email Campaign - Asset Growth"
   - Purpose: Describes email campaign targeting existing clients
   - Request Type: Communication (auto-selected for Phase 1)
   - Submission Type: New
   - Submission Item: Marketing Email (turnaround: 3 business days)
   - Distribution Method: Email
   - Target Return Date: 5 business days from today
   - Review Audience: Legal (default)
5. System calculates Expected Turnaround Date (3 business days from today)
6. System determines Target Date > Expected Date, so IsRushRequest = false
7. Submitter adds Communications Approval:
   - Approval Type: Communications Approval
   - Approver: Jane Doe (Communications Director)
   - Approval Date: Yesterday's date
   - Uploads approval email screenshot (PDF)
8. Submitter uploads review document: "Q4-Email-Draft-v1.docx"
9. Submitter clicks "Submit Request"
10. System validates all required fields and documents
11. System generates Request ID: CRR-2025-42
12. System changes Status from Draft → Legal Intake
13. System breaks permission inheritance and sets item-level permissions
14. System sends notification email to Legal Admin group
15. System displays success message: "Request CRR-2025-42 submitted successfully."
16. System closes form and shows read-only view

**Acceptance Criteria:**
- ✓ Request created with unique CRR-{YEAR}-{COUNTER} ID
- ✓ Status = Legal Intake
- ✓ Submitter has Read access only (no Edit after submission)
- ✓ Legal Admin group has Full Control access
- ✓ Legal Admin receives email notification with request details and link
- ✓ All submitted data saved correctly
- ✓ Approval document uploaded to RequestDocuments library
- ✓ Review document uploaded to RequestDocuments library
- ✓ SubmittedBy and SubmittedOn fields populated

**Alternative Path 1: Rush Request**
- At Step 6, if Target Return Date < Expected Date:
  - System sets IsRushRequest = true
  - System displays Rush Rationale field (required)
  - Submitter must provide justification (min 10 chars)
  - Continues to Step 7

**Alternative Path 2: Validation Failure**
- At Step 10, if validation fails (e.g., missing required field):
  - System highlights invalid fields in red
  - System displays inline error messages
  - System prevents submission
  - Submitter corrects errors and retries from Step 9

**Alternative Path 3: Save as Draft**
- At any point before Step 9:
  - Submitter clicks "Save Draft"
  - System saves current state without validation
  - System closes form
  - Submitter can return later via Edit action

---

### 8.2 Use Case: Direct Attorney Assignment by Legal Admin

**Actor:** Legal Admin

**Preconditions:**
- Request exists in Legal Intake status
- User is member of LW - Legal Admin SharePoint group
- At least one Attorney exists in LW - Attorneys group

**Main Success Scenario:**

1. Legal Admin receives "Request Submitted" notification email
2. Legal Admin clicks link in email to open request CRR-2025-42
3. System displays request in read mode
4. Legal Admin clicks "Edit" to enter edit mode
5. Legal Admin reviews request information, approvals, and review documents
6. Legal Admin determines request is straightforward and can be directly assigned
7. Legal Admin expands Legal Intake section on form
8. Legal Admin reviews Review Audience (currently: Legal) - no override needed
9. Legal Admin selects assignment path: "Assign Directly"
10. Legal Admin selects Attorney: John Smith from people picker (filtered to Attorneys group)
11. Legal Admin adds Assignment Notes: "Standard email review, no special concerns"
12. Legal Admin clicks "Assign Attorney" button
13. System validates Attorney is selected
14. System sets Attorney = John Smith, AttorneyAssignedBy = current Legal Admin, AttorneyAssignedOn = now
15. System changes Status from Legal Intake → In Review
16. System saves list item
17. System triggers Power Automate flow which:
    - Calls Azure Function to grant John Smith Edit access to this request
    - Generates and sends "Attorney Assigned (Direct)" notification to John Smith
18. System displays success message: "Attorney John Smith assigned successfully."

**Acceptance Criteria:**
- ✓ Status = In Review
- ✓ Attorney field = John Smith
- ✓ AttorneyAssignedBy = Legal Admin who performed assignment
- ✓ AttorneyAssignedOn timestamp recorded
- ✓ Attorney Assignment Notes saved
- ✓ John Smith has Edit access to request
- ✓ John Smith receives email notification with request link
- ✓ Request visible in John Smith's "My Assigned Requests" dashboard

**Alternative Path 1: Override Review Audience**
- At Step 8:
  - Legal Admin determines Compliance review also needed
  - Legal Admin changes Review Audience from "Legal" to "Both"
  - Continues to Step 9
  - When Attorney assigns and status → In Review, Compliance Users also notified

**Alternative Path 2: Attorney Not Selected**
- At Step 13, if Attorney field is empty:
  - System displays validation error: "Please select an attorney"
  - System prevents save
  - Legal Admin selects attorney and retries from Step 12

---

### 8.3 Use Case: Committee Attorney Assignment

**Actor:** Legal Admin, Attorney Assigner (Committee Member)

**Preconditions:**
- Request exists in Legal Intake status
- User (Legal Admin) is member of LW - Legal Admin group
- Committee members exist in LW - Attorney Assigner group

**Main Success Scenario:**

1. Legal Admin opens request CRR-2025-43 (complex financial product review)
2. Legal Admin reviews request and determines specialized expertise needed
3. Legal Admin selects assignment path: "Send to Committee"
4. Legal Admin adds context notes for committee: "Complex derivatives product, needs securities law expertise"
5. Legal Admin clicks "Send to Committee" button
6. System changes Status from Legal Intake → Assign Attorney
7. System sets SentToCommitteeBy = current Legal Admin, SentToCommitteeOn = now
8. System saves list item
9. System triggers Power Automate flow which:
   - Grants Attorney Assigner group Read access to this request
   - Sends "Sent to Committee" notification to all Attorney Assigner group members
10. Committee members receive notification and review request (external discussion)
11. Committee member Sarah Johnson logs into SharePoint
12. Sarah opens request CRR-2025-43
13. Sarah reviews request details and committee discussion notes
14. Sarah expands Attorney Assignment section (visible to Attorney Assigner group)
15. Sarah selects Attorney: Michael Chen (securities law specialist)
16. Sarah adds Assignment Notes: "Assigned to Michael Chen for securities expertise, complex derivatives review"
17. Sarah clicks "Assign Attorney"
18. System sets Attorney = Michael Chen, AttorneyAssignedBy = Sarah Johnson, AttorneyAssignedOn = now
19. System changes Status from Assign Attorney → In Review
20. System saves list item
21. System triggers Power Automate flow which:
    - Grants Michael Chen Edit access to this request
    - Sends "Attorney Assigned (Committee)" notification to Michael Chen
22. System displays success message to Sarah

**Acceptance Criteria:**
- ✓ Initial status change: Legal Intake → Assign Attorney
- ✓ Attorney Assigner group has Read access during committee review
- ✓ All committee members receive "Sent to Committee" notification
- ✓ Final status change: Assign Attorney → In Review
- ✓ Attorney = Michael Chen
- ✓ AttorneyAssignedBy = Sarah Johnson (committee member)
- ✓ Michael Chen has Edit access to request
- ✓ Michael Chen receives notification
- ✓ Committee context notes preserved for audit

---

### 8.4 Use Case: Attorney Performs Legal Review and Approves With Comments

**Actor:** Attorney

**Preconditions:**
- Request exists in In Review status
- Attorney is assigned to the request
- Attorney has Edit access to the request

**Main Success Scenario:**

1. Attorney John Smith receives "Attorney Assigned (Direct)" notification
2. John clicks link to open request CRR-2025-42
3. System displays request in read mode with full details
4. John reviews:
   - Request Title and Purpose
   - Approval documents (downloads and reviews Communications approval)
   - Review documents (downloads Q4-Email-Draft-v1.docx)
5. John identifies minor legal language concerns (not material, but should be improved)
6. John clicks "Edit" to enter edit mode
7. John expands Legal Review section (visible to him as assigned Attorney)
8. John sets Legal Review Status = "In Progress"
9. John saves (intermediate save to track progress)
10. John completes analysis and drafts review notes in separate document
11. John returns to request edit mode
12. John sets Legal Review Outcome = "Approved With Comments"
13. John adds detailed Legal Review Notes:
    - "Email is generally acceptable for client distribution"
    - "Recommend changing 'guaranteed growth' to 'potential growth' on line 15"
    - "Remove absolute statement 'will outperform' in paragraph 3, replace with 'seeks to outperform'"
    - "Once revisions made, approved for distribution"
14. John clicks "Submit Legal Review"
15. System sets Legal Review Status = "Completed"
16. System sets Legal Review Date = current date/time
17. System sets Legal Reviewer = John Smith (auto-populated from Attorney field)
18. System evaluates overall status (Review Audience = Legal, Legal Review Outcome = Approved With Comments)
19. System determines: Outcome is approval variant → Status = Closeout
20. System saves list item
21. System triggers Power Automate flow which sends "Ready for Closeout" notification to Submitter
22. System displays success message to John: "Legal review submitted successfully."

**Acceptance Criteria:**
- ✓ Legal Review Status = Completed
- ✓ Legal Review Outcome = Approved With Comments
- ✓ Legal Review Notes captured with detailed feedback
- ✓ Legal Review Date timestamp recorded
- ✓ Legal Reviewer = John Smith
- ✓ Overall request Status = Closeout
- ✓ Submitter receives "Ready for Closeout" notification
- ✓ Review notes visible to Submitter in read mode

**Alternative Path 1: Request Additional Information**
- At Step 12, if John needs more information:
  - John sets Legal Review Status = "Waiting On Submitter"
  - John adds notes: "Please provide version with performance data citations"
  - John clicks "Request More Info"
  - System sends "Waiting On Submitter" notification to Submitter
  - System does NOT change overall Status (remains In Review)
  - Submitter uploads additional document
  - System sends "Submitter Response" notification to John
  - John reviews new information and continues from Step 12

**Alternative Path 2: Reject Material**
- At Step 12, if John identifies material legal issues:
  - John sets Legal Review Outcome = "Not Approved"
  - John adds detailed rejection notes explaining legal concerns
  - John clicks "Submit Legal Review"
  - System evaluates: Outcome = Not Approved → Status = Completed (bypasses Closeout)
  - System sends "Review Completed (Single)" notification to Submitter and Legal Admin
  - Workflow ends (request rejected)

---

### 8.5 Use Case: Dual Review (Legal and Compliance) - Both Approve

**Actor:** Attorney, Compliance User

**Preconditions:**
- Request exists with Review Audience = "Both"
- Attorney is assigned
- Compliance Users group has Edit access

**Main Success Scenario:**

1. Request CRR-2025-44 enters In Review status with Review Audience = Both
2. System triggers Power Automate flows:
   - Sends "Attorney Assigned" notification to assigned Attorney (Lisa Wong)
   - Sends "Compliance Review Required" notification to Compliance Users group
   - Grants Compliance Users group Edit access
3. Lisa Wong (Attorney) opens request and performs legal review
4. Lisa sets Legal Review Outcome = "Approved"
5. Lisa adds Legal Review Notes: "No legal concerns, approved for distribution"
6. Lisa clicks "Submit Legal Review"
7. System sets Legal Review Status = Completed, Legal Review Date = now
8. System evaluates status: Review Audience = Both, Legal = Approved, Compliance = Not Started → Remain In Review
9. Meanwhile, Compliance User Tom Brown receives notification
10. Tom opens request CRR-2025-44
11. Tom reviews materials from compliance perspective
12. Tom expands Compliance Review section
13. Tom sets Compliance Review Outcome = "Approved"
14. Tom sets Is Foreside Review Required = Yes
15. Tom sets Is Retail Use = Yes
16. Tom adds Compliance Review Notes: "Compliant with regulatory requirements, approved pending Foreside tracking ID"
17. Tom sets Compliance Reviewer = Tom Brown (self)
18. Tom clicks "Submit Compliance Review"
19. System sets Compliance Review Status = Completed, Compliance Review Date = now
20. System evaluates status: Review Audience = Both, Legal = Approved, Compliance = Approved → Status = Closeout
21. System determines Tracking ID required (Compliance reviewed + Foreside Required + Retail Use)
22. System saves list item
23. System triggers Power Automate flow sending "Ready for Closeout" notification to Submitter
24. Notification includes note: "Tracking ID is required for closeout"

**Acceptance Criteria:**
- ✓ Legal Review Status = Completed, Outcome = Approved
- ✓ Compliance Review Status = Completed, Outcome = Approved
- ✓ Legal Review Date and Compliance Review Date recorded
- ✓ Legal Reviewer = Lisa Wong, Compliance Reviewer = Tom Brown
- ✓ Is Foreside Review Required = Yes, Is Retail Use = Yes flags set
- ✓ Overall Status = Closeout
- ✓ Tracking ID determined as required
- ✓ Submitter receives closeout notification

**Alternative Path 1: Compliance Rejects**
- At Step 13, if Tom identifies compliance issues:
  - Tom sets Compliance Review Outcome = "Not Approved"
  - Tom adds detailed rejection notes
  - Tom clicks "Submit Compliance Review"
  - System evaluates: Review Audience = Both, ANY review = Not Approved → Status = Completed
  - Workflow ends (request rejected despite legal approval)

**Alternative Path 2: Reviews Happen in Reverse Order**
- Compliance review completes before legal review:
  - After Step 19, system evaluates: Legal = Not Started, Compliance = Approved → Remain In Review
  - When legal review later completes with Approved, system re-evaluates and moves to Closeout

---

### 8.6 Use Case: Submitter Completes Closeout with Tracking ID

**Actor:** Submitter

**Preconditions:**
- Request exists in Closeout status
- Tracking ID is required (Compliance reviewed + Foreside OR Retail)
- Submitter has received "Ready for Closeout" notification

**Main Success Scenario:**

1. Submitter receives "Ready for Closeout" notification email for CRR-2025-44
2. Notification indicates Tracking ID is required
3. Submitter obtains Tracking ID from Foreside system: "FS-2025-0987"
4. Submitter clicks link in email to open request
5. System displays request in read mode
6. Submitter clicks "Edit"
7. Submitter expands Closeout section
8. System displays Tracking ID field with indicator: "Required"
9. Submitter enters Tracking ID: "FS-2025-0987"
10. Submitter optionally adds Closeout Notes: "Foreside review completed, tracking ID obtained"
11. Submitter clicks "Complete Request"
12. System validates Tracking ID is provided (required field satisfied)
13. System sets Status = "Completed"
14. System sets CompletedBy = Submitter
15. System sets CompletedOn = current date/time
16. System calculates TotalTurnaroundDays = business days between SubmittedOn (e.g., Oct 1) and CompletedOn (e.g., Oct 8) = 5 business days
17. System saves list item
18. System triggers Power Automate flow sending "Request Completed" notification to all stakeholders
19. System displays success message: "Request CRR-2025-44 completed successfully."
20. System closes form and displays read-only view

**Acceptance Criteria:**
- ✓ Status = Completed
- ✓ Tracking ID = "FS-2025-0987"
- ✓ CompletedBy = Submitter
- ✓ CompletedOn timestamp recorded
- ✓ TotalTurnaroundDays calculated correctly (business days only)
- ✓ All stakeholders receive "Request Completed" notification
- ✓ Request visible in Completed view
- ✓ All data retained for audit (read-only for all except Legal Admin)

**Alternative Path 1: Tracking ID Not Required**
- At Step 8, if Tracking ID not required (Compliance not reviewed OR Foreside/Retail = No):
  - System displays Tracking ID field as optional
  - Submitter can complete without providing Tracking ID
  - Continues from Step 11

**Alternative Path 2: Submitter Attempts to Complete Without Required Tracking ID**
- At Step 12, if Tracking ID required but not provided:
  - System displays validation error: "Tracking ID is required to complete this request"
  - System prevents completion
  - Submitter enters Tracking ID and retries from Step 11

---

### 8.7 Use Case: Legal Admin Cancels Request

**Actor:** Legal Admin

**Preconditions:**
- Request exists in any status except Completed or Cancelled
- User is member of LW - Legal Admin group

**Main Success Scenario:**

1. Legal Admin receives request from Submitter to cancel CRR-2025-45 (duplicate request)
2. Legal Admin opens request CRR-2025-45 (currently in Legal Intake status)
3. Legal Admin clicks "Edit"
4. Legal Admin clicks "Cancel Request" action button (visible only to Legal Admin)
5. System displays confirmation dialog: "Are you sure you want to cancel this request? This action cannot be undone."
6. Dialog includes required Cancellation Reason text field
7. Legal Admin enters Cancellation Reason: "Duplicate of CRR-2025-40, submitted by error"
8. Legal Admin clicks "Confirm Cancellation"
9. System sets Status = "Cancelled"
10. System sets CancelledBy = Legal Admin
11. System sets CancelledOn = current date/time
12. System sets CancellationReason = provided reason
13. System saves list item
14. System triggers Power Automate flow sending "Request Cancelled" notification to all stakeholders
15. System displays success message: "Request CRR-2025-45 cancelled successfully."

**Acceptance Criteria:**
- ✓ Status = Cancelled
- ✓ CancelledBy = Legal Admin
- ✓ CancelledOn timestamp recorded
- ✓ Cancellation Reason captured
- ✓ All stakeholders receive notification with cancellation details
- ✓ Request no longer appears in active dashboards (only in Cancelled view)
- ✓ Request data retained for audit

**Alternative Path 1: Submitter Cancels Own Draft**
- If request in Draft status:
  - Submitter can cancel own draft request
  - Same cancellation process applies
  - Only Submitter notified (no other stakeholders involved yet)

---

### 8.8 Use Case: Legal Admin Places Request On Hold

**Actor:** Legal Admin

**Preconditions:**
- Request exists in active status (Legal Intake, Assign Attorney, In Review, or Closeout)
- User is member of LW - Legal Admin group

**Main Success Scenario:**

1. Legal Admin receives communication that external regulatory review is pending for related materials
2. Legal Admin decides to place CRR-2025-46 on hold until external review completes
3. Legal Admin opens request CRR-2025-46 (currently in In Review status)
4. Legal Admin clicks "Edit"
5. Legal Admin clicks "Place On Hold" action button
6. System displays confirmation dialog with required Hold Reason text field
7. Legal Admin enters Hold Reason: "Pending external regulatory review, expected duration 2 weeks"
8. Legal Admin clicks "Confirm Hold"
9. System stores PreviousStatus = "In Review" (for resume functionality)
10. System sets Status = "On Hold"
11. System sets OnHoldBy = Legal Admin
12. System sets OnHoldOn = current date/time
13. System sets HoldReason = provided reason
14. System saves list item
15. System triggers Power Automate flow sending "Request On Hold" notification to all stakeholders
16. System displays success message

**Acceptance Criteria:**
- ✓ Status = On Hold
- ✓ Previous Status stored for resume
- ✓ OnHoldBy = Legal Admin
- ✓ OnHoldOn timestamp recorded
- ✓ Hold Reason captured
- ✓ All stakeholders notified with hold details
- ✓ Request appears in On Hold dashboard view

**Branching Path: Legal Admin Resumes Request**

1. Two weeks later, external review completes
2. Legal Admin opens request CRR-2025-46 (Status = On Hold)
3. Legal Admin clicks "Edit"
4. Legal Admin clicks "Resume Request" action button
5. System displays confirmation: "Resume request to previous status: In Review?"
6. Legal Admin clicks "Confirm Resume"
7. System sets Status = PreviousStatus ("In Review")
8. System sets ResumedBy = Legal Admin
9. System sets ResumedOn = current date/time
10. System saves list item
11. System triggers Power Automate flow sending "Request Resumed" notification to active participants (Attorney, Submitter)
12. System displays success message

**Resume Acceptance Criteria:**
- ✓ Status returned to previous active status (In Review)
- ✓ ResumedBy = Legal Admin
- ✓ ResumedOn timestamp recorded
- ✓ Active participants (Attorney, Submitter) notified
- ✓ Request returns to active dashboards
- ✓ Workflow continues from where it was paused

---

## 9. User Interface Functional Requirements

### 9.1 Form Layout and Design

**UI-001:** The system shall use a custom SPFx Form Customizer to replace the default SharePoint form with a modern, responsive React-based interface.

**UI-002:** The form shall use a 70/30 layout:
- Left panel (70%): Form fields organized by section
- Right panel (30%): Comments/activity feed

**UI-003:** The form shall use the spfx-toolkit Card component for section grouping with collapsible sections:
- Request Information
- Approvals
- Review Documents
- Legal Intake (role-based visibility)
- Legal Review (role-based visibility)
- Compliance Review (role-based visibility)
- Closeout (role-based visibility)

**UI-004:** The form shall use Fluent UI v8 components for consistent Microsoft 365 look and feel.

**UI-005:** The form shall display a workflow stepper at the top showing current status and progress:
- Draft → Legal Intake → Assign Attorney (conditional) → In Review → Closeout → Completed

**UI-006:** The workflow stepper shall highlight the current status and show completed statuses as checked.

### 9.2 Field Controls and Validation

**UI-010:** Text fields shall use DevExtreme TextBox component with:
- Character count display (e.g., "125/255 characters")
- Real-time validation feedback (green checkmark or red X)
- Inline error messages below field

**UI-011:** Rich text fields shall use DevExtreme HtmlEditor component with formatting toolbar:
- Bold, Italic, Underline
- Bullet lists, numbered lists
- Link insertion
- No image upload (to prevent large file embedding)

**UI-012:** Date fields shall use DevExtreme DateBox component with:
- Calendar picker
- Date format: MM/DD/YYYY
- Validation for future/past dates as required
- Business day highlighting (Phase 2: exclude holidays)

**UI-013:** People picker fields shall use PnP React PeoplePicker component with:
- Type-ahead search
- Single or multiple selection as specified
- Display of user photo, name, and email
- Filtering to specific SharePoint groups where applicable

**UI-014:** Choice fields shall use Fluent UI Dropdown component with:
- Searchable dropdown for >5 options
- Standard dropdown for ≤5 options
- Clear selection button

**UI-015:** Multi-choice fields shall use Fluent UI Checkbox group with "Select All" option.

**UI-016:** File upload fields shall use custom upload component with:
- Drag-and-drop support
- Multi-file upload capability
- Upload progress bar
- File type and size validation
- Preview of uploaded files with delete option

### 9.3 Conditional Visibility and Dynamic Behavior

**UI-020:** Rush Rationale field shall only be visible when IsRushRequest = true.

**UI-021:** Custom Approval Title field shall only be visible when Approval Type = "Other".

**UI-022:** Legal Intake section shall only be visible to Legal Admin group members.

**UI-023:** Attorney Assignment section (in Assign Attorney status) shall only be visible to Attorney Assigner group members and Legal Admin.

**UI-024:** Legal Review section shall only be visible to assigned Attorney and Legal Admin.

**UI-025:** Compliance Review section shall only be visible to Compliance Users group and Legal Admin when Review Audience = "Compliance" or "Both".

**UI-026:** Closeout section shall only be visible when Status = "Closeout" to Submitter and Legal Admin.

**UI-027:** Tracking ID field shall display "Required" indicator if Compliance reviewed AND (Foreside OR Retail), otherwise display "Optional".

**UI-028:** Expected Turnaround Date shall update dynamically when Submission Item is changed.

**UI-029:** IsRushRequest flag shall update dynamically when Target Return Date or Submission Item changes.

### 9.4 Action Buttons and Commands

**UI-030:** The form shall provide role-based action buttons in the command bar:
- **All users:** Close (read mode)
- **Submitter (Draft status):** Save Draft, Delete Draft, Submit Request
- **Submitter (Closeout status):** Complete Request
- **Legal Admin:** Assign Attorney, Send to Committee, Reassign Attorney, Cancel Request, Place On Hold, Resume Request, Mark as Completed
- **Attorney Assigner:** Assign Attorney (in Assign Attorney status)
- **Attorney:** Submit Legal Review, Request More Info, Upload Reference Document
- **Compliance User:** Submit Compliance Review, Request More Info
- **Submitter (Waiting On Submitter):** Respond to Reviewer

**UI-031:** Action buttons shall be disabled with tooltip explanation when action is not available (e.g., "Submit Request" disabled until all validation passes).

**UI-032:** Destructive actions (Cancel, Delete) shall display confirmation dialogs with required reason fields.

**UI-033:** All action buttons shall display loading spinner during processing and be disabled to prevent double-submission.

### 9.5 Dashboards and List Views

**UI-040:** The system shall provide the following SharePoint list views:

1. **My Requests** (Submitters):
   - Columns: Request ID, Request Title, Status, Assigned Attorney, Target Return Date, Days in Status, Rush Flag
   - Filter: Created By = [Me]
   - Sort: Modified descending

2. **All Requests** (Legal Admin):
   - Columns: Request ID, Request Title, Submitter, Status, Assigned Attorney, Target Return Date, Days in Status, Rush Flag
   - Filter: None (all non-Draft requests)
   - Sort: Modified descending

3. **My Assigned Requests** (Attorneys):
   - Columns: Request ID, Request Title, Submitter, Status, Target Return Date, Days Since Assignment, Rush Flag
   - Filter: Attorney = [Me] AND Status NOT IN (Completed, Cancelled)
   - Sort: Target Return Date ascending (urgent first)

4. **Compliance Reviews** (Compliance Users):
   - Columns: Request ID, Request Title, Submitter, Status, Target Return Date, Compliance Review Status, Rush Flag
   - Filter: Review Audience IN (Compliance, Both) AND Status = In Review
   - Sort: Target Return Date ascending

5. **Pending Legal Intake** (Legal Admin):
   - Columns: Request ID, Request Title, Submitter, Submitted On, Target Return Date, Rush Flag
   - Filter: Status = Legal Intake
   - Sort: Submitted On ascending (FIFO)

6. **Pending Committee Assignment** (Attorney Assigner):
   - Columns: Request ID, Request Title, Submitter, Target Return Date, Sent to Committee On, Rush Flag
   - Filter: Status = Assign Attorney
   - Sort: Sent to Committee On ascending

7. **Closeout Pending** (Submitters, Legal Admin):
   - Columns: Request ID, Request Title, Submitter, Target Return Date, Tracking ID Required
   - Filter: Status = Closeout
   - Sort: Modified descending

8. **Completed Requests**:
   - Columns: Request ID, Request Title, Submitter, Completed On, Total Turnaround Days, Legal Review Outcome, Compliance Review Outcome
   - Filter: Status = Completed
   - Sort: Completed On descending

9. **Cancelled Requests**:
   - Columns: Request ID, Request Title, Submitter, Cancelled On, Cancelled By, Cancellation Reason
   - Filter: Status = Cancelled
   - Sort: Cancelled On descending

10. **On Hold Requests**:
    - Columns: Request ID, Request Title, Previous Status, On Hold By, On Hold On, Hold Reason
    - Filter: Status = On Hold
    - Sort: On Hold On descending

**UI-041:** Rush requests shall be highlighted with red flag icon in all list views.

**UI-042:** All list views shall support column sorting, filtering, and grouping via SharePoint standard functionality.

**UI-043:** List views shall support export to Excel via SharePoint standard export feature.

### 9.6 Comments and Activity Feed

**UI-050:** The right panel (30% of form) shall display a comments/activity feed showing:
- All comments added by users
- System activity (status changes, assignment changes, review submissions)
- Chronological order (most recent at top)

**UI-051:** The comments section shall provide a rich text editor for adding new comments with @mention support.

**UI-052:** When user types "@" in comment editor, the system shall display a people picker dropdown filtered to stakeholders with access to the request.

**UI-053:** @mentioned users shall receive "User Tagged in Comment" notification email.

**UI-054:** System activity items shall be styled differently from user comments (e.g., italic text, different background).

**UI-055:** Each comment shall display: Author photo, name, timestamp, comment text.

**UI-056:** Users shall be able to edit or delete their own comments (Legal Admin can delete any comment).

### 9.7 Accessibility Requirements

**UI-060:** All interactive elements shall have descriptive aria-label attributes.

**UI-061:** Form shall support full keyboard navigation:
- Tab/Shift+Tab: Navigate between fields
- Enter: Activate buttons/links
- Space: Toggle checkboxes
- Esc: Close dialogs/pickers

**UI-062:** Error messages shall use role="alert" for screen reader announcement.

**UI-063:** Loading states shall use role="status" with appropriate aria-live="polite" announcement.

**UI-064:** Form shall comply with WCAG 2.1 AA standards including:
- Color contrast ratio ≥4.5:1 for normal text
- Color contrast ratio ≥3:1 for large text
- Focus indicators visible on all interactive elements
- No reliance on color alone to convey information

**UI-065:** Skip links shall be provided to jump to main content sections.

### 9.8 Responsive Design

**UI-070:** Form shall be responsive and adapt to screen sizes:
- Desktop (≥1200px): 70/30 layout (form left, comments right)
- Tablet (768-1199px): Stacked layout with tabs (Form tab, Comments tab)
- Mobile (<768px): Single column, collapsible sections

**UI-071:** All Fluent UI and DevExtreme components shall inherit responsive behavior from frameworks.

**UI-072:** Touch targets shall be minimum 44x44 pixels for mobile devices.

---

## 10. User Interface Integration Requirements

### 10.1 SharePoint Integration

**INT-001:** The system shall integrate with SharePoint Online using SPFx 1.21.1 framework.

**INT-002:** The Form Customizer shall register for the "Requests" list and replace default SharePoint new/edit/display forms.

**INT-003:** The system shall use SharePoint lists as primary data storage:
- Requests list (73 fields)
- SubmissionItems list (Title, TurnAroundTimeInDays, Description)
- RequestDocuments library (with metadata columns)

**INT-004:** The system shall use SharePoint Groups for role-based access control:
- LW - Submitters
- LW - Legal Admin
- LW - Attorney Assigner
- LW - Attorneys
- LW - Compliance Users
- LW - Admin

**INT-005:** The system shall leverage SharePoint built-in version history for audit trail (enabled on Requests list with versioning for all columns).

**INT-006:** The system shall use SharePoint search for request discovery and filtering.

### 10.2 Azure Functions Integration

**INT-010:** The system shall integrate with two Azure Functions via Power Automate:

**Azure Function 1: Permission Management**
- **Endpoint:** POST /api/PermissionManagement
- **Trigger:** Power Automate on status change (Draft → Legal Intake, Legal Intake → In Review, etc.)
- **Input:** Request ID, New Status, Assigned Attorney, Review Audience, SharePoint Site URL
- **Processing:**
  - Break permission inheritance on list item
  - Grant permissions based on status and role requirements
  - Return success/failure status
- **Output:** JSON response with success flag and permission changes applied

**Azure Function 2: Notification Content Generation**
- **Endpoint:** POST /api/NotificationGeneration
- **Trigger:** Power Automate on workflow events (submission, assignment, completion, etc.)
- **Input:** Request ID, Notification Type, SharePoint Site URL, Recipient Role
- **Processing:**
  - Fetch request details from SharePoint
  - Generate notification email content based on template and request data
  - Return formatted email subject and body
- **Output:** JSON response with email subject, body (HTML), and recipient list

**INT-011:** Azure Functions shall authenticate to SharePoint using managed identity or certificate-based authentication.

**INT-012:** Azure Functions shall implement retry logic (3 attempts with exponential backoff) for SharePoint API calls.

**INT-013:** Azure Functions shall log all operations to Application Insights for monitoring and troubleshooting.

### 10.3 Power Automate Integration

**INT-020:** The system shall use Power Automate flows for workflow orchestration and notifications.

**INT-021:** The system shall implement the following Power Automate flows:

1. **Request Submitted** (Trigger: Status → Legal Intake)
   - Call Azure Function: Permission Management
   - Call Azure Function: Notification Generation (type: Request Submitted)
   - Send email to Legal Admin group

2. **Attorney Assigned Direct** (Trigger: Legal Intake → In Review, with Attorney assigned)
   - Call Azure Function: Permission Management
   - Call Azure Function: Notification Generation (type: Attorney Assigned Direct)
   - Send email to assigned Attorney

3. **Sent to Committee** (Trigger: Legal Intake → Assign Attorney)
   - Call Azure Function: Permission Management
   - Call Azure Function: Notification Generation (type: Sent to Committee)
   - Send email to Attorney Assigner group

4. **Attorney Assigned Committee** (Trigger: Assign Attorney → In Review)
   - Call Azure Function: Permission Management
   - Call Azure Function: Notification Generation (type: Attorney Assigned Committee)
   - Send email to assigned Attorney

5. **Compliance Review Required** (Trigger: Status → In Review AND Review Audience IN (Compliance, Both))
   - Call Azure Function: Permission Management
   - Call Azure Function: Notification Generation (type: Compliance Review Required)
   - Send email to Compliance Users group

6. **Attorney Reassigned** (Trigger: Attorney field changed)
   - Call Azure Function: Permission Management
   - Call Azure Function: Notification Generation (type: Attorney Reassigned)
   - Send email to old and new Attorneys

7. **Waiting On Submitter** (Trigger: Legal Review Status OR Compliance Review Status → Waiting On Submitter)
   - Call Azure Function: Notification Generation (type: Waiting On Submitter)
   - Send email to Creator

8. **Submitter Response** (Trigger: Document uploaded AND Status = Waiting On Submitter)
   - Call Azure Function: Notification Generation (type: Submitter Response)
   - Send email to Attorney/Compliance

9. **Ready for Closeout** (Trigger: Status → Closeout)
   - Call Azure Function: Notification Generation (type: Ready for Closeout)
   - Send email to Creator

10. **Request Completed** (Trigger: Status → Completed)
    - Call Azure Function: Notification Generation (type: Request Completed)
    - Send email to all stakeholders

11. **Request Cancelled** (Trigger: Status → Cancelled)
    - Call Azure Function: Notification Generation (type: Request Cancelled)
    - Send email to all stakeholders

12. **Request On Hold** (Trigger: Status → On Hold)
    - Call Azure Function: Notification Generation (type: Request On Hold)
    - Send email to all stakeholders

13. **Request Resumed** (Trigger: Status changed FROM On Hold)
    - Call Azure Function: Notification Generation (type: Request Resumed)
    - Send email to active participants

14. **User Tagged in Comment** (Trigger: Comment added with @mention)
    - Parse @mentions from comment
    - Call Azure Function: Notification Generation (type: User Tagged in Comment)
    - Send email to tagged users

15. **Review Completed Single** (Trigger: Legal Review OR Compliance Review Outcome set AND overall Status → Completed)
    - Call Azure Function: Notification Generation (type: Review Completed Single)
    - Send email to Creator and Legal Admin

**INT-022:** All Power Automate flows shall implement error handling with notifications to IT Admin email on failure.

**INT-023:** Power Automate flows shall log execution details to SharePoint list "WorkflowLogs" for audit and troubleshooting.

**INT-024:** Power Automate flows shall use service account credentials stored in Azure Key Vault for SharePoint authentication.

### 10.4 Email Notification Integration

**INT-030:** All notification emails shall be sent via Power Automate "Send an email (V2)" action using Exchange Online.

**INT-031:** Notification emails shall use HTML templates stored in SharePoint document library "EmailTemplates" for consistent branding.

**INT-032:** Notification emails shall include:
- Subject line with Request ID and notification type
- HTML body with request summary and call-to-action button
- Direct link to request in SharePoint (deep link to display form)
- Footer with system name and support contact

**INT-033:** Notification emails shall support @mentions by dynamically building recipient list from comment parsing.

**INT-034:** The system shall maintain a notification log in SharePoint list "NotificationLog" with columns:
- Request ID, Notification Type, Recipient, Sent Date/Time, Delivery Status

---

## 11. Integration Functional Requirements

### 11.1 Document Management

**DINT-001:** The system shall store all documents in SharePoint document library "RequestDocuments" with metadata columns:
- RequestID (lookup to Requests list)
- DocumentType (choice: Approval Document, Review Material, Reference Document, Other)
- UploadedBy (person)
- UploadedOn (date/time)
- ApprovalType (choice, for approval documents only)

**DINT-002:** The system shall enforce co-location constraint: Request list item and associated documents stored in same SharePoint site.

**DINT-003:** The system shall enable versioning on RequestDocuments library to track document changes (major versions only).

**DINT-004:** The system shall allow document download but not inline editing (to prevent accidental modification of evidence).

**DINT-005:** The system shall prevent deletion of approval documents and review documents after request submission (Legal Admin can delete if absolutely necessary).

### 11.2 User Profile Integration

**DINT-010:** The system shall integrate with Microsoft 365 user profiles via Microsoft Graph API to:
- Auto-populate Department field from user profile
- Display user photos in people pickers and comments
- Provide user email and phone for notifications

**DINT-011:** The system shall cache user profile data in browser session storage to minimize Graph API calls.

**DINT-012:** The system shall handle users without profile photos gracefully (display initials placeholder).

### 11.3 Audit and Logging Integration

**DINT-020:** The system shall leverage SharePoint built-in audit logging to track:
- Item created, modified, deleted events
- Permission changes
- Document uploads, downloads, deletions
- User access (viewed item)

**DINT-021:** The system shall implement custom logging to SharePoint list "AuditLog" for business events:
- Status changes (old value, new value, changed by, timestamp)
- Field modifications (field name, old value, new value, changed by, timestamp)
- Attorney assignments/reassignments
- Review outcomes
- Cancellation, hold, resume actions

**DINT-022:** The system shall retain audit logs for 7 years (configurable) to meet compliance requirements.

**DINT-023:** Legal Admin shall have access to "Audit Log Viewer" page displaying filterable audit log entries.

---

## 12. Configuration Functional Requirements

### 12.1 Submission Items Management

**CFG-001:** The system shall provide a SharePoint list "SubmissionItems" for managing submission types and turnaround times.

**CFG-002:** Legal Admin and IT Admin shall be able to add, edit, or delete submission items.

**CFG-003:** Each submission item shall have:
- Title (single-line text, required, unique)
- TurnAroundTimeInDays (number, required, 1-30 business days)
- Description (multi-line text, optional)
- IsActive (Yes/No, default: Yes)

**CFG-004:** The system shall only display active submission items in Request Form dropdown.

**CFG-005:** Deactivating a submission item shall NOT affect existing requests using that item (read-only reference retained).

**CFG-006:** The system shall prevent deletion of submission items referenced by existing requests (display error message with request count).

### 12.2 User Group Management

**CFG-010:** IT Admin shall manage SharePoint group memberships via SharePoint Site Settings → People and Groups.

**CFG-011:** The system shall automatically recognize group membership changes without requiring code deployment.

**CFG-012:** IT Admin shall be able to add/remove users from groups:
- LW - Submitters (all employees who submit requests)
- LW - Legal Admin (legal administrative staff)
- LW - Attorney Assigner (committee members who assign attorneys)
- LW - Attorneys (legal reviewers)
- LW - Compliance Users (compliance reviewers)
- LW - Admin (IT administrators with full site control)

**CFG-013:** A user may be member of multiple groups (e.g., Legal Admin AND Attorney).

**CFG-014:** The system shall display appropriate UI elements and action buttons based on highest privilege group membership.

### 12.3 Email Template Configuration

**CFG-020:** IT Admin shall manage email notification templates via SharePoint document library "EmailTemplates".

**CFG-021:** Each email template shall be an HTML file named by notification type (e.g., "RequestSubmitted.html").

**CFG-022:** Email templates shall support placeholders for dynamic content:
- {RequestID}, {RequestTitle}, {Submitter}, {TargetReturnDate}, {RushFlag}, {Status}, {Attorney}, {RequestURL}, {ReviewerNotes}, {TrackingIDRequired}, etc.

**CFG-023:** Azure Function "Notification Content Generation" shall replace placeholders with actual request data.

**CFG-024:** IT Admin shall be able to update email templates without code deployment (changes effective immediately on next notification).

### 12.4 System Settings

**CFG-030:** The system shall maintain a SharePoint list "SystemSettings" with key-value pairs for configuration:
- AuditLogRetentionYears (default: 7)
- MaxFileUploadSizeMB (default: 250)
- AutosaveDraftIntervalMinutes (default: 2, Phase 1: not implemented)
- SupportEmail (email address for help/support)
- SystemName (display name for branding)

**CFG-031:** IT Admin shall be able to modify system settings via SharePoint list (changes effective on page refresh).

**CFG-032:** The system shall validate system settings on load and display warning if invalid values detected.

---

## 13. Data Management Requirements

### 13.1 Data Model

**DM-001:** The system shall maintain the following primary data entities in SharePoint Online:

**Requests List** (73 fields organized into sections):

- **Request Information** (17 fields): Title (Request ID), Department, RequestType, RequestTitle, Purpose, SubmissionType, SubmissionItem, DistributionMethod, TargetReturnDate, IsRushRequest, RushRationale, ReviewAudience, PriorSubmissions, PriorSubmissionNotes, DateOfFirstUse, AdditionalParty, ExpectedTurnaroundDate

- **Approval Fields** (18 fields): CommunicationsApproval, CommunicationsApprovalDate, CommunicationsApprover, CommunicationsApprovalDoc, PortfolioManagerApproval, PortfolioManagerApprovalDate, PortfolioManagerApprover, PortfolioManagerApprovalDoc, ResearchAnalystApproval, ResearchAnalystApprovalDate, ResearchAnalystApprover, ResearchAnalystApprovalDoc, SMEApproval, SMEApprovalDate, SMEApprover, SMEApprovalDoc, PerformanceApproval (similar pattern), OtherApproval (similar pattern with custom title)

- **Legal Intake** (2 fields): Attorney, AttorneyAssignNotes

- **Legal Review** (5 fields): LegalReviewStatus, LegalReviewOutcome, LegalReviewNotes, LegalReviewer, LegalReviewDate

- **Compliance Review** (7 fields): ComplianceReviewStatus, ComplianceReviewOutcome, ComplianceReviewNotes, ComplianceReviewer, ComplianceReviewDate, IsForesideReviewRequired, IsRetailUse

- **Closeout** (1 field): TrackingId

- **System Tracking** (16 fields): Status, SubmittedBy, SubmittedOn, AttorneyAssignedBy, AttorneyAssignedOn, SentToCommitteeBy, SentToCommitteeOn, CompletedBy, CompletedOn, CancelledBy, CancelledOn, CancellationReason, OnHoldBy, OnHoldOn, HoldReason, PreviousStatus, ResumedBy, ResumedOn, TotalTurnaroundDays

**SubmissionItems List** (4 fields):
- Title (text, unique)
- TurnAroundTimeInDays (number)
- Description (multi-line text)
- IsActive (Yes/No)

**RequestDocuments Library** (5 metadata fields):
- RequestID (lookup to Requests)
- DocumentType (choice)
- UploadedBy (person)
- UploadedOn (date/time)
- ApprovalType (choice, conditional)

**Supporting Lists**:
- **AuditLog**: EventType, RequestID, FieldName, OldValue, NewValue, ChangedBy, ChangedOn, EventDetails
- **NotificationLog**: RequestID, NotificationType, Recipient, SentOn, DeliveryStatus
- **WorkflowLogs**: FlowName, RequestID, TriggerType, ExecutionStatus, StartTime, EndTime, ErrorDetails
- **SystemSettings**: SettingKey, SettingValue, Description, ModifiedBy, ModifiedOn
- **EmailTemplates**: Document library containing HTML template files

**DM-002:** All SharePoint lists and libraries shall use standard SharePoint field types (Text, Note, Choice, Number, DateTime, Person, Lookup, Yes/No).

**DM-003:** The system shall enforce referential integrity for lookup fields (RequestID in RequestDocuments must reference existing request).

**DM-004:** The system shall enable versioning on Requests list (major and minor versions tracked for all columns).

**DM-005:** The system shall enable versioning on RequestDocuments library (major versions only, retain all versions indefinitely).

### 13.2 Data Validation Rules

**DM-010:** The system shall enforce the following field-level validation rules:

| Field Name | Validation Rule |
|------------|----------------|
| RequestTitle | Required; Min 3 chars, Max 255 chars; No special characters except hyphen, underscore, parentheses |
| Purpose | Required; Min 10 chars, Max 10,000 chars |
| TargetReturnDate | Required; Must be future date (≥ tomorrow) |
| RushRationale | Required if IsRushRequest = true; Min 10 chars, Max 1000 chars |
| Attorney | Required when Status ≠ Draft, Legal Intake, Assign Attorney |
| LegalReviewNotes | Required when LegalReviewOutcome is set; Max 5000 chars |
| ComplianceReviewNotes | Required when ComplianceReviewOutcome is set; Max 5000 chars |
| TrackingId | Required when Status = Closeout AND (IsForesideReviewRequired OR IsRetailUse) AND Review Audience included Compliance; Max 50 chars |
| CancellationReason | Required when Status = Cancelled; Min 10 chars, Max 500 chars |
| HoldReason | Required when Status = On Hold; Min 10 chars, Max 500 chars |
| ApprovalDate (all types) | Must not be future date |

**DM-011:** The system shall enforce cross-field validation rules:

- If IsRushRequest = true, RushRationale must be provided
- If SubmissionType = "Material Updates", PriorSubmissions should be populated (warning, not error)
- If Review Audience = "Compliance" or "Both", at least one Compliance User must have access
- If any Approval Type = "Other", corresponding Custom Approval Title must be provided
- TargetReturnDate must be ≥ ExpectedTurnaroundDate - 2 business days (to prevent unrealistic requests)

**DM-012:** The system shall enforce business rule validation:

- At least one approval must be provided before submission (minimum 1, maximum 6)
- At least one review document must be uploaded before submission
- Status transitions must follow allowed workflow paths (enforced via status transition matrix)
- Request ID (Title field) can only be set by system on submission (user cannot manually edit)

### 13.3 Data Integrity and Consistency

**DM-020:** The system shall implement the following data integrity controls:

**Concurrency Control:**
- Use SharePoint's built-in optimistic concurrency (version check on save)
- If version conflict detected, display error: "This request has been modified by another user. Please refresh and try again."
- User must refresh to see latest data and retry changes

**Orphan Prevention:**
- RequestDocuments with invalid RequestID (deleted request) shall be flagged in weekly maintenance job
- IT Admin notified of orphaned documents for manual review and cleanup

**Data Consistency:**
- When Attorney is reassigned, PreviousAttorney field must be set to old value before update
- When Status changes, system shall update corresponding tracking fields (SubmittedBy/On, CompletedBy/On, etc.)
- When request is placed On Hold, PreviousStatus must be captured for resume functionality

**DM-021:** The system shall implement the following data archival strategy:

**Active Data (0-2 years):**
- All requests remain in Requests list for 2 years after completion
- Full search, reporting, and access capabilities

**Archived Data (2-7 years):**
- Completed requests older than 2 years moved to "RequestsArchive" list (Phase 2)
- Read-only access via separate archive view
- Limited search capability

**Retention Beyond 7 Years:**
- Legal Admin determines retention beyond 7 years based on legal requirements
- Data export to external archive system (Phase 2)

### 13.4 Data Migration and Import

**DM-030:** The system shall support initial data import for go-live:

- Import historical requests from Excel spreadsheet tracking log
- Map Excel columns to SharePoint fields
- Validate all data before import
- Import process creates requests in Completed status with historical dates
- Import logs all actions and errors for review

**DM-031:** The system shall provide data export capabilities:

- Export to Excel from any list view (standard SharePoint functionality)
- Export all fields or selected fields
- Export respects user permissions (only exports data user can access)

**DM-032:** The system shall NOT support bulk data editing (to prevent accidental data corruption; all edits via form only).

### 13.5 Data Security and Privacy

**DM-040:** The system shall implement the following data security controls:

**Encryption:**
- Data encrypted at rest (SharePoint Online default encryption)
- Data encrypted in transit via HTTPS/TLS 1.2+ (SharePoint Online enforced)

**Access Control:**
- Item-level permissions break inheritance after submission
- Role-based access enforced via SharePoint groups
- Audit logging tracks all data access (who accessed what and when)

**Data Masking:**
- No PII (Personally Identifiable Information) stored in system except user names from M365 profiles
- Approval documents may contain sensitive data; access restricted to authorized roles only

**Data Deletion:**
- Requests cannot be permanently deleted; only status change to Cancelled
- Documents can only be deleted by Legal Admin (soft delete to recycle bin with 93-day retention)
- Recycle bin items can be permanently deleted only by Site Collection Admin

**DM-041:** The system shall implement privacy controls:

- User data sourced from M365 directory; no separate user database
- Comments and notes visible only to users with access to request
- @mentioned users automatically granted Read access to request (explicit consent via @mention)
- Users can request removal of their comments (Legal Admin approval required for audit trail preservation)

---

## 14. Data Quality Rules Requirements

### 14.1 Data Quality Validation

**DQ-001:** The system shall enforce data quality rules at point of entry:

**Completeness:**
- All required fields must be populated before submission
- Empty or whitespace-only values rejected for text fields
- Null values rejected for required date, person, and choice fields

**Accuracy:**
- Email addresses validated via regex pattern (for notification purposes)
- Dates validated for logical consistency (e.g., Approval Date ≤ Today)
- Numeric fields (turnaround days) validated for range: 1-30

**Consistency:**
- Choice field values must match predefined options (no free-text entry)
- Person fields must resolve to valid M365 user accounts
- Lookup fields must reference existing items in target list

**Uniqueness:**
- Request ID (Title) must be unique across all requests
- System auto-generates to ensure uniqueness; user cannot manually set

**DQ-002:** The system shall provide data quality feedback:

- Real-time inline validation with immediate error messages
- Summary of all validation errors displayed at top of form
- Error messages shall be specific and actionable (e.g., "Purpose must be at least 10 characters. Current length: 5 characters.")

### 14.2 Data Quality Monitoring

**DQ-010:** The system shall monitor data quality through automated checks:

**Weekly Data Quality Report** (generated by scheduled Power Automate flow):
- Requests in Draft status >30 days (potential abandoned drafts)
- Requests in Legal Intake >5 business days (SLA breach risk)
- Requests in In Review >10 business days without review outcome
- Requests in Closeout >5 business days (follow-up needed)
- Orphaned documents (RequestID not matching any active request)
- Requests missing expected fields (data migration issues)

**DQ-011:** Legal Admin shall receive weekly data quality report via email with summary metrics and link to detailed report view.

**DQ-012:** IT Admin shall have access to "Data Quality Dashboard" showing:
- Count of validation errors by field (trend over time)
- Top 5 fields with most frequent errors
- User error rates (for targeted training)

### 14.3 Data Cleansing

**DQ-020:** The system shall support data cleansing activities:

**Manual Cleansing:**
- Legal Admin can edit any field on any request (with audit trail)
- Bulk cleanup not supported (prevents mass data corruption)
- Each correction logged in AuditLog

**Automated Cleansing:**
- Trim whitespace from text fields on save
- Standardize date format to MM/DD/YYYY on display
- Convert empty strings to null for optional fields

**DQ-021:** The system shall provide data validation override for emergency scenarios:

- Legal Admin can mark request as Completed even if validation fails (e.g., missing Tracking ID in emergency)
- Override action requires reason (min 20 chars)
- Override logged in AuditLog with high-priority flag
- IT Admin notified of all overrides

---

## 15. Data Readiness Status Requirements

### 15.1 Pre-Go-Live Data Readiness

**DR-001:** The following data must be populated before system go-live:

**Master Data:**
- SubmissionItems list populated with all submission types and turnaround times (minimum 10 items)
- SharePoint groups created and at least one member in each group
- EmailTemplates library populated with all 15 notification templates
- SystemSettings list populated with default values

**Test Data:**
- At least 10 test requests created covering all workflow paths
- At least 3 completed requests
- At least 2 requests in each status (Draft, Legal Intake, Assign Attorney, In Review, Closeout)
- Test documents uploaded for all test requests

**User Data:**
- All pilot users added to appropriate SharePoint groups
- All pilot users validated can log in and access site
- All pilot users have M365 licenses and email addresses

**DR-002:** The system shall include a "Data Readiness Checklist" SharePoint page listing all prerequisites with status indicators (Complete / Incomplete / Not Started).

**DR-003:** IT Admin shall complete data readiness checklist and obtain sign-off from Legal Admin before go-live.

### 15.2 Post-Go-Live Data Validation

**DR-010:** Within first week of go-live, the following data validation activities shall occur:

- Review all submitted requests for data quality issues
- Validate all notifications sent successfully
- Verify all permissions set correctly
- Check all document uploads succeeded
- Confirm all audit logs capturing events

**DR-011:** Any data issues identified in first week shall be logged in "Go-Live Issues" SharePoint list with priority and assigned owner for resolution.

**DR-012:** Weekly data quality review meetings shall occur for first month after go-live to monitor data health.

### 15.3 Ongoing Data Maintenance

**DR-020:** The following data maintenance activities shall occur on a recurring basis:

**Weekly:**
- Review data quality report
- Clean up abandoned drafts (>60 days old, auto-delete via Power Automate)
- Monitor workflow logs for errors

**Monthly:**
- Review audit log for anomalies
- Verify backup/restore procedures (IT Admin)
- Update SubmissionItems list as needed (Legal Admin)

**Quarterly:**
- Archive completed requests >2 years old (Phase 2)
- Review and update email templates
- Review system settings and adjust as needed

**Annually:**
- Compliance audit of all completed requests
- Review data retention policy
- Purge data beyond retention period (per legal requirements)

**DR-021:** IT Admin shall maintain a "Data Maintenance Calendar" documenting all scheduled maintenance activities and completion status.

---

## 16. Non-Functional Requirements

### 16.1 Performance Requirements

**NFR-001:** The system shall meet the following performance criteria:

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Page Load Time (Form) | ≤6 seconds | Browser DevTools Network tab, 90th percentile |
| Document Upload (10MB) | ≤10 seconds | Timed from click to success message |
| Search Results | ≤3 seconds | SharePoint search response time |
| Notification Delivery | ≤2 minutes | Time from trigger to email received |
| Power Automate Flow Execution | ≤30 seconds | Flow run history duration |
| Azure Function Response Time | ≤5 seconds | Application Insights metrics |
| Concurrent User Support | 50 users | Load testing validation |

**NFR-002:** The system shall be tested under load scenarios:
- 50 concurrent users submitting requests
- 100 concurrent users viewing requests
- 20 concurrent document uploads

**NFR-003:** If performance targets are not met, system shall display progress indicators and informative messages (e.g., "Processing your request, this may take up to 30 seconds...").

### 16.2 Scalability Requirements

**NFR-010:** The system shall scale to support:
- Up to 10,000 requests per year
- Up to 50,000 total requests in Requests list (5-year horizon)
- Up to 200,000 documents in RequestDocuments library
- Up to 200 active users

**NFR-011:** The system shall implement SharePoint list indexing on the following columns to maintain performance with large data volumes:
- Status (Requests list)
- SubmittedOn (Requests list)
- Attorney (Requests list)
- TargetReturnDate (Requests list)
- RequestID (RequestDocuments library)

**NFR-012:** If list approaches 30,000 items (view threshold warning), IT Admin shall implement list partitioning or archival strategy.

### 16.3 Availability Requirements

**NFR-020:** The system shall be available during business hours:
- **Business Hours:** Monday-Friday, 7:00 AM - 7:00 PM Eastern Time
- **Target Availability:** 99.5% during business hours (approximately 2 hours downtime per month acceptable)
- **Planned Maintenance:** Communicated 1 week in advance; scheduled outside business hours

**NFR-021:** The system availability shall be dependent on Microsoft 365 service availability:
- SharePoint Online SLA: 99.9% (per Microsoft)
- Power Automate SLA: 99.9% (per Microsoft)
- Azure Functions SLA: 99.95% (per Microsoft)

**NFR-022:** In case of service disruption:
- Users notified via email and banner on SharePoint site
- Estimated restoration time communicated
- Critical requests can be submitted via email to Legal Admin as fallback (manual entry after restoration)

### 16.4 Reliability Requirements

**NFR-030:** The system shall implement error handling and recovery:

**Error Handling:**
- All uncaught JavaScript errors logged to browser console and Application Insights
- User-friendly error messages displayed (no technical stack traces)
- Errors categorized: User Error (validation), System Error (bug), External Error (SharePoint/Azure)

**Retry Logic:**
- SharePoint REST API calls: 3 retries with exponential backoff (1s, 2s, 4s)
- Azure Function calls: 3 retries via Power Automate retry policy
- Document uploads: Manual retry via "Retry Upload" button if failure

**Graceful Degradation:**
- If comments section fails to load, form remains functional with warning message
- If user profile photos fail to load, display initials placeholder
- If notification send fails, log error and retry via daily background job

**NFR-031:** The system shall maintain data consistency during failures:
- All database operations wrapped in SharePoint batching/transactions where possible
- If form save fails partway through, all changes rolled back (atomic operation)
- If permission update fails, request remains in previous status until manual correction

### 16.5 Security Requirements

**NFR-040:** The system shall enforce the following security controls:

**Authentication:**
- Microsoft Entra ID (Azure AD) authentication required
- Multi-Factor Authentication (MFA) enforced for all users (organizational policy)
- No anonymous access permitted

**Authorization:**
- Role-Based Access Control (RBAC) via SharePoint groups
- Item-level permissions enforced via broken inheritance
- Least privilege principle: users granted minimum permissions required

**Data Protection:**
- All data encrypted at rest (AES-256)
- All data encrypted in transit (TLS 1.2+)
- No sensitive data logged to browser console or Application Insights

**Session Management:**
- SharePoint Online session timeout: 24 hours (Microsoft default)
- Idle timeout: 1 hour of inactivity logs user out
- Session tokens managed by Microsoft platform

**Input Validation:**
- All user input sanitized to prevent XSS (Cross-Site Scripting)
- SQL injection not applicable (no SQL queries; SharePoint REST API only)
- File upload validation: file type, file size, malware scan (SharePoint Online ATP)

**NFR-041:** The system shall pass security review:
- Penetration testing (annual)
- Vulnerability scanning (quarterly via Microsoft Defender)
- Security audit (annual, aligned with SOC 2 compliance)

### 16.6 Compliance and Audit Requirements

**NFR-050:** The system shall comply with the following regulations and standards:

**Regulatory Compliance:**
- SOX (Sarbanes-Oxley): Complete audit trail, segregation of duties
- FINRA: Communication review and archival requirements
- SEC: Recordkeeping for marketing materials
- GDPR: Right to access, right to erasure (for EU data subjects, if applicable)

**Audit Requirements:**
- 100% of actions logged (create, update, delete, view)
- Audit logs immutable (append-only, no deletion except by Site Collection Admin)
- Audit logs retained for 7 years minimum
- Audit log export capability for external auditors

**Compliance Monitoring:**
- Monthly compliance reports generated: % requests with complete approvals, % requests meeting SLA
- Quarterly compliance audit by Legal Admin
- Annual external audit by independent auditor

**NFR-051:** The system shall provide compliance reports:

1. **Approvals Completeness Report:**
   - All requests with approval documentation
   - Requests missing any approval evidence (should be 0%)

2. **SLA Compliance Report:**
   - % requests completed within Expected Turnaround Date
   - Average turnaround time by Submission Item type
   - Rush request statistics

3. **Audit Trail Report:**
   - All status changes for a given request
   - All permission changes for a given request
   - All field modifications with old/new values

### 16.7 Usability Requirements

**NFR-060:** The system shall meet the following usability criteria:

**Ease of Use:**
- New users able to submit first request within 10 minutes with minimal training
- Average time to submit request: <5 minutes (after initial learning)
- Error rate: <5% of submissions fail validation on first attempt

**User Satisfaction:**
- Post-deployment survey: ≥80% users rate system as "Satisfied" or "Very Satisfied"
- System Usability Scale (SUS) score: ≥70 (above average)

**Training:**
- Role-based quick reference guides (1-2 pages each)
- Video tutorials (<5 minutes each)
- In-app help text and tooltips

**Accessibility:**
- WCAG 2.1 AA compliance verified
- Screen reader compatibility (JAWS, NVDA)
- Keyboard-only navigation supported
- High contrast mode supported

**NFR-061:** The system shall support multiple browsers:
- Chrome 90+ (recommended)
- Edge 90+
- Firefox 85+
- Safari 14+
- IE11 NOT supported

**NFR-062:** The system shall be responsive and support the following devices:
- Desktop (primary experience)
- Tablet (iPad, Surface Pro - limited support)
- Mobile (view-only, no form editing)

### 16.8 Maintainability Requirements

**NFR-070:** The system shall be designed for maintainability:

**Code Quality:**
- TypeScript with strict type checking (no `any` types)
- ESLint compliance with SPFx ruleset (zero errors, minimal warnings)
- Code comments for complex business logic
- Unit test coverage: ≥60% (Phase 2: ≥80%)

**Documentation:**
- Technical Design Document (TDD)
- Deployment Guide
- Administrator Guide
- User Guides (by role)
- API documentation (Azure Functions)

**Version Control:**
- Source code in Git repository
- Branching strategy: main (production), develop (active development), feature branches
- All changes reviewed via Pull Request

**Deployment:**
- SPFx package (.sppkg) deployed via SharePoint App Catalog
- Azure Functions deployed via Azure DevOps pipeline
- Power Automate flows exported as ZIP and stored in source control

**NFR-071:** The system shall support version upgrades:
- Backward compatibility maintained for 1 prior major version
- Upgrade path documented
- Rollback plan documented and tested

### 16.9 Supportability Requirements

**NFR-080:** The system shall provide support capabilities:

**Logging and Diagnostics:**
- Application Insights integration for frontend and Azure Functions
- Verbose logging enabled in Development environment
- Error logging only in Production environment
- Log retention: 90 days

**Monitoring:**
- Power Automate flow run history monitored daily
- Azure Function failures trigger alert to IT Admin
- SharePoint site health monitored via M365 Admin Center

**Support Channels:**
- Email: legal-workflows-support@company.com
- Teams channel: Legal Workflows Users
- IT Helpdesk ticket system for critical issues

**Service Level Agreements (SLA):**
- Critical (system down): Response in 2 hours, resolution in 8 hours
- High (major functionality broken): Response in 4 hours, resolution in 24 hours
- Medium (minor issue, workaround available): Response in 1 business day, resolution in 5 business days
- Low (question, enhancement request): Response in 2 business days

**NFR-081:** The system shall include troubleshooting guides for common issues:
- "Request submission failed" - check network, retry, contact support
- "Attorney not receiving notification" - check email spam folder, verify group membership
- "Document upload failed" - check file size, file type, retry upload

---

## 17. Approval Workflow Details

### 17.1 Approval Types and Requirements

The system supports six approval types to accommodate various organizational approval processes:

| Approval Type | Description | Required For | Typical Approver Role |
|---------------|-------------|--------------|----------------------|
| **Communications Approval** | Approval from Communications department for messaging, tone, and brand compliance | Marketing emails, shareholder letters, external communications | Communications Director, Marketing Manager |
| **Portfolio Manager Approval** | Approval from Portfolio Manager for investment strategy, portfolio composition, and performance attribution | Investment strategy materials, portfolio commentaries, performance reports | Portfolio Manager, CIO |
| **Research Analyst Approval** | Approval from Research Analyst for research findings, data accuracy, and methodology | Research reports, market outlooks, white papers | Senior Research Analyst, Head of Research |
| **Subject Matter Expert (SME) Approval** | Approval from domain expert for technical accuracy and subject matter correctness | Technical content, product specifications, complex strategies | Product Specialist, Technical Expert, Economist |
| **Performance Review Approval** | Approval from Performance team for performance data accuracy, calculation methodology, and compliance | Performance advertising, fact sheets, presentations with returns | Performance Analyst, Compliance (Performance) |
| **Other Approval** | Custom approval type for non-standard approval requirements | Any material requiring approval not fitting above categories | Varies (user specifies custom title) |

### 17.2 Approval Capture Process

Each approval must include the following components:

1. **Approval Type Selection:** User selects from dropdown (Communications, Portfolio Manager, Research Analyst, SME, Performance Review, Other)
2. **Custom Approval Title:** If "Other" selected, user must provide descriptive title (e.g., "CFO Financial Review", "Risk Committee Approval")
3. **Approval Date:** Date when approval was obtained (must not be future date; typically within past 30 days)
4. **Approver:** Person who granted approval (selected via people picker; must be valid M365 user)
5. **Approval Document:** Evidence of approval uploaded as file (accepted formats: PDF, DOCX, XLSX, MSG, PNG, JPG)

### 17.3 Approval Document Types

Acceptable forms of approval evidence include:

- **Email Screenshot/Export:** Screenshot or exported .MSG file showing approver's email confirmation
- **Signed Document:** PDF with wet signature or digital signature from approver
- **Approval Form:** Completed approval form template (if organization uses standardized forms)
- **Meeting Notes:** Meeting minutes or notes documenting verbal approval
- **Chat Transcript:** Exported Teams/Slack conversation showing approval
- **E-Signature Document:** DocuSign, Adobe Sign, or similar e-signature platform output

### 17.4 Approval Validation Rules

The system enforces the following validation rules:

**Minimum Approvals:**
- At least ONE approval required before request submission
- No maximum limit, but UI supports up to 6 approvals efficiently

**Approval Completeness:**
- All five components must be provided for each approval (Type, Date, Approver, Document, Title if Other)
- Incomplete approvals (missing any component) prevent request submission

**Approval Date Validation:**
- Must not be future date
- Warning displayed if >90 days in past (unusual but not blocking)

**Approver Validation:**
- Must resolve to valid M365 user account
- Can be same person for multiple approval types (e.g., one manager approves both Communications and SME)
- Approver can be different from Submitter (no self-approval restriction at system level; organizational policy may restrict)

**Document Upload:**
- Max file size: 250MB per approval document
- All file types accepted (organization trusts submitter to upload appropriate evidence)
- File name should be descriptive (e.g., "Comms_Approval_Jane_Doe_2025-01-15.pdf")

### 17.5 Approval Review by Legal Admin

During Legal Intake, Legal Admin reviews all approvals for:

**Completeness Check:**
- All required approvals present based on submission type
- Approval documents legible and clearly show approval

**Appropriateness Check:**
- Approver has authority to approve for selected approval type
- Approval date reasonable relative to submission date

**Evidence Quality:**
- Approval document clearly shows approver identity, approval statement, and date
- If unclear, Legal Admin may contact Submitter for clarification before assignment

**Remediation:**
- If approval is insufficient, Legal Admin can place request On Hold and request additional approval evidence from Submitter
- Submitter uploads corrected/additional approval document, and workflow resumes

### 17.6 Approval Audit Trail

All approval information is retained for audit purposes:

- Approval documents stored in RequestDocuments library with metadata linking to parent request
- Approval documents never deleted (even if request cancelled)
- Audit logs capture: Who uploaded, when uploaded, any changes to approval metadata
- Legal Admin can generate "Approvals Report" showing all approvals for a given time period

---

## 18. Status Transition Matrix

### 18.1 Allowed Status Transitions

The following table defines all permitted status transitions in the Legal Workflows System:

| From Status | To Status | Trigger | Authorized Roles | Conditions |
|-------------|-----------|---------|------------------|------------|
| **Draft** | Legal Intake | Submitter clicks "Submit Request" | Submitter | All required fields populated; ≥1 approval; ≥1 review document |
| **Draft** | Cancelled | Submitter clicks "Delete Draft" | Submitter | None (Draft can always be deleted) |
| **Legal Intake** | In Review | Legal Admin clicks "Assign Attorney" (direct path) | Legal Admin | Attorney selected |
| **Legal Intake** | Assign Attorney | Legal Admin clicks "Send to Committee" | Legal Admin | None |
| **Legal Intake** | Cancelled | Legal Admin clicks "Cancel Request" | Legal Admin | Cancellation reason provided |
| **Legal Intake** | On Hold | Legal Admin clicks "Place On Hold" | Legal Admin | Hold reason provided |
| **Assign Attorney** | In Review | Committee Member clicks "Assign Attorney" | Attorney Assigner | Attorney selected |
| **Assign Attorney** | Cancelled | Legal Admin clicks "Cancel Request" | Legal Admin | Cancellation reason provided |
| **Assign Attorney** | On Hold | Legal Admin clicks "Place On Hold" | Legal Admin | Hold reason provided |
| **In Review** | Closeout | Review(s) completed with Approved/Approved With Comments | System (auto) | ALL required reviews = Approved OR Approved With Comments |
| **In Review** | Completed | Review(s) completed with Not Approved | System (auto) | ANY required review = Not Approved |
| **In Review** | Cancelled | Legal Admin clicks "Cancel Request" | Legal Admin | Cancellation reason provided |
| **In Review** | On Hold | Legal Admin clicks "Place On Hold" | Legal Admin | Hold reason provided |
| **Closeout** | Completed | Submitter clicks "Complete Request" | Submitter | Tracking ID provided if required |
| **Closeout** | Completed | Legal Admin clicks "Mark as Completed" | Legal Admin | Override reason provided (emergency) |
| **Closeout** | Cancelled | Legal Admin clicks "Cancel Request" | Legal Admin | Cancellation reason provided |
| **Closeout** | On Hold | Legal Admin clicks "Place On Hold" | Legal Admin | Hold reason provided |
| **On Hold** | [Previous Status] | Legal Admin clicks "Resume Request" | Legal Admin | None (resumes to PreviousStatus) |
| **On Hold** | Cancelled | Legal Admin clicks "Cancel Request" | Legal Admin | Cancellation reason provided |
| **Completed** | - | Terminal state | - | No transitions allowed from Completed |
| **Cancelled** | - | Terminal state | - | No transitions allowed from Cancelled |

### 18.2 Status Transition Business Rules

**Draft → Legal Intake:**
- System auto-generates Request ID (CRR-{YEAR}-{COUNTER})
- System breaks permission inheritance and sets item-level permissions
- SubmittedBy and SubmittedOn fields populated
- Power Automate flow "Request Submitted" triggered (notification to Legal Admin)

**Legal Intake → In Review (Direct):**
- Attorney field populated
- AttorneyAssignedBy and AttorneyAssignedOn fields populated
- Power Automate flow "Attorney Assigned Direct" triggered (permission update + notification)

**Legal Intake → Assign Attorney:**
- SentToCommitteeBy and SentToCommitteeOn fields populated
- Power Automate flow "Sent to Committee" triggered (permission update + notification to committee)

**Assign Attorney → In Review:**
- Attorney field populated
- AttorneyAssignedBy and AttorneyAssignedOn fields populated
- Power Automate flow "Attorney Assigned Committee" triggered (permission update + notification)

**In Review → Closeout:**
- ALL required review outcomes = Approved OR Approved With Comments
- LegalReviewOutcome, LegalReviewer, LegalReviewDate fields populated (if Legal review required)
- ComplianceReviewOutcome, ComplianceReviewer, ComplianceReviewDate fields populated (if Compliance review required)
- Power Automate flow "Ready for Closeout" triggered (notification to Submitter)

**In Review → Completed (Rejection):**
- ANY required review outcome = Not Approved
- Power Automate flow "Review Completed Single" triggered (notification to Submitter and Legal Admin)
- Closeout bypassed

**Closeout → Completed:**
- TrackingId populated if required (Compliance reviewed AND (IsForesideReviewRequired OR IsRetailUse))
- CompletedBy and CompletedOn fields populated
- TotalTurnaroundDays calculated (business days from SubmittedOn to CompletedOn)
- Power Automate flow "Request Completed" triggered (notification to all stakeholders)

**Any Active Status → On Hold:**
- PreviousStatus field populated with current status
- OnHoldBy, OnHoldOn, HoldReason fields populated
- Power Automate flow "Request On Hold" triggered (notification to all stakeholders)

**On Hold → [Previous Status]:**
- Status set to value from PreviousStatus field
- ResumedBy and ResumedOn fields populated
- Power Automate flow "Request Resumed" triggered (notification to active participants)

**Any Non-Terminal Status → Cancelled:**
- CancelledBy, CancelledOn, CancellationReason fields populated
- Power Automate flow "Request Cancelled" triggered (notification to all stakeholders)

### 18.3 Status Transition Validation

The system prevents invalid status transitions through the following mechanisms:

**UI Controls:**
- Action buttons only displayed when status transition is valid for current user's role and current status
- Example: "Assign Attorney" button only visible to Legal Admin when Status = Legal Intake OR Attorney Assigner when Status = Assign Attorney

**Backend Validation:**
- SPFx form validates status transition before saving
- If invalid transition detected, display error: "This action is not allowed for the current request status. Please refresh the page."

**Concurrency Protection:**
- SharePoint optimistic concurrency prevents simultaneous conflicting updates
- If two users attempt status change simultaneously, second user receives version conflict error and must refresh

### 18.4 Status Transition Audit

All status transitions are logged in AuditLog list with the following information:

- **RequestID:** CRR-{YEAR}-{COUNTER}
- **EventType:** "Status Change"
- **OldValue:** Previous status
- **NewValue:** New status
- **ChangedBy:** User or "System" (for auto-transitions)
- **ChangedOn:** Timestamp
- **EventDetails:** Additional context (e.g., "Attorney John Smith assigned", "Rejection: Not Approved by Legal", "Tracking ID: FS-2025-0987")

Legal Admin can view full status transition history for any request via "Audit Log Viewer" page.

---

## 19. Permission and Security Requirements

### 19.1 SharePoint Group Membership

The system defines six SharePoint groups for role-based access control:

| Group Name | Description | Typical Members | Permissions Level (Site) |
|------------|-------------|-----------------|--------------------------|
| **LW - Submitters** | Users who create and submit review requests | All employees (Marketing, Sales, Product, etc.) | Contribute |
| **LW - Legal Admin** | Legal administrative staff who triage and manage requests | Legal Administrators, Legal Coordinators | Full Control |
| **LW - Attorney Assigner** | Committee members who assign attorneys to complex requests | Senior Attorneys, Practice Group Leads | Read (site-level); Edit (item-level when assigned) |
| **LW - Attorneys** | Legal reviewers who perform legal analysis | All Attorneys | Read (site-level); Edit (item-level when assigned) |
| **LW - Compliance Users** | Compliance reviewers who perform regulatory review | Compliance Analysts, Compliance Officers | Read (site-level); Edit (item-level when assigned) |
| **LW - Admin** | IT administrators with full system access | IT Support, SharePoint Admins | Full Control |

**Group Membership Management:**
- IT Admin adds/removes users via SharePoint Site Settings → People and Groups
- Users can be members of multiple groups (privileges stack; highest level applies)
- Group membership changes effective immediately (no code deployment required)

### 19.2 Item-Level Permission Model

The system implements dynamic item-level permissions that change based on workflow status:

#### 19.2.1 Draft Status

**Permission Inheritance:** Inherited (not broken)

| Group | Permission Level | Can Read | Can Edit | Can Delete |
|-------|------------------|----------|----------|------------|
| LW - Submitters | Contribute | Own items only | Own items only | Own items only |
| LW - Legal Admin | Full Control | All | All | All |
| LW - Admin | Full Control | All | All | All |

**Rationale:** Submitters have full control of own drafts; Legal Admin can see all drafts for monitoring/support.

#### 19.2.2 Legal Intake Status

**Permission Inheritance:** Broken (triggered by Power Automate when Draft → Legal Intake)

| Group/User | Permission Level | Can Read | Can Edit | Can Delete |
|------------|------------------|----------|----------|------------|
| Submitter (Creator) | Read | Yes | No | No |
| LW - Legal Admin | Full Control | Yes | Yes | Yes (Cancel only) |
| LW - Attorney Assigner | Read | Yes | No | No |
| LW - Attorneys | None | No | No | No |
| LW - Compliance Users | None | No | No | No |
| LW - Admin | Full Control | Yes | Yes | Yes |

**Rationale:** Submitter can no longer edit after submission (prevents changes after approval); Legal Admin has full control for triage; Committee can view for awareness.

#### 19.2.3 Assign Attorney Status

**Permission Inheritance:** Broken (maintained from Legal Intake)

| Group/User | Permission Level | Can Read | Can Edit | Can Delete |
|------------|------------------|----------|----------|------------|
| Submitter (Creator) | Read | Yes | No | No |
| LW - Legal Admin | Full Control | Yes | Yes | Yes (Cancel only) |
| LW - Attorney Assigner | Edit | Yes | Yes (Assign Attorney only) | No |
| LW - Attorneys | None | No | No | No |
| LW - Compliance Users | None | No | No | No |
| LW - Admin | Full Control | Yes | Yes | Yes |

**Rationale:** Committee members can assign attorney; no other changes allowed to preserve request integrity.

#### 19.2.4 In Review Status (Legal Only)

**Permission Inheritance:** Broken (updated by Power Automate when assigned)

| Group/User | Permission Level | Can Read | Can Edit | Can Delete |
|------------|------------------|----------|----------|------------|
| Submitter (Creator) | Read | Yes | No (except upload docs if Waiting On Submitter) | No |
| Assigned Attorney | Edit | Yes | Yes (Legal Review section only) | No |
| LW - Legal Admin | Full Control | Yes | Yes | Yes (Cancel only) |
| LW - Attorney Assigner | Read | Yes | No | No |
| LW - Attorneys (others) | None | No | No | No |
| LW - Compliance Users | None | No | No | No |
| LW - Admin | Full Control | Yes | Yes | Yes |

**Rationale:** Assigned Attorney has edit access to perform review; other attorneys cannot see request (confidentiality).

#### 19.2.5 In Review Status (Compliance or Both)

**Permission Inheritance:** Broken (updated by Power Automate when Review Audience includes Compliance)

| Group/User | Permission Level | Can Read | Can Edit | Can Delete |
|------------|------------------|----------|----------|------------|
| Submitter (Creator) | Read | Yes | No (except upload docs if Waiting On Submitter) | No |
| Assigned Attorney | Edit | Yes | Yes (Legal Review section only) | No |
| LW - Compliance Users (group) | Edit | Yes | Yes (Compliance Review section only) | No |
| LW - Legal Admin | Full Control | Yes | Yes | Yes (Cancel only) |
| LW - Attorney Assigner | Read | Yes | No | No |
| LW - Admin | Full Control | Yes | Yes | Yes |

**Rationale:** Compliance Users group granted Edit access when Compliance review required; any member can perform review.

#### 19.2.6 Closeout Status

**Permission Inheritance:** Broken (maintained from In Review)

| Group/User | Permission Level | Can Read | Can Edit | Can Delete |
|------------|------------------|----------|----------|------------|
| Submitter (Creator) | Edit | Yes | Yes (Closeout section only) | No |
| Assigned Attorney | Read | Yes | No | No |
| LW - Compliance Users | Read | Yes (if involved) | No | No |
| LW - Legal Admin | Full Control | Yes | Yes | Yes (Cancel only) |
| LW - Admin | Full Control | Yes | Yes | Yes |

**Rationale:** Submitter regains edit access to enter Tracking ID and complete request; reviewers have read access to monitor.

#### 19.2.7 Completed and Cancelled Status

**Permission Inheritance:** Broken (maintained)

| Group/User | Permission Level | Can Read | Can Edit | Can Delete |
|------------|------------------|----------|----------|------------|
| Submitter (Creator) | Read | Yes | No | No |
| Assigned Attorney | Read | Yes | No | No |
| LW - Compliance Users | Read | Yes (if involved) | No | No |
| LW - Legal Admin | Full Control | Yes | Yes (with audit trail) | No (only Site Collection Admin) |
| LW - Attorney Assigner | Read | Yes | No | No |
| LW - Admin | Full Control | Yes | Yes | Yes (recycle bin only) |

**Rationale:** All stakeholders retain read access for audit; Legal Admin can make corrections if needed (logged); no deletion to preserve records.

### 19.3 Permission Management Architecture

**Azure Function: Permission Management**

Endpoint: `POST /api/PermissionManagement`

**Input:**
```json
{
  "requestId": "CRR-2025-42",
  "newStatus": "In Review",
  "assignedAttorney": "john.smith@company.com",
  "reviewAudience": "Legal",
  "siteUrl": "https://tenant.sharepoint.com/sites/LegalWorkflows"
}
```

**Processing Logic:**
1. Authenticate to SharePoint using managed identity
2. Retrieve list item by requestId
3. Break permission inheritance if not already broken
4. Remove all existing item-level permissions (except Site Collection Admin)
5. Grant permissions based on newStatus and role requirements:
   - Submitter: Read
   - Legal Admin group: Full Control
   - If newStatus = "In Review" AND assignedAttorney provided: Grant attorney Edit access
   - If newStatus = "In Review" AND reviewAudience IN ("Compliance", "Both"): Grant Compliance Users group Edit access
   - If newStatus = "Assign Attorney": Grant Attorney Assigner group Edit access
   - If newStatus = "Closeout": Grant Submitter Edit access (limited to Closeout section)
6. Log permission changes to AuditLog list
7. Return success/failure response

**Output:**
```json
{
  "success": true,
  "permissionsApplied": [
    "Submitter (creator@company.com): Read",
    "LW - Legal Admin: Full Control",
    "john.smith@company.com: Edit"
  ],
  "timestamp": "2025-01-15T14:23:45Z"
}
```

**Error Handling:**
- Retry 3 times with exponential backoff if SharePoint API call fails
- If all retries fail, log error to Application Insights and send alert to IT Admin
- Request remains in previous status until permissions successfully updated

### 19.4 Ad-Hoc Stakeholder Access

Legal Admin can manually add ad-hoc stakeholders to specific requests:

**Use Cases:**
- Executive visibility (CFO, CEO wants to monitor high-profile request)
- Cross-functional collaboration (Product team observes request related to new product launch)
- External counsel (outside attorney needs read access)

**Process:**
1. Legal Admin opens request in edit mode
2. Legal Admin expands "Ad-Hoc Stakeholders" section
3. Legal Admin selects users via people picker (supports external users if enabled in tenant)
4. Legal Admin clicks "Grant Access"
5. System grants selected users Read access to this request
6. Selected users receive notification email with link to request
7. Access logged in AuditLog

**Permissions:**
- Ad-hoc stakeholders: Read only (cannot edit or delete)
- Access persists across status changes (manual removal required if access should be revoked)

**Security Consideration:**
- Legal Admin responsible for ensuring stakeholders have legitimate need to access request
- Audit log tracks who granted access to whom and when

### 19.5 Security Audit and Compliance

**Audit Logging:**
- All permission changes logged to AuditLog list with detailed information
- SharePoint built-in audit log captures all access events (who viewed request and when)
- Audit logs retained for 7 years minimum

**Compliance Reports:**
- Legal Admin can generate "Permission Audit Report" showing all permission changes for a given time period
- Report includes: RequestID, Event, User Affected, Permission Level Granted, Changed By, Changed On
- Exportable to Excel for external auditors

**Security Reviews:**
- Quarterly review of ad-hoc stakeholder access (remove stale access)
- Annual penetration testing to verify permission model enforces least privilege
- Monthly review of AuditLog for anomalies (e.g., unauthorized permission elevation)

---

## 20. Notification Templates Specifications

### 20.1 Notification Template Overview

The system sends 15 types of automated email notifications to keep stakeholders informed throughout the workflow lifecycle. All notifications are generated using HTML templates stored in SharePoint document library "EmailTemplates" and processed by Azure Function "Notification Content Generation."

### 20.2 Notification Template Structure

Each notification template follows a standard structure:

**Header Section:**
- Legal Workflows logo (or company logo)
- Notification type heading (e.g., "Request Submitted", "Attorney Assigned")

**Body Section:**
- Greeting personalized to recipient (e.g., "Hello {RecipientName},")
- Context paragraph explaining what happened
- Request summary table with key details
- Call-to-action button linking to request

**Footer Section:**
- System name and tagline
- Support contact information
- Unsubscribe link (not applicable for system notifications; placeholder only)

### 20.3 Notification Template Placeholders

All templates support the following dynamic placeholders (replaced by Azure Function before sending):

| Placeholder | Description | Example Value |
|-------------|-------------|---------------|
| {RecipientName} | First name of email recipient | John |
| {RequestID} | Auto-generated request identifier | CRR-2025-42 |
| {RequestTitle} | User-provided descriptive title | Q4 2025 Email Campaign - Asset Growth |
| {Submitter} | Full name of request creator | Jane Doe |
| {SubmitterEmail} | Email of request creator | jane.doe@company.com |
| {TargetReturnDate} | Date submitter needs review completed | 01/20/2025 |
| {ExpectedDate} | System-calculated SLA date | 01/18/2025 |
| {RushFlag} | Indicates if rush request | ⚠️ RUSH or (blank) |
| {Status} | Current workflow status | In Review |
| {Attorney} | Assigned attorney name | John Smith |
| {AttorneyEmail} | Assigned attorney email | john.smith@company.com |
| {AssignedBy} | Who assigned the attorney | Mary Johnson (Legal Admin) |
| {AssignmentNotes} | Notes from assigner | Standard email review, no special concerns |
| {ReviewerNotes} | Comments from legal/compliance review | Recommend changing "guaranteed" to "potential" on line 15 |
| {LegalReviewOutcome} | Legal review decision | Approved With Comments |
| {ComplianceReviewOutcome} | Compliance review decision | Approved |
| {TrackingIDRequired} | Whether Tracking ID needed | Yes / No |
| {TrackingID} | Foreside tracking identifier | FS-2025-0987 |
| {CancellationReason} | Why request was cancelled | Duplicate of CRR-2025-40 |
| {HoldReason} | Why request was placed on hold | Pending external regulatory review |
| {RequestURL} | Direct link to request in SharePoint | https://tenant.sharepoint.com/sites/LegalWorkflows/Lists/Requests/DispForm.aspx?ID=42 |
| {CompletedOn} | Date request completed | 01/22/2025 |
| {TotalDays} | Total turnaround time in business days | 5 days |
| {CommentExcerpt} | Preview of comment that mentioned user | "@JohnSmith can you review the performance... |
| {Commenter} | Name of user who added comment | Jane Doe |

### 20.4 Notification Specifications

#### Notification 1: Request Submitted

**Trigger:** Status changes from Draft → Legal Intake
**Recipients:** LW - Legal Admin group (all members)
**Purpose:** Alert Legal Admin that new request requires triage

**Subject:** New Legal Review Request: {RequestID} - {RequestTitle} {RushFlag}

**Key Content:**
- "A new legal review request has been submitted and requires your attention."
- Request summary: ID, Title, Submitter, Submission Item, Target Return Date, Rush Flag
- "Please review the request and assign an attorney or send to committee for assignment."
- Call-to-action button: "Review Request"

#### Notification 2: Attorney Assigned (Direct)

**Trigger:** Legal Admin directly assigns attorney (Legal Intake → In Review)
**Recipients:** Assigned Attorney (individual)
**Purpose:** Inform attorney they have been assigned to review request

**Subject:** You Have Been Assigned to Review: {RequestID} - {RequestTitle} {RushFlag}

**Key Content:**
- "You have been assigned to review the following legal request."
- Request summary: ID, Title, Submitter, Submission Item, Target Return Date, Rush Flag
- Assignment Notes from Legal Admin
- "Please review the materials and submit your legal review by {TargetReturnDate}."
- Call-to-action button: "View Request"

#### Notification 3: Sent to Committee

**Trigger:** Legal Admin sends request to committee (Legal Intake → Assign Attorney)
**Recipients:** LW - Attorney Assigner group (all members)
**Purpose:** Alert committee that request requires attorney assignment decision

**Subject:** Committee Assignment Needed: {RequestID} - {RequestTitle} {RushFlag}

**Key Content:**
- "A legal review request has been sent to the Attorney Assigner Committee for assignment."
- Request summary: ID, Title, Submitter, Submission Item, Target Return Date, Rush Flag
- Context Notes from Legal Admin
- "Please review and assign an appropriate attorney based on expertise and workload."
- Call-to-action button: "Assign Attorney"

#### Notification 4: Attorney Assigned (Committee)

**Trigger:** Committee member assigns attorney (Assign Attorney → In Review)
**Recipients:** Assigned Attorney (individual)
**Purpose:** Inform attorney they have been assigned via committee

**Subject:** Committee Assigned You to Review: {RequestID} - {RequestTitle} {RushFlag}

**Key Content:**
- "The Attorney Assigner Committee has assigned you to review the following request."
- Request summary: ID, Title, Submitter, Submission Item, Target Return Date, Rush Flag
- Assignment Notes from Committee Member
- Assigned By: {AssignedBy}
- "Please review the materials and submit your legal review by {TargetReturnDate}."
- Call-to-action button: "View Request"

#### Notification 5: Compliance Review Required

**Trigger:** Request enters In Review status with Review Audience = Compliance or Both
**Recipients:** LW - Compliance Users group (all members)
**Purpose:** Alert Compliance team that request requires compliance review

**Subject:** Compliance Review Required: {RequestID} - {RequestTitle} {RushFlag}

**Key Content:**
- "A compliance review is required for the following legal request."
- Request summary: ID, Title, Submitter, Submission Item, Target Return Date, Rush Flag
- "Please review the materials from a compliance perspective and submit your compliance review by {TargetReturnDate}."
- Call-to-action button: "View Request"

#### Notification 6: Attorney Reassigned

**Trigger:** Legal Admin reassigns attorney (Attorney field changed)
**Recipients:** Old Attorney (previous assignee) and New Attorney (new assignee)
**Purpose:** Inform both attorneys of reassignment

**Subject:** Attorney Reassignment: {RequestID} - {RequestTitle}

**Key Content (Old Attorney):**
- "You have been unassigned from the following legal request."
- Request summary: ID, Title, Reassigned To: {Attorney}, Reassignment Reason
- "No further action required from you. Request has been reassigned."

**Key Content (New Attorney):**
- "You have been reassigned to review the following legal request."
- Request summary: ID, Title, Previously Assigned To: {PreviousAttorney}, Reassignment Reason
- "Please review the materials and any prior notes from previous attorney."
- Call-to-action button: "View Request"

#### Notification 7: Waiting On Submitter

**Trigger:** Legal Review Status OR Compliance Review Status changes to Waiting On Submitter
**Recipients:** Submitter (Creator)
**Purpose:** Alert submitter that reviewer needs additional information

**Subject:** Additional Information Needed: {RequestID} - {RequestTitle}

**Key Content:**
- "The reviewer has requested additional information for your legal request."
- Request summary: ID, Title, Reviewer: {Attorney} or {ComplianceReviewer}
- Reviewer Comments: {ReviewerNotes}
- "Please upload the requested documents or provide clarification, then click 'Respond to Reviewer.'"
- Call-to-action button: "Respond"

#### Notification 8: Submitter Response

**Trigger:** Submitter uploads document while Legal/Compliance Review Status = Waiting On Submitter
**Recipients:** Assigned Attorney and/or Compliance Reviewer (whoever requested info)
**Purpose:** Alert reviewer that submitter has provided requested information

**Subject:** Submitter Responded: {RequestID} - {RequestTitle}

**Key Content:**
- "The submitter has uploaded additional information for your review."
- Request summary: ID, Title, Submitter: {Submitter}
- Submitter Comment: {SubmitterComment}
- "Please review the new information and continue your legal/compliance review."
- Call-to-action button: "View Request"

#### Notification 9: Review Completed (Single)

**Trigger:** Legal OR Compliance review completes (only one review type required)
**Recipients:** Submitter (Creator) and LW - Legal Admin group
**Purpose:** Inform submitter and Legal Admin of review outcome

**Subject:** Review Completed: {RequestID} - {RequestTitle}

**Key Content:**
- "The legal/compliance review has been completed for your request."
- Request summary: ID, Title, Reviewer: {Attorney} or {ComplianceReviewer}, Outcome: {Outcome}
- Reviewer Notes: {ReviewerNotes}
- If Approved/Approved With Comments: "Please proceed to closeout by providing Tracking ID if required."
- If Not Approved: "Your request has been rejected. Please review the feedback and submit a revised request if needed."
- Call-to-action button: "View Request"

#### Notification 10: Ready for Closeout

**Trigger:** Status changes to Closeout (all required reviews approved)
**Recipients:** Submitter (Creator)
**Purpose:** Inform submitter to complete closeout process

**Subject:** Ready for Closeout: {RequestID} - {RequestTitle}

**Key Content:**
- "All required reviews have been completed and approved. Your request is ready for closeout."
- Request summary: ID, Title, Legal Review: {LegalReviewOutcome}, Compliance Review: {ComplianceReviewOutcome}
- Tracking ID Required: {TrackingIDRequired}
- "Please review the final approvals, provide Tracking ID if required, and click 'Complete Request.'"
- Call-to-action button: "Complete Closeout"

#### Notification 11: Request Completed

**Trigger:** Status changes to Completed
**Recipients:** All stakeholders (Submitter, Attorney, Compliance if involved, Legal Admin)
**Purpose:** Inform all parties that request workflow is complete

**Subject:** Request Completed: {RequestID} - {RequestTitle}

**Key Content:**
- "The legal review request has been completed."
- Request summary: ID, Title, Submitter: {Submitter}, Completed On: {CompletedOn}, Total Turnaround: {TotalDays}
- Legal Review Outcome: {LegalReviewOutcome}, Compliance Review Outcome: {ComplianceReviewOutcome} (if applicable)
- Tracking ID: {TrackingID} (if provided)
- "This request is now closed. All records have been archived for audit purposes."
- Call-to-action button: "View Request"

#### Notification 12: Request Cancelled

**Trigger:** Status changes to Cancelled
**Recipients:** All stakeholders (Submitter, Attorney if assigned, Compliance if involved, Legal Admin, Committee if applicable)
**Purpose:** Inform all parties that request has been cancelled

**Subject:** Request Cancelled: {RequestID} - {RequestTitle}

**Key Content:**
- "The following legal review request has been cancelled."
- Request summary: ID, Title, Cancelled By: {CancelledBy}, Cancelled On: {CancelledOn}
- Cancellation Reason: {CancellationReason}
- "No further action required. Request will not proceed."
- Call-to-action button: "View Request" (read-only)

#### Notification 13: Request On Hold

**Trigger:** Status changes to On Hold
**Recipients:** All stakeholders (Submitter, Attorney if assigned, Compliance if involved, Legal Admin)
**Purpose:** Inform all parties that request has been placed on hold

**Subject:** Request Placed On Hold: {RequestID} - {RequestTitle}

**Key Content:**
- "The following legal review request has been placed on hold."
- Request summary: ID, Title, Placed On Hold By: {OnHoldBy}, On Hold Since: {OnHoldOn}
- Hold Reason: {HoldReason}
- "Request workflow is paused. You will be notified when the request is resumed."
- Call-to-action button: "View Request" (read-only except Legal Admin)

#### Notification 14: Request Resumed

**Trigger:** Status changes FROM On Hold to previous active status
**Recipients:** Active participants (Submitter, Attorney if assigned, Compliance if review pending)
**Purpose:** Inform active participants that request workflow has resumed

**Subject:** Request Resumed: {RequestID} - {RequestTitle}

**Key Content:**
- "The following legal review request has been resumed."
- Request summary: ID, Title, Resumed By: {ResumedBy}, Resumed On: {ResumedOn}, Current Status: {Status}
- "Request workflow has resumed. Please continue with your pending actions."
- If Attorney: "Please continue your legal review."
- If Compliance: "Please continue your compliance review."
- If Submitter and Status = Closeout: "Please complete closeout."
- Call-to-action button: "View Request"

#### Notification 15: User Tagged in Comment

**Trigger:** User adds comment with @mention
**Recipients:** Tagged user(s) (individuals mentioned in comment)
**Purpose:** Alert user they have been mentioned in a comment

**Subject:** You Were Mentioned in {RequestID} - {RequestTitle}

**Key Content:**
- "You have been mentioned in a comment on the following legal request."
- Request summary: ID, Title, Commented By: {Commenter}, Comment Date
- Comment Excerpt: {CommentExcerpt}
- "You have been granted access to this request. Click below to view the full comment and request details."
- Call-to-action button: "View Comment"

### 20.5 Notification Delivery and Tracking

**Email Delivery:**
- All notifications sent via Power Automate "Send an email (V2)" action using Exchange Online
- Sent from: legal-workflows@company.com (or designated system email)
- Reply-to: legal-workflows-support@company.com (support email, not monitored)

**Delivery Tracking:**
- All notification sends logged to NotificationLog SharePoint list
- Columns: RequestID, NotificationType, Recipient, SentOn, DeliveryStatus
- DeliveryStatus values: Sent, Failed, Pending Retry
- If delivery fails, Power Automate retries 2 times (1 hour apart)
- After 2 failed retries, IT Admin receives alert email

**Unsubscribe Policy:**
- Users CANNOT unsubscribe from workflow notifications (business-critical)
- Footer includes statement: "You are receiving this email because you are involved in request {RequestID}. These are system notifications and cannot be unsubscribed."

---

## 21. Appendices

### Appendix A: Glossary of Terms

| Term | Definition |
|------|------------|
| **Approval** | Documented evidence that a manager or stakeholder has reviewed and authorized material before legal/compliance review |
| **Attorney Assigner** | Committee responsible for assigning attorneys to complex requests requiring specialized expertise |
| **Business Days** | Monday through Friday, excluding weekends (and company holidays in Phase 2) |
| **Closeout** | Final workflow stage where submitter provides tracking ID (if required) and marks request as completed |
| **Communication Request** | Request type for marketing communications, shareholder letters, fact sheets, websites, and similar materials (Phase 1 scope) |
| **Compliance Review** | Regulatory review performed by Compliance Users to ensure material complies with SEC, FINRA, and other regulations |
| **Expected Turnaround Date** | System-calculated date based on Submission Item SLA; used to determine if request is rush |
| **Legal Admin** | Role responsible for triaging requests, assigning attorneys, and managing workflow |
| **Legal Intake** | Initial workflow stage where Legal Admin reviews request for completeness and assigns attorney |
| **Legal Review** | Legal analysis performed by assigned Attorney to ensure material is legally sound and defensible |
| **Request ID** | Auto-generated unique identifier in format CRR-{YEAR}-{COUNTER} (e.g., CRR-2025-42) |
| **Rush Request** | Request flagged for expedited processing because Target Return Date < Expected Turnaround Date |
| **Submission Item** | Type of material being reviewed (e.g., Marketing Email, Fact Sheet) with defined turnaround time SLA |
| **Submitter** | User who creates and submits legal review request (typically Marketing or Business staff) |
| **Target Return Date** | Date by which submitter needs legal/compliance review completed (user-selected) |
| **Tracking ID** | Identifier from Foreside (or similar) system required for certain compliance materials before distribution |

### Appendix B: Acronyms

| Acronym | Full Term |
|---------|-----------|
| **ATP** | Advanced Threat Protection |
| **BRD** | Business Requirements Document |
| **CRR** | Communication Review Request (prefix for Request IDs) |
| **FINRA** | Financial Industry Regulatory Authority |
| **FRD** | Functional Requirements Document |
| **FSD** | Functional Specification Document |
| **GDPR** | General Data Protection Regulation |
| **HLD** | High-Level Design Document |
| **LW** | Legal Workflows (prefix for SharePoint groups) |
| **M365** | Microsoft 365 |
| **MFA** | Multi-Factor Authentication |
| **PnP** | Patterns and Practices (SharePoint community) |
| **RBAC** | Role-Based Access Control |
| **SEC** | Securities and Exchange Commission |
| **SLA** | Service Level Agreement |
| **SME** | Subject Matter Expert |
| **SOX** | Sarbanes-Oxley Act |
| **SPFx** | SharePoint Framework |
| **TDD** | Technical Design Document |
| **UAT** | User Acceptance Testing |
| **WCAG** | Web Content Accessibility Guidelines |
| **XSS** | Cross-Site Scripting |

### Appendix C: References

This Functional Specification Document is based on the following source documents:

1. **Business Requirements Document (BRD):** `legal-workflows-brd-draft.md` (Draft 0.1, September 2025)
2. **Functional Requirements Document (FRD):** `legal-workflow-frd.md` (v1.0 Draft)
3. **High-Level Design Document (HLD):** `legal-workflow-hld.md` (v1.1)
4. **Technical Design Document (TDD):** `legal-workflow-tdd.md` (v1.0 Draft)
5. **System Readme:** `legal-review-system-readme.md` (Comprehensive specification, 2,526 lines)

### Appendix D: Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | October 2025 | Development Team | Initial draft based on BRD, FRD, HLD, TDD, and System Readme |

### Appendix E: Sign-Off

This Functional Specification Document requires approval from the following stakeholders before proceeding to development:

| Stakeholder | Role | Signature | Date |
|-------------|------|-----------|------|
| [Name] | Legal Department Sponsor | _______________ | ______ |
| [Name] | Compliance Department Sponsor | _______________ | ______ |
| [Name] | IT Department Sponsor | _______________ | ______ |
| [Name] | Project Manager | _______________ | ______ |
| [Name] | Business Analyst | _______________ | ______ |

**Approval Status:** ☐ Draft | ☐ Under Review | ☐ Approved | ☐ Rejected

**Approval Date:** __________________

**Notes:**
_________________________________________________________________________________
_________________________________________________________________________________
_________________________________________________________________________________

---

**END OF DOCUMENT**

**Total Sections:** 21
**Total Pages:** Approximately 120-130 (formatted)
**Document Status:** v1.0 Draft for Review

