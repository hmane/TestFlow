import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Log } from '@microsoft/sp-core-library';
import {
  BaseFieldCustomizer,
  type IFieldCustomizerCellEventParameters
} from '@microsoft/sp-listview-extensibility';

import { SPContext } from 'spfx-toolkit';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';

import * as strings from 'TurnAroundDateFieldCustomizerStrings';
import { TurnAroundDateWrapper } from './components/TurnAroundDateWrapper';
import type { ITurnAroundDateData } from './types';
import { RequestStatus } from '../../types/workflowTypes';

/**
 * If your field customizer uses the ClientSideComponentProperties JSON input,
 * it will be deserialized into the BaseExtension.properties object.
 * You can define an interface to describe it.
 */
export interface ITurnAroundDateFieldCustomizerProperties {
  // List title for dynamic loading
  listTitle?: string;
}

const LOG_SOURCE: string = 'TurnAroundDateFieldCustomizer';

export default class TurnAroundDateFieldCustomizer
  extends BaseFieldCustomizer<ITurnAroundDateFieldCustomizerProperties> {

  public async onInit(): Promise<void> {
    // Initialize SPContext for SharePoint operations
    await super.onInit();
    await SPContext.smart(this.context, 'TurnAroundDateFieldCustomizer');

    Log.info(LOG_SOURCE, 'Activated TurnAroundDateFieldCustomizer with properties:');
    Log.info(LOG_SOURCE, JSON.stringify(this.properties, undefined, 2));
    Log.info(LOG_SOURCE, `The following string should be equal: "TurnAroundDateFieldCustomizer" and "${strings.Title}"`);

    return Promise.resolve();
  }

  public onRenderCell(event: IFieldCustomizerCellEventParameters): void {
    try {
      // Extract data from list item
      const listItem = event.listItem;
      const targetReturnDate = event.fieldValue;

      // Build turnaround date data object
      const itemData: ITurnAroundDateData = {
        targetReturnDate: this.parseDate(targetReturnDate),
        submittedOn: this.parseDate(listItem.getValueByName('SubmittedOn')),
        isRushRequest: listItem.getValueByName('IsRushRequest') as boolean || false,
        rushRationale: listItem.getValueByName('RushRationale') as string | undefined,
        status: listItem.getValueByName('Status') as RequestStatus,
        // Optional: TurnAroundTimeInDays and SubmissionItem title
        // These could be passed via field customizer properties or fetched from SubmissionItems list
        turnAroundTimeInDays: undefined, // TODO: Add if needed
        submissionItemTitle: undefined, // TODO: Add if needed
      };

      // Render TurnAroundDateWrapper component
      const wrapper = React.createElement(TurnAroundDateWrapper, {
        itemData,
      });

      ReactDOM.render(wrapper, event.domElement);
    } catch (error: unknown) {
      SPContext.logger.error('Failed to render turnaround date', error, {
        fieldValue: event.fieldValue,
        listItemId: event.listItem.getValueByName('ID'),
      });

      // Fallback: render plain text date
      const fallbackDate = this.parseDate(event.fieldValue);
      const displayText = fallbackDate
        ? fallbackDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'No date';
      event.domElement.innerHTML = `<span style="color: #323130;">${displayText}</span>`;
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
