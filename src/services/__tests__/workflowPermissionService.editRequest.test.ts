/**
 * Workflow Permission Service - canEditRequest Tests
 *
 * Tests the permission logic that guards store.updateRequest().
 * canEditRequest(context) is called by enforcePermission() in the store
 * before any update is allowed.
 *
 * Coverage:
 * - Admin: allowed in non-terminal statuses
 * - LegalAdmin: allowed in non-terminal statuses
 * - Owner: allowed until Closeout
 * - Reviewers: must use dedicated review actions, not generic request edits
 * - Non-owner/non-reviewer: denied
 * - Terminal statuses: denied for all roles
 */

import type { IUserPermissions } from '@hooks/usePermissions';
import type { ILegalRequest } from '@appTypes/index';

// Mock SPContext.logger (used by logPermissionCheck)
jest.mock('spfx-toolkit/lib/utilities/context', () => ({
  SPContext: {
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      success: jest.fn(),
    },
  },
}));

import { canEditRequest } from '../workflowPermissionService';
import type { IActionContext } from '../workflowPermissionService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const basePermissions: IUserPermissions = {
  isSubmitter: false,
  isLegalAdmin: false,
  isAttorneyAssigner: false,
  isAttorney: false,
  isComplianceUser: false,
  isAdmin: false,
  roles: [],
  canCreateRequest: false,
  canViewAllRequests: false,
  canAssignAttorney: false,
  canReviewLegal: false,
  canReviewCompliance: false,
};

