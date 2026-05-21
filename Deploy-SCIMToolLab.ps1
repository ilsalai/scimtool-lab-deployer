# SCIMTool Lab - One-Click Deployment v0.8.1
# Based on github.com/kayasax/SCIMTool
# Author: Silvestre Gaitan - Nebula Mexico - April 2026
#
# RUN: Set-ExecutionPolicy Bypass -Scope Process -Force; & "$env:USERPROFILE\Downloads\Deploy-SCIMToolLab.ps1"

try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
    chcp 65001 | Out-Null
} catch { }

try { Set-ExecutionPolicy Bypass -Scope Process -Force -ErrorAction SilentlyContinue } catch { }

$ErrorActionPreference = "Continue"
$desktopPath = [Environment]::GetFolderPath("Desktop")
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$credFile = Join-Path $desktopPath "SCIMTool-Credentials-$ts.txt"
$logFile = Join-Path $env:TEMP "scimtool-log-$ts.txt"
$logFile2 = Join-Path $env:TEMP "scimtool-log2-$ts.txt"
$totalSteps = 7

# --- Unicode glyphs, assembled at runtime so this file stays pure ASCII ---
$gH  = [string][char]0x2550  # horizontal double
$gTL = [string][char]0x2554  # top-left double
$gTR = [string][char]0x2557  # top-right double
$gBL = [string][char]0x255A  # bottom-left double
$gBR = [string][char]0x255D  # bottom-right double
$gML = [string][char]0x2560  # middle-left double
$gMR = [string][char]0x2563  # middle-right double
$lH  = [string][char]0x2500  # horizontal light
$lTL = [string][char]0x250C  # top-left light
$lTR = [string][char]0x2510  # top-right light
$lBL = [string][char]0x2514  # bottom-left light
$lBR = [string][char]0x2518  # bottom-right light
$branch    = [string][char]0x251C + [string][char]0x2500  # tree branch
$branchEnd = [string][char]0x2514 + [string][char]0x2500  # tree end
$blockOn   = [string][char]0x2588  # progress filled
$blockOff  = [string][char]0x2591  # progress empty
$spinnerFrames = @(
    [string][char]0x280B, [string][char]0x2819, [string][char]0x2839, [string][char]0x2838, [string][char]0x283C,
    [string][char]0x2834, [string][char]0x2826, [string][char]0x2827, [string][char]0x2807, [string][char]0x280F
)

$boxWidth = 66

# --- Visual helpers ---

function Write-Step {
    param([int]$Num, [string]$Title, [string]$Desc)
    $pct = [math]::Round(($Num / $totalSteps) * 100)
    $filled = [math]::Round(30 * $Num / $totalSteps)
    $empty = 30 - $filled
    $bar = ($blockOn * $filled) + ($blockOff * $empty)
    $top = "  " + $lTL + ($lH * ($boxWidth - 2)) + $lTR
    $bot = "  " + $lBL + ($lH * ($boxWidth - 2)) + $lBR
    Write-Host ""
    Write-Host $top -ForegroundColor DarkGray
    Write-Host ("   STEP " + $Num + " of " + $totalSteps + "  [" + $bar + "]  " + $pct + "%") -ForegroundColor White
    Write-Host ("   " + $Title) -ForegroundColor Cyan
    if ($Desc) { Write-Host ("   " + $Desc) -ForegroundColor Gray }
    Write-Host $bot -ForegroundColor DarkGray
    Write-Host ""
}

function Write-OK   { param([string]$M) Write-Host "   [OK]   $M" -ForegroundColor Green }
function Write-WARN { param([string]$M) Write-Host "   [WARN] $M" -ForegroundColor Yellow }
function Write-FAIL { param([string]$M) Write-Host "   [FAIL] $M" -ForegroundColor Red }
function Write-NOTE { param([string]$M) Write-Host "   [INFO] $M" -ForegroundColor Gray }
function Write-BUSY { param([string]$M) Write-Host "   [....] $M" -ForegroundColor DarkYellow }

