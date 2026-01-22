/**
 * Request Status Field Customizer
 *
 * SPFx Field Customizer that renders a custom progress bar with hover card
 * in the Status column of the Requests list view.
 *
 * Features:
 * - Visual progress bar showing workflow stage completion
 * - Color-coded status indicators (blue=active, green=complete, red=cancelled, yellow=on hold)
 * - Hover card with detailed status information including:
 *   - Current workflow stage
 *   - Review progress (Legal/Compliance)
 *   - Time in current stage
 *   - Key dates and assignees
 *
 * SharePoint Integration:
 * - Extracts data from list item fields (Status, ReviewAudience, dates, principals)
 * - Uses SPContext for logging and SharePoint operations
 * - Renders React component into the list cell DOM element
 *
 * @module extensions/requestStatus
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Log } from '@microsoft/sp-core-library';
import {
  BaseFieldCustomizer,
  type IFieldCustomizerCellEventParameters
} from '@microsoft/sp-listview-extensibility';

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';

import * as strings from 'RequestStatusFieldCustomizerStrings';
import { RequestStatusProgress } from './components/RequestStatusProgress';
import type { IStatusListItemData } from './types';
import type { IPrincipal } from '../../types';
import {
  RequestStatus,
  ReviewAudience,
  LegalReviewStatus,
  ComplianceReviewStatus,
  ReviewOutcome,
} from '../../types/workflowTypes';

/**
 * Properties for the Request Status Field Customizer
 *
 * These properties are configured in the manifest.json and passed to the customizer
 * at runtime. They allow customization of the field customizer behavior.
 */
export interface IRequestStatusFieldCustomizerProperties {
  /**
   * SharePoint list title to load additional data from.
   * Defaults to 'Requests' if not specified.
   */
  listTitle?: string;
}

/** Log source identifier for SPFx logging */
const LOG_SOURCE: string = 'RequestStatusFieldCustomizer';

/**
 * Request Status Field Customizer Class
 *
 * Extends BaseFieldCustomizer to render a custom progress bar component
 * in the Status column of SharePoint list views.
 *
 * Lifecycle:
 * 1. onInit() - Initialize SPContext and log activation
 * 2. onRenderCell() - Extract item data and render React component for each cell
 * 3. onDisposeCell() - Clean up React component when cell is removed from DOM
 */
