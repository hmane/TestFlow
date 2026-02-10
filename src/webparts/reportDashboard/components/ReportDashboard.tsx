import * as React from 'react';
import styles from './ReportDashboard.module.scss';
import type { IReportDashboardProps, IUserGroups, ISearchConfig, ISearchResult, ProgressBarColor, ReviewAudienceType } from './IReportDashboardProps';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { CommandBarButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { getUserGroupMembership } from '@services/userGroupsService';
import { Lists } from '@sp/Lists';
import { ConfigurationFields } from '@sp/listFields';
import {
  extractRequestIdFromPath,
  buildDocumentSearchCAML,
  extractRequestIdsFromDocuments,
  type IDocumentRow,
} from '../utils/searchHelpers';

// Constants
// Include site URL in the key so dev/uat/prod each get their own recent searches
const RECENT_SEARCHES_PREFIX = 'lrs_recent_searches';
const getRecentSearchesKey = (): string => {
  try {
    const siteUrl = SPContext.webAbsoluteUrl || '';
    // Use a simple hash of the URL to keep the key short
    const urlHash = siteUrl.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `${RECENT_SEARCHES_PREFIX}_${urlHash}`;
  } catch {
    return RECENT_SEARCHES_PREFIX;
  }
};
const DEFAULT_SEARCH_LIMIT = 10;
const DEFAULT_RECENT_LIMIT = 5;
const DEBOUNCE_DELAY = 300;

// Dashboard page URLs
const DASHBOARD_URLS = {
  HOME: '/SitePages/Home.aspx',
  MY_REQUESTS: '/SitePages/MyRequestsDashboard.aspx',
  LEGAL_ADMIN: '/SitePages/LegalAdminDashboard.aspx',
  ATTORNEY_ASSIGNMENT: '/SitePages/AttorneyAssignmentDashboard.aspx',
  ATTORNEY: '/SitePages/AttorneyDashboard.aspx',
  COMPLIANCE: '/SitePages/ComplianceDashboard.aspx',
  NEW_REQUEST: '/Lists/Requests/NewForm.aspx',
};

// Status order for progress calculation
const STATUS_ORDER: Record<string, number> = {
  'Draft': 1,
  'Legal Intake': 2,
  'Assign Attorney': 3,
  'In Review': 4,
  'Closeout': 5,
  'Completed': 6,
  'Cancelled': 0,
  'On Hold': 0,
};

/**
 * Calculate progress percentage and color
 */
const calculateProgress = (
  status: string,
  targetReturnDate: Date | null,
  submittedToAssignAttorneyOn: Date | null,
  previousStatus: string | null
): { progress: number; color: ProgressBarColor; currentStep: number; totalSteps: number } => {
  const usedAssignAttorneyStep = !!submittedToAssignAttorneyOn;

  // For special statuses, use previous status
  let effectiveStatus = status;
  if (status === 'Cancelled' || status === 'On Hold') {
    effectiveStatus = previousStatus || 'Draft';
  }

  let progress: number;
  let currentStep: number;
  let totalSteps: number;

  if (usedAssignAttorneyStep) {
    totalSteps = 6;
    currentStep = STATUS_ORDER[effectiveStatus] || 1;
    progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
  } else {
    totalSteps = 5;
    const stepMapping: Record<string, number> = {
      'Draft': 1,
      'Legal Intake': 2,
      'Assign Attorney': 3,
      'In Review': 3,
      'Closeout': 4,
      'Completed': 5,
      'Cancelled': 1,
      'On Hold': 1,
    };
    currentStep = stepMapping[effectiveStatus] || 1;
    progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
  }

  progress = Math.max(0, Math.min(100, progress));

  // Determine color
  let color: ProgressBarColor = 'gray';

  if (status === 'Cancelled') {
    color = 'gray';
  } else if (status === 'On Hold') {
    color = 'blue';
  } else if (status === 'Completed') {
    color = 'green';
  } else if (targetReturnDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetReturnDate.getTime());
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      color = 'red';
    } else if (daysRemaining <= 1) {
      color = 'yellow';
    } else {
      color = 'green';
    }
  }

  return { progress, color, currentStep, totalSteps };
};

/**
 * Get status badge class name
 */
