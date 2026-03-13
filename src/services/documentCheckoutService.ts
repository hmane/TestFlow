/**
 * Document Checkout Service
 *
 * Handles document review tracking using SharePoint's native checkout/checkin.
 * Provides checkout (start reviewing), checkin (done reviewing), and undo
 * (stop reviewing) operations for non-Office files.
 *
 * All operations use SPContext.sp for SharePoint REST API calls.
 * Feature is gated by EnableDocumentCheckout config key.
 *
 * @module services/documentCheckoutService
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import 'spfx-toolkit/lib/utilities/context/pnpImports/files';

import { useConfigStore } from '@stores/configStore';
import { ConfigKeys } from '@sp/ConfigKeys';
import type { IDocument } from '@stores/documentsStore';

// ============================================
// CONSTANTS
// ============================================

/**
 * Office file extensions that support co-authoring.
 * These are excluded from review tracking.
 */
const OFFICE_EXTENSIONS = new Set([
  '.doc', '.docx',
  '.xls', '.xlsx',
  '.ppt', '.pptx',
]);

/**
 * Stale review thresholds in milliseconds
 */
const STALE_THRESHOLDS = {
  AMBER: 4 * 60 * 60 * 1000,      // 4 hours
  WARNING: 24 * 60 * 60 * 1000,    // 1 day
  CRITICAL: 3 * 24 * 60 * 60 * 1000, // 3 days
};

// ============================================
// TYPES
// ============================================

/**
 * Stale review severity level
 */
export type StaleReviewLevel = 'normal' | 'amber' | 'warning' | 'critical';

/**
 * Checkout status for a single document
 */
export interface IDocumentCheckoutStatus {
  /** Document reference */
  document: IDocument;
  /** Whether the file is checked out */
  isCheckedOut: boolean;
  /** Whether the current user has it checked out */
  isCheckedOutByMe: boolean;
  /** Name of user who checked it out */
  checkedOutByName?: string;
  /** Email of user who checked it out */
  checkedOutByEmail?: string;
  /** When the checkout started */
  checkedOutDate?: string;
  /** Stale review level based on duration */
  staleLevel: StaleReviewLevel;
}

/**
 * Aggregated checkout status for a request's documents
 */
export interface IRequestCheckoutStatus {
  /** Files checked out by the current user */
  checkedOutByCurrentUser: IDocumentCheckoutStatus[];
  /** Files checked out by other users */
  checkedOutByOthers: IDocumentCheckoutStatus[];
  /** Whether any files are checked out */
  hasActiveCheckouts: boolean;
  /** Whether the current user has any checkouts */
  currentUserHasCheckouts: boolean;
}

/**
 * Result of a checkout/checkin operation
 */
export interface ICheckoutOperationResult {
  success: boolean;
  fileName: string;
  error?: string;
}

function buildOperationFailure(fileName: string, error: string): ICheckoutOperationResult {
  return {
    success: false,
    fileName,
    error,
  };
}

// ============================================
// CONFIG HELPERS
// ============================================

/**
 * Check if document review tracking is enabled
 */
export function isDocumentCheckoutEnabled(): boolean {
  const store = useConfigStore.getState();
  if (!store.isLoaded) return false;
  return store.getConfigBoolean(ConfigKeys.EnableDocumentCheckout, false);
}

/**
 * Check if auto-checkout on file replace is enabled
 */
export function isAutoCheckoutOnReplaceEnabled(): boolean {
  if (!isDocumentCheckoutEnabled()) return false;
  const store = useConfigStore.getState();
  return store.getConfigBoolean(ConfigKeys.AutoCheckoutOnReplace, true);
}

/**
 * Check if checkout is required before status transitions
 */
export function isCheckoutRequiredForTransition(): boolean {
  if (!isDocumentCheckoutEnabled()) return false;
  const store = useConfigStore.getState();
  return store.getConfigBoolean(ConfigKeys.CheckoutRequiredForTransition, true);
}

// ============================================
// FILE TYPE HELPERS
// ============================================

/**
 * Check if a file is an Office document (supports co-authoring).
 * Office files are excluded from review tracking.
 *
 * @param fileName - File name or path
 * @returns true if the file is an Office document
 */
export function isOfficeFile(fileName: string): boolean {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return false;
  const ext = fileName.substring(lastDot).toLowerCase();
  return OFFICE_EXTENSIONS.has(ext);
}

