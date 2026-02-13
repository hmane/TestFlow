/**
 * FINRA Actions Tests
 *
 * Tests for completeFINRADocuments workflow action:
 * - Validates request is in AwaitingFINRADocuments state
 * - Sets Status → Completed, FINRACompletedBy, FINRACompletedOn
 * - Optionally saves FINRANotes, FINRACommentsReceived, FINRAComment
 * - Manages permissions for Completed status
 */

import type { ILegalRequest } from '@appTypes/requestTypes';
import { RequestStatus } from '@appTypes/workflowTypes';

// Mock all external dependencies
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
      email: 'submitter@example.com',
      title: 'Test Submitter',
      loginName: 'i:0#.f|membership|submitter@example.com',
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

jest.mock('spfx-toolkit/lib/utilities/listItemHelper', () => ({
  createSPUpdater: () => {
    const updates: Record<string, unknown> = {};
    return {
      set: (field: string, value: unknown) => {
        updates[field] = value;
      },
      getUpdates: () => updates,
    };
  },
}));

// Mock other services
const mockManageRequestPermissions = jest.fn().mockResolvedValue({});
jest.mock('../azureFunctionService', () => ({
  manageRequestPermissions: (...args: unknown[]) => mockManageRequestPermissions(...args),
}));

const mockLoadRequestById = jest.fn();
jest.mock('../requestLoadService', () => ({
  loadRequestById: (id: number) => mockLoadRequestById(id),
}));

jest.mock('../../utils/correlationId', () => ({
  generateCorrelationId: jest.fn().mockReturnValue('test-correlation-id'),
}));

// Import after mocks are set up
import { completeFINRADocuments } from '../workflow/finraActions';

describe('FINRA Actions - completeFINRADocuments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('successful completion', () => {
    beforeEach(() => {
      mockLoadRequestById
        .mockResolvedValueOnce({
          id: 1,
          requestId: 'CRR-2025-001',
          status: RequestStatus.AwaitingFINRADocuments,
        } as Partial<ILegalRequest>)
        .mockResolvedValueOnce({
          id: 1,
          requestId: 'CRR-2025-001',
          status: RequestStatus.Completed,
          finraCompletedOn: new Date().toISOString(),
        } as Partial<ILegalRequest>);
    });

    it('should succeed when request is in AwaitingFINRADocuments state', async () => {
      const result = await completeFINRADocuments(1);

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe(RequestStatus.Completed);
    });

    it('should set Status to Completed', async () => {
      const result = await completeFINRADocuments(1);

      expect(result.fieldsUpdated).toContain('Status');
    });

    it('should set FINRACompletedBy and FINRACompletedOn', async () => {
      const result = await completeFINRADocuments(1);

      expect(result.fieldsUpdated).toContain('FINRACompletedBy');
      expect(result.fieldsUpdated).toContain('FINRACompletedOn');
    });

    it('should call manageRequestPermissions for Completed status', async () => {
      await completeFINRADocuments(1);

      expect(mockManageRequestPermissions).toHaveBeenCalledWith(1, RequestStatus.Completed);
    });

    it('should reload request after update', async () => {
      const result = await completeFINRADocuments(1);

      // loadRequestById called twice: once to validate, once to reload
      expect(mockLoadRequestById).toHaveBeenCalledTimes(2);
      expect(result.updatedRequest).toBeDefined();
    });
  });

  describe('with optional payload', () => {
    beforeEach(() => {
      mockLoadRequestById
        .mockResolvedValueOnce({
          id: 1,
          requestId: 'CRR-2025-001',
          status: RequestStatus.AwaitingFINRADocuments,
        } as Partial<ILegalRequest>)
        .mockResolvedValueOnce({
          id: 1,
          requestId: 'CRR-2025-001',
          status: RequestStatus.Completed,
        } as Partial<ILegalRequest>);
    });

    it('should include FINRANotes when notes are provided', async () => {
      const result = await completeFINRADocuments(1, {
        notes: 'All FINRA documents uploaded successfully',
      });

      expect(result.success).toBe(true);
      expect(result.fieldsUpdated).toContain('FINRANotes');
    });

    it('should include FINRACommentsReceived when provided', async () => {
      const result = await completeFINRADocuments(1, {
        finraCommentsReceived: true,
      });

      expect(result.success).toBe(true);
      expect(result.fieldsUpdated).toContain('FINRACommentsReceived');
    });

    it('should include FINRAComment when provided', async () => {
      const result = await completeFINRADocuments(1, {
        finraComment: 'FINRA requested additional disclosures',
      });

      expect(result.success).toBe(true);
      expect(result.fieldsUpdated).toContain('FINRAComment');
    });

    it('should include all optional fields when all are provided', async () => {
      const result = await completeFINRADocuments(1, {
        notes: 'Completed',
        finraCommentsReceived: true,
        finraComment: 'Disclosures updated per FINRA feedback',
      });

      expect(result.success).toBe(true);
      expect(result.fieldsUpdated).toContain('FINRANotes');
      expect(result.fieldsUpdated).toContain('FINRACommentsReceived');
      expect(result.fieldsUpdated).toContain('FINRAComment');
    });

    it('should not include FINRANotes when notes are not provided', async () => {
      const result = await completeFINRADocuments(1);

      expect(result.fieldsUpdated).not.toContain('FINRANotes');
    });

    it('should not include FINRAComment when not provided', async () => {
      const result = await completeFINRADocuments(1);

      expect(result.fieldsUpdated).not.toContain('FINRAComment');
    });
  });

  describe('state validation', () => {
    it('should throw when request is not in AwaitingFINRADocuments state', async () => {
      mockLoadRequestById.mockResolvedValue({
        id: 1,
        requestId: 'CRR-2025-001',
        status: RequestStatus.InReview,
      } as Partial<ILegalRequest>);

      await expect(completeFINRADocuments(1)).rejects.toThrow(
        'Cannot complete FINRA documents'
      );
    });

    it('should throw when request is in Draft state', async () => {
      mockLoadRequestById.mockResolvedValue({
        id: 1,
        status: RequestStatus.Draft,
      } as Partial<ILegalRequest>);

      await expect(completeFINRADocuments(1)).rejects.toThrow();
    });

    it('should throw when request is already Completed', async () => {
      mockLoadRequestById.mockResolvedValue({
        id: 1,
        status: RequestStatus.Completed,
      } as Partial<ILegalRequest>);

      await expect(completeFINRADocuments(1)).rejects.toThrow();
    });
  });

  describe('permission management', () => {
    beforeEach(() => {
      mockLoadRequestById
        .mockResolvedValueOnce({
          id: 1,
          status: RequestStatus.AwaitingFINRADocuments,
        } as Partial<ILegalRequest>)
        .mockResolvedValueOnce({
          id: 1,
          status: RequestStatus.Completed,
        } as Partial<ILegalRequest>);
    });

    it('should continue if permission management fails', async () => {
      mockManageRequestPermissions.mockRejectedValue(new Error('Permission error'));

      const result = await completeFINRADocuments(1);

      // Should still succeed despite permission error
      expect(result.success).toBe(true);
    });
  });
});
