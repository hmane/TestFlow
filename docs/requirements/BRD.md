# 📑 Legal Workflows – Business Requirements Document (BRD)

**Version:** Draft 0.1
**Date:** September 2025
**Status:** For Review

---

## 1. Executive Summary

### 1.1 Purpose

Legal Workflows is designed to **automate and streamline the legal/compliance review process** for marketing and business communications, replacing the current manual email-driven workflow with a **centralized, auditable SharePoint Online system**.

### 1.2 Current Challenges

- Email-based submissions lack traceability
- Approvals often stored in scattered email chains/screenshots
- No central visibility or dashboards
- Difficult to enforce turnaround times
- Inefficient back-and-forth with submitters

### 1.3 Future Vision

- Centralized submission via SharePoint
- Automated routing to Legal Admins, Attorneys, Compliance
- Complete audit trail and version control
- Real-time dashboards by role
- Notifications at every stage
- Reduced turnaround times and higher compliance

### 1.4 Success Criteria

1. 100% of requests processed in Legal Workflows (no email submissions)
2. 90% user adoption within 3 months
3. Full audit trail for every request
4. Documented approvals (with proof) in all cases
5. Measurable compliance with turnaround times

---

## 2. Business Objectives

- **Efficiency:** Reduce average turnaround time by at least 20%
- **Compliance:** Ensure every request has proper approvals and audit history
- **Transparency:** Role-based dashboards for visibility
- **Adoption:** 90% user participation within 3 months
- **Accountability:** Clear assignment of responsibilities

---

## 3. Scope

### 3.1 In-Scope (Phase 1)

- Communication requests (marketing, shareholder letters, fact sheets, websites, etc.)
- Submission items with defined turnaround times
- Legal and compliance reviews
- Closeout with tracking ID (when required)
- Notifications (15 types)
- Role-based dashboards

### 3.2 Out-of-Scope (Phase 1)

- External user access
- Offline capabilities
- Integration with external systems (Seismic, DocuSign, etc.) – future phases

---

## 4. Stakeholders & User Personas

- **Submitters:** Marketing/Business staff creating requests
- **Legal Admin:** Gatekeepers triaging requests
- **Attorney Assigner:** Committee members assigning attorneys
- **Attorneys:** Legal reviewers
- **Compliance Users:** Regulatory reviewers
- **Admins (IT):** Technical/system administrators
- **Ad-hoc Stakeholders:** Read-only observers added to requests

---

## 5. Business Process Flow

```
Draft → Legal Intake → Assign Attorney → In Review → Closeout → [Awaiting Foreside Documents] → Completed
                    ↘ (Direct Assignment) → In Review
Special Actions: Cancel | Hold | Resume | Reassign Attorney

Note: Awaiting Foreside Documents step only applies when Is Foreside Review Required = Yes
```

- **Draft:** Created by Submitter
- **Legal Intake:** Reviewed by Legal Admin (direct assign OR committee assign)
- **Assign Attorney:** Committee assigns attorney
- **In Review:** Attorney/Compliance perform reviews
- **Closeout:** Submitter provides tracking ID (if required) and closes request
- **Awaiting Foreside Documents:** (Conditional) Submitter uploads Foreside letters/documents for audit purposes
- **Completed:** Workflow finished (approved or rejected)

---

## 6. Business Requirements

### 6.1 Request Creation Rules

- Required fields: Request Title, Purpose, Submission Type, Submission Item, Target Return Date, Review Audience
- At least **one approval required** (date + approver + supporting document)
  - **Exception:** RFP submission items (starting with "RFP Related Review Substantial") bypass approval requirements
- At least one document uploaded for review
- The system shall support the following approval types, of which at least one must be provided (date + approver + supporting document):
  - **Communications Approval**
  - **Portfolio Manager Approval**
  - **Research Analyst Approval**
  - **Subject Matter Expert (SME) Approval**
  - **Performance Review Approval**
  - **Other Approval** (with a custom title specified by the submitter)

