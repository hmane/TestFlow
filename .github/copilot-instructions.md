

# GitHub Copilot Instructions for SPFx 1.21.1 Development

### ✅ Pre‑drafting Checklist (what to do before you write prompts or code)
- Clarify **SPFx version, React and Fluent UI versions** (SPFx 1.21.1, React 17, Fluent UI 8) and confirm the **toolkit** (`spfx-toolkit`) is installed.
- Open or create a **small, focused file** near the code you want (Copilot reads nearby context best).
- Add **types/interfaces and imports first** so Copilot can anchor suggestions to real APIs.
- Write a **one-line goal comment** that states inputs, outputs, edge cases, and error handling.
- Prefer **existing patterns** in the repo: reference a similar function/component in comments.
- Keep the **Problems** panel clean (`tsc --noEmit`) so Copilot isn’t distracted by cascading errors.
- Decide **security & accessibility** requirements up front (sanitization, permissions, ARIA/keyboard support).

### 💻 Live Development Mode Tips (`npm run serve`)

When you’re working continuously in **SPFx serve mode** (`gulp serve` or `npm run serve`), most builds are incremental. You can adapt the pre‑drafting checklist to this workflow:

| Task | Recommendation | Why |
|------|----------------|-----|
| **Run `npm run build`** | Only after dependency or configuration changes | Ensures `tsconfig.json`, `gulpfile.js`, and minification settings still build cleanly under production mode |
| **Run `tsc --noEmit`** | Frequently (fast type‑only check) | Catches type errors early without rebuilding the bundle |
| **Run `git grep "SPContext.smart"` or similar searches** | Before large feature work | Helps reuse patterns from existing code (e.g., consistent SPContext initialization or permission helpers) |
| **Run `npm run lint`** | Before major merges or Copilot refactors | Keeps suggestions clean and compliant with lint rules |
| **Make small commits (`git add -p`)** | Before experimenting with Copilot | Easy rollback if generated code diverges |
| **Keep a second terminal tab open** | For quick build/test/lint commands | Avoids interrupting your `serve` watch process |

> **Tip:** Copilot suggestions are influenced by nearby code and error context. Keeping your project type‑error‑free while serving yields significantly more accurate completions.

## 1. Introduction

This guide provides comprehensive instructions for leveraging GitHub Copilot effectively in SharePoint Framework (SPFx) version 1.21.1 projects using TypeScript and Visual Studio Code. GitHub Copilot is an AI-powered code completion tool that can significantly accelerate SPFx development when used with proper context and clear prompts.

**Purpose**: Help developers maximize productivity while maintaining code quality, security, and accessibility standards in SPFx projects.

**Scope**: This document covers setup, best practices, prompt engineering, and common scenarios specific to SPFx 1.21.1 with TypeScript.

**Important**: This project uses the `spfx-toolkit` npm package which provides pre-built components, hooks, utilities, and context management for SPFx development. All examples and patterns in this guide prioritize toolkit usage over manual implementations.

## 2. Prerequisites

Before using GitHub Copilot with SPFx development, ensure you have:

- **GitHub Account**: Active GitHub account with Copilot subscription (individual, business, or enterprise)
- **Visual Studio Code**: Version 1.85 or later
- **Node.js**: Version 22.x (>=22.14.0, required for SPFx 1.21.1)
- **SPFx Development Environment**:
  - Yeoman generator (`yo`)
  - SPFx generator (`@microsoft/generator-sharepoint` version 1.21.1)
  - Gulp CLI
- **TypeScript Knowledge**: Familiarity with TypeScript 5.x syntax and concepts
- **SharePoint Fundamentals**: Understanding of SharePoint Online, web parts, extensions, and SPFx architecture
- **SPFx Toolkit**: `spfx-toolkit` npm package installed in your project

## 3. Setting Up GitHub Copilot in VS Code

### 3.1 Installation and Sign In

1. **Install GitHub Copilot Extension**
   - Open VS Code
   - Navigate to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
   - Search for "GitHub Copilot"
   - Click "Install" on the official GitHub Copilot extension
   - Install the optional "GitHub Copilot Chat" extension for conversational assistance

2. **Sign In and Authorize**
   - Click "Sign in to GitHub" when prompted
   - Authorize VS Code to access your GitHub account
   - Verify your Copilot subscription is active
   - **Note**: If on a work tenant, verify Copilot org policy is enabled for your user

### 3.2 Enable for Languages and Configure Ergonomics

**Language Enablement:**
- Go to Settings → "Copilot"
- Enable for `typescript` and `typescriptreact`

**Useful Keybindings:**
- **Accept suggestion**: Tab
- **Next suggestion**: Alt/Option + ]
- **Previous suggestion**: Alt/Option + [
- **Trigger inline suggestion**: Cmd/Ctrl + I (configure if unset)
- **Open Copilot Chat**: Cmd/Ctrl + Shift + I

### 3.3 Recommended Workspace Settings

Create or update `.vscode/settings.json` in your SPFx project root:

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,

  // Enable Copilot where it helps for SPFx + TS/TSX
  "github.copilot.enable": {
    "*": false,
    "typescript": true,
    "typescriptreact": true,
    "json": true
  },
  "editor.inlineSuggest.enabled": true,

  // Keep suggestions unobtrusive and useful
  "github.copilot.editor.enableAutoCompletions": true,
  "github.copilot.inlineSuggest.enable": true,
  "github.copilot.suggestions.showCodeReferences": true,

  // Repo hygiene in VS Code
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "temp": true,
    "dist": true,
    "lib": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "dist": true,
    "lib": true
  }
}
```

**Note**: If your organization manages these settings centrally through policy, keep them documented here for reference in local workspaces.

### 3.4 Verify Installation

1. Open any `.ts` or `.tsx` file in your SPFx project
2. Start typing a comment like `// Create a function to fetch list items`
3. Press Enter and observe Copilot suggestions appearing in gray text
4. Press Tab to accept suggestions

## 4. Writing Effective Copilot Prompts

### 4.1 Prompt Engineering Principles

**Be Specific and Contextual**
- Include component type, expected behavior, and dependencies
- Reference SPFx-specific types and interfaces
- Specify toolkit components and utilities
- Mention data structures and return types

**Use Descriptive Comments**
```typescript
// BAD: Generic prompt
// Create a component

// GOOD: Specific SPFx + Toolkit prompt
// Create a React functional component for an SPFx web part that displays
// SharePoint list items using SPContext from spfx-toolkit. Use Card component
// from spfx-toolkit for display with loading states. Fetch data with SPContext.sp
// and log with SPContext.logger. Include proper error handling and accessibility.
```

**Leverage TypeScript Type Annotations**
```typescript
// Copilot uses type information for better suggestions
interface IDocumentItem {
  id: string;
  title: string;
  fileType: string;
  modifiedDate: Date;
  author: IPrincipal;
}

// Copilot will suggest methods that work with IDocumentItem
const filterDocumentsByType = (documents: IDocumentItem[], fileType: string): IDocumentItem[] => {
  // Copilot provides accurate filtering logic based on the interface
```

### 4.2 Effective Prompt Templates

**SPFx Web Part with Toolkit:**
```typescript
// Create an SPFx web part class that:
// - Extends BaseClientSideWebPart
// - Initializes SPContext using smart() in onInit()
// - Imports required PnP modules from spfx-toolkit/lib/utilities/context/pnpImports/
// - Renders React component with SPContext available
// - Includes property pane configuration with text field and toggle controls
```

**Component with Data Fetching:**
```typescript
// Create a React functional component named DocumentViewer that:
// - Accepts listTitle as prop
// - Uses SPContext.sp to fetch documents on mount
// - Implements AbortController for cleanup
// - Uses Card component from spfx-toolkit for display
// - Shows loading state, error state, and data
// - Logs operations with SPContext.logger
// - Handles errors with proper TypeScript type guards (unknown)
```

**Form with Toolkit Components:**
```typescript
// Create a task creation form using spfx-toolkit components:
// - FormContainer with 180px label width
// - DevExtremeTextBox for title (required, validated with Zod)
// - DevExtremeDateBox for due date
// - DevExtremeSelectBox for priority (Low/Medium/High)
// - PnPPeoplePicker for assignee
// - React Hook Form with zodResolver
// - FormError components with icons
// - Submit handler using SPContext.sp.web.lists to create item
```

**Permission Check:**
```typescript
// Implement permission-based UI that:
// - Uses createPermissionHelper from spfx-toolkit
// - Checks Edit permission on Tasks list using SPPermissionLevel.Edit
// - Shows edit/delete buttons only if user has permission
// - Logs permission checks with SPContext.logger
// - Handles PermissionError properly
```

**Data Extraction with Toolkit:**
```typescript
// Process SharePoint item using spfx-toolkit utilities:
// - Use createSPExtractor to extract fields from SharePoint item
// - Extract user field (AssignedTo) as IPrincipal
// - Extract lookup field (Category) as SPLookup
// - Extract taxonomy multi field (Tags) as SPTaxonomy[]
// - Extract date field with proper Date object
// - Handle missing fields gracefully
```

