# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Legal Review System (LRS)** built as a SharePoint Framework (SPFx) 1.21.1 Form Customizer extension. It automates and streamlines legal/compliance review processes for marketing communications, replacing manual email-based workflows with a centralized, auditable SharePoint system.

**Key Purpose**: Move from manual tracking (emails, shared drives, screenshots) to automated routing, enforced documentation, real-time status tracking, and complete audit trails.

## Technology Stack

### Core Framework

- **SPFx Version**: 1.21.1
- **React**: 17.0.1
- **TypeScript**: 5.3.3
- **Node.js**: 18.x LTS (required)

### Key Dependencies

- **@microsoft/sp-\*** packages: SPFx framework libraries (v1.21.1)
- **@fluentui/react**: 8.106.4 (Fluent UI v8, NOT v9)
- **spfx-toolkit**: Custom toolkit providing SPContext, Card, Form components, utilities, common types
- **@pnp/sp**: 3.20.1 (SharePoint operations)
- **@pnp/spfx-controls-react**: 3.22.0 (PnP reusable React controls)
- **DevExtreme**: 22.2.3 (UI components for forms)
- **React Hook Form**: 7.45.4 + **Zod**: 4.1.11 (form management and validation)
- **Zustand**: 4.3.9 (state management)

### Build Tools

- **Gulp**: 4.0.2
- **Webpack**: Managed by SPFx build pipeline
- **ESLint**: 8.57.1 with SPFx plugins

## Architecture

### Solution Type

This is an **SPFx Form Customizer** (`BaseFormCustomizer` extension) that customizes SharePoint list forms. It renders a custom React component in place of the default SharePoint form.

### Code Structure

```
src/
├── index.ts                                  # Entry point
├── extensions/
│   └── legalWorkflow/
│       ├── LegalWorkflowFormCustomizer.ts   # Form customizer class (entry)
│       ├── LegalWorkflowFormCustomizer.manifest.json
│       ├── components/
│       │   └── LegalWorkflow.tsx            # Main React component (currently stub)
│       └── loc/
│           └── myStrings.d.ts               # Localization strings

config/
├── package-solution.json                     # SPFx solution configuration
├── serve.json                                # Dev server configuration
└── [other SPFx config files]
```

### Key Architectural Patterns (From Documentation)

**State Management**: Zustand stores

- `requestFormStore.ts` - Main form state
- `fieldChoicesStore.ts` - Choice field options
- `submissionItemsStore.ts` - Submission types configuration

**Form Management**: React Hook Form + Zod schemas for validation

**SPFx Integration**:

- `spfx-toolkit` provides SPContext for SharePoint operations
- SPContext initialized in `onInit()` using `SPContext.smart()`
- Import PnP modules from `spfx-toolkit/lib/utilities/context/pnpImports/`

**Component Strategy**:

- Card-based UI using `spfx-toolkit/lib/components/Card`
- Form components from `spfx-toolkit/lib/components/spForm`
- 70/30 layout: Form (left) + Comments (right)

## SharePoint Lists Architecture

### Main Lists

1. **Requests** (79 fields total):

   - Request Information (17 fields): Title (RequestID), RequestType, Purpose, TargetReturnDate, etc.
   - FINRA Audience & Product Fields (6 fields): FINRAAudienceCategory, Audience, USFunds, UCITS, SeparateAccountStrategies, SeparateAccountStrategiesIncludes
   - Approval Fields (18 fields): CommunicationsApproval, PortfolioManagerApproval, etc.
   - Legal Intake (2 fields): Attorney, AttorneyAssignNotes
   - Legal Review (5 fields): LegalReviewStatus, LegalReviewOutcome, legalReviewNotes
   - Compliance Review (7 fields): ComplianceReviewStatus, ComplianceReviewOutcome, etc.
   - Closeout (1 field): TrackingId
   - System Tracking (16 fields): Status, SubmittedBy, SubmittedOn, etc.

2. **SubmissionItems**: Configuration list (Title, TurnAroundTimeInDays, Description)

3. **RequestDocuments**: Document library with metadata

### Workflow Statuses

Draft → Legal Intake → Assign Attorney (optional) → In Review → Closeout → Completed