### 6.2 Submission Items & Target Return Date Logic

- The system shall maintain a configurable list of **Submission Items**, each associated with a defined **turnaround time** (in business days).
- When creating a request, the user must provide a **Target Return Date**.
- The system internally calculates an **Expected Date** based on the submission item’s standard turnaround time and the request creation date, considering weekends and organization-specific holidays.
- If the user’s chosen Target Return Date is **later than or equal to** the Expected Date, the request is treated as a **Normal Request**.
- If the user’s chosen Target Return Date is **earlier than** the Expected Date, the system automatically flags it as a **Rush Request**.
- For Rush Requests, the system shall require the user to provide a **Rush Justification**.
- The system shall display a warning if the Target Return Date is unrealistic or outside allowable business rules.

### 6.3 Review & Approval Process

- **Legal Intake:** Legal Admins perform initial triage, verifying request completeness and deciding on direct attorney assignment or committee review. Legal Admins may also update the **Review Audience** (Legal, Compliance, or Both) during intake if necessary.
- **Attorney Assignment:**
  - Legal Admins or the Attorney Assigner Committee assign one or more Attorneys based on expertise and workload.
  - The system supports direct assignment or committee consensus workflows.
- **Review:**
  - Assigned Attorneys and Compliance Users receive notifications and perform reviews within specified turnaround times.
  - Reviewers can approve, reject, request changes (Respond To Comments And Resubmit), or mark as Not Approved.
  - Review status is tracked per reviewer and aggregated for overall request status.
- **Respond To Comments And Resubmit Workflow:**
  - When a reviewer selects "Respond To Comments And Resubmit" as the outcome, the review status changes to "Waiting On Submitter"
  - The submitter is notified and can view the reviewer's comments
  - The submitter addresses the comments, uploads revised documents, and clicks "Resubmit for Review"
  - The review status changes to "Waiting On Attorney" (or "Waiting On Compliance")
  - The reviewer is notified and can conduct another review cycle
  - This back-and-forth continues until the reviewer submits a final outcome (Approved, Approved With Comments, or Not Approved)
  - Time tracking captures hours spent in each waiting state for reporting purposes
- **Rejection & Revisions:**
  - If rejected (Not Approved), the Submitter is notified with comments.
  - Request moves directly to Completed status (bypassing Closeout).
- **Approval:**
  - Once all required approvals are received, the request moves to Closeout.
- **Closeout:**
  - Submitter provides any required tracking IDs or final documentation.
  - Legal Admin verifies completeness.
  - If Is Foreside Review Required = Yes, request moves to "Awaiting Foreside Documents".
  - If Is Foreside Review Required = No, request moves directly to Completed.
  - All approvals, comments, and attachments are archived for audit purposes.
- **Awaiting Foreside Documents:**
  - This step only occurs when Is Foreside Review Required = Yes during compliance review.
  - Submitter or Admin uploads Foreside letter documents (may take weeks or months to receive).
  - At least one Foreside document must be uploaded before completing.
  - No time tracking is performed for this phase.
  - Request does not appear in "Open Requests" views.
  - Cancel and Hold actions are not available in this status.
  - Once documents are uploaded, submitter or admin completes the request.

### 6.4 Notifications & Communication

