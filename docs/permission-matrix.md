# Permission & Security Matrix

> **Source of truth**: This document is derived from the actual codebase implementation across three layers:
>
> - **UI Layer** — `uiVisibilityService.ts` (button/field/card visibility)
> - **Store Layer** — `requestStore/store.ts` + `workflowPermissionService.ts` (action guards)
> - **Service Layer** — `saveProgressActions.ts`, `resubmitActions.ts` (runtime enforcement)
>
> Last updated: 2026-03-10

---

## Table of Contents

- Roles Overview
- Workflow Statuses
- Permission Matrix by Status
  - Draft
  - Legal Intake
  - Assign Attorney (Committee)
  - In Review
  - Closeout
  - Awaiting FINRA Documents
  - On Hold
  - Completed / Cancelled (Terminal)
- Field Editability by Role
- Card Visibility by Status
- Enforcement Layers
- Key Design Decisions

---

## Roles Overview

| Role | SharePoint Group | Description |
|------|-----------------|-------------|
| **Admin** | LW - Admins | Full system administration. Universal override for all actions. |
| **Legal Admin** | LW - Legal Admins| Triages requests, assigns attorneys, manages Legal Intake and Closeout. |
| **Attorney Assigner** | LW - Attorney Assigners | Committee member who assigns attorneys during the committee stage only. |
| **Attorney** | LW - Attorneys | Reviews assigned legal requests. Must be explicitly assigned to act. |
| **Compliance User** | LW - Compliance Reviewers | Reviews compliance requests. Any compliance user can review (no assignment). |
| **Submitter (Owner)** | LW - Submitters | Creates and owns requests. "Owner" = `submittedBy.id` or `author.id` matches current user. |

---

## Workflow Statuses

```
Draft ──► Legal Intake ──► Assign Attorney ──► In Review ──► Closeout ──► Completed
                │                                   │            │
                └──── (direct assign) ──────────────┘            ├──► Awaiting FINRA Documents ──► Completed
                                                                 │
                                                    In Review ───┴──► Completed (if Not Approved)

Any non-terminal status ──► On Hold ──► (resume to previous status)
Any non-terminal status ──► Cancelled
```

**Terminal statuses**: Completed, Cancelled — no further workflow actions allowed (Admin can still edit at store level).

---

## Permission Matrix by Status

### Draft

The initial state where the owner builds their request before submission.

#### Buttons

| Action | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner |
|--------|:-----:|:-----------:|:-------------:|:--------:|:----------:|:-----:|
| Save as Draft | ✅ | — | — | — | — | ✅ |
| Submit Request | ✅ | — | — | — | — | ✅ |
| Cancel | ✅ | — | — | — | — | ✅ |
| Close (navigate away) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

#### Fields

| Field Area | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner |
|------------|:-----:|:-----------:|:-------------:|:--------:|:----------:|:-----:|
| Request Info | ✅ edit | — | — | — | — | ✅ edit |
| Attachments — add | ✅ | — | — | — | — | ✅ |
| Attachments — delete | ✅ | — | — | — | — | ✅ |

#### Cards Visible

Request Summary, Request Documents, Request Approvals. Legal Intake card is hidden (except for Admin / Legal Admin).

---

### Legal Intake

Legal Admin triages the request: sets review audience, assigns attorney directly, or sends to committee.

#### Buttons

| Action | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner |
|--------|:-----:|:-----------:|:-------------:|:--------:|:----------:|:-----:|
| Save | ✅ | ✅ | — | — | — | ✅ |
| Assign Attorney (→ In Review) | ✅ | ✅ | — | — | — | — |
| Send to Committee (→ Assign Attorney) | ✅ | ✅ | — | — | — | — |
| On Hold | ✅ | ✅ | — | — | — | ✅ |
| Cancel | ✅ | ✅ | — | — | — | ✅ |
| Close | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> **Note**: "Assign Attorney" button is disabled (visible but grayed out) until an attorney is selected, if legal review is required.

#### Fields