/**
 * Check if a file supports review tracking (non-Office file).
 *
 * @param fileName - File name or path
 * @returns true if review tracking applies to this file
 */
export function supportsReviewTracking(fileName: string): boolean {
  return !isOfficeFile(fileName);
}

// ============================================
// STALE REVIEW HELPERS
// ============================================

/**
 * Get the stale review level based on checkout duration.
 *
 * @param checkedOutDate - ISO date string when review started
 * @returns Stale review severity level
 *
 * Levels:
 * - normal: < 4 hours
 * - amber: 4-24 hours
 * - warning: 1-3 days (shows contact link)
 * - critical: 3+ days (shows admin force-finish)
 */
export function getStaleReviewLevel(checkedOutDate?: string): StaleReviewLevel {
  if (!checkedOutDate) return 'normal';

  const checkoutTime = new Date(checkedOutDate).getTime();
  if (isNaN(checkoutTime)) return 'normal';

  const elapsed = Date.now() - checkoutTime;

  if (elapsed >= STALE_THRESHOLDS.CRITICAL) return 'critical';
  if (elapsed >= STALE_THRESHOLDS.WARNING) return 'warning';
  if (elapsed >= STALE_THRESHOLDS.AMBER) return 'amber';
  return 'normal';
}

/**
 * Format the checkout duration for display.
 *
 * @param checkedOutDate - ISO date string when review started
 * @returns Human-readable duration string (e.g., "2 hours ago", "3 days ago")
 */
export function formatCheckoutDuration(checkedOutDate?: string): string {
  if (!checkedOutDate) return '';

  const checkoutTime = new Date(checkedOutDate).getTime();
  if (isNaN(checkoutTime)) return '';

  const elapsed = Date.now() - checkoutTime;
  const hours = Math.floor(elapsed / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }

  const minutes = Math.floor(elapsed / (60 * 1000));
  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }

  return 'Just now';
}

// ============================================
// CHECKOUT STATUS
// ============================================

/**
 * Get checkout status for a single document.
 *
 * @param document - Document to check
 * @returns Checkout status with stale level
 */
export function getDocumentCheckoutStatus(document: IDocument): IDocumentCheckoutStatus {
  const isCheckedOut = (document.checkOutType || 0) !== 0;
  const currentUserEmail = SPContext.currentUser?.email?.toLowerCase() || '';
  const currentUserTitle = SPContext.currentUser?.title?.toLowerCase() || '';
  const checkedOutEmail = document.checkedOutByEmail?.toLowerCase() || '';
  const checkedOutName = document.checkedOutByName?.toLowerCase() || '';
  const isCheckedOutByMe = isCheckedOut && (
    (checkedOutEmail !== '' && checkedOutEmail === currentUserEmail) ||
    (checkedOutEmail === '' && currentUserTitle !== '' && checkedOutName === currentUserTitle)
  );

  return {
    document,
    isCheckedOut,
    isCheckedOutByMe,
    checkedOutByName: document.checkedOutByName,
    checkedOutByEmail: document.checkedOutByEmail,
    checkedOutDate: document.checkedOutDate,
    staleLevel: isCheckedOut ? getStaleReviewLevel(document.checkedOutDate) : 'normal',
  };
}

/**
 * Get aggregated checkout status for all documents in a request.
 * Only considers non-Office files.
 *
 * @param documents - All documents for the request
 * @returns Aggregated checkout status grouped by current user vs others
 */
export function getRequestCheckoutStatus(documents: IDocument[]): IRequestCheckoutStatus {
  const checkedOutByCurrentUser: IDocumentCheckoutStatus[] = [];
  const checkedOutByOthers: IDocumentCheckoutStatus[] = [];

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];

    // Skip Office files — they use co-authoring
    if (isOfficeFile(doc.name)) continue;

    const status = getDocumentCheckoutStatus(doc);
    if (!status.isCheckedOut) continue;

    if (status.isCheckedOutByMe) {
      checkedOutByCurrentUser.push(status);
    } else {
      checkedOutByOthers.push(status);
    }
  }

  return {
    checkedOutByCurrentUser,
    checkedOutByOthers,
    hasActiveCheckouts: checkedOutByCurrentUser.length > 0 || checkedOutByOthers.length > 0,
    currentUserHasCheckouts: checkedOutByCurrentUser.length > 0,
  };
}

