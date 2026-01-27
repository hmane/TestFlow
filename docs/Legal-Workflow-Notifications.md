# Legal Workflow Notifications

This document defines all email notifications for the Legal Review System (LRS). Each notification includes the trigger event, recipients, subject line, and responsive HTML email body template.

> **Implementation Note**: The actual notification templates are defined in [`/provisioning/Lists/Notifications.xml`](/provisioning/Lists/Notifications.xml). The templates in this document serve as design references. The Azure Functions service uses `NotificationTemplateIds.cs` constants that map to the template IDs in the Notifications list.

---

## Quick Reference: All 19 Notifications

| Template ID | Trigger | Recipients |
|-------------|---------|------------|
| `RequestSubmitted` | Status: Draft → Legal Intake | To: Legal Admin, CC: Submitter |
| `RushRequestAlert` | Status: Draft → Legal Intake AND IsRushRequest = true | To: Legal Admin, CC: Submitter |
| `ReadyForAttorneyAssignment` | Status → Assign Attorney | To: Attorney Assigners, CC: Legal Admin, Submitter |
| `AttorneyAssigned` | Status → In Review (when Legal or Both) | To: Attorney, CC: Submitter |
| `AttorneyReassigned` | Attorney changes from one user to another | To: New Attorney, CC: Submitter, Legal Admin |
| `ComplianceReviewRequired` | Status → In Review (when Compliance Only) | To: Compliance, CC: Submitter |
| `LegalReviewApproved` | LegalReviewStatus → Completed (Approved/Approved With Comments) | To: Submitter, CC: Additional Parties |
| `LegalChangesRequested` | LegalReviewStatus → Waiting On Submitter | To: Submitter, CC: Attorney |
| `LegalReviewNotApproved` | LegalReviewStatus → Completed (Not Approved) | To: Submitter, CC: Legal Admin |
| `ResubmissionReceivedLegal` | LegalReviewStatus: Waiting On Submitter → Waiting On Attorney | To: Attorney, CC: Legal Admin |
| `ComplianceReviewApproved` | ComplianceReviewStatus → Completed (Approved/Approved With Comments) | To: Submitter, CC: Additional Parties |
| `ComplianceChangesRequested` | ComplianceReviewStatus → Waiting On Submitter | To: Submitter, CC: Compliance |
| `ComplianceReviewNotApproved` | ComplianceReviewStatus → Completed (Not Approved) | To: Submitter, CC: Legal Admin |
| `ResubmissionReceivedCompliance` | ComplianceReviewStatus: Waiting On Submitter → Waiting On Compliance | To: Compliance, CC: Legal Admin |
| `RequestOnHold` | IsOnHold: false → true | To: Submitter, Attorney, CC: Legal Admin |
| `RequestResumed` | IsOnHold: true → false | To: Submitter, Attorney, CC: Legal Admin |
| `RequestCancelled` | Status → Cancelled | To: Submitter, CC: Attorney, Legal Admin |
| `ReadyForCloseout` | Status → Closeout | To: Submitter, CC: Legal Admin |
| `RequestCompleted` | Status → Completed | To: Submitter, CC: Legal Admin, Attorney |

---

## Table of Contents

