import type { IUserPermissions } from '@hooks/usePermissions';
import type { ILegalRequest } from '@appTypes/index';
import { RequestStatus } from '@appTypes/workflowTypes';

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

import {
  canAssignAttorney,
  canCommitteeAssignAttorney,
  canSaveDraft,
  canSubmitLegalReview,
  type IActionContext,
} from '../workflowPermissionService';

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
  requestOverrides: Partial<ILegalRequest>,
  permissionOverrides: Partial<IUserPermissions> = {},
  currentUserId = '10'
): IActionContext {
  return {
    request: {
      status: RequestStatus.Draft,
      requestId: 'REQ-1',
      reviewAudience: 'Legal',
      ...requestOverrides,
    } as ILegalRequest,
    permissions: {
      ...basePermissions,
      ...permissionOverrides,
    },
    currentUserId,
  };
}

describe('workflowPermissionService action guards', () => {
  it('allows any attorney to submit legal review during In Review', () => {
    const ctx = makeContext(
      {
        status: RequestStatus.InReview,
        reviewAudience: 'Legal',
        attorney: [{ id: '99', title: 'Other Attorney', email: 'other@test.com' }],
      },
      {
        isAttorney: true,
        canReviewLegal: true,
      },
      '10'
    );

    expect(canSubmitLegalReview(ctx).allowed).toBe(true);
  });

  it('denies attorney assigner from direct attorney assignment in Legal Intake', () => {
    const ctx = makeContext(
      {
        status: RequestStatus.LegalIntake,
      },
      {
        isAttorneyAssigner: true,
        canAssignAttorney: true,
      }
    );

    const result = canAssignAttorney(ctx);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Legal Admin or Admin');
  });

  it('allows attorney assigner during the committee Assign Attorney stage', () => {
    const ctx = makeContext(
      {
        status: RequestStatus.AssignAttorney,
      },
      {
        isAttorneyAssigner: true,
      }
    );

    expect(canCommitteeAssignAttorney(ctx).allowed).toBe(true);
  });

  it('allows submitter to save a new unsaved draft', () => {
    const ctx = makeContext(
      {
        status: RequestStatus.Draft,
        submittedBy: undefined,
        author: undefined,
      },
      {
        isSubmitter: true,
      }
    );

    expect(canSaveDraft(ctx).allowed).toBe(true);
  });

  it('denies legal admin from creating a new unsaved draft', () => {
    const ctx = makeContext(
      {
        status: RequestStatus.Draft,
        submittedBy: undefined,
        author: undefined,
      },
      {
        isLegalAdmin: true,
      }
    );

    expect(canSaveDraft(ctx).allowed).toBe(false);
  });
});
