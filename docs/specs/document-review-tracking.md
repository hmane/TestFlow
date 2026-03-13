# Document Review Tracking - Feature Spec

## Overview

Enable reviewers (Legal and Compliance) to indicate when they are actively reviewing a non-Office document (PDF, MSG, etc.), preventing conflicting edits and giving visibility into who is working on what.

Office documents (Word, Excel, PowerPoint) are excluded — they have built-in co-authoring via SharePoint Online.

## Problem

- Multiple reviewers (Legal + Compliance) work on the same request in parallel
- Non-Office files (PDFs, MSGs) don't support co-authoring
- No visibility into whether someone else is annotating the same PDF
- Risk of one reviewer's changes overwriting another's

## Solution

Use SharePoint's native checkout/checkin on the RequestDocuments library with user-friendly UI that hides the technical complexity. Prioritize proactive visibility near review actions over reactive blocking dialogs.

## Terminology

All UI labels use plain language — no "check out" / "check in" jargon.

| Technical Term | User-Facing Label |
|---|---|
| Check Out | **Start Reviewing** |
| Check In | **Done Reviewing** |
| Discard Checkout | **Stop Reviewing** |
| Checked out by current user | **You're reviewing this file** |
| Checked out by another user | **Being reviewed by [Name]** |
| Bulk Check In | **Mark All as Done** |

Note: "Cancel Review" is avoided because the app already has "Cancel Request" — users could conflate the two.

## Configuration

All behavior controlled via SharePoint Configuration list (configStore). When the master toggle is off, no new checkouts can be started and checkout enforcement is disabled. Files that are already checked out at the time the toggle is turned off remain releasable through the UI — see "Disabling the Feature" for the full toggle-off procedure.

| Config Key | Type | Default | Description |
|---|---|---|---|
| `EnableDocumentCheckout` | boolean | `false` | Master toggle. When off, no new checkouts can be started and no checkout enforcement occurs. Files that are already checked out remain releasable — see "Disabling the Feature". |
| `AutoCheckoutOnReplace` | boolean | `true` | When a user replaces an existing non-Office file, automatically mark it as "reviewing". Only applies when master toggle is on. |
| `CheckoutRequiredForTransition` | boolean | `true` | Enforce that files are marked "done reviewing" before status transitions. Only applies when master toggle is on. |

### Config provisioning needed

- Add keys to `ConfigKeys.ts`: `EnableDocumentCheckout`, `AutoCheckoutOnReplace`, `CheckoutRequiredForTransition`
- Add data rows to `Configuration.xml` under category `Features`
- All default to `false` / `true` / `true` respectively

## Applicable File Types

Review tracking applies to **non-Office files only**:

**Excluded (co-authoring built-in):**
`.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`

**Included (review tracking applies):**
`.pdf`, `.txt`, `.jpg`, `.jpeg`, `.png`, `.gif`, `.zip`, `.msg`, `.eml`, and any other non-Office extension

Helper function `isOfficeFile(filename)` determines which category a file falls into.

## UI Design

### Design Principles

1. **Proactive visibility** — show review status where users make decisions (near submit buttons), not just in the attachments card
2. **Compact card UI** — status badge + one primary action per card, not multiple full-width buttons
3. **Default to safety** — primary action for non-Office files is "Start Reviewing & Open" to prevent accidental collisions
4. **One-click resolution** — blocking dialogs always have a single primary action that resolves the issue
5. **Consistent primary action** — the primary (most prominent) button on each card always matches the most likely next step for that state

### 1. Document Card States

The current attachments UI is card-based (DocumentCard). Review status is shown as a compact badge on each card.

**Available (not being reviewed):**
```
+----------------------------------------------------------+
|  [icon] marketing-review.pdf                             |
|  12.3 MB  -  Uploaded Mar 5 by John Doe                  |
|                                                          |
|  [Start Reviewing & Open]  [... more: Open View Only]   |
+----------------------------------------------------------+
```
- **Split button**: Primary action = "Start Reviewing & Open" (marks file, then opens)
- Overflow/secondary = "Open View Only" (opens without marking)
- For Office files: single "Open" button (no review tracking options)