- Special statuses: Cancelled, On Hold
- Can bypass "Assign Attorney" stage with direct assignment

## Development Commands

### Build & Serve

```bash
# Install dependencies
npm install

# Build the solution
npm run build
# or
gulp bundle

# Serve for local development (workbench)
gulp serve

# Clean build artifacts
npm run clean
# or
gulp clean

# Run tests
npm run test
# or
gulp test

# Build production package
gulp bundle --ship
gulp package-solution --ship
# Output: sharepoint/solution/legal-workflow.sppkg
```

### Type Checking (Fast)

```bash
# Type-check without building
npx tsc --noEmit
```

### Linting

```bash
# Run ESLint (if configured)
npm run lint
```

## Important Development Guidelines

### 1. SPFx + Toolkit Patterns (CRITICAL)

**DO:**

```typescript
// Initialize SPContext in web part/extension onInit()
import { SPContext } from 'spfx-toolkit';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';

protected async onInit(): Promise<void> {
  await super.onInit();
  await SPContext.smart(this.context, 'LegalWorkflow');
}

// Use SPContext for SharePoint operations
const items = await SPContext.sp.web.lists.getByTitle('Requests').items();

// Use SPContext.logger for logging
SPContext.logger.info('Operation started', { listName: 'Requests' });
SPContext.logger.error('Operation failed', error, { context: 'loadData' });
```

**DON'T:**

```typescript
// ❌ Don't use manual PnP setup
import { spfi, SPFx } from '@pnp/sp';
const sp = spfi().using(SPFx(this.context));

// ❌ Don't use console.log
console.log('Data loaded');

// ❌ Don't use raw fetch for SharePoint
fetch(`${webUrl}/_api/web/lists`);
```

### 2. TypeScript Standards

**Interfaces:**

- Interface names: **PascalCase** (e.g., `IListItem`, `IRequestData`)
- Properties: **camelCase** (e.g., `id`, `title`, `createdDate`)
- Always normalize SharePoint data (PascalCase fields) to camelCase in your models

**Error Handling:**

```typescript
// ✅ Correct: Use unknown with type guards
try {
  await operation();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  SPContext.logger.error('Failed', error);
  throw new Error(`Operation failed: ${message}`);
}
```

**Prefer `undefined` over `null`** (except when interfacing with legacy APIs).

**Define before use**: Functions and components must be defined before they're called (ESLint enforces this).

### 3. React Patterns (React 17)

**AbortController for cleanup:**

```typescript
React.useEffect(() => {
  const abortController = new AbortController();

  loadData();

  return () => {
    abortController.abort();
  };
}, [dependencies]);
```

**Optimization:**

- Use `React.memo` for presentational components
- Use `useMemo` and `useCallback` for expensive computations
- Always provide dependency arrays for `useEffect`

### 4. Form Management

The system uses **React Hook Form + Zod** for validation:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(3).max(255),
  targetReturnDate: z.date(),
});

const form = useForm({
  resolver: zodResolver(schema),
  mode: 'onSubmit',
  reValidateMode: 'onChange',
});
```

Use spfx-toolkit form components:

```typescript
import {
  FormContainer,
  FormItem,
  FormLabel,
  FormValue,
  FormError,
  DevExtremeTextBox,
  DevExtremeDateBox,
} from 'spfx-toolkit/lib/components/spForm';
```

### 5. Accessibility Requirements

- All interactive elements need `aria-label`
- Use `role="alert"` for errors, `role="status"` for loading states
- Implement keyboard navigation (Enter, Space, Escape, Tab)
- Use Fluent UI theme colors for high contrast support
- Add `aria-live` regions for dynamic content

```typescript
<button
  type="button"
  aria-label="Delete request"
  onClick={handleDelete}
  disabled={isDeleting}
>
  Delete
</button>

<div role="alert" aria-live="assertive">
  {errorMessage}
</div>
```

### 6. Security Best Practices

**Input Sanitization:**

```typescript
import { escape } from '@microsoft/sp-lodash-subset';
const safeText = escape(userInput);

// For HTML content
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
```

**Permission Checks:**

```typescript
import {
  createPermissionHelper,
  SPPermissionLevel,
} from 'spfx-toolkit/lib/utilities/permissionHelper';

