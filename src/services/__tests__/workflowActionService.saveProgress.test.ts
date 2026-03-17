/**
 * Workflow Action Service - Save Progress Tests
 *
 * Tests for save-progress permission guards and field update logic:
 * - saveLegalReviewProgress: attorney / admin / legal-admin enforcement
 * - saveComplianceReviewProgress: compliance-user / admin enforcement
 * - Both: status guard (must be In Review), conditional timestamp update
 */

import type { ILegalRequest } from '@appTypes/requestTypes';
import { LegalReviewStatus, ComplianceReviewStatus, ReviewOutcome } from '@appTypes/workflowTypes';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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
      email: 'attorney@example.com',
      title: 'Test Attorney',
      loginName: 'i:0#.f|membership|attorney@example.com',
    },
    sp: {
      web: {
        lists: {
          getByTitle: jest.fn().mockReturnValue({
            items: {
              getById: jest.fn().mockReturnValue({
                update: jest.fn().mockResolvedValue({}),
              }),
            },
          }),
        },
      },
    },
  },
}));

jest.mock('spfx-toolkit/lib/utilities/context/pnpImports/lists', () => ({}));
jest.mock('spfx-toolkit/lib/utilities/context/pnpImports/files', () => ({}));

jest.mock('@services/documentCheckoutService', () => ({
  isCheckoutRequiredForTransition: jest.fn().mockReturnValue(false),
  getRequestCheckoutStatus: jest.fn().mockReturnValue({
    hasActiveCheckouts: false,
    checkedOutByCurrentUser: [],
    checkedOutByOthers: [],
    currentUserHasCheckouts: false,
  }),
}));

jest.mock('spfx-toolkit/lib/utilities/listItemHelper', () => ({
  createSPUpdater: () => {
    const updates: Record<string, unknown> = {};
    return {
      set: (field: string, value: unknown) => {
        updates[field] = value;
      },
      setChoice: (field: string, value: unknown) => {
        updates[field] = value;
      },
      setUser: (field: string, value: unknown) => {
        if (value && typeof value === 'object' && 'id' in value) {
          updates[`${field}Id`] = (value as { id: string | number }).id;
        }
      },
      setDate: (field: string, value: unknown) => {
        updates[field] = value instanceof Date ? value.toISOString() : value;
      },
      setText: (field: string, value: unknown) => {
        updates[field] = value;
      },
      getUpdates: () => updates,
    };
  },
}));

const mockLoadRequestById = jest.fn();

jest.mock('../requestLoadService', () => ({
  loadRequestById: (id: number) => mockLoadRequestById(id),
}));

jest.mock('../../utils/correlationId', () => ({
  generateCorrelationId: jest.fn().mockReturnValue('test-correlation-id'),
}));

// Configurable permissions — tests override per-scenario
const mockPermissionsState = {
  isAdmin: false,
  isLegalAdmin: false,
  isComplianceUser: false,
  isSubmitter: true,
  isAttorney: true,
  isAttorneyAssigner: false,
};

jest.mock('@stores/permissionsStore', () => ({
  usePermissionsStore: {
    getState: () => mockPermissionsState,
  },
}));