const getStatusClass = (status: string): string => {
  const statusMap: Record<string, string> = {
    'Draft': styles.draft,
    'Legal Intake': styles.legalIntake,
    'Assign Attorney': styles.assignAttorney,
    'In Review': styles.inReview,
    'Closeout': styles.closeout,
    'Completed': styles.completed,
    'Cancelled': styles.cancelled,
    'On Hold': styles.onHold,
  };
  return statusMap[status] || '';
};

/**
 * Get progress bar color class
 */
const getProgressColorClass = (color: ProgressBarColor): string => {
  const colorMap: Record<ProgressBarColor, string> = {
    'green': styles.progressGreen,
    'yellow': styles.progressYellow,
    'red': styles.progressRed,
    'blue': styles.progressBlue,
    'gray': styles.progressGray,
  };
  return colorMap[color] || styles.progressGray;
};

/**
 * Format hours for display
 */
const formatHours = (hours: number): string => {
  if (hours === 0) return '0h';
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}m`;
  }
  if (hours % 1 === 0) {
    return `${hours}h`;
  }
  return `${hours.toFixed(1)}h`;
};

/**
 * Get status icon name based on status
 */
const getStatusIcon = (status: string): string => {
  const iconMap: Record<string, string> = {
    'Draft': 'Edit',
    'Legal Intake': 'Inbox',
    'Assign Attorney': 'Contact',
    'In Review': 'RedEye',
    'Closeout': 'CheckMark',
    'Completed': 'CompletedSolid',
    'Cancelled': 'Cancel',
    'On Hold': 'Pause',
  };
  return iconMap[status] || 'Document';
};

/**
 * Get review status indicator for In Review status
 */
const getReviewStatusIndicator = (
  legalStatus: string | null,
  complianceStatus: string | null,
  reviewAudience: string | null
): { icon: string; text: string; className: string } | null => {
  if (!reviewAudience) return null;

  // Check for "Waiting On" statuses first
  const isWaitingLegal = legalStatus === 'Waiting On Submitter';
  const isWaitingCompliance = complianceStatus === 'Waiting On Submitter';

  if (isWaitingLegal || isWaitingCompliance) {
    return {
      icon: 'Warning',
      text: 'Action Needed',
      className: styles.reviewActionNeeded,
    };
  }

  // Check if review is in progress
  const legalInProgress = legalStatus === 'In Progress' || legalStatus === 'Waiting On Attorney';
  const complianceInProgress = complianceStatus === 'In Progress' || complianceStatus === 'Waiting On Compliance';
  const legalCompleted = legalStatus === 'Completed';
  const complianceCompleted = complianceStatus === 'Completed';

  if (reviewAudience === 'Both') {
    if (legalCompleted && complianceCompleted) {
      return { icon: 'CheckMark', text: 'Both Complete', className: styles.reviewComplete };
    }
    if (legalCompleted && complianceInProgress) {
      return { icon: 'RedEye', text: 'Compliance Review', className: styles.reviewInProgress };
    }
    if (complianceCompleted && legalInProgress) {
      return { icon: 'RedEye', text: 'Legal Review', className: styles.reviewInProgress };
    }
    if (legalInProgress || complianceInProgress) {
      return { icon: 'RedEye', text: 'In Review', className: styles.reviewInProgress };
    }
  } else if (reviewAudience === 'Legal') {
    if (legalCompleted) {
      return { icon: 'CheckMark', text: 'Legal Complete', className: styles.reviewComplete };
    }
    if (legalInProgress) {
      return { icon: 'RedEye', text: 'Legal Review', className: styles.reviewInProgress };
    }
  } else if (reviewAudience === 'Compliance') {
    if (complianceCompleted) {
      return { icon: 'CheckMark', text: 'Compliance Complete', className: styles.reviewComplete };
    }
    if (complianceInProgress) {
      return { icon: 'RedEye', text: 'Compliance Review', className: styles.reviewInProgress };
    }
  }

  return null;
};

/**
 * Format target date with urgency
 */
const formatTargetDate = (targetDate: Date | null): { text: string; urgency: 'overdue' | 'urgent' | 'soon' | 'normal' } | null => {
  if (!targetDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate.getTime());
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const dateStr = target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (daysRemaining < 0) {
    const overdueDays = Math.abs(daysRemaining);
    return { text: `${dateStr} (${overdueDays}d overdue)`, urgency: 'overdue' };
  }
  if (daysRemaining === 0) {
    return { text: `${dateStr} (Due today)`, urgency: 'urgent' };
  }
  if (daysRemaining === 1) {
    return { text: `${dateStr} (Tomorrow)`, urgency: 'urgent' };
  }
  if (daysRemaining <= 3) {
    return { text: `${dateStr} (${daysRemaining}d)`, urgency: 'soon' };
  }
  return { text: dateStr, urgency: 'normal' };
};

/**
 * RequestDashboard Toolbar Component
 * Provides command bar navigation and spotlight search functionality
 */
const ReportDashboard: React.FC<IReportDashboardProps> = (props) => {
  const { hasTeamsContext } = props;

  // State
  const [userGroups, setUserGroups] = React.useState<IUserGroups>({
    isSubmitter: true,
    isLegalAdmin: false,
    isAttorneyAssigner: false,
    isAttorney: false,
    isComplianceUser: false,
    isAdmin: false,
  });
  const [searchConfig, setSearchConfig] = React.useState<ISearchConfig>({
    searchResultLimit: DEFAULT_SEARCH_LIMIT,
    recentSearchesLimit: DEFAULT_RECENT_LIMIT,
  });
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<ISearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showResults, setShowResults] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup search debounce timer on unmount
  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Load user groups on mount
   * Uses centralized userGroupsService with caching and deduplication
   */
  React.useEffect(() => {
    const loadUserGroups = async (): Promise<void> => {
      try {
        const membership = await getUserGroupMembership();

        setUserGroups({
          isSubmitter: membership.isSubmitter,
          isLegalAdmin: membership.isLegalAdmin,
          isAttorneyAssigner: membership.isAttorneyAssigner,
          isAttorney: membership.isAttorney,
          isComplianceUser: membership.isComplianceUser,
          isAdmin: membership.isAdmin,
        });
      } catch (error: unknown) {
        SPContext.logger.error('Failed to load user groups', error);
      }
    };

    const loadSearchConfig = async (): Promise<void> => {
      try {
        const configItems = await SPContext.sp.web.lists
          .getByTitle(Lists.Configuration.Title)
          .items
          .filter(`${ConfigurationFields.Category} eq 'Search' and ${ConfigurationFields.IsActive} eq 1`)
          .select(ConfigurationFields.Title, ConfigurationFields.ConfigValue)();

        const config: ISearchConfig = {
          searchResultLimit: DEFAULT_SEARCH_LIMIT,
          recentSearchesLimit: DEFAULT_RECENT_LIMIT,
        };

        for (const item of configItems) {
          if (item[ConfigurationFields.Title] === 'SearchResultLimit') {
            config.searchResultLimit = parseInt(item[ConfigurationFields.ConfigValue], 10) || DEFAULT_SEARCH_LIMIT;
          } else if (item[ConfigurationFields.Title] === 'RecentSearchesLimit') {
            config.recentSearchesLimit = parseInt(item[ConfigurationFields.ConfigValue], 10) || DEFAULT_RECENT_LIMIT;
          }
        }

        setSearchConfig(config);
      } catch (error: unknown) {
        SPContext.logger.error('Failed to load search config', error);
      }
    };

    const loadRecentSearches = (): void => {
      try {
        const stored = localStorage.getItem(getRecentSearchesKey());
        if (stored) {
          setRecentSearches(JSON.parse(stored));
        }
      } catch (error: unknown) {
        SPContext.logger.warn('Failed to load recent searches from localStorage', error);
      }
    };

    const initialize = async (): Promise<void> => {
      setIsLoading(true);
      await Promise.all([loadUserGroups(), loadSearchConfig()]);
      loadRecentSearches();
      setIsLoading(false);
    };

    initialize().catch((error: unknown) => {
      SPContext.logger.error('Initialization failed', error);
      setIsLoading(false);
    });
  }, []);

  /**
   * Click outside to close dropdown
   */
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Keyboard shortcut: Cmd/Ctrl + K to focus search
   */
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && showResults) {
        setShowResults(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showResults]);

  /**
   * Search documents by filename and title, return associated request IDs
   * Uses recursive query to search all subfolders
   */
  const searchDocuments = async (query: string): Promise<string[]> => {
    try {
      // Build CAML query using utility function
      const camlQuery = buildDocumentSearchCAML(query);

      // Use renderListDataAsStream to get FileRef with CAML query
      const response = await SPContext.sp.web.lists
        .getByTitle('RequestDocuments')
        .renderListDataAsStream({
          ViewXml: camlQuery,
          RenderOptions: 2, // ListData only
        });

      // Extract unique request IDs from documents using utility function
      const rows = (response.Row || []) as IDocumentRow[];
      return extractRequestIdsFromDocuments(rows, extractRequestIdFromPath);
    } catch (error: unknown) {
      SPContext.logger.warn('Document search failed', error);
      return [];
    }
  };

  /**
   * Perform search with debounce
   * Searches both request fields and document names
   */
  const performSearch = React.useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    try {
      // Search documents in parallel with request search
      const documentRequestIdsPromise = searchDocuments(query);

      // Build filter for request search (Title=RequestID, RequestTitle, ContentId, TrackingId)
      let filter = `substringof('${query}', Title) or substringof('${query}', RequestTitle) or substringof('${query}', ContentId) or substringof('${query}', TrackingId)`;

      // Get request IDs from document search
      const documentRequestIds = await documentRequestIdsPromise;

      // Add document request IDs to filter if found
      if (documentRequestIds.length > 0) {
        const docIdFilters = documentRequestIds.map(id => `Title eq '${id}'`).join(' or ');
        filter = `(${filter}) or (${docIdFilters})`;
      }

      const items = await SPContext.sp.web.lists
        .getByTitle('Requests')
        .items
        .select(
          'Id',
          'Title',
          'RequestTitle',
          'Status',
          'TargetReturnDate',
          'Created',
          'Author/Title',
          'Attorney/Title',
          'SubmittedToAssignAttorneyOn',
          'PreviousStatus',
          'IsRushRequest',
          'TotalReviewerHours',
          'TotalSubmitterHours',
          'ReviewAudience',
          'LegalReviewStatus',
          'ComplianceReviewStatus',
          'LegalReviewOutcome',
          'ComplianceReviewOutcome',
          'ContentId',
          'TrackingId'
        )
        .expand('Author', 'Attorney')
        .filter(filter)
        .orderBy('Created', false)
        .top(searchConfig.searchResultLimit)();

      const results: ISearchResult[] = items.map((item: {
        Id: number;
        Title: string;
        RequestTitle: string;
        Status: string;
        TargetReturnDate: string | null;
        Created: string;
        Author?: { Title: string };
        Attorney?: { Title: string };
        SubmittedToAssignAttorneyOn?: string | null;
        PreviousStatus?: string | null;
        IsRushRequest?: boolean;
        TotalReviewerHours?: number;
        TotalSubmitterHours?: number;
        ReviewAudience?: string | null;
        LegalReviewStatus?: string | null;
        ComplianceReviewStatus?: string | null;
        LegalReviewOutcome?: string | null;
        ComplianceReviewOutcome?: string | null;
      }) => {
        const targetDate = item.TargetReturnDate ? new Date(item.TargetReturnDate) : null;
        const assignAttorneyDate = item.SubmittedToAssignAttorneyOn
          ? new Date(item.SubmittedToAssignAttorneyOn)
          : null;

        const { progress, color, currentStep, totalSteps } = calculateProgress(
          item.Status,
          targetDate,
          assignAttorneyDate,
          item.PreviousStatus || null
        );

        return {
          id: item.Id,
          requestId: item.Title,
          requestTitle: item.RequestTitle,
          status: item.Status,
          submittedBy: item.Author?.Title || '',
          attorney: item.Attorney?.Title || '',
          targetReturnDate: targetDate,
          created: new Date(item.Created),
          submittedToAssignAttorneyOn: assignAttorneyDate,
          previousStatus: item.PreviousStatus || null,
          isRushRequest: item.IsRushRequest || false,
          progress,
          progressColor: color,
          currentStep,
          totalSteps,
          totalReviewerHours: item.TotalReviewerHours || 0,
          totalSubmitterHours: item.TotalSubmitterHours || 0,
          reviewAudience: (item.ReviewAudience as ReviewAudienceType) || null,
          legalReviewStatus: item.LegalReviewStatus || null,
          complianceReviewStatus: item.ComplianceReviewStatus || null,
          legalReviewOutcome: item.LegalReviewOutcome || null,
          complianceReviewOutcome: item.ComplianceReviewOutcome || null,
        };
      });

      setSearchResults(results);
    } catch (error: unknown) {
      SPContext.logger.error('Search failed', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchConfig.searchResultLimit]);

  /**
   * Handle search input change with debounce
   */
  const handleSearchChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query).catch((error: unknown) => {
        SPContext.logger.error('Search error', error);
      });
    }, DEBOUNCE_DELAY);
  }, [performSearch]);

  /**
   * Handle search result click
   */
  const handleResultClick = React.useCallback((result: ISearchResult): void => {
    const newRecent = [result.requestId, ...recentSearches.filter(s => s !== result.requestId)]
      .slice(0, searchConfig.recentSearchesLimit);
    setRecentSearches(newRecent);
    localStorage.setItem(getRecentSearchesKey(), JSON.stringify(newRecent));

    const url = `${SPContext.webAbsoluteUrl}/Lists/Requests/DispForm.aspx?ID=${result.id}`;
    window.location.href = url;
  }, [recentSearches, searchConfig.recentSearchesLimit]);

  /**
   * Handle recent search click
   */
  const handleRecentClick = React.useCallback((query: string): void => {
    setSearchQuery(query);
    performSearch(query).catch((error: unknown) => {
      SPContext.logger.error('Recent search error', error);
    });
  }, [performSearch]);

  /**
   * Clear recent searches
   */
  const clearRecentSearches = React.useCallback((): void => {
    setRecentSearches([]);
    localStorage.removeItem(getRecentSearchesKey());
  }, []);

  /**
   * Clear search
   */
  const clearSearch = React.useCallback((): void => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    searchInputRef.current?.focus();
  }, []);

  /**
   * Navigate to URL
   */
  const navigateTo = (url: string): void => {
    window.location.href = `${SPContext.webAbsoluteUrl}${url}`;
  };

  if (isLoading) {
    return (
      <div className={`${styles.requestToolbar} ${hasTeamsContext ? styles.teams : ''}`}>
        <Spinner size={SpinnerSize.small} />
      </div>
    );
  }

  return (
    <div className={`${styles.requestToolbar} ${hasTeamsContext ? styles.teams : ''}`}>
      {/* Left: Navigation Buttons */}
      <div className={styles.toolbarLeft}>
        <PrimaryButton
          iconProps={{ iconName: 'Add' }}
          text="New Request"
          onClick={() => navigateTo(DASHBOARD_URLS.NEW_REQUEST)}
        />

        <CommandBarButton
          iconProps={{ iconName: 'ContactCard' }}
          text="My Requests"
          onClick={() => navigateTo(DASHBOARD_URLS.MY_REQUESTS)}
        />

        {userGroups.isLegalAdmin && (
          <CommandBarButton
            iconProps={{ iconName: 'Shield' }}
            text="Legal Admin"
            onClick={() => navigateTo(DASHBOARD_URLS.LEGAL_ADMIN)}
          />
        )}

        {userGroups.isAttorneyAssigner && (
          <CommandBarButton
            iconProps={{ iconName: 'People' }}
            text="Attorney Assignment"
            onClick={() => navigateTo(DASHBOARD_URLS.ATTORNEY_ASSIGNMENT)}
          />
        )}

        {userGroups.isAttorney && (
          <CommandBarButton
            iconProps={{ iconName: 'AccountManagement' }}
            text="Attorney"
            onClick={() => navigateTo(DASHBOARD_URLS.ATTORNEY)}
          />
        )}

        {userGroups.isComplianceUser && (
          <CommandBarButton
            iconProps={{ iconName: 'ComplianceAudit' }}
            text="Compliance"
            onClick={() => navigateTo(DASHBOARD_URLS.COMPLIANCE)}
          />
        )}
      </div>

      {/* Right: Search Box */}
      <div className={styles.toolbarRight} ref={searchContainerRef}>
        <div className={styles.searchWrapper}>
          <Icon iconName="Search" className={styles.searchIcon} />
          <input
            ref={searchInputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Search by request ID, title, or document name... (Ctrl+K)"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => {
              if (searchQuery) {
                setShowResults(true);
              } else if (recentSearches.length > 0) {
                setShowResults(true);
              }
            }}
            aria-label="Search requests by ID, title, or document name"
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.clearButton}
              onClick={clearSearch}
              aria-label="Clear search"
            >
              <Icon iconName="Cancel" />
            </button>
          )}

          {/* Search Dropdown */}
          {showResults && (
            <div className={styles.searchDropdown}>
              {isSearching ? (
                <div className={styles.dropdownLoading}>
                  <Spinner size={SpinnerSize.small} />
                  <span>Searching...</span>
                </div>
              ) : searchQuery && searchResults.length > 0 ? (
                <div className={styles.searchResultsList}>
                  <div className={styles.dropdownHeader}>
                    {searchResults.length} Result{searchResults.length !== 1 ? 's' : ''}
                  </div>
                  {searchResults.map((result) => {
                    const reviewIndicator = getReviewStatusIndicator(
                      result.legalReviewStatus,
                      result.complianceReviewStatus,
                      result.reviewAudience
                    );
                    const targetDateInfo = formatTargetDate(result.targetReturnDate);

                    return (
                      <div
                        key={result.id}
                        className={styles.resultItem}
                        onClick={() => handleResultClick(result)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleResultClick(result)}
                      >
                        <div className={styles.resultHeader}>
                          <div className={styles.resultMain}>
                            <span className={styles.resultId}>{result.requestId}</span>
                            <span className={styles.resultTitle}>{result.requestTitle}</span>
                          </div>
                          <div className={styles.headerBadges}>
                            {result.isRushRequest && (
                              <span className={styles.rushBadge}>
                                <Icon iconName="ReminderTime" className={styles.rushIcon} />
                                Rush
                              </span>
                            )}
                            {result.reviewAudience && (
                              <span className={styles.audienceBadge}>
                                <Icon
                                  iconName={result.reviewAudience === 'Both' ? 'People' : 'Contact'}
                                  className={styles.audienceIcon}
                                />
                                {result.reviewAudience}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className={styles.progressContainer}>
                          <div className={styles.progressTrack}>
                            <div
                              className={`${styles.progressFill} ${getProgressColorClass(result.progressColor)}`}
                              style={{ width: `${result.progress}%` }}
                            />
                          </div>
                          <span className={styles.progressLabel}>
                            Step {result.currentStep}/{result.totalSteps}
                          </span>
                        </div>

                        <div className={styles.resultMeta}>
                          <span className={`${styles.statusBadge} ${getStatusClass(result.status)}`}>
                            <Icon iconName={getStatusIcon(result.status)} className={styles.statusIcon} />
                            {result.status}
                          </span>
                          {/* Review status sub-indicator for In Review */}
                          {result.status === 'In Review' && reviewIndicator && (
                            <span className={`${styles.reviewIndicator} ${reviewIndicator.className}`}>
                              <Icon iconName={reviewIndicator.icon} className={styles.reviewIndicatorIcon} />
                              {reviewIndicator.text}
                            </span>
                          )}
                          {/* Target date with urgency */}
                          {targetDateInfo && result.status !== 'Completed' && result.status !== 'Cancelled' && (
                            <span className={`${styles.targetDate} ${styles[targetDateInfo.urgency]}`}>
                              <Icon iconName="Calendar" className={styles.targetDateIcon} />
                              {targetDateInfo.text}
                            </span>
                          )}
                        </div>

                        <div className={styles.resultMetaSecondary}>
                          {result.submittedBy && <span className={styles.metaItem}>By: {result.submittedBy}</span>}
                          {result.attorney && <span className={styles.metaItem}>Attorney: {result.attorney}</span>}
                          {(result.totalReviewerHours > 0 || result.totalSubmitterHours > 0) && (
                            <span className={styles.metaItem}>
                              <Icon iconName="Clock" style={{ fontSize: '10px', marginRight: '4px' }} />
                              {formatHours(result.totalReviewerHours + result.totalSubmitterHours)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : searchQuery ? (
                <div className={styles.noResults}>
                  <Icon iconName="SearchIssue" className={styles.noResultsIcon} />
                  <span>No results for &quot;{searchQuery}&quot;</span>
                </div>
              ) : recentSearches.length > 0 ? (
                <div className={styles.recentSearches}>
                  <div className={styles.dropdownHeader}>
                    <span>Recent Searches</span>
                    <button type="button" className={styles.clearRecent} onClick={clearRecentSearches}>
                      Clear
                    </button>
                  </div>
                  {recentSearches.map((query) => (
                    <div
                      key={query}
                      className={styles.recentItem}
                      onClick={() => handleRecentClick(query)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleRecentClick(query)}
                    >
                      <Icon iconName="History" className={styles.recentIcon} />
                      <span>{query}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportDashboard;
