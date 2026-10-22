<p align="center">
  <img src="img/plain-wordmark.svg" alt="Folia Plain" width="100%" />
</p>

<div align="center">

# Folia Plain

Immersive Lyrics, Simply Music

[简体中文](README.md) | [English](README.en.md)

[![Checks](https://github.com/ithtelab/Folia-Plain/actions/workflows/ci.yml/badge.svg)](https://github.com/ithtelab/Folia-Plain/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24-417461?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/version-0.7.23-62746b)](package.json)
[![Stars](https://img.shields.io/github/stars/ithtelab/Folia-Plain?style=social)](https://github.com/ithtelab/Folia-Plain/stargazers)

[Get it](#get-it) · [Run locally](#run-locally) · [Deploy](#deploy) · [Development](docs/plain.en.md)

</div>

## Introduction

**Folia Plain** is an immersive music player built around full-screen lyrics and kinetic typography, independently maintained from [Folia / folia-major](https://github.com/chthollyphile/folia-major).

It keeps the lyric animations, provider integrations, local library and theme tools while replacing bundled character artwork with geometric avatars, abstract covers and neutral copy. The interface gives the focus to your music, lyrics and chosen album artwork.

Releases provide a React / Vite Web deployment archive and Electron desktop packages for Windows, macOS and Linux.

> The upstream is the **chthollyphile/folia-major music player**. This project is unrelated to the **PaperMC/Folia Minecraft server**.

## What Plain changes

| Area | Change |
| --- | --- |
| Cappella avatars and stickers | Geometric artwork and simple reaction symbols; custom imports remain available. |
| Preview covers and lyrics | Abstract covers and original samples retain word timing, translations and backing vocals. |
| Interface copy | Neutral loading text; the settings image Easter egg is removed. |
| Application identity | Fork-specific name, feedback links, updater and desktop data directory. |
| Documentation | Clean presentation and instructions specific to this fork. |
| Workflows | Automated checks and manual desktop builds replace upstream publishing and community automation. |

Music categories, Japanese lyrics and your own artwork remain supported. Plain changes the bundled presentation; you choose what to play.

## Preview

![Folia Plain lyric preview](img/plain-preview.png)

![Folia Plain Cappella: geometric avatars and simple reactions](img/preview-cappella.jpg)

## Features

| Area | Capabilities |
| --- | --- |
| Lyrics | Multiple full-screen layouts, word timing, translations, romanization and backing vocals. |
| Music providers | NetEase, QQ Music and KuGou; desktop also retains Bodian, YouTube Music and Spotify integrations. Configuration or login may be required. |
| Your library | Local audio imports, Navidrome / Subsonic, lyric and cover matching. |
| Lyric files | LRC, VTT, TTML, QRC, YRC, KRC and Folia formats. |
| Appearance | Cover-based colors, backgrounds, typography and optional AI themes. |
| Desktop | Desktop lyrics, Now Playing, OBS and shortcut integrations, depending on platform and configuration. |
| Extensions | Experimental Folium mods and a self-hosted synchronization server. |

## Get it

- **Source:** clone this repository and follow the local setup below.
- **Web downloads:** [Releases](https://github.com/ithtelab/Folia-Plain/releases/latest) provide `Folia-Plain-<version>-web.zip` with static files and deployment instructions. Online music needs the corresponding backends. Successful [Checks](https://github.com/ithtelab/Folia-Plain/actions/workflows/ci.yml) runs also provide frontend artifacts.
- **Desktop artifacts:** maintainers can run [Build desktop](https://github.com/ithtelab/Folia-Plain/actions/workflows/desktop-build.yml) manually for the required platform.
- **Windows downloads:** x64 `.exe` installer and portable ZIP. Extract the entire ZIP before running `Folia Plain.exe`.
- **macOS downloads:** Apple Silicon (arm64) and Intel (x64) `.dmg` installers and ZIP archives. These builds are unsigned and not notarized.
- **Linux downloads:** x64 `.deb`, `.rpm` and portable `.tar.gz` packages. The portable package includes `resources/linux/README-LINUX.txt`.

SHA-256 checksums are included. Available platforms are determined by the actual attachments listed on each release.

Upstream installers, mirrors and AUR packages install the original app.

## Run locally

Requires **Node.js 24+**.

```sh
git clone https://github.com/ithtelab/Folia-Plain.git
cd Folia-Plain
npm ci
cp .env.example .env.local
npm run dev -- --host 127.0.0.1
```

On PowerShell, use `Copy-Item .env.example .env.local`. Open the address printed in the terminal.

The interface, lyric previews and local imports can be tried without AI credentials. Online providers require their respective backends or accounts; AI themes require a configured provider. `npm run dev` starts the frontend only. Use `npm run dev:electron` for desktop development.

```sh
npm run typecheck
npm run test:unit
npm run build
npm run preview -- --host 127.0.0.1
```

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ithtelab/Folia-Plain)

Use Node.js 24+, `npm run build`, and output directory `dist`. Configure music and AI services using the [environment template](.env.example).

See [QQ Music deployment](docs/qq-music-deployment.md), [Docker](deploy/docker/README.md), and [development notes](docs/plain.en.md) for platform details. This fork has no published container images; build Docker images from source. Cross-device synchronization uses the optional self-hosted [`sync-server`](sync-server/README.md).

## Documentation

- [Fork maintenance and packaging](docs/plain.en.md)
- [Upstream PR review and backport log (Chinese)](docs/upstream-prs.md)
- [Technical notes](docs/technical.md) (inherited from upstream; this fork's download and release instructions take precedence)
- [Local library management](docs/local-library-management.md)
- [Mod development](docs/folium/contributing.md) · [API reference](docs/folium/api.md)
- [Report an issue](https://github.com/ithtelab/Folia-Plain/issues)

## Attribution

Thanks to [chthollyphile/folia-major](https://github.com/chthollyphile/folia-major) and its [upstream contributors](docs/upstream/CONTRIBUTORS.md). This fork starts at upstream **0.7.21** (`f3a9070`) with independent commit history, retaining source copyright notices and attribution records. See [CONTRIBUTORS.md](CONTRIBUTORS.md) for this fork's maintainers. The [original README](docs/upstream/README.en.md) is archived for reference.

Thanks also to [LDDC](https://github.com/chenmozhijin/LDDC), [AMLL TTML DB](https://github.com/amll-dev/amll-ttml-db), [NetEase API](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced), [QQ Music API](https://github.com/yakult-green-tea/qq-music-api), [KuGou API](https://github.com/MakcRe/KuGouMusicApi), [Pretext](https://github.com/chenglou/pretext), and [Paper Shaders](https://github.com/paper-design/shaders).

## License

[AGPL-3.0](LICENSE), including this fork's new vector assets. Music, lyrics, album artwork and external service content belong to their respective rights holders. Follow service terms and support licensed music.
