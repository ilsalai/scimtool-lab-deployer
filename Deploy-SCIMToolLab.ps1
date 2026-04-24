# SCIMTool Lab - One-Click Deployment v0.5
# Based on github.com/kayasax/SCIMTool
# Author: Silvestre Gaitan - Nebula Mexico - April 2026
#
# RUN: Set-ExecutionPolicy Bypass -Scope Process -Force; & "$env:USERPROFILE\Downloads\Deploy-SCIMToolLab.ps1"

try { Set-ExecutionPolicy Bypass -Scope Process -Force -ErrorAction SilentlyContinue } catch { }

$ErrorActionPreference = "Continue"
$desktopPath = [Environment]::GetFolderPath("Desktop")
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$credFile = Join-Path $desktopPath "SCIMTool-Credentials-$ts.txt"
$logFile = Join-Path $env:TEMP "scimtool-log-$ts.txt"
$logFile2 = Join-Path $env:TEMP "scimtool-log2-$ts.txt"
$totalSteps = 8

function Write-Step {
    param([int]$Num, [string]$Title, [string]$Desc)
    $pct = [math]::Round(($Num / $totalSteps) * 100)
    $filled = [math]::Round(30 * $Num / $totalSteps)
    $empty = 30 - $filled
    $bar = ("#" * $filled) + ("-" * $empty)
    Write-Host ""
    Write-Host "  ----------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "   STEP $Num of $totalSteps  [$bar]  $pct%" -ForegroundColor White
    Write-Host "   $Title" -ForegroundColor Cyan
    if ($Desc) { Write-Host "   $Desc" -ForegroundColor Gray }
    Write-Host "  ----------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host ""
}

function Write-OK   { param([string]$M) Write-Host "   [OK]   $M" -ForegroundColor Green }
function Write-WARN { param([string]$M) Write-Host "   [WARN] $M" -ForegroundColor Yellow }
function Write-FAIL { param([string]$M) Write-Host "   [FAIL] $M" -ForegroundColor Red }
function Write-NOTE { param([string]$M) Write-Host "   [INFO] $M" -ForegroundColor Gray }
function Write-BUSY { param([string]$M) Write-Host "   [....] $M" -ForegroundColor DarkYellow }

function Wait-Seconds {
    param([int]$Sec, [string]$Msg)
    $i = $Sec
    while ($i -gt 0) {
        $text = "`r" + "   [....] " + $Msg + " - " + $i.ToString() + " sec left       "
        Write-Host $text -NoNewline -ForegroundColor DarkGray
        Start-Sleep -Seconds 1
        $i = $i - 1
    }
    $doneText = "`r" + "   [OK]   " + $Msg + " -- Done.                         "
    Write-Host $doneText -ForegroundColor Green
}

function Pause-Script {
    param([string]$Msg)
    Write-Host ""
    Write-Host "   >> $Msg" -ForegroundColor Yellow
    $null = Read-Host "      "
}

function Parse-Log {
    param([string]$LogPath)
    $result = @{}
    $logText = ""
    if (Test-Path $LogPath) { $logText = Get-Content $LogPath -Raw -ErrorAction SilentlyContinue }
    if ($logText -match 'FINAL URL:\s*(https://\S+)')       { $result.AppUrl   = $matches[1].Trim() }
    elseif ($logText -match 'App URL:\s*(https://\S+)')      { $result.AppUrl   = $matches[1].Trim() }
    if ($logText -match 'SCIM Endpoint:\s*(https://\S+)')    { $result.ScimEp   = $matches[1].Trim() }
    if ($logText -match 'Bearer Secret:\s*(\S+)')            { $result.Secret   = $matches[1].Trim() }
    elseif ($logText -match 'SCIM Shared Secret:\s*(\S+)')   { $result.Secret   = $matches[1].Trim() }
    elseif ($logText -match 'Secret\s+:\s+(\S+=)')           { $result.Secret   = $matches[1].Trim() }
    if ($logText -match 'JWT Secret:\s*([a-f0-9]+)')         { $result.JWT      = $matches[1].Trim() }
    if ($logText -match 'OAuth Client Secret:\s*([a-f0-9]+)'){ $result.OAuth    = $matches[1].Trim() }
    elseif ($logText -match 'OAuth Secret\s*:\s*([a-f0-9]+)'){ $result.OAuth    = $matches[1].Trim() }
    if ($logText -match 'Resource Group:\s*(\S+)')           { $result.RG       = $matches[1].Trim() }
    if ($logText -match 'Container App:\s*(\S+)')            { $result.AppName  = $matches[1].Trim() }
    elseif ($logText -match 'App Name\s*:\s*(\S+)')          { $result.AppName  = $matches[1].Trim() }
    $result.HasSubnetError = $logText -match 'SubnetDelegationError'
    $result.Raw = $logText
    return $result
}

