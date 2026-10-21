# Folia Plain 应用图标

采用维护者提供的 `folia-plain-icon-v2.png`、`.ico`、`.svg`。原始文件保留在本地 `图标/`，运行和打包从以下规范路径读取。

| 路径 | 用途 |
| --- | --- |
| `build/icon.png` | 原样保存的 1024×1024 PNG；桌面窗口、Windows/Linux 托盘、macOS/Linux 打包及应用内介绍 |
| `build/icon.ico` | 原样保存的 Windows ICO；包含 16、24、32、48、64、128、256 像素图层，用于后续 EXE/安装包 |
| `public/icon.png` | 同一 PNG；浏览器图标、添加到主屏幕和 PWA 常规图标 |
| `public/icon.svg` | 原样保存的配套矢量版；PWA 可缩放 maskable 图标 |
| `build/trayTemplate.svg` | 从提供的 SVG 中提取 F 字形，去除背景；macOS 单色托盘的矢量源 |
| `build/trayTemplate.png` / `build/trayTemplate@2x.png` | 从单色源导出的透明 16×16 / 32×32 PNG；主进程继续按 template image 使用 |

PNG、ICO、配套 SVG 均不重新绘制。以后更换图标时，保持网页与桌面的 PNG 一致，并同步更新 ICO、矢量版和单色托盘导出。仅替换这些源码素材不会改变已发布安装包内嵌的 EXE 图标；安装包图标随后续统一打包生效。
