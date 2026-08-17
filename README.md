# Peer Mentor Resource Navigator

A single-page, static, click-to-decide map for peer mentors and first-year students. Instead of reading a long handbook, click a situation and immediately see: what a peer mentor should say, what to do, and exactly who to refer to (real RIT contacts — phone, email, website).

No build step, no database, no backend. Just HTML/CSS/JS reading one JSON file. Anyone comfortable editing a spreadsheet or a JSON file can maintain the content.

## Structure

```
index.html            the whole app shell
assets/style.css       styling (light theme, RIT brand colors, mobile responsive)
assets/app.js           rendering, search, filters, peer mentor mode
data/scenarios.json     all 150 scenarios — the single source of truth
```

`data/scenarios.json` is generated from the maintained source spreadsheet, **`Common_Questions_Answers_GYR_Resource_Map(Scenarios).csv`** (Green/Yellow/Red — 50 scenarios each). Each row is one independent question; nothing is grouped or merged. See "Regenerating from the spreadsheet" below.

## Views

- **Explore Map** — three color-coded zones (green = self-navigate, yellow = support + refer, red = immediate staff/crisis). Inside each zone, scenarios are organized under their category as a subheading purely for scannability — **every scenario is still its own separate card** with its own full answer. Click a card for the complete detail: the suggested mentor response, the suggested action, a response formula (or Do/Don't crisis protocol for red), the referral tag(s), and the real resource contact(s) with a clickable link.
- **Peer Mentor Mode** — type or paste what a student said (e.g. *"I failed my exam"*), and the closest-matching scenario(s) surface with their scripts and referrals. Red-level matches are boosted so an urgent situation isn't buried under a green one that happens to share a word.
- **Resource Directory** — every resource referenced across all 150 scenarios, deduplicated into one grid, each linking out to its real RIT page.

## Editing content

### Regenerating from the spreadsheet (recommended)
The easiest way to add, edit, or correct scenarios is to edit the source CSV and re-run the parser — that keeps a single spreadsheet as the source of truth instead of hand-editing JSON.

Expected CSV columns (in this order): `Level, Category, Scenario #, Student Question/Concern, Suggested Mentor Response, Referral / Resource, Department Website / Contact, Primary Link, Suggested Mentor Action, Follow-up / Documentation`.

- **Referral / Resource** — short resource names, separated by `;`.
- **Department Website / Contact** — one resource per line (within the same cell), each formatted as `Name - URL - Contact details`.

Then regenerate `data/scenarios.json`:

```bash
python -c "
import csv, json, re

def slugify(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

with open('Common_Questions_Answers_GYR_Resource_Map(Scenarios).csv', encoding='utf-8-sig', newline='') as f:
    rows = list(csv.reader(f))[1:]

scenarios, seen = [], set()
for level, category, num, question, response, referral_raw, contact_cell, primary_link, action, followup in rows:
    resources = []
    for line in filter(None, (l.strip() for l in contact_cell.split(chr(10)))):
        name, url, contact = line.split(' - ', 2)
        resources.append({'name': name.strip(), 'url': url.strip(), 'contact': contact.strip()})
    base_id = f'{level.strip().lower()}-{slugify(category)}-{int(num)}'
    sid, n = base_id, 2
    while sid in seen:
        sid, n = f'{base_id}-{n}', n + 1
    seen.add(sid)
    scenarios.append({
        'id': sid, 'level': level.strip().lower(), 'category': category.strip(), 'num': int(num),
        'question': question.strip(), 'response': response.strip(),
        'referral': [r.strip() for r in referral_raw.split(';') if r.strip()],
        'resources': resources, 'primaryLink': primary_link.strip(),
        'action': action.strip(), 'followUp': followup.strip(),
    })

json.dump(scenarios, open('data/scenarios.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(len(scenarios), 'scenarios written')
"
```

### Editing `data/scenarios.json` directly
Each entry looks like this:

```json
{
  "id": "yellow-roommate-housing-concerns-1",
  "level": "green | yellow | red",
  "category": "Category label shown as the subheading",
  "num": 1,
  "question": "Exactly what the student says — this is the card title.",
  "response": "The suggested mentor script, shown in quotes.",
  "referral": ["Short resource name(s), shown as a chip"],
  "resources": [
    { "name": "Full department/resource name", "url": "https://…", "contact": "Phone/email/hours as free text" }
  ],
  "primaryLink": "https://…",
  "action": "The suggested mentor action — what to actually do.",
  "followUp": "Any documentation/follow-up note."
}
```

- `level` controls which zone (and color) the card appears in, and which guidance shows in the detail drawer (Green's 4-step formula, Yellow's Listen→Validate→Explore→Refer→Follow Up, or Red's Do/Don't crisis protocol — these are shared, general guidance defined once in `app.js`, not repeated per-row).
- `category` is purely an organizational subheading within its zone — it does not merge or combine scenarios. Every scenario renders as its own clickable card regardless of category.
- The search box and Peer Mentor Mode both match against `question`, `category`, `response`, `referral`, and resource `name`s.
- The Resource Directory tab is built automatically by deduplicating every `resources[]` entry across all 150 scenarios (matched by name + URL) — no separate file to keep in sync.

`data/scenarios.json` is validated as plain JSON — if the site stops loading data after an edit, check for a missing comma or quote (any JSON validator will catch it).

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
