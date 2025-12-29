import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Log, Version } from '@microsoft/sp-core-library';
import { SPComponentLoader } from '@microsoft/sp-loader';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneToggle,
  PropertyPaneDropdown,
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme } from '@microsoft/sp-component-base';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';

const LOG_SOURCE = 'AnalyticsDashboardWebPart';

/**
 * DevExtreme CSS CDN URLs (version 22.2.3)
 * These must match the devextreme package version in package.json
 */
const DEVEXTREME_COMMON_CSS_URL = 'https://cdn3.devexpress.com/jslib/22.2.3/css/dx.common.css';
const DEVEXTREME_LIGHT_CSS_URL = 'https://cdn3.devexpress.com/jslib/22.2.3/css/dx.light.css';

import * as strings from 'AnalyticsDashboardWebPartStrings';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import type { IAnalyticsDashboardProps, DateRangeOption } from './components/IAnalyticsDashboardProps';

export interface IAnalyticsDashboardWebPartProps {
  title: string;
  useMockData: boolean;
  defaultDateRange: DateRangeOption;
}

export default class AnalyticsDashboardWebPart extends BaseClientSideWebPart<IAnalyticsDashboardWebPartProps> {
  private _isDarkTheme: boolean = false;

  public render(): void {
    const element: React.ReactElement<IAnalyticsDashboardProps> = React.createElement(
      AnalyticsDashboard,
      {
        title: this.properties.title || 'Analytics Dashboard',
        useMockData: this.properties.useMockData || false,
        defaultDateRange: this.properties.defaultDateRange || '30',
        context: this.context,
        isDarkTheme: this._isDarkTheme,
        hasTeamsContext: !!this.context.sdks.microsoftTeams,
      }
    );

    ReactDom.render(element, this.domElement);
  }

  protected async onInit(): Promise<void> {
    await super.onInit();

    // Load DevExtreme CSS (both common and theme required)
    await this._loadDevExtremeCss();

    // Initialize SPContext for data access
    await SPContext.smart(this.context, 'AnalyticsDashboard');

    SPContext.logger.info('AnalyticsDashboard web part initialized');
  }

  /**
   * Load DevExtreme CSS files from CDN
   * Required for proper chart styling
   */
  private async _loadDevExtremeCss(): Promise<void> {
    try {
      // Load common CSS first
      await SPComponentLoader.loadCss(DEVEXTREME_COMMON_CSS_URL);
      Log.info(LOG_SOURCE, 'DevExtreme common.css loaded successfully from CDN');

      // Then load theme CSS
      await SPComponentLoader.loadCss(DEVEXTREME_LIGHT_CSS_URL);
      Log.info(LOG_SOURCE, 'DevExtreme light.css loaded successfully from CDN');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Log.error(LOG_SOURCE, new Error('Failed to load DevExtreme CSS from CDN: ' + message));
    }
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) {
      return;
    }

    this._isDarkTheme = !!currentTheme.isInverted;
    const { semanticColors } = currentTheme;

    if (semanticColors) {
      this.domElement.style.setProperty('--bodyText', semanticColors.bodyText || null);
      this.domElement.style.setProperty('--link', semanticColors.link || null);
      this.domElement.style.setProperty('--linkHovered', semanticColors.linkHovered || null);
    }
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription,
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField('title', {
                  label: strings.TitleFieldLabel,
                  value: this.properties.title || 'Analytics Dashboard',
                }),
                PropertyPaneDropdown('defaultDateRange', {
                  label: strings.DefaultDateRangeLabel,
                  options: [
                    { key: '7', text: 'Last 7 Days' },
                    { key: '30', text: 'Last 30 Days' },
                    { key: '90', text: 'Last 90 Days' },
                  ],
                  selectedKey: this.properties.defaultDateRange || '30',
                }),
                PropertyPaneToggle('useMockData', {
                  label: strings.UseMockDataLabel,
                  checked: this.properties.useMockData || false,
                  onText: 'On (Demo Mode)',
                  offText: 'Off (Live Data)',
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}
