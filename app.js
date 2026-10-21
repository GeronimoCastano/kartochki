(() => {
  "use strict";

  const DECKS = window.DECKS;
  const ALL = { id: "all", ru: "Все карто`чки", en: "Every card, mixed together", cards: DECKS.flatMap((d) => d.cards) };
  const byId = (id) => (id === "all" ? ALL : DECKS.find((d) => d.id === id));
  const $ = (id) => document.getElementById(id);

  // ── Settings (remembered per device) ─────────────────────────────
  const KEY = "kartochki.settings";
  const settings = { dir: "ru", shuffle: true, latin: false };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(KEY)) || {}); } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch {} };

  // ── Cyrillic → Latin ─────────────────────────────────────────────
  const MAP = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i", й: "y",
    к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
    х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "ʺ", ы: "y", ь: "ʼ", э: "e", ю: "yu", я: "ya"
  };
  const VOWELS = "аеёиоуыэюя";
  const ACUTE = { a: "á", e: "é", i: "í", o: "ó", u: "ú", y: "ý" };
  const isCyr = (ch) => MAP[ch.toLowerCase()] !== undefined;

  // "кита`ец" → [{ch:"к"}, …, {ch:"а", stress:true}, …]. ё is always stressed.
  function parse(str) {
    const out = [];
    for (const ch of str) {
      if (ch === "`") { if (out.length) out[out.length - 1].stress = true; continue; }
      out.push({ ch, stress: ch === "ё" || ch === "Ё" });
    }
    return out;
  }

  function latinFor(chars, i) {
    const { ch, stress } = chars[i];
    const lower = ch.toLowerCase();
    let la = MAP[lower];
    if (la === undefined) return null;
    if (lower === "е") {
      const prev = i > 0 ? chars[i - 1].ch.toLowerCase() : "";
      if (!prev || !isCyr(prev) || VOWELS.includes(prev) || prev === "ь" || prev === "ъ") la = "ye";
    }
    if (stress) la = la.replace(/[aeiouy](?!.*[aeiouy])/, (v) => ACUTE[v]);
    if (ch !== lower) la = la[0].toUpperCase() + la.slice(1);
    return la;
  }

  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const plain = (str) => str.replace(/`/g, "");
  const translit = (str) => {
    const chars = parse(str);
    return chars.map((c, i) => latinFor(chars, i) ?? c.ch).join("");
  };

  // Stress is printed as in the book: an acute over the vowel, none over ё
  const ACCENT = "\u0301";
  const accented = (c) => esc(c.ch) + (c.stress && !/[ёЁ]/.test(c.ch) ? ACCENT : "");

  function ruInline(str) {
    return parse(str).map(accented).join("");
  }
  // Any text: Russian runs carry stress, everything else passes through
  const rich = (str) => ruInline(str);

  // Interlinear block: one column per letter, Latin underneath
  function interlinear(str, extra = "") {
    const chars = parse(str);
    const words = [];
    let cur = [];
    chars.forEach((c, i) => {
      if (c.ch === " ") { if (cur.length) words.push(cur); cur = []; return; }
      cur.push({ ...c, la: latinFor(chars, i) });
      if (c.ch === "-") { words.push(cur); cur = []; } // по-|строгановски may wrap after the hyphen
    });
    if (cur.length) words.push(cur);

    let k = 0;
    let units = 0;
    const html = words.map((w) => {
      let wu = 0;
      const cols = w.map((c) => {
        const la = c.la ?? "";
        wu += Math.max(0.92, la.length * 0.25 + 0.06);
        return `<span class="il__c${c.stress ? " is-stress" : ""}" style="--k:${k++}">` +
          `<span class="il__cy">${accented(c)}</span><span class="il__la">${esc(la || " ")}</span></span>`;
      }).join("");
      units = Math.max(units, wu);
      return `<span class="il__w">${cols}</span>`;
    }).join("");

    const label = `${plain(str)}, ${translit(str)}`;
    return `<p class="il ${extra}" style="--u:${units.toFixed(2)}" lang="ru" aria-label="${esc(label)}"><span aria-hidden="true" style="display:contents">${html}</span></p>`;
  }

  // The CSS size is an estimate; shrink any block whose widest word still overflows
  function fit() {
    document.querySelectorAll("#card .il").forEach((il) => {
      il.style.fontSize = "";
      const avail = il.clientWidth;
      let widest = 0;
      il.querySelectorAll(".il__w").forEach((w) => { widest = Math.max(widest, w.offsetWidth); });
      if (widest > avail) il.style.fontSize = `${(parseFloat(getComputedStyle(il).fontSize) * avail) / widest * 0.98}px`;
    });
  }
  document.fonts?.ready.then(fit);
  window.addEventListener("resize", fit);

  // ── Voice: the device's own Russian text-to-speech ───────────────
  const synth = window.speechSynthesis;
  let ruVoice = null;
  function pickVoice() {
    const ru = synth.getVoices().filter((v) => (v.lang || "").toLowerCase().startsWith("ru"));
    ruVoice = ru.find((v) => /milena|katya|yuri|google/i.test(v.name)) || ru[0] || null;
  }
  if (synth) {
    pickVoice();
    synth.addEventListener?.("voiceschanged", pickVoice);
  }

  // A second tap on the same text within a few seconds replays it slower
  let lastSaid = { text: "", at: 0 };
  function speak(text, btn) {
    const now = Date.now();
    const slow = lastSaid.text === text && now - lastSaid.at < 4000;
    lastSaid = { text, at: now };
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\s*\/\s*/g, ", "));
    u.lang = "ru-RU";
    if (ruVoice) u.voice = ruVoice;
    u.rate = slow ? 0.6 : 0.9;
    document.querySelectorAll(".say.is-speaking").forEach((b) => b.classList.remove("is-speaking"));
    btn.classList.add("is-speaking");
    u.onend = u.onerror = () => btn.classList.remove("is-speaking");
    synth.speak(u);
  }

  const SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true">' +
    '<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
  const sayBtn = (text, label, cls = "") =>
    synth ? `<button type="button" class="say ${cls}" data-say="${esc(plain(text))}" aria-label="${label}">${SPEAKER}</button>` : "";

  $("stage").addEventListener("click", (e) => {
    const b = e.target.closest(".say");
    if (b) { e.stopPropagation(); speak(b.dataset.say, b); }
  });

  // ── Home ─────────────────────────────────────────────────────────
  function renderHome() {
    const list = $("deck-list");
    const row = (d, cls = "") =>
      `<li class="${cls}"><a href="#/d/${d.id}">` +
      `<span><span class="index__ru" lang="ru">${ruInline(d.ru)}</span><span class="index__en">${esc(d.en)}</span></span>` +
      `<span class="index__n">${d.cards.length}</span></a></li>`;
    list.innerHTML = DECKS.map((d) => row(d)).join("") + row(ALL, "index__all");
    $("total-count").textContent = `${DECKS.length} decks, ${ALL.cards.length} cards.`;

    document.querySelectorAll('input[name="dir"]').forEach((r) => {
      r.checked = r.value === settings.dir;
      r.onchange = () => { settings.dir = r.value; save(); };
    });
    const sh = document.querySelector('input[name="shuffle"]');
    const la = document.querySelector('input[name="latin"]');
    sh.checked = settings.shuffle;
    la.checked = settings.latin;
    sh.onchange = () => { settings.shuffle = sh.checked; save(); };
    la.onchange = () => { settings.latin = la.checked; save(); };
  }

  // ── Study ────────────────────────────────────────────────────────
  let S = null; // { deck, cards, order: [{i, dir}], pos, flipped, missed:Set }

  const pickDir = () => (settings.dir === "mix" ? (Math.random() < 0.5 ? "ru" : "en") : settings.dir);
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  function startStudy(deck, subset) {
    const idx = subset ?? deck.cards.map((_, i) => i);
    const order = (settings.shuffle ? shuffle([...idx]) : [...idx]).map((i) => ({ i, dir: pickDir() }));
    S = { deck, order, pos: 0, flipped: false, missed: new Set(), unique: idx.length };
    $("study-title").innerHTML = ruInline(deck.ru);
    showCard("enter");
  }

  const DIR_LABEL = { ru: "RU → EN", en: "EN → RU", mix: "Mixed" };
  function syncChips() {
    $("chip-dir").textContent = DIR_LABEL[settings.dir];
    $("chip-dir").setAttribute("aria-label", `Direction: ${DIR_LABEL[settings.dir]}. Tap to change.`);
    $("chip-shuffle").setAttribute("aria-pressed", String(settings.shuffle));
    $("chip-latin").setAttribute("aria-pressed", String(settings.latin));
  }

  function showCard(enterClass) {
    const card = $("card");
    const done = S.pos >= S.order.length;
    $("progress-fill").style.transform = `scaleX(${Math.min(S.pos / S.order.length, 1)})`;
    $("study-count").textContent = done ? `${S.order.length} / ${S.order.length}` : `${S.pos + 1} / ${S.order.length}`;
    card.hidden = done;
    $("actions").hidden = done;
    $("done").hidden = !done;
    syncChips();
    if (done) return renderDone();

    const { i, dir } = S.order[S.pos];
    const c = S.deck.cards[i];

    // Reset to the front without animating, so the next answer never flashes
    card.classList.add("no-anim");
    card.classList.remove("is-flipped", "enter", "enter-back");
    S.flipped = false;

    synth?.cancel();
    const front = dir === "ru"
      ? `<div class="face__top"><span class="face__label">Russian</span>${sayBtn(c.ru, "Listen")}</div><div class="face__body">${interlinear(c.ru, settings.latin ? "" : "no-latin")}</div>`
      : `<div class="face__top"><span class="face__label">English</span></div><div class="face__body"><p class="prompt-en${c.en.length > 22 ? " is-long" : ""}">${esc(c.en)}</p></div>`;

    const ex = c.x
      ? `<p class="ex" lang="ru">${rich(c.x)}${sayBtn(c.x, "Listen to the example", "say--sm")}<span class="ex__en" lang="en">${esc(c.xe || "")}</span></p>`
      : "";
    const back =
      `<div class="face__top">${sayBtn(c.ru, "Listen")}</div>` +
      `<div class="face__body">${interlinear(c.ru, "il--back")}` +
      `<p class="answer-en">${esc(c.en)}</p>` +
      `<p class="gram">${rich(c.g || "")}</p>${ex}</div>`;

    $("face-front").innerHTML = front;
    $("face-back").innerHTML = back;
    $("face-back").setAttribute("aria-hidden", "true");
    $("face-front").removeAttribute("aria-hidden");
    $("face-front").scrollTop = 0;
    $("face-back").scrollTop = 0;
    card.setAttribute("aria-label", "Flip card");
    fit();

    void card.offsetWidth;
    card.classList.remove("no-anim");
    if (enterClass) card.classList.add(enterClass);
    setButtons();
  }

  function setButtons() {
    $("btn-show").hidden = S.flipped;
    $("btn-again").hidden = !S.flipped;
    $("btn-got").hidden = !S.flipped;
  }

  function flip() {
    if (!S || S.pos >= S.order.length) return;
    S.flipped = !S.flipped;
    $("card").classList.remove("enter", "enter-back");
    $("card").classList.toggle("is-flipped", S.flipped);
    $("face-back").setAttribute("aria-hidden", String(!S.flipped));
    $("face-front").setAttribute("aria-hidden", String(S.flipped));
    setButtons();
    if (S.flipped) $("btn-got").focus({ preventScroll: true });
  }

  function next() {
    S.pos++;
    showCard("enter");
  }
  function prev() {
    if (S.pos === 0) return;
    S.pos--;
    showCard("enter-back");
  }
  function again() {
    const item = S.order[S.pos];
    S.missed.add(item.i);
    const at = Math.min(S.pos + 4, S.order.length);
    S.order.splice(at, 0, { i: item.i, dir: pickDir() });
    next();
  }

  function renderDone() {
    const misses = S.missed.size;
    const first = S.unique - misses;
    $("done-line").textContent = misses
      ? `${S.unique} cards. ${first} right the first time, ${misses} needed another look.`
      : `${S.unique} cards, every one right the first time.`;
    $("btn-misses").hidden = misses === 0;
    (misses ? $("btn-misses") : $("btn-restart")).focus({ preventScroll: true });
  }

  // Settings changed mid-deck: re-deal only the cards still ahead
  function reshapeRemaining() {
    const ahead = S.order.slice(S.pos + 1);
    if (settings.shuffle) shuffle(ahead); else ahead.sort((a, b) => a.i - b.i);
    ahead.forEach((it) => { it.dir = pickDir(); });
    S.order = [...S.order.slice(0, S.pos + 1), ...ahead];
  }

  $("chip-dir").onclick = () => {
    settings.dir = { ru: "en", en: "mix", mix: "ru" }[settings.dir];
    save();
    if (S.pos < S.order.length) S.order[S.pos].dir = pickDir();
    reshapeRemaining();
    showCard();
  };
  $("chip-shuffle").onclick = () => { settings.shuffle = !settings.shuffle; save(); reshapeRemaining(); syncChips(); };
  $("chip-latin").onclick = () => {
    settings.latin = !settings.latin; save(); syncChips();
    document.querySelectorAll(".face--front .il").forEach((el) => el.classList.toggle("no-latin", !settings.latin));
  };

  $("btn-show").onclick = flip;
  $("btn-got").onclick = next;
  $("btn-again").onclick = again;
  $("btn-restart").onclick = () => startStudy(S.deck);
  $("btn-misses").onclick = () => startStudy(S.deck, [...S.missed]);

  // Tap to flip, swipe left for next, swipe right for previous
  const card = $("card");
  let drag = null;
  card.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest(".say")) return;
    drag = { x: e.clientX, y: e.clientY, dx: 0, moved: false, id: e.pointerId };
  });
  card.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.abs(drag.dx) > 10 && Math.abs(drag.dx) > Math.abs(dy)) {
      drag.moved = true;
      card.classList.add("is-dragging");
      try { card.setPointerCapture(e.pointerId); } catch {}
    }
    if (drag.moved) {
      const rot = S.flipped ? 180 : 0;
      $("card-inner").style.transform = `translateX(${drag.dx * 0.6}px) rotateY(${rot}deg)`;
    }
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { dx, moved } = drag;
    drag = null;
    card.classList.remove("is-dragging");
    $("card-inner").style.transform = "";
    if (!moved) return flip();
    if (dx < -70) next();
    else if (dx > 70) prev();
  };
  card.addEventListener("pointerup", endDrag);
  card.addEventListener("pointercancel", (e) => { if (drag && e.pointerId === drag.id) { drag = null; card.classList.remove("is-dragging"); $("card-inner").style.transform = ""; } });
  card.addEventListener("keydown", (e) => {
    if (e.target !== card) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); }
  });
  document.addEventListener("keydown", (e) => {
    if ($("study").hidden || !S || e.target.closest("button, a, input")) return;
    if (e.key === "ArrowRight") next();
    else if (e.key === "ArrowLeft") prev();
    else if (e.key === " ") { e.preventDefault(); flip(); }
  });

  // ── Routing ──────────────────────────────────────────────────────
  function route() {
    const m = location.hash.match(/^#\/d\/([\w-]+)/);
    const deck = m && byId(m[1]);
    $("home").hidden = !!deck;
    $("study").hidden = !deck;
    if (deck) {
      if (!S || S.deck !== deck) startStudy(deck);
      else showCard();
      document.title = `${plain(deck.ru)} · Карточки`;
    } else {
      S = null;
      renderHome();
      document.title = "Карточки · Russian flashcards";
      window.scrollTo(0, 0);
    }
  }
  window.addEventListener("hashchange", route);
  route();

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
