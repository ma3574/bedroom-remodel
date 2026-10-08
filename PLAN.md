# Main Bedroom Remodel: Interactive 3D Model Plan

A browser-based, interactive 3D model of the main bedroom remodel, built with three.js. You can move around the room, open doors and switch items, overlays, colours and lighting on and off to check layout, clearances and finishes before buying and fitting.

This plan is written to be implemented in one pass. Every measurement lives in `src/config.ts` (millimetres), so fixing a number later means editing one value.

---

## 0. Decisions and assumptions to check first

| # | Item | What the model does by default | Status |
|---|------|------------------------------|--------|
| 1 | **Wardrobe height** | The 10cm base plus the 236.4cm PAX frame would be **246.4cm, 4mm taller than the 246cm ceiling**. **Decided: build B**, a 236 frame on a slim ~50mm base with 229 doors and a ~46mm top filler. Builds A and C stay in the dropdown for comparison, with a live fit check (§5.7). | ✅ Decided |
| 2 | Bergsbo door size | The linked door (`905.109.45`) is **50×195**, which only fits the 201cm frame. Build B needs **50×229** (`505.109.47`, 5 panels). The model pairs doors to the frame automatically. | Fix the order |
| 3 | Main door position | The drawing puts the door tight in the corner. Assumed: clear opening starts **100mm from the corner**, leaving room for the 70mm architrave. | Measure |
| 4 | Window sill | About 1000mm (approximate). Assumed white uPVC with 3 casements (opener, fixed, opener). | Measure |
| 5 | Herringbone direction | "Across the wardrobe line" is taken to mean the pattern's arrow axis runs **parallel to the wardrobe wall** (door wall to window wall). A control can turn it 90°. | Confirm in model |
| 6 | Dressing table | Placed against the window wall, under the window and past the foot of the bed. Can be moved. | Not bought yet |
| 7 | Wall thicknesses | Door wall 125mm (holds the pocket door), bed and wardrobe walls 100mm, window wall 300mm (external). | Assumed |
| 8 | Bedside tables | Generic fluted design. Default finish oak, 350 × 400 × 550mm (from the drawing). | Not bought yet |
| 9 | Handles | 6 IKEA options plus "none", switchable in the model (§5.8). Default: BAGGANÄS brass 335mm. | You choose |
| 10 | Pendant | Generic, 3 styles. Default: linen drum. | Any suitable |

---

## 1. Tech stack and setup

- **pnpm + Vite + TypeScript** (vanilla TS, no framework)
- **three** (latest) using these addons from `three/examples/jsm/...`:
  - `OrbitControls`, `PointerLockControls`
  - `RoundedBoxGeometry`
  - `CSS2DRenderer` (dimension labels)
  - `RoomEnvironment` + `PMREMGenerator` (soft ambient reflections)
  - `EffectComposer` (only if ambient occlusion is used)
- **lil-gui** for the control panel
- **vitest** for unit tests of the pure geometry and logic functions
- Optional, done last: **n8ao** for ambient occlusion, with an on/off control

```bash
pnpm init        # or scaffold by hand: package.json, tsconfig.json, vite.config.ts, index.html
pnpm add three lil-gui
pnpm add -D typescript vite vitest @types/three
```

Scripts in `package.json`: `dev`, `build`, `preview`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`).

No external 3D models. All geometry is built in code. Textures are generated on canvases, except the Pesaro door face, which uses the supplied photo.

---

## 2. Coordinate system and units

- **Config and all specs are in millimetres.** The scene uses **metres** (1 unit = 1m) so physically based lights fall off correctly. Use the helper `mm(v) = v / 1000` everywhere.
- **Origin** `(0,0,0)` is the floor-level corner where the **bed wall** meets the **door wall** (top-left corner of the PDF).
- **+X** runs along the bed wall towards the window wall (0 → 4200).
- **+Z** runs from the bed wall towards the wardrobe wall (0 → 4550).
- **+Y** is up (0 → 2460).

```
              bed wall (z=0), 4200
     ┌──────────[T][ BED 1940 ][T]──────────┐
 door│╲ main door (hinged, opens towards     │
 wall│  bed wall)                            │window
 x=0 │                                       │wall
4550 ║ ensuite pocket door (slides +z)       ║x=4200
     ║   ...cavity...                        ║ (window z 1055–3415)
     │                                       │
     │[f][ PAX ][ PAX ][ PAX ][ PAX ][f]     │
     └───────────────────────────────────────┘
              wardrobe wall (z=4550)