function Write-SubOK   { param([string]$M, [switch]$Last) $c = if ($Last) { $branchEnd } else { $branch }; Write-Host ("   " + $c + " [OK]   " + $M) -ForegroundColor Green }
function Write-SubWARN { param([string]$M, [switch]$Last) $c = if ($Last) { $branchEnd } else { $branch }; Write-Host ("   " + $c + " [WARN] " + $M) -ForegroundColor Yellow }
function Write-SubFAIL { param([string]$M, [switch]$Last) $c = if ($Last) { $branchEnd } else { $branch }; Write-Host ("   " + $c + " [FAIL] " + $M) -ForegroundColor Red }
function Write-SubINFO { param([string]$M, [switch]$Last) $c = if ($Last) { $branchEnd } else { $branch }; Write-Host ("   " + $c + " [INFO] " + $M) -ForegroundColor Gray }
function Write-SubBUSY { param([string]$M, [switch]$Last) $c = if ($Last) { $branchEnd } else { $branch }; Write-Host ("   " + $c + " [....] " + $M) -ForegroundColor DarkYellow }

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

function Show-Spinner {
    param(
        [Parameter(Mandatory)][scriptblock]$ScriptBlock,
        [Parameter(Mandatory)][string]$Message,
        [object[]]$ArgumentList = @()
    )
    $job = Start-Job -ScriptBlock $ScriptBlock -ArgumentList $ArgumentList
    $i = 0
    while ($job.State -eq 'Running') {
        $frame = $spinnerFrames[$i % $spinnerFrames.Count]
        $line = "`r   " + $frame + " " + $Message + "   "
        Write-Host $line -NoNewline -ForegroundColor DarkYellow
        Start-Sleep -Milliseconds 120
        $i = $i + 1
    }
    $output = Receive-Job -Job $job -ErrorAction SilentlyContinue
    $succeeded = ($job.State -eq 'Completed')
    Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
    $clear = "`r" + (" " * 80) + "`r"
    Write-Host $clear -NoNewline
    return [pscustomobject]@{ Success = $succeeded; Output = $output }
}

function Invoke-AzLogin {
    param([switch]$DeviceCode)
    if ($DeviceCode) {
        Write-Host ""
        Write-Host "   .------------------------------------------------------." -ForegroundColor Yellow
        Write-Host "   | DEVICE CODE LOGIN                                    |" -ForegroundColor Yellow
        Write-Host "   |                                                      |" -ForegroundColor Yellow
        Write-Host "   | 1. A short code will appear below.                   |" -ForegroundColor Yellow
        Write-Host "   | 2. Open in any browser, even on your phone:          |" -ForegroundColor Yellow
        Write-Host "   |      https://microsoft.com/devicelogin               |" -ForegroundColor Yellow
        Write-Host "   | 3. Enter the code, then sign in.                     |" -ForegroundColor Yellow
        Write-Host "   | 4. Come back to this window when done.               |" -ForegroundColor Yellow
        Write-Host "   '------------------------------------------------------'" -ForegroundColor Yellow
        Write-Host ""
        az login --use-device-code
    } else {
        az login
    }
    return ($LASTEXITCODE -eq 0)
}

function Get-AzSubscriptionList {
    $out = az account list --all --output json 2>$null
    if (-not $out) { return }
    try {
        return ($out | ConvertFrom-Json)
    } catch {
        return
    }
}

function Get-SubTenantLabel {
    param($Sub)
    if ($Sub.PSObject.Properties.Name -contains "tenantDisplayName" -and $Sub.tenantDisplayName) {
        return $Sub.tenantDisplayName
    }
    return $Sub.tenantId
}

function Test-AppName {
    param([string]$Name)
    if ($Name.Length -lt 3 -or $Name.Length -gt 30) { return $false }
    return ($Name -match '^[a-z][a-z0-9-]{1,28}[a-z0-9]$')
}

