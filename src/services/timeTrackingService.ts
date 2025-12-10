/**
 * Time Tracking Service
 *
 * Handles business hours calculation and time tracking updates for workflow stages.
 * Tracks time spent by reviewers vs submitters at each stage (Legal Review, Compliance Review, Closeout).
 *
 * @module services/timeTrackingService
 */

import { SPContext } from 'spfx-toolkit';
import type { ILegalRequest, TimeTrackingOwner, TimeTrackingStage } from '../types/requestTypes';
import { calculateBusinessHours } from '../utils/businessHoursCalculator';
import { getWorkingHoursConfig } from './configurationService';

/**
 * Calculates and updates time tracking for a stage handoff
 *
 * @param request - Current request data
 * @param stage - Workflow stage (LegalReview, ComplianceReview, Closeout)
 * @param newOwner - New owner after handoff
 * @returns Partial request update with calculated hours
 *
 * @remarks
 * This function:
 * 1. Derives current owner from status fields (e.g., legalReviewStatus)
 * 2. Gets last handoff date from status update timestamp (e.g., legalStatusUpdatedOn)
 * 3. Calculates business hours since last handoff
 * 4. Adds hours to the appropriate bucket (reviewer or submitter)
 * 5. Recalculates totals
 *
 * IMPORTANT: This function does NOT update status fields or timestamps.
 * The caller must update the status field (e.g., legalReviewStatus = "Waiting On Submitter")
 * and timestamp (e.g., legalStatusUpdatedOn = now) to reflect the handoff.
 *
 * @example
 * ```typescript
 * // Attorney sends request to submitter
 * const updates = await calculateAndUpdateStageTime(
 *   currentRequest,
 *   'LegalReview',
 *   'Submitter'
 * );
 *
 * // updates will contain:
 * // {
 * //   legalReviewAttorneyHours: 4.5, // Added hours since last handoff
 * //   totalReviewerHours: 4.5
 * // }
 * //
 * // Caller must also update:
 * // {
 * //   legalReviewStatus: 'Waiting On Submitter',
 * //   legalStatusUpdatedOn: new Date()
 * // }
 * ```
 */
export async function calculateAndUpdateStageTime(
  request: ILegalRequest,
  stage: TimeTrackingStage,
  newOwner: TimeTrackingOwner
): Promise<Partial<ILegalRequest>> {
  try {
    SPContext.logger.info('Calculating stage time for handoff', {
      requestId: request.id,
      stage,
      newOwner,
    });

    const now = new Date();
    const updates: Partial<ILegalRequest> = {};

    // Get current owner and last handoff date
    const currentOwner = getStageCurrentOwner(request, stage);
    const lastHandoffDate = getStageLastHandoffDate(request, stage);

    // Calculate hours if there's a previous handoff
    if (lastHandoffDate && currentOwner) {
      const config = await getWorkingHoursConfig();
      const hours = calculateBusinessHours(lastHandoffDate, now, config);

      SPContext.logger.info('Calculated business hours', {
        requestId: request.id,
        stage,
        currentOwner,
        hours,
        from: lastHandoffDate,
        to: now,
      });

      // Add hours to appropriate field
      addHoursToStage(updates, request, stage, currentOwner, hours);
    }

    // NOTE: Owner and handoff date are no longer set here.
    // The status fields (e.g., legalReviewStatus) and their update timestamps
    // (e.g., legalStatusUpdatedOn) must be updated by the caller to reflect
    // the handoff. The getStageCurrentOwner() function will derive ownership
    // from those status values.

    // Recalculate totals
    calculateTotals(updates, request);

    SPContext.logger.info('Stage time tracking updated', {
      requestId: request.id,
      stage,
      newOwner,
      updates,
    });

    return updates;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('Failed to calculate stage time', error, {
      requestId: request.id,
      stage,
      newOwner,
      error: message,
    });
    throw new Error(`Failed to calculate stage time: ${message}`);
  }
}

/**
 * Pauses time tracking when request is put on hold
 *
 * @param request - Current request data
 * @returns Partial request update with finalized hours up to now
 *
 * @remarks
 * This function calculates and saves hours up to the moment the request is put on hold.
 * It clears the current owner and last handoff date so time doesn't continue accumulating.
 *
 * @example
 * ```typescript
 * // Request is being put on hold
 * const updates = await pauseTimeTracking(currentRequest);
 *
 * // updates will contain finalized hours and cleared tracking fields
 * ```
 */