### 4.3 Context Provision Strategies

**Include Relevant Imports**
```typescript
// Copilot uses imports to understand available libraries
import { SPContext } from 'spfx-toolkit';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import { Card, Header, Content } from 'spfx-toolkit/lib/components/Card';

// Now prompts can reference these directly
// Create a method to fetch tasks and display in Card component
```

**Reference Existing Code Patterns**
```typescript
// When you have established patterns, reference them
// Create a new method similar to getUserProfile() but for getting user tasks
// Use the same error handling pattern with SPContext.logger
// Follow the same AbortController cleanup pattern
```

**Specify Framework Versions**
```typescript
// For SPFx 1.21.1 with React 17, create a component using hooks
// Use Fluent UI 8.x patterns (not v9)
// Use spfx-toolkit components where available
```

## 5. Coding Standards and Best Practices

### 5.1 TypeScript Best Practices

**Always Use Strict Type Checking**
```typescript
// tsconfig.json should include:
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```


**Define Interfaces for All Data Structures**
```typescript
// GOOD: Explicit interface definitions
export interface IListItem {
  id: number;
  title: string;
  created: string;
  author: IPrincipal;
}

export interface IWebPartProps {
  listName: string;
  itemsPerPage: number;
  showAuthor: boolean;
}

// Copilot will use these interfaces for accurate suggestions
```

---


**Interface Naming and Property Standards**

When defining interfaces:
- **Interface Names:** Use **PascalCase** (e.g., `IListItem`, `IWebPartProps`).
- **Interface Properties:** Use **camelCase** (e.g., `id`, `title`, `created`, `author`).
- This rule applies to all TypeScript interface definitions, prop types, and data models across this repository.
- If an interface is defined, **always follow these casing conventions** for every property, even if the source data (e.g., SharePoint REST API) uses PascalCase. Normalize it to camelCase when assigning or mapping data.

**Example:**
```typescript
// ✅ Correct
export interface IListItem {
  id: number;
  title: string;
  created: string;
  author: IPrincipal;
}

// ❌ Avoid
export interface IListItem {
  Id: number;
  Title: string;
  Created: string;
  Author: IPrincipal;
}
```

---


**Prefer `undefined` Over `null`**

TypeScript discourages the use of `null` in most cases. Use `undefined` instead to represent missing or optional values, except when working with legacy APIs that explicitly require `null`.

**Guidelines:**
- Use `undefined` for optional or uninitialized properties.
- Avoid assigning `null` in new code.
- Use type unions like `string | undefined` instead of `string | null`.
- Reserve `null` only for interoperability with older APIs or systems that expect it (e.g., certain SharePoint or Graph responses).

**Example:**
```typescript
// ✅ Recommended
interface IUser {
  id: number;
  email?: string; // may be undefined
  phoneNumber?: string | undefined;
}

// ❌ Avoid
interface IUser {
  id: number;
  email: string | null;
  phoneNumber: string | null;
}
```

---

**Define Functions and Components Before Using Them**

TypeScript with ESLint enforces a rule that functions, variables, and components should be **defined before they are used** to ensure proper hoisting and predictable behavior. While traditional function declarations are hoisted, arrow functions, constants, and React components defined as variables are not.

**Guidelines:**
- Always declare or define functions **before** they are invoked.
- Define React components **before** they are rendered or referenced.
- For helper utilities, move them to a separate file or define them above their usage.
- Avoid relying on hoisting for function declarations when using modern TypeScript with ESLint strict mode.

**Example:**
```typescript
// ✅ Recommended
function calculateSum(a: number, b: number): number {
  return a + b;
}

export const MathComponent: React.FC = () => {
  const total = calculateSum(3, 4);
  return <div>Total: {total}</div>;
};

// ❌ Avoid
export const MathComponent: React.FC = () => {
  const total = calculateSum(3, 4); // ESLint error: function used before defined
  return <div>Total: {total}</div>;
};

function calculateSum(a: number, b: number): number {
  return a + b;
}
```

---

**Use Proper Error Handling with Type Guards**
```typescript
// GOOD: Proper error handling with unknown type
async function fetchListItems(listName: string): Promise<IListItem[]> {
  try {
    const items = await SPContext.sp.web.lists
      .getByTitle(listName)
      .items.select('Id', 'Title', 'Created', 'Author/Title')
      .expand('Author')
      .top(50)();

    SPContext.logger.success('Items loaded', { count: items.length, listName });
    return items as IListItem[];
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error(`Failed to fetch from ${listName}: ${message}`, { error });
    throw new Error(`Data fetch failed: ${message}`);
  }
}
```

**Implement AbortController for Async Operations**
```typescript
// GOOD: Abortable requests pattern (prevents memory leaks)
const MyComponent: React.FC<IProps> = ({ listName }) => {
  const [items, setItems] = React.useState<IListItem[]>([]);

  React.useEffect(() => {
    const abortController = new AbortController();

    const loadData = async () => {
      try {
        const data = await SPContext.sp.web.lists
          .getByTitle(listName)
          .items.top(10)();

        if (!abortController.signal.aborted) {
          setItems(data);
        }
      } catch (error: unknown) {
        if (!abortController.signal.aborted) {
          const message = error instanceof Error ? error.message : String(error);
          SPContext.logger.error('Load failed', error, { listName });
        }
      }
    };

    loadData();

    return () => {
      abortController.abort();
    };
  }, [listName]);

  // Component render logic
};
```

**Use Utility Types**
```typescript
// Leverage TypeScript utility types for better type safety
type ReadonlyWebPartProps = Readonly<IWebPartProps>;
type PartialUpdateProps = Partial<IWebPartProps>;
type RequiredConfig = Required<Pick<IWebPartProps, 'listName'>>;
```

### 5.2 SPFx Specifics

**Always Use SPContext from Toolkit**

✅ **DO:**
```typescript
import { SPContext } from 'spfx-toolkit';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';

export default class MyWebPart extends BaseClientSideWebPart<IProps> {
  protected async onInit(): Promise<void> {
    await super.onInit();
    // Smart initialization - auto-detects environment
    await SPContext.smart(this.context, 'MyWebPart');
  }

  private async loadData(): Promise<void> {
    const items = await SPContext.sp.web.lists.getByTitle('Tasks').items();
    SPContext.logger.info('Data loaded', { count: items.length });
  }
}
```

❌ **DON'T:**
```typescript
// Don't use raw PnP setup
import { spfi, SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
const sp = spfi().using(SPFx(this.context));

// Don't use raw fetch for SharePoint REST
fetch(`${webUrl}/_api/web/lists`, { ... });

// Don't import deprecated Office UI Fabric
import { Button } from 'office-ui-fabric-react';
```

**Use Toolkit Components**

✅ **DO:**
```typescript
import { Card, Header, Content } from 'spfx-toolkit/lib/components/Card';
import { FormContainer, FormItem, DevExtremeTextBox } from 'spfx-toolkit/lib/components/spForm';
import { createPermissionHelper } from 'spfx-toolkit/lib/utilities/permissionHelper';

// Use pre-built, tested components
<Card id="data-card" variant="info">
  <Header>Data View</Header>
  <Content>
    {/* Your content */}
  </Content>
</Card>
```

❌ **DON'T:**
```typescript
// Don't build components from scratch when toolkit provides them
// Don't use Node-only modules in web parts
import * as fs from 'fs';  // ❌ Won't work in browser
import * as path from 'path';  // ❌ Won't work in browser
```

**SPContext Properties and Services**

```typescript
// Web information
SPContext.webAbsoluteUrl          // Full site URL
SPContext.webTitle                // Site title
SPContext.tenantUrl               // Tenant root URL
SPContext.webId                   // Web GUID

// Current user
SPContext.currentUser.title       // Display name
SPContext.currentUser.email       // Email address
SPContext.currentUser.loginName   // Login name
SPContext.currentUser.id          // User ID

// Environment detection
SPContext.environment             // 'dev', 'uat', or 'prod'
SPContext.isTeamsContext          // true if in Microsoft Teams

// Culture and localization
SPContext.currentUICultureName    // 'en-US', 'ar-SA', etc.
SPContext.isRightToLeft          // true for RTL languages

// SharePoint operations (always available)
SPContext.sp                      // Fresh data, no caching
SPContext.spCached               // With caching (if enabled)
SPContext.spPessimistic          // Long-term cache (if enabled)

// Built-in services
SPContext.logger                 // Structured logging
SPContext.http                   // HTTP client with auth
SPContext.performance            // Performance tracking
```

**PnP Module Imports from Toolkit**

Import only the PnP functionality you need:

```typescript
// Lists and items
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';

// Files and folders
import 'spfx-toolkit/lib/utilities/context/pnpImports/files';

// Search
import 'spfx-toolkit/lib/utilities/context/pnpImports/search';

// Managed metadata
import 'spfx-toolkit/lib/utilities/context/pnpImports/taxonomy';

// Permissions and security
import 'spfx-toolkit/lib/utilities/context/pnpImports/security';

// Multiple imports
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import 'spfx-toolkit/lib/utilities/context/pnpImports/files';
```