function Remove-DeployedResources {
    param([string]$ResourceGroup)
    if (-not $ResourceGroup) { return }
    Write-BUSY ("Deleting resource group " + $ResourceGroup + "...")
    az group delete --name $ResourceGroup --yes --no-wait --output none 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-OK "Cleanup initiated -- runs in background."
    } else {
        Write-WARN "Cleanup could not be started. Delete the RG manually in the portal."
    }
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
$bTop = "  " + $gTL + ($gH * ($boxWidth - 2)) + $gTR
$bMid = "  " + $gML + ($gH * ($boxWidth - 2)) + $gMR
$bBot = "  " + $gBL + ($gH * ($boxWidth - 2)) + $gBR
Write-Host ""
Write-Host $bTop -ForegroundColor Cyan
Write-Host "      SCIMTool Lab -- One-Click Deployment  v0.8.1" -ForegroundColor Cyan
Write-Host $bMid -ForegroundColor Cyan
Write-Host "      A personal SCIM 2.0 provisioning lab in Azure." -ForegroundColor Gray
Write-Host "      Based on: github.com/kayasax/SCIMTool" -ForegroundColor Gray
Write-Host $bBot -ForegroundColor Cyan
Write-Host ""
Write-Host "  This script will:" -ForegroundColor White
Write-Host "   1. Check Azure CLI is installed" -ForegroundColor Gray
Write-Host "   2. Log you into Azure (browser or device code)" -ForegroundColor Gray
Write-Host "   3. Pick which subscription to deploy into" -ForegroundColor Gray
Write-Host "   4. Pre-create infra then run the bootstrap -- about 10 min" -ForegroundColor Gray
Write-Host "   5. Read deployment details" -ForegroundColor Gray
Write-Host "   6. Verify the endpoint is reachable" -ForegroundColor Gray
Write-Host "   7. Save credentials to your Desktop" -ForegroundColor Gray
Write-Host ""
Write-Host "  You interact at steps 2-4. The rest is automatic." -ForegroundColor Yellow
Pause-Script "Press Enter to begin..."

# ===========================================================
#  STEP 1: PREREQUISITES
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
#  STEP 2: AZURE LOGIN (with device-code fallback)
# ===========================================================

Write-Step 2 "AZURE LOGIN" "Browser sign-in with device-code fallback"

Write-NOTE "After signing in, come back to this window."
Pause-Script "Press Enter to open login page..."

Write-BUSY "Opening browser for login..."
$loginOk = Invoke-AzLogin

$subs = @()
if ($loginOk) { $subs = @(Get-AzSubscriptionList) }

if (-not $loginOk -or $subs.Count -eq 0) {
    Write-Host ""
    if (-not $loginOk) {
        Write-WARN "Standard browser login did not complete."
    } else {
        Write-WARN "Signed in, but no subscriptions were returned."
    }
    Write-Host ""
    Write-Host "   Device-code login often helps when:" -ForegroundColor Yellow
    Write-Host "     - Conditional Access is blocking the embedded browser" -ForegroundColor Yellow
    Write-Host "     - You need to sign into a different tenant" -ForegroundColor Yellow
    Write-Host "     - MFA is not completing in the standard flow" -ForegroundColor Yellow
    Write-Host ""
    $ans = Read-Host "   Retry with device code? [Y/n]"
    if ($ans -eq "" -or $ans -match '^[Yy]') {
        $loginOk = Invoke-AzLogin -DeviceCode
        if (-not $loginOk) {
            Write-FAIL "Device-code login failed."
            Pause-Script "Press Enter to exit..."
            exit 1
        }
        $subs = @(Get-AzSubscriptionList)
    } elseif (-not $loginOk) {
        Write-FAIL "Login did not complete and device-code retry was declined."
        Pause-Script "Press Enter to exit..."
        exit 1
    }
}

Write-OK "Login successful."
Start-Sleep -Seconds 1

# ===========================================================
#  STEP 3: SELECT SUBSCRIPTION
# ===========================================================

Write-Step 3 "SELECTING SUBSCRIPTION" "Enumerating tenants and picking a target"

Write-BUSY "Enumerating subscriptions across all tenants..."
if ($subs.Count -eq 0) { $subs = @(Get-AzSubscriptionList) }

if ($subs.Count -eq 0) {
    Write-FAIL "Your account has no Azure subscriptions."
    Write-Host ""
    Write-Host "   This deployer needs at least one Enabled subscription." -ForegroundColor Yellow
    Write-Host "   Options:" -ForegroundColor Yellow
    Write-Host "     - Activate a Visual Studio / MSDN subscription" -ForegroundColor Yellow
    Write-Host "     - Request access to a lab subscription from your manager" -ForegroundColor Yellow
    Write-Host "     - Sign in again with an account that has a subscription" -ForegroundColor Yellow
    Pause-Script "Press Enter to exit..."
    exit 1
}