trap {
    Write-Host ""
    Write-FAIL "AN ERROR OCCURRED"
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    Pause-Script "Press Enter to close..."
    exit 1
}

# ===========================================================
#  BANNER
# ===========================================================

Clear-Host
Write-Host ""
Write-Host "  ==========================================================" -ForegroundColor Cyan
Write-Host "      SCIMTool Lab -- One-Click Deployment  v0.5             " -ForegroundColor Cyan
Write-Host "  ==========================================================" -ForegroundColor Cyan
Write-Host "   A personal SCIM 2.0 provisioning lab in Azure.            " -ForegroundColor Gray
Write-Host "   Based on: github.com/kayasax/SCIMTool                     " -ForegroundColor Gray
Write-Host "  ==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  This script will:" -ForegroundColor White
Write-Host "   1. Check Azure CLI is installed" -ForegroundColor Gray
Write-Host "   2. Log you into Azure" -ForegroundColor Gray
Write-Host "   3. Validate your subscription" -ForegroundColor Gray
Write-Host "   4. Deploy the SCIMTool container - about 10 min" -ForegroundColor Gray
Write-Host "   5. Read deployment details" -ForegroundColor Gray
Write-Host "   6. Fix network for public access" -ForegroundColor Gray
Write-Host "   7. Verify the endpoint is reachable" -ForegroundColor Gray
Write-Host "   8. Save credentials to your Desktop" -ForegroundColor Gray
Write-Host ""
Write-Host "  You interact at steps 2 and 4. The rest is automatic." -ForegroundColor Yellow
Pause-Script "Press Enter to begin..."

# ===========================================================
#  STEP 1
# ===========================================================

Write-Step 1 "CHECKING PREREQUISITES" "Azure CLI, PowerShell, internet"

Write-BUSY "Checking Azure CLI..."
$azOk = $false
try {
    $raw = & az version 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
        $ver = ($raw | ConvertFrom-Json).'azure-cli'
        Write-OK "Azure CLI installed -- version $ver"
        $azOk = $true
    }
} catch { }

if (-not $azOk) {
    Write-FAIL "Azure CLI is NOT installed."
    Write-Host ""
    Write-Host "   TO FIX: Open PowerShell as Admin and run:" -ForegroundColor Yellow
    Write-Host '   Invoke-WebRequest -Uri https://aka.ms/installazurecliwindows -OutFile .\AzureCLI.msi; Start-Process msiexec.exe -Wait -ArgumentList "/I AzureCLI.msi /quiet"; Remove-Item .\AzureCLI.msi' -ForegroundColor White
    Write-Host "   Then CLOSE this window and run the script again." -ForegroundColor Yellow
    Pause-Script "Press Enter to exit..."
    exit 1
}

Write-OK "PowerShell $($PSVersionTable.PSVersion)"

Write-BUSY "Checking internet..."
try {
    $null = Invoke-WebRequest -Uri "https://github.com" -TimeoutSec 10 -UseBasicParsing
    Write-OK "Internet OK"
} catch {
    Write-FAIL "Cannot reach github.com -- check your connection."
    Pause-Script "Press Enter to exit..."
    exit 1
}

Write-OK "All prerequisites passed."
Start-Sleep -Seconds 1

