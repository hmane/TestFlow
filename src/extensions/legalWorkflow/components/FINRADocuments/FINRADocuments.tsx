/**
 * FINRADocuments Component
 *
 * Displays the FINRA documents section for uploading the FINRA letter.
 * Only shown when status is AwaitingFINRADocuments.
 *
 * Features:
 * - Separate section from regular attachments
 * - Uses DocumentUpload in Approval mode with FINRA document type
 * - Only owner and admin can upload
 */

import * as React from 'react';

// Fluent UI - tree-shaken imports
import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { Icon } from '@fluentui/react/lib/Icon';
import { Separator } from '@fluentui/react/lib/Separator';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TextField } from '@fluentui/react/lib/TextField';

// spfx-toolkit - tree-shaken imports
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { Card, Header, Content } from 'spfx-toolkit/lib/components/Card';

// App imports using path aliases
import { Lists } from '@sp/Lists';
import { RequestsFields } from '@sp/listFields/RequestsFields';
import { DocumentUpload } from '@components/DocumentUpload';
import { useUIVisibility } from '@hooks/useUIVisibility';
import { useDocumentsStore } from '@stores/documentsStore';
import { useRequestStore } from '@stores/requestStore';
import { DocumentType } from '@appTypes/documentTypes';

import './FINRADocuments.scss';

/**
 * FINRADocuments Component Props
 */
export interface IFINRADocumentsProps {
  itemId?: number;
  siteUrl?: string;
  documentLibraryTitle?: string;
  /** Whether card is expanded by default */
  defaultExpanded?: boolean;
  /** Force read-only mode (e.g., when status is Completed) */
  readOnly?: boolean;
  /** Callback when document count changes (for validation) */
  onDocumentCountChange?: (count: number) => void;
  /** Callback when comments received checkbox changes */
  onCommentsReceivedChange?: (checked: boolean) => void;
}

/**
 * FINRADocuments Component
 */
