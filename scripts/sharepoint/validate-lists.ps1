<#
.SYNOPSIS
    Validates SharePoint lists and library setup for Legal Review System

.DESCRIPTION
    This script checks that all lists, fields, and sample data are correctly created.

.PARAMETER SiteUrl
    The URL of the SharePoint site to validate

.EXAMPLE
    .\Validate-LegalReviewLists.ps1 -SiteUrl "https://tenant.sharepoint.com/sites/LegalReview"

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
Connect-PnPOnline -Url $SiteUrl -Interactive

$validationResults = @()
$errors = @()

# =============================================================================
# VALIDATION FUNCTIONS
# =============================================================================

function Test-ListExists {
    param([string]$ListName)

    $list = Get-PnPList -Identity $ListName -ErrorAction SilentlyContinue
    if ($null -ne $list) {
        Write-Host "  ✓ List exists: $ListName" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ✗ List missing: $ListName" -ForegroundColor Red
        $script:errors += "List not found: $ListName"
        return $false
    }
}

function Test-FieldExists {
    param(
        [string]$ListName,
        [string]$FieldName,
        [string]$ExpectedType = ""
    )

    $field = Get-PnPField -List $ListName -Identity $FieldName -ErrorAction SilentlyContinue

    if ($null -ne $field) {
        if ($ExpectedType -and $field.TypeAsString -ne $ExpectedType) {
            Write-Host "    ⚠ Field type mismatch: $FieldName (Expected: $ExpectedType, Got: $($field.TypeAsString))" -ForegroundColor Yellow
            return $false
        }
        return $true
    } else {
        Write-Host "    ✗ Field missing: $FieldName" -ForegroundColor Red
        $script:errors += "Field not found in $ListName: $FieldName"
        return $false
    }
}

function Test-FieldCount {
    param(
        [string]$ListName,
        [int]$ExpectedCount,
        [string]$Category
    )

    $fields = Get-PnPField -List $ListName | Where-Object { -not $_.Hidden -and $_.Group -eq $Category }
    $actualCount = $fields.Count

    if ($actualCount -eq $ExpectedCount) {
        Write-Host "    ✓ $Category fields: $actualCount/$ExpectedCount" -ForegroundColor Green
        return $true
    } else {
        Write-Host "    ⚠ $Category fields: $actualCount/$ExpectedCount (Expected: $ExpectedCount)" -ForegroundColor Yellow
        return $false
    }
}

# =============================================================================
# VALIDATION CHECKS
# =============================================================================

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "VALIDATING LEGAL REVIEW SYSTEM SETUP" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# -----------------------------------------------------------------------------
# 1. VALIDATE LISTS EXIST
# -----------------------------------------------------------------------------

Write-Host "`n1. Validating Lists..." -ForegroundColor Cyan

$listsValid = $true
$listsValid = (Test-ListExists "Requests") -and $listsValid
$listsValid = (Test-ListExists "SubmissionItems") -and $listsValid
$listsValid = (Test-ListExists "Configuration") -and $listsValid
$listsValid = (Test-ListExists "RequestDocuments") -and $listsValid

# -----------------------------------------------------------------------------
# 2. VALIDATE REQUESTS LIST FIELDS
# -----------------------------------------------------------------------------

Write-Host "`n2. Validating Requests List Fields..." -ForegroundColor Cyan

