jest.mock('spfx-toolkit/lib/utilities/context', () => ({
  SPContext: {
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      success: jest.fn(),
    },
    sp: {},
  },
}));

jest.mock('spfx-toolkit/lib/utilities/context/pnpImports/lists', () => ({}));
jest.mock('@services/userGroupsService', () => ({
  checkDashboardAccess: jest.fn(),
}));

import { buildTimeByStageMetrics } from '../analyticsDataService';

describe('analyticsDataService', () => {
  describe('buildTimeByStageMetrics', () => {
    it('aggregates stage hours from tracked items and ignores empty items', () => {
      const result = buildTimeByStageMetrics([
        {
          ID: 1,
          LegalIntakeLegalAdminHours: 2,
          LegalReviewAttorneyHours: 3,
          LegalReviewSubmitterHours: 1,
          TotalReviewerHours: 5,
          TotalSubmitterHours: 1,
        },
        {
          ID: 2,
          LegalReviewAttorneyHours: 5,
          ComplianceReviewReviewerHours: 4,
          CloseoutSubmitterHours: 2,
          TotalReviewerHours: 9,
          TotalSubmitterHours: 2,
        },
        {
          ID: 3,
          TotalReviewerHours: 0,
          TotalSubmitterHours: 0,
        },
      ]);

      expect(result).toEqual([
        {
          stage: 'Legal Intake',
          avgReviewerHours: 2,
          avgSubmitterHours: 0,
          totalHours: 2,
          color: '#0078d4',
        },
        {
          stage: 'Legal Review',
          avgReviewerHours: 4,
          avgSubmitterHours: 0.5,
          totalHours: 4.5,
          color: '#8764b8',
        },
        {
          stage: 'Compliance Review',
          avgReviewerHours: 4,
          avgSubmitterHours: 0,
          totalHours: 4,
          color: '#107c10',
        },
        {
          stage: 'Closeout',
          avgReviewerHours: 0,
          avgSubmitterHours: 2,
          totalHours: 2,
          color: '#ffaa44',
        },
      ]);
    });

    it('supports string-backed numeric values from SharePoint payloads', () => {
      const result = buildTimeByStageMetrics([
        {
          ID: 1,
          LegalIntakeSubmitterHours: '1.5' as unknown as number,
          TotalSubmitterHours: '1.5' as unknown as number,
        },
      ]);

      expect(result[0]?.avgSubmitterHours).toBe(1.5);
      expect(result[0]?.totalHours).toBe(1.5);
    });
  });
});
