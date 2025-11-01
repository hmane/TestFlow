# Legal Workflow System - Technical Design Document

## Document Control

| Item | Details |
|------|---------|
| **Document Title** | Legal Workflow System - Technical Design Document |
| **Version** | 1.0 Draft |
| **Date** | October 20, 2025 |
| **Status** | Draft - Pending Review |
| **Project Name** | Legal Review System (LRS) |
| **Organization** | [Organization Name] |

### Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 Draft | 2025-10-20 | [Author Name] | Initial draft - Phase 1 technical specifications |

### Document Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Technical Lead | | | |
| Solution Architect | | | |
| Development Manager | | | |
| QA Lead | | | |

---

## 1. Introduction

### 1.1 Purpose

This Technical Design Document (TDD) provides detailed implementation specifications for the Legal Workflow System (LRS) Phase 1. It serves as the primary reference for developers, QA engineers, and future maintainers, containing:

- Complete TypeScript interface definitions for data models
- Component architecture and implementation patterns
- Azure Functions API specifications (Swagger/OpenAPI)
- Business logic algorithms and pseudocode
- Power Automate flow specifications
- Testing strategies and deployment procedures

### 1.2 Scope

This TDD covers the Phase 1 implementation of the Communication Request workflow, including:

- SPFx Form Customizer development
- React component implementation
- Zustand state management
- Zod validation schemas
- SharePoint data access patterns
- Azure Functions implementation
- Power Automate flow configuration
- Security and performance implementation

### 1.3 Intended Audience

- **Developers**: Implementing components, business logic, and integrations
- **QA Engineers**: Understanding system behavior for test case development
- **DevOps Engineers**: Deploying and configuring the solution
- **Future Maintainers**: Understanding implementation details for enhancements and bug fixes

### 1.4 Related Documentation

- **Functional Requirements Document (FRD)**: Business and functional requirements
- **High-Level Design Document (HLD)**: Architecture overview and technology decisions
- **Legal Review System Specification**: Comprehensive business logic and workflows
- **Architecture Diagram**: Visual system architecture (separate document)

### 1.5 Document Conventions

- **TypeScript interfaces** are shown in code blocks with `interface` keyword
- **Pseudocode** uses indented blocks with comments
- **API specifications** follow OpenAPI 3.0 JSON format
- **Code snippets** represent key patterns, not complete implementations
- **File paths** use forward slashes (/) for cross-platform compatibility

---

## 2. Development Environment Setup

### 2.1 Prerequisites

**Required Software:**

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18.x LTS | Runtime for build tools and development |
| npm | 9.x or higher | Package management |
| Git | Latest | Version control |
| Visual Studio Code | Latest | Recommended IDE |
| SharePoint Online | Latest | Target platform |
| Azure Subscription | N/A | For Azure Functions hosting |

**Required Access:**

- SharePoint site collection administrator access (development site)
- Azure subscription contributor access
- Microsoft 365 developer tenant (recommended for development)
- Power Automate premium license (for HTTP actions)

### 2.2 Initial Setup

**Step 1: Install SPFx Development Tools**

```bash
# Install Yeoman and SPFx generator (global)
npm install -g yo @microsoft/generator-sharepoint

# Install Gulp CLI (global)
npm install -g gulp-cli
```

**Step 2: Clone Repository**

```bash
git clone <repository-url>
cd legal-workflow
```

**Step 3: Install Dependencies**

```bash
npm install
```

**Step 4: Configure Environment**

Create `config/serve.json` with development site URL:

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/spfx-build/spfx-serve.schema.json",
  "port": 4321,
  "https": true,
  "serveConfigurations": {
    "default": {
      "pageUrl": "https://<your-tenant>.sharepoint.com/sites/legal-workflow-dev/_layouts/15/listform.aspx?PageType=6&ListId={<list-id>}&RootFolder=*",
      "formCustomizer": {
        "componentId": "<component-id-from-manifest>"
      }
    }
  }
}
```

**Step 5: Build and Serve**

```bash
# Build the solution
gulp bundle

# Serve for local development
gulp serve
```

### 2.3 Development Tools Configuration

**VS Code Extensions (Recommended):**

- ESLint
- TypeScript and JavaScript Language Features
- Prettier - Code Formatter
- SPFx Snippets
- Azure Functions

**TypeScript Configuration:**

The project uses `tsconfig.json` from SPFx scaffolding with TypeScript 5.3.3. Key compiler options:

```json
{
  "compilerOptions": {
    "target": "ES2019",
    "module": "esnext",
    "lib": ["ES2019", "DOM"],
    "jsx": "react",
    "strict": true,
    "moduleResolution": "node",
    "skipLibCheck": true,
    "esModuleInterop": true
  }
}
```

**ESLint Configuration:**

The project uses `.eslintrc.js` with SPFx recommended rules. Key rules enforced:

- `@typescript-eslint/no-use-before-define`: Functions must be defined before use
- `@typescript-eslint/explicit-function-return-type`: Functions must declare return types
- `no-console`: Prevent console.log usage (use SPContext.logger instead)

---

## 3. Project Structure

```
legal-workflow/
├── config/                          # SPFx configuration files
│   ├── package-solution.json        # Solution packaging config
│   ├── serve.json                   # Local development server config
│   └── config.json                  # SPFx build config
├── src/
│   ├── extensions/
│   │   └── legalWorkflow/
│   │       ├── LegalWorkflowFormCustomizer.ts          # Entry point
│   │       ├── LegalWorkflowFormCustomizer.manifest.json
│   │       ├── components/
│   │       │   ├── LegalWorkflow.tsx                   # Main component
│   │       │   ├── LegalWorkflow.module.scss           # Styles
│   │       │   ├── RequestForm/
│   │       │   │   ├── RequestForm.tsx                 # Form container
│   │       │   │   ├── RequestInformation.tsx          # Request info section
│   │       │   │   ├── ApprovalSection.tsx             # Approvals section
│   │       │   │   ├── LegalReviewForm.tsx             # Legal review form
│   │       │   │   ├── ComplianceReviewForm.tsx        # Compliance review form
│   │       │   │   └── CloseoutForm.tsx                # Closeout form
│   │       │   ├── CommentsPanel/
│   │       │   │   ├── CommentsPanel.tsx               # Comments sidebar
│   │       │   │   └── CommentItem.tsx                 # Individual comment
│   │       │   ├── WorkflowStepper/
│   │       │   │   └── WorkflowStepper.tsx             # Status progress indicator
│   │       │   ├── RequestActions/
│   │       │   │   └── RequestActions.tsx              # Action buttons
│   │       │   └── shared/
│   │       │       ├── LoadingSpinner.tsx              # Loading state
│   │       │       └── ErrorMessage.tsx                # Error display
│   │       ├── stores/
│   │       │   ├── requestFormStore.ts                 # Main form state
│   │       │   ├── fieldChoicesStore.ts                # Choice field cache
│   │       │   └── submissionItemsStore.ts             # Request types config
│   │       ├── schemas/
│   │       │   ├── requestSchema.ts                    # Request validation
│   │       │   ├── legalReviewSchema.ts                # Legal review validation
│   │       │   ├── complianceReviewSchema.ts           # Compliance validation
│   │       │   └── closeoutSchema.ts                   # Closeout validation
│   │       ├── types/
│   │       │   ├── IRequest.ts                         # Request data model
│   │       │   ├── ISubmissionItem.ts                  # Submission item model
│   │       │   ├── IComment.ts                         # Comment model
│   │       │   ├── IFormState.ts                       # Form state model
│   │       │   └── enums.ts                            # Enums (Status, etc.)
│   │       ├── services/
│   │       │   ├── requestService.ts                   # Request CRUD operations
│   │       │   ├── documentService.ts                  # Document operations
│   │       │   ├── commentService.ts                   # Comment operations
│   │       │   └── permissionService.ts                # Permission helpers
│   │       ├── utils/
│   │       │   ├── dateUtils.ts                        # Date calculations
│   │       │   ├── validationUtils.ts                  # Validation helpers
│   │       │   └── formatUtils.ts                      # Formatting helpers
│   │       └── loc/
│   │           └── myStrings.d.ts                      # Localization strings
├── azure-functions/
│   ├── PermissionManagement/
│   │   ├── index.ts                                    # Permission function
│   │   ├── function.json                               # Function config
│   │   └── tests/
│   ├── NotificationGeneration/
│   │   ├── index.ts                                    # Notification function
│   │   ├── function.json                               # Function config
│   │   ├── templates/                                  # Email templates
│   │   └── tests/
│   ├── shared/
│   │   ├── spService.ts                                # SharePoint API service
│   │   ├── authService.ts                              # Azure AD auth
│   │   └── logger.ts                                   # Application Insights
│   ├── host.json                                       # Function app config
│   └── package.json                                    # Function dependencies
├── sharepoint/
│   └── solution/
│       └── legal-workflow.sppkg                        # Packaged solution (output)
├── gulpfile.js                                         # Build tasks
├── package.json                                        # Project dependencies
├── tsconfig.json                                       # TypeScript config
└── README.md                                           # Project documentation
```

### 3.1 Key Directories

**`src/extensions/legalWorkflow/components/`**: All React components for the user interface

**`src/extensions/legalWorkflow/stores/`**: Zustand state management stores

**`src/extensions/legalWorkflow/schemas/`**: Zod validation schemas for form sections

**`src/extensions/legalWorkflow/types/`**: TypeScript interface and type definitions

**`src/extensions/legalWorkflow/services/`**: Business logic and SharePoint API interaction

**`src/extensions/legalWorkflow/utils/`**: Utility functions and helpers

**`azure-functions/`**: Serverless Azure Functions for backend logic

**`config/`**: SPFx build and deployment configuration

---

## 4. Data Model & TypeScript Interfaces

### 4.1 Core Data Models

#### 4.1.1 Request Data Model

**File:** `src/extensions/legalWorkflow/types/IRequest.ts`

```typescript
import { IUser } from './IUser';
import { RequestStatus, ReviewAudience, ApprovalType } from './enums';

/**
 * Main request data model representing a legal/compliance review request
 */
export interface IRequest {
  // System fields
  id: number;
  requestId: string; // REQ-YYYY-NNNN format
  created: Date;
  modified: Date;

  // Request Information (17 fields)
  title: string;
  requestTypeId: number; // Lookup to SubmissionItems
  requestType?: ISubmissionItem; // Populated after lookup
  purpose: string;
  targetReturnDate: Date;
  audienceType: 'Institutional' | 'Retail' | 'Both';
  distributionMethod: 'Email' | 'Print' | 'Web' | 'Social Media' | 'Other';
  geographicScope: 'Domestic' | 'International' | 'Both';
  productStrategy?: string;
  performanceDataIncluded: boolean;
  performanceTimePeriod?: string; // Required if performanceDataIncluded = true
  additionalContext?: string;
  clientProspectName?: string;
  campaignName?: string;
  isTimeSensitive: boolean;
  urgencyReason?: string; // Required if isTimeSensitive = true
  expectedTurnaroundDate?: Date; // Calculated
  isRushRequest?: boolean; // Calculated

  // Approvals (up to 6 types, 3 fields each = 18 fields)
  approvals: IApproval[];

  // Legal Intake (2 fields)
  attorney?: IUser;
  attorneyAssignNotes?: string;

  // Legal Review (5 fields)
  legalReviewStatus?: 'In Progress' | 'Completed';
  legalReviewOutcome?: 'Approved' | 'Approved with Comments' | 'Not Approved';
  legalReviewNotes?: string;
  legalReviewDate?: Date;
  legalReviewer?: IUser;

  // Compliance Review (7 fields)
  complianceReviewStatus?: 'In Progress' | 'Completed';
  complianceReviewOutcome?: 'Approved' | 'Approved with Comments' | 'Not Approved';
  complianceReviewNotes?: string;
  complianceReviewDate?: Date;
  complianceReviewer?: IUser;
  isForesideReviewRequired?: boolean;
  isRetailUse?: boolean;

  // Closeout (1 field)
  trackingId?: string; // Conditionally required