$foundMsg = "Found {0} subscription(s) across all tenants." -f $subs.Count
Write-OK $foundMsg

$enabledSubs = @($subs | Where-Object { $_.state -eq "Enabled" })

if ($enabledSubs.Count -eq 0) {
    $failMsg = "None of the {0} subscription(s) are Enabled." -f $subs.Count
    Write-FAIL $failMsg
    Write-Host ""
    Write-Host "   Current state:" -ForegroundColor Yellow
    $n = 1
    foreach ($s in $subs) {
        $tenantLabel = Get-SubTenantLabel $s
        $line = "      {0}. {1}  [{2}]  tenant: {3}" -f $n, $s.name, $s.state, $tenantLabel
        Write-Host $line -ForegroundColor White
        $n = $n + 1
    }
    Write-Host ""
    Write-Host "   Reactivate one in the Azure portal, or sign in with a" -ForegroundColor Yellow
    Write-Host "   different account that has an Enabled subscription." -ForegroundColor Yellow
    Pause-Script "Press Enter to exit..."
    exit 1
}

$chosen = $null

if ($enabledSubs.Count -eq 1) {
    $chosen = $enabledSubs[0]
    Write-OK "Exactly one Enabled subscription -- auto-selecting."
} else {
    $availMsg = "{0} Enabled subscriptions available." -f $enabledSubs.Count
    Write-OK $availMsg
    Write-Host ""
    Write-Host "   Pick one to deploy into:" -ForegroundColor Cyan
    Write-Host ""
    $n = 1
    foreach ($s in $enabledSubs) {
        $tenantLabel = Get-SubTenantLabel $s
        $line1 = "      {0}. {1}" -f $n, $s.name
        $line2 = "         state:  {0}" -f $s.state
        $line3 = "         tenant: {0}" -f $tenantLabel
        Write-Host $line1 -ForegroundColor White
        Write-Host $line2 -ForegroundColor Gray
        Write-Host $line3 -ForegroundColor Gray
        Write-Host ""
        $n = $n + 1
    }

    $pick = 0
    while ($pick -lt 1 -or $pick -gt $enabledSubs.Count) {
        $promptText = "   Enter a number [1-{0}]" -f $enabledSubs.Count
        $raw = Read-Host $promptText
        $parsed = 0
        if ([int]::TryParse($raw, [ref]$parsed)) {
            $pick = $parsed
        }
        if ($pick -lt 1 -or $pick -gt $enabledSubs.Count) {
            $warnMsg = "Please enter a number between 1 and {0}." -f $enabledSubs.Count
            Write-WARN $warnMsg
        }
    }
    $chosen = $enabledSubs[$pick - 1]
}

Write-BUSY "Setting active subscription..."
az account set --subscription $chosen.id --output none 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-FAIL "Could not switch to the selected subscription."
    Pause-Script "Press Enter to exit..."
    exit 1
}

$subName = $chosen.name
$subId = $chosen.id
$subState = $chosen.state

Write-Host ""
Write-Host "   Subscription:  $subName" -ForegroundColor White
Write-Host "   ID:            $subId" -ForegroundColor White
Write-Host "   State:         $subState" -ForegroundColor White
Write-Host ""

Write-OK "Subscription is active."
Start-Sleep -Seconds 1

# ===========================================================
#  STEP 4: PRE-CREATE INFRA + BOOTSTRAP + NSG
# ===========================================================

Write-Step 4 "DEPLOYING SCIMTOOL" "Pre-create infra, run bootstrap, apply NSG rule"

# Generate names at the start of Step 4
$rg = "scimtool-rg-" + (Get-Random -Minimum 1000 -Maximum 9999)
$app = "scimtool-app-" + (Get-Random -Minimum 1000 -Maximum 9999)
$loc = "eastus"

