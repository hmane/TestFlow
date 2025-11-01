# SharePoint Constants Generator - ENHANCED VERSION
# Uses PnP PowerShell for both SharePoint and Template processing

param(
  [Parameter(Mandatory = $false)]
  [string]$SiteUrl = "",

  [Parameter(Mandatory = $false)]
  [string]$TemplateFilePath = "",

  [Parameter(Mandatory = $false)]
  [string]$OutputPath = ".\sp",

  [Parameter(Mandatory = $false)]
  [string[]]$IncludeOOBLists = @(),

  [Parameter(Mandatory = $false)]
  [switch]$IncludeViews = $false,

  [Parameter(Mandatory = $false)]
  [switch]$IncludeGroups = $false,

  [Parameter(Mandatory = $false)]
  [string]$ClientId = "970bb320-0d49-4b4a-aa8f-c3f4b1e5928f"
)

Write-Host "SharePoint Constants Generator - ENHANCED" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Validation
if ([string]::IsNullOrEmpty($SiteUrl) -and [string]::IsNullOrEmpty($TemplateFilePath)) {
  Write-Error "Either -SiteUrl or -TemplateFilePath must be provided"
  exit 1
}

# Check PnP PowerShell
if (-not (Get-Module -ListAvailable -Name "PnP.PowerShell")) {
  Write-Error "PnP.PowerShell module not installed. Run: Install-Module PnP.PowerShell"
  exit 1
}

$isTemplateMode = -not [string]::IsNullOrEmpty($TemplateFilePath)

# Lists to exclude by default
$DefaultExcludeOOBLists = @(
  "Documents", "Shared Documents", "Site Pages", "Site Assets", "Style Library",
  "Master Page Gallery", "Web Part Gallery", "User Information List", "Workflow History",
  "Apps for SharePoint", "App Catalog", "Form Templates", "Solution Gallery"
)

# Fields to exclude
$ExcludeFields = @(
  "ContentTypeId", "_ModerationStatus", "FileRef", "FileDirRef", "FSObjType",
  "UniqueId", "CheckedOutUserId", "Modified_x0020_By", "Created_x0020_By",
  "File_x0020_Type", "_SourceUrl", "ServerUrl", "EncodedAbsUrl", "BaseName",
  "MetaInfo", "_Level", "Attachments", "owshiddenversion", "_UIVersion", "InstanceID"
)

# Groups to exclude by default
$ExcludeGroups = @(
  "Limited Access System Group", "Style Resource Readers", "Web Part Readers"
)

function Get-SafePropertyName {
  param([string]$InputName)

  if ([string]::IsNullOrEmpty($InputName)) { return "DefaultField" }

  # Clean SharePoint encodings and special characters
  $cleaned = $InputName -replace '_x0020_', ' ' -replace '_x002e_', '.' -replace '_x002d_', '-'

  # Check if it's a single word (no spaces after cleaning)
  if ($cleaned -notmatch '\s') {
    # Single word: just capitalize first letter, keep rest as-is
    $cleanedWord = $cleaned -replace '[^a-zA-Z0-9]', ''
    if ([string]::IsNullOrEmpty($cleanedWord)) {
      return "Field"
    }

    # Just capitalize first letter, preserve the rest (including existing camelCase/PascalCase)
    return $cleanedWord.Substring(0, 1).ToUpper() + $cleanedWord.Substring(1)
  }
  else {
    # Multiple words: apply Pascal case
    $words = $cleaned -split '\s+'
    $pascalCase = ""

    foreach ($word in $words) {
      if (-not [string]::IsNullOrEmpty($word)) {
        # Remove non-alphanumeric characters from each word
        $cleanWord = $word -replace '[^a-zA-Z0-9]', ''
        if (-not [string]::IsNullOrEmpty($cleanWord)) {
          # Capitalize first letter, lowercase the rest for multi-word scenarios
          $pascalCase += $cleanWord.Substring(0, 1).ToUpper() + $cleanWord.Substring(1).ToLower()
        }
      }
    }

    if ([string]::IsNullOrEmpty($pascalCase)) {
      return "Field"
    }

    return $pascalCase
  }
}