  // System Tracking (16 fields)
  status: RequestStatus;
  reviewAudience: ReviewAudience;
  submittedBy?: IUser;
  submittedOn?: Date;
  createdBy: IUser;
  modifiedBy: IUser;
  draftSavedCount?: number;
  timeInLegalIntake?: number; // hours
  timeInAssignAttorney?: number; // hours
  timeInLegalReview?: number; // hours
  timeInComplianceReview?: number; // hours
  timeInCloseout?: number; // hours
  totalProcessingTime?: number; // hours
  cancelledOnHoldReason?: string;
}

/**
 * Approval data model (nested within IRequest)
 */
export interface IApproval {
  type: ApprovalType;
  date: Date;
  approver: IUser;
  documentUrl: string; // URL to uploaded document
  documentName: string;
}
```

#### 4.1.2 Submission Item Model

**File:** `src/extensions/legalWorkflow/types/ISubmissionItem.ts`

```typescript
/**
 * Submission item configuration model
 */
export interface ISubmissionItem {
  id: number;
  title: string; // Request type name (e.g., "Communication Request")
  turnAroundTimeInDays: number; // Business days
  description?: string;
}
```

#### 4.1.3 Comment Model

**File:** `src/extensions/legalWorkflow/types/IComment.ts`

```typescript
import { IUser } from './IUser';

/**
 * Comment data model for request discussions
 */
export interface IComment {
  id: number;
  requestId: number; // Parent request
  text: string;
  author: IUser;
  created: Date;
  modified?: Date;
  isEdited: boolean;
}
```

#### 4.1.4 User Model

**File:** `src/extensions/legalWorkflow/types/IUser.ts`

```typescript
/**
 * User data model (SharePoint user)
 */
export interface IUser {
  id: number;
  title: string; // Display name
  email: string;
  loginName?: string;
}
```

#### 4.1.5 Document Model

**File:** `src/extensions/legalWorkflow/types/IDocument.ts`

```typescript
import { IUser } from './IUser';

/**
 * Document metadata model
 */
export interface IDocument {
  id: number;
  name: string;
  serverRelativeUrl: string;
  requestId: number; // Link to parent request
  documentType: 'Request Material' | 'Approval Evidence' | 'Review Document' | 'Other';
  uploadedBy: IUser;
  uploadedDate: Date;
  fileSize: number; // bytes
}
```

### 4.2 Enumerations

**File:** `src/extensions/legalWorkflow/types/enums.ts`

```typescript
/**
 * Request workflow statuses
 */
export enum RequestStatus {
  Draft = 'Draft',
  LegalIntake = 'Legal Intake',
  AssignAttorney = 'Assign Attorney',
  InReview = 'In Review',
  Closeout = 'Closeout',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  OnHold = 'On Hold'
}

/**
 * Review audience options
 */
export enum ReviewAudience {
  Legal = 'Legal',
  Compliance = 'Compliance',
  Both = 'Both'
}

/**
 * Approval types
 */
export enum ApprovalType {
  Communications = 'Communications',
  PortfolioManager = 'Portfolio Manager',
  ResearchAnalyst = 'Research Analyst',
  SME = 'SME',
  Performance = 'Performance',
  Other = 'Other'
}

/**
 * Review outcomes
 */
export enum ReviewOutcome {
  Approved = 'Approved',
  ApprovedWithComments = 'Approved with Comments',
  NotApproved = 'Not Approved'
}
```

### 4.3 Form State Models

**File:** `src/extensions/legalWorkflow/types/IFormState.ts`

```typescript
import { IRequest } from './IRequest';

/**
 * Form state for request editing
 */
export interface IRequestFormState {
  // Current request data
  request: IRequest | null;

  // Form metadata
  isLoading: boolean;
  isSaving: boolean;
  isSubmitting: boolean;
  hasUnsavedChanges: boolean;

  // Validation state
  validationErrors: Record<string, string[]>;

  // UI state
  currentSection: string; // Active accordion/tab
  isReadOnly: boolean; // Based on permissions and status

  // Actions
  loadRequest: (requestId: number) => Promise<void>;
  updateField: (fieldName: string, value: any) => void;
  saveDraft: () => Promise<void>;
  submitRequest: () => Promise<void>;
  resetForm: () => void;
}

/**
 * Field choices cache state
 */
export interface IFieldChoicesState {
  audienceTypes: string[];
  distributionMethods: string[];
  geographicScopes: string[];
  approvalTypes: string[];

  isLoading: boolean;
  loadChoices: () => Promise<void>;
}

/**
 * Submission items configuration state
 */
export interface ISubmissionItemsState {
  items: ISubmissionItem[];
  isLoading: boolean;

  loadItems: () => Promise<void>;
  getItemById: (id: number) => ISubmissionItem | undefined;
  getItemByTitle: (title: string) => ISubmissionItem | undefined;
}
```

### 4.4 API Request/Response Models

**File:** `src/extensions/legalWorkflow/types/IApiModels.ts`

```typescript
import { IUser } from './IUser';
import { RequestStatus, ReviewAudience } from './enums';

/**
 * Permission Management API Request
 */
export interface IPermissionManagementRequest {
  requestId: number;
  siteUrl: string;
  listId: string;
  status: RequestStatus;
  submitterId?: number;
  attorneyId?: number;
  reviewAudience: ReviewAudience;
}

/**
 * Permission Management API Response
 */
export interface IPermissionManagementResponse {
  success: boolean;
  message: string;
  permissionsApplied: {
    userId: number;
    permission: string; // 'Read' | 'Edit' | 'Full Control'
  }[];
  errors?: string[];
}

/**
 * Notification Generation API Request
 */
export interface INotificationGenerationRequest {
  requestId: string;
  requestTitle: string;
  status: RequestStatus;
  submitter: IUser;
  attorney?: IUser;
  legalReviewOutcome?: string;
  complianceReviewOutcome?: string;
  targetReturnDate: string; // ISO 8601
  isRush: boolean;
  notificationType: 'RequestSubmitted' | 'AttorneyAssigned' | 'ReviewCompleted' | 'RequestCompleted' | 'RequestCancelled' | 'RequestOnHold';
}

/**
 * Notification Generation API Response
 */
export interface INotificationGenerationResponse {
  success: boolean;
  emailSubject: string;
  emailBodyHtml: string;
  recipients: {
    to: string[]; // email addresses
    cc?: string[];
  };
  errors?: string[];
}
```

---

## 5. Component Architecture

### 5.1 Component Hierarchy

```
LegalWorkflow (root)
├── LoadingSpinner (conditional)
├── ErrorMessage (conditional)
└── (when loaded)
    ├── WorkflowStepper
    ├── RequestForm (70% width)
    │   ├── RequestInformation
    │   ├── ApprovalSection
    │   ├── LegalIntakeForm (conditional: status = Legal Intake)
    │   ├── LegalReviewForm (conditional: attorney assigned)
    │   ├── ComplianceReviewForm (conditional: compliance review required)
    │   └── CloseoutForm (conditional: status = Closeout)
    └── CommentsPanel (30% width)
        ├── CommentItem[] (list)
        └── AddCommentForm
```

### 5.2 Key Component Specifications

#### 5.2.1 LegalWorkflow (Root Component)

**File:** `src/extensions/legalWorkflow/components/LegalWorkflow.tsx`

**Responsibility:** Main container, initializes SPContext, loads request data, orchestrates child components

**Props:**

```typescript
export interface ILegalWorkflowProps {
  context: FormCustomizerContext; // SPFx context
  listId: string;
  itemId: number; // Request list item ID
}
```

**State:** Uses Zustand stores (no local state)

**Key Implementation Pattern:**

```typescript
export const LegalWorkflow: React.FC<ILegalWorkflowProps> = ({ context, listId, itemId }) => {
  const { request, isLoading, loadRequest } = useRequestFormStore();
  const { loadChoices } = useFieldChoicesStore();
  const { loadItems } = useSubmissionItemsStore();

  React.useEffect(() => {
    const abortController = new AbortController();

    const initialize = async (): Promise<void> => {
      try {
        // Initialize SPContext
        await SPContext.smart(context, 'LegalWorkflow');

        // Load configuration and choices in parallel
        await Promise.all([
          loadChoices(),
          loadItems(),
          loadRequest(itemId)
        ]);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        SPContext.logger.error('Failed to initialize LegalWorkflow', error);
        // Show error to user
      }
    };

    initialize();

    return () => {
      abortController.abort();
    };
  }, [itemId]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!request) {
    return <ErrorMessage message="Request not found" />;
  }

  return (
    <div className={styles.legalWorkflow}>
      <WorkflowStepper currentStatus={request.status} />
      <div className={styles.mainContent}>
        <div className={styles.formSection}>
          <RequestForm request={request} />
        </div>
        <div className={styles.commentsSection}>
          <CommentsPanel requestId={request.id} />
        </div>
      </div>
      <RequestActions request={request} />
    </div>
  );
};
```

#### 5.2.2 RequestForm Component

**File:** `src/extensions/legalWorkflow/components/RequestForm/RequestForm.tsx`

**Responsibility:** Main form container, integrates React Hook Form, renders appropriate sections based on status

**Props:**

```typescript
export interface IRequestFormProps {
  request: IRequest;
}
```

**Key Implementation Pattern:**

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { requestSchema } from '../../schemas/requestSchema';

export const RequestForm: React.FC<IRequestFormProps> = ({ request }) => {
  const { updateField, isReadOnly } = useRequestFormStore();

  const form = useForm<IRequest>({
    resolver: zodResolver(requestSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: request
  });

  const handleFieldChange = (fieldName: string, value: any): void => {
    form.setValue(fieldName as any, value);
    updateField(fieldName, value);
  };

  return (
    <FormContainer>
      <RequestInformation
        form={form}
        onChange={handleFieldChange}
        isReadOnly={isReadOnly}
      />

      <ApprovalSection
        form={form}
        onChange={handleFieldChange}
        isReadOnly={isReadOnly}
      />

      {request.status === RequestStatus.LegalIntake && (
        <LegalIntakeForm
          form={form}
          onChange={handleFieldChange}
          isReadOnly={isReadOnly}
        />
      )}

      {request.attorney && (
        <LegalReviewForm
          form={form}
          onChange={handleFieldChange}
          isReadOnly={isReadOnly}
        />
      )}

      {request.reviewAudience !== ReviewAudience.Legal && (
        <ComplianceReviewForm
          form={form}
          onChange={handleFieldChange}
          isReadOnly={isReadOnly}
        />
      )}

      {request.status === RequestStatus.Closeout && (
        <CloseoutForm
          form={form}
          onChange={handleFieldChange}
          isReadOnly={isReadOnly}
        />
      )}
    </FormContainer>
  );
};
```

#### 5.2.3 WorkflowStepper Component

**File:** `src/extensions/legalWorkflow/components/WorkflowStepper/WorkflowStepper.tsx`

**Responsibility:** Display workflow progress indicator showing current status

**Props:**

```typescript
export interface IWorkflowStepperProps {
  currentStatus: RequestStatus;
}
```

**Implementation Pattern:**

Uses `spfx-toolkit/lib/components/WorkflowStepper` with configuration:

```typescript
import { WorkflowStepper } from 'spfx-toolkit/lib/components/WorkflowStepper';

export const RequestWorkflowStepper: React.FC<IWorkflowStepperProps> = ({ currentStatus }) => {
  const steps = [
    { key: RequestStatus.Draft, label: 'Draft' },
    { key: RequestStatus.LegalIntake, label: 'Legal Intake' },
    { key: RequestStatus.InReview, label: 'In Review' },
    { key: RequestStatus.Closeout, label: 'Closeout' },
    { key: RequestStatus.Completed, label: 'Completed' }
  ];

  return (
    <WorkflowStepper
      steps={steps}
      currentStep={currentStatus}
    />
  );
};
```

#### 5.2.4 CommentsPanel Component

**File:** `src/extensions/legalWorkflow/components/CommentsPanel/CommentsPanel.tsx`

**Responsibility:** Display comments, allow adding new comments

**Props:**

```typescript
export interface ICommentsPanelProps {
  requestId: number;
}
```

**Key Features:**
- Load comments from SharePoint list or request metadata
- Display chronologically (newest first or oldest first)
- Add new comment form
- Real-time updates (optional)

---

## 6. State Management (Zustand Stores)

### 6.1 Request Form Store

**File:** `src/extensions/legalWorkflow/stores/requestFormStore.ts`

