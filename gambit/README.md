# Gambit (`/gambit/`)

Gambit is the chess analysis app formerly called NorthPeak Chess; renamed to Gambit on Oct 29, 2026 (1.1.1). Nothing else changed: same features, same Stockfish 18 lite engine. Saved settings keep their old `npChess:` storage keys on purpose, so nothing resets.

A chess analysis page for northpeakstudios.github.io. Paste a FEN or PGN (or open with `?fen=` / `?pgn=`), get Stockfish analysis on the phone, and review a whole game move by move. 100% client-side: no server, no API keys, no network calls after the page loads. It works offline once it has loaded one time.

Base: `NorthPeakStudios/northpeakstudios.github.io` origin/main `dd360014ba8eb3b82cfb2c258aa575767601fd99`. Everything lives in the new `gambit/` folder; no other file in the repo is touched.

## What changed in 1.1 (merge with Tomo's Gambit)
Odin asked everyone to review Tomo's "gambit" app, rename it and send it back. Gambit as shipped couldn't run: its chess.js and Stockfish CDN links return 404, and it needed the internet. So this release keeps NorthPeak Chess (now Gambit) as the base and takes Gambit's one new idea, **reading a board from a screenshot**, rewritten to fit this app.

- **Read board from screenshot (experimental).** Pick, drop or paste an image. The app finds the board on its own (it scores square windows for a light/dark checker pattern) and shows a crop frame with four corner handles. Drag the frame to move it, or drag a corner to resize. The frame snaps to the grid lines (a robust line fit on interior lines, falling back to equal division). Each square is then compared against piece templates with normalized correlation (cburnett + merida, two scales, ±2 px shift, against the square's own background colour). Squares it isn't sure of get a dashed amber **?** on the board. Everything lands in the existing board editor. Fix squares, set who's to move, then tap **Analyze this**. Tapping a square clears its ?, and "Looks right, clear ?s" clears them all. A "Black at bottom" toggle is there too; it is also set automatically when the kings say so. It's all canvas work on the phone: no network, no new CSP sources.
- **Honest copy.** The old "can't read screenshots" line is replaced with: "Rough read — works best on clean, straight-on lichess-style boards. Check every square before analyzing."
- **Reference overlay kept, and better.** "Lay the framed board over the editor board" now overlays the *cropped* board, so it lines up square for square.
- **Name.** In 1.1.0 the app was NorthPeak Chess in a `chess/` folder (cache `chess-v2`). As of 1.1.1 it is **Gambit**: manifest name and short name "Gambit", folder `gambit/`, service worker cache `gambit-v1`. The credit line "Screenshot reader adapted from Tomo's Gambit prototype." is kept.
- **Not taken from Gambit:** its engine and board code (broken CDN links), and its "alpha" piece templates. Lichess lists alpha as "free for personal non commercial use", which doesn't fit a GPL app on a studio site.

### Reader accuracy (measured, headless Chromium + WebKit, 390×844)
| test image | squares right | marked ? |
|---|---|---|
| 6 clean renders of this app's board (3 positions × lichess-brown and green themes, cburnett) | 64/64 each | 0–1 |
| 2 full-phone JPEG screenshots of the app (UI, eval bar, engine arrow, q70); board found automatically | 64/64 each | 0–1 |
| 2 independent lichess-colour boards with merida pieces, coordinates, last-move highlight, JPEG | 64/64 each | 3–7 |
| 4 desktop-layout JPEGs with piece sets the reader has never seen (staunty, chessnut ×2, fresca) | 54, 58, 60, 64 (WebKit) · 56, 58, 59, 64 (Chromium) | 3–18 |

Total across 14 images: **870/896 squares (97%)** in WebKit and 871/896 in Chromium. Only **2 squares** were wrong *without* a ? (a staunty bishop and queen read as other pieces). A read takes about 0.5 s on a desktop CPU; expect 1–3 s on a phone. Translation: on lichess-style boards (cburnett or merida pieces) it is close to exact. On other piece sets (chess.com's default pieces included, which can't be bundled) it gets most squares and flags the rest. Tilted photos of screens, arrows drawn over pieces, and heavy compression will do worse. Always check before analyzing.

### Code review fixes (whole merged app)
- The editor and FEN loader now reject positions where **the side not to move is in check**. chess.js `validateFen` doesn't catch this, and Stockfish gives nonsense on such positions. It's an easy state to reach from a screenshot when "who's to move" is wrong. You get a plain message ("…Switch who's to move.") and Analyze stays disabled.
- Cards scrolled into view (for example the screenshot card) no longer hide under the sticky header (`scroll-margin-top`).
- WebKit could hand the reader an image before it was decoded. Fixed by awaiting `decode()`, with one retry.
- Crop frame math is done in px against the image's real rendered box, so it stays aligned at any width, on rotation and on resize. Pointer events cover touch and mouse, and the stage has `touch-action:none`, so dragging the frame doesn't scroll the page.
- The reader clips `drawImage` source rects to the image (older WebKit draws nothing for out-of-bounds rects).
- Escaping re-checked: all user text still goes through `textContent`. The only `innerHTML` writes are fixed SVG built from validated squares and piece ids.

## How to ship it
Drop the `gambit/` folder into the repo root and commit. It is served at https://northpeakstudios.github.io/gambit/. Nothing else needs changing.
The site's landing page (`index.html`) is a marketing and pricing page with no simple app registry, so I did **not** add a link to it. Add one by hand if you want it listed.

## What works
- **Load box up front.** One paste field auto-detects FEN vs PGN (a bare move list like `1. e4 e5 2. Nf3` works too). Upload a `.pgn` / `.txt` / `.fen` file (multi-game PGN loads the first game), drag and drop, a sample game, the start position, or set up a board by hand.
- **URL params for iOS Shortcuts.** Use `?fen=<urlencoded FEN>` (a FEN with only the board part is completed as `w - - 0 1`) or `?pgn=<urlencoded PGN>`. Bad input shows a plain error and never crashes the page.
- **Screenshot slot.** An image (picked, dropped, or pasted into the text box) opens "Read board from screenshot (experimental)". See the 1.1 notes above. The result always goes through the editable board first.
- **Board editor.** Piece palette plus eraser, side to move, start/empty/flip, and a live FEN field with validation. Castling rights are inferred from king and rook home squares. Then "Analyze this".
- **Live engine.** Stockfish 18 lite in a Web Worker. Shows a chess.com-style eval bar and number (White's view, mates as `M3` / `-M3`), a best-move arrow (2nd line as a thinner purple arrow), **MultiPV 3** top lines in SAN with evals (tap a line to play its first move), and live depth and kn/s. Live depth is adjustable (default 18), with an engine on/off switch.
- **Game review.** Every position is analysed to a fixed depth (adjustable 10–18, default **14**) with a progress bar, time-left estimate and **Cancel**. Each position is capped at 8 s so a slow phone or a mate-heavy endgame can't stall it. The review gives:
  - a class per move with colored badges in the move list and on the board
  - accuracy % per side
  - a per-side count table
  - an SVG eval graph (tap to jump; inaccuracy/mistake/blunder dots)
- **Navigation.** Prev/next/first/last buttons, ←/→/Home/End keys, horizontal swipe on the board, tap a move in the list, tap the graph. Tapping pieces plays moves. At the end of the game this extends the game; mid-game it opens a side line with "Back to game".
- **Nice-to-haves from Folk's list (all in):**
  - ECO opening name, from a vendored lichess table (CC0, 3,864 positions, loaded lazily)
  - annotated PGN export (copy or download): `$6/$2/$4` NAGs for ?!/?/??, `{[%eval]}` comments, "Best was …"
  - copy FEN, and copy a share link (`?fen=` or `?pgn=`)
  - three board themes (Green / Brown / Slate, remembered)
  - last-move, check and best-move highlights
- **House conventions.** Same as the other apps:
  - Northpeak dark palette and header
  - `manifest.webmanifest` and icons (180/192/512)
  - `pwa.js`, `nozoom.js`, shared `np-update.js` auto-update (holds off reloading mid-review)
  - service worker with versioned cache **`chess-v1`**, `?v=` on assets, CSP meta tag
  - the service worker pre-caches the engine (~7.3 MB) so FEN/URL import and analysis work offline

## Move classification (centipawn loss)
Loss = the mover's eval before the move minus after it, from the mover's side. Evals are clamped to ±1000 cp, and a forced mate counts as 1000.

| Class | Rule |
|---|---|
| Best ★ | the engine's own top move in that position |
| Excellent ! | 0–20 cp |
| Good ✓ | 21–50 cp |
| Inaccuracy ?! | 51–100 cp |
| Mistake ? | 101–300 cp |
| Blunder ?? | > 300 cp |

Guard: a move can only be graded Inaccuracy / Mistake / Blunder if it also drops the mover's win chance by at least 10 / 20 / 30 points (lichess's win% bands). The milder grade wins, so going from +9 to +5 in a won game isn't called a blunder. These thresholds are documented in the app too ("How the review grades moves").

**Accuracy** uses the lichess method:
- win% = 50 + 50·(2/(1+e^(−0.00368208·cp)) − 1)
- move accuracy = 103.1668·e^(−0.04354·Δwin%) − 3.1669 (+1, clamped 0–100)
- game accuracy = mean of (volatility-weighted mean, harmonic mean) per side

## Engine, size and speed
- `engine/stockfish-18-lite-single.js` (21 KB) + `.wasm` (**7.3 MB**), from npm `stockfish@18.0.8` (nmrugg/stockfish.js), shipped unmodified.
- It's the single-threaded lite build because GitHub Pages can't send COOP/COEP, so threaded builds (SharedArrayBuffer) won't run on iPhone Safari. The full NNUE build is 113 MB, too big. The 7.3 MB file is fine for git and Pages (limit 100 MB). The first visit downloads it once and the service worker keeps it.
- Measured headless at 390×844 on the build box (a 16-core Linux server, **not a phone**):

| | Chromium | WebKit |
|---|---|---|
| engine ready | 0.37 s | 0.48 s |
| first eval at depth ≥10 | 0.39 s | 0.51 s |
| depth 18 | 0.84 s | 1.12 s |
| speed | 1101 kn/s | 980 kn/s |
| Opera Game review (33 plies, depth 14) | 1.8 s | 1.5 s |
| Kasparov–Topalov review (87 plies, depth 14) | 4.5 s (8.4 s with 4× CPU throttling) | 5.2 s |
| same game at depth 18 | 56–247 s | 183 s |

  Depth 18 is why the menu labels it "slow" and why there's the 8 s per-position cap.
- **iPhone: not measured on a real device.** Expect a phone core to be roughly 1.5–3× slower than this server under Safari. That puts the engine ready and first eval at about 1–2 s (Folk's bar: under 15 s), and a 40-move game review at depth 14 at about 10–25 s. Depth 10–12 is the setting for older phones. Please time it on Odin's iPhone; the progress bar shows the real numbers.
- **UI never freezes.** The engine runs in its own worker. While a review ran, the page answered script calls in 1–6 ms (measured), and you can scroll, navigate and cancel during a review.

## CSP (meta tag in `gambit/index.html`)
`default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`
- No CDN, no inline script, no `eval`, no `unsafe-eval`, no third-party origin anywhere.
- `worker-src 'self'`: the engine is a same-origin worker file. No `blob:` workers are used, so `blob:` is **not** in worker-src.
- `img-src blob:`: for your own screenshot (an object URL), the cropped-board overlay, and the reader's piece templates. Those are inlined SVG strings turned into `blob:` images and drawn on a canvas, so `data:` is still not needed. The reader added **no** CSP sources.
- `connect-src 'self'`: only the lazy `eco.json` fetch.
- `style-src 'unsafe-inline'`: house convention (the inline `np-nozoom` style block). The app sets styles only through the CSSOM.
- `'wasm-unsafe-eval'`: **not required in testing.** A dedicated worker gets its own policy from its response headers, not the page's meta tag. With it removed, the engine still ran in Chromium and WebKit. It's kept as a narrow safeguard in case iOS Safari applies the page policy to the worker. It allows WebAssembly compilation only, never JS `eval`. Remove it if you want the strictest policy.
- User text (PGN headers, file contents, errors) is only ever set via `textContent`. Tested with `[White "<img src=x onerror=alert(1)>"]`: it renders as text, and no element is injected.

## Tests (Playwright, 390×844, Chromium + WebKit)
`../out/chess/test-results.json` and the `shots/` folder. Covered:
- `?fen=` load and engine eval, plus 3 lines
- sample PGN, then a full review with 33 badges, accuracy, graph tap jumps to the right move, arrow keys
- final checkmate position shows "White wins by checkmate"
- `?pgn=` load
- XSS-escaped header
- image upload: the board is found, read and put in the editor with the honest note and overlay, then "Analyze this" runs the engine on it (end to end in both browsers)
- screenshot reader accuracy run (`../out/chess2/reader-*.json`, source images and result shots in `../out/chess2/shots/`)
- illegal side-to-move (side not to move in check) is blocked with a plain message
- bad FEN and garbage input show plain errors
- review cancel restores the UI
- annotated PGN download
- **offline** (Chromium): the service worker caches all 21 shell files, the page is reloaded with network off on a new `?fen=` link, and the engine still evaluates (M1 found)

**Console errors: none** in either browser. The one exception is the deliberate offline step: Chromium logs `net::ERR_INTERNET_DISCONNECTED` for the service worker's network-first page fetch before it falls back to the cache. That is expected and not a script error.

## Partial / not done
- **Screenshot → FEN** is a template matcher, not a vision model: rough on non-lichess piece sets, no perspective correction, and side to move / castling / en passant can't be read from a picture (castling is inferred from home squares; side to move defaults to White).
- **Promotion** always promotes to a queen when you play moves by tapping. PGNs with under-promotions load and review correctly.
- No drag-and-drop piece moving (tap–tap only). No brilliant/great/miss/book classes (the spec asked for the six classes). Variations inside an imported PGN are ignored (main line only).
- Not timed on a real iPhone (see above).

## Licenses
- Stockfish.js is **GPLv3** (`engine/Copying.txt`, attribution in `LICENSES.txt` and in the app's "How the review grades moves" panel). It's shipped unmodified, with source links. Because GPL code ships in this folder, treat `gambit/` as GPLv3-licensed when distributing.
- chess.js 1.4.0 is BSD-2-Clause (`vendor/LICENSE-chess.js.txt`).
- The cburnett pieces are GPLv2+/BSD/GFDL (via lichess chessground, GPL-3.0+). Lichess's COPYING.md lists cburnett as GPLv2+. They are not CC BY-SA, as was guessed in the merge brief.
- The merida pieces (reader templates only, `vendor/merida.js`) are GPLv2+, by Armando Hernandez Marroquin, from lichess-org/lila `public/piece/merida`.
- Gambit's "alpha" templates (Eric Bentzen) are **not included**: lichess lists them as "free for personal non commercial use".
- The screenshot reader's approach (crop → grid → per-square normalized correlation → uncertain squares → editor) is adapted from Tomo's Gambit prototype. The code here is a rewrite.
- Opening names come from lichess-org/chess-openings (CC0).
