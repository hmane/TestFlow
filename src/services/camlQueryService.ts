/**
 * CAML Query Service
 *
 * Provides reusable utilities for executing CAML queries using PnP's renderListDataAsStream.
 * renderListDataAsStream automatically expands lookup and user fields, making it more
 * efficient than standard REST API queries.
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import type { IRenderListDataParameters, IRenderListDataAsStreamResult } from '@pnp/sp/lists';

/**
 * Response structure from renderListDataAsStream (alias for PnP type)
 * @deprecated Use IRenderListDataAsStreamResult from @pnp/sp/lists instead
 */
export interface IRenderListDataResponse {
  Row: any[];
  FirstRow: number;
  LastRow: number;
  RowLimit: number;
  FilterLink: string;
  ForceNoHierarchy: string;
}

/**
 * Options for renderListData query
 */
export interface IRenderListDataOptions {
  /** List title or GUID */
  listTitle: string;
  /** Array of field internal names to retrieve */
  fields: string[];
  /** Optional item ID to filter by */
  itemId?: number;
  /** Optional CAML query filter (without <Query> wrapper) */
  filterCaml?: string;
  /** Row limit (default: 1 for single item, 5000 for queries) */
  rowLimit?: number;
}

/**
 * Builds ViewXml for renderListDataAsStream
 *
 * @param fields - Array of field internal names to select
 * @param rowLimit - Maximum number of rows to return (default: 5000)
 * @returns ViewXml string for renderListDataAsStream
 */
export function buildViewXml(fields: string[], rowLimit: number = 5000): string {
  const viewFields = fields.map(field => `<FieldRef Name="${field}" />`).join('');

  return `<View>
    <ViewFields>
      ${viewFields}
    </ViewFields>
    <RowLimit>${rowLimit}</RowLimit>
  </View>`;
}

/**
 * Builds CAML query filter for a specific item ID
 *
 * @param itemId - SharePoint list item ID
 * @returns CAML query string
 */
export function buildItemIdQuery(itemId: number): string {
  return `<View>
    <Query>
      <Where>
        <Eq>
          <FieldRef Name='ID' />
          <Value Type='Counter'>${itemId}</Value>
        </Eq>
      </Where>
    </Query>
    <RowLimit>1</RowLimit>
  </View>`;
}

/**
 * Builds CAML query with custom filter
 *
 * @param fields - Array of field internal names to select
 * @param filterCaml - CAML filter XML (content inside <Where> tags)
 * @param rowLimit - Maximum number of rows to return
 * @returns Complete View XML with query and fields
 */
export function buildQueryWithFilter(
  fields: string[],
  filterCaml: string,
  rowLimit: number = 5000
): string {
  const viewFields = fields.map(field => `<FieldRef Name="${field}" />`).join('');

  return `<View>
    <Query>
      <Where>
        ${filterCaml}
      </Where>
    </Query>
    <ViewFields>
      ${viewFields}
    </ViewFields>
    <RowLimit>${rowLimit}</RowLimit>
  </View>`;
}

/**
 * Executes renderListDataAsStream query
 *
 * This API automatically expands lookup and user fields, returning complete objects
 * without requiring manual .expand() like standard REST queries.
 *
 * @param options - Query options including list, fields, and optional filters
 * @returns Promise resolving to the first row (or undefined if not found)
 *
 * @example
 * ```typescript
 * const request = await renderListData({
 *   listTitle: 'Requests',
 *   fields: ['ID', 'Title', 'Author', 'Status'],
 *   itemId: 123
 * });
 * // request.Author is fully expanded: { Id, Title, EMail, Department, etc. }
 * ```
 */