| Field Area | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner |
|------------|:-----:|:-----------:|:-------------:|:--------:|:----------:|:-----:|
| Request Info | ✅ edit | ✅ edit | — | — | — | ✅ edit |
| Legal Intake — Attorney | ✅ edit | ✅ edit | — | — | — | — |
| Legal Intake — Notes | ✅ edit | ✅ edit | — | — | — | — |
| Legal Intake — Review Audience | ✅ edit | ✅ edit | — | — | — | — |
| Attachments — add | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| Attachments — delete | ✅ | ✅ | — | — | — | — |

#### Cards Visible

Request Summary, Request Documents, Request Approvals, Legal Intake.

---

### Assign Attorney (Committee)

Committee members (Attorney Assigners) review and assign an attorney.

#### Buttons

| Action | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner |
|--------|:-----:|:-----------:|:-------------:|:--------:|:----------:|:-----:|
| Save | ✅ | — | ✅ | — | — | — |
| Assign Attorney (→ In Review) | ✅ | — | ✅ | — | — | — |
| On Hold | ✅ | ✅ | — | — | — | ✅ |
| Cancel | ✅ | ✅ | — | — | — | ✅ |
| Close | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> **Note**: "Assign Attorney" button is disabled until an attorney is selected, if legal review is required.

#### Fields

| Field Area | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner |
|------------|:-----:|:-----------:|:-------------:|:--------:|:----------:|:-----:|
| Request Info | ✅ edit | ✅ edit | — | — | — | ✅ edit |
| Legal Intake — Attorney | ✅ edit | ✅ edit | ✅ edit | — | — | — |
| Legal Intake — Notes | ✅ edit | ✅ edit | ✅ edit | — | — | — |
| Attachments — add | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| Attachments — delete | ✅ | ✅ | — | — | — | — |

#### Cards Visible

Request Summary, Request Documents, Request Approvals, Legal Intake.

---

### In Review

The core review stage. Attorneys and/or Compliance reviewers evaluate the request.

#### Buttons

| Action | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner |
|--------|:-----:|:-----------:|:-------------:|:--------:|:----------:|:-----:|
| Save (general) | ✅ | ✅ | — | — | — | ✅ |
| Resubmit for Review | ✅ | — | — | — | — | ✅ |
| On Hold | ✅ | ✅ | — | — | — | ✅ |
| Cancel | ✅ | ✅ | — | — | — | ✅ |
| Close | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

#### Service-Level Actions (triggered from review card footers)

| Action | Admin | Legal Admin | Atty Assigner | Assigned Atty | Unassigned Atty | Compliance | Owner |
|--------|:-----:|:-----------:|:-------------:|:-------------:|:---------------:|:----------:|:-----:|
| Save Legal Review Progress | ✅ | ✅ | — | ✅ | — | — | — |
| Submit Legal Review | ✅ | ✅ | — | ✅ | — | — | — |
| Request Legal Review Changes | ✅ | ✅ | — | ✅ | — | — | — |
| Save Compliance Review Progress | ✅ | — | — | — | — | ✅ | — |
| Submit Compliance Review | ✅ | — | — | — | — | ✅ | — |
| Request Compliance Review Changes | ✅ | — | — | — | — | ✅ | — |

> **Important**: Attorney actions require the user to be **assigned** to the request (listed in `legalReview.assignedAttorney` or `attorney`). An attorney who is not assigned is denied. Compliance actions have no assignment requirement — any user in the Compliance User group can act.

#### Fields

| Field Area | Admin | Legal Admin | Atty Assigner | Assigned Atty | Compliance | Owner |
|------------|:-----:|:-----------:|:-------------:|:-------------:|:----------:|:-----:|
| Request Info | ✅ edit | ✅ edit | — | — | — | ✅ edit |
| Legal Review | ✅ edit | ✅ edit | — | ✅ edit | — | — |
| Compliance Review | ✅ edit | — | — | — | ✅ edit | — |
| Attachments — add | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| Attachments — delete | ✅ | ✅ | — | — | — | — |

> Legal Review and Compliance Review fields become read-only once the respective review is completed.

#### Cards Visible

Request Summary, Request Documents, Request Approvals, Legal Intake, Legal Review (if required), Compliance Review (if required).

---

### Closeout

Legal Admin verifies the request is ready for completion. Owner loses most edit access.

#### Buttons

