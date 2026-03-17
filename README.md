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
- **Requests** list (79 fields including time tracking)
- **SubmissionItems** list (submission types with turnaround times)
- **RequestDocuments** library (with metadata)

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

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

---

## Project Structure

```
legal-workflow/
├── .azure-pipelines/        # Azure DevOps CI/CD pipelines
│   ├── azure-pipelines.yml  # Main pipeline (build, test, deploy)
│   └── templates/           # Reusable pipeline templates
│       └── deploy-spfx.yml  # SPFx deployment with PnP PowerShell
├── Deployments/             # Version-specific deployment scripts
│   └── 0.0.1/               # Scripts for version 0.0.1
│       ├── pre.deploy.ps1   # Runs before deployment
│       └── post.deploy.ps1  # Runs after deployment
├── docs/                    # Documentation (requirements, design, guides)
├── provisioning/            # SharePoint provisioning schemas
│   └── Lists/               # PnP list instance XML definitions
│       ├── Requests.xml     # Main requests list (79 fields, 19 views)
│       ├── SubmissionItems.xml
│       └── RequestDocuments.xml
├── scripts/                 # PowerShell setup/deployment scripts
│   ├── sharepoint/          # SharePoint list management
│   └── dev/                 # Development utilities
├── src/                     # Source code
│   ├── components/          # Shared React components
│   ├── contexts/            # React Context providers
│   ├── extensions/          # SPFx extensions
│   │   ├── legalWorkflow/   # Form Customizer (main form)
│   │   ├── requestId/       # Field Customizer (Request ID with hover card)
│   │   ├── requestStatus/   # Field Customizer (Status progress bar)
│   │   └── turnAroundDate/  # Field Customizer (Target date with rush indicator)
│   ├── hooks/               # Custom React hooks
│   ├── schemas/             # Zod validation schemas
│   ├── services/            # Business logic layer
│   ├── sp/                  # SharePoint constants (field names, list names)
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
5. **Closeout** - Submitter enters tracking info, acknowledges comments
6. **Awaiting FINRA Documents** - Pending FINRA letter upload (if required)
7. **Completed** - Request finalized

**Special Statuses**: Cancelled, On Hold

### User Roles
- **LW - Submitters**: Create and view requests
- **LW - Legal Admins**: Triage and assign
- **LW - Attorney Assigners**: Committee members
- **LW - Attorneys**: Review assigned requests
- **LW - Compliance Reviewers**: Compliance reviews
- **LW - Admins**: Full system administration

### Dashboard Views (19 total)

Views are organized by user role with appropriate fields and sorting:

| Category | Views |
|----------|-------|
| **Home** | My Open Requests, My Completed Requests, My Awaiting FINRA Documents |
| **Admin** | All Open Requests, All Completed Requests, All Requests |
| **Legal Admin** | Legal Intake Queue, Pending Attorney Assignment, All In Review |
| **Attorney** | My Assigned Requests, Pending My Review, My Completed Reviews |
| **Attorney Assigner** | Awaiting Attorney Assignment |
| **Compliance** | Pending Compliance Review, Completed Compliance Reviews |
| **Closeout** | Closeout Queue |
| **FINRA** | Awaiting FINRA Documents |
| **Special** | On Hold Requests, Rush Requests |

**Note**: Rush requests are visually indicated with a red left border (row formatter) instead of a separate column.

### Field Customizers

Custom column renderers for enhanced list view experience:

| Extension | Column | Description |
|-----------|--------|-------------|
| **Request ID** | Title | Clickable link with hover card showing request details, "NEW" badge for items < 48 hours old |
| **Request Status** | Status | Progress bar with color-coded fill based on workflow stage |
| **Turnaround Date** | TargetReturnDate | Date display with rush indicator, shows expected turnaround from SubmissionItems |

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
| `ApimBaseUrl` | string | - | APIM base URL for Azure Function calls |
| `ApimApiClientId` | string | - | Azure AD App Registration Client ID for APIM API |
| `maxFileSizeMB` | number | 250 | Max file upload size |
| `allowedFileExtensions` | string | .pdf,.doc,... | Comma-separated allowed file extensions |
| `WorkingHoursStart` | number | 8 | Business day start hour (0-23) |
| `WorkingHoursEnd` | number | 17 | Business day end hour (0-23) |
| `WorkingDays` | string | 1,2,3,4,5 | Working days (1=Mon through 5=Fri) |
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

## CI/CD Pipeline (Azure DevOps)

The project includes Azure Pipelines for automated build, test, and deployment.

### Pipeline Location
- **SPFx Solution**: `.azure-pipelines/azure-pipelines.yml`
- **Deploy Template**: `.azure-pipelines/templates/deploy-spfx.yml`
- **Azure Functions**: `docs/functions/.azure-pipelines/azure-pipelines.yml`

### SPFx Pipeline Stages

| Stage | Trigger | Actions |
|-------|---------|---------|
| **Build & Test** | All branches, PRs | Type check, unit tests, build, package |
| **Deploy Dev** | `develop` branch | Deploy to Dev App Catalog |
| **Deploy Prod** | `main` branch | Deploy to Prod App Catalog |

### Pipeline Features
- **npm caching** for faster builds
- **TypeScript type checking** as quality gate
- **Jest unit tests** with JUnit reporting
- **Code coverage** with Cobertura reports
- **Automatic .sppkg packaging** for releases
- **PnP PowerShell deployment** with certificate authentication
- **Pre/post deployment scripts** for custom deployment logic

### Prerequisites for Deployment

1. **Variable Groups** in Azure DevOps:
   - `LegalWorkflow-SPFx-Dev` (development)
   - `LegalWorkflow-SPFx-Prod` (production)

2. **Required Variables**:
   | Variable | Description |
   |----------|-------------|
   | `spoTenant` | SharePoint tenant (e.g., `contoso.onmicrosoft.com`) |
   | `spoAppId` | Azure AD App Registration Client ID |
   | `spoAppCatalogUrl` | App Catalog URL |
   | `spoCertificateName` | Name of certificate in ADO Secure Files |
   | `spoCertificatePassword` | Certificate password (if applicable) |

3. **Azure AD App Registration** with:
   - `Sites.FullControl.All` application permission
   - Certificate authentication

4. **Secure Files** in ADO Library:
   - Upload the .pfx certificate file

### Deployment Scripts

The pipeline supports pre/post deployment scripts located in `Deployments/{version}/`:

```
Deployments/
└── 0.0.1/
    ├── pre.deploy.ps1   # Runs before deployment
    └── post.deploy.ps1  # Runs after deployment
```

Scripts receive parameters: `-Environment`, `-Tenant`, `-SiteUrl`, `-Version`

Use cases:
- **pre.deploy.ps1**: Backup config, validate prerequisites, provision lists
- **post.deploy.ps1**: Apply PnP templates, send notifications, validate deployment

### Manual Deployment

If not using automated deployment:
```bash
# Build and package
npm run release

# Output: sharepoint/solution/legal-workflow.sppkg
# Upload manually to SharePoint App Catalog
```

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