function Get-FilteredLists {
  param([array]$AllLists)

  $filteredLists = @()

  foreach ($list in $AllLists) {
    if ($list.Hidden) { continue }

    $isOOB = $DefaultExcludeOOBLists -contains $list.Title

    if ($isOOB -and ($IncludeOOBLists -notcontains $list.Title)) {
      Write-Host "  Excluding OOB list: $($list.Title)" -ForegroundColor DarkGray
      continue
    }

    Write-Host "  Including list: $($list.Title)" -ForegroundColor Green
    $filteredLists += $list
  }

  return $filteredLists
}

function Get-FilteredFields {
  param([string]$ListTitle)

  try {
    $allFields = Get-PnPField -List $ListTitle -ErrorAction Stop
    $filteredFields = @()

    foreach ($field in $allFields) {
      $internalName = $field.InternalName

      # Skip excluded fields
      if ($ExcludeFields -contains $internalName) { continue }

      # Skip hidden fields
      if ($field.Hidden) { continue }

      # Skip system fields starting with underscore (except important ones)
      if ($internalName.StartsWith("_") -and $internalName -notmatch "^(ID|Title|Created|Modified|Author|Editor|ContentType)$") {
        continue
      }

      # Skip read-only system fields (except important ones)
      if ($field.ReadOnlyField -and $internalName -notmatch "^(ID|Title|Created|Modified|Author|Editor|ContentType)$") {
        continue
      }

      $filteredFields += $field
    }

    # Sort fields with proper ordering
    $sortedFields = $filteredFields | Sort-Object {
      $field = $_
      $internalName = if ($field.InternalName) { $field.InternalName } else { "" }
      $displayName = if ($field.Title) { $field.Title } else { $internalName }

      # Fixed priority ordering: ContentType -> ID -> Title -> Custom -> Created -> Author -> Modified -> Editor
      switch ($internalName) {
        "ContentType" { return "0001_ContentType" }
        "ID" { return "0002_ID" }
        "Title" { return "0003_Title" }
        "Created" { return "9997_Created" }
        "Author" { return "9998_Author" }
        "Modified" { return "9999_Modified" }
        "Editor" { return "9999_ZEditor" }
        default {
          # Custom fields get middle priority based on display name for consistency
          if ([string]::IsNullOrEmpty($displayName)) {
            return "5000_" + $internalName.PadLeft(50, '0')
          }
          else {
            return "1000_" + $displayName.PadLeft(50, '0')
          }
        }
      }
    }

    Write-Host "    Found $($sortedFields.Count) usable fields" -ForegroundColor Gray
    return $sortedFields
  }
  catch {
    Write-Host "    Error getting fields: $($_.Exception.Message)" -ForegroundColor Red
    return @()
  }
}

# Removed Get-FormFieldOrder function as it was unreliable

function Get-FilteredGroups {
  try {
    $allGroups = Get-PnPGroup -ErrorAction Stop
    $filteredGroups = @()

    foreach ($group in $allGroups) {
      # Skip system groups
      if ($ExcludeGroups -contains $group.Title) { continue }

      # Skip hidden or system groups (usually contain $ or have specific naming patterns)
      if ($group.Title -match '\$|SharingLinks|Everyone|NT AUTHORITY') { continue }

      Write-Host "  Including group: $($group.Title)" -ForegroundColor Green
      $filteredGroups += $group
    }

    Write-Host "Found $($filteredGroups.Count) user groups" -ForegroundColor Yellow
    return $filteredGroups
  }
  catch {
    Write-Host "Error getting groups: $($_.Exception.Message)" -ForegroundColor Red
    return @()
  }
}