# ===========================================================
#  STEP 2
# ===========================================================

Write-Step 2 "AZURE LOGIN" "Browser will open -- sign in with your Microsoft account"

Write-NOTE "After signing in, come back to this window."
Pause-Script "Press Enter to open login page..."

Write-BUSY "Opening browser for login..."
az login
if ($LASTEXITCODE -ne 0) {
    Write-FAIL "Login failed."
    Pause-Script "Press Enter to exit..."
    exit 1
}

Write-OK "Login successful."
Start-Sleep -Seconds 1

# ===========================================================
#  STEP 3
# ===========================================================

Write-Step 3 "VALIDATING SUBSCRIPTION" "Checking subscription is active"

Write-BUSY "Reading subscription info..."
$acct = az account show 2>$null | ConvertFrom-Json

if (-not $acct) {
    Write-FAIL "Could not read subscription."
    Pause-Script "Press Enter to exit..."
    exit 1
}

$subName = $acct.name
$subId = $acct.id
$subState = $acct.state

Write-Host ""
Write-Host "   Subscription:  $subName" -ForegroundColor White
Write-Host "   ID:            $subId" -ForegroundColor White
Write-Host "   State:         $subState" -ForegroundColor White
Write-Host ""

if ($subState -ne "Enabled") {
    Write-FAIL "Subscription is $subState -- it must be Enabled."
    Pause-Script "Press Enter to exit..."
    exit 1
}

Write-OK "Subscription is active."
Start-Sleep -Seconds 1

# ===========================================================
#  STEP 4: DEPLOY (with auto-retry for subnet delegation)
# ===========================================================

Write-Step 4 "DEPLOYING SCIMTOOL" "Main deployment -- about 5-10 minutes"

Write-Host "   .------------------------------------------------------." -ForegroundColor Yellow
Write-Host "   | THE SCRIPT WILL ASK YOU QUESTIONS:                    |" -ForegroundColor Yellow
Write-Host "   |                                                      |" -ForegroundColor Yellow
Write-Host "   |  Change subscription?  ->  N                         |" -ForegroundColor Yellow
Write-Host "   |  Resource Group        ->  Press Enter for default   |" -ForegroundColor Yellow
Write-Host "   |  App Name              ->  Press Enter for default   |" -ForegroundColor Yellow
Write-Host "   |  Location              ->  Press Enter for default   |" -ForegroundColor Yellow
Write-Host "   |  Secrets (3 prompts)   ->  Press Enter to generate   |" -ForegroundColor Yellow
Write-Host "   |                                                      |" -ForegroundColor Yellow
Write-Host "   |  IMPORTANT: Just press Enter on everything.          |" -ForegroundColor Yellow
Write-Host "   |  Do NOT type custom names.                           |" -ForegroundColor Yellow
Write-Host "   |                                                      |" -ForegroundColor Yellow
Write-Host "   |  Then WAIT about 10 min. DO NOT close this window.   |" -ForegroundColor Yellow
Write-Host "   '------------------------------------------------------'" -ForegroundColor Yellow

Pause-Script "Press Enter to start deployment..."

Write-Host ""
Write-Host "  ===== BOOTSTRAP OUTPUT START =============================" -ForegroundColor Magenta
Write-Host ""

try { Start-Transcript -Path $logFile -Force | Out-Null } catch { }

try {
    $bootstrapScript = (Invoke-WebRequest -Uri "https://raw.githubusercontent.com/kayasax/SCIMTool/master/bootstrap.ps1" -UseBasicParsing).Content
    Invoke-Expression $bootstrapScript
} catch {
    Write-FAIL "Bootstrap error: $($_.Exception.Message)"
}

try { Stop-Transcript | Out-Null } catch { }

Write-Host ""
Write-Host "  ===== BOOTSTRAP OUTPUT END ===============================" -ForegroundColor Magenta
Write-Host ""

# --- Check for subnet delegation error ---
$parsed = Parse-Log $logFile

