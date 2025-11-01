# Document Upload Integration - Implementation Status

## ✅ Completed Components

### 1. **DocumentUpload Component Suite** (11 files)
All files built and compiled successfully with ES5 compatibility:

- `src/components/DocumentUpload/DocumentUpload.tsx` (707 lines) - Main component
- `src/components/DocumentUpload/DocumentCard.tsx` (282 lines) - Compact card display
- `src/components/DocumentUpload/DocumentGroup.tsx` (251 lines) - Grouped sections
- `src/components/DocumentUpload/DocumentTypeDialog.tsx` (173 lines) - Type selection popup
- `src/components/DocumentUpload/DuplicateFileDialog.tsx` (148 lines) - Duplicate handling
- `src/components/DocumentUpload/UploadProgressDialog.tsx` (250 lines) - Upload progress with retry
- `src/components/DocumentUpload/DocumentUploadTypes.ts` (206 lines) - TypeScript interfaces
- `src/components/DocumentUpload/DocumentUpload.scss` (296 lines) - Complete styling
- `src/stores/documentsStore.ts` (598 lines) - Zustand store for all documents
- `src/services/documentService.ts` (490 lines) - SharePoint operations
- `src/components/DocumentUpload/index.ts` - Exports

**Features:**
- Two modes: Approval (single type) and Attachment (Review/Supplemental grouping)
- Drag-and-drop file upload and type switching
- Duplicate detection with overwrite/skip dialog
- Upload progress tracking with 2 auto-retries + manual retry/skip
- Visual indicators: NEW, PENDING, deleted states with badges
- Compact 3-line card design with UserPersona and relative timestamps
- DocumentLink integration for version history and hover cards
- ES5 compatible (all Array.from(), .find(), .includes() converted)

### 2. **Integration Components**

#### A. RequestDocuments Component
**File:** `src/extensions/legalWorkflow/components/RequestDocuments/RequestDocuments.tsx`

**Features:**
- Wrapper for DocumentUpload in Attachment mode
- Smart collapse based on status and role
- Read-only logic:
  - Submitters: Read-only during review, editable when "Waiting on Submitter"
  - Attorneys/Compliance: Always editable during their review
  - Admins: Always editable
- Enhanced collapsed header showing document counts

**Status:** ✅ Created and ready

#### B. SubmitterResponse Component
**File:** `src/extensions/legalWorkflow/components/SubmitterResponse/SubmitterResponse.tsx`

**Features:**
- Shown only when Legal or Compliance status = "Waiting on Submitter"
- Displays reviewer notes explaining what's needed
- Shows "Send to Attorney" / "Send to Compliance" buttons
- Supports parallel review (both buttons shown if both waiting)
- Optional submitter response notes field

**Status:** ✅ Created and ready

#### C. LegalReviewForm Updates
**File:** `src/extensions/legalWorkflow/components/LegalReviewForm/LegalReviewForm.tsx`

**Changes Made:**
- ✅ Removed status dropdown (automatic status management)
- ✅ Added action button handlers: `handleApprove`, `handleApproveWithComments`, `handleNotApproved`, `handleSendToSubmitter`
- ✅ Conditional button rendering based on status:
  - **WaitingOnAttorney**: Shows "Approve", "Approve with Comments", "Not Approved", "Send to Submitter"
  - **WaitingOnSubmitter**: Shows read-only message + "Save Progress" only
- ✅ Color-coded buttons (green for approve, red for not approved, orange for send to submitter)

**Status:** ✅ Updated with conversational workflow

## 🔄 Remaining Implementation Steps

### 3. **ComplianceReviewForm Updates** (Same pattern as LegalReviewForm)
**File:** `src/extensions/legalWorkflow/components/ComplianceReviewForm/ComplianceReviewForm.tsx`

**Required Changes:**
- Remove status dropdown
- Add action handlers: `handleApprove`, `handleApproveWithComments`, `handleNotApproved`, `handleSendToSubmitter`
- Conditional button rendering based on `complianceReviewStatus`
- Same button layout and colors as Legal Review

### 4. **FormSection Component Enhancement**
**File:** `src/extensions/legalWorkflow/components/FormSection/FormSection.tsx` (NEW)

**Purpose:** Centralize the collapsible card section pattern used across forms

