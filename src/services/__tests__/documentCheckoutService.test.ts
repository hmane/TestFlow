/**
 * Document Checkout Service Tests
 *
 * Covers:
 * - Config helpers (isDocumentCheckoutEnabled, isAutoCheckoutOnReplaceEnabled, isCheckoutRequiredForTransition)
 * - File type helpers (isOfficeFile, supportsReviewTracking)
 * - Stale level and duration formatting (getStaleReviewLevel, formatCheckoutDuration)
 * - Single document status (getDocumentCheckoutStatus)
 * - Request-level aggregation (getRequestCheckoutStatus)
 * - Operations: startReviewing, doneReviewing, stopReviewing
 * - Toggle-off graceful recovery (done/stop allowed when disabled; start blocked)
 * - Bulk operations (doneReviewingAll, forceDoneReviewingAll)
 * - Pre-transition validation (validateCheckoutForTransition)
 */

import type { IDocument } from '@stores/documentsStore';
import { DocumentType } from '@appTypes/documentTypes';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCheckout = jest.fn();
const mockCheckin = jest.fn();
const mockUndoCheckout = jest.fn();
const mockGetFileByServerRelativePath = jest.fn().mockReturnValue({
  checkout: mockCheckout,
  checkin: mockCheckin,
  undoCheckout: mockUndoCheckout,
});

jest.mock('spfx-toolkit/lib/utilities/context', () => ({
  SPContext: {
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      success: jest.fn(),
    },
    currentUser: {
      id: 1,
      email: 'user@example.com',
      title: 'Current User',
      loginName: 'i:0#.f|membership|user@example.com',
    },
    sp: {
      web: {
        getFileByServerRelativePath: mockGetFileByServerRelativePath,
      },
    },
  },
}));

jest.mock('spfx-toolkit/lib/utilities/context/pnpImports/files', () => ({}));

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// Config store mock — controlled via mockConfigStore helpers below
const mockGetConfigBoolean = jest.fn();
const mockIsLoaded = { value: true };

jest.mock('@stores/configStore', () => ({
  useConfigStore: {
    getState: () => ({
      isLoaded: mockIsLoaded.value,
      getConfigBoolean: mockGetConfigBoolean,
    }),
  },
}));

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

function setConfigFlags(opts: {
  isLoaded?: boolean;
  enableDocumentCheckout?: boolean;
  autoCheckoutOnReplace?: boolean;
  checkoutRequiredForTransition?: boolean;
}): void {
  mockIsLoaded.value = opts.isLoaded ?? true;
  mockGetConfigBoolean.mockImplementation((key: string, defaultValue: boolean) => {
    if (key === 'EnableDocumentCheckout') return opts.enableDocumentCheckout ?? false;
    if (key === 'AutoCheckoutOnReplace') return opts.autoCheckoutOnReplace ?? true;
    if (key === 'CheckoutRequiredForTransition') return opts.checkoutRequiredForTransition ?? true;
    return defaultValue;
  });
}

// ---------------------------------------------------------------------------
// Document factory
// ---------------------------------------------------------------------------

function makeDoc(overrides: Partial<IDocument> = {}): IDocument {
  return {
    name: 'document.pdf',
    url: 'https://tenant.sharepoint.com/sites/lrs/Shared Documents/document.pdf',
    size: 1024,
    timeCreated: '2024-01-01T00:00:00Z',
    uniqueId: 'doc-001',
    documentType: DocumentType.Legal,
    checkOutType: 0,
    ...overrides,
  };
}

