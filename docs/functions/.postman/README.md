# Legal Workflow — Postman Collection

## Files

| File | Description |
|------|-------------|
| `LegalWorkflow-Functions.postman_collection.json` | Main collection — all endpoints |
| `env.debug.postman_environment.json` | localhost:7071 |
| `env.dev.postman_environment.json` | Dev APIM |
| `env.uat.postman_environment.json` | UAT APIM |
| `env.prod.postman_environment.json` | Prod APIM |

## Import into Postman

1. Open Postman → **Import**
2. Drag in `LegalWorkflow-Functions.postman_collection.json`
3. Drag in all four `env.*.postman_environment.json` files
4. Select an environment from the top-right dropdown

## First-Time Setup (per environment)

Fill in these values in the environment editor:

| Variable | Description |
|----------|-------------|
| `baseUrl` | APIM hostname or `http://localhost:7071` for Debug |
| `tenantId` | Azure AD Tenant ID (GUID) |
| `clientId` | App Registration Client ID (GUID) |
| `clientSecret` | Client secret — mark as **Secret** type, never commit |
| `scope` | Delegated scope exposed by your app registration, e.g. `api://<clientId>/access_as_user`. Must be a delegated scope — `.default` alone produces an app-only token that lacks `email`/`upn` claims and will 401. |

## Authentication

The collection uses **OAuth2 Authorization Code + PKCE** (delegated user token).

The function requires `email`/`upn` claims to identify the caller for SharePoint permission checks. These claims only appear in user-delegated tokens — app-only `client_credentials` tokens are missing them and always receive 401.

**One-time app registration step:** add `https://oauth.pstmn.io/v1/callback` as a redirect URI (Web platform) on the Azure AD app registration.

**To get a token:** open the collection → Authorization tab → click **Get New Access Token** → sign in. Postman stores and refreshes the token automatically.

## Test Variables

| Variable | Description |
|----------|-------------|
| `requestId` | SharePoint list item ID (numeric) |
| `requestTitle` | Request ID string, e.g. `CRR-26-1` — logging only |
| `previousVersion` | SP item version label before the status change, e.g. `2.0`. Use `null` (unquoted) to let the function auto-select the previous version |

## Endpoints

### Health (anonymous)
- `GET /api/health`
- `GET /api/notifications/health`

### Permissions (delegated token)
- `POST /api/permissions/initialize` — break inheritance, set initial roles
- `POST /api/permissions/add-user` — grant Read to a specific user
- `POST /api/permissions/remove-user` — revoke a specific user's access
- `POST /api/permissions/complete` — lock down to read-only on completion

### Notifications (delegated token)
- `POST /api/notifications/send` — determine and generate notification email

### Management (service account only)
- `POST /api/management/certificate-cache/flush` — reload SP auth cert from Key Vault
