/**
 * NotificationContext
 *
 * Provides global toast-style notifications using Fluent UI MessageBar
 * Notifications appear in the top-right corner and auto-dismiss after a delay
 */

import * as React from 'react';

// Fluent UI - tree-shaken imports
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Stack } from '@fluentui/react/lib/Stack';

/**
 * Individual notification interface
 */
interface INotification {
  id: string;
  message: string;
  type: MessageBarType;
  duration?: number;
}

/**
 * Notification context interface
 */
interface INotificationContext {
  showNotification: (message: string, type?: MessageBarType, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  clearAll: () => void;
}

const NotificationContext = React.createContext<INotificationContext | undefined>(undefined);

/**
 * NotificationProvider Props
 */
export interface INotificationProviderProps {
  children: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
  maxNotifications?: number;
}

/**
 * NotificationProvider Component
 */
export const NotificationProvider: React.FC<INotificationProviderProps> = ({
  children,
  position = 'top-right',
  maxNotifications = 5,
}) => {
  const [notifications, setNotifications] = React.useState<INotification[]>([]);

  // Track auto-dismiss timers for cleanup on unmount or early dismiss
  const dismissTimersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup all timers on unmount
  React.useEffect(() => {
    const timers = dismissTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  /**
   * Show a notification
   */
  const showNotification = React.useCallback(
    (message: string, type: MessageBarType = MessageBarType.info, duration: number = 5000) => {
      const id = `notification-${Date.now()}-${Math.random()}`;
      const notification: INotification = { id, message, type, duration };

      setNotifications((prev) => {
        // Limit number of notifications
        const newNotifications = [...prev, notification];
        if (newNotifications.length > maxNotifications) {
          return newNotifications.slice(-maxNotifications);
        }
        return newNotifications;
      });

      // Auto-dismiss after duration (0 = don't auto-dismiss)
      if (duration > 0) {
        const timer = setTimeout(() => {
          dismissTimersRef.current.delete(id);
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, duration);
        dismissTimersRef.current.set(id, timer);
      }
    },
    [maxNotifications]
  );

  /**
   * Show success notification
   */
  const showSuccess = React.useCallback(
    (message: string, duration: number = 3000) => {
      showNotification(message, MessageBarType.success, duration);
    },
    [showNotification]
  );

  /**
   * Show error notification
   */
  const showError = React.useCallback(
    (message: string, duration: number = 0) => {
      // Errors don't auto-dismiss by default
      showNotification(message, MessageBarType.error, duration);
    },
    [showNotification]
  );

  /**
   * Show warning notification
   */
  const showWarning = React.useCallback(
    (message: string, duration: number = 5000) => {
      showNotification(message, MessageBarType.warning, duration);
    },
    [showNotification]
  );

  /**
   * Show info notification
   */
  const showInfo = React.useCallback(
    (message: string, duration: number = 5000) => {
      showNotification(message, MessageBarType.info, duration);
    },
    [showNotification]
  );

  /**
   * Clear all notifications and their auto-dismiss timers
   */
  const clearAll = React.useCallback(() => {
    dismissTimersRef.current.forEach((timer) => clearTimeout(timer));
    dismissTimersRef.current.clear();
    setNotifications([]);
  }, []);

  /**
   * Dismiss a specific notification and clear its auto-dismiss timer
   */
  const dismissNotification = React.useCallback((id: string) => {
    const timer = dismissTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      dismissTimersRef.current.delete(id);
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  /**
   * Memoized context value to prevent unnecessary re-renders of consumers
   */
  const contextValue = React.useMemo<INotificationContext>(
    () => ({
      showNotification,
      showSuccess,
      showError,
      showWarning,
      showInfo,
      clearAll,
    }),
    [showNotification, showSuccess, showError, showWarning, showInfo, clearAll]
  );

  /**
   * Get container position styles
   */
  const getPositionStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      position: 'fixed',
      zIndex: 1000000,
      maxWidth: '400px',
      width: '100%',
    };

    switch (position) {
      case 'top-right':
        return { ...baseStyles, top: 20, right: 20 };
      case 'top-left':
        return { ...baseStyles, top: 20, left: 20 };
      case 'bottom-right':
        return { ...baseStyles, bottom: 20, right: 20 };
      case 'bottom-left':
        return { ...baseStyles, bottom: 20, left: 20 };
      case 'top-center':
        return { ...baseStyles, top: 20, left: '50%', transform: 'translateX(-50%)' };
      default:
        return { ...baseStyles, top: 20, right: 20 };
    }
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}

      {/* Toast notification container */}
      {notifications.length > 0 && (
        <div style={getPositionStyles()}>
          <Stack tokens={{ childrenGap: 8 }}>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  animation: 'slideInRight 0.3s ease-out',
                }}
              >
                <MessageBar
                  messageBarType={notification.type}
                  onDismiss={() => dismissNotification(notification.id)}
                  dismissButtonAriaLabel="Close notification"
                  isMultiline={false}
                  styles={{
                    root: {
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      borderRadius: '4px',
                    },
                  }}
                >
                  {notification.message}
                </MessageBar>
              </div>
            ))}
          </Stack>
        </div>
      )}

      {/* Slide-in animation */}
      <style>
        {`
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }

          @keyframes slideOutRight {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(100%);
              opacity: 0;
            }
          }
        `}
      </style>
    </NotificationContext.Provider>
  );
};

/**
 * useNotification hook
 */
export const useNotification = (): INotificationContext => {
  const context = React.useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }

  return context;
};