export async function pauseTimeTracking(request: ILegalRequest): Promise<Partial<ILegalRequest>> {
  try {
    SPContext.logger.info('Pausing time tracking (On Hold)', { requestId: request.id });

    const now = new Date();
    const updates: Partial<ILegalRequest> = {};
    const config = await getWorkingHoursConfig();

    // Finalize all active stage tracking
    const stages: TimeTrackingStage[] = ['LegalIntake', 'LegalReview', 'ComplianceReview', 'Closeout'];

    for (const stage of stages) {
      const currentOwner = getStageCurrentOwner(request, stage);
      const lastHandoffDate = getStageLastHandoffDate(request, stage);

      if (currentOwner && lastHandoffDate) {
        // Calculate and save hours up to now
        const hours = calculateBusinessHours(lastHandoffDate, now, config);
        addHoursToStage(updates, request, stage, currentOwner, hours);

        // NOTE: Owner and handoff date are no longer cleared here.
        // When the request is put on hold, the status fields remain unchanged.
        // Time tracking will resume from the status update timestamp when resumed.

        SPContext.logger.info('Finalized stage hours for hold', {
          requestId: request.id,
          stage,
          currentOwner,
          hours,
        });
      }
    }

    // Recalculate totals
    calculateTotals(updates, request);

    SPContext.logger.info('Time tracking paused', { requestId: request.id, updates });

    return updates;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('Failed to pause time tracking', error, {
      requestId: request.id,
      error: message,
    });
    throw new Error(`Failed to pause time tracking: ${message}`);
  }
}

/**
 * Resumes time tracking when request is resumed from hold
 *
 * @param request - Current request data
 * @param resumedStatus - Status being resumed to
 * @returns Partial request update with reset tracking fields
 *
 * @remarks
 * This function resets the last handoff date to now and sets the current owner
 * based on the resumed status. Time tracking resumes from this moment.
 *
 * @example
 * ```typescript
 * // Request is being resumed to Legal Review
 * const updates = await resumeTimeTracking(currentRequest, 'In Review');
 *
 * // updates will contain:
 * // {
 * //   legalReviewCurrentOwner: 'Attorney',
 * //   legalReviewLastHandoffDate: new Date()
 * // }
 * ```
 */
export async function resumeTimeTracking(
  request: ILegalRequest,
  resumedStatus: string
): Promise<Partial<ILegalRequest>> {
  try {
    SPContext.logger.info('Resuming time tracking', { requestId: request.id, resumedStatus });

    const updates: Partial<ILegalRequest> = {};

    // NOTE: Time tracking resumes automatically when status fields are updated by the caller.
    // When the caller updates the review status (e.g., legalReviewStatus = "In Progress")
    // and sets the status update timestamp (e.g., legalStatusUpdatedOn = now), the
    // getStageCurrentOwner() and getStageLastHandoffDate() functions will automatically
    // derive the correct owner and handoff date from those status values.
    //
    // No explicit tracking fields need to be set here.

    SPContext.logger.info('Time tracking resumed', { requestId: request.id, updates });

    return updates;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('Failed to resume time tracking', error, {
      requestId: request.id,
      error: message,
    });
    throw new Error(`Failed to resume time tracking: ${message}`);
  }
}

/**
 * Gets the current owner of a stage based on review status
 *
 * @param request - Request data
 * @param stage - Workflow stage
 * @returns Current owner or undefined
 *
 * @remarks
 * Ownership is now derived from status fields instead of dedicated owner fields:
 * - LegalReview: "In Progress"/"Waiting On Attorney" → Attorney; "Waiting On Submitter" → Submitter
 * - ComplianceReview: "In Progress"/"Waiting On Compliance" → Reviewer; "Waiting On Submitter" → Submitter
 * - Closeout: Always → Reviewer
 * - LegalIntake: Legal Admin (not status-based yet)
 */
export function getStageCurrentOwner(
  request: ILegalRequest,
  stage: TimeTrackingStage
): TimeTrackingOwner | undefined {
  switch (stage) {
    case 'LegalIntake':
      // Legal Intake doesn't have status-based owner tracking yet
      return undefined;

    case 'LegalReview':
      if (request.legalReviewStatus === 'In Progress' || request.legalReviewStatus === 'Waiting On Attorney') {
        return 'Attorney';
      } else if (request.legalReviewStatus === 'Waiting On Submitter') {
        return 'Submitter';
      }
      return undefined;

    case 'ComplianceReview':
      if (request.complianceReviewStatus === 'In Progress' || request.complianceReviewStatus === 'Waiting On Compliance') {
        return 'Reviewer';
      } else if (request.complianceReviewStatus === 'Waiting On Submitter') {
        return 'Submitter';
      }
      return undefined;

    case 'Closeout':
      // Closeout is always owned by reviewer (simple case)
      return 'Reviewer';

    default:
      return undefined;
  }
}

/**
 * Gets the last handoff date for a stage based on status update timestamps
 *
 * @param request - Request data
 * @param stage - Workflow stage
 * @returns Last handoff date or undefined
 *
 * @remarks
 * Handoff dates are now derived from status update timestamps instead of dedicated handoff fields:
 * - LegalIntake: submittedOn (start of legal intake)
 * - LegalReview: legalStatusUpdatedOn (status change = handoff)
 * - ComplianceReview: complianceStatusUpdatedOn (status change = handoff)
 * - Closeout: closeoutOn (when closeout started)
 */
