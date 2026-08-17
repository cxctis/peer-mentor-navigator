(() => {
  "use strict";

  const LEVEL_LABELS = {
    green: { name: "Peer Support & Self-Navigate", emoji: "🟢" },
    yellow: { name: "Support + Refer to Staff", emoji: "🟡" },
    red: { name: "Immediate Staff / Crisis Support", emoji: "🔴" }
  };
  const LEVEL_ORDER = ["green", "yellow", "red"];

  let TOPICS = null;      // full data/topics.json
  let RESOURCES = null;   // array from data/resources.json
  let RESOURCE_MAP = {};  // id -> resource
  let currentLevelFilter = "all";
  let currentSearch = "";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  // ---------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------
  async function loadData() {
    const [topicsRes, resourcesRes] = await Promise.all([
      fetch("data/topics.json"),
      fetch("data/resources.json")
    ]);
    TOPICS = await topicsRes.json();
    RESOURCES = await resourcesRes.json();
    RESOURCE_MAP = Object.fromEntries(RESOURCES.map(r => [r.id, r]));
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
  // Treemap (map view)
  // ---------------------------------------------------------------
  function topicMatchesSearch(topic, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    const haystack = [
      topic.title, topic.category,
      ...(topic.studentQuotes || [])
    ].join(" ").toLowerCase();
    return haystack.includes(q);
  }

  function renderTreemap() {
    const container = $("#treemap");
    container.innerHTML = "";

    const levels = currentLevelFilter === "all" ? LEVEL_ORDER : [currentLevelFilter];
    let totalShown = 0;

    levels.forEach(level => {
      const topics = TOPICS.topics.filter(t => t.level === level && topicMatchesSearch(t, currentSearch));
      const zone = document.createElement("div");
      zone.className = `zone level-${level}`;

      const header = document.createElement("div");
      header.className = "zone-header";
      header.innerHTML = `<span>${LEVEL_LABELS[level].emoji} ${LEVEL_LABELS[level].name}</span><span class="zone-count">${topics.length} situation${topics.length === 1 ? "" : "s"}</span>`;
      zone.appendChild(header);

      const tilesWrap = document.createElement("div");
      tilesWrap.className = "zone-tiles" + (topics.length === 0 ? " empty" : "");

      topics.forEach((topic, i) => {
        totalShown++;
        const tile = document.createElement("button");
        tile.type = "button";
        tile.className = `tile level-${level}`;
        if (i % 5 === 0) tile.classList.add("shade-1");
        else if (i % 4 === 0) tile.classList.add("shade-3");
        tile.style.flexGrow = String(Math.max(topic.weight || 1, 1));
        tile.setAttribute("role", "listitem");
        tile.setAttribute("aria-label", topic.title);
        tile.innerHTML = `<span class="tile-title">${escapeHtml(topic.title)}</span><span class="tile-meta">${topic.category}</span>`;
        tile.addEventListener("click", () => openTopicDetail(topic.id));
        tilesWrap.appendChild(tile);
      });

      zone.appendChild(tilesWrap);
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
  // Detail panel (shared: map tiles + mentor mode + directory)
  // ---------------------------------------------------------------
  function renderResourceCard(resourceId) {
    const r = RESOURCE_MAP[resourceId];
    if (!r) return "";
    const fields = [];
    if (r.location) fields.push(`<span><b>Where:</b> ${escapeHtml(r.location)}</span>`);
    if (r.hours) fields.push(`<span><b>Hours:</b> ${escapeHtml(r.hours)}</span>`);
    if (r.phone) fields.push(`<span><b>Phone:</b> ${escapeHtml(r.phone)}</span>`);
    if (r.email) fields.push(`<span><b>Email:</b> ${escapeHtml(r.email)}</span>`);
    if (r.website) fields.push(`<span><b>Web:</b> ${escapeHtml(r.website)}</span>`);

    const bring = (r.whatToBring && r.whatToBring.length)
      ? `<div class="bring-tags">${r.whatToBring.map(b => `<span class="bring-tag">${escapeHtml(b)}</span>`).join("")}</div>`
      : "";

    return `
      <div class="resource-card">
        <h4>${escapeHtml(r.name)}${r.needsInfo ? '<span class="needs-info">STAFF: ADD INFO</span>' : ""}</h4>
        <div class="res-full">${escapeHtml(r.fullName || "")}</div>
        <p>${escapeHtml(r.description || "")}</p>
        ${bring}
        ${fields.length ? `<div class="resource-fields">${fields.join("")}</div>` : ""}
      </div>`;
  }

  function renderTopicDetail(topic) {
    const level = topic.level;
    let extra = "";

    if (level === "green") {
      extra = `
        <div class="detail-section">
          <h3>How to Respond</h3>
          <div class="formula-row">
            ${TOPICS.greenFormula.map(f => `<span class="formula-step">${escapeHtml(f.step)}</span>`).join('<span class="arrow">→</span>')}
          </div>
        </div>`;
    } else if (level === "yellow") {
      extra = `
        <div class="detail-section">
          <h3>How to Respond</h3>
          <div class="formula-row">
            ${TOPICS.yellowFormula.map(f => `<span class="formula-step">${escapeHtml(f.step)}</span>`).join('<span class="arrow">→</span>')}
          </div>
          <p style="color:var(--text-dim);font-size:.88rem;">${escapeHtml(TOPICS.yellowRule)}</p>
        </div>`;
    } else if (level === "red") {
      const proto = TOPICS.redProtocol;
      extra = `
        <div class="detail-section">
          <h3>Immediate Action</h3>
          <div class="action-box">${escapeHtml(topic.action || proto.rule)}</div>
        </div>
        <div class="detail-section">
          <div class="dodont">
            <div class="do"><h4>✅ Do</h4><ul>${proto.dos.map(d => `<li>${escapeHtml(d)}</li>`).join("")}</ul></div>
            <div class="dont"><h4>❌ Don't</h4><ul>${proto.donts.map(d => `<li>${escapeHtml(d)}</li>`).join("")}</ul></div>
          </div>
        </div>`;
    }

    const quotes = (topic.studentQuotes || []).map(q => `<li>"${escapeHtml(q)}"</li>`).join("");
    const resources = (topic.resources || []).map(renderResourceCard).join("");

    return `
      <span class="badge level-${level}">${LEVEL_LABELS[level].emoji} ${LEVEL_LABELS[level].name}</span>
      <h2 id="detailTitle">${escapeHtml(topic.title)}</h2>
      <p style="color:var(--text-dim);margin:0 0 4px;">${escapeHtml(topic.category)}</p>

      <div class="detail-section">
        <h3>Things Students Might Say</h3>
        <ul class="quote-list">${quotes}</ul>
      </div>

      <div class="detail-section">
        <h3>Why This Path</h3>
        <p>${escapeHtml(topic.why || "")}</p>
      </div>

      ${extra}

      <div class="detail-section">
        <h3>Peer Mentor Script</h3>
        <div class="script-box">"${escapeHtml(topic.mentorScript || "")}"</div>
      </div>

      ${resources ? `<div class="detail-section"><h3>Recommended Resource${(topic.resources || []).length > 1 ? "s" : ""}</h3>${resources}</div>` : ""}
    `;
  }

  function openTopicDetail(topicId) {
    const topic = TOPICS.topics.find(t => t.id === topicId);
    if (!topic) return;
    $("#detailContent").innerHTML = renderTopicDetail(topic);
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
  function scoreTopic(topic, query) {
    const q = query.toLowerCase().trim();
    if (!q) return { score: 0, quote: null };
    const qWords = q.split(/\s+/).filter(w => w.length > 2);
    let best = { score: 0, quote: null };

    (topic.studentQuotes || []).forEach(quote => {
      const ql = quote.toLowerCase();
      let score = 0;
      if (ql.includes(q)) score += 10;
      qWords.forEach(w => { if (ql.includes(w)) score += 1; });
      if (score > best.score) best = { score, quote };
    });

    // also check title/category as a lighter-weight signal
    const titleLower = (topic.title + " " + topic.category).toLowerCase();
    let titleScore = 0;
    if (titleLower.includes(q)) titleScore += 4;
    qWords.forEach(w => { if (titleLower.includes(w)) titleScore += 0.5; });
    best.score += titleScore;

    return best;
  }

  function renderMentorCard(topic, matchInfo) {
    const level = topic.level;
    const resourceNames = (topic.resources || []).map(id => RESOURCE_MAP[id]?.name).filter(Boolean);
    return `
      <div class="mentor-card level-${level}" data-topic="${topic.id}">
        <span class="badge level-${level}">${LEVEL_LABELS[level].emoji} ${LEVEL_LABELS[level].name}</span>
        <h3>${escapeHtml(topic.title)}</h3>
        ${matchInfo.quote ? `<div class="matched-quote">Closest match: "${escapeHtml(matchInfo.quote)}"</div>` : ""}
        <p>${escapeHtml(topic.why || "")}</p>
        <div class="script-box">"${escapeHtml(topic.mentorScript || "")}"</div>
        ${resourceNames.length ? `<p style="margin-top:10px;"><b>Suggested resources:</b> ${resourceNames.map(escapeHtml).join(", ")}</p>` : ""}
        <p style="color:var(--accent);font-size:.85rem;margin-top:8px;">Click for full guidance →</p>
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
      const scored = TOPICS.topics
        .map(t => ({ topic: t, match: scoreTopic(t, q) }))
        .filter(x => x.match.score > 0)
        .sort((a, b) => {
          // Prioritize red/yellow slightly when scores are close, since missing a red flag is costlier than a false positive
          const levelWeight = { red: 0.6, yellow: 0.3, green: 0 };
          return (b.match.score + levelWeight[b.topic.level]) - (a.match.score + levelWeight[a.topic.level]);
        })
        .slice(0, 5);

      if (scored.length === 0) {
        results.innerHTML = `<div class="mentor-empty">No close match yet. Try key words from what the student said (e.g. "roommate", "exam", "unsafe").</div>`;
        return;
      }
      results.innerHTML = scored.map(x => renderMentorCard(x.topic, x.match)).join("");
      $$(".mentor-card", results).forEach(card => {
        card.addEventListener("click", () => openTopicDetail(card.dataset.topic));
      });
    }

    input.addEventListener("input", render);
    render();
  }

  // ---------------------------------------------------------------
  // Resource directory
  // ---------------------------------------------------------------
  function initDirectory() {
    const grid = $("#directoryGrid");
    grid.innerHTML = RESOURCES.map(r => renderResourceCard(r.id)).join("");
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