if ($parsed.HasSubnetError) {
    Write-Host ""
    Write-Host "  ==========================================================" -ForegroundColor Yellow
    Write-Host "   DETECTED: Subnet Delegation Error" -ForegroundColor Yellow
    Write-Host "   This is a known issue. Fixing automatically..." -ForegroundColor Yellow
    Write-Host "  ==========================================================" -ForegroundColor Yellow
    Write-Host ""

    # Get RG and App Name from the log
    $fixRG = $parsed.RG
    $fixApp = $parsed.AppName

    if (-not $fixRG) {
        $fixRG = Read-Host "   Type the Resource Group name from the output above"
    }
    if (-not $fixApp) {
        $fixApp = Read-Host "   Type the App Name from the output above"
    }

    $fixVnet = $fixApp + "-vnet"

    Write-BUSY "Delegating subnet to Microsoft.App/environments..."
    az network vnet subnet update --resource-group $fixRG --vnet-name $fixVnet --name aca-infra --delegations Microsoft.App/environments --output none 2>$null

    if ($LASTEXITCODE -eq 0) {
        Write-OK "Subnet delegated successfully."
    } else {
        Write-FAIL "Could not delegate subnet."
        Write-Host "   Try manually:" -ForegroundColor Yellow
        $manualFix = "az network vnet subnet update --resource-group " + $fixRG + " --vnet-name " + $fixVnet + " --name aca-infra --delegations Microsoft.App/environments"
        Write-Host "   $manualFix" -ForegroundColor White
        Pause-Script "Press Enter after running the command manually, or to exit..."
    }

    Write-Host ""
    Write-Host "  ===== RE-RUNNING BOOTSTRAP ===============================" -ForegroundColor Magenta
    Write-Host ""
    Write-NOTE "The bootstrap will detect existing resources and continue."
    Write-NOTE "When it asks questions, use the SAME values as before."
    Write-NOTE "Just press Enter on everything."
    Write-Host ""

    Pause-Script "Press Enter to re-run deployment..."

    Write-Host ""
    Write-Host "  ===== BOOTSTRAP RETRY OUTPUT START =======================" -ForegroundColor Magenta
    Write-Host ""

    try { Start-Transcript -Path $logFile2 -Force | Out-Null } catch { }

    try {
        $bootstrapScript2 = (Invoke-WebRequest -Uri "https://raw.githubusercontent.com/kayasax/SCIMTool/master/bootstrap.ps1" -UseBasicParsing).Content
        Invoke-Expression $bootstrapScript2
    } catch {
        Write-FAIL "Bootstrap retry error: $($_.Exception.Message)"
    }

    try { Stop-Transcript | Out-Null } catch { }

    Write-Host ""
    Write-Host "  ===== BOOTSTRAP RETRY OUTPUT END =========================" -ForegroundColor Magenta
    Write-Host ""

    # Re-parse from retry log
    $parsed2 = Parse-Log $logFile2
    if ($parsed2.AppUrl)  { $parsed.AppUrl  = $parsed2.AppUrl }
    if ($parsed2.ScimEp)  { $parsed.ScimEp  = $parsed2.ScimEp }
    if ($parsed2.Secret)  { $parsed.Secret  = $parsed2.Secret }
    if ($parsed2.JWT)     { $parsed.JWT     = $parsed2.JWT }
    if ($parsed2.OAuth)   { $parsed.OAuth   = $parsed2.OAuth }
    if ($parsed2.RG)      { $parsed.RG      = $parsed2.RG }
    if ($parsed2.AppName) { $parsed.AppName = $parsed2.AppName }

    if ($parsed2.HasSubnetError) {
        Write-FAIL "Subnet error occurred again. Deployment cannot continue."
        Write-Host "   Please delete the Resource Group and try again:" -ForegroundColor Yellow
        Write-Host "   az group delete --name $fixRG --yes --no-wait" -ForegroundColor White
        Pause-Script "Press Enter to exit..."
        exit 1
    }
}

Write-OK "Bootstrap completed."
Start-Sleep -Seconds 2

