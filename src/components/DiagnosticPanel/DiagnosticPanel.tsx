/**
 * DiagnosticPanel Component
 *
 * Industrial-grade diagnostic slide-out panel for debugging and support.
 * Activated via ?diag=true query string parameter.
 *
 * Shows a floating trigger button in the bottom-right corner that opens
 * a full-height panel with tabbed sections for inspecting application state.
 *
 * Design: Dark-themed utilitarian instrumentation panel — high contrast,
 * monospace data, color-coded status indicators, zero decorative waste.
 */

import * as React from 'react';

// Fluent UI - tree-shaken imports
import { IconButton, DefaultButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import { Stack } from '@fluentui/react/lib/Stack';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface IDiagnosticPanelProps {
  request?: any;
  permissions?: any;
  visibility?: any;
  documents?: any[];
  stores?: {
    request?: any;
    permissions?: any;
    config?: any;
  };
  userGroups?: string[];
  currentUser?: { id: number; title: string; email: string; loginName: string };
  itemPermissions?: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    hasFullControl: boolean;
  };
}

// ─────────────────────────────────────────────
// Color Palette — dark industrial theme
// ─────────────────────────────────────────────

const C = {
  bg: '#0d1117',
  bgCard: '#161b22',
  bgHover: '#1c2333',
  border: '#30363d',
  borderAccent: '#3b82f6',
  text: '#e6edf3',
  textMuted: '#8b949e',
  textDim: '#484f58',
  green: '#3fb950',
  greenBg: 'rgba(63,185,80,0.12)',
  red: '#f85149',
  redBg: 'rgba(248,81,73,0.12)',
  amber: '#d29922',
  amberBg: 'rgba(210,153,34,0.12)',
  blue: '#58a6ff',
  blueBg: 'rgba(88,166,255,0.10)',
  purple: '#bc8cff',
  purpleBg: 'rgba(188,140,255,0.10)',
  cyan: '#39d2c0',
  cyanBg: 'rgba(57,210,192,0.10)',
  fab: '#3b82f6',
  fabHover: '#2563eb',
} as const;

const FONT_MONO = "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'SF Mono', Consolas, monospace";
const FONT_LABEL = "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif";

// ─────────────────────────────────────────────
// Style Constants
// ─────────────────────────────────────────────

