# Legal Workflow System - Zod Validation Schemas

This directory contains all Zod validation schemas for the Legal Review System application.

## Overview

Zod schemas provide runtime type validation and TypeScript type inference. They are used with React Hook Form for comprehensive form validation.

## Schema Files

### 1. Approval Schemas (`approvalSchema.ts`)

**Purpose**: Validate approval data before submission

**Schemas**:
- `communicationsApprovalSchema` - Communications approval
- `portfolioManagerApprovalSchema` - Portfolio Manager approval
- `researchAnalystApprovalSchema` - Research Analyst approval
- `smeApprovalSchema` - Subject Matter Expert approval
- `performanceApprovalSchema` - Performance approval
- `otherApprovalSchema` - Other/custom approval with title
- `approvalSchema` - Discriminated union of all approval types
- `approvalsArraySchema` - Array validation with minimum requirement
- `addApprovalSchema` - Adding new approval

**Usage**:
```typescript
import { approvalSchema, approvalsArraySchema } from '@/schemas';

// Validate single approval
const result = approvalSchema.safeParse(approvalData);

if (result.success) {
  console.log('Valid approval:', result.data);
} else {
  console.error('Validation errors:', result.error.errors);
}

// Validate approvals array (minimum 1 approval required)
const approvalsResult = approvalsArraySchema.safeParse(approvals);

// Type inference
type ApprovalType = z.infer<typeof approvalSchema>;
```

**Validation Rules**:
- ✅ Approval date is required
- ✅ Approver is required (valid IPrincipal)
- ✅ Document ID required for each approval
- ✅ Notes max 500 characters
- ✅ Approval title required for "Other" type
- ✅ Minimum 1 approval in array

---

### 2. Review Schemas (`reviewSchema.ts`)

**Purpose**: Validate legal and compliance review submissions

**Schemas**:
- `legalReviewStatusUpdateSchema` - Legal review status change
- `complianceReviewStatusUpdateSchema` - Compliance review status change
- `legalReviewCompletionSchema` - Legal review submission
- `complianceReviewCompletionSchema` - Compliance review submission
- `attorneyAssignmentSchema` - Attorney assignment
- `legalReviewSchema` - Full legal review data
- `complianceReviewSchema` - Full compliance review data

**Usage**:
```typescript
import { legalReviewCompletionSchema } from '@/schemas';

// Validate legal review completion
const reviewData = {
  outcome: 'Approved',
  reviewNotes: 'Review notes must be at least 10 characters long...',
  completedBy: currentUser,
  completedOn: new Date(),
};

const result = legalReviewCompletionSchema.safeParse(reviewData);

if (!result.success) {
  // Display validation errors
  result.error.errors.forEach((err) => {
    console.error(`${err.path.join('.')}: ${err.message}`);
  });
}
```

**Validation Rules**:
- ✅ Review status is valid enum value
- ✅ Review notes: 10-2000 characters
- ✅ Outcome is valid enum value
- ✅ Completed by is valid IPrincipal
- ✅ Completed date is required
- ✅ Compliance: Foreside and retail flags required
- ✅ Attorney assignment requires valid attorney

---

### 3. Request Schemas (`requestSchema.ts`)

**Purpose**: Comprehensive request validation for creation and updates

**Schemas**:
- `requestInformationSchema` - Request information section
- `approvalsSchema` - Approvals section
- `createRequestSchema` - Full request creation (strict)
- `draftRequestSchema` - Draft saving (lenient)
- `updateRequestSchema` - Request updates
- `closeoutRequestSchema` - Closeout validation
- `closeoutWithTrackingIdSchema` - Conditional tracking ID validation
- `cancelRequestSchema` - Cancel request with reason
- `holdRequestSchema` - Hold request with reason
- `fullRequestSchema` - Complete request validation

**Usage**:
```typescript
import { createRequestSchema, draftRequestSchema } from '@/schemas';

// Validate for submission (strict)
const submitResult = createRequestSchema.safeParse(requestData);

// Validate for draft (lenient)
const draftResult = draftRequestSchema.safeParse(requestData);

// Conditional validation for closeout
import { closeoutWithTrackingIdSchema } from '@/schemas';

const closeoutData = {
  trackingId: 'TRK-2025-001',
  isForesideReviewRequired: true,
  isRetailUse: false,
  complianceReviewed: true,
};

// Tracking ID required if compliance reviewed AND (foreside OR retail)
const closeoutResult = closeoutWithTrackingIdSchema.safeParse(closeoutData);
```