**Features Needed:**
- Support for `collapsedSummary` prop (JSX or string)
- Rich collapsed header with UserPersona, dates, status badges
- Auto-expand/collapse based on `defaultCollapsed` prop

**Example Usage:**
```tsx
<FormSection
  title="Legal Intake"
  icon="Assign"
  collapsible={true}
  defaultCollapsed={true}
  collapsedSummary={
    <Stack horizontal tokens={{ childrenGap: 8 }}>
      <Text>Completed by</Text>
      <UserPersona userIdentifier={completedBy} size={24} />
      <Text>on {completedDate}</Text>
      <Text>• Attorney: {attorney}</Text>
    </Stack>
  }
>
  {/* Content */}
</FormSection>
```

### 5. **RequestContainer Orchestration**
**File:** `src/extensions/legalWorkflow/components/RequestContainer/RequestContainer.tsx`

**Required Changes:**

**A. Update InReview Render:**
```tsx
if (status === RequestStatus.InReview) {
  return (
    <WorkflowFormWrapper itemId={itemId}>
      <RequestSummary defaultCollapsed={true} />
      <RequestApprovals defaultCollapsed={true} />

      {/* NEW: Submitter Response */}
      {isSubmitter && isWaitingOnSubmitter && (
        <SubmitterResponse
          itemId={itemId}
          legalReviewStatus={legalReviewStatus}
          complianceReviewStatus={complianceReviewStatus}
          legalReviewNotes={legalReviewNotes}
          complianceReviewNotes={complianceReviewNotes}
          onSendToAttorney={handleReturnToAttorney}
          onSendToCompliance={handleReturnToCompliance}
        />
      )}

      {/* Legal Review - Collapsed if not attorney or if waiting on submitter */}
      <LegalReviewForm defaultCollapsed={!isAttorney || legalStatus === 'WaitingOnSubmitter'} />

      {/* Compliance Review - Collapsed if not compliance or if waiting on submitter */}
      <ComplianceReviewForm defaultCollapsed={!isComplianceUser || complianceStatus === 'WaitingOnSubmitter'} />

      {/* NEW: Attachments - Always visible */}
      <RequestDocuments itemId={itemId} />

      <RequestActions />
    </WorkflowFormWrapper>
  );
}
```

**B. Add Auto-Scroll Logic:**
```tsx
React.useEffect(() => {
  if (status === RequestStatus.InReview) {
    if (isAttorney && legalReviewStatus === LegalReviewStatus.WaitingOnAttorney) {
      document.getElementById('section-legal-review')?.scrollIntoView({ behavior: 'smooth' });
    } else if (isComplianceUser && complianceReviewStatus === ComplianceReviewStatus.WaitingOnCompliance) {
      document.getElementById('section-compliance-review')?.scrollIntoView({ behavior: 'smooth' });
    } else if (isSubmitter && (isWaitingOnSubmitter)) {
      document.getElementById('submitter-response-card')?.scrollIntoView({ behavior: 'smooth' });
    }
  }
}, [status, isAttorney, isComplianceUser, isSubmitter, legalReviewStatus, complianceReviewStatus]);
```

### 6. **RequestStore Actions**
**File:** `src/stores/requestStore.ts`

**New Actions Needed:**
```typescript
// Send to submitter (Legal)
sendToSubmitterLegal: async (requestId: number, notes: string) => {
  // Update legalReviewStatus to WaitingOnSubmitter
  // Save notes
  // Send notification to submitter
}

// Send to submitter (Compliance)
sendToSubmitterCompliance: async (requestId: number, notes: string) => {
  // Update complianceReviewStatus to WaitingOnSubmitter
  // Save notes
  // Send notification to submitter
}

// Return to attorney
returnToAttorney: async (requestId: number, submitterNotes?: string) => {
  // Update legalReviewStatus to WaitingOnAttorney
  // Save submitter notes
  // Send notification to attorney
}

// Return to compliance
returnToCompliance: async (requestId: number, submitterNotes?: string) => {
  // Update complianceReviewStatus to WaitingOnCompliance
  // Save submitter notes
  // Send notification to compliance user
}

// Update legal review (Approve/Not Approved)
updateLegalReview: async (requestId: number, outcome: ReviewOutcome, notes: string) => {
  // Update legalReviewStatus to Completed
  // Update legalReviewOutcome
  // Save notes
  // Check if both reviews complete → move to Closeout
}

// Update compliance review
updateComplianceReview: async (requestId: number, outcome: ReviewOutcome, notes: string) => {
  // Update complianceReviewStatus to Completed
  // Update complianceReviewOutcome
  // Save notes
  // Check if both reviews complete → move to Closeout
}
```

