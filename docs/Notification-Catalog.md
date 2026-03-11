# Legal Review System — Notification Catalog

This document describes every automated email notification the Legal Review System sends, including who receives it, when it is triggered, and the full email content.

> **For business stakeholders.** All 19 notifications are sent automatically when specific workflow events occur — no manual action is required to trigger them.
>
> Items shown in `{curly braces}` are dynamic values filled in at the time the email is sent (e.g., `{Request ID}` becomes the actual request ID like `LRQ-2024-001234`).
> Items marked **(if provided)** only appear in the email when that information exists on the request.

---

## Recipient Groups

| Group | Who Receives It |
|-------|----------------|
| **Legal Admin Group** | All Legal Admin team members |
| **Attorney Assigner Group** | Committee members who assign attorneys |
| **Compliance Group** | All Compliance team members |
| **Assigned Attorney** | The specific attorney(s) assigned to that request |
| **Submitter** | The person who created and submitted the request |
| **Additional Parties** | Any additional parties listed on the request |

---

## Quick Reference

| # | Notification | To | CC | Importance | Docs Attached |
|---|-------------|----|----|-----------|--------------|
| 1 | [New Request Submitted](#1-new-request-submitted) | Legal Admin | Submitter | Normal | No |
| 2 | [Rush Request Alert](#2-rush-request-alert) | Legal Admin | Submitter | **High** | No |
| 3 | [Ready for Attorney Assignment](#3-ready-for-attorney-assignment) | Attorney Assigner Group | — | Normal | No |
| 4 | [Attorney Assigned](#4-attorney-assigned) | Assigned Attorney | Submitter | Normal | **Yes** |
| 5 | [Attorney Reassigned](#5-attorney-reassigned) | Assigned Attorney | Submitter, Legal Admin | Normal | **Yes** |
| 6 | [Compliance Review Required](#6-compliance-review-required) | Compliance Group | Submitter | Normal | **Yes** |
| 7 | [Legal Review Approved](#7-legal-review-approved) | Submitter | Additional Parties | Normal | No |
| 8 | [Legal Changes Requested](#8-legal-changes-requested) | Submitter | Additional Parties | **High** | No |
| 9 | [Legal Review Not Approved](#9-legal-review-not-approved) | Submitter | Additional Parties | Normal | No |
| 10 | [Compliance Review Approved](#10-compliance-review-approved) | Submitter | Additional Parties | Normal | No |
| 11 | [Compliance Changes Requested](#11-compliance-changes-requested) | Submitter | Additional Parties | **High** | No |
| 12 | [Compliance Review Not Approved](#12-compliance-review-not-approved) | Submitter | Additional Parties | Normal | No |
| 13 | [Resubmission Received — Legal](#13-resubmission-received--legal) | Assigned Attorney | — | Normal | **Yes** |
| 14 | [Resubmission Received — Compliance](#14-resubmission-received--compliance) | Compliance Group | — | Normal | **Yes** |
| 15 | [Request Placed On Hold](#15-request-placed-on-hold) | Submitter | Additional Parties | Normal | No |
| 16 | [Request Resumed](#16-request-resumed) | Submitter | Additional Parties | Normal | No |
| 17 | [Request Cancelled](#17-request-cancelled) | Submitter | Attorney, Additional Parties | Normal | No |
| 18 | [Ready for Closeout](#18-ready-for-closeout) | Submitter | Additional Parties | Normal | No |
| 19 | [Request Completed](#19-request-completed) | Submitter | Additional Parties | Normal | No |

---

## Submission Notifications

---

### 1. New Request Submitted

**When sent:** A request is submitted for the first time (Draft → Legal Intake)
**Applies to:** All request types · **Importance:** Normal · **Documents attached:** No

- **To:** Legal Admin Group
- **CC:** Submitter
- **BCC:** —

**Subject:**
```
[Action Required] New {Request Type} Request: {Request ID} - {Title}
```

**Email body:**

---

**New Request Submitted**

A new {Request Type} request has been submitted and requires your attention.

**Basic Information**
| Field | Value |
|-------|-------|
| Request ID | {Request ID} |
| Title | {Title} |
| Submitted By | {Submitter Name} |
| Request Type | {Request Type} |
| Submission Type | {Submission Type} |
| Submission Item | {Submission Item} |
| Target Return Date | {Target Return Date} |
| Review Audience | {Review Audience} |

**Purpose** *(if provided)*
{Purpose}

**Product & Audience** *(if applicable)*
| Field | Value |
|-------|-------|
| FINRA Audience | {FINRA Audience Category} |
| Audience | {Audience} *(if provided)* |
| US Funds | {US Funds} *(if provided)* |
| UCITS | {UCITS} *(if provided)* |
| Separate Account Strategies | {Separate Account Strategies} *(if provided)* |

**Distribution** *(if provided)*
| Field | Value |
|-------|-------|
| Distribution Method | {Distribution Method} |
| Date of First Use | {Date of First Use} *(if provided)* |

✅ **{N} Approval(s) Attached** *(if approvals were uploaded)*

**Additional Parties** *(if listed)*
{Additional Parties}

**→ View Request**

*This is an automated message from the Legal Review System. Please do not reply to this email.*

---

### 2. Rush Request Alert

**When sent:** A rush request is submitted — replaces notification #1 when `Is Rush Request = Yes`
**Applies to:** All request types · **Importance:** High · **Documents attached:** No

- **To:** Legal Admin Group
- **CC:** Submitter
- **BCC:** —

**Subject:**
```
[RUSH] Urgent {Request Type} Request: {Request ID} - {Title}
```

**Email body:**

---

**Rush Request Submitted**

⚠️ *This is a rush request requiring expedited review.*

A new rush request has been submitted and requires immediate attention.

**Basic Information**
| Field | Value |
|-------|-------|
| Request ID | {Request ID} |
| Title | {Title} |
| Submitted By | {Submitter Name} |
| Request Type | {Request Type} |
| Submission Item | {Submission Item} |
| Target Return Date | **{Target Return Date}** *(highlighted in red)* |
| Review Audience | {Review Audience} |

**Rush Rationale**
{Rush Rationale}

**Purpose** *(if provided)*
{Purpose}

**Product & Audience** *(if applicable)*
| Field | Value |
|-------|-------|
| FINRA Audience | {FINRA Audience Category} |
| Audience | {Audience} *(if provided)* |
| US Funds | {US Funds} *(if provided)* |

✅ **{N} Approval(s) Attached** *(if approvals were uploaded)*

**→ View Rush Request**

*This is an automated message from the Legal Review System. Please do not reply to this email.*

---

## Assignment Notifications

---

### 3. Ready for Attorney Assignment

**When sent:** Legal Admin sends the request to the committee for attorney selection (Legal Intake → Assign Attorney)
**Applies to:** All request types · **Importance:** Normal · **Documents attached:** No

- **To:** Attorney Assigner Group
- **CC:** —
- **BCC:** —

**Subject:**
```
[Action Required] Attorney Assignment Needed: {Request ID} - {Title}
```

**Email body:**

---

**Attorney Assignment Required**

A {Request Type} request is awaiting attorney assignment by the committee.

| Field | Value |
|-------|-------|
| Request ID | {Request ID} |
| Title | {Title} |
| Submitted By | {Submitter Name} |
| Submission Type | {Submission Type} |
| Target Return Date | {Target Return Date} |
| Assignment Notes | {Assignment Notes} |

**→ Assign Attorney**

*This is an automated message from the Legal Review System. Please do not reply to this email.*

---

### 4. Attorney Assigned

**When sent:** An attorney is directly assigned to a request and review begins (Legal Intake → In Review)
**Applies to:** All request types · **Importance:** Normal · **Documents attached:** Yes

- **To:** Assigned Attorney
- **CC:** Submitter
- **BCC:** —

**Subject:**
```
[Action Required] Legal Review Assigned: {Request ID} - {Title}
```

**Email body:**

---

**Review Assigned to You**

You have been assigned to review the following request.

⚠️ *This is a RUSH request requiring expedited review.* *(if applicable)*

**Basic Information**
| Field | Value |
|-------|-------|
| Request ID | {Request ID} |
| Title | {Title} |
| Submitted By | {Submitter Name} |
| Request Type | {Request Type} |
| Submission Type | {Submission Type} |
| Submission Item | {Submission Item} |
| Target Return Date | {Target Return Date} |
| Review Audience | {Review Audience} |

**Purpose** *(if provided)*
{Purpose}

**Product & Audience** *(if applicable)*
| Field | Value |
|-------|-------|
| FINRA Audience | {FINRA Audience Category} |
| Audience | {Audience} *(if provided)* |
| US Funds | {US Funds} *(if provided)* |
| UCITS | {UCITS} *(if provided)* |
| Separate Account Strategies | {Separate Account Strategies} *(if provided)* |

**Distribution** *(if provided)*
| Field | Value |
|-------|-------|
| Distribution Method | {Distribution Method} |
| Date of First Use | {Date of First Use} *(if provided)* |

✅ **{N} Approval(s) Attached** *(if approvals were uploaded)*

**Assignment Notes** *(if provided)*
{Assignment Notes}

**→ Begin Review**

*This is an automated message from the Legal Review System. Please do not reply to this email.*

---

### 5. Attorney Reassigned

**When sent:** The assigned attorney on an in-progress request is changed to a different attorney
**Applies to:** All request types · **Importance:** Normal · **Documents attached:** Yes

- **To:** Newly Assigned Attorney
- **CC:** Submitter, Legal Admin Group
- **BCC:** —

**Subject:**
```
[Legal Review] Attorney Reassigned: {Request ID} - {Title}
```

**Email body:**

---

**Attorney Reassigned**

You have been reassigned to review the following request.

⚠️ *This is a RUSH request requiring expedited review.* *(if applicable)*

**Request Details**
| Field | Value |
|-------|-------|
| Request ID | {Request ID} |
| Title | {Title} |
| Submitted By | {Submitter Name} |
| Request Type | {Request Type} |
| Target Return Date | {Target Return Date} |
| Review Audience | {Review Audience} |

**Assignment Notes** *(if provided)*
{Assignment Notes}

**→ View Request**

Please review the request and provide your assessment.

*This is an automated message from the Legal Review System. Please do not reply to this email.*

---

### 6. Compliance Review Required

**When sent:** A request moves to In Review with Review Audience = "Compliance" or "Both"
**Applies to:** All request types · **Importance:** Normal · **Documents attached:** Yes

- **To:** Compliance Group
- **CC:** Submitter
- **BCC:** —

**Subject:**
```
[Compliance Review] Review Required: {Request ID} - {Title}
```

**Email body:**

---

**Compliance Review Required**

A new request requires compliance review.

⚠️ *This is a RUSH request requiring expedited review.* *(if applicable)*

**Request Details**
| Field | Value |
|-------|-------|
| Request ID | {Request ID} |
| Title | {Title} |
| Submitted By | {Submitter Name} |
| Request Type | {Request Type} |
| Submission Item | {Submission Item} |
| Target Return Date | {Target Return Date} |

**Purpose** *(if provided)*
{Purpose}

**Product & Audience** *(if applicable)*
| Field | Value |
|-------|-------|
| FINRA Audience | {FINRA Audience Category} |
| Audience | {Audience} *(if provided)* |

**→ Start Compliance Review**

Please review the request materials and provide your compliance assessment.

*This is an automated message from the Legal Review System. Please do not reply to this email.*

---

## Review Notifications

---

### 7. Legal Review Approved

**When sent:** Attorney completes legal review with outcome = Approved or Approved with Comments
**Applies to:** All request types · **Importance:** Normal · **Documents attached:** No

- **To:** Submitter
- **CC:** Additional Parties *(if listed)*
- **BCC:** —

**Subject:**
```
Legal Review Approved: {Request ID} - {Title}
```

**Email body:**

---

**Legal Review Approved**

Your {Request Type} request has been approved.

| Field | Value |
|-------|-------|
| Request ID | {Request ID} |
| Title | {Title} |
| Reviewed By | {Attorney Name} |
| Review Outcome | Approved |

**Reviewer Notes** *(if provided)*
{Legal Review Notes}

**→ View Request**

*This is an automated message from the Legal Review System. Please do not reply to this email.*

---

### 8. Legal Changes Requested

**When sent:** Attorney sets outcome to "Respond to Comments and Resubmit" — the submitter must address the comments and resubmit
**Applies to:** All request types · **Importance:** High · **Documents attached:** No

- **To:** Submitter
- **CC:** Additional Parties *(if listed)*
- **BCC:** —

**Subject:**
```
[Action Required] Changes Requested: {Request ID} - {Title}
```

**Email body:**

---

**Changes Requested**

⚠️ *Action Required: Please review the comments below and resubmit your request.*

| Field | Value |
|-------|-------|
| Request ID | {Request ID} |
| Title | {Title} |
| Reviewed By | {Attorney Name} |

**Reviewer Comments:**
{Legal Review Notes}

**→ Address Comments & Resubmit**

*This is an automated message from the Legal Review System. Please do not reply to this email.*

---

### 9. Legal Review Not Approved

**When sent:** Attorney completes legal review with outcome = Not Approved. The request moves directly to Completed — no closeout step is required.
**Applies to:** All request types · **Importance:** Normal · **Documents attached:** No

- **To:** Submitter
- **CC:** Additional Parties *(if listed)*
- **BCC:** —

**Subject:**
```
Legal Review Not Approved: {Request ID} - {Title}
```

**Email body:**

---

**Legal Review Not Approved**

Your {Request Type} request has not been approved. The request has been moved to Completed status.

| Field | Value |
|-------|-------|
| Request ID | {Request ID} |
| Title | {Title} |
| Reviewed By | {Attorney Name} |
| Review Outcome | Not Approved |

**Reviewer Notes:**
{Legal Review Notes}

**→ View Request**

*This is an automated message from the Legal Review System. Please do not reply to this email.*

---

### 10. Compliance Review Approved

**When sent:** Compliance team completes review with outcome = Approved or Approved with Comments
**Applies to:** All request types · **Importance:** Normal · **Documents attached:** No

- **To:** Submitter
- **CC:** Additional Parties *(if listed)*
- **BCC:** —

**Subject:**
```
Compliance Review Approved: {Request ID} - {Title}
```

**Email body:**

---

**Compliance Review Approved**

Your compliance review has been approved.

| Field | Value |
|-------|-------|
| Request ID | {Request ID} |
| Title | {Title} |
| Review Outcome | Approved |

**Reviewer Notes** *(if provided)*
{Compliance Review Notes}

**→ View Request**

*This is an automated message from the Legal Review System. Please do not reply to this email.*

---

### 11. Compliance Changes Requested

**When sent:** Compliance reviewer sets outcome to "Respond to Comments and Resubmit"
**Applies to:** All request types · **Importance:** High · **Documents attached:** No

- **To:** Submitter
- **CC:** Additional Parties *(if listed)*
- **BCC:** —

**Subject:**
```
[Action Required] Compliance Changes Requested: {Request ID} - {Title}
```

**Email body:**

---

**Compliance Changes Requested**

⚠️ *Action Required: Please review the compliance comments below and resubmit your request.*

| Field | Value |
|-------|-------|
| Request ID | {Request ID} |
| Title | {Title} |

**Compliance Comments:**
{Compliance Review Notes}

**→ Address Comments & Resubmit**

*This is an automated message from the Legal Review System. Please do not reply to this email.*

---

### 12. Compliance Review Not Approved

**When sent:** Compliance team completes review with outcome = Not Approved. The request moves directly to Completed.
**Applies to:** All request types · **Importance:** Normal · **Documents attached:** No

- **To:** Submitter
- **CC:** Additional Parties *(if listed)*
- **BCC:** —

**Subject:**
```
Compliance Review Not Approved: {Request ID} - {Title}
```

**Email body:**

---

**Compliance Review Not Approved**

Your compliance review request has not been approved. The request has been moved to Completed status.

| Field | Value |
|-------|-------|
| Request ID | {Request ID} |
| Title | {Title} |
| Review Outcome | Not Approved |

**Compliance Notes:**
{Compliance Review Notes}

**Foreside Review** *(if applicable)*
Foreside review was required for this request.

**Retail Use** *(if applicable)*
This request was marked for retail use.

**→ View Request**

*This is an automated message from the Legal Review System. Please do not reply to this email.*

---

### 13. Resubmission Received — Legal

**When sent:** Submitter clicks "Resubmit for Review" after addressing the attorney's comments
**Applies to:** All request types · **Importance:** Normal · **Documents attached:** Yes

- **To:** Assigned Attorney
- **CC:** —
- **BCC:** —

**Subject:**
```
[Action Required] Resubmission Received: {Request ID} - {Title}
```

**Email body:**

---

**Resubmission Received**

The submitter has addressed your comments and resubmitted the request for your review.

| Field | Value |
|-------|-------|
| Request ID | {Request ID} |
| Title | {Title} |
| Submitted By | {Submitter Name} |
| Resubmitted On | {Resubmitted On} |

**Submitter's Response** *(if provided)*
{Submitter Response Notes}

**→ Continue Review**

*This is an automated message from the Legal Review System. Please do not reply to this email.*

---

### 14. Resubmission Received — Compliance

**When sent:** Submitter clicks "Resubmit for Review" after addressing the Compliance team's comments
**Applies to:** All request types · **Importance:** Normal · **Documents attached:** Yes

- **To:** Compliance Group
- **CC:** —
- **BCC:** —

**Subject:**
```
[Action Required] Compliance Resubmission: {Request ID} - {Title}
```

**Email body:**

---

**Compliance Resubmission Received**

The submitter has addressed compliance comments and resubmitted the request for review.

| Field | Value |
|-------|-------|
| Request ID | {Request ID} |
| Title | {Title} |
| Submitted By | {Submitter Name} |
| Resubmitted On | {Resubmitted On} |

**Submitter's Response** *(if provided)*
{Submitter Response Notes}

**→ Continue Review**

*This is an automated message from the Legal Review System. Please do not reply to this email.*

---

## Status Change Notifications

---

### 15. Request Placed On Hold

**When sent:** Legal Admin or Admin places a request on hold at any active stage
**Applies to:** All request types · **Importance:** Normal · **Documents attached:** No

- **To:** Submitter
- **CC:** Additional Parties *(if listed)*
- **BCC:** —

**Subject:**
```
Request Placed On Hold: {Request ID} - {Title}
```

**Email body:**

---

**Request On Hold**

Your request has been placed on hold. No action is required from you at this time.

| Field | Value |
|-------|-------|
| Request ID | {Request ID} |
| Title | {Title} |
| On Hold By | {Name} |
| On Hold Since | {Date} |

**Reason:**
{Hold Reason}

**→ View Request**

*This is an automated message from the Legal Review System. Please do not reply to this email.*

---

### 16. Request Resumed

**When sent:** Legal Admin or Admin removes a request from hold — it re-enters the workflow at the same stage it was paused
**Applies to:** All request types · **Importance:** Normal · **Documents attached:** No

- **To:** Submitter
- **CC:** Additional Parties *(if listed)*
- **BCC:** —

**Subject:**
```
Request Resumed: {Request ID} - {Title}
```

**Email body:**

---

**Request Resumed**

Your request has been taken off hold and processing has resumed.

| Field | Value |
|-------|-------|
| Request ID | {Request ID} |
| Title | {Title} |
| Current Status | {Status} |

**→ View Request**

*This is an automated message from the Legal Review System. Please do not reply to this email.*

---

### 17. Request Cancelled

**When sent:** A request is cancelled at any stage of the workflow
**Applies to:** All request types · **Importance:** Normal · **Documents attached:** No

- **To:** Submitter
- **CC:** Assigned Attorney *(if one was assigned)*, Additional Parties *(if listed)*
- **BCC:** —

**Subject:**
```
Request Cancelled: {Request ID} - {Title}
```

**Email body:**

---

**Request Cancelled**

The following request has been cancelled.

| Field | Value |
|-------|-------|
| Request ID | {Request ID} |
| Title | {Title} |
| Cancelled By | {Name} |
| Cancelled On | {Date} |

**Cancellation Reason:**
{Cancellation Reason}

**→ View Request**

*This is an automated message from the Legal Review System. Please do not reply to this email.*

---

## Closeout Notifications

---

### 18. Ready for Closeout

**When sent:** All required reviews are completed with Approved or Approved with Comments outcomes — submitter must complete the closeout step
**Applies to:** All request types · **Importance:** Normal · **Documents attached:** No

- **To:** Submitter
- **CC:** Additional Parties *(if listed)*
- **BCC:** —

**Subject:**
```
[Action Required] Ready for Closeout: {Request ID} - {Title}
```

**Email body:**

---

**Ready for Closeout**

All reviews have been completed. Please complete the closeout process for your request.

**Request Summary**
| Field | Value |
|-------|-------|
| Request ID | {Request ID} |
| Title | {Title} |
| Submission Item | {Submission Item} |
| Target Return Date | {Target Return Date} |
| Assigned Attorney | {Attorney Name} *(if applicable)* |

**Review Results**
| Field | Value |
|-------|-------|
| Legal Review | {Legal Review Outcome} *(if applicable)* |
| Compliance Review | {Compliance Review Outcome} *(if applicable)* |

**Legal Review Notes** *(if provided)*
{Legal Review Notes}

**Compliance Review Notes** *(if provided)*
{Compliance Review Notes}

📋 *Note: A Tracking ID is required to complete the closeout for this request.* *(if Foreside Review was required)*

Please review any comments from the reviewers and complete the closeout form to finalize this request.

**→ Complete Closeout**

*This is an automated message from the Legal Review System. Please do not reply to this email.*

---

### 19. Request Completed

**When sent:** Request reaches Completed status — either via closeout submission, or directly when any review outcome is Not Approved
**Applies to:** All request types · **Importance:** Normal · **Documents attached:** No

- **To:** Submitter
- **CC:** Additional Parties *(if listed)*
- **BCC:** —

**Subject:**
```
Request Completed: {Request ID} - {Title}
```

**Email body:**

---

**Request Completed**

Your {Request Type} request has been completed successfully.

**Request Summary**
| Field | Value |
|-------|-------|
| Request ID | {Request ID} |
| Title | {Title} |
| Submission Item | {Submission Item} |
| Submitted On | {Submitted Date} |
| Completed On | {Completed Date} |
| Tracking ID | {Tracking ID} *(if FINRA/Foreside review was required)* |

**Final Review Results**
| Field | Value |
|-------|-------|
| Legal Review | {Legal Review Outcome} *(if applicable)* |
| Reviewed By | {Attorney Name} *(if applicable)* |
| Compliance Review | {Compliance Review Outcome} *(if applicable)* |

Thank you for using the Legal Review System. You can access the completed request and all associated documents at any time.

**→ View Completed Request**

*This is an automated message from the Legal Review System. Please do not reply to this email.*

---

## Notes on Type-Specific Templates

All 19 templates above apply to **all request types** (Communication Review, General Review, IMA Review). The system is designed to support type-specific variations: if a particular notification needs different wording, recipients, or structure for a specific request type, a separate template can be added for that combination — the system will automatically use it in place of the generic one. The generic templates above will serve as the fallback for any type that does not have a custom template.