| Action | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner |
|--------|:-----:|:-----------:|:-------------:|:--------:|:----------:|:-----:|
| Save | ✅ | ✅ | — | — | — | — |
| Submit Closeout | ✅ | ✅ | — | — | — | — |
| On Hold | ✅ | ✅ | — | — | — | — |
| Cancel | ✅ | ✅ | — | — | — | — |
| Close | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> Submit Closeout transitions to **Completed** (normal) or **Awaiting FINRA Documents** (if Foreside Review Required + Retail Use).

#### Fields

| Field Area | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner |
|------------|:-----:|:-----------:|:-------------:|:--------:|:----------:|:-----:|
| Request Info | — | — | — | — | — | — |
| Closeout fields (Tracking ID, etc.) | ✅ edit | ✅ edit | — | — | — | — |
| Attachments | — | — | — | — | — | — |

#### Cards Visible

Request Summary, Request Documents, Request Approvals, Legal Intake, Legal Review (if required), Compliance Review (if required), Closeout.

---

### Awaiting FINRA Documents

Owner uploads final FINRA documentation. Very restricted — only one action available.

#### Buttons

| Action | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner |
|--------|:-----:|:-----------:|:-------------:|:--------:|:----------:|:-----:|
| Complete FINRA Documents (→ Completed) | ✅ | — | — | — | — | ✅ |
| Close | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

#### Fields

| Field Area | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner |
|------------|:-----:|:-----------:|:-------------:|:--------:|:----------:|:-----:|
| Request Info | — | — | — | — | — | — |
| All other fields | read-only | read-only | read-only | read-only | read-only | read-only |

#### Cards Visible

All cards visible in read-only mode.

---

### On Hold

Request is paused. Only Admin/Legal Admin can resume. The request returns to its previous status on resume.

#### Buttons

| Action | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner |
|--------|:-----:|:-----------:|:-------------:|:--------:|:----------:|:-----:|
| Resume (→ previous status) | ✅ | ✅ | — | — | — | — |
| Cancel | ✅ | ✅ | — | — | — | — |
| Close | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

#### Fields

All fields are read-only while on hold.

#### Store-Level Edit

| Role | Can Edit |
|------|:--------:|
| Admin | ✅ |
| Legal Admin | ✅ |
| Owner | ✅ |
| All others | — |

---

### Completed / Cancelled (Terminal)

No workflow actions are available. The request is in a read-only archive state.

#### Buttons

| Action | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner |
|--------|:-----:|:-----------:|:-------------:|:--------:|:----------:|:-----:|
| Close (navigate away) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| All other buttons | — | — | — | — | — | — |

#### Store-Level Edit

| Role | Can Edit |
|------|:--------:|
| Admin | ✅ (always) |
| All others | — |

> Admin retains store-level edit capability in terminal statuses for data correction purposes. The UI hides all edit buttons, so this is only reachable programmatically.

#### Cards Visible

All cards visible in read-only mode (Legal Review and Compliance Review cards shown if they were required).

---

## Field Editability by Role

Summary across all statuses — when and where each role can edit.

### Admin

| Field Area | Statuses |
|------------|----------|
| Request Info | Draft, Legal Intake, Assign Attorney, In Review |
| Legal Intake (Attorney, Notes, Review Audience) | Legal Intake, Assign Attorney |
| Legal Review | In Review (until review completed) |
| Compliance Review | In Review (until review completed) |
| Closeout | Closeout |
| Attachments (add/delete) | Draft through In Review |
| Store-level edit | All statuses including terminal |

### Legal Admin

| Field Area | Statuses |
|------------|----------|
| Request Info | Legal Intake, Assign Attorney, In Review |
| Legal Intake (Attorney, Notes, Review Audience) | Legal Intake, Assign Attorney |
| Legal Review | In Review (until review completed) |
| Compliance Review | — (never) |
| Closeout | Closeout |
| Attachments (add) | Legal Intake through In Review |
| Attachments (delete) | Legal Intake through In Review |
| Store-level edit | All non-terminal statuses |

### Attorney Assigner

| Field Area | Statuses |
|------------|----------|
| Legal Intake (Attorney, Notes) | Assign Attorney only |
| All other fields | — (never) |

### Assigned Attorney

| Field Area | Statuses |
|------------|----------|
| Legal Review | In Review (until review completed) |
| Attachments (add) | Legal Intake through In Review |
| All other fields | — (never) |

