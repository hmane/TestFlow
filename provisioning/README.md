# Legal Workflow - PnP Provisioning Templates

This directory contains comprehensive PnP provisioning XML templates for automated deployment of the Legal Workflow System to SharePoint Online.

---

## 📁 File Structure

```
provisioning/
├── SiteTemplate.xml              # Main template (uses xi:include)
├── Security.xml                  # Groups and permission levels (2 permission levels)
├── Apply-ColumnFormatting.ps1    # Script to apply custom column formatting
├── Lists/
│   ├── Requests.xml              # Requests list (73 fields with IDs)
│   ├── SubmissionItems.xml       # Submission types list
│   ├── Configuration.xml         # Configuration key-value store
│   └── RequestDocuments.xml      # Document library
└── README.md                     # This file
```

---

## 🚀 Quick Start

### Prerequisites

1. **PnP PowerShell Module** (version 1.12.0 or higher)
   ```powershell
   Install-Module -Name PnP.PowerShell -Scope CurrentUser
   ```

2. **SharePoint Site** - Target site collection URL

3. **Permissions** - Site Collection Administrator rights

### Deploy All Components

```powershell
# 1. Connect to SharePoint site
Connect-PnPOnline -Url "https://yourtenant.sharepoint.com/sites/LegalWorkflow" -Interactive

# 2. Apply the provisioning template
Apply-PnPProvisioningTemplate -Path .\SiteTemplate.xml -Handlers All

# 3. Apply custom column formatting (enhances UX)
.\Apply-ColumnFormatting.ps1 -SiteUrl "https://yourtenant.sharepoint.com/sites/LegalWorkflow"

# 4. Verify deployment
Get-PnPList
Get-PnPField -List "Requests" | Select-Object Title, InternalName, Id | Format-Table
```

---

## 📦 What Gets Provisioned

### 1. Security (Security.xml)

**Custom Permission Levels:**

1. **Contributor Without Delete**
   - All Contribute permissions
   - Except: DeleteListItems, DeleteVersions
   - Use case: Users who can add/edit but not delete
   - Applied to: Attorneys, Compliance Users on Requests list

2. **Admin Without Delete** ⚠️
   - Full list management permissions (ManageLists, ApproveItems, CancelCheckout)
   - All Contribute permissions
   - Except: DeleteListItems, DeleteVersions
   - Use case: **Audit compliance** - Prevent request deletion by admins
   - Applied to: All admin groups on Requests list
   - **Note**: Site Collection Admins can still delete (SharePoint platform limitation)

**SharePoint Groups:**
1. **LW - Submitters** - Submit legal review requests
2. **LW - Legal Admin** - Triage and manage all requests
3. **LW - Attorney Assigner** - Assign attorneys to requests
4. **LW - Attorneys** - Review assigned requests
5. **LW - Compliance Users** - Review compliance aspects
6. **LW - Admin** - Full system access

**Broken Permissions:**
- **Requests list**: Inheritance broken, "Admin Without Delete" applied to prevent accidental/intentional deletion for audit compliance
- **Configuration list**: Inheritance broken, Admin=Full Control, Others=Read
- **SubmissionItems list**: Inheritance broken, Admin=Full Control, Others=Read
- **RequestDocuments library**: Standard permissions (documents CAN be deleted)

### 2. Lists

#### SubmissionItems (Lists/SubmissionItems.xml)
**Purpose**: Configuration list for submission types and turnaround times

**Fields:**
- Title (Text) - Submission type name
- TurnAroundTimeInDays (Number, 1-30) - Expected days
- Description (Note) - Detailed description
- DisplayOrder (Number) - Sort order

**Sample Data:**
- New Exhibit (3 days)
- Updated Exhibit (2 days)
- White Paper (5 days)
- Website Update - Substantial (5 days)
- Marketing Communication (3 days)

#### Configuration (Lists/Configuration.xml)
**Purpose**: Application configuration key-value store

