# Legal Review System — Security & Permission Matrix

This document is the authoritative reference for what each user role can see and do at every stage of the workflow.
It is derived directly from `uiVisibilityService.ts` (UI layer) and `workflowPermissionService.ts` (service/store layer).

> **Two layers of enforcement**
> 1. **UI layer** (`uiVisibilityService.ts`) — controls what buttons and fields are rendered/enabled
> 2. **Service layer** (`workflowPermissionService.ts`) — enforces the same rules server-side regardless of UI state
>
> Both layers must agree. The service layer will reject any action the UI should not have shown.

---

## Roles

| Role | SharePoint Group | Description |
|------|-----------------|-------------|
| **Admin** | LW - Admins | Full access everywhere, including terminal statuses |
| **Legal Admin** | LW - Legal Admins | Triage, attorney assignment, closeout; blocked from terminal edits |
| **Attorney Assigner** | LW - Attorney Assigners | Assigns attorneys during committee stage only |
| **Attorney** | LW - Attorneys | Submits legal review for their assigned requests only |
| **Compliance User** | LW - Compliance Reviewers | Submits compliance review; no legal review access |
| **Submitter / Owner** | LW - Submitters | Creates requests; limited access after Legal Intake |

> **Owner** = the user who created the request (`submittedBy.id` or `author.id` matches current user).
> Other submitters can view but not act on requests they don't own.

---

## Status Overview

```
New Request → Draft → Legal Intake → [Assign Attorney] → In Review → Closeout → [Awaiting FINRA] → Completed
                                                                    ↘ (Not Approved) → Completed
                                          ↕ On Hold (any active status)
                                          → Cancelled (any non-terminal status)
```

---

## Button / Action Matrix

Legend: `✅ Enabled` | `🔒 Visible but disabled (no changes)` | `—` Hidden

### New Request (not yet saved)

| Action | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner/Submitter |
|--------|-------|-------------|---------------|----------|------------|-----------------|
| Save as Draft | ✅ | — | — | — | — | ✅ |
| Submit Request | ✅ | — | — | — | — | ✅ |
| Close | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> Save as Draft is disabled (not hidden) when no changes have been made yet.

---

### Draft

| Action | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner |
|--------|-------|-------------|---------------|----------|------------|-------|
| Save as Draft | ✅ | — | — | — | — | ✅ |
| Submit Request | ✅ | — | — | — | — | ✅ |
| Cancel Request | ✅ | — | — | — | — | ✅ |
| Close | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

### Legal Intake

| Action | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner |
|--------|-------|-------------|---------------|----------|------------|-------|
| Save | ✅ | ✅ | — | — | — | ✅ |
| Assign Attorney | ✅ | ✅ | — | — | — | — |
| Send to Committee | ✅ | ✅ | — | — | — | — |
| Put on Hold | ✅ | ✅ | — | — | — | ✅ |
| Cancel Request | ✅ | ✅ | — | — | — | ✅ |
| Close | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> Assign Attorney is disabled (not hidden) when no attorney has been selected.
> Compliance-only requests (no legal review required) can proceed without assigning an attorney.

---

### Assign Attorney *(committee stage)*

| Action | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner |
|--------|-------|-------------|---------------|----------|------------|-------|
| Save | ✅ | — | ✅ | — | — | — |
| Assign Attorney | ✅ | — | ✅ | — | — | — |
| Put on Hold | ✅ | ✅ | — | — | — | ✅ |
| Cancel Request | ✅ | ✅ | — | — | — | ✅ |
| Close | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> Only Admin and Attorney Assigner can save/assign in this stage.
> Legal Admin can hold/cancel but not assign in committee stage.

---

### In Review

| Action | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner |
|--------|-------|-------------|---------------|----------|------------|-------|
| Save (general) | ✅ | ✅ | — | — | — | ✅ |
| Save Legal Review | ✅ | ✅ | — | ✅ (assigned) | — | — |
| Submit Legal Review | ✅ | ✅ | — | ✅ (assigned) | — | — |
| Request Legal Changes | ✅ | ✅ | — | ✅ (assigned) | — | — |
| Save Compliance Review | ✅ | — | — | — | ✅ | — |
| Submit Compliance Review | ✅ | — | — | — | ✅ | — |
| Request Compliance Changes | ✅ | — | — | — | ✅ | — |
| Resubmit for Review | ✅ | — | — | — | — | ✅ |
| Put on Hold | ✅ | ✅ | — | — | — | ✅ |
| Cancel Request | ✅ | ✅ | — | — | — | ✅ |
| Close | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> "Save Legal Review" and "Submit Legal Review" require the attorney to be **assigned** to this specific request.
> Legal Admin can submit legal review as an override.
> Legal Admin cannot submit or save **compliance** review.

