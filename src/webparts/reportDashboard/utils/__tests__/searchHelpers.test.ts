/**
 * Search Helpers Tests
 *
 * Tests for search utility functions used in the Report Dashboard
 * for searching requests and documents.
 */

import {
  extractRequestIdFromPath,
  buildRequestSearchFilter,
  buildDocumentSearchCAML,
  extractRequestIdsFromDocuments,
  normalizeSearchQuery,
  IDocumentRow,
} from '../searchHelpers';

describe('Search Helpers', () => {
  describe('extractRequestIdFromPath', () => {
    it('should extract request ID from standard path', () => {
      const path = '/sites/test/RequestDocuments/CRR-25-001/document.pdf';
      expect(extractRequestIdFromPath(path)).toBe('CRR-25-001');
    });

    it('should extract request ID from nested path', () => {
      const path = '/sites/test/RequestDocuments/CRR-25-002/subfolder/file.docx';
      expect(extractRequestIdFromPath(path)).toBe('CRR-25-002');
    });

    it('should extract request ID case-insensitively', () => {
      const path = '/sites/test/requestdocuments/CRR-25-003/file.pdf';
      expect(extractRequestIdFromPath(path)).toBe('CRR-25-003');
    });

    it('should handle different request ID formats', () => {
      expect(extractRequestIdFromPath('/RequestDocuments/REQ-001/file.pdf')).toBe('REQ-001');
      expect(extractRequestIdFromPath('/RequestDocuments/12345/file.pdf')).toBe('12345');
      expect(extractRequestIdFromPath('/RequestDocuments/Test_Request/file.pdf')).toBe('Test_Request');
    });

    it('should return null for paths without RequestDocuments', () => {
      expect(extractRequestIdFromPath('/sites/test/Documents/file.pdf')).toBeNull();
      expect(extractRequestIdFromPath('/sites/test/Shared Documents/file.pdf')).toBeNull();
    });

    it('should return null for empty or null paths', () => {
      expect(extractRequestIdFromPath('')).toBeNull();
      expect(extractRequestIdFromPath(null as any)).toBeNull();
      expect(extractRequestIdFromPath(undefined as any)).toBeNull();
    });

    it('should return null for paths at RequestDocuments root', () => {
      // No subfolder = no request ID
      expect(extractRequestIdFromPath('/sites/test/RequestDocuments')).toBeNull();
    });
  });

  describe('buildRequestSearchFilter', () => {
    it('should build basic filter for query only', () => {
      const filter = buildRequestSearchFilter('test');
      expect(filter).toContain("substringof('test', Title)");
      expect(filter).toContain("substringof('test', RequestTitle)");
    });

    it('should escape single quotes in query', () => {
      const filter = buildRequestSearchFilter("O'Brien");
      expect(filter).toContain("O''Brien");
    });

    it('should include document request IDs in filter', () => {
      const filter = buildRequestSearchFilter('test', ['CRR-25-001', 'CRR-25-002']);
      expect(filter).toContain("Title eq 'CRR-25-001'");
      expect(filter).toContain("Title eq 'CRR-25-002'");
    });

    it('should handle empty document request IDs array', () => {
      const filter = buildRequestSearchFilter('test', []);
      expect(filter).not.toContain('Title eq');
    });
  });

  describe('buildDocumentSearchCAML', () => {
    it('should build CAML query with FileLeafRef search', () => {
      const caml = buildDocumentSearchCAML('report');
      expect(caml).toContain('<FieldRef Name="FileLeafRef"');
      expect(caml).toContain('<Value Type="Text">report</Value>');
    });

    it('should build CAML query with Title search', () => {
      const caml = buildDocumentSearchCAML('report');
      expect(caml).toContain('<FieldRef Name="Title"');
    });

    it('should include RecursiveAll scope', () => {
      const caml = buildDocumentSearchCAML('test');
      expect(caml).toContain('Scope="RecursiveAll"');
    });

    it('should escape single quotes', () => {
      const caml = buildDocumentSearchCAML("O'Brien's Report");
      expect(caml).toContain("O''Brien''s Report");
    });

    it('should use default row limit of 20', () => {
      const caml = buildDocumentSearchCAML('test');
      expect(caml).toContain('<RowLimit>20</RowLimit>');
    });

    it('should allow custom row limit', () => {
      const caml = buildDocumentSearchCAML('test', 50);
      expect(caml).toContain('<RowLimit>50</RowLimit>');
    });
  });

  describe('extractRequestIdsFromDocuments', () => {
    it('should extract request IDs from Request lookup field', () => {
      const rows: IDocumentRow[] = [
        { Request: [{ lookupId: 1, lookupValue: 'CRR-25-001' }] },
        { Request: [{ lookupId: 2, lookupValue: 'CRR-25-002' }] },
      ];

      const result = extractRequestIdsFromDocuments(rows);

      expect(result).toContain('CRR-25-001');
      expect(result).toContain('CRR-25-002');
      expect(result).toHaveLength(2);
    });

    it('should fallback to FileRef extraction when Request lookup is missing', () => {
      const rows: IDocumentRow[] = [
        { FileRef: '/sites/test/RequestDocuments/CRR-25-003/file.pdf' },
      ];

      const result = extractRequestIdsFromDocuments(rows);

      expect(result).toContain('CRR-25-003');
    });

    it('should prefer Request lookup over FileRef', () => {
      const mockExtractor = jest.fn();
      const rows: IDocumentRow[] = [
        {
          Request: [{ lookupId: 1, lookupValue: 'CRR-25-001' }],
          FileRef: '/sites/test/RequestDocuments/ShouldNotUseThis/file.pdf',
        },
      ];

      const result = extractRequestIdsFromDocuments(rows, mockExtractor);

      expect(result).toContain('CRR-25-001');
      expect(mockExtractor).not.toHaveBeenCalled();
    });

    it('should deduplicate request IDs', () => {
      const rows: IDocumentRow[] = [
        { Request: [{ lookupId: 1, lookupValue: 'CRR-25-001' }] },
        { Request: [{ lookupId: 1, lookupValue: 'CRR-25-001' }] },
        { Request: [{ lookupId: 2, lookupValue: 'CRR-25-002' }] },
      ];

      const result = extractRequestIdsFromDocuments(rows);

      expect(result).toHaveLength(2);
      expect(result).toContain('CRR-25-001');
      expect(result).toContain('CRR-25-002');
    });

    it('should handle empty Request array', () => {
      const rows: IDocumentRow[] = [
        { Request: [], FileRef: '/RequestDocuments/CRR-25-001/file.pdf' },
      ];

      const result = extractRequestIdsFromDocuments(rows);

      expect(result).toContain('CRR-25-001');
    });

    it('should handle Request with empty lookupValue', () => {
      const rows: IDocumentRow[] = [
        {
          Request: [{ lookupId: 1, lookupValue: '' }],
          FileRef: '/RequestDocuments/CRR-25-001/file.pdf',
        },
      ];

      const result = extractRequestIdsFromDocuments(rows);

      expect(result).toContain('CRR-25-001');
    });

    it('should return empty array for empty input', () => {
      const result = extractRequestIdsFromDocuments([]);
      expect(result).toEqual([]);
    });

    it('should skip rows with no valid request ID', () => {
      const rows: IDocumentRow[] = [
        { FileRef: '/sites/test/Documents/file.pdf' }, // No RequestDocuments folder
        { Request: [{ lookupId: 1, lookupValue: 'CRR-25-001' }] },
      ];

      const result = extractRequestIdsFromDocuments(rows);

      expect(result).toHaveLength(1);
      expect(result).toContain('CRR-25-001');
    });
  });

  describe('normalizeSearchQuery', () => {
    it('should trim whitespace', () => {
      expect(normalizeSearchQuery('  test  ')).toBe('test');
      expect(normalizeSearchQuery('\t query \n')).toBe('query');
    });

    it('should return empty string for empty input', () => {
      expect(normalizeSearchQuery('')).toBe('');
      expect(normalizeSearchQuery('   ')).toBe('');
    });

    it('should return empty string for null/undefined', () => {
      expect(normalizeSearchQuery(null as any)).toBe('');
      expect(normalizeSearchQuery(undefined as any)).toBe('');
    });

    it('should return empty string for non-string input', () => {
      expect(normalizeSearchQuery(123 as any)).toBe('');
      expect(normalizeSearchQuery({} as any)).toBe('');
    });

    it('should preserve internal spaces', () => {
      expect(normalizeSearchQuery('hello world')).toBe('hello world');
    });
  });
});
