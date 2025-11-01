# Legal Workflow System - Zustand Stores

This directory contains all Zustand state management stores for the Legal Review System application.

## Store Architecture

### Design Philosophy

1. **Single Source of Truth**: Each store manages a specific domain of data
2. **Immutable Updates**: State updates use immutable patterns
3. **Type Safety**: Full TypeScript support with strict typing
4. **DevTools Integration**: Zustand DevTools enabled in development
5. **Custom Hooks**: Each store provides custom React hooks for consumption
6. **Auto-loading**: Hooks automatically load data on first mount
7. **Error Handling**: Comprehensive error handling with SPContext.logger

## Stores Overview

### 1. Submission Items Store (`submissionItemsStore.ts`)

**Purpose**: Manages submission item configuration data (read-only)

**Caching Strategy**: Pessimistic (long-term cache via `SPContext.spPessimistic`)

**Data Source**: SharePoint list `SubmissionItems`

**State**:
- `items`: Array of submission items
- `isLoading`: Loading state
- `isLoaded`: Loaded flag (prevents re-fetching)
- `error`: Error message if load fails
- `lastLoadedAt`: Timestamp of last successful load

**Actions**:
- `loadItems()`: Load all submission items from SharePoint
- `getItemById(id)`: Get item by ID
- `getItemByTitle(title)`: Get item by title
- `refresh()`: Force reload (clears cache)
- `reset()`: Reset store to initial state

**Custom Hooks**:
```typescript
// Auto-loads items on mount
const { items, isLoading, getItemById, refresh } = useSubmissionItems();

// Get specific item by ID
const submissionItem = useSubmissionItem(itemId);
```

---

### 2. Configuration Store (`configStore.ts`)

**Purpose**: Manages application configuration data (read-only)

**Caching Strategy**: Pessimistic (long-term cache via `SPContext.spPessimistic`)

**Data Source**: SharePoint list `Configuration`

**State**:
- `configs`: Array of configuration items
- `configMap`: Map for fast key-based lookups
- `isLoading`: Loading state
- `isLoaded`: Loaded flag
- `error`: Error message
- `lastLoadedAt`: Last load timestamp

**Actions**:
- `loadConfigs()`: Load all active configurations
- `getConfig(key, defaultValue?)`: Get config value as string
- `getConfigBoolean(key, defaultValue?)`: Get config value as boolean
- `getConfigNumber(key, defaultValue?)`: Get config value as number
- `refresh()`: Force reload
- `reset()`: Reset store

**Custom Hooks**:
```typescript
// Auto-loads configs on mount
const { configs, getConfig, getConfigBoolean } = useConfig();

// Get specific config value
const apiUrl = useConfigValue('apiUrl', 'https://default.com');
const enableFeature = useConfigBoolean('enablePhase2', false);
const maxFileSize = useConfigNumber('maxFileSizeMB', 250);
```

---

### 3. Request Store (`requestStore.ts`)

**Purpose**: Manages legal review request data (read/write)

**Caching Strategy**: No caching (fresh data on every load via `SPContext.sp`)

**Data Source**: SharePoint list `Requests`

**State**:
- `currentRequest`: Current request being edited
- `originalRequest`: Snapshot for dirty checking
- `isDirty`: Whether changes have been made
- `isLoading`: Loading state
- `isSaving`: Saving state
- `error`: Error message
- `itemId`: Current request ID

**Actions - Load & Initialize**:
- `loadRequest(itemId)`: Load existing request
- `initializeNewRequest()`: Initialize blank request

**Actions - Update**:
- `updateField(field, value)`: Update single field
- `updateMultipleFields(fields)`: Update multiple fields
- `setApprovals(approvals)`: Set approvals array
- `updateLegalReview(review)`: Update legal review data
- `updateComplianceReview(review)`: Update compliance review data

**Actions - Save**:
- `saveAsDraft()`: Save without validation (returns itemId)
- `submitRequest()`: Validate and submit (changes status)
- `updateRequest(updates)`: Update existing request

**Actions - Workflow**:
- `assignAttorney(attorney, notes?)`: Direct attorney assignment
- `sendToCommittee(notes?)`: Send to committee
- `submitLegalReview(outcome, notes)`: Submit legal review
- `submitComplianceReview(outcome, notes, flags?)`: Submit compliance review
- `closeoutRequest(trackingId?)`: Close out request
- `cancelRequest(reason)`: Cancel request
- `holdRequest(reason)`: Put request on hold
- `resumeRequest()`: Resume from hold

