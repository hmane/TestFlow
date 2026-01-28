/**
 * SuperAdminPanel Component
 *
 * A powerful administrative override panel for system admins.
 * Provides the ability to override workflow states, reassign attorneys,
 * modify review outcomes, and reopen completed requests.
 *
 * Design: "Command Center" aesthetic - industrial, dark theme with amber accents
 * conveying power and responsibility.
 */

import * as React from 'react';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { DefaultButton, PrimaryButton, IconButton } from '@fluentui/react/lib/Button';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { TextField } from '@fluentui/react/lib/TextField';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Icon } from '@fluentui/react/lib/Icon';
import { Stack } from '@fluentui/react/lib/Stack';
import { Separator } from '@fluentui/react/lib/Separator';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { RequestStatus, ReviewOutcome, ReviewAudience, LegalReviewStatus, ComplianceReviewStatus } from '@appTypes/workflowTypes';
import { useRequestStore } from '@stores/index';
import { useShallow } from 'zustand/react/shallow';
import { usePermissions } from '@hooks/usePermissions';
import './SuperAdminPanel.scss';

/**
 * Super Admin action types
 */
export type SuperAdminAction =
  | 'changeStatus'
  | 'overrideAttorney'
  | 'overrideReviewAudience'
  | 'overrideLegalReview'
  | 'overrideComplianceReview'
  | 'overrideComplianceFlags'
  | 'reopenRequest'
  | 'clearField';

/**
 * Props for SuperAdminPanel
 */
export interface ISuperAdminPanelProps {
  isOpen: boolean;
  onDismiss: () => void;
  onActionComplete?: (action: SuperAdminAction, success: boolean) => void;
}

/**
 * Confirmation dialog state
 */
