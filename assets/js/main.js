/* Intro: press Enter → she walks in → each letter of her name appears as she passes it. */
(function () {
  "use strict";

  var root = document.documentElement;
  var gate = document.getElementById("gate");
  var enterBtn = document.getElementById("enter");
  var hero = document.querySelector(".hero");
  var copy = document.querySelector(".hero-copy");
  var video = document.getElementById("walk");
  var nameEl = document.getElementById("name");
  var steps = Array.prototype.slice.call(document.querySelectorAll(".hero [data-step]"));
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Sound: she speaks in the second half of intro.mp4. Pressing Enter counts as a click,
  // so the browser lets it play with sound; the button in the hero mutes it.
  var soundBtn = document.getElementById("sound");
  var soundOn = true;
  var TALK_START = 4.9;   // where her hello begins in intro.mp4
  function setSound(on, blocked) {
    soundOn = on;
    video.muted = !on;
    if (on) video.volume = 1;
    if (soundBtn) {
      soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
      soundBtn.classList.toggle("nudge", !!blocked);
      soundBtn.querySelector("span").textContent = on ? "Sound on" : (blocked ? "Tap for sound" : "Sound off");
    }
  }
  if (soundBtn) soundBtn.addEventListener("click", function () {
    var on = !soundOn;
    setSound(on);
    // Turning sound on after she has finished talking replays her hello.
    if (on && (video.ended || video.paused || video.currentTime > TALK_START + 0.5)) {
      try { video.currentTime = TALK_START; } catch (e) {}
      video.play().catch(function () {});
    }
  });

  // Her horizontal position (centre of her body, 0 = left edge of the video, 1 = right edge)
  // measured frame by frame from walk-in.mp4. [seconds, position]
  var TRACK = [[0, 0], [0.38, 0.014], [0.5, 0.037], [0.75, 0.113], [1.0, 0.211], [1.25, 0.294],
               [1.5, 0.387], [1.75, 0.458], [2.0, 0.527], [2.25, 0.582], [2.5, 0.612],
               [2.75, 0.651], [3.0, 0.675], [3.5, 0.682]];
  var VIDEO_RATIO = 16 / 9;
  var NAME_END = 0.56;   // on phones, letters are spread over her walk up to this point

  // Split the name into letters (screen readers use the h1's aria-label).
  var letters = [];
  (function split() {
    var text = nameEl.textContent.trim();
    nameEl.textContent = "";
    var frag = document.createDocumentFragment();
    for (var i = 0; i < text.length; i++) {
      var s = document.createElement("span");
      s.className = "l";
      s.setAttribute("aria-hidden", "true");
      s.textContent = text[i];
      frag.appendChild(s);
      letters.push(s);
    }
    nameEl.appendChild(frag);
    // Graduation cap on the first "S"
    letters[0].classList.add("capped");
    letters[0].insertAdjacentHTML("beforeend",
      '<svg class="grad-cap" viewBox="0 0 64 52" aria-hidden="true">' +
      '<path class="cap-base" d="M16 25v11c0 5 32 5 32 0V25L32 32Z"/>' +
      '<path class="cap-board" d="M32 6 62 19 32 32 2 19Z"/>' +
      '<path class="cap-cord" d="M32 19 52 25v14" fill="none"/>' +
      '<path class="cap-tassel" d="M49 38h6l1.5 9h-9Z"/>' +
      '</svg>');
  })();

  function at(t) {
    if (t <= TRACK[0][0]) return TRACK[0][1];
    for (var i = 1; i < TRACK.length; i++) {
      if (t <= TRACK[i][0]) {
        var a = TRACK[i - 1], b = TRACK[i];
        return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]);
      }
    }
    return TRACK[TRACK.length - 1][1];
  }

  var raf = 0, stepsTimer = [], lastT = -1, stallSince = 0, running = false;

  function overlayLayout() { return getComputedStyle(copy).position === "absolute"; }

  // Phones show a cropped window of the video; slide that window so she stays in view.
  var still = document.getElementById("still");
  function pan(x) {
    if (overlayLayout()) { video.style.objectPosition = still.style.objectPosition = ""; return; }
    var stage = video.getBoundingClientRect();
    var vw = stage.height * VIDEO_RATIO, maxOff = vw - stage.width;
    if (maxOff <= 0) return;
    var off = Math.max(0, Math.min(maxOff, x * vw - stage.width / 2));
    var pos = (off / maxOff * 100).toFixed(2) + "% 50%";
    video.style.objectPosition = still.style.objectPosition = pos;
  }
  var FINAL_X = TRACK[TRACK.length - 1][1];

  // Where each letter sits, as a share of the rendered video width.
  function letterPositions() {
    var hr = hero.getBoundingClientRect();
    var vw = Math.min(hr.width, hr.height * VIDEO_RATIO);
    var left = hr.left + (hr.width - vw);            // video is right-aligned (object-position: right)
    return letters.map(function (l) {
      var r = l.getBoundingClientRect();
      return (r.left + r.width / 2 - left) / vw;
    });
  }

  function revealSteps() {
    if (stepsTimer.length) return;
    steps.forEach(function (el, i) {
      stepsTimer.push(setTimeout(function () { el.classList.add("on"); }, 120 + i * 220));
    });
  }

  function finish() {
    pan(FINAL_X);
    letters.forEach(function (l) { l.classList.add("on"); });
    revealSteps();
    running = false;
    cancelAnimationFrame(raf);
  }

  function tick(pos) {
    if (!running) return;
    var t = video.currentTime;
    var x = at(t);
    var overlay = overlayLayout();
    if (!overlay) pan(x);
    var n = letters.length;
    for (var i = 0; i < n; i++) {
      var due = overlay ? x >= pos[i] - 0.01 : (x / NAME_END) >= (i + 0.5) / n;
      if (due) letters[i].classList.add("on");
    }
    if (letters[n - 1].classList.contains("on")) revealSteps();

    // If the video stalls (slow network), don't leave the name half-written.
    var now = performance.now();
    if (t !== lastT) { lastT = t; stallSince = now; }
    else if (now - stallSince > 2500) { showStill(); return finish(); }

    if (video.ended || t >= 3.6) return finish();
    raf = requestAnimationFrame(function () { tick(pos); });
  }

  function reset() {
    cancelAnimationFrame(raf);
    stepsTimer.forEach(clearTimeout); stepsTimer = [];
    letters.forEach(function (l) { l.classList.remove("on"); });
    steps.forEach(function (s) { s.classList.remove("on"); });
    hero.classList.remove("show-still");
  }

  function showStill() { hero.classList.add("show-still"); pan(FINAL_X); }

  function play() {
    reset();
    if (reduceMotion) { hero.classList.remove("armed"); showStill(); return; }
    hero.classList.add("armed");
    running = true; lastT = -1; stallSince = performance.now();
    try { video.currentTime = 0; } catch (e) {}
    video.defaultMuted = false;
    setSound(soundOn);
    if (soundBtn) soundBtn.hidden = false;
    var start = function () { raf = requestAnimationFrame(function () { tick(letterPositions()); }); };
    var fail = function () { if (soundBtn) soundBtn.hidden = true; showStill(); finish(); };
    var p = video.play();
    if (p && p.then) {
      p.then(start).catch(function () {
        // Some browsers refuse sound; try again silently before giving up.
        if (!video.muted) {
          setSound(false, true);
          video.play().then(start).catch(fail);
        }
        else fail();
      });
    } else { start(); }
  }

  function enter() {
    gate.classList.add("gone");
    root.style.overflow = "";
    play();
    setTimeout(function () { gate.hidden = true; }, 800);
  }

  // --- welcome screen: magnifying glass over the name ---
  var gname = document.getElementById("gate-name");
  if (gname && window.matchMedia("(hover: hover)").matches) {
    gname.addEventListener("pointermove", function (e) {
      var r = gname.getBoundingClientRect();
      gname.style.setProperty("--x", (e.clientX - r.left).toFixed(1) + "px");
      gname.style.setProperty("--y", (e.clientY - r.top).toFixed(1) + "px");
      gname.classList.add("zoom");
    });
    gname.addEventListener("pointerleave", function () { gname.classList.remove("zoom"); });
  }

  // --- welcome screen: profile links ---
  var mail = document.getElementById("mail-link");
  if (mail) {
    var addr = mail.dataset.email;
    if (addr) { mail.href = "mailto:" + addr; mail.title = addr; }
    else {
      mail.setAttribute("data-tip", "Email coming soon");
      mail.addEventListener("click", function (e) {
        e.preventDefault();
        mail.classList.add("tip");
        setTimeout(function () { mail.classList.remove("tip"); }, 1800);
      });
    }
  }
  // If the icon font can't load, show short text labels instead of empty circles.
  window.addEventListener("load", function () {
    var icon = document.querySelector(".social i");
    if (icon && icon.getBoundingClientRect().width < 4) root.classList.add("no-icons");
  });

  // --- start-up ---
  if (gate) {
    root.style.overflow = "hidden";
    if (!reduceMotion) hero.classList.add("armed");   // keep the name hidden behind the gate
    enterBtn.addEventListener("click", enter);
    document.addEventListener("keydown", function (e) {
      if (!gate.classList.contains("gone") && e.key === "Escape") enter();
    });
  }
  video.addEventListener("error", function () { showStill(); finish(); });
  window.addEventListener("resize", function () { if (!running) pan(FINAL_X); });
  pan(0);

  var replay = document.getElementById("replay");
  if (replay) replay.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    play();
  });

  // --- About photo: her eyes follow the cursor (needs the 9 direction images) ---
  var look = document.getElementById("look");
  if (look && look.querySelectorAll("img[data-dir]").length >= 5) (function () {
    var imgs = {};
    look.querySelectorAll("img[data-dir]").forEach(function (i) { imgs[i.dataset.dir] = i; });
    var FACE_X = 0.53, FACE_Y = 0.26, DEAD = 0.12;
    var FALLBACK = { "right": "up-right", "left": "up-left", "up": "up-right", "down": "down-left" };
    var SECTORS = ["right", "down-right", "down", "down-left", "left", "up-left", "up", "up-right"];
    var cur = "center", queued = null, frame = 0, visible = false;
    function show(d) {
      if (!imgs[d]) d = imgs[FALLBACK[d]] ? FALLBACK[d] : "center";
      if (d === cur) return;
      imgs[cur].classList.remove("on"); imgs[d].classList.add("on"); cur = d;
    }
    function update() {
      frame = 0;
      if (!queued || !visible) return;
      var r = look.getBoundingClientRect();
      var dx = queued.x - (r.left + r.width * FACE_X), dy = queued.y - (r.top + r.height * FACE_Y);
      if (Math.hypot(dx, dy) < r.width * DEAD) return show("center");
      show(SECTORS[(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8]);
    }
    window.addEventListener("pointermove", function (e) {
      queued = { x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(update);
    }, { passive: true });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (!visible) show("center"); }).observe(look);
    } else { visible = true; }
    Object.keys(imgs).forEach(function (k) { if (imgs[k].decode) imgs[k].decode().catch(function () {}); });
  })();

  // --- certification validity bar ---
  var cert = document.querySelector(".cert[data-issued]");
  if (cert) {
    var iss = cert.dataset.issued.split("-"), exp = cert.dataset.expires.split("-");
    var a = new Date(+iss[0], +iss[1] - 1, 1), b = new Date(+exp[0], +exp[1] - 1, 1), now = new Date();
    var share = Math.max(0, Math.min(1, (now - a) / (b - a)));
    document.getElementById("v-fill").style.width = (share * 100).toFixed(1) + "%";
    var months = (b.getFullYear() - now.getFullYear()) * 12 + (b.getMonth() - now.getMonth());
    var status = document.getElementById("v-status");
    if (now >= b) status.textContent = "Expired";
    else if (now < a) status.textContent = "Not yet active";
    else status.textContent = "Valid, " + (months >= 12 ? Math.floor(months / 12) + " yr " + (months % 12) + " mo" : months + " mo") + " left";
  }

  // --- footer ---
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
  var build = document.getElementById("build");
  if (build && build.dataset.sha && build.dataset.sha.indexOf("__") !== 0) {
    build.innerHTML = "Deployed to GitHub Pages by GitHub Actions, commit <code>" + build.dataset.sha.slice(0, 7) + "</code> on " + build.dataset.date;
  }
})();
