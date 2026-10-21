# Cappella 内置聊天表情

本目录存放 Folia Plain 使用的原创 SVG 几何表情和音乐图形，由基本几何形状构成，不包含角色形象。资源按本仓库的 AGPL-3.0 许可证提供。

运行时由上级 `../emoImages.ts` 通过 Vite `import.meta.glob` 自动加载目录中的图片文件（png、jpg、jpeg、gif、webp、svg）。文件名保持 `happy1`、`love1`、`normal1`、`sleepy1` 到 `sleepy3`、`vibe1` 到 `vibe3`，生成的 `builtin-*` id 不变。`pickRandomEmoImage()` 仍从全集随机选择；`emotionHint` 保留为未来筛选接口。

用户上传的自定义资源不放入此目录，而是由 `src/services/cappellaEmojiPack.ts` 经 `src/services/db.ts` 保存到 IndexedDB，并通过 Cappella 设置面板选择或清空。替换内置素材不影响用户自己的资源。
