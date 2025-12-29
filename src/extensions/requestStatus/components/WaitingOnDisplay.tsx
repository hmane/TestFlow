/**
 * WaitingOnDisplay Component
 *
 * Displays who or what group the request is waiting on
 * - For users: Shows UserPersona component
 * - For groups: Shows GroupViewer component with member count
 * - For none: Shows text only
 */

import * as React from 'react';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';
import { GroupViewer } from 'spfx-toolkit/lib/components/GroupViewer';
import type { IWaitingOnDisplayProps } from '../types';
import styles from './RequestStatusProgress.module.scss';

/**
 * WaitingOnDisplay Component
 */
export const WaitingOnDisplay: React.FC<IWaitingOnDisplayProps> = React.memo(({
  waitingOn,
  webUrl,
}) => {
  // Handle "none" type (no waiting)
  if (waitingOn.type === 'none') {
    return (
      <div className={styles.waitingOnContainer}>
        <Text variant="small" className={styles.waitingOnLabel}>
          Status:
        </Text>
        <Text variant="small" className={styles.waitingOnValue}>
          {waitingOn.displayName}
        </Text>
      </div>
    );
  }

  // Handle user type
  if (waitingOn.type === 'user' && waitingOn.principal) {
    return (
      <div className={styles.waitingOnContainer}>
        <Text variant="small" className={styles.waitingOnLabel}>
          Waiting on:
        </Text>
        <div className={styles.waitingOnValue}>
          <UserPersona
            userIdentifier={
              waitingOn.principal.email ||
              waitingOn.principal.loginName ||
              waitingOn.principal.id
            }
            displayName={waitingOn.principal.title}
            email={waitingOn.principal.email}
            size={24}
            displayMode="avatarAndName"
          />
        </div>
      </div>
    );
  }

  // Handle group type
  if (waitingOn.type === 'group' && waitingOn.groupName) {
    return (
      <div className={styles.waitingOnContainer}>
        <Text variant="small" className={styles.waitingOnLabel}>
          Waiting on:
        </Text>
        <div className={styles.waitingOnValue}>
          <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
            {/* Group icon and name */}
            <GroupViewer
              groupName={waitingOn.groupName}
              displayMode="iconAndName"
              size={24}
              onError={(error) => {
                // Fallback: Just show group name as text
                SPContext.logger.error('GroupViewer error', error);
              }}
            />

            {/* Member count (if available) */}
            {waitingOn.memberCount !== undefined && (
              <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
                ({waitingOn.memberCount} {waitingOn.memberCount === 1 ? 'member' : 'members'})
              </Text>
            )}
          </Stack>
        </div>
      </div>
    );
  }

  // Fallback: Display name as text
  return (
    <div className={styles.waitingOnContainer}>
      <Text variant="small" className={styles.waitingOnLabel}>
        Waiting on:
      </Text>
      <Text variant="small" className={styles.waitingOnValue}>
        {waitingOn.displayName}
      </Text>
    </div>
  );
});

WaitingOnDisplay.displayName = 'WaitingOnDisplay';