function makeCheckedOutDoc(overrides: Partial<IDocument> = {}): IDocument {
  return makeDoc({
    checkOutType: 1,
    checkedOutById: '1',
    checkedOutByEmail: 'user@example.com',
    checkedOutByLoginName: 'i:0#.f|membership|user@example.com',
    checkedOutByName: 'Current User',
    checkedOutDate: new Date().toISOString(),
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Imports (after mocks are set up)
// ---------------------------------------------------------------------------

import {
  isDocumentCheckoutEnabled,
  isAutoCheckoutOnReplaceEnabled,
  isCheckoutRequiredForTransition,
  isOfficeFile,
  supportsReviewTracking,
  getStaleReviewLevel,
  formatCheckoutDuration,
  getDocumentCheckoutStatus,
  getRequestCheckoutStatus,
  startReviewing,
  doneReviewing,
  stopReviewing,
  doneReviewingAll,
  forceDoneReviewingAll,
  validateCheckoutForTransition,
} from '@services/documentCheckoutService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

function daysAgo(d: number): string {
  return hoursAgo(d * 24);
}

// ---------------------------------------------------------------------------
// CONFIG HELPERS
// ---------------------------------------------------------------------------

describe('isDocumentCheckoutEnabled', () => {
  it('returns false when store not loaded', () => {
    setConfigFlags({ isLoaded: false });
    expect(isDocumentCheckoutEnabled()).toBe(false);
  });

  it('returns false when flag is false', () => {
    setConfigFlags({ enableDocumentCheckout: false });
    expect(isDocumentCheckoutEnabled()).toBe(false);
  });

  it('returns true when flag is true', () => {
    setConfigFlags({ enableDocumentCheckout: true });
    expect(isDocumentCheckoutEnabled()).toBe(true);
  });
});

describe('isAutoCheckoutOnReplaceEnabled', () => {
  it('returns false when master switch is off', () => {
    setConfigFlags({ enableDocumentCheckout: false, autoCheckoutOnReplace: true });
    expect(isAutoCheckoutOnReplaceEnabled()).toBe(false);
  });

  it('returns false when master switch on but sub-flag off', () => {
    setConfigFlags({ enableDocumentCheckout: true, autoCheckoutOnReplace: false });
    expect(isAutoCheckoutOnReplaceEnabled()).toBe(false);
  });

  it('returns true when both flags on', () => {
    setConfigFlags({ enableDocumentCheckout: true, autoCheckoutOnReplace: true });
    expect(isAutoCheckoutOnReplaceEnabled()).toBe(true);
  });
});

describe('isCheckoutRequiredForTransition', () => {
  it('returns false when master switch is off', () => {
    setConfigFlags({ enableDocumentCheckout: false, checkoutRequiredForTransition: true });
    expect(isCheckoutRequiredForTransition()).toBe(false);
  });

  it('returns false when master switch on but sub-flag off', () => {
    setConfigFlags({ enableDocumentCheckout: true, checkoutRequiredForTransition: false });
    expect(isCheckoutRequiredForTransition()).toBe(false);
  });

  it('returns true when both flags on', () => {
    setConfigFlags({ enableDocumentCheckout: true, checkoutRequiredForTransition: true });
    expect(isCheckoutRequiredForTransition()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// FILE TYPE HELPERS
// ---------------------------------------------------------------------------

describe('isOfficeFile', () => {
  it.each([
    ['report.doc', true],
    ['report.docx', true],
    ['data.xls', true],
    ['data.xlsx', true],
    ['deck.ppt', true],
    ['deck.pptx', true],
  ])('returns true for Office file: %s', (name, expected) => {
    expect(isOfficeFile(name)).toBe(expected);
  });

  it.each([
    ['brief.pdf', false],
    ['image.png', false],
    ['archive.zip', false],
    ['noextension', false],
  ])('returns false for non-Office file: %s', (name, expected) => {
    expect(isOfficeFile(name)).toBe(expected);
  });

  it('is case-insensitive for known extensions', () => {
    expect(isOfficeFile('Report.DOCX')).toBe(true);
    expect(isOfficeFile('Deck.PPT')).toBe(true);
  });
});

describe('supportsReviewTracking', () => {
  it('returns false for Office files', () => {
    expect(supportsReviewTracking('report.docx')).toBe(false);
  });

  it('returns true for PDF files', () => {
    expect(supportsReviewTracking('brief.pdf')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// STALE REVIEW HELPERS
// ---------------------------------------------------------------------------

describe('getStaleReviewLevel', () => {
  it('returns "normal" for no date', () => {
    expect(getStaleReviewLevel(undefined)).toBe('normal');
  });

  it('returns "normal" for invalid date string', () => {
    expect(getStaleReviewLevel('not-a-date')).toBe('normal');
  });

  it('returns "normal" for checkout under 4 hours ago', () => {
    expect(getStaleReviewLevel(hoursAgo(2))).toBe('normal');
  });

  it('returns "amber" for checkout 4–24 hours ago', () => {
    expect(getStaleReviewLevel(hoursAgo(5))).toBe('amber');
    expect(getStaleReviewLevel(hoursAgo(23))).toBe('amber');
  });

  it('returns "warning" for checkout 1–3 days ago', () => {
    expect(getStaleReviewLevel(daysAgo(1))).toBe('warning');
    expect(getStaleReviewLevel(daysAgo(2))).toBe('warning');
  });

  it('returns "critical" for checkout 3+ days ago', () => {
    expect(getStaleReviewLevel(daysAgo(3))).toBe('critical');
    expect(getStaleReviewLevel(daysAgo(10))).toBe('critical');
  });
});

describe('formatCheckoutDuration', () => {
  it('returns empty string for no date', () => {
    expect(formatCheckoutDuration(undefined)).toBe('');
  });

  it('returns empty string for invalid date', () => {
    expect(formatCheckoutDuration('bad')).toBe('');
  });

  it('returns "Just now" for very recent checkout', () => {
    const result = formatCheckoutDuration(new Date().toISOString());
    expect(result).toBe('Just now');
  });

  it('returns minutes for checkout under 1 hour', () => {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    expect(formatCheckoutDuration(thirtyMinsAgo)).toBe('30 minutes ago');
  });

  it('returns singular "minute" for exactly 1 minute', () => {
    const oneMinAgo = new Date(Date.now() - 61 * 1000).toISOString();
    expect(formatCheckoutDuration(oneMinAgo)).toBe('1 minute ago');
  });

  it('returns hours for checkout 1–23 hours ago', () => {
    expect(formatCheckoutDuration(hoursAgo(3))).toBe('3 hours ago');
  });

  it('returns singular "hour" for exactly 1 hour', () => {
    expect(formatCheckoutDuration(hoursAgo(1))).toBe('1 hour ago');
  });

  it('returns days for checkout over 24 hours ago', () => {
    expect(formatCheckoutDuration(daysAgo(2))).toBe('2 days ago');
  });

  it('returns singular "day" for exactly 1 day', () => {
    expect(formatCheckoutDuration(daysAgo(1))).toBe('1 day ago');
  });
});

// ---------------------------------------------------------------------------
// SINGLE DOCUMENT CHECKOUT STATUS
// ---------------------------------------------------------------------------

describe('getDocumentCheckoutStatus', () => {
  beforeEach(() => {
    // Ensure SPContext.currentUser is consistent
    const { SPContext } = require('spfx-toolkit/lib/utilities/context');
    SPContext.currentUser = {
      id: 1,
      email: 'user@example.com',
      title: 'Current User',
    };
  });

  it('returns isCheckedOut=false for unchecked document', () => {
    const doc = makeDoc({ checkOutType: 0 });
    const status = getDocumentCheckoutStatus(doc);
    expect(status.isCheckedOut).toBe(false);
    expect(status.isCheckedOutByMe).toBe(false);
    expect(status.staleLevel).toBe('normal');
  });

  it('identifies checkout by current user via email match', () => {
    const doc = makeCheckedOutDoc({ checkedOutById: '', checkedOutByEmail: 'user@example.com' });
    const status = getDocumentCheckoutStatus(doc);
    expect(status.isCheckedOut).toBe(true);
    expect(status.isCheckedOutByMe).toBe(true);
  });

  it('identifies checkout by current user via id match', () => {
    const doc = makeCheckedOutDoc({ checkedOutById: '1', checkedOutByEmail: '' });
    const status = getDocumentCheckoutStatus(doc);
    expect(status.isCheckedOutByMe).toBe(true);
  });

  it('identifies checkout by current user via name fallback when no email', () => {
    const doc = makeCheckedOutDoc({ checkedOutByEmail: '', checkedOutByName: 'Current User' });
    const status = getDocumentCheckoutStatus(doc);
    expect(status.isCheckedOutByMe).toBe(true);
  });

  it('identifies checkout by current user via login name fallback', () => {
    const doc = makeCheckedOutDoc({
      checkedOutByEmail: '',
      checkedOutByName: '',
      checkedOutByLoginName: 'i:0#.f|membership|user@example.com',
    });
    const status = getDocumentCheckoutStatus(doc);
    expect(status.isCheckedOutByMe).toBe(true);
  });

  it('does not match by name when email is present but different', () => {
    const doc = makeCheckedOutDoc({
      checkedOutById: '2',
      checkedOutByEmail: 'other@example.com',
      checkedOutByName: 'Current User',
    });
    const status = getDocumentCheckoutStatus(doc);
    expect(status.isCheckedOutByMe).toBe(false);
  });

  it('identifies checkout by another user', () => {
    const doc = makeCheckedOutDoc({
      checkedOutById: '2',
      checkedOutByEmail: 'other@example.com',
      checkedOutByName: 'Other User',
    });
    const status = getDocumentCheckoutStatus(doc);
    expect(status.isCheckedOut).toBe(true);
    expect(status.isCheckedOutByMe).toBe(false);
  });

  it('is case-insensitive for email comparison', () => {
    const doc = makeCheckedOutDoc({ checkedOutByEmail: 'USER@EXAMPLE.COM' });
    const status = getDocumentCheckoutStatus(doc);
    expect(status.isCheckedOutByMe).toBe(true);
  });

  it('returns stale level for checked-out document', () => {
    const doc = makeCheckedOutDoc({ checkedOutDate: daysAgo(4) });
    const status = getDocumentCheckoutStatus(doc);
    expect(status.staleLevel).toBe('critical');
  });

  it('passes through checkedOutByName, checkedOutByEmail, checkedOutDate', () => {
    const date = hoursAgo(2);
    const doc = makeCheckedOutDoc({
      checkedOutByName: 'John Doe',
      checkedOutByEmail: 'john@example.com',
      checkedOutDate: date,
    });
    const status = getDocumentCheckoutStatus(doc);
    expect(status.checkedOutByName).toBe('John Doe');
    expect(status.checkedOutByEmail).toBe('john@example.com');
    expect(status.checkedOutDate).toBe(date);
  });
});

// ---------------------------------------------------------------------------
// REQUEST-LEVEL AGGREGATION
// ---------------------------------------------------------------------------

describe('getRequestCheckoutStatus', () => {
  beforeEach(() => {
    const { SPContext } = require('spfx-toolkit/lib/utilities/context');
    SPContext.currentUser = { id: 1, email: 'user@example.com', title: 'Current User' };
  });

  it('returns empty result for no documents', () => {
    const result = getRequestCheckoutStatus([]);
    expect(result.hasActiveCheckouts).toBe(false);
    expect(result.currentUserHasCheckouts).toBe(false);
    expect(result.checkedOutByCurrentUser).toHaveLength(0);
    expect(result.checkedOutByOthers).toHaveLength(0);
  });

  it('ignores Office files', () => {
    const officeDoc = makeCheckedOutDoc({ name: 'report.docx', checkedOutByEmail: 'user@example.com' });
    const result = getRequestCheckoutStatus([officeDoc]);
    expect(result.hasActiveCheckouts).toBe(false);
  });

  it('ignores unchecked-out files', () => {
    const doc = makeDoc({ checkOutType: 0 });
    const result = getRequestCheckoutStatus([doc]);
    expect(result.hasActiveCheckouts).toBe(false);
  });

  it('groups current user checkouts correctly', () => {
    const myDoc = makeCheckedOutDoc({ name: 'brief.pdf', checkedOutByEmail: 'user@example.com' });
    const result = getRequestCheckoutStatus([myDoc]);
    expect(result.checkedOutByCurrentUser).toHaveLength(1);
    expect(result.checkedOutByOthers).toHaveLength(0);
    expect(result.hasActiveCheckouts).toBe(true);
    expect(result.currentUserHasCheckouts).toBe(true);
  });

  it('groups other user checkouts correctly', () => {
    const otherDoc = makeCheckedOutDoc({
      name: 'other.pdf',
      checkedOutById: '2',
      checkedOutByEmail: 'other@example.com',
      checkedOutByName: 'Other User',
    });
    const result = getRequestCheckoutStatus([otherDoc]);
    expect(result.checkedOutByCurrentUser).toHaveLength(0);
    expect(result.checkedOutByOthers).toHaveLength(1);
    expect(result.hasActiveCheckouts).toBe(true);
    expect(result.currentUserHasCheckouts).toBe(false);
  });

  it('handles mixed scenario: my file + others file + office file + unchecked', () => {
    const docs = [
      makeCheckedOutDoc({ name: 'my.pdf', checkedOutByEmail: 'user@example.com' }),
      makeCheckedOutDoc({
        name: 'theirs.pdf',
        checkedOutById: '2',
        checkedOutByEmail: 'other@example.com',
        checkedOutByName: 'Other User',
      }),
      makeCheckedOutDoc({
        name: 'report.docx',
        checkedOutById: '2',
        checkedOutByEmail: 'other@example.com',
        checkedOutByName: 'Other User',
      }), // Office — skipped
      makeDoc({ name: 'clean.pdf', checkOutType: 0 }), // not checked out
    ];
    const result = getRequestCheckoutStatus(docs);
    expect(result.checkedOutByCurrentUser).toHaveLength(1);
    expect(result.checkedOutByOthers).toHaveLength(1);
    expect(result.hasActiveCheckouts).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CHECKOUT OPERATIONS
// ---------------------------------------------------------------------------

describe('startReviewing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorageMock.clear();
    setConfigFlags({ enableDocumentCheckout: true });
    mockCheckout.mockResolvedValue(undefined);
  });

  it('calls SP checkout and returns success', async () => {
    const doc = makeDoc({ url: 'https://tenant.sharepoint.com/sites/lrs/Docs/file.pdf' });
    const result = await startReviewing(doc);
    expect(result.success).toBe(true);
    expect(result.fileName).toBe('document.pdf');
    expect(mockGetFileByServerRelativePath).toHaveBeenCalledWith('/sites/lrs/Docs/file.pdf');
    expect(mockCheckout).toHaveBeenCalled();
    expect(sessionStorageMock.setItem).toHaveBeenCalled();
  });

  it('returns failure when feature is disabled', async () => {
    setConfigFlags({ enableDocumentCheckout: false });
    const doc = makeDoc();
    const result = await startReviewing(doc);
    expect(result.success).toBe(false);
    expect(result.error).toContain('disabled');
    expect(mockCheckout).not.toHaveBeenCalled();
  });

  it('returns failure for Office files', async () => {
    const doc = makeDoc({ name: 'report.docx' });
    const result = await startReviewing(doc);
    expect(result.success).toBe(false);
    expect(result.error).toContain('does not use document review tracking');
  });

  it('returns failure when document URL is missing', async () => {
    const doc = makeDoc({ url: '' });
    const result = await startReviewing(doc);
    expect(result.success).toBe(false);
    expect(result.error).toContain('URL is missing');
  });

  it('returns failure when SP throws', async () => {
    mockCheckout.mockRejectedValue(new Error('SP access denied'));
    const doc = makeDoc();
    const result = await startReviewing(doc);
    expect(result.success).toBe(false);
    expect(result.error).toContain('SP access denied');
  });

  it('treats already checked out by current user as success', async () => {
    mockCheckout.mockRejectedValue(
      new Error(
        'Error making HttpClient request in queryable [423] ::> {"odata.error":{"code":"-2130575306, Microsoft.SharePoint.SPFileCheckOutException","message":{"lang":"en-US","value":"The file is checked out for editing by i:0#.f|membership|user@example.com."}}}'
      )
    );
    const doc = makeDoc();
    const result = await startReviewing(doc);
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(sessionStorageMock.setItem).toHaveBeenCalled();
  });

  it('handles already-relative URL (starts with /)', async () => {
    const doc = makeDoc({ url: '/sites/lrs/Docs/file.pdf' });
    const result = await startReviewing(doc);
    expect(result.success).toBe(true);
    expect(mockGetFileByServerRelativePath).toHaveBeenCalledWith('/sites/lrs/Docs/file.pdf');
  });
});

describe('doneReviewing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorageMock.clear();
    setConfigFlags({ enableDocumentCheckout: true });
    mockCheckin.mockResolvedValue(undefined);
  });

  it('calls SP checkin with major version and returns success', async () => {
    const doc = makeDoc();
    const result = await doneReviewing(doc);
    expect(result.success).toBe(true);
    expect(mockCheckin).toHaveBeenCalledWith('Review complete', 1);
    expect(sessionStorageMock.removeItem).toHaveBeenCalled();
  });

  it('uses custom comment when provided', async () => {
    const doc = makeDoc();
    await doneReviewing(doc, 'Final review done');
    expect(mockCheckin).toHaveBeenCalledWith('Final review done', 1);
  });

  it('succeeds even when feature is disabled (graceful recovery)', async () => {
    setConfigFlags({ enableDocumentCheckout: false });
    const doc = makeDoc();
    const result = await doneReviewing(doc);
    // done/stop bypass the feature flag — users must be able to release locks
    expect(result.success).toBe(true);
    expect(mockCheckin).toHaveBeenCalled();
  });

  it('returns failure for Office files', async () => {
    const doc = makeDoc({ name: 'slides.pptx' });
    const result = await doneReviewing(doc);
    expect(result.success).toBe(false);
  });

  it('returns failure when SP throws', async () => {
    mockCheckin.mockRejectedValue(new Error('Checkin failed'));
    const doc = makeDoc();
    const result = await doneReviewing(doc);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Checkin failed');
  });
});

describe('stopReviewing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorageMock.clear();
    setConfigFlags({ enableDocumentCheckout: true });
    mockUndoCheckout.mockResolvedValue(undefined);
  });

  it('calls SP undoCheckout and returns success', async () => {
    const doc = makeDoc();
    const result = await stopReviewing(doc);
    expect(result.success).toBe(true);
    expect(mockUndoCheckout).toHaveBeenCalled();
    expect(sessionStorageMock.removeItem).toHaveBeenCalled();
  });

  it('succeeds even when feature is disabled (graceful recovery)', async () => {
    setConfigFlags({ enableDocumentCheckout: false });
    const doc = makeDoc();
    const result = await stopReviewing(doc);
    // stop must always work so users can release stranded locks
    expect(result.success).toBe(true);
  });

  it('returns failure for Office files', async () => {
    const doc = makeDoc({ name: 'data.xlsx' });
    const result = await stopReviewing(doc);
    expect(result.success).toBe(false);
  });

  it('returns failure when SP throws', async () => {
    mockUndoCheckout.mockRejectedValue(new Error('UndoCheckout error'));
    const doc = makeDoc();
    const result = await stopReviewing(doc);
    expect(result.success).toBe(false);
    expect(result.error).toContain('UndoCheckout error');
  });
});

// ---------------------------------------------------------------------------
// BULK OPERATIONS
// ---------------------------------------------------------------------------

describe('doneReviewingAll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setConfigFlags({ enableDocumentCheckout: true });
    const { SPContext } = require('spfx-toolkit/lib/utilities/context');
    SPContext.currentUser = { id: 1, email: 'user@example.com', title: 'Current User' };
    mockCheckin.mockResolvedValue(undefined);
  });

  it('returns empty array when no documents checked out by current user', async () => {
    const docs = [makeDoc()]; // not checked out
    const results = await doneReviewingAll(docs);
    expect(results).toHaveLength(0);
  });

  it('checks in only documents belonging to current user', async () => {
    const myDoc = makeCheckedOutDoc({ name: 'mine.pdf', checkedOutByEmail: 'user@example.com' });
    const otherDoc = makeCheckedOutDoc({
      name: 'other.pdf',
      checkedOutById: '2',
      checkedOutByEmail: 'other@example.com',
      checkedOutByName: 'Other User',
    });
    const results = await doneReviewingAll([myDoc, otherDoc]);
    expect(results).toHaveLength(1);
    expect(results[0].fileName).toBe('mine.pdf');
    expect(results[0].success).toBe(true);
  });

  it('skips Office files', async () => {
    const officeDoc = makeCheckedOutDoc({ name: 'report.docx', checkedOutByEmail: 'user@example.com' });
    const results = await doneReviewingAll([officeDoc]);
    expect(results).toHaveLength(0);
  });

  it('continues processing after a failure and reports which failed', async () => {
    const doc1 = makeCheckedOutDoc({ name: 'doc1.pdf', url: 'https://tenant.sharepoint.com/sites/lrs/Docs/doc1.pdf', checkedOutByEmail: 'user@example.com' });
    const doc2 = makeCheckedOutDoc({ name: 'doc2.pdf', url: 'https://tenant.sharepoint.com/sites/lrs/Docs/doc2.pdf', checkedOutByEmail: 'user@example.com' });

    mockCheckin
      .mockRejectedValueOnce(new Error('SP error'))
      .mockResolvedValueOnce(undefined);

    const results = await doneReviewingAll([doc1, doc2]);
    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(false);
    expect(results[1].success).toBe(true);
  });
});

describe('forceDoneReviewingAll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setConfigFlags({ enableDocumentCheckout: true });
    const { SPContext } = require('spfx-toolkit/lib/utilities/context');
    SPContext.currentUser = { id: 1, email: 'admin@example.com', title: 'Admin' };
    mockUndoCheckout.mockResolvedValue(undefined);
  });

  it('returns empty array when no non-Office files checked out', async () => {
    const docs = [
      makeDoc({ checkOutType: 0 }),
      makeCheckedOutDoc({ name: 'report.docx' }),
    ];
    const results = await forceDoneReviewingAll(docs);
    expect(results).toHaveLength(0);
  });

  it('releases all non-Office checked-out files regardless of owner', async () => {
    const docs = [
      makeCheckedOutDoc({ name: 'user1.pdf', checkedOutByEmail: 'user1@example.com' }),
      makeCheckedOutDoc({ name: 'user2.pdf', checkedOutByEmail: 'user2@example.com' }),
      makeCheckedOutDoc({ name: 'office.docx', checkedOutByEmail: 'user3@example.com' }), // skipped
    ];
    const results = await forceDoneReviewingAll(docs);
    expect(results).toHaveLength(2);
    expect(results.every(r => r.success)).toBe(true);
    expect(mockUndoCheckout).toHaveBeenCalledTimes(2);
  });

  it('reports failure for individual files without stopping', async () => {
    mockUndoCheckout
      .mockRejectedValueOnce(new Error('Permission denied'))
      .mockResolvedValueOnce(undefined);

    const docs = [
      makeCheckedOutDoc({ name: 'file1.pdf', url: 'https://tenant.sharepoint.com/sites/lrs/Docs/file1.pdf', checkedOutByEmail: 'a@example.com' }),
      makeCheckedOutDoc({ name: 'file2.pdf', url: 'https://tenant.sharepoint.com/sites/lrs/Docs/file2.pdf', checkedOutByEmail: 'b@example.com' }),
    ];
    const results = await forceDoneReviewingAll(docs);
    expect(results[0].success).toBe(false);
    expect(results[1].success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PRE-TRANSITION VALIDATION
// ---------------------------------------------------------------------------

describe('validateCheckoutForTransition', () => {
  beforeEach(() => {
    const { SPContext } = require('spfx-toolkit/lib/utilities/context');
    SPContext.currentUser = { id: 1, email: 'user@example.com', title: 'Current User' };
  });

  describe('when CheckoutRequiredForTransition is false', () => {
    beforeEach(() => setConfigFlags({ enableDocumentCheckout: true, checkoutRequiredForTransition: false }));

    it('always returns canProceed=true regardless of checkouts', () => {
      const docs = [makeCheckedOutDoc({ checkedOutByEmail: 'user@example.com' })];
      const result = validateCheckoutForTransition(docs, false);
      expect(result.canProceed).toBe(true);
      expect(result.currentUserBlocked).toBe(false);
      expect(result.othersHaveCheckouts).toBe(false);
    });
  });

  describe('mid-workflow transition (isFinalTransition=false)', () => {
    beforeEach(() => setConfigFlags({ enableDocumentCheckout: true, checkoutRequiredForTransition: true }));

    it('canProceed=true when no checkouts', () => {
      const result = validateCheckoutForTransition([], false);
      expect(result.canProceed).toBe(true);
      expect(result.currentUserBlocked).toBe(false);
    });

    it('canProceed=false when current user has checkouts', () => {
      const docs = [makeCheckedOutDoc({ checkedOutByEmail: 'user@example.com' })];
      const result = validateCheckoutForTransition(docs, false);
      expect(result.canProceed).toBe(false);
      expect(result.currentUserBlocked).toBe(true);
      expect(result.myFiles).toHaveLength(1);
    });

    it('canProceed=true (info-only) when only others have checkouts', () => {
      const docs = [makeCheckedOutDoc({
        checkedOutById: '2',
        checkedOutByEmail: 'other@example.com',
        checkedOutByName: 'Other User',
      })];
      const result = validateCheckoutForTransition(docs, false);
      // Mid-workflow: others' checkouts are informational only — current user can proceed
      expect(result.canProceed).toBe(true);
      expect(result.currentUserBlocked).toBe(false);
      expect(result.othersHaveCheckouts).toBe(true);
      expect(result.othersFiles).toHaveLength(1);
    });
  });

  describe('final transition (isFinalTransition=true)', () => {
    beforeEach(() => setConfigFlags({ enableDocumentCheckout: true, checkoutRequiredForTransition: true }));

    it('canProceed=true when no checkouts', () => {
      const result = validateCheckoutForTransition([], true);
      expect(result.canProceed).toBe(true);
    });

    it('canProceed=false when current user has checkouts', () => {
      const docs = [makeCheckedOutDoc({ checkedOutByEmail: 'user@example.com' })];
      const result = validateCheckoutForTransition(docs, true);
      expect(result.canProceed).toBe(false);
    });

    it('canProceed=false when others have checkouts (final requires all clear)', () => {
      const docs = [makeCheckedOutDoc({
        checkedOutById: '2',
        checkedOutByEmail: 'other@example.com',
        checkedOutByName: 'Other User',
      })];
      const result = validateCheckoutForTransition(docs, true);
      // Final: ANY active checkout blocks the transition
      expect(result.canProceed).toBe(false);
      expect(result.othersHaveCheckouts).toBe(true);
    });

    it('isFinalTransition flag is passed through', () => {
      const result = validateCheckoutForTransition([], true);
      expect(result.isFinalTransition).toBe(true);
    });
  });

  it('ignores Office files when computing blocking status', () => {
    setConfigFlags({ enableDocumentCheckout: true, checkoutRequiredForTransition: true });
    const officeDoc = makeCheckedOutDoc({ name: 'report.docx', checkedOutByEmail: 'user@example.com' });
    const result = validateCheckoutForTransition([officeDoc], true);
    // Office file is excluded — no blocking
    expect(result.canProceed).toBe(true);
    expect(result.currentUserBlocked).toBe(false);
  });
});