# ===========================================================
#  STEP 5: EXTRACT DETAILS
# ===========================================================

Write-Step 5 "READING DEPLOYMENT DETAILS" "Extracting URLs and secrets from output"

$appUrl  = $parsed.AppUrl
$scimEp  = $parsed.ScimEp
$scimSec = $parsed.Secret
$jwtSec  = $parsed.JWT
$oaSec   = $parsed.OAuth
$rg      = $parsed.RG
$appName = $parsed.AppName

if (-not $appUrl) {
    Write-WARN "Could not auto-detect App URL."
    Write-NOTE "Scroll up and look for FINAL URL or App URL."
    $appUrl = Read-Host "   Paste your App URL"
}
if ((-not $scimEp) -and $appUrl) { $scimEp = $appUrl.TrimEnd('/') + "/scim/v2" }
if (-not $scimSec) {
    Write-WARN "Could not auto-detect SCIM Secret."
    $scimSec = Read-Host "   Paste your SCIM Shared Secret"
}
if (-not $rg) {
    Write-WARN "Could not auto-detect Resource Group."
    $rg = Read-Host "   Type your Resource Group name"
}
if (-not $appName) {
    if ($appUrl -match 'https://([^.]+)\.') { $appName = $matches[1].Trim() }
}
if (-not $appName) { $appName = Read-Host "   Type your App Name" }
if (-not $jwtSec) { $jwtSec = "See deployment output above" }
if (-not $oaSec)  { $oaSec  = "See deployment output above" }

Write-Host ""
Write-Host "   App URL:         $appUrl" -ForegroundColor Cyan
Write-Host "   SCIM Endpoint:   $scimEp" -ForegroundColor Cyan
Write-Host "   Resource Group:  $rg" -ForegroundColor Cyan
Write-Host "   App Name:        $appName" -ForegroundColor Cyan
Write-Host ""

Write-OK "Details captured."
Start-Sleep -Seconds 1

# ===========================================================
#  STEP 6: NSG FIX
# ===========================================================

Write-Step 6 "FIXING NETWORK ACCESS" "Adding HTTPS inbound rule to NSG"

Write-BUSY "Detecting location..."
$loc = $null
try {
    $appJson = az containerapp show --name $appName --resource-group $rg 2>$null | ConvertFrom-Json
    $loc = $appJson.location.ToLower().Replace(" ", "")
    Write-OK "Location: $loc"
} catch {
    $loc = "eastus"
    Write-WARN "Could not detect -- defaulting to eastus."
}

$nsg = $appName + "-vnet-aca-infra-nsg-" + $loc
Write-NOTE "NSG: $nsg"

Write-BUSY "Checking if rule exists..."
$exists = $false
try {
    $null = az network nsg rule show --nsg-name $nsg --resource-group $rg --name AllowHTTPS 2>$null
    if ($LASTEXITCODE -eq 0) { $exists = $true }
} catch { }

if ($exists) {
    Write-OK "HTTPS rule already exists -- skipping."
} else {
    Write-BUSY "Creating AllowHTTPS rule..."
    az network nsg rule create --resource-group $rg --nsg-name $nsg --name AllowHTTPS --priority 100 --direction Inbound --access Allow --protocol Tcp --source-address-prefixes "*" --destination-port-ranges 443 --description "Allow HTTPS inbound for SCIMTool" --output none 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-OK "NSG rule created."
    } else {
        Write-FAIL "Could not create rule automatically."
        $manualCmd = 'az network nsg rule create --resource-group ' + $rg + ' --nsg-name ' + $nsg + ' --name AllowHTTPS --priority 100 --direction Inbound --access Allow --protocol Tcp --source-address-prefixes "*" --destination-port-ranges 443'
        Write-Host "   Run this manually:" -ForegroundColor Yellow
        Write-Host "   $manualCmd" -ForegroundColor White
    }
}

Start-Sleep -Seconds 1

# ===========================================================
#  STEP 7: VERIFY
# ===========================================================

Write-Step 7 "VERIFYING CONNECTIVITY" "Testing that the dashboard loads"

