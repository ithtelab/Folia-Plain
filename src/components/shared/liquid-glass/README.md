# Liquid Glass material

An Electron/web interpretation of Apple's material guidance. The optical parameters here are
Folia Plain's own tuning; this is not Apple's native renderer or a pixel-identical reproduction.

`LiquidGlassSurface` is decorative. Give its positioned host `liquid-glass-host` and a rounded
shape, then render the surface beside the existing content. Keep all controls, text and semantics
outside the filtered layer. Use one surface for each control group, not one for every icon inside it.
The `radius` prop must match the host (the default `999` describes a capsule or circle).

## Rendering

- Chromium/Electron: real backdrop → soft centre / displaced optical rim → local tone compression
  → neutral tint and restrained edge highlights. A normal map encodes a rounded rectangle's
  inward-facing rim; it does not capture or duplicate DOM content.
- Other engines: ordinary CSS backdrop blur and a stronger tint. An SVG filter URL parsing
  successfully does not prove that an engine renders it correctly, so this path is conservative.
- Reduced transparency or increased contrast: near-solid material, no optical filter or map.
- Forced colours: system Canvas / CanvasText, no decorative optical layers.
- Reduced motion: no added material transitions, and the player's layout spring is disabled.

Tone curves keep extreme white/black backgrounds from washing out the foreground. They follow
the host's explicit light/dark appearance; there is no per-frame DOM luminance sampling or automatic
text-colour classification. Custom theme colours continue to come from existing host props.

## Runtime and integration

The map is built on the CPU only after dimensions settle for 100 ms. Textures are capped at
1024 × 256 and use CSS size, independent of display density. During resizing the old map stretches
with the surface until the new one is ready. There is no animation loop, pointer listener,
screen capture, WebGL context, network asset or third-party dependency.

Hidden hosts pass `active={false}`. Document visibility and system accessibility changes release
the optical filter. Observers, media listeners and timers are disposed on unmount. Browser
compositing decides how to execute the backdrop filter; this component does not force a GPU backend.

Adopted by the floating player, Grid home navigation/search, Grid collection/directory back and
title controls, the shared visualizer back control, and the shared slide action button. Album
cards and content panels retain their existing content materials. Window titlebar hit areas and
safe spacing are unchanged.

The stock progress overrides live in the utilities layer, before `folium-mods`, so mod CSS keeps
its precedence. Preserve the icon as the slide button's first SVG: its drag feedback targets that
icon, and must not accidentally target the material's filter definitions.

## Reference and verification

- [iOS 27 design kits](https://developer.apple.com/news/?id=e2lxw9l1)
- [Apple HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/)
- [Custom native glass views](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views)

`dev-probe.html?probe=liquidGlass` uses the real player and original sample artwork. Add
`&tone=light` for the light appearance, or `&backdrop=stripes` to inspect actual backdrop bending.
This is a development probe and does not become a product page or a clock feature.

Pure optical invariants are covered in `test/unit/app/liquidGlassOptics.test.ts`. Existing player
positioning, seek, navigation, mod-width and titlebar browser checks cover integration. Desktop
verification uses an isolated profile, including real Electron rendering and accessibility media.
