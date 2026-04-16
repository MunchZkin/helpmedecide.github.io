# Let Fate Decide — Deployment Guide

## What Is This?

A minimal, whimsical coin-flip decision tool. Ask a question, name your two options, flip the coin, and let fate (or pseudorandom number generation) guide your path. Past questions fade into the background like smoke — clickable memories of choices you've surrendered to chance.

---

## File Structure

```
your-repo/
├── index.html     ← Main HTML shell
├── styles.css     ← All visual styling + animations
├── script.js      ← State machine + coin flip logic
└── README.md      ← This file
```

No build tools. No npm. No bundler. Just open `index.html` in a browser.

---

## GitHub Pages Deployment (Step by Step)

### Step 1 — Create a GitHub Repository

1. Go to [github.com](https://github.com) and log in.
2. Click the **+** button (top-right) → **New repository**.
3. Name it anything: e.g. `let-fate-decide` or `coin-flip`.
4. Set it to **Public** (required for free GitHub Pages).
5. Do NOT initialise with a README (you'll push your own files).
6. Click **Create repository**.

### Step 2 — Upload Your Files

**Option A — GitHub Web Interface (no terminal):**
1. On your new empty repo page, click **uploading an existing file**.
2. Drag and drop `index.html`, `styles.css`, and `script.js`.
3. Scroll down, add a commit message like `Initial commit`, click **Commit changes**.

**Option B — Git CLI:**
```bash
cd path/to/your-files
git init
git add index.html styles.css script.js
git commit -m "Let fate decide"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 3 — Enable GitHub Pages

1. In your repository, go to **Settings** (top tab).
2. In the left sidebar, click **Pages**.
3. Under **Source**, select **Deploy from a branch**.
4. Set **Branch** to `main` and folder to `/ (root)`.
5. Click **Save**.

### Step 4 — Get Your URL

After about 1–2 minutes, your site will be live at:
```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

GitHub will show this URL on the Pages settings screen once deployment finishes. You may need to refresh the page.

---

## How It Works

### Architecture

| Concern | Approach |
|---|---|
| **Coin flip** | `Math.random() < 0.5` → heads or tails |
| **3D flip animation** | CSS `transform: rotateY()` with `preserve-3d` and `backface-visibility: hidden` |
| **Smoke memory effect** | Absolutely-positioned DOM nodes scattered in edge zones via `vw`/`vh` percentages |
| **Fade/age effect** | CSS classes (`--aged`, `--ancient`) applied to older items after each flip |
| **Session persistence** | `sessionStorage` — memories survive page refresh but reset when tab closes |
| **Panel popup** | Hidden `<div>` revealed via `hidden` attribute + CSS animation |
| **Spam protection** | `state.isFlipping` flag blocks double-flips; button disabled during animation |

### Key Design Decisions

- **No frameworks**: Pure vanilla JS + CSS. Zero dependencies.
- **Smoke placement**: Memories are placed in 8 "safe zones" around the edges/corners, cycling + adding jitter. They never obscure the main card.
- **Ageing system**: The oldest 6+ memories become nearly invisible (`opacity: 0.15`). Hover on any memory restores full opacity.
- **Mobile layout**: Single-column on narrow screens; options stack vertically.
- **Accessibility**: `aria-live`, `role="dialog"`, keyboard navigation, focus management, reduced-motion media query.

### Easter Eggs

- Type `42` as your question → philosophical result
- Type `always heads` or `always tails` → fate complies
- The hint text occasionally mutates while you type

---

## Customisation Tips

### Change the colour scheme
Edit the CSS variables in `:root {}` at the top of `styles.css`:
```css
--gold:     #c49a2e;   /* coin heads colour */
--tails:    #3a5f6f;   /* coin tails colour */
--bg:       #f5f2ec;   /* page background */
--surface:  #fffef9;   /* card background */
```

### Change result phrases
Edit the `phrases` array in `script.js` inside the `doFlip()` function.

### Adjust fade timing
Edit `.memory-item--aged { opacity: ... }` and `.memory-item--ancient { opacity: ... }` in `styles.css`.

### Add sound
Uncomment or add to `script.js` after the coin starts flipping:
```js
const audio = new Audio('coin-flip.mp3');  // add an mp3 to your repo
audio.volume = 0.4;
audio.play().catch(() => {});  // graceful fail if browser blocks autoplay
```

---

## Suggested Future Improvements

1. **Streak tracking**: Note when you always chose a certain option and fate agreed.
2. **Export history**: Download a `.json` or `.csv` of past decisions.
3. **Custom coin art**: Replace H/T with SVG symbols — a sun ☀ vs moon ☽, a cat vs dog.
4. **Dark mode**: Add `@media (prefers-color-scheme: dark)` with an alternative palette.
5. **Weighted coin**: Slider that lets users nudge the 50/50 odds (and see how fate rebels).
6. **Share button**: Encode question + result in URL hash for shareable links.
7. **Sound effects**: Optional coin-flip chime using the Web Audio API.
8. **Undo**: Let users mark a result as "ignored" (tracked in history).
9. **LocalStorage**: Persist history across sessions, not just tab refreshes.
10. **Multiple coins**: "Best of 3" mode for the truly indecisive.

---

## Agent Debrief

| Agent | Verdict |
|---|---|
| 🏛️ Architect | "Structurally sound. Edge-zone memory placement avoids the main card at all viewport sizes." |
| 🎨 Designer | "The smoke fade and serif/sans pairing achieves philosophical whimsy without being twee." |
| 👨‍💻 Developer | "It shipped. The sessionStorage save fires after the animation completes so state is consistent." |
| 🔍 Reviewer | "Spam protection tested. Validation gentle but present. Panel closes on Escape. Focus managed." |
| 🌪️ Chaotic User | "I typed 'asdfjkl;' 40 times, clicked Flip 12 times mid-animation, and nothing broke. Disappointed." |


---

## v2 — Brutalist Agent redesign

### Design system changes

| Property | v1 (Whimsical) | v2 (Brutalist) |
|---|---|---|
| Background | `#f5f2ec` off-white | `#0a0a0a` near-black |
| Font | Georgia serif + system sans | IBM Plex Mono throughout |
| Border-radius | 10–20px soft curves | `0` — no curves anywhere |
| Memory layout | Floating smoke clouds, random scatter | Structured vertical feed, left column |
| Coin | Circular, gradient gold | Square, hard 1px border |
| Accent color | Warm gold `#c49a2e` | Acid yellow `#e8ff00` |
| Labels | Italic lowercase hints | Monospace ALL CAPS |
| Result phrases | Philosophical, poetic | Terse, declarative |
| Layout | Centered card, full-bleed | Strict two-column grid (280px | flex) |

### Brutalist Agent laws applied
1. Dark background (`#0a0a0a`). Not dark gray. Black.
2. One accent color (cold acid yellow). Used sparingly — results, active states, count.
3. Zero `border-radius`. Hard edges only. Borders are 1px solid.
4. Monospace font (IBM Plex Mono) for all text. No serif, no warmth.
5. Memory history: structured left-column feed (#001, #002…), newest on top.
6. Typography: ALL CAPS labels, lowercase body copy. No italic.
7. The coin is a square. A square that flips. Deal with it.