**Property Pane imports (add to your web part file):**
```typescript
import {
  IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneToggle
} from '@microsoft/sp-property-pane';
```

**Web Part Structure Pattern**

```typescript
import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { SPContext } from 'spfx-toolkit';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';

export default class MyWebPart extends BaseClientSideWebPart<IMyWebPartProps> {

  protected async onInit(): Promise<void> {
    await super.onInit();

    // Initialize SPContext with smart configuration
    await SPContext.smart(this.context, 'MyWebPart');

    SPContext.logger.info('Web part initialized', {
      webTitle: SPContext.webTitle,
      environment: SPContext.environment
    });
  }

  public render(): void {
    const element: React.ReactElement<IMyProps> = React.createElement(
      MyComponent,
      {
        // Pass only what's needed; SPContext is globally available
        listName: this.properties.listName
      }
    );

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: { description: 'List Viewer Settings' },
          groups: [
            {
              groupName: 'Data',
              groupFields: [
                PropertyPaneTextField('listName', {
                  label: 'SharePoint list title',
                  placeholder: 'e.g., Tasks',
                  deferredValidationTime: 200,
                  onGetErrorMessage: (value: string) => {
                    if (!value || value.trim().length < 1) {
                      return 'List name is required';
                    }
                    if (value.length > 128) {
                      return 'List name is too long';
                    }
                    return '';
                  }
                }),
                PropertyPaneToggle('showAuthor', {
                  label: 'Show Author',
                  onText: 'Shown',
                  offText: 'Hidden'
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
```

**SPContext Logger Usage**

```typescript
// Structured logging with context
SPContext.logger.info('Operation started', {
  operation: 'loadUsers',
  listName: 'Users',
  webTitle: SPContext.webTitle
});

SPContext.logger.success('Operation completed', {
  count: 25,
  duration: 450
});

SPContext.logger.warn('Performance issue detected', {
  duration: 1500,
  threshold: 1000
});

// Error logging with proper type handling
try {
  await riskyOperation();
} catch (error: unknown) {
  SPContext.logger.error(
    'Operation failed',
    error,
    {
      context: 'user-load',
      listName: 'Users',
      correlationId: SPContext.correlationId
    }
  );
}

// Performance timing
const endTimer = SPContext.logger.startTimer('data-processing');
// ... do work ...
const duration = endTimer(); // Logs timing automatically
```

**Do's and Don'ts Quick Reference**

✅ **DO:**
- Use `SPHttpClient`, `AadHttpClient`, or `MSGraphClientFactory` (or `SPContext` wrappers)
- Request least-privilege scopes; centralize Graph permissions
- Import only needed PnP modules via toolkit's `pnpImports/*`
- Use toolkit components for Cards, Forms, Error Boundaries, etc.
- Initialize SPContext once in onInit() using `smart()` or environment-specific methods
- Use SPContext.logger for all logging (not console.log)
- Implement AbortController for async operations in React effects
- Handle errors with proper TypeScript type guards (`error: unknown`)

❌ **DON'T:**
- Don't call protected endpoints with raw `fetch`
- Don't use Node-only modules (`fs`, `path`, etc.) in web parts
- Don't accept Copilot's deprecated Fabric imports; prefer Fluent UI 8 patterns
- Don't manually configure PnP when SPContext is available
- Don't build components from scratch if toolkit provides them
- Don't use `console.log` for production logging
- Don't forget cleanup (AbortController.abort()) in useEffect
- Don't cast errors as `any` - use `unknown` and type guards

### 5.3 Security and Accessibility
### 5.4 AI‑Assisted Code Generation Guardrails (High‑Quality Output)

These guardrails make AI suggestions more **consistent, testable, accessible, and secure**. Use these prompts and constraints when asking AI tools to generate or refactor code.

**Deterministic Prompts**
- Always specify versions: **SPFx 1.21.1**, **React 17**, **Fluent UI 8**, **TypeScript 5**.
- Reference the **spfx-toolkit** and require **SPContext** patterns.
- State **what not to use** (no raw fetch, no console.log, no Node‑only modules in web parts).
- Provide **types/interfaces first** and ask AI to adhere strictly to them.

**API & Types Discipline**
- Require **explicit return types** for all exported functions and components.
- **No `any`**. Prefer `unknown` with type guards for errors.
- Use **`import type { ... }`** for type‑only imports.
- **Named exports only** (avoid default exports) to improve tree‑shaking and discoverability.
- Interfaces in **PascalCase**; **properties in camelCase**. Map external field names to camelCase models.
- Prefer **`undefined`** over `null` except for legacy APIs.

**React/Hooks Quality**
- Enforce **Rules of Hooks**. Provide a dependency array for every effect.
- Use **`useMemo`** and **`useCallback`** for expensive computations and stable callbacks.
- Use **`React.memo`** for presentational components.
- **Define functions/components before use** (ESLint will warn otherwise).
- Cleanup all effects with **AbortController** where async work is involved.

**Performance Patterns**
- For SharePoint calls: always use **`select`, `expand`, `top`, `orderBy`** where relevant.
- Avoid N+1 patterns; batch where possible (see `createBatchBuilder`).
- Memoize derived data; avoid recomputation on every render.

**Error Handling & Logging**
- Catch errors as **`unknown`**, then narrow: `error instanceof Error ? error.message : String(error)`.
- Use **`SPContext.logger`** (`info/success/warn/error`) instead of `console.log`.
- Include **context objects** in logs (listName, itemId, correlationId).
- Surface user‑facing errors accessibly (ARIA `role="alert"`, `aria-live`).

**Security & Data Hygiene**
- Sanitize any user‑provided content (**`escape`**, **DOMPurify** for HTML).
- Validate inputs with **Zod** where appropriate (especially forms).
- Principle of least privilege for Graph/SharePoint operations.
- Never embed secrets; use environment/configuration.

**Date/Time & Locale**
- Treat server data as **UTC**; convert at render time.
- Use **ISO strings** for persistence; avoid ambiguous locale parsing.
- Prefer **date‑fns** (or native `Intl`) over heavy date libraries.

**Accessibility (A11y) Baseline**
- Provide labels/ARIA for interactive elements.
- Use `role="status"` / `role="alert"` and **`aria-live`** regions for async states.
- Ensure **keyboard support** (Enter/Space/Escape) and **focus management** for modals.
- Respect **high contrast** and theme tokens (Fluent UI 8).

**i18n & Text**
- No hardcoded UI strings in logic files; centralize in a messages module.
- Prepare for RTL support (`theme.isRightToLeft`).

**Testing Hooks**
- Ask AI to include **unit tests** with **Jest + React Testing Library** for new logic, including:
  - happy path, error path, edge cases
  - hooks/components: interaction tests, a11y roles, ARIA expectations
- Encourage dependency injection for testability.

**File/Module Organization**
- One component/hook per file; co‑locate small CSS modules if needed.
- Avoid cyclic deps; split utilities vs React layers.
- Name files predictably (`*.hook.ts`, `*.types.ts`, `*.utils.ts`).

**Prompt Snippets to Use with AI**
```markdown
Use SPFx 1.21.1 + React 17 + Fluent UI 8 + TypeScript 5. Follow spfx-toolkit patterns:
- Initialize SPContext via smart() in onInit()
- Use Card/Form components from spfx-toolkit where applicable
- No raw fetch, no console.log, no Node-only modules in web parts
- Explicit return types; no `any`; errors are `unknown` with type guards
- Interfaces PascalCase; properties camelCase; prefer `undefined` over `null`
- Effects have cleanup (AbortController) and correct deps
- Add ARIA labels, `role="status"`/`"alert"` where needed
- Optimize SharePoint queries (select/top/expand) and avoid N+1
- Add minimal Jest/RTL tests (happy/error/edge) for new logic
```

**Mini Checklists for AI Output Review**
- Types present? return types explicit? no `any`?
- Errors handled with guards? logs use SPContext.logger?
- A11y roles/labels present? keyboard interactions covered?
- Effects cleaned up? dependencies correct?
- Query optimized? batching considered?
- Strings externalized? dates safe/UTC?


**Input Validation and Sanitization**

```typescript
import { escape } from '@microsoft/sp-lodash-subset';

// Always sanitize user input before rendering
function sanitizeUserInput(userInput: string): string {
  const sanitized = escape(userInput);

  if (sanitized.length > 255) {
    throw new Error('Input exceeds maximum length');
  }

  return sanitized;
}

// Safe rendering
const safeText = sanitizeUserInput(userProvidedText);
return <div>{safeText}</div>;

// For HTML content, use DOMPurify
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userHTML) }} />
```

**Secure API Calls**

**Content Security Policy & HTML Sanitization**
- Prefer render-as-text; only use `dangerouslySetInnerHTML` when unavoidable.
- Sanitize any HTML with a vetted library (e.g., DOMPurify) and consider a strict **CSP** that blocks inline scripts and limits external domains.
- Avoid string-concatenated URLs/queries; use typed params/builders.

