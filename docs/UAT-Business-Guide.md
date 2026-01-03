# Legal Review System - UAT Business Guide

## Welcome to User Acceptance Testing

This guide will walk you through testing the Legal Review System (LRS). Follow the scenarios below to validate that the system meets your business requirements.

---

## Getting Started

### Access the Application
1. Navigate to the Legal Review System site
2. Verify you can log in with your credentials
3. Confirm you see the appropriate dashboard for your role

### Your Test Role
Before testing, confirm which role(s) you will be testing:

| Role | What You'll Test |
|------|------------------|
| **Submitter** | Creating requests, uploading documents, closeout |
| **Legal Admin** | Triaging requests, assigning attorneys directly or sending to committee |
| **Attorney Assigner** | Assigning attorneys when requests are sent to committee |
| **Attorney** | Reviewing requests, approving/rejecting |
| **Compliance** | Compliance review, setting flags |
| **Admin** | System configuration, full access to all features |

---

## Scenario 1: Create and Submit a Request

**Role Required:** Submitter

### Steps

1. **Create New Request**
   - Click "New Request" button
   - Verify the form opens in Draft status

2. **Fill Out Request Information**
   - Enter a descriptive Title
   - Enter the Purpose of the request
   - Select a Submission Type from the dropdown
   - Select a Target Return Date (future date)
   - Select Review Audience (Legal, Compliance, or Both)

3. **Add Approvals**
   - Click "Add Approval"
   - Select an Approval Type (e.g., Communications Approval)
   - Enter the Approval Date
   - Select or enter the Approver name
   - Upload the approval document
   - Verify the approval appears in the list

4. **Upload Attachments**
   - Navigate to the Attachments section
   - Upload at least one document (the material to be reviewed)
   - Verify the file appears in the attachment list

