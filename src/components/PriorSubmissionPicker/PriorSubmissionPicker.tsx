/**
 * PriorSubmissionPicker Component
 *
 * DevExtreme Autocomplete for selecting prior submissions
 * Features:
 * - Filters by current user's department
 * - Searches request title, purpose, request ID, submission item
 * - Shows request ID, title, and created date in dropdown
 * - Displays selected requests as compact chips with flow wrapping
 * - Hover card shows request details
 * - Remove capability for selected items
 */

import { Icon } from '@fluentui/react/lib/Icon';
import { IconButton } from '@fluentui/react/lib/Button';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import Autocomplete from 'devextreme-react/autocomplete';
import * as React from 'react';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import type { SPLookup } from 'spfx-toolkit/lib/types';
import { RequestHoverCard } from '@components/RequestHoverCard';
import { Lists } from '@sp/Lists';
import { RequestsFields } from '@sp/listFields';
import './PriorSubmissionPicker.scss';

export interface IPriorSubmission {
  id: number;
  requestId: string; // Title field (Request ID like CRR-25-1)
  requestTitle: string; // RequestTitle field
  purpose?: string;
  submissionItem?: string; // Text field, not lookup
  status?: string; // Request status
  created: string;
  createdBy?: string;
  department?: string;
}

export interface IPriorSubmissionPickerProps {
  value?: SPLookup[];
  onChange: (value: SPLookup[]) => void;
  disabled?: boolean;
  currentUserDepartment?: string;
  placeholder?: string;
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export const PriorSubmissionPicker: React.FC<IPriorSubmissionPickerProps> = ({
  value = [],
  onChange,
  disabled = false,
  currentUserDepartment,
  placeholder = 'Search by request ID, title, purpose, or submission item...',
}) => {
  const [dataSource, setDataSource] = React.useState<IPriorSubmission[]>([]);
  const [selectedRequests, setSelectedRequests] = React.useState<IPriorSubmission[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [searchValue, setSearchValue] = React.useState<string>('');
  const [hasSearched, setHasSearched] = React.useState<boolean>(false);

  // Cache for submission details to avoid duplicate API calls
  // When user selects from dropdown, we already have the data - cache it
  const submissionCacheRef = React.useRef<Map<number, IPriorSubmission>>(new Map());

  /**
   * Load prior submissions from SharePoint
   */
  const loadPriorSubmissions = React.useCallback(
    async (searchText: string): Promise<void> => {
      if (!searchText || searchText.length < 2) {
        setDataSource([]);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);

      try {
        // Escape single quotes in search text for OData filter
        const escapedSearch = searchText.replace(/'/g, "''");

        // Build filter for search on Text fields only (Note fields like Purpose cannot be filtered)
        // Title = Request ID (CRR-25-1), RequestTitle = actual title, SubmissionItem = text field, ContentId = business tracking/content id
        let filter = `(substringof('${escapedSearch}',${RequestsFields.RequestId}) or ` +
          `substringof('${escapedSearch}',${RequestsFields.RequestTitle}) or ` +
          `substringof('${escapedSearch}',${RequestsFields.SubmissionItem}) or ` +
          `substringof('${escapedSearch}',${RequestsFields.ContentId}))`;

        // Add department filter if available
        if (currentUserDepartment) {
          filter += ` and ${RequestsFields.Department} eq '${currentUserDepartment.replace(/'/g, "''")}'`;
        }

        // Search all requests regardless of status (not just completed)

        const items = await SPContext.sp.web.lists
          .getByTitle(Lists.Requests.Title)
          .items.select(
            RequestsFields.ID,
            RequestsFields.RequestId, // Request ID (CRR-25-1)
            RequestsFields.RequestTitle, // Actual title
            RequestsFields.Purpose,
            RequestsFields.SubmissionItem, // Text field
            RequestsFields.ContentId, // Business tracking/content id
            RequestsFields.Status,
            RequestsFields.Created,
            `${RequestsFields.Author}/Title`,
            RequestsFields.Department
          )
          .expand(RequestsFields.Author)
          .filter(filter)
          .orderBy(RequestsFields.Created, false)
          .top(20)();

        const submissions: IPriorSubmission[] = items.map((item: any) => ({
          id: item.Id,
          requestId: item.Title, // Title field IS the Request ID
          requestTitle: item.RequestTitle || '',
          purpose: item.Purpose,
          submissionItem: item.SubmissionItem,
          status: item.Status,
          created: item.Created,
          createdBy: item.Author?.Title,
          department: item.Department,
        }));

        // Cache search results to avoid duplicate API calls when selecting
        submissions.forEach(submission => {
          submissionCacheRef.current.set(submission.id, submission);
        });

        setDataSource(submissions);
      } catch (error: unknown) {
        SPContext.logger.error('Failed to load prior submissions', error);
        setDataSource([]);
      } finally {
        setIsLoading(false);
        setHasSearched(true);
      }
    },
    [currentUserDepartment]
  );

  /**
   * Debounced search
   */
  React.useEffect(() => {
    // Reset hasSearched when search value changes (new search starting)
    setHasSearched(false);

    const timer = setTimeout(() => {
      if (searchValue) {
        void loadPriorSubmissions(searchValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, loadPriorSubmissions]);

  /**
   * Load selected requests details - uses cache to avoid duplicate API calls
   * Only fetches items that aren't already cached (e.g., on initial load with pre-selected values)
   */
  React.useEffect(() => {
    if (!value || value.length === 0) {
      setSelectedRequests([]);
      return;
    }

    const loadSelectedDetails = async (): Promise<void> => {
      try {
        // Build array of IDs and check cache
        const cachedSubmissions: IPriorSubmission[] = [];
        const uncachedIds: number[] = [];

        for (let i = 0; i < value.length; i++) {
          const id = value[i].id;
          if (id !== undefined && id !== null) {
            const cached = submissionCacheRef.current.get(id as number);
            if (cached) {
              cachedSubmissions.push(cached);
            } else {
              uncachedIds.push(id as number);
            }
          }
        }

        // If all items are cached, no API call needed
        if (uncachedIds.length === 0) {
          // Preserve order from value array
          const orderedSubmissions = value
            .map(v => submissionCacheRef.current.get(v.id as number))
            .filter((s): s is IPriorSubmission => s !== undefined);
          setSelectedRequests(orderedSubmissions);
          return;
        }

        // Only fetch uncached items
        const filterParts: string[] = [];
        for (let i = 0; i < uncachedIds.length; i++) {
          filterParts.push(`${RequestsFields.ID} eq ${uncachedIds[i]}`);
        }
        const filter = filterParts.join(' or ');

        const items = await SPContext.sp.web.lists
          .getByTitle(Lists.Requests.Title)
          .items.select(
            RequestsFields.ID,
            RequestsFields.RequestId, // Request ID
            RequestsFields.RequestTitle,
            RequestsFields.Purpose,
            RequestsFields.SubmissionItem, // Text field
            RequestsFields.ContentId, // Business tracking/content id
            RequestsFields.Status,
            RequestsFields.Created,
            `${RequestsFields.Author}/Title`,
            RequestsFields.Department
          )
          .expand(RequestsFields.Author)
          .filter(filter)
          .orderBy(RequestsFields.Created, false)();

        const fetchedSubmissions: IPriorSubmission[] = items.map((item: any) => ({
          id: item.Id,
          requestId: item.Title, // Title IS the Request ID
          requestTitle: item.RequestTitle || '',
          purpose: item.Purpose,
          submissionItem: item.SubmissionItem,
          status: item.Status,
          created: item.Created,
          createdBy: item.Author?.Title,
          department: item.Department,
        }));

        // Cache the newly fetched items
        fetchedSubmissions.forEach(submission => {
          submissionCacheRef.current.set(submission.id, submission);
        });

        // Combine and order by value array order
        const orderedSubmissions = value
          .map(v => submissionCacheRef.current.get(v.id as number))
          .filter((s): s is IPriorSubmission => s !== undefined);

        setSelectedRequests(orderedSubmissions);
      } catch (error: unknown) {
        SPContext.logger.error('Failed to load selected requests', error);
      }
    };

    void loadSelectedDetails();
  }, [value]);

  /**
   * Handle selection from DevExtreme onItemClick event
   */
  const handleSelect = React.useCallback(
    (e: { itemData?: IPriorSubmission }): void => {
      // DevExtreme passes event object with itemData property
      const submission = e?.itemData;
      if (!submission) return;

      // Check if already selected
      const alreadySelected = value.some(v => v.id === submission.id);
      if (alreadySelected) {
        SPContext.logger.info('Request already selected', { id: submission.id });
        setSearchValue('');
        setDataSource([]);
        setHasSearched(false);
        return;
      }

      // Add to selected - store requestId (Title field) for display
      const newValue = [...value, { id: submission.id, title: submission.requestId }];
      onChange(newValue);

      // Clear search
      setSearchValue('');
      setDataSource([]);
      setHasSearched(false);
    },
    [value, onChange]
  );

  /**
   * Handle remove
   */
  const handleRemove = React.useCallback(
    (id: number): void => {
      const newValue = value.filter(v => v.id !== id);
      onChange(newValue);
    },
    [value, onChange]
  );

  /**
   * Open request in new tab
   */
  const handleOpenRequest = React.useCallback((id: number): void => {
    const webUrl = SPContext.pageContext?.web?.absoluteUrl || '';

    if (webUrl) {
      const url = `${webUrl}/Lists/Requests/DispForm.aspx?ID=${id}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  /**
   * Handle focus out - clear search if no selection made
   */
  const handleFocusOut = React.useCallback((): void => {
    // Clear search value and results when user focuses out
    setSearchValue('');
    setDataSource([]);
    setHasSearched(false);
  }, []);

  /**
   * Get status badge color based on status
   */
  const getStatusColor = (status?: string): { bg: string; text: string } => {
    switch (status) {
      case 'Completed':
        return { bg: '#dff6dd', text: '#107c10' };
      case 'In Review':
        return { bg: '#deecf9', text: '#0078d4' };
      case 'Closeout':
        return { bg: '#fff4ce', text: '#797600' };
      case 'On Hold':
        return { bg: '#deecf9', text: '#0078d4' };
      case 'Cancelled':
        return { bg: '#fde7e9', text: '#a4262c' };
      default:
        return { bg: '#f3f2f1', text: '#605e5c' };
    }
  };

  /**
   * Custom item template for dropdown
   * Using inline styles because DevExtreme renders the dropdown in a portal
   * outside our component's DOM, so scoped CSS classes won't apply
   */
  const renderItem = (item: IPriorSubmission): JSX.Element => {
    const statusColor = getStatusColor(item.status);

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          padding: '10px 12px',
          cursor: 'pointer',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #f3f2f1',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontWeight: 600,
              color: '#0078d4',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Icon iconName="DocumentSet" styles={{ root: { fontSize: 14, color: '#0078d4' } }} />
            {item.requestId}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {item.status && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '10px',
                  backgroundColor: statusColor.bg,
                  color: statusColor.text,
                  whiteSpace: 'nowrap',
                }}
              >
                {item.status}
              </span>
            )}
            <span style={{ fontSize: '11px', color: '#a19f9d', flexShrink: 0 }}>
              {formatDate(item.created)}
            </span>
          </div>
        </div>
        {item.requestTitle && (
          <div
            style={{
              fontSize: '13px',
              color: '#323130',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.requestTitle}
          </div>
        )}
        {item.submissionItem && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: '#605e5c',
            }}
          >
            <Icon iconName="Tag" styles={{ root: { fontSize: 11, color: '#605e5c' } }} />
            <span>{item.submissionItem}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="prior-submission-picker">
      {/* Autocomplete Search */}
      <div className="search-container">
        <Autocomplete
          value={searchValue}
          onValueChanged={(e: any) => setSearchValue(e.value || '')}
          dataSource={dataSource}
          valueExpr="id"
          displayExpr="requestTitle"
          placeholder={placeholder}
          disabled={disabled}
          searchEnabled={false}
          minSearchLength={0}
          deferRendering={false}
          showClearButton={true}
          onItemClick={handleSelect}
          onFocusOut={handleFocusOut}
          itemRender={renderItem}
          opened={dataSource.length > 0 && searchValue.length >= 2}
          noDataText={
            isLoading
              ? 'Searching...'
              : searchValue.length < 2
              ? 'Type at least 2 characters to search'
              : 'No prior submissions found'
          }
          stylingMode="outlined"
          dropDownOptions={{
            maxHeight: 350,
            width: 'auto',
            minWidth: 400,
            wrapperAttr: { class: 'prior-submission-dropdown' },
          }}
        />

        {/* Loading Spinner */}
        {isLoading && searchValue.length >= 2 && (
          <div className="loading-container">
            <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
              <Spinner size={SpinnerSize.small} />
              <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
                Searching prior submissions...
              </Text>
            </Stack>
          </div>
        )}

        {/* No Results Message - only show after search has completed */}
        {!isLoading && hasSearched && searchValue.length >= 2 && dataSource.length === 0 && (
          <div className="no-results-container">
            <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
              <Icon iconName="SearchIssue" styles={{ root: { color: '#a19f9d', fontSize: 16 } }} />
              <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
                No prior submissions found matching "{searchValue}"
              </Text>
            </Stack>
          </div>
        )}
      </div>

      {/* Selected Requests - Compact Cards with Flow Wrapping */}
      {selectedRequests.length > 0 && (
        <div className="selected-requests">
          <div className="selected-cards-container">
            {selectedRequests.map(request => (
              <div key={request.id} className="selected-card">
                <RequestHoverCard
                  requestId={request.id}
                  data={{
                    id: request.id,
                    requestId: request.requestId,
                    requestTitle: request.requestTitle,
                    submissionItem: request.submissionItem,
                    created: new Date(request.created),
                  }}
                >
                  <button
                    type="button"
                    className="card-content"
                    onClick={() => handleOpenRequest(request.id)}
                    aria-label={`${request.requestId} - ${request.requestTitle}. Click to open, hover for details.`}
                  >
                    {/* Header: Request ID + Submission Type */}
                    <div className="card-header">
                      <span className="card-request-id">
                        <Icon iconName="DocumentSet" className="card-icon" />
                        {request.requestId}
                      </span>
                      {request.submissionItem && (
                        <span className="card-type-badge">{request.submissionItem}</span>
                      )}
                    </div>
                    {/* Title (truncated) */}
                    <div className="card-title" title={request.requestTitle}>
                      {request.requestTitle}
                    </div>
                    {/* Footer: Created By + Date */}
                    <div className="card-footer">
                      {request.createdBy && (
                        <span className="card-created-by">
                          <Icon iconName="Contact" className="card-footer-icon" />
                          {request.createdBy}
                        </span>
                      )}
                      <span className="card-date">{formatDate(request.created)}</span>
                    </div>
                  </button>
                </RequestHoverCard>
                <IconButton
                  iconProps={{ iconName: 'Cancel' }}
                  onClick={() => handleRemove(request.id)}
                  disabled={disabled}
                  className="card-remove"
                  ariaLabel={`Remove ${request.requestId}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
