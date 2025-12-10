<#
.SYNOPSIS
    Deploy Legal Workflow System provisioning template

.DESCRIPTION
    Applies the complete PnP provisioning template to a SharePoint site,
    including lists, security, pages, and navigation.

.PARAMETER SiteUrl
    The URL of the SharePoint site where the template will be applied.
    Example: https://tenant.sharepoint.com/sites/LegalWorkflow

.PARAMETER TemplatePath
    Optional. Path to the provisioning template file.
    Default: ./SiteTemplate.xml

.EXAMPLE
    .\Deploy-All.ps1 -SiteUrl "https://contoso.sharepoint.com/sites/LegalWorkflow"

.EXAMPLE
    .\Deploy-All.ps1 -SiteUrl "https://contoso.sharepoint.com/sites/LegalWorkflow" -TemplatePath "./Custom Template.xml"

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
    [string]$TemplatePath = "./SiteTemplate.xml"
)

# Client ID for PnP authentication
$clientId = "970bb320-0d49-4b4a-aa8f-c3f4b1e5928f"

# Error handling
$ErrorActionPreference = "Stop"

try {
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host "Legal Workflow System - Provisioning Deployment" -ForegroundColor Cyan
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host ""

    # Verify template file exists
    if (-not (Test-Path $TemplatePath)) {
        throw "Template file not found: $TemplatePath"
    }

    Write-Host "Site URL: $SiteUrl" -ForegroundColor White
    Write-Host "Template: $TemplatePath" -ForegroundColor White
    Write-Host ""

    # Connect to SharePoint
    Write-Host "[1/3] Connecting to SharePoint..." -ForegroundColor Cyan
    Connect-PnPOnline -Url $SiteUrl -ClientId $clientId -Interactive
    Write-Host "✓ Connected successfully" -ForegroundColor Green
    Write-Host ""

    # Apply provisioning template
    Write-Host "[2/3] Applying provisioning template..." -ForegroundColor Cyan
    Write-Host "This may take several minutes..." -ForegroundColor Yellow
    Invoke-PnPSiteTemplate -Path $TemplatePath
    Write-Host "✓ Template applied successfully" -ForegroundColor Green
    Write-Host ""

    # Verify deployment
    Write-Host "[3/3] Verifying deployment..." -ForegroundColor Cyan

    # Check if Requests list exists
    $requestsList = Get-PnPList -Identity "Lists/Requests" -ErrorAction SilentlyContinue
    if ($requestsList) {
        Write-Host "✓ Requests list provisioned" -ForegroundColor Green
    } else {
        Write-Warning "Requests list not found"
    }

    # Check if dashboard pages exist
    $myRequestsPage = Get-PnPPage -Identity "MyRequestsDashboard.aspx" -ErrorAction SilentlyContinue
    if ($myRequestsPage) {
        Write-Host "✓ Dashboard pages provisioned" -ForegroundColor Green
    } else {
        Write-Warning "Dashboard pages not found"
    }

    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host "Deployment completed successfully!" -ForegroundColor Green
    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Verify lists and libraries in the site" -ForegroundColor White
    Write-Host "2. Check dashboard pages in Site Pages library" -ForegroundColor White
    Write-Host "3. Review Quick Launch navigation" -ForegroundColor White
    Write-Host "4. Test permissions for each user role" -ForegroundColor White
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Red
    Write-Host "Deployment failed!" -ForegroundColor Red
    Write-Host "======================================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Stack Trace:" -ForegroundColor Yellow
    Write-Host $_.ScriptStackTrace -ForegroundColor Yellow
    Write-Host ""
    exit 1
} finally {
    # Disconnect
    if (Get-PnPConnection -ErrorAction SilentlyContinue) {
        Disconnect-PnPOnline
        Write-Host "Disconnected from SharePoint" -ForegroundColor Gray
    }
}
