/**
 * ApprovalSection Component
 *
 * Enhanced approval management with two-part approach:
 * 1. Communications Approval Toggle:
 *    - Toggle Yes/No for communications approval requirement
 *    - When Yes: Shows approved by, date, and attachment fields
 * 2. Additional Approvals Dropdown:
 *    - Dropdown to select and add additional approval types
 *    - Each approval shows: approved by, date, attachment, notes
 *    - Remove button for each approval
 *    - Selected options removed from dropdown until removed
 *
 * Features:
 * - Toggle-based communications approval
 * - Dynamic dropdown for additional approvals
 * - Smart dropdown management (removes selected, restores on remove)
 * - Individual file upload per approval with existingFiles support
 * - Validation with Zod schema
 * - Enhanced UI/UX with visual feedback
 * - Accessibility compliant
 *
 * File Handling:
 * - ApprovalFileUpload component shows existing files when available
 * - Existing files are passed via approval.existingFiles array
 * - Files are loaded from SharePoint when editing existing requests
 * - New files are tracked until form submission
 * - File upload/delete happens on form save (see approvalFileService.ts)
 *
 * TODO: Integration Steps for File Persistence
 * 1. When loading existing request:
 *    - Fetch approval documents from SharePoint using getApprovalDocuments()
 *    - Populate approval.existingFiles with fetched data
 * 2. On form submission:
 *    - Call processApprovalFileChanges() for each approval
 *    - This will upload new files and delete removed files
 *    - Update approval.documentId with uploaded file reference
 * 3. Update requestStore to handle file operations during save
 */

import {
  Icon,
  IconButton,
  Label,
  MessageBar,
  MessageBarType,
  Stack,
  Text,
  Toggle,
} from '@fluentui/react';
import * as React from 'react';
import { Control, useFieldArray, useWatch, useController } from 'react-hook-form';
import { SPContext } from 'spfx-toolkit';

import { Lists } from '@sp/Lists';

import {
  FormContainer,
  FormItem,
  FormLabel,
} from 'spfx-toolkit/lib/components/spForm';
import {
  SPTextField,
  SPTextFieldMode,
  SPDateField,
  SPDateTimeFormat,
  SPUserField,
} from 'spfx-toolkit/lib/components/spFields';
import { DocumentUpload } from '../../../../components/DocumentUpload';
import type { ILegalRequest } from '../../../../types';
import { ApprovalType } from '../../../../types/approvalTypes';
import './ApprovalSection.scss';

/**
 * Shared constants to prevent re-creation on every render
 */
const TODAY = new Date(); // Create once at module level
const MAX_APPROVAL_DOCUMENTS = 10; // Maximum number of documents per approval
const CHECKMARK_ICON_STYLES = { root: { fontSize: '16px', color: '#107c10' } };
const APPROVAL_TITLE_STYLES = { root: { fontWeight: 600 as const, color: '#323130' } };
const COMM_APPROVAL_LABEL_STYLES = { root: { fontWeight: 600 as const, color: '#323130', fontSize: '14px' } };
const DESC_TEXT_STYLES = { root: { color: '#605e5c' } };
const INFO_ICON_STYLES = { root: { color: '#0078d4' } };
const INFO_TEXT_STYLES = { root: { color: '#323130' } };
const DELETE_BUTTON_STYLES = {
  root: { color: '#a4262c' },
  rootHovered: { color: '#d13438', backgroundColor: '#fef6f6' },
};
const TOGGLE_STYLES = { root: { marginBottom: '0' } };
const COMM_APPROVAL_CONTAINER_STYLES = {
  root: {
    padding: '16px',
    backgroundColor: '#f0f6ff',
    borderRadius: '4px',
    border: '1px solid #d1e5ff',
    marginBottom: '16px',
  },
};
const ADDITIONAL_APPROVAL_CONTAINER_STYLES = {
  root: {
    padding: '16px',
    backgroundColor: '#faf9f8',
    borderRadius: '4px',
    border: '1px solid #edebe9',
    marginBottom: '12px',
  },
};
const DROPDOWN_CONTAINER_STYLES = {
  root: {
    padding: '12px',
    backgroundColor: '#ffffff',
    borderRadius: '4px',
    border: '1px dashed #d2d0ce',
  },
};

/**
 * Props for ApprovalSection component
 */
export interface IApprovalSectionProps {
  control: Control<ILegalRequest>;
  disabled?: boolean;
  isNewRequest: boolean;
  requestId?: string;
}

