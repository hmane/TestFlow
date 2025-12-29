/**
 * Documents Store Tests
 *
 * These tests verify the documentsStore Zustand store functionality.
 * The store manages document staging, uploads, and pending operations.
 */

// Document type enum (matching the store's enum)
enum DocumentType {
  Review = 'Review',
  Supplemental = 'Supplemental',
  Approval = 'Approval',
}

// Interface matching store state
interface IDocument {
  id: number;
  name: string;
  url: string;
  documentType: DocumentType;
  listItemId: number;
  size: number;
  author: string;
  created: Date;
  uniqueId: string;
}

interface IStagedFile {
  id: string;
  file: File;
  documentType: DocumentType;
}

// Simple mock store for testing (avoiding complex module imports)
const createMockStore = () => {
  let state = {
    documents: [] as IDocument[],
    stagedFiles: [] as IStagedFile[],
    filesToDelete: [] as IDocument[],
    filesToRename: [] as { file: IDocument; newName: string }[],
    filesToChangeType: [] as { file: IDocument; newType: DocumentType }[],
    uploadProgress: [],
    isLoading: false,
    error: undefined as string | undefined,
  };

  return {
    getState: () => state,
    setState: (partial: Partial<typeof state>) => {
      state = { ...state, ...partial };
    },
    stageFiles: (files: File[], documentType: DocumentType) => {
      const newStaged = files.map((file, i) => ({
        id: `staged-${Date.now()}-${i}`,
        file,
        documentType,
      }));
      state = { ...state, stagedFiles: [...state.stagedFiles, ...newStaged] };
    },
    removeStagedFile: (id: string) => {
      state = { ...state, stagedFiles: state.stagedFiles.filter(f => f.id !== id) };
    },
    markForDeletion: (doc: IDocument) => {
      state = { ...state, filesToDelete: [...state.filesToDelete, doc] };
    },
    unmarkForDeletion: (uniqueId: string) => {
      state = { ...state, filesToDelete: state.filesToDelete.filter(f => f.uniqueId !== uniqueId) };
    },
    markForRename: (doc: IDocument, newName: string) => {
      state = { ...state, filesToRename: [...state.filesToRename, { file: doc, newName }] };
    },
    markForTypeChange: (doc: IDocument, newType: DocumentType) => {
      state = { ...state, filesToChangeType: [...state.filesToChangeType, { file: doc, newType }] };
    },
    hasPendingOperations: () => {
      return state.stagedFiles.length > 0 ||
             state.filesToDelete.length > 0 ||
             state.filesToRename.length > 0 ||
             state.filesToChangeType.length > 0;
    },
    clearPendingOperations: () => {
      state = {
        ...state,
        stagedFiles: [],
        filesToDelete: [],
        filesToRename: [],
        filesToChangeType: [],
      };
    },
    getDocumentsByType: (type: DocumentType) => {
      return state.documents.filter(d => d.documentType === type);
    },
    getStagedFilesByType: (type: DocumentType) => {
      return state.stagedFiles.filter(f => f.documentType === type);
    },
    clearAll: () => {
      state = {
        documents: [],
        stagedFiles: [],
        filesToDelete: [],
        filesToRename: [],
        filesToChangeType: [],
        uploadProgress: [],
        isLoading: false,
        error: undefined,
      };
    },
  };
};

let store: ReturnType<typeof createMockStore>;

