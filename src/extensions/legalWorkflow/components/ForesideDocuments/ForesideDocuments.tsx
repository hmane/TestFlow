/**
 * ForesideDocuments Component
 *
 * Displays the Foreside documents section for uploading the Foreside letter.
 * Only shown when status is AwaitingForesideDocuments.
 *
 * Features:
 * - Separate section from regular attachments
 * - Uses DocumentUpload in Approval mode with Foreside document type
 * - Only owner and admin can upload
 */

import * as React from 'react';

// Fluent UI - tree-shaken imports
import { Icon } from '@fluentui/react/lib/Icon';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';

// spfx-toolkit - tree-shaken imports
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { Card, Header, Content } from 'spfx-toolkit/lib/components/Card';

// App imports using path aliases
import { Lists } from '@sp/Lists';
import { DocumentUpload } from '@components/DocumentUpload';
import { usePermissions } from '@hooks/usePermissions';
import { useDocumentsStore } from '@stores/documentsStore';
import { useRequestStore } from '@stores/requestStore';
import { DocumentType } from '@appTypes/documentTypes';

import './ForesideDocuments.scss';

/**
 * ForesideDocuments Component Props
 */
export interface IForesideDocumentsProps {
  itemId?: number;
  siteUrl?: string;
  documentLibraryTitle?: string;
  /** Whether card is expanded by default */
  defaultExpanded?: boolean;
  /** Force read-only mode (e.g., when status is Completed) */
  readOnly?: boolean;
  /** Callback when document count changes (for validation) */
  onDocumentCountChange?: (count: number) => void;
}

/**
 * ForesideDocuments Component
 */
export const ForesideDocuments: React.FC<IForesideDocumentsProps> = ({
  itemId,
  siteUrl,
  documentLibraryTitle = Lists.RequestDocuments.Title,
  defaultExpanded = true,
  readOnly: readOnlyProp = false,
  onDocumentCountChange,
}) => {
  const { isAdmin, isSubmitter } = usePermissions();
  const { currentRequest } = useRequestStore();

  // Check if current user is the owner (creator/submitter of this specific request)
  const isOwner = React.useMemo((): boolean => {
    if (!currentRequest) return false;
    const currentUserId = SPContext.currentUser?.id;
    if (!currentUserId) return false;

    // Compare as strings to handle mixed number/string types
    const currentUserIdStr = String(currentUserId);
    const submittedById = currentRequest.submittedBy?.id ? String(currentRequest.submittedBy.id) : '';
    const authorId = currentRequest.author?.id ? String(currentRequest.author.id) : '';

    return submittedById === currentUserIdStr || authorId === currentUserIdStr;
  }, [currentRequest]);

  // Get documents from store
  const { documents, stagedFiles, isLoading } = useDocumentsStore();

  // Read-only if prop is set, otherwise owner, submitter, and admin can upload
  // Note: isOwner checks if user is the specific request owner (author/submittedBy)
  // isSubmitter checks if user has the "Submitter" role in permissions
  const isReadOnly = React.useMemo(() => {
    SPContext.logger.info('🔍 ForesideDocuments isReadOnly check', {
      readOnlyProp,
      isAdmin,
      isSubmitter,
      isOwner,
      currentUserId: SPContext.currentUser?.id?.toString(),
      submittedById: currentRequest?.submittedBy?.id,
      authorId: currentRequest?.author?.id,
    });
    if (readOnlyProp) return true;
    if (isAdmin) return false;
    if (isOwner) return false;
    if (isSubmitter) return false; // Allow submitters to upload Foreside documents
    return true;
  }, [readOnlyProp, isAdmin, isSubmitter, isOwner, currentRequest]);

  /**
   * Calculate Foreside document count (existing + staged)
   */
  const foresideDocumentCount = React.useMemo(() => {
    const existingCount = documents.get(DocumentType.Foreside)?.length || 0;
    const stagedCount = stagedFiles.filter(f => f.documentType === DocumentType.Foreside).length;
    return existingCount + stagedCount;
  }, [documents, stagedFiles]);

  // Notify parent of document count changes
  React.useEffect(() => {
    if (onDocumentCountChange) {
      onDocumentCountChange(foresideDocumentCount);
    }
  }, [foresideDocumentCount, onDocumentCountChange]);

  /**
   * Handle files change
   */
  const handleFilesChange = React.useCallback(() => {
    SPContext.logger.info('Foreside documents changed', { itemId });
  }, [itemId]);

  /**
   * Handle error
   */
  const handleError = React.useCallback(
    (error: string) => {
      SPContext.logger.error('Foreside document error', new Error(error), { itemId });
    },
    [itemId]
  );

  // Check if request was completed without Foreside documents
  // (foresideCompletedOn is set, meaning the Foreside stage was completed)
  const foresideCompletedWithoutDocuments = readOnlyProp && !isLoading && foresideDocumentCount === 0 && currentRequest?.foresideCompletedOn;

  // Don't render if read-only, no documents, and request never went through Foreside completion
  // But wait for documents to finish loading before deciding
  if (readOnlyProp && !isLoading && foresideDocumentCount === 0 && !currentRequest?.foresideCompletedOn) {
    return null;
  }

  return (
    <Card
      id='foreside-documents-card'
      className='foreside-documents-card'
      allowExpand={true}
      defaultExpanded={defaultExpanded}
    >
      <Header size='regular'>
        <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 12 }}>
          <Icon iconName='Attach' styles={{ root: { fontSize: '20px', color: '#0078d4' } }} />
          <Text variant='large' styles={{ root: { fontWeight: 600 } }}>
            Foreside Documents
          </Text>
          {foresideDocumentCount > 0 && (
            <span className='document-count-badge'>
              {foresideDocumentCount}
            </span>
          )}
          {foresideDocumentCount === 0 && !foresideCompletedWithoutDocuments && (
            <Text variant='small' styles={{ root: { color: '#a19f9d', fontStyle: 'italic' } }}>
              No documents uploaded
            </Text>
          )}
          {isReadOnly && (
            <Text variant='small' styles={{ root: { color: '#605e5c', fontStyle: 'italic', marginLeft: '8px' } }}>
              (Read-only)
            </Text>
          )}
        </Stack>
      </Header>

      <Content padding='comfortable'>
        {foresideCompletedWithoutDocuments ? (
          <Stack
            horizontal
            verticalAlign='center'
            tokens={{ childrenGap: 8 }}
            styles={{
              root: {
                padding: '16px',
                backgroundColor: '#f3f2f1',
                borderRadius: '4px',
                border: '1px solid #edebe9',
              },
            }}
          >
            <Icon
              iconName='Info'
              styles={{ root: { fontSize: '16px', color: '#605e5c' } }}
            />
            <Text styles={{ root: { color: '#323130' } }}>
              No Foreside documents were uploaded. The request was completed without attaching Foreside documents.
            </Text>
          </Stack>
        ) : (
          <DocumentUpload
            itemId={itemId}
            documentType={DocumentType.Foreside}
            isReadOnly={isReadOnly}
            required={true}
            hasError={foresideDocumentCount === 0}
            siteUrl={siteUrl || SPContext.webAbsoluteUrl}
            documentLibraryTitle={documentLibraryTitle}
            maxFiles={10}
            maxFileSize={250 * 1024 * 1024}
            allowedExtensions={[
              'pdf',
              'doc',
              'docx',
              'msg',
              'eml',
            ]}
            onFilesChange={handleFilesChange}
            onError={handleError}
          />
        )}
      </Content>
    </Card>
  );
};

export default ForesideDocuments;