Write-Host ""
Write-Host "   Pre-generated names:" -ForegroundColor Cyan
Write-Host ("     Resource Group: " + $rg) -ForegroundColor White
Write-Host ("     App Name:       " + $app) -ForegroundColor White
Write-Host ("     Location:       " + $loc) -ForegroundColor White
Write-Host ""
Write-Host "   [1] Use defaults (recommended)" -ForegroundColor Gray
Write-Host "   [2] Customize App name (RG stays default)" -ForegroundColor Gray
Write-Host ""

$choice = ""
while ($choice -ne "1" -and $choice -ne "2") {
    $choice = Read-Host "   Enter 1 or 2 (default: 1)"
    if ($choice -eq "") { $choice = "1" }
}

if ($choice -eq "2") {
    $valid = $false
    while (-not $valid) {
        $customApp = Read-Host "   App name (lowercase + numbers + hyphens; 3-30 chars; start with letter)"
        if (Test-AppName $customApp) {
            $app = $customApp
            $valid = $true
        } else {
            Write-WARN "Invalid. Use lowercase letters, numbers, hyphens. Start with letter, end alphanumeric, 3-30 chars."
        }
    }
}

Write-Host ""
Write-OK ("Final names: RG=" + $rg + "  App=" + $app + "  Loc=" + $loc)

# Pre-configure the upstream bootstrap via env vars (verified against
# kayasax/SCIMTool@master). UNATTENDED=1 is what actually skips the prompts;
# the others seed the values it would otherwise generate randomly.
$env:SCIMTOOL_RG         = $rg
$env:SCIMTOOL_APP        = $app
$env:SCIMTOOL_LOCATION   = $loc
$env:SCIMTOOL_UNATTENDED = '1'

$step4Failed = $false
$step4FailMsg = ""
$parsed = @{}
$vnet = $app + "-vnet"