/**
 * All approval type options (excluding Communications which is handled separately)
 */
const ADDITIONAL_APPROVAL_OPTIONS = [
  { id: ApprovalType.PortfolioManager, text: 'Portfolio Manager' },
  { id: ApprovalType.ResearchAnalyst, text: 'Research Analyst' },
  { id: ApprovalType.SubjectMatterExpert, text: 'Subject Matter Expert' },
  { id: ApprovalType.Performance, text: 'Performance' },
  { id: ApprovalType.Other, text: 'Other' },
];

/**
 * Props for individual AdditionalApprovalItem component
 */
interface IAdditionalApprovalItemProps {
  control: Control<ILegalRequest>;
  index: number;
  approvalType: ApprovalType;
  onRemove: () => void;
  disabled?: boolean;
  isNewRequest: boolean;
  requestId?: string;
}

/**
 * AdditionalApprovalItem Component - Individual additional approval entry
 */
const AdditionalApprovalItem: React.FC<IAdditionalApprovalItemProps> = ({
  control,
  index,
  approvalType,
  onRemove,
  disabled = false,
  isNewRequest,
  requestId,
}) => {
  // Type-safe control for SPField components
  const formControl = control as any;

  // Note: File management is now handled by DocumentUpload component via documentsStore
  /**
   * Get approval type display name
   */
  const approvalTypeName = React.useMemo(() => {
    for (let i = 0; i < ADDITIONAL_APPROVAL_OPTIONS.length; i++) {
      if (ADDITIONAL_APPROVAL_OPTIONS[i].id === approvalType) {
        return ADDITIONAL_APPROVAL_OPTIONS[i].text;
      }
    }
    return 'Unknown';
  }, [approvalType]);

  /**
   * Handle file changes for this approval
   */
  const handleFilesChange = React.useCallback(
    () => {
      SPContext.logger.info('AdditionalApprovalItem: Files changed', {
        index,
        approvalType,
      });

      // Note: File management is now handled internally by DocumentUpload component via documentsStore
      // This callback is just for notification/side effects
    },
    [index, approvalType]
  );

  return (
    <Stack tokens={{ childrenGap: 12 }} styles={ADDITIONAL_APPROVAL_CONTAINER_STYLES}>
      {/* Header with approval type name and remove button */}
      <Stack horizontal verticalAlign='center' horizontalAlign='space-between'>
        <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
          <Icon iconName='CheckMark' styles={CHECKMARK_ICON_STYLES} />
          <Text variant='medium' styles={APPROVAL_TITLE_STYLES}>
            {approvalTypeName}
          </Text>
        </Stack>
        <IconButton
          iconProps={{ iconName: 'Cancel' }}
          title={`Remove ${approvalTypeName} approval`}
          ariaLabel={`Remove ${approvalTypeName} approval`}
          onClick={onRemove}
          disabled={disabled}
          styles={DELETE_BUTTON_STYLES}
        />
      </Stack>

      {/* Form fields */}
      <FormContainer labelWidth='200px'>
        {/* Approval Title (conditional - only for "Other" type) */}
        {approvalType === ApprovalType.Other && (
          <FormItem>
            <FormLabel isRequired infoText='Enter a descriptive title for this custom approval type'>
              Approval Title
            </FormLabel>
            <SPTextField
              name={`approvals.${index}.approvalTitle` as const}
              control={formControl}
              placeholder='Enter approval title (e.g., Finance Review, IT Security)'
              mode={SPTextFieldMode.SingleLine}
              maxLength={100}
              showCharacterCount
              stylingMode='outlined'
              disabled={disabled}
            />
          </FormItem>
        )}

        {/* Approver */}
        <FormItem>
          <FormLabel isRequired infoText='Select the person who approved this item'>
            Approved By
          </FormLabel>
          <SPUserField
            name={`approvals.${index}.approver` as const}
            control={formControl}
            placeholder='Search for approver'
            allowMultiple={false}
            showPhoto
            showEmail
            disabled={disabled}
          />
        </FormItem>

        {/* Approval Date */}
        <FormItem>
          <FormLabel isRequired infoText='Date when the approval was granted'>
            Approval Date
          </FormLabel>
          <SPDateField
            name={`approvals.${index}.approvalDate` as const}
            control={formControl}
            placeholder='Select approval date'
            dateTimeFormat={SPDateTimeFormat.DateOnly}
            displayFormat='MM/dd/yyyy'
            maxDate={TODAY}
            showClearButton
            disabled={disabled}
          />
        </FormItem>

        {/* Approval Document Upload */}
        <FormItem>
          <FormLabel isRequired>Approval Documents</FormLabel>
          <DocumentUpload
            documentType={`Approval-${approvalTypeName}-${index}` as any}
            itemId={requestId ? parseInt(requestId, 10) : undefined}
            siteUrl={SPContext.webAbsoluteUrl}
            documentLibraryTitle={Lists.RequestDocuments.Title}
            maxFiles={MAX_APPROVAL_DOCUMENTS}
            maxFileSize={250 * 1024 * 1024}
            required={true}
            isReadOnly={disabled}
            allowedExtensions={[
              'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
              'jpg', 'jpeg', 'png', 'gif', 'bmp',
              'txt', 'rtf', 'csv',
              'zip', 'msg', 'eml',
            ]}
            onFilesChange={handleFilesChange}
            label=""
            description={`Upload up to ${MAX_APPROVAL_DOCUMENTS} approval documents (PDF, Word, Excel, PowerPoint, images, emails, etc.)`}
          />
        </FormItem>

        {/* Notes */}
        <FormItem>
          <FormLabel infoText='Optional notes about this approval'>
            Notes
          </FormLabel>
          <SPTextField
            name={`approvals.${index}.notes` as const}
            control={formControl}
            placeholder='Add any notes about this approval (optional)'
            mode={SPTextFieldMode.MultiLine}
            rows={3}
            maxLength={500}
            showCharacterCount
            stylingMode='outlined'
            disabled={disabled}
          />
        </FormItem>
      </FormContainer>
    </Stack>
  );
};