```

---

## 3. Measurements read from the PDF

`reference/Main Bedroom Sizes.pdf` is a vector drawing at **1:1 scale**: the page is 11905.5 × 12897.6pt = 4200 × 4550mm, and 1pt = 0.3528mm. PDF y runs upwards from the wardrobe wall, so `z = 4550 − y_mm`. These positions were read from the rectangles in the drawing and are already in the config below.

| Item | Reading |
|---|---|
| Main door | Door wall, marked 0–828mm from the corner. The leaf is drawn hinged at about z≈87, 758mm long, open 69° towards the bed wall |
| Pocket door | Door wall, marked 1861–2689mm from the corner (centre 2275) |
| Window | Window wall, marked 1051–3419mm (centre 2235; you gave the width as 2360) |
| Bed | 1940 wide, centre at x≈2280 (**180mm right of the room centre**, which keeps it clear of the door swing) |
| Bedside tables | 350 wide × 400 deep, touching the bed on each side |
| Wardrobes | 4 × 1000mm centred on the wardrobe wall, 100mm fillers each end, ~600 deep including doors |

---

## 4. `src/config.ts`: single source of truth

Implement this as typed constants (`as const`). The control panel state (§9) starts from these values.

```ts
export const CONFIG = {
  room: { width: 4200, depth: 4550, ceiling: 2460 },          // x, z, y
  wallThickness: { bed: 100, wardrobe: 100, door: 125, window: 300 },

  colours: {
    wall: '#EAE3D7',        // Dulux Summer Linen (30YY 79/053)
    trim: '#EAE3D7',        // skirting + architrave: same colour as walls (eggshell sheen)
    ceiling: '#F6F4EF',
    greyBeige: '#CBBFAF',   // IKEA grey-beige, sampled from the Bergsbo product photo
    floorBase: '#A6917B',   // Invictus New England Oak "Sand", average of the swatch
    floorGrainDark: '#7E6C5A',
    floorGrainLight: '#BFAE98',
    floorGap: '#5A4C3F',    // bevel shadow colour
    oak: '#C9A57A',         // Pesaro fallback / oak tint
    bedFabric: '#DDD3C3',   // cream soft melange (estimated from product photos)
    bedLegs: '#5A3B26',     // walnut-tone tapered legs
    windowFrame: '#F4F4F2',
    landingFloor: '#9C978E', ensuiteFloor: '#D9D6D0', stubWall: '#E8E4DC',
  },

  floor: {
    plank: { w: 102, l: 406, t: 2.5 },       // Invictus Maximus herringbone, dry-back LVT, bevelled
    bevelInset: 0.6,                          // shrink each plank by this much per side, dark underlay shows through
    axis: 'x',                                // 'x' = arrows run parallel to the wardrobe wall (default), 'z' = turned 90°
    arrowFlip: false,
    centreline: 2275,                         // perpendicular position of the main spine (mm)
    lightnessJitter: [0.88, 1.10],            // per-plank tone variation
    textureVariants: 8,
  },

  skirting:   { height: 120, depth: 18, groove: { w: 5, d: 3, fromTop: 20 } },     // square-groove MDF
  architrave: { width: 70, depth: 18, reveal: 5, groove: { w: 5, d: 3, fromOuterEdge: 15 } },
  lining:     { thickness: 18, stop: { w: 38, d: 12 } },

  mainDoor: {
    leaf: { w: 762, h: 1981, t: 35 },        // Pesaro oak
    clearOpening: { zStart: 100, width: 768, height: 1995 },   // leaf + 3mm gaps, ~10mm floor gap
    hingeAt: 'zStart',                       // hinge on the bed-wall side
    maxAngle: 100,                           // degrees; opens into the room, towards the bed wall
    handle: { height: 1000, inset: 60, style: 'lever-on-rose', finish: 'satin-chrome' },
  },

  ensuiteDoor: {
    leaf: { w: 838, h: 1981, t: 35 },        // Pesaro oak, pocket/sliding
    clearOpening: { zCentre: 2275, width: 838, height: 1995 }, // z 1856–2694
    slideDirection: +1,                      // +z = slides into the wall towards the wardrobes
    pull: { height: 1000, inset: 50, style: 'flush-rect', finish: 'satin-chrome' },
  },

  window: {
    zCentre: 2235, width: 2360, height: 1240, sill: 1000,      // sill approximate
    frame: { profile: 70, depth: 70 },
    lights: ['opener', 'fixed', 'opener'],
    revealDepth: 150,                        // inside face of wall to inside face of frame
    board: { t: 25, overhang: 30, ears: 40 },// internal window board
  },

  bed: {                                     // Danetti Avery super king (king spec + 300mm width)
    centreX: 2280,                           // 180mm right of room centre (per drawing)
    width: 1940, length: 2180,
    headboard: { height: 1370, thickness: 100, bottom: 150, cornerRadius: 40, ribPitch: 36 },
    railTop: 400, legHeight: 150, storageDepth: 150,
    mattress: { w: 1800, l: 2000, h: 250, sinkIntoRail: 50 },
    ottomanMaxAngle: 35,                     // lifts from the foot end, hinged at the head end
  },

  bedsideTable: { w: 350, d: 400, h: 550, gapToBed: 0, flutePitch: 25, fluteRadius: 10, topThickness: 20 },

  wardrobes: {
    run: { xStart: 100, units: 4, unitWidth: 1000 },   // centred, 100mm fillers each end
    frameDepth: 580, panelThickness: 18,
    door: { w: 495, t: 19, gapToFrame: 2, sideGap: 2.5, stile: 60, rail: 45, panelRecess: 4 },
    doorTopBelowFrameTop: 2,
    fillerShadowGap: 3, kickRecess: 21,                 // kick sits at the frame front, 21mm behind door faces
    builds: {
      A: { label: 'A: 236 frame on floor, 229 doors',     frameH: 2364, doorH: 2294, base: 0,   panels: 5 },
      B: { label: 'B: 236 frame on slim base, 229 doors', frameH: 2364, doorH: 2294, base: 50,  panels: 5 },
      C: { label: 'C: 201 frame on 10cm base, 195 doors', frameH: 2012, doorH: 1946, base: 100, panels: 4 },
    },
    defaultBuild: 'B',                                  // decided: 236 frame on ~50mm base

    handle: { style: 'bagganas-brass-335', centreHeight: 1050 },
    maxDoorAngle: 110,
  },

  dressingTable: { wall: 'window', along: 2900, w: 1000, d: 450, h: 760, stool: true, mirror: false },

  pendant: { x: 2100, z: 2275, drop: 330, style: 'linen-drum' },   // drop = ceiling to bottom of shade
} as const;
```

**Derived values** (calculated in code, not hard-coded):
- `doorFaceZ = room.depth − frameDepth − door.gapToFrame − door.t` = **3949**
- `doorTop = base + frameH − doorTopBelowFrameTop`
- `doorBottom = doorTop − doorH`
- `topFillerHeight = ceiling − doorTop`

---

## 5. Component specs

Every builder is a function `buildX(state): THREE.Group` that creates its geometry from state. Changing a dimension disposes the group and rebuilds it. Animations such as door angles only change transforms.

### 5.1 Room shell (`room/shell.ts`)
- **Walls:** for each wall, draw a `THREE.Shape` rectangle in the wall's own 2D coordinates (u along the wall, v up), cut **holes** for openings (main door, pocket door, window), and `ExtrudeGeometry` it to the wall's thickness. The inner face sits on the room boundary and the wall extrudes outwards. Material: matt paint (`MeshStandardMaterial`, roughness 0.95).
- **Ceiling:** a plane at y=2460, matt, colour `ceiling`.
- **Door linings:** 18mm boards covering each opening's reveal (two jambs and a head, as deep as the wall), trim colour. The main door also gets a 38×12 door stop.
- **Window reveals:** wall-colour returns, plus an internal window board (25mm thick, overhanging 30mm, 40mm "ears" past the reveal each side).
- **Spaces beyond the doors:** simple inward-facing boxes on the x<0 side of each door opening, 1200 deep and opening width + 600 wide, so an open door doesn't show empty space. Landing gets a carpet-grey floor. Ensuite gets a light tile floor (a canvas grid texture of 300×600 tiles). Each doorway gets a slim oak threshold strip.
- **Outside the window:** a vertical backdrop plane about 3m beyond the window with a gradient sky texture (day: pale blue to warm haze; night: navy). The `scene.background` colour follows the lighting preset.

### 5.2 Herringbone floor (`lib/herringbone.ts` + `room/floor.ts`)
**Pure generator (unit tested).** Work in an axis-aligned pattern space (s,t) with plank width W=102 and length L=406. The lattice vectors are `(W, W)` along the arrow axis and `(L, −L)` across rows. This works for any length-to-width ratio and was checked numerically for 102×406.

```
for j in rows, k in steps:
  H(k,j) = rect [kW + jL,      kW + jL + L] × [kW − jL, kW − jL + W]     // "horizontal" plank
  V(k,j) = rect [kW − W + jL,  kW + jL    ] × [kW − jL, kW − jL + L]     // "vertical" plank
