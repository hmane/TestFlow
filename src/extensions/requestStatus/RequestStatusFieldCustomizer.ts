import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Log } from '@microsoft/sp-core-library';
import {
  BaseFieldCustomizer,
  type IFieldCustomizerCellEventParameters
} from '@microsoft/sp-listview-extensibility';

import { SPContext } from 'spfx-toolkit';
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
 * If your field customizer uses the ClientSideComponentProperties JSON input,
 * it will be deserialized into the BaseExtension.properties object.
 * You can define an interface to describe it.
 */
export interface IRequestStatusFieldCustomizerProperties {
  // List title for dynamic loading
  listTitle?: string;
}

const LOG_SOURCE: string = 'RequestStatusFieldCustomizer';

export default class RequestStatusFieldCustomizer
  extends BaseFieldCustomizer<IRequestStatusFieldCustomizerProperties> {

  public async onInit(): Promise<void> {
    // Initialize SPContext for SharePoint operations
    await super.onInit();
    await SPContext.smart(this.context, 'RequestStatusFieldCustomizer');

    Log.info(LOG_SOURCE, 'Activated RequestStatusFieldCustomizer with properties:');
    Log.info(LOG_SOURCE, JSON.stringify(this.properties, undefined, 2));
    Log.info(LOG_SOURCE, `The following string should be equal: "RequestStatusFieldCustomizer" and "${strings.Title}"`);

    return Promise.resolve();
  }

  public onRenderCell(event: IFieldCustomizerCellEventParameters): void {
    try {
      // Extract data from list item
      const listItem = event.listItem;
      const status = event.fieldValue as RequestStatus;

      // Get list title from properties or context
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
  private extractPrincipal(listItem: any, fieldName: string): IPrincipal | undefined {
    try {
      const lookupValue = listItem.getValueByName(fieldName);
      if (!lookupValue) {
        return undefined;
      }

      // Handle lookup field format
      return {
        id: String(lookupValue.lookupId || lookupValue.id || lookupValue.Id || 0),
        title: lookupValue.lookupValue || lookupValue.title || lookupValue.Title || 'Unknown',
        email: lookupValue.email || lookupValue.Email || '',
        loginName: lookupValue.loginName || lookupValue.LoginName || lookupValue.sip || '',
      };
    } catch (error: unknown) {
      SPContext.logger.warn(`Failed to extract principal for field ${fieldName}`, error);
      return undefined;
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
