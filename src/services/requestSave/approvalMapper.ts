/**
 * Approval Mapper
 *
 * Maps approvals array to individual SharePoint fields.
 */

import type { createSPUpdater } from 'spfx-toolkit/lib/utilities/listItemHelper';
import type { ILegalRequest } from '@appTypes/requestTypes';
import { ApprovalType } from '@appTypes/approvalTypes';

/**
 * Map approvals array to individual SharePoint fields
 *
 * Each approval type is stored as separate fields in SharePoint:
 * - Communications: RequiresCommunicationsApproval, CommunicationsApprover, CommunicationsApprovalDate
 * - Portfolio Manager: HasPortfolioManagerApproval, PortfolioManager, PortfolioManagerApprovalDate
 * - Research Analyst: HasResearchAnalystApproval, ResearchAnalyst, ResearchAnalystApprovalDate
 * - SME: HasSMEApproval, SubjectMatterExpert, SMEApprovalDate
 * - Performance: HasPerformanceApproval, PerformanceApprover, PerformanceApprovalDate
 * - Other: HasOtherApproval, OtherApproval, OtherApprovalDate, OtherApprovalTitle
 *
 * IMPORTANT: This function does NOT validate data completeness.
 * - Boolean flag is set to true if approval exists in array (regardless of data)
 * - Approver/date fields are saved as-is, even if empty/null (for draft mode)
 * - Validation happens in the form layer before submission, not here
 * - Documents are uploaded separately via processPendingDocuments()
 */