- The system shall support the following notification types, triggered at specific workflow events:

  | #   | Notification Type             | Trigger                                               | Recipients                 | Email Content                                                              |
  | --- | ----------------------------- | ----------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------- |
  | 1   | Request Submitted             | Status → Legal Intake                                 | Legal Admin group          | Request ID, title, submitter, target date, rush flag, link to request      |
  | 2   | Attorney Assigned (Direct)    | Legal Intake → In Review (direct)                     | Assigned Attorney          | Request ID, title, assignment notes, target date, link to request          |
  | 3   | Sent to Committee             | Legal Intake → Assign Attorney                        | Attorney Assigner group    | Request ID, title, context notes from Legal Admin, link to request         |
  | 4   | Attorney Assigned (Committee) | Assign Attorney → In Review                           | Assigned Attorney          | Request ID, title, assignment notes, link to request                       |
  | 5   | Compliance Review Required    | reviewAudience includes Compliance                    | Compliance Users group     | Request ID, title, target date, link to request                            |
  | 6   | Attorney Reassigned           | attorneyId changes                                    | New Attorney, Old Attorney | Request ID, reason for reassignment, link to request                       |
  | 7   | Waiting On Submitter          | Review status → Waiting On Submitter                  | Creator                    | Request ID, reviewer comments, required changes, link to request           |
  | 8   | Submitter Response            | Document uploaded while status = Waiting On Submitter | Attorney/Compliance        | Request ID, submitter comment, link to request                             |
  | 9   | Review Completed (Single)     | Legal OR Compliance → Completed                       | Creator, Legal Admin       | Request ID, review outcome, reviewer notes, link to request                |
  | 10  | Ready for Closeout            | Status → Closeout                                     | Creator                    | Request ID, summary of approvals, tracking ID requirement, link to request |
  | 11  | Request Completed             | Status → Completed                                    | All stakeholders           | Request ID, final status, completion date, link to request                 |
  | 12  | Request Cancelled             | Status → Cancelled                                    | All stakeholders           | Request ID, who cancelled, cancellation reason, link to request            |
  | 13  | Request On Hold               | Status → On Hold                                      | All stakeholders           | Request ID, who placed on hold, hold reason, link to request               |
  | 14  | Request Resumed               | On Hold → previous status                             | Active participants        | Request ID, resumed status, link to request                                |
  | 15  | User Tagged in Comment        | @mention in comment                                   | Tagged user                | Request ID, comment excerpt, commenter name, link to comment               |

- Notifications shall be sent via email with links to the request in SharePoint.
- Notification content shall include request metadata, current status, and required actions.

### 6.5 Security & Permissions

- The system shall leverage SharePoint Online groups to manage user roles: Submitters, Legal Admins, Attorneys, Compliance Users, Admins, and Ad-hoc Stakeholders.
- Custom permission levels shall be defined to restrict access according to role responsibilities:
  - Submitters: Create and edit own requests; view status.
  - Legal Admins: Full access to all requests; assign attorneys; update statuses.
  - Attorneys & Compliance Users: Access assigned requests; add reviews and comments.
  - Admins: Manage system configuration and permissions.
  - Ad-hoc Stakeholders: Read-only access to specific requests.
- Item-level permissions shall be enforced to ensure users can only access requests relevant to their role and assignment.
- Audit logging shall track all access and modifications for compliance.

---

## 7. Non-Functional Requirements

- **Performance:**

  - Page load times and workflow actions shall complete within **6 seconds** under normal load.
  - System shall handle concurrent users without degradation.

- **Usability:**

  - User interface shall be intuitive and require minimal training.
  - Forms shall include validation and contextual help.

- **Accessibility:**

  - Compliance with WCAG 2.1 AA standards to ensure accessibility for all users.

- **Security:**

  - Data shall be encrypted in transit and at rest.
  - Role-based access control enforced consistently.
  - Regular security audits and penetration testing.

- **Scalability:**

  - System shall support growth in user base and request volume without redesign.

- **Audit & Compliance:**

  - Comprehensive audit trails for all requests and actions.
  - Retention policies aligned with legal requirements.

- **Availability:**
  - System uptime target of 99.9%.
  - Backup and disaster recovery plans in place.

---

## 8. Reporting & Metrics

- **Dashboards:**

  - Role-based dashboards displaying open requests, status summaries, and SLA compliance.
  - Filters by date range, submission type, attorney, and status.