// Import after mocks
import {
  saveLegalReviewProgress,
  saveComplianceReviewProgress,
} from '../workflowActionService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset permissions to defaults before each test */
function resetPermissions(): void {
  mockPermissionsState.isAdmin = false;
  mockPermissionsState.isLegalAdmin = false;
  mockPermissionsState.isComplianceUser = false;
  mockPermissionsState.isSubmitter = true;
  mockPermissionsState.isAttorney = true;
  mockPermissionsState.isAttorneyAssigner = false;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Workflow Action Service - Save Progress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPermissions();
  });

  // =========================================================================
  // saveLegalReviewProgress
  // =========================================================================
  describe('saveLegalReviewProgress', () => {
    const baseRequest = {
      id: 1,
      requestId: 'CRR-2025-001',
      status: 'In Review',
      reviewAudience: 'Legal',
      legalReviewStatus: LegalReviewStatus.NotStarted,
      attorney: [{ id: '1', title: 'Test Attorney', email: 'attorney@example.com' }],
    } as Partial<ILegalRequest>;

    beforeEach(() => {
      mockLoadRequestById.mockResolvedValue({ ...baseRequest });
    });

    // --- Happy paths ---

    it('should succeed for assigned attorney', async () => {
      const result = await saveLegalReviewProgress(1, {
        outcome: ReviewOutcome.Approved,
        notes: 'Looks good so far',
      });

      expect(result.success).toBe(true);
      expect(result.fieldsUpdated).toContain('LegalReviewStatus');
      expect(result.fieldsUpdated).toContain('LegalReviewOutcome');
      expect(result.fieldsUpdated).toContain('LegalReviewNotes');
    });

    it('should succeed for admin (not assigned)', async () => {
      mockPermissionsState.isAdmin = true;

      // Attorney list doesn't include current user (id: 1)
      mockLoadRequestById.mockResolvedValue({
        ...baseRequest,
        attorney: [{ id: '99', title: 'Other Attorney', email: 'other@example.com' }],
      });

      const result = await saveLegalReviewProgress(1, { notes: 'Admin override' });
      expect(result.success).toBe(true);
    });

    it('should succeed for legal admin (not assigned)', async () => {
      mockPermissionsState.isLegalAdmin = true;

      mockLoadRequestById.mockResolvedValue({
        ...baseRequest,
        attorney: [{ id: '99', title: 'Other Attorney', email: 'other@example.com' }],
      });

      const result = await saveLegalReviewProgress(1, { notes: 'Legal admin override' });
      expect(result.success).toBe(true);
    });

    it('should set status to In Progress', async () => {
      const result = await saveLegalReviewProgress(1, {});
      expect(result.fieldsUpdated).toContain('LegalReviewStatus');
    });

    it('should only update outcome if provided', async () => {
      const result = await saveLegalReviewProgress(1, {});
      expect(result.fieldsUpdated).not.toContain('LegalReviewOutcome');
    });

    it('should only update notes if provided', async () => {
      const result = await saveLegalReviewProgress(1, { outcome: ReviewOutcome.Approved });
      expect(result.fieldsUpdated).not.toContain('LegalReviewNotes');
    });

    // --- Timestamp logic ---

    it('should not reset timestamp when status changes from NotStarted to InProgress', async () => {
      mockLoadRequestById.mockResolvedValue({
        ...baseRequest,
        legalReviewStatus: LegalReviewStatus.NotStarted,
      });

      const result = await saveLegalReviewProgress(1, {});
      expect(result.fieldsUpdated).not.toContain('LegalStatusUpdatedOn');
    });

    it('should NOT update timestamp when already In Progress', async () => {
      mockLoadRequestById.mockResolvedValue({
        ...baseRequest,
        legalReviewStatus: LegalReviewStatus.InProgress,
      });

      const result = await saveLegalReviewProgress(1, {});
      expect(result.fieldsUpdated).not.toContain('LegalStatusUpdatedOn');
    });

    // --- Permission denials ---

    it('should reject when request is not In Review', async () => {
      mockLoadRequestById.mockResolvedValue({
        ...baseRequest,
        status: 'Legal Intake',
      });

      await expect(
        saveLegalReviewProgress(1, { notes: 'test' })
      ).rejects.toThrow('request status is "Legal Intake"');
    });

    it('should reject when request is Draft', async () => {
      mockLoadRequestById.mockResolvedValue({
        ...baseRequest,
        status: 'Draft',
      });

      await expect(
        saveLegalReviewProgress(1, {})
      ).rejects.toThrow('expected "In Review"');
    });

    it('should allow an attorney who is not specifically assigned', async () => {
      mockLoadRequestById.mockResolvedValue({
        ...baseRequest,
        attorney: [{ id: '99', title: 'Other Attorney', email: 'other@example.com' }],
      });

      const result = await saveLegalReviewProgress(1, { notes: 'test' });
      expect(result.success).toBe(true);
    });

    it('should allow an attorney when no specific assignees are stored', async () => {
      mockLoadRequestById.mockResolvedValue({
        ...baseRequest,
        attorney: undefined,
        legalReview: undefined,
      });

      const result = await saveLegalReviewProgress(1, {});
      expect(result.success).toBe(true);
    });

    it('should match via legalReview.assignedAttorney when attorney field is absent', async () => {
      mockLoadRequestById.mockResolvedValue({
        ...baseRequest,
        attorney: undefined,
        legalReview: {
          assignedAttorney: [{ id: '1', title: 'Test Attorney', email: 'attorney@example.com' }],
        },
      });

      const result = await saveLegalReviewProgress(1, {});
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // saveComplianceReviewProgress
  // =========================================================================
  describe('saveComplianceReviewProgress', () => {
    const baseRequest = {
      id: 1,
      requestId: 'CRR-2025-002',
      status: 'In Review',
      reviewAudience: 'Compliance',
      complianceReviewStatus: ComplianceReviewStatus.NotStarted,
    } as Partial<ILegalRequest>;

    beforeEach(() => {
      mockPermissionsState.isComplianceUser = true;
      mockLoadRequestById.mockResolvedValue({ ...baseRequest });
    });

    // --- Happy paths ---

    it('should succeed for compliance user', async () => {
      const result = await saveComplianceReviewProgress(1, {
        outcome: ReviewOutcome.Approved,
        notes: 'Compliance notes',
      });

      expect(result.success).toBe(true);
      expect(result.fieldsUpdated).toContain('ComplianceReviewStatus');
      expect(result.fieldsUpdated).toContain('ComplianceReviewOutcome');
      expect(result.fieldsUpdated).toContain('ComplianceReviewNotes');
    });

    it('should succeed for admin (not compliance user)', async () => {
      mockPermissionsState.isComplianceUser = false;
      mockPermissionsState.isAdmin = true;

      const result = await saveComplianceReviewProgress(1, { notes: 'Admin save' });
      expect(result.success).toBe(true);
    });

    it('should set status to In Progress', async () => {
      const result = await saveComplianceReviewProgress(1, {});
      expect(result.fieldsUpdated).toContain('ComplianceReviewStatus');
    });

    it('should include optional flags when provided', async () => {
      const result = await saveComplianceReviewProgress(1, {
        isForesideReviewRequired: true,
        isRetailUse: false,
        recordRetentionOnly: true,
      });

      expect(result.fieldsUpdated).toContain('IsForesideReviewRequired');
      expect(result.fieldsUpdated).toContain('IsRetailUse');
      expect(result.fieldsUpdated).toContain('RecordRetentionOnly');
    });

    it('should not include flags when not provided', async () => {
      const result = await saveComplianceReviewProgress(1, {});
      expect(result.fieldsUpdated).not.toContain('IsForesideReviewRequired');
      expect(result.fieldsUpdated).not.toContain('IsRetailUse');
      expect(result.fieldsUpdated).not.toContain('RecordRetentionOnly');
    });

    // --- Timestamp logic ---

    it('should not reset timestamp when status changes from NotStarted to InProgress', async () => {
      const result = await saveComplianceReviewProgress(1, {});
      expect(result.fieldsUpdated).not.toContain('ComplianceStatusUpdatedOn');
    });

    it('should NOT update timestamp when already In Progress', async () => {
      mockLoadRequestById.mockResolvedValue({
        ...baseRequest,
        complianceReviewStatus: ComplianceReviewStatus.InProgress,
      });

      const result = await saveComplianceReviewProgress(1, {});
      expect(result.fieldsUpdated).not.toContain('ComplianceStatusUpdatedOn');
    });

    // --- Permission denials ---

    it('should reject when request is not In Review', async () => {
      mockLoadRequestById.mockResolvedValue({
        ...baseRequest,
        status: 'Closeout',
      });

      await expect(
        saveComplianceReviewProgress(1, {})
      ).rejects.toThrow('request status is "Closeout"');
    });

    it('should reject when user is not compliance user and not admin', async () => {
      mockPermissionsState.isComplianceUser = false;
      mockPermissionsState.isAdmin = false;

      await expect(
        saveComplianceReviewProgress(1, { notes: 'unauthorized' })
      ).rejects.toThrow('requires Compliance User or Admin role');
    });

    it('should reject legal admin (not compliance user, not admin)', async () => {
      mockPermissionsState.isComplianceUser = false;
      mockPermissionsState.isLegalAdmin = true;

      await expect(
        saveComplianceReviewProgress(1, {})
      ).rejects.toThrow('requires Compliance User or Admin role');
    });

    it('should reject submitter (not compliance user, not admin)', async () => {
      mockPermissionsState.isComplianceUser = false;
      mockPermissionsState.isAttorney = false;

      await expect(
        saveComplianceReviewProgress(1, {})
      ).rejects.toThrow('requires Compliance User or Admin role');
    });
  });
});
