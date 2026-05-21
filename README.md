# SCIMTool Lab Deployer

![Version](https://img.shields.io/badge/version-0.8.2-blue) ![Status](https://img.shields.io/badge/status-public%20beta-orange) ![PowerShell](https://img.shields.io/badge/PowerShell-5.1%20%7C%207.x-blue) ![Azure CLI](https://img.shields.io/badge/Azure%20CLI-2.50%2B-blue)

> **This is a thin PowerShell facilitator around [kayasax/SCIMTool](https://github.com/kayasax/SCIMTool).**
> The actual SCIM 2.0 provisioning monitor — the dashboard, the activity feed, the SCIM endpoint, the storage architecture, the container image — is built and maintained by [@kayasax](https://github.com/kayasax). All credit for the product belongs to them. **Please ⭐ [their repository](https://github.com/kayasax/SCIMTool) first.** This wrapper is just glue.

This wrapper exists for one reason: the upstream's 5-minute one-liner is a great starting point, but in real lab deployments we kept hitting the same set of rough edges (PowerShell 7 IEX incompatibility, missing `aca-runtime` subnet, empty container env vars, `targetPort=80` on a non-root container, intermittent subnet-delegation races). Each one is solvable in a few minutes once you know about it; together they meant a deploy could take an hour or more of guess-and-check before you reached a working dashboard. This wrapper automates around them so the deploy completes on the first try.

> **v0.8.2** is the first version of this wrapper that runs end-to-end without manual intervention. Tested by the author on personal Visual Studio subscriptions. Read [Known issues](#known-issues-v08-beta) before you start. Feedback via [GitHub issues](https://github.com/ilsalai/scimtool-lab-deployer/issues).

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

## Quick start

**1. Open PowerShell.** Windows Terminal preferred. Both Windows PowerShell 5.1 and PowerShell 7.x work.

**2. Paste these two lines:**

```powershell
iwr https://raw.githubusercontent.com/ilsalai/scimtool-lab-deployer/v0.8.2/Deploy-SCIMToolLab.ps1 -OutFile $env:USERPROFILE\Downloads\Deploy-SCIMToolLab.ps1
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

- ~~**The dashboard may show "stream timeout" right after deploy completes.**~~ **Fixed in v0.8.2** — the container runtime config (env vars + targetPort) is now patched after the upstream bootstrap to work around two upstream Bicep bugs. If you still see this, you're on an older copy.
- **The NSG-rule step may warn `Could not create AllowHTTPS rule`.** The script uses a v0.5-era NSG name guess that the current Container Apps Workload Profiles environment often doesn't create under that name. Treat the warning as informational — if your dashboard eventually loads, the rule wasn't needed.
- ~~**The upstream bootstrap logs `Failed to create subnet aca-runtime`.**~~ **Fixed in v0.8.1** — the deployer now pre-creates `aca-runtime` at `10.0.8.0/21`. If you see this error you're on an older copy.
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
iwr https://raw.githubusercontent.com/ilsalai/scimtool-lab-deployer/v0.8.2/Deploy-SCIMToolLab.ps1 -OutFile $env:USERPROFILE\Downloads\Deploy-SCIMToolLab.ps1
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

### The actual product — [kayasax/SCIMTool](https://github.com/kayasax/SCIMTool)

The SCIM 2.0 provisioning monitor itself — the dashboard, the activity feed, the human-readable event translation, the user and group browser, the blob snapshot persistence, the Bicep templates, the container image — is the work of **[@kayasax](https://github.com/kayasax)**. None of this exists without that project.

If this wrapper saved you time, the right thing to do is:

1. **⭐ [Star kayasax/SCIMTool](https://github.com/kayasax/SCIMTool)** — that's the upstream
2. **File feature requests and bug reports on [their issues](https://github.com/kayasax/SCIMTool/issues)** — not here, unless the issue is specifically with this wrapper
3. **Read [their DEPLOYMENT.md](https://github.com/kayasax/SCIMTool/blob/master/DEPLOYMENT.md)** for architecture, options, and the canonical deploy path

This wrapper is genuinely just glue. When the upstream's rough edges get smoothed out (and they will), most of what's in `Deploy-SCIMToolLab.ps1` becomes unnecessary and we can shrink it back toward "download the upstream bootstrap, run it, save credentials."

### Wrapper maintainer

- **Silvestre Gaitan** — CSS SYNC, Nebula Mexico
- All the engineers who tested v0.1 through v0.7 internally
