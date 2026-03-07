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
│   ├── NotificationFunctions.cs  # Notification processing endpoint
│   └── ManagementFunctions.cs    # Health and operational endpoints
├── Services/                     # Business logic services
│   ├── RequestService.cs         # SharePoint data access
│   ├── PermissionService.cs      # Permission management logic
│   ├── NotificationService.cs    # Notification generation logic
│   ├── SharePointAuthorizationService.cs  # SharePoint authorization checks
│   └── ReloadableX509AuthenticationProvider.cs # Reloadable Key Vault certificate auth
├── Models/                       # Data models
│   ├── Enums.cs                  # Enumeration types
│   ├── RequestModel.cs           # Request data model
│   ├── EmailResponse.cs          # Notification response models
│   └── PermissionModels.cs       # Permission request/response models
├── Helpers/                      # Utility classes
│   ├── Logger.cs                 # Centralized logging utility
│   └── AuthorizationHelper.cs    # JWT token validation
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
| `/api/permissions/initialize` | POST | Break inheritance and set initial permissions | Power Automate / Operations |
| `/api/permissions/add-user` | POST | Add Read permission for a user | SPFx App |
| `/api/permissions/remove-user` | POST | Remove a user's permissions | SPFx App |
| `/api/permissions/complete` | POST | Set final permissions (Read for all except Admin) | Power Automate |

### Notification Functions

| Endpoint | Method | Description | Caller |
|----------|--------|-------------|--------|
| `/api/notifications/send` | POST | Process notification request | Power Automate |
| `/api/notifications/health` | GET | Health check endpoint | Monitoring |
| `/api/health` | GET | Application health check endpoint | Monitoring |
| `/api/admin/certificate-cache/flush` | POST | Reload certificate from Key Vault without restart | Operations |

Note:

- `/api/health` is the generic public Functions health endpoint
- `/api/notifications/health` is kept for backward compatibility
- There is not a separate `/api/permissions/health` endpoint at this time

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
6. **Authorization Check**: Function authorizes either:
   - the configured service account, or
   - a caller who has effective edit permission on the request item in SharePoint
7. **Operation Execution**: Function performs the requested SharePoint operation

### Authorization Rules

| Endpoint | Required Groups | Additional Rules |
|----------|-----------------|------------------|
| `initialize` | Configured service account or authorized user with effective item edit permission | Bearer token required |
| `add-user` | Configured service account or authorized user with effective item edit permission | Bearer token required |
| `remove-user` | Configured service account or authorized user with effective item edit permission | Bearer token required |
| `complete` | Configured service account or authorized user with effective item edit permission | Bearer token required |
| `notifications/send` | Configured service account or authorized user with effective item edit permission | Bearer token required |
| `admin/certificate-cache/flush` | Configured service account only | Bearer token required |

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
  "AzureAd:Audience": "api://<client-id>",
  "AzureAd:KeyVaultUrl": "https://<your-keyvault>.vault.azure.net/",
  "AzureAd:CertificateName": "<certificate-name>",

  "SharePoint:SiteUrl": "https://<tenant>.sharepoint.com/sites/LegalWorkflow",
  "SharePoint:RequestsListName": "Requests",

  "Notifications:EnableDebugLogging": "false",

  "Permissions:SubmittersGroup": "LW - Submitters",
  "Permissions:LegalAdminGroup": "LW - Legal Admin",
  "Permissions:AttorneyAssignerGroup": "LW - Attorney Assigner",
  "Permissions:AttorneysGroup": "LW - Attorneys",
  "Permissions:ComplianceGroup": "LW - Compliance Users",
  "Permissions:AdminGroup": "LW - Admin",
  "Permissions:ServiceAccountUpn": "svc-powerautomate@company.com"
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

## Certificate Rotation

The Functions app loads the SharePoint authentication certificate from Azure Key Vault during application startup in [`Program.cs`](/Users/hemantmane/Development/legal-workflow/docs/functions/Program.cs).

Operational impact:

- the certificate is not downloaded on every request
- the loaded certificate stays in memory for the lifetime of that Functions host instance
- replacing the certificate in Key Vault does not force an already-running instance to reload it

Recommended rotation procedure:

1. Upload the new certificate version to Azure Key Vault using the same certificate name.
2. Keep the old certificate valid during the overlap window.
3. Option A: call `POST /api/admin/certificate-cache/flush` as the configured service account to reload the in-memory certificate on the worker instance that handles that request.
4. Option B: restart the Azure Function App so all running instances reload the certificate from Key Vault.
5. Verify the health endpoint and one authenticated SharePoint operation.
6. Retire the old certificate after verification.

Flush endpoint notes:

- route: `/api/admin/certificate-cache/flush`
- method: `POST`
- authentication: bearer token required
- authorization: only the configured service account is allowed
- scope: refreshes only the in-memory certificate for the instance that serves the request

Sample success response:

```json
{
  "success": true,
  "message": "Certificate cache flushed successfully.",
  "refreshedAtUtc": "2026-03-06T21:15:00Z",
  "previousCertificate": {
    "subject": "CN=LegalWorkflow",
    "thumbprintSuffix": "12AB34CD",
    "loadedAtUtc": "2026-03-06T19:00:00Z",
    "expiresOnUtc": "2027-03-01T00:00:00Z"
  },
  "currentCertificate": {
    "subject": "CN=LegalWorkflow",
    "thumbprintSuffix": "98EF76GH",
    "loadedAtUtc": "2026-03-06T21:15:00Z",
    "expiresOnUtc": "2028-03-01T00:00:00Z"
  }
}
```

Important:

- do not rely on background recycle timing after certificate replacement
- the flush endpoint is useful for targeted operational recovery, but it is not a whole-app refresh in a scaled-out environment
- a deliberate Function App restart is still the most deterministic whole-app reset

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

Documents folder note:

- the documents folder is resolved by SharePoint item ID
- example: `RequestDocuments/123`
- it is not resolved by request title or business request ID

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