**Actions - Utility**:
- `reset()`: Reset store
- `revertChanges()`: Revert to original
- `hasUnsavedChanges()`: Check dirty state

**Custom Hooks**:
```typescript
// Auto-loads request if itemId provided, otherwise initializes new
const {
  currentRequest,
  isLoading,
  isSaving,
  isDirty,
  updateField,
  saveAsDraft,
  submitRequest,
  revertChanges,
} = useRequest(itemId);
```

## Usage Patterns

### Read-Only Stores (Submission Items & Config)

**Pessimistic Caching**:
- Uses `SPContext.spPessimistic` for long-term cache
- Data is cached and reused across sessions
- Refresh manually only when configuration changes

```typescript
// Component using submission items
import { useSubmissionItems } from '@/stores';

const MyComponent: React.FC = () => {
  const { items, isLoading, getItemById } = useSubmissionItems();

  if (isLoading) {
    return <Spinner label="Loading submission items..." />;
  }

  return (
    <Dropdown
      options={items.map(item => ({
        key: item.id!,
        text: item.title,
      }))}
    />
  );
};
```

**Configuration Example**:
```typescript
import { useConfig, useConfigBoolean } from '@/stores';

const FeatureComponent: React.FC = () => {
  const { getConfig } = useConfig();
  const enablePhase2 = useConfigBoolean('enablePhase2RequestTypes', false);

  const apiUrl = getConfig('azureFunctionUrl', 'https://default.azure.com');

  if (!enablePhase2) {
    return null; // Feature not enabled
  }

  return <Phase2Features apiUrl={apiUrl} />;
};
```

### Request Store (Read/Write)

**Creating New Request**:
```typescript
import { useRequest } from '@/stores';

const NewRequestForm: React.FC = () => {
  const {
    currentRequest,
    updateField,
    saveAsDraft,
    submitRequest,
    isDirty,
  } = useRequest(); // No itemId = new request

  const handleSave = async () => {
    try {
      const itemId = await saveAsDraft();
      console.log('Draft saved:', itemId);
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const itemId = await submitRequest();
      console.log('Request submitted:', itemId);
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  return (
    <div>
      <TextField
        label="Request Title"
        value={currentRequest?.requestTitle || ''}
        onChange={(e, newValue) => updateField('requestTitle', newValue || '')}
      />

      <PrimaryButton onClick={handleSubmit} disabled={!isDirty}>
        Submit Request
      </PrimaryButton>

      <DefaultButton onClick={handleSave} disabled={!isDirty}>
        Save Draft
      </DefaultButton>
    </div>
  );
};
```

**Editing Existing Request**:
```typescript
import { useRequest } from '@/stores';

const EditRequestForm: React.FC<{ itemId: number }> = ({ itemId }) => {
  const {
    currentRequest,
    isLoading,
    updateField,
    saveAsDraft,
    revertChanges,
    hasUnsavedChanges,
  } = useRequest(itemId); // Loads existing request

  if (isLoading) {
    return <Spinner label="Loading request..." />;
  }

  const handleRevert = () => {
    if (hasUnsavedChanges() && confirm('Discard changes?')) {
      revertChanges();
    }
  };

  return (
    <div>
      <TextField
        label="Purpose"
        value={currentRequest?.purpose || ''}
        onChange={(e, newValue) => updateField('purpose', newValue || '')}
      />

      <PrimaryButton onClick={saveAsDraft}>
        Save Changes
      </PrimaryButton>

      <DefaultButton onClick={handleRevert}>
        Revert Changes
      </DefaultButton>
    </div>
  );
};
```

## Advanced Patterns

### Combining Multiple Stores

```typescript
import { useRequest, useSubmissionItems, useConfig } from '@/stores';

const RequestFormWithConfig: React.FC<{ itemId?: number }> = ({ itemId }) => {
  const { currentRequest, updateField } = useRequest(itemId);
  const { items: submissionItems } = useSubmissionItems();
  const { getConfigNumber } = useConfig();

  const maxFileSize = getConfigNumber('maxFileSizeMB', 250);

  return (
    <div>
      <Dropdown
        label="Submission Type"
        options={submissionItems.map(item => ({
          key: item.id!,
          text: `${item.title} (${item.turnAroundTimeInDays} days)`,
        }))}
        selectedKey={currentRequest?.submissionItem?.id}
        onChange={(e, option) =>
          updateField('submissionItem', {
            id: option?.key as number,
            title: option?.text || '',
          })
        }
      />

      <Label>Max file size: {maxFileSize}MB</Label>
    </div>
  );
};
```