---

### Closeout

| Action | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner |
|--------|-------|-------------|---------------|----------|------------|-------|
| Save | ✅ | ✅ | — | — | — | — |
| Submit Closeout | ✅ | ✅ | — | — | — | — |
| Put on Hold | ✅ | ✅ | — | — | — | — |
| Cancel Request | ✅ | ✅ | — | — | — | — |
| Close | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> Owner has no actions at Closeout. Owner can only view.

---

### Awaiting FINRA Documents

| Action | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner |
|--------|-------|-------------|---------------|----------|------------|-------|
| Complete FINRA Documents | ✅ | — | — | — | — | ✅ |
| Close | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> This status is only reached when `isForesideReviewRequired = true`.
> Only the owner and Admin can advance to Completed from here.

---

### On Hold

| Action | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner |
|--------|-------|-------------|---------------|----------|------------|-------|
| Resume | ✅ | ✅ | — | — | — | — |
| Cancel Request | ✅ | ✅ | — | — | — | — |
| Close | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> Only Admin and Legal Admin can resume from hold.

---

### Completed / Cancelled *(terminal)*

| Action | All Roles |
|--------|-----------|
| Close | ✅ |
| Everything else | — |

> No edits, no actions. Admin cannot edit completed/cancelled either (service layer blocks it).
> Exception: Admin can still **view** all fields.

---

## Field Edit Matrix

### Request Info (Title, Purpose, Type, Target Date, etc.)

| Status | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner |
|--------|-------|-------------|---------------|----------|------------|-------|
| New / Draft | ✅ | ✅ | — | — | — | ✅ |
| Legal Intake | ✅ | ✅ | — | — | — | ✅ |
| Assign Attorney | ✅ | ✅ | — | — | — | ✅ |
| In Review | ✅ | ✅ | — | — | — | ✅ |
| Closeout | — | — | — | — | — | — |
| Awaiting FINRA | — | — | — | — | — | — |
| On Hold | ✅ | ✅ | — | — | — | ✅ |
| Completed / Cancelled | — | — | — | — | — | — |

---

### Legal Intake Fields (Attorney, Notes, Review Audience)

| Field | Who Can Edit | Valid Statuses |
|-------|-------------|----------------|
| Attorney (assign) | Admin, Legal Admin, Attorney Assigner | Legal Intake, Assign Attorney |
| Intake Notes | Admin, Legal Admin, Attorney Assigner | Legal Intake, Assign Attorney |
| Review Audience (override) | Admin, Legal Admin | Legal Intake only |
| View (read-only) | All except Submitters in Draft | All except Draft |

> Submitters cannot see the Legal Intake card while status is Draft.

---

### Legal Review Fields

| Field | Who Can Edit | Condition |
|-------|-------------|-----------|
| Legal Review Status/Outcome/Notes | Admin, Legal Admin, Assigned Attorney | In Review + legal review not yet completed |
| View | All with legal access | In Review, Closeout, Completed |

---

### Compliance Review Fields

| Field | Who Can Edit | Condition |
|-------|-------------|-----------|
| Compliance Review Status/Outcome/Notes/Flags | Admin, Compliance User | In Review + compliance review not yet completed |
| View | All with compliance access | In Review, Closeout, Completed |

---

### Closeout Fields

| Field | Who Can Edit | Condition |
|-------|-------------|-----------|
| Tracking ID, Closeout Notes | Admin, Legal Admin | Closeout status only |
| View | All | Closeout, Completed |

---

### Attachments / Documents

| Action | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner |
|--------|-------|-------------|---------------|----------|------------|-------|
| View | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Add (Draft) | ✅ | — | — | — | — | ✅ |
| Add (Legal Intake → In Review) | ✅ | ✅ | — | ✅ | ✅ | — |
| Delete (Draft) | ✅ | — | — | — | — | ✅ |
| Delete (Legal Intake → In Review) | ✅ | ✅ | — | — | — | — |
| Any action in Closeout+ | — | — | — | — | — | — |

---

## Card Visibility Matrix

| Card | Draft | Legal Intake | Assign Attorney | In Review | Closeout | Completed/Cancelled |
|------|-------|-------------|-----------------|-----------|----------|---------------------|
| Request Summary | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All |
| Documents | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All |
| Approvals | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All |
| Legal Intake | Admin/LegalAdmin only | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All |
| Legal Review | — | — | — | If legal required | If legal required | If legal required |
| Compliance Review | — | — | — | If compliance req. | If compliance req. | If compliance req. |
| Closeout | — | — | — | — | ✅ All | ✅ All |

