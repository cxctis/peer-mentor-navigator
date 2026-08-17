# Peer Mentor Resource Navigator

A single-page, static, click-to-decide map for peer mentors and first-year students. Instead of reading a long handbook, click a situation and immediately see: why it belongs where it does, what a peer mentor should say, and which resource to refer to (with location/contact info once staff fill it in).

No build step, no database, no backend. Just HTML/CSS/JS reading two JSON files. Anyone comfortable editing a JSON file can maintain the content.

## Structure

```
index.html          the whole app shell
assets/style.css     styling (light + dark mode aware, mobile responsive)
assets/app.js         rendering, search, filters, peer mentor mode
data/topics.json      the 33 situation tiles (green/yellow/red), grouped by zone
data/resources.json   the resource directory (NASC, NLC, DAS, Advisor, etc.)
```

## Views

- **Explore Map** — three color-coded zones (🟢 self-navigate, 🟡 support + refer, 🔴 immediate staff/crisis). Tile size reflects how often that situation comes up. Click a tile for the full card: sample student quotes, the "why," a mentor script, a response formula (or crisis protocol for red), and recommended resources.
- **Peer Mentor Mode** — type or paste what a student said (e.g. *"I failed my exam"*), and the top matching situations surface with their scripts and referrals. Red-level matches are boosted so an urgent situation isn't buried under a green one that happens to share a word.
- **Resource Directory** — every resource referenced across the map in one grid.

## ⚠️ Before you publish this for real use

The source handbook this was built from didn't include actual room numbers, phone numbers, emails, or office hours — so those fields are **empty placeholders** in `data/resources.json`, each flagged with `"needsInfo": true` (shows a **STAFF: ADD INFO** badge on the card). Fill in real, current contact information for every resource before sharing this with mentors or students. Two universal numbers are pre-filled because they're safe, national, and unlikely to change: **911** (emergency) and **988** (Suicide & Crisis Lifeline).

This site is an internal training/reference tool, not an official emergency service — the footer disclaimer says so on every page. Don't remove that disclaimer.

## Editing content

### Add or edit a resource
Open `data/resources.json` and add/edit an object:

```json
{
  "id": "nasc",
  "name": "NASC",
  "fullName": "NASC — Academic Support Center",
  "category": "Academic Support",
  "description": "One or two sentences on what this resource does and when to send someone here.",
  "whatToBring": ["Laptop", "Homework"],
  "location": "Building / Room",
  "hours": "Mon–Fri 9am–5pm",
  "phone": "",
  "email": "",
  "website": "",
  "needsInfo": false
}
```

Set `"needsInfo": false` once real contact info is filled in — that removes the warning badge.

### Add or edit a situation tile
Open `data/topics.json`, find the `topics` array, and add/edit an object:

```json
{
  "id": "yellow-example",
  "level": "green | yellow | red",
  "title": "Short tile title",
  "category": "Sub-category label shown under the title",
  "weight": 5,
  "studentQuotes": ["Things a student might actually say"],
  "why": "One or two sentences on why this belongs at this level.",
  "mentorScript": "A sample line a mentor could say.",
  "action": "Red-level only: the concrete immediate action to take.",
  "resources": ["nasc", "advisor"],
  "whatToBring": []
}
```

- `level` controls which zone (and color) the tile appears in, and which guidance formula shows in the detail panel (Green's 4-step formula, Yellow's Listen→Validate→Explore→Refer→Follow Up, or Red's Do/Don't crisis protocol — these shared formulas live at the top of `topics.json` and don't need to be repeated per-tile).
- `weight` is relative tile size within its zone — roughly "how often this comes up." Any positive number works; there's no fixed scale.
- `resources` is a list of resource `id`s from `resources.json`, in the order you want them to appear.
- The search box and Peer Mentor Mode both match against `title`, `category`, and every string in `studentQuotes` — the more realistic phrasings you add, the better matching gets.

No other files need to change. Both JSON files are validated as plain JSON — if the site stops loading data after an edit, check for a missing comma or quote (any JSON validator will catch it).

## Running locally

Because the app `fetch()`s the JSON files, opening `index.html` directly (`file://…`) will fail in most browsers due to CORS restrictions on local files. Run a tiny local server from this folder instead:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to "Deploy from a branch," pick the `main` branch and `/ (root)` folder, then save.
4. GitHub will publish the site at `https://<your-username>.github.io/<repo-name>/` within a minute or two.

No build step is required — the static files are served as-is.