// ============================================
// CHECKOUT OPERATIONS
// ============================================

/**
 * Extract server-relative URL from absolute document URL.
 */
function getServerRelativeUrl(fileUrl: string): string {
  if (!fileUrl) {
    throw new Error('Document URL is missing');
  }

  if (fileUrl.indexOf('/') === 0) {
    return decodeURIComponent(fileUrl);
  }

  const urlObj = new URL(fileUrl);
  return decodeURIComponent(urlObj.pathname);
}

function validateReviewableDocument(document: IDocument, operation: 'start' | 'done' | 'stop'): ICheckoutOperationResult | undefined {
  // 'start' requires the feature to be enabled — don't create new checkouts when disabled.
  // 'done' and 'stop' intentionally skip this check: if the feature was toggled off while
  // files were still checked out, users must still be able to release their locks to avoid
  // stranding real SharePoint checkouts with no in-app recovery path.
  if (operation === 'start' && !isDocumentCheckoutEnabled()) {
    return buildOperationFailure(
      document.name,
      'Document review tracking is disabled.'
    );
  }

  if (!supportsReviewTracking(document.name)) {
    return buildOperationFailure(
      document.name,
      'This file type does not use document review tracking.'
    );
  }

  if (!document.url) {
    return buildOperationFailure(
      document.name,
      `Cannot ${operation} reviewing because the document URL is missing.`
    );
  }

  return undefined;
}

/**
 * Start reviewing a document (checkout).
 *
 * @param document - Document to check out
 * @returns Operation result
 */
export async function startReviewing(document: IDocument): Promise<ICheckoutOperationResult> {
  const validationFailure = validateReviewableDocument(document, 'start');
  if (validationFailure) {
    return validationFailure;
  }

  try {
    SPContext.logger.info('DocumentCheckout: Starting review', {
      fileName: document.name,
      listItemId: document.listItemId,
    });

    const serverRelativeUrl = getServerRelativeUrl(document.url);
    await SPContext.sp.web.getFileByServerRelativePath(serverRelativeUrl).checkout();

    SPContext.logger.success('DocumentCheckout: Review started', {
      fileName: document.name,
    });

    return { success: true, fileName: document.name };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('DocumentCheckout: Failed to start review', error, {
      fileName: document.name,
    });
    return { success: false, fileName: document.name, error: message };
  }
}

/**
 * Done reviewing a document (checkin with major version).
 *
 * @param document - Document to check in
 * @param comment - Optional checkin comment
 * @returns Operation result
 */
export async function doneReviewing(
  document: IDocument,
  comment: string = 'Review complete'
): Promise<ICheckoutOperationResult> {
  const validationFailure = validateReviewableDocument(document, 'done');
  if (validationFailure) {
    return validationFailure;
  }

  try {
    SPContext.logger.info('DocumentCheckout: Completing review', {
      fileName: document.name,
      listItemId: document.listItemId,
    });

    const serverRelativeUrl = getServerRelativeUrl(document.url);
    // CheckinType 1 = Major version
    await SPContext.sp.web.getFileByServerRelativePath(serverRelativeUrl).checkin(comment, 1);

    SPContext.logger.success('DocumentCheckout: Review completed', {
      fileName: document.name,
    });

    return { success: true, fileName: document.name };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('DocumentCheckout: Failed to complete review', error, {
      fileName: document.name,
    });
    return { success: false, fileName: document.name, error: message };
  }
}

/**
 * Stop reviewing a document (undo checkout, discards changes).
 *
 * @param document - Document to release
 * @returns Operation result
 */
export async function stopReviewing(document: IDocument): Promise<ICheckoutOperationResult> {
  const validationFailure = validateReviewableDocument(document, 'stop');
  if (validationFailure) {
    return validationFailure;
  }

  try {
    SPContext.logger.info('DocumentCheckout: Stopping review', {
      fileName: document.name,
      listItemId: document.listItemId,
    });

    const serverRelativeUrl = getServerRelativeUrl(document.url);
    await SPContext.sp.web.getFileByServerRelativePath(serverRelativeUrl).undoCheckout();

    SPContext.logger.success('DocumentCheckout: Review stopped', {
      fileName: document.name,
    });

    return { success: true, fileName: document.name };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('DocumentCheckout: Failed to stop review', error, {
      fileName: document.name,
    });
    return { success: false, fileName: document.name, error: message };
  }
}

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Done reviewing all documents checked out by the current user.
 * Processes sequentially — continues on failure and reports which failed.
 *
 * @param documents - All documents for the request
 * @returns Array of operation results
 */