**Being reviewed by me:**
```
+----------------------------------------------------------+
|  [icon] marketing-review.pdf  [lock-blue] You're reviewing|
|  12.3 MB  -  Uploaded Mar 5 by John Doe                  |
|                                                          |
|  [Done Reviewing]  [... more: Open, Stop Reviewing]      |
+----------------------------------------------------------+
```
- Blue lock icon + blue "You're reviewing" badge (compact, inline)
- **Primary action: "Done Reviewing"** — because the most likely next step is finishing
- Overflow: "Open" (re-open the file), "Stop Reviewing" (undo without saving)
- "Stop Reviewing" shows a brief confirmation: "This will release the file without saving. Others will be able to start reviewing."

**Being reviewed by someone else:**
```
+----------------------------------------------------------+
|  [icon] marketing-review.pdf                             |
|  12.3 MB  -  Uploaded Mar 5 by John Doe                  |
|  [lock-amber] Being reviewed by Jane Doe (Compliance)    |
|               since Mar 6, 2:15 PM                       |
|                                        [Open View Only]  |
+----------------------------------------------------------+
```
- Amber lock icon + reviewer name with role context
- Timestamp for duration awareness
- Only "Open View Only" available
- See "Stale Review Escalation" section for aged reviews

#### Primary Action Summary

| File State | Primary Button | Overflow Actions |
|---|---|---|
| Available (no review) | **Start Reviewing & Open** | Open View Only |
| Being reviewed by me | **Done Reviewing** | Open, Stop Reviewing |
| Being reviewed by someone else | **Open View Only** | (none) |
| Office file | **Open** | (no review tracking) |

### 2. "Currently Being Reviewed" Section

For requests with many attachments, scanning inline badges is slow. When any files are being reviewed, a collapsible section appears **above** the normal document groups:

```
+----------------------------------------------------------+
| Currently Being Reviewed (2)                     [v]     |
|                                                          |
|  [lock-blue] marketing-review.pdf — You're reviewing    |
|              [Done Reviewing]                            |
|                                                          |
|  [lock-amber] compliance-notes.pdf — Jane Doe           |
|               since Mar 6, 2:15 PM                       |
+----------------------------------------------------------+
|                                                          |
| All Documents (8)                                        |
| ...                                                      |
+----------------------------------------------------------+
```

- Pinned at the top of the document list, always visible
- Groups files by "mine" first, then "others"
- Provides quick access to "Done Reviewing" without scrolling
- Collapses to a single line when empty

### 3. Review Awareness Near Submit Buttons

The Legal and Compliance review forms appear **above** the attachments card in the page layout. A reviewer can hit "Submit Review" before ever scrolling to attachments. To prevent surprise blocking dialogs:

**Inline warning near review submit buttons** (in LegalReviewForm and ComplianceReviewForm):

When current user has files marked as reviewing:
```
+----------------------------------------------------------+
| [lock-blue] You're reviewing 2 files.                    |
|             Finish reviewing before submitting.           |
|             [Mark All as Done]                            |
+----------------------------------------------------------+
| [Submit Review]  (disabled until files are done)          |
```

When other users have files marked as reviewing (informational only):
```
+----------------------------------------------------------+
| [info] 1 file is being reviewed by Jane Doe (Compliance) |
+----------------------------------------------------------+
| [Submit Review]  (enabled — not blocked by others)        |
```

This ensures reviewers see the status **before** clicking submit, rather than getting a surprise dialog after.

### 4. Reminder Banner in Attachments Card

Persistent banner at the top of the attachments card when current user has active reviews:

```
+-------------------------------------------------------+
| [lock] You're reviewing 2 files.  [Mark All as Done]  |
+-------------------------------------------------------+
```

- Always visible while user has active reviews
- One-click bulk action
- Info bar style, not a modal

### 5. File Replace / Re-upload Behavior

Enforcement happens in the **service/store layer** (`documentService.ts` and `documentsStore/store.ts`), not only in the UI component. The UI reflects the result from the service.

When `AutoCheckoutOnReplace` is `true`:

| Scenario | Behavior |
|---|---|
| Replacing a file I'm reviewing | Replace succeeds, stays marked as reviewing |
| Replacing a file someone else is reviewing | **Blocked at service layer**: returns error. UI shows: "Jane Doe is reviewing this file. Wait for her to finish before uploading changes." |
| Replacing a file nobody is reviewing | Auto-marks as reviewing, replaces file. Toast: "File updated. Click 'Done Reviewing' when finished." |
| Uploading a new file (not replacing) | Normal upload, no review marking |

When `AutoCheckoutOnReplace` is `false`:
- Replacing always succeeds (no blocking)
- No auto-marking on replace
- Review status unchanged

**Implementation note:** The replace-blocking check must live in the overwrite/replace flow in `documentService.ts` and `documentsStore/store.ts`, not only in `DocumentUpload.tsx`. The UI reads the error from the service and displays it. This prevents bypassing the check if upload is triggered from any other path.

## Stale Review Escalation

Reviews that run too long need explicit escalation, not just a passive timestamp.

### Time-Based States

| Duration | Visual Treatment | Actions Available |
|---|---|---|
| < 4 hours | Normal (blue/amber badge) | Standard actions |
| 4-24 hours | Amber text: "Started 6 hours ago" | Standard actions |
| 1-3 days | Warning text: "Started 2 days ago" | Standard actions + "Contact [Name]" link (mailto) |
| 3+ days | Red text: "Started 5 days ago — may be forgotten" | Standard actions + Admin: "Force Done Reviewing" |

### Admin Stale Review Management

Admins see an additional indicator in the attachments card header when any file has been in review for 3+ days:

```
+----------------------------------------------------------+
| [warning] 1 file has been in review for over 3 days      |
|           [View Details]                                  |
+----------------------------------------------------------+
```

Details view shows the stale files with admin-only "Force Done Reviewing" per file or bulk.

## Status Transition Rules

When `CheckoutRequiredForTransition` is `true`:

### Mid-Workflow Transitions (Complete Legal Review, Complete Compliance Review)

```
User clicks "Complete Review"
  |
  +-- Current user has files marked as reviewing?
  |   YES -> Block with dialog:
  |
  |   +--------------------------------------------------+
  |   | Complete Review                                   |
  |   |                                                   |
  |   | You're still reviewing these files:               |
  |   |                                                   |
  |   | [lock] marketing-review.pdf                       |
  |   | [lock] addendum-v2.pdf                            |
  |   |                                                   |
  |   | [Done Reviewing & Complete]        [Go Back]      |
  |   +--------------------------------------------------+
  |
  |   Primary action resolves everything in one click.
  |
  +-- Other users have files marked as reviewing?
  |   YES -> Info bar (lightweight, not a full modal):
  |
  |   +--------------------------------------------------+
  |   | [info] compliance-notes.pdf is being reviewed     |
  |   |        by Jane Doe (Compliance)                   |
  |   |                                                   |
  |   | [Complete Review]              [Go Back]          |
  |   +--------------------------------------------------+
  |
  |   Non-blocking — user can proceed.
  |
  +-- No files being reviewed -> Proceed normally
```

**Note:** Because the inline warning near the submit button (Section 3) disables the button when the user has active reviews, the blocking dialog is a safety net — most users will resolve via the inline CTA before clicking submit.

### Final Transition (Last review completes -> Closeout/Completed)

```
Last reviewer clicks "Complete Review" (triggers status change)
  |
  +-- Any files being reviewed by anyone?
  |   YES -> Block with dialog:
  |
  |   +--------------------------------------------------+
  |   | Complete Review                                   |
  |   |                                                   |
  |   | All files must be done reviewing before closing   |
  |   | this request.                                     |
  |   |                                                   |
  |   | Your files:                                       |
  |   | [lock] marketing-review.pdf                       |
  |   |        [Done Reviewing All Mine]                  |
  |   |                                                   |
  |   | Other reviewers:                                  |
  |   | [lock] compliance-notes.pdf — Jane Doe            |
  |   |        Contact jane.doe@company.com               |
  |   |                                                   |
  |   | [Force Done Reviewing All]  (Admin only)          |
  |   |                                                   |
  |   |                                    [Go Back]      |
  |   +--------------------------------------------------+
  |
  |   "My files" section first with one-click resolution.
  |   "Other files" section shows names + contact info.
  |   Admin override available for admins only.
  |
  +-- No files being reviewed -> Proceed to Closeout/Completed
```