**Fields:**
- Title (Text) - Configuration key
- ConfigValue (Text) - Configuration value
- Description (Note) - Description
- IsActive (Boolean) - Active flag
- Category (Text) - Grouping category

**Sample Data:**
- azureFunctionUrl (Integration)
- maxFileSizeMB (Limits)
- enablePhase2RequestTypes (Features)

**Views:**
- All Items (default)
- Active Configurations (filtered)

#### Requests (Lists/Requests.xml)
**Purpose**: Main list for legal review requests with workflow

**Total Fields**: 73+

**Sections:**

1. **Request Information** (17 fields)
   - Title, RequestType, RequestTitle, Purpose
   - SubmissionType, SubmissionItem, DistributionMethod
   - TargetReturnDate, IsRushRequest, RushRationale
   - ReviewAudience, PriorSubmissions, PriorSubmissionNotes
   - DateOfFirstUse, AdditionalParty, Department

2. **Approval Fields** (18 fields - 6 types)
   - Communications Approval (required)
   - Portfolio Manager Approval
   - Research Analyst Approval
   - Subject Matter Expert Approval
   - Performance Approval
   - Other Approval
   - Each has: HasApproval, ApprovalDate, Approver

3. **Legal Intake** (2 fields)
   - Attorney, AttorneyAssignNotes (append-only)

4. **Legal Review** (5 fields)
   - LegalReviewStatus, LegalStatusUpdatedOn/By
   - LegalReviewOutcome, LegalReviewNotes (append-only)

5. **Compliance Review** (8 fields)
   - ComplianceReviewStatus, ComplianceStatusUpdatedOn/By
   - ComplianceReviewOutcome, ComplianceReviewNotes (append-only)
   - IsForesideReviewRequired, RecordRetentionOnly, IsRetailUse

6. **Closeout** (1 field)
   - TrackingId

7. **System Tracking** (18 fields)
   - Status (Draft → Completed workflow)
   - SubmittedBy/On, SubmittedToAssignAttorneyBy/On
   - SubmittedForReviewBy/On, CloseoutBy/On
   - CancelledBy/On, CancelReason
   - OnHoldBy, OnHoldSince, OnHoldReason
   - PreviousStatus, TotalTurnaroundDays, ExpectedTurnaroundDate

**Views:**
- All Items (default, by ID desc)
- My Requests (filtered by current user)
- Active Requests (excludes Draft/Completed/Cancelled)

#### RequestDocuments (Lists/RequestDocuments.xml)
**Purpose**: Document library for request attachments

**Fields:**
- Name (auto) - File name
- DocumentType (Choice, Required) - Document category
- Request (Lookup, Required) - Link to Requests list
- Description (Note) - Document description

**Document Types:**
- Review
- Supplemental
- Communication Approval
- Portfolio Manager Approval
- Research Analyst Approval
- Subject Matter Expert Approval
- Performance Approval
- Other Approval

**Views:**
- All Documents (default)
- By Document Type (grouped)
- By Request (grouped)

**Settings:**
- Versioning: Enabled
- Folders: Enabled
- Attachments: Disabled

---

## 🎨 Field IDs & Column Formatting

### Field IDs (GUIDs)

All fields in the provisioning templates have **explicit IDs (GUIDs)** assigned for consistency and future-proofing:

- **Requests list**: 68 custom fields with IDs from `{A1234567-...}` to `{A1234567-0007-...-000000000081}`
- **Configuration list**: 4 fields with IDs `{B1234567-...}`
- **SubmissionItems list**: 3 fields with IDs `{C1234567-...}`
- **RequestDocuments library**: 3 fields with IDs `{D1234567-...}`

**Benefits of Field IDs:**
- Fields won't be recreated on re-provisioning (matched by ID, not just name)
- Easier to reference fields programmatically in SPFx/Power Apps
- Consistent across environments (dev, test, prod)

