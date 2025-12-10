<#
.SYNOPSIS
    Remove Legal Workflow System provisioned resources

.DESCRIPTION
    Removes all resources provisioned by the Legal Workflow System template,
    including lists, libraries, pages, security groups, and custom permission levels.

    WARNING: This script will permanently delete all data in the Legal Workflow lists.
    Use with caution!

.PARAMETER SiteUrl
    The URL of the SharePoint site where the template was applied.
    Example: https://tenant.sharepoint.com/sites/LegalWorkflow

.PARAMETER Force
    Skip confirmation prompts and remove all resources immediately.
    Use with extreme caution!

.EXAMPLE
    .\Remove-LegalWorkflow.ps1 -SiteUrl "https://contoso.sharepoint.com/sites/LegalWorkflow"

.EXAMPLE
    .\Remove-LegalWorkflow.ps1 -SiteUrl "https://contoso.sharepoint.com/sites/LegalWorkflow" -Force

.NOTES
    Requires PnP.PowerShell module
    Run: Install-Module -Name PnP.PowerShell -Scope CurrentUser
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, HelpMessage = "SharePoint site URL")]
    [ValidateNotNullOrEmpty()]
    [string]$SiteUrl,

    [Parameter(Mandatory = $false)]
    [switch]$Force
)

# Client ID for PnP authentication
$clientId = "970bb320-0d49-4b4a-aa8f-c3f4b1e5928f"

# Error handling
$ErrorActionPreference = "Stop"

# Resources to remove (in reverse dependency order)
$listsToRemove = @("RequestDocuments", "Requests", "Configuration", "SubmissionItems")
$pagesToRemove = @(
    "MyRequestsDashboard.aspx",
    "LegalAdminDashboard.aspx",
    "AttorneyAssignmentDashboard.aspx",
    "AttorneyDashboard.aspx",
    "ComplianceDashboard.aspx"
)
$groupsToRemove = @(
    "LW - Admin",
    "LW - Legal Admin",
    "LW - Attorney Assigner",
    "LW - Attorneys",
    "LW - Compliance Users",
    "LW - Submitters"
)
$permissionLevelsToRemove = @(
    "Admin Without Delete",
    "Contributor Without Delete"
)

try {
    Write-Host "======================================================================" -ForegroundColor Red
    Write-Host "Legal Workflow System - REMOVAL SCRIPT" -ForegroundColor Red
    Write-Host "======================================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "WARNING: This will permanently delete:" -ForegroundColor Yellow
    Write-Host "  - All requests and associated data" -ForegroundColor Yellow
    Write-Host "  - All document libraries" -ForegroundColor Yellow
    Write-Host "  - Dashboard pages" -ForegroundColor Yellow
    Write-Host "  - Security groups and custom permissions" -ForegroundColor Yellow
    Write-Host ""

    if (-not $Force) {
        $confirmation = Read-Host "Type 'DELETE' to confirm removal"
        if ($confirmation -ne "DELETE") {
            Write-Host "Removal cancelled." -ForegroundColor Green
            exit 0
        }
    }

    Write-Host ""
    Write-Host "Site URL: $SiteUrl" -ForegroundColor White
    Write-Host ""

    # Connect to SharePoint
    Write-Host "[1/5] Connecting to SharePoint..." -ForegroundColor Cyan
    Connect-PnPOnline -Url $SiteUrl -ClientId $clientId -Interactive
    Write-Host "✓ Connected successfully" -ForegroundColor Green
    Write-Host ""

    # Remove Dashboard Pages
    Write-Host "[2/5] Removing dashboard pages..." -ForegroundColor Cyan
    foreach ($page in $pagesToRemove) {
        try {
            $existingPage = Get-PnPPage -Identity $page -ErrorAction SilentlyContinue
            if ($existingPage) {
                Remove-PnPPage -Identity $page -Force
                Write-Host "  ✓ Removed page: $page" -ForegroundColor Gray
            }
        } catch {
            Write-Warning "  Could not remove page $page : $($_.Exception.Message)"
        }
    }
    Write-Host "✓ Dashboard pages processed" -ForegroundColor Green
    Write-Host ""

    # Remove Lists and Libraries
    Write-Host "[3/5] Removing lists and libraries..." -ForegroundColor Cyan
    foreach ($listTitle in $listsToRemove) {
        try {
            $list = Get-PnPList -Identity $listTitle -ErrorAction SilentlyContinue
            if ($list) {
                Remove-PnPList -Identity $listTitle -Force
                Write-Host "  ✓ Removed list: $listTitle" -ForegroundColor Gray
            }
        } catch {
            Write-Warning "  Could not remove list $listTitle : $($_.Exception.Message)"
        }
    }
    Write-Host "✓ Lists and libraries processed" -ForegroundColor Green
    Write-Host ""

    # Remove Security Groups
    Write-Host "[4/5] Removing security groups..." -ForegroundColor Cyan
    foreach ($groupName in $groupsToRemove) {
        try {
            $group = Get-PnPGroup -Identity $groupName -ErrorAction SilentlyContinue
            if ($group) {
                Remove-PnPGroup -Identity $groupName -Force
                Write-Host "  ✓ Removed group: $groupName" -ForegroundColor Gray
            }
        } catch {
            Write-Warning "  Could not remove group $groupName : $($_.Exception.Message)"
        }
    }
    Write-Host "✓ Security groups processed" -ForegroundColor Green
    Write-Host ""

    # Remove Custom Permission Levels
    Write-Host "[5/5] Removing custom permission levels..." -ForegroundColor Cyan
    foreach ($permLevel in $permissionLevelsToRemove) {
        try {
            $role = Get-PnPRoleDefinition -Identity $permLevel -ErrorAction SilentlyContinue
            if ($role) {
                Remove-PnPRoleDefinition -Identity $permLevel -Force
                Write-Host "  ✓ Removed permission level: $permLevel" -ForegroundColor Gray
            }
        } catch {
            Write-Warning "  Could not remove permission level $permLevel : $($_.Exception.Message)"
        }
    }
    Write-Host "✓ Custom permission levels processed" -ForegroundColor Green
    Write-Host ""

    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host "Removal completed!" -ForegroundColor Green
    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Legal Workflow System resources have been removed from the site." -ForegroundColor White
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Red
    Write-Host "Removal failed!" -ForegroundColor Red
    Write-Host "======================================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Stack Trace:" -ForegroundColor Yellow
    Write-Host $_.ScriptStackTrace -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Some resources may have been partially removed." -ForegroundColor Yellow
    Write-Host "Please check the site and manually remove any remaining resources." -ForegroundColor Yellow
    Write-Host ""
    exit 1
} finally {
    # Disconnect
    if (Get-PnPConnection -ErrorAction SilentlyContinue) {
        Disconnect-PnPOnline
        Write-Host "Disconnected from SharePoint" -ForegroundColor Gray
    }
}
