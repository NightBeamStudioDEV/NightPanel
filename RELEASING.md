# Release policy

NightPanel does not publish unsigned binaries. Maintainers must validate the public protocol against the minimum supported NightWatch Pro release before creating a release.

Release credentials belong only in organization-level GitHub Actions environments. They must never be stored in this repository, uploaded to an issue, or printed in workflow logs.

Before the first binary release, maintainers must configure and review:

- Windows x64 MSI/NSIS code signing;
- a macOS universal build with signing and notarization;
- Linux x64 AppImage and deb packages;
- signed Tauri updater metadata over HTTPS, with the public verification key embedded in the application;
- protected release environments and least-privilege workflow permissions;
- compatibility validation against the documented minimum NightWatch Pro version.

Until all controls are active, tags and source archives may be published, but binary packages and updater metadata must not be published.
