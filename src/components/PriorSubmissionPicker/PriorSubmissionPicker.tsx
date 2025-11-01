/**
 * PriorSubmissionPicker Component
 *
 * DevExtreme Autocomplete for selecting prior submissions
 * Features:
 * - Filters by current user's department
 * - Searches request title, purpose, request ID, submission item
 * - Shows request ID, title, and created date in dropdown
 * - Displays selected requests as chips with click to open
 * - Remove capability for selected items
 */

import {
  Icon,
  IconButton,
  Link,
  Spinner,
  SpinnerSize,
  Stack,
  Text,
  TooltipHost,
} from '@fluentui/react';
import Autocomplete from 'devextreme-react/autocomplete';
import * as React from 'react';
import { SPContext } from 'spfx-toolkit';
import type { SPLookup } from 'spfx-toolkit/lib/types';
import './PriorSubmissionPicker.scss';

export interface IPriorSubmission {
  id: number;
  requestId: string;
  title: string;
  purpose?: string;
  submissionItemTitle?: string;
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

  /**
   * Load prior submissions from SharePoint
   */
  const loadPriorSubmissions = React.useCallback(
    async (searchText: string): Promise<void> => {
      if (!searchText || searchText.length < 2) {
        setDataSource([]);
        return;
      }

      setIsLoading(true);

      try {
        // Build filter for search
        let filter = `(substringof('${searchText}',Title) or ` +
          `substringof('${searchText}',RequestID) or ` +
          `substringof('${searchText}',Purpose) or ` +
          `substringof('${searchText}',SubmissionItem/Title))`;

        // Add department filter if available
        if (currentUserDepartment) {
          filter += ` and Department eq '${currentUserDepartment}'`;
        }

        // Only get completed requests
        filter += ` and Status eq 'Completed'`;

        const items = await SPContext.sp.web.lists
          .getByTitle('Requests')
          .items.select(
            'Id',
            'Title',
            'RequestID',
            'Purpose',
            'SubmissionItem/Title',
            'Created',
            'Author/Title',
            'Department'
          )
          .expand('SubmissionItem', 'Author')
          .filter(filter)
          .orderBy('Created', false)
          .top(20)();

        const submissions: IPriorSubmission[] = items.map((item: any) => ({
          id: item.Id,
          requestId: item.RequestID || item.Title,
          title: item.Title,
          purpose: item.Purpose,
          submissionItemTitle: item.SubmissionItem?.Title,
          created: item.Created,
          createdBy: item.Author?.Title,
          department: item.Department,
        }));

        setDataSource(submissions);
      } catch (error: unknown) {
        SPContext.logger.error('Failed to load prior submissions', error);
        setDataSource([]);
      } finally {
        setIsLoading(false);
      }
    },
    [currentUserDepartment]
  );

