/**
 * Search Helper Utilities
 *
 * Utility functions for searching requests and documents
 * in the Report Dashboard.
 */

/**
 * Extract request ID from a document file path
 *
 * @param filePath - The file path from SharePoint (e.g., "/sites/test/RequestDocuments/CRR-25-001/document.pdf")
 * @returns The request ID (e.g., "CRR-25-001") or null if not found
 *
 * @example
 * extractRequestIdFromPath('/sites/test/RequestDocuments/CRR-25-001/document.pdf') // 'CRR-25-001'
 * extractRequestIdFromPath('/sites/test/OtherLibrary/file.pdf') // null
 */
export function extractRequestIdFromPath(filePath: string): string | null {
  if (!filePath) {
    return null;
  }

  // Match RequestDocuments/{RequestID}/ pattern
  const match = filePath.match(/RequestDocuments\/([^/]+)\//i);
  return match ? match[1] : null;
}

/**
 * Build OData filter for request search
 *
 * @param query - Search query string
 * @param documentRequestIds - Request IDs from document search
 * @returns OData filter string
 */
export function buildRequestSearchFilter(query: string, documentRequestIds: string[] = []): string {
  // Escape single quotes for OData
  const escapedQuery = query.replace(/'/g, "''");

  // Base filter: search in Title and RequestTitle
  let filter = `substringof('${escapedQuery}', Title) or substringof('${escapedQuery}', RequestTitle)`;

  // Add document request IDs to filter if found
  if (documentRequestIds.length > 0) {
    const idFilters = documentRequestIds.map((id) => `Title eq '${id}'`).join(' or ');
    filter = `(${filter}) or (${idFilters})`;
  }

  return filter;
}

/**
 * Build CAML query for document search
 * Searches both FileLeafRef (filename) and Title
 *
 * @param query - Search query string
 * @param rowLimit - Maximum number of results (default 20)
 * @returns CAML query XML string
 */
export function buildDocumentSearchCAML(query: string, rowLimit = 20): string {
  // Escape single quotes for CAML
  const escapedQuery = query.replace(/'/g, "''");

  return `
    <View Scope="RecursiveAll">
      <Query>
        <Where>
          <Or>
            <Contains>
              <FieldRef Name="FileLeafRef" />
              <Value Type="Text">${escapedQuery}</Value>
            </Contains>
            <Contains>
              <FieldRef Name="Title" />
              <Value Type="Text">${escapedQuery}</Value>
            </Contains>
          </Or>
        </Where>
      </Query>
      <RowLimit>${rowLimit}</RowLimit>
    </View>
  `.trim();
}

/**
 * Document row interface for type safety
 */
export interface IDocumentRow {
  Request?: Array<{ lookupId: number; lookupValue: string }>;
  FileRef?: string;
}

/**
 * Extract unique request IDs from document search results
 *
 * @param rows - Array of document rows from SharePoint
 * @param extractRequestIdFn - Function to extract request ID from path (for fallback)
 * @returns Array of unique request IDs
 */
export function extractRequestIdsFromDocuments(
  rows: IDocumentRow[],
  extractRequestIdFn = extractRequestIdFromPath
): string[] {
  const requestIds = new Set<string>();

  rows.forEach((doc) => {
    // First try to get request ID from the Request lookup field
    if (doc.Request && Array.isArray(doc.Request) && doc.Request.length > 0) {
      const requestLookup = doc.Request[0];
      if (requestLookup.lookupValue) {
        requestIds.add(requestLookup.lookupValue);
        return;
      }
    }

    // Fallback: extract from file path
    const fileRef = doc.FileRef;
    if (fileRef) {
      const requestId = extractRequestIdFn(fileRef);
      if (requestId) {
        requestIds.add(requestId);
      }
    }
  });

  return Array.from(requestIds);
}

/**
 * Validate and normalize search query
 *
 * @param query - Raw search query
 * @returns Normalized query or empty string if invalid
 */
export function normalizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }

  return query.trim();
}
