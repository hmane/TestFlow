# Legal Workflow Documentation Hub

Welcome to the Legal Workflow System documentation. This directory contains all technical and business documentation organized by purpose.

---

## Quick Navigation

### 📋 Requirements & Specifications
- **[Business Requirements (BRD)](requirements/BRD.md)** - Business objectives, stakeholders, and success criteria
- **[Functional Requirements (FRD)](requirements/FRD.md)** - Detailed functional specifications and user stories
- **[System Overview](requirements/system-overview.md)** - Comprehensive system description and workflow details

### 🏗️ Design Documents
- **[High-Level Design (HLD)](design/HLD.md)** - System architecture and component overview
- **[Technical Design (TDD)](design/TDD.md)** - Detailed technical implementation specifications
- **[Functional Specification (FSD)](design/FSD.md)** - Detailed functional design and workflows

### 📚 Guides
- **[SPFx Toolkit Usage Guide](guides/SPFX-Toolkit-Usage.md)** - Comprehensive guide for using the spfx-toolkit library

### 🔧 Technical Notes
- **[Request & Document Processing Sequences](technical-notes/sequences.md)** - Detailed flow diagrams for loading, saving, and document uploads
- **[Document Upload Integration](technical-notes/document-upload-integration.md)** - Document upload implementation details
- **[SPUserField Fix](technical-notes/spuserfield-fix.md)** - Solution for SharePoint user field issues

---

## Documentation by Role

### For Product Owners & Business Stakeholders
Start here to understand the business value and requirements:
1. [Business Requirements (BRD)](requirements/BRD.md)
2. [System Overview](requirements/system-overview.md)
3. [Functional Requirements (FRD)](requirements/FRD.md)

### For Architects & Tech Leads
Start here to understand the technical architecture:
1. [High-Level Design (HLD)](design/HLD.md)
2. [Technical Design (TDD)](design/TDD.md)
3. [Request Processing Sequences](technical-notes/sequences.md)

### For Developers
Start here to begin coding:
1. **[CLAUDE.md](../CLAUDE.md)** (in project root) - Quick developer guide
2. [SPFx Toolkit Usage Guide](guides/SPFX-Toolkit-Usage.md)
3. [Request Processing Sequences](technical-notes/sequences.md)
4. [Technical Design (TDD)](design/TDD.md)

### For QA & Testers
Start here to understand test scenarios:
1. [Functional Requirements (FRD)](requirements/FRD.md)
2. [System Overview](requirements/system-overview.md)
3. [Functional Specification (FSD)](design/FSD.md)

---

## Common Tasks

### Understanding the Workflow
The Legal Workflow system automates legal review processes with these statuses:
1. **Draft** → User creates request
2. **Legal Intake** → Legal admin triages
3. **Assign Attorney** (optional) → Committee assigns or direct assignment
4. **In Review** → Legal/Compliance review
5. **Closeout** → Final tracking (if required)
6. **Completed** → Request complete

See [System Overview](requirements/system-overview.md) for details.

### Understanding Code Structure
```
src/
├── components/          # Shared React components
├── contexts/            # React Context providers
├── extensions/          # SPFx Form Customizer extensions
├── hooks/               # Custom React hooks
├── schemas/             # Zod validation schemas
├── services/            # Business logic layer
├── sp/                  # SharePoint constants
├── stores/              # Zustand state management
├── types/               # TypeScript type definitions
└── utils/               # Utility functions
```

See [CLAUDE.md](../CLAUDE.md) for detailed code structure.

### Understanding Data Flow

**Request Loading:**
```
User Opens Form → Store.loadRequest() → Service loads from SharePoint
→ Maps to TypeScript model → Updates store → UI renders
```

**Request Saving:**
```
User Saves → Validates → Service builds update payload → Saves to SharePoint
→ Reloads fresh data → Processes document uploads → Updates store → UI updates
```

See [Request Processing Sequences](technical-notes/sequences.md) for detailed diagrams.

### Adding a New Field

1. Update SharePoint list schema (see [System Overview](requirements/system-overview.md))
2. Add TypeScript type in `src/types/`
3. Add Zod validation in `src/schemas/`
4. Update store in `src/stores/requestStore.ts`
5. Update mapping in `src/services/requestLoadService.ts`
6. Update save payload in `src/services/requestSaveService.ts`
7. Add UI component

See [Technical Design (TDD)](design/TDD.md) for implementation patterns.

### Troubleshooting

**Build Errors:**
1. Run `npm run clean`
2. Run `gulp bundle`
3. Check [CLAUDE.md](../CLAUDE.md) debugging section

**Runtime Errors:**
1. Check browser DevTools console
2. Check SharePoint permissions
3. Verify SPContext initialization
4. See [Technical Notes](technical-notes/) for specific issues

