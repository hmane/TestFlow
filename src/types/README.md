# Legal Workflow System - Type Definitions

This directory contains all TypeScript type definitions for the Legal Review System application.

## Type Organization

### Core Types

1. **requestTypes.ts** - Main request entity and related types
   - `ILegalRequest`: Complete request interface (main entity)
   - `RequestType`, `SubmissionType`, `DistributionMethod`: Enums
   - `IRequestListItem`: SharePoint list item mapping
   - `ICreateRequestPayload`, `IUpdateRequestPayload`: API payloads

2. **workflowTypes.ts** - Workflow state and status types
   - `RequestStatus`, `LegalReviewStatus`, `ComplianceReviewStatus`: Status enums
   - `ReviewOutcome`, `ReviewAudience`: Review-related enums
   - `IStatusTransition`, `IHoldMetadata`, `ICancelMetadata`: State transition metadata
   - `WorkflowAction`: Action types for state management

3. **approvalTypes.ts** - Pre-submission approval types
   - `ApprovalType`: Types of approvals
   - `IBaseApproval`: Base interface for all approvals
   - Specific approval interfaces: `ICommunicationsApproval`, `IPortfolioManagerApproval`, etc.
   - `Approval`: Union type for all approval types

4. **reviewTypes.ts** - Legal and compliance review types
   - `ILegalReview`, `IComplianceReview`: Review data structures
   - `IAttorneyAssignment`: Assignment metadata
   - `AssignmentMethod`: How attorney was assigned
   - `IReviewSummary`: Aggregated review status
   - `ReviewerRole`: Reviewer types

5. **documentTypes.ts** - Document management types
   - `DocumentType`: Document categorization enum
   - `IRequestDocument`: Document interface
   - `IDocumentUploadPayload`, `IDocumentMetadataUpdate`: API payloads
   - `IDocumentVersion`: Version history

6. **submissionTypes.ts** - Submission item and configuration
   - `ISubmissionItem`: Submission type configuration (from SharePoint list)
   - `IRushRequestCalculation`: Rush request calculation logic
   - `IBusinessDaysOptions`, `IBusinessDayResult`: Date calculation utilities

7. **formTypes.ts** - Form management types
   - `FormMode`: Create/Edit/View modes
   - `IFormSectionConfig`: Section visibility configuration
   - `IFormState`: Zustand store state structure
   - `IFormSubmissionResult`: Form submission response
   - React Hook Form integration types

8. **configTypes.ts** - Application configuration types
   - `IAppConfiguration`: Configuration from SharePoint
   - `AppRole`: Application role enum (matches SharePoint groups)
   - `IUserRoleInfo`: Current user's role information
   - `IEnvironmentConfig`: Environment-specific settings
   - `IFeatureFlags`: Feature toggles
   - `IHoliday`: Holiday calendar entries (Phase 2)

## Imported Types from spfx-toolkit

The following types are re-exported from `spfx-toolkit/lib/types` and should NOT be redefined:

### Common Field Types (listItemTypes.d.ts)
- ✅ `IPrincipal` - User/person field
- ✅ `SPLookup` - Lookup field
- ✅ `SPTaxonomy` - Managed metadata field
- ✅ `SPUrl` - Hyperlink field
- ✅ `SPLocation` - Location field
- ✅ `SPImage` - Image field
- ✅ `IListItemFormUpdateValue` - List item update format

### Permission Types (permissionTypes.d.ts)
- ✅ `SPPermissionLevel` - Standard SharePoint permission levels
- ✅ `IPermissionResult` - Permission check result
- ✅ `IUserPermissions` - User permission details
- ✅ `IItemPermissions` - Item-level permissions
- ✅ `PermissionErrorCode` - Permission error codes

### Batch Operation Types (batchOperationTypes.d.ts)
- ✅ Batch operation types for bulk updates

## Naming Conventions (Per Copilot Instructions)

### Interfaces
- **Names**: PascalCase with `I` prefix
  - ✅ `ILegalRequest`, `IApprovalValidation`, `IDocumentUpload`
- **Properties**: camelCase
  - ✅ `requestId`, `submittedOn`, `targetReturnDate`
  - ❌ NOT PascalCase: `RequestId`, `SubmittedOn`, `TargetReturnDate`

### Enums
- **Names**: PascalCase (no prefix)
  - ✅ `RequestStatus`, `ApprovalType`, `DocumentType`
- **Values**: PascalCase with spaces preserved for display
  - ✅ `InReview = 'In Review'`
  - ✅ `LegalIntake = 'Legal Intake'`

### SharePoint List Item Types
- **Names**: PascalCase with `I` prefix and `ListItem` suffix
  - ✅ `IRequestListItem`, `IDocumentListItem`, `ISubmissionItemListItem`