**Rationale:** The final transition represents closure. All document work must be complete. "My files" are actionable; "other files" show contact info for coordination.

**Implementation note:** Pre-transition validation runs in `reviewActions.ts` via `validateDocumentCheckoutStatus()`, which calls the service layer. The service returns a structured result (own files, others' files) that the UI renders as described above.

## SharePoint API

All operations use native SharePoint REST API via PnPjs. No Azure Functions required.

```typescript
// Mark as reviewing (checkout)
SPContext.sp.web.getFileByServerRelativePath(fileUrl).checkout()

// Done reviewing (checkin) - major version
SPContext.sp.web.getFileByServerRelativePath(fileUrl).checkin("Review complete", 1)

// Stop reviewing (undo checkout)
SPContext.sp.web.getFileByServerRelativePath(fileUrl).undoCheckout()

// Get review status (query with document items)
.select('Id', 'FileLeafRef', 'FileRef', 'File/CheckOutType',
        'File/CheckedOutByUser/Title', 'File/CheckedOutByUser/EMail',
        'File/CheckedOutDate')
.expand('File', 'File/CheckedOutByUser')
```

### CheckOutType Values
- `0` = None (not being reviewed)
- `1` = Online (checked out in browser)
- `2` = Offline (checked out to local)

## Type Changes

### Affected interfaces

Checkout metadata is owned by two layers:

1. **SharePoint raw data** — `IDocumentListItem` in `documentTypes.ts` (already has `CheckOutType: number`)
   - Add: `CheckedOutByUser` (expanded user object), `CheckedOutDate`

2. **Normalized app model** — `IRequestDocument` in `documentTypes.ts` (already has `checkOutType?: number`)
   - Add: `checkedOutByName`, `checkedOutByEmail`, `checkedOutDate`

The **service layer** (`documentService.ts`) maps from `IDocumentListItem` to `IRequestDocument`. The **store** (`documentsStore`) holds `IRequestDocument[]`. The **UI** reads from the store.

### IDocumentListItem changes (SharePoint raw)

```typescript
// Already exists:
CheckOutType: number;

// Add:
CheckedOutByUser?: {
  Title: string;
  EMail: string;
};
CheckedOutDate?: string;
```

### IRequestDocument changes (normalized)

```typescript
// Already exists:
checkOutType?: number;

// Add:
checkedOutByName?: string;
checkedOutByEmail?: string;
checkedOutDate?: string;  // ISO date string
```

### Mapping in documentService.ts

The normalization path in `documentService.ts` that maps `IDocumentListItem` to `IRequestDocument` adds:
```typescript
checkedOutByName: item.CheckedOutByUser?.Title,
checkedOutByEmail: item.CheckedOutByUser?.EMail,
checkedOutDate: item.CheckedOutDate,
```

## Disabling the Feature

Toggling `EnableDocumentCheckout` to `false` while files are actively in review needs careful handling. Hiding the UI while leaving real SharePoint checkouts in place would strand locks invisibly.

### Implemented Behavior: Graceful recovery

The toggle can be set to `false` at any time via the SharePoint Configuration list. The system handles the transition as follows:

**When `EnableDocumentCheckout = false`:**
- No new checkouts can be started (`Start Reviewing` is fully hidden)
- No checkout enforcement occurs on upload or status transitions
- Documents that are **already checked out** continue to show their checkout status badge and `Done Reviewing` / `Stop Reviewing` buttons until all locks are released
- Once all active checkouts are released, the review-tracking UI disappears entirely

**Why not the strict "reject toggle" approach (original v1 design):**

The strict approach requires either an admin-facing validation UI or a server-side config-write interceptor. Since the Configuration list is edited directly as a SharePoint list item (no custom form), there is no client-side intercept point. The graceful recovery approach achieves the same safety guarantee — no lock is ever truly stranded — without needing to gate the config write itself.

**Recommended toggle-off procedure for admins:**
1. Notify active reviewers to finish reviewing and mark files as done
2. Set `EnableDocumentCheckout = false` in the Configuration list
3. Any user who still has files checked out will continue to see Done/Stop controls until they release their locks
4. Once all locks are cleared, the feature is fully off with no visible trace

## Implementation Plan

### Phase 1: Config & Service Layer
- Add config keys to `ConfigKeys.ts` and data rows to `Configuration.xml`
- `documentCheckoutService.ts` — checkout, checkin, undo, bulk operations, status queries
- Enforce replace-blocking in `documentService.ts` and `documentsStore/store.ts` (not just UI)
- Pre-transition validation: `validateDocumentCheckoutStatus()` in service layer
- Helper: `isOfficeFile(filename)` to determine if review tracking applies
- Helper: `getCheckoutStatus(requestId)` to get all file statuses for a request
- Helper: `getStaleReviewThreshold(checkedOutDate)` for escalation states
- Update `IDocumentListItem` and `IRequestDocument` in `documentTypes.ts`
- Update `mapToRequestDocument()` in `documentService.ts` to include checkout fields
- Update document query `.select()` / `.expand()` to include `CheckedOutByUser`, `CheckedOutDate`

### Phase 2: Document Card UI
- Update `DocumentCard.tsx` with review status badge (compact, inline)
- Split button: primary action per state (see "Primary Action Summary" table)
- "Done Reviewing" and "Stop Reviewing" actions
- "Currently Being Reviewed" pinned section in `RequestDocuments.tsx`
- Stale review visual escalation (amber -> red based on duration)

### Phase 3: Review Form Integration
- Inline warning near submit buttons in `LegalReviewForm.tsx` and `ComplianceReviewForm.tsx`
- Disable submit when current user has active reviews (with "Mark All as Done" CTA)
- Info bar for other users' active reviews (non-blocking)
- Reminder banner in attachments card

### Phase 4: Workflow Transition Enforcement
- Wire `validateDocumentCheckoutStatus()` into `reviewActions.ts` pre-transition hooks
- Blocking dialog for own files (with "Done Reviewing & Complete" one-click)
- Info bar for others' files (mid-workflow, non-blocking)
- Final transition: block all, grouped by reviewer
- Admin force-finish capability

### Phase 5: File Replace Integration & Polish
- Wire replace-blocking from service layer into `DocumentUpload.tsx` error display
- Strict toggle guard: reject `EnableDocumentCheckout = false` while active checkouts exist
- v2 consideration: Auto-start-reviewing user preference (localStorage)

## Accessibility

- Lock icons have `aria-label` describing the review state (e.g., "File being reviewed by Jane Doe since March 6")
- Badge text is screen-reader accessible (not icon-only)
- Action buttons have clear `aria-label` (e.g., "Done reviewing marketing-review.pdf")
- Split button is keyboard accessible: Enter activates primary, arrow key opens overflow
- Blocking dialogs use `role="alertdialog"` with `aria-describedby`
- Info bars use `role="status"` with `aria-live="polite"`
- Inline warnings near submit buttons use `role="alert"` with `aria-live="assertive"`
- Keyboard navigation: Tab through file actions, Enter/Space to activate
- Stale review warnings are conveyed via `aria-label`, not just color

## Edge Cases

| Scenario | Handling |
|---|---|
| User closes browser while reviewing | File stays marked as reviewing (server-side). Reminder banner and inline warning show next time they open the request. |
| File deleted while someone is reviewing | SharePoint handles this — checkout is released when file is deleted. |
| Config toggled off while files are being reviewed | Toggle is rejected — admin must release all review locks first (see "Disabling the Feature"). |
| User loses permissions to file | SharePoint API returns 403. Show: "You no longer have access to this file." |
| Network error during Done Reviewing | Retry with error message. File stays marked as reviewing until successful. |
| Multiple files being reviewed, user clicks "Mark All as Done" | Sequential checkin with progress indicator. If one fails, continue with others and report which failed. |
| Reviewer is out of office with files in review | Stale escalation shows warning after 3+ days. Admin can force-finish. Contact link provided for coordination. |
| Concurrent "Start Reviewing" by two users | SharePoint checkout is atomic — first user wins, second gets error. Show: "This file was just marked as reviewing by [Name]." Refresh file list. |