Wait-Seconds 30 "Waiting for NSG propagation"

$live = $false
$attempt = 1
while ($attempt -le 4) {
    $msg = "Connection attempt " + $attempt.ToString() + " of 4..."
    Write-BUSY $msg
    try {
        $r = Invoke-WebRequest -Uri $appUrl -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
        if ($r.StatusCode -eq 200) {
            $live = $true
            Write-OK "Dashboard is LIVE! HTTP 200"
            break
        }
    } catch {
        if ($attempt -lt 4) { Wait-Seconds 15 "Retrying" }
    }
    $attempt = $attempt + 1
}

if (-not $live) {
    Write-WARN "Not reachable yet -- try the URL in your browser in a few minutes."
    Write-NOTE $appUrl
}

Start-Sleep -Seconds 1

# ===========================================================
#  STEP 8: SAVE
# ===========================================================

Write-Step 8 "SAVING CREDENTIALS" "Writing to Desktop file"

$lines = @()
$lines += "==========================================================="
$lines += "  SCIMTool Lab -- Deployment Credentials"
$lines += "  Generated: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
$lines += "==========================================================="
$lines += ""
$lines += "SUBSCRIPTION"
$lines += "  Name: $subName"
$lines += "  ID:   $subId"
$lines += ""
$lines += "AZURE RESOURCES"
$lines += "  Resource Group: $rg"
$lines += "  App Name:       $appName"
$lines += "  Location:       $loc"
$lines += ""
$lines += "URLS"
$lines += "  Dashboard:     $appUrl"
$lines += "  SCIM Endpoint: $scimEp"
$lines += ""
$lines += "SECRETS"
$lines += "  SCIM Shared Secret:  $scimSec"
$lines += "  JWT Secret:          $jwtSec"
$lines += "  OAuth Client Secret: $oaSec"
$lines += ""
$lines += "==========================================================="
$lines += "  NEXT STEPS -- Configure Entra ID"
$lines += "==========================================================="
$lines += ""
$lines += "STEP A: Open the Dashboard"
$lines += "  1. Go to: $appUrl"
$lines += "  2. It will ask for a Bearer Token."
$lines += "  3. Paste this value: $scimSec"
$lines += "  4. Click Save Token."
$lines += ""
$lines += "STEP B: Create Enterprise Application"
$lines += "  1. Go to https://entra.microsoft.com"
$lines += "  2. Identity then Applications then Enterprise applications"
$lines += "  3. Click: New application"
$lines += "  4. Click: Create your own application"
$lines += "  5. Name: SCIMTool Lab"
$lines += "  6. Select: Integrate any other application you don't"
$lines += "     find in the gallery -- Non-gallery"
$lines += "  7. Click: Create"
$lines += ""
$lines += "STEP C: Configure Provisioning"
$lines += "  1. In your app, click: Provisioning in left menu"
$lines += "  2. Click: Get started"
$lines += "  3. Provisioning Mode: Automatic"
$lines += "  4. Expand Admin Credentials:"
$lines += "     Tenant URL:   $scimEp"
$lines += "     Secret Token: $scimSec"
$lines += "  5. Click: Test Connection"
$lines += "     You should see a green success message."
$lines += "  6. Click: Save"
$lines += ""
$lines += "STEP D: Start Provisioning and Test"
$lines += "  1. In Settings section: Provisioning Status = On"
$lines += "  2. Click: Save"
$lines += "  3. Go to: Users and groups in left menu"
$lines += "  4. Click: Add user/group"
$lines += "  5. Select yourself or a test user then Assign"
$lines += "  6. Go to: Provisioning then Provision on demand"
$lines += "  7. Search your user then Click Provision"
$lines += "  8. Open the Dashboard URL -- you should see"
$lines += "     a User created event in the Activity Feed."
$lines += ""
$lines += "==========================================================="
$lines += "  KEEP THIS FILE SAFE."
$lines += "  These credentials are NOT stored anywhere else."
$lines += "  Save a backup in OneNote or Teams."
$lines += "==========================================================="