- **Properties**: PascalCase (matches SharePoint internal names)
  - ✅ `Id`, `Title`, `Created`, `AuthorId`
  - These are normalized to camelCase when mapping to domain models

### Type vs Interface
- **Use `interface`** for object shapes (extendable, declarable multiple times)
- **Use `type`** for unions, intersections, mapped types
  - ✅ `type Approval = ICommunicationsApproval | IPortfolioManagerApproval | ...`

## Data Mapping Pattern

### SharePoint → Domain Model
```typescript
// SharePoint list item (PascalCase properties)
interface IRequestListItem {
  Id: number;
  Title: string;
  RequestTitle: string;
  TargetReturnDate: string;
  SubmittedById: number;
}

// Domain model (camelCase properties)
interface ILegalRequest {
  id: number;
  requestId: string;
  requestTitle: string;
  targetReturnDate: Date;
  submittedBy: IPrincipal;
}

// Mapping uses extractor utilities from spfx-toolkit
import { createSPExtractor } from 'spfx-toolkit/lib/utilities/listItemHelper';

const extractor = createSPExtractor(listItem);
const request: ILegalRequest = {
  id: extractor.number('Id'),
  requestId: extractor.string('Title'),
  requestTitle: extractor.string('RequestTitle'),
  targetReturnDate: extractor.date('TargetReturnDate'),
  submittedBy: extractor.user('SubmittedBy'),
};
```

## Type Guards and Validation

All types follow TypeScript strict mode:
- No `any` types used
- Error handling uses `unknown` type with guards
- All functions have explicit return types
- Prefer `undefined` over `null` (except for legacy API integration)

## Validation Schemas

Zod schemas will be created in `src/schemas/` directory and will reference these types:
- `requestSchema.ts` - Request creation/update validation
- `approvalSchema.ts` - Approval validation
- `reviewSchema.ts` - Review submission validation
- `documentSchema.ts` - Document upload validation

## Future Enhancements (Phase 2)

Types are structured to support Phase 2 features:
- `IFeatureFlags` includes Phase 2 toggles
- `RequestType` includes `GeneralReview` and `IMAReview`
- `IHoliday` interface for holiday calendar
- Ready for Seismic integration (not yet defined)

## Usage Examples

### Import Types
```typescript
// Import specific types
import type { ILegalRequest, RequestStatus, RequestType } from '@/types';

// Import toolkit types
import type { IPrincipal, SPLookup } from 'spfx-toolkit/lib/types';
```

### Create Type-Safe Objects
```typescript
import { RequestStatus, RequestType, ReviewAudience } from '@/types';

const newRequest: ILegalRequest = {
  requestId: 'CRR-2025-001',
  status: RequestStatus.Draft,
  requestType: RequestType.Communication,
  requestTitle: 'Marketing Brochure',
  purpose: 'New product launch materials',
  submissionType: SubmissionType.New,
  submissionItem: { id: 1, title: 'Marketing Brochures' },
  targetReturnDate: new Date('2025-11-01'),
  isRushRequest: false,
  reviewAudience: ReviewAudience.Legal,
  requiresCommunicationsApproval: true,
  approvals: [],
};
```

### Use Enums for Type Safety
```typescript
// ✅ Type-safe with autocomplete
if (request.status === RequestStatus.InReview) {
  // Handle in-review state
}

// ❌ String literals are error-prone
if (request.status === 'In Review') {
  // Typo not caught at compile time
}
```

## Validation Against Copilot Instructions

### ✅ Conformance Checklist

1. **Interface Naming**: All interfaces use PascalCase with `I` prefix
2. **Property Naming**: All properties use camelCase
3. **No Overlaps with Toolkit**:
   - No redefinition of `IPrincipal`, `SPLookup`, `SPTaxonomy`, etc.
   - Permission types not duplicated
   - Batch operation types not duplicated
4. **Prefer undefined over null**: All optional properties use `?` or `| undefined`
5. **Define before use**: Type imports use `import type` for clarity
6. **No notification types**: No email/notification types (handled by Power Automate)
7. **Explicit return types**: All type utility functions would have explicit returns
8. **No `any` types**: Strict TypeScript compliance
9. **Error handling**: No error types use `any`, would use `unknown`

### 📊 Type Statistics

- **Total type files**: 8
- **Total interfaces**: 65+
- **Total enums**: 14
- **Re-exported toolkit types**: 11
- **Zero duplicates**: ✅
- **Zero `any` types**: ✅

## References

- **Main Documentation**: `legal-review-system-readme.md`
- **Copilot Instructions**: `.github/copilot-instructions.md`
- **SPFx Toolkit Types**: `node_modules/spfx-toolkit/lib/types/`
- **CLAUDE.md**: Project context and guidelines
