import { Log } from '@microsoft/sp-core-library';
import { BaseFormCustomizer } from '@microsoft/sp-listview-extensibility';
import { SPComponentLoader } from '@microsoft/sp-loader';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { SPContext } from 'spfx-toolkit';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import 'spfx-toolkit/lib/utilities/context/pnpImports/files';
import LegalWorkflow, { ILegalWorkflowProps } from './components/LegalWorkflow';

/**
 * If your form customizer uses the ClientSideComponentProperties JSON input,
 * it will be deserialized into the BaseExtension.properties object.
 * You can define an interface to describe it.
 */
export interface ILegalWorkflowFormCustomizerProperties {
  // List ID for comments
  listId?: string;
}

const LOG_SOURCE: string = 'LegalWorkflowFormCustomizer';

/**
 * DevExtreme CSS CDN URLs (version 22.2.3)
 * BOTH common and theme styles are required for proper rendering of TagBox, SelectBox, etc.
 */
const DEVEXTREME_COMMON_CSS_URL = 'https://cdn3.devexpress.com/jslib/22.2.3/css/dx.common.css';
const DEVEXTREME_LIGHT_CSS_URL = 'https://cdn3.devexpress.com/jslib/22.2.3/css/dx.light.css';

export default class LegalWorkflowFormCustomizer extends BaseFormCustomizer<ILegalWorkflowFormCustomizerProperties> {
  public async onInit(): Promise<void> {
    // Add your custom initialization to this method. The framework will wait
    // for the returned promise to resolve before rendering the form.
    Log.info(LOG_SOURCE, 'Activated LegalWorkflowFormCustomizer with properties:');
    Log.info(LOG_SOURCE, JSON.stringify(this.properties, undefined, 2));

    // Initialize SPContext using smart preset (auto-detects environment)
    try {
      await SPContext.development(this.context, 'LegalWorkflowFormCustomizer');

      // Load DevExtreme CSS (both common and theme required)
      await this.loadDevExtremeCss();

      Log.info(LOG_SOURCE, 'SPContext initialized successfully');
      Log.info(LOG_SOURCE, `Web URL: ${SPContext.pageContext?.web?.absoluteUrl || 'N/A'}`);
      Log.info(LOG_SOURCE, `Current User: ${SPContext.currentUser?.email || 'N/A'}`);
    } catch (error) {
      Log.error(
        LOG_SOURCE,
        new Error('Failed to initialize SPContext: ' + (error as Error).message)
      );
      throw error;
    }

    return Promise.resolve();
  }

  /**
   * Load DevExtreme CSS files from CDN
   * Both dx.common.css and dx.light.css are required for proper styling
   */
  private async loadDevExtremeCss(): Promise<void> {
    try {
      // Load common styles first (base styles - required)
      await SPComponentLoader.loadCss(DEVEXTREME_COMMON_CSS_URL);
      Log.info(LOG_SOURCE, 'DevExtreme common.css loaded successfully from CDN');

      // Then load theme styles (visual styling)
      await SPComponentLoader.loadCss(DEVEXTREME_LIGHT_CSS_URL);
      Log.info(LOG_SOURCE, 'DevExtreme light.css loaded successfully from CDN');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      Log.error(LOG_SOURCE, new Error('Failed to load DevExtreme CSS from CDN: ' + message));
      console.error('Failed to load DevExtreme CSS from CDN:', message);
    }
  }

  public render(): void {
    // Use this method to perform your custom rendering.
    // Get list ID from properties or context
    const listId = this.properties.listId || this.context.list.guid.toString();

    const legalWorkflow: React.ReactElement<ILegalWorkflowProps> = React.createElement(
      LegalWorkflow,
      {
        context: this.context,
        displayMode: this.displayMode,
        onSave: this._onSave,
        onClose: this._onClose,
        listId,
      } as ILegalWorkflowProps
    );

    ReactDOM.render(legalWorkflow, this.domElement);
  }

  public onDispose(): void {
    // This method should be used to free any resources that were allocated during rendering.
    ReactDOM.unmountComponentAtNode(this.domElement);
    super.onDispose();
  }

  private _onSave = (): void => {
    // You MUST call this.formSaved() after you save the form.
    this.formSaved();
  };

  private _onClose = (): void => {
    // You MUST call this.formClosed() after you close the form.
    this.formClosed();
  };
}
