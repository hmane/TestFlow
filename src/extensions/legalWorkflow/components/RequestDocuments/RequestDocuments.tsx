/**
 * RequestDocuments Component
 *
 * Displays the attachments section for a legal request.
 * Uses spfx-toolkit Card with Header/Content for consistent styling.
 *
 * Features:
 * - Collapsible card with document count in header
 * - Uses DocumentUpload component for file management
 * - Read-only logic based on workflow state and user permissions
 * - Placed directly above action buttons in the layout
 */

import * as React from 'react';

// Fluent UI - tree-shaken imports
import { Icon } from '@fluentui/react/lib/Icon';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';

// spfx-toolkit - tree-shaken imports
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { Card, Header, Content } from 'spfx-toolkit/lib/components/Card';
import { useFormContext } from 'spfx-toolkit/lib/components/spForm/context';

// App imports using path aliases
import { Lists } from '@sp/Lists';
import { DocumentUpload } from '@components/DocumentUpload';
import { useRequestFormContext } from '@contexts/RequestFormContext';
import { usePermissions } from '@hooks/usePermissions';
import { useDocumentsStore } from '@stores/documentsStore';
import { useRequestStore } from '@stores/requestStore';
import {
  ComplianceReviewStatus,
  LegalReviewStatus,
  RequestStatus,
} from '@appTypes/workflowTypes';

import './RequestDocuments.scss';

/**
 * RequestDocuments Component Props
 */
export interface IRequestDocumentsProps {
  itemId?: number;
  siteUrl?: string;
  documentLibraryTitle?: string;
  /** Whether card is expanded by default */
  defaultExpanded?: boolean;
}

/**
 * RequestDocuments Component
 */
