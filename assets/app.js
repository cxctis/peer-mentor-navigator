(() => {
  "use strict";

  const LEVEL_LABELS = {
    green: { name: "Peer Support & Self-Navigate" },
    yellow: { name: "Support + Refer to Staff" },
    red: { name: "Immediate Staff / Crisis Support" }
  };
  const LEVEL_ORDER = ["green", "yellow", "red"];

  // General shared guidance (not per-row data — applies across each level).
  const GREEN_FORMULA = ["Normalize", "Encourage", "Share experience", "Offer a next step"];
  const YELLOW_FORMULA = ["Listen", "Validate", "Explore", "Refer", "Follow Up"];
  const YELLOW_RULE = "Yellow = “I can support the student, but I should not be the only support.” The peer mentor listens, encourages, asks questions, and helps the student connect with the appropriate resource — without trying to solve the problem alone.";
  const RED_PROTOCOL = {
    rule: "Recognize → Stay Calm → Connect to Professional Help → Never Handle Alone. If the student's safety, someone else's safety, or immediate well-being may be at risk: STOP handling it alone.",
    dos: ["Stay calm", "Listen", "Avoid promises of secrecy", "Contact appropriate staff immediately", "Follow program protocols", "Document according to program policy"],
    donts: ["Do not investigate", "Do not counsel", "Do not keep it secret", "Do not handle it alone"]
  };

  let SCENARIOS = [];      // flat array, all 150 rows
  let currentLevelFilter = "all";
  let currentSearch = "";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function icon(name) {
    return `<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`;
  }

  function levelBadgeHtml(level) {
    return `<i class="dot dot-${level}" aria-hidden="true"></i>${LEVEL_LABELS[level].name}`;
  }

  // ---------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------
  async function loadData() {
    const res = await fetch("data/scenarios.json");
    SCENARIOS = await res.json();
  }

  function scenarioById(id) {
    return SCENARIOS.find(s => s.id === id);
  }

  // Group scenarios by level, then by category, preserving first-seen order.
  function groupedByLevel(level, list) {
    const categories = [];
    const map = new Map();
    list.filter(s => s.level === level).forEach(s => {
      if (!map.has(s.category)) {
        map.set(s.category, []);
        categories.push(s.category);
      }
      map.get(s.category).push(s);
    });
    return categories.map(cat => ({ category: cat, items: map.get(cat) }));
  }

  // ---------------------------------------------------------------
  // View switching
  // ---------------------------------------------------------------
  function initViewSwitch() {
    $$(".view-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        $$(".view-btn").forEach(b => { b.classList.remove("active"); b.setAttribute("aria-selected", "false"); });
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");
        const view = btn.dataset.view;
        $$(".view").forEach(v => v.classList.remove("active"));
        $(`#view-${view}`).classList.add("active");
      });
    });
  }

  // ---------------------------------------------------------------
  // Map view — every scenario is its own tile, grouped under a
  // category subheader for scannability. Nothing is merged.
  // ---------------------------------------------------------------
  function scenarioMatchesSearch(s, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    const haystack = [
      s.question, s.category, s.response,
      ...(s.referral || []),
      ...(s.resources || []).map(r => r.name)
    ].join(" ").toLowerCase();
    return haystack.includes(q);
  }

  function renderTreemap() {
    const container = $("#treemap");
    container.innerHTML = "";

    const levels = currentLevelFilter === "all" ? LEVEL_ORDER : [currentLevelFilter];
    const filtered = SCENARIOS.filter(s => scenarioMatchesSearch(s, currentSearch));
    let totalShown = 0;

    levels.forEach(level => {
      const groups = groupedByLevel(level, filtered);
      const levelCount = groups.reduce((n, g) => n + g.items.length, 0);
      if (levelCount === 0 && currentSearch) return;

      const zone = document.createElement("div");
      zone.className = `zone level-${level}`;

      const header = document.createElement("div");
      header.className = "zone-header";
      header.innerHTML = `<span>${levelBadgeHtml(level)}</span><span class="zone-count">${levelCount} situation${levelCount === 1 ? "" : "s"}</span>`;
      zone.appendChild(header);

      const zoneBody = document.createElement("div");
      zoneBody.className = "zone-body";

      groups.forEach(group => {
        totalShown += group.items.length;

        const catHeader = document.createElement("div");
        catHeader.className = "category-header";
        catHeader.innerHTML = `${escapeHtml(group.category)} <span class="category-count">${group.items.length}</span>`;
        zoneBody.appendChild(catHeader);

        const grid = document.createElement("div");
        grid.className = "tile-grid";

        group.items.forEach(s => {
          const tile = document.createElement("button");
          tile.type = "button";
          tile.className = `tile level-${level}`;
          tile.setAttribute("aria-label", s.question);
          const hint = s.referral && s.referral[0] ? s.referral[0] : "";
          tile.innerHTML = `<span class="tile-title">${escapeHtml(s.question)}</span>${hint ? `<span class="tile-meta">${escapeHtml(hint)}</span>` : ""}`;
          tile.addEventListener("click", () => openScenarioDetail(s.id));
          grid.appendChild(tile);
        });

        zoneBody.appendChild(grid);
      });

      zone.appendChild(zoneBody);
      container.appendChild(zone);
    });

    $("#mapSearchCount").textContent = currentSearch ? `${totalShown} match${totalShown === 1 ? "" : "es"}` : "";

    if (totalShown === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No situations match your search. Try a different word, or clear the search.";
      container.appendChild(empty);
    }
  }

  function initQuickButtons() {
    $$(".quick-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        $$(".quick-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentLevelFilter = btn.dataset.level;
        renderTreemap();
      });
    });
  }

  function initMapSearch() {
    const input = $("#mapSearch");
    input.addEventListener("input", () => {
      currentSearch = input.value.trim();
      renderTreemap();
    });
  }

  // ---------------------------------------------------------------
  // Detail drawer (shared: map tiles + mentor mode + directory)
  // ---------------------------------------------------------------
  function renderResourceBlock(r) {
    return `
      <div class="resource-card">
        <h4>
          <a href="${escapeHtml(r.url)}" target="_blank" rel="noopener">${escapeHtml(r.name)}${icon("open_in_new")}</a>
        </h4>
        ${r.contact ? `<p>${escapeHtml(r.contact)}</p>` : ""}
      </div>`;
  }

  function renderScenarioDetail(s) {
    const level = s.level;
    let extra = "";

    if (level === "green") {
      extra = `
        <div class="detail-section">
          <h3>${icon("route")}General Approach</h3>
          <div class="formula-row">
            ${GREEN_FORMULA.map(step => `<span class="formula-step">${escapeHtml(step)}</span>`).join(icon("arrow_forward"))}
          </div>
        </div>`;
    } else if (level === "yellow") {
      extra = `
        <div class="detail-section">
          <h3>${icon("route")}General Approach</h3>
          <div class="formula-row">
            ${YELLOW_FORMULA.map(step => `<span class="formula-step">${escapeHtml(step)}</span>`).join(icon("arrow_forward"))}
          </div>
          <p style="color:var(--text-dim);font-size:.88rem;">${YELLOW_RULE}</p>
        </div>`;
    } else if (level === "red") {
      extra = `
        <div class="detail-section">
          <div class="dodont">
            <div class="do"><h4>${icon("check_circle")}Do</h4><ul>${RED_PROTOCOL.dos.map(d => `<li>${escapeHtml(d)}</li>`).join("")}</ul></div>
            <div class="dont"><h4>${icon("cancel")}Don't</h4><ul>${RED_PROTOCOL.donts.map(d => `<li>${escapeHtml(d)}</li>`).join("")}</ul></div>
          </div>
        </div>`;
    }

    const referralChips = (s.referral || []).map(r => `<span class="bring-tag">${icon("assignment_turned_in")}${escapeHtml(r)}</span>`).join("");
    const resources = (s.resources || []).map(renderResourceBlock).join("");

    return `
      <span class="badge level-${level}">${levelBadgeHtml(level)}</span>
      <h2 id="detailTitle">${escapeHtml(s.question)}</h2>
      <p style="color:var(--text-dim);margin:0 0 4px;">${escapeHtml(s.category)} &middot; Scenario ${s.num}</p>

      ${level === "red" ? `<div class="detail-section"><div class="action-box">${icon("priority_high")}<span>${escapeHtml(s.action)}</span></div></div>` : ""}

      <div class="detail-section">
        <div class="script-box">
          <div class="script-label">${icon("record_voice_over")}Suggested Mentor Response</div>
          "${escapeHtml(s.response)}"
        </div>
      </div>

      ${level !== "red" ? `
      <div class="detail-section">
        <h3>${icon("checklist")}Suggested Mentor Action</h3>
        <p>${escapeHtml(s.action)}</p>
      </div>` : ""}

      ${extra}

      ${referralChips ? `<div class="detail-section"><h3>${icon("label")}Referral / Resource</h3><div class="bring-tags">${referralChips}</div></div>` : ""}

      ${resources ? `<div class="detail-section"><h3>${icon("support_agent")}Contact${(s.resources || []).length > 1 ? "s" : ""}</h3>${resources}</div>` : ""}

      ${s.followUp ? `<div class="detail-section"><h3>${icon("fact_check")}Follow-Up</h3><p>${escapeHtml(s.followUp)}</p></div>` : ""}
    `;
  }

  function openScenarioDetail(id) {
    const s = scenarioById(id);
    if (!s) return;
    $("#detailContent").innerHTML = renderScenarioDetail(s);
    $("#detailOverlay").hidden = false;
    $("#detailClose").focus();
  }

  function closeDetail() {
    $("#detailOverlay").hidden = true;
  }

  function initDetailPanel() {
    $("#detailClose").addEventListener("click", closeDetail);
    $("#detailOverlay").addEventListener("click", e => {
      if (e.target.id === "detailOverlay") closeDetail();
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && !$("#detailOverlay").hidden) closeDetail();
    });
  }

  // ---------------------------------------------------------------
  // Peer Mentor Mode (search by student quote)
  // ---------------------------------------------------------------
  function scoreScenario(s, query) {
    const q = query.toLowerCase().trim();
    if (!q) return 0;
    const qWords = q.split(/\s+/).filter(w => w.length > 2);
    const ql = s.question.toLowerCase();

    let score = 0;
    if (ql.includes(q)) score += 10;
    qWords.forEach(w => { if (ql.includes(w)) score += 1; });

    const secondary = (s.category + " " + s.referral.join(" ")).toLowerCase();
    if (secondary.includes(q)) score += 3;
    qWords.forEach(w => { if (secondary.includes(w)) score += 0.4; });

    return score;
  }

  function renderMentorCard(s, score) {
    const level = s.level;
    const resourceNames = (s.resources || []).map(r => r.name);
    return `
      <div class="mentor-card level-${level}" data-scenario="${s.id}">
        <span class="badge level-${level}">${levelBadgeHtml(level)}</span>
        <h3>${escapeHtml(s.question)}</h3>
        <p class="matched-quote">${escapeHtml(s.category)}</p>
        <div class="script-box">
          <div class="script-label">${icon("record_voice_over")}Suggested Response</div>
          "${escapeHtml(s.response)}"
        </div>
        ${resourceNames.length ? `<p style="margin-top:10px;"><b>Suggested resources:</b> ${resourceNames.map(escapeHtml).join(", ")}</p>` : ""}
        <span class="go-link">Full guidance ${icon("arrow_forward")}</span>
      </div>`;
  }

  function initMentorMode() {
    const input = $("#mentorSearch");
    const results = $("#mentorResults");

    function render() {
      const q = input.value.trim();
      if (!q) {
        results.innerHTML = `<div class="mentor-empty">Start typing what the student said, and we'll suggest the closest situations, scripts, and referrals.</div>`;
        return;
      }
      const scored = SCENARIOS
        .map(s => ({ s, score: scoreScenario(s, q) }))
        .filter(x => x.score > 0)
        .sort((a, b) => {
          // Prioritize red/yellow slightly when scores are close, since missing a red flag is costlier than a false positive
          const levelWeight = { red: 0.6, yellow: 0.3, green: 0 };
          return (b.score + levelWeight[b.s.level]) - (a.score + levelWeight[a.s.level]);
        })
        .slice(0, 6);

      if (scored.length === 0) {
        results.innerHTML = `<div class="mentor-empty">No close match yet. Try key words from what the student said (e.g. "roommate", "exam", "unsafe").</div>`;
        return;
      }
      results.innerHTML = scored.map(x => renderMentorCard(x.s, x.score)).join("");
      $$(".mentor-card", results).forEach(card => {
        card.addEventListener("click", () => openScenarioDetail(card.dataset.scenario));
      });
    }

    input.addEventListener("input", render);
    render();
  }

  // ---------------------------------------------------------------
  // Resource directory (deduplicated across all 150 scenarios)
  // ---------------------------------------------------------------
  function buildResourceDirectory() {
    const seen = new Map();
    SCENARIOS.forEach(s => {
      (s.resources || []).forEach(r => {
        const key = (r.name + "|" + r.url).toLowerCase();
        if (!seen.has(key)) seen.set(key, r);
      });
    });
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  function initDirectory() {
    const grid = $("#directoryGrid");
    grid.innerHTML = buildResourceDirectory().map(renderResourceBlock).join("");
  }

  // ---------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------
  async function init() {
    try {
      await loadData();
    } catch (err) {
      $("#treemap").innerHTML = `<div class="empty-state">Couldn't load site data. If you opened this file directly (file://), run a local server instead — see README.md.<br><br><code>${escapeHtml(String(err))}</code></div>`;
      return;
    }
    initViewSwitch();
    initQuickButtons();
    initMapSearch();
    initDetailPanel();
    initMentorMode();
    initDirectory();
    renderTreemap();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
