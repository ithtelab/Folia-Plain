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
- Reduced UI micro motion: the app's existing preference disables material reactions, selection
  settling and the player's layout spring. System motion preferences follow the app's opt-in policy.

Tone curves keep extreme white/black backgrounds from washing out the foreground. They follow
the host's explicit light/dark appearance; there is no per-frame DOM luminance sampling or automatic
text-colour classification. Custom theme colours continue to come from existing host props.

## Runtime and integration

The map is built on the CPU only after dimensions settle for 100 ms. Small controls use 2× sampling
and a soft coverage edge; textures remain capped at 1024 × 256, independent of display density. During resizing the old map stretches
with the surface until the new one is ready. There is no screen capture or network asset.

The flowing rim reuses the installed Paper liquid-metal shader and runtime, following the user's
metallic-button reference (reflection bands, modest dispersion and interaction speed-up). Its
1.4 px mask keeps the centre transparent. The shader turns dark bands into transparency and emits
premultiplied translucent highlights, composited normally over the live backdrop, with no fixed
black outline. Do not use a CSS blend mode on the WebGL layer: Chromium then stops applying the
sibling backdrop filter. A stripe comparison with flow enabled/hidden verified the blur remains
active after this fix. This follows background colour without screenshots, pixel readbacks or React
sampling. No new dependency is installed.
Each small GPU surface uses 2× sampling up to the same 128,000-pixel cap, with antialias/depth buffers disabled.

`useLiquidGlassMotion` observes the host's pointer/focus and layout changes. Short-lived springs
drive the decorative material's compression, rebound, highlight position and actual backdrop
displacement/normal offset. They update DOM/SVG directly, never React state. The host and its text
do not transform, so hit testing, progress gestures and titlebar clearance stay stable. Selection
fills settle separately while the existing shared-layout animation moves between tabs.

Spring frames stop when they converge; stationary hover also settles. The separate shader uses
`flow="ambient"` only for home navigation: slow idle reflections, faster hover/focus and press.
One shared 30 Hz audio clock reads the existing analyser MotionValues and drives reflection speed,
direction swing, distortion, dispersion and position without React renders. Each host gets a stable
angle from its screen position, so neighbouring surfaces do not move as one texture. Low-frequency
attacks produce short beat envelopes; mids steer the diagonal travel and highs vary scale and
softness. `flow="interactive"` surfaces only consume those uniforms while hovered, focused or pressed.
The bottom player passes `interactive={false}` and `flow="static"`: the original reflection
is rendered at a fixed shader frame with no animation or pointer/press deformation, including hover
and dragging. `flow="none"` skips reflection canvases on the unfocused home cards; only the focused
playlist card gets a frozen reflection. All other hosts default to `flow="interactive"` and stop their shader clock when neither
hovered nor focused. Blur pauses the clock, out-of-viewport surfaces pause through Paper's observer,
and hidden documents or accessibility fallbacks unmount the flow. WebGL failure leaves static
glass intact. Unmount disposes the runtime and explicitly releases its GPU context.
Geometry is cached between pointer moves. Keyboard compression applies to buttons, not spaces typed
into search.

The material switch is owned by `useGlassSettingsStore`. Turning it off unmounts the optical and
shader layers and restores classic fills/blur, including the original opaque playlist-card base.
The choice travels through visual config export/import. GPU hardware acceleration is a separate
desktop startup preference (`electron/hardwareAcceleration.cjs`); changing it requires a restart.

Repeated cards answer a press with `GlassPressRipple`: two blurred, irregular lobes start at the
pointer (percentages inside the host, clamped at the edge) and spread past the card's own edge before
fading. It is DOM-only — one attribute toggle and two CSS custom properties per press, no React
state, no re-render of the card — and it is hidden while UI micro motion is reduced or the material
is off. Glass hosts keep every border transparent in all interaction states and draw their edge with
the optical rim; a `theme-polaroid-card` border that falls back to `currentColor` is a dark hairline
around the card, so the glass rules pin it to transparent rather than only recolouring it.

Hidden hosts pass `active={false}`. Document visibility and system accessibility changes release
the optical filter and flow. Observers, media listeners and timers are disposed on unmount. Browser
compositing decides how to execute the backdrop filter; the reflection rim uses WebGL when available.

Adopted by the floating player, now-playing song card, player panel handle, provider switcher, home sign-in button,
Grid home navigation/search, Grid collection/directory back and title controls, the shared visualizer
back control, shared dialogs and settings windows, the player panel and its tab groups, Grid filter
controls, side panels, menus, the command palette and the shared slide action button. The song card and panel handle use interactive
flow; the song card yields its decorative reflections to the automix progress border during a mix.
Preserve the panel handle's icon as its first SVG and brighten that icon during sliding, not the
glass host, because a host filter isolates its backdrop. Album
cards and content panels retain their existing content materials. Window titlebar hit areas and
safe spacing are unchanged.

Home's existing full-window blur belongs on its decorative background sibling. Putting a backdrop
filter on an ancestor of the navigation/search creates a backdrop root and cuts off their sampling.
The light material uses a lower tint plus a protective tone curve, with a bright rim and subtle
lower-edge shading so it retains definition on the actual pale home background.

The stock progress overrides live in the utilities layer, before `folium-mods`, so mod CSS keeps
its precedence. Preserve the icon as the slide button's first SVG: its drag feedback targets that
icon, and must not accidentally target the material's filter definitions.

