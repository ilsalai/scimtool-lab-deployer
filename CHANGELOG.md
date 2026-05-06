# Changelog

All notable changes to the SCIMTool Lab Deployer are recorded here.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions are pre-1.0 while the deployer stabilizes — expect each iteration to land breaking changes.

## [0.7] — 2026-04-23

Current release. Major architecture change: the deployer now pre-creates the resource group and properly-delegated VNet *before* running the upstream bootstrap, so the subnet-delegation race condition can no longer happen on the happy path. Also ships the login and subscription-picker hardening that corporate tenants with Conditional Access have been asking for.

### Added
- **Pre-created infrastructure.** New multi-phase Step 4: `az group create` → `az network vnet create` with the `aca-infra` subnet at `10.0.0.0/23` pre-delegated to `Microsoft.App/environments` → `az network vnet subnet create` for the `private-endpoints` subnet at `10.0.2.0/24`. The bootstrap then runs against resources that are already correctly shaped.
- **Unattended bootstrap handoff.** The deployer now sets `SCIMTOOL_RG`, `SCIMTOOL_APP`, `SCIMTOOL_LOCATION`, and `SCIMTOOL_UNATTENDED=1` before invoking `bootstrap.ps1`. Verified against `kayasax/SCIMTool@master` (upstream v0.8.15): without `UNATTENDED=1` the bootstrap still calls `Read-Host` even when env-var defaults are present. The three secret env vars (`SCIMTOOL_SECRET`, `SCIMTOOL_JWTSECRET`, `SCIMTOOL_OAUTHSECRET`) are intentionally left unset so the bootstrap auto-generates them.
- **Auto-generated names with opt-in customization.** Step 4 starts by generating `scimtool-rg-<nnnn>` and `scimtool-app-<nnnn>` via `Get-Random`. One prompt lets the user accept the defaults or customize only the app name (with `lowercase + digits + hyphens, 3-30 chars, starts with a letter` validation). The RG name always stays auto-generated to avoid collisions between team members sharing a subscription.
- **Cleanup prompt on failure.** The pre-create → bootstrap → NSG sequence is wrapped in a try/catch. If anything fails, the deployer asks `Remove created resources? [Y/n]` and runs `az group delete --yes --no-wait` on confirmation, so a failed attempt doesn't leave orphan resources behind.
- **`Show-Spinner` helper.** Runs a scriptblock in a background job (via `Start-Job` with `-ArgumentList` to pass variables across the process boundary) and displays a braille-pattern spinner while waiting. Used for the VNet create call (~30s). Returns `{ Success, Output }` with the captured exit code.
- **Device-code login fallback.** When standard `az login` fails or returns zero subscriptions, the deployer offers a `--use-device-code` retry with instructions pointing at `https://microsoft.com/devicelogin`. Covers Conditional Access blocking the embedded browser, broken system browsers, and MFA flows that don't complete in the standard path.
- **Multi-tenant subscription picker.** Replaces Step 3's old "trust whatever `az account show` returns" logic. `az account list --all` enumerates across every tenant the account can see; auto-selects on a single Enabled sub, prompts with a numbered list (name, state, tenant) for multiple, and exits gracefully with guidance on zero-sub or all-disabled accounts.
- **Final summary box.** Unicode-bordered block at the end showing status (LIVE / DEPLOYED — verify manually), RG/App/Location, Dashboard/SCIM URLs, masked secret (first 8 chars + `...`), and credentials-file path.

### Changed
- **Visual refresh to Unicode box-drawing.** Banner uses `╔═╗║╚╝╠╣`, step headers use `┌─┐│└┘`, sub-step progress uses tree glyphs (`├─` / `└─`) with `[OK]`/`[WARN]`/`[FAIL]`/`[INFO]`/`[....]` tags. Progress bars now render with `█`/`░`. All Unicode is constructed at runtime via `[char]0xNNNN` so the script source stays pure ASCII — this side-steps the BOM/encoding pitfalls that sank v0.3.
- **UTF-8 console setup.** Script now sets `[Console]::OutputEncoding = UTF8`, `$OutputEncoding = UTF8`, and runs `chcp 65001` at startup so the Unicode glyphs actually render on conhost.
- **Step count is now 7** (down from 8). The old "Fix network for public access" step is absorbed into Step 4 as sub-phase 4d, since the NSG rule is conceptually part of deployment.
- **Auto-retry is now a safety net, not the happy path.** The legacy subnet-delegation retry from v0.5 is preserved but should almost never fire — pre-creation prevents the race it was compensating for.

### Fixed
- **Happy-path subnet-delegation race eliminated.** Because we create the subnet with delegation *before* the bootstrap attempts to place a Container App Environment into it, the ARM ordering bug that produced `SubnetDelegationError` has no window to occur.

## [0.6] — Skipped — internal iteration rolled back. v0.7 supersedes.

## [0.5] — 2026-04-23

First iteration that completes end-to-end on a clean subscription without manual intervention.

### Added
- **Automatic subnet delegation fix.** Detects `SubnetDelegationError` in the upstream bootstrap transcript, delegates the `aca-infra` subnet to `Microsoft.App/environments`, and re-runs the bootstrap. The retry reuses the existing resources and completes cleanly.
- **`UseBasicParsing` on every `Invoke-WebRequest` call.** Avoids the IE-engine security prompt that was blocking the script on fresh Windows images where IE first-run hasn't been dismissed.
- **Improved log parsing.** `Parse-Log` now handles multiple formatting variants the upstream bootstrap emits (`FINAL URL` vs `App URL`, `Bearer Secret` vs `SCIM Shared Secret`, `OAuth Client Secret` vs `OAuth Secret`, etc.), so credential capture works regardless of which bootstrap version runs.

## [0.4] — 2026-04-20

### Changed
- **All regex patterns moved to single-quoted strings.** Double-quoted regex was being partially expanded by PowerShell, silently breaking secret extraction.
- **Removed parentheses from inside double-quoted strings.** PS 5.1 parses `"...$(expr)..."` as a subexpression and was choking on lines that just happened to contain `(...)` as literal text in status messages.

## [0.3] — 2026-04-16

### Fixed
- **Here-string syntax for PS 5.1.** Earlier versions used PS 7-style here-strings that failed to parse on Windows PowerShell 5.1, which is still the default shell CSS engineers have installed.
- **Unicode characters replaced with ASCII.** Box-drawing and em-dash characters rendered as mojibake in the default console code page (437/1252). Banners, progress bars, and separators now use plain ASCII (`#`, `-`, `.`, `'`).

## [0.2] — 2026-04-12

### Added
- **Visual feedback throughout the run:** numbered step headers with progress bar and percentage, colored `[OK]`/`[WARN]`/`[FAIL]`/`[INFO]`/`[....]` status lines, countdown timers for waits, and a banner at start and finish.
- **Pause prompts** before Azure login and the bootstrap handoff so engineers running the script over a shared screen have time to read what's about to happen.

## [0.1] — 2026-04-07

Initial internal iteration.

### Added
- Basic wrapper around the upstream [kayasax/SCIMTool](https://github.com/kayasax/SCIMTool) `bootstrap.ps1`: download, `Invoke-Expression`, done.
- Minimal pre-check for Azure CLI presence.
- Credentials scraped from transcript and echoed to the console at the end.

### Known issues at this stage
- Subnet delegation race failed roughly half the time with no recovery path.
- Public URL not reachable after deployment (NSG had no inbound 443 rule) — engineers thought the deployment had failed.
- No credential file was written, so a dropped RDP session lost all the secrets.