export const FINRADocuments: React.FC<IFINRADocumentsProps> = ({
  itemId,
  siteUrl,
  documentLibraryTitle = Lists.RequestDocuments.Title,
  defaultExpanded = true,
  readOnly: readOnlyProp = false,
  onDocumentCountChange,
  onCommentsReceivedChange,
}) => {
  const { currentRequest, storeItemId, originalRequest } = useRequestStore((s) => ({
    currentRequest: s.currentRequest,
    storeItemId: s.itemId,
    originalRequest: s.originalRequest,
  }));
  const effectiveItemId = storeItemId ?? itemId;
  const { fields } = useUIVisibility({
    status: currentRequest?.status,
    itemId: effectiveItemId,
    request: currentRequest ?? undefined,
  });

  // Get documents from store
  const { documents, stagedFiles, isLoading } = useDocumentsStore();

  const isReadOnly = readOnlyProp || !fields.finra.canEdit;

  /**
   * Calculate FINRA document count (existing + staged)
   */
  const finraDocumentCount = React.useMemo(() => {
    const existingCount = documents.get(DocumentType.FINRA)?.length || 0;
    const stagedCount = stagedFiles.filter(f => f.documentType === DocumentType.FINRA).length;
    return existingCount + stagedCount;
  }, [documents, stagedFiles]);

  // Notify parent of document count changes
  React.useEffect(() => {
    if (onDocumentCountChange) {
      onDocumentCountChange(finraDocumentCount);
    }
  }, [finraDocumentCount, onDocumentCountChange]);

  // Comments received state - read from store, update store directly
  const commentsReceived = currentRequest?.finraCommentsReceived ?? false;
  const finraComment = currentRequest?.finraComment ?? '';
  const isSavingCommentsFlagRef = React.useRef(false);
  const isSavingCommentTextRef = React.useRef(false);
  const setIsSavingCommentText = React.useCallback((value: boolean): void => {
    isSavingCommentTextRef.current = value;
  }, []);

  /**
   * Handle FINRA comment text change
   * Updates only currentRequest in the store (NOT originalRequest).
   * The value is saved when "Complete Request" is clicked, not directly to SP.
   */
  const handleFinraCommentChange = React.useCallback(
    (_ev?: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
      const storeState = useRequestStore.getState();
      if (!storeState.currentRequest) return;
      useRequestStore.setState({
        currentRequest: { ...storeState.currentRequest, finraComment: newValue ?? '' },
      });
    },
    []
  );

  /**
   * Handle comments received checkbox change
   * Updates the store AND saves directly to SharePoint so the value persists
   * even without a full form save (Save button is hidden during Awaiting FINRA Documents).
   * Uses setState to update both currentRequest and originalRequest atomically
   * so isDirty is not affected by this toggle.
   */
  const handleCommentsReceivedChange = React.useCallback(
    (_ev?: React.FormEvent<HTMLElement | HTMLInputElement>, checked?: boolean) => {
      if (isSavingCommentsFlagRef.current || !effectiveItemId) return;

      const value = checked ?? false;
      const storeState = useRequestStore.getState();
      if (!storeState.currentRequest) return;

      const previousValue = storeState.currentRequest.finraCommentsReceived ?? false;
      const previousComment = storeState.currentRequest.finraComment;
      const nextComment = value ? storeState.currentRequest.finraComment : '';

      // Update both currentRequest and originalRequest so isDirty is unaffected
      useRequestStore.setState({
        currentRequest: {
          ...storeState.currentRequest,
          finraCommentsReceived: value,
          finraComment: nextComment,
        },
        originalRequest: storeState.originalRequest
          ? {
            ...storeState.originalRequest,
            finraCommentsReceived: value,
            finraComment: nextComment,
          }
          : storeState.originalRequest,
      });

      if (onCommentsReceivedChange) {
        onCommentsReceivedChange(value);
      }

      // Persist directly to SharePoint — the Save button is hidden in Awaiting FINRA Documents status
      isSavingCommentsFlagRef.current = true;
      const updatePayload: Record<string, unknown> = {
        [RequestsFields.FINRACommentsReceived]: value,
      };
      if (!value) {
        // Clear stale comment text when user marks "comments received" as false
        updatePayload[RequestsFields.FINRAComment] = '';
      }
      SPContext.sp.web.lists
        .getByTitle(Lists.Requests.Title)
        .items.getById(effectiveItemId)
        .update(updatePayload)
        .then(() => {
          isSavingCommentsFlagRef.current = false;
        })
        .catch((error: unknown) => {
          isSavingCommentsFlagRef.current = false;
          SPContext.logger.error('Failed to save FINRACommentsReceived', error, { itemId: effectiveItemId });
          // Revert both currentRequest and originalRequest on failure
          const current = useRequestStore.getState();
          if (current.currentRequest) {
            useRequestStore.setState({
              currentRequest: {
                ...current.currentRequest,
                finraCommentsReceived: previousValue,
                finraComment: previousComment,
              },
              originalRequest: current.originalRequest
                ? {
                  ...current.originalRequest,
                  finraCommentsReceived: previousValue,
                  finraComment: previousComment,
                }
                : current.originalRequest,
            });
          }
        });
    },
    [onCommentsReceivedChange, effectiveItemId]
  );

  const handleFinraCommentBlur = React.useCallback(async (): Promise<void> => {
    if (!effectiveItemId || isReadOnly || !commentsReceived || isSavingCommentTextRef.current) {
      return;
    }

    const nextComment = useRequestStore.getState().currentRequest?.finraComment ?? '';
    const savedComment = originalRequest?.finraComment ?? '';

    if (nextComment === savedComment) {
      return;
    }

    setIsSavingCommentText(true);

    try {
      await SPContext.sp.web.lists
        .getByTitle(Lists.Requests.Title)
        .items.getById(effectiveItemId)
        .update({
          [RequestsFields.FINRAComment]: nextComment,
        });

      const latest = useRequestStore.getState();
      if (latest.currentRequest) {
        useRequestStore.setState({
          currentRequest: {
            ...latest.currentRequest,
            finraComment: nextComment,
          },
          originalRequest: latest.originalRequest
            ? {
              ...latest.originalRequest,
              finraComment: nextComment,
            }
            : latest.originalRequest,
        });
      }

    } catch (error: unknown) {
      SPContext.logger.error('Failed to save FINRAComment', error, { itemId: effectiveItemId });
    } finally {
      setIsSavingCommentText(false);
    }
  }, [commentsReceived, effectiveItemId, isReadOnly, originalRequest?.finraComment, setIsSavingCommentText]);

  const handleFinraCommentBlurEvent = React.useCallback((): void => {
    handleFinraCommentBlur().catch((error: unknown) => {
      SPContext.logger.error('Failed to process FINRA comment blur', error, { itemId: effectiveItemId });
    });
  }, [effectiveItemId, handleFinraCommentBlur]);

  /**
   * Handle files change
   */
  const handleFilesChange = React.useCallback((): void => {}, []);

  /**
   * Handle error
   */
  const handleError = React.useCallback(
    (error: string) => {
      SPContext.logger.error('FINRA document error', new Error(error), { itemId: effectiveItemId });
    },
    [effectiveItemId]
  );

  // Check if request was completed without FINRA documents
  // (finraCompletedOn is set, meaning the FINRA stage was completed)
  const finraCompletedWithoutDocuments = readOnlyProp && !isLoading && finraDocumentCount === 0 && currentRequest?.finraCompletedOn;

  // Don't render if read-only, no documents, and request never went through FINRA completion
  // But wait for documents to finish loading before deciding
  if (readOnlyProp && !isLoading && finraDocumentCount === 0 && !currentRequest?.finraCompletedOn) {
    return null;
  }

  return (
    <Card
      id='finra-documents-card'
      className='finra-documents-card'
      allowExpand={true}
      defaultExpanded={defaultExpanded}
    >
      <Header size='regular'>
        <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 12 }}>
          <Icon iconName='Attach' styles={{ root: { fontSize: '20px', color: '#0078d4' } }} />
          <Text variant='large' styles={{ root: { fontWeight: 600 } }}>
            FINRA Documents
          </Text>
          {finraDocumentCount > 0 && (
            <span className='document-count-badge'>
              {finraDocumentCount}
            </span>
          )}
          {finraDocumentCount === 0 && !finraCompletedWithoutDocuments && (
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
        {finraCompletedWithoutDocuments ? (
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
              No FINRA documents were uploaded. The request was completed without attaching FINRA documents.
            </Text>
          </Stack>
        ) : (
          <DocumentUpload
            itemId={effectiveItemId}
            documentType={DocumentType.FINRA}
            isReadOnly={isReadOnly}
            required={true}
            hasError={finraDocumentCount === 0}
            siteUrl={siteUrl || SPContext.webAbsoluteUrl}
            documentLibraryTitle={documentLibraryTitle}
            maxFiles={10}
            maxFileSize={250 * 1024 * 1024}
            onFilesChange={handleFilesChange}
            onError={handleError}
          />
        )}

        <Separator />

        {/* Comments Received — prominent callout so users don't miss it */}
        <Stack
          horizontal
          verticalAlign='center'
          tokens={{ childrenGap: 12 }}
          styles={{
            root: {
              padding: '12px 16px',
              backgroundColor: commentsReceived ? '#dff6dd' : '#f4f4f4',
              borderRadius: '6px',
              border: commentsReceived ? '1px solid #107c10' : '1px solid #e1dfdd',
              transition: 'all 0.2s ease',
            },
          }}
        >
          <Stack tokens={{ childrenGap: 2 }} styles={{ root: { flex: 1 } }}>
            <Checkbox
              label='FINRA Comments Received'
              checked={commentsReceived}
              onChange={handleCommentsReceivedChange}
              disabled={isReadOnly}
              ariaLabel='Indicate if FINRA comments have been received'
              styles={{
                label: { fontWeight: 600 },
              }}
            />
            <Text variant='small' styles={{ root: { color: '#605e5c', paddingLeft: '26px' } }}>
              Check this box if comments have been received from FINRA for this submission.
            </Text>
          </Stack>
        </Stack>

        {/* FINRA Comment — shown when comments received is checked */}
        {commentsReceived && (
          isReadOnly ? (
            finraComment ? (
              <Stack
                styles={{
                  root: {
                    padding: '12px 16px',
                    backgroundColor: '#f3f2f1',
                    borderRadius: '4px',
                    border: '1px solid #edebe9',
                    marginTop: '12px',
                  },
                }}
              >
                <Text variant='small' styles={{ root: { fontWeight: 600, marginBottom: '4px' } }}>
                  FINRA Comment
                </Text>
                <Text styles={{ root: { whiteSpace: 'pre-wrap' } }}>{finraComment}</Text>
              </Stack>
            ) : null
          ) : (
            <Stack styles={{ root: { marginTop: '12px' } }}>
              <TextField
                label='FINRA Comment'
                multiline
                rows={4}
                value={finraComment}
                onChange={handleFinraCommentChange}
                onBlur={handleFinraCommentBlurEvent}
                placeholder='Enter details about the FINRA comments received (optional)'
                ariaLabel='FINRA comment details'
                styles={{
                  root: { width: '100%' },
                }}
              />
            </Stack>
          )
        )}
      </Content>
    </Card>
  );
};

export default FINRADocuments;