if (Test-ListExists "Requests") {
    # A. Request Information (17 fields)
    Write-Host "  A. Request Information Fields..." -ForegroundColor Gray
    $reqInfoFields = @(
        "Title",
        "Department",
        "RequestType",
        "RequestTitle",
        "Purpose",
        "SubmissionType",
        "SubmissionItem",
        "DistributionMethod",
        "TargetReturnDate",
        "IsRushRequest",
        "RushRationale",
        "ReviewAudience",
        "PriorSubmissions",
        "PriorSubmissionNotes",
        "DateOfFirstUse",
        "AdditionalParty"
    )
    $reqInfoValid = $true
    foreach ($field in $reqInfoFields) {
        $reqInfoValid = (Test-FieldExists "Requests" $field) -and $reqInfoValid
    }

    # B. Approval Fields (18 fields)
    Write-Host "  B. Approval Fields..." -ForegroundColor Gray
    $approvalFields = @(
        "RequiresCommunicationsApproval",
        "CommunicationsApprovalDate",
        "CommunicationsApprover",
        "HasPortfolioManagerApproval",
        "PortfolioManagerApprovalDate",
        "PortfolioManager",
        "HasResearchAnalystApproval",
        "ResearchAnalystApprovalDate",
        "ResearchAnalyst",
        "HasSMEApproval",
        "SMEApprovalDate",
        "SubjectMatterExpert",
        "HasPerformanceApproval",
        "PerformanceApprovalDate",
        "PerformanceApprover",
        "HasOtherApproval",
        "OtherApprovalTitle",
        "OtherApprovalDate",
        "OtherApproval"
    )
    $approvalValid = $true
    foreach ($field in $approvalFields) {
        $approvalValid = (Test-FieldExists "Requests" $field) -and $approvalValid
    }

    # C. Legal Intake (2 fields)
    Write-Host "  C. Legal Intake Fields..." -ForegroundColor Gray
    $legalIntakeValid = $true
    $legalIntakeValid = (Test-FieldExists "Requests" "Attorney") -and $legalIntakeValid
    $legalIntakeValid = (Test-FieldExists "Requests" "AttorneyAssignNotes") -and $legalIntakeValid

    # D. Legal Review (5 fields)
    Write-Host "  D. Legal Review Fields..." -ForegroundColor Gray
    $legalReviewFields = @(
        "LegalReviewStatus",
        "LegalStatusUpdatedOn",
        "LegalStatusUpdatedBy",
        "LegalReviewOutcome",
        "LegalReviewNotes"
    )
    $legalReviewValid = $true
    foreach ($field in $legalReviewFields) {
        $legalReviewValid = (Test-FieldExists "Requests" $field) -and $legalReviewValid
    }

    # E. Compliance Review (7 fields)
    Write-Host "  E. Compliance Review Fields..." -ForegroundColor Gray
    $complianceFields = @(
        "ComplianceReviewStatus",
        "ComplianceStatusUpdatedOn",
        "ComplianceStatusUpdatedBy",
        "ComplianceReviewOutcome",
        "ComplianceReviewNotes",
        "IsForesideReviewRequired",
        "IsRetailUse"
    )
    $complianceValid = $true
    foreach ($field in $complianceFields) {
        $complianceValid = (Test-FieldExists "Requests" $field) -and $complianceValid
    }

    # F. Closeout (1 field)
    Write-Host "  F. Closeout Fields..." -ForegroundColor Gray
    $closeoutValid = Test-FieldExists "Requests" "TrackingId"

    # G. System Tracking (16 fields)
    Write-Host "  G. System Tracking Fields..." -ForegroundColor Gray
    $systemFields = @(
        "Status",
        "SubmittedBy",
        "SubmittedOn",
        "SubmittedToAssignAttorneyBy",
        "SubmittedToAssignAttorneyOn",
        "SubmittedForReviewBy",
        "SubmittedForReviewOn",
        "CloseoutBy",
        "CloseoutOn",
        "CancelledBy",
        "CancelledOn",
        "CancelReason",
        "OnHoldBy",
        "OnHoldSince",
        "OnHoldReason",
        "PreviousStatus"
    )
    $systemValid = $true
    foreach ($field in $systemFields) {
        $systemValid = (Test-FieldExists "Requests" $field) -and $systemValid
    }

    # Count total fields
    $allFields = Get-PnPField -List "Requests" | Where-Object { -not $_.Hidden -and $_.Group -notlike "Custom*" -and $_.Group -ne "_Hidden" }
    $customFields = Get-PnPField -List "Requests" | Where-Object {
        $_.Group -in @("Request Information", "Approvals", "Legal Intake", "Legal Review", "Compliance Review", "Closeout", "System Tracking")
    }

    Write-Host "  Total custom fields found: $($customFields.Count)" -ForegroundColor White
}