interface IConfirmationState {
  isOpen: boolean;
  action: SuperAdminAction | undefined;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Status options for override - includes ALL workflow statuses
 */
const STATUS_OPTIONS: IDropdownOption[] = [
  { key: RequestStatus.Draft, text: 'Draft' },
  { key: RequestStatus.LegalIntake, text: 'Legal Intake' },
  { key: RequestStatus.AssignAttorney, text: 'Assign Attorney' },
  { key: RequestStatus.InReview, text: 'In Review' },
  { key: RequestStatus.Closeout, text: 'Closeout' },
  { key: RequestStatus.AwaitingFINRADocuments, text: 'Awaiting FINRA Documents' },
  { key: RequestStatus.Completed, text: 'Completed' },
  { key: RequestStatus.Cancelled, text: 'Cancelled' },
  { key: RequestStatus.OnHold, text: 'On Hold' },
];

/**
 * Review outcome options
 */
const REVIEW_OUTCOME_OPTIONS: IDropdownOption[] = [
  { key: '', text: '-- Clear Outcome --' },
  { key: ReviewOutcome.Approved, text: 'Approved' },
  { key: ReviewOutcome.ApprovedWithComments, text: 'Approved with Comments' },
  { key: ReviewOutcome.RespondToCommentsAndResubmit, text: 'Respond to Comments and Resubmit' },
  { key: ReviewOutcome.NotApproved, text: 'Not Approved' },
];

/**
 * Legal review status options - uses enum values for consistency
 */
const LEGAL_REVIEW_STATUS_OPTIONS: IDropdownOption[] = [
  { key: '', text: '-- Clear Status --' },
  { key: LegalReviewStatus.NotRequired, text: 'Not Required' },
  { key: LegalReviewStatus.NotStarted, text: 'Not Started' },
  { key: LegalReviewStatus.InProgress, text: 'In Progress' },
  { key: LegalReviewStatus.WaitingOnSubmitter, text: 'Waiting On Submitter' },
  { key: LegalReviewStatus.WaitingOnAttorney, text: 'Waiting On Attorney' },
  { key: LegalReviewStatus.Completed, text: 'Completed' },
];

/**
 * Compliance review status options - uses enum values for consistency
 */
const COMPLIANCE_REVIEW_STATUS_OPTIONS: IDropdownOption[] = [
  { key: '', text: '-- Clear Status --' },
  { key: ComplianceReviewStatus.NotRequired, text: 'Not Required' },
  { key: ComplianceReviewStatus.NotStarted, text: 'Not Started' },
  { key: ComplianceReviewStatus.InProgress, text: 'In Progress' },
  { key: ComplianceReviewStatus.WaitingOnSubmitter, text: 'Waiting On Submitter' },
  { key: ComplianceReviewStatus.WaitingOnCompliance, text: 'Waiting On Compliance' },
  { key: ComplianceReviewStatus.Completed, text: 'Completed' },
];

/**
 * Review audience options for override
 */
const REVIEW_AUDIENCE_OPTIONS: IDropdownOption[] = [
  { key: ReviewAudience.Legal, text: 'Legal Only' },
  { key: ReviewAudience.Compliance, text: 'Compliance Only' },
  { key: ReviewAudience.Both, text: 'Both Legal & Compliance' },
];

/**
 * SuperAdminPanel Component
 */
export const SuperAdminPanel: React.FC<ISuperAdminPanelProps> = ({
  isOpen,
  onDismiss,
  onActionComplete,
}) => {
  const {
    currentRequest,
    adminOverrideStatus,
    adminClearAttorney,
    adminOverrideReviewAudience,
    adminOverrideLegalReview,
    adminOverrideComplianceReview,
    adminOverrideComplianceFlags,
    adminReopenRequest,
  } = useRequestStore(
    useShallow((s) => ({
      currentRequest: s.currentRequest,
      adminOverrideStatus: s.adminOverrideStatus,
      adminClearAttorney: s.adminClearAttorney,
      adminOverrideReviewAudience: s.adminOverrideReviewAudience,
      adminOverrideLegalReview: s.adminOverrideLegalReview,
      adminOverrideComplianceReview: s.adminOverrideComplianceReview,
      adminOverrideComplianceFlags: s.adminOverrideComplianceFlags,
      adminReopenRequest: s.adminReopenRequest,
    }))
  );
  const permissions = usePermissions();

  // State
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [actionReason, setActionReason] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>();
  const [successMessage, setSuccessMessage] = React.useState<string | undefined>();

  // Override values
  const [selectedStatus, setSelectedStatus] = React.useState<string | undefined>();
  const [selectedReviewAudience, setSelectedReviewAudience] = React.useState<string | undefined>();
  const [selectedLegalOutcome, setSelectedLegalOutcome] = React.useState<string | undefined>();
  const [selectedLegalStatus, setSelectedLegalStatus] = React.useState<string | undefined>();
  const [selectedComplianceOutcome, setSelectedComplianceOutcome] = React.useState<string | undefined>();
  const [selectedComplianceStatus, setSelectedComplianceStatus] = React.useState<string | undefined>();
  const [clearAttorney, setClearAttorney] = React.useState(false);
  // Compliance flags
  const [isForesideRequired, setIsForesideRequired] = React.useState<boolean | undefined>();
  const [isRetailUse, setIsRetailUse] = React.useState<boolean | undefined>();

  // Confirmation dialog
  const [confirmation, setConfirmation] = React.useState<IConfirmationState>({
    isOpen: false,
    action: undefined,
    title: '',
    message: '',
  });

  /**
   * Clear messages after delay
   */
  React.useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(undefined), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  /**
   * Reset form when panel opens
   */
  React.useEffect(() => {
    if (isOpen) {
      setSelectedStatus(undefined);
      setSelectedReviewAudience(undefined);
      setSelectedLegalOutcome(undefined);
      setSelectedLegalStatus(undefined);
      setSelectedComplianceOutcome(undefined);
      setSelectedComplianceStatus(undefined);
      setClearAttorney(false);
      setIsForesideRequired(undefined);
      setIsRetailUse(undefined);
      setActionReason('');
      setErrorMessage(undefined);
      setSuccessMessage(undefined);
    }
  }, [isOpen]);

  // Only admin can access - must be AFTER all hooks
  if (!permissions.isAdmin) {
    return null;
  }

  /**
   * Handle status change override
   */
  const handleStatusChange = async (status: string): Promise<void> => {
    if (!currentRequest?.id) return;

    SPContext.logger.warn('ADMIN OVERRIDE: Status change', {
      requestId: currentRequest.requestId,
      fromStatus: currentRequest.status,
      toStatus: status,
      reason: actionReason,
      adminUser: SPContext.currentUser?.email,
    });

    await adminOverrideStatus(status as RequestStatus, actionReason);
  };

  /**
   * Handle attorney override (clear)
   */
  const handleAttorneyOverride = async (): Promise<void> => {
    if (!currentRequest?.id) return;

    SPContext.logger.warn('ADMIN OVERRIDE: Attorney cleared', {
      requestId: currentRequest.requestId,
      previousAttorney: currentRequest.attorney?.title,
      reason: actionReason,
      adminUser: SPContext.currentUser?.email,
    });

    await adminClearAttorney(actionReason);
  };

  /**
   * Handle review audience override
   */
  const handleReviewAudienceOverride = async (audience: string): Promise<void> => {
    if (!currentRequest?.id) return;

    SPContext.logger.warn('ADMIN OVERRIDE: Review audience changed', {
      requestId: currentRequest.requestId,
      previousAudience: currentRequest.reviewAudience,
      newAudience: audience,
      reason: actionReason,
      adminUser: SPContext.currentUser?.email,
    });

    await adminOverrideReviewAudience(audience as ReviewAudience, actionReason);
  };

  /**
   * Handle legal review override
   */
  const handleLegalReviewOverride = async (data?: Record<string, unknown>): Promise<void> => {
    if (!currentRequest?.id) return;

    SPContext.logger.warn('ADMIN OVERRIDE: Legal review modified', {
      requestId: currentRequest.requestId,
      newOutcome: data?.outcome,
      newStatus: data?.status,
      reason: actionReason,
      adminUser: SPContext.currentUser?.email,
    });

    await adminOverrideLegalReview(
      data?.outcome as string | undefined,
      data?.status as string | undefined,
      actionReason
    );
  };

  /**
   * Handle compliance review override
   */
  const handleComplianceReviewOverride = async (data?: Record<string, unknown>): Promise<void> => {
    if (!currentRequest?.id) return;

    SPContext.logger.warn('ADMIN OVERRIDE: Compliance review modified', {
      requestId: currentRequest.requestId,
      newOutcome: data?.outcome,
      newStatus: data?.status,
      reason: actionReason,
      adminUser: SPContext.currentUser?.email,
    });

    await adminOverrideComplianceReview(
      data?.outcome as string | undefined,
      data?.status as string | undefined,
      actionReason
    );
  };

  /**
   * Handle compliance flags override
   */
  const handleComplianceFlagsOverride = async (data?: Record<string, unknown>): Promise<void> => {
    if (!currentRequest?.id) return;

    SPContext.logger.warn('ADMIN OVERRIDE: Compliance flags modified', {
      requestId: currentRequest.requestId,
      isForesideRequired: data?.isForesideRequired,
      isRetailUse: data?.isRetailUse,
      reason: actionReason,
      adminUser: SPContext.currentUser?.email,
    });

    await adminOverrideComplianceFlags(
      data?.isForesideRequired as boolean | undefined,
      data?.isRetailUse as boolean | undefined,
      actionReason
    );
  };

  /**
   * Handle reopen request
   */
  const handleReopenRequest = async (): Promise<void> => {
    if (!currentRequest?.id) return;

    SPContext.logger.warn('ADMIN OVERRIDE: Request reopened', {
      requestId: currentRequest.requestId,
      previousStatus: currentRequest.status,
      reason: actionReason,
      adminUser: SPContext.currentUser?.email,
    });

    await adminReopenRequest(actionReason);
  };

  /**
   * Show confirmation dialog
   */
  const showConfirmation = (
    action: SuperAdminAction,
    title: string,
    message: string,
    data?: Record<string, unknown>
  ): void => {
    if (!actionReason.trim()) {
      setErrorMessage('A reason is required for all administrative overrides');
      return;
    }
    setConfirmation({ isOpen: true, action, title, message, data });
  };

  /**
   * Handle confirmation
   */
  const handleConfirm = async (): Promise<void> => {
    const { action, data } = confirmation;
    if (!action) return;

    setConfirmation(prev => ({ ...prev, isOpen: false }));
    setIsProcessing(true);
    setErrorMessage(undefined);

    try {
      switch (action) {
        case 'changeStatus':
          await handleStatusChange(data?.status as string);
          break;
        case 'overrideAttorney':
          await handleAttorneyOverride();
          break;
        case 'overrideReviewAudience':
          await handleReviewAudienceOverride(data?.audience as string);
          break;
        case 'overrideLegalReview':
          await handleLegalReviewOverride(data);
          break;
        case 'overrideComplianceReview':
          await handleComplianceReviewOverride(data);
          break;
        case 'overrideComplianceFlags':
          await handleComplianceFlagsOverride(data);
          break;
        case 'reopenRequest':
          await handleReopenRequest();
          break;
      }

      setSuccessMessage(`Action completed successfully. Reason logged: "${actionReason}"`);
      setActionReason('');
      onActionComplete?.(action, true);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      setErrorMessage(message);
      onActionComplete?.(action, false);
      SPContext.logger.error('SuperAdminPanel: Action failed', error, { action });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Render panel header
   */
  const onRenderHeader = (): JSX.Element => (
    <div className="super-admin-panel__header">
      <div className="super-admin-panel__header-content">
        <div className="super-admin-panel__header-icon">
          <Icon iconName="Settings" />
        </div>
        <div className="super-admin-panel__header-text">
          <h2 className="super-admin-panel__title">Administrative Override</h2>
          <p className="super-admin-panel__subtitle">Admin Panel</p>
        </div>
      </div>
      <IconButton
        iconProps={{ iconName: 'Cancel' }}
        onClick={onDismiss}
        ariaLabel="Close panel"
        className="super-admin-panel__close-btn"
      />
    </div>
  );

  /**
   * Render panel footer
   */
  const onRenderFooter = (): JSX.Element => (
    <div className="super-admin-panel__footer">
      <div className="super-admin-panel__footer-warning">
        <Icon iconName="Warning" />
        <span>All actions are logged for audit compliance</span>
      </div>
    </div>
  );

  // Get current request info
  const currentStatus = currentRequest?.status || 'Unknown';
  const currentAttorney = currentRequest?.attorney?.title || 'Not assigned';
  const currentReviewAudience = currentRequest?.reviewAudience || ReviewAudience.Both;
  const currentLegalOutcome = currentRequest?.legalReview?.outcome || currentRequest?.legalReviewOutcome || 'Not reviewed';
  const currentComplianceOutcome = currentRequest?.complianceReview?.outcome || currentRequest?.complianceReviewOutcome || 'Not reviewed';
  const isTerminalStatus = currentStatus === RequestStatus.Completed || currentStatus === RequestStatus.Cancelled;

  // Check if review audience includes legal or compliance
  const isLegalRequired = currentReviewAudience === ReviewAudience.Legal || currentReviewAudience === ReviewAudience.Both;
  const isComplianceRequired = currentReviewAudience === ReviewAudience.Compliance || currentReviewAudience === ReviewAudience.Both;

  // Determine which sections to show based on current status
  // Status override is always available (including terminal statuses for reopening)
  const showStatusOverride = true;
  // Attorney override available during intake, assignment, and review phases
  const showAttorneyOverride = [
    RequestStatus.LegalIntake,
    RequestStatus.AssignAttorney,
    RequestStatus.InReview,
  ].includes(currentStatus as RequestStatus);
  // Review audience override available during intake, assignment, and review phases
  const showReviewAudienceOverride = [
    RequestStatus.LegalIntake,
    RequestStatus.AssignAttorney,
    RequestStatus.InReview,
  ].includes(currentStatus as RequestStatus);
  // Review overrides only available when reviews are in progress or closeout, AND audience includes that review type
  const showLegalReviewOverride = [
    RequestStatus.InReview,
    RequestStatus.Closeout,
  ].includes(currentStatus as RequestStatus) && isLegalRequired;
  const showComplianceReviewOverride = [
    RequestStatus.InReview,
    RequestStatus.Closeout,
  ].includes(currentStatus as RequestStatus) && isComplianceRequired;

  return (
    <>
      <Panel
        isOpen={isOpen}
        onDismiss={onDismiss}
        type={PanelType.medium}
        hasCloseButton={false}
        onRenderHeader={onRenderHeader}
        onRenderFooter={onRenderFooter}
        className="super-admin-panel"
        isBlocking={true}
        layerProps={{ eventBubblingEnabled: true }}
      >
        <div className="super-admin-panel__content">
          {/* Warning Banner */}
          <div className="super-admin-panel__warning-banner">
            <Icon iconName="ShieldAlert" className="super-admin-panel__warning-icon" />
            <div className="super-admin-panel__warning-text">
              <strong>Administrative Override Mode</strong>
              <p>Actions taken here bypass normal workflow rules. All changes are permanently logged with your identity and reason provided.</p>
            </div>
          </div>

          {/* Messages */}
          {errorMessage && (
            <MessageBar
              messageBarType={MessageBarType.error}
              onDismiss={() => setErrorMessage(undefined)}
              className="super-admin-panel__message"
            >
              {errorMessage}
            </MessageBar>
          )}

          {successMessage && (
            <MessageBar
              messageBarType={MessageBarType.success}
              onDismiss={() => setSuccessMessage(undefined)}
              className="super-admin-panel__message super-admin-panel__message--success"
            >
              {successMessage}
            </MessageBar>
          )}

          {/* Current State Display */}
          <div className="super-admin-panel__status-display">
            <div className="super-admin-panel__status-item">
              <span className="super-admin-panel__status-label">Request ID</span>
              <span className="super-admin-panel__status-value">{currentRequest?.requestId || 'N/A'}</span>
            </div>
            <div className="super-admin-panel__status-item">
              <span className="super-admin-panel__status-label">Current Status</span>
              <span className={`super-admin-panel__status-value super-admin-panel__status-value--${currentStatus.toLowerCase().replace(/\s/g, '-')}`}>
                {currentStatus}
              </span>
            </div>
            <div className="super-admin-panel__status-item">
              <span className="super-admin-panel__status-label">Review Audience</span>
              <span className="super-admin-panel__status-value">{currentReviewAudience}</span>
            </div>
            <div className="super-admin-panel__status-item">
              <span className="super-admin-panel__status-label">Assigned Attorney</span>
              <span className="super-admin-panel__status-value">{currentAttorney}</span>
            </div>
            {/* Show review statuses if audience includes them */}
            {isLegalRequired && (
              <div className="super-admin-panel__status-item">
                <span className="super-admin-panel__status-label">Legal Review</span>
                <span className="super-admin-panel__status-value">
                  {currentRequest?.legalReviewStatus || 'Not Set'} / {currentLegalOutcome}
                </span>
              </div>
            )}
            {isComplianceRequired && (
              <div className="super-admin-panel__status-item">
                <span className="super-admin-panel__status-label">Compliance Review</span>
                <span className="super-admin-panel__status-value">
                  {currentRequest?.complianceReviewStatus || 'Not Set'} / {currentComplianceOutcome}
                </span>
              </div>
            )}
          </div>

          {/* Reason Field - Required for all actions */}
          <div className="super-admin-panel__reason-section">
            <TextField
              label="Override Reason (Required)"
              placeholder="Enter a detailed reason for this administrative action..."
              multiline
              rows={3}
              value={actionReason}
              onChange={(_, value) => setActionReason(value || '')}
              required
              className="super-admin-panel__reason-field"
              description="This reason will be logged in the audit trail"
            />
          </div>

          <Separator className="super-admin-panel__separator" />

          {/* Override Sections */}
          <div className="super-admin-panel__sections">

            {/* Status Override - available for all statuses including completed/cancelled */}
            {showStatusOverride && (
              <div className={`super-admin-panel__section ${isTerminalStatus ? 'super-admin-panel__section--highlight' : ''}`}>
                <div className="super-admin-panel__section-header">
                  <Icon iconName="StatusCircleSync" className="super-admin-panel__section-icon" />
                  <h3>{isTerminalStatus ? 'Change Request Status' : 'Override Status'}</h3>
                </div>
                <p className="super-admin-panel__section-desc">
                  {isTerminalStatus
                    ? `This request is ${currentStatus.toLowerCase()}. Select a new status to reopen or move it to a different workflow stage.`
                    : 'Force the request to any workflow status, bypassing normal transition rules.'}
                </p>
                <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign="end">
                  <Dropdown
                    placeholder="Select new status"
                    options={STATUS_OPTIONS}
                    selectedKey={selectedStatus}
                    onChange={(_, option) => setSelectedStatus(option?.key as string)}
                    className="super-admin-panel__dropdown"
                    disabled={isProcessing}
                    styles={{ root: { flexGrow: 1 } }}
                  />
                  <PrimaryButton
                    text="Apply"
                    iconProps={{ iconName: 'CheckMark' }}
                    onClick={() => showConfirmation(
                      'changeStatus',
                      'Confirm Status Change',
                      `Change request status from "${currentStatus}" to "${selectedStatus}"?`,
                      { status: selectedStatus }
                    )}
                    disabled={!selectedStatus || selectedStatus === currentStatus || isProcessing}
                    className="super-admin-panel__action-btn"
                  />
                </Stack>
              </div>
            )}

            {/* Attorney Override - available during intake, assignment, and review */}
            {showAttorneyOverride && (
              <div className="super-admin-panel__section">
                <div className="super-admin-panel__section-header">
                  <Icon iconName="Contact" className="super-admin-panel__section-icon" />
                  <h3>Override Attorney Assignment</h3>
                </div>
                <p className="super-admin-panel__section-desc">
                  Clear the assigned attorney to allow reassignment.
                </p>
                <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign="center">
                  <Toggle
                    label="Clear current attorney"
                    checked={clearAttorney}
                    onChange={(_, checked) => setClearAttorney(checked || false)}
                    disabled={isProcessing || !currentRequest?.attorney}
                    onText="Yes, clear attorney"
                    offText="No"
                  />
                  <DefaultButton
                    text="Clear Attorney"
                    iconProps={{ iconName: 'UserRemove' }}
                    onClick={() => showConfirmation(
                      'overrideAttorney',
                      'Confirm Clear Attorney',
                      `Remove "${currentAttorney}" as the assigned attorney?`,
                      {}
                    )}
                    disabled={!clearAttorney || !currentRequest?.attorney || isProcessing}
                    className="super-admin-panel__action-btn super-admin-panel__action-btn--warning"
                  />
                </Stack>
              </div>
            )}

            {/* Review Audience Override - available during intake, assignment, and review */}
            {showReviewAudienceOverride && (
              <div className="super-admin-panel__section">
                <div className="super-admin-panel__section-header">
                  <Icon iconName="People" className="super-admin-panel__section-icon" />
                  <h3>Override Review Audience</h3>
                </div>
                <p className="super-admin-panel__section-desc">
                  Change which review teams are required. Current: <strong>{currentReviewAudience}</strong>
                </p>
                <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign="end">
                  <Dropdown
                    placeholder="Select review audience"
                    options={REVIEW_AUDIENCE_OPTIONS}
                    selectedKey={selectedReviewAudience}
                    onChange={(_, option) => setSelectedReviewAudience(option?.key as string)}
                    className="super-admin-panel__dropdown"
                    disabled={isProcessing}
                    styles={{ root: { flexGrow: 1 } }}
                  />
                  <PrimaryButton
                    text="Apply"
                    iconProps={{ iconName: 'CheckMark' }}
                    onClick={() => showConfirmation(
                      'overrideReviewAudience',
                      'Confirm Review Audience Change',
                      `Change review audience from "${currentReviewAudience}" to "${selectedReviewAudience}"? This may affect which reviews are required.`,
                      { audience: selectedReviewAudience }
                    )}
                    disabled={!selectedReviewAudience || selectedReviewAudience === currentReviewAudience || isProcessing}
                    className="super-admin-panel__action-btn"
                  />
                </Stack>
              </div>
            )}

            {/* Legal Review Override - available during review and closeout */}
            {showLegalReviewOverride && (
              <div className="super-admin-panel__section">
                <div className="super-admin-panel__section-header">
                  <Icon iconName="ComplianceAudit" className="super-admin-panel__section-icon" />
                  <h3>Override Legal Review</h3>
                </div>
                <p className="super-admin-panel__section-desc">
                  Modify or clear legal review outcome and status. Current: <strong>{currentLegalOutcome}</strong>
                </p>
                <Stack tokens={{ childrenGap: 12 }}>
                  <Stack horizontal tokens={{ childrenGap: 12 }}>
                    <Dropdown
                      placeholder="Select outcome"
                      options={REVIEW_OUTCOME_OPTIONS}
                      selectedKey={selectedLegalOutcome}
                      onChange={(_, option) => setSelectedLegalOutcome(option?.key as string)}
                      className="super-admin-panel__dropdown"
                      disabled={isProcessing}
                      styles={{ root: { flexGrow: 1 } }}
                    />
                    <Dropdown
                      placeholder="Select status"
                      options={LEGAL_REVIEW_STATUS_OPTIONS}
                      selectedKey={selectedLegalStatus}
                      onChange={(_, option) => setSelectedLegalStatus(option?.key as string)}
                      className="super-admin-panel__dropdown"
                      disabled={isProcessing}
                      styles={{ root: { flexGrow: 1 } }}
                    />
                  </Stack>
                  <DefaultButton
                    text="Apply Legal Review Override"
                    iconProps={{ iconName: 'Edit' }}
                    onClick={() => showConfirmation(
                      'overrideLegalReview',
                      'Confirm Legal Review Override',
                      `Modify legal review to: Outcome="${selectedLegalOutcome || 'unchanged'}", Status="${selectedLegalStatus || 'unchanged'}"?`,
                      { outcome: selectedLegalOutcome, status: selectedLegalStatus }
                    )}
                    disabled={(!selectedLegalOutcome && !selectedLegalStatus) || isProcessing}
                    className="super-admin-panel__action-btn super-admin-panel__action-btn--warning"
                  />
                </Stack>
              </div>
            )}

            {/* Compliance Review Override - available during review and closeout */}
            {showComplianceReviewOverride && (
              <div className="super-admin-panel__section">
                <div className="super-admin-panel__section-header">
                  <Icon iconName="Shield" className="super-admin-panel__section-icon" />
                  <h3>Override Compliance Review</h3>
                </div>
                <p className="super-admin-panel__section-desc">
                  Modify or clear compliance review outcome and status. Current: <strong>{currentComplianceOutcome}</strong>
                </p>
                <Stack tokens={{ childrenGap: 12 }}>
                  <Stack horizontal tokens={{ childrenGap: 12 }}>
                    <Dropdown
                      placeholder="Select outcome"
                      options={REVIEW_OUTCOME_OPTIONS}
                      selectedKey={selectedComplianceOutcome}
                      onChange={(_, option) => setSelectedComplianceOutcome(option?.key as string)}
                      className="super-admin-panel__dropdown"
                      disabled={isProcessing}
                      styles={{ root: { flexGrow: 1 } }}
                    />
                    <Dropdown
                      placeholder="Select status"
                      options={COMPLIANCE_REVIEW_STATUS_OPTIONS}
                      selectedKey={selectedComplianceStatus}
                      onChange={(_, option) => setSelectedComplianceStatus(option?.key as string)}
                      className="super-admin-panel__dropdown"
                      disabled={isProcessing}
                      styles={{ root: { flexGrow: 1 } }}
                    />
                  </Stack>
                  <DefaultButton
                    text="Apply Compliance Review Override"
                    iconProps={{ iconName: 'Edit' }}
                    onClick={() => showConfirmation(
                      'overrideComplianceReview',
                      'Confirm Compliance Review Override',
                      `Modify compliance review to: Outcome="${selectedComplianceOutcome || 'unchanged'}", Status="${selectedComplianceStatus || 'unchanged'}"?`,
                      { outcome: selectedComplianceOutcome, status: selectedComplianceStatus }
                    )}
                    disabled={(!selectedComplianceOutcome && !selectedComplianceStatus) || isProcessing}
                    className="super-admin-panel__action-btn super-admin-panel__action-btn--warning"
                  />
                </Stack>
              </div>
            )}

            {/* Compliance Flags Override - available during review and closeout when compliance is required */}
            {showComplianceReviewOverride && (
              <div className="super-admin-panel__section">
                <div className="super-admin-panel__section-header">
                  <Icon iconName="Flag" className="super-admin-panel__section-icon" />
                  <h3>Override Compliance Flags</h3>
                </div>
                <p className="super-admin-panel__section-desc">
                  Modify compliance review flags that affect Closeout requirements.
                  Current: Foreside = <strong>{currentRequest?.isForesideReviewRequired ? 'Yes' : 'No'}</strong>,
                  Retail = <strong>{currentRequest?.isRetailUse ? 'Yes' : 'No'}</strong>
                </p>
                <Stack tokens={{ childrenGap: 12 }}>
                  <Stack horizontal tokens={{ childrenGap: 24 }}>
                    <Toggle
                      label="Foreside Review Required"
                      checked={isForesideRequired ?? currentRequest?.isForesideReviewRequired ?? false}
                      onChange={(_, checked) => setIsForesideRequired(checked)}
                      disabled={isProcessing}
                      onText="Yes"
                      offText="No"
                    />
                    <Toggle
                      label="Retail Use"
                      checked={isRetailUse ?? currentRequest?.isRetailUse ?? false}
                      onChange={(_, checked) => setIsRetailUse(checked)}
                      disabled={isProcessing}
                      onText="Yes"
                      offText="No"
                    />
                  </Stack>
                  <DefaultButton
                    text="Apply Compliance Flags Override"
                    iconProps={{ iconName: 'Edit' }}
                    onClick={() => showConfirmation(
                      'overrideComplianceFlags',
                      'Confirm Compliance Flags Override',
                      `Set flags to: Foreside Required="${isForesideRequired ?? currentRequest?.isForesideReviewRequired ? 'Yes' : 'No'}", Retail Use="${isRetailUse ?? currentRequest?.isRetailUse ? 'Yes' : 'No'}"?`,
                      { isForesideRequired: isForesideRequired ?? currentRequest?.isForesideReviewRequired, isRetailUse: isRetailUse ?? currentRequest?.isRetailUse }
                    )}
                    disabled={(isForesideRequired === undefined && isRetailUse === undefined) || isProcessing}
                    className="super-admin-panel__action-btn super-admin-panel__action-btn--warning"
                  />
                </Stack>
              </div>
            )}

          </div>

          {/* Processing Overlay */}
          {isProcessing && (
            <div className="super-admin-panel__processing">
              <Spinner size={SpinnerSize.large} label="Processing override..." />
            </div>
          )}
        </div>
      </Panel>

      {/* Confirmation Dialog */}
      <Dialog
        hidden={!confirmation.isOpen}
        onDismiss={() => setConfirmation(prev => ({ ...prev, isOpen: false }))}
        dialogContentProps={{
          type: DialogType.normal,
          title: confirmation.title,
          subText: confirmation.message,
        }}
        modalProps={{
          isBlocking: true,
          styles: { main: { maxWidth: 500 } },
          className: 'super-admin-panel__dialog',
        }}
      >
        <div className="super-admin-panel__dialog-warning">
          <Icon iconName="Warning12" />
          <span>This action cannot be undone. Proceed with caution.</span>
        </div>
        <div className="super-admin-panel__dialog-reason">
          <strong>Logged Reason:</strong>
          <p>{actionReason}</p>
        </div>
        <DialogFooter>
          <PrimaryButton
            onClick={handleConfirm}
            text="Confirm Override"
            className="super-admin-panel__dialog-confirm"
          />
          <DefaultButton
            onClick={() => setConfirmation(prev => ({ ...prev, isOpen: false }))}
            text="Cancel"
          />
        </DialogFooter>
      </Dialog>
    </>
  );
};

export default SuperAdminPanel;
