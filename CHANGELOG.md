# Changelog

All notable changes to the SCIMTool Lab Deployer are recorded here.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions are pre-1.0 while the deployer stabilizes — expect each iteration to land breaking changes.

## [0.8.2] — 2026-05-21

**First end-to-end working public beta.** Adds a new Step 4e that patches the container runtime config after the upstream bootstrap, working around two upstream Bicep bugs that were leaving the container in a crash loop (`exit code 1, ProcessExited`) on every v0.8.0 / v0.8.1 deploy.

### Fixed
- **Patch missing env var values (upstream bug #1).** The kayasax/SCIMTool `infra/containerapp.bicep` declares env vars like `PORT`, `DATABASE_URL`, `NODE_ENV`, `BLOB_BACKUP_ACCOUNT`, etc. with `value:` fields, but somewhere in the deployment pipeline those values get dropped — the deployed container ends up with the env vars declared but **empty**. Step 4e now sets them explicitly with computed values (`BLOB_BACKUP_ACCOUNT` derived from the app name, `SCIM_RG`/`SCIM_APP` from our local vars, `DATABASE_URL` hardcoded to the SQLite path the upstream expects, etc.).
- **Override `targetPort=80` (upstream bug #2).** The upstream Bicep defaults the Container App's `targetPort` to `80`, but the `ghcr.io/kayasax/scimtool:latest` image runs Node.js as a non-root user and cannot bind to privileged ports (< 1024). The container crashes on `listen()` with `EACCES`. Step 4e now sets `PORT=8080` in env vars AND runs `az containerapp ingress update --target-port 8080` so both sides of the ingress agree on `8080`.

### Diagnostic notes (for posterity)
- v0.8.0 and v0.8.1 both hit this same crash but the symptom looked different at each layer: "stream timeout" in the browser, "Activation failed / Deployment Progress Deadline Exceeded" in the portal, "Container terminated with exit code 1, ProcessExited" in system logs, and finally the smoking gun in Log Analytics console logs: `Error: listen EACCES: permission denied 0.0.0.0:80`.
- The application logs in the portal's Revision Details blade default to a 1-hour window. For crash-loop forensics, use `az monitor log-analytics query -w <workspace-id> --analytics-query "ContainerAppConsoleLogs_CL | where ContainerAppName_s == '<app>' | top 50 by TimeGenerated desc"` to bypass the time filter.

### Carried over from 0.8.1
- Pre-creates `aca-runtime` subnet at `10.0.8.0/23` so the upstream bootstrap stops logging `Failed to create subnet aca-runtime`.

## [0.8.1] — 2026-05-21

Patch release. Pre-creates the `aca-runtime` subnet that the upstream bootstrap was trying to create and failing on every v0.8 deploy. This is the most likely root cause of the "stream timeout" dashboard symptom reported in v0.8.0 testing.

### Fixed
- **Pre-create the `aca-runtime` subnet** at `10.0.8.0/21` with `privateEndpointNetworkPolicies` and `privateLinkServiceNetworkPolicies` disabled, matching the upstream `infra/networking.bicep`. The upstream's default CIDR for this subnet (`10.40.8.0/21`) doesn't fit our `10.0.0.0/16` VNet, which is why the bootstrap's attempt to create it failed in v0.8.0. Without `aca-runtime`, the Container App Environment runs the workload in the infrastructure subnet, where private-endpoint traffic is blocked by default policies, leaving the container Unhealthy.

### Changed
- README and badges bumped from `v0.8.0` to `v0.8.1`. Quick-start URLs now pin to the new tag.

## [0.8] — 2026-05-06

**First public beta.** Same architecture as 0.7 with the IEX-to-file-invocation hotfix already folded in. This release is primarily about polish: a much simpler README with a Quick Start at the top, an explicit prerequisite table, a Cost Warning, an honest Known Issues section, and a version bump everywhere so external testers can file feedback against a fixed reference point.

### Added
- **Quick Start section at the top of the README** — one short paragraph plus a two-line PowerShell snippet, designed for someone landing on the GitHub page for the first time.
- **Prerequisites table** with explicit version requirements, a "how to check" column, and a "where to get it" column.
- **Cost and tenant warnings** — the deploy creates real resources that cost ~$5–20/month and must not be pointed at customer or production subscriptions.
- **Known Issues section** — honest about the stream-timeout symptom, the NSG warning, the missing `aca-runtime` subnet, and PS 7 preview UI glitches. Lets testers self-diagnose before opening issues.
- **Container-stays-Unhealthy troubleshooting** — new section covering the BYO-VNet + private-endpoint DNS resolution race that caused v0.7's test deploys to hang.
- **GitHub issue-reporting guidance** — what to include in a bug report so the loop closes faster.
- **Shields.io badges** at the top of the README for version, status, PowerShell compat, and Azure CLI requirement.

### Changed
- **Version bump everywhere** — script header comment, runtime banner, README status line, and CHANGELOG all read `v0.8`.
- **Troubleshooting reorganized by symptom** rather than by internal mechanic. Easier to navigate for a first-time user who sees a specific error.

### Known limitations (carried over from 0.7, scoped for v0.9)
- The pre-created VNet doesn't include an `aca-runtime` subnet. The upstream bootstrap tries to create it and logs `Failed to create subnet aca-runtime` (non-fatal, but noisy).
- The NSG rule application uses a name-guess that misses under most Workload Profiles environments — warning only, doesn't block deploy.
- Dashboard reachability is not guaranteed on first hit. The container may need 2–5 minutes after deploy completion to become responsive, and the BYO-VNet + private-endpoint DNS race occasionally leaves the container Unhealthy entirely.

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