---

## Workflow Transition Rules

| From Status | To Status | Who Can Trigger | How |
|-------------|-----------|-----------------|-----|
| Draft | Legal Intake | Owner, Admin | Submit Request button |
| Legal Intake | Assign Attorney | Admin, Legal Admin | Send to Committee button |
| Legal Intake | In Review | Admin, Legal Admin | Assign Attorney button (direct path) |
| Assign Attorney | In Review | Admin, Attorney Assigner | Assign Attorney button |
| In Review | Closeout | System (auto) | All required reviews = Approved/Approved With Comments |
| In Review | Completed | System (auto) | Any review = Not Approved |
| In Review | Waiting on Submitter | Attorney (legal), Compliance | Request Changes outcome |
| Waiting on Submitter | In Review (Waiting on Reviewer) | Owner, Admin | Resubmit for Review button |
| Closeout | Awaiting FINRA Documents | Admin, Legal Admin | Submit Closeout (when Foreside required) |
| Closeout | Completed | Admin, Legal Admin | Submit Closeout |
| Awaiting FINRA Documents | Completed | Owner, Admin | Complete FINRA Documents button |
| Any active | On Hold | Admin, Legal Admin, Owner | On Hold button |
| On Hold | Previous status | Admin, Legal Admin | Resume button |
| Any non-terminal | Cancelled | Admin, Legal Admin, Owner | Cancel Request button |

---

## Hold / Cancel Rules

### Put on Hold
- **Who**: Admin, Legal Admin, Owner
- **When**: Any status except Draft, Completed, Cancelled, On Hold

### Resume from Hold
- **Who**: Admin, Legal Admin only (Owner cannot resume)
- **Restores**: Previous status before hold

### Cancel
- **Who**: Admin, Legal Admin, Owner (any non-terminal status)
- **Cannot cancel**: Completed requests

---

## Summary: Role Capabilities at a Glance

| Capability | Admin | Legal Admin | Atty Assigner | Attorney | Compliance | Owner |
|-----------|-------|-------------|---------------|----------|------------|-------|
| Create requests | ✅ | — | — | — | — | ✅ |
| Edit request info | All statuses | Draft → In Review | — | — | — | Draft → In Review |
| Submit requests | ✅ | — | — | — | — | ✅ (own) |
| Triage (intake) | ✅ | ✅ | — | — | — | — |
| Assign attorney (direct) | ✅ | ✅ | — | — | — | — |
| Assign attorney (committee) | ✅ | — | ✅ | — | — | — |
| Submit legal review | ✅ | ✅ | — | ✅ (assigned) | — | — |
| Submit compliance review | ✅ | — | — | — | ✅ | — |
| Request review changes | ✅ | ✅ (legal) | — | ✅ (legal, assigned) | ✅ (compliance) | — |
| Resubmit after changes | ✅ | — | — | — | — | ✅ |
| Closeout | ✅ | ✅ | — | — | — | — |
| Complete FINRA phase | ✅ | — | — | — | — | ✅ |
| Hold / Resume | ✅ | ✅ | — | — | — | Hold only |
| Cancel | ✅ | ✅ | — | — | — | ✅ |
| View all cards | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Override review audience | ✅ | ✅ | — | — | — | — |

---

## Security Architecture Notes

### Enforcement Layers

```
Browser (UI)
  └── uiVisibilityService.ts        ← hides/disables buttons and fields
        └── useUIVisibility hook    ← consumed by all form components

SPFx Store (client)
  └── requestStore/store.ts         ← enforcePermission() on every action
        └── workflowPermissionService.ts

Azure Function (server)
  └── PermissionService.cs          ← validates JWT + item-level SP permissions
        └── Azure APIM              ← subscription key + Azure AD validation
              └── Power Automate    ← service account bearer token
```

### Item-Level Permissions

SharePoint item-level security is **broken** (inheritance removed) when status transitions from **Draft → Legal Intake**. After that point:
- Submitters can view but not edit other users' requests
- Item-level permissions are managed by an Azure Function call
- Permission propagation may take a few seconds

### Key Security Invariants

1. **Terminal states are immutable** — no role (including Admin) can modify a Completed or Cancelled request at the service layer
2. **Assigned attorney check is strict** — attorney must be in the `assignedAttorney` array for this specific request, not just have the Attorney role
3. **Legal Admin cannot touch compliance** — by design, legal and compliance review boundaries are enforced even for Legal Admin
4. **Owner loses edit access at Closeout** — owner is read-only from Closeout onward regardless of role
5. **Resume requires Admin/Legal Admin** — owners can put on hold but cannot self-resume; prevents circumventing review