### 7. **RequestFormContext Enhancements**
**File:** `src/contexts/RequestFormContext.tsx`

**Add to Context:**
```typescript
export interface IRequestFormContext {
  // ... existing props
  legalReviewStatus?: LegalReviewStatus;
  complianceReviewStatus?: ComplianceReviewStatus;
  legalReviewNotes?: string;
  complianceReviewNotes?: string;
}
```

### 8. **Validation Updates**
**File:** `src/schemas/requestSchema.ts`

**Add Attachment Validation:**
```typescript
// Only require attachments on submit from Draft (not on save draft)
.refine((data) => {
  if (data.status === RequestStatus.Draft) {
    return true; // No validation on draft
  }
  // On submit, require at least 1 attachment
  return data.attachments && data.attachments.length > 0;
}, {
  message: 'At least one attachment is required',
  path: ['attachments'],
});
```

## 📋 Testing Checklist

### Workflow Testing:
- [ ] Draft: Upload attachments (editable)
- [ ] Submit to Legal Intake: Attachments become read-only for submitter
- [ ] Legal Review: Attorney can edit attachments
- [ ] Attorney sends to submitter: Status → "Waiting on Submitter", attachments editable for submitter
- [ ] Submitter adds documents, sends to attorney: Status → "Waiting on Attorney", attachments read-only again
- [ ] Attorney approves: Status → "Completed"
- [ ] Parallel review: Both Legal and Compliance can send to submitter simultaneously
- [ ] Admin: Always has edit access

### UI Testing:
- [ ] Collapsed headers show correct metadata and document counts
- [ ] Auto-scroll works for each role (attorney → legal review, compliance → compliance review)
- [ ] Action buttons show correct colors and states
- [ ] "Waiting on Submitter" message displays correctly
- [ ] SubmitterResponse card shows only when appropriate
- [ ] DocumentUpload modes work (Approval vs Attachment)
- [ ] Drag-and-drop type switching works (Review ↔ Supplemental)

### Data Testing:
- [ ] Documents save to correct folders (RequestDocuments/{ItemID}/ for attachments)
- [ ] Status transitions save correctly
- [ ] Notes save correctly
- [ ] Notifications sent on status changes

## 🎯 Quick Integration Guide

### For ComplianceReviewForm:
1. Copy the button handler pattern from LegalReviewForm (lines 206-274)
2. Replace "Legal" with "Compliance" in all handler names
3. Update the status-based button rendering (lines 471-611)
4. Test with compliance user role

### For RequestContainer:
1. Import new components: RequestDocuments, SubmitterResponse
2. Add conditional rendering logic based on role and status
3. Implement auto-scroll useEffect
4. Test with different user roles and statuses

### For RequestStore:
1. Add the 6 new action methods
2. Implement SharePoint update logic using SPContext
3. Add notification triggers
4. Test status transitions

## 📝 Additional Notes

### Form Header Enhancement (User Request):
- Left side: Form heading
- Right side: ManageAccess component from spfx-toolkit
- Icon button next to ManageAccess to collapse/expand comments drawer

This can be implemented as a separate `FormHeader` component and added to all workflow forms.

### Build Status:
- ✅ All TypeScript errors resolved
- ✅ ES5 compatibility verified
- ✅ Build completed successfully (9.5s)

## 🚀 Next Steps Priority

1. **High Priority:**
   - Update ComplianceReviewForm (same pattern as Legal)
   - Update RequestContainer orchestration
   - Add RequestStore actions
   - Test workflow end-to-end

2. **Medium Priority:**
   - Create centralized FormSection component
   - Add attachment validation
   - Implement form header with ManageAccess

3. **Low Priority (Enhancement):**
   - Add audit trail for document uploads (who uploaded, when, during which stage)
   - Add download all functionality
   - Add version history for attachments
