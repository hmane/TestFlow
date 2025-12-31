/**
 * Request ID Field Customizer
 *
 * SPFx Field Customizer that renders a clickable Request ID link with a hover card
 * in the Title/RequestId column of the Requests list view.
 *
 * Features:
 * - Clickable link that opens the request edit form
 * - Hover card showing request summary:
 *   - Request title and status
 *   - Request type and review audience
 *   - Target return date
 *   - Created/Modified info
 * - Compact card preview on quick hover
 *
 * SharePoint Integration:
 * - Extracts data from list item fields (Title, Status, RequestType, etc.)
 * - Builds edit form URL for navigation
 * - Uses SPContext for logging
 *
 * @module extensions/requestId
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

import * as strings from 'RequestIdFieldCustomizerStrings';
import { RequestIdHoverCard } from './components/RequestIdHoverCard';
import type { IRequestListItemData } from './types';
import type { IPrincipal } from '../../types';
import { RequestStatus, ReviewAudience } from '../../types/workflowTypes';
import { RequestType } from '../../types/requestTypes';
import { Lists } from '@sp/Lists';

/**
 * Properties for the Request ID Field Customizer
 *
 * Configured in manifest.json and passed at runtime.
 */
export interface IRequestIdFieldCustomizerProperties {
  /**
   * SharePoint list title for data operations.
   * Defaults to 'Requests' if not specified.
   */
  listTitle?: string;
}

/** Log source identifier for SPFx logging */
const LOG_SOURCE: string = 'RequestIdFieldCustomizer';

/**
 * Request ID Field Customizer Class
 *
 * Renders a clickable Request ID with hover card in SharePoint list views.
 *
 * Lifecycle:
 * 1. onInit() - Initialize SPContext
 * 2. onRenderCell() - Extract item data and render hover card component
 * 3. onDisposeCell() - Clean up React component
 */
export default class RequestIdFieldCustomizer
  extends BaseFieldCustomizer<IRequestIdFieldCustomizerProperties> {

  /**
   * Initialize the field customizer
   *
   * Sets up SPContext for SharePoint operations and logging.
   */
  public async onInit(): Promise<void> {
    await super.onInit();
    await SPContext.smart(this.context, 'RequestIdFieldCustomizer');

    Log.info(LOG_SOURCE, 'Activated RequestIdFieldCustomizer with properties:');
    Log.info(LOG_SOURCE, JSON.stringify(this.properties, undefined, 2));
    Log.info(LOG_SOURCE, `The following string should be equal: "RequestIdFieldCustomizer" and "${strings.Title}"`);

    SPContext.logger.info('RequestIdFieldCustomizer initialized', {
      listTitle: this.properties.listTitle,
      webUrl: this.context.pageContext.web.absoluteUrl,
    });

    return Promise.resolve();
  }

  /**
   * Render the Request ID hover card in a list cell
   *
   * Extracts request data from the list item and renders a React component
   * that shows a clickable link with a hover card containing request details.
   *
   * @param event - Contains the list item data and DOM element
   */
  public onRenderCell(event: IFieldCustomizerCellEventParameters): void {
    try {
      // Extract data from the SharePoint list item
      const listItem = event.listItem;
      const fieldValue = event.fieldValue;

      // Get list ID from context (used for form navigation)
      const listGuid = this.context.pageContext.list?.id;
      const listId = listGuid ? listGuid.toString() : '';

      // Extract all fields needed for the hover card display
      const itemData: IRequestListItemData = {
        id: listItem.getValueByName('ID') as number,
        requestId: fieldValue as string || listItem.getValueByName('Title') as string,
        status: listItem.getValueByName('Status') as RequestStatus,
        requestType: listItem.getValueByName('RequestType') as RequestType,
        requestTitle: listItem.getValueByName('RequestTitle') as string,
        purpose: listItem.getValueByName('Purpose') as string | undefined,
        reviewAudience: listItem.getValueByName('ReviewAudience') as ReviewAudience,
        targetReturnDate: this.parseDate(listItem.getValueByName('TargetReturnDate')),
        created: new Date(listItem.getValueByName('Created') as string),
        createdBy: this.extractPrincipal(listItem, 'Author'),
        modified: this.parseDate(listItem.getValueByName('Modified')),
        modifiedBy: this.extractPrincipal(listItem, 'Editor'),
      };

      // Build SharePoint edit form URL
      // Format: {webUrl}/Lists/Requests/EditForm.aspx?ID={itemId}
      const webUrl = this.context.pageContext.web.absoluteUrl;
      const itemId = itemData.id;
      const editFormUrl = `${webUrl}${Lists.Requests.Url}/EditForm.aspx?ID=${itemId}`;

      // Render the RequestIdHoverCard React component
      const hoverCard = React.createElement(RequestIdHoverCard, {
        requestId: itemData.requestId,
        itemData,
        editFormUrl,
        listId,
      });

      ReactDOM.render(hoverCard, event.domElement);
    } catch (error: unknown) {
      SPContext.logger.error('Failed to render RequestId hover card', error, {
        fieldValue: event.fieldValue,
        listItemId: event.listItem.getValueByName('ID'),
      });

      // Fallback: render plain text link
      event.domElement.innerHTML = `<span style="color: #0078d4;">${event.fieldValue || 'N/A'}</span>`;
    }
  }

  /**
   * Clean up React component when cell is disposed
   *
   * Prevents memory leaks by unmounting the React component.
   */
  public onDisposeCell(event: IFieldCustomizerCellEventParameters): void {
    ReactDOM.unmountComponentAtNode(event.domElement);
    super.onDisposeCell(event);
  }

  /**
   * Extract principal (user) data from a SharePoint list item
   *
   * Handles various lookup field formats and returns a normalized IPrincipal.
   * Returns a default "Unknown" principal if extraction fails.
   *
   * @param listItem - SharePoint list item
   * @param fieldName - Name of the person/user field
   * @returns IPrincipal with user data
   */
  private extractPrincipal(listItem: { getValueByName: (name: string) => unknown }, fieldName: string): IPrincipal {
    try {
      const lookupValue = listItem.getValueByName(fieldName) as Record<string, unknown> | null;
      if (!lookupValue) {
        return { id: '0', title: 'Unknown', email: '', loginName: '' };
      }

      // Normalize various SharePoint lookup field formats
      return {
        id: String(lookupValue.lookupId || lookupValue.id || 0),
        title: String(lookupValue.lookupValue || lookupValue.title || 'Unknown'),
        email: String(lookupValue.email || ''),
        loginName: String(lookupValue.loginName || lookupValue.sip || ''),
      };
    } catch (extractError: unknown) {
      SPContext.logger.warn(`Failed to extract principal for field ${fieldName}`, extractError);
      return { id: '0', title: 'Unknown', email: '', loginName: '' };
    }
  }

  /**
   * Parse date value safely from SharePoint field
   *
   * @param value - Date value from SharePoint
   * @returns Parsed Date or undefined
   */
  private parseDate(value: unknown): Date | undefined {
    if (!value) return undefined;

    try {
      const date = new Date(value as string | number);
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  }
}