export async function doneReviewingAll(documents: IDocument[]): Promise<ICheckoutOperationResult[]> {
  const status = getRequestCheckoutStatus(documents);
  const results: ICheckoutOperationResult[] = [];

  SPContext.logger.info('DocumentCheckout: Completing all reviews', {
    count: status.checkedOutByCurrentUser.length,
  });

  for (let i = 0; i < status.checkedOutByCurrentUser.length; i++) {
    const checkoutStatus = status.checkedOutByCurrentUser[i];
    const result = await doneReviewing(checkoutStatus.document);
    results.push(result);
  }

  const successCount = results.filter(function(r) { return r.success; }).length;
  const failCount = results.length - successCount;

  if (failCount > 0) {
    SPContext.logger.warn('DocumentCheckout: Some reviews failed to complete', {
      successCount,
      failCount,
    });
  } else {
    SPContext.logger.success('DocumentCheckout: All reviews completed', {
      count: successCount,
    });
  }

  return results;
}

/**
 * Force done reviewing for all documents (admin only).
 * Releases checkouts for all users, not just the current user.
 *
 * @param documents - All documents for the request
 * @returns Array of operation results
 */
export async function forceDoneReviewingAll(documents: IDocument[]): Promise<ICheckoutOperationResult[]> {
  const results: ICheckoutOperationResult[] = [];

  const nonOfficeCheckedOut = documents.filter(function(doc) {
    return !isOfficeFile(doc.name) && (doc.checkOutType || 0) !== 0;
  });

  SPContext.logger.info('DocumentCheckout: Force completing all reviews (admin)', {
    count: nonOfficeCheckedOut.length,
  });

  for (let i = 0; i < nonOfficeCheckedOut.length; i++) {
    // undoCheckout works for admin even on files checked out by others
    const result = await stopReviewing(nonOfficeCheckedOut[i]);
    results.push(result);
  }

  return results;
}

// ============================================
// PRE-TRANSITION VALIDATION
// ============================================

/**
 * Result of pre-transition checkout validation
 */
export interface ICheckoutValidationResult {
  /** Whether the transition can proceed */
  canProceed: boolean;
  /** Whether the current user has files to resolve */
  currentUserBlocked: boolean;
  /** Whether other users have active checkouts (informational for mid-workflow) */
  othersHaveCheckouts: boolean;
  /** Whether this is a final transition (all checkouts must be cleared) */
  isFinalTransition: boolean;
  /** Files checked out by current user */
  myFiles: IDocumentCheckoutStatus[];
  /** Files checked out by others */
  othersFiles: IDocumentCheckoutStatus[];
}

/**
 * Validate document checkout status before a workflow transition.
 *
 * Rules:
 * - Mid-workflow (not final): block if current user has checkouts, info-only for others
 * - Final transition: block if anyone has checkouts
 *
 * @param documents - All documents for the request
 * @param isFinalTransition - Whether this is the last review completing (triggers closeout)
 * @returns Validation result with blocking status and file lists
 */
export function validateCheckoutForTransition(
  documents: IDocument[],
  isFinalTransition: boolean
): ICheckoutValidationResult {
  if (!isCheckoutRequiredForTransition()) {
    return {
      canProceed: true,
      currentUserBlocked: false,
      othersHaveCheckouts: false,
      isFinalTransition,
      myFiles: [],
      othersFiles: [],
    };
  }

  const status = getRequestCheckoutStatus(documents);

  const currentUserBlocked = status.currentUserHasCheckouts;
  const othersHaveCheckouts = status.checkedOutByOthers.length > 0;

  // Mid-workflow: only block for own files
  // Final transition: block for any files
  const canProceed = isFinalTransition
    ? !status.hasActiveCheckouts
    : !currentUserBlocked;

  return {
    canProceed,
    currentUserBlocked,
    othersHaveCheckouts,
    isFinalTransition,
    myFiles: status.checkedOutByCurrentUser,
    othersFiles: status.checkedOutByOthers,
  };
}
