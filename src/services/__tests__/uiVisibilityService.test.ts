import { RequestStatus } from '@appTypes/workflowTypes';
import type { IUserPermissions } from '@hooks/usePermissions';

jest.mock('spfx-toolkit/lib/utilities/context', () => ({
  SPContext: {
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      success: jest.fn(),
    },
  },
}));

import { createVisibilityContext, getButtonVisibility, getFieldVisibility } from '../uiVisibilityService';

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

describe('uiVisibilityService', () => {
  describe('createVisibilityContext', () => {
    it('should fall back to the flat attorney field for assigned-attorney visibility', () => {
      const ctx = createVisibilityContext(
        RequestStatus.InReview,
        basePermissions,
        '10',
        {
          attorney: [{ id: '10', title: 'Assigned Attorney', email: 'attorney@test.com' }],
          reviewAudience: 'Legal',
        },
        { isNewRequest: false }
      );

      expect(ctx.isAssignedAttorney).toBe(true);
      expect(ctx.hasAssignedAttorney).toBe(true);
    });

    it('should use flat review status fallbacks when nested review objects are absent', () => {
      const ctx = createVisibilityContext(
        RequestStatus.InReview,
        basePermissions,
        '10',
        {
          reviewAudience: 'Both',
          legalReviewStatus: 'Completed',
          complianceReviewStatus: 'Completed',
        },
        { isNewRequest: false }
      );

      expect(ctx.legalReviewCompleted).toBe(true);
      expect(ctx.complianceReviewCompleted).toBe(true);
    });
  });

  describe('getFieldVisibility', () => {
    it('should allow Legal Admin to edit request info before Closeout', () => {
      const ctx = createVisibilityContext(
        RequestStatus.LegalIntake,
        { ...basePermissions, isLegalAdmin: true },
        '99',
        {
          submittedBy: { id: '10' },
          author: { id: '10' },
          reviewAudience: 'Legal',
        },
        { isNewRequest: false }
      );

      expect(getFieldVisibility(ctx).requestInfo.canEdit).toBe(true);
    });
  });

  describe('getButtonVisibility', () => {
    it('should allow compliance-only requests to proceed without attorney assignment in Legal Intake', () => {
      const ctx = createVisibilityContext(
        RequestStatus.LegalIntake,
        { ...basePermissions, isLegalAdmin: true },
        '99',
        {
          reviewAudience: 'Compliance',
          attorney: [],
        },
        { isNewRequest: false }
      );

      const buttons = getButtonVisibility(ctx);
      expect(buttons.assignAttorney.visible).toBe(true);
      expect(buttons.assignAttorney.enabled).toBe(true);
    });

    it('should show complete FINRA documents for the owner in Awaiting FINRA Documents', () => {
      const ctx = createVisibilityContext(
        RequestStatus.AwaitingFINRADocuments,
        basePermissions,
        '10',
        {
          submittedBy: { id: '10' },
          author: { id: '10' },
        },
        { isNewRequest: false }
      );

      const buttons = getButtonVisibility(ctx);
      expect(buttons.completeFINRADocuments.visible).toBe(true);
      expect(buttons.completeFINRADocuments.enabled).toBe(true);
    });

    it('should expose resubmit-for-review to owner/admin during In Review', () => {
      const ownerCtx = createVisibilityContext(
        RequestStatus.InReview,
        basePermissions,
        '10',
        {
          submittedBy: { id: '10' },
          author: { id: '10' },
        },
        { isNewRequest: false }
      );
      const adminCtx = createVisibilityContext(
        RequestStatus.InReview,
        { ...basePermissions, isAdmin: true },
        '99',
        {
          submittedBy: { id: '10' },
          author: { id: '10' },
        },
        { isNewRequest: false }
      );

      expect(getButtonVisibility(ownerCtx).resubmitForReview.visible).toBe(true);
      expect(getButtonVisibility(adminCtx).resubmitForReview.visible).toBe(true);
    });
  });
});