const STYLES = {
  fab: {
    position: 'fixed' as const,
    bottom: 20,
    right: 20,
    zIndex: 999999,
    width: 44,
    height: 44,
    borderRadius: '50%',
    backgroundColor: C.bg,
    border: `2px solid ${C.border}`,
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    cursor: 'pointer',
    boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.2)',
    transition: 'all 0.2s ease',
  },
  fabHover: {
    border: `2px solid ${C.fab}`,
    boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 12px ${C.fab}40`,
  },
  panelContent: {
    backgroundColor: C.bg,
    color: C.text,
    fontFamily: FONT_LABEL,
    height: '100%',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    overflow: 'hidden' as const,
  },
  header: {
    padding: '16px 20px 0',
    borderBottom: `1px solid ${C.border}`,
  },
  headerTitle: {
    fontFamily: FONT_MONO,
    fontSize: 13,
    fontWeight: 600 as const,
    color: C.text,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  },
  headerMeta: {
    fontFamily: FONT_MONO,
    fontSize: 11,
    color: C.textMuted,
  },
  tabArea: {
    flex: 1,
    overflow: 'auto' as const,
    padding: '16px 20px',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: FONT_MONO,
    fontSize: 10,
    fontWeight: 600 as const,
    color: C.textMuted,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    marginBottom: 8,
  },
  card: {
    backgroundColor: C.bgCard,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    padding: '12px 14px',
    marginBottom: 8,
  },
  badge: {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: 5,
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 11,
    fontFamily: FONT_MONO,
    fontWeight: 500 as const,
    marginRight: 6,
    marginBottom: 4,
  },
  badgeActive: {
    backgroundColor: C.greenBg,
    color: C.green,
    border: `1px solid ${C.green}30`,
  },
  badgeInactive: {
    backgroundColor: 'rgba(139,148,158,0.08)',
    color: C.textDim,
    border: `1px solid ${C.textDim}30`,
  },
  kvRow: {
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    padding: '4px 0',
    borderBottom: `1px solid ${C.border}20`,
  },
  kvKey: {
    fontFamily: FONT_MONO,
    fontSize: 11,
    color: C.textMuted,
    flexShrink: 0 as const,
    marginRight: 12,
  },
  kvValue: {
    fontFamily: FONT_MONO,
    fontSize: 11,
    color: C.text,
    textAlign: 'right' as const,
    wordBreak: 'break-all' as const,
  },
  jsonBlock: {
    backgroundColor: '#0a0e14',
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    padding: 12,
    fontFamily: FONT_MONO,
    fontSize: 11,
    lineHeight: 1.6,
    color: C.text,
    overflow: 'auto' as const,
    maxHeight: 400,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-all' as const,
  },
  copyBtn: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
  },
  visibilityRow: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 8,
    padding: '5px 0',
    borderBottom: `1px solid ${C.border}20`,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0 as const,
  },
  docRow: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: '6px 0',
    borderBottom: `1px solid ${C.border}20`,
  },
} as const;

// ─────────────────────────────────────────────
// Utility: check for ?diag=true
// ─────────────────────────────────────────────

function isDiagEnabled(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('diag') === 'true';
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

/** Permission / role badge */
const Badge: React.FC<{ label: string; active: boolean }> = ({ label, active }) => (
  <span
    style={{
      ...STYLES.badge,
      ...(active ? STYLES.badgeActive : STYLES.badgeInactive),
    }}
  >
    <span
      style={{
        ...STYLES.dot,
        backgroundColor: active ? C.green : C.textDim,
      }}
    />
    {label}
  </span>
);

/** Key-value row */
const KVRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={STYLES.kvRow}>
    <span style={STYLES.kvKey}>{label}</span>
    <span style={STYLES.kvValue as React.CSSProperties}>{value ?? '—'}</span>
  </div>
);

/** Collapsible JSON block with copy button */
const JsonBlock: React.FC<{ data: any; label?: string; defaultCollapsed?: boolean }> = ({
  data,
  label,
  defaultCollapsed = true,
}) => {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
  const [copied, setCopied] = React.useState(false);

  const jsonStr = React.useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  const handleCopy = React.useCallback(() => {
    try {
      navigator.clipboard.writeText(jsonStr).then(function () {
        setCopied(true);
        setTimeout(function () {
          setCopied(false);
        }, 1500);
      }).catch(function () {
        // clipboard write failed
      });
    } catch {
      // clipboard API not available
    }
  }, [jsonStr]);

  const lineCount = jsonStr.split('\n').length;

  return (
    <div style={{ ...STYLES.section, position: 'relative' as const }}>
      {label && (
        <div
          style={{
            ...STYLES.sectionTitle,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            userSelect: 'none' as const,
          }}
          onClick={() => setCollapsed(!collapsed)}
          role='button'
          tabIndex={0}
          aria-expanded={!collapsed}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setCollapsed(!collapsed);
            }
          }}
        >
          <Icon
            iconName={collapsed ? 'ChevronRight' : 'ChevronDown'}
            styles={{ root: { fontSize: 10, color: C.textMuted, transition: 'transform 0.15s' } }}
          />
          {label}
          <span style={{ fontWeight: 400, opacity: 0.6 }}>({lineCount} lines)</span>
        </div>
      )}
      {!collapsed && (
        <div style={{ position: 'relative' as const }}>
          <TooltipHost content={copied ? 'Copied!' : 'Copy JSON'}>
            <IconButton
              iconProps={{ iconName: copied ? 'CheckMark' : 'Copy' }}
              styles={{
                root: {
                  ...STYLES.copyBtn,
                  color: copied ? C.green : C.textMuted,
                  backgroundColor: 'transparent',
                  width: 28,
                  height: 28,
                },
                rootHovered: { color: C.text, backgroundColor: C.bgHover },
              }}
              onClick={handleCopy}
              ariaLabel='Copy to clipboard'
            />
          </TooltipHost>
          <pre style={STYLES.jsonBlock as React.CSSProperties}>{jsonStr}</pre>
        </div>
      )}
    </div>
  );
};

/** Visibility indicator row */
const VisRow: React.FC<{ name: string; visible: boolean; enabled: boolean; reason?: string }> = ({
  name,
  visible,
  enabled,
  reason,
}) => {
  const statusColor = !visible ? C.textDim : enabled ? C.green : C.amber;
  const statusLabel = !visible ? 'hidden' : enabled ? 'enabled' : 'disabled';

  return (
    <div style={STYLES.visibilityRow}>
      <span style={{ ...STYLES.dot, backgroundColor: statusColor }} />
      <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.text, flex: 1 }}>{name}</span>
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 10,
          color: statusColor,
          padding: '1px 6px',
          borderRadius: 3,
          backgroundColor: !visible ? 'transparent' : enabled ? C.greenBg : C.amberBg,
        }}
      >
        {statusLabel}
      </span>
      {reason && (
        <TooltipHost content={reason}>
          <Icon iconName='Info' styles={{ root: { fontSize: 12, color: C.textMuted, cursor: 'help' } }} />
        </TooltipHost>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Tab Content Components
// ─────────────────────────────────────────────

/** Tab 1: User Context */
const UserContextTab: React.FC<{
  currentUser?: IDiagnosticPanelProps['currentUser'];
  userGroups?: string[];
  permissions?: any;
}> = ({ currentUser, userGroups, permissions }) => (
  <div>
    {/* User Info */}
    <div style={STYLES.section}>
      <div style={STYLES.sectionTitle}>Current User</div>
      <div style={STYLES.card}>
        <KVRow label='Display Name' value={currentUser?.title} />
        <KVRow label='Email' value={currentUser?.email} />
        <KVRow label='Login' value={currentUser?.loginName} />
        <KVRow label='User ID' value={currentUser?.id} />
      </div>
    </div>

    {/* Groups */}
    <div style={STYLES.section}>
      <div style={STYLES.sectionTitle}>
        SharePoint Groups ({userGroups?.length ?? 0})
      </div>
      <div style={STYLES.card}>
        {userGroups && userGroups.length > 0 ? (
          userGroups.map(function (group) {
            const isLW = group.indexOf('LW -') === 0;
            return (
              <div
                key={group}
                style={{
                  padding: '4px 0',
                  borderBottom: `1px solid ${C.border}20`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    ...STYLES.dot,
                    backgroundColor: isLW ? C.blue : C.textDim,
                  }}
                />
                <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: isLW ? C.text : C.textMuted }}>
                  {group}
                </span>
              </div>
            );
          })
        ) : (
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textDim }}>No groups loaded</span>
        )}
      </div>
    </div>

    {/* Permission Flags */}
    {permissions && (
      <div style={STYLES.section}>
        <div style={STYLES.sectionTitle}>Role Flags</div>
        <div style={{ ...STYLES.card, display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
          <Badge label='Submitter' active={!!permissions.isSubmitter} />
          <Badge label='Legal Admin' active={!!permissions.isLegalAdmin} />
          <Badge label='Attorney Assigner' active={!!permissions.isAttorneyAssigner} />
          <Badge label='Attorney' active={!!permissions.isAttorney} />
          <Badge label='Compliance' active={!!permissions.isComplianceUser} />
          <Badge label='Admin' active={!!permissions.isAdmin} />
          <Badge label='Self Approver' active={!!permissions.isSelfApprover} />
        </div>
      </div>
    )}
  </div>
);

/** Tab 2: Request State */
const RequestStateTab: React.FC<{ request?: any }> = ({ request }) => {
  if (!request) {
    return (
      <div style={{ ...STYLES.card, textAlign: 'center' as const }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textDim }}>No request loaded</span>
      </div>
    );
  }

  // Show key fields as summary, then full JSON
  return (
    <div>
      <div style={STYLES.section}>
        <div style={STYLES.sectionTitle}>Key Fields</div>
        <div style={STYLES.card}>
          <KVRow label='Title / ID' value={request.title || request.requestId} />
          <KVRow label='Status' value={request.status} />
          <KVRow label='Request Type' value={request.requestType} />
          <KVRow label='Review Audience' value={request.reviewAudience} />
          <KVRow label='Submission Item' value={request.submissionItem} />
          <KVRow label='Attorney' value={request.attorney?.title || request.attorney?.email} />
          <KVRow label='Submitted By' value={request.submittedBy?.title || request.submittedBy?.email} />
          <KVRow label='Legal Review Status' value={request.legalReview?.status} />
          <KVRow label='Legal Review Outcome' value={request.legalReview?.outcome} />
          <KVRow label='Compliance Review Status' value={request.complianceReview?.status} />
          <KVRow label='Compliance Review Outcome' value={request.complianceReview?.outcome} />
          <KVRow label='Is Rush' value={request.isRush ? 'Yes' : 'No'} />
          <KVRow label='Target Return Date' value={request.targetReturnDate ? String(request.targetReturnDate) : undefined} />
        </div>
      </div>

      <JsonBlock data={request} label='Full Request Object' />
    </div>
  );
};

/** Tab 3: Documents */
const DocumentsTab: React.FC<{ documents?: any[] }> = ({ documents }) => {
  if (!documents || documents.length === 0) {
    return (
      <div style={{ ...STYLES.card, textAlign: 'center' as const }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textDim }}>No documents</span>
      </div>
    );
  }

  return (
    <div>
      <div style={STYLES.section}>
        <div style={STYLES.sectionTitle}>Documents ({documents.length})</div>
        <div style={STYLES.card}>
          {documents.map(function (doc, idx) {
            const isCheckedOut = !!doc.checkedOutBy || !!doc.CheckedOutByUser;
            const checkedOutBy = doc.checkedOutByName || doc.CheckedOutByUser?.Title || '';

            return (
              <div key={doc.id || doc.Id || idx} style={STYLES.docRow}>
                <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }} styles={{ root: { flex: 1, minWidth: 0 } }}>
                  <Icon
                    iconName={isCheckedOut ? 'Lock' : 'Page'}
                    styles={{
                      root: {
                        fontSize: 12,
                        color: isCheckedOut ? C.amber : C.textMuted,
                        flexShrink: 0,
                      },
                    }}
                  />
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 11,
                      color: C.text,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap' as const,
                    }}
                    title={doc.name || doc.Name || doc.fileName}
                  >
                    {doc.name || doc.Name || doc.fileName || `Document ${idx + 1}`}
                  </span>
                </Stack>
                <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 6 }}>
                  {doc.documentType && (
                    <span
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 9,
                        color: C.purple,
                        backgroundColor: C.purpleBg,
                        padding: '2px 6px',
                        borderRadius: 3,
                      }}
                    >
                      {doc.documentType}
                    </span>
                  )}
                  {isCheckedOut && (
                    <span
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 9,
                        color: C.amber,
                        backgroundColor: C.amberBg,
                        padding: '2px 6px',
                        borderRadius: 3,
                      }}
                    >
                      {checkedOutBy || 'Checked Out'}
                    </span>
                  )}
                </Stack>
              </div>
            );
          })}
        </div>
      </div>

      <JsonBlock data={documents} label='Raw Documents Data' />
    </div>
  );
};

/** Tab 4: Permissions */
const PermissionsTab: React.FC<{
  permissions?: any;
  itemPermissions?: IDiagnosticPanelProps['itemPermissions'];
}> = ({ permissions, itemPermissions }) => (
  <div>
    {/* Item-Level Permissions */}
    {itemPermissions && (
      <div style={STYLES.section}>
        <div style={STYLES.sectionTitle}>Item-Level Permissions</div>
        <div style={{ ...STYLES.card, display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
          <Badge label='Can View' active={itemPermissions.canView} />
          <Badge label='Can Edit' active={itemPermissions.canEdit} />
          <Badge label='Can Delete' active={itemPermissions.canDelete} />
          <Badge label='Full Control' active={itemPermissions.hasFullControl} />
        </div>
      </div>
    )}

    {/* Derived Capabilities */}
    {permissions && (
      <div style={STYLES.section}>
        <div style={STYLES.sectionTitle}>Derived Capabilities</div>
        <div style={{ ...STYLES.card, display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
          <Badge label='Create Request' active={!!permissions.canCreateRequest} />
          <Badge label='View All Requests' active={!!permissions.canViewAllRequests} />
          <Badge label='Assign Attorney' active={!!permissions.canAssignAttorney} />
          <Badge label='Review Legal' active={!!permissions.canReviewLegal} />
          <Badge label='Review Compliance' active={!!permissions.canReviewCompliance} />
        </div>
      </div>
    )}

    {/* Role Array */}
    {permissions?.roles && (
      <div style={STYLES.section}>
        <div style={STYLES.sectionTitle}>Assigned Roles</div>
        <div style={STYLES.card}>
          {permissions.roles.length > 0 ? (
            permissions.roles.map(function (role: string) {
              return (
                <div key={role} style={{ padding: '3px 0', fontFamily: FONT_MONO, fontSize: 11, color: C.cyan }}>
                  {role}
                </div>
              );
            })
          ) : (
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textDim }}>No roles assigned</span>
          )}
        </div>
      </div>
    )}

    <JsonBlock data={{ permissions, itemPermissions }} label='Raw Permissions Data' />
  </div>
);

/** Tab 5: Visibility */
const VisibilityTab: React.FC<{ visibility?: any }> = ({ visibility }) => {
  if (!visibility) {
    return (
      <div style={{ ...STYLES.card, textAlign: 'center' as const }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textDim }}>Visibility data not available</span>
      </div>
    );
  }

  const { buttons, fields, cards, context } = visibility;

  return (
    <div>
      {/* Context */}
      {context && (
        <div style={STYLES.section}>
          <div style={STYLES.sectionTitle}>Visibility Context</div>
          <div style={STYLES.card}>
            <KVRow label='Status' value={context.status} />
            <KVRow label='Is Owner' value={context.isOwner ? 'Yes' : 'No'} />
            <KVRow label='Is New Request' value={context.isNewRequest ? 'Yes' : 'No'} />
            <KVRow label='Is Dirty' value={context.isDirty ? 'Yes' : 'No'} />
            <KVRow label='Is Assigned Attorney' value={context.isAssignedAttorney ? 'Yes' : 'No'} />
            <KVRow label='Has Assigned Attorney' value={context.hasAssignedAttorney ? 'Yes' : 'No'} />
            <KVRow label='Legal Review Required' value={context.legalReviewRequired ? 'Yes' : 'No'} />
            <KVRow label='Compliance Review Required' value={context.complianceReviewRequired ? 'Yes' : 'No'} />
            <KVRow label='Legal Review Completed' value={context.legalReviewCompleted ? 'Yes' : 'No'} />
            <KVRow label='Compliance Review Completed' value={context.complianceReviewCompleted ? 'Yes' : 'No'} />
            <KVRow label='Waiting On Submitter' value={context.isWaitingOnSubmitter ? 'Yes' : 'No'} />
          </div>
        </div>
      )}

      {/* Buttons */}
      {buttons && (
        <div style={STYLES.section}>
          <div style={STYLES.sectionTitle}>Button Visibility</div>
          <div style={STYLES.card}>
            {Object.keys(buttons).map(function (key) {
              const btn = buttons[key];
              return (
                <VisRow
                  key={key}
                  name={key}
                  visible={btn.visible}
                  enabled={btn.enabled}
                  reason={btn.disabledReason}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Fields */}
      {fields && (
        <div style={STYLES.section}>
          <div style={STYLES.sectionTitle}>Field Visibility</div>
          <div style={STYLES.card}>
            {Object.keys(fields).map(function (key) {
              const field = fields[key];
              const canEdit = field.canEdit !== undefined ? field.canEdit : field.canView;
              return (
                <VisRow
                  key={key}
                  name={key}
                  visible={field.canView !== undefined ? field.canView : true}
                  enabled={canEdit !== undefined ? canEdit : true}
                  reason={field.reason}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Cards */}
      {cards && (
        <div style={STYLES.section}>
          <div style={STYLES.sectionTitle}>Card Visibility</div>
          <div style={STYLES.card}>
            {Object.keys(cards).map(function (key) {
              const card = cards[key];
              return (
                <VisRow
                  key={key}
                  name={key}
                  visible={card.visible}
                  enabled={card.enabled}
                  reason={card.disabledReason}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/** Tab 6: Stores */
const StoresTab: React.FC<{ stores?: IDiagnosticPanelProps['stores'] }> = ({ stores }) => {
  if (!stores) {
    return (
      <div style={{ ...STYLES.card, textAlign: 'center' as const }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textDim }}>Store data not available</span>
      </div>
    );
  }

  return (
    <div>
      {stores.request !== undefined && <JsonBlock data={stores.request} label='Request Store' />}
      {stores.permissions !== undefined && <JsonBlock data={stores.permissions} label='Permissions Store' />}
      {stores.config !== undefined && <JsonBlock data={stores.config} label='Config Store' />}
    </div>
  );
};

/** Tab 7: Config */
const ConfigTab: React.FC<{ stores?: IDiagnosticPanelProps['stores'] }> = ({ stores }) => {
  const configData = stores?.config;
  if (!configData) {
    return (
      <div style={{ ...STYLES.card, textAlign: 'center' as const }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textDim }}>Config not available</span>
      </div>
    );
  }

  // Show config map if available
  const configs = configData.configs || [];
  const configMap = configData.configMap;

  return (
    <div>
      {configs.length > 0 && (
        <div style={STYLES.section}>
          <div style={STYLES.sectionTitle}>Configuration Items ({configs.length})</div>
          <div style={STYLES.card}>
            {configs.map(function (cfg: any, idx: number) {
              return (
                <KVRow key={cfg.key || idx} label={cfg.key || cfg.title || `Config ${idx}`} value={cfg.value} />
              );
            })}
          </div>
        </div>
      )}

      {configMap && (
        <div style={STYLES.section}>
          <div style={STYLES.sectionTitle}>Feature Flags</div>
          <div style={STYLES.card}>
            {(function () {
              const entries: React.ReactNode[] = [];
              if (configMap instanceof Map) {
                configMap.forEach(function (value: string, key: string) {
                  const isBool = value === 'true' || value === 'false';
                  entries.push(
                    <div key={key} style={STYLES.kvRow}>
                      <span style={STYLES.kvKey}>{key}</span>
                      <span style={{ ...STYLES.kvValue as React.CSSProperties }}>
                        {isBool ? (
                          <Badge label={value} active={value === 'true'} />
                        ) : (
                          value
                        )}
                      </span>
                    </div>
                  );
                });
              }
              return entries.length > 0 ? entries : (
                <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textDim }}>No flags set</span>
              );
            })()}
          </div>
        </div>
      )}

      <JsonBlock data={configData} label='Raw Config Store' />
    </div>
  );
};

// ─────────────────────────────────────────────
// Pivot tab styles (dark theme override)
// ─────────────────────────────────────────────

const PIVOT_STYLES = {
  root: {
    backgroundColor: C.bg,
    borderBottom: `1px solid ${C.border}`,
    padding: '0 20px',
  },
  link: {
    fontFamily: FONT_MONO,
    fontSize: 11,
    fontWeight: 500 as const,
    color: C.textMuted,
    backgroundColor: 'transparent',
    padding: '8px 12px',
    height: 36,
    lineHeight: '20px',
    letterSpacing: '0.02em',
    selectors: {
      ':hover': {
        color: C.text,
        backgroundColor: C.bgHover,
      },
      ':active': {
        color: C.text,
        backgroundColor: C.bgHover,
      },
    },
  },
  linkIsSelected: {
    fontWeight: 600 as const,
    color: C.blue + ' !important',
    backgroundColor: 'transparent',
    selectors: {
      ':before': {
        backgroundColor: C.blue,
        height: 2,
        left: 12,
        right: 12,
        transition: 'none',
      },
    },
  },
  linkContent: {
    fontSize: 11,
  },
  itemContainer: {
    // Hide the default focus indicator
  },
};

// ─────────────────────────────────────────────
// Panel header styles (dark override)
// ─────────────────────────────────────────────

const PANEL_STYLES = {
  main: {
    backgroundColor: C.bg,
    boxShadow: '-4px 0 32px rgba(0,0,0,0.5)',
  },
  commands: { display: 'none' },
  content: { padding: 0 },
  contentInner: { padding: 0 },
  scrollableContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
  },
  header: { display: 'none' },
  navigation: {
    backgroundColor: C.bg,
    borderBottom: `1px solid ${C.border}`,
    padding: '8px 12px',
    justifyContent: 'space-between' as const,
    display: 'flex',
    alignItems: 'center' as const,
  },
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export const DiagnosticPanel: React.FC<IDiagnosticPanelProps> = (props) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [fabHovered, setFabHovered] = React.useState(false);

  // Only render if ?diag=true
  const diagEnabled = React.useMemo(() => isDiagEnabled(), []);
  if (!diagEnabled) return null;

  const timestamp = React.useMemo(() => {
    const d = new Date();
    return d.toLocaleTimeString();
  }, [isOpen]);

  return (
    <>
      {/* Floating Action Button */}
      <TooltipHost content='Open Diagnostics Panel'>
        <div
          role='button'
          tabIndex={0}
          aria-label='Open diagnostic panel'
          style={{
            ...STYLES.fab,
            ...(fabHovered ? STYLES.fabHover : {}),
          }}
          onClick={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
          onMouseEnter={() => setFabHovered(true)}
          onMouseLeave={() => setFabHovered(false)}
        >
          <Icon
            iconName='DeveloperTools'
            styles={{
              root: {
                fontSize: 18,
                color: fabHovered ? C.fab : C.textMuted,
                transition: 'color 0.15s',
              },
            }}
          />
        </div>
      </TooltipHost>

      {/* Slide-out Panel */}
      <Panel
        isOpen={isOpen}
        onDismiss={() => setIsOpen(false)}
        type={PanelType.medium}
        isLightDismiss
        styles={PANEL_STYLES}
        onRenderNavigation={() => (
          <div style={PANEL_STYLES.navigation}>
            <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 10 }}>
              <Icon
                iconName='DeveloperTools'
                styles={{ root: { fontSize: 16, color: C.blue } }}
              />
              <Stack>
                <span style={STYLES.headerTitle}>Diagnostics</span>
                <span style={STYLES.headerMeta}>Snapshot at {timestamp}</span>
              </Stack>
            </Stack>
            <Stack horizontal tokens={{ childrenGap: 4 }}>
              <DefaultButton
                text='Copy All'
                iconProps={{ iconName: 'Copy' }}
                styles={{
                  root: {
                    backgroundColor: C.bgCard,
                    color: C.textMuted,
                    border: `1px solid ${C.border}`,
                    height: 28,
                    minWidth: 0,
                    padding: '0 10px',
                    fontSize: 11,
                    fontFamily: FONT_MONO,
                  },
                  rootHovered: {
                    backgroundColor: C.bgHover,
                    color: C.text,
                    border: `1px solid ${C.border}`,
                  },
                  label: { fontSize: 11 },
                  icon: { fontSize: 12 },
                }}
                onClick={() => {
                  try {
                    const snapshot = JSON.stringify(props, null, 2);
                    navigator.clipboard.writeText(snapshot).catch(function () {
                      // fallback: noop
                    });
                  } catch {
                    // serialization failed
                  }
                }}
              />
              <IconButton
                iconProps={{ iconName: 'Cancel' }}
                ariaLabel='Close panel'
                onClick={() => setIsOpen(false)}
                styles={{
                  root: {
                    color: C.textMuted,
                    backgroundColor: 'transparent',
                    width: 28,
                    height: 28,
                  },
                  rootHovered: {
                    color: C.text,
                    backgroundColor: C.bgHover,
                  },
                }}
              />
            </Stack>
          </div>
        )}
      >
        <div style={STYLES.panelContent}>
          <Pivot
            styles={PIVOT_STYLES}
            overflowBehavior='menu'
          >
            <PivotItem headerText='User' itemIcon='Contact'>
              <div style={STYLES.tabArea}>
                <UserContextTab
                  currentUser={props.currentUser}
                  userGroups={props.userGroups}
                  permissions={props.permissions}
                />
              </div>
            </PivotItem>

            <PivotItem headerText='Request' itemIcon='PageData'>
              <div style={STYLES.tabArea}>
                <RequestStateTab request={props.request} />
              </div>
            </PivotItem>

            <PivotItem headerText='Docs' itemIcon='Attach'>
              <div style={STYLES.tabArea}>
                <DocumentsTab documents={props.documents} />
              </div>
            </PivotItem>

            <PivotItem headerText='Perms' itemIcon='Permissions'>
              <div style={STYLES.tabArea}>
                <PermissionsTab
                  permissions={props.permissions}
                  itemPermissions={props.itemPermissions}
                />
              </div>
            </PivotItem>

            <PivotItem headerText='Visibility' itemIcon='View'>
              <div style={STYLES.tabArea}>
                <VisibilityTab visibility={props.visibility} />
              </div>
            </PivotItem>

            <PivotItem headerText='Stores' itemIcon='Database'>
              <div style={STYLES.tabArea}>
                <StoresTab stores={props.stores} />
              </div>
            </PivotItem>

            <PivotItem headerText='Config' itemIcon='Settings'>
              <div style={STYLES.tabArea}>
                <ConfigTab stores={props.stores} />
              </div>
            </PivotItem>
          </Pivot>
        </div>
      </Panel>
    </>
  );
};

export default DiagnosticPanel;