try {
    # --- 4a: Pre-create Resource Group ---
    Write-Host ""
    Write-NOTE "4a. Creating Resource Group..."
    az group create --name $rg --location $loc --output none 2>$null
    if ($LASTEXITCODE -ne 0) { throw "Could not create resource group $rg." }
    Write-SubOK ("RG created: " + $rg) -Last

    # --- 4b: Pre-create VNet with pre-delegated aca-infra + private-endpoints subnets ---
    Write-Host ""
    Write-NOTE "4b. Creating VNet with pre-delegated aca-infra subnet..."

    $vnetResult = Show-Spinner -Message ("Creating VNet " + $vnet + " (10.0.0.0/16)...") -ArgumentList $rg, $vnet -ScriptBlock {
        param($rgArg, $vnetArg)
        az network vnet create --resource-group $rgArg --name $vnetArg --address-prefix 10.0.0.0/16 --subnet-name aca-infra --subnet-prefix 10.0.0.0/23 --output none
        $LASTEXITCODE
    }
    if (-not $vnetResult.Success -or $vnetResult.Output -ne 0) { throw "VNet creation failed (exit code $($vnetResult.Output))." }
    Write-SubOK ("VNet created: " + $vnet + " (10.0.0.0/16)")
    Write-SubOK "Subnet aca-infra created (10.0.0.0/23)"

    Write-SubBUSY "Delegating aca-infra to Microsoft.App/environments..."
    az network vnet subnet update --resource-group $rg --vnet-name $vnet --name aca-infra --delegations Microsoft.App/environments --output none 2>$null
    if ($LASTEXITCODE -ne 0) { throw "Subnet delegation failed." }
    Write-SubOK "aca-infra delegated to Microsoft.App/environments"

    Write-SubBUSY "Creating private-endpoints subnet..."
    az network vnet subnet create --resource-group $rg --vnet-name $vnet --name private-endpoints --address-prefixes 10.0.2.0/24 --output none 2>$null
    if ($LASTEXITCODE -ne 0) { throw "private-endpoints subnet creation failed." }
    Write-SubOK "private-endpoints subnet created (10.0.2.0/24)"

    # aca-runtime: workload subnet for the Container App Environment in Workload
    # Profiles mode. Upstream Bicep (kayasax/SCIMTool infra/networking.bicep)
    # declares this with policies Disabled and default CIDR 10.40.8.0/21 (which
    # does NOT fit our 10.0.0.0/16 VNet) -- we place it at 10.0.8.0/21 instead.
    # When this subnet is missing, the upstream bootstrap logs "Failed to create
    # subnet aca-runtime" and proceeds without it, leaving the container Unhealthy.
    Write-SubBUSY "Creating aca-runtime subnet..."
    az network vnet subnet create --resource-group $rg --vnet-name $vnet --name aca-runtime --address-prefixes 10.0.8.0/21 --private-endpoint-network-policies Disabled --private-link-service-network-policies Disabled --output none 2>$null
    if ($LASTEXITCODE -ne 0) { throw "aca-runtime subnet creation failed." }
    Write-SubOK "aca-runtime subnet created (10.0.8.0/21)" -Last

    # --- 4c: Run upstream bootstrap ---
    Write-Host ""
    Write-NOTE "4c. Running kayasax/SCIMTool bootstrap..."
    Write-Host ""
    Write-Host "   .------------------------------------------------------." -ForegroundColor Yellow
    Write-Host "   | BOOTSTRAP WILL ASK YOU ~6 QUESTIONS.                  |" -ForegroundColor Yellow
    Write-Host "   |                                                       |" -ForegroundColor Yellow
    Write-Host "   | Pre-configured names (use THESE if asked):            |" -ForegroundColor Yellow
    Write-Host ("   |   RG:       " + $rg.PadRight(40)       + "  |") -ForegroundColor Yellow
    Write-Host ("   |   App:      " + $app.PadRight(40)      + "  |") -ForegroundColor Yellow
    Write-Host ("   |   Location: " + $loc.PadRight(40)      + "  |") -ForegroundColor Yellow
    Write-Host "   |                                                       |" -ForegroundColor Yellow
    Write-Host "   | If the bootstrap offers these as defaults, just       |" -ForegroundColor Yellow
    Write-Host "   | press Enter. If a different default is shown, TYPE    |" -ForegroundColor Yellow
    Write-Host "   | the correct value from above.                         |" -ForegroundColor Yellow
    Write-Host "   |                                                       |" -ForegroundColor Yellow
    Write-Host "   | Secret prompts (3): press Enter to auto-generate.     |" -ForegroundColor Yellow
    Write-Host "   | 'Change subscription?' prompt: type N.                |" -ForegroundColor Yellow
    Write-Host "   '------------------------------------------------------'" -ForegroundColor Yellow
    Write-Host ""
    Pause-Script "Press Enter to start the bootstrap..."

    Write-Host ""
    Write-Host "  ===== BOOTSTRAP OUTPUT START =============================" -ForegroundColor Magenta
    Write-Host ""

    try { Start-Transcript -Path $logFile -Force | Out-Null } catch { }
    # Save bootstrap to temp .ps1 and invoke as a script. Avoids the PS7 optimizer
    # error "Cannot overwrite variable Branch" that hits when Invoke-Expression
    # compiles the script's nested param() blocks as a single scriptblock.
    # UTF-8 BOM so PS 5.1 doesn't misread non-ASCII chars as Windows-1252.
    $bootstrapPath = Join-Path $env:TEMP ("scimtool-bootstrap-" + $ts + ".ps1")
    try {
        $bootstrapScript = (Invoke-WebRequest -Uri "https://raw.githubusercontent.com/kayasax/SCIMTool/master/bootstrap.ps1" -UseBasicParsing).Content
        [System.IO.File]::WriteAllText($bootstrapPath, $bootstrapScript, [System.Text.UTF8Encoding]::new($true))
        & $bootstrapPath
    } catch {
        Write-FAIL "Bootstrap error: $($_.Exception.Message)"
    } finally {
        if (Test-Path $bootstrapPath) { Remove-Item $bootstrapPath -Force -ErrorAction SilentlyContinue }
    }
    try { Stop-Transcript | Out-Null } catch { }

    Write-Host ""
    Write-Host "  ===== BOOTSTRAP OUTPUT END ===============================" -ForegroundColor Magenta
    Write-Host ""

    $parsed = Parse-Log $logFile

    # Safety net: legacy subnet-delegation retry. With pre-creation, this should almost never fire.
    if ($parsed.HasSubnetError) {
        Write-WARN "Safety net fired: subnet delegation error after bootstrap. Re-delegating and retrying..."
        $fixVnet = if ($parsed.AppName) { $parsed.AppName + "-vnet" } else { $vnet }
        $fixRG = if ($parsed.RG) { $parsed.RG } else { $rg }
        az network vnet subnet update --resource-group $fixRG --vnet-name $fixVnet --name aca-infra --delegations Microsoft.App/environments --output none 2>$null

        try { Start-Transcript -Path $logFile2 -Force | Out-Null } catch { }
        $bootstrapPath2 = Join-Path $env:TEMP ("scimtool-bootstrap-retry-" + $ts + ".ps1")
        try {
            $bootstrapScript2 = (Invoke-WebRequest -Uri "https://raw.githubusercontent.com/kayasax/SCIMTool/master/bootstrap.ps1" -UseBasicParsing).Content
            [System.IO.File]::WriteAllText($bootstrapPath2, $bootstrapScript2, [System.Text.UTF8Encoding]::new($true))
            & $bootstrapPath2
        } catch {
            Write-FAIL "Bootstrap retry error: $($_.Exception.Message)"
        } finally {
            if (Test-Path $bootstrapPath2) { Remove-Item $bootstrapPath2 -Force -ErrorAction SilentlyContinue }
        }
        try { Stop-Transcript | Out-Null } catch { }

        $parsed2 = Parse-Log $logFile2
        foreach ($k in @('AppUrl','ScimEp','Secret','JWT','OAuth','RG','AppName')) {
            if ($parsed2.$k) { $parsed.$k = $parsed2.$k }
        }
        if ($parsed2.HasSubnetError) { throw "Subnet delegation error persisted on retry." }
    }

    if (-not $parsed.AppUrl) { throw "Bootstrap did not produce an App URL." }

    Write-Host ""
    Write-SubOK "Bootstrap completed"

    # --- 4d: Apply AllowHTTPS NSG rule ---
    Write-Host ""
    Write-NOTE "4d. Applying AllowHTTPS NSG rule..."
    $nsg = $app + "-vnet-aca-infra-nsg-" + $loc
    Write-SubINFO ("NSG: " + $nsg)

    $nsgExists = $false
    $null = az network nsg rule show --nsg-name $nsg --resource-group $rg --name AllowHTTPS 2>$null
    if ($LASTEXITCODE -eq 0) { $nsgExists = $true }

    if ($nsgExists) {
        Write-SubOK "AllowHTTPS rule already present -- skipping" -Last
    } else {
        Write-SubBUSY "Creating AllowHTTPS rule..."
        az network nsg rule create --resource-group $rg --nsg-name $nsg --name AllowHTTPS --priority 100 --direction Inbound --access Allow --protocol Tcp --source-address-prefixes "*" --destination-port-ranges 443 --description "Allow HTTPS inbound for SCIMTool" --output none 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-SubOK "AllowHTTPS rule created" -Last
        } else {
            Write-SubWARN "Could not create AllowHTTPS rule automatically (non-fatal)" -Last
        }
    }
} catch {
    $step4Failed = $true
    $step4FailMsg = $_.Exception.Message
    Write-FAIL ("Step 4 failed: " + $step4FailMsg)
}

