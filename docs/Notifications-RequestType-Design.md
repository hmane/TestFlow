# Notifications List — RequestType Field Design

## Problem

The `Notifications` list is currently **request-type agnostic**. Every notification template applies to all request types (Communication, General Review, IMA Review). As Phase 2 adds new request types, some templates will need to differ in:

- **Body content** — different fields are relevant per type (e.g., FINRA fields are Communication-specific)
- **Recipients** — different legal teams may own different request types
- **Subject lines** — while `{{RequestType}}` can inject the name, structural differences need separate templates

Using a single `{{RequestType}}` variable in the body only helps with copy — it cannot vary structure, recipients, or importance.

## Solution: Optional `RequestType` Field with Fallback Cascade

Add an **optional** `RequestType` choice field to the Notifications list. When blank, the template acts as a generic fallback for all request types.

### Lookup Logic in Azure Function

```
1. Find template WHERE TriggerEvent = 'X' AND RequestType = 'Communication'
2. If not found → fall back to WHERE TriggerEvent = 'X' AND RequestType is blank/null
3. If still not found → log warning, no notification sent
```

### Why This Approach

| Concern | How it's addressed |
|---------|-------------------|
| Phase 1 (Communication only) | All existing templates remain generic (blank RequestType) — no new rows needed |
| Phase 2 additions | Only add rows for templates that **actually differ** per type |
| Templates that are type-agnostic | `RequestOnHold`, `AttorneyAssigned`, `RequestCancelled`, etc. stay as a single generic row |
| Templates that likely differ | `RequestSubmitted`, `RushRequestAlert`, `ReadyForCloseout` may need type-specific variants |
| Admin usability | Admins can see which templates are generic vs. type-specific at a glance |

---

## Schema Changes

### 1. Notifications.xml — Add RequestType Field

Add the following field definition inside `<pnp:Fields>`:

```xml
<!-- Request type scope — blank means applies to all request types (generic fallback) -->
<Field Type="Choice"
       DisplayName="Request Type"
       Name="RequestType"
       ID="{F7A8B9C0-7890-ABCD-EF01-234567890ABC}"
       Required="FALSE"
       Group="Notifications">
  <CHOICES>
    <CHOICE>Communication</CHOICE>
    <CHOICE>General Review</CHOICE>
    <CHOICE>IMA Review</CHOICE>
  </CHOICES>
</Field>
```

Add it to the default view `<pnp:ViewFields>` alongside `TriggerEvent` and `Category`.

### 2. NotificationsFields.ts — Add Constant

```typescript
export const NotificationsFields = {
  // System Fields
  ID: 'ID',
  Title: 'Title',
  Created: 'Created',
  Modified: 'Modified',

  // Template Content
  Subject: 'Subject',
  Body: 'Body',

  // Recipient Configuration
  Recipients: 'Recipients',
  CcRecipients: 'CcRecipients',

  // Notification Settings
  Importance: 'Importance',
  Category: 'Category',
  TriggerEvent: 'TriggerEvent',
  RequestType: 'RequestType',   // ← new
  IsActive: 'IsActive',

  // Metadata
  Description: 'Description',
} as const;
```

### 3. Azure Function — NotificationService.cs

Update the template lookup to implement the fallback cascade:

```csharp
// Step 1: Try type-specific template
var template = await GetTemplateAsync(triggerEvent, requestType);

// Step 2: Fall back to generic template
if (template == null)
{
    template = await GetTemplateAsync(triggerEvent, requestType: null);
}

// Step 3: Nothing found
if (template == null)
{
    _logger.LogWarning("No notification template found for {TriggerEvent} / {RequestType}",
        triggerEvent, requestType);
    return NotificationResult.NoTemplate();
}
```

The query helper:

```csharp
private async Task<NotificationTemplate?> GetTemplateAsync(string triggerEvent, string? requestType)
{
    var filter = $"TriggerEvent eq '{triggerEvent}' and IsActive eq 1";

    if (requestType != null)
        filter += $" and RequestType eq '{requestType}'";
    else
        filter += " and RequestType eq null";   // or however blank is represented in PnP query

    // ... execute SP query
}
```

---

## Template Inventory

Templates **likely to need type-specific variants** (Phase 2):

| Template | Reason |
|----------|--------|
| `RequestSubmitted` | Different fields visible per type; different review teams |
| `RushRequestAlert` | Rush criteria may differ; different escalation contacts |
| `ReadyForCloseout` | Closeout requirements differ (e.g., FINRA only for Communication) |
| `RequestCompleted` | Completion summary content differs per type |

Templates **safe to keep generic**:

| Template | Reason |
|----------|--------|
| `AttorneyAssigned` | Process is the same regardless of type |
| `AttorneyReassigned` | Same |
| `ReadyForAttorneyAssignment` | Same |
| `ComplianceReviewRequired` | Same |
| `LegalReviewApproved` | Outcome notification is type-agnostic |
| `LegalChangesRequested` | Same |
| `LegalReviewNotApproved` | Same |
| `ComplianceReviewApproved` | Same |
| `ComplianceChangesRequested` | Same |
| `ComplianceReviewNotApproved` | Same |
| `ResubmissionReceivedLegal` | Same |
| `ResubmissionReceivedCompliance` | Same |
| `RequestOnHold` | Same |
| `RequestResumed` | Same |
| `RequestCancelled` | Same |

---

## Existing Template Variables

Already available in the template engine — no changes needed:

```
{{RequestId}}           {{RequestTitle}}        {{RequestType}}
{{SubmitterName}}       {{SubmitterEmail}}       {{ReviewAudience}}
{{TargetReturnDate}}    {{RushRationale}}        {{AttorneyName}}
{{LegalReviewOutcome}}  {{ComplianceOutcome}}    {{TrackingId}}
```

---

## Migration

No data migration needed. All existing notification rows remain valid with a blank `RequestType` (they become the generic fallback). New type-specific rows are additive.

**Deployment steps:**
1. Add `RequestType` field to the list via provisioning update
2. Deploy updated `NotificationsFields.ts`
3. Deploy updated Azure Function with fallback lookup logic
4. Optionally add Communication-specific rows for templates that need different content