export async function renderListData<T = any>(
  options: IRenderListDataOptions
): Promise<T | undefined> {
  const { listTitle, fields, itemId, filterCaml, rowLimit } = options;

  try {
    SPContext.logger.info('CAML Query: renderListDataAsStream', {
      listTitle,
      fieldCount: fields.length,
      itemId,
      hasFilter: !!filterCaml,
    });

    // Build appropriate ViewXml based on options
    let viewXml: string;

    if (itemId) {
      // Query for specific item by ID
      viewXml = buildItemIdQuery(itemId);
      // Add fields to the query
      const viewFieldsXml = fields.map(f => `<FieldRef Name="${f}" />`).join('');
      viewXml = viewXml.replace(
        '<RowLimit>1</RowLimit>',
        `<ViewFields>${viewFieldsXml}</ViewFields><RowLimit>1</RowLimit>`
      );
    } else if (filterCaml) {
      // Query with custom filter
      viewXml = buildQueryWithFilter(fields, filterCaml, rowLimit || 5000);
    } else {
      // Simple field selection, no filter
      viewXml = buildViewXml(fields, rowLimit || 5000);
    }

    // Build parameters for PnP renderListDataAsStream
    const parameters: IRenderListDataParameters = {
      ViewXml: viewXml,
      RenderOptions: 2, // 2 = ContextInfo, includes field schemas
    };

    // Execute renderListDataAsStream using PnP method with pessimistic caching
    // Use spPessimistic to bypass cache and always get fresh data
    // PnP handles authentication, request digest, and headers automatically
    const data: IRenderListDataAsStreamResult = await SPContext.spPessimistic.web.lists
      .getByTitle(listTitle)
      .renderListDataAsStream(parameters);

    // Check if any rows returned
    if (!data.Row || data.Row.length === 0) {
      SPContext.logger.warn('CAML Query: No rows returned', { listTitle, itemId });
      return undefined;
    }

    // Return first row (for itemId queries) or all rows
    const result = itemId ? data.Row[0] : data.Row;

    SPContext.logger.success('CAML Query: Data retrieved successfully', {
      listTitle,
      rowCount: data.Row.length,
    });

    return result as T;

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    SPContext.logger.error('CAML Query: Failed to execute renderListDataAsStream', error, {
      listTitle,
      itemId,
      fieldCount: fields.length,
    });

    // Check for common error scenarios
    if (errorMessage.indexOf('404') !== -1 || errorMessage.indexOf('not found') !== -1) {
      throw new Error(`List '${listTitle}' not found or item ${itemId || 'N/A'} does not exist`);
    }

    if (errorMessage.indexOf('403') !== -1 || errorMessage.indexOf('Access denied') !== -1) {
      throw new Error(`Access denied to list '${listTitle}' or item ${itemId || 'N/A'}`);
    }

    throw new Error(`Failed to load data from '${listTitle}': ${errorMessage}`);
  }
}

/**
 * Executes renderListDataAsStream query and returns multiple rows
 *
 * @param options - Query options
 * @returns Promise resolving to array of rows
 */
export async function renderListDataMultiple<T = any>(
  options: IRenderListDataOptions
): Promise<T[]> {
  const { listTitle, fields, filterCaml, rowLimit } = options;

  try {
    const viewXml = filterCaml
      ? buildQueryWithFilter(fields, filterCaml, rowLimit || 5000)
      : buildViewXml(fields, rowLimit || 5000);

    const requestPayload = {
      parameters: {
        __metadata: { type: 'SP.RenderListDataParameters' },
        ViewXml: viewXml,
        RenderOptions: 2,
      },
    };

    const endpoint = `${SPContext.webAbsoluteUrl}/_api/web/lists/getbytitle('${listTitle}')/renderListDataAsStream`;

    // Get request digest for POST requests
    const digestResult = await SPContext.sp.web.select('GetContextWebInformation')();
    const digest = (digestResult as any).GetContextWebInformation?.FormDigestValue;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json;odata=verbose',
        'Content-Type': 'application/json;odata=verbose',
        'X-RequestDigest': digest || '',
      },
      credentials: 'same-origin',
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      throw new Error(`renderListDataAsStream failed: ${response.status} ${response.statusText}`);
    }

    const data: IRenderListDataResponse = await response.json();

    return (data.Row || []) as T[];

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('CAML Query: Failed to execute renderListDataAsStream (multiple)', error, {
      listTitle,
      fieldCount: fields.length,
    });

    throw new Error(`Failed to load data from '${listTitle}': ${errorMessage}`);
  }
}
