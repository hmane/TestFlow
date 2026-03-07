# GitHub Copilot Instructions for LegalWorkflow Azure Functions

These instructions apply to the Azure Functions project under `docs/functions`.

## Scope

- This project uses .NET 8 Azure Functions isolated worker.
- SharePoint access uses `PnP.Core` and `PnP.Core.Auth`.
- API calls are expected to come through APIM with bearer-token authentication.
- Authorization is based on:
  - configured service account bypass, or
  - effective SharePoint item edit permission

## Authentication and Authorization

- Do not suggest function-key auth for:
  - `/api/permissions/initialize`
  - `/api/permissions/add-user`
  - `/api/permissions/remove-user`
  - `/api/permissions/complete`
  - `/api/notifications/send`
- Prefer the current bearer-token validation flow in `AuthorizationHelper`.
- For user authorization, follow the existing `SharePointAuthorizationService` pattern instead of inventing new group-resolution logic.

## Health and Operations

- Prefer `GET /api/health` as the generic public health endpoint.
- `GET /api/notifications/health` exists for backward compatibility.
- `POST /api/admin/certificate-cache/flush` refreshes certificate state only on the instance serving that request.
- If guidance requires deterministic refresh across all instances, recommend restarting the Function App.

## Certificate Handling

- The app uses a reloadable certificate provider backed by Azure Key Vault.
- Do not suggest loading the certificate on every request.
- Prefer startup-time or singleton-based provider patterns.
- When discussing certificate rotation, distinguish between:
  - targeted instance refresh via the flush endpoint
  - whole-app refresh via Function App restart

## PnP Core Guidance

- Prefer actual `PnP.Core` public APIs over older CSOM or PnP Framework assumptions.
- Folder/item permissions should use securable objects correctly; for folders, follow the backing list item approach already used in the codebase.
- When querying with PnP Core, preserve the existing `PnP.Core.QueryModel` patterns already used in services.

## Notification Service Guidance

- `SendNotification` returns a response object with:
  - `shouldSendNotification`
  - `email`
  - `reason`
- Do not assume every call results in an email.
- When generating integration guidance, require checks for:
  - `shouldSendNotification == true`
  - `email != null`
- For Power Automate or Outlook guidance, join `to`, `cc`, and `bcc` arrays with `;`.

## Permission Flow Guidance

- `InitializePermissions` should be treated as a one-time create flow operation.
- `CompletePermissions` should be treated as a terminal-state operation when `Status` transitions to `Completed` or `Cancelled`.
- `AddUserPermission` and `RemoveUserPermission` are intended for direct manage-access operations, not status transitions.

## Editing Guidance

- Preserve sanitized error responses. Do not reintroduce raw backend exception messages into API responses.
- Prefer concise operational logging with enough context for request ID, user, and action.
- Before changing API contracts, check the Power Automate integration document:
  - `docs/technical-notes/power-automate-functions-integration.md`
