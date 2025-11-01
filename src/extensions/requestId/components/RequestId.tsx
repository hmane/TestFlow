import { Log } from '@microsoft/sp-core-library';
import * as React from 'react';

import styles from './RequestId.module.scss';

export interface IRequestIdProps {
  text: string;
}

const LOG_SOURCE: string = 'RequestId';

export default class RequestId extends React.Component<IRequestIdProps> {
  public componentDidMount(): void {
    Log.info(LOG_SOURCE, 'React Element: RequestId mounted');
  }

  public componentWillUnmount(): void {
    Log.info(LOG_SOURCE, 'React Element: RequestId unmounted');
  }

  public render(): React.ReactElement<IRequestIdProps> {
    return (
      <div className={styles.requestId}>
        { this.props.text }
      </div>
    );
  }
}