```typescript
import create from 'zustand';
import { IRequest } from '../types/IRequest';
import { IRequestFormState } from '../types/IFormState';
import { requestService } from '../services/requestService';

export const useRequestFormStore = create<IRequestFormState>((set, get) => ({
  // State
  request: null,
  isLoading: false,
  isSaving: false,
  isSubmitting: false,
  hasUnsavedChanges: false,
  validationErrors: {},
  currentSection: 'requestInformation',
  isReadOnly: false,

  // Actions
  loadRequest: async (requestId: number): Promise<void> => {
    set({ isLoading: true });
    try {
      const request = await requestService.getById(requestId);

      // Determine if read-only based on status and permissions
      const isReadOnly = await determineReadOnlyStatus(request);

      set({
        request,
        isLoading: false,
        isReadOnly,
        hasUnsavedChanges: false
      });
    } catch (error: unknown) {
      SPContext.logger.error('Failed to load request', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateField: (fieldName: string, value: any): void => {
    const { request } = get();
    if (!request) return;

    const updatedRequest = {
      ...request,
      [fieldName]: value
    };

    set({
      request: updatedRequest,
      hasUnsavedChanges: true
    });
  },

  saveDraft: async (): Promise<void> => {
    const { request } = get();
    if (!request) return;

    set({ isSaving: true });
    try {
      const updated = await requestService.update(request.id, request);
      set({
        request: updated,
        isSaving: false,
        hasUnsavedChanges: false
      });

      SPContext.logger.info('Draft saved successfully', { requestId: request.id });
    } catch (error: unknown) {
      SPContext.logger.error('Failed to save draft', error);
      set({ isSaving: false });
      throw error;
    }
  },

  submitRequest: async (): Promise<void> => {
    const { request } = get();
    if (!request) return;

    set({ isSubmitting: true });
    try {
      // Update status to Legal Intake
      const updated = await requestService.submit(request.id);

      set({
        request: updated,
        isSubmitting: false,
        hasUnsavedChanges: false
      });

      SPContext.logger.info('Request submitted successfully', { requestId: request.id });
    } catch (error: unknown) {
      SPContext.logger.error('Failed to submit request', error);
      set({ isSubmitting: false });
      throw error;
    }
  },

  resetForm: (): void => {
    set({
      request: null,
      isLoading: false,
      isSaving: false,
      isSubmitting: false,
      hasUnsavedChanges: false,
      validationErrors: {},
      currentSection: 'requestInformation',
      isReadOnly: false
    });
  }
}));

/**
 * Helper function to determine if form should be read-only
 */
const determineReadOnlyStatus = async (request: IRequest): Promise<boolean> => {
  // Check current user permissions on the item
  const canEdit = await permissionService.currentUserCanEdit(request.id);

  // Draft status: submitter can edit
  // Other statuses: check role-based permissions
  return !canEdit;
};
```

### 6.2 Field Choices Store

**File:** `src/extensions/legalWorkflow/stores/fieldChoicesStore.ts`

```typescript
import create from 'zustand';
import { IFieldChoicesState } from '../types/IFormState';
import { SPContext } from 'spfx-toolkit';

export const useFieldChoicesStore = create<IFieldChoicesState>((set) => ({
  // State
  audienceTypes: [],
  distributionMethods: [],
  geographicScopes: [],
  approvalTypes: [],
  isLoading: false,

  // Actions
  loadChoices: async (): Promise<void> => {
    set({ isLoading: true });
    try {
      // Load choice fields from SharePoint list
      const listFields = await SPContext.sp.web.lists
        .getByTitle('Requests')
        .fields
        .filter("TypeAsString eq 'Choice'")
        .select('InternalName', 'Choices')();

      // Parse choices
      const audienceField = listFields.find(f => f.InternalName === 'AudienceType');
      const distributionField = listFields.find(f => f.InternalName === 'DistributionMethod');
      const geoField = listFields.find(f => f.InternalName === 'GeographicScope');
      const approvalField = listFields.find(f => f.InternalName === 'ApprovalType');

      set({
        audienceTypes: audienceField?.Choices || [],
        distributionMethods: distributionField?.Choices || [],
        geographicScopes: geoField?.Choices || [],
        approvalTypes: approvalField?.Choices || [],
        isLoading: false
      });

      SPContext.logger.info('Field choices loaded successfully');
    } catch (error: unknown) {
      SPContext.logger.error('Failed to load field choices', error);
      set({ isLoading: false });
      throw error;
    }
  }
}));
```

### 6.3 Submission Items Store

**File:** `src/extensions/legalWorkflow/stores/submissionItemsStore.ts`

```typescript
import create from 'zustand';
import { ISubmissionItem } from '../types/ISubmissionItem';
import { ISubmissionItemsState } from '../types/IFormState';
import { SPContext } from 'spfx-toolkit';

export const useSubmissionItemsStore = create<ISubmissionItemsState>((set, get) => ({
  // State
  items: [],
  isLoading: false,

  // Actions
  loadItems: async (): Promise<void> => {
    set({ isLoading: true });
    try {
      const items = await SPContext.sp.web.lists
        .getByTitle('SubmissionItems')
        .items
        .select('Id', 'Title', 'TurnAroundTimeInDays', 'Description')
        .orderBy('Title')();

      const submissionItems: ISubmissionItem[] = items.map(item => ({
        id: item.Id,
        title: item.Title,
        turnAroundTimeInDays: item.TurnAroundTimeInDays,
        description: item.Description
      }));

      set({ items: submissionItems, isLoading: false });
      SPContext.logger.info('Submission items loaded', { count: submissionItems.length });
    } catch (error: unknown) {
      SPContext.logger.error('Failed to load submission items', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getItemById: (id: number): ISubmissionItem | undefined => {
    const { items } = get();
    return items.find(item => item.id === id);
  },

  getItemByTitle: (title: string): ISubmissionItem | undefined => {
    const { items } = get();
    return items.find(item => item.title === title);
  }
}));
```

---

## 7. Form Validation (Zod Schemas)

### 7.1 Request Validation Schema

**File:** `src/extensions/legalWorkflow/schemas/requestSchema.ts`

```typescript
import { z } from 'zod';

/**
 * Approval validation schema
 */
const approvalSchema = z.object({
  type: z.enum(['Communications', 'Portfolio Manager', 'Research Analyst', 'SME', 'Performance', 'Other']),
  date: z.date({
    required_error: 'Approval date is required',
    invalid_type_error: 'Invalid date format'
  }).refine(
    (date) => date <= new Date(),
    { message: 'Approval date cannot be in the future' }
  ),
  approver: z.object({
    id: z.number(),
    title: z.string(),
    email: z.string().email()
  }, { required_error: 'Approver is required' }),
  documentUrl: z.string().url({ message: 'Valid document URL is required' }),
  documentName: z.string().min(1, 'Document name is required')
});

/**
 * Main request validation schema
 */
export const requestSchema = z.object({
  // Request Information
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must not exceed 255 characters'),

  requestTypeId: z.number({
    required_error: 'Request type is required',
    invalid_type_error: 'Invalid request type'
  }).positive('Request type is required'),

  purpose: z.string()
    .min(10, 'Purpose must be at least 10 characters')
    .max(2000, 'Purpose must not exceed 2000 characters'),

  targetReturnDate: z.date({
    required_error: 'Target return date is required',
    invalid_type_error: 'Invalid date format'
  }).refine(
    (date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    },
    { message: 'Target return date cannot be in the past' }
  ),

  audienceType: z.enum(['Institutional', 'Retail', 'Both'], {
    required_error: 'Audience type is required'
  }),

  distributionMethod: z.enum(['Email', 'Print', 'Web', 'Social Media', 'Other'], {
    required_error: 'Distribution method is required'
  }),

  geographicScope: z.enum(['Domestic', 'International', 'Both'], {
    required_error: 'Geographic scope is required'
  }),

  productStrategy: z.string().max(255).optional(),

  performanceDataIncluded: z.boolean(),

  performanceTimePeriod: z.string()
    .max(500)
    .optional()
    .refine(
      (val, ctx) => {
        // Required if performanceDataIncluded = true
        const parent = ctx.parent as any;
        if (parent.performanceDataIncluded && !val) {
          return false;
        }
        return true;
      },
      { message: 'Performance time period is required when performance data is included' }
    ),

  additionalContext: z.string().max(2000).optional(),
  clientProspectName: z.string().max(255).optional(),
  campaignName: z.string().max(255).optional(),

  isTimeSensitive: z.boolean(),

  urgencyReason: z.string()
    .max(1000)
    .optional()
    .refine(
      (val, ctx) => {
        const parent = ctx.parent as any;
        if (parent.isTimeSensitive && !val) {
          return false;
        }
        return true;
      },
      { message: 'Urgency reason is required when request is time sensitive' }
    ),

  // Approvals - must have at least 1
  approvals: z.array(approvalSchema)
    .min(1, 'At least one approval is required')
    .max(6, 'Maximum 6 approvals allowed'),

  // Review Audience
  reviewAudience: z.enum(['Legal', 'Compliance', 'Both'], {
    required_error: 'Review audience is required'
  })

  // Other fields are optional or system-managed
}).strict();

/**
 * Type inference from schema
 */
export type RequestFormData = z.infer<typeof requestSchema>;
```

### 7.2 Legal Review Validation Schema

**File:** `src/extensions/legalWorkflow/schemas/legalReviewSchema.ts`

```typescript
import { z } from 'zod';

export const legalReviewSchema = z.object({
  legalReviewStatus: z.enum(['In Progress', 'Completed'], {
    required_error: 'Review status is required'
  }),

  legalReviewOutcome: z.enum(['Approved', 'Approved with Comments', 'Not Approved'], {
    required_error: 'Review outcome is required'
  }),

  legalReviewNotes: z.string()
    .max(5000)
    .optional()
    .refine(
      (val, ctx) => {
        const parent = ctx.parent as any;
        const outcome = parent.legalReviewOutcome;

        // Notes required if Approved with Comments or Not Approved
        if ((outcome === 'Approved with Comments' || outcome === 'Not Approved') && !val) {
          return false;
        }
        return true;
      },
      { message: 'Review notes are required for this outcome' }
    )
}).strict();

export type LegalReviewFormData = z.infer<typeof legalReviewSchema>;
```

### 7.3 Compliance Review Validation Schema

**File:** `src/extensions/legalWorkflow/schemas/complianceReviewSchema.ts`

```typescript
import { z } from 'zod';

export const complianceReviewSchema = z.object({
  complianceReviewStatus: z.enum(['In Progress', 'Completed'], {
    required_error: 'Review status is required'
  }),

  complianceReviewOutcome: z.enum(['Approved', 'Approved with Comments', 'Not Approved'], {
    required_error: 'Review outcome is required'
  }),

  complianceReviewNotes: z.string()
    .max(5000)
    .optional()
    .refine(
      (val, ctx) => {
        const parent = ctx.parent as any;
        const outcome = parent.complianceReviewOutcome;

        if ((outcome === 'Approved with Comments' || outcome === 'Not Approved') && !val) {
          return false;
        }
        return true;
      },
      { message: 'Review notes are required for this outcome' }
    ),

  isForesideReviewRequired: z.boolean(),
  isRetailUse: z.boolean()
}).strict();

export type ComplianceReviewFormData = z.infer<typeof complianceReviewSchema>;
```

### 7.4 Closeout Validation Schema

**File:** `src/extensions/legalWorkflow/schemas/closeoutSchema.ts`

```typescript
import { z } from 'zod';

export const closeoutSchema = z.object({
  trackingId: z.string()
    .max(100)
    .optional()
    .refine(
      (val, ctx) => {
        const parent = ctx.parent as any;

        // Required if compliance review performed AND (foreside OR retail use)
        const complianceReviewed = parent.complianceReviewStatus === 'Completed';
        const requiresTracking = parent.isForesideReviewRequired || parent.isRetailUse;

        if (complianceReviewed && requiresTracking && !val) {
          return false;
        }
        return true;
      },
      { message: 'Tracking ID is required based on compliance review flags' }
    )
}).strict();

export type CloseoutFormData = z.infer<typeof closeoutSchema>;
```

---

## 8. SharePoint Data Layer