### Submission Notifications
1. [Request Submitted](#1-request-submitted) - `RequestSubmitted`
2. [Rush Request Alert](#2-rush-request-alert) - `RushRequestAlert`

### Assignment Notifications
3. [Ready for Attorney Assignment](#3-ready-for-attorney-assignment) - `ReadyForAttorneyAssignment`
4. [Attorney Assigned](#4-attorney-assigned) - `AttorneyAssigned`
5. [Attorney Reassigned](#5-attorney-reassigned) - `AttorneyReassigned`
6. [Compliance Review Required](#6-compliance-review-required) - `ComplianceReviewRequired`

### Legal Review Notifications
7. [Legal Review Approved](#7-legal-review-approved) - `LegalReviewApproved`
8. [Legal Changes Requested](#8-legal-changes-requested) - `LegalChangesRequested`
9. [Legal Review Not Approved](#9-legal-review-not-approved) - `LegalReviewNotApproved`
10. [Resubmission Received (Legal)](#10-resubmission-received-legal) - `ResubmissionReceivedLegal`

### Compliance Review Notifications
11. [Compliance Review Approved](#11-compliance-review-approved) - `ComplianceReviewApproved`
12. [Compliance Changes Requested](#12-compliance-changes-requested) - `ComplianceChangesRequested`
13. [Compliance Review Not Approved](#13-compliance-review-not-approved) - `ComplianceReviewNotApproved`
14. [Resubmission Received (Compliance)](#14-resubmission-received-compliance) - `ResubmissionReceivedCompliance`

### Status Change Notifications
15. [Request On Hold](#15-request-on-hold) - `RequestOnHold`
16. [Request Resumed](#16-request-resumed) - `RequestResumed`
17. [Request Cancelled](#17-request-cancelled) - `RequestCancelled`
18. [Ready for Closeout](#18-ready-for-closeout) - `ReadyForCloseout`
19. [Request Completed](#19-request-completed) - `RequestCompleted`

---

## Email Template Standards

### Design Principles
- **Responsive**: Works on desktop, tablet, and mobile
- **Accessible**: Semantic HTML, high contrast colors, screen reader friendly
- **Branded**: Company header, consistent styling
- **Actionable**: Clear primary CTA button to view request

### Color Palette
- Primary Blue: `#0078d4`
- Success Green: `#107c10`
- Warning Yellow: `#ffaa44`
- Error Red: `#d13438`
- Text Dark: `#323130`
- Text Light: `#605e5c`
- Background: `#f3f2f1`
- White: `#ffffff`

---

## 1. Request Submitted

### Description
Notifies Legal Admin team when a new request is submitted and enters Legal Intake stage.

### Trigger
Status changes from `Draft` → `Legal Intake`

### Recipients
| Field | Value |
|-------|-------|
| **To** | LW - Legal Admin (SharePoint Group) |
| **CC** | Submitter (Creator) |

### Subject
`[Legal Review] New Request Submitted: {{RequestId}} - {{RequestTitle}}`

### Email Body

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Request Submitted</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f2f1;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: #0078d4; padding: 24px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td>
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Legal Review System</h1>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 32px;">
        <!-- Status Badge -->
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color: #0078d4; color: #ffffff; padding: 6px 16px; border-radius: 16px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
              New Request
            </td>
          </tr>
        </table>

        <!-- Title -->
        <h2 style="margin: 20px 0 8px 0; color: #323130; font-size: 24px; font-weight: 600;">
          {{RequestTitle}}
        </h2>
        <p style="margin: 0 0 24px 0; color: #605e5c; font-size: 14px;">
          Request ID: <strong style="color: #0078d4;">{{RequestId}}</strong>
        </p>

        <!-- Details Card -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #faf9f8; border-radius: 8px; border: 1px solid #edebe9;">
          <tr>
            <td style="padding: 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600; text-transform: uppercase;">Submitted By</span><br>
                    <span style="color: #323130; font-size: 14px;">{{SubmitterName}} ({{SubmitterEmail}})</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 12px;">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600; text-transform: uppercase;">Request Type</span><br>
                    <span style="color: #323130; font-size: 14px;">{{RequestType}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 12px;">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600; text-transform: uppercase;">Target Return Date</span><br>
                    <span style="color: #323130; font-size: 14px;">{{TargetReturnDate}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 12px;">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600; text-transform: uppercase;">Review Audience</span><br>
                    <span style="color: #323130; font-size: 14px;">{{ReviewAudience}}</span>
                  </td>
                </tr>
                {{#if IsRushRequest}}
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fde7e9; border-left: 4px solid #d13438; border-radius: 4px;">
                      <tr>
                        <td style="padding: 12px 16px;">
                          <span style="color: #d13438; font-size: 12px; font-weight: 700; text-transform: uppercase;">⚡ Rush Request</span><br>
                          <span style="color: #323130; font-size: 13px;">{{RushRationale}}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                {{/if}}
              </table>
            </td>
          </tr>
        </table>

        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
          <tr>
            <td style="background-color: #0078d4; border-radius: 4px;">
              <a href="{{RequestUrl}}" target="_blank" style="display: inline-block; padding: 12px 32px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600;">
                View Request
              </a>
            </td>
          </tr>
        </table>

        <!-- Action Required -->
        <p style="margin: 0; color: #605e5c; font-size: 14px; line-height: 1.6;">
          <strong>Action Required:</strong> Please review this request and assign an attorney, or send to the Attorney Assigner Committee for assignment.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #faf9f8; padding: 20px 32px; border-top: 1px solid #edebe9;">
        <p style="margin: 0; color: #605e5c; font-size: 12px; line-height: 1.5;">
          This is an automated notification from the Legal Review System.<br>
          Please do not reply to this email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Attorney Assigned (Direct)

### Description
Notifies assigned attorney when they are directly assigned to a request by Legal Admin.

### Trigger
Legal Intake → In Review (with direct attorney assignment)

### Recipients
| Field | Value |
|-------|-------|
| **To** | Assigned Attorney |
| **CC** | Submitter, Legal Admin who assigned |

### Subject
`[Legal Review] You've Been Assigned: {{RequestId}} - {{RequestTitle}}`

### Email Body

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Attorney Assignment</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f2f1;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: #0078d4; padding: 24px 32px;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Legal Review System</h1>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 32px;">
        <!-- Status Badge -->
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color: #107c10; color: #ffffff; padding: 6px 16px; border-radius: 16px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
              Assigned to You
            </td>
          </tr>
        </table>

        <h2 style="margin: 20px 0 8px 0; color: #323130; font-size: 24px; font-weight: 600;">
          {{RequestTitle}}
        </h2>
        <p style="margin: 0 0 24px 0; color: #605e5c; font-size: 14px;">
          Request ID: <strong style="color: #0078d4;">{{RequestId}}</strong>
        </p>

        <!-- Assignment Info -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0f6ff; border-radius: 8px; border: 1px solid #c7e0f4;">
          <tr>
            <td style="padding: 16px 20px;">
              <p style="margin: 0 0 8px 0; color: #0078d4; font-size: 12px; font-weight: 600; text-transform: uppercase;">Assigned By</p>
              <p style="margin: 0; color: #323130; font-size: 14px;">{{AssignedByName}} on {{AssignedDate}}</p>
            </td>
          </tr>
        </table>

        {{#if AttorneyAssignNotes}}
        <!-- Assignment Notes -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px; background-color: #fff4ce; border-radius: 8px; border: 1px solid #ffd335;">
          <tr>
            <td style="padding: 16px 20px;">
              <p style="margin: 0 0 8px 0; color: #8a6914; font-size: 12px; font-weight: 600; text-transform: uppercase;">Assignment Notes</p>
              <p style="margin: 0; color: #323130; font-size: 14px; line-height: 1.5;">{{AttorneyAssignNotes}}</p>
            </td>
          </tr>
        </table>
        {{/if}}

        <!-- Request Details -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px; background-color: #faf9f8; border-radius: 8px; border: 1px solid #edebe9;">
          <tr>
            <td style="padding: 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="50%" style="padding-bottom: 12px; vertical-align: top;">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Submitter</span><br>
                    <span style="color: #323130; font-size: 14px;">{{SubmitterName}}</span>
                  </td>
                  <td width="50%" style="padding-bottom: 12px; vertical-align: top;">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Target Date</span><br>
                    <span style="color: #323130; font-size: 14px;">{{TargetReturnDate}}</span>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="vertical-align: top;">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Request Type</span><br>
                    <span style="color: #323130; font-size: 14px;">{{RequestType}}</span>
                  </td>
                  <td width="50%" style="vertical-align: top;">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Review Audience</span><br>
                    <span style="color: #323130; font-size: 14px;">{{ReviewAudience}}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
          <tr>
            <td style="background-color: #0078d4; border-radius: 4px;">
              <a href="{{RequestUrl}}" target="_blank" style="display: inline-block; padding: 12px 32px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600;">
                Start Review
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #faf9f8; padding: 20px 32px; border-top: 1px solid #edebe9;">
        <p style="margin: 0; color: #605e5c; font-size: 12px;">
          This is an automated notification from the Legal Review System.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Sent to Committee

### Description
Notifies Attorney Assigner Committee when a request needs attorney assignment.

### Trigger
Legal Intake → Assign Attorney (via "Send to Committee" action)

### Recipients
| Field | Value |
|-------|-------|
| **To** | LW - Attorney Assigner (SharePoint Group) |
| **CC** | Legal Admin who sent, Submitter |

### Subject
`[Legal Review] Attorney Assignment Needed: {{RequestId}} - {{RequestTitle}}`

### Email Body

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Attorney Assignment Needed</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f2f1;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: #0078d4; padding: 24px 32px;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Legal Review System</h1>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 32px;">
        <!-- Status Badge -->
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color: #ffaa44; color: #323130; padding: 6px 16px; border-radius: 16px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
              Assignment Needed
            </td>
          </tr>
        </table>

        <h2 style="margin: 20px 0 8px 0; color: #323130; font-size: 24px; font-weight: 600;">
          {{RequestTitle}}
        </h2>
        <p style="margin: 0 0 24px 0; color: #605e5c; font-size: 14px;">
          Request ID: <strong style="color: #0078d4;">{{RequestId}}</strong>
        </p>

        <!-- Context from Legal Admin -->
        {{#if AttorneyAssignNotes}}
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0f6ff; border-left: 4px solid #0078d4; border-radius: 4px;">
          <tr>
            <td style="padding: 16px 20px;">
              <p style="margin: 0 0 8px 0; color: #0078d4; font-size: 12px; font-weight: 600; text-transform: uppercase;">Context from Legal Admin</p>
              <p style="margin: 0; color: #323130; font-size: 14px; line-height: 1.5;">{{AttorneyAssignNotes}}</p>
              <p style="margin: 8px 0 0 0; color: #605e5c; font-size: 12px;">— {{SentByName}}</p>
            </td>
          </tr>
        </table>
        {{/if}}

        <!-- Request Details -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 20px; background-color: #faf9f8; border-radius: 8px; border: 1px solid #edebe9;">
          <tr>
            <td style="padding: 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Submitter</span><br>
                    <span style="color: #323130; font-size: 14px;">{{SubmitterName}} ({{SubmitterEmail}})</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 12px;">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Request Type</span><br>
                    <span style="color: #323130; font-size: 14px;">{{RequestType}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 12px;">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Target Return Date</span><br>
                    <span style="color: {{#if IsRushRequest}}#d13438{{else}}#323130{{/if}}; font-size: 14px; font-weight: {{#if IsRushRequest}}600{{else}}400{{/if}};">
                      {{TargetReturnDate}} {{#if IsRushRequest}}(RUSH){{/if}}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Purpose</span><br>
                    <span style="color: #323130; font-size: 14px;">{{Purpose}}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
          <tr>
            <td style="background-color: #0078d4; border-radius: 4px;">
              <a href="{{RequestUrl}}" target="_blank" style="display: inline-block; padding: 12px 32px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600;">
                Assign Attorney
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 0; color: #605e5c; font-size: 14px;">
          <strong>Action Required:</strong> Please select an attorney to assign to this request.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #faf9f8; padding: 20px 32px; border-top: 1px solid #edebe9;">
        <p style="margin: 0; color: #605e5c; font-size: 12px;">
          This is an automated notification from the Legal Review System.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 4. Attorney Assigned (Committee)

### Description
Notifies attorney when assigned by the Attorney Assigner Committee.

### Trigger
Assign Attorney → In Review (via committee assignment)

### Recipients
| Field | Value |
|-------|-------|
| **To** | Assigned Attorney |
| **CC** | Submitter, Committee member who assigned, Legal Admin |

### Subject
`[Legal Review] You've Been Assigned by Committee: {{RequestId}} - {{RequestTitle}}`

### Email Body
*Same structure as "Attorney Assigned (Direct)" with minor wording adjustments to indicate committee assignment.*

---

## 5. Compliance Review Required

### Description
Notifies Compliance team when a request requires compliance review.

### Trigger
- Review Audience is "Compliance Only" or "Both Legal & Compliance"
- Status changes to In Review

### Recipients
| Field | Value |
|-------|-------|
| **To** | LW - Compliance Users (SharePoint Group) |
| **CC** | Submitter, Assigned Attorney (if applicable) |

### Subject
`[Compliance Review] Review Required: {{RequestId}} - {{RequestTitle}}`

### Email Body

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compliance Review Required</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f2f1;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: #5c2d91; padding: 24px 32px;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Compliance Review</h1>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 32px;">
        <!-- Status Badge -->
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color: #5c2d91; color: #ffffff; padding: 6px 16px; border-radius: 16px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
              Review Required
            </td>
          </tr>
        </table>

        <h2 style="margin: 20px 0 8px 0; color: #323130; font-size: 24px; font-weight: 600;">
          {{RequestTitle}}
        </h2>
        <p style="margin: 0 0 24px 0; color: #605e5c; font-size: 14px;">
          Request ID: <strong style="color: #5c2d91;">{{RequestId}}</strong>
        </p>

        <!-- Request Details -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #faf9f8; border-radius: 8px; border: 1px solid #edebe9;">
          <tr>
            <td style="padding: 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="50%" style="padding-bottom: 12px; vertical-align: top;">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Submitter</span><br>
                    <span style="color: #323130; font-size: 14px;">{{SubmitterName}}</span>
                  </td>
                  <td width="50%" style="padding-bottom: 12px; vertical-align: top;">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Target Date</span><br>
                    <span style="color: #323130; font-size: 14px;">{{TargetReturnDate}}</span>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding-bottom: 12px; vertical-align: top;">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Request Type</span><br>
                    <span style="color: #323130; font-size: 14px;">{{RequestType}}</span>
                  </td>
                  <td width="50%" style="padding-bottom: 12px; vertical-align: top;">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Assigned Attorney</span><br>
                    <span style="color: #323130; font-size: 14px;">{{AttorneyName}}</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Compliance Flags</span><br>
                    <span style="color: #323130; font-size: 14px;">
                      {{#if IsForesideReviewRequired}}Foreside Review Required{{/if}}
                      {{#if IsRetailUse}}• Retail Use{{/if}}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
          <tr>
            <td style="background-color: #5c2d91; border-radius: 4px;">
              <a href="{{RequestUrl}}" target="_blank" style="display: inline-block; padding: 12px 32px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600;">
                Start Compliance Review
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #faf9f8; padding: 20px 32px; border-top: 1px solid #edebe9;">
        <p style="margin: 0; color: #605e5c; font-size: 12px;">
          This is an automated notification from the Legal Review System.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 6. Attorney Reassigned

### Description
Notifies both old and new attorneys when an attorney is reassigned.

### Trigger
Attorney field value changes (not null to different value)

### Recipients
| Field | Value |
|-------|-------|
| **To** | New Attorney |
| **CC** | Previous Attorney, Legal Admin, Submitter |

### Subject
`[Legal Review] Attorney Reassigned: {{RequestId}} - {{RequestTitle}}`

### Email Body

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Attorney Reassigned</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f2f1;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: #0078d4; padding: 24px 32px;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Legal Review System</h1>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 32px;">
        <!-- Status Badge -->
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color: #ffaa44; color: #323130; padding: 6px 16px; border-radius: 16px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
              Reassigned
            </td>
          </tr>
        </table>

        <h2 style="margin: 20px 0 8px 0; color: #323130; font-size: 24px; font-weight: 600;">
          {{RequestTitle}}
        </h2>
        <p style="margin: 0 0 24px 0; color: #605e5c; font-size: 14px;">
          Request ID: <strong style="color: #0078d4;">{{RequestId}}</strong>
        </p>

        <!-- Reassignment Info -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fff4ce; border-radius: 8px; border: 1px solid #ffd335;">
          <tr>
            <td style="padding: 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="50%" style="padding-bottom: 8px; vertical-align: top;">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Previous Attorney</span><br>
                    <span style="color: #323130; font-size: 14px; text-decoration: line-through;">{{PreviousAttorneyName}}</span>
                  </td>
                  <td width="50%" style="padding-bottom: 8px; vertical-align: top;">
                    <span style="color: #107c10; font-size: 12px; font-weight: 600;">New Attorney</span><br>
                    <span style="color: #107c10; font-size: 14px; font-weight: 600;">{{NewAttorneyName}}</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Reassigned By</span><br>
                    <span style="color: #323130; font-size: 14px;">{{ReassignedByName}} on {{ReassignedDate}}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        {{#if ReassignmentReason}}
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px; background-color: #faf9f8; border-radius: 8px; border: 1px solid #edebe9;">
          <tr>
            <td style="padding: 16px 20px;">
              <p style="margin: 0 0 8px 0; color: #605e5c; font-size: 12px; font-weight: 600;">Reason</p>
              <p style="margin: 0; color: #323130; font-size: 14px;">{{ReassignmentReason}}</p>
            </td>
          </tr>
        </table>
        {{/if}}

        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
          <tr>
            <td style="background-color: #0078d4; border-radius: 4px;">
              <a href="{{RequestUrl}}" target="_blank" style="display: inline-block; padding: 12px 32px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600;">
                View Request
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #faf9f8; padding: 20px 32px; border-top: 1px solid #edebe9;">
        <p style="margin: 0; color: #605e5c; font-size: 12px;">
          This is an automated notification from the Legal Review System.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 7. Waiting on Submitter

### Description
Notifies submitter that reviewer has requested changes or additional information.

### Trigger
Legal or Compliance review status changes to "Waiting On Submitter"

### Recipients
| Field | Value |
|-------|-------|
| **To** | Submitter (Creator) |
| **CC** | Assigned Attorney, Compliance Reviewer (if applicable) |

### Subject
`[Action Required] Changes Requested: {{RequestId}} - {{RequestTitle}}`

### Email Body

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Changes Requested</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f2f1;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: #d13438; padding: 24px 32px;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Action Required</h1>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 32px;">
        <!-- Status Badge -->
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color: #d13438; color: #ffffff; padding: 6px 16px; border-radius: 16px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
              Changes Requested
            </td>
          </tr>
        </table>

        <h2 style="margin: 20px 0 8px 0; color: #323130; font-size: 24px; font-weight: 600;">
          {{RequestTitle}}
        </h2>
        <p style="margin: 0 0 24px 0; color: #605e5c; font-size: 14px;">
          Request ID: <strong style="color: #0078d4;">{{RequestId}}</strong>
        </p>

        <!-- Reviewer Comments -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fde7e9; border-left: 4px solid #d13438; border-radius: 4px;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 8px 0; color: #d13438; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                {{ReviewerType}} Review Comments
              </p>
              <p style="margin: 0; color: #323130; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">{{ReviewerComments}}</p>
              <p style="margin: 12px 0 0 0; color: #605e5c; font-size: 12px;">— {{ReviewerName}}, {{ReviewDate}}</p>
            </td>
          </tr>
        </table>

        <!-- What You Need To Do -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 20px; background-color: #f0f6ff; border-radius: 8px; border: 1px solid #c7e0f4;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 12px 0; color: #0078d4; font-size: 14px; font-weight: 600;">What You Need To Do:</p>
              <ol style="margin: 0; padding-left: 20px; color: #323130; font-size: 14px; line-height: 1.6;">
                <li>Review the comments above</li>
                <li>Make the requested changes to your materials</li>
                <li>Upload revised documents</li>
                <li>Add a response comment explaining your changes</li>
              </ol>
            </td>
          </tr>
        </table>

        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
          <tr>
            <td style="background-color: #d13438; border-radius: 4px;">
              <a href="{{RequestUrl}}" target="_blank" style="display: inline-block; padding: 12px 32px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600;">
                Respond to Request
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #faf9f8; padding: 20px 32px; border-top: 1px solid #edebe9;">
        <p style="margin: 0; color: #605e5c; font-size: 12px;">
          This is an automated notification from the Legal Review System.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 8. Submitter Response Received

### Description
Notifies reviewer(s) when submitter uploads revised documents or responds.

### Trigger
Document uploaded or comment added while status is "Waiting On Submitter"

### Recipients
| Field | Value |
|-------|-------|
| **To** | Assigned Attorney, Compliance Reviewer (based on Review Audience) |
| **CC** | Legal Admin |

### Subject
`[Legal Review] Response Received: {{RequestId}} - {{RequestTitle}}`

### Email Body

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Response Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f2f1;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: #0078d4; padding: 24px 32px;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Legal Review System</h1>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 32px;">
        <!-- Status Badge -->
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color: #107c10; color: #ffffff; padding: 6px 16px; border-radius: 16px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
              Response Received
            </td>
          </tr>
        </table>

        <h2 style="margin: 20px 0 8px 0; color: #323130; font-size: 24px; font-weight: 600;">
          {{RequestTitle}}
        </h2>
        <p style="margin: 0 0 24px 0; color: #605e5c; font-size: 14px;">
          Request ID: <strong style="color: #0078d4;">{{RequestId}}</strong>
        </p>

        <!-- Submitter Response -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #dff6dd; border-left: 4px solid #107c10; border-radius: 4px;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 8px 0; color: #107c10; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                Submitter Response
              </p>
              {{#if SubmitterComment}}
              <p style="margin: 0; color: #323130; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">{{SubmitterComment}}</p>
              {{/if}}
              {{#if DocumentsUploaded}}
              <p style="margin: 12px 0 0 0; color: #605e5c; font-size: 13px;">
                📎 {{DocumentCount}} document(s) uploaded
              </p>
              {{/if}}
              <p style="margin: 12px 0 0 0; color: #605e5c; font-size: 12px;">— {{SubmitterName}}, {{ResponseDate}}</p>
            </td>
          </tr>
        </table>

        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
          <tr>
            <td style="background-color: #0078d4; border-radius: 4px;">
              <a href="{{RequestUrl}}" target="_blank" style="display: inline-block; padding: 12px 32px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600;">
                Continue Review
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 0; color: #605e5c; font-size: 14px;">
          The submitter has responded to your feedback. Please review and continue processing this request.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #faf9f8; padding: 20px 32px; border-top: 1px solid #edebe9;">
        <p style="margin: 0; color: #605e5c; font-size: 12px;">
          This is an automated notification from the Legal Review System.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 9. Review Completed

### Description
Notifies stakeholders when a Legal or Compliance review is completed.

### Trigger
- Legal Review status changes to Completed (with outcome)
- Compliance Review status changes to Completed (with outcome)

### Recipients
| Field | Value |
|-------|-------|
| **To** | Submitter (Creator) |
| **CC** | Legal Admin, Other Reviewer (if Both review audience) |

### Subject
`[Legal Review] {{ReviewType}} Complete: {{ReviewOutcome}} - {{RequestId}}`

### Email Body

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Review Completed</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f2f1;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header - Color based on outcome -->
    <tr>
      <td style="background-color: {{#eq ReviewOutcome 'Approved'}}#107c10{{else}}{{#eq ReviewOutcome 'Not Approved'}}#d13438{{else}}#ffaa44{{/eq}}{{/eq}}; padding: 24px 32px;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">{{ReviewType}} Review Complete</h1>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 32px;">
        <!-- Outcome Badge -->
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color: {{#eq ReviewOutcome 'Approved'}}#dff6dd{{else}}{{#eq ReviewOutcome 'Not Approved'}}#fde7e9{{else}}#fff4ce{{/eq}}{{/eq}}; color: {{#eq ReviewOutcome 'Approved'}}#107c10{{else}}{{#eq ReviewOutcome 'Not Approved'}}#d13438{{else}}#8a6914{{/eq}}{{/eq}}; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">
              {{ReviewOutcome}}
            </td>
          </tr>
        </table>

        <h2 style="margin: 20px 0 8px 0; color: #323130; font-size: 24px; font-weight: 600;">
          {{RequestTitle}}
        </h2>
        <p style="margin: 0 0 24px 0; color: #605e5c; font-size: 14px;">
          Request ID: <strong style="color: #0078d4;">{{RequestId}}</strong>
        </p>

        <!-- Review Details -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #faf9f8; border-radius: 8px; border: 1px solid #edebe9;">
          <tr>
            <td style="padding: 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="50%" style="padding-bottom: 12px; vertical-align: top;">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Reviewed By</span><br>
                    <span style="color: #323130; font-size: 14px;">{{ReviewerName}}</span>
                  </td>
                  <td width="50%" style="padding-bottom: 12px; vertical-align: top;">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Review Date</span><br>
                    <span style="color: #323130; font-size: 14px;">{{ReviewCompletedDate}}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        {{#if ReviewNotes}}
        <!-- Review Notes -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px; background-color: #f0f6ff; border-radius: 8px; border: 1px solid #c7e0f4;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 8px 0; color: #0078d4; font-size: 12px; font-weight: 600; text-transform: uppercase;">Review Notes</p>
              <p style="margin: 0; color: #323130; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">{{ReviewNotes}}</p>
            </td>
          </tr>
        </table>
        {{/if}}

        <!-- Next Steps -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 20px;">
          <tr>
            <td style="padding: 16px 0;">
              <p style="margin: 0 0 8px 0; color: #323130; font-size: 14px; font-weight: 600;">What Happens Next:</p>
              {{#eq ReviewOutcome 'Approved'}}
              <p style="margin: 0; color: #605e5c; font-size: 14px; line-height: 1.6;">
                {{#if OtherReviewPending}}
                  Waiting for {{OtherReviewType}} review to complete.
                {{else}}
                  Your request will move to closeout for final processing.
                {{/if}}
              </p>
              {{/eq}}
              {{#eq ReviewOutcome 'Approved With Comments'}}
              <p style="margin: 0; color: #605e5c; font-size: 14px; line-height: 1.6;">
                Please review the notes above. No action required unless specified.
                {{#if OtherReviewPending}}
                  Waiting for {{OtherReviewType}} review to complete.
                {{/if}}
              </p>
              {{/eq}}
              {{#eq ReviewOutcome 'Not Approved'}}
              <p style="margin: 0; color: #d13438; font-size: 14px; line-height: 1.6;">
                This request has been marked as Not Approved and will be closed.
              </p>
              {{/eq}}
            </td>
          </tr>
        </table>

        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
          <tr>
            <td style="background-color: #0078d4; border-radius: 4px;">
              <a href="{{RequestUrl}}" target="_blank" style="display: inline-block; padding: 12px 32px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600;">
                View Request
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #faf9f8; padding: 20px 32px; border-top: 1px solid #edebe9;">
        <p style="margin: 0; color: #605e5c; font-size: 12px;">
          This is an automated notification from the Legal Review System.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 10. Ready for Closeout

### Description
Notifies submitter that all reviews are complete and request is ready for closeout.

### Trigger
Status changes to `Closeout`

### Recipients
| Field | Value |
|-------|-------|
| **To** | Submitter (Creator) |
| **CC** | Legal Admin |

### Subject
`[Legal Review] Ready for Closeout: {{RequestId}} - {{RequestTitle}}`

### Email Body

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ready for Closeout</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f2f1;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: #107c10; padding: 24px 32px;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Ready for Closeout</h1>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 32px;">
        <!-- Success Icon -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="text-align: center;">
          <tr>
            <td style="padding-bottom: 20px;">
              <div style="display: inline-block; width: 64px; height: 64px; background-color: #dff6dd; border-radius: 50%; line-height: 64px; font-size: 32px;">
                ✓
              </div>
            </td>
          </tr>
        </table>

        <h2 style="margin: 0 0 8px 0; color: #323130; font-size: 24px; font-weight: 600; text-align: center;">
          All Reviews Complete!
        </h2>
        <p style="margin: 0 0 24px 0; color: #605e5c; font-size: 14px; text-align: center;">
          Request ID: <strong style="color: #0078d4;">{{RequestId}}</strong>
        </p>

        <!-- Request Title -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #dff6dd; border-radius: 8px;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="margin: 0; color: #107c10; font-size: 18px; font-weight: 600;">{{RequestTitle}}</p>
            </td>
          </tr>
        </table>

        <!-- Review Summary -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px; background-color: #faf9f8; border-radius: 8px; border: 1px solid #edebe9;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 16px 0; color: #323130; font-size: 14px; font-weight: 600;">Review Summary</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                {{#if LegalReviewCompleted}}
                <tr>
                  <td style="padding-bottom: 8px;">
                    <span style="color: #107c10; font-size: 14px;">✓</span>
                    <span style="color: #323130; font-size: 14px; margin-left: 8px;">Legal Review: {{LegalReviewOutcome}}</span>
                  </td>
                </tr>
                {{/if}}
                {{#if ComplianceReviewCompleted}}
                <tr>
                  <td style="padding-bottom: 8px;">
                    <span style="color: #107c10; font-size: 14px;">✓</span>
                    <span style="color: #323130; font-size: 14px; margin-left: 8px;">Compliance Review: {{ComplianceReviewOutcome}}</span>
                  </td>
                </tr>
                {{/if}}
              </table>
            </td>
          </tr>
        </table>

        {{#if TrackingIdRequired}}
        <!-- Tracking ID Required -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px; background-color: #fff4ce; border-left: 4px solid #ffaa44; border-radius: 4px;">
          <tr>
            <td style="padding: 16px 20px;">
              <p style="margin: 0 0 8px 0; color: #8a6914; font-size: 12px; font-weight: 600; text-transform: uppercase;">Tracking ID Required</p>
              <p style="margin: 0; color: #323130; font-size: 14px;">
                Please provide the Tracking ID to complete closeout.
              </p>
            </td>
          </tr>
        </table>
        {{/if}}

        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px auto;">
          <tr>
            <td style="background-color: #107c10; border-radius: 4px;">
              <a href="{{RequestUrl}}" target="_blank" style="display: inline-block; padding: 12px 32px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600;">
                Complete Closeout
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #faf9f8; padding: 20px 32px; border-top: 1px solid #edebe9;">
        <p style="margin: 0; color: #605e5c; font-size: 12px;">
          This is an automated notification from the Legal Review System.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 11. Request Completed

### Description
Notifies all stakeholders when a request is fully completed.

### Trigger
Status changes to `Completed`

### Recipients
| Field | Value |
|-------|-------|
| **To** | Submitter (Creator) |
| **CC** | Legal Admin, Assigned Attorney, Compliance Reviewers (if applicable) |

### Subject
`[Legal Review] Request Completed: {{RequestId}} - {{RequestTitle}}`

### Email Body

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Request Completed</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f2f1;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: #107c10; padding: 24px 32px;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Request Completed</h1>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 32px; text-align: center;">
        <!-- Success Icon -->
        <div style="display: inline-block; width: 80px; height: 80px; background-color: #dff6dd; border-radius: 50%; line-height: 80px; font-size: 40px; margin-bottom: 20px;">
          ✓
        </div>

        <h2 style="margin: 0 0 8px 0; color: #107c10; font-size: 28px; font-weight: 600;">
          Complete!
        </h2>
        <p style="margin: 0 0 24px 0; color: #605e5c; font-size: 14px;">
          Your request has been fully processed and closed.
        </p>

        <!-- Request Summary Card -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #faf9f8; border-radius: 8px; border: 1px solid #edebe9; text-align: left;">
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 4px 0; color: #605e5c; font-size: 12px; font-weight: 600; text-transform: uppercase;">Request</p>
              <p style="margin: 0 0 16px 0; color: #323130; font-size: 18px; font-weight: 600;">{{RequestTitle}}</p>

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="50%" style="padding-bottom: 12px; vertical-align: top;">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Request ID</span><br>
                    <span style="color: #0078d4; font-size: 14px; font-weight: 600;">{{RequestId}}</span>
                  </td>
                  <td width="50%" style="padding-bottom: 12px; vertical-align: top;">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Completed On</span><br>
                    <span style="color: #323130; font-size: 14px;">{{CompletedDate}}</span>
                  </td>
                </tr>
                {{#if TrackingId}}
                <tr>
                  <td colspan="2" style="padding-bottom: 12px;">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Tracking ID</span><br>
                    <span style="color: #323130; font-size: 14px;">{{TrackingId}}</span>
                  </td>
                </tr>
                {{/if}}
                <tr>
                  <td width="50%" style="vertical-align: top;">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Total Turnaround</span><br>
                    <span style="color: #323130; font-size: 14px;">{{TotalTurnaroundDays}} business days</span>
                  </td>
                  <td width="50%" style="vertical-align: top;">
                    <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Final Outcome</span><br>
                    <span style="color: #107c10; font-size: 14px; font-weight: 600;">{{FinalOutcome}}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px auto;">
          <tr>
            <td style="background-color: #0078d4; border-radius: 4px;">
              <a href="{{RequestUrl}}" target="_blank" style="display: inline-block; padding: 12px 32px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600;">
                View Final Request
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 0; color: #605e5c; font-size: 13px;">
          Thank you for using the Legal Review System.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #faf9f8; padding: 20px 32px; border-top: 1px solid #edebe9;">
        <p style="margin: 0; color: #605e5c; font-size: 12px; text-align: center;">
          This is an automated notification from the Legal Review System.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 12. Request Cancelled

### Description
Notifies stakeholders when a request is cancelled.

### Trigger
Status changes to `Cancelled`

### Recipients
| Field | Value |
|-------|-------|
| **To** | Submitter (Creator) |
| **CC** | Legal Admin, Assigned Attorney (if assigned), Compliance Reviewers (if applicable) |

### Subject
`[Legal Review] Request Cancelled: {{RequestId}} - {{RequestTitle}}`

### Email Body

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Request Cancelled</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f2f1;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: #605e5c; padding: 24px 32px;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Request Cancelled</h1>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 32px;">
        <h2 style="margin: 0 0 8px 0; color: #323130; font-size: 24px; font-weight: 600;">
          {{RequestTitle}}
        </h2>
        <p style="margin: 0 0 24px 0; color: #605e5c; font-size: 14px;">
          Request ID: <strong style="color: #605e5c;">{{RequestId}}</strong>
        </p>

        <!-- Cancellation Info -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f2f1; border-left: 4px solid #605e5c; border-radius: 4px;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 8px 0; color: #605e5c; font-size: 12px; font-weight: 600; text-transform: uppercase;">Cancelled By</p>
              <p style="margin: 0 0 16px 0; color: #323130; font-size: 14px;">{{CancelledByName}} on {{CancelledDate}}</p>

              <p style="margin: 0 0 8px 0; color: #605e5c; font-size: 12px; font-weight: 600; text-transform: uppercase;">Reason</p>
              <p style="margin: 0; color: #323130; font-size: 14px; line-height: 1.6;">{{CancelReason}}</p>
            </td>
          </tr>
        </table>

        <!-- Request Summary -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 20px; background-color: #faf9f8; border-radius: 8px; border: 1px solid #edebe9;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 12px 0; color: #323130; font-size: 14px; font-weight: 600;">Request Details</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="50%" style="padding-bottom: 8px; vertical-align: top;">
                    <span style="color: #605e5c; font-size: 12px;">Status at Cancellation</span><br>
                    <span style="color: #323130; font-size: 14px;">{{PreviousStatus}}</span>
                  </td>
                  <td width="50%" style="padding-bottom: 8px; vertical-align: top;">
                    <span style="color: #605e5c; font-size: 12px;">Submitter</span><br>
                    <span style="color: #323130; font-size: 14px;">{{SubmitterName}}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
          <tr>
            <td style="background-color: #605e5c; border-radius: 4px;">
              <a href="{{RequestUrl}}" target="_blank" style="display: inline-block; padding: 12px 32px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600;">
                View Cancelled Request
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #faf9f8; padding: 20px 32px; border-top: 1px solid #edebe9;">
        <p style="margin: 0; color: #605e5c; font-size: 12px;">
          This is an automated notification from the Legal Review System.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 13. Request On Hold

### Description
Notifies stakeholders when a request is placed on hold.

### Trigger
Status changes to `On Hold`

### Recipients
| Field | Value |
|-------|-------|
| **To** | Submitter (Creator), Assigned Attorney (if assigned) |
| **CC** | Legal Admin, Compliance Reviewers (if applicable) |

### Subject
`[Legal Review] Request On Hold: {{RequestId}} - {{RequestTitle}}`

### Email Body

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Request On Hold</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f2f1;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: #ffaa44; padding: 24px 32px;">
        <h1 style="margin: 0; color: #323130; font-size: 20px; font-weight: 600;">⏸ Request On Hold</h1>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 32px;">
        <h2 style="margin: 0 0 8px 0; color: #323130; font-size: 24px; font-weight: 600;">
          {{RequestTitle}}
        </h2>
        <p style="margin: 0 0 24px 0; color: #605e5c; font-size: 14px;">
          Request ID: <strong style="color: #0078d4;">{{RequestId}}</strong>
        </p>

        <!-- Hold Info -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fff4ce; border-left: 4px solid #ffaa44; border-radius: 4px;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 8px 0; color: #8a6914; font-size: 12px; font-weight: 600; text-transform: uppercase;">Placed On Hold By</p>
              <p style="margin: 0 0 16px 0; color: #323130; font-size: 14px;">{{OnHoldByName}} on {{OnHoldDate}}</p>

              <p style="margin: 0 0 8px 0; color: #8a6914; font-size: 12px; font-weight: 600; text-transform: uppercase;">Reason</p>
              <p style="margin: 0; color: #323130; font-size: 14px; line-height: 1.6;">{{OnHoldReason}}</p>
            </td>
          </tr>
        </table>

        <!-- Previous Status -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 20px; background-color: #faf9f8; border-radius: 8px; border: 1px solid #edebe9;">
          <tr>
            <td style="padding: 16px 20px;">
              <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Previous Status</span><br>
              <span style="color: #323130; font-size: 14px;">{{PreviousStatus}}</span>
            </td>
          </tr>
        </table>

        <p style="margin: 24px 0 0 0; color: #605e5c; font-size: 14px; line-height: 1.6;">
          This request has been temporarily paused. It will remain on hold until resumed. You will be notified when the request is resumed.
        </p>

        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
          <tr>
            <td style="background-color: #0078d4; border-radius: 4px;">
              <a href="{{RequestUrl}}" target="_blank" style="display: inline-block; padding: 12px 32px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600;">
                View Request
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #faf9f8; padding: 20px 32px; border-top: 1px solid #edebe9;">
        <p style="margin: 0; color: #605e5c; font-size: 12px;">
          This is an automated notification from the Legal Review System.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 14. Request Resumed

### Description
Notifies stakeholders when a request is resumed from On Hold status.

### Trigger
Status changes from `On Hold` → Previous status

### Recipients
| Field | Value |
|-------|-------|
| **To** | Submitter (Creator), Assigned Attorney (if assigned) |
| **CC** | Legal Admin, Compliance Reviewers (if applicable) |

### Subject
`[Legal Review] Request Resumed: {{RequestId}} - {{RequestTitle}}`

### Email Body

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Request Resumed</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f2f1;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: #107c10; padding: 24px 32px;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">▶ Request Resumed</h1>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 32px;">
        <h2 style="margin: 0 0 8px 0; color: #323130; font-size: 24px; font-weight: 600;">
          {{RequestTitle}}
        </h2>
        <p style="margin: 0 0 24px 0; color: #605e5c; font-size: 14px;">
          Request ID: <strong style="color: #0078d4;">{{RequestId}}</strong>
        </p>

        <!-- Resume Info -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #dff6dd; border-left: 4px solid #107c10; border-radius: 4px;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 8px 0; color: #107c10; font-size: 12px; font-weight: 600; text-transform: uppercase;">Resumed By</p>
              <p style="margin: 0 0 16px 0; color: #323130; font-size: 14px;">{{ResumedByName}} on {{ResumedDate}}</p>

              <p style="margin: 0 0 8px 0; color: #107c10; font-size: 12px; font-weight: 600; text-transform: uppercase;">Current Status</p>
              <p style="margin: 0; color: #323130; font-size: 14px; font-weight: 600;">{{CurrentStatus}}</p>
            </td>
          </tr>
        </table>

        <!-- Hold Duration -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 20px; background-color: #faf9f8; border-radius: 8px; border: 1px solid #edebe9;">
          <tr>
            <td style="padding: 16px 20px;">
              <span style="color: #605e5c; font-size: 12px; font-weight: 600;">Time On Hold</span><br>
              <span style="color: #323130; font-size: 14px;">{{HoldDuration}}</span>
            </td>
          </tr>
        </table>

        <p style="margin: 24px 0 0 0; color: #605e5c; font-size: 14px; line-height: 1.6;">
          This request has been resumed and is now active. Processing will continue from where it left off.
        </p>

        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
          <tr>
            <td style="background-color: #0078d4; border-radius: 4px;">
              <a href="{{RequestUrl}}" target="_blank" style="display: inline-block; padding: 12px 32px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600;">
                View Request
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #faf9f8; padding: 20px 32px; border-top: 1px solid #edebe9;">
        <p style="margin: 0; color: #605e5c; font-size: 12px;">
          This is an automated notification from the Legal Review System.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Template Variables Reference

### Common Variables (Available in all templates)

| Variable | Description | Example |
|----------|-------------|---------|
| `{{RequestId}}` | Unique request identifier | CER-25-0042 |
| `{{RequestTitle}}` | Request title/description | Q1 Marketing Campaign |
| `{{RequestUrl}}` | Direct link to request | https://sharepoint.com/sites/legal/Lists/Requests/DispForm.aspx?ID=42 |
| `{{RequestType}}` | Type of request | Communication Request |
| `{{Status}}` | Current workflow status | In Review |
| `{{SubmitterName}}` | Request creator name | John Smith |
| `{{SubmitterEmail}}` | Request creator email | john.smith@company.com |

### Date Variables

| Variable | Description | Format |
|----------|-------------|--------|
| `{{TargetReturnDate}}` | Expected completion date | Dec 28, 2025 |
| `{{SubmittedOn}}` | Request submission date | Dec 20, 2025 |
| `{{CompletedDate}}` | Completion date | Dec 28, 2025 |

### Person Variables

| Variable | Description |
|----------|-------------|
| `{{AttorneyName}}` | Assigned attorney name |
| `{{AttorneyEmail}}` | Assigned attorney email |
| `{{ReviewerName}}` | Reviewer who completed review |
| `{{AssignedByName}}` | Person who made assignment |

### Conditional Variables

| Variable | Type | Description |
|----------|------|-------------|
| `{{IsRushRequest}}` | Boolean | True if rush request |
| `{{RushRationale}}` | String | Rush request reason |
| `{{TrackingIdRequired}}` | Boolean | True if tracking ID needed |

---

## Implementation Notes

### Power Automate Integration

1. **Trigger**: SharePoint item created/modified trigger on Requests list
2. **Condition**: Check status field for specific transitions
3. **Action**: Send email using Office 365 connector with HTML template
4. **Dynamic Content**: Use Power Automate expressions to populate variables

### Azure Function Integration

The Legal Workflow Azure Functions project (`/docs/functions/`) handles notification generation:

- **NotificationTemplateIds.cs**: Defines constants for all 19 notification template IDs
- **NotificationService.cs**: Determines which notification to send based on request changes
- **Templates**: Stored in SharePoint Notifications list, provisioned via `/provisioning/Lists/Notifications.xml`

```
POST /api/notifications/process
Content-Type: application/json

{
  "requestId": 42
}
```

The service compares current vs. previous request versions to detect state changes and triggers appropriate notifications.

### Email Delivery Best Practices

1. **From Address**: Use recognizable system address (e.g., legalreview@company.com)
2. **Reply-To**: Set to no-reply or Legal Admin distribution list
3. **Tracking**: Log all sent notifications with timestamps
4. **Retry Logic**: Queue failed emails for retry (max 3 attempts)
5. **Batching**: For group notifications, send individual emails to prevent reply-all storms

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-27 | 1.2 | Updated to match 19 implemented notifications; removed User Tagged (handled by PnP); added Quick Reference table |
| 2025-12-28 | 1.0 | Initial documentation created |