function makeContext(
  overrides: {
    status?: string;
    permissions?: Partial<IUserPermissions>;
    currentUserId?: string;
    submittedById?: string;
    authorId?: string;
    assignedAttorneyIds?: string[];
  } = {}
): IActionContext {
  const {
    status = 'In Review',
    permissions = {},
    currentUserId = '10',
    submittedById = '10',
    authorId = '10',
    assignedAttorneyIds,
  } = overrides;

  const request = {
    status,
    submittedBy: submittedById ? { id: submittedById } : undefined,
    author: authorId ? { id: authorId } : undefined,
    legalReview: assignedAttorneyIds
      ? { assignedAttorney: assignedAttorneyIds.map(id => ({ id, title: `User ${id}`, email: `u${id}@test.com` })) }
      : undefined,
  } as unknown as ILegalRequest;

  return {
    request,
    permissions: { ...basePermissions, ...permissions },
    currentUserId,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('canEditRequest', () => {
  // =========================================================================
  // Admin
  // =========================================================================
  describe('Admin', () => {
    it('should allow admin in any non-terminal status', () => {
      const statuses = ['Draft', 'Legal Intake', 'Assign Attorney', 'In Review', 'Closeout', 'Awaiting FINRA Documents', 'On Hold'];
      for (const status of statuses) {
        const ctx = makeContext({ status, permissions: { isAdmin: true }, currentUserId: '99' });
        expect(canEditRequest(ctx).allowed).toBe(true);
      }
    });

    it('should deny admin for Completed', () => {
      const ctx = makeContext({ status: 'Completed', permissions: { isAdmin: true }, currentUserId: '99' });
      expect(canEditRequest(ctx).allowed).toBe(false);
    });

    it('should deny admin for Cancelled', () => {
      const ctx = makeContext({ status: 'Cancelled', permissions: { isAdmin: true }, currentUserId: '99' });
      expect(canEditRequest(ctx).allowed).toBe(false);
    });
  });

  // =========================================================================
  // Legal Admin
  // =========================================================================
  describe('Legal Admin', () => {
    const legalAdminPerms = { isLegalAdmin: true };

    it('should allow in Draft', () => {
      const ctx = makeContext({ status: 'Draft', permissions: legalAdminPerms, currentUserId: '99' });
      expect(canEditRequest(ctx).allowed).toBe(true);
    });

    it('should allow in Legal Intake', () => {
      const ctx = makeContext({ status: 'Legal Intake', permissions: legalAdminPerms, currentUserId: '99' });
      expect(canEditRequest(ctx).allowed).toBe(true);
    });

    it('should allow in In Review', () => {
      const ctx = makeContext({ status: 'In Review', permissions: legalAdminPerms, currentUserId: '99' });
      expect(canEditRequest(ctx).allowed).toBe(true);
    });

    it('should allow in Closeout', () => {
      const ctx = makeContext({ status: 'Closeout', permissions: legalAdminPerms, currentUserId: '99' });
      expect(canEditRequest(ctx).allowed).toBe(true);
    });

    it('should deny in Completed', () => {
      const ctx = makeContext({ status: 'Completed', permissions: legalAdminPerms, currentUserId: '99' });
      const result = canEditRequest(ctx);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Completed');
    });

    it('should deny in Cancelled', () => {
      const ctx = makeContext({ status: 'Cancelled', permissions: legalAdminPerms, currentUserId: '99' });
      const result = canEditRequest(ctx);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Cancelled');
    });
  });

  // =========================================================================
  // Owner (request submitter)
  // =========================================================================
  describe('Owner', () => {
    // Owner = submittedBy.id matches currentUserId, no admin/legalAdmin roles
    const ownerPerms = { isSubmitter: true };

    it('should allow owner in Draft', () => {
      const ctx = makeContext({ status: 'Draft', permissions: ownerPerms });
      expect(canEditRequest(ctx).allowed).toBe(true);
    });

    it('should allow owner in Legal Intake', () => {
      const ctx = makeContext({ status: 'Legal Intake', permissions: ownerPerms });
      expect(canEditRequest(ctx).allowed).toBe(true);
    });

    it('should allow owner in Assign Attorney', () => {
      const ctx = makeContext({ status: 'Assign Attorney', permissions: ownerPerms });
      expect(canEditRequest(ctx).allowed).toBe(true);
    });

    it('should allow owner in In Review', () => {
      const ctx = makeContext({ status: 'In Review', permissions: ownerPerms });
      expect(canEditRequest(ctx).allowed).toBe(true);
    });

    it('should allow owner in On Hold', () => {
      const ctx = makeContext({ status: 'On Hold', permissions: ownerPerms });
      expect(canEditRequest(ctx).allowed).toBe(true);
    });

    it('should deny owner in Closeout', () => {
      const ctx = makeContext({ status: 'Closeout', permissions: ownerPerms });
      const result = canEditRequest(ctx);
      expect(result.allowed).toBe(false);
    });

    it('should deny owner in Awaiting FINRA Documents', () => {
      const ctx = makeContext({ status: 'Awaiting FINRA Documents', permissions: ownerPerms });
      const result = canEditRequest(ctx);
      expect(result.allowed).toBe(false);
    });

    it('should deny owner in Completed', () => {
      const ctx = makeContext({ status: 'Completed', permissions: ownerPerms });
      expect(canEditRequest(ctx).allowed).toBe(false);
    });

    it('should deny owner in Cancelled', () => {
      const ctx = makeContext({ status: 'Cancelled', permissions: ownerPerms });
      expect(canEditRequest(ctx).allowed).toBe(false);
    });

    it('should match via author.id when submittedBy is absent', () => {
      const ctx = makeContext({
        status: 'In Review',
        permissions: ownerPerms,
        submittedById: '',
        authorId: '10',
        currentUserId: '10',
      });
      expect(canEditRequest(ctx).allowed).toBe(true);
    });
  });

  // =========================================================================
  // Assigned Attorney (not owner)
  // =========================================================================
  describe('Attorney Reviewer', () => {
    it('should deny assigned attorney during In Review for generic edits', () => {
      const ctx = makeContext({
        status: 'In Review',
        permissions: { isAttorney: true, canReviewLegal: true },
        currentUserId: '20',
        submittedById: '10',
        authorId: '10',
        assignedAttorneyIds: ['20'],
      });
      expect(canEditRequest(ctx).allowed).toBe(false);
    });

    it('should deny unassigned attorney during In Review', () => {
      const ctx = makeContext({
        status: 'In Review',
        permissions: { isAttorney: true, canReviewLegal: true },
        currentUserId: '20',
        submittedById: '10',
        authorId: '10',
        assignedAttorneyIds: ['30'], // Different attorney assigned
      });
      expect(canEditRequest(ctx).allowed).toBe(false);
    });

    it('should deny attorney in non-In Review status', () => {
      const ctx = makeContext({
        status: 'Legal Intake',
        permissions: { isAttorney: true, canReviewLegal: true },
        currentUserId: '20',
        submittedById: '10',
        authorId: '10',
        assignedAttorneyIds: ['20'],
      });
      expect(canEditRequest(ctx).allowed).toBe(false);
    });
  });

  // =========================================================================
  // Compliance User (not owner)
  // =========================================================================
  describe('Compliance User', () => {
    it('should deny compliance user during In Review for generic edits', () => {
      const ctx = makeContext({
        status: 'In Review',
        permissions: { isComplianceUser: true, canReviewCompliance: true },
        currentUserId: '30',
        submittedById: '10',
        authorId: '10',
      });
      expect(canEditRequest(ctx).allowed).toBe(false);
    });

    it('should deny compliance user in non-In Review status', () => {
      const ctx = makeContext({
        status: 'Closeout',
        permissions: { isComplianceUser: true, canReviewCompliance: true },
        currentUserId: '30',
        submittedById: '10',
        authorId: '10',
      });
      expect(canEditRequest(ctx).allowed).toBe(false);
    });
  });

  // =========================================================================
  // Non-owner / non-reviewer
  // =========================================================================
  describe('Unauthorized user', () => {
    it('should deny submitter who is not the owner', () => {
      const ctx = makeContext({
        status: 'In Review',
        permissions: { isSubmitter: true },
        currentUserId: '99', // Not the owner (10)
        submittedById: '10',
        authorId: '10',
      });
      const result = canEditRequest(ctx);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('permission to edit');
    });

    it('should deny user with no roles', () => {
      const ctx = makeContext({
        status: 'Draft',
        permissions: {},
        currentUserId: '99',
        submittedById: '10',
        authorId: '10',
      });
      expect(canEditRequest(ctx).allowed).toBe(false);
    });
  });
});
