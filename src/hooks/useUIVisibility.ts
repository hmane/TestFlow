import * as React from 'react';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import type { ILegalRequest } from '@appTypes/index';
import type { RequestStatus } from '@appTypes/workflowTypes';
import { usePermissions } from './usePermissions';
import { useRequestStore } from '@stores/requestStore';
import {
  createVisibilityContext,
  getUIVisibility,
  type IUIVisibility,
  type IVisibilityContext,
} from '@services/uiVisibilityService';

export interface IUseUIVisibilityOptions {
  status?: RequestStatus;
  isDirty?: boolean;
  itemId?: number;
  request?: Partial<ILegalRequest>;
}

export interface IUseUIVisibilityResult extends IUIVisibility {
  context: IVisibilityContext;
}

export function useUIVisibility(options: IUseUIVisibilityOptions = {}): IUseUIVisibilityResult {
  const permissions = usePermissions();
  const { currentRequest, itemId: storeItemId } = useRequestStore((state) => ({
    currentRequest: state.currentRequest,
    itemId: state.itemId,
  }));

  const request = options.request ?? currentRequest ?? undefined;
  const effectiveItemId = options.itemId ?? storeItemId;
  const currentUserId = React.useMemo(() => String(SPContext.currentUser?.id ?? ''), []);

  const context = React.useMemo(
    (): IVisibilityContext =>
      createVisibilityContext(options.status ?? request?.status, permissions, currentUserId, request, {
        isDirty: options.isDirty,
        isNewRequest: !effectiveItemId,
      }),
    [options.status, options.isDirty, permissions, currentUserId, request, effectiveItemId]
  );

  const visibility = React.useMemo(() => getUIVisibility(context), [context]);

  return React.useMemo(
    () => ({
      ...visibility,
      context,
    }),
    [visibility, context]
  );
}