### 8.1 SharePoint Lists Overview

The system uses three SharePoint lists:

1. **Requests**: Main list with 73 fields (see external schema document)
2. **SubmissionItems**: Configuration list (3 fields)
3. **RequestDocuments**: Document library with metadata

**Note:** Complete field definitions, data types, and configurations are provided in the separate SharePoint schema document.

### 8.2 Data Access Patterns

#### 8.2.1 Request Service

**File:** `src/extensions/legalWorkflow/services/requestService.ts`

```typescript
import { SPContext } from 'spfx-toolkit';
import { createSPExtractor, createSPUpdater } from 'spfx-toolkit/lib/utilities/listItemHelper';
import { IRequest } from '../types/IRequest';
import '@pnp/sp/lists';
import '@pnp/sp/items';

export class RequestService {
  private readonly listTitle = 'Requests';

  /**
   * Get request by ID
   */
  public async getById(id: number): Promise<IRequest> {
    try {
      const item = await SPContext.sp.web.lists
        .getByTitle(this.listTitle)
        .items
        .getById(id)
        .select(
          'Id', 'Title', 'RequestTypeId', 'Purpose', 'TargetReturnDate',
          'AudienceType', 'DistributionMethod', 'GeographicScope',
          'Status', 'ReviewAudience', 'Author/Title', 'Author/EMail',
          'Attorney/Title', 'Attorney/EMail', 'Created', 'Modified'
          // ... all required fields
        )
        .expand('Author', 'Attorney', 'RequestType')();

      return this.mapToRequest(item);
    } catch (error: unknown) {
      SPContext.logger.error('Failed to get request by ID', error, { id });
      throw new Error(`Failed to load request: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create new request
   */
  public async create(data: Partial<IRequest>): Promise<IRequest> {
    try {
      const itemData = this.mapToSharePoint(data);

      const result = await SPContext.sp.web.lists
        .getByTitle(this.listTitle)
        .items
        .add(itemData);

      SPContext.logger.info('Request created', { id: result.data.Id });
      return this.getById(result.data.Id);
    } catch (error: unknown) {
      SPContext.logger.error('Failed to create request', error);
      throw new Error(`Failed to create request: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update existing request
   */
  public async update(id: number, data: Partial<IRequest>): Promise<IRequest> {
    try {
      // Load original item for change detection
      const originalItem = await SPContext.sp.web.lists
        .getByTitle(this.listTitle)
        .items
        .getById(id)();

      const updater = createSPUpdater();
      const itemData = this.mapToSharePoint(data);

      // Only update changed fields
      Object.keys(itemData).forEach(key => {
        updater.set(key, itemData[key], originalItem[key]);
      });

      if (!updater.hasChanges()) {
        SPContext.logger.info('No changes detected, skipping update', { id });
        return this.getById(id);
      }

      await SPContext.sp.web.lists
        .getByTitle(this.listTitle)
        .items
        .getById(id)
        .update(updater.getUpdates());

      SPContext.logger.info('Request updated', { id, changesCount: Object.keys(updater.getUpdates()).length });
      return this.getById(id);
    } catch (error: unknown) {
      SPContext.logger.error('Failed to update request', error, { id });
      throw new Error(`Failed to update request: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Submit request (Draft -> Legal Intake)
   */
  public async submit(id: number): Promise<IRequest> {
    try {
      await SPContext.sp.web.lists
        .getByTitle(this.listTitle)
        .items
        .getById(id)
        .update({
          Status: 'Legal Intake',
          SubmittedOn: new Date().toISOString()
        });

      SPContext.logger.info('Request submitted', { id });

      // Power Automate flow will be triggered automatically by SharePoint
      // and will handle permission changes and notifications

      return this.getById(id);
    } catch (error: unknown) {
      SPContext.logger.error('Failed to submit request', error, { id });
      throw new Error(`Failed to submit request: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Map SharePoint item to IRequest model
   */
  private mapToRequest(item: any): IRequest {
    const extractor = createSPExtractor(item);

    return {
      id: item.Id,
      requestId: extractor.string('Title', ''),
      title: extractor.string('Title', ''),
      requestTypeId: extractor.lookup('RequestType')?.id || 0,
      purpose: extractor.string('Purpose', ''),
      targetReturnDate: extractor.date('TargetReturnDate') || new Date(),
      audienceType: extractor.string('AudienceType', 'Institutional') as any,
      distributionMethod: extractor.string('DistributionMethod', 'Email') as any,
      geographicScope: extractor.string('GeographicScope', 'Domestic') as any,
      performanceDataIncluded: extractor.boolean('PerformanceDataIncluded', false),
      performanceTimePeriod: extractor.string('PerformanceTimePeriod'),
      isTimeSensitive: extractor.boolean('IsTimeSensitive', false),
      urgencyReason: extractor.string('UrgencyReason'),
      status: extractor.string('Status', 'Draft') as any,
      reviewAudience: extractor.string('ReviewAudience', 'Legal') as any,
      attorney: extractor.user('Attorney'),
      attorneyAssignNotes: extractor.string('AttorneyAssignNotes'),
      legalReviewStatus: extractor.string('LegalReviewStatus') as any,
      legalReviewOutcome: extractor.string('LegalReviewOutcome') as any,
      legalReviewNotes: extractor.string('LegalReviewNotes'),
      legalReviewDate: extractor.date('LegalReviewDate'),
      legalReviewer: extractor.user('LegalReviewer'),
      complianceReviewStatus: extractor.string('ComplianceReviewStatus') as any,
      complianceReviewOutcome: extractor.string('ComplianceReviewOutcome') as any,
      complianceReviewNotes: extractor.string('ComplianceReviewNotes'),
      isForesideReviewRequired: extractor.boolean('IsForesideReviewRequired', false),
      isRetailUse: extractor.boolean('IsRetailUse', false),
      trackingId: extractor.string('TrackingId'),
      created: extractor.date('Created') || new Date(),
      modified: extractor.date('Modified') || new Date(),
      createdBy: extractor.user('Author')!,
      modifiedBy: extractor.user('Editor')!,
      approvals: [], // Parse from JSON or separate list
      // ... other fields
    };
  }

  /**
   * Map IRequest model to SharePoint item format
   */
  private mapToSharePoint(request: Partial<IRequest>): any {
    const item: any = {};

    if (request.title) item.Title = request.title;
    if (request.requestTypeId) item.RequestTypeId = request.requestTypeId;
    if (request.purpose) item.Purpose = request.purpose;
    if (request.targetReturnDate) item.TargetReturnDate = request.targetReturnDate.toISOString();
    if (request.audienceType) item.AudienceType = request.audienceType;
    if (request.distributionMethod) item.DistributionMethod = request.distributionMethod;
    if (request.geographicScope) item.GeographicScope = request.geographicScope;
    if (request.performanceDataIncluded !== undefined) item.PerformanceDataIncluded = request.performanceDataIncluded;
    if (request.status) item.Status = request.status;
    if (request.reviewAudience) item.ReviewAudience = request.reviewAudience;
    if (request.attorney) item.AttorneyId = request.attorney.id;
    // ... map all other fields

    return item;
  }
}

export const requestService = new RequestService();
```

### 8.3 Query Optimization Strategies

**Always use select and expand:**

```typescript
// ✅ Good: Only fetch required fields
const items = await SPContext.sp.web.lists
  .getByTitle('Requests')
  .items
  .select('Id', 'Title', 'Status', 'Attorney/Title')
  .expand('Attorney')
  .top(50)();

// ❌ Bad: Fetches all fields (slow)
const items = await SPContext.sp.web.lists
  .getByTitle('Requests')
  .items();
```

**Use indexed columns for filtering:**

Ensure the following columns are indexed in SharePoint:
- Status
- AssignedTo (Attorney)
- SubmittedDate
- RequestType

**Implement pagination for large lists:**

```typescript
const pageSize = 50;
const items = await SPContext.sp.web.lists
  .getByTitle('Requests')
  .items
  .select('Id', 'Title', 'Status')
  .top(pageSize)();
```

**Cache configuration data:**

Use Zustand stores to cache SubmissionItems and field choices to minimize API calls.

---

## 9. Azure Functions API Specification

### 9.1 Permission Management Function

**Endpoint:** `POST /api/PermissionManagement`

**OpenAPI Specification (JSON):**

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Permission Management API",
    "version": "1.0.0",
    "description": "Azure Function for managing item-level permissions on SharePoint list items based on workflow status"
  },
  "servers": [
    {
      "url": "https://<function-app-name>.azurewebsites.net/api",
      "description": "Production server"
    }
  ],
  "paths": {
    "/PermissionManagement": {
      "post": {
        "summary": "Update item permissions based on workflow status",
        "operationId": "updatePermissions",
        "tags": ["Permissions"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PermissionManagementRequest"
              },
              "example": {
                "requestId": 123,
                "siteUrl": "https://contoso.sharepoint.com/sites/legal-workflow",
                "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "status": "In Review",
                "submitterId": 45,
                "attorneyId": 67,
                "reviewAudience": "Legal"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Permissions updated successfully",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/PermissionManagementResponse"
                },
                "example": {
                  "success": true,
                  "message": "Permissions updated successfully",
                  "permissionsApplied": [
                    {
                      "userId": 45,
                      "permission": "Read"
                    },
                    {
                      "userId": 67,
                      "permission": "Edit"
                    }
                  ]
                }
              }
            }
          },
          "400": {
            "description": "Invalid request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "500": {
            "description": "Internal server error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "functionKey": []
          }
        ]
      }
    }
  },
  "components": {
    "schemas": {
      "PermissionManagementRequest": {
        "type": "object",
        "required": ["requestId", "siteUrl", "listId", "status", "reviewAudience"],
        "properties": {
          "requestId": {
            "type": "integer",
            "description": "SharePoint list item ID"
          },
          "siteUrl": {
            "type": "string",
            "format": "uri",
            "description": "SharePoint site URL"
          },
          "listId": {
            "type": "string",
            "format": "uuid",
            "description": "SharePoint list GUID"
          },
          "status": {
            "type": "string",
            "enum": ["Draft", "Legal Intake", "Assign Attorney", "In Review", "Closeout", "Completed", "Cancelled", "On Hold"],
            "description": "Current request status"
          },
          "submitterId": {
            "type": "integer",
            "description": "User ID of request submitter"
          },
          "attorneyId": {
            "type": "integer",
            "description": "User ID of assigned attorney"
          },
          "reviewAudience": {
            "type": "string",
            "enum": ["Legal", "Compliance", "Both"],
            "description": "Review audience type"
          }
        }
      },
      "PermissionManagementResponse": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean",
            "description": "Whether operation succeeded"
          },
          "message": {
            "type": "string",
            "description": "Human-readable message"
          },
          "permissionsApplied": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "userId": {
                  "type": "integer"
                },
                "permission": {
                  "type": "string",
                  "enum": ["Read", "Edit", "Full Control"]
                }
              }
            }
          },
          "errors": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Error messages if any"
          }
        }
      },
      "ErrorResponse": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean",
            "example": false
          },
          "message": {
            "type": "string",
            "description": "Error message"
          },
          "errors": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      }
    },
    "securitySchemes": {
      "functionKey": {
        "type": "apiKey",
        "in": "header",
        "name": "x-functions-key",
        "description": "Azure Function access key"
      }
    }
  }
}
```

**Implementation Notes:**

- Function uses app-only authentication to SharePoint with elevated permissions
- Breaks permission inheritance when status changes from Draft
- Grants permissions based on status and role mapping
- Implements retry logic with exponential backoff
- Logs all operations to Application Insights

### 9.2 Notification Generation Function

**Endpoint:** `POST /api/NotificationGeneration`

**OpenAPI Specification (JSON):**

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Notification Generation API",
    "version": "1.0.0",
    "description": "Azure Function for generating email notification content based on request events"
  },
  "servers": [
    {
      "url": "https://<function-app-name>.azurewebsites.net/api",
      "description": "Production server"
    }
  ],
  "paths": {
    "/NotificationGeneration": {
      "post": {
        "summary": "Generate email notification content",
        "operationId": "generateNotification",
        "tags": ["Notifications"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/NotificationGenerationRequest"
              },
              "example": {
                "requestId": "REQ-2025-0001",
                "requestTitle": "Q1 Marketing Campaign Review",
                "status": "In Review",
                "submitter": {
                  "id": 45,
                  "title": "John Doe",
                  "email": "john.doe@contoso.com"
                },
                "attorney": {
                  "id": 67,
                  "title": "Jane Smith",
                  "email": "jane.smith@contoso.com"
                },
                "targetReturnDate": "2025-11-01T00:00:00Z",
                "isRush": true,
                "notificationType": "AttorneyAssigned"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Notification content generated successfully",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/NotificationGenerationResponse"
                },
                "example": {
                  "success": true,
                  "emailSubject": "You have been assigned request REQ-2025-0001",
                  "emailBodyHtml": "<html><body><h2>New Assignment</h2><p>You have been assigned to review request <strong>REQ-2025-0001</strong>...</p></body></html>",
                  "recipients": {
                    "to": ["jane.smith@contoso.com"],
                    "cc": ["legal-admin@contoso.com"]
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid request"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "functionKey": []
          }
        ]
      }
    }
  },
  "components": {
    "schemas": {
      "NotificationGenerationRequest": {
        "type": "object",
        "required": ["requestId", "requestTitle", "status", "submitter", "notificationType"],
        "properties": {
          "requestId": {
            "type": "string",
            "description": "Request ID (REQ-YYYY-NNNN format)"
          },
          "requestTitle": {
            "type": "string",
            "description": "Request title/description"
          },
          "status": {
            "type": "string",
            "enum": ["Draft", "Legal Intake", "Assign Attorney", "In Review", "Closeout", "Completed", "Cancelled", "On Hold"]
          },
          "submitter": {
            "$ref": "#/components/schemas/User"
          },
          "attorney": {
            "$ref": "#/components/schemas/User",
            "description": "Assigned attorney (if applicable)"
          },
          "legalReviewOutcome": {
            "type": "string",
            "enum": ["Approved", "Approved with Comments", "Not Approved"]
          },
          "complianceReviewOutcome": {
            "type": "string",
            "enum": ["Approved", "Approved with Comments", "Not Approved"]
          },
          "targetReturnDate": {
            "type": "string",
            "format": "date-time",
            "description": "Target return date (ISO 8601)"
          },
          "isRush": {
            "type": "boolean",
            "description": "Whether request is marked as rush"
          },
          "notificationType": {
            "type": "string",
            "enum": ["RequestSubmitted", "AttorneyAssigned", "ReviewCompleted", "RequestCompleted", "RequestCancelled", "RequestOnHold"],
            "description": "Type of notification to generate"
          }
        }
      },
      "NotificationGenerationResponse": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean"
          },
          "emailSubject": {
            "type": "string",
            "description": "Generated email subject line"
          },
          "emailBodyHtml": {
            "type": "string",
            "description": "Generated HTML email body"
          },
          "recipients": {
            "type": "object",
            "properties": {
              "to": {
                "type": "array",
                "items": {
                  "type": "string",
                  "format": "email"
                },
                "description": "Primary recipients"
              },
              "cc": {
                "type": "array",
                "items": {
                  "type": "string",
                  "format": "email"
                },
                "description": "CC recipients"
              }
            }
          },
          "errors": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "User": {
        "type": "object",
        "required": ["id", "title", "email"],
        "properties": {
          "id": {
            "type": "integer"
          },
          "title": {
            "type": "string",
            "description": "Display name"
          },
          "email": {
            "type": "string",
            "format": "email"
          }
        }
      }
    },
    "securitySchemes": {
      "functionKey": {
        "type": "apiKey",
        "in": "header",
        "name": "x-functions-key"
      }
    }
  }
}
```