The glass stylesheet declares the complete CSS layer order before its component and utility
rules. Production splits can load it before the main Tailwind stylesheet; without the declaration,
Tailwind's later base layer overrides layout utilities and collapses spacing in packaged controls.
The Windows package smoke check measures an actual button's padding and weight to guard this order.

Bottom surfaces keep visual weight separate from the glass tint: the player uses the default
shadow, the song card declares `data-glass-priority="secondary"`, and the panel handle declares
`quiet`. These only reduce shadows; they do not fade content or add another material layer.
The song card uses a fixed 12px status line, separated title/artist rows and a 12px artist label.
Player time labels use the theme's main text colour at 94% alpha through the existing progress
colour input, 11px tabular text and a minimum width that can grow for long mixes. Folium overrides
still apply after these defaults. Controlled black/white/striped tests in both default appearances
sampled small-text contrast at 4.59:1 or higher; custom theme colours remain the user's choice.

## Frozen baseline

These are the numbers the material's look is made of, and they were tuned against each other: the
fringe is sized for the displacement scale, the displacement scale for the blur. Changing one
without re-checking the rest is how this regresses. The values live in `glassBaseline.ts`;
`test/unit/app/glassBaseline.test.ts` fails when one moves, so a change here is deliberate rather
than incidental. Change the value, the test and this table together, then look at the material on
both a pale and a dark backdrop.

| Parameter | Light | Dark | What it does | Changing it breaks |
| --- | --- | --- | --- | --- |
| `GLASS_BLUR_STD_DEVIATION` | 3.5 px | 3.5 px | Softness of the pane behind the bent rim. | Larger turns the centre into frosted glass and the backdrop stops being recognisable; larger also makes the bend read as a smear, because the displaced edge no longer has a crisp shape to cut. |
| `GLASS_DISPLACEMENT_SCALE` | 22 | 16 | How far the rim pulls the backdrop inwards. Light gets more because over a bright page the bend is what makes the pane read as glass at all. | Lower on light glass and the pane goes flat — it becomes a tinted rectangle. Higher and the rim separates from the host's edge, showing a gap. |
| `GLASS_TONE_CURVE` | `0 0.2 0.44 0.72 1` | `0 0.24 0.43 0.49 0.5` | Local compression of the backdrop, per channel, as `tableValues`. | Both start at 0 on purpose: lifting pure black put a bright floor under the displaced rim, which showed as a pale halo around glass on dark artwork. The dark curve stops at 0.5 so a bright backdrop cannot out-shout the material's own white highlights; raising it makes dark glass wash out. |
| `GLASS_CHROMATIC_FRINGE` | 0.85 px | 1.15 px | How far apart the rim's red, green and blue sit — the chromatic separation that makes a bent edge read as refracting rather than painted. | Removal makes the rim read as a drawn line. Raising it turns a pale edge into a colour cast, and on dark glass the rim starts to look like a rainbow border. |
| `GLASS_THIN_PANE_PX` | 56 px | 56 px | Panes whose shorter side is under this get no chromatic separation. | Lower it and the 40 px navigation strip draws a 7%-yellow line along its edge (measured: 18/255 with the fringe, 1/255 without) — that reads as a border, not refraction. |

Two invariants the levels depend on, and that are easy to break while "just tuning a colour":

- The rim's separation is produced by offsetting **one** displaced result per channel, not by
  displacing three times. Measured at this app's real surface count (one to three visible), three
  separate displacements cost 28% more for the same edge, because each re-runs the whole Gaussian
  and image lookup. The eye reads the split, not how it was made.
- Chromatic separation is applied to the rim only. The centre is flat glass; splitting it reads as
  a blurry colour fringe rather than as a refracting edge.

The tint table is a separate axis and is **not** frozen here: it is a set of per-role values (window,
navigation/search/control/provider, player bar, cards) that exist so a text-heavy window keeps a
real ground while a control over a live backdrop stays thin. Those live in `liquidGlass.css` beside
the comments that explain the split, and they are expected to move as the surrounding UI changes.

## Reference and verification

- [iOS 27 design kits](https://developer.apple.com/news/?id=e2lxw9l1)
- [Apple HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/)
- [Custom native glass views](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views)

`dev-probe.html?probe=liquidGlass` uses the real player and original sample artwork. Add
`&tone=light` for the light appearance, or `&backdrop=stripes` to inspect actual backdrop bending.
This is a development probe and does not become a product page or a clock feature.
It includes the real song card and panel handle beside the real player to inspect the three bottom
surfaces together; their counters also allow manual checks of card activation and command sliding.

Pure optical invariants are covered in `test/unit/app/liquidGlassOptics.test.ts`. Existing player
positioning, seek, navigation, mod-width and titlebar browser checks cover integration. Desktop
verification uses an isolated profile, including real Electron rendering and accessibility media.
`test/unit/app/glassSpring.test.ts` covers convergence, bounded slow frames and release impulses.
Manual checks also observe zero material mutations after settling and unchanged host bounds during
compression; actual-home video captures hover, press, tab selection and search expansion. Separate
shader-clock checks confirm ambient advancement, interactive idle stopping, hover advancement,
reduced-motion/transparency disposal and a static-material fallback when rim WebGL is unavailable.
