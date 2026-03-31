# Power Automate Integration for Azure Functions

This document defines the recommended Power Automate design for integrating the SharePoint `Requests` list with the Azure Functions project in [`docs/functions`](/Users/hemantmane/Development/legal-workflow/docs/functions).

## Important Notes

- `InitializePermissions` should be called only once, from the create flow.
- Do not also call `initializePermissions()` from SPFx submit logic if Flow owns initialization.
- `CompletePermissions` should run only when `Status` transitions to `Completed` or `Cancelled`.
- `SendNotification` can be called on relevant updates and will decide whether an email should actually be sent.
- On create, checking whether `ID` is `0` is unnecessary. A created SharePoint item already has a valid ID.

## Recommended Flows

Use two Power Automate flows:

1. `Requests - On Create - Initialize Permissions`
2. `Requests - On Modify - Notifications + Complete Permissions`

## Function Reference

This section is the quick reference for developers implementing the flows.

### Flow-Called Functions

| Function | Method | Route | Required Parameters | Optional Parameters | Notes |
|----------|--------|-------|---------------------|---------------------|-------|
| `InitializePermissions` | `POST` | `/api/permissions/initialize` | `requestId` | `requestTitle` | For Flow, send `requestId` only. The documents folder is resolved by item ID, for example `RequestDocuments/123`. |
| `SendNotification` | `POST` | `/api/notifications/send` | `requestId` | `previousVersion` | Usually send `requestId` only. `previousVersion` is only needed if you want to force comparison against a specific SharePoint version label. |
| `CompletePermissions` | `POST` | `/api/permissions/complete` | `requestId` | `requestTitle` | For Flow, send `requestId` only. Call only when `Status` transitions to `Completed` or `Cancelled`. |

### SPFx-Called Functions

These are not part of the Power Automate flows, but are included here for completeness.

| Function | Method | Route | Required Parameters | Optional Parameters | Notes |
|----------|--------|-------|---------------------|---------------------|-------|
| `AddUserPermission` | `POST` | `/api/permissions/add-user` | `requestId`, `userLoginName` | `userEmail`, `requestTitle` | Called from SPFx Manage Access. |
| `RemoveUserPermission` | `POST` | `/api/permissions/remove-user` | `requestId`, `userLoginName` | `userEmail`, `requestTitle` | Called from SPFx Manage Access. |

### Health and Operations

| Function | Method | Route | Parameters | Notes |
|----------|--------|-------|------------|-------|
| `FunctionsHealth` | `GET` | `/api/health` | none | Generic public health endpoint. |
| `NotificationHealth` | `GET` | `/api/notifications/health` | none | Legacy health endpoint kept for compatibility. |
| `FlushCertificateCache` | `POST` | `/api/admin/certificate-cache/flush` | none | Requires bearer token and configured service account. Refreshes only the instance that serves the request. |

### Minimum Flow Payloads

Use these exact request bodies unless you have a specific reason to send more.

`InitializePermissions`

```json
{
  "requestId": @{triggerOutputs()?['body/ID']}
}
```

`SendNotification`

```json
{
  "requestId": @{triggerOutputs()?['body/ID']}
}
```

`CompletePermissions`

```json
{
  "requestId": @{triggerOutputs()?['body/ID']}
}
```

---

## Flow 1: On Create - Initialize Permissions

### Trigger

- SharePoint: `When an item is created`

### Why

This flow breaks inheritance and sets the initial permissions on:

- the request list item
- the corresponding documents folder

### Suggested Steps

1. Trigger: `When an item is created`
2. Optional: `Get item`
3. Optional condition:
   - only continue when `Title` is not empty
4. HTTP call to APIM / Azure Function
5. Check function response
6. Log success or failure

### Condition

Use this only if `Title` might not be ready immediately:

```text
@not(empty(triggerOutputs()?['body/Title']))
```

If `Title` is sometimes populated after create, use one of these:

- `Get item` after trigger, then use `Title` from `Get item`
- a short `Delay` and then `Get item`
- `Do until` `Title` is not empty

### Function Endpoint

- `POST /api/permissions/initialize`

### Request Body

```json
{
  "requestId": @{triggerOutputs()?['body/ID']}
}
```

Note:

- the permission service resolves the documents folder by SharePoint item ID, for example `RequestDocuments/123`
- `requestTitle` is not required for the Power Automate permission calls

### Expected Success Response

HTTP `200`

```json
{
  "success": true,
  "message": "Permissions initialized successfully",
  "changes": [
    {
      "target": "Requests list item 123",
      "action": "BreakInheritance",
      "principal": "",
      "level": null
    }
  ],
  "error": null
}
```

### Expected Failure Response

HTTP `500`

```json
{
  "success": false,
  "message": "Permission initialization failed",
  "changes": [],
  "error": "Internal server error"
}
```

### Flow Response Handling

Condition:

```text
@equals(body('HTTP_InitializePermissions')?['success'], true)
```

If `true`:

- optionally write success to a log, Compose, or tracking list

If `false`:

- terminate the flow as failed
- or create an admin alert

Recommended terminate message:

```text
InitializePermissions failed for Request ID @{triggerOutputs()?['body/ID']}. Message: @{body('HTTP_InitializePermissions')?['message']}
```

---

## Flow 2: On Modify - Notifications + Complete Permissions

### Trigger

- SharePoint: `When an item or a file is modified`

### Why

This flow handles:

- notification generation
- final permission reduction on terminal states

### Required Step After Trigger

Add:

- `Get changes for an item or a file (properties only)`

Use:

- `Id`: `ID` from trigger
- `Since`: `Trigger Window Start Token`
- `Until`: `Trigger Window End Token`

This lets the flow run only when notification-relevant fields or terminal status actually changed.

---

## Branch A: Send Notification

### Condition

Call the notification function only when one or more notification-relevant fields changed.

Use this condition:

```text
@or(
  body('Get_changes_for_an_item_or_a_file_(properties_only)')?['HasColumnChanged:Status'],
  body('Get_changes_for_an_item_or_a_file_(properties_only)')?['HasColumnChanged:LegalReviewStatus'],
  body('Get_changes_for_an_item_or_a_file_(properties_only)')?['HasColumnChanged:LegalReviewOutcome'],
  body('Get_changes_for_an_item_or_a_file_(properties_only)')?['HasColumnChanged:ComplianceReviewStatus'],
  body('Get_changes_for_an_item_or_a_file_(properties_only)')?['HasColumnChanged:ComplianceReviewOutcome'],
  body('Get_changes_for_an_item_or_a_file_(properties_only)')?['HasColumnChanged:Attorney'],
  body('Get_changes_for_an_item_or_a_file_(properties_only)')?['HasColumnChanged:ReviewAudience'],
  body('Get_changes_for_an_item_or_a_file_(properties_only)')?['HasColumnChanged:IsRushRequest']
)
```

Note:

- the exact `HasColumnChanged:...` token names in Power Automate can vary slightly by connector rendering
- if the designer exposes them as dynamic fields, use those directly instead of typing the expression manually
- hold and resume are detected from the `Status` transition to/from `On Hold`; there is no separate persisted `IsOnHold` column in the current Requests schema

### Function Endpoint

- `POST /api/notifications/send`

### Request Body

```json
{
  "requestId": @{triggerOutputs()?['body/ID']}
}
```

Optional body if you later want to pass a known version:

```json
{
  "requestId": @{triggerOutputs()?['body/ID']},
  "previousVersion": "3.0"
}
```

Why `previousVersion` exists:

- it is optional
- if omitted, the function loads the previous SharePoint version automatically
- if supplied, it pins the comparison to a specific version label, which helps avoid comparing against the wrong prior version during rapid consecutive updates

### Expected Response When No Email Should Be Sent

HTTP `200`

```json
{
  "shouldSendNotification": false,
  "email": null,
  "reason": "No relevant changes detected"
}
```

You may also get responses like:

```json
{
  "shouldSendNotification": false,
  "email": null,
  "reason": "Notification 'RequestCompleted' has no resolved recipients"
}
```

### Expected Response When Email Should Be Sent

HTTP `200`

```json
{
  "shouldSendNotification": true,
  "email": {
    "notificationId": "RequestCompleted",
    "subject": "Request LRQ-2024-001234 completed",
    "body": "<p>Your request has been completed.</p>",
    "to": [
      "user1@company.com",
      "user2@company.com"
    ],
    "cc": [
      "manager@company.com"
    ],
    "bcc": [],
    "importance": "Normal",
    "requestId": 123,
    "requestTitle": "LRQ-2024-001234",
    "category": "System",
    "trigger": "StatusChange"
  },
  "reason": "Request workflow completed"
}
```

### Expected Error Response

HTTP `500`

```json
{
  "shouldSendNotification": false,
  "reason": "Internal server error"
}
```

### Notification Response Handling

Use a condition like this:

```text
@and(
  equals(body('HTTP_SendNotification')?['shouldSendNotification'], true),
  not(empty(body('HTTP_SendNotification')?['email']))
)
```

If `false`:

- do not send an email
- optionally log `reason`

Example log expression:

```text
@body('HTTP_SendNotification')?['reason']
```

### Extract Email Properties

If the condition is `true`, extract these values from the response.

`Notification ID`

```text
@body('HTTP_SendNotification')?['email']?['notificationId']
```

`Subject`

```text
@body('HTTP_SendNotification')?['email']?['subject']
```

`HTML Body`

```text
@body('HTTP_SendNotification')?['email']?['body']
```

`Importance`

```text
@body('HTTP_SendNotification')?['email']?['importance']
```

`To` array

```text
@body('HTTP_SendNotification')?['email']?['to']
```

