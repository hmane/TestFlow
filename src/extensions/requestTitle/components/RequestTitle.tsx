import { Log } from '@microsoft/sp-core-library';
import * as React from 'react';

import styles from './RequestTitle.module.scss';

export interface IRequestTitleProps {
  text: string;
}

const LOG_SOURCE: string = 'RequestTitle';

export default class RequestTitle extends React.Component<IRequestTitleProps> {
  public componentDidMount(): void {
    Log.info(LOG_SOURCE, 'React Element: RequestTitle mounted');
  }

  public componentWillUnmount(): void {
    Log.info(LOG_SOURCE, 'React Element: RequestTitle unmounted');
  }

  public render(): React.ReactElement<IRequestTitleProps> {
    return (
      <div className={styles.requestTitle}>
        { this.props.text }
      </div>
    );
  }
}