**Example:**
```xml
<Field Type="Choice"
       DisplayName="Status"
       Name="Status"
       ID="{A1234567-0007-0001-0001-000000000070}"
       Required="TRUE">
  <CHOICES>...</CHOICES>
</Field>
```

### Custom Column Formatting

The `Apply-ColumnFormatting.ps1` script applies JSON formatting to enhance user experience:

**Status Field:**
- Color-coded pills (Draft=gray, In Review=blue, Completed=green, Cancelled=red, etc.)

**LegalReviewStatus & ComplianceReviewStatus:**
- Status indicator dots with colors (Not Started=red, In Progress=blue, Completed=green)

**IsRushRequest:**
- Warning icon (⚠️) for rush requests

**TargetReturnDate:**
- Red text for overdue dates
- Orange text for dates due within 24 hours
- Black text for future dates

**To Apply:**
```powershell
.\Apply-ColumnFormatting.ps1 -SiteUrl "https://yourtenant.sharepoint.com/sites/LegalWorkflow"
```

---

## 🎯 Selective Deployment

### Deploy Only Security

```powershell
Apply-PnPProvisioningTemplate -Path .\Security.xml `
    -Handlers SiteSecurityPermissions, SiteGroups
```

### Deploy Only Lists

```powershell
# Deploy SubmissionItems only
Apply-PnPProvisioningTemplate -Path .\Lists\SubmissionItems.xml -Handlers Lists

# Deploy Configuration only
Apply-PnPProvisioningTemplate -Path .\Lists\Configuration.xml -Handlers Lists

# Deploy Requests only (requires SubmissionItems first)
Apply-PnPProvisioningTemplate -Path .\Lists\Requests.xml -Handlers Lists

# Deploy RequestDocuments only (requires Requests first)
Apply-PnPProvisioningTemplate -Path .\Lists\RequestDocuments.xml -Handlers Lists
```

### Deploy in Dependency Order

```powershell
# Recommended order for selective deployment
Apply-PnPProvisioningTemplate -Path .\Security.xml -Handlers SiteSecurityPermissions,SiteGroups
Apply-PnPProvisioningTemplate -Path .\Lists\SubmissionItems.xml -Handlers Lists
Apply-PnPProvisioningTemplate -Path .\Lists\Configuration.xml -Handlers Lists
Apply-PnPProvisioningTemplate -Path .\Lists\Requests.xml -Handlers Lists
Apply-PnPProvisioningTemplate -Path .\Lists\RequestDocuments.xml -Handlers Lists
```

---

## 🔧 Customization

### Modify Field Choices

Edit the XML directly to change choice values:

```xml
<!-- In Requests.xml -->
<Field Type="Choice" DisplayName="Request Type" Name="RequestType">
  <CHOICES>
    <CHOICE>Communication</CHOICE>
    <CHOICE>General Review</CHOICE>
    <CHOICE>IMA Review</CHOICE>
    <CHOICE>Your Custom Type</CHOICE>  <!-- Add here -->
  </CHOICES>
  <Default>Communication</Default>
</Field>
```

### Add Custom Fields

Add new field definitions in the appropriate `<pnp:Fields>` section:

```xml
<Field Type="Text"
       DisplayName="Custom Field"
       Name="CustomField"
       Required="FALSE"
       MaxLength="255"
       Group="Custom Fields" />
```

### Modify Sample Data

Edit `<pnp:DataRows>` section in SubmissionItems.xml or Configuration.xml:

```xml
<pnp:DataRow>
  <pnp:DataValue FieldName="Title">Your Custom Item</pnp:DataValue>
  <pnp:DataValue FieldName="TurnAroundTimeInDays">7</pnp:DataValue>
</pnp:DataRow>
```

---

## 🔍 Validation

### Verify Deployment

```powershell
# Connect to site
Connect-PnPOnline -Url "https://yourtenant.sharepoint.com/sites/LegalWorkflow" -Interactive

# Check lists
Get-PnPList | Select-Object Title, ItemCount