### Workflow State Management

```typescript
import { useRequest } from '@/stores';
import { SPContext } from 'spfx-toolkit';

const WorkflowActions: React.FC<{ itemId: number }> = ({ itemId }) => {
  const { currentRequest } = useRequest(itemId);
  const store = useRequestStore();

  const handleAssignAttorney = async (attorney: IPrincipal) => {
    try {
      await store.assignAttorney(attorney, 'Direct assignment');
      SPContext.logger.success('Attorney assigned');
    } catch (error) {
      SPContext.logger.error('Failed to assign attorney', error);
    }
  };

  const handleSendToCommittee = async () => {
    try {
      await store.sendToCommittee('Requires committee review');
      SPContext.logger.success('Sent to committee');
    } catch (error) {
      SPContext.logger.error('Failed to send to committee', error);
    }
  };

  return (
    <div>
      <PrimaryButton onClick={() => handleAssignAttorney(selectedAttorney)}>
        Assign Attorney
      </PrimaryButton>

      <DefaultButton onClick={handleSendToCommittee}>
        Send to Committee
      </DefaultButton>
    </div>
  );
};
```

## Data Flow

### Load Sequence

1. **Component Mounts**: Custom hook called (e.g., `useRequest(itemId)`)
2. **Auto-Load Effect**: `useEffect` detects not loaded
3. **Store Action**: `loadRequest(itemId)` or `initializeNewRequest()`
4. **SharePoint Call**: Data fetched via SPContext
5. **State Update**: Store state updated with data
6. **Component Re-render**: Component receives updated data

### Update Sequence

1. **User Action**: Field value changes
2. **Store Update**: `updateField()` called
3. **State Mutation**: `currentRequest` updated, `isDirty` = true
4. **Save Action**: `saveAsDraft()` or `submitRequest()` called
5. **Change Detection**: Compare with `originalRequest`
6. **SharePoint Update**: Only changed fields sent
7. **State Refresh**: `originalRequest` updated, `isDirty` = false

## Performance Considerations

### Caching Strategy

**Pessimistic Cache (Config & Submission Items)**:
- ✅ Long-term cache (survives page refresh)
- ✅ Reduces SharePoint API calls
- ✅ Ideal for configuration data that rarely changes
- ⚠️ Manual refresh needed after config changes

**No Cache (Requests)**:
- ✅ Always fresh data
- ✅ Prevents stale data issues
- ✅ Multiple users can edit safely
- ⚠️ More API calls (acceptable for transactional data)

### Change Detection

The request store uses `createSPUpdater` from spfx-toolkit for efficient change detection:
- Only modified fields are sent to SharePoint
- Reduces payload size
- Prevents unnecessary updates
- Avoids version conflicts

### Devtools

Zustand DevTools enabled in development mode:
- Inspect state in Redux DevTools Extension
- Time-travel debugging
- Action history
- State snapshots

## Error Handling

All stores follow consistent error handling:

```typescript
try {
  await loadData();
  SPContext.logger.success('Data loaded', { count: items.length });
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  SPContext.logger.error('Load failed', error, { context: 'storeName' });

  set({
    error: message,
    isLoading: false,
  });

  throw new Error(`Operation failed: ${message}`);
}
```

## Testing

### Unit Testing Stores

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useSubmissionItems } from './submissionItemsStore';

describe('useSubmissionItems', () => {
  it('should load items on mount', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useSubmissionItems());

    expect(result.current.isLoading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.isLoaded).toBe(true);
    expect(result.current.items.length).toBeGreaterThan(0);
  });
});
```

## Migration Guide

If you need to add a new store:

1. Create new file: `src/stores/myNewStore.ts`
2. Define state interface with actions
3. Create store with `create<IMyState>()(devtools(...))`
4. Implement actions with SPContext integration
5. Add custom hooks for consumption
6. Export from `src/stores/index.ts`
7. Document in this README

## References

- **Zustand Documentation**: https://github.com/pmndrs/zustand
- **SPFx Toolkit**: `node_modules/spfx-toolkit/`
- **Type Definitions**: `src/types/`
- **CLAUDE.md**: Project guidelines