const permissionHelper = createPermissionHelper(SPContext.sp);
const canEdit = await permissionHelper.userHasPermissionOnList('Requests', SPPermissionLevel.Edit);
```

## Business Logic Highlights

### Rush Request Calculation

A request is "rush" if `targetReturnDate < (requestedDate + submissionItem.turnAroundTimeInDays)` (business days only, weekends excluded).

### Approval Requirements

- At least ONE approval required (date + approver + uploaded document)
- Types: Communications, Portfolio Manager, Research Analyst, SME, Performance, Other

### Review Audience

- **Legal**: Legal review required
- **Compliance**: Compliance review required
- **Both**: Both reviews required
- Legal Admin can override this during Legal Intake

### Tracking ID Requirement

Required at Closeout IF:

- Compliance reviewed AND (`isForesideReviewRequired === true` OR `isRetailUse === true`)

### Closeout Readiness

- Move to **Closeout** when all required reviews completed with Approved/Approved With Comments
- Move to **Completed** immediately if ANY review = Not Approved (bypasses Closeout)

## User Roles & Permissions

1. **LW - Submitters**: Create requests, view all (read-only for others' requests)
2. **LW - Legal Admin**: Triage, assign attorneys, override settings
3. **LW - Attorney Assigner**: Committee members who assign attorneys
4. **LW - Attorneys**: Review assigned requests, submit legal reviews
5. **LW - Compliance Users**: Review compliance requests, set flags
6. **LW - Admin**: Full system administration

Item-level permissions are broken when status changes from Draft → Legal Intake.

## Integration Points

### Azure Functions (Planned)

- **POST /api/permissions/manage**: Break inheritance, set item-level permissions
- **POST /api/notifications/generate**: Generate notification content

### Power Automate Flows (Planned)

- Trigger on status changes
- Send email notifications
- Update permissions

## Testing Strategy

**Unit Tests**: Jest + React Testing Library

- Target: 80% code coverage
- Test stores, hooks, utilities, validation schemas

**E2E Tests**: Playwright/Cypress

- Complete request lifecycle
- Committee vs. direct assignment paths
- Hold/resume/cancel actions

**UAT**: 2-3 weeks with real users from each role

## Known Constraints & Limitations

### Technical

- **Browser Support**: Chrome 90+, Edge 90+, Firefox 85+, Safari 14+ (IE11 not supported)
- **File Size**: Max 250MB per file (SharePoint limit)
- **Concurrent Users**: May throttle at 100+ concurrent users

### Business

- **Business Days**: Currently excludes weekends only; company holidays not yet integrated
- **Tracking ID**: No enforced format (free text currently)
- **Holiday Calendar**: Phase 2 enhancement

### Security

- **External Users**: Not supported; internal employees only
- **Permission Propagation**: May take seconds (Azure Function processing)

## Phase 1 vs. Phase 2

**Phase 1 (Current/Active Development):**

- Communication Request type only
- Core workflow (Draft → Legal Intake → Review → Closeout → Completed)
- Direct and committee attorney assignment
- Legal and Compliance reviews
- Basic reporting (dashboards)

**Phase 2 (Future):**

- General Review request type
- IMA Review request type
- Seismic Database integration
- Company holiday calendar
- Advanced reporting/analytics
- Mobile app

## Important Files & Locations

- **Entry Point**: `src/extensions/legalWorkflow/LegalWorkflowFormCustomizer.ts`
- **Main Component**: `src/extensions/legalWorkflow/components/LegalWorkflow.tsx` (currently stub)
- **Stores**: `src/stores/` (to be created)
- **Schemas**: `src/schemas/` (to be created)
- **Types**: `src/types/` (to be created)
- **Services**: `src/services/` (to be created)

## Quick Reference for Common Tasks

### Add a new field to the form

1. Update the Requests list schema (SharePoint)
2. Add field to TypeScript interface in `src/types/`
3. Add Zod validation in `src/schemas/`
4. Update Zustand store in `src/stores/requestFormStore.ts`
5. Add form component in `src/components/RequestForm/`

### Add a new validation rule

1. Update Zod schema in `src/schemas/`
2. Add custom validation if needed
3. Update error messages
4. Test with React Hook Form

### Add a new workflow status

1. Update Status choice field in SharePoint
2. Update TypeScript type definitions
3. Update WorkflowStepper component
4. Update business logic for status transitions
5. Update notification templates

### Query SharePoint lists efficiently

```typescript
// Always use select, expand, top, filter, orderBy
const items = await SPContext.sp.web.lists
  .getByTitle('Requests')
  .items.select('Id', 'Title', 'Status', 'Author/Title')
  .expand('Author')
  .filter(`Status eq 'Legal Intake'`)
  .orderBy('Created', false)
  .top(50)();
