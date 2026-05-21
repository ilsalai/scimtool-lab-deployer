# SCIMTool Lab Deployer

![Version](https://img.shields.io/badge/version-0.8-blue) ![Status](https://img.shields.io/badge/status-public%20beta-orange) ![PowerShell](https://img.shields.io/badge/PowerShell-5.1%20%7C%207.x-blue) ![Azure CLI](https://img.shields.io/badge/Azure%20CLI-2.50%2B-blue)

One-click PowerShell deployer for [kayasax/SCIMTool](https://github.com/kayasax/SCIMTool) — stands up your own SCIM 2.0 provisioning inspector in Azure in about 10 minutes. Point Microsoft Entra ID at it to see exactly what your tenant sends on the wire.

> **v0.8 is the first public beta.** It's been tested by the author on personal Visual Studio subscriptions. Treat it as a lab tool, not a production deployer. Read the [Known issues](#known-issues-v08-beta) section before you start. Feedback is very welcome via [GitHub issues](https://github.com/ilsalai/scimtool-lab-deployer/issues).

---

## Quick start

**1. Open PowerShell.** Windows Terminal preferred. Both Windows PowerShell 5.1 and PowerShell 7.x work.

**2. Paste these two lines:**

```powershell
iwr https://raw.githubusercontent.com/ilsalai/scimtool-lab-deployer/v0.8.0/Deploy-SCIMToolLab.ps1 -OutFile $env:USERPROFILE\Downloads\Deploy-SCIMToolLab.ps1
Set-ExecutionPolicy Bypass -Scope Process -Force; & "$env:USERPROFILE\Downloads\Deploy-SCIMToolLab.ps1"
```

**3. Follow the prompts.** You'll interact at three moments only: Azure sign-in, subscription pick (if you have more than one), and a "use default names?" prompt. Everything else is automatic.

**4. Wait about 10 minutes.** When the script finishes, your dashboard URL and SCIM endpoint are saved to `SCIMTool-Credentials-<timestamp>.txt` on your Desktop.

---

## Prerequisites — read this first

Before you run anything, confirm **all five** of these:

| Requirement | How to check | Where to get it |
|---|---|---|
| **Windows** with PowerShell 5.1 or newer | Run `$PSVersionTable.PSVersion` in PowerShell | Built into Windows 10/11 |
| **Azure CLI** 2.50 or newer | Run `az --version` | [Install Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) |
| **An Azure subscription** in **Enabled** state | Run `az account list -o table` after `az login` | A personal Visual Studio / MSDN subscription is ideal — this is a lab, not production |
| **Contributor** (or higher) role on that subscription | Azure portal → subscription → Access control (IAM) | Ask your subscription owner |
| **Outbound internet** to `github.com` and `*.azurecontainerapps.io` | The script pre-checks `github.com` for you | n/a |

> **Cost warning.** A successful deploy creates a Container App, VNet, Storage Account, Log Analytics workspace, and a private endpoint in your subscription. Estimated footprint is **~$5–20/month** if you leave it running. Delete the resource group when you're done — see [Cleanup](#cleanup-when-youre-done).

> **Tenant warning.** Don't run this against a customer's tenant or a shared production sub. Use a personal / lab subscription. The deploy creates real resources and bills real money.

---

## What the script does

```
Step 1: Pre-checks       Azure CLI, PowerShell version, internet reachability
Step 2: Sign in          Browser sign-in with automatic device-code fallback
                         for Conditional Access / multi-tenant accounts
Step 3: Pick subscription Enumerates all subscriptions across all tenants
Step 4: Deploy           Pre-creates RG + VNet + delegated subnet, runs the
                         upstream bootstrap, applies the NSG inbound HTTPS rule
Step 5: Read result      Parses bootstrap output for dashboard URL and secrets
Step 6: Verify           Polls the dashboard URL until it responds (HTTP 200)
Step 7: Save             Writes a credentials file to your Desktop and opens
                         the dashboard in your browser
```

You interact at steps 2–4. The rest runs without input. If anything fails mid-flight in Step 4, the script offers to delete the partially-created resource group so you don't accumulate orphans.

---

## What you get

When the deploy finishes:

1. **A live SCIMTool dashboard** at `https://<app-name>.<env>.<region>.azurecontainerapps.io` — your personal SCIM inspector
2. **A credentials file on your Desktop** — `SCIMTool-Credentials-<timestamp>.txt` with URLs, secrets, and Entra ID configuration steps
3. **An isolated Azure resource group** named `scimtool-rg-<random4>` — easy to find, easy to delete

---

## Configure Microsoft Entra ID provisioning

The credentials file contains the full walkthrough. The 60-second version:

1. **Open the dashboard** → paste the SCIM Shared Secret as the Bearer Token → **Save Token**
2. In [entra.microsoft.com](https://entra.microsoft.com): Identity → Applications → **Enterprise applications** → **New application** → **Create your own application** → *Non-gallery* → name it `SCIMTool Lab`
3. In your new app: **Provisioning** → **Get started** → mode **Automatic** → paste:
   - **Tenant URL:** `<dashboard URL>/scim/v2`
   - **Secret Token:** the SCIM Shared Secret from the credentials file
4. Click **Test Connection** (should go green) → **Save**
5. Assign a test user under *Users and groups*, then **Provision on demand** → pick the user → **Provision**
6. Watch the dashboard's Activity Feed for the `User created` event

---

## Known issues (v0.8 beta)

Be honest with yourself about what state this is in before you start handing it to your team:

- **The dashboard may show "stream timeout" right after deploy completes.** This is the most-reported issue. The container behind the URL takes a few minutes to settle after the Container App platform marks the deployment "Successful". Wait 2–5 minutes and refresh. If it's still timing out after 5 minutes, see [troubleshooting](#troubleshooting).
- **The NSG-rule step may warn `Could not create AllowHTTPS rule`.** The script uses a v0.5-era NSG name guess that the current Container Apps Workload Profiles environment often doesn't create under that name. Treat the warning as informational — if your dashboard eventually loads, the rule wasn't needed.
- **The upstream bootstrap logs `Failed to create subnet aca-runtime`.** This script pre-creates `aca-infra` and `private-endpoints` but not `aca-runtime`. The bootstrap proceeds anyway. Fix planned for v0.9.
- **PowerShell 7 preview builds may show minor UI glitches.** Functionality is unaffected; the progress bar may flicker.

---

## Troubleshooting

### Dashboard URL shows "stream timeout" or never loads

The container is provisioned but hasn't become reachable. Work through these in order:

1. **Wait 5 minutes.** This is the most common cause and the cheapest fix.

2. **Check that the container itself is healthy:**
   ```powershell
   az containerapp revision list -n <app-name> -g <rg-name> -o table
   ```
   - `Healthy` → it's a network or NSG issue, continue to step 3
   - `Unhealthy` / `Activation failed` → see [Container stays Unhealthy](#container-stays-unhealthy)

3. **Find the actual NSG attached to the `aca-infra` subnet** (the script's guess may be wrong):
   ```powershell
   $sub = az network vnet subnet show -g <rg> --vnet-name <app>-vnet -n aca-infra | ConvertFrom-Json
   if ($sub.networkSecurityGroup) { ($sub.networkSecurityGroup.id -split '/')[-1] } else { "no NSG attached" }
   ```
   If a name comes back, list its rules and add `AllowHTTPS` manually if missing:
   ```powershell
   az network nsg rule create -g <rg> --nsg-name <nsg-name> --name AllowHTTPS --priority 100 --direction Inbound --access Allow --protocol Tcp --source-address-prefixes "*" --destination-port-ranges 443
   ```

### Container stays Unhealthy

The container image tries to reach the private-endpoint blob storage on startup. If private DNS isn't routing correctly from inside the VNet, the container can't reach storage and stays unhealthy.

1. **Read the platform logs** in the Azure portal: Container App → Revisions → click the failing revision → **Show logs**
2. **Verify the private DNS link exists:**
   ```powershell
   az network private-dns link vnet list -g <rg> --zone-name privatelink.blob.core.windows.net -o table
   ```
   You should see one link with `provisioningState: Succeeded` and the VNet name.
3. **If logs show storage / DNS errors, the cleanest fix is to delete and redeploy:**
   ```powershell
   az group delete --name <rg> --yes --no-wait
   ```
   Then re-run the deployer. The race condition that causes this is intermittent.

### Subnet delegation error during bootstrap

If you see `SubnetDelegationError: Subnet '<name>/aca-infra' is not delegated to 'Microsoft.App/environments'`, the script's safety-net retry should catch it automatically: re-delegate the subnet, re-run the bootstrap, continue. Wait for the retry to finish. If it errors twice in a row, accept the cleanup prompt and try again on a fresh RG.

### "Cannot overwrite variable Branch" on bootstrap

You're running a stale copy of the script (pre-v0.7 patch). Re-download:

```powershell
iwr https://raw.githubusercontent.com/ilsalai/scimtool-lab-deployer/v0.8.0/Deploy-SCIMToolLab.ps1 -OutFile $env:USERPROFILE\Downloads\Deploy-SCIMToolLab.ps1
```

The current script writes the upstream bootstrap to a temp `.ps1` file and invokes it as a script, which sidesteps the PowerShell 7 optimizer issue that caused this error.

### Bootstrap asks unexpected questions

Press Enter on every prompt except `Change subscription?` (type `N`). The script pre-configures `SCIMTOOL_RG`, `SCIMTOOL_APP`, `SCIMTOOL_LOCATION`, and `SCIMTOOL_UNATTENDED=1` before invoking the bootstrap, which should silence the prompts. If new prompts appear, that's an upstream change — please [file an issue](https://github.com/ilsalai/scimtool-lab-deployer/issues).

### Unicode characters render as `?` or empty boxes

The progress bars and spinners use Unicode glyphs. Run the script from **Windows Terminal** rather than the legacy `conhost.exe` for clean rendering. The script still functions correctly either way — only the visuals degrade.

### Login keeps prompting / "no subscriptions returned"

When standard browser login fails or returns no subscriptions (often due to Conditional Access blocking the embedded browser), the script offers a device-code retry. Accept it. You'll see a code in the terminal — open `https://microsoft.com/devicelogin` in any browser (your phone works), paste the code, sign in there.

---

## Cleanup when you're done

```powershell
az group delete --name <rg-from-credentials-file> --yes --no-wait
```

The RG name is at the top of the credentials file on your Desktop. Deletion runs in the background; you can close the shell. Confirm it's gone with `az group list -o table` after a few minutes.

---

## Testing SCIM behavior

Useful references when you're reproducing a customer's Entra ID provisioning issue:

- [Microsoft Entra SCIM provisioning reference](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/use-scim-to-provision-users-and-groups) — Microsoft's interpretation of the spec, including the quirks around `PATCH` semantics and group membership
- [Tutorial: build a SCIM endpoint for Entra ID](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/use-scim-to-build-users-and-groups-endpoints) — the end-to-end flow this lab exercises
- [RFC 7644 — SCIM Protocol](https://datatracker.ietf.org/doc/html/rfc7644) and [RFC 7643 — SCIM Core Schema](https://datatracker.ietf.org/doc/html/rfc7643) — the actual standard, when Entra's behavior and the spec disagree
- [SCIMTool upstream docs](https://github.com/kayasax/SCIMTool) — dashboard features, filters, exporting captured payloads

If you're on a SYNC engineering team there are case-specific playbooks in the team's usual internal knowledge base.

---

## Reporting issues

Found something broken? Open an issue at [github.com/ilsalai/scimtool-lab-deployer/issues](https://github.com/ilsalai/scimtool-lab-deployer/issues) and include:

- Output of `$PSVersionTable.PSVersion` and `az --version`
- The last ~30 lines of the script's terminal output around the failure
- The contents of the credentials file if one was written (redact secrets before sharing publicly)
- Whether the Azure portal shows the resource group as fully deployed or partially failed

---

## Credits

- **[kayasax/SCIMTool](https://github.com/kayasax/SCIMTool)** — the actual tool. This repo is just the wrapper that automates the deploy.
- **Silvestre Gaitan** — CSS SYNC, Nebula Mexico
- All the engineers who tested v0.1 through v0.7 internally
