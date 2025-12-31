/**
 * Request Title Field Customizer
 *
 * SPFx Field Customizer that renders a custom display for the RequestTitle field
 * in the Requests list view.
 *
 * Note: This is a basic implementation that can be extended to add features like:
 * - Truncation with tooltip for long titles
 * - Rich text formatting
 * - Title with status indicator
 *
 * @module extensions/requestTitle
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Log } from '@microsoft/sp-core-library';
import {
  BaseFieldCustomizer,
  type IFieldCustomizerCellEventParameters
} from '@microsoft/sp-listview-extensibility';

import * as strings from 'RequestTitleFieldCustomizerStrings';
import RequestTitle, { IRequestTitleProps } from './components/RequestTitle';

/**
 * Properties for the Request Title Field Customizer
 */
export interface IRequestTitleFieldCustomizerProperties {
  /** Optional prefix text to display before the title */
  sampleText?: string;
}

/** Log source identifier for SPFx logging */
const LOG_SOURCE: string = 'RequestTitleFieldCustomizer';

/**
 * Request Title Field Customizer Class
 *
 * Renders a custom title display in SharePoint list views.
 */
export default class RequestTitleFieldCustomizer
  extends BaseFieldCustomizer<IRequestTitleFieldCustomizerProperties> {

  /**
   * Initialize the field customizer
   */
  public onInit(): Promise<void> {
    Log.info(LOG_SOURCE, 'Activated RequestTitleFieldCustomizer with properties:');
    Log.info(LOG_SOURCE, JSON.stringify(this.properties, undefined, 2));
    Log.info(LOG_SOURCE, `The following string should be equal: "RequestTitleFieldCustomizer" and "${strings.Title}"`);
    return Promise.resolve();
  }

  /**
   * Render the request title in a list cell
   *
   * @param event - Contains the field value and DOM element
   */
  public onRenderCell(event: IFieldCustomizerCellEventParameters): void {
    // Build the display text (optionally prefixed with sampleText property)
    const text: string = this.properties.sampleText
      ? `${this.properties.sampleText}: ${event.fieldValue}`
      : String(event.fieldValue || '');

    const requestTitle: React.ReactElement<IRequestTitleProps> =
      React.createElement(RequestTitle, { text } as IRequestTitleProps);

    ReactDOM.render(requestTitle, event.domElement);
  }

  /**
   * Clean up React component when cell is disposed
   */
  public onDisposeCell(event: IFieldCustomizerCellEventParameters): void {
    ReactDOM.unmountComponentAtNode(event.domElement);
    super.onDisposeCell(event);
  }
}
