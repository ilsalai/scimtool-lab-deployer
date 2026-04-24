# Changelog

All notable changes to the SCIMTool Lab Deployer are recorded here.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions are pre-1.0 while the deployer stabilizes — expect each iteration to land breaking changes.

## [0.5] — 2026-04-23

Current release. First iteration that completes end-to-end on a clean subscription without manual intervention.

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