**Validation Rules**:
- ✅ Request title: 3-255 characters
- ✅ Purpose: 10-1000 characters
- ✅ Submission item is selected
- ✅ Target return date is in future
- ✅ Review audience is selected
- ✅ At least 1 approval required
- ✅ Communications approval required if flag set
- ✅ Tracking ID conditional validation
- ✅ Cancel/hold reason: 10-500 characters

---

### 4. Document Schemas (`documentSchema.ts`)

**Purpose**: File upload and document management validation

**Schemas**:
- `documentUploadSchema` - Single file upload
- `documentMetadataUpdateSchema` - Update document metadata
- `documentDeleteSchema` - Delete document
- `bulkDocumentUploadSchema` - Multiple file upload
- `documentQueryOptionsSchema` - Document query parameters

**Helper Functions**:
- `validateFile(file)` - Validate single file
- `validateFiles(files)` - Validate multiple files

**Usage**:
```typescript
import { documentUploadSchema, validateFile } from '@/schemas';

// Validate file upload
const uploadData = {
  file: selectedFile,
  documentType: 'Review',
  requestId: 123,
  description: 'Marketing materials',
};

const result = documentUploadSchema.safeParse(uploadData);

// Or use helper function
const validation = validateFile(selectedFile);

if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn('Warnings:', validation.warnings);
}
```

**Validation Rules**:
- ✅ File cannot be empty
- ✅ Max file size: 250MB
- ✅ Allowed extensions: .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .txt, .jpg, .jpeg, .png, .gif, .zip
- ✅ File name max 128 characters
- ✅ No special characters: < > : " | ? *
- ✅ Document type is required
- ✅ Request ID is required
- ✅ Description max 500 characters
- ⚠️ Warning if file > 100MB

---

## Integration with React Hook Form

Zod schemas integrate seamlessly with React Hook Form via `zodResolver`:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createRequestSchema } from '@/schemas';

const MyForm: React.FC = () => {
  const form = useForm({
    resolver: zodResolver(createRequestSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const onSubmit = (data) => {
    // Data is validated and typed
    console.log('Valid data:', data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('requestTitle')} />
      {form.formState.errors.requestTitle && (
        <span>{form.formState.errors.requestTitle.message}</span>
      )}
      <button type="submit">Submit</button>
    </form>
  );
};
```

---

## Type Inference

Zod schemas provide automatic TypeScript type inference:

```typescript
import { z } from 'zod';
import { createRequestSchema } from '@/schemas';

// Infer TypeScript type from schema
type CreateRequestType = z.infer<typeof createRequestSchema>;

// Use inferred type
const newRequest: CreateRequestType = {
  requestType: 'Communication',
  requestTitle: 'Marketing Brochure',
  purpose: 'New product launch materials',
  // ... TypeScript will enforce all required fields
};
```

---

## Custom Refinements

Zod supports custom validation logic with `refine()`:

```typescript
// Example: Conditional validation
export const closeoutWithTrackingIdSchema = z
  .object({
    trackingId: z.string().min(1, 'Tracking ID is required'),
    isForesideReviewRequired: z.boolean(),
    isRetailUse: z.boolean(),
    complianceReviewed: z.boolean(),
  })
  .refine(
    (data) => {
      // Custom logic: Tracking ID required if specific conditions met
      if (data.complianceReviewed && (data.isForesideReviewRequired || data.isRetailUse)) {
        return data.trackingId && data.trackingId.length > 0;
      }
      return true;
    },
    {
      message: 'Tracking ID is required when Compliance reviewed and (Foreside or Retail Use)',
      path: ['trackingId'],
    }
  );
```

---

## Error Handling

### Parse vs SafeParse

```typescript
// parse() - Throws error if validation fails
try {
  const data = createRequestSchema.parse(requestData);
  console.log('Valid:', data);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Validation errors:', error.errors);
  }
}

// safeParse() - Returns result object (recommended)
const result = createRequestSchema.safeParse(requestData);

if (result.success) {
  console.log('Valid data:', result.data);
} else {
  console.error('Errors:', result.error.errors);
  // result.error.errors is array of validation errors
}
```

### Error Message Formatting

```typescript
const result = createRequestSchema.safeParse(requestData);

if (!result.success) {
  // Format errors for display
  const errorMessages = result.error.errors.map((err) => {
    return `${err.path.join('.')}: ${err.message}`;
  });

  console.error(errorMessages.join('\n'));

  // Or create error object for field mapping
  const fieldErrors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    fieldErrors[err.path.join('.')] = err.message;
  });
}
```

---

## Validation Strategies

### 1. Submit Validation (Strict)
Use `createRequestSchema` for final submission:
```typescript
const result = createRequestSchema.safeParse(formData);
if (!result.success) {
  // Block submission
  showErrors(result.error.errors);
  return;
}
// Proceed with submission
submitRequest(result.data);
```

### 2. Draft Validation (Lenient)
Use `draftRequestSchema` for saving drafts:
```typescript
// Most fields optional for draft
const result = draftRequestSchema.safeParse(formData);
// Save even if incomplete
saveDraft(result.success ? result.data : formData);
```

### 3. Field Validation (Real-time)
Validate individual fields on change:
```typescript
const fieldSchema = z.string().min(3).max(255);

