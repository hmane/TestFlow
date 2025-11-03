# SPFx Toolkit - Complete Developer Usage Guide

**Version:** 1.0.0+
**For:** SharePoint Framework (SPFx) >= 1.21.1
**Author:** SPFx Toolkit Team
**Last Updated:** October 2025

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation & Setup](#installation--setup)
3. [Context System (MUST READ)](#context-system-must-read)
4. [Components](#components)
5. [Custom Hooks](#custom-hooks)
6. [Utilities](#utilities)
7. [TypeScript Types](#typescript-types)
8. [Bundle Size Optimization](#bundle-size-optimization)
9. [Common Patterns](#common-patterns)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)
12. [API Reference](#api-reference)

---

## Quick Start

### 30-Second Setup

```bash
# Install the package
npm install spfx-toolkit --save

# Install peer dependencies (if not already installed)
npm install @fluentui/react@8.106.4 @pnp/sp@^3.20.1 react@^17.0.1 --save
```

### Your First Component (5 Minutes)

```typescript
import * as React from 'react';
import * as ReactDom from 'react-dom';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

// 1. Import SPContext (ALWAYS FIRST)
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// 2. Import components you need
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';
import { Card } from 'spfx-toolkit/lib/components/Card';

export default class MyWebPart extends BaseClientSideWebPart<{}> {
  protected async onInit(): Promise<void> {
    await super.onInit();

    // 3. Initialize context (CRITICAL - Do this once in onInit)
    await SPContext.smart(this.context, 'MyWebPart');
  }

  public render(): void {
    const element: React.ReactElement = React.createElement(MyComponent);
    ReactDom.render(element, this.domElement);
  }
}

// 4. Use components in your React component
const MyComponent: React.FC = () => {
  return (
    <Card title="User Information" allowExpand>
      <UserPersona
        userId={123}
        size="large"
        showEmail
        showJobTitle
      />
    </Card>
  );
};
```

**That's it!** You now have expandable cards with user personas working in your SPFx web part.

---

## Installation & Setup

### Prerequisites

- **Node.js**: 18.x - 22.x
- **SPFx Version**: >= 1.21.1
- **TypeScript**: >= 4.7
- **React**: ^17.0.1

### Step 1: Install Package

```bash
npm install spfx-toolkit --save
```

### Step 2: Install Peer Dependencies

The toolkit has **ZERO runtime dependencies** - everything is a peer dependency:

```bash
# Core SPFx dependencies (usually already installed)
npm install @fluentui/react@8.106.4 --save
npm install @pnp/sp@^3.20.1 --save
npm install @pnp/logging@^4.16.0 --save
npm install @pnp/queryable@^3.20.1 --save
npm install react@^17.0.1 --save
npm install react-dom@^17.0.1 --save

# Optional (only if using specific components)
npm install @pnp/spfx-controls-react@^3.22.0 --save  # For ManageAccess, PeoplePicker
npm install devextreme@^22.2.3 --save  # For VersionHistory, spForm
npm install devextreme-react@^22.2.3 --save
npm install react-hook-form@^7.45.4 --save  # For spForm
npm install zustand@^4.3.9 --save  # For spForm state management
```

### Step 3: TypeScript Configuration

Ensure your `tsconfig.json` includes:

```jsonc
{
  "compilerOptions": {
    "target": "ES5",
    "module": "commonjs",
    "jsx": "react",
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### Step 4: SharePoint API Permissions (Optional)

Some components require additional SharePoint permissions. Add to `config/package-solution.json`:

```json
{
  "solution": {
    "webApiPermissionRequests": [
      {
        "resource": "Microsoft Graph",
        "scope": "User.ReadBasic.All"
      }
    ]
  }
}
```

---

## Context System (MUST READ)

**The SPContext is the foundation of the entire toolkit.** You MUST initialize it before using any components.

### Understanding SPContext

SPContext provides:
- **PnP/PnPjs integration** with optimized caching strategies
- **Logging** with performance tracking
- **HTTP client** with authentication
- **SharePoint context** access (current user, site URL, etc.)
- **PeoplePickerContext** for PnP controls

### Initialization Patterns

#### 1. Smart Initialization (RECOMMENDED)

Automatically detects your environment and configures optimal settings:

```typescript
export default class MyWebPart extends BaseClientSideWebPart<{}> {
  protected async onInit(): Promise<void> {
    await super.onInit();

    // Smart initialization - auto-detects dev/prod/Teams
    await SPContext.smart(this.context, 'MyWebPart');
  }
}
```

#### 2. Preset Configurations

Choose specific presets for different scenarios:

```typescript
// Basic - Minimal setup, no logging
await SPContext.basic(this.context, 'MyWebPart');

// Development - Verbose logging, no caching
await SPContext.development(this.context, 'MyWebPart');

// Production - Optimized caching, minimal logging
await SPContext.production(this.context, 'MyWebPart');

// Teams - Optimized for Microsoft Teams
await SPContext.teams(this.context, 'MyWebPart');
```

#### 3. Custom Configuration (Advanced)

Full control over all settings:

```typescript
await SPContext.initialize(this.context, 'MyWebPart', {
  enableCache: true,
  cacheExpirationMinutes: 30,
  enableLogging: true,
  logLevel: 'info',
  enablePerformanceTracking: true,
  enablePeoplePickerContext: true,
  modules: {
    cache: { strategy: 'memory', maxSize: 100 },
    logger: { console: true, performance: true }
  }
});
```

### Using SPContext

After initialization, access SPContext anywhere in your code:

```typescript
// PnP/PnPjs operations
const items = await SPContext.sp.web.lists.getByTitle('MyList').items();

// Different caching strategies
const cached = await SPContext.spCached.web.lists.getByTitle('MyList').items();
const fresh = await SPContext.spPessimistic.web.lists.getByTitle('MyList').items();

// Logging
SPContext.logger.info('Operation started', { data: 'value' });
SPContext.logger.error('Operation failed', error);

// Current user & site info
console.log('Current user:', SPContext.currentUser);
console.log('Site URL:', SPContext.webAbsoluteUrl);

// Health check
const health = await SPContext.getHealthCheck();
console.log('Context health:', health);
```

### Critical Notes

- **Initialize once** in web part's `onInit()` lifecycle
- **Call before rendering** any components
- **Check initialization**: Use `SPContext.isReady()` to verify
- **Teams context**: Use `.teams()` preset for optimal Teams performance

---

## Components

### 1. Card - Expandable Content Containers

**Bundle Impact:** Low (~50KB)
**Use Case:** Collapsible sections, dashboards, information panels

#### Basic Usage

```typescript
import { Card } from 'spfx-toolkit/lib/components/Card';

const MyComponent: React.FC = () => {
  return (
    <Card
      title="Project Overview"
      subtitle="Last updated: Today"
      allowExpand={true}
      defaultExpanded={false}
      persistState={true}
    >
      <p>Your content here...</p>
    </Card>
  );
};
```

#### Advanced Features

```typescript
import { Card, useCardController } from 'spfx-toolkit/lib/components/Card';

const MyComponent: React.FC = () => {
  // Programmatic control
  const cardController = useCardController('my-card-id');

  const handleAction = () => {
    cardController.expand(); // or .collapse(), .toggle()
  };

  return (
    <>
      <button onClick={handleAction}>Expand Card</button>

      <Card
        cardId="my-card-id"
        title="Controlled Card"
        allowExpand
        onExpand={() => console.log('Expanded')}
        onCollapse={() => console.log('Collapsed')}
        headerActions={
          <Button text="Action" onClick={() => alert('Clicked')} />
        }
      >
        <p>Content with external control</p>
      </Card>
    </>
  );
};
```

#### Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | Required | Card header title |
| `subtitle` | `string` | - | Optional subtitle text |
| `allowExpand` | `boolean` | `false` | Enable expand/collapse |
| `defaultExpanded` | `boolean` | `true` | Initial expanded state |
| `persistState` | `boolean` | `false` | Save state to localStorage |
| `cardId` | `string` | - | Unique ID for persistence |
| `className` | `string` | - | Custom CSS class |
| `headerActions` | `ReactNode` | - | Custom header actions |
| `onExpand` | `() => void` | - | Expand callback |
| `onCollapse` | `() => void` | - | Collapse callback |

---

### 2. UserPersona - User Profile Display

**Bundle Impact:** Low (~60KB)
**Use Case:** User avatars, contact cards, author display

#### Basic Usage

```typescript
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';

const MyComponent: React.FC = () => {
  return (
    <UserPersona
      userId={123}
      size="large"
      showEmail
      showJobTitle
    />
  );
};
```

#### Advanced Features

```typescript
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';
import { PersonaSize } from '@fluentui/react/lib/Persona';

const MyComponent: React.FC = () => {
  return (
    <div>
      {/* Auto-fetch from SharePoint */}
      <UserPersona
        userId={123}
        size={PersonaSize.size72}
        showEmail
        showJobTitle
        showLivePersonaCard  // Hover card with more info
      />

      {/* Manual data (no fetching) */}
      <UserPersona
        displayName="John Doe"
        email="john.doe@company.com"
        jobTitle="Senior Developer"
        photoUrl="/sites/mysite/_layouts/15/userphoto.aspx?size=L&accountname=john.doe"
        size="regular"
      />
    </div>
  );
};
```

#### Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `userId` | `number` | - | SharePoint user ID (auto-fetches data) |
| `displayName` | `string` | - | Manual display name |
| `email` | `string` | - | Manual email |
| `jobTitle` | `string` | - | Manual job title |
| `photoUrl` | `string` | - | Manual photo URL |
| `size` | `PersonaSize \| string` | `'regular'` | Persona size |
| `showEmail` | `boolean` | `false` | Show email below name |
| `showJobTitle` | `boolean` | `false` | Show job title |
| `showLivePersonaCard` | `boolean` | `false` | Enable hover card |
| `className` | `string` | - | Custom CSS class |

---

### 3. WorkflowStepper - Process Flow Visualization

**Bundle Impact:** Medium (~150KB)
**Use Case:** Multi-step processes, approval workflows, status tracking

#### Basic Usage

```typescript
import { WorkflowStepper } from 'spfx-toolkit/lib/components/WorkflowStepper';
import type { IWorkflowStep } from 'spfx-toolkit/lib/components/WorkflowStepper';

const MyComponent: React.FC = () => {
  const steps: IWorkflowStep[] = [
    {
      label: 'Draft',
      status: 'completed',
      description: 'Document created'
    },
    {
      label: 'Review',
      status: 'current',
      description: 'Awaiting approval'
    },
    {
      label: 'Approved',
      status: 'pending',
      description: 'Final approval'
    },
    {
      label: 'Published',
      status: 'pending',
      description: 'Goes live'
    }
  ];

  return (
    <WorkflowStepper
      steps={steps}
      orientation="horizontal"
    />
  );
};
```

#### Advanced Features

```typescript
const MyComponent: React.FC = () => {
  const steps: IWorkflowStep[] = [
    {
      label: 'Submitted',
      status: 'completed',
      description: 'Request submitted',
      icon: 'CheckMark',
      date: new Date('2024-01-15'),
      user: 'John Doe'
    },
    {
      label: 'Manager Approval',
      status: 'current',
      description: 'Pending manager review',
      icon: 'Clock',
      metadata: { approver: 'Jane Smith' }
    },
    {
      label: 'HR Approval',
      status: 'pending',
      icon: 'People'
    },
    {
      label: 'Completed',
      status: 'pending',
      icon: 'CompletedSolid'
    }
  ];

  const handleStepClick = (step: IWorkflowStep, index: number) => {
    console.log(`Clicked step ${index}:`, step);
  };

  return (
    <WorkflowStepper
      steps={steps}
      orientation="vertical"
      allowClickableSteps
      onStepClick={handleStepClick}
      theme="arrow"  // Arrow-style design
    />
  );
};
```

#### Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `steps` | `IWorkflowStep[]` | Required | Array of workflow steps |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Layout direction |
| `theme` | `'arrow' \| 'circle'` | `'arrow'` | Visual style |
| `allowClickableSteps` | `boolean` | `false` | Enable step clicking |
| `onStepClick` | `(step, index) => void` | - | Click handler |
| `className` | `string` | - | Custom CSS class |

**IWorkflowStep Interface:**

```typescript
interface IWorkflowStep {
  label: string;                    // Step name
  status: 'completed' | 'current' | 'pending' | 'error';
  description?: string;             // Optional description
  icon?: string;                    // Fluent UI icon name
  date?: Date;                      // Step date
  user?: string;                    // User who completed step
  metadata?: Record<string, any>;   // Additional data
}
```

---

### 4. ManageAccess - SharePoint Permission Management

**Bundle Impact:** High (~500KB - includes PeoplePicker)
**Use Case:** Document permissions, list item access control, security management

#### Basic Usage

```typescript
import { ManageAccess } from 'spfx-toolkit/lib/components/ManageAccess';

const MyComponent: React.FC = () => {
  return (
    <ManageAccess
      listTitle="Documents"
      itemId={123}
      onPermissionsChanged={() => {
        console.log('Permissions updated');
      }}
    />
  );
};
```

#### Advanced Features

```typescript
import { ManageAccess } from 'spfx-toolkit/lib/components/ManageAccess';
import type { IPermissionUpdate } from 'spfx-toolkit/lib/utilities/permissionHelper';

const MyComponent: React.FC = () => {
  const handlePermissionChange = (updates: IPermissionUpdate[]) => {
    console.log('Permission changes:', updates);
    // Trigger custom notifications, audit logs, etc.
  };

  const handleError = (error: Error) => {
    console.error('Permission error:', error);
    // Custom error handling
  };

  return (
    <ManageAccess
      listTitle="Projects"
      itemId={456}
      showInheritedPermissions={true}
      allowBreakInheritance={true}
      allowRemovePermissions={true}
      permissionLevels={['Read', 'Contribute', 'Full Control']}
      onPermissionsChanged={handlePermissionChange}
      onError={handleError}
      className="custom-manage-access"
    />
  );
};
```

#### Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `listTitle` | `string` | Required | SharePoint list name |
| `itemId` | `number` | Required | List item ID |
| `showInheritedPermissions` | `boolean` | `true` | Show inherited permissions |
| `allowBreakInheritance` | `boolean` | `true` | Allow breaking permission inheritance |
| `allowRemovePermissions` | `boolean` | `true` | Allow removing permissions |
| `permissionLevels` | `string[]` | Default levels | Available permission levels |
| `onPermissionsChanged` | `(updates) => void` | - | Change callback |
| `onError` | `(error) => void` | - | Error handler |
| `className` | `string` | - | Custom CSS class |

**Required Peer Dependencies:**
- `@pnp/spfx-controls-react@^3.22.0`

---

### 5. VersionHistory - Document Version Tracking

**Bundle Impact:** High (~600KB - includes DevExtreme)
**Use Case:** Document version comparison, audit trails, rollback functionality

#### Basic Usage

```typescript
import { VersionHistory } from 'spfx-toolkit/lib/components/VersionHistory';

const MyComponent: React.FC = () => {
  return (
    <VersionHistory
      listTitle="Documents"
      itemId={789}
    />
  );
};
```

#### Advanced Features

```typescript
import { VersionHistory } from 'spfx-toolkit/lib/components/VersionHistory';

const MyComponent: React.FC = () => {
  const handleVersionRestore = (versionId: number) => {
    console.log(`Restoring version ${versionId}`);
    // Custom restore logic or notifications
  };

  const handleCompare = (version1: number, version2: number) => {
    console.log(`Comparing versions ${version1} and ${version2}`);
  };

  return (
    <VersionHistory
      listTitle="Documents"
      itemId={789}
      showFieldComparison={true}
      fieldsToCompare={['Title', 'Status', 'DueDate', 'AssignedTo']}
      allowRestore={true}
      maxVersions={50}
      onVersionRestore={handleVersionRestore}
      onCompare={handleCompare}
      className="custom-version-history"
    />
  );
};
```

#### Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `listTitle` | `string` | Required | SharePoint list name |
| `itemId` | `number` | Required | List item ID |
| `showFieldComparison` | `boolean` | `true` | Show field-by-field comparison |
| `fieldsToCompare` | `string[]` | All fields | Fields to compare |
| `allowRestore` | `boolean` | `false` | Enable version restore |
| `maxVersions` | `number` | `100` | Maximum versions to display |
| `onVersionRestore` | `(versionId) => void` | - | Restore callback |
| `onCompare` | `(v1, v2) => void` | - | Compare callback |
| `className` | `string` | - | Custom CSS class |

**Required Peer Dependencies:**
- `devextreme@^22.2.3`
- `devextreme-react@^22.2.3`

---

### 6. ConflictDetector - Concurrent Editing Protection

**Bundle Impact:** Medium (~200KB)
**Use Case:** Forms, document editing, multi-user scenarios

#### Basic Usage

```typescript
import { ConflictDetector } from 'spfx-toolkit/lib/components/ConflictDetector';

const MyComponent: React.FC = () => {
  return (
    <ConflictDetector
      listTitle="Tasks"
      itemId={101}
      checkInterval={30000}  // Check every 30 seconds
      onConflictDetected={(conflict) => {
        alert(`Conflict detected! Modified by: ${conflict.modifiedBy}`);
      }}
    >
      {/* Your form or editable content */}
      <TaskEditForm itemId={101} />
    </ConflictDetector>
  );
};
```

#### Advanced Features

```typescript
import { ConflictDetector, useConflictDetection } from 'spfx-toolkit/lib/components/ConflictDetector';

const MyFormComponent: React.FC<{ itemId: number }> = ({ itemId }) => {
  const [formData, setFormData] = React.useState({});

  // Custom hook for conflict management
  const {
    hasConflict,
    conflictInfo,
    startMonitoring,
    stopMonitoring,
    resolveConflict
  } = useConflictDetection('Tasks', itemId, 30000);

  React.useEffect(() => {
    startMonitoring();
    return () => stopMonitoring();
  }, []);

  const handleSave = async () => {
    if (hasConflict) {
      const userChoice = confirm(
        `This item was modified by ${conflictInfo?.modifiedBy} at ${conflictInfo?.modifiedDate}. Continue?`
      );

      if (!userChoice) return;
      resolveConflict();  // Mark conflict as resolved
    }

    // Save form data...
  };

  return (
    <div>
      {hasConflict && (
        <MessageBar messageBarType={MessageBarType.warning}>
          Conflict detected! Modified by {conflictInfo?.modifiedBy}
        </MessageBar>
      )}
      <form onSubmit={handleSave}>
        {/* Form fields */}
      </form>
    </div>
  );
};
```

#### Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `listTitle` | `string` | Required | SharePoint list name |
| `itemId` | `number` | Required | List item ID |
| `checkInterval` | `number` | `30000` | Check interval (ms) |
| `onConflictDetected` | `(conflict) => void` | - | Conflict callback |
| `onConflictResolved` | `() => void` | - | Resolution callback |
| `children` | `ReactNode` | - | Child components to protect |

**useConflictDetection Hook:**

```typescript
const {
  hasConflict: boolean;
  conflictInfo: IConflictInfo | null;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  resolveConflict: () => void;
  checkNow: () => Promise<void>;
} = useConflictDetection(listTitle, itemId, checkInterval);
```

---

### 7. GroupViewer - SharePoint Group Display

**Bundle Impact:** Low (~70KB)
**Use Case:** Group membership display, security group info, team rosters

#### Basic Usage

```typescript
import { GroupViewer } from 'spfx-toolkit/lib/components/GroupViewer';

const MyComponent: React.FC = () => {
  return (
    <GroupViewer
      groupId={15}
      showMembers={true}
    />
  );
};
```

#### Advanced Features

```typescript
import { GroupViewer } from 'spfx-toolkit/lib/components/GroupViewer';

const MyComponent: React.FC = () => {
  return (
    <div>
      {/* By Group ID */}
      <GroupViewer
        groupId={15}
        showMembers={true}
        showOwner={true}
        showDescription={true}
        maxMembers={10}
        showMemberPhotos={true}
        onGroupLoaded={(group) => {
          console.log('Group loaded:', group);
        }}
      />

      {/* By Group Name */}
      <GroupViewer
        groupName="Project Team Members"
        showMembers={true}
        renderMemberCard={(member) => (
          <div>
            <strong>{member.Title}</strong>
            <p>{member.Email}</p>
          </div>
        )}
      />
    </div>
  );
};
```

#### Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `groupId` | `number` | - | SharePoint group ID |
| `groupName` | `string` | - | SharePoint group name |
| `showMembers` | `boolean` | `true` | Display group members |
| `showOwner` | `boolean` | `true` | Display group owner |
| `showDescription` | `boolean` | `true` | Display group description |
| `maxMembers` | `number` | `50` | Maximum members to display |
| `showMemberPhotos` | `boolean` | `true` | Show member profile photos |
| `onGroupLoaded` | `(group) => void` | - | Group load callback |
| `renderMemberCard` | `(member) => ReactNode` | - | Custom member renderer |
| `className` | `string` | - | Custom CSS class |

---

### 8. ErrorBoundary - Error Handling Wrapper

**Bundle Impact:** Low (~30KB)
**Use Case:** Component error handling, graceful degradation, error logging

#### Basic Usage

```typescript
import { ErrorBoundary } from 'spfx-toolkit/lib/components/ErrorBoundary';

const MyComponent: React.FC = () => {
  return (
    <ErrorBoundary
      fallback={<div>Oops! Something went wrong.</div>}
    >
      <ComplexComponent />
    </ErrorBoundary>
  );
};
```

#### Advanced Features

```typescript
import { ErrorBoundary, useErrorHandler } from 'spfx-toolkit/lib/components/ErrorBoundary';

const MyComponent: React.FC = () => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Custom error logging
    SPContext.logger.error('Component error', error, errorInfo);

    // Send to analytics
    trackError({
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  };

  const handleReset = () => {
    console.log('Error boundary reset');
    // Custom reset logic
  };

  return (
    <ErrorBoundary
      fallback={(error, resetError) => (
        <div>
          <h2>Error occurred</h2>
          <p>{error.message}</p>
          <button onClick={resetError}>Try Again</button>
        </div>
      )}
      onError={handleError}
      onReset={handleReset}
      showRetryButton={true}
      retryButtonText="Reload Component"
    >
      <ComplexComponent />
    </ErrorBoundary>
  );
};

// Using the error handler hook
const MyChildComponent: React.FC = () => {
  const handleError = useErrorHandler();

  const riskyOperation = async () => {
    try {
      await someOperation();
    } catch (error) {
      // Propagate error to nearest ErrorBoundary
      handleError(error);
    }
  };

  return <button onClick={riskyOperation}>Do Something</button>;
};
```

#### Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fallback` | `ReactNode \| ((error, reset) => ReactNode)` | Default UI | Error UI |
| `onError` | `(error, errorInfo) => void` | - | Error callback |
| `onReset` | `() => void` | - | Reset callback |
| `showRetryButton` | `boolean` | `true` | Show retry button |
| `retryButtonText` | `string` | `'Try Again'` | Retry button text |
| `children` | `ReactNode` | Required | Protected components |

### 9. DocumentLink - Rich SharePoint File Links

**Bundle Impact:** Medium (~45KB + optional hover-card assets)
**Use Case:** Document lists, dashboards, inline file actions
**Peer Dependencies:** `@pnp/spfx-controls-react@^3.22.0` (FileTypeIcon support)

#### Basic Usage

```typescript
import { DocumentLink } from 'spfx-toolkit/lib/components/DocumentLink';

const InlineDocument = () => (
  <DocumentLink
    documentUrl="https://tenant.sharepoint.com/sites/site/Documents/report.pdf"
    layout="linkWithIcon"
  />
);
```

#### Advanced Features

```typescript
import { DocumentLink } from 'spfx-toolkit/lib/components/DocumentLink';

const RichDocumentLink: React.FC = () => (
  <DocumentLink
    documentId={42}
    libraryName="Documents"
    layout="linkWithIconAndSize"
    sizePosition="below"
    enableHoverCard
    showVersionHistory
    showDownloadInCard
    onClick="preview"
    previewMode="view"
    previewTarget="modal"
    onAfterPreview={(doc) => console.log('Previewed', doc.name)}
    onAfterDownload={(doc) => console.log('Downloaded', doc.name)}
    onError={(error) => SPContext.logger.error('DocumentLink error', error)}
  />
);
```

#### Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `documentUrl` | `string` | - | Direct URL identifier (one of the identifiers required) |
| `documentId` + `libraryName` | `number`, `string` | - | Use when you have numeric list item ID |
| `documentUniqueId` | `string` | - | Use GUID identifier (alternative to URL/ID) |
| `layout` | `'linkOnly' \| 'linkWithIcon' \| 'linkWithIconAndSize'` | `'linkWithIcon'` | Choose link layout |
| `sizePosition` | `'inline' \| 'below'` | `'inline'` | File size placement when using size layout |
| `enableHoverCard` | `boolean` | `false` | Display metadata hover card |
| `showVersionHistory` | `boolean` | `false` | Show version history link (requires hover card) |
| `onClick` | `'download' \| 'preview'` | `'preview'` | Click behavior |
| `previewMode` | `'view' \| 'edit'` | `'view'` | SharePoint preview mode |
| `previewTarget` | `'modal' \| 'newTab'` | `'modal'` | Where to open preview |
| `enableCache` | `boolean` | `true` | Cache metadata between renders |
| `onAfterDownload` / `onAfterPreview` | `(doc) => void` | - | Post-action callbacks |
| `onError` | `(error: Error) => void` | - | Error handler |

**Related APIs:** `useDocumentMetadata`, `clearDocumentCache`, `removeCachedDocument`

---

### 10. GroupUsersPicker - Group-Based People Picker

**Bundle Impact:** Medium (~45KB + DevExtreme SelectBox/TagBox)
**Use Case:** Approval workflows, audience targeting, form people fields
**Peer Dependencies:** `devextreme@^22.2.3`, `devextreme-react@^22.2.3`

#### Basic Usage

```typescript
import * as React from 'react';
import { GroupUsersPicker, type IGroupUser } from 'spfx-toolkit/lib/components/GroupUsersPicker';

const ApproverPicker: React.FC = () => {
  const [approvers, setApprovers] = React.useState<IGroupUser[]>([]);

  return (
    <GroupUsersPicker
      groupName="Approvers"
      maxUserCount={3}
      label="Select approvers"
      selectedUsers={approvers}
      onChange={setApprovers}
      ensureUser
    />
  );
};
```

#### React Hook Form Integration

```typescript
import { useForm } from 'react-hook-form';
import { GroupUsersPicker } from 'spfx-toolkit/lib/components/spForm/customComponents/GroupUsersPicker';

const GroupPickerForm: React.FC = () => {
  const { control, handleSubmit } = useForm<{ reviewers: any[] }>({ defaultValues: { reviewers: [] } });

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <GroupUsersPicker
        name="reviewers"
        control={control}
        groupName="Reviewers"
        maxUserCount={1}
        rules={{ required: 'Reviewer required' }}
        placeholder="Pick a reviewer"
      />
      <button type="submit">Save</button>
    </form>
  );
};
```

#### Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `groupName` | `string` | Required | SharePoint group to read users from |
| `maxUserCount` | `number` | Required | `1` renders SelectBox, `>1` renders TagBox |
| `selectedUsers` | `IGroupUser[]` | `[]` | Controlled selection values |
| `ensureUser` | `boolean` | `false` | Call SharePoint `ensureUser` asynchronously |
| `useCache` | `boolean` | `false` | Use cached (spCached) or fresh (spPessimistic) lookup |
| `label` / `placeholder` | `string` | - | Fluent label and placeholder text |
| `required` / `disabled` | `boolean` | `false` | Validation helpers |
| `itemRender` | `(user) => ReactNode` | - | Custom option template |
| `onChange` | `(users: IGroupUser[]) => void` | - | Selection change handler |

**Related APIs:** `useGroupUsers`, `ensureUsers`, `ensureUsersWithCallback`, `getUserPhotoIfNotDefault`

---

### 11. spForm System - React Hook Form Building Blocks

**Bundle Impact:** High (300–500KB with DevExtreme + RHF)
**Use Case:** Complex business forms, wizard flows, validated edit experiences
**Peer Dependencies:** `react-hook-form`, `@hookform/resolvers`, `zod` (optional), `devextreme@^22.2.3`, `devextreme-react@^22.2.3`, `@pnp/spfx-controls-react` (for taxonomy/people)

#### Quick Example

```typescript
import { useForm } from 'react-hook-form';
import {
  FormContainer,
  FormItem,
  FormLabel,
  FormValue,
  FormError,
  DevExtremeTextBox,
  DevExtremeSelectBox,
} from 'spfx-toolkit/lib/components/spForm';

const RequestForm: React.FC = () => {
  const form = useForm<{ title: string; category: string }>({
    defaultValues: { title: '', category: '' },
    mode: 'onSubmit',
  });

  return (
    <FormContainer labelWidth="180px">
      <form onSubmit={form.handleSubmit(console.log)}>
        <FormItem>
          <FormLabel isRequired>Title</FormLabel>
          <FormValue>
            <DevExtremeTextBox name="title" control={form.control} placeholder="Enter title" />
            <FormError error={form.formState.errors.title?.message} />
          </FormValue>
        </FormItem>
        <FormItem>
          <FormLabel isRequired>Category</FormLabel>
          <FormValue>
            <DevExtremeSelectBox
              name="category"
              control={form.control}
              items={['Finance', 'HR', 'IT']}
              placeholder="Select category"
            />
            <FormError error={form.formState.errors.category?.message} />
          </FormValue>
        </FormItem>
        <button type="submit">Submit</button>
      </form>
    </FormContainer>
  );
};
```

#### Core Exports

| Module | Key Exports | Notes |
|--------|-------------|-------|
| Layout | `FormContainer`, `FormItem`, `FormLabel`, `FormValue`, `FormError`, `FormDescription` | Responsive layout + consistent spacing |
| DevExtreme Controls | `DevExtremeTextBox`, `DevExtremeSelectBox`, `DevExtremeDateBox`, `DevExtremeNumberBox`, `DevExtremeTagBox`, `DevExtremeSwitch`, `DevExtremeRadioGroup`, `DevExtremeAutocomplete`, `DevExtremeTextArea`, `DevExtremeCheckBox` | RHF-ready wrappers with value conversion |
| PnP Controls | `PnPPeoplePicker`, `PnPModernTaxonomyPicker` | Async SharePoint pickers with RHF integration |
| Custom Components | `GroupUsersPicker` (via `spForm/customComponents`) | Re-exports tuned for RHF |

**Usage Tips**
- Import DevExtreme styles globally: `import 'devextreme/dist/css/dx.light.css';`
- Wrap long forms in `FormContainer` for consistent label widths.
- Combine with Zod via `zodResolver` for schema validation.

#### NEW: FormContext System & Advanced Features

The spForm system now includes powerful features for enterprise-grade forms:

**FormContext System** - Centralized form state management with:
- Automatic field registry tracking
- Error handling utilities
- Focus management
- Scroll-to-error capabilities

**FormErrorSummary** - Displays all form errors in a centralized panel with click-to-navigate functionality

**Utility Hooks**:
- `useScrollToError` - Automatically scroll to first error field
- `useZustandFormSync` - Sync form state with Zustand stores for drafts/auto-save
- `useFormFieldError` - Extract error info for custom error displays

##### Complete Example with New Features

```typescript
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { create } from 'zustand';
import { TextField } from '@fluentui/react/lib/TextField';
import {
  FormProvider,
  FormContainer,
  FormItem,
  FormLabel,
  FormValue,
  FormErrorSummary,
  useScrollToError,
  useZustandFormSync,
} from 'spfx-toolkit/lib/components/spForm';

// Zustand store for form drafts
const useFormStore = create((set) => ({
  formData: {},
  setFormData: (data) => set({ formData: data }),
}));

// Validation schema
const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  email: z.string().email('Invalid email address'),
  priority: z.enum(['low', 'medium', 'high']),
});

type FormData = z.infer<typeof formSchema>;

const AdvancedRequestForm: React.FC = () => {
  const { control, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  // Auto-scroll to first error on validation
  useScrollToError(formState, {
    behavior: 'smooth',
    block: 'center',
    focusAfterScroll: true,
  });

  // Auto-save form data to Zustand store
  useZustandFormSync(control, useFormStore, {
    debounceMs: 500,
    selectFields: ['title', 'priority'], // Only sync specific fields
  });

  const onSubmit = async (data: FormData) => {
    try {
      await SPContext.sp.web.lists.getByTitle('Requests').items.add(data);
      console.log('Request created');
    } catch (error) {
      SPContext.logger.error('Failed to create request', error);
    }
  };

  return (
    <FormProvider control={control} autoShowErrors>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Error Summary - shows all errors in one place */}
        <FormErrorSummary
          position="sticky"
          clickToScroll
          showFieldLabels
          maxErrors={10}
        />

        <FormContainer labelWidth="160px">
          {/* Fields automatically register and show errors */}
          <FormItem fieldName="title" section="basic">
            <FormLabel isRequired htmlFor="title">Title</FormLabel>
            <FormValue>
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <TextField {...field} id="title" />
                )}
              />
            </FormValue>
          </FormItem>

          <FormItem fieldName="email" section="contact">
            <FormLabel isRequired htmlFor="email">Email</FormLabel>
            <FormValue>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField {...field} id="email" />
                )}
              />
            </FormValue>
          </FormItem>

          <FormItem fieldName="priority" section="settings">
            <FormLabel isRequired>Priority</FormLabel>
            <FormValue>
              <DevExtremeSelectBox
                name="priority"
                control={control}
                items={['low', 'medium', 'high']}
              />
            </FormValue>
          </FormItem>

          <button type="submit">Submit</button>
        </FormContainer>
      </form>
    </FormProvider>
  );
};
```

##### Key Features Explained

**1. FormProvider** - Wraps form to enable advanced features:
```typescript
<FormProvider control={control} autoShowErrors>
  {/* All fields get automatic error handling */}
</FormProvider>
```

**2. FormErrorSummary** - Centralized error display:
```typescript
<FormErrorSummary
  position="sticky"      // 'top' | 'bottom' | 'sticky'
  clickToScroll          // Click errors to scroll to field
  showFieldLabels        // Show labels vs field names
  maxErrors={10}         // Limit displayed errors
/>
```

**3. Enhanced FormItem** - Auto-registration and error display:
```typescript
<FormItem
  fieldName="email"      // Registers with FormContext
  autoShowError          // Automatically shows validation errors
  section="contact"      // Groups fields by section
/>
```

**4. useScrollToError** - Automatic scroll to errors:
```typescript
useScrollToError(formState, {
  behavior: 'smooth',
  block: 'center',
  focusAfterScroll: true,
  scrollDelay: 100,
});
```

**5. useZustandFormSync** - Auto-save to store:
```typescript
useZustandFormSync(control, useFormStore, {
  debounceMs: 500,                     // Debounce delay
  selectFields: ['title', 'priority'], // Only sync specific fields
  transformOut: (data) => ({           // Transform before sync
    ...data,
    lastModified: new Date(),
  }),
});
```

**6. useFormContext** - Access form utilities:
```typescript
const formContext = useFormContext();

// Available methods:
formContext.getFieldError('email');      // Get error message
formContext.hasError('email');           // Check if has error
formContext.focusField('email');         // Focus field
formContext.focusFirstError();           // Focus first error
formContext.scrollToField('email');      // Scroll to field
formContext.scrollToFirstError();        // Scroll to first error
formContext.registry.getAll();           // Get all registered fields
formContext.registry.getBySection('contact'); // Get fields by section
```

##### Multi-Step Form with Zustand

```typescript
const useWizardStore = create((set) => ({
  step1Data: {},
  step2Data: {},
  step3Data: {},
  currentStep: 1,
  setStep1Data: (data) => set({ step1Data: data }),
  setStep2Data: (data) => set({ step2Data: data }),
  setStep3Data: (data) => set({ step3Data: data }),
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  prevStep: () => set((state) => ({ currentStep: state.currentStep - 1 })),
}));

const WizardStep1: React.FC = () => {
  const { control, handleSubmit } = useForm();
  const { nextStep } = useWizardStore();

  useZustandFormSync(control, useWizardStore, {
    setMethod: 'setStep1Data',
    debounceMs: 300,
  });

  const onNext = (data) => {
    console.log('Step 1 data saved to store:', data);
    nextStep();
  };

  return (
    <FormProvider control={control}>
      <form onSubmit={handleSubmit(onNext)}>
        {/* Step 1 fields */}
        <button type="submit">Next</button>
      </form>
    </FormProvider>
  );
};
```

##### Form Draft Auto-Save with Persistence

```typescript
import { persist } from 'zustand/middleware';

const useFormDraftStore = create(
  persist(
    (set) => ({
      draft: {},
      saveDraft: (data) => set({ draft: data }),
      clearDraft: () => set({ draft: {} }),
    }),
    {
      name: 'form-draft', // localStorage key
    }
  )
);

const FormWithAutoSave: React.FC = () => {
  const { control, reset } = useForm();
  const { draft, saveDraft } = useFormDraftStore();

  // Load draft on mount
  React.useEffect(() => {
    if (draft && Object.keys(draft).length > 0) {
      reset(draft);
    }
  }, []);

  // Auto-save every 500ms
  useZustandFormSync(control, useFormDraftStore, {
    setMethod: 'saveDraft',
    debounceMs: 500,
  });

  return (
    <FormProvider control={control}>
      {/* Form fields */}
    </FormProvider>
  );
};
```

##### Accessibility Features

The new form system is WCAG 2.1 AA compliant with:

- **ARIA attributes**: All form elements have proper `aria-invalid`, `aria-describedby`, `aria-required`
- **Label associations**: FormLabel with `htmlFor` links to inputs
- **Error announcements**: Errors have `role="alert"` and `aria-live="polite"`
- **Keyboard navigation**: Full keyboard support for FormErrorSummary
- **Screen reader support**: Comprehensive announcements for all interactions

```typescript
<FormItem fieldName="email">
  <FormLabel isRequired htmlFor="email">
    Email Address
  </FormLabel>
  <FormValue>
    <Controller
      name="email"
      control={control}
      render={({ field }) => (
        <TextField
          {...field}
          id="email"                              // Links to label
          aria-invalid={hasError}                 // Invalid state
          aria-describedby="email-error"          // Links to error
        />
      )}
    />
  </FormValue>
</FormItem>
```

##### Performance Optimization

- **Debounced Zustand sync**: Prevents excessive store updates
- **Memoized context**: FormContext value is memoized to prevent re-renders
- **Efficient field registry**: Uses Map for O(1) field lookups
- **Smart scroll**: Uses native `scrollIntoView` for optimal performance

##### Further Reading

For detailed documentation:
- [FormContext System](../src/components/spForm/context/README.md)
- [Utility Hooks Guide](../src/components/spForm/hooks/README.md)
- [FormErrorSummary Component](../src/components/spForm/FormErrorSummary/README.md)
- [Main spForm README](../src/components/spForm/README.md)

---

### 12. SPField Suite - SharePoint Field Controls

**Bundle Impact:** Medium–High (varies per field; relies on DevExtreme + RHF)
**Use Case:** List form replacements, data collection aligned with SharePoint field types

#### Basic Usage

> **⚠️ CRITICAL: Validation Requires `control` Prop or FormProvider**
> To enable validation, error messages, and proper form integration, you have **two options**:
>
> **Option 1: Pass `control` directly to each field**
> ```typescript
> <SPTextField name="title" control={form.control} required />
> ```
>
> **Option 2: Use FormProvider (recommended for multiple fields)**
> ```typescript
> <FormProvider control={form.control}>
>   <SPTextField name="title" required />  {/* Gets control from context */}
>   <SPChoiceField name="status" required />  {/* Gets control from context */}
> </FormProvider>
> ```
>
> Without either option:
> - ❌ Validation will not work (no red borders, no error messages)
> - ❌ `isValid` will always be `true`
> - ❌ `fieldState.error` will always be `undefined`
> - ✅ Component will work in "standalone mode" but without form integration

**Option 1: Pass control directly (works, but verbose)**
```typescript
import { useForm } from 'react-hook-form';
import { SPTextField, SPChoiceField, SPUserField } from 'spfx-toolkit/lib/components/spFields';

const TaskEditor: React.FC = () => {
  const form = useForm<{ title: string; status: string; assignees: number[] }>({
    defaultValues: { title: '', status: '', assignees: [] },
  });

  return (
    <form onSubmit={form.handleSubmit(console.log)}>
      <SPTextField
        name="title"
        label="Title"
        control={form.control}  // Must pass to each field
        rules={{ required: 'Title required' }}
      />
      <SPChoiceField
        name="status"
        label="Status"
        control={form.control}  // Must pass to each field
        choices={['Draft', 'Review', 'Approved']}
      />
      <SPUserField
        name="assignees"
        label="Assignees"
        control={form.control}  // Must pass to each field
        allowMultiple
      />
      <button type="submit">Save</button>
    </form>
  );
};
```

**Option 2: Use FormProvider (recommended, cleaner)**
```typescript
import { useForm } from 'react-hook-form';
import { FormProvider } from 'spfx-toolkit/lib/components/spForm';
import { SPTextField, SPChoiceField, SPUserField } from 'spfx-toolkit/lib/components/spFields';

const TaskEditor: React.FC = () => {
  const form = useForm<{ title: string; status: string; assignees: number[] }>({
    defaultValues: { title: '', status: '', assignees: [] },
  });

  return (
    <FormProvider control={form.control}>  {/* Provide control once */}
      <form onSubmit={form.handleSubmit(console.log)}>
        <SPTextField
          name="title"
          label="Title"
          rules={{ required: 'Title required' }}
          // No need to pass control!
        />
        <SPChoiceField
          name="status"
          label="Status"
          choices={['Draft', 'Review', 'Approved']}
          // No need to pass control!
        />
        <SPUserField
          name="assignees"
          label="Assignees"
          allowMultiple
          // No need to pass control!
        />
        <button type="submit">Save</button>
      </form>
    </FormProvider>
  );
};
```

#### Component Coverage

| Component | Field Type Highlights |
|-----------|----------------------|
| `SPTextField` | Single/multi-line text, rich text, note history |
| `SPChoiceField` | Choice & multi-choice, custom values, async loaders |
| `SPUserField` | People & groups, display modes, auto `ensureUser` |
| `SPDateField` | Date only + date/time, friendly formatting |
| `SPNumberField` | Integers, decimals, min/max, formatting |
| `SPBooleanField` | Checkbox or toggle switch display |
| `SPUrlField` | URL + description pairs, link validation |
| `SPLookupField` | Lookup + dependent lookup data sources |
| `SPTaxonomyField` | Managed metadata (single/multi) via PnP taxonomy |
| `SPField` | Metadata-driven smart field that renders correct control |

**Notes**
- All fields support RHF `name`, `control`, and `rules` props.
- Combine with `SPContext.smart` to enable SharePoint-backed lookups.
- Utility types in `spFields/types` help define strongly-typed list item models.

#### Troubleshooting Validation

**Problem: No red border or error messages appear**

Check these common issues:

1. **Missing `control` prop or FormProvider** (most common)
   ```typescript
   // ❌ WRONG - No validation
   <SPTextField name="title" rules={{ required: true }} />

   // ✅ CORRECT - Option 1: Direct control prop
   <SPTextField name="title" control={form.control} rules={{ required: true }} />

   // ✅ CORRECT - Option 2: FormProvider (recommended)
   <FormProvider control={form.control}>
     <SPTextField name="title" rules={{ required: true }} />
   </FormProvider>
   ```

2. **Form mode settings** - Validation timing depends on `mode` and `reValidateMode`:
   ```typescript
   const form = useForm({
     mode: 'onSubmit',        // Validate only on submit
     reValidateMode: 'onChange' // Re-validate on every change after first submit
   });
   ```

   Try submitting the form first - errors may appear after submission depending on your mode.

3. **Validation rules not triggering** - Check that rules are properly defined:
   ```typescript
   // ✅ Use zod resolver
   const form = useForm({
     resolver: zodResolver(schema),
   });

   // ✅ Or use rules prop
   <SPTextField
     name="title"
     control={form.control}
     rules={{ required: 'Title is required', minLength: { value: 3, message: 'Min 3 chars' } }}
   />
   ```

4. **Debug validation state** - Add console logs to inspect fieldState:
   ```typescript
   console.log('Form errors:', form.formState.errors);
   console.log('Form state:', form.formState);
   ```

---

### 13. Lazy Components - On-Demand Heavy Features

**Bundle Impact:** Wrapper only (~3–5KB) + deferred component chunk
**Use Case:** Reduce initial bundle size by loading heavy components on demand

```typescript
import * as React from 'react';
import {
  LazyVersionHistory,
  LazyManageAccessComponent,
  LazyManageAccessPanel,
  LazyConflictDetector,
  LazyWorkflowStepper,
  preloadComponent,
} from 'spfx-toolkit/lib/components/lazy';

const VersionHistoryTrigger: React.FC = () => {
  const [showHistory, setShowHistory] = React.useState(false);

  return (
    <>
      <button
        onMouseEnter={() => preloadComponent(() => import('spfx-toolkit/lib/components/VersionHistory'))}
        onClick={() => setShowHistory(true)}
      >
        View Version History
      </button>

      {showHistory && (
        <LazyVersionHistory
          listTitle="Documents"
          itemId={123}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
};
```

**Available Lazy Exports**
- `LazyVersionHistory`
- `LazyManageAccessComponent`
- `LazyManageAccessPanel`
- `LazyConflictDetector`
- `LazyWorkflowStepper`

Use `preloadComponent` or `useLazyPreload` to warm caches when users show intent. Pair with `LazyLoadErrorBoundary` for dedicated load/error UI.

---

## Custom Hooks

## Custom Hooks

### useLocalStorage - Persistent State Management

**Use Case:** User preferences, form data, UI state persistence

```typescript
import { useLocalStorage } from 'spfx-toolkit/lib/hooks';

const MyComponent: React.FC = () => {
  // Simple value
  const [name, setName] = useLocalStorage('userName', 'John Doe');

  // Complex object
  const [settings, setSettings] = useLocalStorage('appSettings', {
    theme: 'light',
    notifications: true,
    language: 'en'
  });

  // With type safety
  interface IUserPreferences {
    view: 'grid' | 'list';
    sortBy: string;
    pageSize: number;
  }

  const [prefs, setPrefs] = useLocalStorage<IUserPreferences>('userPrefs', {
    view: 'grid',
    sortBy: 'title',
    pageSize: 20
  });

  return (
    <div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <button onClick={() => setSettings({ ...settings, theme: 'dark' })}>
        Toggle Theme
      </button>

      <select
        value={prefs.view}
        onChange={(e) => setPrefs({ ...prefs, view: e.target.value as 'grid' | 'list' })}
      >
        <option value="grid">Grid</option>
        <option value="list">List</option>
      </select>
    </div>
  );
};
```

**API:**

```typescript
function useLocalStorage<T>(
  key: string,           // localStorage key
  initialValue: T        // Default value if key doesn't exist
): [T, (value: T | ((prev: T) => T)) => void];
```

**Features:**
- Automatic JSON serialization/deserialization
- SSR-safe (checks for window existence)
- TypeScript generic support
- Functional updates like `useState`

---

### useViewport - Responsive Breakpoint Detection

**Use Case:** Responsive layouts, mobile/desktop rendering, adaptive UI

```typescript
import { useViewport } from 'spfx-toolkit/lib/hooks';

const MyComponent: React.FC = () => {
  const { width, height, isMobile, isTablet, isDesktop, isLargeScreen } = useViewport();

  return (
    <div>
      {/* Conditional rendering based on device */}
      {isMobile && <MobileView />}
      {isTablet && <TabletView />}
      {isDesktop && <DesktopView />}

      {/* Viewport dimensions */}
      <p>Screen size: {width}x{height}</p>

      {/* Responsive layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr 1fr'
      }}>
        <Card title="Card 1" />
        <Card title="Card 2" />
        <Card title="Card 3" />
      </div>
    </div>
  );
};
```

**API:**

```typescript
interface IViewport {
  width: number;          // Current viewport width (px)
  height: number;         // Current viewport height (px)
  isMobile: boolean;      // width < 768px
  isTablet: boolean;      // 768px <= width < 1024px
  isDesktop: boolean;     // 1024px <= width < 1920px
  isLargeScreen: boolean; // width >= 1920px
}

function useViewport(): IViewport;
```

**Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1023px
- Desktop: 1024px - 1919px
- Large Screen: >= 1920px

---

### useCardController - Programmatic Card Control

**Use Case:** External card state management, synchronized cards, complex layouts

```typescript
import { Card, useCardController } from 'spfx-toolkit/lib/components/Card';

const MyComponent: React.FC = () => {
  const card1 = useCardController('card-1');
  const card2 = useCardController('card-2');

  const expandAll = () => {
    card1.expand();
    card2.expand();
  };

  const collapseAll = () => {
    card1.collapse();
    card2.collapse();
  };

  const toggleBoth = () => {
    card1.toggle();
    card2.toggle();
  };

  return (
    <div>
      <Stack horizontal tokens={{ childrenGap: 10 }}>
        <button onClick={expandAll}>Expand All</button>
        <button onClick={collapseAll}>Collapse All</button>
        <button onClick={toggleBoth}>Toggle Both</button>
      </Stack>

      <Card cardId="card-1" title="Card 1" allowExpand>
        <p>Content 1</p>
      </Card>

      <Card cardId="card-2" title="Card 2" allowExpand>
        <p>Content 2</p>
      </Card>
    </div>
  );
};
```

**API:**

```typescript
interface ICardController {
  expand: () => void;
  collapse: () => void;
  toggle: () => void;
  isExpanded: boolean;
}

function useCardController(cardId: string): ICardController;
```

---

## Utilities

### 1. BatchBuilder - Efficient SharePoint Batch Operations

**Use Case:** Multiple CRUD operations, cross-list updates, performance optimization

```typescript
import { BatchBuilder } from 'spfx-toolkit/lib/utilities/batchBuilder';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// Basic usage
const batch = new BatchBuilder(SPContext.sp);

const result = await batch
  .list('Tasks')
  .add({ Title: 'New Task', Status: 'Active' })
  .update(10, { Status: 'Completed' })
  .delete(15)
  .list('Notifications')
  .add({ Message: 'Task completed', UserId: 123 })
  .execute();

// Check results
if (result.success) {
  console.log('All operations succeeded');
  console.log('Results:', result.results);
} else {
  console.error('Some operations failed:', result.errors);
}
```

**Advanced Usage:**

```typescript
// Concurrent execution (faster but less safe)
const batch = new BatchBuilder(SPContext.sp, {
  batchSize: 100,          // Items per batch (default: 100)
  enableConcurrency: true  // Parallel execution (default: false)
});

// Multiple lists
const result = await batch
  .list('Projects')
  .add({ Title: 'Q1 Initiative', Status: 'Planning' })
  .add({ Title: 'Q2 Initiative', Status: 'Planning' })
  .list('ProjectMembers')
  .add({ ProjectId: 1, UserId: 50 })
  .add({ ProjectId: 1, UserId: 51 })
  .list('Notifications')
  .add({ Message: 'New projects created' })
  .execute();

// Process results by operation
result.results.forEach(op => {
  console.log(`${op.type} on ${op.listName}: ${op.success ? 'Success' : 'Failed'}`);
  if (op.type === 'add' && op.result) {
    console.log('New item ID:', op.result.ID);
  }
});
```

**API Reference:**

```typescript
class BatchBuilder {
  constructor(
    sp: SPFI,                        // PnP SP instance
    options?: IBatchBuilderOptions   // Configuration
  );

  list(title: string): this;         // Target list
  add(data: any): this;              // Add item
  update(id: number, data: any): this;  // Update item
  delete(id: number): this;          // Delete item
  execute(): Promise<IBatchResult>;  // Execute batch
}

interface IBatchBuilderOptions {
  batchSize?: number;          // Items per batch (default: 100)
  enableConcurrency?: boolean; // Parallel execution (default: false)
}

interface IBatchResult {
  success: boolean;            // All operations succeeded
  results: IOperationResult[]; // Operation results
  errors: IOperationError[];   // Failed operations
  totalOperations: number;     // Total operation count
  successCount: number;        // Successful operations
  errorCount: number;          // Failed operations
}
```

---

### 2. PermissionHelper - Permission Validation & Management

**Use Case:** Access control, permission checks, security validation

```typescript
import {
  PermissionHelper,
  PermissionLevel
} from 'spfx-toolkit/lib/utilities/permissionHelper';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// Initialize
const permHelper = new PermissionHelper(SPContext.sp);

// Check user permissions on list item
const hasEditAccess = await permHelper.checkPermissions(
  'Documents',    // List title
  123,            // Item ID
  PermissionLevel.Edit
);

if (hasEditAccess) {
  // Show edit button
}

// Check multiple permission levels
const permissions = await permHelper.validateAccess(
  'Documents',
  123,
  [PermissionLevel.View, PermissionLevel.Edit, PermissionLevel.Delete]
);

console.log(permissions);
// { View: true, Edit: true, Delete: false }
```

**Advanced Usage:**

```typescript
import { PermissionHelper, PermissionLevel } from 'spfx-toolkit/lib/utilities/permissionHelper';

// Check list-level permissions
const canManageList = await permHelper.hasListPermission(
  'Documents',
  PermissionLevel.ManageLists
);

// Check site-level permissions
const isSiteAdmin = await permHelper.hasSitePermission(
  PermissionLevel.FullControl
);

// Get user's effective permissions
const effectivePerms = await permHelper.getEffectivePermissions(
  'Documents',
  123
);

console.log('User can:', {
  view: effectivePerms.hasView,
  edit: effectivePerms.hasEdit,
  delete: effectivePerms.hasDelete,
  managePermissions: effectivePerms.hasManagePermissions
});

// Custom permission checks with base permissions
const canApprove = await permHelper.checkBasePermissions(
  'Documents',
  123,
  PermissionKind.ApproveItems  // From @pnp/sp
);
```

**Permission Levels:**

```typescript
enum PermissionLevel {
  View = 'View',
  Edit = 'Edit',
  Contribute = 'Contribute',
  Delete = 'Delete',
  ManagePermissions = 'ManagePermissions',
  ManageLists = 'ManageLists',
  FullControl = 'FullControl'
}
```

**API Reference:**

```typescript
class PermissionHelper {
  constructor(sp: SPFI);

  checkPermissions(
    listTitle: string,
    itemId: number,
    level: PermissionLevel
  ): Promise<boolean>;

  validateAccess(
    listTitle: string,
    itemId: number,
    levels: PermissionLevel[]
  ): Promise<Record<string, boolean>>;

  hasListPermission(
    listTitle: string,
    level: PermissionLevel
  ): Promise<boolean>;

  hasSitePermission(
    level: PermissionLevel
  ): Promise<boolean>;

  getEffectivePermissions(
    listTitle: string,
    itemId: number
  ): Promise<IEffectivePermissions>;
}
```

---

### 3. ListItemHelper - Field Extraction & Updates

**Use Case:** Type-safe field access, field transformations, data extraction

```typescript
import {
  createSPExtractor,
  createSPUpdater
} from 'spfx-toolkit/lib/utilities/listItemHelper';

// Get list item from SharePoint
const item = await SPContext.sp.web.lists
  .getByTitle('Tasks')
  .items.getById(123)();

// Extract fields with type safety
const extractor = createSPExtractor(item);

const title = extractor.getText('Title');
const dueDate = extractor.getDate('DueDate');
const assignee = extractor.getUser('AssignedTo');
const status = extractor.getChoice('Status');
const priority = extractor.getNumber('Priority');
const tags = extractor.getMultiChoice('Tags');
const attachments = extractor.getAttachments('Attachments');

// Update fields
const updater = createSPUpdater();

updater.setText('Title', 'Updated Task');
updater.setDate('DueDate', new Date('2024-12-31'));
updater.setUser('AssignedTo', 50);  // User ID
updater.setChoice('Status', 'In Progress');
updater.setMultiChoice('Tags', ['urgent', 'high-priority']);

// Get update payload
const updatePayload = updater.getPayload();

// Apply update
await SPContext.sp.web.lists
  .getByTitle('Tasks')
  .items.getById(123)
  .update(updatePayload);
```

**Advanced Usage:**

```typescript
import { createSPExtractor } from 'spfx-toolkit/lib/utilities/listItemHelper';

// Lookup fields
const projectId = extractor.getLookup('Project');  // Returns lookup ID
const projectTitle = extractor.getLookupValue('Project', 'Title');  // Returns lookup value

// Multi-select lookups
const categoryIds = extractor.getMultiLookup('Categories');
const categoryNames = extractor.getMultiLookupValues('Categories', 'Title');

// Person/Group fields
const author = extractor.getUser('Author');
console.log(author);
// { Id: 123, Title: 'John Doe', Email: 'john@company.com' }

// Multi-person fields
const reviewers = extractor.getMultiUser('Reviewers');
reviewers.forEach(user => {
  console.log(user.Title, user.Email);
});

// Managed metadata
const metadata = extractor.getMetadata('Department');
console.log(metadata);
// { TermGuid: '...', Label: 'Engineering', WssId: 5 }

// Calculated/Computed fields
const computed = extractor.getComputed('CalculatedField');

// Rich text fields
const description = extractor.getRichText('Description');

// With default values
const priority = extractor.getNumber('Priority', 1);  // Default to 1 if null
const status = extractor.getChoice('Status', 'New');   // Default to 'New'
```

**API Reference:**

```typescript
interface ISPExtractor {
  getText(fieldName: string, defaultValue?: string): string;
  getNumber(fieldName: string, defaultValue?: number): number;
  getBoolean(fieldName: string, defaultValue?: boolean): boolean;
  getDate(fieldName: string): Date | null;
  getChoice(fieldName: string, defaultValue?: string): string;
  getMultiChoice(fieldName: string): string[];
  getUser(fieldName: string): IUserInfo | null;
  getMultiUser(fieldName: string): IUserInfo[];
  getLookup(fieldName: string): number | null;
  getLookupValue(fieldName: string, valueField: string): any;
  getMultiLookup(fieldName: string): number[];
  getMultiLookupValues(fieldName: string, valueField: string): any[];
  getMetadata(fieldName: string): IMetadataInfo | null;
  getRichText(fieldName: string): string;
  getAttachments(fieldName: string): string[];
  getComputed(fieldName: string): any;
}

interface ISPUpdater {
  setText(fieldName: string, value: string): this;
  setNumber(fieldName: string, value: number): this;
  setBoolean(fieldName: string, value: boolean): this;
  setDate(fieldName: string, value: Date): this;
  setChoice(fieldName: string, value: string): this;
  setMultiChoice(fieldName: string, values: string[]): this;
  setUser(fieldName: string, userId: number): this;
  setMultiUser(fieldName: string, userIds: number[]): this;
  setLookup(fieldName: string, lookupId: number): this;
  setMultiLookup(fieldName: string, lookupIds: number[]): this;
  getPayload(): Record<string, any>;
  clear(): this;
}
```

---

### 4. StringUtils - String Manipulation

**Use Case:** File name extraction, text formatting, initials generation

```typescript
import { StringUtils } from 'spfx-toolkit/lib/utilities/stringUtils';

// File name extraction
const fileName = StringUtils.getFileName('/sites/mysite/documents/report.pdf');
// Returns: 'report.pdf'

const fileNameNoExt = StringUtils.getFileNameWithoutExtension('report.pdf');
// Returns: 'report'

const extension = StringUtils.getFileExtension('document.docx');
// Returns: 'docx'

// Initials generation
const initials = StringUtils.getInitials('John Michael Doe');
// Returns: 'JD' (first and last)

const allInitials = StringUtils.getAllInitials('John Michael Doe');
// Returns: 'JMD' (all words)

// Text truncation
const truncated = StringUtils.truncate('This is a very long text that needs truncation', 20);
// Returns: 'This is a very lo...'

const truncatedCustom = StringUtils.truncate('Long text here', 10, '---');
// Returns: 'Long te---'

// Capitalization
const title = StringUtils.toTitleCase('hello world from sharepoint');
// Returns: 'Hello World From Sharepoint'

const camel = StringUtils.toCamelCase('Hello World');
// Returns: 'helloWorld'

const pascal = StringUtils.toPascalCase('hello world');
// Returns: 'HelloWorld'

const kebab = StringUtils.toKebabCase('Hello World');
// Returns: 'hello-world'

// String validation
const isEmpty = StringUtils.isEmpty('   ');  // true
const isNotEmpty = StringUtils.isEmpty('text');  // false

// Safe trim
const trimmed = StringUtils.safeTrim(null);  // Returns ''
const trimmed2 = StringUtils.safeTrim('  text  ');  // Returns 'text'
```

**API Reference:**

```typescript
class StringUtils {
  static getFileName(path: string): string;
  static getFileNameWithoutExtension(path: string): string;
  static getFileExtension(path: string): string;
  static getInitials(name: string): string;
  static getAllInitials(name: string): string;
  static truncate(text: string, maxLength: number, suffix?: string): string;
  static toTitleCase(text: string): string;
  static toCamelCase(text: string): string;
  static toPascalCase(text: string): string;
  static toKebabCase(text: string): string;
  static isEmpty(text: string | null | undefined): boolean;
  static safeTrim(text: string | null | undefined): string;
}
```

---

### 5. DateUtils - Date Operations

**Use Case:** Date formatting, relative time, date calculations

```typescript
import { DateUtils } from 'spfx-toolkit/lib/utilities/dateUtils';

// Date formatting
const formatted = DateUtils.formatDate(new Date(), 'MM/DD/YYYY');
// Returns: '10/13/2025'

const time = DateUtils.formatDate(new Date(), 'hh:mm A');
// Returns: '02:30 PM'

const full = DateUtils.formatDate(new Date(), 'MMMM DD, YYYY');
// Returns: 'October 13, 2025'

// Relative time
const relative = DateUtils.getRelativeTime(new Date('2025-10-12'));
// Returns: '1 day ago'

const future = DateUtils.getRelativeTime(new Date('2025-10-20'));
// Returns: 'in 7 days'

// Date calculations
const tomorrow = DateUtils.addDays(new Date(), 1);
const nextWeek = DateUtils.addWeeks(new Date(), 1);
const nextMonth = DateUtils.addMonths(new Date(), 1);
const nextYear = DateUtils.addYears(new Date(), 1);

// Date differences
const daysDiff = DateUtils.getDaysBetween(
  new Date('2025-10-01'),
  new Date('2025-10-13')
);
// Returns: 12

// Date validation
const isToday = DateUtils.isToday(new Date());  // true
const isPast = DateUtils.isPast(new Date('2025-01-01'));  // true
const isFuture = DateUtils.isFuture(new Date('2026-01-01'));  // true

// Start/end of period
const startOfDay = DateUtils.getStartOfDay(new Date());
const endOfDay = DateUtils.getEndOfDay(new Date());
const startOfWeek = DateUtils.getStartOfWeek(new Date());
const endOfWeek = DateUtils.getEndOfWeek(new Date());
const startOfMonth = DateUtils.getStartOfMonth(new Date());
const endOfMonth = DateUtils.getEndOfMonth(new Date());
```

**Format Patterns:**

| Pattern | Output | Description |
|---------|--------|-------------|
| `YYYY` | 2025 | 4-digit year |
| `YY` | 25 | 2-digit year |
| `MMMM` | October | Full month name |
| `MMM` | Oct | Short month name |
| `MM` | 10 | 2-digit month |
| `M` | 10 | Month number |
| `DD` | 13 | 2-digit day |
| `D` | 13 | Day number |
| `dddd` | Monday | Full day name |
| `ddd` | Mon | Short day name |
| `HH` | 14 | 24-hour (00-23) |
| `hh` | 02 | 12-hour (01-12) |
| `mm` | 30 | Minutes |
| `ss` | 45 | Seconds |
| `A` | PM | AM/PM |
| `a` | pm | am/pm |

**API Reference:**

```typescript
class DateUtils {
  static formatDate(date: Date, format: string): string;
  static getRelativeTime(date: Date): string;
  static addDays(date: Date, days: number): Date;
  static addWeeks(date: Date, weeks: number): Date;
  static addMonths(date: Date, months: number): Date;
  static addYears(date: Date, years: number): Date;
  static getDaysBetween(start: Date, end: Date): number;
  static isToday(date: Date): boolean;
  static isPast(date: Date): boolean;
  static isFuture(date: Date): boolean;
  static getStartOfDay(date: Date): Date;
  static getEndOfDay(date: Date): Date;
  static getStartOfWeek(date: Date): Date;
  static getEndOfWeek(date: Date): Date;
  static getStartOfMonth(date: Date): Date;
  static getEndOfMonth(date: Date): Date;
}
```

---

### 6. CssLoader - SharePoint Library Styles

**Use Case:** Inject custom CSS from `Style Library`/`Site Assets`, theme toggles, feature-specific styling

```typescript
import { CssLoader } from 'spfx-toolkit/lib/utilities/CssLoader';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

export default class MyWebPart extends BaseClientSideWebPart<{}> {
  protected async onInit(): Promise<void> {
    await SPContext.smart(this.context, 'MyWebPart');

    CssLoader.loadCssFiles(SPContext.webAbsoluteUrl, 'Style Library', [
      'global/base.css',
      'components/workflow-stepper.css',
    ]);
  }
}
```

#### API Highlights

| Method | Signature | Notes |
|--------|-----------|-------|
| `loadCssFile` | `(webUrl, libraryName, fileName, options?)` | Loads single CSS asset; cached by default |
| `loadCssFiles` | `(webUrl, libraryName, files[], options?)` | Loads multiple files in order |

**Tips**
- Disable caching during theming or live previews: `{ cache: false }`
- Organize assets by folder (`themes/dark.css`, `components/card.css`) and load conditionally
- Call during `onInit()` to avoid layout shifts

---

### 7. LazyLoader Utility - Custom Lazy Components

**Use Case:** Create lazy wrappers with custom fallbacks, preload heavy modules on demand

```typescript
import * as React from 'react';
import { createLazyComponent, preloadComponent, useLazyPreload } from 'spfx-toolkit/lib/utilities/lazyLoader';

const lazyAdminImport = () => import('../AdminPanel').then((m) => ({ default: m.AdminPanel }));

const LazyAdminPanel = createLazyComponent(lazyAdminImport, {
  fallback: <div style={{ padding: 24 }}>Loading admin tools…</div>,
  errorMessage: 'Unable to load admin tools. Please refresh.',
  minLoadingTime: 250,
});

const SettingsButton: React.FC = () => {
  const [showPanel, setShowPanel] = React.useState(false);

  useLazyPreload(lazyAdminImport, showPanel);

  return (
    <>
      <button
        onMouseEnter={() => preloadComponent(lazyAdminImport)}
        onClick={() => setShowPanel(true)}
      >
        Admin Settings
      </button>
      {showPanel && <LazyAdminPanel onDismiss={() => setShowPanel(false)} />}
    </>
  );
};
```

**Helper Components**
- `LazyLoadFallback` – Consistent shimmer/loading indicator
- `LazyLoadErrorBoundary` – Component-level error handling around lazy boundaries
- `preloadComponent` / `useLazyPreload` – Warm caches on hover/focus or state changes

---

## TypeScript Types

The toolkit provides **comprehensive, reusable TypeScript types** for all components, utilities, and SharePoint operations. These types can be imported and used in any SPFx application for type-safe development.

---

### Quick Import Reference

```typescript
// ===== CORE TYPES (Global) =====
import type {
  // SharePoint Field Types
  IPrincipal,
  SPLookup,
  SPTaxonomy,
  SPUrl,
  SPLocation,
  SPImage,
  IListItemFormUpdateValue,

  // Batch Operation Types
  OperationType,
  IBatchOperation,
  IOperationResult,
  IBatchError,
  IBatchResult,
  IBatchBuilderConfig,

  // Permission Types
  SPPermissionLevel,
  IPermissionResult,
  IUserPermissions,
  IItemPermissions,
  IPermissionHelperConfig,
  ISPUser,
  ISPGroup,
  ISPRoleAssignment,
  PermissionErrorCode
} from 'spfx-toolkit/lib/types';

// ===== COMPONENT TYPES =====
import type {
  // Card Component
  CardProps,
  CardVariant,
  CardSize,
  CardAction,
  CardEventData,
  CardState,
  CardController,
  AccordionProps,

  // WorkflowStepper Component
  WorkflowStepperProps,
  StepData,
  StepStatus,
  StepperMode,

  // ConflictDetector Component
  ConflictInfo,
  ConflictSeverity,
  ConflictDetectionOptions,
  UseConflictDetectionReturn,

  // GroupViewer Component
  IGroupViewerProps,
  IGroupMember,
  IGroupInfo,
  SPPrincipalType,

  // ManageAccess Component
  IPermissionPrincipal,
  ISPRoleAssignment,
  ISPMember,
  ISPRoleDefinition,
  IManageAccessComponentProps
} from 'spfx-toolkit/lib/components';
```

---

### 1. Core Global Types

These types are available from `spfx-toolkit/lib/types` and can be reused across your entire application.

#### 1.1 SharePoint Field Value Types

```typescript
/**
 * SharePoint user/principal interface
 * Use for Person/Group fields
 */
export interface IPrincipal {
  id: string;
  email?: string;
  title?: string;
  value?: string;              // login name
  loginName?: string;
  department?: string;
  jobTitle?: string;
  sip?: string;
  picture?: string;
}

/**
 * SharePoint lookup field object
 */
export interface SPLookup {
  id?: number;
  title?: string;
}

/**
 * SharePoint taxonomy/managed metadata field object
 */
export interface SPTaxonomy {
  label?: string;
  termId?: string;
  wssId?: number;
}

/**
 * SharePoint URL/hyperlink field object
 */
export interface SPUrl {
  url?: string;
  description?: string;
}

/**
 * SharePoint location field object
 */
export interface SPLocation {
  displayName?: string;
  locationUri?: string;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
}

/**
 * SharePoint image field object
 */
export interface SPImage {
  serverUrl?: string;
  serverRelativeUrl?: string;
  id?: string;
  fileName?: string;
}

/**
 * Interface for validateUpdateListItem field values
 */
export interface IListItemFormUpdateValue {
  FieldName: string;
  FieldValue: string;
}
```

**Usage Example:**

```typescript
import type { IPrincipal, SPLookup, SPTaxonomy } from 'spfx-toolkit/lib/types';

interface IProjectItem {
  Id: number;
  Title: string;
  ProjectManager: IPrincipal;           // Person field
  Category: SPLookup;                   // Lookup field
  Department: SPTaxonomy;               // Managed metadata field
  RelatedProjects: SPLookup[];          // Multi-lookup field
  TeamMembers: IPrincipal[];            // Multi-person field
}

// Type-safe field access
const manager: IPrincipal = projectItem.ProjectManager;
console.log(manager.email, manager.title);

const category: SPLookup = projectItem.Category;
console.log(category.id, category.title);
```

---

#### 1.2 Batch Operation Types

```typescript
/**
 * Batch operation types
 */
export type OperationType =
  | 'add'
  | 'update'
  | 'delete'
  | 'addValidateUpdateItemUsingPath'
  | 'validateUpdateListItem';

/**
 * Single batch operation definition
 */
export interface IBatchOperation {
  listName: string;
  operationType: OperationType;
  itemId?: number;
  data?: any;
  formValues?: IListItemFormUpdateValue[];
  path?: string;
  eTag?: string;
  operationId?: string;
}

/**
 * Result of a single operation
 */
export interface IOperationResult {
  operationType: string;
  listName: string;
  success: boolean;
  data?: any;
  error?: string;
  itemId?: number;
  operationId?: string;
}

/**
 * Batch operation error
 */
export interface IBatchError {
  listName: string;
  operationType: string;
  error: string;
  itemId?: number;
  operationId?: string;
}

/**
 * Complete batch operation result
 */
export interface IBatchResult {
  success: boolean;              // All operations succeeded
  totalOperations: number;       // Total operations count
  successfulOperations: number;  // Successful count
  failedOperations: number;      // Failed count
  results: IOperationResult[];   // All operation results
  errors: IBatchError[];         // Failed operations
}

/**
 * Batch builder configuration
 */
export interface IBatchBuilderConfig {
  batchSize?: number;            // Items per batch (default: 100)
  enableConcurrency?: boolean;   // Parallel execution (default: false)
}
```

**Usage Example:**

```typescript
import type { IBatchResult, IBatchError } from 'spfx-toolkit/lib/types';
import { BatchBuilder } from 'spfx-toolkit/lib/utilities/batchBuilder';

const executeBatchOperations = async (): Promise<IBatchResult> => {
  const batch = new BatchBuilder(SPContext.sp, {
    batchSize: 50,
    enableConcurrency: false
  });

  const result: IBatchResult = await batch
    .list('Tasks')
    .add({ Title: 'New Task' })
    .update(123, { Status: 'Completed' })
    .execute();

  // Type-safe result handling
  if (!result.success) {
    result.errors.forEach((error: IBatchError) => {
      console.error(`Error in ${error.listName}: ${error.error}`);
    });
  }

  return result;
};
```

---

#### 1.3 Permission Types

```typescript
/**
 * Standard SharePoint permission levels
 */
export enum SPPermissionLevel {
  FullControl = 'Full Control',
  Design = 'Design',
  Edit = 'Edit',
  Contribute = 'Contribute',
  Read = 'Read',
  LimitedAccess = 'Limited Access',
  ViewOnly = 'View Only',
  RestrictedRead = 'Restricted Read',
}

/**
 * Permission check result interface
 */
export interface IPermissionResult {
  hasPermission: boolean;
  permissionLevel?: string;
  roles?: string[];
  error?: string;
}

/**
 * User permission information
 */
export interface IUserPermissions {
  userId: number;
  loginName: string;
  email?: string;
  displayName?: string;
  groups: string[];
  permissionLevels: string[];
  directPermissions: boolean;
  inheritedPermissions: boolean;
}

/**
 * Item-level permission information
 */
export interface IItemPermissions {
  itemId: number;
  hasUniquePermissions: boolean;
  userPermissions: IUserPermissions[];
  groupPermissions: Array<{
    groupName: string;
    permissionLevels: string[];
  }>;
}

/**
 * Configuration for permission helper
 */
export interface IPermissionHelperConfig {
  enableCaching?: boolean;
  cacheTimeout?: number;                           // in milliseconds
  customGroupMappings?: Record<string, string>;    // Map custom group names
  permissionLevelMappings?: Record<string, any>;   // Map custom permission levels
}

/**
 * SharePoint user interface
 */
export interface ISPUser {
  Id: number;
  LoginName: string;
  Email?: string;
  Title?: string;
}

/**
 * SharePoint group interface
 */
export interface ISPGroup {
  Id: number;
  Title: string;
  Description?: string;
}

/**
 * SharePoint role assignment interface
 */
export interface ISPRoleAssignment {
  Member: {
    Id: number;
    Title: string;
    LoginName?: string;
    Email?: string;
    PrincipalType: number;
  };
  RoleDefinitionBindings: Array<{
    Id: number;
    Name: string;
    Description?: string;
  }>;
}

/**
 * Permission error codes
 */
export const PermissionErrorCodes = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  GROUP_NOT_FOUND: 'GROUP_NOT_FOUND',
  LIST_NOT_FOUND: 'LIST_NOT_FOUND',
  ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_PERMISSION_LEVEL: 'INVALID_PERMISSION_LEVEL',
  CACHE_ERROR: 'CACHE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type PermissionErrorCode = (typeof PermissionErrorCodes)[keyof typeof PermissionErrorCodes];
```

**Usage Example:**

```typescript
import type {
  SPPermissionLevel,
  IUserPermissions,
  IItemPermissions,
  PermissionErrorCode
} from 'spfx-toolkit/lib/types';

// Type-safe permission checking
const checkUserAccess = async (
  userId: number
): Promise<IUserPermissions | null> => {
  try {
    const permissions: IUserPermissions = await getPermissions(userId);

    const hasEdit = permissions.permissionLevels.includes(
      SPPermissionLevel.Edit
    );

    return permissions;
  } catch (error) {
    const errorCode: PermissionErrorCode = 'PERMISSION_DENIED';
    console.error(errorCode, error);
    return null;
  }
};
```

---

### 2. Card Component Types

Comprehensive types for the Card component system with full-featured card management.

```typescript
/**
 * Card size variants
 */
export type CardSize = 'compact' | 'regular' | 'large' | 'full-width';

/**
 * Card visual variants (header styles)
 */
export type CardVariant = 'success' | 'error' | 'warning' | 'info' | 'default';

/**
 * Step status for workflow steppers
 */
export type StepStatus = 'completed' | 'current' | 'pending' | 'error';

/**
 * Card action definition
 */
export interface CardAction {
  id: string;
  label: string;
  icon?: string;                              // Fluent UI icon name
  onClick: (cardId?: string) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  tooltip?: string;
  hideOnMobile?: boolean;
  mobileIcon?: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * Card event data
 */
export interface CardEventData {
  cardId: string;
  isExpanded: boolean;
  isMaximized?: boolean;
  timestamp: number;
  source: 'user' | 'programmatic';
  metadata?: Record<string, unknown>;
}

/**
 * Card state information
 */
export interface CardState {
  id: string;
  isExpanded: boolean;
  isMaximized: boolean;
  hasContentLoaded: boolean;
  lastUpdated?: number;
}

/**
 * Main Card component props
 */
export interface CardProps {
  id: string;
  size?: CardSize;
  defaultExpanded?: boolean;
  allowExpand?: boolean;
  allowMaximize?: boolean;
  headerSize?: 'compact' | 'regular' | 'large';
  customHeaderColor?: string;
  loading?: boolean;
  loadingType?: 'none' | 'spinner' | 'skeleton' | 'shimmer' | 'overlay';
  lazyLoad?: boolean;
  persist?: boolean;
  persistKey?: string;
  highlightOnProgrammaticChange?: boolean;
  onExpand?: (data: CardEventData) => void;
  onCollapse?: (data: CardEventData) => void;
  onMaximize?: (data: CardEventData) => void;
  onRestore?: (data: CardEventData) => void;
  className?: string;
  style?: React.CSSProperties;
  elevation?: 1 | 2 | 3 | 4 | 5;
  disabled?: boolean;
  children: React.ReactNode;
}

/**
 * Card controller for programmatic control
 */
export interface CardController {
  expandAll(highlight?: boolean): void;
  collapseAll(highlight?: boolean): void;
  toggleCard(id: string, highlight?: boolean): boolean;
  expandCard(id: string, highlight?: boolean): boolean;
  collapseCard(id: string, highlight?: boolean): boolean;
  maximizeCard(id: string): boolean;
  restoreCard(id: string): boolean;
  getCardStates(): CardState[];
  getCardState(id: string): CardState | null;
  highlightCard(id: string): boolean;
  subscribe(cardId: string, callback: (action: string, data?: unknown) => void): () => void;
}

/**
 * Accordion container props
 */
export interface AccordionProps {
  id: string;
  allowMultiple?: boolean;
  defaultExpanded?: string[];
  spacing?: 'none' | 'compact' | 'regular';
  variant?: 'default' | 'connected' | 'outlined';
  persist?: boolean;
  persistKey?: string;
  onCardChange?: (expandedCards: string[]) => void;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}
```

**Usage Example:**

```typescript
import type { CardProps, CardState, CardController } from 'spfx-toolkit/lib/components/Card';
import { Card, useCardController } from 'spfx-toolkit/lib/components/Card';

const MyComponent: React.FC = () => {
  const controller: CardController = useCardController();

  const handleExpandAll = () => {
    controller.expandAll(true);
  };

  const cardProps: CardProps = {
    id: 'my-card-1',
    size: 'regular',
    allowExpand: true,
    persist: true,
    onExpand: (data: CardEventData) => {
      console.log('Card expanded', data.timestamp);
    },
    children: <div>Card content</div>
  };

  return <Card {...cardProps} />;
};
```

---

### 3. WorkflowStepper Component Types

```typescript
/**
 * Step status values
 */
export type StepStatus = 'completed' | 'current' | 'pending' | 'error';

/**
 * Stepper display mode
 */
export type StepperMode = 'horizontal' | 'vertical';

/**
 * Single workflow step data
 */
export interface StepData {
  id: string;
  label: string;
  status: StepStatus;
  description?: string;
  icon?: string;                    // Fluent UI icon name
  date?: Date;
  user?: string;
  metadata?: Record<string, any>;
  disabled?: boolean;
  clickable?: boolean;
}

/**
 * WorkflowStepper component props
 */
export interface WorkflowStepperProps {
  steps: StepData[];
  mode?: StepperMode;
  onStepClick?: (step: StepData, index: number) => void;
  allowClickableSteps?: boolean;
  className?: string;
  style?: React.CSSProperties;
}
```

**Usage Example:**

```typescript
import type { StepData, WorkflowStepperProps } from 'spfx-toolkit/lib/components/WorkflowStepper';
import { WorkflowStepper } from 'spfx-toolkit/lib/components/WorkflowStepper';

const MyWorkflow: React.FC = () => {
  const steps: StepData[] = [
    {
      id: 'step1',
      label: 'Submitted',
      status: 'completed',
      description: 'Request submitted',
      date: new Date('2024-01-15'),
      user: 'John Doe'
    },
    {
      id: 'step2',
      label: 'Review',
      status: 'current',
      description: 'Pending approval'
    },
    {
      id: 'step3',
      label: 'Approved',
      status: 'pending'
    }
  ];

  const props: WorkflowStepperProps = {
    steps,
    mode: 'horizontal',
    allowClickableSteps: true,
    onStepClick: (step: StepData, index: number) => {
      console.log(`Clicked step ${index}: ${step.label}`);
    }
  };

  return <WorkflowStepper {...props} />;
};
```

---

### 4. ConflictDetector Component Types

```typescript
/**
 * Conflict severity levels
 */
export type ConflictSeverity = 'low' | 'medium' | 'high';

/**
 * Conflict information
 */
export interface ConflictInfo {
  hasConflict: boolean;
  lastModified: string;           // ISO date string
  modifiedBy: string;
  modifiedById?: number;
  eTag?: string;
  currentVersion?: number;
}

/**
 * Enhanced conflict information with calculated properties
 */
export interface EnhancedConflictInfo extends ConflictInfo {
  severity: ConflictSeverity;
  timeSinceConflict: number;      // milliseconds
  isRecentConflict: boolean;
}

/**
 * Conflict detection options
 */
export interface ConflictDetectionOptions {
  checkInterval?: number;          // Check interval in ms (default: 30000)
  autoStart?: boolean;             // Auto-start monitoring (default: true)
  useETag?: boolean;               // Use ETag for detection (default: true)
  notifyOnConflict?: boolean;      // Show notifications (default: true)
  logErrors?: boolean;             // Log errors to console (default: true)
}

/**
 * Hook return type for useConflictDetection
 */
export interface UseConflictDetectionReturn {
  hasConflict: boolean;
  conflictInfo: ConflictInfo | null;
  isChecking: boolean;
  error: string | null;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  checkNow: () => Promise<void>;
  resolveConflict: () => void;
}
```

**Usage Example:**

```typescript
import type {
  ConflictInfo,
  ConflictDetectionOptions,
  UseConflictDetectionReturn
} from 'spfx-toolkit/lib/components/ConflictDetector';
import { useConflictDetection } from 'spfx-toolkit/lib/components/ConflictDetector';

const MyForm: React.FC<{ itemId: number }> = ({ itemId }) => {
  const options: ConflictDetectionOptions = {
    checkInterval: 30000,
    autoStart: true,
    notifyOnConflict: true
  };

  const {
    hasConflict,
    conflictInfo,
    startMonitoring,
    stopMonitoring,
    resolveConflict
  }: UseConflictDetectionReturn = useConflictDetection(
    'Tasks',
    itemId,
    options
  );

  React.useEffect(() => {
    startMonitoring();
    return () => stopMonitoring();
  }, []);

  if (hasConflict && conflictInfo) {
    return (
      <div>
        Conflict detected! Modified by {conflictInfo.modifiedBy} at{' '}
        {new Date(conflictInfo.lastModified).toLocaleString()}
        <button onClick={resolveConflict}>Continue Anyway</button>
      </div>
    );
  }

  return <div>Form content</div>;
};
```

---

### 5. GroupViewer & ManageAccess Types

```typescript
/**
 * SharePoint principal type enum
 */
export enum SPPrincipalType {
  User = 1,
  DistributionList = 2,
  SecurityGroup = 4,
  SharePointGroup = 8,
  All = 15,
}

/**
 * Group member information
 */
export interface IGroupMember {
  Id: number;
  Title: string;
  Email: string;
  LoginName: string;
  PrincipalType: number;
  UserPrincipalName?: string;
}

/**
 * Group information
 */
export interface IGroupInfo {
  Id: number;
  Title: string;
  Description?: string;
  LoginName: string;
}

/**
 * GroupViewer component props
 */
export interface IGroupViewerProps {
  groupId?: number;
  groupName: string;
  size?: number;
  displayMode?: 'icon' | 'name' | 'iconAndName';
  iconName?: string;
  className?: string;
  onClick?: (groupName: string, groupId?: number) => void;
  bustCache?: boolean;
  onError?: (error: Error) => void;
  nestLevel?: number;
  maxNestLevel?: number;
}

/**
 * Permission principal (for ManageAccess)
 */
export interface IPermissionPrincipal {
  id: string;
  email?: string;
  displayName: string;
  permissionLevel: 'view' | 'edit';
  isGroup: boolean;
  loginName?: string;
  principalType?: number;
  canBeRemoved?: boolean;
  isLimitedAccess?: boolean;
  isSharingLink?: boolean;
  userPrincipalName?: string;
  normalizedEmail?: string;
  isValidForPersona?: boolean;
}

/**
 * ManageAccess component props
 */
export interface IManageAccessComponentProps {
  itemId: number;
  listId: string;
  permissionTypes?: 'view' | 'edit' | 'both';
  maxAvatars?: number;
  protectedPrincipals?: string[];
  enabled?: boolean;
  onPermissionChanged: (
    operation: 'add' | 'remove',
    principals: IPermissionPrincipal[]
  ) => Promise<boolean>;
  onError?: (error: string) => void;
}
```

**Usage Example:**

```typescript
import type {
  IGroupViewerProps,
  IPermissionPrincipal,
  IManageAccessComponentProps
} from 'spfx-toolkit/lib/components';

const MyComponent: React.FC = () => {
  const handlePermissionChange = async (
    operation: 'add' | 'remove',
    principals: IPermissionPrincipal[]
  ): Promise<boolean> => {
    console.log(`${operation}:`, principals);
    return true;
  };

  const manageAccessProps: IManageAccessComponentProps = {
    itemId: 123,
    listId: 'Documents',
    permissionTypes: 'both',
    maxAvatars: 5,
    onPermissionChanged: handlePermissionChange,
    onError: (error: string) => console.error(error)
  };

  return <div>Component with typed props</div>;
};
```

---

### 6. Type Utility Patterns

Common patterns for using toolkit types in your applications.

#### Pattern 1: Extending Types

```typescript
import type { CardProps } from 'spfx-toolkit/lib/components/Card';
import type { IPrincipal } from 'spfx-toolkit/lib/types';

// Extend toolkit types for your custom needs
interface ICustomCardProps extends CardProps {
  customData?: Record<string, any>;
  onCustomEvent?: (data: any) => void;
}

interface ICustomUser extends IPrincipal {
  customField1?: string;
  customField2?: number;
}
```

#### Pattern 2: Type-Safe List Items

```typescript
import type { IPrincipal, SPLookup, SPTaxonomy } from 'spfx-toolkit/lib/types';

// Define your list item schema with toolkit types
interface IProjectListItem {
  Id: number;
  Title: string;
  ProjectManager: IPrincipal;
  Category: SPLookup;
  Department: SPTaxonomy;
  TeamMembers: IPrincipal[];
  RelatedProjects: SPLookup[];
  Status: string;
  DueDate: Date;
  Budget: number;
  Description: string;
}

// Type-safe operations
const getProjectManager = (item: IProjectListItem): IPrincipal => {
  return item.ProjectManager;
};

const hasTeamMembers = (item: IProjectListItem): boolean => {
  return item.TeamMembers && item.TeamMembers.length > 0;
};
```

#### Pattern 3: Generic Type Functions

```typescript
import type { IBatchResult, IOperationResult } from 'spfx-toolkit/lib/types';

// Generic function with toolkit types
const processOperationResults = <T>(
  result: IBatchResult,
  transform: (op: IOperationResult) => T
): T[] => {
  return result.results
    .filter(op => op.success)
    .map(transform);
};

// Usage
const itemIds = processOperationResults(
  batchResult,
  (op) => op.data?.ID as number
);
```

---

### 7. Type Export Summary

Quick reference for all type exports:

```typescript
// Core types (from /lib/types)
export {
  // SharePoint Field Types
  IPrincipal, SPLookup, SPTaxonomy, SPUrl, SPLocation, SPImage,
  IListItemFormUpdateValue,

  // Batch Types
  OperationType, IBatchOperation, IOperationResult, IBatchError,
  IBatchResult, IBatchBuilderConfig,

  // Permission Types
  SPPermissionLevel, IPermissionResult, IUserPermissions,
  IItemPermissions, IPermissionHelperConfig, ISPUser, ISPGroup,
  ISPRoleAssignment, PermissionErrorCode, PermissionErrorCodes
};

// Component types (from specific components)
export {
  // Card
  CardProps, CardVariant, CardSize, CardAction, CardEventData,
  CardState, CardController, AccordionProps,

  // WorkflowStepper
  WorkflowStepperProps, StepData, StepStatus, StepperMode,

  // ConflictDetector
  ConflictInfo, ConflictSeverity, ConflictDetectionOptions,
  UseConflictDetectionReturn,

  // GroupViewer & ManageAccess
  IGroupViewerProps, IGroupMember, IGroupInfo, SPPrincipalType,
  IPermissionPrincipal, IManageAccessComponentProps
};
```

---

### 8. Best Practices for Types

1. **Always use `import type`** for type-only imports (tree-shaking):
   ```typescript
   import type { CardProps } from 'spfx-toolkit/lib/components/Card';
   ```

2. **Define list item interfaces** using toolkit types:
   ```typescript
   interface IMyListItem {
     Manager: IPrincipal;
     Category: SPLookup;
   }
   ```

3. **Use strict typing** for callbacks and handlers:
   ```typescript
   const handleChange = (op: 'add' | 'remove', data: IPermissionPrincipal[]): Promise<boolean> => {
     // Type-safe implementation
   };
   ```

4. **Leverage generic types** for reusable functions:
   ```typescript
   function processItems<T extends { Id: number }>(items: T[]): number[] {
     return items.map(item => item.Id);
   }
   ```

5. **Export custom types** that extend toolkit types for reuse:
   ```typescript
   export interface ICustomProject extends IProjectListItem {
     customField: string;
   }
   ```

---

## Bundle Size Optimization

**CRITICAL:** The toolkit is designed for minimal bundle impact through tree-shaking. Following these guidelines is essential for performance.

### ✅ DO: Use Direct Imports

```typescript
// ✅ EXCELLENT: Tree-shakable imports (minimal bundle size)
import { Card } from 'spfx-toolkit/lib/components/Card';
import { useLocalStorage } from 'spfx-toolkit/lib/hooks';
import { BatchBuilder } from 'spfx-toolkit/lib/utilities/batchBuilder';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
```

### ❌ DON'T: Use Barrel Imports

```typescript
// ❌ AVOID: Barrel imports (imports EVERYTHING ~2MB+)
import { Card } from 'spfx-toolkit';
import { useLocalStorage } from 'spfx-toolkit';

// ❌ AVOID: Wildcard imports
import * as Toolkit from 'spfx-toolkit';
```

### Fluent UI Tree-Shaking (CRITICAL)

**ALWAYS use specific Fluent UI imports:**

```typescript
// ✅ EXCELLENT: Tree-shakable Fluent UI imports
import { Button } from '@fluentui/react/lib/Button';
import { TextField } from '@fluentui/react/lib/TextField';
import { Icon } from '@fluentui/react/lib/Icon';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';

// ❌ AVOID: Bulk Fluent UI imports (imports entire library)
import { Button, TextField, Icon } from '@fluentui/react';
```

**Common Fluent UI Import Paths:**

| Component | Import Path |
|-----------|-------------|
| Button, PrimaryButton, DefaultButton | `@fluentui/react/lib/Button` |
| TextField | `@fluentui/react/lib/TextField` |
| Dropdown | `@fluentui/react/lib/Dropdown` |
| Icon | `@fluentui/react/lib/Icon` |
| Stack | `@fluentui/react/lib/Stack` |
| Text | `@fluentui/react/lib/Text` |
| MessageBar | `@fluentui/react/lib/MessageBar` |
| Dialog | `@fluentui/react/lib/Dialog` |
| Panel | `@fluentui/react/lib/Panel` |
| Spinner | `@fluentui/react/lib/Spinner` |
| Persona | `@fluentui/react/lib/Persona` |
| Tooltip | `@fluentui/react/lib/Tooltip` |
| Modal | `@fluentui/react/lib/Modal` |
| Link | `@fluentui/react/lib/Link` |
| Label | `@fluentui/react/lib/Label` |
| Pivot, PivotItem | `@fluentui/react/lib/Pivot` |
| DetailsList | `@fluentui/react/lib/DetailsList` |
| CommandBar | `@fluentui/react/lib/CommandBar` |

### Analyzing Bundle Size

```bash
# In your SPFx project, build with analysis
gulp bundle --ship --analyze-bundle

# Check the generated report
open temp/webpack-bundle-analyzer/index.html
```

**Look for:**
- Large chunks from `spfx-toolkit` (should be minimal)
- Large Fluent UI imports (optimize if > 500KB)
- Duplicate dependencies

### Bundle Size Targets

| Import Type | Expected Size | Warning Threshold |
|-------------|---------------|-------------------|
| Single component | 50-200KB | > 500KB |
| Single hook | 10-50KB | > 100KB |
| Single utility | 50-150KB | > 300KB |
| Fluent UI component | 20-100KB | > 200KB |

---

## Common Patterns

### Pattern 1: Dashboard with Multiple Components

```typescript
import * as React from 'react';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { Card } from 'spfx-toolkit/lib/components/Card';
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';
import { WorkflowStepper } from 'spfx-toolkit/lib/components/WorkflowStepper';
import { useViewport } from 'spfx-toolkit/lib/hooks';
import type { IWorkflowStep } from 'spfx-toolkit/lib/components/WorkflowStepper';

const Dashboard: React.FC = () => {
  const { isMobile } = useViewport();
  const [workflowSteps, setWorkflowSteps] = React.useState<IWorkflowStep[]>([]);

  React.useEffect(() => {
    loadWorkflowData();
  }, []);

  const loadWorkflowData = async () => {
    const items = await SPContext.sp.web.lists
      .getByTitle('Approvals')
      .items.top(1)();

    // Transform to workflow steps
    const steps: IWorkflowStep[] = [
      { label: 'Submitted', status: 'completed' },
      { label: 'Review', status: 'current' },
      { label: 'Approved', status: 'pending' }
    ];

    setWorkflowSteps(steps);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
      <Card title="My Profile" allowExpand persistState>
        <UserPersona
          userId={SPContext.currentUser.Id}
          showEmail
          showJobTitle
          showLivePersonaCard
        />
      </Card>

      <Card title="Current Workflow" allowExpand persistState>
        <WorkflowStepper
          steps={workflowSteps}
          orientation={isMobile ? 'vertical' : 'horizontal'}
        />
      </Card>
    </div>
  );
};
```

### Pattern 2: Form with Conflict Detection

```typescript
import * as React from 'react';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { ConflictDetector } from 'spfx-toolkit/lib/components/ConflictDetector';
import { ErrorBoundary } from 'spfx-toolkit/lib/components/ErrorBoundary';
import { createSPExtractor, createSPUpdater } from 'spfx-toolkit/lib/utilities/listItemHelper';
import { TextField } from '@fluentui/react/lib/TextField';
import { PrimaryButton } from '@fluentui/react/lib/Button';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';

interface ITaskFormProps {
  itemId: number;
  onSave: () => void;
}

const TaskForm: React.FC<ITaskFormProps> = ({ itemId, onSave }) => {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadItem();
  }, [itemId]);

  const loadItem = async () => {
    try {
      const item = await SPContext.sp.web.lists
        .getByTitle('Tasks')
        .items.getById(itemId)();

      const extractor = createSPExtractor(item);
      setTitle(extractor.getText('Title'));
      setDescription(extractor.getText('Description'));
    } catch (err) {
      setError('Failed to load task');
      SPContext.logger.error('Load error', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const updater = createSPUpdater();
      updater.setText('Title', title);
      updater.setText('Description', description);

      await SPContext.sp.web.lists
        .getByTitle('Tasks')
        .items.getById(itemId)
        .update(updater.getPayload());

      SPContext.logger.success('Task saved', { itemId });
      onSave();
    } catch (err) {
      setError('Failed to save task');
      SPContext.logger.error('Save error', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ErrorBoundary>
      <ConflictDetector
        listTitle="Tasks"
        itemId={itemId}
        checkInterval={30000}
        onConflictDetected={(conflict) => {
          setError(`This task was modified by ${conflict.modifiedBy}`);
        }}
      >
        {error && (
          <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setError(null)}>
            {error}
          </MessageBar>
        )}

        <TextField
          label="Title"
          value={title}
          onChange={(_, newValue) => setTitle(newValue || '')}
          required
        />

        <TextField
          label="Description"
          value={description}
          onChange={(_, newValue) => setDescription(newValue || '')}
          multiline
          rows={5}
        />

        <PrimaryButton
          text="Save"
          onClick={handleSave}
          disabled={saving || !title}
        />
      </ConflictDetector>
    </ErrorBoundary>
  );
};
```

### Pattern 3: Batch Operations with Progress

```typescript
import * as React from 'react';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { BatchBuilder } from 'spfx-toolkit/lib/utilities/batchBuilder';
import { ProgressIndicator } from '@fluentui/react/lib/ProgressIndicator';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';

interface IBulkUpdateProps {
  itemIds: number[];
  status: string;
  onComplete: () => void;
}

const BulkUpdate: React.FC<IBulkUpdateProps> = ({ itemIds, status, onComplete }) => {
  const [progress, setProgress] = React.useState(0);
  const [message, setMessage] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleBulkUpdate = async () => {
    setIsProcessing(true);
    setMessage('Processing updates...');

    try {
      const batch = new BatchBuilder(SPContext.sp, {
        batchSize: 50,
        enableConcurrency: false  // Sequential for progress tracking
      });

      // Queue all updates
      batch.list('Tasks');
      itemIds.forEach(id => {
        batch.update(id, { Status: status });
      });

      // Execute with progress tracking
      const result = await batch.execute();

      if (result.success) {
        setMessage(`Successfully updated ${result.successCount} items`);
        SPContext.logger.success('Bulk update completed', result);
        onComplete();
      } else {
        setMessage(`Updated ${result.successCount} items, ${result.errorCount} failed`);
        SPContext.logger.error('Bulk update errors', result.errors);
      }

      setProgress(1);
    } catch (err) {
      setMessage('Bulk update failed');
      SPContext.logger.error('Bulk update error', err);
    } finally {
      setIsProcessing(false);
    }
  };

  React.useEffect(() => {
    handleBulkUpdate();
  }, []);

  return (
    <div>
      {isProcessing && (
        <ProgressIndicator
          label="Updating items"
          description={`Processing ${itemIds.length} items...`}
          percentComplete={progress}
        />
      )}

      {message && (
        <MessageBar
          messageBarType={message.includes('failed') ? MessageBarType.error : MessageBarType.success}
        >
          {message}
        </MessageBar>
      )}
    </div>
  );
};
```

### Pattern 4: Responsive Layout with Persistent State

```typescript
import * as React from 'react';
import { Card } from 'spfx-toolkit/lib/components/Card';
import { useViewport, useLocalStorage } from 'spfx-toolkit/lib/hooks';
import { Stack } from '@fluentui/react/lib/Stack';

const ResponsiveDashboard: React.FC = () => {
  const { isMobile, isTablet, isDesktop } = useViewport();
  const [layout, setLayout] = useLocalStorage<'grid' | 'list'>('dashboard-layout', 'grid');
  const [settings, setSettings] = useLocalStorage('dashboard-settings', {
    showCharts: true,
    showRecentActivity: true,
    showNotifications: true
  });

  const getGridColumns = () => {
    if (isMobile) return 1;
    if (isTablet) return 2;
    if (layout === 'grid') return 3;
    return 1;
  };

  return (
    <div>
      <Stack horizontal tokens={{ childrenGap: 10 }}>
        <button onClick={() => setLayout('grid')}>Grid View</button>
        <button onClick={() => setLayout('list')}>List View</button>
      </Stack>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${getGridColumns()}, 1fr)`,
        gap: 20,
        marginTop: 20
      }}>
        <Card
          cardId="card-charts"
          title="Analytics"
          allowExpand
          persistState
        >
          {settings.showCharts && <ChartsComponent />}
        </Card>

        <Card
          cardId="card-activity"
          title="Recent Activity"
          allowExpand
          persistState
        >
          {settings.showRecentActivity && <ActivityComponent />}
        </Card>

        <Card
          cardId="card-notifications"
          title="Notifications"
          allowExpand
          persistState
        >
          {settings.showNotifications && <NotificationsComponent />}
        </Card>
      </div>
    </div>
  );
};
```

---

## Troubleshooting

### Issue: "Context not initialized" Error

**Symptoms:** Components fail with "SPContext not initialized" error

**Solutions:**
1. Ensure `SPContext.initialize()` or preset method is called in web part's `onInit()`
2. Wait for initialization to complete before rendering components
3. Check `SPContext.isReady()` before using context

```typescript
// ✅ CORRECT
protected async onInit(): Promise<void> {
  await super.onInit();
  await SPContext.smart(this.context, 'MyWebPart');  // Wait for completion
}

// ❌ WRONG
protected async onInit(): Promise<void> {
  await super.onInit();
  SPContext.smart(this.context, 'MyWebPart');  // Missing await
}
```

### Issue: Large Bundle Size

**Symptoms:** SPFx bundle exceeds size limits (> 2MB)

**Solutions:**
1. Check import statements - use direct imports, not barrel imports
2. Verify Fluent UI imports use `/lib/` paths
3. Run bundle analyzer: `gulp bundle --ship --analyze-bundle`
4. Lazy load heavy components:

```typescript
// ✅ Lazy load heavy components
const VersionHistory = React.lazy(() =>
  import('spfx-toolkit/lib/components/VersionHistory').then(m => ({ default: m.VersionHistory }))
);

const MyComponent: React.FC = () => {
  return (
    <React.Suspense fallback={<Spinner />}>
      <VersionHistory listTitle="Documents" itemId={123} />
    </React.Suspense>
  );
};
```

### Issue: TypeScript Errors on Import

**Symptoms:** "Cannot find module" or "Module has no exported member" errors

**Solutions:**
1. Check import paths are correct (case-sensitive)
2. Verify package is installed: `npm ls spfx-toolkit`
3. Clear TypeScript cache: `rm -rf node_modules/.cache`
4. Rebuild: `gulp clean && gulp build`
5. Check TypeScript version: `npx tsc --version` (should be >= 4.7)

### Issue: Permission Denied Errors

**Symptoms:** SharePoint API returns 403 Forbidden

**Solutions:**
1. Check user has required SharePoint permissions
2. Verify SharePoint API permissions in `package-solution.json`
3. Check site collection app catalog permissions
4. Use `SPContext.getHealthCheck()` for diagnosis:

```typescript
const health = await SPContext.getHealthCheck();
console.log('Context health:', health);
// Check health.sp, health.currentUser, health.webAbsoluteUrl
```

### Issue: Component Not Rendering

**Symptoms:** Component appears blank or doesn't render

**Solutions:**
1. Check browser console for JavaScript errors
2. Verify all required props are provided
3. Check CSS is loading (inspect element styles)
4. Verify Fluent UI theme is initialized:

```typescript
import { ThemeProvider } from '@fluentui/react/lib/Theme';
import { initializeIcons } from '@fluentui/react/lib/Icons';

// In web part onInit
initializeIcons();
```

5. Wrap in ErrorBoundary to catch render errors:

```typescript
import { ErrorBoundary } from 'spfx-toolkit/lib/components/ErrorBoundary';

<ErrorBoundary fallback={<div>Error occurred</div>}>
  <MyComponent />
</ErrorBoundary>
```

### Issue: PnP Operations Failing

**Symptoms:** PnP SP operations return errors or undefined

**Solutions:**
1. Check SPContext is initialized
2. Verify list/library exists and user has access
3. Use correct caching strategy:
   - `SPContext.sp` - Standard caching
   - `SPContext.spCached` - Memory cached
   - `SPContext.spPessimistic` - No cache

```typescript
// ✅ Fresh data (no cache)
const items = await SPContext.spPessimistic.web.lists
  .getByTitle('Tasks')
  .items();

// ✅ Cached data (fast)
const cachedItems = await SPContext.spCached.web.lists
  .getByTitle('Tasks')
  .items();
```

4. Enable verbose logging:

```typescript
await SPContext.development(this.context, 'MyWebPart');
// All PnP operations now logged
```

### Issue: Hook Dependencies Warning

**Symptoms:** React warning about missing dependencies in useEffect

**Solutions:**
1. Add all used variables to dependency array
2. Wrap functions in `useCallback`:

```typescript
// ✅ CORRECT
const loadData = React.useCallback(async () => {
  const items = await SPContext.sp.web.lists
    .getByTitle('Tasks')
    .items();
  setData(items);
}, []);  // No dependencies needed

React.useEffect(() => {
  loadData();
}, [loadData]);  // Include callback in dependencies
```

---

## Best Practices

### 1. Context Initialization

- ✅ Initialize once in web part's `onInit()` lifecycle
- ✅ Use `await` to ensure initialization completes
- ✅ Use preset methods (`smart`, `production`, etc.) for consistency
- ❌ Don't initialize in component render
- ❌ Don't re-initialize on every component mount

### 2. Import Optimization

- ✅ Use direct imports: `spfx-toolkit/lib/components/Card`
- ✅ Use Fluent UI `/lib/` imports: `@fluentui/react/lib/Button`
- ✅ Lazy load heavy components when possible
- ❌ Avoid barrel imports: `spfx-toolkit`
- ❌ Avoid Fluent UI bulk imports: `@fluentui/react`

### 3. Error Handling

- ✅ Wrap components in `<ErrorBoundary>`
- ✅ Use try/catch for async operations
- ✅ Log errors with `SPContext.logger.error()`
- ✅ Provide user-friendly error messages
- ❌ Don't silently swallow errors
- ❌ Don't expose technical details to users

### 4. Performance

- ✅ Use `React.memo()` for expensive components
- ✅ Use `useCallback()` for event handlers
- ✅ Use `useMemo()` for expensive calculations
- ✅ Use `SPContext.spCached` for frequently accessed data
- ✅ Use `BatchBuilder` for multiple operations
- ❌ Don't fetch data on every render
- ❌ Don't create new functions in render

### 5. Type Safety

- ✅ Define interfaces for all props and state
- ✅ Use generic types where appropriate
- ✅ Import types with `import type { ... }`
- ✅ Use TypeScript strict mode
- ❌ Don't use `any` type unless necessary
- ❌ Don't ignore TypeScript errors

### 6. State Management

- ✅ Use `useLocalStorage` for persistent UI state
- ✅ Use `useState` for component-local state
- ✅ Lift state up when shared between components
- ✅ Use `useEffect` cleanup for subscriptions
- ❌ Don't store large objects in localStorage
- ❌ Don't mutate state directly

### 7. Accessibility

- ✅ Use semantic HTML elements
- ✅ Provide ARIA labels for interactive elements
- ✅ Ensure keyboard navigation works
- ✅ Provide focus indicators
- ✅ Test with screen readers
- ❌ Don't rely solely on color for information
- ❌ Don't use `tabindex` values > 0

### 8. SharePoint Operations

- ✅ Check permissions before operations
- ✅ Use `BatchBuilder` for multiple operations
- ✅ Implement retry logic for transient errors
- ✅ Use optimistic UI updates when possible
- ❌ Don't make sequential API calls in loops
- ❌ Don't fetch more data than needed

---

## API Reference

### SPContext Static Properties

```typescript
SPContext.sp: SPFI;                      // Default PnP instance
SPContext.spCached: SPFI;                // Memory-cached instance
SPContext.spPessimistic: SPFI;           // No-cache instance
SPContext.context: WebPartContext;       // SPFx context
SPContext.webAbsoluteUrl: string;        // Current site URL
SPContext.currentUser: IUserInfo;        // Current user info
SPContext.logger: ILogger;               // Logger instance
SPContext.peoplePickerContext: IPeoplePickerContext;  // PeoplePicker context
```

### SPContext Static Methods

```typescript
// Initialization
SPContext.initialize(context, name, config?): Promise<void>;
SPContext.smart(context, name): Promise<void>;
SPContext.basic(context, name): Promise<void>;
SPContext.production(context, name): Promise<void>;
SPContext.development(context, name): Promise<void>;
SPContext.teams(context, name): Promise<void>;

// Health check
SPContext.getHealthCheck(): Promise<IHealthCheck>;
SPContext.isReady(): boolean;
SPContext.reset(): void;
```

### Component Props Summary

| Component | Required Props | Optional Props |
|-----------|---------------|----------------|
| Card | `title` | `subtitle`, `allowExpand`, `defaultExpanded`, `persistState`, `cardId`, `onExpand`, `onCollapse` |
| UserPersona | `userId` OR (`displayName` + `email`) | `size`, `showEmail`, `showJobTitle`, `showLivePersonaCard` |
| WorkflowStepper | `steps` | `orientation`, `theme`, `allowClickableSteps`, `onStepClick` |
| ManageAccess | `listTitle`, `itemId` | `showInheritedPermissions`, `allowBreakInheritance`, `allowRemovePermissions` |
| VersionHistory | `listTitle`, `itemId` | `showFieldComparison`, `fieldsToCompare`, `allowRestore`, `maxVersions` |
| ConflictDetector | `listTitle`, `itemId`, `children` | `checkInterval`, `onConflictDetected`, `onConflictResolved` |
| GroupViewer | `groupId` OR `groupName` | `showMembers`, `showOwner`, `showDescription`, `maxMembers` |
| ErrorBoundary | `children` | `fallback`, `onError`, `onReset`, `showRetryButton` |
| DocumentLink | One of: `documentUrl`, `documentUniqueId`, or (`documentId` + `libraryName`) | `layout`, `enableHoverCard`, `onClick`, `previewMode`, `previewTarget`, `enableCache` |
| GroupUsersPicker | `groupName`, `maxUserCount` | `selectedUsers`, `ensureUser`, `useCache`, `itemRender` |
| spForm Controls | `name`, `control` | Field-specific props (`items`, `placeholder`, `rules`, etc.) |
| SPField Components | `name`, `control` | `label`, `rules`, field-specific options (choices, allowMultiple, formatting) |
| Lazy Components | Same as underlying component (`VersionHistory`, `ManageAccess`, etc.) | Use `preloadComponent` / `useLazyPreload` for smoother UX |

---

## Appendix: Complete Import Reference

### Components

```typescript
// Card
import { Card, useCardController } from 'spfx-toolkit/lib/components/Card';
import type { ICardProps } from 'spfx-toolkit/lib/components/Card';

// UserPersona
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';
import type { IUserPersonaProps } from 'spfx-toolkit/lib/components/UserPersona';

// WorkflowStepper
import { WorkflowStepper } from 'spfx-toolkit/lib/components/WorkflowStepper';
import type { IWorkflowStepperProps, IWorkflowStep } from 'spfx-toolkit/lib/components/WorkflowStepper';

// ManageAccess
import { ManageAccess } from 'spfx-toolkit/lib/components/ManageAccess';
import type { IManageAccessProps } from 'spfx-toolkit/lib/components/ManageAccess';

// VersionHistory
import { VersionHistory } from 'spfx-toolkit/lib/components/VersionHistory';
import type { IVersionHistoryProps } from 'spfx-toolkit/lib/components/VersionHistory';

// ConflictDetector
import { ConflictDetector, useConflictDetection } from 'spfx-toolkit/lib/components/ConflictDetector';
import type { IConflictDetectorProps } from 'spfx-toolkit/lib/components/ConflictDetector';

// GroupViewer
import { GroupViewer } from 'spfx-toolkit/lib/components/GroupViewer';
import type { IGroupViewerProps } from 'spfx-toolkit/lib/components/GroupViewer';

// DocumentLink
import { DocumentLink, useDocumentMetadata } from 'spfx-toolkit/lib/components/DocumentLink';
import type { IDocumentLinkProps, IDocumentInfo } from 'spfx-toolkit/lib/components/DocumentLink';

// GroupUsersPicker
import { GroupUsersPicker, useGroupUsers } from 'spfx-toolkit/lib/components/GroupUsersPicker';
import type { IGroupUsersPickerProps, IGroupUser } from 'spfx-toolkit/lib/components/GroupUsersPicker';

// spForm
import {
  FormContainer,
  FormItem,
  FormLabel,
  FormValue,
  FormError,
  DevExtremeTextBox,
  PnPPeoplePicker,
} from 'spfx-toolkit/lib/components/spForm';
import type {
  IFormContainerProps,
  IFormItemProps,
  IFormLabelProps,
  IFormValueProps,
  IFormErrorProps,
  IDevExtremeTextBoxProps,
  IPnPPeoplePickerProps,
} from 'spfx-toolkit/lib/components/spForm';

// SPField Suite
import { SPTextField, SPChoiceField, SPField } from 'spfx-toolkit/lib/components/spFields';
import type { ISPTextFieldProps, ISPChoiceFieldProps, ISPFieldProps } from 'spfx-toolkit/lib/components/spFields';

// Lazy Components
import {
  LazyVersionHistory,
  LazyManageAccessComponent,
  LazyManageAccessPanel,
  LazyConflictDetector,
  LazyWorkflowStepper,
  preloadComponent,
  useLazyPreload,
} from 'spfx-toolkit/lib/components/lazy';

// ErrorBoundary
import { ErrorBoundary, useErrorHandler } from 'spfx-toolkit/lib/components/ErrorBoundary';
import type { IErrorBoundaryProps } from 'spfx-toolkit/lib/components/ErrorBoundary';
```

### Hooks

```typescript
import { useLocalStorage } from 'spfx-toolkit/lib/hooks';
import { useViewport } from 'spfx-toolkit/lib/hooks';
```

### Utilities

```typescript
// Context
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// BatchBuilder
import { BatchBuilder } from 'spfx-toolkit/lib/utilities/batchBuilder';
import type { IBatchBuilderOptions, IBatchResult } from 'spfx-toolkit/lib/utilities/batchBuilder';

// PermissionHelper
import { PermissionHelper, PermissionLevel } from 'spfx-toolkit/lib/utilities/permissionHelper';
import type { IEffectivePermissions } from 'spfx-toolkit/lib/utilities/permissionHelper';

// ListItemHelper
import { createSPExtractor, createSPUpdater } from 'spfx-toolkit/lib/utilities/listItemHelper';
import type { ISPExtractor, ISPUpdater, IUserInfo } from 'spfx-toolkit/lib/utilities/listItemHelper';

// StringUtils
import { StringUtils } from 'spfx-toolkit/lib/utilities/stringUtils';

// DateUtils
import { DateUtils } from 'spfx-toolkit/lib/utilities/dateUtils';

// CssLoader
import { CssLoader } from 'spfx-toolkit/lib/utilities/CssLoader';

// Lazy Loader
import {
  createLazyComponent,
  LazyLoadFallback,
  LazyLoadErrorBoundary,
  preloadComponent,
  useLazyPreload,
} from 'spfx-toolkit/lib/utilities/lazyLoader';
```

---

## Support & Resources

### Documentation
- Component READMEs: `src/components/*/README.md`
- Hook documentation: `src/hooks/README.md`
- Utility documentation: `src/utilities/*/README.md`

### Example Projects
- Sample web parts: [Link to samples repository]
- Starter templates: [Link to templates]

### Community
- GitHub Issues: [Report bugs or request features]
- Stack Overflow: Tag `spfx-toolkit`
- SharePoint Dev Community: [Link]

### Version Information
- Current Version: Check `package.json`
- Changelog: `CHANGELOG.md`
- Migration Guides: `docs/migrations/`

---

**Last Updated:** October 2025
**Toolkit Version:** 1.0.0+
**Maintained By:** SPFx Toolkit Team

---

## Quick Links

- [Installation](#installation--setup)
- [Context System](#context-system-must-read)
- [Components](#components)
- [Hooks](#custom-hooks)
- [Utilities](#utilities)
- [Bundle Optimization](#bundle-size-optimization)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## License

This toolkit is provided as-is for use in SharePoint Framework projects. See LICENSE file for details.

---

## Bundle Size Optimization & Tree-Shaking

The SPFx Toolkit is fully optimized for minimal bundle sizes through tree-shaking and lazy loading.

### Optimization Overview

**Total Bundle Size Reduction: 750KB - 1.2MB**

- ✅ Tree-shakable Fluent UI imports
- ✅ Custom DirectionalHint enum (avoids import errors)
- ✅ Lazy loading utilities
- ✅ Pre-configured lazy components
- ✅ Optimized package exports

### Tree-Shakable Imports (RECOMMENDED)

**Always use specific import paths for minimal bundle size:**

```typescript
// ✅ BEST: Direct imports - only imports what you need
import { Card } from 'spfx-toolkit/lib/components/Card';
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';
import { useLocalStorage } from 'spfx-toolkit/lib/hooks';
import { BatchBuilder } from 'spfx-toolkit/lib/utilities/batchBuilder';

// ❌ AVOID: Bulk imports - imports everything (~2MB+)
import { Card } from 'spfx-toolkit';
```

### Lazy Loading for Heavy Components

For components not needed on initial page load, use lazy loading:

#### Available Lazy Components

| Component | Initial Bundle | Lazy Wrapper | Savings |
|-----------|---------------|--------------|---------|
| `LazyVersionHistory` | 200-300KB | ~5KB | 195-295KB |
| `LazyManageAccessComponent` | 150-250KB | ~5KB | 145-245KB |
| `LazyManageAccessPanel` | 150-250KB | ~5KB | 145-245KB |
| `LazyConflictDetector` | 100-150KB | ~3KB | 97-147KB |
| `LazyWorkflowStepper` | 80-120KB | ~3KB | 77-117KB |

#### Usage Example

```typescript
// Import lazy version
import { LazyVersionHistory } from 'spfx-toolkit/lib/components/lazy';

// Use exactly like the regular component
function MyComponent() {
  return (
    <LazyVersionHistory
      itemId={123}
      listId="abc-def-ghi"
      itemType="document"
      onDownload={(version) => console.log('Downloaded', version)}
    />
  );
}
```

#### Preloading Pattern

Improve UX by preloading components before they're needed:

```typescript
import { LazyVersionHistory, preloadComponent } from 'spfx-toolkit/lib/components/lazy';

function MyComponent() {
  return (
    <Button
      // Preload on hover for instant display on click
      onMouseEnter={() => preloadComponent(
        () => import('spfx-toolkit/lib/components/VersionHistory')
      )}
      onClick={() => setShowHistory(true)}
    >
      View History
    </Button>
  );
}
```

### DirectionalHint Type (Tree-Shakable)

We provide `DirectionalHint` enum to avoid Fluent UI import issues:

```typescript
// ✅ Import from toolkit (tree-shakable, no errors)
import { DirectionalHint } from 'spfx-toolkit/lib/types';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

<TooltipHost directionalHint={DirectionalHint.topCenter}>
  Content
</TooltipHost>
```

**Why we provide this:**
- Fluent UI's `DirectionalHint` export path changed and breaks tree-shaking
- Importing from main `@fluentui/react` adds 2-3MB to bundle
- Our custom enum maintains tree-shaking with identical values

### When to Use Lazy Loading

**✅ DO use lazy loading for:**
- Components > 100KB
- Modal/panel content
- Admin/configuration screens
- Rarely used features
- Components with heavy dependencies (DevExtreme, etc.)

**❌ DON'T use lazy loading for:**
- Small components (< 50KB)
- Components needed immediately on page load
- Critical UI elements
- Simple presentational components

### Recommended Component Loading Strategy

```typescript
// ✅ Lightweight components - regular imports
import { Card } from 'spfx-toolkit/lib/components/Card';
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';
import { GroupViewer } from 'spfx-toolkit/lib/components/GroupViewer';
import { ErrorBoundary } from 'spfx-toolkit/lib/components/ErrorBoundary';

// ✅ Heavy components - lazy imports
import {
  LazyVersionHistory,
  LazyManageAccessComponent,
  LazyConflictDetector,
  LazyWorkflowStepper
} from 'spfx-toolkit/lib/components/lazy';
```

### Bundle Analysis

Monitor your bundle size to verify optimizations:

```bash
# Build for production
gulp bundle --ship

# Analyze bundle (recommended)
gulp bundle --ship --analyze-bundle

# Check output size
ls -lh temp/deploy/
```

### Performance Metrics

Expected improvements with optimizations:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Initial bundle | 2.5MB | 1.7MB | -32% |
| Initial load | 1200ms | 800ms | -33% |
| Time to interactive | 1800ms | 1100ms | -39% |
| Lighthouse score | 75 | 92 | +23% |

### Migration Guide

#### For Existing Projects

1. **Update imports to lazy versions** (optional but recommended):
   ```typescript
   // Before
   import { VersionHistory } from 'spfx-toolkit/lib/components/VersionHistory';

   // After
   import { LazyVersionHistory as VersionHistory } from 'spfx-toolkit/lib/components/lazy';
   ```

2. **Verify bundle size**:
   ```bash
   gulp bundle --ship --analyze-bundle
   ```

#### Backward Compatibility

✅ **No breaking changes!** All existing imports continue to work:

```typescript
// ✅ Still works - regular import
import { VersionHistory } from 'spfx-toolkit/lib/components/VersionHistory';

// ✅ New option - lazy import
import { LazyVersionHistory } from 'spfx-toolkit/lib/components/lazy';
```

### Additional Resources

- [Lazy Loading Guide](./src/components/lazy/README.md) - Complete lazy loading documentation
- [Lazy Loader API](./src/utilities/lazyLoader/README.md) - Create custom lazy components
- [Type Definitions](./src/types/README.md) - DirectionalHint and other types
- [Development Guide](./CLAUDE.md) - Architecture and optimization details

---

**Last Updated:** October 2025
**Toolkit Version:** 1.0.0-alpha.0+