- **Key Performance Indicators (KPIs):**

  - Average turnaround time per submission item and request type.
  - Percentage of requests completed within SLA.
  - Number of requests per status category.
  - User adoption rates and activity metrics.

- **Audit Logs:**

  - Detailed logs of request creation, edits, approvals, and status changes.
  - Exportable reports for compliance audits.

- **Compliance Tracking:**
  - Alerts for overdue requests and SLA breaches.
  - Historical trends and performance analysis.

---

## 9. Assumptions & Constraints

- SharePoint Online is the platform for implementation; customizations are limited to supported frameworks (e.g., SPFx).
- User groups and permissions are managed manually by IT Admins; no automated provisioning in Phase 1.
- Business holidays and non-working days are maintained in a centralized calendar used for turnaround calculations.
- Integration with external systems (e.g., DocuSign, Seismic) is out of scope for Phase 1.
- Offline access and mobile app support are not included in the initial release.

---

## 10. Success Criteria

- **Adoption:**

  - At least 90% of target users submit requests via Legal Workflows within 3 months.

- **Compliance:**

  - 100% of requests have documented approvals and audit trails.
  - At least 95% of requests meet turnaround time SLAs.

- **Efficiency:**
  - Average turnaround time reduced by 20% compared to baseline.
  - Reduction in manual email correspondence by 100%.

---

## 11. Risks & Mitigation

| Risk                            | Description                            | Mitigation Strategy                                |
| ------------------------------- | -------------------------------------- | -------------------------------------------------- |
| Low User Adoption               | Users may resist new system            | Comprehensive training, communication, and support |
| Performance Bottlenecks         | System may slow under load             | Load testing, optimization, and scalable design    |
| Change Management Challenges    | Resistance to process changes          | Stakeholder engagement and phased rollout          |
| Data Security Breaches          | Unauthorized access or data leaks      | Strong access controls, encryption, and audits     |
| Inaccurate Turnaround Dates     | Incorrect calculation of business days | Rigorous testing and holiday calendar maintenance  |
| Dependency on SharePoint Limits | SharePoint platform constraints        | Design within limits, plan for future enhancements |

---

## 12. Glossary & Acronyms

| Term                  | Definition                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------- |
| **Legal Workflow**    | Legal Review System – the overall solution for managing legal workflows.                 |
| **SPFx**              | SharePoint Framework – development model used for customizations in SharePoint Online.   |
| **Request**           | A submission created by a user for legal/compliance review.                              |
| **Submission Item**   | A specific type of submission (e.g., marketing email, website content) with defined SLA. |
| **Rush Request**      | A request flagged for expedited processing with reduced turnaround time.                 |
| **Legal Admin**       | Role responsible for triaging and managing requests.                                     |
| **Attorney Assigner** | Committee responsible for assigning attorneys to requests.                               |
| **Compliance User**   | Regulatory reviewers involved in the approval process.                                   |
| **Closeout**          | Final stage where tracking IDs and final documentation are added before completion.      |
| **Awaiting Foreside Documents** | Conditional status after Closeout for uploading Foreside letter documents when Foreside Review Required = Yes. |
| **Foreside Documents** | Letters or documents received from Foreside that need to be uploaded for audit and compliance purposes. |
| **SLA**               | Service Level Agreement – target turnaround times for requests.                          |
| **Audit Trail**       | Record of all actions and changes made to a request for compliance purposes.             |
| **Dashboard**         | Visual interface showing metrics and statuses relevant to user roles.                    |
| **Respond To Comments And Resubmit** | Review outcome that initiates a back-and-forth workflow between reviewer and submitter. |
| **Waiting On Submitter** | Review status indicating the submitter needs to address reviewer comments and resubmit. |
| **Waiting On Attorney** | Review status indicating the attorney is reviewing resubmitted materials.              |
| **Waiting On Compliance** | Review status indicating compliance is reviewing resubmitted materials.              |
