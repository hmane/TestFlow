# Legal Workflow System

An automated legal review and compliance workflow system built as a SharePoint Framework (SPFx) Form Customizer extension. Streamlines legal and compliance review processes for marketing communications with centralized tracking, automated routing, and complete audit trails.

## Overview

The Legal Review System (LRS) replaces manual email-based workflows with an integrated SharePoint solution that provides:
- **Automated Routing**: Direct assignment or committee-based attorney assignment
- **Centralized Tracking**: Real-time status tracking with workflow visualization
- **Complete Audit Trail**: All actions, approvals, and reviews are logged
- **Document Management**: Integrated document upload and approval file tracking
- **Dual Review Support**: Legal and Compliance review paths
- **Role-Based Access**: Item-level permissions managed via Azure Functions

---

## SharePoint Framework Version

![version](https://img.shields.io/badge/SPFx-1.21.1-green.svg)
![react](https://img.shields.io/badge/React-17.0.1-blue.svg)
![typescript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)
![node](https://img.shields.io/badge/Node.js-18.x_LTS-green.svg)

## Technology Stack

### Core Framework
- **SPFx**: 1.21.1 (Form Customizer extension)
- **React**: 17.0.1
- **TypeScript**: 5.3.3
- **Node.js**: 18.x LTS (required)

### Key Libraries
- **spfx-toolkit**: Custom toolkit for SPContext, components, and utilities
- **@fluentui/react**: 8.106.4 (Fluent UI v8)
- **@pnp/sp**: 3.20.1 (SharePoint operations)
- **DevExtreme**: 22.2.3 (Form components)
- **React Hook Form**: 7.45.4 + Zod 4.1.11 (Form management & validation)
- **Zustand**: 4.3.9 (State management)

---

## Prerequisites

### Required
- **Node.js**: v18.x LTS
- **SharePoint Online**: Tenant with admin access
- **PowerShell**: For list setup scripts

### Optional
- **Azure Functions**: For permission management (v4 runtime, C#)
- **Visual Studio Code**: Recommended IDE
- **SharePoint PnP PowerShell**: For advanced setup

---

## Quick Start

### 1. Clone & Install

```bash
git clone <repository-url>
cd legal-workflow
npm install
```

### 2. Configure SharePoint Lists

Run the setup script to create required lists:

```powershell
# Navigate to scripts directory
cd scripts/sharepoint

# Run setup script (requires SharePoint admin)
./setup-lists.ps1 -SiteUrl "https://yourtenant.sharepoint.com/sites/yoursite"
```

This creates:
- **Requests** list (73 fields)
- **SubmissionItems** list
- **RequestDocuments** library

### 3. Build & Deploy

```bash
# Build the solution
npm run build

# Create deployment package
npm run release

# Deploy the .sppkg file
# Output: sharepoint/solution/legal-workflow.sppkg
# Upload to SharePoint App Catalog
```

### 4. Configure Form Customizer

1. Navigate to Requests list settings
2. Add Form Customizer extension
3. Component ID: (from manifest)
4. Configure list ID property

### 5. Test

```bash
# Local workbench testing
gulp serve

# Open: https://yourtenant.sharepoint.com/_layouts/15/workbench.aspx
```

---

## Documentation

### Quick Reference
- **[CLAUDE.md](./CLAUDE.md)** - Developer quick start guide
- **[Documentation Hub](./docs/README.md)** - Complete documentation index

### By Category

**📋 Requirements & Business**
- [Business Requirements (BRD)](./docs/requirements/BRD.md)
- [Functional Requirements (FRD)](./docs/requirements/FRD.md)
- [System Overview](./docs/requirements/system-overview.md)

**🏗️ Design & Architecture**
- [High-Level Design (HLD)](./docs/design/HLD.md)
- [Technical Design (TDD)](./docs/design/TDD.md)
- [Functional Specification (FSD)](./docs/design/FSD.md)

**📚 Developer Guides**
- [SPFx Toolkit Usage](./docs/guides/SPFX-Toolkit-Usage.md)
- [Request & Document Processing Sequences](./docs/technical-notes/sequences.md)

**🔧 Technical Notes**
- [Sequences & Data Flow](./docs/technical-notes/sequences.md)
- [Document Upload Integration](./docs/technical-notes/document-upload-integration.md)
- [SPUserField Fix](./docs/technical-notes/spuserfield-fix.md)

---

## Development Commands

### Build & Serve
```bash
# Install dependencies
npm install

# Build (development mode)
npm run build
# or
gulp bundle

# Build (production mode)
gulp bundle --ship
gulp package-solution --ship

# Serve for local workbench
gulp serve

# Clean build artifacts
npm run clean
```

### Type Checking (Fast)
```bash
# Type-check without building
npx tsc --noEmit
```

### Testing
```bash
# Run unit tests
npm run test
```

---

## Project Structure

```
legal-workflow/
├── docs/                    # Documentation (requirements, design, guides)
├── scripts/                 # PowerShell setup/deployment scripts
│   ├── sharepoint/          # SharePoint list management
│   └── dev/                 # Development utilities
├── src/                     # Source code
│   ├── components/          # Shared React components
│   ├── contexts/            # React Context providers
│   ├── extensions/          # SPFx extensions (Form Customizers)
│   ├── hooks/               # Custom React hooks
│   ├── schemas/             # Zod validation schemas
│   ├── services/            # Business logic layer
│   ├── sp/                  # SharePoint constants
│   ├── stores/              # Zustand state stores
│   ├── types/               # TypeScript types
│   └── utils/               # Utility functions
├── config/                  # SPFx configuration
├── CLAUDE.md                # Developer quick reference
└── package.json
```

---

## Workflow Overview

### Request Statuses
1. **Draft** - User creates request
2. **Legal Intake** - Legal Admin triages
3. **Assign Attorney** (optional) - Committee or direct assignment
4. **In Review** - Legal and/or Compliance review
5. **Closeout** - Final tracking (if required)
6. **Completed** - Request finalized

**Special Statuses**: Cancelled, On Hold

### User Roles
- **LW - Submitters**: Create and view requests
- **LW - Legal Admin**: Triage and assign
- **LW - Attorney Assigner**: Committee members
- **LW - Attorneys**: Review assigned requests
- **LW - Compliance Users**: Compliance reviews
- **LW - Admin**: Full system administration

---

## Key Features

### Phase 1 (Current)
✅ Communication Request type
✅ Core workflow automation
✅ Direct and committee attorney assignment
✅ Legal and Compliance review paths
✅ Document upload and approval tracking
✅ Real-time status dashboard
✅ Email notifications (Power Automate)
✅ Item-level permissions (Azure Functions)

### Phase 2 (Future)
🔜 General Review request type
🔜 IMA Review request type
🔜 Seismic Database integration
🔜 Company holiday calendar
🔜 Advanced analytics
🔜 Mobile app

---

## Configuration

### App Settings

Configuration stored in SharePoint **Configuration** list:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `azureFunctionUrl` | string | - | Azure Function endpoint for permissions |
| `maxFileSizeMB` | number | 250 | Max file upload size |
| `enablePhase2RequestTypes` | boolean | false | Enable Phase 2 features |

### Submission Types

Managed in SharePoint **SubmissionItems** list:
- Title (e.g., "Marketing Communication")
- TurnAroundTimeInDays (business days)
- Description

---

## Troubleshooting

### Build Errors

**Issue**: TypeScript errors after pulling latest
**Solution**:
```bash
npm run clean
gulp bundle
npx tsc --noEmit
```

**Issue**: SCSS type files missing
**Solution**: Run `gulp bundle` to regenerate *.scss.ts files

### Runtime Errors

**Issue**: "SPContext is not initialized"
**Solution**: Ensure `SPContext.smart()` called in extension's `onInit()`

**Issue**: "Access Denied" errors
**Solution**:
1. Check SharePoint permissions
2. Verify Azure Function is running
3. Wait 5-10 seconds for permissions to propagate

### Type Errors

**Issue**: Import errors for spfx-toolkit
**Solution**: spfx-toolkit is linked locally via `npm link` - verify symlink exists in node_modules/

---

## Performance Considerations

### Optimizations Implemented
- Change detection (only send modified fields)
- Parallel CAML queries
- Progress tracking for uploads
- Error isolation (document errors don't fail request save)
- Atomic operations (documents upload after request save)

### Known Limitations
- Sequential approval file loading (optimization opportunity)
- Always reloads after save (could be conditional)
- Hardcoded 1.5s delay for rename operations

See [Sequences Documentation](./docs/technical-notes/sequences.md) for detailed performance analysis.

---

## Security

### Authentication
- Uses SPFx context authentication
- No additional login required
- Supports MFA and conditional access

### Authorization
- Item-level permissions via Azure Functions
- Role-based access control
- Permission inheritance broken on status change

### Data Protection
- All data stored in SharePoint Online
- Encrypted at rest and in transit
- Audit logging via SharePoint versioning

---

## Support & Contributing

### Getting Help
1. Check [CLAUDE.md](./CLAUDE.md) for quick developer reference
2. Review [Documentation Hub](./docs/README.md)
3. See [Sequences](./docs/technical-notes/sequences.md) for data flow
4. Contact development team

### Contributing
1. Follow coding standards in [CLAUDE.md](./CLAUDE.md)
2. Use TypeScript strict mode
3. Add JSDoc comments for public APIs
4. Update documentation for new features
5. Test thoroughly before submitting

---

## Version History

| Version | Date | Comments |
|---------|------|----------|
| 0.0.1 | 2025-02 | Initial development |

---

## License

**THIS CODE IS PROVIDED _AS IS_ WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING ANY IMPLIED WARRANTIES OF FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABILITY, OR NON-INFRINGEMENT.**

---

## References

### Microsoft Documentation
- [SharePoint Framework 1.21.1](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/sharepoint-framework-overview)
- [Fluent UI v8](https://developer.microsoft.com/en-us/fluentui#/controls/web)
- [PnPjs v3](https://pnp.github.io/pnpjs/)

### Community Resources
- [SharePoint PnP](https://pnp.github.io/)
- [SPFx Samples](https://github.com/pnp/sp-dev-fx-webparts)
- [M365 Patterns & Practices](https://aka.ms/m365pnp)

---

**Project Maintained By**: Legal Workflow Development Team
**Last Updated**: February 2025