**Implementation Notes:**

- Function loads email templates from `templates/` directory
- Templates are HTML files with placeholders (e.g., `{{requestId}}`, `{{submitterName}}`)
- Function replaces placeholders with actual values from request
- Returns formatted HTML for Power Automate to send
- Determines recipients based on notification type

### 9.3 Authentication and Security

**Azure Function Authentication:**

- Functions use Azure AD authentication with app-only permissions
- Function keys required in `x-functions-key` header
- SharePoint access uses certificate-based authentication or client secret
- Credentials stored in Azure Key Vault
- Application Insights for logging and monitoring

**Power Automate Integration:**

- Power Automate flows authenticate using HTTP connector with function key
- Function URLs stored in SharePoint configuration list
- Retry policy configured in Power Automate for transient failures

---

## 10. Power Automate Flows

### 10.1 Flow: Request Submission

**Trigger:** When an item is created or modified in Requests list

**Trigger Condition:**

```
@and(
  equals(triggerBody()?['Status'], 'Legal Intake'),
  equals(triggerBody()?['PreviousStatus'], 'Draft')
)
```

**Actions:**

1. **Get Request Details**
   - Action: Get item from Requests list
   - Input: Item ID from trigger
   - Output: Full request details

2. **Call Permission Management Function**
   - Action: HTTP POST
   - URI: `https://<function-app>.azurewebsites.net/api/PermissionManagement`
   - Headers: `x-functions-key: <key>`
   - Body:
     ```json
     {
       "requestId": @{triggerBody()?['ID']},
       "siteUrl": "@{triggerBody()?['siteUrl']}",
       "listId": "@{triggerBody()?['listId']}",
       "status": "@{triggerBody()?['Status']}",
       "submitterId": @{triggerBody()?['SubmittedBy']['Id']},
       "reviewAudience": "@{triggerBody()?['ReviewAudience']}"
     }
     ```

3. **Handle Permission Response** (Condition)
   - Condition: `@equals(outputs('Call_Permission_Management')?['body']?['success'], true)`
   - If Yes: Continue
   - If No: Log error and send alert to admin

4. **Generate Submitter Notification**
   - Action: HTTP POST
   - URI: `https://<function-app>.azurewebsites.net/api/NotificationGeneration`
   - Body:
     ```json
     {
       "requestId": "@{triggerBody()?['Title']}",
       "requestTitle": "@{triggerBody()?['RequestTitle']}",
       "status": "@{triggerBody()?['Status']}",
       "submitter": {
         "id": @{triggerBody()?['SubmittedBy']['Id']},
         "title": "@{triggerBody()?['SubmittedBy']['DisplayName']}",
         "email": "@{triggerBody()?['SubmittedBy']['Email']}"
       },
       "targetReturnDate": "@{triggerBody()?['TargetReturnDate']}",
       "isRush": @{triggerBody()?['IsRushRequest']},
       "notificationType": "RequestSubmitted"
     }
     ```

5. **Send Email to Submitter**
   - Action: Send an email (V2)
   - To: `@{outputs('Generate_Submitter_Notification')?['body']?['recipients']?['to']}`
   - Subject: `@{outputs('Generate_Submitter_Notification')?['body']?['emailSubject']}`
   - Body: `@{outputs('Generate_Submitter_Notification')?['body']?['emailBodyHtml']}`

6. **Generate Legal Admin Notification**
   - Action: HTTP POST (same as step 4, but notificationType = "LegalIntakeAssignment")

7. **Send Email to Legal Admin Group**
   - Action: Send an email (V2)
   - To: legal-admin@contoso.com
   - Subject: From notification generation response
   - Body: From notification generation response

8. **Log Event** (optional)
   - Action: Create item in AuditLog list
   - Fields: RequestId, Event, Timestamp, User

**Error Handling:**

- Configure run after on failure for each action
- Send error notification to admin group
- Log errors to Application Insights via HTTP action

### 10.2 Flow: Attorney Assignment

**Trigger:** When an item is modified in Requests list

**Trigger Condition:**

```
@and(
  not(equals(triggerBody()?['Attorney'], null)),
  not(equals(triggerBody()?['Attorney'], triggerBody()?['PreviousAttorney']))
)
```

**Actions:**

1. **Get Request Details** (same as 10.1)

2. **Call Permission Management Function**
   - Include `attorneyId` in request body

3. **Generate Attorney Notification**
   - notificationType: "AttorneyAssigned"

4. **Send Email to Attorney**

5. **Update Status to In Review** (if not already)
   - Action: Update item
   - Fields: Status = "In Review"

**Error Handling:** Same as 10.1

### 10.3 Flow: Review Completion

**Trigger:** When an item is modified in Requests list

**Trigger Condition:**

```
@or(
  equals(triggerBody()?['LegalReviewStatus'], 'Completed'),
  equals(triggerBody()?['ComplianceReviewStatus'], 'Completed')
)
```

**Actions:**

1. **Get Request Details**

2. **Determine Next Status** (Switch/Case)
   - Case 1: Legal only + Approved/Approved with Comments → Closeout
   - Case 2: Legal only + Not Approved → Completed
   - Case 3: Compliance only + Approved/Approved with Comments → Closeout
   - Case 4: Compliance only + Not Approved → Completed
   - Case 5: Both + Legal completed + Compliance pending → Route to compliance
   - Case 6: Both + Both completed + All approved → Closeout
   - Case 7: Both + Any not approved → Completed

3. **Update Request Status**
   - Action: Update item
   - Fields: Status = (determined from step 2)

4. **Call Permission Management** (if status changed)

5. **Generate Notification**
   - notificationType: "ReviewCompleted"

6. **Send Email to Submitter**

7. **Notify Next Reviewers** (if applicable)
   - If compliance review needed, notify compliance team

**Error Handling:** Same as 10.1

### 10.4 Flow: Request Completion

**Trigger:** When an item is modified in Requests list

**Trigger Condition:**

```
@and(
  equals(triggerBody()?['Status'], 'Completed'),
  not(equals(triggerBody()?['PreviousStatus'], 'Completed'))
)
```

**Actions:**

1. **Get Request Details**

2. **Generate Completion Notification**
   - notificationType: "RequestCompleted"

3. **Send Email to Submitter**

4. **Send Email to All Reviewers**
   - To: Attorney, Compliance Reviewer (if applicable)

5. **Update Final Metrics** (optional)
   - Calculate total processing time
   - Update item with metrics

6. **Log Completion Event**

**Error Handling:** Same as 10.1

### 10.5 Error Handling and Retry Policies

**Retry Policy Configuration:**

- Type: Exponential
- Count: 3
- Interval: PT5S (5 seconds)
- Minimum Interval: PT5S
- Maximum Interval: PT1H (1 hour)

**Error Notification Template:**

If critical action fails (e.g., permission update):
1. Send email to admin group
2. Include error details and request ID
3. Log to Application Insights
4. Do not block user workflow (graceful degradation)

---

## 11. Business Logic Implementation

### 11.1 Workflow State Machine

**State Transitions:**

```
Draft
  → Legal Intake (on submit)

Legal Intake
  → Assign Attorney (if committee assignment)
  → In Review (if direct assignment)

Assign Attorney
  → In Review (when attorney assigned)

In Review
  → Closeout (if all reviews approved/approved with comments)
  → Completed (if any review not approved)

Closeout
  → Completed (on closeout submission)

Any Status
  → Cancelled (by authorized users)
  → On Hold (by authorized users)

On Hold
  → Previous Status (on resume)
```

**Pseudocode for Status Transition Validation:**