export function getStageLastHandoffDate(
  request: ILegalRequest,
  stage: TimeTrackingStage
): Date | undefined {
  switch (stage) {
    case 'LegalIntake':
      // Use submittedOn as start of Legal Intake
      return request.submittedOn;

    case 'LegalReview':
      // Status change timestamp = handoff
      return request.legalStatusUpdatedOn;

    case 'ComplianceReview':
      // Status change timestamp = handoff
      return request.complianceStatusUpdatedOn;

    case 'Closeout':
      // Use closeoutOn, or fall back to when last review completed
      return request.closeoutOn || request.complianceReviewCompletedOn || request.legalReviewCompletedOn;

    default:
      return undefined;
  }
}

/**
 * Adds calculated hours to the appropriate stage field
 *
 * @param updates - Updates object to modify
 * @param request - Current request data
 * @param stage - Workflow stage
 * @param owner - Owner who accumulated the hours
 * @param hours - Hours to add
 */
function addHoursToStage(
  updates: Partial<ILegalRequest>,
  request: ILegalRequest,
  stage: TimeTrackingStage,
  owner: TimeTrackingOwner,
  hours: number
): void {
  const isSubmitter = owner === 'Submitter';

  switch (stage) {
    case 'LegalIntake':
      if (isSubmitter) {
        updates.legalIntakeSubmitterHours = (request.legalIntakeSubmitterHours || 0) + hours;
      } else {
        updates.legalIntakeLegalAdminHours = (request.legalIntakeLegalAdminHours || 0) + hours;
      }
      break;

    case 'LegalReview':
      if (isSubmitter) {
        updates.legalReviewSubmitterHours = (request.legalReviewSubmitterHours || 0) + hours;
      } else {
        updates.legalReviewAttorneyHours = (request.legalReviewAttorneyHours || 0) + hours;
      }
      break;

    case 'ComplianceReview':
      if (isSubmitter) {
        updates.complianceReviewSubmitterHours = (request.complianceReviewSubmitterHours || 0) + hours;
      } else {
        updates.complianceReviewReviewerHours = (request.complianceReviewReviewerHours || 0) + hours;
      }
      break;

    case 'Closeout':
      if (isSubmitter) {
        updates.closeoutSubmitterHours = (request.closeoutSubmitterHours || 0) + hours;
      } else {
        updates.closeoutReviewerHours = (request.closeoutReviewerHours || 0) + hours;
      }
      break;
  }
}

/**
 * REMOVED: setStageOwnerAndDate() function
 *
 * This function has been removed because ownership and handoff dates are now
 * derived from status fields rather than stored in dedicated fields.
 *
 * The status fields (legalReviewStatus, complianceReviewStatus) and their
 * update timestamps (legalStatusUpdatedOn, complianceStatusUpdatedOn) are
 * now managed by the caller (typically requestSaveService).
 */

/**
 * Calculates total hours across all stages
 *
 * @param updates - Updates object to modify
 * @param request - Current request data
 */
function calculateTotals(updates: Partial<ILegalRequest>, request: ILegalRequest): void {
  // Calculate total reviewer hours (legal admin + attorney + compliance + closeout)
  const legalAdminHours = updates.legalIntakeLegalAdminHours ?? request.legalIntakeLegalAdminHours ?? 0;
  const attorneyHours = updates.legalReviewAttorneyHours ?? request.legalReviewAttorneyHours ?? 0;
  const complianceHours = updates.complianceReviewReviewerHours ?? request.complianceReviewReviewerHours ?? 0;
  const closeoutHours = updates.closeoutReviewerHours ?? request.closeoutReviewerHours ?? 0;

  updates.totalReviewerHours = legalAdminHours + attorneyHours + complianceHours + closeoutHours;

  // Calculate total submitter hours across all stages
  const legalIntakeSubmitterHours = updates.legalIntakeSubmitterHours ?? request.legalIntakeSubmitterHours ?? 0;
  const legalReviewSubmitterHours = updates.legalReviewSubmitterHours ?? request.legalReviewSubmitterHours ?? 0;
  const complianceSubmitterHours =
    updates.complianceReviewSubmitterHours ?? request.complianceReviewSubmitterHours ?? 0;
  const closeoutSubmitterHours = updates.closeoutSubmitterHours ?? request.closeoutSubmitterHours ?? 0;

  updates.totalSubmitterHours =
    legalIntakeSubmitterHours + legalReviewSubmitterHours + complianceSubmitterHours + closeoutSubmitterHours;

  // Round to 1 decimal place
  updates.totalReviewerHours = Math.round(updates.totalReviewerHours * 10) / 10;
  updates.totalSubmitterHours = Math.round(updates.totalSubmitterHours * 10) / 10;
}