if ($step4Failed) {
    Write-Host ""
    $cleanup = Read-Host "   Remove created resources ($rg)? [Y/n]"
    if ($cleanup -eq "" -or $cleanup -match '^[Yy]') {
        Remove-DeployedResources -ResourceGroup $rg
    }
    Pause-Script "Press Enter to exit..."
    exit 1
}

Write-OK "Step 4 complete."
Start-Sleep -Seconds 1

# ===========================================================
#  STEP 5: READ DEPLOYMENT DETAILS
# ===========================================================

Write-Step 5 "READING DEPLOYMENT DETAILS" "Extracting URLs and secrets from output"

$appUrl  = $parsed.AppUrl
$scimEp  = $parsed.ScimEp
$scimSec = $parsed.Secret
$jwtSec  = $parsed.JWT
$oaSec   = $parsed.OAuth

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
if (-not $jwtSec) { $jwtSec = "See deployment output above" }
if (-not $oaSec)  { $oaSec  = "See deployment output above" }

Write-Host ""
Write-Host ("   App URL:         " + $appUrl) -ForegroundColor Cyan
Write-Host ("   SCIM Endpoint:   " + $scimEp) -ForegroundColor Cyan
Write-Host ("   Resource Group:  " + $rg)     -ForegroundColor Cyan
Write-Host ("   App Name:        " + $app)    -ForegroundColor Cyan
Write-Host ""