```
FUNCTION canTransition(currentStatus, targetStatus, userRole):
  // Draft → Legal Intake
  IF currentStatus = "Draft" AND targetStatus = "Legal Intake":
    RETURN userRole = "Submitter" AND allRequiredFieldsValid()

  // Legal Intake → Assign Attorney or In Review
  IF currentStatus = "Legal Intake":
    IF targetStatus = "Assign Attorney":
      RETURN userRole = "Legal Admin"
    ELSE IF targetStatus = "In Review":
      RETURN userRole = "Legal Admin" AND attorneyIsAssigned()

  // Assign Attorney → In Review
  IF currentStatus = "Assign Attorney" AND targetStatus = "In Review":
    RETURN userRole IN ["Attorney Assigner", "Legal Admin"] AND attorneyIsAssigned()

  // In Review → Closeout or Completed
  IF currentStatus = "In Review":
    IF targetStatus = "Closeout":
      RETURN allRequiredReviewsCompleted() AND allOutcomesApproved()
    ELSE IF targetStatus = "Completed":
      RETURN allRequiredReviewsCompleted() AND anyOutcomeNotApproved()

  // Closeout → Completed
  IF currentStatus = "Closeout" AND targetStatus = "Completed":
    RETURN trackingIdValidated()

  // Any → Cancelled
  IF targetStatus = "Cancelled":
    RETURN userRole IN ["Legal Admin", "Admin", "Submitter"]

  // Any → On Hold
  IF targetStatus = "On Hold":
    RETURN userRole IN ["Legal Admin", "Attorney", "Compliance", "Admin"]

  // On Hold → Previous Status
  IF currentStatus = "On Hold":
    RETURN userRole IN ["Legal Admin", "Attorney", "Compliance", "Admin"]

  RETURN false
END FUNCTION

FUNCTION allRequiredReviewsCompleted():
  IF reviewAudience = "Legal":
    RETURN legalReviewStatus = "Completed"
  ELSE IF reviewAudience = "Compliance":
    RETURN complianceReviewStatus = "Completed"
  ELSE IF reviewAudience = "Both":
    RETURN legalReviewStatus = "Completed" AND complianceReviewStatus = "Completed"

  RETURN false
END FUNCTION

FUNCTION allOutcomesApproved():
  approvedOutcomes = ["Approved", "Approved with Comments"]

  IF reviewAudience = "Legal":
    RETURN legalReviewOutcome IN approvedOutcomes
  ELSE IF reviewAudience = "Compliance":
    RETURN complianceReviewOutcome IN approvedOutcomes
  ELSE IF reviewAudience = "Both":
    RETURN legalReviewOutcome IN approvedOutcomes AND
           complianceReviewOutcome IN approvedOutcomes

  RETURN false
END FUNCTION

FUNCTION anyOutcomeNotApproved():
  IF reviewAudience = "Legal":
    RETURN legalReviewOutcome = "Not Approved"
  ELSE IF reviewAudience = "Compliance":
    RETURN complianceReviewOutcome = "Not Approved"
  ELSE IF reviewAudience = "Both":
    RETURN legalReviewOutcome = "Not Approved" OR
           complianceReviewOutcome = "Not Approved"

  RETURN false
END FUNCTION
```

### 11.2 Rush Request Calculation

**Algorithm:**

```
FUNCTION calculateRushStatus(targetReturnDate, submittedDate, turnAroundTimeInDays):
  // Calculate expected turnaround date (business days only)
  expectedDate = addBusinessDays(submittedDate, turnAroundTimeInDays)

  // Compare target vs expected
  IF targetReturnDate < expectedDate:
    RETURN true  // Rush request
  ELSE:
    RETURN false // Normal request
END FUNCTION

FUNCTION addBusinessDays(startDate, daysToAdd):
  currentDate = startDate
  businessDaysAdded = 0

  WHILE businessDaysAdded < daysToAdd:
    currentDate = currentDate + 1 day

    // Check if weekday (Monday=1, Sunday=7)
    dayOfWeek = getDayOfWeek(currentDate)

    IF dayOfWeek >= 1 AND dayOfWeek <= 5:  // Monday to Friday
      businessDaysAdded = businessDaysAdded + 1

  RETURN currentDate
END FUNCTION

FUNCTION getDayOfWeek(date):
  // Returns 1 for Monday, 7 for Sunday
  // JavaScript: date.getDay() returns 0 for Sunday, need to convert
  jsDay = date.getDay()

  IF jsDay = 0:
    RETURN 7  // Sunday
  ELSE:
    RETURN jsDay
END FUNCTION
```

**TypeScript Implementation Snippet:**

```typescript
// File: src/extensions/legalWorkflow/utils/dateUtils.ts

/**
 * Add business days to a date (excludes weekends)
 */
export function addBusinessDays(startDate: Date, daysToAdd: number): Date {
  const result = new Date(startDate);
  let businessDaysAdded = 0;

  while (businessDaysAdded < daysToAdd) {
    result.setDate(result.getDate() + 1);

    const dayOfWeek = result.getDay();
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDaysAdded++;
    }
  }

  return result;
}

/**
 * Calculate if request is rush based on target date vs turnaround time
 */
export function isRushRequest(
  targetReturnDate: Date,
  submittedDate: Date,
  turnAroundTimeInDays: number
): boolean {
  const expectedDate = addBusinessDays(submittedDate, turnAroundTimeInDays);
  return targetReturnDate < expectedDate;
}
```

### 11.3 Turnaround Date Calculation

**Algorithm:**

```
FUNCTION calculateExpectedTurnaroundDate(request):
  // Get submission item configuration
  submissionItem = getSubmissionItemById(request.requestTypeId)

  IF submissionItem = null:
    THROW "Invalid request type"

  // Use submitted date if available, otherwise use created date
  baseDate = request.submittedOn != null ? request.submittedOn : request.created

  // Add business days
  expectedDate = addBusinessDays(baseDate, submissionItem.turnAroundTimeInDays)

  RETURN expectedDate
END FUNCTION
```

**Implementation Pattern:**

This calculation is performed:
1. When request is first created (estimated)
2. When request is submitted (final calculation)
3. Stored in `expectedTurnaroundDate` field for reporting

### 11.4 Tracking ID Validation

**Algorithm:**

```
FUNCTION validateTrackingId(request):
  // Tracking ID required if compliance reviewed AND (foreside OR retail use)
  complianceReviewed = request.complianceReviewStatus = "Completed"
  requiresForeside = request.isForesideReviewRequired = true
  isRetail = request.isRetailUse = true

  trackingIdRequired = complianceReviewed AND (requiresForeside OR isRetail)

  IF trackingIdRequired:
    IF request.trackingId = null OR request.trackingId = "":
      RETURN {
        valid: false,
        error: "Tracking ID is required based on compliance review flags"
      }

  RETURN {
    valid: true,
    error: null
  }
END FUNCTION
```

**Implementation:**

- Validation runs client-side (Zod schema) before closeout submission
- Validation runs server-side (Azure Function or Power Automate) as final check
- User cannot transition to Completed without satisfying requirement

### 11.5 Permission Assignment Logic

**Algorithm:**

```
FUNCTION assignPermissions(requestId, status, submitterId, attorneyId, reviewAudience):
  // Break inheritance if moving from Draft
  IF status != "Draft":
    breakPermissionInheritance(requestId)

  // Clear all custom permissions
  clearAllPermissions(requestId)

  // Add Admin group - always full control
  addPermission(requestId, "LW - Admin", "Full Control")

  // Add submitter - read only after submission
  IF status != "Draft":
    addPermission(requestId, submitterId, "Read")

  // Add Legal Admin - edit access during Legal Intake
  IF status = "Legal Intake":
    addPermission(requestId, "LW - Legal Admin", "Edit")

  // Add Attorney Assigner - edit access during Assign Attorney
  IF status = "Assign Attorney":
    addPermission(requestId, "LW - Attorney Assigner", "Edit")

  // Add Attorney - edit access during In Review (if legal review needed)
  IF status = "In Review" AND (reviewAudience = "Legal" OR reviewAudience = "Both"):
    IF attorneyId != null:
      addPermission(requestId, attorneyId, "Edit")

  // Add Compliance Users - edit access during In Review (if compliance review needed)
  IF status = "In Review" AND (reviewAudience = "Compliance" OR reviewAudience = "Both"):
    addPermission(requestId, "LW - Compliance Users", "Edit")

  // Add Submitter - edit access during Closeout
  IF status = "Closeout":
    addPermission(requestId, submitterId, "Edit")

  // All statuses: LW - Submitters group gets read access to all items
  addPermission(requestId, "LW - Submitters", "Read")

  RETURN success
END FUNCTION
```

**SharePoint Permission Levels:**

- **Read**: View items, view pages, open items
- **Edit**: Read + edit items, add items, delete items
- **Full Control**: All permissions

---

## 12. Security Implementation

### 12.1 Permission Management

**Breaking Inheritance:**

```typescript
// File: azure-functions/PermissionManagement/index.ts

async function breakInheritance(siteUrl: string, listId: string, itemId: number): Promise<void> {
  const sp = spfi(siteUrl).using(SPDefault({
    baseUrl: siteUrl,
    // App-only authentication with certificate or client secret
  }));

  // Break inheritance, copy existing permissions
  await sp.web.lists.getById(listId).items.getById(itemId).breakRoleInheritance(true, false);

  logger.info('Permission inheritance broken', { siteUrl, listId, itemId });
}
```

**Assigning Permissions:**

```typescript
async function assignPermission(
  siteUrl: string,
  listId: string,
  itemId: number,
  principalId: number,
  roleDefinitionId: number
): Promise<void> {
  const sp = spfi(siteUrl).using(SPDefault({
    baseUrl: siteUrl,
  }));

  // Add role assignment
  await sp.web.lists.getById(listId).items.getById(itemId).roleAssignments.add(principalId, roleDefinitionId);

  logger.info('Permission assigned', { itemId, principalId, roleDefinitionId });
}
```

**Role Definition IDs (Standard SharePoint):**

- Read: Get via `sp.web.roleDefinitions.getByName("Read")()`
- Edit: Get via `sp.web.roleDefinitions.getByName("Edit")()`
- Full Control: Get via `sp.web.roleDefinitions.getByName("Full Control")()`

### 12.2 Input Sanitization

**Client-Side (React):**

```typescript
import { escape } from '@microsoft/sp-lodash-subset';

// Sanitize user input before displaying
const safeText = escape(userInput);

// For HTML content (if needed)
import DOMPurify from 'dompurify';
const safeHtml = DOMPurify.sanitize(htmlContent);
```

**Server-Side (Azure Functions):**

```typescript
// Validate all inputs
function validateInput(input: any): boolean {
  // Check for SQL injection patterns
  const sqlPattern = /(\bOR\b|\bAND\b|--|;|\/\*|\*\/)/i;

  // Check for XSS patterns
  const xssPattern = /<script|javascript:|onerror=|onclick=/i;

  const inputStr = JSON.stringify(input);

  if (sqlPattern.test(inputStr) || xssPattern.test(inputStr)) {
    logger.warn('Potential malicious input detected', { input: inputStr });
    return false;
  }

  return true;
}
```

**SharePoint API:**

- Use parameterized queries (OData filters)
- Never construct URLs with user input directly
- Use PnP library methods which handle encoding

### 12.3 Authentication Flow

**SPFx Application:**

1. User accesses SharePoint page
2. SharePoint authenticates user via Azure AD (automatic)
3. SPFx context provides authenticated user token
4. SPContext initializes with user context
5. All SharePoint API calls use user's token

**Azure Functions:**

1. Power Automate calls function with function key in header
2. Function validates key
3. Function authenticates to SharePoint using app-only credentials (certificate or client secret)
4. Function performs operations with elevated permissions
5. All actions logged with original user context for audit

**Security Best Practices:**

- Never expose function keys in client code
- Store credentials in Azure Key Vault
- Use Managed Identity where possible
- Implement request throttling
- Log all privileged operations
- Rotate keys/certificates regularly

---

## 13. User Interface Implementation

### 13.1 Layout and Styling

**CSS-in-JS Pattern (SCSS Modules):**

```scss
// File: src/extensions/legalWorkflow/components/LegalWorkflow.module.scss

.legalWorkflow {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;

  .mainContent {
    display: flex;
    gap: 20px;

    .formSection {
      flex: 0 0 70%;
      background: var(--white);
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      padding: 24px;
    }

    .commentsSection {
      flex: 0 0 30%;
      background: var(--neutralLight);
      border-radius: 4px;
      padding: 16px;

      // Sticky sidebar
      position: sticky;
      top: 20px;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
    }
  }
}

// Responsive breakpoints
@media (max-width: 1024px) {
  .mainContent {
    flex-direction: column;

    .formSection,
    .commentsSection {
      flex: 1 1 100%;
    }

    .commentsSection {
      position: static;
      max-height: none;
    }
  }
}
```

**Fluent UI Theme Integration:**

```typescript
import { ThemeProvider } from '@fluentui/react';
import { getTheme } from '@fluentui/react/lib/Styling';

const theme = getTheme();

export const LegalWorkflow: React.FC<ILegalWorkflowProps> = (props) => {
  return (
    <ThemeProvider theme={theme}>
      {/* Component content */}
    </ThemeProvider>
  );
};
```

### 13.2 Form Rendering Logic