```

### Extract data from SharePoint items

```typescript
import { createSPExtractor } from 'spfx-toolkit/lib/utilities/listItemHelper';

const extractor = createSPExtractor(sharePointItem);
const data = {
  title: extractor.string('Title', ''),
  assignedTo: extractor.user('AssignedTo'),
  category: extractor.lookup('Category'),
  tags: extractor.taxonomyMulti('Tags'),
  dueDate: extractor.date('DueDate'),
  isActive: extractor.boolean('IsActive', true),
};
```

### Update items with change detection

```typescript
import { createSPUpdater, shouldPerformUpdate } from 'spfx-toolkit/lib/utilities/listItemHelper';

const updateCheck = shouldPerformUpdate(originalItem, newValues);
if (!updateCheck.shouldUpdate) {
  return; // No changes needed
}

const updater = createSPUpdater();
updater.set('Title', newTitle, originalItem.Title);
updater.set('Status', newStatus, originalItem.Status);

if (updater.hasChanges()) {
  await SPContext.sp.web.lists
    .getByTitle('Requests')
    .items.getById(itemId)
    .update(updater.getUpdates());
}
```

## Debugging Tips

**Enable SPFx debug mode:**

```bash
# In serve mode, append ?debug=true to workbench URL
https://tenant.sharepoint.com/_layouts/15/workbench.aspx?debug=true
```

**Check SPContext initialization:**

```typescript
// After initialization
console.log('SPContext.environment:', SPContext.environment);
console.log('SPContext.currentUser:', SPContext.currentUser);
console.log('SPContext.webAbsoluteUrl:', SPContext.webAbsoluteUrl);
```

**Use browser DevTools:**

- React Developer Tools: Inspect component state and props
- Network tab: Monitor SharePoint REST calls
- Console: View SPContext.logger output (filtered by level)

**Common Issues:**

- **"SPContext is not initialized"**: Ensure `SPContext.smart()` called in `onInit()`
- **"Access Denied"**: Check permissions and wait for Azure Function to propagate
- **Type errors**: Run `npx tsc --noEmit` to see all TypeScript errors
- **Form validation not working**: Check Zod schema matches field names exactly

## Key Contacts & Resources

**Documentation:**

- Complete system spec: `legal-review-system-readme.md` (2,526 lines, comprehensive)
- SPFx toolkit guide: `SPFX-Toolkit-Usage-Guide.md`
- GitHub Copilot guide: `.github/copilot-instructions.md` (2,484 lines, detailed patterns)

**Microsoft Docs:**

- SPFx 1.21.1: https://learn.microsoft.com/en-us/sharepoint/dev/spfx/sharepoint-framework-overview
- Fluent UI v8: https://developer.microsoft.com/en-us/fluentui#/controls/web
- PnPjs v3: https://pnp.github.io/pnpjs/

**Community:**

- SharePoint PnP: https://pnp.github.io/
- SPFx Samples: https://github.com/pnp/sp-dev-fx-webparts

## Final Notes

This is a **complex enterprise workflow application** with:

- 73 fields across multiple sections
- 8 workflow statuses with conditional paths
- 6 user roles with distinct permissions
- Item-level security managed by Azure Functions
- Extensive validation and business rules

**When making changes:**

1. Always read `legal-review-system-readme.md` for business logic
2. Follow spfx-toolkit patterns from `.github/copilot-instructions.md`
3. Test with real SharePoint lists (not just local workbench)
4. Consider permissions and role-based visibility
5. Maintain accessibility (ARIA, keyboard, focus)
6. Use SPContext.logger for all logging
7. Handle errors with proper type guards
8. Document complex logic with comments

**Priority**: User experience, data integrity, audit trail completeness, and security.
