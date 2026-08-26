# Release policy

Pushing a `v*` tag on `main` runs `.github/workflows/release.yml` and publishes a GitHub Release with:

- Windows x64 NSIS setup and MSI
- Linux x64 and ARM64 AppImage and deb
- macOS Apple Silicon (`aarch64`) and Intel (`x86_64`)

Minimum NightWatch Pro: **3.3.0**.

These CI artifacts are **unsigned** until organization signing credentials exist. Signing work still required:

- Windows Authenticode (MSI/NSIS)
- macOS signing and notarization
- signed Tauri updater metadata over HTTPS

Release credentials belong only in organization-level GitHub Actions environments. They must never be stored in this repository, uploaded to an issue, or printed in workflow logs.

```bash
git tag v1.0.0
git push origin v1.0.0
```

