# Azure API Management (APIM) Configuration

This folder contains APIM policy configurations for the Legal Workflow Azure Functions.

## Overview

The Azure Functions are exposed through Azure API Management, which provides:
- **Authentication**: JWT token validation using Azure AD
- **Authorization**: Token forwarding to backend for SharePoint group checks
- **CORS**: Cross-origin support for SPFx applications
- **Rate Limiting**: Protection against excessive requests
- **Error Handling**: Standardized error responses

## Authentication Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   SPFx App      │────>│      APIM       │────>│ Azure Function  │────>│   SharePoint    │
│ (User Browser)  │     │ (Token Valid?)  │     │ (Group Check)   │     │ (Operations)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │                       │
        │  1. Get Token         │                       │                       │
        │  from Azure AD        │                       │                       │
        │<──────────────────────│                       │                       │
        │                       │                       │                       │
        │  2. Call API with     │                       │                       │
        │  Bearer Token         │                       │                       │
        │──────────────────────>│                       │                       │
        │                       │  3. Validate Token    │                       │
        │                       │  (JWT claims, expiry) │                       │
        │                       │──────────────────────>│                       │
        │                       │                       │  4. Extract User      │
        │                       │                       │  from Token           │
        │                       │                       │                       │
        │                       │                       │  5. Check SharePoint  │
        │                       │                       │  Group Membership     │
        │                       │                       │──────────────────────>│
        │                       │                       │                       │
        │                       │                       │  6. Check Request     │
        │                       │                       │  Ownership            │
        │                       │                       │──────────────────────>│
        │                       │                       │                       │
        │                       │  7. Perform Action    │                       │
        │                       │<──────────────────────│<──────────────────────│
        │  8. Response          │                       │                       │
        │<──────────────────────│                       │                       │
```

## Files

### api-policy.xml

The main APIM policy that applies to all API operations. It handles:

1. **CORS Configuration**
   - Allows requests from SharePoint Online (`*.sharepoint.com`)
   - Allows localhost for development
   - Supports credentials for authenticated requests

2. **JWT Token Validation**
   - Validates tokens against Azure AD OpenID Connect configuration
   - Checks issuer, audience, and signature
   - Requires bearer scheme and valid expiration

3. **Token Forwarding**
   - Forwards the validated token to backend Azure Functions
   - Functions use the token to extract user identity

4. **Rate Limiting**
   - 100 requests per 60 seconds per user
   - Keyed by JWT subject claim

5. **Error Handling**
   - Custom JSON error responses for 401, 403, 429 errors

## Setup Instructions

### 1. Create APIM Named Values

In your APIM instance, create these named values:

| Name | Value | Description |
|------|-------|-------------|
| `aad-tenant-id` | `<your-tenant-id>` | Azure AD Tenant ID |
| `aad-client-id` | `<your-client-id>` | Azure AD App Registration Client ID |

### 2. Import API

1. Go to Azure Portal > API Management > APIs
2. Add API > Function App
3. Select your Legal Workflow Function App
4. Import all functions

### 3. Apply Policy

1. Go to APIs > Legal Workflow API > All operations
2. In the Inbound processing section, click the policy editor (</>)
3. Replace the default policy with the contents of `api-policy.xml`
4. Save

### 4. Configure Backend

Ensure the backend URL points to your Azure Functions app:
```
https://<your-function-app>.azurewebsites.net
```

## Azure AD App Registration

The APIM policy expects tokens from an Azure AD App Registration configured as follows:

### API Permissions (for the SPFx app)

| API | Permission | Type |
|-----|------------|------|
| Your API | `user_impersonation` | Delegated |

### Expose an API

1. Set Application ID URI: `api://<client-id>`
2. Add scope: `user_impersonation`
3. Add authorized client applications (your SPFx app's client ID)

### Manifest Settings

Ensure these manifest settings:
```json
{
  "accessTokenAcceptedVersion": 2,
  "signInAudience": "AzureADMyOrg"
}
```

## Testing

### Get a Token

```bash
# Using Azure CLI
az account get-access-token --resource api://<client-id>

# Using curl (client credentials - for testing)
curl -X POST https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=<client-id>" \
  -d "client_secret=<client-secret>" \
  -d "scope=api://<client-id>/.default" \
  -d "grant_type=client_credentials"
```

### Call the API

```bash
curl -X POST https://<apim-name>.azure-api.net/api/permissions/initialize \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"requestId": 123, "requestTitle": "LRQ-2024-001234"}'
```

## Troubleshooting

### 401 Unauthorized

- Check that the token is valid and not expired
- Verify the audience claim matches the APIM configuration
- Ensure the issuer is from your Azure AD tenant

### 403 Forbidden

- User is authenticated but not in an authorized SharePoint group
- User is trying to modify a request they don't own
- Check SharePoint group membership

### 429 Too Many Requests

- Rate limit exceeded (100 requests per minute)
- Wait and retry, or contact admin for limit increase

## Security Considerations

1. **Token Validation**: APIM validates tokens before forwarding to backend
2. **Double Validation**: Functions also validate tokens as defense in depth
3. **SharePoint Groups**: Authorization is based on SharePoint groups, not Azure AD groups
4. **Ownership Checks**: Submitters can only modify their own requests
5. **No Subscription Keys**: Authentication is purely token-based
