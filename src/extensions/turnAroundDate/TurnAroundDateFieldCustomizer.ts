/**
 * Turn Around Date Field Customizer
 *
 * SPFx Field Customizer that renders a smart date display with hover card
 * in the TargetReturnDate column of the Requests list view.
 *
 * Features:
 * - Color-coded date display:
 *   - Red: Overdue (past target date)
 *   - Orange: Due soon (within 2 days)
 *   - Green: On track
 * - Rush request indicator (bolt icon)
 * - Hover card showing:
 *   - Days remaining/overdue
 *   - Rush rationale (if rush request)
 *   - Submission date context
 *
 * Business Rules:
 * - Target return date is calculated based on submission item's turnaround time
 * - Rush requests have expedited dates (before standard turnaround)
 * - Only shows countdown for active requests (not Completed/Cancelled)
 *
 * @module extensions/turnAroundDate
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

import * as strings from 'TurnAroundDateFieldCustomizerStrings';
import { TurnAroundDateWrapper } from './components/TurnAroundDateWrapper';
import type { ITurnAroundDateData } from './types';
import { RequestStatus } from '../../types/workflowTypes';

/**
 * Properties for the Turn Around Date Field Customizer
 */
export interface ITurnAroundDateFieldCustomizerProperties {
  /** SharePoint list title for data operations */
  listTitle?: string;
}

/** Log source identifier for SPFx logging */
const LOG_SOURCE: string = 'TurnAroundDateFieldCustomizer';

/**
 * Turn Around Date Field Customizer Class
 *
 * Renders a color-coded date display with rush indicator and hover card.
 */
export default class TurnAroundDateFieldCustomizer
  extends BaseFieldCustomizer<ITurnAroundDateFieldCustomizerProperties> {

  /**
   * Initialize the field customizer
   */
  public async onInit(): Promise<void> {
    await super.onInit();
    await SPContext.smart(this.context, 'TurnAroundDateFieldCustomizer');

    Log.info(LOG_SOURCE, 'Activated TurnAroundDateFieldCustomizer with properties:');
    Log.info(LOG_SOURCE, JSON.stringify(this.properties, undefined, 2));
    Log.info(LOG_SOURCE, `The following string should be equal: "TurnAroundDateFieldCustomizer" and "${strings.Title}"`);

    SPContext.logger.info('TurnAroundDateFieldCustomizer initialized', {
      listTitle: this.properties.listTitle,
    });

    return Promise.resolve();
  }

  /**
   * Render the turn around date display in a list cell
   *
   * Extracts date and rush request data from the list item and renders
   * a React component with color-coded display and hover card.
   *
   * Fields Extracted:
   * - TargetReturnDate: The deadline for the request
   * - SubmittedOn: When the request was submitted (for context)
   * - IsRushRequest: Boolean flag for rush requests
   * - RushRationale: Reason for rush request (displayed in hover card)
   * - Status: Used to determine if countdown should show
   *
   * @param event - Contains the list item data and DOM element
   */
  public onRenderCell(event: IFieldCustomizerCellEventParameters): void {
    try {
      const listItem = event.listItem;
      const targetReturnDate = event.fieldValue;

      // Build turnaround date data for the React component
      const itemData: ITurnAroundDateData = {
        targetReturnDate: this.parseDate(targetReturnDate),
        submittedOn: this.parseDate(listItem.getValueByName('SubmittedOn')),
        isRushRequest: listItem.getValueByName('IsRushRequest') as boolean || false,
        rushRationale: listItem.getValueByName('RushRationale') as string | undefined,
        status: listItem.getValueByName('Status') as RequestStatus,
        // Note: TurnAroundTimeInDays and SubmissionItemTitle could be added
        // if needed for displaying the standard turnaround comparison
        turnAroundTimeInDays: undefined,
        submissionItemTitle: undefined,
      };

      // Render the React component
      const wrapper = React.createElement(TurnAroundDateWrapper, { itemData });
      ReactDOM.render(wrapper, event.domElement);
    } catch (error: unknown) {
      SPContext.logger.error('Failed to render turnaround date', error, {
        fieldValue: event.fieldValue,
        listItemId: event.listItem.getValueByName('ID'),
      });

      // Fallback: render plain text date
      const fallbackDate = this.parseDate(event.fieldValue);
      const displayText = fallbackDate
        ? fallbackDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'No date';
      event.domElement.innerHTML = `<span style="color: #323130;">${displayText}</span>`;
    }
  }

  /**
   * Clean up React component when cell is disposed
   */
  public onDisposeCell(event: IFieldCustomizerCellEventParameters): void {
    ReactDOM.unmountComponentAtNode(event.domElement);
    super.onDisposeCell(event);
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
