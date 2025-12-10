# Request & Document Processing Sequences

This document explains the internal sequences for loading requests, saving requests, and handling document uploads in the Legal Workflow system.

---

## Table of Contents
- [Request Loading Sequence](#request-loading-sequence)
- [Request Saving Sequence](#request-saving-sequence)
- [Document Upload Sequence](#document-upload-sequence)
- [SharePoint API Calls Summary](#sharepoint-api-calls-summary)
- [Performance Considerations](#performance-considerations)

---

## Request Loading Sequence

### Overview
When a user opens an existing request, the system loads request data from SharePoint along with associated approval files.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER ACTION: Opens request in form                           │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. COMPONENT: RequestInfo.tsx                                   │
│    - useRequest hook called with itemId                          │
│    - React.useEffect triggers on mount                           │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. STORE: requestStore.loadRequest(itemId)                      │
│    - Sets isLoading = true                                       │
│    - Clears any existing errors                                  │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. SERVICE: requestLoadService.loadRequestById(itemId)          │
│    - Executes 2 parallel CAML queries                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ├─────────────────┬──────────────────┐
                 ▼                 ▼                  ▼
    ┌──────────────────┐ ┌───────────────┐ ┌────────────────────┐
    │ Query 1:         │ │ Query 2:      │ │ Parallel execution │
    │ - Request info   │ │ - Reviews     │ │ via Promise.all()  │
    │ - 11 user/lookup │ │ - 8 user/     │ │                    │
    │   expansions     │ │   lookup exp. │ │                    │
    └────────┬─────────┘ └───────┬───────┘ └────────────────────┘
             │                   │
             └─────────┬─────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. DATA PROCESSING                                               │
│    - Merge Query 1 + Query 2 results                             │
│    - mapRequestListItemToRequest() - 118 lines of mapping        │
│    - buildApprovalsArrayFromFields() - reconstruct approvals     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. APPROVAL FILES: Load files for each approval                 │
│    - For each approval with approver set:                        │
│      → approvalFileService.loadAllApprovalFiles(itemId, type)    │
│      → Sequential loading (NOT parallelized)                     │
│    - Map files to approval.existingFiles array                   │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. STORE UPDATE                                                  │
│    - currentRequest = loaded data                                │
│    - originalRequest = copy for dirty checking                   │
│    - isLoading = false                                           │
│    - isDirty = false                                             │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. UI RENDER: Form displays loaded data                         │
└─────────────────────────────────────────────────────────────────┘
```

### SharePoint Calls
| Call # | Purpose | API | Fields Returned |
|--------|---------|-----|-----------------|
| 1 | Request Info | `renderListData()` | 37 fields (request + approvals) |
| 2 | Reviews | `renderListData()` | 37 fields (reviews + tracking) |
| 3-N | Approval Files | `loadAllApprovalFiles()` | N calls (one per approval type) |

**Total calls:** 2 + N (where N = number of approval types with files)

### Code References
- **Entry Point**: `src/stores/requestStore.ts:125` (loadRequest)
- **Service**: `src/services/requestLoadService.ts:168` (loadRequestById)
- **Mapping**: `src/services/requestLoadService.ts:330` (mapRequestListItemToRequest)
- **Files**: `src/stores/requestStore.ts:136-166` (approval file loading loop)

---

## Request Saving Sequence

### Overview
When a user saves a draft or submits a request, the system saves request data and processes any pending document operations.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER ACTION: Clicks "Save Draft" or "Submit"                 │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. HOOK: useRequestInfoActions.completeSave()                   │
│    - Calls handlePreSaveDocumentOperations()                     │
│    - Renames pending files (if any)                              │
│    - Deletes pending files (if any)                              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. STORE: requestStore.saveAsDraft() OR submitRequest()         │
│    - Sets isSaving = true                                        │
│    - Validates form data                                         │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. SERVICE: requestSaveService.saveDraft/saveRequest()          │
│    - buildRequestUpdatePayload(request, originalRequest)         │
│      → Uses createSPUpdater() for change detection               │
│      → mapApprovalsToSharePointFields() - 135 lines!             │
│      → Only sends changed fields to SharePoint                   │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. SHAREPOINT: Create or Update item                            │
│    - New request: sp.web.lists.items.add(payload)                │
│    - Existing: sp.web.lists.items.getById(id).update(payload)    │
│    - Returns: { itemId, listItemId }                             │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. RELOAD: requestLoadService.loadRequestById(itemId)           │
│    - Fetch fresh data from SharePoint                            │
│    - Ensures UI shows server state (not stale client state)      │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. DOCUMENTS: processDocumentOperationsAfterSave(itemId)        │
│    - Check if documentsStore.hasPendingOperations()              │
│    - If yes:                                                     │
│      a) Upload staged files (with progress tracking)             │
│      b) Process deletes and renames                              │
│      c) Clear pending operations                                 │
│      d) Reload documents from SharePoint                         │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. STORE UPDATE                                                  │
│    - currentRequest = reloaded data                              │
│    - originalRequest = copy for dirty checking                   │
│    - isSaving = false                                            │
│    - isDirty = false                                             │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. UI UPDATE: Success message + form refresh                    │
└─────────────────────────────────────────────────────────────────┘
```

### SharePoint Calls
| Call # | Purpose | API | Notes |
|--------|---------|-----|-------|
| 1 | Create/Update Request | `add()` or `update()` | Only changed fields |
| 2-3 | Reload Request | 2x `renderListData()` | Full request data |
| 4-N | Upload Documents | N x `addUsingPath()` | One per staged file |
| M | Delete/Rename | M x file operations | If pending operations |
| Final | Reload Documents | `renderListData()` | All documents |

**Total calls:** 4-10+ per save (depending on document operations)

### Code References
- **Save Draft**: `src/stores/requestStore.ts:331` (saveAsDraft)
- **Submit**: `src/stores/requestStore.ts:483` (updateRequest)
- **Service**: `src/services/requestSaveService.ts:686` (saveDraft)
- **Build Payload**: `src/services/requestSaveService.ts:257` (buildRequestUpdatePayload)
- **Document Processing**: `src/stores/requestStore.ts:39` (processDocumentOperationsAfterSave - EXTRACTED HELPER)

---

## Document Upload Sequence

### Overview
Documents are staged for upload, then uploaded when the request is saved. This ensures atomic operations - if the request save fails, documents aren't uploaded.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER ACTION: Adds files via DocumentUpload component         │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. COMPONENT: DocumentUpload.handleFilesAdded()                 │
│    - Validates files (name, size, type)                          │
│    - Creates File objects                                        │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. STORE: documentsStore.stageFiles(files, documentType)        │
│    - Creates IStagedDocument[] with metadata                     │
│    - Assigns unique IDs (staged-{timestamp}-{index})             │
│    - Sets status = 'pending', progress = 0                       │
│    - Adds to state.stagedFiles array                             │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. UI: Shows staged files with "pending" badge                  │
│    - User can review, remove, or rename staged files             │
│    - Files are NOT uploaded yet                                  │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. USER ACTION: Clicks "Save Draft"                             │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. REQUEST SAVE: (See Request Saving Sequence above)            │
│    - Request is saved to SharePoint                              │
│    - ItemId is returned                                          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. DOCUMENT UPLOAD: processDocumentOperationsAfterSave(itemId)  │
│    - documentsStore.uploadPendingFiles(itemId, progressCallback)│
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. FOLDER CREATION: Ensure folder structure exists              │
│    - documentService.ensureFolderExists(library, folderPath)     │
│    - Creates: RequestDocuments/{itemId}/{ApprovalType}/          │
│    - Sequential folder creation (could be optimized)             │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. FILE UPLOAD: For each staged file                            │
│    - folder.files.addUsingPath(filename, file, true)             │
│    - Get list item: file.getItem()                               │
│    - Update metadata: item.update({ DocumentType, RequestId })   │
│    - Progress callback fired: onFileProgress(fileId, %, status)  │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. CLEANUP & RELOAD                                             │
│     - documentsStore.clearPendingOperations()                    │
│     - documentsStore.loadAllDocuments(itemId)                    │
│     - UI shows uploaded files with "Completed" badge             │
└─────────────────────────────────────────────────────────────────┘
```

### Document Type Folder Structure

```
RequestDocuments/
└── {itemId}/                           # Request-specific folder
    ├── {ApprovalFiles}/                # Approval documents
    │   ├── CommunicationsApproval/
    │   ├── PortfolioManagerApproval/
    │   ├── ResearchAnalystApproval/
    │   ├── SubjectMatterExpertApproval/
    │   ├── PerformanceApproval/
    │   └── OtherApproval/
    ├── Review/                         # Attachments (root level)
    └── Supplemental/                   # Supplemental docs (root level)
```

### SharePoint Calls (Per Upload)
| Call # | Purpose | API | Notes |
|--------|---------|-----|-------|
| 1 | Get library root | `lists.getByTitle().rootFolder()` | Once per batch |
| 2-4 | Create folders | `folders.addUsingPath()` | 1-3 calls (depth) |
| 5 | Upload file | `files.addUsingPath()` | Per file |
| 6 | Get list item | `file.getItem()` | Per file |
| 7 | Update metadata | `item.update()` | Per file |
| Final | Reload all docs | `renderListData()` | All documents |

**Total calls per file:** ~5-8 calls

### Code References
- **Staging**: `src/stores/documentsStore.ts:240` (stageFiles)
- **Upload**: `src/stores/documentsStore.ts:409` (uploadPendingFiles)
- **Folder Creation**: `src/services/documentService.ts:122` (ensureFolderExists)
- **File Upload**: `src/services/documentService.ts:318` (batchUploadFiles)
- **Document Reload**: `src/services/documentService.ts:427` (loadDocuments)

---

## SharePoint API Calls Summary

### Request Load (Existing Request)
- **CAML Queries**: 2 (parallel)
- **Approval Files**: 0-6 (sequential)
- **Total**: 2-8 calls
- **Typical Time**: 1-3 seconds

### Request Save (Draft)
- **Create/Update**: 1
- **Reload**: 2 CAML queries
- **Document Upload**: 5-8 per file
- **Document Reload**: 1 CAML query
- **Total**: 4+ (no docs) to 20+ (with 3 documents)
- **Typical Time**: 2-5 seconds (no docs), 5-15 seconds (with docs)

### Document Operations Only
- **Folder Creation**: 1-3
- **Per File Upload**: 3 (upload + getItem + update)
- **Reload**: 1 CAML query
- **Total**: 5-10 per file
- **Typical Time**: 1-2 seconds per file

---

## Performance Considerations

### Current Bottlenecks

1. **Sequential Approval File Loading** (`requestStore.ts:136-166`)
   - Files are loaded one approval type at a time
   - **Improvement**: Use `Promise.all()` to parallelize

2. **Folder Creation is Chatty** (`documentService.ts:122-166`)
   - Creates each folder segment sequentially
   - Always tries to create, relies on error for "already exists"
   - **Improvement**: Check existence first, or use batch API

3. **Always Reloads After Save** (`requestStore.ts:661-663`)
   - Reloads request even if no changes were made
   - **Improvement**: Only reload if `shouldPerformUpdate.shouldUpdate === true`

4. **Document Loading is Inefficient** (`documentService.ts:427-563`)
   - Loads ALL documents recursively with CAML (all types)
   - Returns all fields even if not used
   - **Improvement**: Add `documentType` filter parameter

5. **Hardcoded Delay for Rename** (`documentsStore.ts:664-665`)
   - Waits fixed 1.5 seconds for SharePoint index
   - **Improvement**: Poll for change instead of fixed delay

### Optimization Opportunities

| Optimization | Current | Optimized | Savings |
|--------------|---------|-----------|---------|
| Parallelize approval file loads | 6 sequential calls | 6 parallel calls | ~3-5 seconds |
| Conditional reload after save | Always 2 calls | 0 calls (if no changes) | ~0.5-1 second |
| Batch folder creation | 1-3 sequential | 1 batch call | ~0.2-0.5 seconds |
| Filter document loads | Load all types | Load one type | ~0.3-0.5 seconds |

**Total potential savings per operation:** ~4-7 seconds

### Best Practices Implemented

✅ **Change Detection**: Uses `createSPUpdater()` to only send changed fields
✅ **Parallel CAML Queries**: Request info + reviews loaded in parallel
✅ **Progress Tracking**: Document uploads report progress to UI
✅ **Error Isolation**: Document errors don't fail request save
✅ **Atomic Operations**: Documents only uploaded after request save succeeds

### Recommendations for Future

1. **Implement Retry Logic**: For network failures (marked as TODO in code)
2. **Add Request Caching**: Cache requests in sessionStorage/localStorage
3. **Use OData Batching**: Combine multiple API calls into single batch
4. **Implement Optimistic UI**: Update UI immediately, sync in background
5. **Add Request Deduplication**: Prevent duplicate loads for same itemId

---

## Related Documentation

- **System Architecture**: `docs/design/TDD.md`
- **SharePoint Lists Schema**: `docs/requirements/system-overview.md`
- **Toolkit Usage Guide**: `docs/guides/SPFX-Toolkit-Usage.md`
- **Store Architecture**: `src/stores/README.md` (to be updated)

---

**Last Updated**: Phase 2 Cleanup (February 2025)
**Maintained By**: Development Team