```typescript
// Example: strict CSP header for Azure Function (server-side)
context.res = {
  headers: {
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://<your-tenant>.sharepoint.com https://graph.microsoft.com"
  }
};
```

```typescript
// Use SPContext HTTP client for Azure Functions
const result = await SPContext.http.callFunction({
  url: 'https://myapp.azurewebsites.net/api/process',
  method: 'POST',
  data: { items: [1, 2, 3] },
  useAuth: true,
  resourceUri: 'api://your-app-id'
});

// Never hardcode credentials or API keys
// ❌ DON'T
const apiKey = 'sk-1234567890abcdef';

// ✅ DO - Use environment variables or secure configuration
const apiKey = process.env.API_KEY;
```

**Permission Checks**

```typescript
import { createPermissionHelper, SPPermissionLevel } from 'spfx-toolkit/lib/utilities/permissionHelper';

// Always check permissions before operations
const permissionHelper = createPermissionHelper(SPContext.sp);

const canEdit = await permissionHelper.userHasPermissionOnList(
  'Tasks',
  SPPermissionLevel.Edit
);

if (!canEdit.hasPermission) {
  throw new PermissionError(
    'Insufficient permissions',
    PermissionErrorCodes.INSUFFICIENT_PERMISSIONS
  );
}

// Proceed with operation
await updateTask();
```

**Accessibility Essentials**

**Semantic HTML and ARIA:**
```typescript
// Proper button with ARIA
<button
  type="button"
  onClick={handleClick}
  aria-label="Delete item"
  aria-disabled={isDeleting}
  disabled={isDeleting}
>
  Delete
</button>

// Alert for errors
<div role="alert" aria-live="assertive">
  {errorMessage}
</div>

// Status for loading
<div role="status" aria-live="polite">
  {isLoading && 'Loading...'}
</div>
```

**Keyboard Navigation:**
```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleAction();
  }

  if (e.key === 'Escape') {
    handleClose();
  }
};

return (
  <div
    role="button"
    tabIndex={0}
    onKeyDown={handleKeyDown}
    onClick={handleClick}
  >
    Interactive Element
  </div>
);
```

**Focus Management Utility:**
```typescript
// Reusable utility for focus management
export function focusFirstFocusable(container: HTMLElement): void {
  const focusableElement = container.querySelector<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  focusableElement?.focus();
}

// Usage in modal
React.useEffect(() => {
  if (isModalOpen && modalRef.current) {
    focusFirstFocusable(modalRef.current);
  }
}, [isModalOpen]);
```

**Use Fluent UI Theme Colors:**
```typescript
import { getTheme } from '@fluentui/react';

const theme = getTheme();

const styles: IStyleSet = {
  errorText: {
    color: theme.semanticColors.errorText,
    fontSize: theme.fonts.medium.fontSize
  },
  highContrastButton: {
    backgroundColor: theme.palette.themePrimary,
    color: theme.palette.white,
    border: `2px solid ${theme.palette.themePrimary}`,
    '@media (forced-colors: active)': {
      border: '2px solid currentColor'
    }
  }
};
```

## 6. Common Copilot Usage Scenarios

### 6.1 Complete SPFx Web Part with List Viewer

**Prompt:**
```typescript
// SPFx 1.21.1 web part using spfx-toolkit
// Display items from a SharePoint list
// - Initialize SPContext in onInit()
// - Use Card component for display
// - Fetch with SPContext.sp
// - Show loading, error, and list states
// - Implement AbortController for cleanup
// - Accessible with ARIA and keyboard support
```

> **Next prompt idea:**
// Add a property pane to let the user choose the list name and a toggle to show the Author field.

**Complete Implementation:**
```typescript
import * as React from 'react';
import * as ReactDom from 'react-dom';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { SPContext } from 'spfx-toolkit';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import { Card, Header, Content } from 'spfx-toolkit/lib/components/Card';

interface IListItem {
  id: number;
  title: string;
  modified: string;
}

interface IListViewerProps {
  listTitle: string;
}

const ListViewer: React.FC<IListViewerProps> = ({ listTitle }) => {
  const [items, setItems] = React.useState<IListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadItems = React.useCallback(() => {
    const abortController = new AbortController();
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const result = await SPContext.sp.web.lists
          .getByTitle(listTitle)
          .items.select('Id', 'Title', 'Modified')
          .top(10)();

        if (!abortController.signal.aborted) {
          const normalized: IListItem[] = (result as any[]).map((r: any) => ({
            id: r.Id,
            title: r.Title,
            modified: r.Modified
          }));
          setItems(normalized);
          SPContext.logger.success('Items loaded', {
            count: normalized.length,
            listTitle
          });
        }
      } catch (e: unknown) {
        if (!abortController.signal.aborted) {
          const message = e instanceof Error ? e.message : String(e);
          setError(message);
          SPContext.logger.error('Load failed', e, { listTitle });
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      abortController.abort();
    };
  }, [listTitle]);

  React.useEffect(() => {
    const cleanup = loadItems();
    return cleanup;
  }, [loadItems]);

  if (loading) {
    return (
      <div role="status" aria-live="polite">
        Loading items from {listTitle}...
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert">
        <p>Failed to load items: {error}</p>
        <button onClick={loadItems}>Retry</button>
      </div>
    );
  }

  return (
    <Card id="list-viewer" variant="info">
      <Header>{listTitle} Items</Header>
      <Content>
        <ul aria-label={`Items from ${listTitle}`}>
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong>
              <span> - Modified: {new Date(item.modified).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      </Content>
    </Card>
  );
};

export default class ListViewerWebPart extends BaseClientSideWebPart<{ listTitle: string }> {
  protected async onInit(): Promise<void> {
    await super.onInit();
    await SPContext.smart(this.context, 'ListViewerWebPart');
  }

  public render(): void {
    const element = React.createElement(ListViewer, {
      listTitle: this.properties.listTitle || 'Tasks'
    });
    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }
}
```

### 6.2 Form with Toolkit Components

**Prompt:**
```typescript
// Create task form using spfx-toolkit form components
// - FormContainer with 180px labels
// - DevExtremeTextBox for title (required)
// - DevExtremeDateBox for due date
// - DevExtremeSelectBox for priority
// - React Hook Form with Zod validation
// - Submit to SharePoint using SPContext.sp
```

**Implementation:**
```typescript
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FormContainer,
  FormItem,
  FormLabel,
  FormValue,
  FormError,
  DevExtremeTextBox,
  DevExtremeDateBox,
  DevExtremeSelectBox
} from 'spfx-toolkit/lib/components/spForm';
import { SPContext } from 'spfx-toolkit';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').min(3, 'Minimum 3 characters'),
  dueDate: z.date().optional(),
  priority: z.enum(['Low', 'Medium', 'High'])
});

type TaskFormData = z.infer<typeof taskSchema>;

export const TaskForm: React.FC = () => {
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      title: '',
      priority: 'Medium'
    }
  });

  const onSubmit = async (data: TaskFormData) => {
    try {
      SPContext.logger.info('Creating task', data);

      const result = await SPContext.sp.web.lists
        .getByTitle('Tasks')
        .items.add({
          Title: data.title,
          DueDate: data.dueDate?.toISOString(),
          Priority: data.priority
        });

      SPContext.logger.success('Task created', {
        id: result.data.Id,
        title: data.title
      });

      form.reset();
      alert('Task created successfully!');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      SPContext.logger.error('Task creation failed', error);
      alert(`Failed to create task: ${message}`);
    }
  };

  return (
    <FormContainer labelWidth="180px">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormItem>
          <FormLabel isRequired>Title</FormLabel>
          <FormValue>
            <DevExtremeTextBox
              name="title"
              control={form.control}
              placeholder="Enter task title"
            />
            <FormError error={form.formState.errors.title?.message} showIcon />
          </FormValue>
        </FormItem>

        <FormItem>
          <FormLabel>Due Date</FormLabel>
          <FormValue>
            <DevExtremeDateBox
              name="dueDate"
              control={form.control}
              type="date"
              placeholder="Select due date"
            />
            <FormError error={form.formState.errors.dueDate?.message} showIcon />
          </FormValue>
        </FormItem>

        <FormItem>
          <FormLabel isRequired>Priority</FormLabel>
          <FormValue>
            <DevExtremeSelectBox
              name="priority"
              control={form.control}
              items={['Low', 'Medium', 'High']}
            />
            <FormError error={form.formState.errors.priority?.message} showIcon />
          </FormValue>
        </FormItem>

        <button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Creating...' : 'Create Task'}
        </button>
      </form>
    </FormContainer>
  );
};
```

### 6.3 Data Extraction and Update with Toolkit

**Prompt:**
```typescript
// Process SharePoint item using spfx-toolkit utilities
// - Use createSPExtractor to read item fields
// - Extract user, lookup, and taxonomy fields
// - Use createSPUpdater with change detection
// - Only update fields that changed
```