function Get-MockFields {
  param([string]$ListTitle, [object]$Template)

  $mockFields = @()

  # Try to find the list in the template and extract its actual fields
  if ($Template -and $Template.Lists) {
    $listTemplate = $Template.Lists | Where-Object { $_.Title -eq $ListTitle }

    if ($listTemplate -and $listTemplate.Fields) {
      Write-Host "    Parsing $($listTemplate.Fields.Count) fields from template..." -ForegroundColor Gray

      # Maintain template field order exactly as defined
      $fieldOrder = 0

      foreach ($fieldDef in $listTemplate.Fields) {
        try {
          $internalName = ""
          $displayName = ""

          # Get the XML schema from the field definition
          $schemaXml = $fieldDef.SchemaXml

          if (-not [string]::IsNullOrEmpty($schemaXml)) {
            # Parse the XML field definition
            [xml]$fieldXml = $schemaXml
            $fieldElement = $fieldXml.Field

            # Extract attributes from XML
            $internalName = $fieldElement.Name
            if ([string]::IsNullOrEmpty($internalName)) {
              $internalName = $fieldElement.StaticName
            }
            if ([string]::IsNullOrEmpty($internalName)) {
              $internalName = $fieldElement.InternalName
            }

            $displayName = $fieldElement.DisplayName
            if ([string]::IsNullOrEmpty($displayName)) {
              $displayName = $fieldElement.Title
            }
            if ([string]::IsNullOrEmpty($displayName)) {
              $displayName = $internalName
            }
          }
          else {
            # Fallback: try to get properties directly from field object
            if ($fieldDef.InternalName) {
              $internalName = $fieldDef.InternalName
            }
            elseif ($fieldDef.StaticName) {
              $internalName = $fieldDef.StaticName
            }
            elseif ($fieldDef.Name) {
              $internalName = $fieldDef.Name
            }

            if ($fieldDef.DisplayName) {
              $displayName = $fieldDef.DisplayName
            }
            elseif ($fieldDef.Title) {
              $displayName = $fieldDef.Title
            }
            else {
              $displayName = $internalName
            }
          }

          if (-not [string]::IsNullOrEmpty($internalName)) {
            # Skip excluded fields
            if ($ExcludeFields -contains $internalName) { continue }

            # Skip fields starting with underscore (except important ones)
            if ($internalName.StartsWith("_") -and $internalName -notmatch "^(ID|Title|Created|Modified|Author|Editor|ContentType)$") {
              continue
            }

            $mockFields += [PSCustomObject]@{
              InternalName  = $internalName
              Title         = $displayName
              Hidden        = $false
              ReadOnlyField = $false
              TemplateOrder = $fieldOrder
            }

            $fieldOrder++
          }
        }
        catch {
          Write-Host "    Error parsing field: $($_.Exception.Message)" -ForegroundColor Red
        }
      }
    }
  }

  # Always ensure we have standard fields
  $existingInternalNames = $mockFields | ForEach-Object { $_.InternalName }

  # Add missing standard fields with proper positioning
  $standardFields = @(
    @{InternalName = "ContentType"; Title = "Content Type"; Order = 1 },
    @{InternalName = "ID"; Title = "ID"; Order = 2 },
    @{InternalName = "Title"; Title = "Title"; Order = 3 },
    @{InternalName = "Created"; Title = "Created"; Order = 997 },
    @{InternalName = "Modified"; Title = "Modified"; Order = 999 },
    @{InternalName = "Author"; Title = "Created By"; Order = 998 },
    @{InternalName = "Editor"; Title = "Modified By"; Order = 1000 }
  )

  foreach ($fieldDef in $standardFields) {
    if ($existingInternalNames -notcontains $fieldDef.InternalName) {
      $mockFields += [PSCustomObject]@{
        InternalName  = $fieldDef.InternalName
        Title         = $fieldDef.Title
        Hidden        = $false
        ReadOnlyField = ($fieldDef.InternalName -in @("ID", "Created", "Modified", "Author", "Editor"))
        TemplateOrder = $fieldDef.Order
      }
    }
  }

  # Sort fields: ContentType, ID, Title, then template order, then metadata
  $sortedFields = $mockFields | Sort-Object {
    $field = $_
    $internalName = if ($field.InternalName) { $field.InternalName } else { "" }
    $templateOrder = if ($field.TemplateOrder -ne $null) { $field.TemplateOrder } else { 500 }

    # Fixed priority ordering: ContentType -> ID -> Title -> Custom -> Created -> Author -> Modified -> Editor
    switch ($internalName) {
      "ContentType" { return "0001_ContentType" }
      "ID" { return "0002_ID" }
      "Title" { return "0003_Title" }
      "Created" { return "9997_Created" }
      "Author" { return "9998_Author" }
      "Modified" { return "9999_Modified" }
      "Editor" { return "9999_ZEditor" }
      default {
        # For template fields, use their original order
        return "1000_" + $templateOrder.ToString().PadLeft(4, '0')
      }
    }
  }

  Write-Host "    Found $($sortedFields.Count) total fields" -ForegroundColor Gray
  return $sortedFields
}