# Check groups
Get-PnPGroup

# Check specific list fields
Get-PnPField -List "Requests" | Select-Object Title, TypeAsString, Group | Sort-Object Group

# Check permission levels
Get-PnPRoleDefinition | Where-Object { $_.Name -like "*Contributor*" }
```

### Test Data

```powershell
# Add a test request
Add-PnPListItem -List "Requests" -Values @{
    "Title" = "TEST-001"
    "RequestTitle" = "Test Request"
    "RequestType" = "Communication"
    "Purpose" = "Testing provisioning"
    "SubmissionType" = "New"
    "SubmissionItem" = "New Exhibit"
    "ReviewAudience" = "Legal"
    "TargetReturnDate" = (Get-Date).AddDays(5)
    "Status" = "Draft"
}
```

---

## ⚙️ Troubleshooting

### Issue: xi:include Not Supported

**Error**: `xi:include` directives not resolved

**Solution**: Use PnP PowerShell v1.12.0+ which supports xi:include

```powershell
Update-Module -Name PnP.PowerShell
```

### Issue: Lookup Field Creation Fails

**Error**: Cannot create lookup to "Requests" - list does not exist

**Solution**: Deploy lists in dependency order (SubmissionItems → Requests → RequestDocuments)

### Issue: Permission Level Already Exists

**Error**: Role definition "Contributor Without Delete" already exists

**Solution**: Either skip security handler or delete existing:

```powershell
Remove-PnPRoleDefinition -Identity "Contributor Without Delete" -Force
```

### Issue: Group Already Exists

**Error**: Group "LW - Submitters" already exists

**Solution**: Groups are preserved if they exist. No action needed.

### Issue: Users Can Still Delete Requests

**Symptom**: "Admin Without Delete" permission level exists, but Site Collection Admins can still delete requests

**Explanation**: This is a SharePoint platform limitation. Site Collection Admins always have Full Control and bypass custom permission levels.

**Workarounds:**
1. **Train Site Collection Admins** not to delete requests (audit compliance requirement)
2. **Use Recycle Bin recovery** if accidental deletion occurs
3. **Implement Event Receiver** (advanced): Deploy Azure Function with ItemDeleting webhook to block ALL deletions
4. **Retention Policy**: Configure 2nd-stage recycle bin with indefinite retention

**Current Implementation:** Permission-based prevention (blocks 90% of deletions, Site Collection Admins excluded)

### Feature: Multi-Select Disabled on Requests List

**Behavior**: The Requests list has `DisableGridEditing="true"` which prevents:
- Selecting multiple items with checkboxes
- Bulk delete operations
- Quick edit mode

**Purpose**: Prevent accidental bulk deletions for audit compliance

**To Re-Enable** (not recommended):
```powershell
$list = Get-PnPList -Identity "Requests"
Set-PnPList -Identity $list -DisableGridEditing $false
```

---

## 📊 Field Type Reference

| SPFx Type | PnP XML Type | Example |
|-----------|--------------|---------|
| Single line text | Text | `<Field Type="Text" MaxLength="255" />` |
| Multi-line text | Note | `<Field Type="Note" NumLines="6" />` |
| Choice (dropdown) | Choice | `<Field Type="Choice"><CHOICES>...</CHOICES></Field>` |
| Multi-choice | MultiChoice | `<Field Type="MultiChoice"><CHOICES>...</CHOICES></Field>` |
| Number | Number | `<Field Type="Number" Min="0" Max="100" />` |
| Date/Time | DateTime | `<Field Type="DateTime" Format="DateTime" />` |
| Date only | DateTime | `<Field Type="DateTime" Format="DateOnly" />` |
| Person | User | `<Field Type="User" UserSelectionMode="PeopleOnly" />` |
| Person (multi) | UserMulti | `<Field Type="UserMulti" />` |
| Yes/No | Boolean | `<Field Type="Boolean"><Default>1</Default></Field>` |
| Lookup | Lookup | `<Field Type="Lookup" List="Lists/OtherList" ShowField="Title" />` |
| Lookup (multi) | LookupMulti | `<Field Type="LookupMulti" Mult="TRUE" />` |

---

## 🔄 Update Existing Site

### Safe Update Process

1. **Export current configuration**
   ```powershell
   Get-PnPProvisioningTemplate -Out "current-backup.xml" -Handlers Lists
   ```

2. **Compare schemas**
   - Review field additions/changes
   - Check for breaking changes

3. **Apply updates**
   ```powershell
   Apply-PnPProvisioningTemplate -Path .\SiteTemplate.xml `
       -Handlers Lists `
       -ClearNavigation:$false `
       -IgnoreDuplicateDataRowErrors
   ```

