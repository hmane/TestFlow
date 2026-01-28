import { Log } from '@microsoft/sp-core-library';
import { BaseFormCustomizer } from '@microsoft/sp-listview-extensibility';
import { SPComponentLoader } from '@microsoft/sp-loader';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
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
  private _fullWidthApplied = false;
  private _devExtremeCssLoaded = false;
  public async onInit(): Promise<void> {
    // Add your custom initialization to this method. The framework will wait
    // for the returned promise to resolve before rendering the form.
    Log.info(LOG_SOURCE, 'Activated LegalWorkflowFormCustomizer with properties:');
    Log.info(LOG_SOURCE, JSON.stringify(this.properties, undefined, 2));

    // Initialize SPContext using smart preset (auto-detects environment)
    try {
      await SPContext.smart(this.context, 'LegalWorkflowFormCustomizer');

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
    if (this._devExtremeCssLoaded) return;

    try {
      // Load common styles first (base styles - required)
      await SPComponentLoader.loadCss(DEVEXTREME_COMMON_CSS_URL);
      Log.info(LOG_SOURCE, 'DevExtreme common.css loaded successfully from CDN');

      // Then load theme styles (visual styling)
      await SPComponentLoader.loadCss(DEVEXTREME_LIGHT_CSS_URL);
      Log.info(LOG_SOURCE, 'DevExtreme light.css loaded successfully from CDN');

      this._devExtremeCssLoaded = true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      Log.error(LOG_SOURCE, new Error('Failed to load DevExtreme CSS from CDN: ' + message));
    }
  }

  public render(): void {
    // Use this method to perform your custom rendering.
    // Get list ID from properties or context
    const listId = this.properties.listId || this.context.list.guid.toString();

    // Apply full-width styles to the domElement and its parents
    this.applyFullWidthStyles();

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

  /**
   * Apply full-width styles to break out of SharePoint's default form width constraints
   */
  private applyFullWidthStyles(): void {
    // Only run once - DOM parent structure doesn't change between renders
    if (this._fullWidthApplied) return;
    this._fullWidthApplied = true;

    // Style the domElement itself
    if (this.domElement) {
      this.domElement.style.width = '100%';
      this.domElement.style.maxWidth = 'none';
      this.domElement.style.margin = '0';
      this.domElement.style.padding = '0';
    }

    // Walk up the DOM tree and remove width constraints from parent elements
    let parent = this.domElement?.parentElement;
    let depth = 0;
    const maxDepth = 10; // Limit how far up we go

    while (parent && depth < maxDepth) {
      // Check if this element has constrained width
      const computedStyle = window.getComputedStyle(parent);
      const maxWidth = computedStyle.maxWidth;
      const width = computedStyle.width;

      // Remove max-width constraints (except for body/html)
      if (parent.tagName !== 'BODY' && parent.tagName !== 'HTML') {
        if (maxWidth && maxWidth !== 'none' && maxWidth !== '100%') {
          parent.style.maxWidth = 'none';
        }
        // Ensure width is 100%
        if (width && width.indexOf('%') === -1) {
          parent.style.width = '100%';
        }
      }

      parent = parent.parentElement;
      depth++;
    }

    Log.info(LOG_SOURCE, `Applied full-width styles to ${depth} parent elements`);
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