/**
 * ApprovalSection Component - Enhanced with toggle and dynamic dropdown
 */
export const ApprovalSection: React.FC<IApprovalSectionProps> = ({
  control,
  disabled = false,
  isNewRequest,
  requestId,
}) => {
  // Type-safe control for SPField components
  const formControl = control as any;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'approvals',
  });

  // Note: File management is now handled by DocumentUpload component via documentsStore

  // Controller for requiresCommunicationsApproval toggle
  const {
    field: { value: requiresCommunicationsApproval, onChange: onCommApprovalChange },
  } = useController({
    control,
    name: 'requiresCommunicationsApproval',
  });

  // Watch all approvals to track which types are selected
  const approvals = useWatch({
    control,
    name: 'approvals',
  });

  // State for dropdown selection
  const [selectedAdditionalType, setSelectedAdditionalType] = React.useState<ApprovalType | null>(
    null
  );

  /**
   * Get available approval options (exclude already selected ones)
   */
  const availableApprovalOptions = React.useMemo(() => {
    if (!approvals || !Array.isArray(approvals)) return ADDITIONAL_APPROVAL_OPTIONS;

    // Get additional (non-communications) approval types
    const additionalApprovals: any[] = [];
    for (let i = 0; i < approvals.length; i++) {
      const approval = approvals[i] as any;
      if (approval.type !== ApprovalType.Communications) {
        additionalApprovals.push(approval);
      }
    }

    const selectedTypes = additionalApprovals.map((a: any) => a.type);

    // Filter out already selected types
    const available: typeof ADDITIONAL_APPROVAL_OPTIONS = [];
    for (let i = 0; i < ADDITIONAL_APPROVAL_OPTIONS.length; i++) {
      const opt = ADDITIONAL_APPROVAL_OPTIONS[i];
      let isSelected = false;
      for (let j = 0; j < selectedTypes.length; j++) {
        if (selectedTypes[j] === opt.id) {
          isSelected = true;
          break;
        }
      }
      if (!isSelected) {
        available.push(opt);
      }
    }
    return available;
  }, [approvals]);

  /**
   * Get index of communications approval (-1 if not present)
   */
  const communicationsApprovalIndex = React.useMemo(() => {
    if (!approvals || !Array.isArray(approvals)) return -1;
    for (let i = 0; i < approvals.length; i++) {
      const approval = approvals[i] as any;
      if (approval.type === ApprovalType.Communications) {
        return i;
      }
    }
    return -1;
  }, [approvals]);

  /**
   * Handle communications approval toggle change
   */
  const handleCommApprovalToggle = React.useCallback(
    (_event: React.MouseEvent<HTMLElement>, checked?: boolean) => {
      const newValue = checked || false;
      onCommApprovalChange(newValue);

      if (newValue && communicationsApprovalIndex === -1) {
        // Add communications approval
        const newApproval = {
          type: ApprovalType.Communications,
          approvalDate: undefined as any,
          approver: {
            id: '',
            email: '',
            title: '',
          },
          documentId: '',
          notes: '',
        } as any;

        append(newApproval);
        SPContext.logger.info('ApprovalSection: Communications approval added');
      } else if (!newValue && communicationsApprovalIndex !== -1) {
        // Remove communications approval
        remove(communicationsApprovalIndex);
        SPContext.logger.info('ApprovalSection: Communications approval removed');
      }
    },
    [onCommApprovalChange, communicationsApprovalIndex, append, remove]
  );

  /**
   * Handle adding additional approval from dropdown
   */
  const handleAddAdditionalApproval = React.useCallback(
    (value: any) => {
      if (!value) return;

      const approvalType = value as ApprovalType;
      setSelectedAdditionalType(null); // Reset dropdown

      const newApproval = {
        type: approvalType,
        approvalDate: undefined as any,
        approver: {
          id: '',
          email: '',
          title: '',
        },
        documentId: '',
        notes: '',
        approvalTitle: approvalType === ApprovalType.Other ? '' : undefined,
      } as any;

      append(newApproval);
      SPContext.logger.info('ApprovalSection: Additional approval added', { type: approvalType });
    },
    [append]
  );

  /**
   * Handle removing an additional approval
   */
  const handleRemoveAdditionalApproval = React.useCallback(
    (index: number) => {
      const approval = approvals?.[index];
      remove(index);
      SPContext.logger.info('ApprovalSection: Additional approval removed', {
        index,
        type: approval?.type,
      });
    },
    [remove, approvals]
  );

  /**
   * Handle file changes for communications approval
   */
  const handleCommFilesChange = React.useCallback(
    () => {
      SPContext.logger.info('ApprovalSection: Communications approval files changed', {
        index: communicationsApprovalIndex,
      });

      // Note: File management is now handled internally by DocumentUpload component via documentsStore
      // This callback is just for notification/side effects
    },
    [communicationsApprovalIndex]
  );

  return (
    <Stack tokens={{ childrenGap: 16 }}>
      {/* Communications Approval Section */}
      <Stack tokens={{ childrenGap: 12 }}>
        <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 12 }}>
          <Icon iconName='Streaming' styles={{ root: { fontSize: '18px', color: '#0078d4' } }} />
          <Label styles={COMM_APPROVAL_LABEL_STYLES}>
            Does this request require Communications approval?
          </Label>
        </Stack>

        <Toggle
          label=''
          onText='Yes'
          offText='No'
          checked={requiresCommunicationsApproval || false}
          onChange={handleCommApprovalToggle}
          disabled={disabled}
          styles={TOGGLE_STYLES}
        />

        {/* Communications Approval Fields (shown when toggle is Yes) */}
        {requiresCommunicationsApproval && communicationsApprovalIndex !== -1 && (
          <Stack tokens={{ childrenGap: 12 }} styles={COMM_APPROVAL_CONTAINER_STYLES}>
            <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
              <Icon iconName='CheckMark' styles={CHECKMARK_ICON_STYLES} />
              <Text variant='medium' styles={APPROVAL_TITLE_STYLES}>
                Communications Approval
              </Text>
            </Stack>

            <FormContainer labelWidth='200px'>
              {/* Approver */}
              <FormItem>
                <FormLabel isRequired infoText='Select the person who approved this item'>
                  Approved By
                </FormLabel>
                <SPUserField
                  name={`approvals.${communicationsApprovalIndex}.approver` as const}
                  control={formControl}
                  placeholder='Search for approver'
                  allowMultiple={false}
                  showPhoto
                  showEmail
                  disabled={disabled}
                />
              </FormItem>

              {/* Approval Date */}
              <FormItem>
                <FormLabel isRequired infoText='Date when the approval was granted'>
                  Approval Date
                </FormLabel>
                <SPDateField
                  name={`approvals.${communicationsApprovalIndex}.approvalDate` as const}
                  control={formControl}
                  placeholder='Select approval date'
                  dateTimeFormat={SPDateTimeFormat.DateOnly}
                  displayFormat='MM/dd/yyyy'
                  maxDate={TODAY}
                  showClearButton
                  disabled={disabled}
                />
              </FormItem>

              {/* Approval Document Upload */}
              <FormItem>
                <FormLabel isRequired>Approval Documents</FormLabel>
                <DocumentUpload
                  documentType={"Approval-Communications" as any}
                  itemId={requestId ? parseInt(requestId, 10) : undefined}
                  siteUrl={SPContext.webAbsoluteUrl}
                  documentLibraryTitle={Lists.RequestDocuments.Title}
                  maxFiles={MAX_APPROVAL_DOCUMENTS}
                  maxFileSize={250 * 1024 * 1024}
                  required={true}
                  isReadOnly={disabled}
                  allowedExtensions={[
                    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
                    'jpg', 'jpeg', 'png', 'gif', 'bmp',
                    'txt', 'rtf', 'csv',
                    'zip', 'msg', 'eml',
                  ]}
                  onFilesChange={handleCommFilesChange}
                  label=""
                  description={`Upload up to ${MAX_APPROVAL_DOCUMENTS} approval documents (PDF, Word, Excel, PowerPoint, images, emails, etc.)`}
                />
              </FormItem>

              {/* Notes */}
              <FormItem>
                <FormLabel infoText='Optional notes about this approval'>
                  Notes
                </FormLabel>
                <SPTextField
                  name={`approvals.${communicationsApprovalIndex}.notes` as const}
                  control={formControl}
                  placeholder='Add any notes about this approval (optional)'
                  mode={SPTextFieldMode.MultiLine}
                  rows={3}
                  maxLength={500}
                  showCharacterCount
                  stylingMode='outlined'
                  disabled={disabled}
                />
              </FormItem>
            </FormContainer>
          </Stack>
        )}
      </Stack>

      {/* Additional Approvals Section */}
      <Stack tokens={{ childrenGap: 12 }}>
        <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 12 }}>
          <Icon iconName='AddTo' styles={{ root: { fontSize: '18px', color: '#0078d4' } }} />
          <Label styles={COMM_APPROVAL_LABEL_STYLES}>Additional Approvals</Label>
        </Stack>

        <Text variant='small' styles={DESC_TEXT_STYLES}>
          Select additional approval types as needed. Each can only be added once.
        </Text>

        {/* Additional Approval Items */}
        {fields.map((field, index) => {
          const approval = approvals?.[index];
          // Only render non-communications approvals
          if (approval?.type === ApprovalType.Communications) return null;
          if (!approval?.type) return null; // Skip if no type defined

          return (
            <AdditionalApprovalItem
              key={field.id}
              control={control}
              index={index}
              approvalType={approval.type}
              onRemove={() => handleRemoveAdditionalApproval(index)}
              disabled={disabled}
              isNewRequest={isNewRequest}
              requestId={requestId}
            />
          );
        })}

        {/* Dropdown for adding additional approvals */}
        <Stack tokens={{ childrenGap: 8 }} styles={DROPDOWN_CONTAINER_STYLES}>
          <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
            <Icon iconName='Add' styles={{ root: { fontSize: '14px', color: '#0078d4' } }} />
            <Text variant='small' styles={{ root: { fontWeight: 600 } }}>
              Add Additional Approval
            </Text>
          </Stack>

          {availableApprovalOptions.length > 0 ? (
            <Stack>
              <select
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #d2d0ce',
                  fontSize: '14px',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                }}
                value={selectedAdditionalType || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) {
                    handleAddAdditionalApproval(value);
                  }
                }}
                disabled={disabled}
              >
                <option value=''>Select an approval type to add...</option>
                {availableApprovalOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.text}
                  </option>
                ))}
              </select>
            </Stack>
          ) : (
            <MessageBar messageBarType={MessageBarType.success} isMultiline={false}>
              All available approval types have been added
            </MessageBar>
          )}
        </Stack>
      </Stack>

      {/* Summary info */}
      {fields.length > 0 && (
        <Stack
          horizontal
          verticalAlign='center'
          horizontalAlign='space-between'
          styles={{
            root: {
              padding: '12px 16px',
              backgroundColor: '#f3f2f1',
              borderRadius: '4px',
              border: '1px solid #edebe9',
            },
          }}
        >
          <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
            <Icon iconName='Info' styles={INFO_ICON_STYLES} />
            <Text variant='medium' styles={INFO_TEXT_STYLES}>
              Total approvals: <strong>{fields.length}</strong>
            </Text>
          </Stack>
          <Text variant='small' styles={DESC_TEXT_STYLES}>
            Each approval requires at least 1 document (max {MAX_APPROVAL_DOCUMENTS})
          </Text>
        </Stack>
      )}
    </Stack>
  );
};

export default ApprovalSection;
