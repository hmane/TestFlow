# Legal Workflow System \- Functional Requirements Document

## Document Control

| Item | Details |
| :---- | :---- |
| **Document Title** | Legal Workflow System \- Functional Requirements Document |
| **Version** | 1.0 Draft |
| **Date** | October 20, 2025 |
| **Status** | Draft \- Pending Review |
| **Project Name** | Legal Review System (LRS) |
| **Organization** | \[Organization Name\] |

### Document History

| Version | Date | Author | Changes |
| :---- | :---- | :---- | :---- |
| 1.0 Draft | 2025-10-20 | \[Author Name\] | Initial draft \- Phase 1 requirements |

### Document Approval

| Role | Name | Signature | Date |
| :---- | :---- | :---- | :---- |
| Business Owner |  |  |  |
| Project Sponsor |  |  |  |
| IT Director |  |  |  |
| Legal Department Head |  |  |  |
| Compliance Officer |  |  |  |

### Distribution List

This document is distributed to:

- Business Stakeholders  
- Development Team  
- Quality Assurance Team  
- Legal Department  
- Compliance Department

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)  
2. [Introduction](#2-introduction)  
3. [System Overview](#3-system-overview)  
4. [User Roles and Personas](#4-user-roles-and-personas)  
5. [Functional Requirements](#5-functional-requirements)  
6. [Non-Functional Requirements](#6-non-functional-requirements)  
7. [Data Requirements](#7-data-requirements)  
8. [Integration Requirements](#8-integration-requirements)  
9. [User Interface Requirements](#9-user-interface-requirements)  
10. [Reporting and Analytics](#10-reporting-and-analytics)  
11. [Business Rules](#11-business-rules)  
12. [Phase 2 \- Future Requirements](#12-phase-2---future-requirements)  
13. [Testing Requirements](#13-testing-requirements)  
14. [Assumptions and Constraints](#14-assumptions-and-constraints)  
15. [Known Issues and Risks](#15-known-issues-and-risks)  
16. [Change Management](#16-change-management)  
17. [Glossary](#17-glossary)  
18. [Appendices](#18-appendices)

---

## 1\. Executive Summary

### 1.1 Business Problem Statement

The current legal and compliance review process for marketing communications relies on manual, email-based workflows that result in:

- **Lack of Visibility**: Requestors cannot easily track the status of their submissions  
- **No Audit Trail**: Email chains and shared drives do not provide a complete, auditable history  
- **Inefficiency**: Manual routing and status updates consume significant time  
- **Risk**: Important deadlines may be missed, and documentation may be incomplete  
- **Inconsistency**: No standardized process for tracking approvals and reviews

### 1.2 Solution Overview

The Legal Workflow System (LWS) is a SharePoint Framework (SPFx) application that automates and streamlines the legal and compliance review process. The system provides:

- **Centralized Platform**: Single system of record for all review requests  
- **Automated Routing**: Intelligent workflow engine routes requests to appropriate reviewers  
- **Real-Time Tracking**: Dashboard and status updates for all stakeholders  
- **Complete Audit Trail**: All actions, approvals, and comments are logged and timestamped  
- **Enforced Standards**: Required fields, approvals, and documentation are system-enforced  
- **Item-Level Security**: Dynamic permissions ensure users only see appropriate requests

### 1.3 Key Benefits

- **Time Savings**: Reduce average processing time  
- **Risk Reduction**: Ensure all required approvals and reviews are completed  
- **Compliance**: Maintain complete audit trail for regulatory requirements  
- **Transparency**: Real-time visibility into request status for all stakeholders  
- **Standardization**: Consistent process across all request types  
- **Scalability**: System supports growing volume of requests

### 1.4 Success Criteria

- System successfully processes 100% of communication review requests  
- Average request processing time reduced by 40%  
- User adoption rate of 95% or higher within 60 days of launch  
- Zero data loss or security incidents  
- System availability of 99.5% or higher during business hours

---

## 2\. Introduction

### 2.1 Purpose

This Functional Requirements Document (FRD) defines the business, functional, and technical requirements for the Legal Workflow System (LWS) Phase 1 implementation. It serves as the authoritative reference for:

- Business stakeholders to understand system capabilities  
- Development teams to build the solution  
- Quality assurance teams to validate functionality  
- Develop user documentation

### 2.2 Scope

**In Scope \- Phase 1:**

- Communication Request type workflow  
- Legal Intake and attorney assignment (direct and committee-based)  
- Legal Review process  
- Compliance Review process  
- Request closeout  
- Document management and approvals  
- Basic reporting and dashboards  
- Role-based permissions and item-level security  
- Email notifications

**Out of Scope \- Phase 1:**

- General Review request type (Phase 2\)  
- IMA Review request type (Phase 2\)  
- Seismic Database integration (Phase 2\)

### 2.3 Intended Audience

This document is intended for:

- **Business Stakeholders**: Legal department, compliance, business owners  
- **Development Team**: Software developers, solution architects, technical leads  
- **Quality Assurance Team**: QA analysts, UAT coordinators

### 2.4 Document Conventions

**Requirement Identifiers:**

- REQ-XXX: All requirements (sequential numbering)  
- Requirements are categorized by section and include priority levels

**Priority Levels:**

- **Must Have**: Critical functionality required for Phase 1 launch  
- **Should Have**: Important functionality that adds significant value  
- **Could Have**: Desirable functionality if time and resources permit  
- **Won't Have**: Explicitly excluded from Phase 1 (may be considered for Phase 2\)

**Document Formatting:**

- System actions are written as "The system shall..."  
- User actions are written as "The user shall be able to..."  
- Bold text indicates **key terms** and important concepts  
- Code/field names are shown in `monospace` font

---

## 3\. System Overview

### 3.1 Current State

The current legal review process operates as follows:

1. **Submission**: Requestors email marketing materials or save in shared drive.  
2. **Triage**: Legal admin manually reviews emails and forwards to appropriate attorney  
3. **Assignment**: Attorney assignment occurs via email communication with committee or direct assignment  
4. **Review**: Attorneys review materials and respond via email with approval/rejection  
5. **Compliance**: If needed, materials are forwarded to compliance team via email  
6. **Tracking**: Status tracked manually in spreadsheets  
7. **Documentation**: Approvals documented via email  
8. **Closeout**: Tracking IDs manually recorded in spreadsheets

**Pain Points:**

- No centralized tracking system  
- Incomplete audit trails  
- Manual data entry and status updates  
- Difficulty determining request status  
- No automated deadline tracking  
- Inconsistent process adherence

### 3.2 Future State

The Legal Workflow System will provide an automated, centralized platform:

1. **Submission**: Users create requests via SharePoint form with required fields and validations  
2. **Triage**: Legal admin reviews submissions in centralized queue with all information visible  
3. **Assignment**: System-guided attorney assignment with direct or committee-based workflows  
4. **Review**: Attorneys access assigned requests, complete structured review forms  
5. **Compliance**: Automatic routing to compliance when required  
6. **Tracking**: Real-time dashboards and status updates for all stakeholders  
7. **Documentation**: All approvals, documents, and comments stored in SharePoint with metadata  
8. **Closeout**: Structured closeout process with required fields and validations

**Benefits:**

- Single source of truth for all requests  
- Complete audit trail with timestamps  
- Automated routing and notifications  
- Real-time status visibility  
- Enforced process compliance  
- Intelligent deadline tracking with business day calculations  
- Item-level security and role-based access

### 3.3 High-Level Architecture

The Legal Workflow System is built as a SharePoint Framework (SPFx) Form Customizer extension that integrates with the following components:

**\[See Figure 1: System Architecture Diagram\]**

**Components:**

1. **SharePoint Lists**  
     
   - **Requests List**: Primary data store for all request information (73 fields)  
   - **SubmissionItems List**: Configuration list for submission item and turnaround times  
   - **RequestDocuments Library**: Document storage with metadata linkage

   

2. **SPFx Form Customizer**  
     
   - Custom React-based form interface  
   - Real-time validation and business rule enforcement  
   - Card-based UI with 70/30 layout (form/comments)  
   - Integration with Fluent UI, PnP react, Devextreme components

   

3. **Azure Functions**  
     
   - **Permission Management Service**: Manages item-level permissions based on workflow status  
   - **Notification Service**: Generates notification content for email distribution

   

4. **Power Automate Flows**  
     
   - Email notification distribution  
   - Workflow status change triggers  
   - Permission update orchestration

   

5. **Integration Layer**  
     
   - PnP/sp library for SharePoint operations  
   - SPContext from spfx-toolkit for centralized SharePoint access  
   - React Hook Form \+ Zod for form management and validation

**Data Flow:**

1. User interacts with SPFx Form Customizer  
2. Form validates input using Zod schemas  
3. Data submitted to SharePoint Requests list  
4. Power Automate flow triggered on item creation/update  
5. Azure Function called to update permissions  
6. Azure Function generates notification content  
7. Power Automate sends email notifications  
8. Dashboard views updated in real-time

### 3.4 Technology Stack

**Platform:**

- SharePoint Online (Microsoft 365\)  
- SharePoint Framework (SPFx) 1.21.1  
- Node.js 18.x LTS

**Frontend:**

- React 17.0.1  
- TypeScript 5.3.3  
- Fluent UI v8 (8.106.4)  
- DevExtreme 22.2.3  
- React Hook Form 7.45.4  
- Zod 4.1.11

**State Management:**

- Zustand 4.3.9

**SharePoint Integration:**

- @microsoft/sp-\* packages v1.21.1  
- @pnp/sp 3.20.1  
- spfx-toolkit (custom)

**Backend Services:**

- Azure Functions (serverless)  
- Power Automate (workflow automation)

**Browser Support:**

- Chrome 90+  
- Microsoft Edge 90+  
- Firefox 85+  
- Safari 14+  
- Internet Explorer 11: Not Supported

---

## 4\. User Roles and Personas

### 4.1 Role Definitions

The system supports six distinct user roles, each with specific permissions and capabilities:

#### 4.1.1 LW \- Submitters

**Description**: End users who submit requests for legal and compliance review of marketing communications.

**Responsibilities:**

- Create and submit new requests  
- Upload required documents and approvals  
- Provide complete and accurate information  
- Respond to questions or requests for additional information  
- Track status of submitted requests

**Permissions:**

- Create new requests  
- Edit own requests in Draft status  
- View own requests (all statuses)  
- Read-only access to others' requests  
- Upload documents to own requests

**Key User Stories:**

- As a submitter, I want to create a new review request so that I can obtain legal approval for marketing materials  
- As a submitter, I want to track the status of my requests so that I know when review is complete  
- As a submitter, I want to save drafts so that I can complete requests over multiple sessions

#### 4.1.2 LW \- Legal Admin

**Description**: Legal department administrators who triage incoming requests and manage the intake process.

**Responsibilities:**

- Review incoming requests in Legal Intake status  
- Assign requests to attorneys (direct assignment)  
- Override review audience settings when necessary  
- Add intake notes and commentary  
- Monitor overall queue and workload distribution

**Permissions:**

- View all requests  
- Edit requests in Legal Intake status  
- Assign attorneys to requests  
- Override review audience  
- Add Attorney Assign notes  
- Transition requests from Legal Intake to next status

**Key User Stories:**

- As a legal admin, I want to review incoming requests so that I can assign them to appropriate attorneys  
- As a legal admin, I want to override review audience so that I can handle exceptional cases  
- As a legal admin, I want to see all pending intake requests so that I can manage workload

#### 4.1.3 LW \- Attorney Assigner

**Description**: Committee members who participate in attorney assignments through committee-based workflow.

**Responsibilities:**

- Review requests requiring committee assignment  
- Nominate attorneys for assignment  
- Provide assignment notes  
- Participate in committee decision-making

**Permissions:**

- View requests pending committee assignment  
- Nominate attorneys for assignment  
- Add assignment notes  
- View assignment history

**Key User Stories:**

- As an attorney assigner, I want to nominate attorneys for requests  
- As an attorney assigner, I want to provide assignment notes so that decisions are documented

#### 4.1.4 LW \- Attorneys

**Description**: Attorneys who conduct legal reviews of marketing materials.

**Responsibilities:**

- Review assigned requests  
- Analyze materials  
- Provide legal opinions and recommendations  
- Approve, approve with comments, or reject materials  
- Document review findings and rationale

**Permissions:**

- View assigned requests  
- Edit assigned requests during review  
- Complete legal review forms  
- Upload additional documents  
- Transition requests to next status upon review completion

**Key User Stories:**

- As an attorney, I want to see all requests assigned to me  
- As an attorney, I want to review all submitted materials so that I can make informed decisions  
- As an attorney, I want to document my review findings so that there is a clear audit trail

#### 4.1.5 LW \- Compliance Users

**Description**: Compliance department staff who conduct compliance reviews of marketing materials.

**Responsibilities:**

- Review assigned requests requiring compliance review  
- Verify regulatory compliance  
- Set compliance-specific flags (Foreside review, retail use)  
- Approve, approve with comments, or reject materials  
- Document compliance review findings

**Permissions:**

- View requests requiring compliance review  
- Edit requests during compliance review  
- Complete compliance review forms  
- Set Foreside and retail use flags  
- Upload additional documents  
- Transition requests to next status upon review completion

**Key User Stories:**

- As a compliance user, I want to see all requests requiring compliance review so that I can manage my queue  
- As a compliance user, I want to flag materials for Foreside review so that proper oversight occurs  
- As a compliance user, I want to document compliance concerns so that risks are clearly communicated

#### 4.1.6 LW \- Admin

**Description**: System administrators with full access to all functionality.

**Responsibilities:**

- Configure system settings  
- Manage user permissions and role assignments  
- Manage configuration lists (SubmissionItems and Configurations)  
- Override workflows when necessary

**Permissions:**

- Full access to all requests (view, edit, delete)  
- Modify system configuration  
- Access system logs and audit trails  
- Override workflow restrictions

**Key User Stories:**

- As a system admin, I want to configure submission types so that the system reflects current business needs  
- As a system admin, I want to override workflows so that I can handle exceptional circumstances

### 4.2 Permission Matrix

| Capability | Submitters | Legal Admin | Attorney Assigner | Attorneys | Compliance | Admin |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Create requests | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit own Draft requests | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View own requests | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View all requests | Read-only | ✓ | Assigned only | Assigned only | Compliance only | ✓ |
| Edit requests in Legal Intake | \- | ✓ | \- | \- | \- | ✓ |
| Assign attorneys (direct) | \- | ✓ | \- | \- | \- | ✓ |
| Assign attorneys (committee) | \- | \- | ✓ | \- | \- | ✓ |
| Override review audience | \- | ✓ | \- | \- | \- | ✓ |
| Complete legal review | \- | \- | \- | ✓ | \- | ✓ |
| Complete compliance review | \- | \- | \- | \- | ✓ | ✓ |
| Complete closeout | ✓ (own) | \- | \- | \- | \- | ✓ |
| Cancel requests | ✓ (own) | ✓ | \- | ✓ | ✓ | ✓ |
| Place requests on hold | ✓ (own) | ✓ | \- | ✓ | ✓ | ✓ |
| Configure system settings | \- | \- | \- | \- | \- | ✓ |

---

## 5\. Functional Requirements

### 5.1 Request Management

#### 5.1.1 Request Creation

| Req ID | Requirement |
| :---- | :---- |
| REQ-001 | The system shall allow authenticated users to create new review requests |
| REQ-002 | The system shall automatically generate a unique Request ID for each new request in the format "CER-YY-N" (e.g., CER-25-1) |
| REQ-003 | The system shall set the initial status of new requests to "Draft" |
| REQ-004 | The system shall capture the submitter's name and email automatically from the logged-in user |
| REQ-005 | The system shall capture the submission date and time automatically |
| REQ-006 | The system shall allow users to save incomplete requests as drafts |
| REQ-007 | The system shall allow users to edit draft requests multiple times before submission |
| REQ-008 | The system shall validate all required fields before allowing submission from Draft to Legal Intake |
| REQ-009 | The system shall prevent submission if required fields are missing or invalid |
| REQ-010 | The system shall display clear error messages indicating which fields require correction |

#### 5.1.2 Request Information Fields

| Req ID | Requirement |
| :---- | :---- |
| REQ-011 | The system shall capture a descriptive Title for the request (max 255 characters) |
| REQ-012 | The system shall capture Department (text field, auto-populated from user profile, hidden from form) |
| REQ-013 | The system shall capture Request Type (choice field: Communication, General Review, IMA Review) |
| REQ-014 | The system shall capture Request Title (text field, 3-255 characters, required, descriptive title) |
| REQ-015 | The system shall capture Purpose (free text, multi-line) |
| REQ-016 | The system shall capture Submission Type (choice field: New, Material Updates) |
| REQ-017 | The system shall capture Submission Item (text field displaying value selected from SubmissionItems list, or "Other" with custom specification) |
| REQ-018 | The system shall capture Distribution Method (multi-choice field: Dodge & Cox Website \- U.S., Dodge & Cox Website \- Non-U.S., Third Party Website, Email / Mail, Mobile App, Display Card / Signage, Hangout, Live \- Talking Points, Social Media) |
| REQ-019 | The system shall capture Target Return Date (date picker, future dates only, required) |
| REQ-020 | The system shall calculate and display Is Rush Request (Yes/No boolean, auto-calculated based on turnaround time) |
| REQ-021 | The system shall capture Rush Rationale (multi-line text, required if IsRushRequest \= Yes, minimum 10 characters) |
| REQ-022 | The system shall capture Review Audience (choice field: Legal, Compliance, Both \- overridable by Legal Admin during intake) |
| REQ-023 | The system shall capture Prior Submissions (lookup field, multi-select to other requests in Requests list) |
| REQ-024 | The system shall capture Prior Submission Notes (multi-line text, context about prior submissions) |
| REQ-025 | The system shall capture Date of First Use (date field, future date allowed, informational purpose) |
| REQ-026 | The system shall capture Additional Party (people picker, multi-select for additional stakeholders) |
| REQ-027 | The system shall calculate and display Expected Turnaround Date based on Submission Item turnaround time and submitted date (business days) |

#### 5.1.3 Approval Fields

| Req ID | Requirement |
| :---- | :---- |
| REQ-028 | The system shall support multiple approval types: Communications, Portfolio Manager, Research Analyst, SME, Performance, Other |
| REQ-029 | The system shall require at least ONE approval before submission |
| REQ-030 | The system shall capture Approval Type (choice field) for each approval |
| REQ-031 | The system shall capture Approval Date (date picker) for each approval |
| REQ-032 | The system shall capture Approver Name (people picker) for each approval |
| REQ-033 | The system shall require document upload evidence for each approval |
| REQ-034 | The system shall allow users to add multiple approvals of different types |
| REQ-035 | The system shall validate that each approval has all required fields (type, date, approver, document) |
| REQ-036 | The system shall allow users to remove/edit approvals before submission |
| REQ-037 | The system shall display all approvals in a structured, readable format |

#### 5.1.4 Review Audience Determination

| Req ID | Requirement |
| :---- | :---- |
| REQ-038 | The system shall capture Review Audience (choice field: Legal, Compliance, Both) |
| REQ-039 | The system shall require Review Audience selection before submission |
| REQ-040 | The system shall allow Legal Admin to override Review Audience during Legal Intake |
| REQ-041 | The system shall route requests to appropriate reviewers based on Review Audience setting |

#### 5.1.5 Document Management

| Req ID | Requirement |
| :---- | :---- |
| REQ-042 | The system shall allow users to upload multiple documents to a request |
| REQ-043 | The system shall support common file formats: PDF, DOCX, XLSX, PPTX, JPG, PNG, MSG |
| REQ-044 | The system shall allow a pre-configured number of document uploads for each request. (Max 10\) |
| REQ-045 | The system shall enforce a maximum file size of 250MB per file (SharePoint limit) |
| REQ-046 | The system shall display clear error messages if file upload fails |
| REQ-047 | The system shall link uploaded documents to the request via metadata |
| REQ-048 | The system shall allow authorized users to download uploaded documents |
| REQ-049 | The system shall allow authorized users to delete documents before final submission |
| REQ-050 | The system shall display document metadata (filename, size, upload date, uploaded by) |
| REQ-051 | The system shall maintain version history for documents |
| REQ-052 | The system shall prevent unauthorized users from accessing request documents |

#### 5.1.6 Request Status Management

| Req ID | Requirement |
| :---- | :---- |
| REQ-053 | The system shall support the following statuses: Draft, Legal Intake, Assign Attorney, In Review, Closeout, Awaiting Foreside Documents, Completed, Cancelled, On Hold |
| REQ-054 | The system shall display current status prominently on the request form |
| REQ-055 | The system shall enforce valid status transitions based on workflow rules |
| REQ-056 | The system shall prevent invalid status changes |
| REQ-057 | The system shall log all status changes with user, timestamp, and optional comments |
| REQ-058 | The system shall display status history in chronological order |
| REQ-059 | The system shall calculate and display time spent in each status |
| REQ-060 | The system shall allow authorized users to cancel requests at any status |
| REQ-061 | The system shall allow authorized users to place requests on hold at any status |
| REQ-062 | The system shall allow authorized users to resume requests from on hold status |
| REQ-063 | The system shall capture reason for cancellation or hold |

### 5.2 Legal Intake Process

| Req ID | Requirement |
| :---- | :---- |
| REQ-064 | The system shall transition requests to "Legal Intake" status upon submission from Draft |
| REQ-065 | The system shall break permission inheritance when request moves from Draft to Legal Intake |
| REQ-066 | The system shall display all requests in Legal Intake status in a queue for Legal Admin |
| REQ-067 | The system shall allow Legal Admin to review all request details and uploaded documents |
| REQ-068 | The system shall allow Legal Admin to add Attorney Assign Notes (multi-line text) |
| REQ-069 | The system shall allow Legal Admin to override Review Audience |
| REQ-070 | The system shall allow Legal Admin to assign an attorney directly |
| REQ-071 | The system shall allow Legal Admin to route request to committee for attorney assignment |
| REQ-072 | The system shall transition request to "Assign Attorney" status if committee assignment selected |
| REQ-073 | The system shall transition request to "In Review" status if attorney directly assigned |
| REQ-074 | The system shall send notification to assigned attorney when request enters In Review |
| REQ-075 | The system shall send notification to committee members when request enters Assign Attorney |
| REQ-076 | The system shall display intake notes to attorneys and committee members |

### 5.3 Attorney Assignment Process

#### 5.3.1 Direct Assignment

| Req ID | Requirement |
| :---- | :---- |
| REQ-077 | The system shall allow Legal Admin to assign attorneys directly |
| REQ-078 | The system shall bypass "Assign Attorney" status when attorney is directly assigned |
| REQ-079 | The system shall transition request directly to "In Review" status |
| REQ-080 | The system shall grant assigned attorney edit permissions on the request |
| REQ-081 | The system shall send email notification to assigned attorney |
| REQ-082 | The system shall display attorney name on request form |
| REQ-083 | The system shall allow Legal Admin to change assigned attorney |

#### 5.3.2 Committee Assignment

| Req ID | Requirement |
| :---- | :---- |
| REQ-084 | The system shall transition request to "Assign Attorney" status when committee assignment selected |
| REQ-085 | The system shall notify all committee members (Attorney Assigners) when request enters this status |
| REQ-086 | The system shall allow committee members to view request details |
| REQ-087 | The system shall allow committee members to nominate attorneys |
| REQ-088 | The system shall allow committee members to add assignment rationale/notes |
| REQ-089 | The system shall allow committee members to finalize attorney assignment |
| REQ-090 | The system shall transition request to "In Review" status when attorney assigned by committee |
| REQ-091 | The system shall grant assigned attorney edit permissions on the request |
| REQ-092 | The system shall send email notification to assigned attorney |
| REQ-093 | The system shall track time spent in Assign Attorney status |

### 5.4 Legal Review Process

| Req ID | Requirement |
| :---- | :---- |
| REQ-094 | The system shall display all assigned requests in attorney's personal queue |
| REQ-095 | The system shall allow attorneys to access full request details and documents |
| REQ-096 | The system shall provide structured Legal Review form with required fields |
| REQ-097 | The system shall capture Legal Review Status (choice: Not Started, In Progress, Waiting On Submitter, Waiting On Attorney, Completed) |
| REQ-098 | The system shall capture Legal Review Outcome (choice: Approved, Approved with Comments, Respond To Comments And Resubmit, Not Approved) |
| REQ-099 | The system shall require Legal Review Outcome before completing review |
| REQ-100 | The system shall capture Legal Review Notes (multi-line text) |
| REQ-101 | The system shall require Legal Review Notes if outcome is "Approved with Comments", "Respond To Comments And Resubmit", or "Not Approved" |
| REQ-102 | The system shall capture Legal Review Completion Date automatically |
| REQ-103 | The system shall capture Legal Reviewer name automatically |
| REQ-104 | The system shall allow attorneys to upload additional documents during review |
| REQ-105 | The system shall transition request based on Review Audience and outcomes (see Business Rules) |
| REQ-106 | The system shall send notifications to submitter when legal review is complete |
| REQ-107 | The system shall prevent non-assigned attorneys from editing the review |
| REQ-107a | The system shall change Legal Review Status to "Waiting On Submitter" when outcome is "Respond To Comments And Resubmit" |
| REQ-107b | The system shall change Legal Review Status to "Waiting On Attorney" when submitter resubmits for legal review |
| REQ-107c | The system shall track time spent in each review status for time tracking purposes |
| REQ-107d | The system shall display "Waiting on Submitter since [date]" indicator when status is Waiting On Submitter |
| REQ-107e | The system shall display "Waiting on Attorney since [date]" indicator when status is Waiting On Attorney |

### 5.5 Compliance Review Process

| Req ID | Requirement |
| :---- | :---- |
| REQ-108 | The system shall route requests to compliance queue when Review Audience includes Compliance |
| REQ-109 | The system shall display all compliance-pending requests in compliance user queue |
| REQ-110 | The system shall provide structured Compliance Review form with required fields |
| REQ-111 | The system shall capture Compliance Review Status (choice: Not Started, In Progress, Waiting On Submitter, Waiting On Compliance, Completed) |
| REQ-112 | The system shall capture Compliance Review Outcome (choice: Approved, Approved with Comments, Respond To Comments And Resubmit, Not Approved) |
| REQ-113 | The system shall require Compliance Review Outcome before completing review |
| REQ-114 | The system shall capture Compliance Review Notes (multi-line text) |
| REQ-115 | The system shall require Compliance Review Notes if outcome is "Approved with Comments", "Respond To Comments And Resubmit", or "Not Approved" |
| REQ-116 | The system shall capture Compliance Review Completion Date automatically |
| REQ-117 | The system shall capture Compliance Reviewer name automatically |
| REQ-118 | The system shall capture Is Foreside Review Required flag (Yes/No) |
| REQ-119 | The system shall capture Is Retail Use flag (Yes/No) |
| REQ-120 | The system shall allow compliance users to upload additional documents during review |
| REQ-121 | The system shall transition request based on Review Audience and outcomes (see Business Rules) |
| REQ-122 | The system shall send notifications to submitter when compliance review is complete |
| REQ-123 | The system shall prevent unauthorized users from editing compliance review |
| REQ-123a | The system shall change Compliance Review Status to "Waiting On Submitter" when outcome is "Respond To Comments And Resubmit" |
| REQ-123b | The system shall change Compliance Review Status to "Waiting On Compliance" when submitter resubmits for compliance review |
| REQ-123c | The system shall track time spent in each compliance review status for time tracking purposes |
| REQ-123d | The system shall display "Waiting on Submitter since [date]" indicator when status is Waiting On Submitter |
| REQ-123e | The system shall display "Waiting on Compliance since [date]" indicator when status is Waiting On Compliance |

### 5.6 Closeout Process

| Req ID | Requirement |
| :---- | :---- |
| REQ-124 | The system shall transition request to Closeout status when all required reviews are completed with Approved or Approved with Comments |
| REQ-125 | The system shall bypass Closeout and transition to Completed if any review outcome is Not Approved |
| REQ-126 | The system shall display Closeout form to authorized users |
| REQ-127 | The system shall capture Tracking ID (free text) |
| REQ-128 | The system shall make Tracking ID conditionally required based on business rules (see REQ-118 \- REQ-119) |
| REQ-129 | The system shall require Tracking ID if: Compliance Review was performed AND (Is Foreside Review Required \= Yes OR Is Retail Use \= Yes) |
| REQ-130 | The system shall validate Tracking ID requirement before allowing transition to Completed |
| REQ-131 | The system shall allow users to add final closeout notes |
| REQ-132 | The system shall capture Closeout Completion Date automatically |
| REQ-133 | The system shall capture Closeout Completed By automatically |
| REQ-134 | The system shall transition request to Awaiting Foreside Documents status if Is Foreside Review Required = Yes |
| REQ-134a | The system shall transition request to Completed status upon closeout submission if Is Foreside Review Required = No |
| REQ-135 | The system shall send notification to submitter when request is completed |
| REQ-136 | The system shall send notification to all reviewers when request is completed |
| REQ-137 | The system shall lock request for editing once Completed status is reached |

### 5.6a Awaiting Foreside Documents Process

| Req ID | Requirement |
| :---- | :---- |
| REQ-200 | The system shall display Awaiting Foreside Documents form to submitter and admin when request is in this status |
| REQ-201 | The system shall allow submitter or admin to upload Foreside letter documents |
| REQ-202 | The system shall require at least one Foreside document to be uploaded before completing |
| REQ-203 | The system shall allow submitter or admin to add Foreside notes |
| REQ-204 | The system shall capture Foreside Completed By automatically |
| REQ-205 | The system shall capture Foreside Completed On automatically |
| REQ-206 | The system shall capture Awaiting Foreside Since timestamp when entering this status |
| REQ-207 | The system shall NOT track time for the Awaiting Foreside Documents phase |
| REQ-208 | The system shall NOT show Cancel or Hold actions when in Awaiting Foreside Documents status |
| REQ-209 | The system shall NOT include Awaiting Foreside Documents requests in Open Requests views |
| REQ-210 | The system shall transition request to Completed status when Foreside documents are submitted |

### 5.7 Comments and Collaboration

| Req ID | Requirement |
| :---- | :---- |
| REQ-138 | The system shall provide a comments section visible to all authorized users on the request |
| REQ-139 | The system shall allow authorized users to add comments at any status except Draft |
| REQ-140 | The system shall capture commenter name and timestamp automatically |
| REQ-141 | The system shall display comments in chronological order (newest first or oldest first, configurable) |
| REQ-142 | The system shall support @mentions to notify specific users |

### 5.8 Search and Filter

| Req ID | Requirement |
| :---- | :---- |
| REQ-143 | The system shall provide search capability to find requests by Request ID |
| REQ-144 | The system shall provide search capability to find requests by Title |
| REQ-145 | The system shall provide filter capability by Status |
| REQ-146 | The system shall provide filter capability by Assigned Attorney |
| REQ-147 | The system shall provide filter capability by Submitter |
| REQ-148 | The system shall provide filter capability by Request Type |
| REQ-149 | The system shall provide filter capability by Review Audience |
| REQ-150 | The system shall display search results with key information (ID, Title, Status) |

---

## 6\. Non-Functional Requirements

### 6.1 Performance

| Req ID | Requirement |
| :---- | :---- |
| REQ-151 | The system shall load request forms within 5 seconds on standard network connections |
| REQ-152 | The system shall display dashboard views within 3 seconds |
| REQ-153 | The system shall support up to 100 concurrent users without performance degradation |
| REQ-154 | The system shall handle requests with up to 50 document attachments |
| REQ-155 | The system shall process form submissions within 5 seconds |
| REQ-156 | The system shall support database growth to 10,000 requests without performance impact |
| REQ-157 | The system shall implement pagination for lists exceeding 100 items |

### 6.2 Availability and Reliability

| Req ID | Requirement |
| :---- | :---- |
| REQ-158 | The system shall maintain 99.5% uptime during business hours (8 AM \- 6 PM PST/PDT, Monday-Friday) |
| REQ-159 | The system shall leverage SharePoint Online's built-in redundancy and disaster recovery |
| REQ-160 | The system shall recover from Azure Function failures without data loss |
| REQ-161 | The system shall queue failed notifications for retry |
| REQ-162 | The system shall log all errors for troubleshooting |

### 6.3 Scalability

| Req ID | Requirement |
| :---- | :---- |
| REQ-163 | The system shall support scaling to 100+ users in Phase 2 |
| REQ-164 | The system shall support scaling to 5000+ requests over 5 years |
| REQ-165 | The system shall support adding new request types without architecture changes |
| REQ-166 | The system shall support adding new fields |

### 6.4 Security

| Req ID | Requirement |
| :---- | :---- |
| REQ-167 | The system shall authenticate all users via Microsoft 365 Azure AD |
| REQ-168 | The system shall enforce role-based access control (RBAC) |
| REQ-169 | The system shall implement item-level permissions based on workflow status |
| REQ-170 | The system shall break permission inheritance when requests transition from Draft to Legal Intake |
| REQ-171 | The system shall grant submitters read-only access to others' requests |
| REQ-172 | The system shall restrict editing to authorized users based on current status |
| REQ-173 | The system shall prevent unauthorized access to request documents |
| REQ-174 | The system shall sanitize all user inputs to prevent injection attacks |
| REQ-175 | The system shall encrypt data in transit using HTTPS/TLS |
| REQ-176 | The system shall leverage SharePoint's encryption at rest |
| REQ-177 | The system shall restrict external user access (internal employees only) |

### 6.5 Accessibility

| Req ID | Requirement |
| :---- | :---- |
| REQ-178 | The system shall comply with WCAG 2.1 Level AA accessibility standards |
| REQ-179 | The system shall provide keyboard navigation for all interactive elements |
| REQ-180 | The system shall provide ARIA labels for screen readers |
| REQ-181 | The system shall support high contrast mode |

### 6.6 Usability

| Req ID | Requirement |
| :---- | :---- |
| REQ-182 | The system shall provide consistent navigation across all forms and views |
| REQ-183 | The system shall provide contextual help text for complex fields |
| REQ-184 | The system shall display clear error messages with guidance on how to resolve |
| REQ-185 | The system shall provide visual indicators for required fields |
| REQ-186 | The system shall provide visual indicators for field validation status (valid/invalid) |
| REQ-187 | The system shall provide confirmation dialogs for destructive actions (cancel, delete) |
| REQ-188 | The system shall provide success messages for completed actions |
| REQ-189 | The system shall use consistent terminology throughout the interface |
| REQ-190 | The system shall follow Fluent UI design patterns for consistency with Microsoft 365 |

### 6.7 Auditability and Compliance

| Req ID | Requirement |
| :---- | :---- |
| REQ-191 | The system shall maintain a complete audit trail of all actions (create, read, update, delete) |
| REQ-192 | The system shall log user identity, timestamp, action type, and affected data for all changes |
| REQ-193 | The system shall provide history showing request lifecycle |

### 6.8 Browser Compatibility

| Req ID | Requirement |
| :---- | :---- |
| REQ-194 | The system shall support Google Chrome version 90 and above |
| REQ-195 | The system shall support Microsoft Edge version 90 and above |

---

## 7\. Data Requirements

### 7.1 SharePoint Lists Architecture

#### 7.1.1 Requests List

| Req ID | Requirement |
| :---- | :---- |
| REQ-196 | The system shall maintain a Requests list with all fields organized into sections |
| REQ-197 | The system shall enforce field-level validation based on data types and business rules |
| REQ-198 | The system shall support the following field types: Single Line Text, Multi-Line Text, Choice, Date, People Picker, Lookup, Yes/No, Number |
| REQ-199 | The system shall maintain referential integrity between related lists |

**Request Information Section:**

| Req ID | Field Name | Data Type | Required |
| :---- | :---- | :---- | :---- |
| REQ-200 | Request Id | Single Text Line | Yes |
| REQ-201 | Title | Single Line Text | Yes |
| REQ-202 | Department | Single Line Text | Yes |
| REQ-203 | Request Type | Lookup | Yes |
| REQ-204 | Purpose | Multi-Line Text | Yes |
| REQ-205 | Submission Type | Single Line Text | Yes |
| REQ-206 | Submission Item | Single Line Text | Yes |
| REQ-207 | Distribution Method | Multi-Choice | Yes |
| REQ-208 | Target Return Date | Date | Yes |
| REQ-209 | Is Rush Request | Yes/No | Yes |
| REQ-210 | Rush Rationale | Multi-Line Text | Yes |
| REQ-211 | Review Audience | Choice | Yes |
| REQ-212 | Prior Submissions | Lookup (Multi) | No |
| REQ-213 | Prior Submission Notes | Multi-Line Text | No |
| REQ-214 | Date of First Use | Date | No |
| REQ-215 | Additional Party | People Picker (Multi) | No |

**Approval Fields Section:**

| Req ID | Requirement |
| :---- | :---- |
| REQ-216 | The system shall support up to 6 approval types: Communications, Portfolio Manager, Research Analyst, SME, Performance, Other |
| REQ-217 | The system shall capture Approval Date, Approver Name, and Document Link for each approval type |
| REQ-218 | The system shall validate that at least one complete approval set is provided |

**Legal Intake Section (2 fields):**

| Req ID | Field Name | Data Type | Required |
| :---- | :---- | :---- | :---- |
| REQ-219 | Attorney | People Picker | Conditional |
| REQ-220 | Attorney Assign Notes | Multi-Line Text | No |

**Legal Review Section (5 fields):**

| Req ID | Field Name | Data Type | Required |
| :---- | :---- | :---- | :---- |
| REQ-221 | Legal Review Status | Choice | Conditional |
| REQ-222 | Legal Review Outcome | Choice | Conditional |
| REQ-223 | Legal Review Notes | Multi-Line Text | Conditional |
| REQ-224 | Legal Review Date | Date | Auto |
| REQ-225 | Legal Reviewer | People Picker | Auto |

**Compliance Review Section (7 fields):**

| Req ID | Field Name | Data Type | Required |
| :---- | :---- | :---- | :---- |
| REQ-226 | Compliance Review Status | Choice | Conditional |
| REQ-227 | Compliance Review Outcome | Choice | Conditional |
| REQ-228 | Compliance Review Notes | Multi-Line Text | Conditional |
| REQ-229 | Compliance Review Date | Date | Auto |
| REQ-230 | Compliance Reviewer | People Picker | Auto |
| REQ-231 | Is Foreside Review Required | Yes/No | Conditional |
| REQ-232 | Is Retail Use | Yes/No | Conditional |

**Closeout Section (1 field):**

| Req ID | Field Name | Data Type | Required |
| :---- | :---- | :---- | :---- |
| REQ-233 | Tracking ID | Single Line Text | Conditional |

**System Tracking Section (16 fields):**

| Req ID | Field Name | Data Type | Required |
| :---- | :---- | :---- | :---- |
| REQ-234 | Status | Choice | Yes |
| REQ-235 | Review Audience | Choice | Yes |
| REQ-236 | Submitted By | People Picker | Auto |
| REQ-237 | Submitted On | Date/Time | Auto |
| REQ-238 | Created By | People Picker | Auto |
| REQ-239 | Created | Date/Time | Auto |
| REQ-240 | Modified By | People Picker | Auto |
| REQ-241 | Modified | Date/Time | Auto |
| REQ-243 | Cancelled/On Hold Reason | Multi-Line Text | Conditional |

#### 7.1.2 SubmissionItems List

| Req ID | Requirement |
| :---- | :---- |
| REQ-244 | The system shall maintain a SubmissionItems configuration list |
| REQ-245 | The system shall capture Title (submission type name) |
| REQ-246 | The system shall capture Turnaround Time In Days (number) |
| REQ-247 | The system shall capture Description (multi-line text) |
| REQ-248 | The system shall allow admins to add, edit, and delete submission types |
| REQ-249 | The system shall prevent deletion of submission types in use by active requests |

#### 7.1.3 RequestDocuments Library

| Req ID | Requirement |
| :---- | :---- |
| REQ-250 | The system shall maintain a RequestDocuments document library |
| REQ-251 | The system shall link documents to requests via Request ID metadata field |
| REQ-252 | The system shall capture Document Type metadata (choice: Request Material, Approval Evidence, Review Document, Other) |
| REQ-253 | The system shall capture Uploaded By metadata (people picker) |
| REQ-254 | The system shall capture Upload Date metadata (date/time) |
| REQ-255 | The system shall enforce same permissions as parent request |
| REQ-256 | The system shall support document versioning |

### 7.2 Data Validation

| Req ID | Requirement |
| :---- | :---- |
| REQ-257 | The system shall validate all date fields to ensure valid date format |
| REQ-258 | The system shall validate that Target Return Date is not in the past |
| REQ-259 | The system shall validate that Approval Dates are not in the future |
| REQ-260 | The system shall validate people picker fields |
| REQ-261 | The system shall validate that text fields do not exceed maximum length |
| REQ-262 | The system shall validate that required choice fields have a selection |
| REQ-263 | The system shall validate that conditional fields are completed when conditions are met |
| REQ-264 | The system shall provide real-time validation feedback to users |

### 7.3 Data Retention

| Req ID | Requirement |
| :---- | :---- |
| REQ-265 | The system shall retain all request data indefinitely unless explicitly deleted by admin |
| REQ-266 | The system shall retain all audit logs for minimum 7 years |
| REQ-267 | The system shall retain all uploaded documents per D\&C retention policy |

---

## 8\. Integration Requirements

### 8.1 Azure Functions Integration

| Req ID | Requirement |
| :---- | :---- |
| REQ-268 | The system shall integrate with Azure Function for permission management |
| REQ-269 | The system shall call permission management function when request status changes |
| REQ-270 | The system shall break permission inheritance via Azure Function |
| REQ-271 | The system shall grant appropriate permissions based on status and role |
| REQ-272 | The system shall handle Azure Function failures gracefully without blocking user actions |
| REQ-273 | The system shall retry failed permission updates |
| REQ-274 | The system shall integrate with Azure Function for notification content generation |
| REQ-275 | The system shall pass request context to notification generation function |
| REQ-276 | The system shall receive formatted notification content from Azure Function |

### 8.2 Power Automate Integration

| Req ID | Requirement |
| :---- | :---- |
| REQ-277 | The system shall trigger Power Automate flows on request creation |
| REQ-278 | The system shall trigger Power Automate flows on status changes |
| REQ-279 | The system shall trigger Power Automate flows on assignment changes |
| REQ-280 | The system shall use Power Automate to send email notifications |
| REQ-281 | The system shall use Power Automate to orchestrate Azure Function calls |
| REQ-282 | The system shall handle Power Automate flow failures without data loss |

### 8.3 Email Notifications

| Req ID | Requirement |
| :---- | :---- |
| REQ-283 | The system shall send email notifications when request is submitted (Draft → Legal Intake) |
| REQ-284 | The system shall send email notifications when attorney is assigned |
| REQ-285 | The system shall send email notifications when request is routed to committee |
| REQ-286 | The system shall send email notifications when legal review is completed |
| REQ-287 | The system shall send email notifications when compliance review is completed |
| REQ-288 | The system shall send email notifications when request is completed |
| REQ-289 | The system shall send email notifications when request is cancelled |
| REQ-290 | The system shall send email notifications when request is placed on hold |
| REQ-291 | The system shall send email notifications when request is resumed from hold |
| REQ-292 | The system shall include request details in email notifications (ID, Title, Status, Link) |
| REQ-293 | The system shall include action items in email notifications when applicable |
| REQ-294 | The system shall use professional email templates consistent with company branding |
| REQ-295 | The system shall send notifications from a recognizable system email address |

---

## 9\. User Interface Requirements

### 9.1 Layout and Design

| Req ID | Requirement |
| :---- | :---- |
| REQ-296 | The system shall use a 70/30 layout with form content on left (70%) and comments on right (30%) |
| REQ-297 | The system shall use card-based UI components for sections |
| REQ-298 | The system shall use Fluent UI design system for consistency with Microsoft 365 |
| REQ-299 | The system shall provide collapsible sections for better content organization |
| REQ-300 | The system shall display progress indicator showing current workflow step |
| REQ-301 | The system shall use consistent spacing, typography, and colors throughout |
| REQ-302 | The system shall support responsive design for different screen sizes |

### 9.2 Form Behavior

| Req ID | Requirement |
| :---- | :---- |
| REQ-302 | The system shall display required fields with visual indicator (asterisk or label) |
| REQ-304 | The system shall provide real-time inline validation feedback |
| REQ-305 | The system shall display validation errors near the relevant field |
| REQ-306 | The system shall prevent form submission if validation errors exist |
| REQ-307 | The system shall disable fields that are read-only based on status and role |
| REQ-308 | The system shall show/hide conditional fields based on user selections |

### 9.3 Navigation

| Req ID | Requirement |
| :---- | :---- |
| REQ-309 | The system shall provide breadcrumb navigation |
| REQ-310 | The system shall provide "Back to List" navigation button |
| REQ-311 | The system shall provide "Save as Draft" button on all editable forms |
| REQ-312 | The system shall provide "Submit" button when all validations pass |
| REQ-313 | The system shall provide "Cancel" button with confirmation dialog |
| REQ-314 | The system shall provide contextual action buttons based on status and role |

### 9.4 Dashboard and List Views

| Req ID | Requirement |
| :---- | :---- |
| REQ-315 | The system shall provide "My Requests" dashboard showing user's submitted requests |
| REQ-316 | The system shall provide "My Assigned Requests" dashboard for attorneys |
| REQ-317 | The system shall provide "Legal Intake" dashboard for legal admins |
| REQ-318 | The system shall provide "Compliance" dashboard for compliance users |
| REQ-319 | The system shall provide "All Requests" view for admins |
| REQ-320 | The system shall display key columns: Request ID, Title, Status, Assigned To, Target Date, Submitted Date |
| REQ-321 | The system shall support column sorting (ascending/descending) |
| REQ-322 | The system shall support pagination for large result sets |
| REQ-323 | The system shall highlight rush requests with visual indicator |
| REQ-324 | The system shall highlight overdue requests with visual indicator |

---

## 10\. Reporting and Analytics

### 10.1 Standard Reports

| Req ID | Requirement |
| :---- | :---- |
| REQ-325 | The system shall provide "Requests by Status" report |
| REQ-326 | The system shall provide "Requests by Attorney" report |
| REQ-327 | The system shall provide "Rush Requests" report |
| REQ-328 | The system shall provide "Overdue Requests" report |
| REQ-329 | The system shall provide "Requests by Request Type" report |
| REQ-330 | The system shall provide "Monthly Submission Volume" report |

---

## 11\. Business Rules

### 11.1 Rush Request Calculation

| Req ID | Requirement |
| :---- | :---- |
| REQ-331 | The system shall calculate expected turnaround date as: Submitted Date \+ Turnaround Time In Days (business days only) |
| REQ-332 | The system shall exclude weekends from business day calculations |
| REQ-333 | The system shall mark request as "Rush" if Target Return Date \< Expected Turnaround Date |
| REQ-334 | The system shall display rush indicator prominently on request form and list views |

### 11.2 Approval Requirements

| Req ID | Requirement |
| :---- | :---- |
| REQ-335 | The system shall require at least ONE complete approval set (date \+ approver \+ document) before submission |
| REQ-336 | The system shall validate that approval date is not in the future |
| REQ-337 | The system shall validate that approver is selected from people picker |
| REQ-338 | The system shall validate that approval document is uploaded |
| REQ-339 | The system shall allow multiple approvals of different types |

### 11.3 Review Audience Routing

| Req ID | Requirement |
| :---- | :---- |
| REQ-340 | The system shall route request to legal review only if Review Audience \= "Legal" |
| REQ-341 | The system shall route request to compliance review only if Review Audience \= "Compliance" |
| REQ-342 | The system shall route request to both legal and compliance if Review Audience \= "Both" |
| REQ-343 | The system shall allow Legal Admin to override Review Audience during Legal Intake |

### 11.4 Attorney Assignment Logic

| Req ID | Requirement |
| :---- | :---- |
| REQ-344 | The system shall support two assignment methods: Direct (by Legal Admin) and Committee-based |
| REQ-345 | The system shall bypass "Assign Attorney" status if attorney is directly assigned |
| REQ-346 | The system shall transition to "Assign Attorney" status if committee assignment is selected |
| REQ-347 | The system shall transition to "In Review" status once attorney is assigned (either method) |

### 11.5 Review Completion and Status Transitions

| Req ID | Requirement |
| :---- | :---- |
| REQ-348 | The system shall require Legal Review Outcome to be set before completing legal review |
| REQ-349 | The system shall require Compliance Review Outcome to be set before completing compliance review |
| REQ-350 | The system shall transition request to Closeout if all required reviews are Approved or Approved with Comments |
| REQ-351 | The system shall transition request to Completed (bypassing Closeout) if any review is Not Approved |
| REQ-352 | The system shall handle sequential reviews (Legal first, then Compliance) if Review Audience \= Both |
| REQ-353 | The system shall handle parallel reviews if business process supports it (future enhancement) |

### 11.5a Respond To Comments And Resubmit Workflow

| Req ID | Requirement |
| :---- | :---- |
| REQ-353a | When reviewer selects "Respond To Comments And Resubmit" outcome, the system shall set review status to "Waiting On Submitter" |
| REQ-353b | The system shall record the status change timestamp in the appropriate StatusUpdatedOn field (LegalStatusUpdatedOn or ComplianceStatusUpdatedOn) |
| REQ-353c | The system shall send notification to the submitter when status changes to "Waiting On Submitter" |
| REQ-353d | When in "Waiting On Submitter" status, the submitter shall be able to view reviewer comments and add response notes |
| REQ-353e | When in "Waiting On Submitter" status, the submitter shall be able to upload revised documents |
| REQ-353f | The system shall provide a "Resubmit for Review" button to the submitter when status is "Waiting On Submitter" |
| REQ-353g | When submitter clicks "Resubmit for Review", the system shall change review status to "Waiting On Attorney" (for legal) or "Waiting On Compliance" (for compliance) |
| REQ-353h | The system shall calculate and update time tracking hours at each status transition (Waiting On Submitter → Waiting On Reviewer) |
| REQ-353i | The system shall send notification to the reviewer when submitter resubmits for review |
| REQ-353j | The system shall keep the Review Outcome field as "Respond To Comments And Resubmit" (disabled) until reviewer submits final outcome |
| REQ-353k | When in "Waiting On Attorney" or "Waiting On Compliance" status, the reviewer shall be able to submit a final review outcome |
| REQ-353l | The system shall display visual indicators showing "Waiting on Submitter since [date]" or "Waiting on [Reviewer] since [date]" in the review card header |
| REQ-353m | The system shall allow multiple rounds of "Respond To Comments And Resubmit" cycles until reviewer submits final outcome |

### 11.6 Tracking ID Requirement

| Req ID | Requirement |
| :---- | :---- |
| REQ-354 | The system shall require Tracking ID at Closeout IF compliance review was performed |
| REQ-355 | The system shall require Tracking ID at Closeout IF Is Foreside Review Required \= Yes |
| REQ-356 | The system shall require Tracking ID at Closeout IF Is Retail Use \= Yes |
| REQ-357 | The system shall make Tracking ID optional if none of the above conditions are met |
| REQ-358 | The system shall validate Tracking ID requirement before allowing transition to Completed |

### 11.7 Workflow Status Transitions

| Req ID | Requirement |
| :---- | :---- |
| REQ-359 | The system shall enforce the following valid status transitions: Draft → Legal Intake |
| REQ-360 | The system shall enforce: Legal Intake → Assign Attorney (if committee) OR In Review (if direct) |
| REQ-361 | The system shall enforce: Assign Attorney → In Review |
| REQ-362 | The system shall enforce: In Review → Closeout (if approved) OR Completed (if not approved) |
| REQ-363 | The system shall enforce: Closeout → Awaiting Foreside Documents (if Foreside Review Required) OR Completed (if not required) |
| REQ-363a | The system shall enforce: Awaiting Foreside Documents → Completed |
| REQ-364 | The system shall allow transition to Cancelled from any status (by authorized users) |
| REQ-365 | The system shall allow transition to On Hold from any status (by authorized users) |
| REQ-366 | The system shall allow transition from On Hold back to previous status (by authorized users) |
| REQ-367 | The system shall prevent invalid status transitions |

### 11.8 Permission Updates

| Req ID | Requirement |
| :---- | :---- |
| REQ-368 | The system shall break permission inheritance when status changes from Draft to Legal Intake |
| REQ-369 | The system shall grant submitter read-only access when inheritance is broken |
| REQ-370 | The system shall grant Legal Admin full control when status \= Legal Intake |
| REQ-371 | The system shall grant assigned attorney edit access when status \= In Review |
| REQ-372 | The system shall grant compliance users edit access when compliance review required |
| REQ-373 | The system shall revoke edit access when review is completed |
| REQ-374 | The system shall maintain admin full control at all times |

---

## 12\. Phase 2 \- Future Requirements

### 12.1 Additional Request Types

| Req ID | Requirement |
| :---- | :---- |
| REQ-375 | The system shall support "General Review" request type in Phase 2 |
| REQ-376 | The system shall support "IMA Review" request type in Phase 2 |

### 12.2 Seismic Database Integration

| Req ID | Requirement |
| :---- | :---- |
| REQ-377 | The system shall integrate with Seismic Database for approved materials in Phase 2 |
| REQ-378 | The system shall sync document metadata with Seismic |

---

## 13\. Testing Requirements

### 13.1 Unit Testing

| Req ID | Requirement |
| :---- | :---- |
| REQ-379 | Development team shall test all validation rules independently |
| REQ-380 | Development team shall test all data transformation functions |

### 13.2 Integration Testing

| Req ID | Requirement |
| :---- | :---- |
| REQ-381 | QA team shall test integration between SPFx form and SharePoint lists |
| REQ-382 | QA team shall test integration with Azure Functions |
| REQ-383 | QA team shall test integration with Power Automate flows |
| REQ-384 | QA team shall test email notification delivery |

### 13.3 High-Level Test Scenarios

#### 13.3.1 Request Lifecycle Test Scenarios

| Test ID | Test Scenario | Expected Outcome |
| :---- | :---- | :---- |
| TS-001 | Create new request as submitter, save as draft | Request saved with status \= Draft, user can navigate away and return to edit |
| TS-002 | Submit request from Draft to Legal Intake with all required fields | Request transitions to Legal Intake, submitter receives confirmation, legal admin receives notification |
| TS-003 | Submit request with missing required fields | Validation errors displayed, submission blocked, clear guidance provided |
| TS-004 | Submit request without minimum one approval | Validation error displayed, submission blocked |
| TS-005 | Legal Admin assigns attorney directly | Request transitions to In Review, attorney receives notification, attorney has edit access |
| TS-006 | Legal Admin routes request to committee for assignment | Request transitions to Assign Attorney, committee members receive notification |
| TS-007 | Committee assigns attorney to request | Request transitions to In Review, attorney receives notification, attorney has edit access |
| TS-008 | Attorney completes legal review with "Approved" outcome | Request transitions per Review Audience rules, submitter receives notification |
| TS-009 | Attorney completes legal review with "Not Approved" outcome | Request transitions to Completed (bypass Closeout), submitter receives notification |
| TS-010 | Compliance user completes compliance review with "Approved" outcome | Request transitions per Review Audience rules, submitter receives notification |
| TS-011 | Complete closeout with required Tracking ID | Request transitions to Completed, all stakeholders notified |
| TS-012 | Attempt closeout without required Tracking ID | Validation error displayed, transition blocked |
| TS-013 | Cancel request at various statuses | Request transitions to Cancelled, reason captured, stakeholders notified |
| TS-014 | Place request on hold and resume | Request transitions to On Hold, then back to previous status, reasons captured |

#### 13.3.2 Business Rules Test Scenarios

| Test ID | Test Scenario | Expected Outcome |
| :---- | :---- | :---- |
| TS-015 | Calculate rush request: Target date \= 3 business days, Turnaround \= 5 business days | Request marked as Rush, visual indicator displayed |
| TS-016 | Calculate rush request: Target date \= 7 business days, Turnaround \= 5 business days | Request NOT marked as Rush |
| TS-017 | Calculate expected turnaround date excluding weekends | Expected date calculated correctly (e.g., submit Friday \+ 3 days \= Wednesday) |
| TS-018 | Verify Tracking ID required: Compliance reviewed \+ Foreside Required \= Yes | Tracking ID field marked required, validation enforced |
| TS-019 | Verify Tracking ID required: Compliance reviewed \+ Retail Use \= Yes | Tracking ID field marked required, validation enforced |
| TS-020 | Verify Tracking ID optional: No compliance review | Tracking ID field optional, closeout allowed without it |
| TS-021 | Legal Admin overrides Review Audience from "Legal" to "Both" | Request routed to both legal and compliance reviews, change logged |
| TS-022 | Review Audience \= "Both": Complete legal review first | Request routed to compliance review next |

#### 13.3.3 Permission and Security Test Scenarios

| Test ID | Test Scenario | Expected Outcome |
| :---- | :---- | :---- |
| TS-023 | Submitter views own request in Draft status | Full read/write access, can edit and submit |
| TS-024 | Submitter views own request after submission to Legal Intake | Read-only access, cannot edit |
| TS-025 | Submitter views another user's request | Read-only access, no edit buttons visible |
| TS-026 | Legal Admin views request in Legal Intake | Full edit access, can assign attorney and override settings |
| TS-027 | Attorney views assigned request | Edit access to review fields, can complete review |
| TS-028 | Attorney attempts to view unassigned request | Limited or no access (based on permission rules) |
| TS-029 | Compliance user views request requiring compliance review | Edit access to compliance review fields |
| TS-030 | Admin views any request at any status | Full edit access, all actions available |
| TS-031 | Verify permission inheritance broken when Draft → Legal Intake | Inheritance broken, custom permissions applied |

#### 13.3.4 Validation and Error Handling Test Scenarios

| Test ID | Test Scenario | Expected Outcome |
| :---- | :---- | :---- |
| TS-032 | Enter Target Return Date in the past | Validation error displayed, submission blocked |
| TS-033 | Enter Approval Date in the future | Validation error displayed, submission blocked |
| TS-034 | Upload file exceeding 250MB | Error message displayed, upload blocked |
| TS-035 | Upload file with unsupported format | Warning or error displayed, guidance provided |
| TS-036 | Submit form with conditional field missing (e.g., Performance Time Period when Performance Data \= Yes) | Validation error displayed, field highlighted |
| TS-037 | Azure Function fails during permission update | Error logged, user notified, request state preserved |
| TS-038 | Power Automate flow fails during notification send | Error logged, notification queued for retry, request state preserved |

#### 13.3.5 Workflow Variation Test Scenarios

| Test ID | Test Scenario | Expected Outcome |
| :---- | :---- | :---- |
| TS-039 | Complete workflow: Review Audience \= "Legal" only | Request routes through Legal Intake → Legal Review → Closeout → Completed |
| TS-040 | Complete workflow: Review Audience \= "Compliance" only | Request routes through Legal Intake → Compliance Review → Closeout → Completed |
| TS-041 | Complete workflow: Review Audience \= "Both" | Request routes through Legal Intake → Legal Review → Compliance Review → Closeout → Completed |
| TS-042 | Complete workflow: Direct attorney assignment | Request bypasses Assign Attorney status |
| TS-043 | Complete workflow: Committee attorney assignment | Request includes Assign Attorney status |
| TS-044 | Complete workflow: Not Approved outcome | Request bypasses Closeout, goes directly to Completed |

#### 13.3.6 Notification Test Scenarios

| Test ID | Test Scenario | Expected Outcome |
| :---- | :---- | :---- |
| TS-045 | Submit request from Draft to Legal Intake | Submitter receives confirmation email, Legal Admin receives assignment email |
| TS-046 | Assign attorney to request | Attorney receives assignment notification with request details and link |
| TS-047 | Complete legal review | Submitter receives notification with review outcome |
| TS-048 | Complete compliance review | Submitter receives notification with review outcome |
| TS-049 | Complete closeout | Submitter and all reviewers receive completion notification |
| TS-050 | Cancel request | All stakeholders receive cancellation notification |

#### 13.3.7 Reporting and Dashboard Test Scenarios

| Test ID | Test Scenario | Expected Outcome |
| :---- | :---- | :---- |
| TS-051 | View "My Requests" dashboard as submitter | Display all requests submitted by user with correct statuses and dates |
| TS-052 | View "My Assigned Requests" dashboard as attorney | Display all requests assigned to user, sorted by priority/date |
| TS-053 | View "Legal Intake" as Legal Admin | Display all requests in Legal Intake status with key details |
| TS-054 | Filter requests by status | Display filtered results matching selected status |
| TS-055 | Search requests by Request ID | Display matching request or "no results" message |

#### 13.3.8 User Experience Test Scenarios

| Test ID | Test Scenario | Expected Outcome |
| :---- | :---- | :---- |
| TS-056 | Navigate away from unsaved draft | Warning dialog displayed, option to save or discard |
| TS-057 | Load request with 50 document attachments | Form loads within performance SLA (\< 5 seconds) |
| TS-058 | Use form on different browsers (Chrome, Edge) | Consistent functionality and appearance across browsers |

### 13.4 User Acceptance Testing (UAT)

| Req ID | Requirement |
| :---- | :---- |
| REQ-385 | Business stakeholders shall conduct UAT for minimum 2-3 weeks |
| REQ-386 | UAT shall include representative users from each role (Submitters, Legal Admin, Attorneys, Compliance) |
| REQ-387 | UAT shall test complete end-to-end workflows with real-world scenarios |
| REQ-388 | UAT shall validate dashboard functionality |
| REQ-389 | UAT participants shall document all issues and feedback |
| REQ-390 | Critical issues identified in UAT shall be resolved before go-live |

### 13.5 Performance Testing

| Req ID | Requirement |
| :---- | :---- |
| REQ-391 | QA team shall conduct load testing with 100 concurrent users |
| REQ-392 | QA team shall test form load performance with large data sets |
| REQ-393 | QA team shall test document upload performance with maximum file sizes |
| REQ-394 | QA team shall validate system meets performance SLAs (see Section 6.1) |

### 13.6 Security Testing

| Req ID | Requirement |
| :---- | :---- |
| REQ-395 | Security team shall conduct penetration testing |
| REQ-396 | Security team shall validate role-based access controls |
| REQ-397 | Security team shall validate item-level permissions |
| REQ-398 | Security team shall test input sanitization and XSS prevention |

---

## 14\. Assumptions and Constraints

### 14.1 Assumptions

| ID | Assumption | Impact if Invalid |
| :---- | :---- | :---- |
| A-001 | All users have appropriate SharePoint permissions to access the site | Users cannot access the application |
| A-002 | Azure Functions and Power Automate are available and properly configured | Notifications and permission management will fail |
| A-003 | Network connectivity is stable and meets minimum bandwidth requirements | Performance may degrade |
| A-004 | Users are using supported browsers (Chrome 90+, Edge 90+) | Functionality may not work as expected |
| A-005 | Legal and Compliance departments will define and communicate role assignments | Users may not have appropriate access |
| A-006 | SubmissionItems list will be populated with initial request types before go-live | Users cannot create requests |
| A-007 | Email system is configured to allow automated emails from Power Automate | Notifications will not be delivered |
| A-008 | Users have basic familiarity with SharePoint and web applications | Training requirements may increase |
| A-009 | Business processes and approval workflows are finalized before development | Requirements may change during development |

### 14.2 Technical Constraints

| ID | Constraint | Description |
| :---- | :---- | :---- |
| C-001 | SharePoint Online Limits | Subject to Microsoft's throttling limits, list view threshold (5000 items), file size limits (250MB) |
| C-002 | SPFx Version | Must use SPFx 1.21.1 compatible with target SharePoint environment |
| C-003 | Browser Compatibility | Limited to modern browsers; IE11 not supported |
| C-004 | Node.js Version | Development requires Node.js 18.x LTS |
| C-005 | Azure Function Execution | Limited to maximum execution time and memory constraints |
| C-006 | Power Automate Limits | Subject to Microsoft's flow run limits and connector limits |
| C-007 | React Version | Must use React 17.0.1 (SPFx compatibility) |
| C-008 | TypeScript Version | Must use TypeScript 5.3.3 or compatible version |

### 14.3 Business Constraints

| ID | Constraint | Description |
| :---- | :---- | :---- |
| C-009 | Communication Requests Only | Phase 1 supports only Communication request type |
| C-010 | Business Days Calculation | Weekend exclusion only |
| C-011 | Tracking ID Format | No enforced format; free text entry in Phase 1 |

### 14.4 Organizational Constraints

| ID | Constraint | Description |
| :---- | :---- | :---- |
| C-012 | Stakeholder Availability | UAT and sign-off dependent on stakeholder schedules |
| C-013 | Change Management | User adoption dependent on training and change management activities |
| C-014 | Support Model | Post-launch support model must be defined before go-live |

---

## 15\. Known Issues and Risks

### 15.1 Known Technical Issues

| ID | Issue | Impact | Mitigation |
| :---- | :---- | :---- | :---- |
| KI-001 | Azure Function may experience occasional delays (3-5 seconds) in permission updates | Users may briefly see outdated permissions until Azure Function completes | Implement retry logic and user messaging indicating permission update in progress |
| KI-002 | Power Automate flow failures may occur during Microsoft 365 service disruptions | Email notifications may be delayed or not sent | Implement retry queue, provide status page, enable manual notification trigger |
| KI-003 | Large document uploads (\>100MB) may timeout on slow connections | Users unable to upload large files | Provide guidance on file size limits, implement chunked upload in Phase 2 |
| KI-004 | SharePoint list view threshold (5000 items) may impact performance on large datasets | Slow list loading after 5000 requests | Implement indexed columns, filtered views, pagination |
| KI-005 | Browser refresh during form submission may cause duplicate requests | Data integrity issue | Implement idempotency checks, disable submit button after click |

### 15.2 Known Business Issues

| ID | Issue | Impact | Mitigation |
| :---- | :---- | :---- | :---- |
| KI-006 | No enforced Tracking ID format | Inconsistent tracking ID entry may impact downstream integrations | Provide guidance on recommended format, implement validation in Phase 2 |

### 15.3 Project Risks

| ID | Risk | Likelihood | Impact | Mitigation Strategy | Owner |
| :---- | :---- | :---- | :---- | :---- | :---- |
| R-001 | Scope creep due to additional request types or features | High | High | Lock Phase 1 scope, document Phase 2 enhancements, formal change control process | Project Manager |
| R-002 | User adoption challenges due to change resistance | Medium | High | Comprehensive training program, early user engagement, champion program, clear communication of benefits | Change Manager |
| R-003 | Integration issues with Azure Functions or Power Automate | Medium | High | Early integration testing, fallback manual processes, vendor support engagement | Technical Lead |
| R-004 | Data migration issues from current manual process | Low | Medium | Thorough data mapping, pilot migration, validation testing | Business Analyst |
| R-005 | Performance degradation under load | Medium | High | Load testing, performance optimization, scalability planning | Development Team |
| R-006 | Security vulnerabilities discovered during testing | Low | High | Security code review, penetration testing, prompt remediation | Security Team |
| R-007 | Stakeholder availability delays UAT or sign-off | Medium | Medium | Early scheduling, flexible UAT windows, escalation process | Project Manager |
| R-008 | Resource turnover during development | Low | High | Knowledge transfer documentation, pair programming, code reviews | Technical Lead |
| R-009 | Microsoft 365 platform changes impact compatibility | Low | Medium | Monitor Microsoft roadmap, maintain update schedule, regression testing | Technical Lead |
| R-010 | Incomplete or changing business requirements | Medium | High | Requirements workshop, iterative reviews, prototype demonstrations, formal change control | Business Analyst |

### 15.4 Data Quality Risks

| ID | Risk | Likelihood | Impact | Mitigation Strategy |
| :---- | :---- | :---- | :---- | :---- |
| R-011 | Incomplete historical data during migration | Medium | Medium | Define minimum required fields, data cleansing process, accept some data gaps |
| R-012 | Inconsistent data entry by users | High | Medium | Validation rules, dropdown/choice fields where possible, user training |
| R-013 | Document attachments lost or corrupted | Low | High | Implement checksum validation, backup procedures, user guidance on supported formats |

---

## 16\. Change Management

### 16.1 Change Request Process

| Req ID | Requirement |
| :---- | :---- |
| REQ-399 | All changes to approved requirements must follow formal change request process |
| REQ-400 | Change requests must be documented using standardized change request form |
| REQ-401 | Change requests must include: description, business justification, impact analysis, priority |
| REQ-402 | Change requests must be reviewed and approved |
| REQ-403 | Approved changes must be reflected in updated FRD version |

---

## 17\. Glossary

| Term | Definition |
| :---- | :---- |
| **Approval** | Documented consent from an authorized stakeholder (e.g., Communications, Portfolio Manager) required before legal review can begin |
| **Assign Attorney** | Workflow status where request is pending attorney assignment by committee |
| **Attorney Assigner** | Committee member with permission to nominate and assign attorneys to requests |
| **Business Days** | Monday through Friday, excluding weekends. Company holidays are NOT excluded in Phase 1 |
| **Closeout** | Final workflow stage where Tracking ID is captured before request completion |
| **Compliance Review** | Review process conducted by compliance department to ensure regulatory compliance |
| **Direct Assignment** | Attorney assignment method where Legal Admin assigns attorney directly, bypassing committee |
| **Draft** | Initial status of newly created request; user can save and edit multiple times before submission |
| **Expected Turnaround Date** | Calculated date based on submission date \+ turnaround time (business days) from SubmissionItems |
| **Foreside Review** | Compliance flag indicating materials require additional Foreside oversight |
| **Item-Level Permissions** | SharePoint security feature allowing different permissions on individual list items |
| **Legal Admin** | Role responsible for triaging incoming requests and managing legal intake process |
| **Legal Intake** | First workflow status after submission; request is reviewed and assigned by Legal Admin |
| **Legal Review** | Review process conducted by assigned attorney to ensure legal compliance |
| **Permission Inheritance** | SharePoint security feature where items inherit permissions from parent list/library |
| **Request ID** | Unique identifier for each request in format "REQ-YYYY-NNNN" |
| **Review Audience** | Determines which review(s) are required: Legal, Compliance, or Both |
| **Retail Use** | Compliance flag indicating materials are intended for retail audience |
| **Rush Request** | Request where Target Return Date is sooner than Expected Turnaround Date |
| **SPFx** | SharePoint Framework \- Microsoft's development model for building SharePoint customizations |
| **SubmissionItems** | Configuration list containing request types and their standard turnaround times |
| **Target Return Date** | Date requested by submitter for completed review |
| **Tracking ID** | Identifier from downstream system (e.g., Seismic) captured during closeout |
| **Turnaround Time** | Standard number of business days required to complete review for a given request type |
| **UAT** | User Acceptance Testing \- testing performed by business users to validate functionality |

---

