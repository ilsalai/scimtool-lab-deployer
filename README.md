# SCIMTool Lab Deployer

> **Status:** v0.7 — pre-release. Pre-creates the RG and properly-delegated VNet before running the upstream bootstrap, so the subnet-delegation race can no longer happen on the happy path. Also hardens Azure login for Conditional Access and multi-tenant accounts. See [CHANGELOG.md](CHANGELOG.md) for the iteration history.

A one-click PowerShell deployer that stands up a personal [SCIMTool](https://github.com/kayasax/SCIMTool) instance in Azure — a SCIM 2.0 provisioning inspector you can point Entra ID at to watch exactly what it sends on the wire.

Built for Microsoft CSS engineers on the SYNC vertical who need a repeatable, disposable SCIM lab to reproduce customer provisioning issues without waiting on the customer's tenant.

## What it does

This is a thin wrapper around the official [kayasax/SCIMTool](https://github.com/kayasax/SCIMTool) `bootstrap.ps1`. It adds the things you otherwise have to remember (and fix) by hand:

- **Pre-flight checks** — Azure CLI, PowerShell version, internet reachability
- **Hardened Azure login** — browser sign-in with automatic `--use-device-code` fallback for Conditional Access / broken-browser scenarios
- **Multi-tenant subscription picker** — enumerates every subscription across every tenant (`az account list --all`), auto-selects on a single Enabled sub, prompts with a numbered list otherwise
- **Pre-creates infrastructure** — RG, VNet (10.0.0.0/16), and the `aca-infra` subnet (10.0.0.0/23) pre-delegated to `Microsoft.App/environments`, plus a `private-endpoints` subnet (10.0.2.0/24), all *before* the bootstrap runs. This is what prevents the subnet-delegation race that used to need a retry
- **Runs the upstream bootstrap** against the pre-created resources to provision the Container App and secrets
- **Legacy retry as safety net only** — if the subnet error somehow still appears, the deployer still auto-delegates and retries; but on the normal path this code doesn't execute
- **NSG fix** — creates the `AllowHTTPS` inbound rule on the auto-generated NSG so the dashboard is actually reachable from the internet
- **Cleanup on failure** — if Step 4 fails, the deployer offers to `az group delete` the partially-created RG so you don't accumulate orphan resources
- **Connectivity verification** — polls the public URL after NSG propagation and confirms HTTP 200
- **Credential capture** — parses the bootstrap output for App URL, SCIM endpoint, shared secret, JWT secret, and OAuth secret, and writes them to a timestamped file on your Desktop along with step-by-step Entra ID configuration instructions

The whole thing runs in ~10 minutes with two interactive prompts (Azure login + the bootstrap's questions).

## Prerequisites

- Windows with PowerShell 5.1 or later
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) (the script checks and gives install instructions if missing)
- An Azure subscription in **Enabled** state where you have Contributor rights (personal MSDN / Visual Studio subscription is ideal — this is a lab, not production)
- Outbound internet access to `github.com` and `raw.githubusercontent.com`

## How to run it

Download [Deploy-SCIMToolLab.ps1](Deploy-SCIMToolLab.ps1) to your `Downloads` folder, then from PowerShell:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; & "$env:USERPROFILE\Downloads\Deploy-SCIMToolLab.ps1"
```

The deployer auto-generates resource names (`scimtool-rg-<nnnn>` and `scimtool-app-<nnnn>`) at the start of Step 4. You'll get one prompt to accept them or customize the app name. When the upstream bootstrap starts asking questions, the script displays the pre-configured names prominently — press Enter if the bootstrap offers them as defaults, or type them in if a different default is shown. Secret prompts: press Enter on all three to auto-generate.

## What happens after deployment

The script saves a `SCIMTool-Credentials-<timestamp>.txt` file to your Desktop with everything you need. The short version of the Entra ID config:

1. **Open the dashboard** at the App URL printed at the end. Paste the SCIM Shared Secret as the Bearer Token.
2. **Create an Enterprise Application** in [entra.microsoft.com](https://entra.microsoft.com) → Identity → Applications → Enterprise applications → **New application** → **Create your own application** → *Non-gallery*. Name it `SCIMTool Lab`.
3. **Configure Provisioning** on that app:
   - Mode: **Automatic**
   - Tenant URL: the SCIM endpoint from the credentials file (ends in `/scim/v2`)
   - Secret Token: the SCIM Shared Secret
   - Click **Test Connection** — should go green — then **Save**
4. **Assign a test user** under *Users and groups*, then use *Provision on demand* to fire a single provisioning cycle. You should see a `User created` event in the SCIMTool dashboard's Activity Feed within seconds.

Full walkthrough (with screenshots-worth of detail) is in the credentials file on your Desktop.

## Testing SCIM behavior

Useful references when you're reproducing a customer case:

- [Microsoft Entra SCIM provisioning reference](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/use-scim-to-provision-users-and-groups) — Microsoft's interpretation of the spec, including the quirks around `PATCH` semantics and group membership
- [Tutorial: Develop and plan provisioning for a SCIM endpoint in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/use-scim-to-build-users-and-groups-endpoints) — the end-to-end flow this lab is meant to exercise
- [RFC 7644 — SCIM Protocol](https://datatracker.ietf.org/doc/html/rfc7644) and [RFC 7643 — SCIM Core Schema](https://datatracker.ietf.org/doc/html/rfc7643) — the actual standard, when Entra's behavior and the spec disagree
- [SCIMTool upstream docs](https://github.com/kayasax/SCIMTool) — dashboard features, filters, exporting captured payloads

If you're on the SYNC team, there's more context and case-specific playbooks in the team's usual place.

## Troubleshooting

### Subnet delegation error during deployment

As of v0.7, **this should no longer happen on a fresh deploy** — the script pre-creates the VNet and delegates the `aca-infra` subnet to `Microsoft.App/environments` *before* handing off to the bootstrap, which closes the ARM ordering race.

If you still see `SubnetDelegationError: Subnet '<name>/aca-infra' is not delegated to 'Microsoft.App/environments'`, the legacy safety net kicks in: the deployer detects it in the transcript, runs

```powershell
az network vnet subnet update --resource-group <rg> --vnet-name <app>-vnet --name aca-infra --delegations Microsoft.App/environments
```

and re-runs the bootstrap. If the error persists on retry, the script offers to `az group delete` the RG so you can start clean.

### Dashboard URL times out / "cannot reach site"

The Container App environment is created with a private NSG that doesn't allow inbound 443 by default, so right after deployment the public FQDN resolves but hangs. Step 6 fixes this by adding an `AllowHTTPS` inbound rule (priority 100, TCP/443, source `*`) to the NSG named `<app>-vnet-aca-infra-nsg-<location>`.

If step 7's connectivity check fails even after the rule is added:
- NSG rule propagation sometimes takes 2–3 minutes beyond the script's 30-second wait — try the URL in a browser after a coffee
- Confirm the rule exists:
  ```powershell
  az network nsg rule show --nsg-name <app>-vnet-aca-infra-nsg-<location> --resource-group <rg> --name AllowHTTPS
  ```
- If the NSG name doesn't match the convention (custom resource names, non-default location string), the rule was created against the wrong NSG — check the Azure portal for the actual NSG attached to the `aca-infra` subnet and add the rule there manually

### Bootstrap asks questions you weren't expecting

The upstream `bootstrap.ps1` occasionally gains new prompts. The pre-configured names the deployer echoes before the bootstrap starts are the correct answers for RG / App / Location prompts — either they appear as defaults (press Enter) or you type them. Secret prompts: press Enter to auto-generate. Anything else: press Enter unless you know what you're changing.

### Unicode glyphs render as `?` or garbage

The v0.7 UI uses Unicode box-drawing (`╔═╗║╚╝┌─┐`) and braille-pattern spinners (`⠋⠙⠹⠸`). The script sets `[Console]::OutputEncoding = UTF8` and runs `chcp 65001` at startup, which covers Windows Terminal and recent conhost. Older conhost on legacy Windows images may still mis-render — the script still works, it just looks messy. Run it in Windows Terminal if you care.

## Credits

- [kayasax/SCIMTool](https://github.com/kayasax/SCIMTool) — the actual tool. This repo is just the wrapper that makes it a one-click lab deploy.
- Silvestre Gaitan — CSS SYNC, Nebula Mexico
