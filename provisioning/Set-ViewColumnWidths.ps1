<#
.SYNOPSIS
    Sets column widths on all views in the Requests list.

.DESCRIPTION
    Loops through all views in the Requests list and injects <ColumnWidth>
    elements into the ListViewXml for each view that contains the specified columns.

.PARAMETER SiteUrl
    The SharePoint site URL.

.PARAMETER ColumnWidths
    Hashtable of column display names and their widths in pixels.
    Example: @{ "Request ID" = 120; "Request Title" = 250 }

.EXAMPLE
    .\Set-ViewColumnWidths.ps1 -SiteUrl "https://tenant.sharepoint.com/sites/LegalReview"
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$SiteUrl,

    [Parameter(Mandatory = $false)]
    [hashtable]$ColumnWidths = @{
        "Request ID"        = 120
        "Request Title"     = 250
        "Is Rush Request"   = 80
    }
)

# Connect to SharePoint
Connect-PnPOnline -Url $SiteUrl -Interactive

$listName = "Requests"

# Build the <ColumnWidth> XML fragment from the hashtable
$columnWidthXml = "<ColumnWidth>"
foreach ($col in $ColumnWidths.GetEnumerator()) {
    $columnWidthXml += "<FieldRef Name=`"$($col.Key)`" width=`"$($col.Value)`" />"
}
$columnWidthXml += "</ColumnWidth>"

Write-Host "Column width XML: $columnWidthXml" -ForegroundColor Cyan

# Get all views in the list
$views = Get-PnPView -List $listName

foreach ($view in $views) {
    $viewName = $view.Title
    $viewXml = $view.ListViewXml

    if (-not $viewXml) {
        Write-Host "  [$viewName] Skipped - no ListViewXml" -ForegroundColor Yellow
        continue
    }

    # Remove any existing <ColumnWidth>...</ColumnWidth> block
    $cleanXml = $viewXml -replace '<ColumnWidth>.*?</ColumnWidth>', ''

    # Insert <ColumnWidth> before the closing </View> tag
    $updatedXml = $cleanXml -replace '</View>', "$columnWidthXml</View>"

    # Apply the updated XML
    $view.ListViewXml = $updatedXml
    $view.Update()
    Invoke-PnPQuery

    Write-Host "  [$viewName] Updated" -ForegroundColor Green
}

Write-Host "`nDone. Column widths applied to all views." -ForegroundColor Green

Disconnect-PnPOnline