**Dynamic Field Rendering:**

```typescript
// Conditional field display based on form values
const performanceDataIncluded = form.watch('performanceDataIncluded');

return (
  <FormItem>
    <FormLabel required>Performance Data Included</FormLabel>
    <Toggle
      checked={performanceDataIncluded}
      onChange={(e, checked) => handleFieldChange('performanceDataIncluded', checked)}
      disabled={isReadOnly}
    />
  </FormItem>

  {performanceDataIncluded && (
    <FormItem>
      <FormLabel required>Performance Time Period</FormLabel>
      <DevExtremeTextBox
        value={form.watch('performanceTimePeriod')}
        onValueChanged={(e) => handleFieldChange('performanceTimePeriod', e.value)}
        disabled={isReadOnly}
      />
      <FormError errors={form.formState.errors.performanceTimePeriod} />
    </FormItem>
  )}
);
```

**Approval Section (Dynamic List):**

```typescript
const { fields, append, remove } = useFieldArray({
  control: form.control,
  name: 'approvals'
});

return (
  <Card title="Approvals" subtitle="At least one approval required">
    {fields.map((field, index) => (
      <div key={field.id} className={styles.approvalRow}>
        <DevExtremeSelectBox
          items={approvalTypes}
          value={field.type}
          onValueChanged={(e) => form.setValue(`approvals.${index}.type`, e.value)}
        />

        <DevExtremeDateBox
          value={field.date}
          onValueChanged={(e) => form.setValue(`approvals.${index}.date`, e.value)}
        />

        <PeoplePicker
          context={context}
          personSelectionLimit={1}
          selectedItems={(items) => form.setValue(`approvals.${index}.approver`, items[0])}
        />

        <FileUpload
          onUploadComplete={(url, name) => {
            form.setValue(`approvals.${index}.documentUrl`, url);
            form.setValue(`approvals.${index}.documentName`, name);
          }}
        />

        <IconButton
          iconProps={{ iconName: 'Delete' }}
          onClick={() => remove(index)}
          disabled={isReadOnly || fields.length === 1}
        />
      </div>
    ))}

    <PrimaryButton
      text="Add Approval"
      onClick={() => append({ type: '', date: new Date(), approver: null, documentUrl: '', documentName: '' })}
      disabled={isReadOnly}
    />
  </Card>
);
```

### 13.3 Conditional Field Display

**Business Rules:**

- Performance Time Period: Show only if Performance Data Included = Yes
- Urgency Reason: Show only if Time Sensitive = Yes
- Legal Intake Section: Show only if status = Legal Intake AND user is Legal Admin
- Legal Review Section: Show only if attorney assigned AND (user is attorney OR admin)
- Compliance Review Section: Show only if review audience includes Compliance AND user is Compliance User OR admin
- Closeout Section: Show only if status = Closeout AND user is authorized
- Tracking ID: Show always in Closeout, mark required based on compliance flags

**Implementation Pattern:**

```typescript
// Check user role and status
const canSeeLegalIntake = request.status === RequestStatus.LegalIntake &&
                          userHasRole('Legal Admin');

const canSeeLegalReview = request.attorney != null &&
                          (currentUserId === request.attorney.id || userHasRole('Admin'));

const canSeeComplianceReview = (request.reviewAudience === ReviewAudience.Compliance ||
                                request.reviewAudience === ReviewAudience.Both) &&
                               (userHasRole('Compliance') || userHasRole('Admin'));
```

---

## 14. Error Handling & Logging

### 14.1 Error Categories

| Category | Examples | User Impact | Logging Level |
|----------|----------|-------------|---------------|
| Validation Errors | Missing required field, invalid date | Form cannot be submitted | Info |
| Permission Errors | User lacks access to item | Cannot view/edit request | Warning |
| Network Errors | SharePoint API timeout | Cannot load/save data | Error |
| Business Logic Errors | Invalid status transition | Operation blocked | Warning |
| System Errors | Azure Function failure | Notifications delayed | Error |

### 14.2 Client-Side Error Handling

**React Error Boundaries:**

```typescript
// File: src/extensions/legalWorkflow/components/shared/ErrorBoundary.tsx

interface IErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{}, IErrorBoundaryState> {
  constructor(props: {}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): IErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    SPContext.logger.error('React component error', error, {
      componentStack: errorInfo.componentStack
    });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <MessageBar messageBarType={MessageBarType.error}>
          <strong>An error occurred while rendering the form.</strong>
          <p>{this.state.error?.message}</p>
          <PrimaryButton text="Refresh Page" onClick={() => window.location.reload()} />
        </MessageBar>
      );
    }

    return this.props.children;
  }
}
```

**API Error Handling:**

```typescript
try {
  const request = await requestService.getById(itemId);
  set({ request, isLoading: false });
} catch (error: unknown) {
  let userMessage = 'Failed to load request. Please try again.';

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('NetworkError') || error.message.includes('timeout')) {
      userMessage = 'Network error. Please check your connection and try again.';
    }
    // Permission errors
    else if (error.message.includes('403') || error.message.includes('Access denied')) {
      userMessage = 'You do not have permission to view this request.';
    }
    // Not found
    else if (error.message.includes('404')) {
      userMessage = 'Request not found.';
    }
  }

  SPContext.logger.error('Failed to load request', error, { itemId });

  // Show user-friendly message
  showErrorMessage(userMessage);
  set({ isLoading: false });
}
```

### 14.3 Logging Strategy

**SPContext Logger Usage:**

```typescript
import { SPContext } from 'spfx-toolkit';

// Info: Normal operations
SPContext.logger.info('Request submitted successfully', {
  requestId: request.id,
  submitterId: request.submittedBy.id
});

// Warning: Recoverable issues
SPContext.logger.warn('Draft auto-save failed, retrying', {
  requestId: request.id,
  attempt: 2
});

// Error: Operation failures
SPContext.logger.error('Failed to update permissions', error, {
  requestId: request.id,
  status: request.status
});
```

**Azure Functions Logging:**

```typescript
import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { ApplicationInsights } from 'applicationinsights';

const appInsights = new ApplicationInsights({ connectionString: process.env.APPINSIGHTS_CONNECTION_STRING });
appInsights.start();

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  try {
    context.log.info('Permission management triggered', { requestId: req.body.requestId });

    // ... business logic

    appInsights.defaultClient.trackEvent({
      name: 'PermissionUpdated',
      properties: {
        requestId: req.body.requestId,
        status: req.body.status
      }
    });

    context.res = {
      status: 200,
      body: { success: true, message: 'Permissions updated' }
    };
  } catch (error) {
    context.log.error('Permission management failed', error);

    appInsights.defaultClient.trackException({
      exception: error,
      properties: {
        requestId: req.body.requestId
      }
    });

    context.res = {
      status: 500,
      body: { success: false, message: error.message }
    };
  }
};

export default httpTrigger;
```

### 14.4 User-Facing Error Messages

**Guidelines:**

- Be specific but non-technical
- Provide actionable guidance
- Avoid exposing internal details
- Include support contact for persistent errors

**Examples:**

| Internal Error | User Message |
|----------------|--------------|
| `SharePoint API 403` | "You don't have permission to access this request. Contact your administrator if you believe this is an error." |
| `Validation: required field missing` | "Please complete the highlighted required fields before submitting." |
| `Network timeout` | "The operation timed out. Please check your connection and try again." |
| `Azure Function 500` | "An unexpected error occurred. Your data has been saved, but some background operations may be delayed. If the issue persists, contact support." |

---

## 15. Testing Strategy

### 15.1 Unit Testing Approach

**Framework:** Jest + React Testing Library

**Test Coverage Goals:**

- Business logic functions: 90%+
- React components: 80%+
- Services and utilities: 85%+
- Overall project: 80%+

**Test Structure:**

```typescript
// File: src/extensions/legalWorkflow/utils/__tests__/dateUtils.test.ts

import { addBusinessDays, isRushRequest } from '../dateUtils';

describe('dateUtils', () => {
  describe('addBusinessDays', () => {
    it('should add business days excluding weekends', () => {
      const startDate = new Date('2025-10-20'); // Monday
      const result = addBusinessDays(startDate, 5);

      // Should land on Friday (5 business days later)
      expect(result.getDay()).toBe(5); // Friday
      expect(result.getDate()).toBe(24); // Oct 24
    });

    it('should skip weekends when adding business days', () => {
      const startDate = new Date('2025-10-17'); // Friday
      const result = addBusinessDays(startDate, 3);

      // Should land on Wednesday (skip Sat, Sun, Mon, Tue, Wed)
      expect(result.getDay()).toBe(3); // Wednesday
      expect(result.getDate()).toBe(22); // Oct 22
    });
  });

  describe('isRushRequest', () => {
    it('should return true when target date is before expected turnaround', () => {
      const targetDate = new Date('2025-10-22');
      const submittedDate = new Date('2025-10-20');
      const turnAroundDays = 5;

      const result = isRushRequest(targetDate, submittedDate, turnAroundDays);

      expect(result).toBe(true);
    });

    it('should return false when target date is after expected turnaround', () => {
      const targetDate = new Date('2025-10-30');
      const submittedDate = new Date('2025-10-20');
      const turnAroundDays = 5;

      const result = isRushRequest(targetDate, submittedDate, turnAroundDays);

      expect(result).toBe(false);
    });
  });
});
```

**Component Testing:**

```typescript
// File: src/extensions/legalWorkflow/components/__tests__/RequestForm.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { RequestForm } from '../RequestForm/RequestForm';
import { mockRequest } from '../../__mocks__/mockData';

describe('RequestForm', () => {
  it('should render all required sections', () => {
    render(<RequestForm request={mockRequest} />);

    expect(screen.getByText('Request Information')).toBeInTheDocument();
    expect(screen.getByText('Approvals')).toBeInTheDocument();
  });

  it('should show validation errors for missing required fields', async () => {
    const { getByRole, getByText } = render(<RequestForm request={mockRequest} />);

    const submitButton = getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(await screen.findByText('Purpose is required')).toBeInTheDocument();
  });

  it('should conditionally show performance time period field', () => {
    render(<RequestForm request={mockRequest} />);

    const performanceToggle = screen.getByLabelText('Performance Data Included');

    // Initially hidden
    expect(screen.queryByLabelText('Performance Time Period')).not.toBeInTheDocument();

    // Toggle on
    fireEvent.click(performanceToggle);

    // Now visible
    expect(screen.getByLabelText('Performance Time Period')).toBeInTheDocument();
  });
});
```

### 15.2 Integration Testing

**Test Environment:** UAT SharePoint site with test data

**Test Approach:**

- Use actual SharePoint lists (not mocked)
- Test SPFx application deployed to UAT App Catalog
- Test Azure Functions in UAT Azure subscription
- Test Power Automate flows with real triggers

**Key Integration Tests:**

1. **Request Submission Flow**
   - Create request in UI → Save as draft → Submit
   - Verify: Status changes to Legal Intake
   - Verify: Power Automate flow triggers
   - Verify: Permissions updated (submitter has read-only)
   - Verify: Emails sent to submitter and Legal Admin

2. **Attorney Assignment Flow**
   - Legal Admin assigns attorney (direct)
   - Verify: Status changes to In Review
   - Verify: Attorney receives email
   - Verify: Attorney has edit access to request

3. **Review Completion Flow**
   - Attorney completes legal review (Approved)
   - Verify: Status changes to Closeout
   - Verify: Submitter receives notification
   - Verify: Closeout form accessible to submitter

4. **End-to-End Happy Path**
   - Draft → Submit → Assign → Review → Closeout → Completed
   - Verify: All statuses, permissions, and notifications

5. **Error Scenarios**
   - Azure Function failure (simulate)
   - Network timeout (simulate)
   - Invalid data entry
   - Verify: Graceful degradation, error messages

### 15.3 Test Scenarios Summary

**From FRD Section 13.3 - High-Level Test Scenarios:**

Developers and QA should implement tests for all scenarios listed in the FRD, including:

- Request lifecycle (TS-001 to TS-014)
- Business rules (TS-015 to TS-022)
- Permissions and security (TS-023 to TS-031)
- Validation and error handling (TS-032 to TS-038)
- Workflow variations (TS-039 to TS-044)
- Notifications (TS-045 to TS-050)
- Reporting and dashboards (TS-051 to TS-058)
- User experience (TS-059 to TS-064)