4. **Verify**
   - Check field existence
   - Test with existing data
   - Validate views

---

## 📝 Best Practices

1. **Always backup before applying templates**
   ```powershell
   Get-PnPProvisioningTemplate -Out "backup-$(Get-Date -Format 'yyyyMMdd').xml" -Handlers All
   ```

2. **Test in development first**
   - Apply to dev site
   - Validate all fields
   - Test workflows
   - Then deploy to production

3. **Use version control**
   - Track changes to XML files
   - Document modifications
   - Maintain change log

4. **Document customizations**
   - Comment XML changes
   - Update README
   - Note dependencies

5. **Monitor deployment**
   - Review logs
   - Check field creation
   - Validate data integrity

---

## 📚 Additional Resources

### PnP PowerShell Documentation
- [PnP PowerShell Cmdlets](https://pnp.github.io/powershell/)
- [Provisioning Schema](https://github.com/pnp/PnP-Provisioning-Schema)

### SharePoint Field Types
- [Field Element Reference](https://learn.microsoft.com/en-us/sharepoint/dev/schema/field-element-field)
- [Field Types](https://learn.microsoft.com/en-us/previous-versions/office/developer/sharepoint-2010/ms437580(v=office.14))

### Project Documentation
- [Legal Workflow Overview](../README.md)
- [Developer Guide](../CLAUDE.md)
- [Technical Design](../docs/design/TDD.md)

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] PnP PowerShell module installed (v1.12.0+)
- [ ] Connected to SharePoint site with admin rights
- [ ] Backed up existing configuration (if updating)
- [ ] Reviewed and customized XML templates
- [ ] Tested in development environment

### Provisioning
- [ ] Applied provisioning template (SiteTemplate.xml)
- [ ] Applied custom column formatting (Apply-ColumnFormatting.ps1)
- [ ] Verified lists created successfully
- [ ] Checked fields in each list (including Field IDs)
- [ ] Confirmed groups created
- [ ] Validated permission levels (including "Admin Without Delete")

### Security Validation
- [ ] Verified broken permissions on Requests list
- [ ] Tested deletion prevention (admins cannot delete requests)
- [ ] Confirmed multi-select is disabled on Requests list
- [ ] Verified Configuration list permissions (Admin=Full Control, Others=Read)
- [ ] Verified SubmissionItems list permissions (Admin=Full Control, Others=Read)
- [ ] Tested RequestDocuments library (standard permissions, can delete)

### Testing
- [ ] Tested creating sample request
- [ ] Tested column formatters display correctly (Status colors, rush icon, etc.)
- [ ] Configured SPFx Form Customizer
- [ ] Deployed SPFx solution (.sppkg)
- [ ] Added users to groups
- [ ] Tested end-to-end workflow

### Post-Deployment
- [ ] Documented any customizations made
- [ ] Trained Site Collection Admins on deletion prevention policy
- [ ] Configured recycle bin retention policy (optional)
- [ ] Monitored deployment logs for errors

---

**Version**: 1.0
**Last Updated**: February 2025
**Maintained By**: Legal Workflow Development Team

For questions or issues, please contact the development team or create an issue in the project repository.