$content = $lines -join "`r`n"

try {
    $content | Out-File -FilePath $credFile -Encoding UTF8
    Write-OK "Saved to Desktop:"
    Write-Host "   $credFile" -ForegroundColor Cyan
} catch {
    Write-FAIL "Could not write file. Printing credentials:"
    Write-Host ""
    Write-Host $content
}

if ($live) {
    Write-BUSY "Opening dashboard..."
    Start-Process $appUrl
}

# Cleanup
if (Test-Path $logFile)  { Remove-Item $logFile  -Force -ErrorAction SilentlyContinue }
if (Test-Path $logFile2) { Remove-Item $logFile2 -Force -ErrorAction SilentlyContinue }

# ===========================================================
#  FINAL
# ===========================================================

Write-Host ""
Write-Host ""
Write-Host "  ==========================================================" -ForegroundColor Green
Write-Host "      DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "  ==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "   Credentials file:  $credFile" -ForegroundColor Cyan
Write-Host "   Dashboard:         $appUrl" -ForegroundColor Cyan
Write-Host "   SCIM Endpoint:     $scimEp" -ForegroundColor Cyan
Write-Host ""

if ($live) {
    Write-Host "   Status: LIVE" -ForegroundColor Green
} else {
    Write-Host "   Status: Deployed -- try URL in browser shortly." -ForegroundColor Yellow
}

Write-Host ""
Write-Host ""
Write-Host "  ==========================================================" -ForegroundColor White
Write-Host "   WHAT TO DO NOW -- Entra ID Setup Instructions" -ForegroundColor White
Write-Host "  ==========================================================" -ForegroundColor White
Write-Host ""
Write-Host "   A. OPEN THE DASHBOARD" -ForegroundColor Cyan
Write-Host "      Go to: $appUrl" -ForegroundColor White
Write-Host "      When it asks for Bearer Token, paste:" -ForegroundColor White
Write-Host "      $scimSec" -ForegroundColor Yellow
Write-Host "      Click Save Token." -ForegroundColor White
Write-Host ""
Write-Host "   B. CREATE THE ENTERPRISE APP IN ENTRA" -ForegroundColor Cyan
Write-Host "      1. Go to https://entra.microsoft.com" -ForegroundColor White
Write-Host "      2. Identity then Applications then Enterprise apps" -ForegroundColor White
Write-Host "      3. New application then Create your own application" -ForegroundColor White
Write-Host "      4. Name it: SCIMTool Lab" -ForegroundColor White
Write-Host "      5. Select: Non-gallery then Create" -ForegroundColor White
Write-Host ""
Write-Host "   C. CONFIGURE PROVISIONING" -ForegroundColor Cyan
Write-Host "      1. Go to Provisioning then Get started" -ForegroundColor White
Write-Host "      2. Mode: Automatic" -ForegroundColor White
Write-Host "      3. Tenant URL -- copy this:" -ForegroundColor White
Write-Host "         $scimEp" -ForegroundColor Yellow
Write-Host "      4. Secret Token -- copy this:" -ForegroundColor White
Write-Host "         $scimSec" -ForegroundColor Yellow
Write-Host "      5. Click Test Connection -- should show green" -ForegroundColor White
Write-Host "      6. Click Save" -ForegroundColor White
Write-Host ""
Write-Host "   D. TEST IT" -ForegroundColor Cyan
Write-Host "      1. Set Provisioning Status to On then Save" -ForegroundColor White
Write-Host "      2. Users and groups then Add yourself" -ForegroundColor White
Write-Host "      3. Provision on demand then Select user then Provision" -ForegroundColor White
Write-Host "      4. Check dashboard for User created event" -ForegroundColor White
Write-Host ""
Write-Host "  ==========================================================" -ForegroundColor DarkGray
Write-Host ""
Write-Host "   All instructions also saved in the file on your Desktop." -ForegroundColor Gray
Write-Host ""
Write-Host "   Press Enter to close this window..." -ForegroundColor Yellow
Read-Host