**Implementation:**
```typescript
import {
  createSPExtractor,
  createSPUpdater,
  shouldPerformUpdate
} from 'spfx-toolkit/lib/utilities/listItemHelper';
import { SPContext } from 'spfx-toolkit';
import type { IPrincipal, SPLookup, SPTaxonomy } from 'spfx-toolkit/lib/types';

interface ITaskData {
  title: string;
  assignedTo: IPrincipal | undefined;
  category: SPLookup | undefined;
  tags: SPTaxonomy[];
  dueDate: Date | undefined;
  isActive: boolean;
}

async function processTaskItem(sharePointItem: any): Promise<ITaskData> {
  // Extract data from SharePoint item
  const extractor = createSPExtractor(sharePointItem);

  return {
    title: extractor.string('Title', ''),
    assignedTo: extractor.user('AssignedTo'),
    category: extractor.lookup('Category'),
    tags: extractor.taxonomyMulti('Tags'),
    dueDate: extractor.date('DueDate'),
    isActive: extractor.boolean('IsActive', true)
  };
}

async function updateTaskWithChangeDetection(
  itemId: number,
  originalItem: any,
  newValues: Partial<ITaskData>
): Promise<void> {
  // Check if update is needed
  const updateCheck = shouldPerformUpdate(originalItem, newValues);

  if (!updateCheck.shouldUpdate) {
    SPContext.logger.info('No changes detected, skipping update', {
      itemId,
      reason: updateCheck.reason
    });
    return;
  }

  // Build updates with change detection
  const updater = createSPUpdater();

  Object.entries(newValues).forEach(([field, value]) => {
    updater.set(field, value, originalItem[field]);
  });

  if (!updater.hasChanges()) {
    SPContext.logger.info('No field changes after comparison', { itemId });
    return;
  }

  // Get only changed fields
  const updates = updater.getUpdates();

  SPContext.logger.info('Updating task', {
    itemId,
    changedFields: updater.getChangedFields(),
    changeCount: updater.getChangedFields().length
  });

  try {
    await SPContext.sp.web.lists
      .getByTitle('Tasks')
      .items.getById(itemId)
      .update(updates);

    SPContext.logger.success('Task updated', {
      itemId,
      changedFields: updater.getChangedFields()
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('Update failed', error, { itemId });
    throw new Error(`Failed to update task: ${message}`);
  }
}
```

### 6.4 Permission-Based UI

**Prompt:**
```typescript
// Create component with permission-based UI
// - Check user permissions using spfx-toolkit
// - Show/hide actions based on permissions
// - Handle permission errors gracefully
// - Display user-friendly messages
```

**Implementation:**
```typescript
import * as React from 'react';
import {
  createPermissionHelper,
  SPPermissionLevel,
  BatchPermissionChecker
} from 'spfx-toolkit/lib/utilities/permissionHelper';
import { SPContext } from 'spfx-toolkit';

interface ITaskActionsProps {
  taskId: number;
  onEdit: () => void;
  onDelete: () => void;
  onApprove: () => void;
}

export const TaskActions: React.FC<ITaskActionsProps> = ({
  taskId,
  onEdit,
  onDelete,
  onApprove
}) => {
  const [permissions, setPermissions] = React.useState({
    canEdit: false,
    canDelete: false,
    canApprove: false,
    isLoading: true
  });

  React.useEffect(() => {
    checkPermissions();
  }, [taskId]);

  const checkPermissions = async () => {
    try {
      const batchChecker = new BatchPermissionChecker(SPContext.sp);

      // Check multiple permissions in parallel
      const [listPerms, groupCheck] = await Promise.all([
        batchChecker.checkMultipleItems([
          { listName: 'Tasks', itemId: taskId, permission: SPPermissionLevel.Edit, key: 'edit' },
          { listName: 'Tasks', itemId: taskId, permission: SPPermissionLevel.FullControl, key: 'delete' }
        ]),
        batchChecker.getPermissionHelper().userHasRole('Task Approvers')
      ]);

      setPermissions({
        canEdit: listPerms.edit.hasPermission,
        canDelete: listPerms.delete.hasPermission,
        canApprove: groupCheck.hasPermission,
        isLoading: false
      });

      SPContext.logger.info('Permissions checked', {
        taskId,
        permissions: {
          canEdit: listPerms.edit.hasPermission,
          canDelete: listPerms.delete.hasPermission,
          canApprove: groupCheck.hasPermission
        }
      });
    } catch (error: unknown) {
      SPContext.logger.error('Permission check failed', error, { taskId });
      setPermissions(prev => ({ ...prev, isLoading: false }));
    }
  };

  if (permissions.isLoading) {
    return <div role="status">Loading permissions...</div>;
  }

  return (
    <div className="task-actions" role="group" aria-label="Task actions">
      {permissions.canEdit && (
        <button onClick={onEdit} aria-label="Edit task">
          Edit
        </button>
      )}

      {permissions.canDelete && (
        <button onClick={onDelete} aria-label="Delete task" className="danger">
          Delete
        </button>
      )}

      {permissions.canApprove && (
        <button onClick={onApprove} aria-label="Approve task" className="success">
          Approve
        </button>
      )}

      {!permissions.canEdit && !permissions.canDelete && !permissions.canApprove && (
        <div role="status">
          You don't have permissions to perform actions on this task.
        </div>
      )}
    </div>
  );
};
```

### 6.5 Responsive Layout with Toolkit Hooks

**Prompt:**
```typescript
// Create responsive dashboard using spfx-toolkit hooks
// - Use useViewport for responsive detection
// - Different layouts for mobile/tablet/desktop
// - Use useLocalStorage for user preferences
// - Card components with adaptive sizing
```

**Implementation:**
```typescript
import * as React from 'react';
import { useViewport, useLocalStorage } from 'spfx-toolkit/lib/hooks';
import { Card, Header, Content, Accordion } from 'spfx-toolkit/lib/components/Card';

interface IDashboardPreferences {
  showAdvanced: boolean;
  itemsPerPage: number;
  defaultView: 'grid' | 'list';
}

export const ResponsiveDashboard: React.FC = () => {
  const { isMobile, isTablet, isDesktop, breakpoint, up } = useViewport();

  const [preferences, setPreferences] = useLocalStorage<IDashboardPreferences>(
    'dashboard-prefs',
    {
      showAdvanced: false,
      itemsPerPage: 10,
      defaultView: 'grid'
    }
  );

  const getColumns = (): number => {
    if (isMobile) return 1;
    if (isTablet) return 2;
    if (up('xl')) return 4;
    return 3;
  };

  const getCardSize = (): 'compact' | 'regular' | 'large' => {
    if (isMobile) return 'compact';
    if (isDesktop) return 'large';
    return 'regular';
  };

  // Mobile: Use accordion for better UX
  if (isMobile) {
    return (
      <Accordion id="mobile-dashboard" allowMultiple={false}>
        <Card id="overview">
          <Header>Overview</Header>
          <Content>
            <p>Dashboard overview content</p>
          </Content>
        </Card>

        <Card id="tasks">
          <Header>My Tasks</Header>
          <Content>
            <p>Task list content</p>
          </Content>
        </Card>

        <Card id="reports">
          <Header>Reports</Header>
          <Content>
            <p>Report content</p>
          </Content>
        </Card>
      </Accordion>
    );
  }

  // Desktop/Tablet: Grid layout
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${getColumns()}, 1fr)`,
        gap: isMobile ? '8px' : '16px',
        padding: isMobile ? '8px' : '16px'
      }}
    >
      <Card id="overview" size={getCardSize()} variant="info">
        <Header>Overview</Header>
        <Content>
          <p>Current breakpoint: {breakpoint}</p>
          <p>Items per page: {preferences.itemsPerPage}</p>
        </Content>
      </Card>

      <Card id="tasks" size={getCardSize()} variant="success">
        <Header>My Tasks</Header>
        <Content>
          <p>Device type: {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}</p>
        </Content>
      </Card>

      {up('md') && (
        <Card id="reports" size={getCardSize()}>
          <Header>Reports</Header>
          <Content>
            <button
              onClick={() =>
                setPreferences(prev => ({
                  ...prev,
                  showAdvanced: !prev.showAdvanced
                }))
              }
            >
              Toggle Advanced: {preferences.showAdvanced ? 'On' : 'Off'}
            </button>
          </Content>
        </Card>
      )}
    </div>
  );
};
```

### 6.6 Batch Operations with Toolkit

**Prompt:**
```typescript
// Batch update multiple items using spfx-toolkit
// - Use createBatchBuilder for efficient operations
// - Update items across multiple lists
// - Handle errors per operation
// - Log results with SPContext.logger
```

**Implementation:**
```typescript
import { createBatchBuilder } from 'spfx-toolkit/lib/utilities/batchBuilder';
import { SPContext } from 'spfx-toolkit';

interface ITaskUpdate {
  id: number;
  status: string;
  completedDate?: string;
}

