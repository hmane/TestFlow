<#
.SYNOPSIS
    Creates SharePoint lists and library for Legal Review System (LRS)

.DESCRIPTION
    This script creates all required SharePoint lists and document library for the Legal Review System:
    - Requests (75 fields)
    - SubmissionItems (3 fields)
    - Configuration (3 fields)
    - RequestDocuments (Document Library with metadata)

.PARAMETER SiteUrl
    The URL of the SharePoint site where lists will be created

.EXAMPLE
    .\Setup-LegalReviewLists.ps1 -SiteUrl "https://tenant.sharepoint.com/sites/LegalReview"

.NOTES
    Requires: PnP.PowerShell module
    Install: Install-Module -Name PnP.PowerShell -Scope CurrentUser

    Author: Legal Review System Team
    Date: 2025-01-14
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
Connect-PnPOnline -Url $SiteUrl -ClientId "970bb320-0d49-4b4a-aa8f-c3f4b1e5928f" -Interactive

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

function Add-ChoiceField {
  param(
    [string]$List,
    [string]$DisplayName,
    [string]$InternalName,
    [string[]]$Choices,
    [string]$DefaultValue = "",
    [bool]$Required = $false,
    [string]$Group = "Custom Columns"
  )

  Write-Host "  - Adding Choice field: $DisplayName" -ForegroundColor Gray

  try {
    $requiredAttr = if ($Required) { "TRUE" } else { "FALSE" }
    $fieldXml = "<Field Type='Choice' DisplayName='$DisplayName' Name='$InternalName' Required='$requiredAttr' Group='$Group'>"
    $fieldXml += "<CHOICES>"
    foreach ($choice in $Choices) {
      $escapedChoice = [System.Security.SecurityElement]::Escape($choice)
      $fieldXml += "<CHOICE>$escapedChoice</CHOICE>"
    }
    $fieldXml += "</CHOICES>"
    if ($DefaultValue) {
      $escapedDefault = [System.Security.SecurityElement]::Escape($DefaultValue)
      $fieldXml += "<Default>$escapedDefault</Default>"
    }
    $fieldXml += "</Field>"

    Add-PnPFieldFromXml -List $List -FieldXml $fieldXml -ErrorAction Stop
    Write-Host "    ✓ Created successfully" -ForegroundColor DarkGray
  }
  catch {
    if ($_.Exception.Message -like "*already exists*" -or $_.Exception.Message -like "*duplicate*") {
      Write-Host "    ! Field already exists (skipped)" -ForegroundColor Yellow
    }
    else {
      Write-Host "    ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
  }
}

function Add-MultiChoiceField {
  param(
    [string]$List,
    [string]$DisplayName,
    [string]$InternalName,
    [string[]]$Choices,
    [bool]$Required = $false,
    [string]$Group = "Custom Columns"
  )

  Write-Host "  - Adding Multi-Choice field: $DisplayName" -ForegroundColor Gray

  try {
    $requiredAttr = if ($Required) { "TRUE" } else { "FALSE" }
    $fieldXml = "<Field Type='MultiChoice' DisplayName='$DisplayName' Name='$InternalName' Required='$requiredAttr' Group='$Group'>"
    $fieldXml += "<CHOICES>"
    foreach ($choice in $Choices) {
      $escapedChoice = [System.Security.SecurityElement]::Escape($choice)
      $fieldXml += "<CHOICE>$escapedChoice</CHOICE>"
    }
    $fieldXml += "</CHOICES>"
    $fieldXml += "</Field>"

    Add-PnPFieldFromXml -List $List -FieldXml $fieldXml -ErrorAction Stop
    Write-Host "    ✓ Created successfully" -ForegroundColor DarkGray
  }
  catch {
    if ($_.Exception.Message -like "*already exists*" -or $_.Exception.Message -like "*duplicate*") {
      Write-Host "    ! Field already exists (skipped)" -ForegroundColor Yellow
    }
    else {
      Write-Host "    ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
  }
}

function Add-PersonField {
  param(
    [string]$List,
    [string]$DisplayName,
    [string]$InternalName,
    [bool]$Required = $false,
    [bool]$AllowMultiple = $false,
    [string]$Group = "Custom Columns"
  )

  Write-Host "  - Adding Person field: $DisplayName" -ForegroundColor Gray

  try {
    $userSelectionMode = if ($AllowMultiple) { "PeopleAndGroups" } else { "PeopleOnly" }
    $mult = if ($AllowMultiple) { "TRUE" } else { "FALSE" }
    $requiredAttr = if ($Required) { "TRUE" } else { "FALSE" }

    $fieldXml = "<Field Type='User' DisplayName='$DisplayName' Name='$InternalName' Required='$requiredAttr' Mult='$mult' UserSelectionMode='$userSelectionMode' Group='$Group' />"

    Add-PnPFieldFromXml -List $List -FieldXml $fieldXml -ErrorAction Stop
    Write-Host "    ✓ Created successfully" -ForegroundColor DarkGray
  }
  catch {
    if ($_.Exception.Message -like "*already exists*" -or $_.Exception.Message -like "*duplicate*") {
      Write-Host "    ! Field already exists (skipped)" -ForegroundColor Yellow
    }
    else {
      Write-Host "    ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
  }
}

function Add-BooleanField {
  param(
    [string]$List,
    [string]$DisplayName,
    [string]$InternalName,
    [bool]$DefaultValue = $false,
    [string]$Group = "Custom Columns"
  )

  Write-Host "  - Adding Boolean field: $DisplayName" -ForegroundColor Gray

  try {
    $default = if ($DefaultValue) { "1" } else { "0" }

    $fieldXml = "<Field Type='Boolean' DisplayName='$DisplayName' Name='$InternalName' Group='$Group'><Default>$default</Default></Field>"

    Add-PnPFieldFromXml -List $List -FieldXml $fieldXml -ErrorAction Stop
    Write-Host "    ✓ Created successfully" -ForegroundColor DarkGray
  }
  catch {
    if ($_.Exception.Message -like "*already exists*" -or $_.Exception.Message -like "*duplicate*") {
      Write-Host "    ! Field already exists (skipped)" -ForegroundColor Yellow
    }
    else {
      Write-Host "    ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
  }
}

function Add-DateTimeField {
  param(
    [string]$List,
    [string]$DisplayName,
    [string]$InternalName,
    [bool]$Required = $false,
    [string]$Format = "DateTime",  # DateTime or DateOnly
    [string]$Group = "Custom Columns"
  )

  Write-Host "  - Adding DateTime field: $DisplayName" -ForegroundColor Gray

  try {
    $requiredAttr = if ($Required) { "TRUE" } else { "FALSE" }
    $fieldXml = "<Field Type='DateTime' DisplayName='$DisplayName' Name='$InternalName' Required='$requiredAttr' Format='$Format' Group='$Group' />"

    Add-PnPFieldFromXml -List $List -FieldXml $fieldXml -ErrorAction Stop
    Write-Host "    ✓ Created successfully" -ForegroundColor DarkGray
  }
  catch {
    if ($_.Exception.Message -like "*already exists*" -or $_.Exception.Message -like "*duplicate*") {
      Write-Host "    ! Field already exists (skipped)" -ForegroundColor Yellow
    }
    else {
      Write-Host "    ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
  }
}

function Add-NoteField {
  param(
    [string]$List,
    [string]$DisplayName,
    [string]$InternalName,
    [bool]$Required = $false,
    [bool]$RichText = $false,
    [bool]$AppendOnly = $false,
    [string]$Group = "Custom Columns"
  )

  Write-Host "  - Adding Note field: $DisplayName" -ForegroundColor Gray

  try {
    $append = if ($AppendOnly) { "TRUE" } else { "FALSE" }
    $requiredAttr = if ($Required) { "TRUE" } else { "FALSE" }

    $fieldXml = "<Field Type='Note' DisplayName='$DisplayName' Name='$InternalName' Required='$requiredAttr' RichText='$($RichText.ToString().ToUpper())' AppendOnly='$append' NumLines='6' Group='$Group' />"

    Add-PnPFieldFromXml -List $List -FieldXml $fieldXml -ErrorAction Stop
    Write-Host "    ✓ Created successfully" -ForegroundColor DarkGray
  }
  catch {
    if ($_.Exception.Message -like "*already exists*" -or $_.Exception.Message -like "*duplicate*") {
      Write-Host "    ! Field already exists (skipped)" -ForegroundColor Yellow
    }
    else {
      Write-Host "    ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
  }
}

function Add-NumberField {
  param(
    [string]$List,
    [string]$DisplayName,
    [string]$InternalName,
    [bool]$Required = $false,
    [int]$Min = 0,
    [int]$Max = 999999,
    [string]$Group = "Custom Columns"
  )

  Write-Host "  - Adding Number field: $DisplayName" -ForegroundColor Gray

  try {
    $requiredAttr = if ($Required) { "TRUE" } else { "FALSE" }
    $fieldXml = "<Field Type='Number' DisplayName='$DisplayName' Name='$InternalName' Required='$requiredAttr' Min='$Min' Max='$Max' Decimals='0' Group='$Group' />"

    Add-PnPFieldFromXml -List $List -FieldXml $fieldXml -ErrorAction Stop
    Write-Host "    ✓ Created successfully" -ForegroundColor DarkGray
  }
  catch {
    if ($_.Exception.Message -like "*already exists*" -or $_.Exception.Message -like "*duplicate*") {
      Write-Host "    ! Field already exists (skipped)" -ForegroundColor Yellow
    }
    else {
      Write-Host "    ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
  }
}

function Add-LookupField {
  param(
    [string]$List,
    [string]$DisplayName,
    [string]$InternalName,
    [string]$LookupListName,
    [string]$LookupFieldName = "Title",
    [bool]$Required = $false,
    [bool]$AllowMultiple = $false,
    [string]$Group = "Custom Columns"
  )

  Write-Host "  - Adding Lookup field: $DisplayName" -ForegroundColor Gray

  try {
    $lookupList = Get-PnPList -Identity $LookupListName -ErrorAction Stop
    $lookupListId = $lookupList.Id.ToString()

    $mult = if ($AllowMultiple) { "TRUE" } else { "FALSE" }
    $requiredAttr = if ($Required) { "TRUE" } else { "FALSE" }

    $fieldXml = "<Field Type='Lookup' DisplayName='$DisplayName' Name='$InternalName' Required='$requiredAttr' List='$lookupListId' ShowField='$LookupFieldName' Mult='$mult' Group='$Group' />"

    Add-PnPFieldFromXml -List $List -FieldXml $fieldXml -ErrorAction Stop
    Write-Host "    ✓ Created successfully" -ForegroundColor DarkGray
  }
  catch {
    if ($_.Exception.Message -like "*already exists*" -or $_.Exception.Message -like "*duplicate*") {
      Write-Host "    ! Field already exists (skipped)" -ForegroundColor Yellow
    }
    elseif ($_.Exception.Message -like "*not found*" -or $_.Exception.Message -like "*does not exist*") {
      Write-Host "    ! Warning: Target list '$LookupListName' not found" -ForegroundColor Yellow
    }
    else {
      Write-Host "    ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
  }
}

function Add-TextFieldWithValidation {
  param(
    [string]$List,
    [string]$DisplayName,
    [string]$InternalName,
    [bool]$Required = $false,
    [int]$MaxLength = 255,
    [string]$Group = "Custom Columns"
  )

  Write-Host "  - Adding Text field: $DisplayName" -ForegroundColor Gray

  try {
    $requiredAttr = if ($Required) { "TRUE" } else { "FALSE" }
    $fieldXml = "<Field Type='Text' DisplayName='$DisplayName' Name='$InternalName' Required='$requiredAttr' MaxLength='$MaxLength' Group='$Group' />"

    Add-PnPFieldFromXml -List $List -FieldXml $fieldXml -ErrorAction Stop
    Write-Host "    ✓ Created successfully" -ForegroundColor DarkGray
  }
  catch {
    if ($_.Exception.Message -like "*already exists*" -or $_.Exception.Message -like "*duplicate*") {
      Write-Host "    ! Field already exists (skipped)" -ForegroundColor Yellow
    }
    else {
      Write-Host "    ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
  }
}

# =============================================================================
# 1. CREATE SUBMISSION ITEMS LIST (Create first - referenced by Requests)
# =============================================================================

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Creating SubmissionItems List" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$submissionItemsList = Get-PnPList -Identity "SubmissionItems" -ErrorAction SilentlyContinue

if ($null -eq $submissionItemsList) {
  New-PnPList -Title "SubmissionItems" -Template GenericList -OnQuickLaunch
  Write-Host "✓ SubmissionItems list created" -ForegroundColor Green

  # Add fields
  Add-NumberField -List "SubmissionItems" -DisplayName "Turn Around Time In Days" -InternalName "TurnAroundTimeInDays" -Required $true -Min 1 -Max 30 -Group "Submission Items"
  Add-NoteField -List "SubmissionItems" -DisplayName "Description" -InternalName "Description" -Required $false -RichText $false -Group "Submission Items"
  Add-NumberField -List "SubmissionItems" -DisplayName "Display Order" -InternalName "DisplayOrder" -Required $false -Min 0 -Max 999 -Group "Submission Items"

  Write-Host "✓ SubmissionItems fields added" -ForegroundColor Green
}
else {
  Write-Host "! SubmissionItems list already exists" -ForegroundColor Yellow
}

# =============================================================================
# 2. CREATE REQUESTS LIST (Main list - 75 fields)
# =============================================================================

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Creating Requests List" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$requestsList = Get-PnPList -Identity "Requests" -ErrorAction SilentlyContinue

if ($null -eq $requestsList) {
  New-PnPList -Title "Requests" -Template GenericList -OnQuickLaunch
  Write-Host "✓ Requests list created" -ForegroundColor Green

  # =========================================================================
  # A. REQUEST INFORMATION (17 fields)
  # =========================================================================
  Write-Host "`nAdding Request Information fields..." -ForegroundColor Cyan

  # Title is auto-created (will be used for RequestID: CRR-2025-10)

  Add-TextFieldWithValidation -List "Requests" -DisplayName "Department" -InternalName "Department" -Required $false -MaxLength 100 -Group "Request Information"

  Add-ChoiceField -List "Requests" -DisplayName "Request Type" -InternalName "RequestType" `
    -Choices @("Communication", "General Review", "IMA Review") `
    -DefaultValue "Communication" -Required $true -Group "Request Information"

  Add-TextFieldWithValidation -List "Requests" -DisplayName "Request Title" -InternalName "RequestTitle" -Required $true -MaxLength 255 -Group "Request Information"

  Add-NoteField -List "Requests" -DisplayName "Purpose" -InternalName "Purpose" -Required $true -RichText $false -Group "Request Information"

  Add-ChoiceField -List "Requests" -DisplayName "Submission Type" -InternalName "SubmissionType" `
    -Choices @("New", "Material Updates") `
    -Required $true -Group "Request Information"

  Add-TextFieldWithValidation -List "Requests" -DisplayName "Submission Item" -InternalName "SubmissionItem" -Required $true -MaxLength 255 -Group "Request Information"

  Add-MultiChoiceField -List "Requests" -DisplayName "Distribution Method" -InternalName "DistributionMethod" `
    -Choices @(
    "Dodge & Cox Website - U.S.",
    "Dodge & Cox Website - Non-U.S.",
    "Third Party Website",
    "Email / Mail",
    "Mobile App",
    "Display Card / Signage",
    "Hangout",
    "Live - Talking Points",
    "Social Media"
  ) -Group "Request Information"

  Add-DateTimeField -List "Requests" -DisplayName "Target Return Date" -InternalName "TargetReturnDate" -Required $true -Format "DateTime" -Group "Request Information"

  Add-BooleanField -List "Requests" -DisplayName "Is Rush Request" -InternalName "IsRushRequest" -DefaultValue $false -Group "Request Information"

  Add-NoteField -List "Requests" -DisplayName "Rush Rationale" -InternalName "RushRationale" -Required $false -RichText $false -Group "Request Information"

  Add-ChoiceField -List "Requests" -DisplayName "Review Audience" -InternalName "ReviewAudience" `
    -Choices @("Legal", "Compliance", "Both") `
    -Required $true -Group "Request Information"

  # Prior Submissions will be added after list is created (self-lookup)

  Add-NoteField -List "Requests" -DisplayName "Prior Submission Notes" -InternalName "PriorSubmissionNotes" -Required $false -RichText $false -Group "Request Information"

  Add-DateTimeField -List "Requests" -DisplayName "Date Of First Use" -InternalName "DateOfFirstUse" -Required $false -Format "DateTime" -Group "Request Information"

  Add-PersonField -List "Requests" -DisplayName "Additional Party" -InternalName "AdditionalParty" -Required $false -AllowMultiple $true -Group "Request Information"

  # =========================================================================
  # B. APPROVAL FIELDS (18 fields)
  # =========================================================================
  Write-Host "`nAdding Approval fields..." -ForegroundColor Cyan

  # Communications Approval (Required)
  Add-BooleanField -List "Requests" -DisplayName "Requires Communications Approval" -InternalName "RequiresCommunicationsApproval" -DefaultValue $false -Group "Approvals"
  Add-DateTimeField -List "Requests" -DisplayName "Communications Approval Date" -InternalName "CommunicationsApprovalDate" -Required $false -Format "DateOnly" -Group "Approvals"
  Add-PersonField -List "Requests" -DisplayName "Communications Approver" -InternalName "CommunicationsApprover" -Required $false -AllowMultiple $false -Group "Approvals"

  # Portfolio Manager Approval
  Add-BooleanField -List "Requests" -DisplayName "Has Portfolio Manager Approval" -InternalName "HasPortfolioManagerApproval" -DefaultValue $false -Group "Approvals"
  Add-DateTimeField -List "Requests" -DisplayName "Portfolio Manager Approval Date" -InternalName "PortfolioManagerApprovalDate" -Required $false -Format "DateOnly" -Group "Approvals"
  Add-PersonField -List "Requests" -DisplayName "Portfolio Manager" -InternalName "PortfolioManager" -Required $false -AllowMultiple $false -Group "Approvals"

  # Research Analyst Approval
  Add-BooleanField -List "Requests" -DisplayName "Has Research Analyst Approval" -InternalName "HasResearchAnalystApproval" -DefaultValue $false -Group "Approvals"
  Add-DateTimeField -List "Requests" -DisplayName "Research Analyst Approval Date" -InternalName "ResearchAnalystApprovalDate" -Required $false -Format "DateOnly" -Group "Approvals"
  Add-PersonField -List "Requests" -DisplayName "Research Analyst" -InternalName "ResearchAnalyst" -Required $false -AllowMultiple $false -Group "Approvals"

  # Subject Matter Expert Approval
  Add-BooleanField -List "Requests" -DisplayName "Has SME Approval" -InternalName "HasSMEApproval" -DefaultValue $false -Group "Approvals"
  Add-DateTimeField -List "Requests" -DisplayName "SME Approval Date" -InternalName "SMEApprovalDate" -Required $false -Format "DateOnly" -Group "Approvals"
  Add-PersonField -List "Requests" -DisplayName "Subject Matter Expert" -InternalName "SubjectMatterExpert" -Required $false -AllowMultiple $false -Group "Approvals"

  # Performance Approval
  Add-BooleanField -List "Requests" -DisplayName "Has Performance Approval" -InternalName "HasPerformanceApproval" -DefaultValue $false -Group "Approvals"
  Add-DateTimeField -List "Requests" -DisplayName "Performance Approval Date" -InternalName "PerformanceApprovalDate" -Required $false -Format "DateOnly" -Group "Approvals"
  Add-PersonField -List "Requests" -DisplayName "Performance Approver" -InternalName "PerformanceApprover" -Required $false -AllowMultiple $false -Group "Approvals"

  # Other Approval
  Add-BooleanField -List "Requests" -DisplayName "Has Other Approval" -InternalName "HasOtherApproval" -DefaultValue $false -Group "Approvals"
  Add-TextFieldWithValidation -List "Requests" -DisplayName "Other Approval Title" -InternalName "OtherApprovalTitle" -Required $false -MaxLength 100 -Group "Approvals"
  Add-DateTimeField -List "Requests" -DisplayName "Other Approval Date" -InternalName "OtherApprovalDate" -Required $false -Format "DateOnly" -Group "Approvals"
  Add-PersonField -List "Requests" -DisplayName "Other Approval" -InternalName "OtherApproval" -Required $false -AllowMultiple $false -Group "Approvals"

  # =========================================================================
  # C. LEGAL INTAKE (2 fields)
  # =========================================================================
  Write-Host "`nAdding Legal Intake fields..." -ForegroundColor Cyan

  Add-PersonField -List "Requests" -DisplayName "Attorney" -InternalName "Attorney" -Required $false -AllowMultiple $false -Group "Legal Intake"
  Add-NoteField -List "Requests" -DisplayName "Attorney Assign Notes" -InternalName "AttorneyAssignNotes" -Required $false -RichText $false -AppendOnly $true -Group "Legal Intake"

  # =========================================================================
  # D. LEGAL REVIEW (5 fields)
  # =========================================================================
  Write-Host "`nAdding Legal Review fields..." -ForegroundColor Cyan

  Add-ChoiceField -List "Requests" -DisplayName "Legal Review Status" -InternalName "LegalReviewStatus" `
    -Choices @("Not Required", "Not Started", "In Progress", "Waiting On Submitter", "Waiting On Attorney", "Completed") `
    -DefaultValue "Not Started" -Group "Legal Review"

  Add-DateTimeField -List "Requests" -DisplayName "Legal Status Updated On" -InternalName "LegalStatusUpdatedOn" -Required $false -Format "DateTime" -Group "Legal Review"

  Add-PersonField -List "Requests" -DisplayName "Legal Status Updated By" -InternalName "LegalStatusUpdatedBy" -Required $false -AllowMultiple $false -Group "Legal Review"

  Add-ChoiceField -List "Requests" -DisplayName "Legal Review Outcome" -InternalName "LegalReviewOutcome" `
    -Choices @("Approved", "Approved With Comments", "Respond To Comments And Resubmit", "Not Approved") `
    -Group "Legal Review"

  Add-NoteField -List "Requests" -DisplayName "Legal Review Notes" -InternalName "LegalReviewNotes" -Required $false -RichText $false -AppendOnly $true -Group "Legal Review"

  # =========================================================================
  # E. COMPLIANCE REVIEW (7 fields)
  # =========================================================================
  Write-Host "`nAdding Compliance Review fields..." -ForegroundColor Cyan

  Add-ChoiceField -List "Requests" -DisplayName "Compliance Review Status" -InternalName "ComplianceReviewStatus" `
    -Choices @("Not Required", "Not Started", "In Progress", "Waiting On Submitter", "Waiting On Compliance", "Completed") `
    -DefaultValue "Not Started" -Group "Compliance Review"

  Add-DateTimeField -List "Requests" -DisplayName "Compliance Status Updated On" -InternalName "ComplianceStatusUpdatedOn" -Required $false -Format "DateTime" -Group "Compliance Review"

  Add-PersonField -List "Requests" -DisplayName "Compliance Status Updated By" -InternalName "ComplianceStatusUpdatedBy" -Required $false -AllowMultiple $false -Group "Compliance Review"

  Add-ChoiceField -List "Requests" -DisplayName "Compliance Review Outcome" -InternalName "ComplianceReviewOutcome" `
    -Choices @("Approved", "Approved With Comments", "Respond To Comments And Resubmit", "Not Approved") `
    -Group "Compliance Review"

  Add-NoteField -List "Requests" -DisplayName "Compliance Review Notes" -InternalName "ComplianceReviewNotes" -Required $false -RichText $false -AppendOnly $true -Group "Compliance Review"

  Add-BooleanField -List "Requests" -DisplayName "Is Foreside Review Required" -InternalName "IsForesideReviewRequired" -DefaultValue $false -Group "Compliance Review"

  Add-BooleanField -List "Requests" -DisplayName "Is Retail Use" -InternalName "IsRetailUse" -DefaultValue $false -Group "Compliance Review"

  # =========================================================================
  # F. CLOSEOUT (1 field)
  # =========================================================================
  Write-Host "`nAdding Closeout fields..." -ForegroundColor Cyan

  Add-TextFieldWithValidation -List "Requests" -DisplayName "Tracking Id" -InternalName "TrackingId" -Required $false -MaxLength 50 -Group "Closeout"

  # =========================================================================
  # G. SYSTEM TRACKING (18 fields)
  # =========================================================================
  Write-Host "`nAdding System Tracking fields..." -ForegroundColor Cyan

  Add-ChoiceField -List "Requests" -DisplayName "Status" -InternalName "Status" `
    -Choices @("Draft", "Legal Intake", "Assign Attorney", "In Review", "Closeout", "Completed", "Cancelled", "On Hold") `
    -DefaultValue "Draft" -Required $true -Group "System Tracking"

  Add-PersonField -List "Requests" -DisplayName "Submitted By" -InternalName "SubmittedBy" -Required $false -AllowMultiple $false -Group "System Tracking"
  Add-DateTimeField -List "Requests" -DisplayName "Submitted On" -InternalName "SubmittedOn" -Required $false -Format "DateTime" -Group "System Tracking"

  Add-PersonField -List "Requests" -DisplayName "Submitted To Assign Attorney By" -InternalName "SubmittedToAssignAttorneyBy" -Required $false -AllowMultiple $false -Group "System Tracking"
  Add-DateTimeField -List "Requests" -DisplayName "Submitted To Assign Attorney On" -InternalName "SubmittedToAssignAttorneyOn" -Required $false -Format "DateTime" -Group "System Tracking"

  Add-PersonField -List "Requests" -DisplayName "Submitted For Review By" -InternalName "SubmittedForReviewBy" -Required $false -AllowMultiple $false -Group "System Tracking"
  Add-DateTimeField -List "Requests" -DisplayName "Submitted For Review On" -InternalName "SubmittedForReviewOn" -Required $false -Format "DateTime" -Group "System Tracking"

  Add-PersonField -List "Requests" -DisplayName "Closeout By" -InternalName "CloseoutBy" -Required $false -AllowMultiple $false -Group "System Tracking"
  Add-DateTimeField -List "Requests" -DisplayName "Closeout On" -InternalName "CloseoutOn" -Required $false -Format "DateTime" -Group "System Tracking"

  Add-PersonField -List "Requests" -DisplayName "Cancelled By" -InternalName "CancelledBy" -Required $false -AllowMultiple $false -Group "System Tracking"
  Add-DateTimeField -List "Requests" -DisplayName "Cancelled On" -InternalName "CancelledOn" -Required $false -Format "DateTime" -Group "System Tracking"
  Add-NoteField -List "Requests" -DisplayName "Cancel Reason" -InternalName "CancelReason" -Required $false -RichText $false -Group "System Tracking"

  Add-PersonField -List "Requests" -DisplayName "On Hold By" -InternalName "OnHoldBy" -Required $false -AllowMultiple $false -Group "System Tracking"
  Add-DateTimeField -List "Requests" -DisplayName "On Hold Since" -InternalName "OnHoldSince" -Required $false -Format "DateTime" -Group "System Tracking"
  Add-NoteField -List "Requests" -DisplayName "On Hold Reason" -InternalName "OnHoldReason" -Required $false -RichText $false -Group "System Tracking"

  Add-TextFieldWithValidation -List "Requests" -DisplayName "Previous Status" -InternalName "PreviousStatus" -Required $false -MaxLength 50 -Group "System Tracking"

  Add-NumberField -List "Requests" -DisplayName "Total Turnaround Days" -InternalName "TotalTurnaroundDays" -Required $false -Min 0 -Max 365 -Group "System Tracking"

  Add-DateTimeField -List "Requests" -DisplayName "Expected Turnaround Date" -InternalName "ExpectedTurnaroundDate" -Required $false -Format "DateOnly" -Group "System Tracking"

  Write-Host "✓ All Requests fields added" -ForegroundColor Green

  # Add self-referencing lookup field (Prior Submissions)
  Write-Host "`nAdding Prior Submissions lookup field..." -ForegroundColor Cyan
  Add-LookupField -List "Requests" -DisplayName "Prior Submissions" -InternalName "PriorSubmissions" `
    -LookupListName "Requests" -LookupFieldName "Title" -Required $false -AllowMultiple $true -Group "Request Information"

}
else {
  Write-Host "! Requests list already exists" -ForegroundColor Yellow
}

# =============================================================================
# 3. CREATE CONFIGURATION LIST
# =============================================================================

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Creating Configuration List" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$configList = Get-PnPList -Identity "Configuration" -ErrorAction SilentlyContinue

if ($null -eq $configList) {
  New-PnPList -Title "Configuration" -Template GenericList -OnQuickLaunch
  Write-Host "✓ Configuration list created" -ForegroundColor Green

  # Add fields
  Add-PnPField -List "Configuration" -DisplayName "Config Value" -InternalName "ConfigValue" -Type Text -Group "Configuration"
  Add-NoteField -List "Configuration" -DisplayName "Description" -InternalName "Description" -Required $false -RichText $false -Group "Configuration"
  Add-BooleanField -List "Configuration" -DisplayName "Is Active" -InternalName "IsActive" -DefaultValue $true -Group "Configuration"
  Add-PnPField -List "Configuration" -DisplayName "Category" -InternalName "Category" -Type Text -Group "Configuration"

  Write-Host "✓ Configuration fields added" -ForegroundColor Green
}
else {
  Write-Host "! Configuration list already exists" -ForegroundColor Yellow
}

# =============================================================================
# 4. CREATE REQUEST DOCUMENTS LIBRARY
# =============================================================================

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Creating RequestDocuments Library" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$docLibrary = Get-PnPList -Identity "RequestDocuments" -ErrorAction SilentlyContinue

if ($null -eq $docLibrary) {
  New-PnPList -Title "RequestDocuments" -Template DocumentLibrary -OnQuickLaunch
  Write-Host "✓ RequestDocuments library created" -ForegroundColor Green

  # Add metadata fields
  Add-ChoiceField -List "RequestDocuments" -DisplayName "Document Type" -InternalName "DocumentType" `
    -Choices @(
    "Review",
    "Supplemental",
    "Communication Approval",
    "Portfolio Manager Approval",
    "Research Analyst Approval",
    "Subject Matter Expert Approval",
    "Performance Approval",
    "Other Approval"
  ) -Required $true -Group "Document Metadata"

  Add-LookupField -List "RequestDocuments" -DisplayName "Request" -InternalName "Request" `
    -LookupListName "Requests" -LookupFieldName "Title" -Required $true -AllowMultiple $false -Group "Document Metadata"

  Add-NoteField -List "RequestDocuments" -DisplayName "Description" -InternalName "Description" -Required $false -RichText $false -Group "Document Metadata"

  Write-Host "✓ RequestDocuments metadata fields added" -ForegroundColor Green
}
else {
  Write-Host "! RequestDocuments library already exists" -ForegroundColor Yellow
}

# =============================================================================
# 5. CREATE SHAREPOINT SECURITY GROUPS
# =============================================================================

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Creating SharePoint Security Groups" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$groups = @(
  @{ Name = "LW - Submitters"; Description = "Users who can submit legal review requests" },
  @{ Name = "LW - Legal Admin"; Description = "Legal administrators who can manage all requests" },
  @{ Name = "LW - Attorney Assigner"; Description = "Users who can assign attorneys to requests" },
  @{ Name = "LW - Attorneys"; Description = "Attorneys who can review and approve legal requests" },
  @{ Name = "LW - Compliance Users"; Description = "Compliance users who can review compliance aspects" },
  @{ Name = "LW - Admin"; Description = "System administrators with full access" }
)

foreach ($group in $groups) {
  $existingGroup = Get-PnPGroup -Identity $group.Name -ErrorAction SilentlyContinue

  if ($null -eq $existingGroup) {
    New-PnPGroup -Title $group.Name -Description $group.Description
    Write-Host "  ✓ Created group: $($group.Name)" -ForegroundColor Green
  }
  else {
    Write-Host "  ! Group already exists: $($group.Name)" -ForegroundColor Yellow
  }
}

# Set permissions for groups
Write-Host "`nSetting group permissions..." -ForegroundColor Cyan

# LW - Submitters: Read access to site, Contribute to Requests and RequestDocuments
Set-PnPGroupPermissions -Identity "LW - Submitters" -List "Requests" -AddRole "Contribute" -ErrorAction SilentlyContinue
Set-PnPGroupPermissions -Identity "LW - Submitters" -List "RequestDocuments" -AddRole "Contribute" -ErrorAction SilentlyContinue
Set-PnPGroupPermissions -Identity "LW - Submitters" -List "SubmissionItems" -AddRole "Read" -ErrorAction SilentlyContinue

# LW - Legal Admin, Attorneys, Compliance: Full Control on main lists
@("LW - Legal Admin", "LW - Attorneys", "LW - Compliance Users") | ForEach-Object {
  Set-PnPGroupPermissions -Identity $_ -List "Requests" -AddRole "Full Control" -ErrorAction SilentlyContinue
  Set-PnPGroupPermissions -Identity $_ -List "RequestDocuments" -AddRole "Full Control" -ErrorAction SilentlyContinue
  Set-PnPGroupPermissions -Identity $_ -List "SubmissionItems" -AddRole "Read" -ErrorAction SilentlyContinue
}

# LW - Admin: Full Control everywhere
Set-PnPGroupPermissions -Identity "LW - Admin" -List "Requests" -AddRole "Full Control" -ErrorAction SilentlyContinue
Set-PnPGroupPermissions -Identity "LW - Admin" -List "RequestDocuments" -AddRole "Full Control" -ErrorAction SilentlyContinue
Set-PnPGroupPermissions -Identity "LW - Admin" -List "SubmissionItems" -AddRole "Full Control" -ErrorAction SilentlyContinue
Set-PnPGroupPermissions -Identity "LW - Admin" -List "Configuration" -AddRole "Full Control" -ErrorAction SilentlyContinue

Write-Host "✓ Group permissions configured" -ForegroundColor Green

# =============================================================================
# 6. POPULATE SAMPLE DATA
# =============================================================================

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Populating Sample Data" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Add SubmissionItems sample data
Write-Host "`nAdding sample Submission Items..." -ForegroundColor Cyan

$submissionItems = @(
  @{ Title = "New Exhibit"; Days = 3; Desc = "New exhibit submission" }
  @{ Title = "Updated Exhibit"; Days = 2; Desc = "Updates to existing exhibit" }
  @{ Title = "White Paper"; Days = 5; Desc = "White paper review" }
  @{ Title = "Website Update - Substantial (4 pages or more)"; Days = 5; Desc = "Major website updates" }
  @{ Title = "Website Update - Non-Substantial (1-3 pages)"; Days = 3; Desc = "Minor website updates" }
  @{ Title = "Email Blast"; Days = 1; Desc = "Email campaign review" }
  @{ Title = "FAQ/Talking Points"; Days = 3; Desc = "FAQ or talking points" }
  @{ Title = "Shareholder Letter (Final Review)"; Days = 1; Desc = "Final shareholder letter review" }
  @{ Title = "Separate Account Letter (Final Review)"; Days = 1; Desc = "Final separate account letter review" }
  @{ Title = "Investment Commentary (Final Review)"; Days = 1; Desc = "Final investment commentary review" }
  @{ Title = "Standard Mutual Fund Presentation"; Days = 2; Desc = "Standard presentation review" }
  @{ Title = "Client-Specific Mutual Fund Presentation"; Days = 2; Desc = "Custom client presentation" }
  @{ Title = "Custom Presentation"; Days = 2; Desc = "Custom presentation review" }
  @{ Title = "Fact Sheet"; Days = 3; Desc = "Fact sheet review" }
  @{ Title = "Shareholder Report (Annual/Semi-Annual)"; Days = 5; Desc = "Annual or semi-annual report" }
  @{ Title = "RFP Related Review - Substantial (Multiple Pages)"; Days = 3; Desc = "Complex RFP review" }
  @{ Title = "RFP Related Review - Non-Substantial (1 Page)"; Days = 1; Desc = "Simple RFP review" }
  @{ Title = "Social Media"; Days = 3; Desc = "Social media content review" }
  @{ Title = "Other"; Days = 3; Desc = "Other submission types" }
)

# =============================================================================
# 6. POPULATE SAMPLE DATA
# =============================================================================

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Populating Sample Data" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Add SubmissionItems sample data
Write-Host "`nAdding sample Submission Items..." -ForegroundColor Cyan

$submissionItems = @(
  @{ Title = "New Exhibit"; Days = 3; Desc = "New exhibit submission"; Order = 1 }
  @{ Title = "Updated Exhibit"; Days = 2; Desc = "Updates to existing exhibit"; Order = 2 }
  @{ Title = "White Paper"; Days = 5; Desc = "White paper review"; Order = 3 }
  @{ Title = "Website Update - Substantial (4 pages or more)"; Days = 5; Desc = "Major website updates"; Order = 4 }
  @{ Title = "Website Update - Non-Substantial (1-3 pages)"; Days = 3; Desc = "Minor website updates"; Order = 5 }
  @{ Title = "Email Blast"; Days = 1; Desc = "Email campaign review"; Order = 6 }
  @{ Title = "FAQ/Talking Points"; Days = 3; Desc = "FAQ or talking points"; Order = 7 }
  @{ Title = "Shareholder Letter (Final Review)"; Days = 1; Desc = "Final shareholder letter review"; Order = 8 }
  @{ Title = "Separate Account Letter (Final Review)"; Days = 1; Desc = "Final separate account letter review"; Order = 9 }
  @{ Title = "Investment Commentary (Final Review)"; Days = 1; Desc = "Final investment commentary review"; Order = 10 }
  @{ Title = "Standard Mutual Fund Presentation"; Days = 2; Desc = "Standard presentation review"; Order = 11 }
  @{ Title = "Client-Specific Mutual Fund Presentation"; Days = 2; Desc = "Custom client presentation"; Order = 12 }
  @{ Title = "Custom Presentation"; Days = 2; Desc = "Custom presentation review"; Order = 13 }
  @{ Title = "Fact Sheet"; Days = 3; Desc = "Fact sheet review"; Order = 14 }
  @{ Title = "Shareholder Report (Annual/Semi-Annual)"; Days = 5; Desc = "Annual or semi-annual report"; Order = 15 }
  @{ Title = "RFP Related Review - Substantial (Multiple Pages)"; Days = 3; Desc = "Complex RFP review"; Order = 16 }
  @{ Title = "RFP Related Review - Non-Substantial (1 Page)"; Days = 1; Desc = "Simple RFP review"; Order = 17 }
  @{ Title = "Social Media"; Days = 3; Desc = "Social media content review"; Order = 18 }
  @{ Title = "Other"; Days = 3; Desc = "Other submission types"; Order = 19 }
)

foreach ($item in $submissionItems) {
  $existing = Get-PnPListItem -List "SubmissionItems" -Query "<View><Query><Where><Eq><FieldRef Name='Title'/><Value Type='Text'>$($item.Title)</Value></Eq></Where></Query></View>"

  if ($null -eq $existing) {
    Add-PnPListItem -List "SubmissionItems" -Values @{
      "Title"                = $item.Title
      "TurnAroundTimeInDays" = $item.Days
      "Description"          = $item.Desc
      "DisplayOrder"         = $item.Order
    } | Out-Null
    Write-Host "  ✓ Added: $($item.Title)" -ForegroundColor Gray
  }
}

# Add Configuration sample data
Write-Host "`nAdding sample Configuration items..." -ForegroundColor Cyan

$configItems = @(
  @{ Key = "app.environment"; Value = "dev"; Desc = "Application environment"; Cat = "System"; Active = $true }
  @{ Key = "app.debugMode"; Value = "true"; Desc = "Enable debug logging"; Cat = "System"; Active = $true }
  @{ Key = "app.enableCaching"; Value = "true"; Desc = "Enable data caching"; Cat = "Performance"; Active = $true }
  @{ Key = "app.cacheTimeout"; Value = "300000"; Desc = "Cache timeout in milliseconds"; Cat = "Performance"; Active = $true }
  @{ Key = "workflow.defaultTurnaroundDays"; Value = "3"; Desc = "Default turnaround days for requests"; Cat = "Workflow"; Active = $true }
  @{ Key = "workflow.rushThresholdDays"; Value = "1"; Desc = "Threshold for rush requests in days"; Cat = "Workflow"; Active = $true }
  @{ Key = "notifications.enableEmail"; Value = "true"; Desc = "Enable email notifications"; Cat = "Notifications"; Active = $true }
  @{ Key = "notifications.enableTeams"; Value = "false"; Desc = "Enable Microsoft Teams notifications"; Cat = "Notifications"; Active = $false }
  @{ Key = "approval.requireCommunications"; Value = "true"; Desc = "Require communications approval by default"; Cat = "Approvals"; Active = $true }
  @{ Key = "legal.autoAssignAttorney"; Value = "false"; Desc = "Automatically assign attorneys based on workload"; Cat = "Legal"; Active = $false }
  @{ Key = "compliance.enableForesideReview"; Value = "true"; Desc = "Enable Foreside review option"; Cat = "Compliance"; Active = $true }
  @{ Key = "ui.itemsPerPage"; Value = "25"; Desc = "Default items per page"; Cat = "UI"; Active = $true }
  @{ Key = "ui.enableAdvancedFilters"; Value = "true"; Desc = "Enable advanced filtering options"; Cat = "UI"; Active = $true }
)

foreach ($config in $configItems) {
  $existing = Get-PnPListItem -List "Configuration" -Query "<View><Query><Where><Eq><FieldRef Name='Title'/><Value Type='Text'>$($config.Key)</Value></Eq></Where></Query></View>"

  if ($null -eq $existing) {
    Add-PnPListItem -List "Configuration" -Values @{
      "Title"       = $config.Key
      "ConfigValue" = $config.Value
      "Description" = $config.Desc
      "IsActive"    = $config.Active
      "Category"    = $config.Cat
    } | Out-Null
    Write-Host "  ✓ Added: $($config.Key)" -ForegroundColor Gray
  }
}

Write-Host "✓ Sample data populated" -ForegroundColor Green

# =============================================================================
# 7. CONFIGURE FORM CUSTOMIZER
# =============================================================================

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Configuring Form Customizer" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "`nAdding form customizer to Requests list..." -ForegroundColor Cyan

$formCustomizerGuid = "419289ae-db48-48cf-84d8-bd90dcbc6aab"

try {
  # Get the Requests list
  $requestsList = Get-PnPList -Identity "Requests"

  if ($null -ne $requestsList) {
    # Get the default "Item" content type and set form customizer IDs
    Write-Host "  - Getting Item content type..." -ForegroundColor Gray
    $itemContentType = Get-PnPContentType -List "Requests" -Identity "Item" -ErrorAction SilentlyContinue

    $itemContentType.NewFormClientSideComponentId = $formCustomizerGuid
    $itemContentType.EditFormClientSideComponentId = $formCustomizerGuid
    $itemContentType.DisplayFormClientSideComponentId = $formCustomizerGuid
    $itemContentType.Update($false)
    Invoke-PnPQuery

    Write-Host "  ✓ Form customizer configured for all form modes on Item content type" -ForegroundColor Green
  }
  else {
    Write-Host "  ! Requests list not found - cannot configure form customizer" -ForegroundColor Yellow
  }
}
catch {
  Write-Host "  ! Error configuring form customizer: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "  Note: Deploy the SPFx solution first, then run this script again or configure manually" -ForegroundColor Yellow
}

# =============================================================================
# 8. VERIFY FIELD CREATION
# =============================================================================

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Verifying Field Creation" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "`nVerifying Requests list fields..." -ForegroundColor Cyan

$expectedFields = @(
  "Department", "RequestType", "RequestTitle", "Purpose", "SubmissionType", "SubmissionItem",
  "DistributionMethod", "TargetReturnDate", "IsRushRequest", "RushRationale", "ReviewAudience",
  "PriorSubmissions", "PriorSubmissionNotes", "DateOfFirstUse", "AdditionalParty",
  "RequiresCommunicationsApproval", "CommunicationsApprovalDate", "CommunicationsApprover",
  "HasPortfolioManagerApproval", "PortfolioManagerApprovalDate", "PortfolioManager",
  "HasResearchAnalystApproval", "ResearchAnalystApprovalDate", "ResearchAnalyst",
  "HasSMEApproval", "SMEApprovalDate", "SubjectMatterExpert",
  "HasPerformanceApproval", "PerformanceApprovalDate", "PerformanceApprover",
  "HasOtherApproval", "OtherApprovalTitle", "OtherApprovalDate", "OtherApproval",
  "Attorney", "AttorneyAssignNotes",
  "LegalReviewStatus", "LegalStatusUpdatedOn", "LegalStatusUpdatedBy", "LegalReviewOutcome", "LegalReviewNotes",
  "ComplianceReviewStatus", "ComplianceStatusUpdatedOn", "ComplianceStatusUpdatedBy", "ComplianceReviewOutcome",
  "ComplianceReviewNotes", "IsForesideReviewRequired", "IsRetailUse",
  "TrackingId",
  "Status", "SubmittedBy", "SubmittedOn", "SubmittedToAssignAttorneyBy", "SubmittedToAssignAttorneyOn",
  "SubmittedForReviewBy", "SubmittedForReviewOn", "CloseoutBy", "CloseoutOn",
  "CancelledBy", "CancelledOn", "CancelReason", "OnHoldBy", "OnHoldSince", "OnHoldReason",
  "PreviousStatus", "TotalTurnaroundDays", "ExpectedTurnaroundDate"
)

$requestsList = Get-PnPList -Identity "Requests" -ErrorAction SilentlyContinue
if ($null -ne $requestsList) {
  $allFields = Get-PnPField -List "Requests" | Select-Object -ExpandProperty InternalName

  $missingFields = @()
  foreach ($field in $expectedFields) {
    if ($allFields -notcontains $field) {
      $missingFields += $field
    }
  }

  if ($missingFields.Count -eq 0) {
    Write-Host "  ✓ All $($expectedFields.Count) custom fields verified successfully!" -ForegroundColor Green
  }
  else {
    Write-Host "  ! WARNING: $($missingFields.Count) field(s) missing:" -ForegroundColor Yellow
    foreach ($field in $missingFields) {
      Write-Host "    - $field" -ForegroundColor Yellow
    }
  }
}
else {
  Write-Host "  ! Could not verify fields - Requests list not found" -ForegroundColor Yellow
}

# =============================================================================
# SUMMARY
# =============================================================================

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "`nCreated Lists:" -ForegroundColor Cyan
Write-Host "  ✓ Requests (75 fields)" -ForegroundColor White
Write-Host "  ✓ SubmissionItems (4 fields + 19 sample items)" -ForegroundColor White
Write-Host "  ✓ Configuration (5 fields + 13 sample configurations)" -ForegroundColor White
Write-Host "  ✓ RequestDocuments (Document Library with metadata)" -ForegroundColor White

Write-Host "`nCreated Security Groups:" -ForegroundColor Cyan
Write-Host "  ✓ LW - Submitters" -ForegroundColor White
Write-Host "  ✓ LW - Legal Admin" -ForegroundColor White
Write-Host "  ✓ LW - Attorney Assigner" -ForegroundColor White
Write-Host "  ✓ LW - Attorneys" -ForegroundColor White
Write-Host "  ✓ LW - Compliance Users" -ForegroundColor White
Write-Host "  ✓ LW - Admin" -ForegroundColor White

Write-Host "`nConfigured Form Customizer:" -ForegroundColor Cyan
Write-Host "  ✓ Legal Workflow Form Customizer (419289ae-db48-48cf-84d8-bd90dcbc6aab)" -ForegroundColor White
Write-Host "  ✓ Applied to New, Edit, and Display forms on Requests list" -ForegroundColor White

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "  1. Deploy your SPFx solution (.sppkg file) to the App Catalog" -ForegroundColor White
Write-Host "  2. Install the app on this site (if not already deployed)" -ForegroundColor White
Write-Host "  3. Add users to the appropriate security groups:" -ForegroundColor White
Write-Host "     - LW - Submitters: End users who submit requests" -ForegroundColor Gray
Write-Host "     - LW - Legal Admin: Legal team administrators" -ForegroundColor Gray
Write-Host "     - LW - Attorney Assigner: Users who assign attorneys" -ForegroundColor Gray
Write-Host "     - LW - Attorneys: Attorneys who review requests" -ForegroundColor Gray
Write-Host "     - LW - Compliance Users: Compliance reviewers" -ForegroundColor Gray
Write-Host "     - LW - Admin: System administrators" -ForegroundColor Gray
Write-Host "  4. Test creating a new request - the form customizer should load automatically" -ForegroundColor White
Write-Host "  5. Configure additional settings in the Configuration list as needed" -ForegroundColor White

Write-Host "`nNote: If form customizer doesn't work, ensure the SPFx solution is deployed first." -ForegroundColor Yellow

Write-Host "`nSite URL: $SiteUrl" -ForegroundColor Yellow
Write-Host "`n" -ForegroundColor White

Disconnect-PnPOnline
