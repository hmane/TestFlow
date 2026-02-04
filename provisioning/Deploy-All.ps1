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

# ============================================================================
# Ensure PnP.PowerShell module is available and up to date
# ============================================================================
$requiredModule = "PnP.PowerShell"
$minVersion = [Version]"1.12.0"

$module = Get-Module -ListAvailable -Name $requiredModule |
    Sort-Object Version -Descending |
    Select-Object -First 1

if (-not $module) {
    throw "PnP.PowerShell module not found. Install it with: Install-Module -Name PnP.PowerShell -Scope CurrentUser"
}

if ($module.Version -lt $minVersion) {
    Write-Warning "PnP.PowerShell $minVersion or higher is recommended for schema 2022/09. Found $($module.Version)."
    Write-Warning "Proceeding anyway; consider updating with: Update-Module -Name PnP.PowerShell"
}

# Import the latest available module version explicitly
Import-Module $module.Path -Force -ErrorAction Stop

# Client ID for PnP authentication
$clientId = "970bb320-0d49-4b4a-aa8f-c3f4b1e5928f"

# Error handling
$ErrorActionPreference = "Stop"

# ============================================================================
# Function to resolve XIncludes in PnP template XML
# PnP PowerShell does NOT support XInclude natively, so we pre-process the XML
# ============================================================================
function Resolve-XIncludes {
    param(
        [Parameter(Mandatory = $true)]
        [string]$TemplatePath,

        [Parameter(Mandatory = $true)]
        [string]$OutputPath
    )

    # Get the directory of the template for relative path resolution
    $templateDir = Split-Path -Parent $TemplatePath

    # Load the XML document with XmlReaderSettings that support XInclude
    $settings = New-Object System.Xml.XmlReaderSettings
    $settings.DtdProcessing = [System.Xml.DtdProcessing]::Parse

    # Try using .NET's built-in XInclude support via XmlReader
    # Note: System.Xml doesn't have native XInclude, so we do manual resolution
    $xml = New-Object System.Xml.XmlDocument
    $xml.PreserveWhitespace = $true
    $xml.Load($TemplatePath)

    # Create namespace manager for XInclude
    $nsManager = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
    $nsManager.AddNamespace("xi", "http://www.w3.org/2001/XInclude")
    $nsManager.AddNamespace("pnp", "http://schemas.dev.office.com/PnP/2022/09/ProvisioningSchema")

    # Find all xi:include elements and process them
    $includeCount = 0
    $maxIterations = 10  # Prevent infinite loops in case of circular includes

    for ($iteration = 0; $iteration -lt $maxIterations; $iteration++) {
        $includes = $xml.SelectNodes("//xi:include", $nsManager)

        if ($includes.Count -eq 0) {
            break
        }

        foreach ($include in $includes) {
            $href = $include.GetAttribute("href")
            if (-not $href) { continue }

            # Resolve the path relative to the template directory
            $includePath = Join-Path $templateDir $href

            if (Test-Path $includePath) {
                Write-Host "    Including: $href" -ForegroundColor DarkGray

                # Load the included file
                $includeXml = New-Object System.Xml.XmlDocument
                $includeXml.PreserveWhitespace = $true
                $includeXml.Load($includePath)

                # Import the root element of the included document
                $importedNode = $xml.ImportNode($includeXml.DocumentElement, $true)

                # Replace the xi:include with the imported content
                $include.ParentNode.ReplaceChild($importedNode, $include) | Out-Null
                $includeCount++
            } else {
                Write-Warning "    Include file not found: $includePath"
                # Remove the broken include to prevent infinite loop
                $include.ParentNode.RemoveChild($include) | Out-Null
            }
        }
    }

    # Save the resolved template
    $xml.Save($OutputPath)

    return $includeCount
}

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

    # Pre-process template to resolve XIncludes
    Write-Host "[1/5] Resolving XInclude directives..." -ForegroundColor Cyan
    $resolvedTemplatePath = Join-Path (Split-Path -Parent $TemplatePath) "SiteTemplate.resolved.xml"
    $includeCount = Resolve-XIncludes -TemplatePath $TemplatePath -OutputPath $resolvedTemplatePath
    Write-Host "  Resolved $includeCount XInclude directive(s)" -ForegroundColor Green
    Write-Host "  Resolved template: $resolvedTemplatePath" -ForegroundColor Gray
    Write-Host ""

    # Use the resolved template from now on
    $TemplatePath = $resolvedTemplatePath

    # Connect to SharePoint
    Write-Host "[2/5] Connecting to SharePoint..." -ForegroundColor Cyan
    Connect-PnPOnline -Url $SiteUrl -ClientId $clientId -Interactive
    Write-Host "Connected successfully" -ForegroundColor Green
    Write-Host ""

    # Validate template before applying
    if (-not $SkipValidation) {
        Write-Host "[3/5] Validating provisioning template..." -ForegroundColor Cyan
        if (Get-Command Test-PnPProvisioningTemplate -ErrorAction SilentlyContinue) {
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
        } else {
            Write-Warning "Test-PnPProvisioningTemplate not available in this module version. Skipping validation."
        }
        Write-Host ""
    }

    # Apply provisioning template (includes lists, security, pages, navigation)
    Write-Host "[4/5] Applying provisioning template..." -ForegroundColor Cyan
    Write-Host "This may take several minutes..." -ForegroundColor Yellow
    $applyCmd = Get-Command Apply-PnPProvisioningTemplate -ErrorAction SilentlyContinue
    if ($applyCmd) {
        Apply-PnPProvisioningTemplate -Path $TemplatePath -Handlers All
    } else {
        $applySiteCmd = Get-Command Apply-PnPSiteTemplate -ErrorAction SilentlyContinue
        if ($applySiteCmd) {
            Apply-PnPSiteTemplate -Path $TemplatePath -Handlers All
        } else {
            $invokeCmd = Get-Command Invoke-PnPSiteTemplate -ErrorAction SilentlyContinue
            if ($invokeCmd) {
                Write-Warning "Apply-* cmdlets not available. Falling back to Invoke-PnPSiteTemplate."
                Invoke-PnPSiteTemplate -Path $TemplatePath
            } else {
                throw "No PnP apply cmdlet found (Apply-PnPProvisioningTemplate / Apply-PnPSiteTemplate / Invoke-PnPSiteTemplate). Ensure PnP.PowerShell is installed and imported."
            }
        }
    }
    Write-Host "Template applied successfully" -ForegroundColor Green
    Write-Host ""

    # Associate Form Customizer with Requests list
    Write-Host "[5/5] Configuring Form Customizer for Requests list..." -ForegroundColor Cyan

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

    # Check if security groups exist
    $securityGroups = @(
        "LW - Admin",
        "LW - Submitters",
        "LW - Legal Admin",
        "LW - Attorney Assigner",
        "LW - Attorneys",
        "LW - Compliance Users"
    )

    $groupsCreated = 0
    foreach ($groupName in $securityGroups) {
        $group = Get-PnPGroup -Identity $groupName -ErrorAction SilentlyContinue
        if ($group) {
            $groupsCreated++
        }
    }

    if ($groupsCreated -eq $securityGroups.Count) {
        Write-Host "  Security groups provisioned ($groupsCreated/$($securityGroups.Count))" -ForegroundColor Green
    } elseif ($groupsCreated -gt 0) {
        Write-Warning "  Security groups partially provisioned ($groupsCreated/$($securityGroups.Count))"
    } else {
        Write-Warning "  Security groups not found (0/$($securityGroups.Count))"
    }

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
    # Clean up resolved template file
    if ($resolvedTemplatePath -and (Test-Path $resolvedTemplatePath)) {
        Remove-Item $resolvedTemplatePath -Force -ErrorAction SilentlyContinue
        Write-Host "Cleaned up resolved template file" -ForegroundColor Gray
    }

    # Disconnect
    if (Get-PnPConnection -ErrorAction SilentlyContinue) {
        Disconnect-PnPOnline
        Write-Host "Disconnected from SharePoint" -ForegroundColor Gray
    }
}
