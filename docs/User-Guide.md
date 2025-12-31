# Legal Review System - User Guide

A comprehensive guide for using the Legal Review System (LRS) to submit, track, and manage legal and compliance review requests for marketing communications.

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [User Roles and Permissions](#user-roles-and-permissions)
4. [Creating a Request](#creating-a-request)
5. [Understanding Request Status](#understanding-request-status)
6. [Managing Your Requests](#managing-your-requests)
7. [Legal Intake Process](#legal-intake-process)
8. [Review Process](#review-process)
9. [Responding to Review Feedback](#responding-to-review-feedback)
10. [Closeout and Completion](#closeout-and-completion)
11. [Awaiting Foreside Documents](#awaiting-foreside-documents)
12. [Document Management](#document-management)
13. [Approvals](#approvals)
14. [Comments and Communication](#comments-and-communication)
15. [Admin Features](#admin-features)
16. [Frequently Asked Questions](#frequently-asked-questions)
17. [Troubleshooting](#troubleshooting)

---

## Overview

The Legal Review System (LRS) is a SharePoint-based application that streamlines the process of obtaining legal and compliance approvals for marketing communications. It replaces the traditional email-based workflow with a centralized, auditable system.

### Key Features

- **Centralized Request Management**: Submit and track all review requests in one place
- **Automated Workflow**: Requests automatically route to the appropriate reviewers
- **Document Management**: Upload, organize, and track all review materials
- **Approval Tracking**: Manage pre-approvals from various stakeholders
- **Real-time Status Updates**: Monitor your request's progress through the workflow
- **Complete Audit Trail**: Full history of all actions and changes
- **Email Notifications**: Automatic notifications at key workflow stages

### Workflow Overview

```
┌─────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────┐    ┌──────────┐    ┌──────────────────────────┐    ┌───────────┐
│  Draft  │ -> │ Legal Intake │ -> │Assign Attorney│ -> │ In Review │ -> │ Closeout │ -> │ Awaiting Foreside Docs*  │ -> │ Completed │
└─────────┘    └──────────────┘    └──────────────┘    └───────────┘    └──────────┘    └──────────────────────────┘    └───────────┘
                                          │                                   │                      │
                                          └───────────────────────────────────┘                      │
                                              (Direct assignment bypasses)                           │
                                                                                                     │
                                                            * Only if "Foreside Review Required" = Yes
```

---

## Getting Started

### Accessing the System

1. Navigate to the Legal Review SharePoint site
2. You'll see the **Requests** list showing all visible requests
3. Click **New** or **+ New Request** to create a new request
4. Click on any Request ID to view details

### Browser Requirements

- Microsoft Edge (90+)
- Google Chrome (90+)
- Mozilla Firefox (85+)
- Safari (14+)

> **Note**: Internet Explorer is not supported.

### First-Time Setup

No special setup is required. Your permissions are automatically assigned based on your SharePoint group membership. Contact your Legal Admin if you need access to specific features.

---

## User Roles and Permissions

### Role Descriptions

| Role | Description | Typical Users |
|------|-------------|---------------|
| **Submitter** | Can create and manage their own requests | Marketing team members |
| **Legal Admin** | Triages requests, assigns attorneys, manages workflow | Legal operations team |
| **Attorney Assigner** | Committee members who assign attorneys to requests | Senior legal staff |
| **Attorney** | Reviews assigned requests, provides legal feedback | Legal counsel |
| **Compliance User** | Reviews requests requiring compliance review | Compliance officers |
| **Admin** | Full system access, can override any setting | System administrators |

### What You Can Do

#### As a Submitter
- Create new review requests
- Upload documents and approval files
- View your own requests
- Respond to reviewer feedback
- Complete closeout when approved

#### As a Legal Admin
- View all requests
- Assign attorneys to requests
- Send requests to Attorney Assigner Committee
- Override review audience settings
- Place requests on hold

#### As an Attorney
- View assigned requests
- Conduct legal reviews
- Request changes from submitters
- Approve or reject materials

#### As a Compliance User
- View requests requiring compliance review
- Set Foreside review and retail use flags
- Conduct compliance reviews
- Approve or reject materials

---

## Creating a Request

### Step 1: Start a New Request

1. Click **+ New Request** from the Requests list
2. The form opens with **Draft** status

### Step 2: Complete Request Information

#### Required Fields

| Field | Description | Example |
|-------|-------------|---------|
| **Request Title** | Descriptive name for your request (3-255 characters) | "Q1 2025 Marketing Campaign" |
| **Request Type** | Type of request being submitted | Communication Request |
| **Purpose** | Describe what this communication is for (10+ characters) | "Promotional materials for new fund launch" |
| **Submission Type** | New submission or revision | New / Revised |
| **Submission Item** | Category of material | Advertisement, Performance Commentary, etc. |
| **Target Return Date** | When you need the review completed | Date picker (must be future date) |
| **Review Audience** | Who needs to review | Legal Only, Compliance Only, or Both |
| **Distribution Method** | How the material will be distributed | Email/Mail, Website, Social Media, etc. |
| **Date of First Use** | When the material will first be used | Date picker |

#### FINRA Audience & Product Fields (if applicable)

| Field | Description |
|-------|-------------|
| **FINRA Audience Category** | Retail or Institutional |
| **Audience** | Specific audience type |
| **US Funds** | Applicable US fund products |
| **UCITS** | Applicable UCITS products |
| **Separate Account Strategies** | Yes/No toggle |
| **Separate Account Strategies Included** | If yes, which strategies |

### Step 3: Add Approvals

At least one non-Communications approval is required:

1. Click **Add Approval** button
2. Select approval type:
   - Portfolio Manager
   - Research Analyst
   - Subject Matter Expert (SME)
   - Performance
   - Other
3. Select the approver (person picker)
4. Set the approval date
5. Upload the approval document (email, signed form, etc.)

> **Important**: Each approval requires a supporting document to prove the approval was obtained.

#### Communications Approval

If your material requires Communications approval:
1. Check the **Requires Communications Approval** box
2. Add the Communications approval with approver, date, and document

### Step 4: Upload Documents

#### Review Materials (Required)
Upload the materials that need to be reviewed:
1. Click in the **Review Materials** drop zone or drag files
2. Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, images
3. Maximum file size: 250MB per file

#### Supplemental Materials (Optional)
Additional supporting documents:
- Background information
- Reference materials
- Previous versions for comparison

### Step 5: Prior Submissions (if applicable)

If this is a revised submission or references previous work:
1. Click **Select Prior Submissions**
2. Search for and select the related request(s)
3. Add notes explaining the relationship

### Step 6: Save or Submit

#### Save as Draft
- Click **Save Draft** to save your progress
- You can return later to complete the request
- Draft requests are only visible to you and Legal Admin

#### Submit for Review
- Click **Submit** when ready for legal review
- All required fields must be complete
- At least one approval must be added
- At least one review document must be uploaded
- Request status changes to **Legal Intake**

---

## Understanding Request Status

### Status Definitions

| Status | Description | Who Can Act |
|--------|-------------|-------------|
| **Draft** | Request is being prepared, not yet submitted | Submitter |
| **Legal Intake** | Awaiting attorney assignment | Legal Admin |
| **Assign Attorney** | Sent to committee for attorney assignment | Attorney Assigner |
| **In Review** | Active review by attorney/compliance | Attorney, Compliance |
| **Closeout** | Reviews complete, awaiting final steps | Submitter |
| **Awaiting Foreside Documents** | Waiting for Foreside letter upload (when Foreside Review Required) | Submitter, Admin |
| **Completed** | Request fully processed | Read-only |
| **Cancelled** | Request was cancelled | Read-only |
| **On Hold** | Request temporarily paused | Depends on prior status |

### Status Flow Diagram

```
                                    ┌────────────┐
                                    │ Cancelled  │
                                    └────────────┘
                                          ↑
                                          │ (can cancel from any status)
                                          │
┌─────────┐   Submit   ┌──────────────┐   ├──────────────────────────────────┐
│  Draft  │ ─────────> │ Legal Intake │                                      │
└─────────┘            └──────────────┘                                      │
                              │                                              │
           ┌──────────────────┼──────────────────┐                          │
           │                  │                  │                          │
           ▼                  ▼                  │                          │
  ┌─────────────────┐  ┌──────────────┐          │                          │
  │ Direct Assign   │  │Send to       │          │                          │
  │ (with attorney) │  │Committee     │          │                          │
  └─────────────────┘  └──────────────┘          │                          │
           │                  │                  │                          │
           │                  ▼                  │                          │
           │          ┌───────────────┐          │                          │
           │          │Assign Attorney│ ─────────┤                          │
           │          └───────────────┘          │                          │
           │                  │                  │                          │
           │                  │ (committee assigns)                         │
           │                  │                  │                          │
           ▼                  ▼                  │                          │
        ┌───────────────────────┐                │                          │
        │      In Review        │ <──────────────┘                          │
        │  (Legal & Compliance) │                                           │
        └───────────────────────┘                                           │
                    │                                                       │
    ┌───────────────┼───────────────┐                                      │
    │               │               │                                      │
    ▼               ▼               ▼                                      │
Approved    Approved With    Not Approved ─────────────────────────────────┤
    │        Comments           │                                          │
    │               │           │                                          │
    ▼               ▼           ▼                                          ▼
┌───────────────────────┐  ┌───────────────────────┐              ┌───────────┐
│       Closeout        │  │      Completed        │              │ Completed │
│ (tracking ID if req)  │  │   (auto-complete)     │              │(auto)     │
└───────────────────────┘  └───────────────────────┘              └───────────┘
           │
           ├─────────────────────────────────────────────────┐
           │                                                 │
           ▼ (Foreside Required = Yes)                      ▼ (Foreside Required = No)
    ┌─────────────────────────────┐                   ┌───────────┐
    │ Awaiting Foreside Documents │                   │ Completed │
    │  (upload Foreside letters)  │                   └───────────┘
    └─────────────────────────────┘
           │
           ▼
    ┌───────────┐
    │ Completed │
    └───────────┘
```

### Tracking Request Progress

The **Workflow Stepper** at the top of each request shows:
- Current step highlighted
- Completed steps with checkmarks
- Pending steps grayed out
- Current reviewer/owner information

---

## Managing Your Requests

### Viewing Your Requests

1. Navigate to the Requests list
2. Use filters to find specific requests:
   - **Status**: Filter by workflow status
   - **Submission Item**: Filter by material type
   - **Target Return Date**: Filter by deadline
   - **My Requests**: Toggle to show only your requests

### Request List Views

| View | Shows |
|------|-------|
| **All Requests** | All requests you have access to view |
| **My Requests** | Requests you created |
| **In Progress** | Active requests (not Draft, Completed, or Cancelled) |
| **Pending My Action** | Requests waiting for your input |

### Request ID Format

Each request has a unique ID: `CER-YY-NNNN`
- **CER**: Communication Request (or other prefix for other types)
- **YY**: Two-digit year
- **NNNN**: Sequential number

Example: `CER-25-0042` (42nd communication request in 2025)

### Hover Cards

Hover over the Request ID or Status column for quick information:
- Request summary
- Current status and owner
- Target return date
- Days remaining or overdue indicator

---

## Legal Intake Process

After submitting a request, it enters **Legal Intake** where Legal Admin assigns it to an attorney.

### For Legal Admin

#### Reviewing New Requests

1. Open the request from the list
2. Review all submitted information:
   - Request details
   - Uploaded documents
   - Approvals
   - Prior submissions

#### Setting Review Audience

The submitter selects the initial review audience, but Legal Admin can override:
- **Legal Only**: Only legal review required
- **Compliance Only**: Only compliance review required
- **Both Legal & Compliance**: Both reviews required

#### Assigning an Attorney

**Option 1: Direct Assignment**
1. Select an attorney from the **Assign Attorney** dropdown
2. Add any assignment notes (visible to attorney)
3. Click **Assign Attorney**
4. Status changes to **In Review**

**Option 2: Send to Committee**
1. Add notes for the committee (context for assignment decision)
2. Click **Send to Committee**
3. Status changes to **Assign Attorney**
4. Committee members receive notification

### For Attorney Assigner Committee

When a request is sent to committee:

1. You'll receive an email notification
2. Open the request
3. Review the request details and Legal Admin notes
4. Select an attorney from the dropdown
5. Add any assignment notes
6. Click **Assign Attorney**
7. Status changes to **In Review**

---

## Review Process

### For Attorneys (Legal Review)

#### Starting Your Review

1. Access assigned requests from the list (filter by "Assigned to Me")
2. Open the request
3. Review all documents in the **Review Materials** section
4. Check approval documents for completeness

#### Conducting the Review

1. Review uploaded materials thoroughly
2. Use the **Comments** section to communicate with submitter
3. Check prior submissions if referenced

#### Submitting Your Review

When ready to complete your review:

1. Select **Legal Review Outcome**:
   - **Approved**: Materials approved as-is
   - **Approved With Comments**: Approved with notes for submitter
   - **Respond to Comments and Resubmit**: Changes required from submitter
   - **Not Approved**: Cannot be approved

2. Add **Review Notes** explaining your decision

3. Click **Submit Legal Review**

#### Using "Respond to Comments and Resubmit"

When you select "Respond to Comments and Resubmit":

1. The review status changes to **Waiting On Submitter**
2. The submitter receives a notification with your comments
3. The review card header displays "Waiting on Submitter since [date]"
4. The submitter addresses your comments and uploads revised materials
5. When the submitter clicks **Resubmit for Review**, the status changes to **Waiting On Attorney**
6. You receive a notification that materials have been resubmitted
7. The review card header displays "Waiting on Attorney since [date]"
8. You can then conduct another review and select a final outcome

> **Note**: You can have multiple rounds of "Respond to Comments and Resubmit" until you're satisfied with the materials. The outcome field remains disabled for the submitter throughout this process.

### For Compliance Users (Compliance Review)

#### Compliance-Specific Fields

Before submitting your review, set these flags if applicable:

| Field | Description |
|-------|-------------|
| **Is Foreside Review Required** | Toggle if Foreside review is needed |
| **Is Retail Use** | Toggle if material is for retail audience |

> **Important**: If either flag is set to Yes, a Tracking ID will be required at closeout.

#### Submitting Compliance Review

1. Review all materials
2. Set compliance flags
3. Select **Compliance Review Outcome**:
   - **Approved**: Materials approved as-is
   - **Approved With Comments**: Approved with notes for submitter
   - **Respond to Comments and Resubmit**: Changes required from submitter
   - **Not Approved**: Cannot be approved
4. Add **Review Notes**
5. Click **Submit Compliance Review**

#### Using "Respond to Comments and Resubmit" (Compliance)

When you select "Respond to Comments and Resubmit":

1. The review status changes to **Waiting On Submitter**
2. The submitter receives a notification with your comments
3. The review card header displays "Waiting on Submitter since [date]"
4. The submitter addresses your comments and uploads revised materials
5. When the submitter clicks **Resubmit for Review**, the status changes to **Waiting On Compliance**
6. You receive a notification that materials have been resubmitted
7. The review card header displays "Waiting on Compliance since [date]"
8. You can then conduct another review and select a final outcome

### Review Status Indicators

| Status | Meaning |
|--------|---------|
| **Not Started** | Review not yet begun |
| **In Progress** | Reviewer is actively reviewing |
| **Waiting on Submitter** | Awaiting submitter response to comments |
| **Waiting on Attorney** | Attorney reviewing resubmitted materials |
| **Waiting on Compliance** | Compliance reviewing resubmitted materials |
| **Completed** | Review finished |

---

## Responding to Review Feedback

When a reviewer requests changes ("Respond to Comments and Resubmit"):

### You'll Receive

- Email notification about required changes
- Review comments visible in the request
- The review card header shows "Waiting on Submitter since [date]"

### How to Respond

1. Open your request
2. Navigate to the review card (Legal Review or Compliance Review)
3. Read the reviewer's comments in the **Review Notes** field
4. Address the comments by making changes to your materials
5. Upload revised documents in the review card's document section
6. Add optional response notes explaining your changes
7. Click the **Resubmit for Review** button inside the review card

### What Happens After Resubmitting

1. The review status changes from "Waiting On Submitter" to "Waiting On Attorney" (or "Waiting On Compliance")
2. The reviewer receives a notification that you've resubmitted
3. The review card header updates to show "Waiting on [Reviewer] since [date]"
4. The reviewer will conduct another review cycle
5. This process may repeat until the reviewer submits a final outcome

### Understanding the Review Card UI

When in "Waiting On Submitter" status:
- The **Review Outcome** field shows "Respond To Comments And Resubmit" (disabled - you cannot change this)
- The reviewer's **Review Notes** are visible for you to read
- A **Response Notes** field is available for your comments
- The **Resubmit for Review** button is active

### Tips for Effective Responses

- Clearly indicate what changes were made in your response notes
- If you disagree with feedback, explain your reasoning
- Upload a comparison document if helpful (redlined version)
- Respond promptly to avoid delays
- Use clear file naming for revised documents (e.g., "Brochure_v2_revised.pdf")

---

## Closeout and Completion

### Entering Closeout

When all required reviews are approved (or approved with comments), the request moves to **Closeout**.

### Closeout Requirements

#### Tracking ID

A Tracking ID is required if:
- Compliance reviewed the request AND
- **Foreside Review Required** is Yes OR **Retail Use** is Yes

Enter the Tracking ID assigned by Compliance/Foreside.

### Completing Closeout

1. Open your request in Closeout status
2. Enter Tracking ID if required
3. Review the final summary
4. Click **Complete Request**
5. Status changes to:
   - **Awaiting Foreside Documents** if "Foreside Review Required" = Yes
   - **Completed** if "Foreside Review Required" = No

### Automatic Completion

If any review outcome is **Not Approved**, the request automatically moves to **Completed** status (bypassing Closeout) since the materials cannot be used.

---

## Awaiting Foreside Documents

This section applies when **Foreside Review Required** was set to "Yes" during Compliance review. After completing Closeout, the request enters the **Awaiting Foreside Documents** status.

### Understanding This Status

- **Purpose**: Upload Foreside letter documents received from Foreside for audit and compliance purposes
- **Timeline**: Foreside documents may take weeks or months to receive
- **Who Can Act**: Submitter (request creator) or Admin
- **Note**: This request does NOT appear in "Open Requests" views since the review work is complete

### What You Cannot Do

During Awaiting Foreside Documents status:
- **Cancel** action is not available
- **Hold** action is not available
- No time tracking occurs (the waiting period is not counted)

### Uploading Foreside Documents

1. Open your request in Awaiting Foreside Documents status
2. Navigate to the **Foreside Documents** section
3. Upload one or more Foreside letter documents
4. Add optional notes about the documents
5. At least one document must be uploaded before completing

### Completing the Request

1. Ensure at least one Foreside document is uploaded
2. Add any final notes (optional)
3. Click **Complete Request**
4. Status changes to **Completed**

### Foreside Documents View

All requests awaiting Foreside documents can be found in the **Awaiting Foreside Documents** dashboard view, sorted by the date they entered this status.

---

## Document Management

### Document Types

| Type | Purpose | When to Use |
|------|---------|-------------|
| **Review** | Materials requiring legal/compliance review | Main marketing materials |
| **Supplemental** | Supporting documents | Background info, reference materials |
| **Approval** | Proof of pre-approvals | Approval emails, signed forms |

### Uploading Documents

1. Navigate to the appropriate section (Review Materials, Supplemental, or Approvals)
2. Drag and drop files OR click to browse
3. Wait for upload to complete
4. Verify file appears in the list

### Managing Documents

#### Renaming Files
1. Click the **Rename** icon next to the file
2. Enter the new name
3. Click **Save**

#### Changing Document Type
1. Click the **Change Type** icon
2. Select the new type
3. Confirm the change

#### Deleting Files
1. Click the **Delete** icon
2. Confirm deletion
3. File is removed from the request

### File Naming Best Practices

- Use descriptive names: `Q1-2025-Fund-Launch-Brochure-v2.pdf`
- Include version numbers for revisions
- Avoid special characters: `? * : " < > | /`
- Keep names under 128 characters

### File Size Limits

- Maximum file size: 250MB per file
- Recommended: Keep files under 50MB for faster uploads
- Total storage: Limited by your SharePoint site quota

---

## Approvals

### Required Approvals

Every submission requires at least one approval from:
- Portfolio Manager
- Research Analyst
- Subject Matter Expert (SME)
- Performance
- Other (specify type)

### Adding Approvals

1. Click **Add Approval** in the Approvals section
2. Select the approval type
3. Search for and select the approver
4. Set the approval date
5. Upload the approval document

### Approval Documents

Each approval needs supporting documentation:
- Approval email (screenshot or PDF)
- Signed approval form
- Meeting minutes showing approval
- Other documented evidence

### Communications Approval

If your material requires Communications approval:
1. Check **Requires Communications Approval**
2. Add the Communications approval like other approvals
3. This is in addition to the required non-Communications approval

---

## Comments and Communication

### Using Comments

The Comments section provides a threaded discussion for each request.

#### Adding Comments
1. Scroll to the Comments section
2. Type your message
3. Use @mentions to notify specific people: `@John Smith`
4. Click **Post**

#### Formatting
- Basic text formatting supported
- Links are automatically clickable
- Attachments can be added via document upload (not in comments)

### When to Use Comments

- Ask questions about the request
- Provide clarification
- Respond to reviewer feedback
- Document discussions for audit trail

### Comment Notifications

You'll receive email notifications when:
- Someone @mentions you
- Someone comments on your request
- A reviewer requests changes

---

## Admin Features

### Super Admin Panel

Administrators have access to the Super Admin Panel for override capabilities.

#### Accessing Admin Panel
1. Click the **Admin** button (gear icon) in the request header
2. Panel opens on the right side

#### Available Actions

| Action | Description |
|--------|-------------|
| **Change Status** | Override the current workflow status |
| **Clear Attorney** | Remove assigned attorney |
| **Override Review Audience** | Change who reviews the request |
| **Override Legal Review** | Change legal review status/outcome |
| **Override Compliance Review** | Change compliance review status/outcome |
| **Reopen Request** | Reopen a completed/cancelled request |

#### Audit Trail

All admin actions require:
- A reason for the override (required)
- Automatic logging of who made the change
- Timestamp recording

Admin override history is stored in the **Admin Override Notes** field.

---

## Frequently Asked Questions

### General Questions

**Q: How long does the review process take?**
A: Turnaround time depends on the submission item type. Check the **Expected Turnaround Date** on your request. Rush requests can be expedited with justification.

**Q: Can I edit a request after submitting?**
A: Once submitted, you cannot edit most fields. You can add documents and comments. For other changes, contact Legal Admin.

**Q: What makes a request a "rush" request?**
A: A request is automatically flagged as rush if your target return date is before the standard turnaround time for the submission item type.

**Q: Can I cancel a request?**
A: Yes, click **Cancel Request**, provide a reason, and confirm. Cancelled requests cannot be reactivated (an admin would need to reopen).

### Document Questions

**Q: What file types can I upload?**
A: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx), and common image formats (PNG, JPG, GIF).

**Q: Why can't I delete a document?**
A: Documents uploaded during certain workflow stages may be locked for audit purposes. Contact Legal Admin if you need to remove a document.

**Q: How do I update a document?**
A: Upload the new version. You can optionally delete the old version or keep both for comparison.

### Workflow Questions

**Q: Why is my request stuck in Legal Intake?**
A: It's waiting for attorney assignment. Contact Legal Admin if it's been more than one business day.

**Q: What does "Waiting on Submitter" mean?**
A: A reviewer has selected "Respond To Comments And Resubmit" as the outcome. Open the review card, read their comments, make the requested changes, upload revised documents, and click "Resubmit for Review".

**Q: What does "Waiting on Attorney" or "Waiting on Compliance" mean?**
A: You've resubmitted materials after addressing reviewer comments. The reviewer is now re-evaluating your revised materials.

**Q: How many times can a reviewer request changes?**
A: There's no limit. The back-and-forth continues until the reviewer submits a final outcome (Approved, Approved With Comments, or Not Approved).

**Q: Why can't I change the Review Outcome field?**
A: When in "Waiting On Submitter" status, the outcome field is locked to "Respond To Comments And Resubmit". Only the reviewer can change this by submitting their final review.

**Q: Why was my request marked Not Approved?**
A: The materials didn't meet legal/compliance requirements. Review the comments for specific feedback.

---

## Troubleshooting

### Common Issues

#### "Access Denied" Error
- **Cause**: You don't have permission to view this request
- **Solution**: Contact Legal Admin to request access

#### Files Won't Upload
- **Cause**: File too large, unsupported format, or network issue
- **Solutions**:
  - Check file is under 250MB
  - Verify file format is supported
  - Try a different browser
  - Check your internet connection

#### Can't Submit Request
- **Cause**: Required fields are incomplete
- **Solution**: Check for error messages highlighted in red

#### Request Not Appearing in List
- **Cause**: Filtering or view settings
- **Solutions**:
  - Clear all filters
  - Switch to "All Requests" view
  - Refresh the page

#### Notifications Not Received
- **Cause**: Email filtering or notification settings
- **Solutions**:
  - Check spam/junk folder
  - Verify your email address in profile
  - Contact IT for email configuration

### Performance Issues

#### Slow Loading
- Clear browser cache
- Use supported browser
- Check network connection
- Try during off-peak hours

#### Form Not Responding
- Save your work immediately
- Refresh the page
- Don't open multiple instances of the same request

### Getting Help

1. **Check this guide** for answers to common questions
2. **Contact Legal Admin** for workflow questions
3. **Contact IT Help Desk** for technical issues
4. **Report bugs** at: [GitHub Issues](https://github.com/anthropics/claude-code/issues)

---

## Quick Reference

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + S` | Save draft |
| `Tab` | Move to next field |
| `Shift + Tab` | Move to previous field |
| `Enter` | Submit form (when on button) |
| `Esc` | Close dialog/panel |

### Status Color Codes

| Color | Meaning |
|-------|---------|
| 🟢 Green | On track, approved |
| 🟡 Yellow | Due soon, needs attention |
| 🔴 Red | Overdue, blocked |
| ⚪ Gray | Draft, not started |

### Contact Information

| Role | Email |
|------|-------|
| Legal Admin | legaladmin@company.com |
| Compliance | compliance@company.com |
| IT Support | helpdesk@company.com |

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-28 | 1.0 | Initial user guide created |
| 2025-12-31 | 1.1 | Added "Respond To Comments And Resubmit" workflow documentation |

---

*This guide is maintained by the Legal Review System team. For updates or corrections, please contact Legal Admin.*
