# Merge Plan: `feature/document-review-tracking` → `main`

**Branch:** `feature/document-review-tracking`
**Target:** `main`
**Merge base commit:** `03b0cd80`
**Strategy:** Manual integration (no `git merge`) to preserve all main branch changes
**Date started:** 2026-03-12

---

## Overview

The `feature/document-review-tracking` branch adds a checkout/checkin workflow for PDF and non-Office file review tracking. The entire feature is gated by the `EnableDocumentCheckout` config flag (default: `false`), so it is safe to deploy without activating it.

**What it adds:**
- SharePoint native checkout/checkin used as a "start reviewing / done reviewing" mechanism for non-Office files
- Review status badges and icon-button actions on each DocumentCard
- Inline warnings in LegalReviewForm and ComplianceReviewForm when files are still checked out
- Submit/transition blocking when `CheckoutRequiredForTransition = true`
- `CheckoutValidationDialog` safety-net component
- File replace blocking for checked-out documents
- Service-layer mutation guards (rename, delete, type-change)
- 3 config flags in SharePoint Configuration list

---

## Config Flags

| Key | XML Default | Description |
|-----|------------|-------------|
| `EnableDocumentCheckout` | `false` | Master switch — entire feature is dormant until `true` |
| `AutoCheckoutOnReplace` | `true` | Auto-marks file as reviewing on replace; blocked if someone else is reviewing |
| `CheckoutRequiredForTransition` | `true` | Blocks review completion / closeout while files still checked out |

All flags only activate when `EnableDocumentCheckout = true`, so deploying to main with the default is zero-risk.

---

## Conflict Analysis

Main has moved **13 commits** ahead of the merge base. Three files were modified by both branches:

| File | Conflict Nature |
|------|----------------|
| `LegalReviewForm.tsx` | Feature adds checkout hooks + JSX; main added `useUIVisibility` permission refactor |
| `ComplianceReviewForm.tsx` | Same as LegalReviewForm — parallel structure |
| `useDocumentUploadState.ts` | Feature adds file-replace blocking; main made small changes in `c436a80` |

All other 16 files changed by the feature have **no overlap** with main changes since the merge base.

---

## Implementation Phases

### Phase 1 — New files (direct copy, zero conflict risk)

- [x] `src/services/documentCheckoutService.ts`
- [x] `src/components/CheckoutValidationDialog/CheckoutValidationDialog.tsx`
- [x] `src/components/CheckoutValidationDialog/index.ts`
- [x] `src/services/workflow/reviewActions.ts`
- [x] `docs/specs/document-review-tracking.md`

### Phase 2 — Additive changes to existing files (no main overlap)

- [x] `src/sp/ConfigKeys.ts` — add 3 new config key constants
- [x] `src/stores/documentsStore/types.ts` — add checkout-related fields
- [x] `src/types/documentTypes.ts` — add checkout type fields
- [x] `provisioning/Lists/Configuration.xml` — add 3 config rows
- [x] `src/components/DocumentUpload/DocumentUploadTypes.ts` — add checkout props
- [x] `src/components/DocumentUpload/DocumentUpload.tsx` — pass checkout props through
- [x] `src/components/DocumentUpload/DocumentUpload.scss` — checkout badge styles
- [x] `src/components/DocumentUpload/DocumentCard.tsx` — checkout badges + action buttons
- [x] `src/extensions/legalWorkflow/components/RequestDocuments/RequestDocuments.tsx` — checkout integration
- [x] `src/extensions/legalWorkflow/components/RequestDocuments/RequestDocuments.scss` — checkout styles
- [x] `src/services/documentService.ts` — checkout mutation guards

### Phase 3 — Manual merge of conflicting files

- [x] `src/components/DocumentUpload/hooks/useDocumentUploadState.ts`
- [x] `src/extensions/legalWorkflow/components/LegalReviewForm/LegalReviewForm.tsx`
- [x] `src/extensions/legalWorkflow/components/ComplianceReviewForm/ComplianceReviewForm.tsx`

### Phase 4 — Validation

- [x] `npx tsc --noEmit` — TypeScript passes with zero errors
- [ ] Smoke check: feature inactive with `EnableDocumentCheckout = false` (no visible UI changes, except release controls still visible for already-checked-out files)
- [ ] Smoke check: feature active with `EnableDocumentCheckout = true` (badges and blocking visible)

---

## Bug Fixes Applied During Integration

Four issues found during code review were fixed before finalising the merge:

### Fix 1 (High): Stranded checkouts when `EnableDocumentCheckout` is toggled off
**Files:** `documentCheckoutService.ts`, `DocumentUpload.tsx`

The original spec described a "strict toggle" — reject the config change if active checkouts exist. This is not enforceable client-side because the Configuration list is edited as a raw SharePoint list item with no custom form to intercept. The implementation uses a **graceful recovery** approach instead, which achieves the same safety guarantee without needing to gate the config write.

`validateReviewableDocument` now only gates `start` operations on the feature flag. `done`/`stop` skip the check so users can always release their locks regardless of config state.

`getCheckoutStatusForDoc` in `DocumentUpload.tsx` now returns checkout status (and renders Done/Stop buttons) for documents that are already checked out, even when the feature is disabled — they disappear once the lock is released.

**The spec (`docs/specs/document-review-tracking.md` — "Disabling the Feature" section) has been updated to reflect this design decision.**

### Fix 2 (Medium): Replace blocking ignored `AutoCheckoutOnReplace = false`
**Files:** `documentService.ts`, `useDocumentUploadState.ts`

Both the service-layer overwrite guard and the upload-state duplicate path were gated on `isDocumentCheckoutEnabled()`. Per spec, replace blocking must only apply when `AutoCheckoutOnReplace` is enabled. Changed both to `isAutoCheckoutOnReplaceEnabled()`, which already handles the master-switch dependency internally.

### Fix 3 (Medium): Closeout validation wrapped business error as infrastructure error
**File:** `reviewActions.ts` (both `submitLegalReview` and `submitComplianceReview`)

The `try/catch` around the checkout validation caught both the "documents are still being reviewed" business error and genuine SP load failures, then re-wrapped both as "unable to verify document review status". This hid the real user-facing message. Fixed by separating the SP load call (wrapped for infrastructure errors) from the business check (re-thrown directly).

### Fix 4 (Medium): Failed "Start Reviewing" left stale checkout state in UI
**File:** `DocumentUpload.tsx`

When `handleStartReviewing` failed (e.g. another user got the checkout first), the document list was not reloaded. The losing user would continue to see an "available" card until a manual page refresh. Added `loadDocumentsFromStore` call in the failure path.

---

## Notes

- The working branch for this integration is `main` (changes applied directly)
- Each phase is committed separately for clean history
- `LegalReviewForm` and `ComplianceReviewForm` are nearly mirror images — changes applied symmetrically

## Known Gaps / Follow-up

- No automated tests currently cover the document checkout flows (`startReviewing`, `doneReviewing`, `stopReviewing`, bulk completion, transition gating, or replace/collision handling).
- `npx tsc --noEmit` passes, but checkout behavior is still relying on manual verification.
- This is a follow-up quality gap to track after merge, not a blocker for merging the feature.