```
- The arrow axis is the (1,1) direction in (s,t). Rotate the pattern by `θ = axisAngle − 45°` (axisAngle 0° when `axis='x'`, 90° when `axis='z'`, add 180° when `arrowFlip`). Then shift it perpendicular to the axis so a spine (the line s=t) lands on `centreline`.
- Rows are **L·√2 ≈ 574mm** wide perpendicular to the axis.
- Loop over enough j and k to cover the room's diagonal (about 6.2m) plus one plank length. Keep planks whose transformed rectangle overlaps the room footprint.
- Output `{ cx, cz, rotationY, isH, variant, tone }[]` with a seeded random number generator, so the floor looks the same on every reload.

**Rendering:**
- Make one `InstancedMesh` per texture variant (8 in total). Geometry: `BoxGeometry(L − 2·inset, t, W − 2·inset)` with the top face at y=0.0025.
- Put a dark underlay plane (`floorGap`) at y=0.0005 so the inset reads as bevel grooves.
- Per-plank tone: `instanceColor` = base × random lightness in `[0.88, 1.10]`, hue ±2°, saturation ±5%.
- **Grain textures:** canvas 1024×256 (4:1), one per variant. Fill with `floorBase`, then draw about 140 long, slightly wavy streaks along the length: dark `floorGrainDark` at alpha 0.25–0.5 and light `floorGrainLight` at alpha 0.15–0.3, with a few faint elongated "cathedral" arcs. Generate a matching roughness/bump map from the same strokes. Roughness about 0.6 (low-sheen LVT).
- Clip at the room edges: set `renderer.localClippingEnabled = true` and give the floor material 4 `clippingPlanes` on the inner wall faces, so edges stay clean when walls are hidden.
- Controls: axis x/z, arrow flip, centreline slider, overall tint and brightness, plank gaps on/off.
- Expect roughly 500–560 instances. The unit test samples random points inside the room and asserts each point falls inside **exactly one** plank (no gaps, no overlaps).

### 5.3 Trim (`room/trim.ts`)
- **Profiles:** square-groove MDF.
  - Skirting: 120 high × 18 deep, with a 5×3mm groove 20mm below the top.
  - Architrave: 70 wide × 18 deep, with a 5×3mm groove 15mm from the outer edge.
- Build each profile as a 2D `Shape` and `ExtrudeGeometry` it along the run length, mitring the external corners at 45°. Internal corners simply butt.
- **Skirting** runs round all walls except:
  - through door openings (it stops against the architrave),
  - the wardrobe wall,
  - the door wall and window wall beyond the wardrobe door faces (z > 3949). Built-ins cover these.
- **Architraves** go on the room side of both openings: two legs down to the floor and a head mitred at the corners, set back 5mm from the lining edge. Colour: trim (Summer Linen), eggshell (roughness 0.6).

### 5.4 Window (`room/window.ts`)
- 2360 × 1240, sill at 1000, set back 150mm from the inside face of the wall.
- White uPVC: outer frame 70×70 profile, two mullions making 3 lights (left opener, centre fixed, right opener). Openers get a second sash frame and a small white handle.
- **Glass:** `MeshPhysicalMaterial`, transparent, opacity about 0.12, slight tint. No transmission (too expensive to render). `castShadow = false` so sunlight comes through.

### 5.5 Doors: Pesaro oak (`room/doors.ts`)
- **Leaf:** box with the photo `public/textures/pesaro-oak.png` (copied from `reference/pesaro-oak-door.png`, 354×900, the door fills the frame) on both faces. Plain oak (`oak` tint) on the edges.
- **Groove relief:** draw a **bump map** on a canvas matching the photo's grooves: a rectangle inset about 7% from the edges, plus two mirrored arcs that cross near the top and bottom to form a long vesica/ellipse shape. The grooves then catch the light. Roughness about 0.55.
- **Main door:**
  - Pivot on the hinge edge at the `zStart` end. Angle 0 = closed. Opening rotates the free end into the room (+x) and towards the bed wall, up to 100°.
  - Satin-chrome lever on rose, both faces, 1000mm high and 60mm from the free edge.
  - 3 butt hinges visible on the hinge edge.
- **Pocket door:**
  - Slides in +z into the wall (open 0–100%). Because the wall mesh is solid, the leaf simply disappears into it.
  - Satin-chrome flush pull (rectangular recess), 1000mm high and 50mm from the leading edge, plus an edge pull.
- **Animation:** each frame, the current value eases towards the target value, so changes move smoothly.

### 5.6 Wardrobes: PAX + Bergsbo + MDF fillers (`furniture/wardrobes.ts`)
- **Frames** (×4): carcasses at x = 100 + 1000·i, 1000 wide × frameH × 580 deep, back to the wardrobe wall, standing on the base.
  - 18mm sides, top and bottom, a 6mm back, grey-beige.
  - Interiors are empty for now (future iteration). They're visible when the doors are open.
- **Doors** (×8), 495 × doorH × 19:
  - Frame-and-panel construction: 60mm stiles, 60mm top and bottom rails, 45mm middle rails. **5 panels** for the 229 door, **4** for the 195 door.
  - Panels sit 4mm below the frame. Use `RoundedBoxGeometry` (1.5mm radius) for the frame pieces so edges catch highlights.
  - Semi-matte grey-beige, roughness 0.55.
  - Face at z = 3949. Top at `doorTop`. 2.5mm side gaps.
  - In each frame, the left door hinges on its left edge and the right door on its right edge.
- **MDF side fillers:** x 0→97 and 4103→4200 (3mm shadow gap to the doors), from `doorBottom` to `doorTop`, flush with the door faces, painted grey-beige. They stop at the bottom of the doors, not the floor.
- **Top filler:** across the full width 0→4200, from `doorTop + 3` to the ceiling, flush with the doors, grey-beige. Make it a box back to the wall so the frame tops are hidden.
- **Kick:** across the full width, from the floor to `doorBottom − 3`, set back 21mm (at the frame front line). Slightly darker grey-beige (×0.9) so it reads as a shadowed recess.
- **Build dropdown** (A/B/C, from `CONFIG.wardrobes.builds`) plus a **base height slider** (0–150mm). Choosing a build sets the frame and door heights and the base. Changing the slider on its own switches the build label to "custom".
- **Door animation:** a control for all doors (0–110°) and a checkbox per door (8 in total) to open individual doors.

### 5.7 Wardrobe fit check (`lib/fit.ts`, unit tested)
`clearance = ceiling − base − frameH` gives one of these results:

| Result | Condition | Message |
|---|---|---|
| ❌ | clearance < 0 | "Doesn't fit: frame + base is Xmm taller than the ceiling" |
| ❌ | 0–5mm | "IKEA needs ≥6mm above the frame to assemble upright" |
| ⚠️ | 6–24mm | "Very tight: floors and ceilings are rarely level; measure in several places" |
| ✅ | ≥ 25mm | "Fits with an Xmm top filler" |

The panel shows the result live (read-only text plus a coloured badge), along with `topFillerHeight`, `doorBottom` and the door and frame part numbers for the current build. Test cases:
- your original plan (236 + 100mm base) → **−4mm ❌**
- build A → 96mm ✅
- build B → 46mm ✅
- build C → 348mm ✅

### 5.8 Handles (`furniture/handles.ts`)
Simplified models generated in code. They're good for comparing size, finish and position, not exact replicas. Each handle is mounted vertically on the meeting stiles of each door pair (centred on the stile, 30mm in from the meeting edge), centred at `centreHeight` (default 1050, slider 900–1200). Knobs sit at the same point.

| id | Product | Shape in model | Size | Finish |
|---|---|---|---|---|
| `bagganas-brass-335` *(default)* | [BAGGANÄS handle](https://www.ikea.com/gb/en/p/bagganaes-handle-brass-colour-20338411/) | Round bar (Ø12) on two posts | 335mm | Brass, metalness 1, roughness 0.3, `#C9A55C` |
| `bagganas-black-143` | [BAGGANÄS handle](https://www.ikea.com/gb/en/p/bagganaes-handle-black-80338413/) | Round bar on posts | 143mm | Matt black |
| `kallror-steel-405` | [KALLRÖR handle](https://www.ikea.com/gb/en/p/kallroer-handle-stainless-steel-10357004/) | Slim flat bar on posts | 405mm | Brushed stainless steel |
| `hamphult-oak-146` | [HAMPHULT handle](https://www.ikea.com/gb/en/p/hamphult-handle-oak-40614243/) | Wooden bar | 146mm | Oak |
| `eneryda-brass-35` | [ENERYDA knob](https://www.ikea.com/gb/en/p/eneryda-knob-brass-colour-80610865/) | Mushroom knob | Ø35mm | Brass |
| `osternas-leather-65` | [ÖSTERNÄS leather handle](https://www.ikea.com/gb/en/p/oesternaes-leather-handle-tanned-leather-20348896/) | Leather loop with 2 screws | 65mm | Tan leather |
| `none` | Push-to-open | No handle | | |

### 5.9 Bed: Danetti Avery super king (`furniture/bed.ts`)
Reference: `reference/avery-bed-dimensions.jpg`, `reference/avery-bed-front.jpg`. King spec is W1640 × D2180 × H1370, base 400, legs 150, 15cm ottoman storage. Super king = same, but 1940 wide.
- **Headboard:** 1940 wide, from y=150 to 1370, 100 thick, against the bed wall, top corners rounded (r 40).
  - **Vertical channels** at 36mm pitch (about 54 ribs). Each rib is a half-capsule (r≈17mm) standing out from an 80mm backing slab.
  - Merge all ribs into one `BufferGeometry` to keep draw calls low.
- **Base:** upholstered box rail from y=150 to 400 around the footprint (1940 × (2180 − 100)), same fabric.
- **Legs:** walnut-tone tapered legs, 150mm tall. One in each corner (inset 50mm) and 2 hidden in the middle.
- **Fabric material:** canvas noise "melange" texture plus a fine bump map, roughness 0.9, colour `bedFabric`.
- **Mattress:** 1800 × 2000 × 250, rounded box (r 40), white/cream, sitting 50mm down inside the rail.
- **Bedding (on/off, default on):** duvet (a thin rounded box draped over the top and 150mm down the sides and foot, off-white), 2 large pillows and 2 cushions near the headboard.
- **Ottoman lift (on/off):** the mattress, slat deck and bedding rotate up to 35° around a hinge line near the headboard, showing a 150mm-deep storage well (dark grey hardboard base).
- **Position:** `centreX` slider (offset from the room centre, ±400mm). The bedside tables move with the bed.

### 5.10 Bedside tables: generic fluted (`furniture/bedsideTable.ts`)
- 350 × 400 × 550 (sliders for each), one on each side of the bed, backs against the bed wall, `gapToBed` slider (0–100).
- Body with **vertical half-round flutes** on the front and both sides (25mm pitch, r 10), echoing the headboard ribs.
- 20mm top slab with a slight overhang (5mm), a 2mm shadow-gap line for one drawer 120mm below the top, and a 30mm recessed plinth.
- Finish dropdown: Oak *(default)*, Cream fabric match, Grey-beige, Walnut.
- Optional table lamp on each (off by default): ceramic base and linen shade. Gives a warm light in the evening and night presets.

### 5.11 Dressing table: generic (`furniture/dressingTable.ts`)
- 1000 × 450 × 760: oak top, 2 slim drawers, 4 tapered legs, plus an upholstered stool (450 × 350 × 450) tucked under.
- Optional freestanding mirror on the table (off by default, because it sits in front of the window).
- Placement controls: **wall** (window / door / bed), **position along the wall** (slider), width, depth. The table always faces into the room.
- Default: window wall, centred at z=2900 (z 2400–3400). That clears the foot of the bed (z 2180) and the swing of the right-most wardrobe door (z ≥ 3454).

### 5.12 Pendant (`furniture/pendant.ts`)
- Centred at (2100, 2275). The drop slider (200–600) sets the distance from the ceiling to the bottom of the shade. Default 330 puts the bottom of the shade at 2130.
- Ceiling rose, flex and lamp holder, plus a style dropdown:
  - **Linen drum** *(default)*: Ø450 × 250, a thin open cylinder of translucent fabric with an emissive inner face when lit.
  - **Rattan dome**: Ø500 hemisphere with a woven alpha-map canvas texture.
  - **Opal glass globe**: Ø300 sphere, emissive when on.
- Light: a `PointLight` inside the shade, warm 2700K (`#FFC58F`), about 60cd (≈800lm), decay 2, casting shadows when "High-quality shadows" is on.

---

## 6. Lighting and rendering (`scene/lighting.ts`)
- `WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })` (the buffer setting is needed for screenshots).
- `outputColorSpace = SRGBColorSpace`, `toneMapping = ACESFilmicToneMapping`, exposure slider (default 1.0), pixel ratio capped at 2.
- Shadows on, `PCFSoftShadowMap`. All furniture and walls cast and receive shadows; glass doesn't cast.
- `RoomEnvironment` through `PMREMGenerator` as `scene.environment` (intensity about 0.35) for soft reflections on brass, steel and satin paint.
- **Presets:**

| Preset | Sun | Ambient | Pendant / lamps |
|---|---|---|---|
| **Day** | Warm-white directional light through the window, 2048 shadow map, low elevation so a sun patch falls on the floor | Hemisphere sky `#DFE9F5` / ground `#B9A58C` | Off |
| **Evening** | Low, orange, dimmer | Lower | Pendant on |
| **Night** | Off | Very low (`#1A2030`) | Pendant on, lamps on if shown |

- Controls: preset, sun direction (azimuth and elevation sliders, because the room's compass direction is unknown), pendant on/off and intensity, exposure, high-quality shadows on/off.
- **Optional, done last:** N8AO ambient-occlusion pass with an on/off control (default on if the frame rate stays at least 50fps). If it causes any trouble, leave it out.

---

## 7. Cameras, navigation and wall cutaway (`scene/cameras.ts`, `scene/cutaway.ts`)
- **Orbit (default):** `OrbitControls` aimed at the room centre (2.1, 1.0, 2.275). Polar angle limited so you can't go under the floor, damping on.
- **Presets** (smooth 0.8s camera moves):
  - **Plan**: orthographic top-down view of the whole room, ceiling hidden, dimension overlay suggested
  - **Doorway**: eye at 1600mm just inside the main door, looking at the window and bed
  - **From bed**: sitting up against the headboard (eye about 1100mm), looking at the wardrobes
  - **Ensuite door**: looking back at the bed wall
  - **Wardrobes**: standing at the foot of the bed facing the PAX run
  - **Corner 3/4**: high angle from the window and wardrobe corner
- **Walk mode:** `PointerLockControls` + WASD/arrow keys, eye height 1650 (slider), speed 1.4m/s. Position kept inside the room footprint minus 200mm. Esc leaves walk mode.
- **Wall cutaway (auto, on by default in orbit):** for each wall group (wall, its skirting and architraves, and the window for the window wall), hide it when the camera is outside that wall's inner plane (`dot(camPos − wallPoint, inwardNormal) < 0`). The ceiling hides when the camera is above 2460. **Furniture, doors, wardrobes and fillers are never hidden.** Controls: auto cutaway on/off, "show all walls", "show ceiling".

---

## 8. Overlays (`overlays/`)
All on/off, drawn as slightly lifted translucent decals or lines with `CSS2DRenderer` labels.
- **Swing arcs:** main door (radius 762, 0–100°), each wardrobe door (quarter circle, radius 495), the ottoman lift footprint.
- **Pocket cavity / no-fixing zone:** shaded strip on the door wall z 2694→3532, labelled "Pocket door cavity: don't fix into wall".
- **Clearances** (live distances that update when anything moves):
  - foot of bed → wardrobe doors (≈1769)
  - side of bed → window wall (≈950 at default)
  - side of bed → door wall
  - main door fully open → left bedside table
  - dressing table → wardrobe door swing
  - Clearances under 600mm show amber; overlaps show red.
- **Room dimensions:** wall lengths, ceiling height, window and door positions (mainly for the Plan view).
- **Grid:** 100mm floor grid, faint.

---

## 9. Controls panel (`ui/gui.ts`) and saved settings (`state.ts`)
A typed `State` object, initialised from `CONFIG`. lil-gui binds to it, and `onChange` calls either `rebuild(section)` or `setTarget(...)` for animations.

| Folder | Controls |
|---|---|
| **View** | Camera preset · Walk mode · Eye height · Auto cutaway · Show all walls · Show ceiling |
| **Show / hide** | Bed · Bedding · Bedside tables · Lamps · Dressing table · Stool · Mirror · Wardrobes · Fillers · Pendant · Doors |
| **Doors** | Main door angle · Ensuite door open % · Open all wardrobes (angle) · per-door checkboxes 1–8 |
| **Wardrobes** | Build (A/B/C) · Base height · Handle style · Handle height · Colour · **Fit check readout** |
| **Bed** | Offset from centre · Ottoman lift · Fabric colour |
| **Bedside tables** | Width · Depth · Height · Gap to bed · Finish |
| **Dressing table** | Wall · Position along wall · Width · Depth |
| **Floor** | Axis (across / along) · Arrow flip · Centreline · Tint · Brightness · Plank gaps |
| **Colours** | Walls (Summer Linen) · Trim · Ceiling · Wardrobe/MDF (grey-beige) · Reset colours |
| **Lighting** | Preset · Sun azimuth / elevation · Pendant style · Pendant drop · Pendant on/off · Intensity · Exposure · High-quality shadows · AO |
| **Overlays** | Swing arcs · Clearances · Dimensions · Pocket cavity zone · Grid |
| **Actions** | Screenshot (PNG download) · Copy share link · Reset to defaults |

- **Saved settings:** the state is written to `localStorage` key `bedroom-remodel:v1` (every read and write in try/catch, falling back to defaults). **Share link:** the differences from the defaults are base64-encoded into the URL hash. On load: URL hash > localStorage > defaults.
- A small fixed **legend/HUD** in the bottom-left shows the current preset name, the fit-check badge and "Press Esc to leave walk mode" when relevant.

---

## 10. File structure

```
bedroom-remodel/
├─ PLAN.md
├─ README.md                    how to run, where to edit measurements
├─ reference/                   source images (not served)
│   ├─ Main Bedroom Sizes.pdf   1:1 vector floor plan (§3)
│   ├─ pesaro-oak-door.png  bergsbo-door-front.jpg  bergsbo-229-in-room.jpg
│   ├─ invictus-sand-swatch.jpg  invictus-sand-herringbone-room.jpg
│   └─ avery-bed-dimensions.jpg  avery-bed-front.jpg
├─ public/textures/pesaro-oak.png
├─ index.html  package.json  tsconfig.json  vite.config.ts
├─ src/
│   ├─ main.ts                  renderer, scene, loop, rebuild orchestration
│   ├─ config.ts                §4
│   ├─ state.ts                 State type, saved settings, URL hash
│   ├─ units.ts                 mm(), deg(), colour helpers
│   ├─ lib/
│   │   ├─ herringbone.ts       pure generator (§5.2)
│   │   ├─ fit.ts               fit check (§5.7)
│   │   └─ rng.ts               seeded random number generator
│   ├─ materials/
│   │   ├─ textures.ts          canvas textures: grain, melange, weave, tile, bump maps
│   │   └─ library.ts           shared materials, colour updates
│   ├─ room/        shell.ts  floor.ts  trim.ts  window.ts  doors.ts
│   ├─ furniture/   wardrobes.ts  handles.ts  bed.ts  bedsideTable.ts  dressingTable.ts  pendant.ts  lamp.ts
│   ├─ scene/       lighting.ts  cameras.ts  cutaway.ts  animation.ts
│   ├─ overlays/    swings.ts  clearances.ts  dimensions.ts
│   └─ ui/          gui.ts  hud.ts
└─ tests/  herringbone.test.ts  fit.test.ts  state.test.ts
```

---

## 11. Build order
1. **Scaffold:** pnpm project, configs, `config.ts`, `units.ts`, `rng.ts`. Write `herringbone.ts` and `fit.ts` with tests and get them passing.
2. **Renderer, camera, orbit controls**, basic lights, render loop, resize handling.
3. **Room shell:** walls with openings, ceiling, linings, spaces beyond the doors, window backdrop.
4. **Herringbone floor:** instanced planks, grain textures, clipping.
5. **Trim and window:** skirting, architraves, uPVC window, window board.
6. **Pesaro doors:** texture, bump grooves, hinge and slide animation, hardware.
7. **Wardrobes:** frames, Bergsbo doors, fillers, kick, top filler, builds, fit check, handles, door animation.
8. **Furniture:** bed (headboard ribs, ottoman), bedside tables, dressing table and stool, pendant, lamps.
9. **Lighting presets and shadows**, environment map, tone mapping.
10. **Camera presets, plan view, walk mode, auto cutaway.**
11. **Overlays:** swing arcs, clearances, dimensions, pocket zone, grid.
12. **Controls panel, saved settings, share link, screenshot, HUD.**
13. **Polish:** optional ambient occlusion, frame-rate pass, README.

---

## 12. Testing and acceptance

**Automated** (`pnpm typecheck && pnpm test && pnpm build` must all pass):
- `herringbone.test.ts`: 5,000 random points inside the room each fall in exactly one plank (gap set to 0). Plank count is between 450 and 650. Results are identical for the same seed. Switching the axis turns the pattern 90°.
- `fit.test.ts`: the 4 cases in §5.7.
- `state.test.ts`: encoding and decoding the share link round-trips. A corrupt hash or missing localStorage falls back to defaults.

**Manual / visual** (run `pnpm dev`, then go through each camera preset and take screenshots; use browser tools if they're connected, otherwise a small Playwright script `scripts/screenshot.mjs`):
- [ ] Room reads as 4200 × 4550 × 2460. The Plan view's dimension overlay matches §3.
- [ ] Herringbone arrows run door wall → window wall by default, have visible plank-to-plank tone variation and clean edges at the walls.
- [ ] The main door swings towards the bed wall and clears the left bedside table. The pocket door slides towards the wardrobes into the wall.
- [ ] Wardrobes (build B by default): 8 grey-beige 5-panel doors, flush fillers both ends stopping at the bottom of the doors (~118mm off the floor), recessed kick, ~46mm top filler up to the ceiling. Switching builds updates heights and the fit check. Build C shows 4-panel doors and a ~348mm top filler.
- [ ] Each handle option shows correctly on the meeting stiles.
- [ ] Bed: ribbed headboard, rounded top corners, walnut legs. Ottoman lift animates.
- [ ] The day preset casts a sun patch through the window. Night lights the room warmly from the pendant.
- [ ] Walls nearest the camera hide automatically in orbit. Walk mode stays inside the room.
- [ ] Settings survive a reload. The share link reproduces the view in a new tab.
- [ ] Steady 60fps on an Apple-silicon Mac at default settings (shadows on, ambient occlusion optional).

---

## 13. Out of scope (future iterations)
- PAX interior layouts (rails, shelves, drawers) shown with the doors open
- Real dressing table model once chosen; real bedside tables once chosen
- Curtains or blinds, rug, wall art, mirror on a wall
- Ensuite interior
- Click-to-measure tool; exporting a dimensioned plan as PDF
- WebXR / VR walk-through

---

## 14. Sources
- PAX frame 100×58×236 grey-beige: https://www.ikea.com/gb/en/p/pax-wardrobe-frame-grey-beige-00458206/ (needs a ceiling of at least 237cm to assemble upright)
- BERGSBO door 50×195 (fits 201 frame only): https://www.ikea.com/gb/en/p/bergsbo-door-grey-beige-90510945
- BERGSBO door 50×229 (fits 236 frame): https://www.ikea.com/gb/en/p/bergsbo-door-grey-beige-50510947
- Danetti Avery (king spec, used as the base for the super king): https://www.danetti.com/products/avery-fabric-king-size-bed-with-storage-cream
- Invictus Maximus New England Oak Parquet Sand 102×406×2.5mm: https://invictus.co.uk/lvt-maximus-newenglandoakparquet-sand?dimensions=102x406
- Dulux Summer Linen `#EAE3D7` (30YY 79/053): https://plan-home.com/color/dulux-summer-linnen

---

## 15. Implementation notes (v0.1, 2026-10-08)

Built as planned. Differences from the spec above:

- **Main door max angle is 95°**, not 100°. Beyond about 98° the leaf would hit the bed wall, because the hinge is only 103mm from the corner.
- **Lighting values** were tuned against rendered screenshots: pendant 22cd (slider 5–150), table lamps 6cd, glow on the shade 0.55. three.js 0.186 drops `PCFSoftShadowMap`, so `PCFShadowMap` is used, and `THREE.Timer` replaces the deprecated `Clock`.
- **Hidden walls stay in the shadow pass.** Cut-away walls move to layer 1, which the camera skips but the sun and pendant shadow cameras still render, so sunlight doesn't flood in through hidden walls.
- **Side fillers** run from the bottom of the doors up to the top filler (no shadow gap between them).
- **Ambient occlusion (N8AO) is not included.** It was optional and the scene reads well without it.
- **Extras:** keys 1–7 switch camera views, `?cam=x,y,z,tx,ty,tz` sets an exact camera, and a "Custom" wardrobe build is selected automatically when the frame or base is changed by hand.
- **Verification:** `pnpm typecheck`, `pnpm test` (14 tests) and `pnpm build` all pass. Every camera view was checked with headless-Chrome screenshots, with no console errors.

### Blinds (added after v0.1)
- `CONFIG.blinds` holds two types:
  - **Faux wood 50mm:** 43mm pitch, 6.5mm stack pitch, 50×60 headrail, 75mm valance.
  - **Aluminium venetian 25mm:** 21mm pitch, 2.6mm stack pitch, 25×25 headrail, no valance.
- **Six finishes:** white, linen, grey-beige, oak effect, brushed silver, matt black.
- **Fitting:**
  - **Recess:** 5mm side clearance, slats 15mm behind the wall face, clear of the window handles.
  - **Face fit:** 100mm overlap each side, headrail 100mm above the opening, 35mm off the wall.
  - In both cases the bottom rail stops 5mm above the window board.
- **Pure layout** is in `src/lib/blinds.ts` (6 unit tests). Raising the blind lifts the bottom rail, which collects slats into a flat stack. Lowering and tilting are animated without rebuilding the geometry.
- **Defaults:** 3 white faux-wood blinds in the recess (each 780 × 1233mm), fully lowered, slats tilted 15°.
- **Size warning:** the panel warns when a single blind is wider than the typical 2400mm maximum. One face-fit blind would be 2560mm wide. Check the exact limit with your supplier.

### Curtains (added after v0.1)
- **Product:** [Touched By Design Luminaire Forest Green](https://www.blindsdirect.co.uk/product/touched-by-design-luminaire-forest-green-curtain): 100% polyester crushed-velvet-look plain weave, 140cm fabric width.
- **Order spec:** pencil pleat (75mm tape), pair, thermal blackout lining, no tiebacks.
- **Colour:** sampled from the swatch: `#424B3B`, ranging from `#232F25` to `#68765D`. Saved as `reference/luminaire-forest-green-*.jpg`.
- **Material:** `MeshPhysicalMaterial` with sheen, a procedural crushed-velvet mottle and an ivory lining on the back face. The fabric casts shadows from both sides, so closing the curtains blocks the sun.
- **Geometry:**
  - Each curtain is a pleated sheet with about one fold per 110mm.
  - Fold depth is worked out from the fabric being gathered into the current span (2.25× fullness), so folds deepen as the curtains open.
  - Pencil-pleat ripples in the heading, slight flare at the hem, seeded variation between folds.
- **Hanging:**
  - **Pole (default):** antique brass to tie in with the brass handles, 28mm, 150mm above the window, 200mm past each side, 130mm off the wall (210mm when the blinds are face fitted). Rings move with the folds; ball finials; three brackets.
  - **Track:** white, wall-bracketed.
- **Default length is below sill (hem 850)**, because floor-length curtains would hit the dressing table (top 760) under the window. The clearances overlay flags this ("Curtain hem → dressing table top").
- **Pure maths** is in `src/lib/curtains.ts` (6 unit tests). The order readout shows pole width × drop and fabric widths per curtain. Defaults: pole 2760mm, drop about 1506mm, about 2.2 fabric widths per curtain.