export const RequestDocuments: React.FC<IRequestDocumentsProps> = ({
  itemId,
  siteUrl,
  documentLibraryTitle = Lists.RequestDocuments.Title,
  defaultExpanded = true,
}) => {
  const { status } = useRequestFormContext();
  const { isSubmitter, isLegalAdmin, isAttorney, isComplianceUser, isAdmin } = usePermissions();
  const { currentRequest } = useRequestStore();

  // Check if current user is the owner (creator/submitter of this specific request)
  const isOwner = React.useMemo((): boolean => {
    if (!currentRequest) return false;
    const currentUserId = SPContext.currentUser?.id?.toString() ?? '';
    return (
      currentRequest.submittedBy?.id === currentUserId ||
      currentRequest.author?.id === currentUserId
    );
  }, [currentRequest]);

  // Get documents from store
  const { documents, stagedFiles } = useDocumentsStore();

  // Get form context - may be undefined in view mode
  const formContext = useFormContext();

  // Check if there's an attachments validation error
  // The error is set on 'attachments' path via Zod superRefine in requestSchema.ts
  // We access formContext.formState directly instead of useFormState hook
  // because useFormState requires a valid control and throws when control is null
  const hasAttachmentsError = React.useMemo(() => {
    if (!formContext) {
      return false;
    }
    const formState = formContext.formState;
    if (!formState?.isSubmitted) {
      return false;
    }
    return !!(formState.errors as any)?.attachments;
  }, [formContext]);

  // Get Legal and Compliance review statuses
  const legalReviewStatus: LegalReviewStatus | undefined = React.useMemo(() => {
    return undefined;
  }, []);

  const complianceReviewStatus: ComplianceReviewStatus | undefined = React.useMemo(() => {
    return undefined;
  }, []);

  /**
   * Determine if attachments should be read-only
   *
   * Permissions for attachments:
   * - Admin: can edit anytime (except Completed/Cancelled)
   * - Legal Admin, Attorney, Compliance: can add/update anytime before Closeout
   * - Owner (creator/submitter): can edit in Draft or when waiting on submitter
   */
  const isReadOnly = React.useMemo(() => {
    // Completed and Cancelled are always read-only for everyone
    if (status === RequestStatus.Completed || status === RequestStatus.Cancelled) {
      return true;
    }

    // Admin can always edit (except Completed/Cancelled above)
    if (isAdmin) {
      return false;
    }

    // Draft is editable by owner (creator) or anyone with general access
    if (!status || status === RequestStatus.Draft) {
      // Owner can always edit their own draft
      if (isOwner) {
        return false;
      }
      // Others with submitter role can also edit drafts they have access to
      return false;
    }

    // Closeout and beyond - only admin can edit (handled above)
    if (status === RequestStatus.Closeout) {
      return true;
    }

    // Legal Admin, Attorney, Compliance can edit anytime before Closeout
    // (Legal Intake, Assign Attorney, In Review statuses)
    if (isLegalAdmin || isAttorney || isComplianceUser) {
      return false;
    }

    // Owner (creator/submitter of this request) can edit when waiting on submitter
    if (isOwner || isSubmitter) {
      if (
        legalReviewStatus === LegalReviewStatus.WaitingOnSubmitter ||
        complianceReviewStatus === ComplianceReviewStatus.WaitingOnSubmitter
      ) {
        return false;
      }
    }

    return true;
  }, [
    isAdmin,
    isLegalAdmin,
    isAttorney,
    isComplianceUser,
    isSubmitter,
    isOwner,
    status,
    legalReviewStatus,
    complianceReviewStatus,
  ]);

  /**
   * Calculate total document count (existing + staged)
   */
  const totalDocumentCount = React.useMemo(() => {
    const reviewExisting = documents.get('Review' as any)?.length || 0;
    const supplementalExisting = documents.get('Supplemental' as any)?.length || 0;

    const reviewStaged = stagedFiles.filter(f => f.documentType === 'Review').length;
    const supplementalStaged = stagedFiles.filter(f => f.documentType === 'Supplemental').length;

    return reviewExisting + supplementalExisting + reviewStaged + supplementalStaged;
  }, [documents, stagedFiles]);

  /**
   * Handle files change
   */
  const handleFilesChange = React.useCallback(() => {
    SPContext.logger.info('Attachments changed', { itemId });
  }, [itemId]);

  /**
   * Handle error
   */
  const handleError = React.useCallback(
    (error: string) => {
      SPContext.logger.error('Attachment error', new Error(error), { itemId });
    },
    [itemId]
  );

  return (
    <Card
      id='attachments-card'
      className='request-documents-card'
      allowExpand={true}
      defaultExpanded={defaultExpanded}
    >
      <Header size='regular'>
        <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 12 }}>
          <Icon iconName='Attach' styles={{ root: { fontSize: '20px', color: '#0078d4' } }} />
          <Text variant='large' styles={{ root: { fontWeight: 600 } }}>
            Attachments
          </Text>
          {totalDocumentCount > 0 && (
            <span className='document-count-badge'>
              {totalDocumentCount}
            </span>
          )}
          {totalDocumentCount === 0 && (
            <Text variant='small' styles={{ root: { color: '#a19f9d', fontStyle: 'italic' } }}>
              No documents attached
            </Text>
          )}
          {isReadOnly && status && status !== RequestStatus.Draft && (
            <Text variant='small' styles={{ root: { color: '#605e5c', fontStyle: 'italic', marginLeft: '8px' } }}>
              (Read-only)
            </Text>
          )}
        </Stack>
      </Header>

      <Content padding='comfortable'>
        <DocumentUpload
          itemId={itemId}
          isReadOnly={isReadOnly}
          required={false}
          hasError={hasAttachmentsError}
          siteUrl={siteUrl || SPContext.webAbsoluteUrl}
          documentLibraryTitle={documentLibraryTitle}
          maxFiles={50}
          maxFileSize={250 * 1024 * 1024}
          allowedExtensions={[
            'pdf',
            'doc',
            'docx',
            'xls',
            'xlsx',
            'ppt',
            'pptx',
            'jpg',
            'jpeg',
            'png',
            'gif',
            'bmp',
            'txt',
            'rtf',
            'csv',
            'zip',
            'msg',
            'eml',
          ]}
          onFilesChange={handleFilesChange}
          onError={handleError}
        />
      </Content>
    </Card>
  );
};

export default RequestDocuments;