  /**
   * Debounced search
   */
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue) {
        void loadPriorSubmissions(searchValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, loadPriorSubmissions]);

  /**
   * Load selected requests details
   */
  React.useEffect(() => {
    if (!value || value.length === 0) {
      setSelectedRequests([]);
      return;
    }

    const loadSelectedDetails = async (): Promise<void> => {
      try {
        // Build array of IDs
        const ids: number[] = [];
        for (let i = 0; i < value.length; i++) {
          if (value[i].id !== undefined && value[i].id !== null) {
            ids.push(value[i].id as number);
          }
        }

        if (ids.length === 0) {
          setSelectedRequests([]);
          return;
        }

        // Build filter with OR conditions
        const filterParts: string[] = [];
        for (let i = 0; i < ids.length; i++) {
          filterParts.push(`Id eq ${ids[i]}`);
        }
        const filter = filterParts.join(' or ');

        const items = await SPContext.sp.web.lists
          .getByTitle('Requests')
          .items.select(
            'Id',
            'Title',
            'RequestID',
            'Purpose',
            'SubmissionItem/Title',
            'Created',
            'Author/Title',
            'Department'
          )
          .expand('SubmissionItem', 'Author')
          .filter(filter)
          .orderBy('Created', false)();

        const submissions: IPriorSubmission[] = items.map((item: any) => ({
          id: item.Id,
          requestId: item.RequestID || item.Title,
          title: item.Title,
          purpose: item.Purpose,
          submissionItemTitle: item.SubmissionItem?.Title,
          created: item.Created,
          createdBy: item.Author?.Title,
          department: item.Department,
        }));

        setSelectedRequests(submissions);
      } catch (error: unknown) {
        SPContext.logger.error('Failed to load selected requests', error);
      }
    };

    void loadSelectedDetails();
  }, [value]);

  /**
   * Handle selection
   */
  const handleSelect = React.useCallback(
    (selectedItem: any): void => {
      if (!selectedItem) return;

      const submission = selectedItem as IPriorSubmission;

      // Check if already selected
      const alreadySelected = value.some(v => v.id === submission.id);
      if (alreadySelected) {
        SPContext.logger.info('Request already selected', { id: submission.id });
        return;
      }

      // Add to selected
      const newValue = [...value, { id: submission.id, title: submission.title }];
      onChange(newValue);

      // Clear search
      setSearchValue('');
      setDataSource([]);
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
    const listId = SPContext.pageContext?.list?.id?.toString() || '';
    const webUrl = SPContext.pageContext?.web?.absoluteUrl || '';

    if (webUrl && listId) {
      const url = `${webUrl}/Lists/${listId}/DispForm.aspx?ID=${id}`;
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
  }, []);

  /**
   * Custom item template for dropdown
   */
  const renderItem = (item: IPriorSubmission): JSX.Element => {
    return (
      <div className="prior-submission-item">
        <Stack tokens={{ childrenGap: 4 }}>
          <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
            <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
              <Icon iconName="Document" styles={{ root: { color: '#0078d4', fontSize: 16 } }} />
              <Text styles={{ root: { fontWeight: 600, color: '#0078d4' } }}>
                {item.requestId}
              </Text>
            </Stack>
            <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
              {formatDate(item.created)}
            </Text>
          </Stack>
          <Text styles={{ root: { fontWeight: 500 } }}>{item.title}</Text>
          {item.submissionItemTitle && (
            <Stack horizontal tokens={{ childrenGap: 4 }} verticalAlign="center">
              <Icon iconName="Tag" styles={{ root: { fontSize: 12, color: '#605e5c' } }} />
              <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
                {item.submissionItemTitle}
              </Text>
            </Stack>
          )}
        </Stack>
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
          displayExpr="title"
          placeholder={placeholder}
          disabled={disabled}
          searchEnabled={true}
          minSearchLength={2}
          searchTimeout={300}
          showClearButton={true}
          onItemClick={handleSelect}
          onFocusOut={handleFocusOut}
          itemRender={renderItem}
          noDataText={
            isLoading
              ? ''  // Empty string when loading (we'll show spinner below)
              : searchValue.length < 2
              ? 'Type at least 2 characters to search'
              : 'No prior submissions found'
          }
          stylingMode="outlined"
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

        {/* No Results Message */}
        {!isLoading && searchValue.length >= 2 && dataSource.length === 0 && (
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

      {/* Selected Requests List */}
      {selectedRequests.length > 0 && (
        <div className="selected-requests">
          <Text
            variant="small"
            styles={{ root: { fontWeight: 600, marginBottom: '8px', display: 'block' } }}
          >
            Selected Prior Submissions ({selectedRequests.length})
          </Text>
          <Stack tokens={{ childrenGap: 8 }}>
            {selectedRequests.map(request => (
              <div key={request.id} className="selected-request-card">
                <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                  <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign="center" styles={{ root: { flex: 1, minWidth: 0 } }}>
                    <Icon
                      iconName="DocumentSet"
                      styles={{ root: { color: '#0078d4', fontSize: 20, flexShrink: 0 } }}
                    />
                    <Stack tokens={{ childrenGap: 2 }} styles={{ root: { flex: 1, minWidth: 0 } }}>
                      <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                        <TooltipHost content="Click to open in new tab">
                          <Link
                            onClick={() => handleOpenRequest(request.id)}
                            styles={{
                              root: {
                                fontWeight: 600,
                                color: '#0078d4',
                                cursor: 'pointer',
                                textDecoration: 'none',
                                '&:hover': {
                                  textDecoration: 'underline',
                                },
                              },
                            }}
                          >
                            {request.requestId}
                          </Link>
                        </TooltipHost>
                        <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
                          {formatDate(request.created)}
                        </Text>
                      </Stack>
                      <Text
                        styles={{
                          root: {
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          },
                        }}
                      >
                        {request.title}
                      </Text>
                      {request.submissionItemTitle && (
                        <Stack horizontal tokens={{ childrenGap: 4 }} verticalAlign="center">
                          <Icon
                            iconName="Tag"
                            styles={{ root: { fontSize: 12, color: '#605e5c' } }}
                          />
                          <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
                            {request.submissionItemTitle}
                          </Text>
                        </Stack>
                      )}
                    </Stack>
                  </Stack>
                  <TooltipHost content="Remove">
                    <IconButton
                      iconProps={{ iconName: 'Cancel' }}
                      onClick={() => handleRemove(request.id)}
                      disabled={disabled}
                      styles={{
                        root: {
                          flexShrink: 0,
                          color: '#605e5c',
                          '&:hover': {
                            color: '#d13438',
                            backgroundColor: '#fef6f6',
                          },
                        },
                      }}
                      ariaLabel="Remove prior submission"
                    />
                  </TooltipHost>
                </Stack>
              </div>
            ))}
          </Stack>
        </div>
      )}
    </div>
  );
};
