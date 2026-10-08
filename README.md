# Main bedroom remodel: 3D model

Interactive three.js model of the main bedroom (4200 × 4550 × 2460mm) with the PAX/Bergsbo wardrobes, Avery super king bed, fluted bedside tables, Pesaro oak doors and herringbone floor. See [PLAN.md](PLAN.md) for the full spec and measurements.

## Run it

pnpm is pinned in `package.json` and runs through corepack (bundled with Node):

```bash
corepack pnpm install
corepack pnpm dev        # http://localhost:5173
```

Run `corepack enable` once to use plain `pnpm …` instead.

| Command | What it does |
|---|---|
| `corepack pnpm dev` | Dev server with hot reload |
| `corepack pnpm test` | Unit tests (herringbone coverage, wardrobe fit check, share links) |
| `corepack pnpm typecheck` | TypeScript check |
| `corepack pnpm build` | Type check + production build into `dist/` |

## Using it

- **Mouse:** drag to orbit, right-drag to pan, scroll to zoom. **Keys 1–7** switch camera views.
- **Walk mode:** WASD or arrow keys, mouse to look, Shift to walk faster, Esc to exit.
- The control panel (top right) switches items on and off, opens doors, changes the wardrobe build, handles, colours, floor direction and lighting, and turns on overlays (swing arcs, clearances, dimensions, pocket-door cavity).
- **Blinds:** faux wood 50mm or aluminium venetian 25mm, inside the recess or face-fixed above the window, 1–3 blinds, six finishes, with lowered % and slat tilt. The panel shows each blind's size (W × drop) for ordering. Slats cast shadows, so sunlight comes through in stripes.
- **Curtains:** Touched By Design *Luminaire* Forest Green, pencil pleat pair with thermal blackout lining, no tiebacks. You can open and close them (animated) and choose sill, below-sill or floor length, pole (four finishes) or track, how far the pole extends past the window, its height and the fullness. The panel shows the pole width × drop for ordering. Closed curtains block the sun.
- The bottom-left panel always shows the **wardrobe fit check** (space above the PAX frame, top filler size, part numbers).
- **Actions → Copy share link** puts every setting in the URL. Settings are also remembered in the browser.
- `?cam=x,y,z,tx,ty,tz` (metres) in the URL sets an exact camera position. This is handy for comparing screenshots.

## Changing measurements

Every dimension and colour is in [src/config.ts](src/config.ts), in millimetres from the corner where the bed wall meets the door wall (+x towards the window, +z towards the wardrobes). Change a number and the model updates.

## Layout

```
src/config.ts         measurements and colours
src/state.ts          control-panel state, saved settings, share links
src/layout.ts         furniture positions and wardrobe heights (pure maths)
src/lib/              herringbone generator, fit check, seeded random numbers
src/materials/        canvas textures + shared materials
src/room/             walls, floor, trim, window, doors
src/furniture/        wardrobes, handles, bed, bedside tables, dressing table, pendant
src/scene/            lighting, cameras, wall cut-away
src/overlays/         swing arcs, clearances, dimensions
src/ui/               control panel and HUD
reference/            the floor plan PDF and product photos
```
