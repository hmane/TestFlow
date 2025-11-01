/**
 * RequestDocuments Component
 *
 * Displays the attachments section for a legal request
 * - Uses DocumentUpload component in Attachment mode (Review/Supplemental)
 * - Smart collapse based on status and role
 * - Read-only logic based on workflow state
 * - Enhanced header showing document counts when collapsed
 */

import * as React from 'react';
import { Stack, Text, Icon, IconButton, Separator } from '@fluentui/react';
import { SPContext } from 'spfx-toolkit';
import { Card } from 'spfx-toolkit/lib/components/Card';

import { Lists } from '@sp/Lists';

import { DocumentUpload } from '../../../../components/DocumentUpload';
import { useDocumentsStore } from '../../../../stores/documentsStore';
import { useRequestFormContext } from '../../../../contexts/RequestFormContext';
import { usePermissions } from '../../../../hooks/usePermissions';
import { RequestStatus, LegalReviewStatus, ComplianceReviewStatus } from '../../../../types/workflowTypes';

/**
 * RequestDocuments Component Props
 */
export interface IRequestDocumentsProps {
  itemId?: number;
  defaultCollapsed?: boolean;
  siteUrl?: string;
  documentLibraryTitle?: string;
}

/**
 * RequestDocuments Component
 */
export const RequestDocuments: React.FC<IRequestDocumentsProps> = ({
  itemId,
  defaultCollapsed,
  siteUrl,
  documentLibraryTitle = Lists.RequestDocuments.Title,
}) => {
  const { status } = useRequestFormContext();
  const { isSubmitter, isAttorney, isComplianceUser, isAdmin } = usePermissions();

  // Get documents from store
  const { documents, getPendingCounts } = useDocumentsStore();

  // State for collapsible section
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed || false);

  // Get Legal and Compliance review statuses from form context
  // TODO: Add these to RequestFormContext or read from currentRequest
  const legalReviewStatus: LegalReviewStatus | undefined = React.useMemo(() => {
    // This will come from form context once integrated
    return undefined;
  }, []);

  const complianceReviewStatus: ComplianceReviewStatus | undefined = React.useMemo(() => {
    // This will come from form context once integrated
    return undefined;
  }, []);

  /**
   * Determine if attachments should be read-only
   */
  const isReadOnly = React.useMemo(() => {
    // Admins can always edit
    if (isAdmin) {
      return false;
    }

    // Draft mode: Always editable for everyone (new or saved drafts)
    if (!status || status === RequestStatus.Draft) {
      return false;
    }

    // Attorneys can edit during legal review
    if (isAttorney && status === RequestStatus.InReview) {
      return false;
    }

    // Compliance users can edit during compliance review
    if (isComplianceUser && status === RequestStatus.InReview) {
      return false;
    }

    // Submitters can edit when waiting on them
    if (isSubmitter) {
      // Editable when either Legal or Compliance is waiting on submitter
      if (
        legalReviewStatus === LegalReviewStatus.WaitingOnSubmitter ||
        complianceReviewStatus === ComplianceReviewStatus.WaitingOnSubmitter
      ) {
        return false;
      }
    }

    // Default: read-only
    return true;
  }, [isAdmin, isAttorney, isComplianceUser, isSubmitter, status, legalReviewStatus, complianceReviewStatus]);

  // Update collapsed state when defaultCollapsed prop changes
  React.useEffect(() => {
    if (defaultCollapsed !== undefined) {
      setIsCollapsed(defaultCollapsed);
    } else if (status === RequestStatus.Completed || status === RequestStatus.Cancelled) {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false);
    }
  }, [defaultCollapsed, status]);

  /**
   * Calculate document counts for collapsed header
   */
  const documentCounts = React.useMemo(() => {
    const reviewCounts = getPendingCounts('Review' as any);
    const supplementalCounts = getPendingCounts('Supplemental' as any);

    const reviewTotal = reviewCounts.newCount + (documents.get('Review' as any)?.length || 0);
    const supplementalTotal = supplementalCounts.newCount + (documents.get('Supplemental' as any)?.length || 0);
    const total = reviewTotal + supplementalTotal;

    return {
      total,
      review: reviewTotal,
      supplemental: supplementalTotal,
    };
  }, [documents, getPendingCounts]);

  /**
   * Build collapsed header summary
   */
  const collapsedSummary = React.useMemo(() => {
    if (documentCounts.total === 0) {
      return 'No documents uploaded';
    }

    const parts: string[] = [];

    if (documentCounts.review > 0) {
      parts.push(`${documentCounts.review} Review`);
    }

    if (documentCounts.supplemental > 0) {
      parts.push(`${documentCounts.supplemental} Supplemental`);
    }

    return `${documentCounts.total} document${documentCounts.total === 1 ? '' : 's'} • ${parts.join(', ')}`;
  }, [documentCounts]);

  /**
   * Handle files change
   */
  const handleFilesChange = React.useCallback(() => {
    SPContext.logger.info('Attachments changed', { itemId });
  }, [itemId]);

  /**
   * Handle error
   */
  const handleError = React.useCallback((error: string) => {
    SPContext.logger.error('Attachment error', new Error(error), { itemId });
  }, [itemId]);

  return (
    <Stack
      tokens={{ childrenGap: 24 }}
      styles={{
        root: {
          padding: '24px',
          width: '100%',
        },
      }}
    >
      <Card id="attachments-card" className="attachments-card">
        <Stack tokens={{ childrenGap: 16 }} styles={{ root: { padding: '24px' } }}>
          {/* Header */}
          <Stack
            horizontal
            verticalAlign="center"
            horizontalAlign="space-between"
            onClick={() => setIsCollapsed(!isCollapsed)}
            styles={{ root: { cursor: 'pointer' } }}
          >
            <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 12 }}>
              <Icon iconName="Attach" styles={{ root: { fontSize: '20px', color: '#0078d4' } }} />
              <Stack tokens={{ childrenGap: 4 }}>
                <Text variant="xLarge" styles={{ root: { fontWeight: 600 } }}>
                  Attachments
                </Text>
                {isCollapsed && (
                  <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
                    {collapsedSummary}
                  </Text>
                )}
              </Stack>
            </Stack>
            <IconButton
              iconProps={{ iconName: isCollapsed ? 'ChevronDown' : 'ChevronUp' }}
              title={isCollapsed ? 'Expand' : 'Collapse'}
            />
          </Stack>

          {!isCollapsed && (
            <>
              <Separator />
              <DocumentUpload
                itemId={itemId}
                isReadOnly={isReadOnly}
                required={false}
                siteUrl={siteUrl || SPContext.webAbsoluteUrl}
                documentLibraryTitle={documentLibraryTitle}
                maxFiles={50}
                maxFileSize={250 * 1024 * 1024} // 250MB
                allowedExtensions={[
                  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
                  'jpg', 'jpeg', 'png', 'gif', 'bmp',
                  'txt', 'rtf', 'csv',
                  'zip', 'msg', 'eml',
                ]}
                onFilesChange={handleFilesChange}
                onError={handleError}
              />

              {/* Read-only indicator (only show when truly read-only and not in Draft) */}
              {isReadOnly && status && status !== RequestStatus.Draft && (
                <Text
                  variant="small"
                  styles={{
                    root: {
                      color: '#605e5c',
                      fontStyle: 'italic',
                      marginTop: '8px',
                    },
                  }}
                >
                  Documents are currently read-only
                </Text>
              )}
            </>
          )}
        </Stack>
      </Card>
    </Stack>
  );
};