**Testing Tools:**

- **Unit Tests**: Jest, React Testing Library
- **Integration Tests**: Manual testing in UAT, Playwright/Cypress (optional)
- **API Tests**: Postman or automated scripts for Azure Functions
- **Performance Tests**: SharePoint throttling testing, load testing tools
- **Security Tests**: Penetration testing, permission validation scripts

---

## 16. Performance Optimization Guidelines

### 16.1 React Optimization

**Component Memoization:**

```typescript
// Memoize components that receive stable props
export const CommentItem = React.memo<ICommentItemProps>(({ comment }) => {
  return (
    <div className={styles.commentItem}>
      <div className={styles.author}>{comment.author.title}</div>
      <div className={styles.text}>{comment.text}</div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if comment ID changes
  return prevProps.comment.id === nextProps.comment.id;
});
```

**useMemo for Expensive Calculations:**

```typescript
const sortedComments = React.useMemo(() => {
  return comments.sort((a, b) => b.created.getTime() - a.created.getTime());
}, [comments]);

const isRush = React.useMemo(() => {
  if (!request.submittedOn || !submissionItem) return false;
  return isRushRequest(request.targetReturnDate, request.submittedOn, submissionItem.turnAroundTimeInDays);
}, [request.targetReturnDate, request.submittedOn, submissionItem]);
```

**useCallback for Stable Functions:**

```typescript
const handleFieldChange = React.useCallback((fieldName: string, value: any) => {
  updateField(fieldName, value);
}, [updateField]);

const handleSaveDraft = React.useCallback(async () => {
  try {
    await saveDraft();
    showSuccessMessage('Draft saved successfully');
  } catch (error) {
    showErrorMessage('Failed to save draft');
  }
}, [saveDraft]);
```

### 16.2 SharePoint Query Optimization

**Always use select and expand:**

```typescript
// ✅ Optimized query
const requests = await SPContext.sp.web.lists
  .getByTitle('Requests')
  .items
  .select('Id', 'Title', 'Status', 'SubmittedOn', 'Attorney/Title')
  .expand('Attorney')
  .filter("Status eq 'Legal Intake'")
  .orderBy('SubmittedOn', false)
  .top(50)();
```

**Use indexed columns for filters:**

Ensure these columns are indexed in SharePoint:
- Status
- SubmittedOn
- Attorney (lookup)
- RequestType (lookup)

**Implement pagination:**

```typescript
// Load initial page
const firstPage = await SPContext.sp.web.lists
  .getByTitle('Requests')
  .items
  .select('Id', 'Title', 'Status')
  .top(50)();

// Load next page if needed
const nextPage = await SPContext.sp.web.lists
  .getByTitle('Requests')
  .items
  .select('Id', 'Title', 'Status')
  .skip(50)
  .top(50)();
```

### 16.3 Bundle Size Optimization

**Code Splitting (Dynamic Imports):**

```typescript
// Lazy load heavy components
const ComplianceReviewForm = React.lazy(() => import('./ComplianceReviewForm'));

// Use with Suspense
<React.Suspense fallback={<LoadingSpinner />}>
  <ComplianceReviewForm />
</React.Suspense>
```

**Tree Shaking:**

- Import only needed Fluent UI components
- Avoid importing entire libraries

```typescript
// ✅ Good: Import specific components
import { PrimaryButton } from '@fluentui/react/lib/Button';
import { TextField } from '@fluentui/react/lib/TextField';

// ❌ Bad: Import everything
import * as FluentUI from '@fluentui/react';
```

### 16.4 Caching Strategy

**Cache Configuration Data:**

```typescript
// Zustand stores automatically cache data in memory
// Load once on initialization, reuse throughout session

const { items, loadItems } = useSubmissionItemsStore();

React.useEffect(() => {
  if (items.length === 0) {
    loadItems(); // Only load if not cached
  }
}, [items, loadItems]);
```

**Browser Cache:**

- SPFx bundles are cached by browser automatically
- SharePoint API responses cached based on HTTP headers

---

## 17. Deployment Procedures

### 17.1 SPFx Package Deployment

**Step 1: Build Production Package**

```bash
# Clean previous builds
gulp clean

# Build for production
gulp bundle --ship

# Package solution
gulp package-solution --ship
```

Output: `sharepoint/solution/legal-workflow.sppkg`

**Step 2: Upload to App Catalog**

1. Navigate to SharePoint Admin Center → App Catalog
2. Upload `legal-workflow.sppkg` to Apps for SharePoint
3. Check "Make this solution available to all sites"
4. Click Deploy

**Step 3: Install on Target Site**

1. Navigate to target SharePoint site
2. Settings → Add an App
3. Select "Legal Workflow" from app list
4. Click "Add"
5. Grant API permissions if prompted

**Step 4: Associate with List**

1. Navigate to Requests list
2. List Settings → Form Settings
3. Select "Legal Workflow Form Customizer"
4. Set as default for New, Edit, and Display forms

**Step 5: Verify Deployment**

1. Create new item in Requests list
2. Verify custom form loads
3. Check console for errors
4. Test basic functionality (save draft)

### 17.2 Azure Functions Deployment

**Step 1: Build Functions**

```bash
cd azure-functions
npm install
npm run build
```

**Step 2: Deploy via Azure CLI**

```bash
# Login to Azure
az login

# Deploy to function app
az functionapp deployment source config-zip \
  --resource-group <resource-group> \
  --name <function-app-name> \
  --src ./dist/package.zip
```

**Step 3: Configure Application Settings**

```bash
# Set SharePoint site URL
az functionapp config appsettings set \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --settings "SharePointSiteUrl=https://contoso.sharepoint.com/sites/legal-workflow"

# Set Application Insights connection string
az functionapp config appsettings set \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --settings "APPINSIGHTS_CONNECTION_STRING=<connection-string>"

# Set authentication credentials (from Key Vault)
az functionapp config appsettings set \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --settings "ClientId=<from-key-vault>" "ClientSecret=<from-key-vault>"
```

**Step 4: Test Functions**

```bash
# Get function URL
az functionapp function show \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --function-name PermissionManagement \
  --query invokeUrlTemplate

# Test with Postman or curl
curl -X POST <function-url> \
  -H "Content-Type: application/json" \
  -H "x-functions-key: <function-key>" \
  -d '{ "requestId": 1, "siteUrl": "...", ... }'
```

### 17.3 Power Automate Flow Deployment

**Option 1: Manual Creation**

1. Navigate to Power Automate (flow.microsoft.com)
2. Create new automated flow
3. Configure trigger: SharePoint - When an item is created or modified
4. Add actions per flow specifications (Section 10)
5. Configure connections with appropriate service accounts
6. Test flow with test data
7. Enable flow

**Option 2: Export/Import**

1. In UAT environment, export flow as solution
2. Download solution package (.zip)
3. In Production, import solution
4. Update connections and environment-specific variables
5. Enable flow

**Step-by-Step for Request Submission Flow:**

1. Create flow: "Legal Workflow - Request Submission"
2. Trigger: When item modified in Requests list
3. Trigger condition: `@and(equals(triggerBody()?['Status'], 'Legal Intake'), ...)` (see Section 10.1)
4. Add HTTP action: Call Permission Management function
5. Add HTTP action: Call Notification Generation function (submitter)
6. Add email action: Send to submitter
7. Add HTTP action: Call Notification Generation function (legal admin)
8. Add email action: Send to legal admin group
9. Configure error handling
10. Save and test

### 17.4 Environment Configuration

**Development Environment:**

- SPFx: Local workbench (`gulp serve`)
- SharePoint: Dev site collection
- Azure Functions: Dev function app
- Power Automate: Dev flows (test data)

**UAT/Staging Environment:**

- SPFx: Deployed to UAT App Catalog
- SharePoint: UAT site collection (mirrors production structure)
- Azure Functions: UAT function app
- Power Automate: UAT flows (production-like data)

**Production Environment:**

- SPFx: Deployed to Production App Catalog
- SharePoint: Production site collection
- Azure Functions: Production function app with premium plan (no cold starts)
- Power Automate: Production flows with production service accounts

**Configuration Management:**

- Store environment-specific settings in SharePoint configuration list
- Function URLs, email addresses, group IDs stored as key-value pairs
- SPFx reads from config list on load
- Power Automate reads from config list for dynamic values

---

## 18. Appendices

### Appendix A: TypeScript Type Definitions Reference

Complete type definitions are provided in `src/extensions/legalWorkflow/types/` directory. Key files:

- `IRequest.ts`: Main request data model (73 fields)
- `ISubmissionItem.ts`: Request type configuration
- `IComment.ts`: Comment model
- `IUser.ts`: SharePoint user model
- `IDocument.ts`: Document metadata
- `IFormState.ts`: Zustand store state models
- `IApiModels.ts`: Azure Function request/response models
- `enums.ts`: All enumerations (RequestStatus, ReviewAudience, etc.)

### Appendix B: SharePoint List Schema

Complete SharePoint list schemas (field definitions, data types, validations, indexed columns) are provided in a separate document:

**Document:** `SharePoint-Schema-Specification.xlsx` or `SharePoint-Lists-Schema.md`

**Contents:**

- Requests list: All 73 fields with internal names, display names, data types, required flags, default values
- SubmissionItems list: 3 fields
- RequestDocuments library: Metadata fields
- Indexed columns configuration
- Calculated field formulas
- Choice field values

### Appendix C: Azure Function Dependencies

**package.json for Azure Functions:**

```json
{
  "name": "legal-workflow-functions",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "start": "func start",
    "test": "jest"
  },
  "dependencies": {
    "@azure/functions": "^3.5.0",
    "@pnp/sp": "^3.20.1",
    "@pnp/nodejs": "^3.20.1",
    "applicationinsights": "^2.7.0"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0"
  }
}
```

### Appendix D: Coding Standards Quick Reference

**TypeScript:**

- Use `interface` for object shapes, `type` for unions/intersections
- Always declare return types for functions
- Use `unknown` for caught errors, then type guard
- Prefer `undefined` over `null`
- Use `const` for immutable values, `let` for mutable
- Avoid `any` type (use `unknown` with type guards instead)

**React:**

- Use functional components with hooks (no class components)
- Always provide dependency arrays for `useEffect`, `useMemo`, `useCallback`
- Implement cleanup functions in `useEffect` when needed
- Use `React.memo` for expensive components
- Prefer controlled components for forms (React Hook Form)

**Naming Conventions:**

- Interfaces: `IRequestFormProps`, `IUser` (prefix with `I`)
- Components: `RequestForm`, `CommentItem` (PascalCase)
- Functions: `handleFieldChange`, `calculateRushStatus` (camelCase)
- Constants: `MAX_FILE_SIZE`, `DEFAULT_PAGE_SIZE` (UPPER_SNAKE_CASE)
- Private methods: `_internalMethod` (prefix with underscore, rare)

**File Organization:**

- One component per file
- Co-locate styles with components (`.module.scss`)
- Group related files in folders (e.g., `RequestForm/`)
- Export from index files for cleaner imports

### Appendix E: Common Troubleshooting

**Issue:** SPFx workbench fails to load with CORS error

**Solution:** Ensure `serve.json` has correct `pageUrl` pointing to valid SharePoint site. Check SharePoint tenant allows SPFx development.

**Issue:** Azure Function returns 401 Unauthorized

**Solution:** Verify function key in `x-functions-key` header. Check app-only authentication credentials (client ID/secret) are correct.

**Issue:** Power Automate flow fails with "Access Denied"

**Solution:** Check flow connection authentication. Ensure service account has appropriate SharePoint permissions. Verify function URL and key are correct.

**Issue:** Permissions not updating after status change

**Solution:** Check Azure Function logs in Application Insights. Verify Power Automate flow triggered successfully. Test permission function directly with Postman.

**Issue:** Form validation not working

**Solution:** Check Zod schema definitions match field names exactly. Verify React Hook Form `resolver` is configured. Check console for validation errors.

---

**END OF DOCUMENT**

---

*This document is confidential and proprietary. Distribution is limited to authorized personnel only.*

*Version: 1.0 Draft | Date: October 20, 2025*