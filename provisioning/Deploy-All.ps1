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

.PARAMETER SkipValidation
    Optional. Skip template validation before applying.

.EXAMPLE
    .\Deploy-All.ps1 -SiteUrl "https://contoso.sharepoint.com/sites/LegalWorkflow"

.EXAMPLE
    .\Deploy-All.ps1 -SiteUrl "https://contoso.sharepoint.com/sites/LegalWorkflow" -TemplatePath "./CustomTemplate.xml"

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
    [string]$TemplatePath = "./SiteTemplate.xml",

    [Parameter(Mandatory = $false)]
    [switch]$SkipValidation
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

    # Get absolute path for template
    $TemplatePath = Resolve-Path $TemplatePath

    Write-Host "Site URL: $SiteUrl" -ForegroundColor White
    Write-Host "Template: $TemplatePath" -ForegroundColor White
    Write-Host ""

    # Connect to SharePoint
    Write-Host "[1/4] Connecting to SharePoint..." -ForegroundColor Cyan
    Connect-PnPOnline -Url $SiteUrl -ClientId $clientId -Interactive
    Write-Host "Connected successfully" -ForegroundColor Green
    Write-Host ""

    # Validate template before applying
    if (-not $SkipValidation) {
        Write-Host "[2/4] Validating provisioning template..." -ForegroundColor Cyan
        try {
            $validationResult = Test-PnPProvisioningTemplate -Path $TemplatePath
            if ($validationResult -eq $false) {
                throw "Template validation failed. Use -SkipValidation to bypass."
            }
            Write-Host "Template validation passed" -ForegroundColor Green
        } catch {
            Write-Warning "Template validation error: $($_.Exception.Message)"
            Write-Warning "Attempting to apply template anyway..."
        }
        Write-Host ""
    }

    # Apply provisioning template (includes lists, security, pages, navigation)
    Write-Host "[3/4] Applying provisioning template..." -ForegroundColor Cyan
    Write-Host "This may take several minutes..." -ForegroundColor Yellow
    Invoke-PnPSiteTemplate -Path $TemplatePath
    Write-Host "Template applied successfully" -ForegroundColor Green
    Write-Host ""

    # Associate Form Customizer with Requests list
    Write-Host "[4/4] Configuring Form Customizer for Requests list..." -ForegroundColor Cyan

    # Form Customizer Component ID from LegalWorkflowFormCustomizer.manifest.json
    $formCustomizerId = "419289ae-db48-48cf-84d8-bd90dcbc6aab"

    # Get the Requests list
    $requestsList = Get-PnPList -Identity "Lists/Requests" -ErrorAction SilentlyContinue

    if ($requestsList) {
        # Get the default content type (Item) for the list
        $contentTypes = Get-PnPContentType -List $requestsList
        $defaultContentType = $contentTypes | Where-Object { $_.Name -eq "Item" } | Select-Object -First 1

        if ($defaultContentType) {
            # Set Form Customizer for New, Edit, and Display forms
            Write-Host "  Setting Form Customizer for content type: $($defaultContentType.Name)" -ForegroundColor Gray

            # Use PnP PowerShell to set the form customizer
            # NewFormClientSideComponentId, EditFormClientSideComponentId, DisplayFormClientSideComponentId
            Set-PnPContentType -List $requestsList -Identity $defaultContentType.Id -NewFormClientSideComponentId $formCustomizerId -EditFormClientSideComponentId $formCustomizerId -DisplayFormClientSideComponentId $formCustomizerId

            Write-Host "  Form Customizer associated successfully" -ForegroundColor Green
        } else {
            Write-Warning "  Default content type not found on Requests list"
        }
    } else {
        Write-Warning "  Requests list not found - Form Customizer not configured"
    }
    Write-Host ""

    # Verify deployment
    Write-Host "Verifying deployment..." -ForegroundColor Cyan

    # Check if Requests list exists
    $requestsList = Get-PnPList -Identity "Lists/Requests" -ErrorAction SilentlyContinue
    if ($requestsList) {
        Write-Host "  Requests list provisioned" -ForegroundColor Green
    } else {
        Write-Warning "  Requests list not found"
    }

    # Check if SubmissionItems list exists
    $submissionItemsList = Get-PnPList -Identity "Lists/SubmissionItems" -ErrorAction SilentlyContinue
    if ($submissionItemsList) {
        Write-Host "  SubmissionItems list provisioned" -ForegroundColor Green
    } else {
        Write-Warning "  SubmissionItems list not found"
    }

    # Check if Configuration list exists
    $configList = Get-PnPList -Identity "Lists/Configuration" -ErrorAction SilentlyContinue
    if ($configList) {
        Write-Host "  Configuration list provisioned" -ForegroundColor Green
    } else {
        Write-Warning "  Configuration list not found"
    }

    # Check if RequestDocuments library exists
    $docLib = Get-PnPList -Identity "RequestDocuments" -ErrorAction SilentlyContinue
    if ($docLib) {
        Write-Host "  RequestDocuments library provisioned" -ForegroundColor Green
    } else {
        Write-Warning "  RequestDocuments library not found"
    }

    # Check if dashboard pages exist
    $homePage = Get-PnPPage -Identity "Home.aspx" -ErrorAction SilentlyContinue
    if ($homePage) {
        Write-Host "  Home page provisioned" -ForegroundColor Green
    } else {
        Write-Warning "  Home page not found"
    }

    $myRequestsPage = Get-PnPPage -Identity "MyRequestsDashboard.aspx" -ErrorAction SilentlyContinue
    if ($myRequestsPage) {
        Write-Host "  Dashboard pages provisioned" -ForegroundColor Green
    } else {
        Write-Warning "  Dashboard pages not found"
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

    # Provide more detailed error info
    if ($_.Exception.InnerException) {
        Write-Host "Inner Exception: $($_.Exception.InnerException.Message)" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "Stack Trace:" -ForegroundColor Yellow
    Write-Host $_.ScriptStackTrace -ForegroundColor Yellow
    Write-Host ""

    Write-Host "Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "1. Run: Test-PnPProvisioningTemplate -Path '$TemplatePath'" -ForegroundColor White
    Write-Host "2. Check PnP.PowerShell version: Get-Module PnP.PowerShell -ListAvailable" -ForegroundColor White
    Write-Host "3. Verify XML schema version matches your PnP.PowerShell version" -ForegroundColor White
    Write-Host ""
    exit 1
} finally {
    # Disconnect
    if (Get-PnPConnection -ErrorAction SilentlyContinue) {
        Disconnect-PnPOnline
        Write-Host "Disconnected from SharePoint" -ForegroundColor Gray
    }
}
