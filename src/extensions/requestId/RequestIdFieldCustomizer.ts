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
 * If your field customizer uses the ClientSideComponentProperties JSON input,
 * it will be deserialized into the BaseExtension.properties object.
 * You can define an interface to describe it.
 */
export interface IRequestIdFieldCustomizerProperties {
  // List title for dynamic loading
  listTitle?: string;
}

const LOG_SOURCE: string = 'RequestIdFieldCustomizer';

export default class RequestIdFieldCustomizer
  extends BaseFieldCustomizer<IRequestIdFieldCustomizerProperties> {

  public async onInit(): Promise<void> {
    // Initialize SPContext for SharePoint operations
    await super.onInit();
    await SPContext.smart(this.context, 'RequestIdFieldCustomizer');

    Log.info(LOG_SOURCE, 'Activated RequestIdFieldCustomizer with properties:');
    Log.info(LOG_SOURCE, JSON.stringify(this.properties, undefined, 2));
    Log.info(LOG_SOURCE, `The following string should be equal: "RequestIdFieldCustomizer" and "${strings.Title}"`);

    return Promise.resolve();
  }

  public onRenderCell(event: IFieldCustomizerCellEventParameters): void {
    try {
      // Extract data from list item
      const listItem = event.listItem;
      const fieldValue = event.fieldValue;

      // Get list ID from context (without curly braces to match form customizer format)
      const listGuid = this.context.pageContext.list?.id;
      const listId = listGuid ? listGuid.toString() : '';

      // Extract list item data
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

      // Build edit form URL using web URL and Requests list URL
      const webUrl = this.context.pageContext.web.absoluteUrl;
      const itemId = itemData.id;

      // SharePoint edit form URL using the Requests list
      const editFormUrl = `${webUrl}${Lists.Requests.Url}/EditForm.aspx?ID=${itemId}`;

      // Render RequestIdHoverCard component
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

      // Fallback: render plain text
      event.domElement.innerHTML = `<span style="color: #0078d4;">${event.fieldValue || 'N/A'}</span>`;
    }
  }

  public onDisposeCell(event: IFieldCustomizerCellEventParameters): void {
    // This method should be used to free any resources that were allocated during rendering.
    // For example, if your onRenderCell() called ReactDOM.render(), then you should
    // call ReactDOM.unmountComponentAtNode() here.
    ReactDOM.unmountComponentAtNode(event.domElement);
    super.onDisposeCell(event);
  }

  /**
   * Extract principal (user) data from list item
   */
  private extractPrincipal(listItem: any, fieldName: string): IPrincipal {
    try {
      const lookupValue = listItem.getValueByName(fieldName);
      if (!lookupValue) {
        return {
          id: '0',
          title: 'Unknown',
          email: '',
          loginName: '',
        };
      }

      // Handle lookup field format
      return {
        id: String(lookupValue.lookupId || lookupValue.id || 0),
        title: lookupValue.lookupValue || lookupValue.title || 'Unknown',
        email: lookupValue.email || '',
        loginName: lookupValue.loginName || lookupValue.sip || '',
      };
    } catch (error: unknown) {
      SPContext.logger.warn(`Failed to extract principal for field ${fieldName}`, error);
      return {
        id: '0',
        title: 'Unknown',
        email: '',
        loginName: '',
      };
    }
  }

  /**
   * Parse date value safely
   */
  private parseDate(value: any): Date | undefined {
    if (!value) return undefined;

    try {
      const date = new Date(value);
      return isNaN(date.getTime()) ? undefined : date;
    } catch (error: unknown) {
      return undefined;
    }
  }
}
