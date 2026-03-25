import * as React from 'react';
import { DefaultButton } from '@fluentui/react/lib/Button';
import { IconButton } from '@fluentui/react/lib/Button';
import { Modal } from '@fluentui/react/lib/Modal';

import type { ISubmissionItem } from '@appTypes/index';
import { addBusinessDays } from '@extensions/legalWorkflow/components/RequestForm/requestInfoUtils';

interface ITurnAroundTimeModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  submissionItems: ISubmissionItem[];
}

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

function formatDate(date: Date): string {
  return pad2(date.getMonth() + 1) + '/' + pad2(date.getDate()) + '/' + date.getFullYear();
}

const COL_HEADER: React.CSSProperties = {
  fontWeight: 600,
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  color: '#605e5c',
};

export const TurnAroundTimeModal: React.FC<ITurnAroundTimeModalProps> = ({
  isOpen,
  onDismiss,
  submissionItems,
}) => {
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const rows = React.useMemo(
    () =>
      submissionItems.map(item => ({
        title: item.title,
        days: item.turnAroundTimeInDays,
        earliestDate: formatDate(addBusinessDays(today, item.turnAroundTimeInDays)),
      })),
    [submissionItems, today]
  );

  return (
    <Modal
      isOpen={isOpen}
      onDismiss={onDismiss}
      isBlocking={false}
      styles={{
        main: {
          width: '75vw',
          maxWidth: '900px',
          minWidth: '600px',
          height: '90vh',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
        },
        scrollableContent: {
          height: '100%',
        },
      }}
    >
      {/* Outer content wrapper — mirrors document-preview-modal__content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: 'linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)',
        }}
      >
        {/* Fixed header — mirrors document-preview-modal__header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
            background:
              'linear-gradient(135deg, rgba(102, 126, 234, 0.04) 0%, rgba(118, 75, 162, 0.04) 100%)',
            gap: 12,
            position: 'relative',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: '15px', color: '#323130', flex: 1 }}>
            Turnaround Times
          </span>
          {/* Gradient accent line — mirrors document-preview-modal__header::after */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              opacity: 0.5,
            }}
          />
          <IconButton
            iconProps={{ iconName: 'Cancel' }}
            ariaLabel='Close'
            onClick={onDismiss}
            styles={{
              root: { color: '#605e5c' },
              rootHovered: { color: '#323130', backgroundColor: '#edebe9' },
            }}
          />
        </div>

        {/* Sub-header text */}
        <div style={{ padding: '12px 20px 0', color: '#605e5c', fontSize: '13px' }}>
          {'Based on today (' +
            formatDate(today) +
            '), here are the earliest available return dates if you submit now:'}
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 16px' }}>
          {/* Sticky column headers */}
          <div
            style={{
              display: 'flex',
              position: 'sticky',
              top: 0,
              backgroundColor: '#ffffff',
              zIndex: 1,
              borderBottom: '2px solid #0078d4',
              padding: '12px 4px 8px',
            }}
          >
            <span style={{ flex: 3, ...COL_HEADER }}>Submission Item</span>
            <span style={{ flex: 1, textAlign: 'center', ...COL_HEADER }}>Turnaround</span>
            <span style={{ flex: 1, textAlign: 'right', ...COL_HEADER }}>
              Earliest Return Date
            </span>
          </div>

          {/* Data rows */}
          {rows.map((row, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                borderBottom: '1px solid #edebe9',
                padding: '9px 4px',
                backgroundColor: index % 2 === 0 ? '#ffffff' : '#faf9f8',
              }}
            >
              <span style={{ flex: 3, color: '#323130', fontSize: '13px' }}>{row.title}</span>
              <span style={{ flex: 1, textAlign: 'center', color: '#605e5c', fontSize: '13px' }}>
                {row.days} {row.days === 1 ? 'business day' : 'business days'}
              </span>
              <span
                style={{
                  flex: 1,
                  textAlign: 'right',
                  fontWeight: 600,
                  color: '#0078d4',
                  fontSize: '13px',
                }}
              >
                {row.earliestDate}
              </span>
            </div>
          ))}

          {rows.length === 0 && (
            <p style={{ color: '#605e5c', textAlign: 'center', padding: '16px 0', margin: 0 }}>
              No submission items available.
            </p>
          )}

          <p
            style={{
              color: '#a19f9d',
              fontSize: '11px',
              fontStyle: 'italic',
              margin: '12px 0 4px',
            }}
          >
            * Turnaround times exclude weekends. Submitting a request with a return date earlier
            than the standard turnaround will be flagged as a rush request.
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #edebe9',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <DefaultButton text='Close' onClick={onDismiss} />
        </div>
      </div>
    </Modal>
  );
};

export default TurnAroundTimeModal;
