# Legal Workflow Azure Functions

Azure Functions for the Legal Workflow SPFx application. These functions handle permission management and notification processing.

## Prerequisites

- .NET 8.0 SDK
- Azure Functions Core Tools v4
- Azure subscription (for deployment)
- Azure AD App Registration with SharePoint permissions

## Project Structure

```
LegalWorkflow.Functions/
├── .azure-pipelines/             # CI/CD pipeline definitions
│   ├── azure-pipelines.yml       # Main pipeline
│   └── templates/
│       └── deploy-functions.yml  # Deployment template
├── Functions/                    # Azure Function endpoints
│   ├── PermissionFunctions.cs    # Permission management endpoints
│   └── NotificationFunctions.cs  # Notification processing endpoint
├── Services/                     # Business logic services
│   ├── RequestService.cs         # SharePoint data access
│   ├── PermissionService.cs      # Permission management logic
│   └── NotificationService.cs    # Notification generation logic
├── Models/                       # Data models
│   ├── Enums.cs                  # Enumeration types
│   ├── RequestModel.cs           # Request data model
│   ├── EmailResponse.cs          # Notification response models
│   └── PermissionModels.cs       # Permission request/response models
├── Helpers/                      # Utility classes
│   ├── Logger.cs                 # Centralized logging utility
│   └── AuthorizationHelper.cs    # JWT token validation
├── Services/                     # Business logic services (continued)
│   └── SharePointAuthorizationService.cs  # SharePoint group & ownership checks
├── .apim/                        # Azure API Management configuration
│   ├── api-policy.xml            # APIM policy for token validation
│   └── README.md                 # APIM setup documentation
├── Properties/
│   └── launchSettings.json       # VS launch configuration
├── Program.cs                    # Application entry point
├── host.json                     # Azure Functions host configuration
├── local.settings.json           # Local development settings (not in git)
├── local.settings.json.example   # Template for local settings
└── LegalWorkflow.Functions.csproj # Project file
```

## API Endpoints

### Permission Functions

| Endpoint | Method | Description | Caller |
|----------|--------|-------------|--------|
| `/api/permissions/initialize` | POST | Break inheritance and set initial permissions | SPFx App |
| `/api/permissions/add-user` | POST | Add Read permission for a user | SPFx App |
| `/api/permissions/remove-user` | POST | Remove a user's permissions | SPFx App |
| `/api/permissions/complete` | POST | Set final permissions (Read for all except Admin) | Power Automate |

### Notification Functions

| Endpoint | Method | Description | Caller |
|----------|--------|-------------|--------|
| `/api/notifications/send` | POST | Process notification request | Power Automate |
| `/api/notifications/health` | GET | Health check endpoint | Monitoring |

## Authentication & Authorization

### Authentication Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   SPFx App      │────>│      APIM       │────>│ Azure Function  │────>│   SharePoint    │
│ (User Browser)  │     │ (Token Valid?)  │     │ (Group Check)   │     │ (Operations)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

1. **User Authentication**: User signs in to SPFx app via Azure AD
2. **Token Acquisition**: SPFx app acquires bearer token for API
3. **APIM Validation**: APIM validates JWT token (issuer, audience, expiry)
4. **Token Forwarding**: Valid token is forwarded to Azure Function
5. **User Extraction**: Function extracts user identity from token
6. **SharePoint Group Check**: Function verifies user membership in SharePoint groups
7. **Ownership Check**: For certain actions, verifies user owns the request

### Authorization Rules

| Endpoint | Required Groups | Additional Rules |
|----------|-----------------|------------------|
| `initialize` | Any authorized group | User must be in at least one LW group |
| `add-user` | Admin, Legal Admin, or Submitter | Submitter can only modify their own request |
| `remove-user` | Admin, Legal Admin, or Submitter | Submitter can only modify their own request |
| `complete` | Admin only | Or Power Automate via function key |
| `notifications/send` | Any authorized group | Or Power Automate via function key |

### SharePoint Groups

Authorization is based on SharePoint site group membership (NOT Azure AD groups):

| Group | Role |
|-------|------|
| LW - Admin | Full system administration |
| LW - Submitters | Create and view requests |
| LW - Legal Admin | Triage and assign attorneys |
| LW - Attorney Assigner | Committee members who assign attorneys |
| LW - Attorneys | Review assigned requests |
| LW - Compliance Users | Review compliance requests |

### APIM Setup

See [.apim/README.md](.apim/README.md) for detailed APIM configuration instructions.

## Configuration

### Azure AD App Registration

Required API Permissions:
- `Sites.FullControl.All` (Application)
- `User.Read.All` (Application)

### Environment Variables

```json
{
  "AzureAd:TenantId": "<tenant-id>",
  "AzureAd:ClientId": "<client-id>",
  "AzureAd:ClientSecret": "<client-secret>",

  "SharePoint:SiteUrl": "https://<tenant>.sharepoint.com/sites/LegalWorkflow",
  "SharePoint:RequestsListName": "Requests",

  "Notifications:LegalAdminEmail": "lw-legaladmin@company.com",
  "Notifications:AttorneyAssignerEmail": "lw-attorneyassigner@company.com",
  "Notifications:ComplianceEmail": "lw-compliance@company.com",

  "Permissions:AdminGroup": "LW - Admin"
}
```

## Local Development

1. Copy `local.settings.json.example` to `local.settings.json`
2. Update configuration values with your Azure AD and SharePoint settings
3. Run the functions:

```bash
# Using Azure Functions Core Tools
func start

# Or using .NET CLI
dotnet run
```

## CI/CD Pipeline (Azure DevOps)

The project includes an Azure DevOps pipeline for automated builds and deployments.

### Pipeline Features

- **Automatic triggers**: Builds on push to `main`, `develop`, and `release/*` branches
- **Multi-environment deployment**: Supports Dev, Staging, and Production environments
- **Approval gates**: Production deployments require approval
- **Health checks**: Verifies deployment success via health endpoint

### Pipeline Setup

1. **Create Variable Groups** in Azure DevOps Library:
   - `LegalWorkflow-Dev`
   - `LegalWorkflow-Staging`
   - `LegalWorkflow-Prod`

   Each group should contain:
   ```
   functionAppName: <function-app-name>
   resourceGroupName: <resource-group-name>
   ```

2. **Create Service Connection**:
   - Name: `AzureServiceConnection`
   - Type: Azure Resource Manager
   - Scope: Subscription or Resource Group

3. **Create Environments** in Azure DevOps:
   - `LegalWorkflow-Dev`
   - `LegalWorkflow-Staging`
   - `LegalWorkflow-Production` (with approval check)

4. **Import Pipeline**:
   - Go to Pipelines > New Pipeline
   - Select your repository
   - Choose "Existing Azure Pipelines YAML file"
   - Select `.azure-pipelines/azure-pipelines.yml`

### Deployment Flow

```
develop branch  ──────────► Dev Environment
release/* branch ─────────► Staging ──► Production (with approval)
main branch ──────────────► Production (with approval)
```

## Deployment (Manual)

### Deploy to Azure

```bash
# Build the project
dotnet build --configuration Release

# Publish
dotnet publish --configuration Release --output ./publish

# Create zip file
cd publish && zip -r ../deploy.zip . && cd ..

# Deploy using Azure CLI
az functionapp deployment source config-zip \
  --resource-group <resource-group> \
  --name <function-app-name> \
  --src ./deploy.zip
```

### Azure Resources Required

- Azure Function App (Consumption or Premium plan)
- Application Insights (recommended)
- Azure Key Vault (for secrets management)

## Notification Triggers

Notifications are triggered based on specific field value transitions:

| Notification | Trigger Condition |
|--------------|-------------------|
| RequestSubmitted | Status: Draft → Legal Intake |
| RushRequestAlert | Status: Draft → Legal Intake AND IsRushRequest = true |
| ReadyForAttorneyAssignment | Status → Assign Attorney |
| AttorneyAssigned | Status: (Legal Intake OR Assign Attorney) → In Review (when ReviewAudience = Legal or Both) |
| AttorneyReassigned | Attorney field changes from one user to another |
| ComplianceReviewRequired | Status → In Review AND ReviewAudience = Compliance Only |
| LegalReviewApproved | LegalReviewStatus → Completed AND Outcome = Approved/ApprovedWithComments |
| LegalChangesRequested | LegalReviewStatus → Waiting On Submitter |
| LegalReviewNotApproved | LegalReviewStatus → Completed AND Outcome = Not Approved |
| ComplianceReviewApproved | ComplianceReviewStatus → Completed AND Outcome = Approved/ApprovedWithComments |
| ComplianceChangesRequested | ComplianceReviewStatus → Waiting On Submitter |
| ComplianceReviewNotApproved | ComplianceReviewStatus → Completed AND Outcome = Not Approved |
| ResubmissionReceivedLegal | LegalReviewStatus: Waiting On Submitter → Waiting On Attorney |
| ResubmissionReceivedCompliance | ComplianceReviewStatus: Waiting On Submitter → Waiting On Compliance |
| RequestOnHold | IsOnHold: false → true |
| RequestResumed | IsOnHold: true → false |
| RequestCancelled | Status → Cancelled |
| ReadyForCloseout | Status → Closeout |
| RequestCompleted | Status → Completed |

## Permission Model

### Initial Permissions (Draft/Legal Intake)

| Principal | Request Item | Documents Folder |
|-----------|--------------|------------------|
| LW - Admin | Full Control | Full Control |
| LW - Submitters | Contribute Without Delete | Contribute |
| LW - Legal Admin | Contribute Without Delete | Contribute |
| LW - Attorney Assigner | Contribute Without Delete | Contribute |
| LW - Attorneys | Contribute Without Delete | Contribute |
| LW - Compliance Users | Contribute Without Delete | Contribute |
| Additional Parties | Read | Read |
| Approvers | Read | Read |

### Completed Permissions

| Principal | Permission |
|-----------|------------|
| LW - Admin | Full Control (unchanged) |
| Everyone else | Read |

## Troubleshooting

### Common Issues

1. **PnP Core authentication fails**
   - Verify Azure AD app registration has correct permissions
   - Check that permissions are granted admin consent
   - Ensure client secret/certificate is valid

2. **Health check returns 404**
   - Functions may not have deployed correctly
   - Check Azure portal for function app errors
   - Verify host.json is present in deployment package

3. **Notification not triggering**
   - Check version history is enabled on Requests list
   - Verify status transition matches trigger conditions
   - Enable debug logging to see detailed change detection

### Logs

View logs in Azure Portal:
1. Navigate to Function App
2. Go to Functions > Select function > Monitor
3. Check Application Insights for detailed traces

## License

Internal use only - Dodge & Cox