**Data Loading Issues:**
See [Request Processing Sequences](technical-notes/sequences.md) for:
- SharePoint API calls made
- Expected data flow
- Performance considerations

---

## Key Concepts

### SPFx Toolkit
This project heavily uses the `spfx-toolkit` library for:
- SharePoint operations (`SPContext`)
- Logging (`SPContext.logger`)
- UI components (Card, WorkflowStepper, etc.)
- Utilities (form helpers, data extraction)

See [SPFx Toolkit Usage Guide](guides/SPFX-Toolkit-Usage.md) for comprehensive usage.

### State Management
Uses **Zustand** for global state:
- `requestStore` - Request data and operations
- `documentsStore` - Document management
- `configStore` - App configuration
- `submissionItemsStore` - Submission types

State is persisted with devtools middleware in development.

### Form Management
Uses **React Hook Form + Zod**:
- Schema-based validation
- Type-safe forms
- Automatic error handling
- Integration with DevExtreme components

See [Technical Design (TDD)](design/TDD.md) for form patterns.

### SharePoint Integration
- Uses `@pnp/sp` via `SPContext.sp`
- CAML queries for efficient data loading
- Batch operations for performance
- Change detection to minimize updates

See [Request Processing Sequences](technical-notes/sequences.md) for API call details.

---

## Document Index

### Requirements (3 documents)
| Document | Purpose | Audience | Pages |
|----------|---------|----------|-------|
| [BRD.md](requirements/BRD.md) | Business Requirements | Business | ~10 |
| [FRD.md](requirements/FRD.md) | Functional Requirements | Product/Dev | ~50 |
| [system-overview.md](requirements/system-overview.md) | Complete System Description | All | ~90 |

### Design (3 documents)
| Document | Purpose | Audience | Pages |
|----------|---------|----------|-------|
| [HLD.md](design/HLD.md) | High-Level Architecture | Architects | ~15 |
| [TDD.md](design/TDD.md) | Technical Implementation | Developers | ~130 |
| [FSD.md](design/FSD.md) | Functional Design | Dev/QA | ~120 |

### Guides (1 document)
| Document | Purpose | Audience | Pages |
|----------|---------|----------|-------|
| [SPFX-Toolkit-Usage.md](guides/SPFX-Toolkit-Usage.md) | Toolkit Usage | Developers | ~160 |

### Technical Notes (3 documents)
| Document | Purpose | Audience | Pages |
|----------|---------|----------|-------|
| [sequences.md](technical-notes/sequences.md) | Request/Document Flow | Developers | ~15 |
| [document-upload-integration.md](technical-notes/document-upload-integration.md) | Upload Details | Developers | ~12 |
| [spuserfield-fix.md](technical-notes/spuserfield-fix.md) | User Field Solution | Developers | ~3 |

---

## Contributing to Documentation

### Adding New Documentation
1. Place in appropriate folder (requirements/design/guides/technical-notes)
2. Update this README.md with link
3. Follow markdown formatting standards
4. Include code examples where applicable

### Documentation Standards
- Use GitHub-flavored Markdown
- Include table of contents for docs > 50 lines
- Use code blocks with language specifiers
- Include file paths as `code references`
- Add diagrams for complex flows
- Keep examples up-to-date with code

### When to Update Documentation

**Update when:**
- Adding new features
- Changing workflows or statuses
- Modifying SharePoint lists
- Changing data models
- Adding/removing fields
- Performance optimizations
- Architectural changes

**Documents to update:**
- BRD/FRD: New business requirements
- TDD/FSD: Implementation changes
- sequences.md: Data flow changes
- CLAUDE.md: Developer patterns
- This README: New documents

---

## External Resources

### Microsoft Documentation
- [SPFx 1.21.1 Overview](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/sharepoint-framework-overview)
- [Fluent UI v8](https://developer.microsoft.com/en-us/fluentui#/controls/web)
- [PnPjs v3](https://pnp.github.io/pnpjs/)

### Community Resources
- [SharePoint PnP](https://pnp.github.io/)
- [SPFx Samples](https://github.com/pnp/sp-dev-fx-webparts)

### Project Links
- **Source Code**: `../src/`
- **Scripts**: `../scripts/`
- **Config**: `../config/`

---

## Changelog

### 2025-02 - Documentation Reorganization
- Moved all docs from root to `docs/` directory
- Organized into requirements/design/guides/technical-notes
- Created this README as central hub
- Added sequences.md with flow diagrams

### Previous
- Initial documentation in root directory
- Multiple overlapping documents
- No clear organization

---

**Need Help?**
- Check [CLAUDE.md](../CLAUDE.md) for quick developer reference
- See [sequences.md](technical-notes/sequences.md) for data flow understanding
- Review [TDD.md](design/TDD.md) for implementation patterns

**Questions or Feedback?**
Contact the development team or create an issue in the project repository.