Write-OK "Details captured."
Start-Sleep -Seconds 1

# ===========================================================
#  STEP 6: VERIFY CONNECTIVITY
# ===========================================================

Write-Step 6 "VERIFYING CONNECTIVITY" "Testing that the dashboard loads"

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
#  STEP 7: SAVE CREDENTIALS
# ===========================================================

Write-Step 7 "SAVING CREDENTIALS" "Writing to Desktop file"

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
$lines += "  App Name:       $app"
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
    Write-Host ("   " + $credFile) -ForegroundColor Cyan
} catch {
    Write-FAIL "Could not write file. Printing credentials:"
    Write-Host ""
    Write-Host $content
}

if ($live) {
    Write-BUSY "Opening dashboard..."
    Start-Process $appUrl
}

# Cleanup log files
if (Test-Path $logFile)  { Remove-Item $logFile  -Force -ErrorAction SilentlyContinue }
if (Test-Path $logFile2) { Remove-Item $logFile2 -Force -ErrorAction SilentlyContinue }

# ===========================================================
#  FINAL SUMMARY BOX
# ===========================================================

$maskedSecret = "(see credentials file)"
if ($scimSec -and $scimSec.Length -ge 8) {
    $maskedSecret = $scimSec.Substring(0, 8) + "... (full value in credentials file)"
}

$statusLabel = "DEPLOYED -- verify manually"
$statusColor = [ConsoleColor]::Yellow
if ($live) {
    $statusLabel = "LIVE"
    $statusColor = [ConsoleColor]::Green
}

$summaryTop = "  " + $gTL + ($gH * ($boxWidth - 2)) + $gTR
$summaryMid = "  " + $gML + ($gH * ($boxWidth - 2)) + $gMR
$summaryBot = "  " + $gBL + ($gH * ($boxWidth - 2)) + $gBR

Write-Host ""
Write-Host ""
Write-Host $summaryTop -ForegroundColor Green
Write-Host "                        DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host $summaryMid -ForegroundColor Green
Write-Host ""
Write-Host ("     Status:    " + $statusLabel) -ForegroundColor $statusColor
Write-Host ""
Write-Host "     Resources:" -ForegroundColor White
Write-Host ("       RG:        " + $rg)  -ForegroundColor Cyan
Write-Host ("       App:       " + $app) -ForegroundColor Cyan
Write-Host ("       Location:  " + $loc) -ForegroundColor Cyan
Write-Host ""
Write-Host "     URLs:" -ForegroundColor White
Write-Host ("       Dashboard:     " + $appUrl) -ForegroundColor Cyan
Write-Host ("       SCIM Endpoint: " + $scimEp) -ForegroundColor Cyan
Write-Host ""
Write-Host ("     Secret:    " + $maskedSecret) -ForegroundColor Yellow
Write-Host ("     Saved to:  " + $credFile) -ForegroundColor Gray
Write-Host ""
Write-Host $summaryBot -ForegroundColor Green
Write-Host ""

# ===========================================================
#  ENTRA ID INSTRUCTIONS
# ===========================================================

Write-Host ""
Write-Host "  ==========================================================" -ForegroundColor White
Write-Host "   NEXT: Configure Entra ID" -ForegroundColor White
Write-Host "  ==========================================================" -ForegroundColor White
Write-Host ""
Write-Host "   A. OPEN THE DASHBOARD" -ForegroundColor Cyan
Write-Host ("      Go to: " + $appUrl) -ForegroundColor White
Write-Host "      When it asks for Bearer Token, paste:" -ForegroundColor White
Write-Host ("      " + $scimSec) -ForegroundColor Yellow
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
Write-Host ("         " + $scimEp) -ForegroundColor Yellow
Write-Host "      4. Secret Token -- copy this:" -ForegroundColor White
Write-Host ("         " + $scimSec) -ForegroundColor Yellow
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
