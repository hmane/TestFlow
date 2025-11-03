<#
.SYNOPSIS
    Removes SharePoint lists and library for Legal Review System (LRS)

.DESCRIPTION
    This script removes all SharePoint lists and document library created for the Legal Review System.
    Use this for cleanup or to start fresh.

.PARAMETER SiteUrl
    The URL of the SharePoint site where lists will be removed

.PARAMETER Force
    Skip confirmation prompt

.EXAMPLE
    .\Remove-LegalReviewLists.ps1 -SiteUrl "https://tenant.sharepoint.com/sites/LegalReview"

.EXAMPLE
    .\Remove-LegalReviewLists.ps1 -SiteUrl "https://tenant.sharepoint.com/sites/LegalReview" -Force

.NOTES
    Requires: PnP.PowerShell module
    Install: Install-Module -Name PnP.PowerShell -Scope CurrentUser

    Author: Legal Review System Team
    Date: 2025-01-14
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$SiteUrl,

  [Parameter(Mandatory = $false)]
  [switch]$Force
)

# Import PnP Module
if (-not (Get-Module -ListAvailable -Name PnP.PowerShell)) {
  Write-Error "PnP.PowerShell module is not installed. Run: Install-Module -Name PnP.PowerShell -Scope CurrentUser"
  exit
}

# Connect to SharePoint
Write-Host "Connecting to SharePoint site: $SiteUrl" -ForegroundColor Cyan
Connect-PnPOnline -Url $SiteUrl -ClientId "970bb320-0d49-4b4a-aa8f-c3f4b1e5928f" -Interactive

# Confirmation
if (-not $Force) {
  Write-Host "`nWARNING: This will DELETE the following lists and all their data:" -ForegroundColor Red
  Write-Host "  - Requests (with all request data)" -ForegroundColor Yellow
  Write-Host "  - SubmissionItems (with configuration data)" -ForegroundColor Yellow
  Write-Host "  - Configuration (with all settings)" -ForegroundColor Yellow
  Write-Host "  - RequestDocuments (document library with all files)" -ForegroundColor Yellow

  Write-Host "`nWARNING: This will also REMOVE the following security groups:" -ForegroundColor Red
  Write-Host "  - LW - Submitters" -ForegroundColor Yellow
  Write-Host "  - LW - Legal Admin" -ForegroundColor Yellow
  Write-Host "  - LW - Attorney Assigner" -ForegroundColor Yellow
  Write-Host "  - LW - Attorneys" -ForegroundColor Yellow
  Write-Host "  - LW - Compliance Users" -ForegroundColor Yellow
  Write-Host "  - LW - Admin" -ForegroundColor Yellow

  Write-Host "`nWARNING: This will also REMOVE form customizers:" -ForegroundColor Red
  Write-Host "  - Legal Workflow Form Customizer (all form modes)" -ForegroundColor Yellow

  $confirmation = Read-Host "`nAre you sure you want to continue? (yes/no)"

  if ($confirmation -ne "yes") {
    Write-Host "Operation cancelled." -ForegroundColor Gray
    Disconnect-PnPOnline
    exit
  }
}

# =============================================================================
# REMOVE FORM CUSTOMIZERS
# =============================================================================

Write-Host "`nRemoving form customizers..." -ForegroundColor Cyan

try {
  # Get the Requests list
  $requestsList = Get-PnPList -Identity "Requests" -ErrorAction SilentlyContinue

  if ($null -ne $requestsList) {
    # Get the default "Item" content type
    $itemContentType = Get-PnPContentType -List "Requests" | Where-Object { $_.Name -eq "Item" }

    if ($null -ne $itemContentType) {
      Write-Host "  - Clearing form customizers from Item content type..." -ForegroundColor Gray

      # Clear form customizer IDs (set to empty GUID or null)
      Set-PnPContentType -Identity $itemContentType.Id.StringValue -List "Requests" -NewFormClientSideComponentId "00000000-0000-0000-0000-000000000000"
      Set-PnPContentType -Identity $itemContentType.Id.StringValue -List "Requests" -EditFormClientSideComponentId "00000000-0000-0000-0000-000000000000"
      Set-PnPContentType -Identity $itemContentType.Id.StringValue -List "Requests" -DisplayFormClientSideComponentId "00000000-0000-0000-0000-000000000000"

      Write-Host "  ✓ Form customizers removed from Item content type" -ForegroundColor Green
    }
    else {
      Write-Host "  ! Item content type not found" -ForegroundColor Yellow
    }
  }
  else {
    Write-Host "  ! Requests list not found" -ForegroundColor Yellow
  }
}
catch {
  Write-Host "  ! Error removing form customizers: $($_.Exception.Message)" -ForegroundColor Yellow
}# =============================================================================
# REMOVE LISTS AND LIBRARIES
# =============================================================================

