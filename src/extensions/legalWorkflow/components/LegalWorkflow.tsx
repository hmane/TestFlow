import { FormDisplayMode, Log } from '@microsoft/sp-core-library';
import { FormCustomizerContext } from '@microsoft/sp-listview-extensibility';
import * as React from 'react';
import { SPContext } from 'spfx-toolkit';
import { ApplicationProvider } from '../../../components/ApplicationProvider';
import { NotificationProvider } from '../../../contexts/NotificationContext';
import { RequestType } from '../../../types';
import { RequestContainer } from './RequestContainer';
import { RequestInfo } from './RequestForm';

import styles from './LegalWorkflow.module.scss';

export interface ILegalWorkflowProps {
  context: FormCustomizerContext;
  displayMode: FormDisplayMode;
  onSave: () => void;
  onClose: () => void;
  listId: string;
}

const LOG_SOURCE: string = 'LegalWorkflow';

export default class LegalWorkflow extends React.Component<ILegalWorkflowProps> {
  public componentDidMount(): void {
    Log.info(LOG_SOURCE, 'React Element: LegalWorkflow mounted');
  }

  public componentWillUnmount(): void {
    Log.info(LOG_SOURCE, 'React Element: LegalWorkflow unmounted');
  }

  /**
   * Handle request type selection (for new requests)
   */
  private handleRequestTypeSelected = (requestType: RequestType): void => {
    SPContext.logger.info('LegalWorkflow: Request type selected', { requestType });
  };

  public render(): React.ReactElement<ILegalWorkflowProps> {
    const { context, listId } = this.props;
    const itemId = context.itemId;
    // Get development mode from environment
    const isDevelopment = process.env.NODE_ENV === 'development' || false;
    const buildVersion = context.manifest && context.manifest.version;

    return (
      <div className={styles.legalWorkflow}>
        <ApplicationProvider
          itemId={itemId}
          isDevelopment={isDevelopment}
          buildVersion={buildVersion}
        >
          <NotificationProvider position="top-right" maxNotifications={5}>
            <RequestContainer
              itemId={itemId}
              listId={listId}
              requestFormComponent={RequestInfo}
              onRequestTypeSelected={this.handleRequestTypeSelected}
            />
          </NotificationProvider>
        </ApplicationProvider>
      </div>
    );
  }
}
