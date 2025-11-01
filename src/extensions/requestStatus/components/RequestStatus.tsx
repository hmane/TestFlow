import { Log } from '@microsoft/sp-core-library';
import * as React from 'react';

import styles from './RequestStatus.module.scss';

export interface IRequestStatusProps {
  text: string;
}

const LOG_SOURCE: string = 'RequestStatus';

export default class RequestStatus extends React.Component<IRequestStatusProps> {
  public componentDidMount(): void {
    Log.info(LOG_SOURCE, 'React Element: RequestStatus mounted');
  }

  public componentWillUnmount(): void {
    Log.info(LOG_SOURCE, 'React Element: RequestStatus unmounted');
  }

  public render(): React.ReactElement<IRequestStatusProps> {
    return (
      <div className={styles.requestStatus}>
        { this.props.text }
      </div>
    );
  }
}
