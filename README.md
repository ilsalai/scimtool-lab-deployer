# SCIMTool Lab Deployer

![Version](https://img.shields.io/badge/version-0.9-brightgreen) ![Status](https://img.shields.io/badge/status-public%20beta-orange) ![PowerShell](https://img.shields.io/badge/PowerShell-5.1%20%7C%207.x-blue) ![Azure CLI](https://img.shields.io/badge/Azure%20CLI-2.50%2B-blue)

A personal SCIM 2.0 provisioning lab for Microsoft Entra ID. **One PowerShell command, ~10 minutes, dashboard ready.**

---

## Run this in elevated PowerShell

```powershell
iwr https://raw.githubusercontent.com/ilsalai/scimtool-lab-deployer/v0.9/Deploy-SCIMToolLab.ps1 -OutFile $env:USERPROFILE\Downloads\Deploy-SCIMToolLab.ps1
Set-ExecutionPolicy Bypass -Scope Process -Force; & "$env:USERPROFILE\Downloads\Deploy-SCIMToolLab.ps1"
```

That's it. Three prompts (Azure sign-in, subscription pick if multiple, "use default names?"), then ~10 minutes of fully automated deploy.

---

## You'll need

- **Windows** with PowerShell 5.1 or newer (built into Windows 10/11)
- **Azure CLI** 2.50 or newer — [install link](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) if you don't have it
- **A personal Azure subscription** in Enabled state with Contributor rights (a Visual Studio / MSDN subscription is ideal — this is a lab, not production)
- **~$5–20/month of Azure spend** while the lab is running — delete the resource group when you're done
- **Elevated PowerShell** (Run as Administrator) so the execution-policy bypass and any missing-CLI install work cleanly

> Don't run this against a customer's tenant or a shared production subscription. The deploy creates real Azure resources and bills real money.

---

## You'll get

- A live **SCIMTool dashboard** at a public HTTPS URL — your personal SCIM provisioning inspector
- A **SCIM endpoint** (`<dashboard>/scim/v2`) ready to plug into Microsoft Entra ID provisioning
- All **secrets and URLs** saved to a timestamped credentials file on your Desktop, with a step-by-step Entra ID configuration walkthrough
- An **isolated Azure resource group** named `scimtool-rg-<random>` — easy to find, one `az group delete` and it's gone
- The browser **auto-opens the dashboard** when the deploy is verified live

---

## Built on [kayasax/SCIMTool](https://github.com/kayasax/SCIMTool)

The actual product — dashboard, activity feed, human-readable event translation, container image, Bicep templates, blob persistence — is the work of **[@kayasax](https://github.com/kayasax)**. **Please ⭐ [their repository](https://github.com/kayasax/SCIMTool).** This deployer is just glue around their bootstrap that smooths a few rough edges we hit during real lab deployments. See [Credits](#credits) for the full attribution and how to support the upstream.

---

## After the deploy — configure Microsoft Entra ID provisioning

The credentials file on your Desktop has the complete walkthrough. The 60-second version:

1. **Open the dashboard** → paste the SCIM Shared Secret as the Bearer Token → **Save Token**
2. In [entra.microsoft.com](https://entra.microsoft.com): Identity → Applications → **Enterprise applications** → **New application** → **Create your own application** → *Non-gallery* → name it `SCIMTool Lab`
3. In your new app: **Provisioning** → **Get started** → mode **Automatic** → paste:
   - **Tenant URL:** `<dashboard URL>/scim/v2`
   - **Secret Token:** the SCIM Shared Secret from the credentials file
4. Click **Test Connection** (should go green) → **Save**
5. Assign a test user under *Users and groups*, then **Provision on demand** → pick the user → **Provision**
6. Watch the dashboard's Activity Feed for the `User created` event

---

## What the script does

```
Step 1: Pre-checks       Azure CLI, PowerShell version, internet reachability
Step 2: Sign in          Browser sign-in with automatic device-code fallback
                         for Conditional Access / multi-tenant accounts
Step 3: Pick subscription Enumerates all subscriptions across all tenants
Step 4: Deploy           Pre-creates RG + VNet + 3 subnets, runs the upstream
                         bootstrap, applies NSG rule, patches container config
Step 5: Read result      Parses bootstrap output for dashboard URL and secrets
Step 6: Verify           Polls the dashboard URL until it responds (HTTP 200)
Step 7: Save             Writes credentials file to your Desktop, opens
                         dashboard in your browser
```

You interact at steps 2–4. The rest runs without input. If anything fails mid-flight in Step 4, the script offers to delete the partially-created resource group so you don't accumulate orphans.

---

## Which deploy should you use?

**The canonical experience is the [upstream's 5-minute deploy](https://github.com/kayasax/SCIMTool#-5-minutes-cloud-deploy):**

```powershell
iex (iwr https://raw.githubusercontent.com/kayasax/SCIMTool/master/bootstrap.ps1).Content
```

That's the source of truth. It works — eventually. You may need to retry on subnet-delegation races, manually patch missing container env vars, override the default `targetPort=80`, and add an NSG inbound rule for HTTPS before the dashboard becomes reachable. If you don't mind a hands-on session, this is the path with the fewest moving parts.

**This wrapper exists for the rest of us** — engineers who want the deploy to just run to green on the first try. It calls the same upstream bootstrap; it just layers automation around the parts that bite in practice.

### What the wrapper handles for you

| Upstream rough edge | What this wrapper does |
|---|---|
| Bootstrap's `iex` fails on PowerShell 7 with `Cannot overwrite variable Branch` | Saves bootstrap to a temp `.ps1` and invokes it as a script (sidesteps the PS 7 optimizer) |
| Subnet-delegation race produces `SubnetDelegationError` on the first attempt | Pre-creates the VNet with `aca-infra` already delegated to `Microsoft.App/environments` before bootstrap runs |
| Bootstrap fails to create `aca-runtime` subnet (its default CIDR `10.40.8.0/21` doesn't fit a BYO-VNet) | Pre-creates `aca-runtime` at `10.0.8.0/21` to match |
| Container env vars (`PORT`, `DATABASE_URL`, `BLOB_BACKUP_*`, `SCIM_*`) deploy with empty values, container crash-loops | Patches all 9 missing env vars with computed values after the bootstrap completes |
| Container can't bind to `targetPort=80` (image runs as non-root; `EACCES` on `listen`) | Sets `PORT=8080` and runs `az containerapp ingress update --target-port 8080` |
| `az login` fails on Conditional Access or the embedded browser flow | Automatic device-code login fallback |
| Subscription picker silently uses your default sub even if it's the wrong one | Enumerates all subscriptions across all tenants and prompts when there's more than one Enabled |
| Bootstrap exits halfway and leaves a half-built resource group | Try/catch with `Remove created resources? [Y/n]` cleanup prompt |
| Dashboard URL not reachable until you manually add an NSG `AllowHTTPS` rule | Done automatically as Step 4d |
| Credentials only echoed to console — lose them if RDP disconnects | Writes timestamped credentials file to your Desktop with the full Entra ID configuration walkthrough |

Every one of these is an upstream rough edge that could (and ideally will) be fixed in `kayasax/SCIMTool` directly. We're tracking them as issues to file with the upstream so this wrapper can shrink over time. Until then, this layer smooths the deploy.

---

## Known issues (v0.9)

- **The NSG-rule step may warn `Could not create AllowHTTPS rule`.** The script uses a v0.5-era NSG name guess that the current Container Apps Workload Profiles environment often doesn't create under that name. Treat the warning as informational — the dashboard still loads in practice.
- **PowerShell 7 preview builds may show minor UI glitches.** Functionality is unaffected; the progress bar may flicker.

---

## Troubleshooting

### Dashboard URL shows "stream timeout" or never loads

The container provisioned but isn't reachable yet. As of v0.9 this should be rare — Step 4e patches the env vars and port that caused this in v0.8.0–v0.8.1. If you still see it:

1. **Wait 2–3 minutes.** ACA cold start can take a moment.
2. **Check container health:**
   ```powershell
   az containerapp revision list -n <app-name> -g <rg-name> -o table
   ```
   `Healthy / Running` → wait longer. `Unhealthy / ActivationFailed` → see container logs below.
3. **Container console logs via Log Analytics** (more reliable than `az containerapp logs show`, which can hang on PS 7):
   ```powershell
   $rg='<rg>'; $app='<app>'
   $ws = az monitor log-analytics workspace list -g $rg --query "[0].customerId" -o tsv
   az monitor log-analytics query -w $ws --analytics-query "ContainerAppConsoleLogs_CL | where ContainerAppName_s == '$app' | top 50 by TimeGenerated desc | project TimeGenerated, RevisionName_s, Log_s" -o table
   ```

### Subnet delegation error during bootstrap

If you see `SubnetDelegationError`, the script's safety-net retry catches it automatically: re-delegate the subnet and re-run the bootstrap. If it persists on retry, accept the cleanup prompt and start fresh.

### "Cannot overwrite variable Branch" on bootstrap

You're running an older copy. Re-download:

```powershell
iwr https://raw.githubusercontent.com/ilsalai/scimtool-lab-deployer/v0.9/Deploy-SCIMToolLab.ps1 -OutFile $env:USERPROFILE\Downloads\Deploy-SCIMToolLab.ps1
```

### Login keeps prompting / no subscriptions returned

Accept the device-code retry the deployer offers automatically. You'll see a code; open `https://microsoft.com/devicelogin` in any browser (your phone works), enter the code, sign in there.

### Unicode characters render as `?` or empty boxes

Run from **Windows Terminal** rather than the legacy `conhost.exe`. The script still functions correctly either way — only the visuals degrade.

---

## Cleanup when you're done

```powershell
az group delete --name <rg-from-credentials-file> --yes --no-wait
```

The RG name is at the top of the credentials file on your Desktop. Deletion runs in the background; you can close the shell.

---

## Credits

### The actual product — [kayasax/SCIMTool](https://github.com/kayasax/SCIMTool)

The SCIM 2.0 provisioning monitor — dashboard, activity feed, human-readable event translation, user and group browser, blob snapshot persistence, Bicep templates, container image — is the work of **[@kayasax](https://github.com/kayasax)**. None of this exists without that project.

If this wrapper saved you time, the right thing to do is:

1. **⭐ [Star kayasax/SCIMTool](https://github.com/kayasax/SCIMTool)** — that's the upstream
2. **File feature requests and bug reports on [their issues](https://github.com/kayasax/SCIMTool/issues)** — not here, unless the issue is specifically with this wrapper
3. **Read [their DEPLOYMENT.md](https://github.com/kayasax/SCIMTool/blob/master/DEPLOYMENT.md)** for architecture, options, and the canonical deploy path

This wrapper is genuinely just glue. When the upstream's rough edges get smoothed out (and they will), most of what's in `Deploy-SCIMToolLab.ps1` becomes unnecessary and we can shrink it back toward "download the upstream bootstrap, run it, save credentials."

### Wrapper maintainer

- **Silvestre Gaitan** — CSS SYNC, Nebula Mexico
- All the engineers who tested v0.1 through v0.8 internally

---

## Testing SCIM behavior — Microsoft references

Useful when you're reproducing a customer's Entra ID provisioning issue:

- [Microsoft Entra SCIM provisioning reference](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/use-scim-to-provision-users-and-groups)
- [Tutorial: build a SCIM endpoint for Entra ID](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/use-scim-to-build-users-and-groups-endpoints)
- [RFC 7644 — SCIM Protocol](https://datatracker.ietf.org/doc/html/rfc7644) and [RFC 7643 — SCIM Core Schema](https://datatracker.ietf.org/doc/html/rfc7643)

---

## Reporting issues with this wrapper

[github.com/ilsalai/scimtool-lab-deployer/issues](https://github.com/ilsalai/scimtool-lab-deployer/issues) — include:

- Output of `$PSVersionTable.PSVersion` and `az --version`
- Last ~30 lines of script output around the failure
- Credentials file contents (redact secrets before sharing publicly)

For issues with the SCIMTool product itself (dashboard bugs, feature requests, SCIM behavior), please go to [kayasax/SCIMTool/issues](https://github.com/kayasax/SCIMTool/issues).