function Get-MockViews {
  param([string]$ListTitle)

  # Create mock view for template mode
  return @([PSCustomObject]@{
      Title             = "All Items"
      ServerRelativeUrl = "/Lists/$($ListTitle -replace '\s+', '')/AllItems.aspx"
    })
}

function Get-MockGroups {
  param([object]$Template)

  $mockGroups = @()

  if ($Template -and $Template.Security -and $Template.Security.SiteGroups) {
    foreach ($groupTemplate in $Template.Security.SiteGroups) {
      $mockGroups += [PSCustomObject]@{
        Title       = $groupTemplate.Title
        Description = $groupTemplate.Description
        Owner       = $groupTemplate.Owner
      }
    }
  }

  return $mockGroups
}

function Generate-TypeScriptFiles {
  param([array]$Lists, [array]$Groups, [string]$OutputPath)

  # Create output directories
  if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
  }

  $listFieldsDir = Join-Path $OutputPath "listFields"
  if (-not (Test-Path $listFieldsDir)) {
    New-Item -ItemType Directory -Path $listFieldsDir -Force | Out-Null
  }

  if ($IncludeViews) {
    $listViewsDir = Join-Path $OutputPath "listViews"
    if (-not (Test-Path $listViewsDir)) {
      New-Item -ItemType Directory -Path $listViewsDir -Force | Out-Null
    }
  }

  # Generate Lists.ts
  Generate-ListsFile -Lists $Lists -OutputPath $OutputPath

  # Generate Groups.ts if requested
  if ($IncludeGroups -and $Groups.Count -gt 0) {
    Generate-GroupsFile -Groups $Groups -OutputPath $OutputPath
  }

  # Generate individual list field files
  $processedLists = @()

  foreach ($list in $Lists) {
    Write-Host "  Processing: $($list.Title)" -ForegroundColor White

    if ($isTemplateMode) {
      # For template mode, get fields from template data
      $fields = Get-MockFields -ListTitle $list.Title -Template $template
    }
    else {
      # For SharePoint mode, get actual fields
      $fields = Get-FilteredFields -ListTitle $list.Title
    }

    if ($fields.Count -gt 0) {
      Generate-FieldsFile -ListTitle $list.Title -Fields $fields -OutputPath $OutputPath
      $processedLists += $list
    }

    # Generate views if requested
    if ($IncludeViews) {
      if ($isTemplateMode) {
        $views = Get-MockViews -ListTitle $list.Title
      }
      else {
        $views = Get-PnPView -List $list.Title | Where-Object { -not $_.Hidden }
      }

      if ($views.Count -gt 0) {
        Generate-ViewsFile -ListTitle $list.Title -Views $views -OutputPath $OutputPath
      }
    }
  }

  # Generate index files
  Generate-IndexFiles -Lists $processedLists -Groups $Groups -OutputPath $OutputPath

  Write-Host "`n=== Generation Complete ===" -ForegroundColor Green
  Write-Host "Lists processed: $($processedLists.Count)" -ForegroundColor White
  if ($IncludeGroups) {
    Write-Host "Groups processed: $($Groups.Count)" -ForegroundColor White
  }
  Write-Host "Output directory: $OutputPath" -ForegroundColor White
}

