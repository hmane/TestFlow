<#
.SYNOPSIS
    Migrates SubmissionItem field from Lookup to Text field

.DESCRIPTION
    This script migrates the SubmissionItem field in the Requests list from a Lookup field
    (pointing to SubmissionItems list) to a Text field that stores values directly.

    This enables the "Other" pattern where custom values can be stored alongside
    predefined values from the SubmissionItems list.

.PARAMETER SiteUrl
    The URL of the SharePoint site

.EXAMPLE
    .\Migrate-SubmissionItemField.ps1 -SiteUrl "https://tenant.sharepoint.com/sites/LegalReview"

.NOTES
    WARNING: This script will:
    1. Read all existing SubmissionItem lookup values
    2. Delete the existing SubmissionItem lookup field
    3. Create a new SubmissionItem text field
    4. Migrate the data (lookup Title → text value)

    Make sure to backup your data before running this script!
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$SiteUrl
)

# Import PnP Module
if (-not (Get-Module -ListAvailable -Name PnP.PowerShell)) {
  Write-Error "PnP.PowerShell module is not installed. Run: Install-Module -Name PnP.PowerShell -Scope CurrentUser"
  exit
}

# Connect to SharePoint
Write-Host "Connecting to SharePoint site: $SiteUrl" -ForegroundColor Cyan
Connect-PnPOnline -Url $SiteUrl -Interactive

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "MIGRATION: SubmissionItem Lookup → Text" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

# Step 1: Check if field exists and get its type
Write-Host "`n[Step 1] Checking existing SubmissionItem field..." -ForegroundColor Cyan

try {
  $existingField = Get-PnPField -List "Requests" -Identity "SubmissionItem" -ErrorAction Stop
  $fieldType = $existingField.TypeAsString

  Write-Host "  Current field type: $fieldType" -ForegroundColor White

  if ($fieldType -ne "Lookup") {
    Write-Host "  Field is already a $fieldType field. No migration needed." -ForegroundColor Green
    Disconnect-PnPOnline
    exit
  }
}
catch {
  Write-Host "  Field 'SubmissionItem' not found. Nothing to migrate." -ForegroundColor Yellow
  Disconnect-PnPOnline
  exit
}

# Step 2: Get all existing items and their SubmissionItem values
Write-Host "`n[Step 2] Reading existing data..." -ForegroundColor Cyan

$items = Get-PnPListItem -List "Requests" -Fields "ID", "Title", "SubmissionItem" -PageSize 500

$itemsWithSubmissionItem = @()
foreach ($item in $items) {
  if ($item["SubmissionItem"]) {
    $lookupValue = $item["SubmissionItem"]
    $itemsWithSubmissionItem += @{
      Id    = $item.Id
      Title = $lookupValue.LookupValue  # Get the Title from lookup
    }
    Write-Host "  Item $($item.Id): $($lookupValue.LookupValue)" -ForegroundColor Gray
  }
}

Write-Host "  Found $($itemsWithSubmissionItem.Count) items with SubmissionItem values" -ForegroundColor White

# Step 3: Confirm migration
Write-Host "`n[Step 3] Confirmation" -ForegroundColor Cyan
Write-Host "  This will:" -ForegroundColor Yellow
Write-Host "    1. Delete the existing Lookup field 'SubmissionItem'" -ForegroundColor Yellow
Write-Host "    2. Create a new Text field 'SubmissionItem'" -ForegroundColor Yellow
Write-Host "    3. Migrate $($itemsWithSubmissionItem.Count) item values" -ForegroundColor Yellow
Write-Host "`n  WARNING: This operation cannot be undone!" -ForegroundColor Red

$confirmation = Read-Host "`n  Do you want to continue? (yes/no)"
if ($confirmation -ne "yes") {
  Write-Host "`n  Migration cancelled." -ForegroundColor Yellow
  Disconnect-PnPOnline
  exit
}

# Step 4: Delete the existing Lookup field
Write-Host "`n[Step 4] Deleting existing Lookup field..." -ForegroundColor Cyan

try {
  Remove-PnPField -List "Requests" -Identity "SubmissionItem" -Force -ErrorAction Stop
  Write-Host "  ✓ Lookup field deleted" -ForegroundColor Green
}
catch {
  Write-Host "  ✗ Error deleting field: $($_.Exception.Message)" -ForegroundColor Red
  Disconnect-PnPOnline
  exit
}

# Step 5: Create new Text field
Write-Host "`n[Step 5] Creating new Text field..." -ForegroundColor Cyan

try {
  $fieldXml = "<Field Type='Text' DisplayName='Submission Item' Name='SubmissionItem' Required='TRUE' MaxLength='255' Group='Request Information' />"
  Add-PnPFieldFromXml -List "Requests" -FieldXml $fieldXml -ErrorAction Stop
  Write-Host "  ✓ Text field created" -ForegroundColor Green
}
catch {
  Write-Host "  ✗ Error creating field: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "  CRITICAL: Field was deleted but not recreated! Manual intervention required!" -ForegroundColor Red
  Disconnect-PnPOnline
  exit
}

# Step 6: Migrate data
Write-Host "`n[Step 6] Migrating data..." -ForegroundColor Cyan

$successCount = 0
$errorCount = 0

foreach ($itemData in $itemsWithSubmissionItem) {
  try {
    Set-PnPListItem -List "Requests" -Identity $itemData.Id -Values @{
      "SubmissionItem" = $itemData.Title
    } -ErrorAction Stop

    Write-Host "  ✓ Item $($itemData.Id): '$($itemData.Title)'" -ForegroundColor Gray
    $successCount++
  }
  catch {
    Write-Host "  ✗ Item $($itemData.Id): Error - $($_.Exception.Message)" -ForegroundColor Red
    $errorCount++
  }
}

# Step 7: Summary
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "MIGRATION COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "`nResults:" -ForegroundColor Cyan
Write-Host "  ✓ Successfully migrated: $successCount items" -ForegroundColor Green
if ($errorCount -gt 0) {
  Write-Host "  ✗ Failed: $errorCount items" -ForegroundColor Red
}

Write-Host "`nField Details:" -ForegroundColor Cyan
Write-Host "  Old Type: Lookup (pointing to SubmissionItems list)" -ForegroundColor White
Write-Host "  New Type: Text (stores values directly)" -ForegroundColor White
Write-Host "  Max Length: 255 characters" -ForegroundColor White
Write-Host "  Required: Yes" -ForegroundColor White

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "  1. Verify the data in SharePoint" -ForegroundColor White
Write-Host "  2. Test creating a new request" -ForegroundColor White
Write-Host "  3. Test editing an existing request" -ForegroundColor White
Write-Host "  4. Test using 'Other' with a custom value" -ForegroundColor White

Write-Host "`n" -ForegroundColor White

Disconnect-PnPOnline