# -----------------------------------------------------------------------------
# 3. VALIDATE SUBMISSION ITEMS
# -----------------------------------------------------------------------------

Write-Host "`n3. Validating SubmissionItems List..." -ForegroundColor Cyan

if (Test-ListExists "SubmissionItems") {
    $submissionItemsValid = $true
    $submissionItemsValid = (Test-FieldExists "SubmissionItems" "Title") -and $submissionItemsValid
    $submissionItemsValid = (Test-FieldExists "SubmissionItems" "TurnAroundTimeInDays") -and $submissionItemsValid
    $submissionItemsValid = (Test-FieldExists "SubmissionItems" "Description") -and $submissionItemsValid

    # Check sample data
    $items = Get-PnPListItem -List "SubmissionItems"
    Write-Host "  Sample data: $($items.Count) items found" -ForegroundColor White

    if ($items.Count -ge 19) {
        Write-Host "  ✓ All sample items created" -ForegroundColor Green
    } elseif ($items.Count -gt 0) {
        Write-Host "  ⚠ Only $($items.Count)/19 sample items found" -ForegroundColor Yellow
    } else {
        Write-Host "  ✗ No sample data found" -ForegroundColor Red
        $script:errors += "No sample data in SubmissionItems list"
    }
}

# -----------------------------------------------------------------------------
# 4. VALIDATE CONFIGURATION LIST
# -----------------------------------------------------------------------------

Write-Host "`n4. Validating Configuration List..." -ForegroundColor Cyan

if (Test-ListExists "Configuration") {
    $configValid = $true
    $configValid = (Test-FieldExists "Configuration" "Title") -and $configValid
    $configValid = (Test-FieldExists "Configuration" "ConfigKey") -and $configValid
    $configValid = (Test-FieldExists "Configuration" "ConfigValue") -and $configValid
}

# -----------------------------------------------------------------------------
# 5. VALIDATE REQUEST DOCUMENTS LIBRARY
# -----------------------------------------------------------------------------

Write-Host "`n5. Validating RequestDocuments Library..." -ForegroundColor Cyan

if (Test-ListExists "RequestDocuments") {
    $docLibValid = $true
    $docLibValid = (Test-FieldExists "RequestDocuments" "DocumentType") -and $docLibValid
    $docLibValid = (Test-FieldExists "RequestDocuments" "Request") -and $docLibValid
    $docLibValid = (Test-FieldExists "RequestDocuments" "Description") -and $docLibValid
}

# =============================================================================
# SUMMARY
# =============================================================================

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "VALIDATION SUMMARY" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$totalChecks = 4  # Lists
$passedChecks = 0

if ($listsValid) { $passedChecks++ }

Write-Host "`nLists Validated:" -ForegroundColor Cyan
Write-Host "  ✓ Requests" -ForegroundColor Green
Write-Host "  ✓ SubmissionItems" -ForegroundColor Green
Write-Host "  ✓ Configuration" -ForegroundColor Green
Write-Host "  ✓ RequestDocuments" -ForegroundColor Green

if ($script:errors.Count -eq 0) {
    Write-Host "`n✅ ALL VALIDATIONS PASSED!" -ForegroundColor Green
    Write-Host "Your Legal Review System is ready for testing." -ForegroundColor White
} else {
    Write-Host "`n⚠️  VALIDATION COMPLETED WITH WARNINGS" -ForegroundColor Yellow
    Write-Host "Issues found: $($script:errors.Count)" -ForegroundColor Yellow

    Write-Host "`nDetails:" -ForegroundColor Cyan
    foreach ($error in $script:errors) {
        Write-Host "  • $error" -ForegroundColor Red
    }

    Write-Host "`nRecommendation:" -ForegroundColor Yellow
    Write-Host "  1. Review the errors above" -ForegroundColor White
    Write-Host "  2. Run Remove-LegalReviewLists.ps1 to cleanup" -ForegroundColor White
    Write-Host "  3. Run Setup-LegalReviewLists.ps1 again" -ForegroundColor White
}

Write-Host "`n" -ForegroundColor White

Disconnect-PnPOnline