### Compliance User

| Field Area | Statuses |
|------------|----------|
| Compliance Review | In Review (until review completed) |
| Attachments (add) | Legal Intake through In Review |
| All other fields | — (never) |

### Owner / Submitter

| Field Area | Statuses |
|------------|----------|
| Request Info | Draft, Legal Intake, Assign Attorney, In Review |
| Attachments (add) | Draft through In Review |
| Attachments (delete) | Draft only |
| All review/closeout fields | — (never) |
| Store-level edit | Draft through In Review, On Hold |

---

## Card Visibility by Status

| Card | Draft | Legal Intake | Assign Attorney | In Review | Closeout | Awaiting FINRA | On Hold | Completed | Cancelled |
|------|:-----:|:------------:|:---------------:|:---------:|:--------:|:--------------:|:-------:|:---------:|:---------:|
| Request Summary | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Request Documents | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Request Approvals | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Legal Intake | ¹ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Legal Review | — | — | — | ² | ² | — | — | ² | — |
| Compliance Review | — | — | — | ³ | ³ | — | — | ³ | — |
| Closeout | — | — | — | — | ✅ | — | — | ✅ | — |

¹ Hidden for non-admin/non-legal-admin users in Draft.
² Visible only when `reviewAudience` is "Legal" or "Both".
³ Visible only when `reviewAudience` is "Compliance" or "Both".

---

## Enforcement Layers

The permission system is enforced at three independent layers. A user must pass **all three** to perform an action.

| Layer | Component | What It Controls | Effect When Blocked |
|-------|-----------|-----------------|---------------------|
| **1 — UI Visibility** | `uiVisibilityService.ts` | Button show/hide/disable, field editability, card visibility | Buttons are hidden or disabled in the UI |
| **2 — Store Guards** | `workflowPermissionService.ts` | `canEditRequest`, `canSubmitRequest`, `canAssignAttorney`, etc. | Store methods throw before any SharePoint call is made |
| **3 — Service Guards** | `saveProgressActions.ts`, `resubmitActions.ts` | Status + role checks inside each service function | Service functions throw at runtime |
| **4 — SharePoint** | Item-level permissions on SP list | Read/Write access on the list item | SharePoint API rejects unauthorized calls |

Even if a UI bug shows a button that shouldn't be visible, the store guard will block the action. Even if a store guard is bypassed, the service-layer guard will block it. Even if the service layer is bypassed, SharePoint item-level permissions provide the final backstop.

---

## Key Design Decisions

1. **Admin is the universal override** — Admin passes every check at every layer. In terminal statuses, UI buttons are hidden but store-level edit still works for data corrections.

2. **Legal Admin cannot touch Compliance** — Legal Admin can save/submit legal reviews but has no access to compliance review actions (`saveLegalReviewProgress` ✅, `saveComplianceReviewProgress` ❌).

3. **Attorney requires assignment** — Having the Attorney role is not enough. The user must be in the request's `assignedAttorney` list. This prevents attorneys from reviewing requests they weren't assigned to.

4. **Compliance User has no assignment check** — Any user in the Compliance User group can review any compliance request. This differs from the attorney model.

5. **Owner loses access at Closeout** — The owner can edit request info and attachments from Draft through In Review, but loses all edit access at Closeout. They regain a single action (Complete FINRA Documents) in the Awaiting FINRA Documents stage.

6. **On Hold freezes everything** — All fields become read-only. Only Admin/Legal Admin can resume. The request returns to its previous status.

7. **"Resubmit for Review" is owner-only** — Only the request owner (or Admin) can resubmit after addressing reviewer comments. This ensures the submitter explicitly acknowledges they've made the requested changes.

8. **Review fields lock after completion** — Once a legal or compliance review status reaches "Completed", the review fields become read-only even for Admin at the UI level.

9. **Cancel is broadly available** — Owner, Legal Admin, and Admin can cancel from any non-terminal status. This allows the owner to withdraw their own request at any point.

10. **Save button semantics vary by status** — "Save as Draft" in Draft, general "Save" in other statuses. Review-specific saves (Save Legal Review Progress, Save Compliance Review Progress) are separate actions with their own permission checks, triggered from review card footers rather than the main action bar.