$listsToRemove = @(
  "RequestDocuments",  # Remove first (has lookup to Requests)
  "Requests",          # Remove second (has lookup to SubmissionItems)
  "SubmissionItems",
  "Configuration"
)

Write-Host "`nRemoving lists and libraries..." -ForegroundColor Cyan

foreach ($listName in $listsToRemove) {
  $list = Get-PnPList -Identity $listName -ErrorAction SilentlyContinue

  if ($null -ne $list) {
    Remove-PnPList -Identity $listName -Force
    Write-Host "  ✓ Removed: $listName" -ForegroundColor Green
  }
  else {
    Write-Host "  ! List not found: $listName" -ForegroundColor Yellow
  }
}

# =============================================================================
# REMOVE SECURITY GROUPS
# =============================================================================

$groupsToRemove = @(
  "LW - Submitters",
  "LW - Legal Admin",
  "LW - Attorney Assigner",
  "LW - Attorneys",
  "LW - Compliance Users",
  "LW - Admin"
)

Write-Host "`nRemoving security groups..." -ForegroundColor Cyan

foreach ($groupName in $groupsToRemove) {
  $group = Get-PnPGroup -Identity $groupName -ErrorAction SilentlyContinue

  if ($null -ne $group) {
    Remove-PnPGroup -Identity $groupName -Force
    Write-Host "  ✓ Removed group: $groupName" -ForegroundColor Green
  }
  else {
    Write-Host "  ! Group not found: $groupName" -ForegroundColor Yellow
  }
}

# =============================================================================
# CLEAN UP SITE COLUMNS (OPTIONAL)
# =============================================================================

Write-Host "`nCleaning up custom site columns..." -ForegroundColor Cyan

$customGroups = @(
  "Request Information",
  "Approvals",
  "Legal Intake",
  "Legal Review",
  "Compliance Review",
  "Closeout",
  "System Tracking",
  "Submission Items",
  "Configuration",
  "Document Metadata"
)

foreach ($groupName in $customGroups) {
  try {
    $fields = Get-PnPField | Where-Object { $_.Group -eq $groupName }

    foreach ($field in $fields) {
      if (-not $field.Sealed -and $field.CanBeDeleted) {
        Remove-PnPField -Identity $field.Id -Force -ErrorAction SilentlyContinue
        Write-Host "    ✓ Removed field: $($field.Title)" -ForegroundColor Gray
      }
    }

    if ($fields.Count -gt 0) {
      Write-Host "  ✓ Cleaned up $($fields.Count) fields from group: $groupName" -ForegroundColor Green
    }
  }
  catch {
    Write-Host "  ! Could not clean up fields from group: $groupName" -ForegroundColor Yellow
  }
}

# =============================================================================
# SUMMARY
# =============================================================================

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "CLEANUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "`nRemoved Components:" -ForegroundColor Cyan
Write-Host "  ✓ All Legal Review System lists and libraries" -ForegroundColor White
Write-Host "  ✓ All security groups (LW - *)" -ForegroundColor White
Write-Host "  ✓ Custom site columns and field groups" -ForegroundColor White

Write-Host "`nSite has been completely cleaned up." -ForegroundColor White
Write-Host "You can now run Setup-LegalReviewLists.ps1 to recreate the system." -ForegroundColor White
Write-Host "`n" -ForegroundColor White

Disconnect-PnPOnline