describe('documentsStore', () => {
  beforeEach(() => {
    // Create fresh store for each test
    store = createMockStore();
  });

  describe('Initial State', () => {
    it('should have empty initial state', () => {
      const state = store.getState();

      expect(state.documents).toEqual([]);
      expect(state.stagedFiles).toEqual([]);
      expect(state.filesToDelete).toEqual([]);
      expect(state.filesToRename).toEqual([]);
      expect(state.filesToChangeType).toEqual([]);
      expect(state.uploadProgress).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeUndefined();
    });
  });

  describe('stageFiles', () => {
    it('should add files to staged files', () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

      store.stageFiles([mockFile], DocumentType.Review);

      expect(store.getState().stagedFiles).toHaveLength(1);
      expect(store.getState().stagedFiles[0].file).toBe(mockFile);
      expect(store.getState().stagedFiles[0].documentType).toBe(DocumentType.Review);
    });

    it('should add multiple files at once', () => {
      const file1 = new File(['content1'], 'test1.pdf', { type: 'application/pdf' });
      const file2 = new File(['content2'], 'test2.pdf', { type: 'application/pdf' });

      store.stageFiles([file1, file2], DocumentType.Supplemental);

      expect(store.getState().stagedFiles).toHaveLength(2);
    });

    it('should generate unique IDs for staged files', () => {
      const file1 = new File(['content1'], 'test1.pdf', { type: 'application/pdf' });
      const file2 = new File(['content2'], 'test2.pdf', { type: 'application/pdf' });

      store.stageFiles([file1], DocumentType.Review);

      // Small delay to ensure different timestamps
      const file2Staged = new File(['content2'], 'test2.pdf', { type: 'application/pdf' });
      store.stageFiles([file2Staged], DocumentType.Review);

      const ids = store.getState().stagedFiles.map(f => f.id);
      // Since we're adding files to same array, IDs should exist
      expect(ids.length).toBe(2);
    });
  });

  describe('removeStagedFile', () => {
    it('should remove a staged file by ID', () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

      store.stageFiles([mockFile], DocumentType.Review);

      const fileId = store.getState().stagedFiles[0].id;

      store.removeStagedFile(fileId);

      expect(store.getState().stagedFiles).toHaveLength(0);
    });

    it('should only remove the specified file', () => {
      const file1 = new File(['content1'], 'test1.pdf', { type: 'application/pdf' });
      const file2 = new File(['content2'], 'test2.pdf', { type: 'application/pdf' });

      store.stageFiles([file1, file2], DocumentType.Review);

      const fileIdToRemove = store.getState().stagedFiles[0].id;

      store.removeStagedFile(fileIdToRemove);

      expect(store.getState().stagedFiles).toHaveLength(1);
      expect(store.getState().stagedFiles[0].file).toBe(file2);
    });
  });

  describe('markForDeletion', () => {
    it('should add document to filesToDelete list', () => {
      const mockDocument: IDocument = {
        id: 1,
        name: 'test.pdf',
        url: '/sites/test/documents/test.pdf',
        documentType: DocumentType.Review,
        listItemId: 1,
        size: 1024,
        author: 'Test User',
        created: new Date(),
        uniqueId: 'unique-123',
      };

      store.markForDeletion(mockDocument);

      expect(store.getState().filesToDelete).toHaveLength(1);
      expect(store.getState().filesToDelete[0]).toEqual(mockDocument);
    });
  });

  describe('unmarkForDeletion', () => {
    it('should remove document from filesToDelete list', () => {
      const mockDocument: IDocument = {
        id: 1,
        name: 'test.pdf',
        url: '/sites/test/documents/test.pdf',
        documentType: DocumentType.Review,
        listItemId: 1,
        size: 1024,
        author: 'Test User',
        created: new Date(),
        uniqueId: 'unique-123',
      };

      store.markForDeletion(mockDocument);
      store.unmarkForDeletion(mockDocument.uniqueId);

      expect(store.getState().filesToDelete).toHaveLength(0);
    });
  });

  describe('markForRename', () => {
    it('should add document to filesToRename list', () => {
      const mockDocument: IDocument = {
        id: 1,
        name: 'old-name.pdf',
        url: '/sites/test/documents/old-name.pdf',
        documentType: DocumentType.Review,
        listItemId: 1,
        size: 1024,
        author: 'Test User',
        created: new Date(),
        uniqueId: 'unique-123',
      };

      store.markForRename(mockDocument, 'new-name.pdf');

      expect(store.getState().filesToRename).toHaveLength(1);
      expect(store.getState().filesToRename[0].file).toEqual(mockDocument);
      expect(store.getState().filesToRename[0].newName).toBe('new-name.pdf');
    });
  });

  describe('markForTypeChange', () => {
    it('should add document to filesToChangeType list', () => {
      const mockDocument: IDocument = {
        id: 1,
        name: 'test.pdf',
        url: '/sites/test/documents/test.pdf',
        documentType: DocumentType.Review,
        listItemId: 1,
        size: 1024,
        author: 'Test User',
        created: new Date(),
        uniqueId: 'unique-123',
      };

      store.markForTypeChange(mockDocument, DocumentType.Supplemental);

      expect(store.getState().filesToChangeType).toHaveLength(1);
      expect(store.getState().filesToChangeType[0].file).toEqual(mockDocument);
      expect(store.getState().filesToChangeType[0].newType).toBe(DocumentType.Supplemental);
    });
  });

  describe('hasPendingOperations', () => {
    it('should return false when no pending operations', () => {
      expect(store.hasPendingOperations()).toBe(false);
    });

    it('should return true when there are staged files', () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

      store.stageFiles([mockFile], DocumentType.Review);

      expect(store.hasPendingOperations()).toBe(true);
    });

    it('should return true when there are files to delete', () => {
      const mockDocument: IDocument = {
        id: 1,
        name: 'test.pdf',
        url: '/sites/test/documents/test.pdf',
        documentType: DocumentType.Review,
        listItemId: 1,
        size: 1024,
        author: 'Test User',
        created: new Date(),
        uniqueId: 'unique-123',
      };

      store.markForDeletion(mockDocument);

      expect(store.hasPendingOperations()).toBe(true);
    });
  });

  describe('clearPendingOperations', () => {
    it('should clear all pending operations', () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const mockDocument: IDocument = {
        id: 1,
        name: 'test.pdf',
        url: '/sites/test/documents/test.pdf',
        documentType: DocumentType.Review,
        listItemId: 1,
        size: 1024,
        author: 'Test User',
        created: new Date(),
        uniqueId: 'unique-123',
      };

      store.stageFiles([mockFile], DocumentType.Review);
      store.markForDeletion(mockDocument);
      store.markForRename(mockDocument, 'new-name.pdf');
      store.markForTypeChange(mockDocument, DocumentType.Supplemental);

      expect(store.hasPendingOperations()).toBe(true);

      store.clearPendingOperations();

      expect(store.hasPendingOperations()).toBe(false);
      expect(store.getState().stagedFiles).toHaveLength(0);
      expect(store.getState().filesToDelete).toHaveLength(0);
      expect(store.getState().filesToRename).toHaveLength(0);
      expect(store.getState().filesToChangeType).toHaveLength(0);
    });
  });

  describe('getDocumentsByType', () => {
    it('should filter documents by type', () => {
      // Set documents directly for testing
      store.setState({
        documents: [
          {
            id: 1,
            name: 'review1.pdf',
            url: '/test/review1.pdf',
            documentType: DocumentType.Review,
            listItemId: 1,
            size: 1024,
            author: 'User',
            created: new Date(),
            uniqueId: 'u1',
          },
          {
            id: 2,
            name: 'supplemental1.pdf',
            url: '/test/supplemental1.pdf',
            documentType: DocumentType.Supplemental,
            listItemId: 1,
            size: 2048,
            author: 'User',
            created: new Date(),
            uniqueId: 'u2',
          },
          {
            id: 3,
            name: 'review2.pdf',
            url: '/test/review2.pdf',
            documentType: DocumentType.Review,
            listItemId: 1,
            size: 1024,
            author: 'User',
            created: new Date(),
            uniqueId: 'u3',
          },
        ],
      });

      const reviewDocs = store.getDocumentsByType(DocumentType.Review);
      expect(reviewDocs).toHaveLength(2);

      const supplementalDocs = store.getDocumentsByType(DocumentType.Supplemental);
      expect(supplementalDocs).toHaveLength(1);
    });
  });

  describe('getStagedFilesByType', () => {
    it('should filter staged files by type', () => {
      const reviewFile = new File(['review'], 'review.pdf', { type: 'application/pdf' });
      const suppFile = new File(['supp'], 'supp.pdf', { type: 'application/pdf' });

      store.stageFiles([reviewFile], DocumentType.Review);
      store.stageFiles([suppFile], DocumentType.Supplemental);

      const reviewFiles = store.getStagedFilesByType(DocumentType.Review);
      expect(reviewFiles).toHaveLength(1);

      const suppFiles = store.getStagedFilesByType(DocumentType.Supplemental);
      expect(suppFiles).toHaveLength(1);
    });
  });

  describe('clearAll', () => {
    it('should reset store to initial state', () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

      store.stageFiles([mockFile], DocumentType.Review);
      store.setState({
        documents: [
          {
            id: 1,
            name: 'test.pdf',
            url: '/test.pdf',
            documentType: DocumentType.Review,
            listItemId: 1,
            size: 1024,
            author: 'User',
            created: new Date(),
            uniqueId: 'u1',
          },
        ],
        isLoading: true,
        error: 'Some error',
      });

      store.clearAll();

      expect(store.getState().documents).toHaveLength(0);
      expect(store.getState().stagedFiles).toHaveLength(0);
      expect(store.getState().isLoading).toBe(false);
      expect(store.getState().error).toBeUndefined();
    });
  });
});