export default class RequestStatusFieldCustomizer
  extends BaseFieldCustomizer<IRequestStatusFieldCustomizerProperties> {

  /**
   * Initialize the field customizer
   *
   * Called once when the customizer is first loaded. Sets up SPContext
   * for SharePoint operations and logging.
   *
   * @returns Promise that resolves when initialization is complete
   */
  public async onInit(): Promise<void> {
    // Call base class initialization first
    await super.onInit();

    // Initialize SPContext for SharePoint operations (PnPjs, logging)
    // This must be done before any SharePoint API calls
    await SPContext.smart(this.context, 'RequestStatusFieldCustomizer');

    // Log activation for debugging
    Log.info(LOG_SOURCE, 'Activated RequestStatusFieldCustomizer with properties:');
    Log.info(LOG_SOURCE, JSON.stringify(this.properties, undefined, 2));
    Log.info(LOG_SOURCE, `The following string should be equal: "RequestStatusFieldCustomizer" and "${strings.Title}"`);

    SPContext.logger.info('RequestStatusFieldCustomizer initialized', {
      listTitle: this.properties.listTitle,
      webUrl: this.context.pageContext.web.absoluteUrl,
    });

    return Promise.resolve();
  }

  /**
   * Render the custom status progress bar in a list cell
   *
   * Called for each visible cell in the Status column. Extracts all required
   * data from the list item and renders a React component that shows:
   * - Progress bar with color-coded stages
   * - Hover card with detailed status information
   *
   * SharePoint Field Extraction:
   * - Status: Current workflow status (Draft, Legal Intake, In Review, etc.)
   * - ReviewAudience: Which reviews are required (Legal, Compliance, Both)
   * - Dates: Created, SubmittedOn, CompletedOn, etc.
   * - Principals: CreatedBy, SubmittedBy, Attorney, etc.
   * - Review data: LegalReviewStatus, ComplianceReviewStatus, outcomes
   *
   * @param event - Contains the list item data and DOM element to render into
   */
  public onRenderCell(event: IFieldCustomizerCellEventParameters): void {
    try {
      // Extract data from the SharePoint list item
      const listItem = event.listItem;
      const status = event.fieldValue as RequestStatus;

      // Get list title from properties or context (used for building URLs)
      const listTitle = this.properties.listTitle || this.context.pageContext.list?.title || 'Requests';
      const webUrl = this.context.pageContext.web.absoluteUrl;

      // Extract all required fields for status display
      const itemData: IStatusListItemData = {
        id: listItem.getValueByName('ID') as number,
        requestId: listItem.getValueByName('Title') as string,
        status,
        targetReturnDate: this.parseDate(listItem.getValueByName('TargetReturnDate')),
        isRushRequest: listItem.getValueByName('IsRushRequest') as boolean || false,
        rushRationale: listItem.getValueByName('RushRationale') as string | undefined,
        reviewAudience: listItem.getValueByName('ReviewAudience') as ReviewAudience,

        // Date tracking fields
        created: new Date(listItem.getValueByName('Created') as string),
        submittedOn: this.parseDate(listItem.getValueByName('SubmittedOn')),
        submittedToAssignAttorneyOn: this.parseDate(listItem.getValueByName('SubmittedToAssignAttorneyOn')),
        submittedForReviewOn: this.parseDate(listItem.getValueByName('SubmittedForReviewOn')),
        closeoutOn: this.parseDate(listItem.getValueByName('CloseoutOn')),
        cancelledOn: this.parseDate(listItem.getValueByName('CancelledOn')),
        onHoldSince: this.parseDate(listItem.getValueByName('OnHoldSince')),

        // Principals
        createdBy: this.extractPrincipal(listItem, 'Author') || {
          id: '0',
          title: 'Unknown',
          email: '',
          loginName: '',
        },
        submittedBy: this.extractPrincipal(listItem, 'SubmittedBy'),
        onHoldBy: this.extractPrincipal(listItem, 'OnHoldBy'),
        cancelledBy: this.extractPrincipal(listItem, 'CancelledBy'),

        // Legal review information
        legalReviewStatus: listItem.getValueByName('LegalReviewStatus') as LegalReviewStatus | undefined,
        legalReviewOutcome: listItem.getValueByName('LegalReviewOutcome') as ReviewOutcome | undefined,
        legalReviewAssignedAttorney: this.extractPrincipal(listItem, 'Attorney'),
        legalReviewAssignedOn: this.parseDate(listItem.getValueByName('LegalReviewAssignedOn')),
        legalReviewCompletedOn: this.parseDate(listItem.getValueByName('LegalReviewCompletedOn')),

        // Compliance review information
        complianceReviewStatus: listItem.getValueByName('ComplianceReviewStatus') as ComplianceReviewStatus | undefined,
        complianceReviewOutcome: listItem.getValueByName('ComplianceReviewOutcome') as ReviewOutcome | undefined,
        complianceReviewCompletedOn: this.parseDate(listItem.getValueByName('ComplianceReviewCompletedOn')),

        // Special status tracking
        previousStatus: listItem.getValueByName('PreviousStatus') as RequestStatus | undefined,
        onHoldReason: listItem.getValueByName('OnHoldReason') as string | undefined,
        cancelReason: listItem.getValueByName('CancelReason') as string | undefined,
      };

      // Style the cell for the full-width status bar
      event.domElement.style.display = 'flex';
      event.domElement.style.alignItems = 'stretch';
      event.domElement.style.width = '100%';
      event.domElement.style.height = '100%';

      // Render RequestStatusProgress component
      const progressBar = React.createElement(RequestStatusProgress, {
        itemData,
        webUrl,
        listTitle,
      });

      ReactDOM.render(progressBar, event.domElement);
    } catch (error: unknown) {
      SPContext.logger.error('Failed to render status progress bar', error, {
        fieldValue: event.fieldValue,
        listItemId: event.listItem.getValueByName('ID'),
      });

      // Fallback: render plain text
      event.domElement.innerHTML = `<span style="color: #323130;">${event.fieldValue || 'Unknown'}</span>`;
    }
  }

  /**
   * Clean up React component when cell is removed from DOM
   *
   * Called by SharePoint when the list cell is being disposed (e.g., when scrolling
   * the list view). Unmounts the React component to prevent memory leaks.
   *
   * @param event - Contains the DOM element to clean up
   */
  public onDisposeCell(event: IFieldCustomizerCellEventParameters): void {
    // Unmount the React component to free resources and prevent memory leaks
    ReactDOM.unmountComponentAtNode(event.domElement);
    super.onDisposeCell(event);
  }

  /**
   * Extract principal (user) data from a SharePoint list item lookup field
   *
   * SharePoint stores user/person fields as lookup values with various formats
   * depending on the field configuration. This method handles the different formats
   * and normalizes them to our IPrincipal interface.
   *
   * Field Format Handling:
   * - lookupId/lookupValue: Standard lookup field format
   * - id/Id: Alternative ID formats
   * - email/Email: User email address
   * - loginName/LoginName/sip: User login identifier
   *
   * @param listItem - SharePoint list item object with getValueByName method
   * @param fieldName - Name of the person/user field to extract
   * @returns IPrincipal object with user data, or undefined if field is empty/invalid
   */
  private extractPrincipal(listItem: { getValueByName: (name: string) => unknown }, fieldName: string): IPrincipal | undefined {
    try {
      const lookupValue = listItem.getValueByName(fieldName) as Record<string, unknown> | null;
      if (!lookupValue) {
        return undefined;
      }

      // Handle various lookup field formats from SharePoint
      // Different field types and configurations return data in different shapes
      return {
        id: String(lookupValue.lookupId || lookupValue.id || lookupValue.Id || 0),
        title: String(lookupValue.lookupValue || lookupValue.title || lookupValue.Title || 'Unknown'),
        email: String(lookupValue.email || lookupValue.Email || ''),
        loginName: String(lookupValue.loginName || lookupValue.LoginName || lookupValue.sip || ''),
      };
    } catch (extractError: unknown) {
      // Log warning but don't fail - missing principal data is not critical
      SPContext.logger.warn(`Failed to extract principal for field ${fieldName}`, extractError);
      return undefined;
    }
  }

  /**
   * Parse date value safely from SharePoint field
   *
   * SharePoint returns dates in various formats (ISO string, Date object, etc.).
   * This method handles the conversion safely and returns undefined for invalid dates.
   *
   * @param value - Date value from SharePoint (string, Date, or undefined)
   * @returns Parsed Date object, or undefined if value is invalid/empty
   */
  private parseDate(value: unknown): Date | undefined {
    if (!value) return undefined;

    try {
      const date = new Date(value as string | number);
      // Check for invalid date (NaN)
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      // Silently return undefined for unparseable dates
      return undefined;
    }
  }
}