`Cc` array

```text
@body('HTTP_SendNotification')?['email']?['cc']
```

`Bcc` array

```text
@body('HTTP_SendNotification')?['email']?['bcc']
```

### Convert Recipient Arrays for Outlook

The Outlook connector usually wants a semicolon-delimited string.

`To`

```text
@join(body('HTTP_SendNotification')?['email']?['to'], ';')
```

`Cc`

```text
@join(body('HTTP_SendNotification')?['email']?['cc'], ';')
```

`Bcc`

```text
@join(body('HTTP_SendNotification')?['email']?['bcc'], ';')
```

### Send Outlook Email

Use:

- `Office 365 Outlook - Send an email (V2)`

Map values as follows:

- `To`: `@join(body('HTTP_SendNotification')?['email']?['to'], ';')`
- `Cc`: `@join(body('HTTP_SendNotification')?['email']?['cc'], ';')`
- `Bcc`: `@join(body('HTTP_SendNotification')?['email']?['bcc'], ';')`
- `Subject`: `@body('HTTP_SendNotification')?['email']?['subject']`
- `Body`: `@body('HTTP_SendNotification')?['email']?['body']`
- `Importance`: `@body('HTTP_SendNotification')?['email']?['importance']`
- `Is HTML`: `Yes`

Recommended extra safeguard before sending:

```text
@greater(length(body('HTTP_SendNotification')?['email']?['to']), 0)
```

This is defensive only. The function already suppresses notifications with no recipients.

---

## Branch B: Complete Permissions

### Condition

Only call `CompletePermissions` when `Status` changed and the new value is terminal.

Use:

```text
@and(
  body('Get_changes_for_an_item_or_a_file_(properties_only)')?['HasColumnChanged:Status'],
  or(
    equals(triggerOutputs()?['body/Status']?['Value'], 'Completed'),
    equals(triggerOutputs()?['body/Status']?['Value'], 'Cancelled')
  )
)
```

If your SharePoint connector returns `Status` as plain text instead of an object, use:

```text
@and(
  body('Get_changes_for_an_item_or_a_file_(properties_only)')?['HasColumnChanged:Status'],
  or(
    equals(triggerOutputs()?['body/Status'], 'Completed'),
    equals(triggerOutputs()?['body/Status'], 'Cancelled')
  )
)
```

### Function Endpoint

- `POST /api/permissions/complete`

### Request Body

```json
{
  "requestId": @{triggerOutputs()?['body/ID']}
}
```

### Expected Success Response

HTTP `200`

```json
{
  "success": true,
  "message": "Permissions updated successfully",
  "changes": [
    {
      "target": "Requests list item 123",
      "action": "UpdatePermission",
      "principal": "LW - Legal Admins",
      "level": "Read"
    }
  ],
  "error": null
}
```

### Expected Failure Response

HTTP `500`

```json
{
  "success": false,
  "message": "Permission completion failed",
  "changes": [],
  "error": "Internal server error"
}
```

### Complete Permissions Response Handling

Condition:

```text
@equals(body('HTTP_CompletePermissions')?['success'], true)
```

If `false`:

- terminate the flow as failed
- or notify admin/support

---

## Recommended Overall Flow Shape

### Flow 1

- Trigger: `When an item is created`
- Optional `Get item`
- Optional `Condition: Title not empty`
- `HTTP_InitializePermissions`
- `Condition: success == true`

### Flow 2

- Trigger: `When an item or a file is modified`
- `Get changes for an item or a file (properties only)`
- `Condition: notification-relevant fields changed`
- `HTTP_SendNotification`
- `Condition: shouldSendNotification == true and email != null`
- `Send an email (V2)`
- `Condition: status changed to Completed or Cancelled`
- `HTTP_CompletePermissions`

---

## Recommended APIM / HTTP Setup

For each HTTP action:

- Method: `POST`
- URI: APIM endpoint
- Headers:
  - `Content-Type: application/json`
- Authentication:
  - whatever mechanism your APIM policy requires for the Power Automate service account

If APIM uses bearer token auth, use the connection/account that represents the configured service account expected by the Functions authorization layer.

---

## SPFx Coordination Note

If Power Automate owns initial permission setup, remove or disable the SPFx-side initialization call in:

- [`src/services/workflow/statusTransitionActions.ts`](/Users/hemantmane/Development/legal-workflow/src/services/workflow/statusTransitionActions.ts#L116)

Otherwise both SPFx and Flow will call `InitializePermissions`, which is not safe.

---

## Summary

- Call `InitializePermissions` only from the create flow.
- Call `SendNotification` only on relevant updates.
- Send Outlook email only when:
  - `shouldSendNotification = true`
  - `email` is not null
- Call `CompletePermissions` only when `Status` changes to `Completed` or `Cancelled`.
- Do not use an `ID > 0` create condition. It is unnecessary.