async function batchUpdateTasks(updates: ITaskUpdate[]): Promise<void> {
  try {
    SPContext.logger.info('Starting batch update', {
      count: updates.length
    });

    const batchBuilder = createBatchBuilder(SPContext.sp, {
      batchSize: 50,
      enableConcurrency: false
    });

    // Add all updates to batch
    updates.forEach(update => {
      batchBuilder
        .list('Tasks')
        .update(update.id, {
          Status: update.status,
          CompletedDate: update.completedDate
        });
    });

    // Execute batch
    const result = await batchBuilder.execute();

    SPContext.logger.success('Batch update completed', {
      total: result.totalOperations,
      successful: result.successfulOperations,
      failed: result.failedOperations
    });

    // Log individual failures
    if (result.errors.length > 0) {
      result.errors.forEach(error => {
        SPContext.logger.error('Batch operation failed', error, {
          listName: error.listName
        });
      });
    }

    // Show summary
    alert(
      `Updated ${result.successfulOperations} of ${result.totalOperations} items.\n` +
      `Failures: ${result.failedOperations}`
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('Batch update failed', error);
    throw new Error(`Batch update failed: ${message}`);
  }
}

// Cross-list batch operations
async function createProjectWithTasks(
  projectData: any,
  taskData: any[]
): Promise<void> {
  const result = await createBatchBuilder(SPContext.sp)
    .list('Projects')
    .add(projectData)
    .list('Tasks')
    .add({ ...taskData[0], ProjectId: 1 })
    .add({ ...taskData[1], ProjectId: 1 })
    .list('Notifications')
    .add({
      Type: 'Project Created',
      Message: `Project ${projectData.Title} created with ${taskData.length} tasks`,
      CreatedDate: new Date().toISOString()
    })
    .execute();

  SPContext.logger.info('Project creation batch completed', {
    successful: result.successfulOperations,
    failed: result.failedOperations
  });
}
```

## 7. Using Copilot for Pull Request Reviews

### 7.1 Writing Effective PR Comments

**Good PR Comment Principles:**
- **Be specific** - Reference exact lines or code blocks
- **Be constructive** - Suggest solutions, not just problems
- **Be concise** - 2-4 sentences per comment
- **Be respectful** - Assume positive intent
- **Include context** - Explain why the change matters

### 7.2 Copilot-Assisted PR Review Prompts
**For Bundle Size & Build Hygiene:**
```typescript
// Audit this PR for bundle size pitfalls:
// - Are large dependencies tree-shaken?
// - Any accidental default imports of Fluent UI icons or lodash?
// - Dynamic import opportunities for heavy components?
// - Web part prefetch/lazy strategies ok for SPFx 1.21.1 + React 17?
```

**For Code Quality:**
```typescript
// Review this component for:
// - SPFx 1.21.1 and spfx-toolkit best practices
// - Proper error handling with SPContext.logger and type guards
// - Accessibility (ARIA labels, keyboard navigation, focus management)
// - Performance (React.memo, useMemo, useCallback, AbortController)
// - Security (input sanitization, permission checks)
// - Correct toolkit component usage (SPContext, Card, Form components)
```

**For Architecture:**
```typescript
// Analyze this implementation:
// - Does it follow SPContext initialization patterns?
// - Are toolkit components used appropriately?
// - Is the component structure clean and maintainable?
// - Are PnP imports from toolkit's pnpImports folder?
// - Suggest improvements without rewriting everything
```

**For Security:**
```typescript
// Security review checklist:
// - User input sanitized with escape() or DOMPurify?
// - Permission checks before sensitive operations?
// - No hardcoded credentials or API keys?
// - Secure API calls using SPContext.http or SPHttpClient?
// - XSS prevention in render methods?
```

**For Performance:**
```typescript
// Performance review:
// - Are there unnecessary re-renders? (check React.memo, useMemo)
// - Are queries optimized? (select, top, filter clauses)
// - Memory leaks prevented? (AbortController in useEffect)
// - Are expensive calculations memoized?
// - Large imports avoided? (tree-shaking considerations)
```

### 7.3 PR Comment Templates

**✅ Good Examples:**

**Specific and Helpful:**
```markdown
**Line 45:** Consider using `SPContext.logger.error()` instead of `console.error()`
for consistent logging. This ensures errors are captured in production monitoring.

**Suggested change:**
```typescript
- console.error('Failed to load', error);
+ SPContext.logger.error('Failed to load', error, { listName });
```
```

**Security-Focused:**
```markdown
**Lines 78-82:** User input is rendered without sanitization. Use `escape()` from
`@microsoft/sp-lodash-subset` to prevent XSS attacks:

```typescript
import { escape } from '@microsoft/sp-lodash-subset';
const safeValue = escape(userInput);
return <div>{safeValue}</div>;
```
```

**Accessibility Improvement:**
```markdown
**Line 120:** This button needs an `aria-label` for screen readers since it only
shows an icon.

**Add:**
```typescript
<button aria-label="Delete item" onClick={handleDelete}>
  <Icon iconName="Delete" />
</button>
```
```

**Toolkit Usage:**
```markdown
**Lines 55-70:** Consider using `createSPExtractor` from spfx-toolkit instead of
manual field extraction. This handles null checks and type conversions automatically:

```typescript
import { createSPExtractor } from 'spfx-toolkit/lib/utilities/listItemHelper';

const extractor = createSPExtractor(item);
const assignedUser = extractor.user('AssignedTo');
const dueDate = extractor.date('DueDate');
```
```

**Performance Optimization:**
```typescript
**Line 92:** This effect runs on every render. Add dependency array and AbortController:

```typescript
React.useEffect(() => {
  const abortController = new AbortController();

  loadData();

  return () => {
    abortController.abort();
  };
}, [listName]); // Add dependencies
```
```

**❌ Bad Examples:**

**Too Vague:**
```markdown
This looks wrong. Fix it.
```
*Problem: No context, no suggestion, not helpful*

**Too Long:**
```markdown
So I was reviewing this code and I noticed that you're using console.log in several
places which isn't ideal because in production we need better logging and console.log
doesn't give us the structured data we need and also it's not consistent with our
patterns and we should be using the SPContext logger which provides better functionality
and it's part of our toolkit and we've been using it in other components so it would
be good to stay consistent across the codebase and also it helps with debugging when
we can filter logs by component name and severity level...
```
*Problem: Rambling, hard to extract action items*

**Not Constructive:**
```markdown
Why didn't you use the toolkit component? This is exactly what we have the toolkit for.
```
*Problem: Accusatory tone, no specific guidance*

**Missing Context:**
```markdown
Change this to use SPContext.
```
*Problem: No explanation of why or how*

### 7.4 Using Copilot Chat for PR Reviews

**Review Entire File:**
```
@workspace Review this file for SPFx 1.21.1 and spfx-toolkit best practices.
Focus on: SPContext usage, toolkit components, error handling, accessibility,
performance, and security. Provide specific line numbers and code suggestions.
```

**Check Specific Concerns:**
```
Does this component follow our SPContext initialization pattern in onInit()?
Are there any security vulnerabilities in the user input handling?
Is AbortController properly implemented for async operations?
```

**Generate Review Summary:**
```
Summarize the key changes in this PR and highlight any potential issues with:
- SPFx 1.21.1 compatibility
- spfx-toolkit usage (SPContext, Card, Form components)
- Security (sanitization, permissions)
- Accessibility (ARIA, keyboard, focus)
- Performance (memoization, cleanup)
```

**Compare with Best Practices:**
```
Compare this implementation with our SPFx best practices documented in
copilot-instructions.md. What deviations exist and what should be changed?
```

### 7.5 PR Comment Guidelines

**When to Comment:**

✅ **Always comment on:**
- Security vulnerabilities (XSS, injection, hardcoded secrets)
- Accessibility issues (missing ARIA, keyboard support)
- Performance problems (memory leaks, missing memoization)
- Incorrect toolkit usage (manual PnP setup vs SPContext)
- Missing error handling or improper type guards
- Breaking changes or API modifications

✅ **Consider commenting on:**
- Code clarity and maintainability issues
- Potential edge cases not handled
- Missing documentation for complex logic
- Test coverage gaps

❌ **Don't comment on:**
- Style preferences if linter passes
- Minor formatting (handled by Prettier)
- Personal coding style preferences
- Nitpicks without security/performance impact

**When to Approve Without Comment:**
- Documentation updates
- Minor refactoring with no logic changes
- Formatting changes
- Test additions
- Configuration updates

### 7.6 Comment Length Guide

**Simple fix (1-2 sentences + code suggestion):**
```markdown
**Line 34:** Missing type annotation. Add explicit return type:
```typescript
- async function loadData() {
+ async function loadData(): Promise<IListItem[]> {
```
```

**Medium issue (2-3 sentences + context + suggestion):**
```markdown
**Lines 45-50:** This creates a memory leak because the effect doesn't clean up
the async operation. When the component unmounts before the request completes,
the state update will occur on an unmounted component.

**Solution:** Add AbortController:
```typescript
React.useEffect(() => {
  const ac = new AbortController();
  loadData();
  return () => ac.abort();
}, [listName]);
```
```

**Complex concern (3-4 sentences + example + explanation):**
```markdown
**Lines 88-105:** This manual permission check implementation has several issues:
1. It doesn't use our spfx-toolkit permission helper
2. Error handling is incomplete
3. It doesn't cache results, causing unnecessary API calls

**Recommended approach:**
```typescript
import { createPermissionHelper, SPPermissionLevel } from 'spfx-toolkit/lib/utilities/permissionHelper';

const permissionHelper = createPermissionHelper(SPContext.sp, {
  enableCaching: true,
  cacheTimeout: 300000
});

const canEdit = await permissionHelper.userHasPermissionOnList('Tasks', SPPermissionLevel.Edit);
```

This approach uses our standard pattern, includes caching, and has comprehensive
error handling built-in.
```

**Architectural discussion (consider offline discussion):**
```markdown
**Component Structure:** This component has grown to 500+ lines and handles multiple
responsibilities (data fetching, UI rendering, permission checks, form validation).

**Suggestion:** Let's schedule a quick call to discuss splitting this into:
- Data layer (custom hook)
- UI components (presentational)
- Business logic (service layer)

This would improve testability, reusability, and maintainability. I can prepare a
proposed architecture diagram before we meet.
```

### 7.7 Copilot Prompts for Different Review Types

**Security Review Prompt:**
```typescript
// Perform a comprehensive security review:
// - Check for XSS vulnerabilities (unescaped user input in render)
// - Verify input sanitization (escape, DOMPurify usage)
// - Confirm permission checks before sensitive operations
// - Look for hardcoded credentials, API keys, or secrets
// - Validate secure API calls (SPContext.http, SPHttpClient, not raw fetch)
// - Check for SQL injection risks in CAML queries
// - Verify HTTPS usage for external API calls
```

**Performance Review Prompt:**
```typescript
// Analyze for performance issues:
// - Identify unnecessary re-renders (missing React.memo, useMemo, useCallback)
// - Check for inefficient queries (missing select, top, orderBy, filter)
// - Look for memory leaks (missing AbortController, event listener cleanup)
// - Find expensive calculations not memoized
// - Identify large imports that bloat bundle size
// - Check for N+1 query problems
// - Verify lazy loading for heavy components (Card lazyLoad prop)
```

**Accessibility Review Prompt:**
```typescript
// Accessibility compliance check (WCAG 2.1 AA):
// - All interactive elements have proper ARIA labels
// - Keyboard navigation fully functional (Tab, Enter, Escape, Arrow keys)
// - Focus management in modals and dynamic content (focusFirstFocusable utility)
// - Screen reader compatibility (semantic HTML, role attributes)
// - Color contrast meets standards (use theme.semanticColors)
// - Status/error announcements use aria-live regions
// - Form fields have associated labels
// - Images have alt text
```

**Toolkit Usage Review Prompt:**
```typescript
// Review spfx-toolkit usage:
// - SPContext initialized in onInit() using smart() method
// - Toolkit components used instead of custom implementations (Card, Form, etc.)
// - Correct import paths (spfx-toolkit/lib/...)
// - PnP modules imported from toolkit's pnpImports folder
// - SPContext.logger used for all logging (not console.log)
// - Permission checks use createPermissionHelper from toolkit
// - Data extraction uses createSPExtractor when appropriate
// - Batch operations use createBatchBuilder
```

**TypeScript Quality Review Prompt:**
```typescript
// TypeScript code quality review:
// - All functions have explicit return types
// - Interfaces defined for all data structures
// - Error handling uses 'unknown' type with proper type guards
// - No use of 'any' type (except in specific allowed cases)
// - Proper use of utility types (Partial, Pick, Omit, Record)
// - Enums used for fixed value sets
// - Type assertions minimized and justified
// - Import types correctly (import type { ... })
```

## 8. Handling Limitations and Errors

### 8.1 Quick Triage Checklist

When Copilot suggestions aren't working or seem incorrect, use this fast filter:

**Import/endpoint looks odd?**
→ Compare with a known working module in this repo
→ Verify against spfx-toolkit documentation
→ Ask Copilot Chat: "Is this import path correct for spfx-toolkit?"

**Graph call failing (401/403)?**
→ Use SPFx clients (MSGraphClientFactory, not raw fetch)
→ Verify API permissions and scopes in manifest
→ Ensure proper consent flow

**Accessibility gaps?**
→ Run through ARIA checklist (labels, roles, live regions)
→ Test keyboard navigation (Tab, Enter, Escape, Arrow keys)
→ Use browser dev tools accessibility audit

**Build errors after Copilot suggestion?**
→ Run `tsc --noEmit` to see all TypeScript errors
→ Ask Copilot Chat: "Fix these TypeScript errors without changing public APIs"
→ Verify all imports are from correct packages and paths

**Performance regressions?**
→ Add query optimization: `select`, `top`, `orderBy`
→ Implement memoization: `React.memo`, `useMemo`, `useCallback`
→ Add AbortController for async operations
→ Check for missing dependency arrays in useEffect

### 8.2 Recognizing Copilot Limitations

**Toolkit-Specific Issues**
- Copilot may suggest manual PnP setup instead of SPContext
- **Mitigation**: Always specify "using SPContext from spfx-toolkit" in prompts
- Copilot may not know latest toolkit component APIs
- **Mitigation**: Reference specific toolkit components in comments

**Outdated Package Versions**
- Copilot may suggest outdated library versions
- **Mitigation**: Verify versions in `package.json` against SPFx 1.21.1 compatibility
- Specify versions in prompts: "Use @fluentui/react version 8.x"

**SPFx-Specific APIs**
- Copilot may not be familiar with newer SPFx APIs introduced after training data
- **Mitigation**: Provide interface definitions or examples from documentation

**React Version Mismatches**
- Copilot might suggest React 18 patterns incompatible with SPFx 1.21.1 (React 17)
- **Mitigation**: Explicitly state "Using React 17" in prompts
- Avoid concurrent features and automatic batching patterns

### 8.3 Common Copilot Errors and Fixes

**❌ Incorrect: Manual PnP Setup**
```typescript
// Copilot might suggest (INCORRECT):
import { spfi, SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";

const sp = spfi().using(SPFx(this.context));
const items = await sp.web.lists.getByTitle('Tasks').items();
```

**✅ Correct: Use SPContext**
```typescript
// Correct toolkit pattern:
import { SPContext } from 'spfx-toolkit';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';

await SPContext.smart(this.context, 'MyWebPart');
const items = await SPContext.sp.web.lists.getByTitle('Tasks').items();
```

**❌ Incorrect: Raw Fetch for SharePoint**
```typescript
// Copilot might suggest (INCORRECT):
const response = await fetch(
  `${siteUrl}/_api/web/lists/getbytitle('Tasks')/items`,
  {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}` // Don't manage tokens manually
    }
  }
);
```

**✅ Correct: Use SPContext or SPHttpClient**
```typescript
// Use SPContext (preferred):
const items = await SPContext.sp.web.lists.getByTitle('Tasks').items();

// Or use SPHttpClient:
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';

const response: SPHttpClientResponse = await this.context.spHttpClient.get(
  `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('Tasks')/items`,
  SPHttpClient.configurations.v1
);
```

**❌ Incorrect: Missing Type Guards**
```typescript
// Copilot might suggest (UNSAFE):
function fetchData(listName: string) {
  try {
    return sp.web.lists.getByTitle(listName).items();
  } catch (error) {
    console.log(error.message); // Unsafe: error might not have message
  }
}
```

**✅ Correct: Proper Type Guards**
```typescript
// Use unknown type and instanceof checks:
async function fetchData(listName: string): Promise<IListItem[]> {
  try {
    return await SPContext.sp.web.lists.getByTitle(listName).items();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error(`Failed to fetch from ${listName}: ${message}`, { error });
    throw new Error(`Data fetch failed: ${message}`);
  }
}
```

**❌ Incorrect: Missing AbortController**
```typescript
// Copilot might suggest (MEMORY LEAK):
React.useEffect(() => {
  loadData();
}, [listName]);
```

**✅ Correct: With AbortController**
```typescript
// Proper cleanup to prevent memory leaks:
React.useEffect(() => {
  const abortController = new AbortController();

  const loadData = async () => {
    try {
      const data = await SPContext.sp.web.lists.getByTitle(listName).items();
      if (!abortController.signal.aborted) {
        setData(data);
      }
    } catch (error: unknown) {
      if (!abortController.signal.aborted) {
        handleError(error);
      }
    }
  };

  loadData();

  return () => {
    abortController.abort();
  };
}, [listName]);
```

**❌ Incorrect: Missing Toolkit Component**
```typescript
// Copilot might suggest building from scratch:
const [isExpanded, setIsExpanded] = React.useState(false);
const [isMaximized, setIsMaximized] = React.useState(false);

return (
  <div className="custom-card">
    <div className="card-header" onClick={() => setIsExpanded(!isExpanded)}>
      <h3>{title}</h3>
      <button onClick={() => setIsMaximized(true)}>Maximize</button>
    </div>
    {isExpanded && <div className="card-content">{children}</div>}
  </div>
);
```

**✅ Correct: Use Toolkit Component**
```typescript
// Use pre-built, tested Card component:
import { Card, Header, Content } from 'spfx-toolkit/lib/components/Card';

return (
  <Card id="my-card" allowMaximize={true}>
    <Header>{title}</Header>
    <Content>{children}</Content>
  </Card>
);
```

### 8.4 Debugging Copilot Suggestions

**Review Generated Code Systematically:**
1. Check if toolkit components are used where applicable
2. Verify SPContext is initialized before use
3. Ensure correct import paths from spfx-toolkit
4. Confirm PnP modules are imported from toolkit's pnpImports
5. Look for TypeScript errors in Problems panel
6. Verify error handling uses proper type guards

**Provide Toolkit Context in Comments:**
```typescript
// CONTEXT: This project uses spfx-toolkit npm package
// - Use SPContext for all SharePoint operations
// - Use Card component from spfx-toolkit for UI
// - Use createPermissionHelper for permission checks
// - Import PnP modules from spfx-toolkit/lib/utilities/context/pnpImports/
// - Use SPContext.logger instead of console.log

// Now create the component following these patterns:
```

**Use Copilot Chat for Clarification:**
- Ask: "How do I initialize SPContext from spfx-toolkit in onInit()?"
- Request: "Show me the correct way to import Card component from spfx-toolkit"
- Query: "What's the difference between SPContext.sp and manual PnP setup?"
- Verify: "Is this import path correct for spfx-toolkit: 'spfx-toolkit/lib/components/Card'?"

**Incremental Acceptance:**
- Accept Copilot suggestions line by line for complex code
- Test after each significant addition
- Reject suggestions that don't follow toolkit patterns
- Modify suggestions to use toolkit components

### 8.5 When Copilot Doesn't Understand

**Scenario: Complex SPFx + Toolkit Patterns**

If Copilot struggles with advanced patterns:

**1. Break down the prompt into smaller steps:**
```typescript
// Step 1: Initialize SPContext in web part onInit()
// Step 2: Import required PnP modules from toolkit
// Step 3: Create React component that uses SPContext.sp
// Step 4: Add Card component wrapper from toolkit
// Step 5: Implement error handling with SPContext.logger
```

**2. Provide example code from your existing project:**
```typescript
// Create a similar component to this existing one:
export const ExistingComponent: React.FC = () => {
  // existing implementation using toolkit
};

// New component: create TaskViewer that follows the same pattern
// but displays tasks instead of documents
```

**3. Use Copilot Chat for explanations:**
```
How do I configure SPContext with custom caching in SPFx 1.21.1?

Explain the difference between SPContext.sp, SPContext.spCached,
and SPContext.spPessimistic in spfx-toolkit.

Show me how to use createSPExtractor to extract user and lookup fields
from a SharePoint list item.
```

**4. Reference documentation explicitly:**
```typescript
// According to spfx-toolkit documentation, SPContext should be initialized like this:
// await SPContext.smart(this.context, 'ComponentName');
// Now implement the data loading following this pattern
```

### 8.6 Handling Unsupported Features

**Modern Authentication Flows**
- Copilot may not know recent MSAL.js updates
- **Solution**: Refer to official Microsoft documentation and provide code snippets to Copilot
- Use SPContext.http for authenticated calls

**New Fluent UI Components**
- Fluent UI v9 components may not be in training data
- **Solution**: SPFx 1.21.1 uses Fluent UI v8, stick to v8 components
- Include import statements and component examples in prompts

**Beta/Preview Features**
- SPFx preview features won't be recognized
- **Solution**: Clearly document the feature in comments and provide examples
- Test thoroughly and handle gracefully if not available

**Custom Toolkit Components**
- Copilot may not know your organization's custom toolkit extensions
- **Solution**: Provide full component interface and usage examples
- Keep internal documentation updated and reference it in prompts

## 9. Additional Resources

### SPFx Toolkit Documentation
- Review component README files in `spfx-toolkit` package
- Check toolkit types folder for interface definitions
- Examine toolkit examples for implementation patterns
- Refer to toolkit utilities documentation for helper functions

### Official Microsoft Documentation

**SPFx Framework**
- [SharePoint Framework Overview](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/sharepoint-framework-overview)
- [SPFx 1.21.1 Release Notes](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/release-1.21.1)
- [Build your first web part](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/web-parts/get-started/build-a-hello-world-web-part)
- [SPFx Extensions](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/extensions/overview-extensions)

**TypeScript**
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [TypeScript Cheat Sheet](https://www.typescriptlang.org/cheatsheets)

**React**
- [React Documentation](https://react.dev/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [React Hooks Reference](https://react.dev/reference/react)
- [React 17 Documentation](https://17.reactjs.org/)

**PnPjs**
- [PnPjs Documentation](https://pnp.github.io/pnpjs/)
- [PnPjs v3 Migration Guide](https://pnp.github.io/pnpjs/transition-guide/)
- [Using PnPjs with SPFx](https://pnp.github.io/pnpjs/getting-started/)

**Fluent UI**
- [Fluent UI React v8 Documentation](https://developer.microsoft.com/en-us/fluentui#/controls/web)
- [Fluent UI Theming](https://developer.microsoft.com/en-us/fluentui#/styles/web/themes)
- [Fluent UI Icons](https://developer.microsoft.com/en-us/fluentui#/styles/web/icons)

### GitHub Copilot Resources

**Official Documentation**
- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [Copilot Best Practices](https://github.blog/2023-06-20-how-to-write-better-prompts-for-github-copilot/)
- [Copilot Patterns & Exercises](https://github.com/features/copilot)

**Tips and Techniques**
- [Effective Prompting Guide](https://docs.github.com/en/copilot/using-github-copilot/prompt-engineering-for-github-copilot)
- [Copilot Chat Documentation](https://docs.github.com/en/copilot/github-copilot-chat/using-github-copilot-chat)

### Accessibility & Security

**Accessibility Standards**
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Microsoft Accessibility Guidelines](https://www.microsoft.com/en-us/accessibility)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

**Security Resources**
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [SharePoint Security Best Practices](https://learn.microsoft.com/en-us/sharepoint/security-considerations-of-allowing-custom-script)
- [Web Security Fundamentals](https://developer.mozilla.org/en-US/docs/Web/Security)

### Community Resources

**SharePoint Community**
- [SharePoint PnP Community](https://pnp.github.io/)
- [SPFx Samples Repository](https://github.com/pnp/sp-dev-fx-webparts)
- [SharePoint Stack Exchange](https://sharepoint.stackexchange.com/)
- [SPFx Community Calls](https://aka.ms/spdev-calls)

**Learning Resources**
- [Microsoft Learn - SPFx](https://learn.microsoft.com/en-us/training/modules/sharepoint-spfx-get-started/)
- [PnP SPFx Training](https://pnp.github.io/pnpjs/getting-started/)

### Tools & Extensions

**VS Code Extensions**
- [SPFx Toolkit Extension](https://marketplace.visualstudio.com/items?itemName=m365pnp.viva-connections-toolkit)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

**Development Tools**
- [SharePoint Online Management Shell](https://learn.microsoft.com/en-us/powershell/sharepoint/sharepoint-online/connect-sharepoint-online)
- [PnP PowerShell](https://pnp.github.io/powershell/)

---

## Summary

This guide provides comprehensive instructions for using GitHub Copilot effectively in SPFx 1.21.1 development with the spfx-toolkit. Key takeaways:

### ✅ Always Do:
- Initialize SPContext in onInit() using `smart()` method
- Use toolkit components (Card, Form, Error Boundary, etc.)
- Import PnP modules from toolkit's pnpImports folder
- Handle errors with proper TypeScript type guards (`error: unknown`)
- Implement AbortController for async operations
- Use SPContext.logger for all logging
- Check permissions before sensitive operations
- Follow accessibility best practices (ARIA, keyboard, focus)
- Write specific, contextual prompts for Copilot
- Review and test all Copilot suggestions

### ❌ Never Do:
- Don't use manual PnP setup when SPContext is available
- Don't use console.log for production logging
- Don't call protected endpoints with raw fetch
- Don't build components from scratch if toolkit provides them
- Don't use Node-only modules in web parts
- Don't forget cleanup in React effects
- Don't cast errors as `any`
- Don't skip permission checks
- Don't render user input without sanitization
- Don't accept Copilot suggestions blindly

### 🎯 For Best Results:
- Reference spfx-toolkit components in prompts
- Specify SPFx 1.21.1 and React 17 compatibility
- Provide context about toolkit patterns
- Use Copilot Chat for complex questions
- Break down complex prompts into steps
- Include type definitions in prompts
- Test thoroughly and iterate
- Follow the PR review guidelines for quality code

By following these guidelines, you'll get high-quality, toolkit-aligned suggestions from GitHub Copilot that accelerate your SPFx development while maintaining code quality, security, and accessibility standards.
---

**Changelog (living doc)**
- 2025‑10‑08: Added pre‑drafting checklist, cleaned VS Code settings, full property pane example (text/toggle with validation), CSP guidance, and extra PR review prompts.