export function mapApprovalsToSharePointFields(
  updater: ReturnType<typeof createSPUpdater>,
  newApprovals: ILegalRequest['approvals'],
  originalApprovals?: ILegalRequest['approvals']
): void {
  // Create lookup maps for easy access
  const newApprovalsMap = new Map<ApprovalType, any>();
  const originalApprovalsMap = new Map<ApprovalType, any>();

  // Populate new approvals map
  if (newApprovals && Array.isArray(newApprovals)) {
    for (let i = 0; i < newApprovals.length; i++) {
      const approval = newApprovals[i];
      if (approval && approval.type) {
        newApprovalsMap.set(approval.type, approval);
      }
    }
  }

  // Populate original approvals map
  if (originalApprovals && Array.isArray(originalApprovals)) {
    for (let i = 0; i < originalApprovals.length; i++) {
      const approval = originalApprovals[i];
      if (approval && approval.type) {
        originalApprovalsMap.set(approval.type, approval);
      }
    }
  }

  // Map Communications approval
  const commApproval = newApprovalsMap.get(ApprovalType.Communications);
  const origCommApproval = originalApprovalsMap.get(ApprovalType.Communications);

  // Set boolean to true if approval exists in array (no validation)
  updater.set('RequiresCommunicationsApproval', !!commApproval, !!origCommApproval);

  if (commApproval) {
    // Validate approver has id before saving (same pattern as other approvers)
    const approverValue = commApproval.approver && commApproval.approver.id ? commApproval.approver : null;
    const origApproverValue = origCommApproval?.approver && origCommApproval.approver.id ? origCommApproval.approver : null;
    updater.set('CommunicationsApprover', approverValue, origApproverValue);
    updater.set('CommunicationsApprovalDate', commApproval.approvalDate, origCommApproval?.approvalDate);
    updater.set('CommunicationsApprovalNotes', commApproval.notes, origCommApproval?.notes);
  } else if (origCommApproval) {
    // Approval was removed - clear the fields
    const origApproverValue = origCommApproval.approver && origCommApproval.approver.id ? origCommApproval.approver : null;
    updater.set('CommunicationsApprover', null, origApproverValue);
    updater.set('CommunicationsApprovalDate', null, origCommApproval.approvalDate);
    updater.set('CommunicationsApprovalNotes', null, origCommApproval.notes);
  }

  // Map Portfolio Manager approval
  const pmApproval = newApprovalsMap.get(ApprovalType.PortfolioManager);
  const origPmApproval = originalApprovalsMap.get(ApprovalType.PortfolioManager);

  updater.set('HasPortfolioManagerApproval', !!pmApproval, !!origPmApproval);

  if (pmApproval) {
    const approverValue = pmApproval.approver && pmApproval.approver.id ? pmApproval.approver : null;
    const origApproverValue = origPmApproval?.approver && origPmApproval.approver.id ? origPmApproval.approver : null;
    updater.set('PortfolioManager', approverValue, origApproverValue);
    updater.set('PortfolioManagerApprovalDate', pmApproval.approvalDate, origPmApproval?.approvalDate);
    updater.set('PortfolioMgrApprovalNotes', pmApproval.notes, origPmApproval?.notes);
  } else if (origPmApproval) {
    updater.set('PortfolioManager', null, origPmApproval.approver);
    updater.set('PortfolioManagerApprovalDate', null, origPmApproval.approvalDate);
    updater.set('PortfolioMgrApprovalNotes', null, origPmApproval.notes);
  }

  // Map Research Analyst approval
  const raApproval = newApprovalsMap.get(ApprovalType.ResearchAnalyst);
  const origRaApproval = originalApprovalsMap.get(ApprovalType.ResearchAnalyst);

  updater.set('HasResearchAnalystApproval', !!raApproval, !!origRaApproval);

  if (raApproval) {
    const approverValue = raApproval.approver && raApproval.approver.id ? raApproval.approver : null;
    const origApproverValue = origRaApproval?.approver && origRaApproval.approver.id ? origRaApproval.approver : null;
    updater.set('ResearchAnalyst', approverValue, origApproverValue);
    updater.set('ResearchAnalystApprovalDate', raApproval.approvalDate, origRaApproval?.approvalDate);
    updater.set('ResearchAnalystApprovalNotes', raApproval.notes, origRaApproval?.notes);
  } else if (origRaApproval) {
    updater.set('ResearchAnalyst', null, origRaApproval.approver);
    updater.set('ResearchAnalystApprovalDate', null, origRaApproval.approvalDate);
    updater.set('ResearchAnalystApprovalNotes', null, origRaApproval.notes);
  }

  // Map Subject Matter Expert approval
  const smeApproval = newApprovalsMap.get(ApprovalType.SubjectMatterExpert);
  const origSmeApproval = originalApprovalsMap.get(ApprovalType.SubjectMatterExpert);

  updater.set('HasSMEApproval', !!smeApproval, !!origSmeApproval);

  if (smeApproval) {
    const approverValue = smeApproval.approver && smeApproval.approver.id ? smeApproval.approver : null;
    const origApproverValue = origSmeApproval?.approver && origSmeApproval.approver.id ? origSmeApproval.approver : null;
    updater.set('SubjectMatterExpert', approverValue, origApproverValue);
    updater.set('SMEApprovalDate', smeApproval.approvalDate, origSmeApproval?.approvalDate);
    updater.set('SMEApprovalNotes', smeApproval.notes, origSmeApproval?.notes);
  } else if (origSmeApproval) {
    updater.set('SubjectMatterExpert', null, origSmeApproval.approver);
    updater.set('SMEApprovalDate', null, origSmeApproval.approvalDate);
    updater.set('SMEApprovalNotes', null, origSmeApproval.notes);
  }

  // Map Performance approval
  const perfApproval = newApprovalsMap.get(ApprovalType.Performance);
  const origPerfApproval = originalApprovalsMap.get(ApprovalType.Performance);

  updater.set('HasPerformanceApproval', !!perfApproval, !!origPerfApproval);

  if (perfApproval) {
    const approverValue = perfApproval.approver && perfApproval.approver.id ? perfApproval.approver : null;
    const origApproverValue = origPerfApproval?.approver && origPerfApproval.approver.id ? origPerfApproval.approver : null;
    updater.set('PerformanceApprover', approverValue, origApproverValue);
    updater.set('PerformanceApprovalDate', perfApproval.approvalDate, origPerfApproval?.approvalDate);
    updater.set('PerformanceApprovalNotes', perfApproval.notes, origPerfApproval?.notes);
  } else if (origPerfApproval) {
    updater.set('PerformanceApprover', null, origPerfApproval.approver);
    updater.set('PerformanceApprovalDate', null, origPerfApproval.approvalDate);
    updater.set('PerformanceApprovalNotes', null, origPerfApproval.notes);
  }

  // Map Other approval
  const otherApproval = newApprovalsMap.get(ApprovalType.Other);
  const origOtherApproval = originalApprovalsMap.get(ApprovalType.Other);

  updater.set('HasOtherApproval', !!otherApproval, !!origOtherApproval);

  if (otherApproval) {
    const approverValue = otherApproval.approver && otherApproval.approver.id ? otherApproval.approver : null;
    const origApproverValue = origOtherApproval?.approver && origOtherApproval.approver.id ? origOtherApproval.approver : null;
    updater.set('OtherApproval', approverValue, origApproverValue);
    updater.set('OtherApprovalDate', otherApproval.approvalDate, origOtherApproval?.approvalDate);
    updater.set('OtherApprovalNotes', otherApproval.notes, origOtherApproval?.notes);
    // Other approval has a custom title field
    const otherTyped = otherApproval as any;
    const origOtherTyped = origOtherApproval as any;
    updater.set('OtherApprovalTitle', otherTyped.approvalTitle, origOtherTyped?.approvalTitle);
  } else if (origOtherApproval) {
    updater.set('OtherApproval', null, origOtherApproval.approver);
    updater.set('OtherApprovalDate', null, origOtherApproval.approvalDate);
    updater.set('OtherApprovalNotes', null, origOtherApproval.notes);
    const origOtherTyped = origOtherApproval as any;
    updater.set('OtherApprovalTitle', null, origOtherTyped?.approvalTitle);
  }
}
