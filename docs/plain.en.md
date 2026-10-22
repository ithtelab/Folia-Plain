# Maintaining Folia Plain

Folia Plain is an independent fork of [chthollyphile/folia-major](https://github.com/chthollyphile/folia-major), starting from commit `f3a90708afbec884934d8bca16bbd0a35feeb6a7` (upstream 0.7.21). It is unrelated to the Minecraft server [PaperMC/Folia](https://github.com/PaperMC/Folia).

## Changes

- Geometric avatars, reaction stickers and preview covers replace bundled character artwork. Existing resource IDs and custom imports remain supported.
- Original neutral preview text replaces the bundled samples. Loading copy is neutral, and the settings image Easter egg is removed.
- The app name, repository, feedback links, desktop updater, PWA and package identity belong to this fork.
- Export cleanup closes its file through the owning handle, avoiding an inherited double-close problem.
- Desktop data lives in a separate application directory. Existing storage keys and import/export formats are preserved; upstream desktop data is not migrated automatically.
- Upstream publishing, AUR, scheduled and triage workflows are preserved under `.github/upstream-workflows/` as reference. This fork enables its own CI and manual desktop builds.

Music categories, Japanese lyrics and the `animejs` animation library remain functional. Users choose their own listening content.

## Development

Use Node.js 24 or later.

```sh
npm ci
cp .env.example .env.local
npm run dev -- --host 127.0.0.1
```

In PowerShell, use `Copy-Item .env.example .env.local`. Open the URL printed in the terminal. The interface, local imports and visualizer previews do not require an AI key. Online providers, AI themes and synchronization require their own configuration. `npm run dev` starts the frontend only; `npm run dev:electron` uses the desktop's embedded provider backends.

```sh
npm run typecheck
npm run test:unit
npm run build
npm run preview -- --host 127.0.0.1
```

## Packaging

Product identity is defined in `shared/productIdentity.json`. Desktop packages use `folia-plain`, display `Folia Plain`, and have application ID `io.github.ithtelab.foliaplain`. Updates are fetched exclusively from `ithtelab/Folia-Plain`; no upstream fallback is configured.

Windows Releases provide an x64 NSIS installer, ZIP, updater metadata and `SHA256SUMS.txt`. The packaged executable is checked for native resources, product identity, isolated-profile startup and preload IPC before publication.

macOS provides arm64 / x64 DMG and ZIP packages; Linux provides x64 DEB, RPM and portable TAR.GZ files. macOS builds are unsigned and not notarized. The Web ZIP contains a separate static frontend build and deployment instructions. Selecting `all` builds all desktop systems in parallel, with the Web archive generated in the Windows job. The verified publisher's `All` option combines validated attachments and checksum records before publication.

The **Build desktop** workflow produces downloadable artifacts on manual request. Publishing is off by default; selecting `publish` creates a Release only after the build and verification succeed. The version comes from `package.json` and notes from `docs/releases/v<version>.md`. An existing version cannot be published twice. Local `npm run build:electron` requires network access and platform toolchains, including Rust and CMake when applicable. Passing the Web build does not verify desktop installers.

Upstream documentation's release channels, mirrors, Docker images, AUR package and communities belong to upstream. Download this fork from its own Releases page.

To publish an existing successful build, use **Publish verified desktop build** with its run ID and platform. It validates the source commit, local checksums and GitHub's received digests. A draft for the same commit can be resumed; an existing public release cannot be overwritten.

## Upstream updates and attribution

This fork uses independent commit history. Source copyright notices and the AGPL-3.0 license are retained, and upstream contributor records are archived in `docs/upstream/CONTRIBUTORS.md`. New vector assets use the same license. Music, artwork, lyrics and external services remain the property of their respective rights holders.

`upstream` points to the original project and `origin` to this fork. Review selected upstream commits or file changes on a separate branch, apply the patches as new commits and record their source. Review bundled assets, product identity, updater sources and workflows, then run checks. Keep upstream history separate to preserve this fork's contributor statistics. Upstream model and FFmpeg downloads remain external runtime dependencies; they do not update the application itself.