function Generate-ListsFile {
  param([array]$Lists, [string]$OutputPath)

  $content = @"
// Auto-generated SharePoint Lists constants
// Generated on: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

export const Lists = {
"@

  $listItems = @()
  foreach ($list in $Lists) {
    $safeName = Get-SafePropertyName -InputName $list.Title

    # Get URL from list
    $url = ""
    if ($list.RootFolder -and $list.RootFolder.ServerRelativeUrl) {
      $url = $list.RootFolder.ServerRelativeUrl
    }
    else {
      $url = "/Lists/$($list.Title -replace '\s+', '')"
    }

    # Ensure URL format is correct
    if ($url -notmatch '^/Lists/') {
      if ($url -match '/Lists/(.*)$') {
        $url = "/Lists/$($matches[1])"
      }
      else {
        $url = "/Lists/$($list.Title -replace '\s+', '')"
      }
    }

    $listItems += "  $safeName`: {`n    Title: '$($list.Title)',`n    Url: '$url'`n  }"
  }

  $content += "`n" + ($listItems -join ",`n") + "`n} as const;`n"

  $filePath = Join-Path $OutputPath "Lists.ts"
  $content | Out-File -FilePath $filePath -Encoding UTF8
  Write-Host "Generated: Lists.ts" -ForegroundColor Green
}

function Generate-GroupsFile {
  param([array]$Groups, [string]$OutputPath)

  if ($Groups.Count -eq 0) { return }

  $content = @"
// Auto-generated SharePoint Groups constants
// Generated on: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

export const Groups = {
"@

  $groupItems = @()
  foreach ($group in $Groups) {
    $safeName = Get-SafePropertyName -InputName $group.Title

    $description = ""
    if ($group.Description) {
      $description = $group.Description -replace "'", "\'"
    }

    if ([string]::IsNullOrEmpty($description)) {
      $groupItems += "  $safeName`: {`n    Title: '$($group.Title)'`n  }"
    }
    else {
      $groupItems += "  $safeName`: {`n    Title: '$($group.Title)',`n    Description: '$description'`n  }"
    }
  }

  $content += "`n" + ($groupItems -join ",`n") + "`n} as const;`n"

  $filePath = Join-Path $OutputPath "Groups.ts"
  $content | Out-File -FilePath $filePath -Encoding UTF8
  Write-Host "Generated: Groups.ts" -ForegroundColor Green
}

function Generate-FieldsFile {
  param([string]$ListTitle, [array]$Fields, [string]$OutputPath)

  if ($Fields.Count -eq 0) { return }

  $safeName = Get-SafePropertyName -InputName $ListTitle
  $fileName = "$($safeName)Fields.ts"

  $content = @"
// Auto-generated fields for SharePoint list: $ListTitle
// Generated on: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

export const $($safeName)Fields = {
"@

  $fieldItems = @()
  foreach ($field in $Fields) {
    $internalName = $field.InternalName

    # Use the InternalName for the TypeScript property name (with proper casing)
    # but for Title field, use the actual display name if it's different
    if ($internalName -eq "Title") {
      $displayName = if ($field.Title -and $field.Title -ne "Title") { $field.Title } else { "Title" }
      $propertyName = Get-SafePropertyName -InputName $displayName
    }
    else {
      $propertyName = Get-SafePropertyName -InputName $internalName
    }

    $fieldItems += "  $propertyName`: '$internalName'"
  }

  $content += "`n" + ($fieldItems -join ",`n") + "`n} as const;`n"

  $filePath = Join-Path (Join-Path $OutputPath "listFields") $fileName
  $content | Out-File -FilePath $filePath -Encoding UTF8
  Write-Host "Generated: listFields/$fileName" -ForegroundColor Green
}

function Generate-ViewsFile {
  param([string]$ListTitle, [array]$Views, [string]$OutputPath)

  if ($Views.Count -eq 0 -or -not $IncludeViews) { return }

  $safeName = Get-SafePropertyName -InputName $ListTitle
  $fileName = "$($safeName)Views.ts"

  $content = @"
// Auto-generated views for SharePoint list: $ListTitle
// Generated on: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

export const $($safeName)Views = {
"@

  $viewItems = @()
  foreach ($view in $Views) {
    $safePropName = Get-SafePropertyName -InputName $view.Title
    $viewItems += "  $safePropName`: {`n    Title: '$($view.Title)',`n    Url: '$($view.ServerRelativeUrl)'`n  }"
  }

  $content += "`n" + ($viewItems -join ",`n") + "`n} as const;`n"

  $filePath = Join-Path (Join-Path $OutputPath "listViews") $fileName
  $content | Out-File -FilePath $filePath -Encoding UTF8
  Write-Host "Generated: listViews/$fileName" -ForegroundColor Green
}

function Generate-IndexFiles {
  param([array]$Lists, [array]$Groups, [string]$OutputPath)

  # Main index file
  $content = "// Auto-generated index file`nexport { Lists } from './Lists';`n"

  if ($IncludeGroups -and $Groups.Count -gt 0) {
    $content += "export { Groups } from './Groups';`n"
  }

  $content += "`n"

  foreach ($list in $Lists) {
    $safeName = Get-SafePropertyName -InputName $list.Title
    $content += "export { $($safeName)Fields } from './listFields/$($safeName)Fields';`n"
    if ($IncludeViews) {
      $content += "export { $($safeName)Views } from './listViews/$($safeName)Views';`n"
    }
  }

  $content | Out-File -FilePath (Join-Path $OutputPath "index.ts") -Encoding UTF8
  Write-Host "Generated: index.ts" -ForegroundColor Green

  # Fields index file
  $fieldsContent = "// Auto-generated fields index`n`n"
  foreach ($list in $Lists) {
    $safeName = Get-SafePropertyName -InputName $list.Title
    $fieldsContent += "export { $($safeName)Fields } from './$($safeName)Fields';`n"
  }

  $fieldsIndexPath = Join-Path (Join-Path $OutputPath "listFields") "index.ts"
  $fieldsContent | Out-File -FilePath $fieldsIndexPath -Encoding UTF8
  Write-Host "Generated: listFields/index.ts" -ForegroundColor Green

  # Views index file (if needed)
  if ($IncludeViews) {
    $viewsContent = "// Auto-generated views index`n`n"
    foreach ($list in $Lists) {
      $safeName = Get-SafePropertyName -InputName $list.Title
      $viewsContent += "export { $($safeName)Views } from './$($safeName)Views';`n"
    }

    $viewsIndexPath = Join-Path (Join-Path $OutputPath "listViews") "index.ts"
    $viewsContent | Out-File -FilePath $viewsIndexPath -Encoding UTF8
    Write-Host "Generated: listViews/index.ts" -ForegroundColor Green
  }
}

# === MAIN EXECUTION ===

try {
  if ($isTemplateMode) {
    Write-Host "Template Mode: Processing $TemplateFilePath" -ForegroundColor Cyan

    # Use PnP PowerShell to read the template
    $template = Read-PnPSiteTemplate -Path $TemplateFilePath

    if (-not $template) {
      Write-Error "Could not read PnP Site Template"
      exit 1
    }

    Write-Host "Template loaded successfully" -ForegroundColor Green

    # Extract lists from template
    $lists = @()
    if ($template.Lists) {
      foreach ($listTemplate in $template.Lists) {
        $mockList = [PSCustomObject]@{
          Title        = $listTemplate.Title
          Hidden       = $false
          RootFolder   = [PSCustomObject]@{
            ServerRelativeUrl = $listTemplate.Url
          }
          # Store template reference for field extraction
          TemplateData = $listTemplate
        }
        $lists += $mockList
      }
    }

    Write-Host "Found $($lists.Count) lists in template" -ForegroundColor Yellow

    # Extract groups from template
    $groups = @()
    if ($IncludeGroups) {
      $groups = Get-MockGroups -Template $template
      Write-Host "Found $($groups.Count) groups in template" -ForegroundColor Yellow
    }

    if ($lists.Count -eq 0) {
      Write-Host "No lists found in template" -ForegroundColor Yellow
      exit 0
    }

    $filteredLists = Get-FilteredLists -AllLists $lists
    Generate-TypeScriptFiles -Lists $filteredLists -Groups $groups -OutputPath $OutputPath
  }
  else {
    Write-Host "SharePoint Mode: Connecting to $SiteUrl" -ForegroundColor Cyan

    # Connect to SharePoint
    Connect-PnPOnline -Url $SiteUrl -ClientId $ClientId -Interactive
    Write-Host "Connected successfully" -ForegroundColor Green

    # Get all lists
    $allLists = Get-PnPList
    Write-Host "Found $($allLists.Count) total lists" -ForegroundColor Yellow

    # Get groups if requested
    $groups = @()
    if ($IncludeGroups) {
      $groups = Get-FilteredGroups
    }

    $filteredLists = Get-FilteredLists -AllLists $allLists

    if ($filteredLists.Count -eq 0) {
      Write-Host "No lists to process" -ForegroundColor Yellow
      if ($IncludeGroups -and $groups.Count -gt 0) {
        # Still generate groups even if no lists
        Generate-TypeScriptFiles -Lists @() -Groups $groups -OutputPath $OutputPath
      }
      exit 0
    }

    Generate-TypeScriptFiles -Lists $filteredLists -Groups $groups -OutputPath $OutputPath
  }
}
catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Stack Trace:" -ForegroundColor Red
  Write-Host $_.Exception.StackTrace -ForegroundColor Red
}
finally {
  if (-not $isTemplateMode) {
    try {
      Disconnect-PnPOnline -ErrorAction SilentlyContinue
      Write-Host "Disconnected from SharePoint" -ForegroundColor Gray
    }
    catch {
      # Ignore disconnect errors
    }
  }
}
