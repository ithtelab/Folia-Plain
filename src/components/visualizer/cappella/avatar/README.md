# Cappella 内置头像

本目录存放 Folia Plain 使用的原创 SVG 几何头像，由基本几何形状构成，不包含角色形象。资源按本仓库的 AGPL-3.0 许可证提供。

运行时由上级 `../avatarImages.ts` 通过 Vite `import.meta.glob` 自动加载目录中的图片文件（png、jpg、jpeg、gif、webp、svg）。文件名保持原有的 `avatar*` 名称，生成的 `builtin-avatar-*` id 不变。头像仍按 seed、左右位置和 avatar index 稳定分配。

用户上传的自定义资源不放入此目录，而是由 `src/services/cappellaAvatarPack.ts` 经 `src/services/db.ts` 保存到 IndexedDB，并通过 Cappella 设置面板选择或清空。替换内置素材不影响用户自己的资源。

头像来源选择 `color` 时不读取图片，选择 `cover` 时仍直接使用歌曲封面。
