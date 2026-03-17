import { Groups } from '@sp/Groups';
import { AppRole } from '../configTypes';

describe('AppRole', () => {
  it('uses the SharePoint group constants as the single source of truth', () => {
    expect(AppRole.Submitters).toBe(Groups.LwSubmitters.Title);
    expect(AppRole.LegalAdmin).toBe(Groups.LwLegalAdmins.Title);
    expect(AppRole.AttorneyAssigner).toBe(Groups.LwAttorneyAssigners.Title);
    expect(AppRole.Attorneys).toBe(Groups.LwAttorneys.Title);
    expect(AppRole.ComplianceUsers).toBe(Groups.LwComplianceReviewers.Title);
    expect(AppRole.Admin).toBe(Groups.LwAdmins.Title);
  });
});