5. **Save as Draft**
   - Click "Save"
   - Verify the Request ID is generated (format: LRS-YYYY-####)
   - Close and reopen the request to verify all data saved

6. **Submit Request**
   - Click "Submit"
   - Confirm the submission
   - Verify status changes to "Legal Intake"
   - Verify you can no longer edit the request

**Expected Outcome:** Request is submitted and visible to Legal Admin for processing.

---

## Scenario 2: Rush Request

**Role Required:** Submitter

### Steps

1. **Create a New Request** (follow Scenario 1 steps 1-4)

2. **Set an Urgent Target Date**
   - Check the Submission Type's normal turnaround time
   - Set the Target Return Date to BEFORE the normal turnaround
   - Example: If turnaround is 5 days, set target date to 3 days from now

3. **Provide Rush Rationale**
   - Enter a reason for the rush request
   - This will be visible to Legal Admin

4. **Submit the Request**
   - Click Submit
   - Verify the request is flagged as "Rush"
   - Verify Legal Admin receives a high-priority notification

**Expected Outcome:** Rush request is clearly identified and prioritized.

---

## Scenario 3: Legal Intake and Assignment

**Role Required:** Legal Admin

### Steps

1. **View Incoming Requests**
   - Navigate to requests in "Legal Intake" status
   - Open a newly submitted request

2. **Review Request Details**
   - Verify all submitter information is visible
   - Check the documents are accessible
   - Review the Review Audience selection

3. **Option A: Assign Attorney Directly**
   - Select an attorney from the dropdown
   - Add assignment notes if needed
   - Click "Assign Attorney"
   - Verify status changes to "In Review"
   - Verify attorney receives notification

4. **Option B: Send to Committee**
   - Add notes for the committee
   - Click "Send to Committee"
   - Verify status changes to "Assign Attorney"
   - Verify committee receives notification

**Expected Outcome:** Request is routed to appropriate reviewer(s).

---

## Scenario 4: Attorney Assignment (Committee)

**Role Required:** Attorney Assigner

### Steps

1. **View Requests Awaiting Assignment**
   - Navigate to requests in "Assign Attorney" status

2. **Review Request and Notes**
   - Open the request
   - Review the Legal Admin's notes
   - Review the request details

3. **Assign Attorney**
   - Select an attorney from the dropdown
   - Add any committee notes
   - Click "Assign Attorney"
   - Verify status changes to "In Review"

**Expected Outcome:** Attorney is assigned and notified.

---

## Scenario 5: Legal Review - Approve

**Role Required:** Attorney

### Steps

1. **Access Assigned Request**
   - Navigate to your assigned requests
   - Open a request in "In Review" status

2. **Review the Request**
   - Read all request information
   - Download and review attached documents
   - Check approval documentation

3. **Submit Approval**
   - Go to Legal Review section
   - Select Outcome: "Approved"
   - Add any notes (optional)
   - Click "Submit Review"

4. **Verify Results**
   - Legal Review shows as "Completed"
   - If only Legal review required: Status moves to "Closeout"
   - Submitter receives approval notification

**Expected Outcome:** Request approved and moves forward in workflow.

---

## Scenario 6: Legal Review - Request Changes

**Role Required:** Attorney

### Steps

1. **Access Assigned Request**
   - Open a request you're reviewing

2. **Request Changes**
   - Select Outcome: "Respond To Comments And Resubmit"
   - Add detailed notes explaining what changes are needed
   - Click "Submit Review"

3. **Verify Status**
   - Legal Review Status shows "Waiting On Submitter"
   - Submitter receives high-priority notification

**Expected Outcome:** Submitter is notified to make changes.

---

## Scenario 7: Submitter Resubmission

**Role Required:** Submitter

### Steps

1. **Access Request Needing Changes**
   - Open the request (you should see a warning banner)
   - Review the attorney's comments

2. **Make Required Changes**
   - Update request information as needed
   - Upload new or revised documents if required

3. **Respond and Resubmit**
   - Add notes explaining what you changed
   - Click "Resubmit for Review"

4. **Verify Status**
   - Legal Review Status shows "Waiting On Attorney"
   - Attorney receives notification

**Expected Outcome:** Request returns to attorney for continued review.

---

## Scenario 8: Compliance Review

**Role Required:** Compliance User

### Steps

1. **Access Request Requiring Compliance**
   - Navigate to requests requiring compliance review
   - Open a request in "In Review" status

2. **Perform Compliance Review**
   - Review all materials
   - Set "Is Foreside Review Required" if applicable
   - Set "Is Retail Use" if applicable
   - Add compliance notes

3. **Submit Review**
   - Select Outcome (Approved/Approved With Comments/etc.)
   - Click "Submit Review"

**Expected Outcome:** Compliance review completed, request progresses.

---

## Scenario 9: Closeout

**Role Required:** Submitter

### Steps

1. **Access Request in Closeout**
   - Open your request in "Closeout" status
   - Review the review outcomes

2. **Acknowledge Comments (if required)**
   - If reviewer selected "Approved With Comments"
   - Read the comments carefully
   - Check the acknowledgment box

3. **Enter Tracking ID (if required)**
   - If Foreside or Retail was flagged
   - Enter the external Tracking ID

4. **Complete Closeout**
   - Click "Complete Closeout"
   - Verify status changes to "Completed"

**Expected Outcome:** Request is fully completed.

---

## Scenario 10: Place On Hold and Resume

**Role Required:** Legal Admin or Attorney

### Steps

1. **Place Request On Hold**
   - Open an active request
   - Click "Place On Hold"
   - Enter a reason for the hold
   - Confirm the action

2. **Verify Hold**
   - Status shows "On Hold"
   - Submitter receives notification
   - Previous status is saved

3. **Resume Request**
   - Open the On Hold request
   - Click "Resume"
   - Verify status returns to previous state
   - Submitter receives notification

**Expected Outcome:** Request can be paused and resumed.

---

## Scenario 11: Cancel Request

**Role Required:** Legal Admin

### Steps

1. **Cancel a Request**
   - Open an active request (not in Draft or Completed)
   - Click "Cancel Request"
   - Enter a cancellation reason
   - Confirm the action

2. **Verify Cancellation**
   - Status shows "Cancelled"
   - Request is read-only
   - Submitter and assigned attorney receive notification

**Expected Outcome:** Request is terminated.

---

## Scenario 12: Document Handling

**Role Required:** Any user with edit access

### Steps

1. **Upload Documents**
   - Navigate to document section
   - Upload various file types (PDF, Word, Excel)
   - Verify files upload successfully
   - Verify progress indicator appears

2. **Download Documents**
   - Click to download an uploaded document
   - Verify file opens correctly

3. **Delete Documents**
   - Remove an uploaded document
   - Verify it's removed from the list

**Expected Outcome:** Document operations work correctly.

---

## Scenario 13: Email Notifications

**Role Required:** All roles

### Check Your Inbox After These Actions

| Action | Who Should Receive Email |
|--------|--------------------------|
| Submit new request | Legal Admin |
| Submit rush request | Legal Admin (high priority) |
| Assign attorney | Attorney + Submitter (CC) |
| Attorney approves | Submitter |
| Attorney requests changes | Submitter (high priority) |
| Submitter resubmits | Attorney |
| Request ready for closeout | Submitter |
| Request completed | Submitter |
| Request on hold | Submitter |
| Request cancelled | Submitter + Attorney |

### Verify Email Content
- Subject line is clear and includes Request ID
- Email body contains relevant details
- Links in email open the correct request
- Email displays correctly (no broken formatting)

---

## Things to Look For

### During All Testing

- **Performance:** Does the application respond quickly?
- **Clarity:** Are labels and instructions clear?
- **Navigation:** Can you easily find what you need?
- **Error Messages:** Are they helpful when something goes wrong?
- **Mobile:** Does it work on your phone/tablet?

### Common Issues to Report

- Unable to complete an expected action
- Missing or incorrect information displayed
- Confusing or unclear labels/instructions
- Slow performance or timeouts
- Emails not received or incorrect content
- Documents that won't upload or download
- Unexpected error messages

---

## Reporting Issues

When you find an issue, please document:

1. **What you were trying to do**
2. **What happened instead**
3. **The Request ID (if applicable)**
4. **Screenshots (if possible)**
5. **Your browser and device**

Submit issues to: [Issue tracking location]

---

## Quick Reference: Status Flow

```
Draft
  ↓ Submit
Legal Intake
  ↓ Assign (Direct or Committee)
In Review
  ↓ All reviews complete
Closeout
  ↓ Complete
Completed
```

**Special Statuses:**
- **On Hold** - Temporarily paused (can resume)
- **Cancelled** - Terminated (cannot resume)
- **Awaiting Foreside Documents** - Waiting for external docs

---

## Quick Reference: Review Outcomes

| Outcome | What Happens |
|---------|--------------|
| Approved | Moves to next stage |
| Approved With Comments | Moves forward, submitter acknowledges at closeout |
| Respond To Comments And Resubmit | Returns to submitter for changes |
| Not Approved | Moves directly to Completed (rejected) |

---

## Questions?

Contact your system administrator or project team for assistance.

Thank you for participating in UAT!