const validateField = (value: string) => {
  const result = fieldSchema.safeParse(value);
  return result.success ? undefined : result.error.errors[0].message;
};

<TextField
  value={title}
  onChange={(e, value) => setTitle(value || '')}
  errorMessage={validateField(title)}
/>
```

---

## Testing Schemas

```typescript
import { createRequestSchema } from './requestSchema';

describe('createRequestSchema', () => {
  it('should validate valid request', () => {
    const validRequest = {
      requestType: 'Communication',
      requestTitle: 'Test Request',
      purpose: 'This is a test purpose with enough characters',
      submissionType: 'New',
      submissionItem: { id: 1, title: 'Test' },
      targetReturnDate: new Date(Date.now() + 86400000), // Tomorrow
      reviewAudience: 'Legal',
      requiresCommunicationsApproval: false,
      approvals: [
        {
          type: 'Communications',
          approvalDate: new Date(),
          approver: { id: '1', title: 'John Doe' },
          documentId: 'doc-123',
        },
      ],
    };

    const result = createRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('should reject request with short title', () => {
    const invalidRequest = {
      requestTitle: 'AB', // Too short
      // ... other fields
    };

    const result = createRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    expect(result.error?.errors[0].message).toContain('at least 3 characters');
  });
});
```

---

## Schema Composition

Schemas can be composed and extended:

```typescript
// Base schema
const baseApprovalSchema = z.object({
  approvalDate: z.date(),
  approver: principalSchema,
  documentId: z.string().optional(),
});

// Extended schema
const communicationsApprovalSchema = baseApprovalSchema.extend({
  type: z.literal('Communications'),
});

// Merged schemas
const fullRequestSchema = requestInformationSchema
  .merge(approvalsSchema)
  .merge(additionalFieldsSchema);
```

---

## Performance Considerations

### Schema Caching
Zod schemas are created once and reused:
```typescript
// ✅ Good - Schema created once
export const requestSchema = z.object({...});

// ❌ Bad - Schema recreated on every call
function getSchema() {
  return z.object({...});
}
```

### Async Validation
For expensive validation (e.g., API calls):
```typescript
const asyncSchema = z.string().refine(
  async (value) => {
    const exists = await checkIfExists(value);
    return !exists;
  },
  { message: 'Value already exists' }
);
```

---

## Common Patterns

### Conditional Required Fields
```typescript
const schema = z.object({
  requestType: z.enum(['Communication', 'GeneralReview']),
  distributionMethod: z.array(z.string()).optional(),
}).refine(
  (data) => {
    // Distribution method required only for Communication type
    if (data.requestType === 'Communication') {
      return data.distributionMethod && data.distributionMethod.length > 0;
    }
    return true;
  },
  {
    message: 'Distribution method is required for Communication requests',
    path: ['distributionMethod'],
  }
);
```

### Cross-Field Validation
```typescript
const dateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
}).refine(
  (data) => data.endDate > data.startDate,
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);
```

---

## Best Practices

1. **Use discriminated unions** for type-safe variant handling
2. **Provide clear error messages** for better UX
3. **Validate early** - catch errors before submission
4. **Separate schemas** - draft vs. submit validation
5. **Type inference** - let Zod generate TypeScript types
6. **Compose schemas** - reuse common patterns
7. **Test schemas** - unit test validation logic

---

## References

- **Zod Documentation**: https://zod.dev/
- **React Hook Form + Zod**: https://react-hook-form.com/get-started#SchemaValidation
- **Type Definitions**: `src/types/`
- **Custom Hooks**: `src/hooks/`
