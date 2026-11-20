/* Legion-inspired preview motion — vanilla JS, no dependencies.
   Drives: floating nav pill, scroll-driven photo deck, word-by-word
   statement reveal, stack-card cover scaling, reveal-on-scroll.
   Respects prefers-reduced-motion (CSS already neutralizes the runway). */
(function () {
  "use strict";

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ------------------------------------------------ 1. floating nav pill */
  var header = document.querySelector(".site-header");
  function paintHeader() {
    if (!header) return;
    header.classList.toggle("is-pilled", window.scrollY > 60);
  }

  /* ------------------------------------------- 2. scroll-driven photo deck */
  var hero = document.querySelector(".pv-hero");
  var deckCards = hero ? Array.prototype.slice.call(hero.querySelectorAll(".pv-deck-card")) : [];

  function paintDeck() {
    if (!hero || !deckCards.length || reduced) return;
    var rect = hero.getBoundingClientRect();
    var runway = rect.height - window.innerHeight;
    if (runway <= 0) return;
    var progress = clamp(-rect.top / runway, 0, 1);

    var n = deckCards.length; // last card never flips off; it expands instead
    var flips = n - 1;
    // total timeline: flips segments + 1 expansion segment
    var seg = 1 / (flips + 1);

    deckCards.forEach(function (card, i) {
      var rest = (i % 2 === 0 ? -1 : 1) * (2.4 + i * 1.1); // resting tilt
      if (i === n - 1) {
        // final card: grows from deck size to a wide hero during the last segment
        var t = clamp((progress - seg * flips) / seg, 0, 1);
        var grow = 1 + t * 0.55;
        card.style.transform = "rotate(" + (rest * (1 - t)) + "deg) scale(" + grow.toFixed(3) + ")";
        card.style.zIndex = String(10 + (n - i));
        card.style.borderRadius = (34 - t * 8) + "px";
        return;
      }
      var start = seg * i;
      var t = clamp((progress - start) / seg, 0, 1);
      if (t <= 0) {
        card.style.transform = "rotate(" + rest + "deg) translateY(0)";
        card.style.opacity = "1";
      } else {
        // rotate and slide up off the stack
        var lift = t * -135; // vh-ish percent of own height
        var spin = rest + t * (i % 2 === 0 ? -14 : 14);
        card.style.transform = "rotate(" + spin.toFixed(2) + "deg) translateY(" + lift.toFixed(2) + "%)";
        card.style.opacity = t > 0.96 ? "0" : "1";
      }
      card.style.zIndex = String(10 + (n - i));
    });
  }

  /* -------------------------------------- 3. word-by-word statement reveal */
  var statements = Array.prototype.slice.call(document.querySelectorAll("[data-word-reveal]"));
  statements.forEach(function (node) {
    if (node.dataset.split) return;
    var words = node.textContent.trim().split(/\s+/);
    node.textContent = "";
    words.forEach(function (word, i) {
      var span = document.createElement("span");
      span.className = "w";
      span.textContent = word;
      node.appendChild(span);
      if (i < words.length - 1) node.appendChild(document.createTextNode(" "));
    });
    node.dataset.split = "1";
  });

  function paintWords() {
    if (reduced) return;
    statements.forEach(function (node) {
      var rect = node.getBoundingClientRect();
      var vh = window.innerHeight;
      // 0 when the block enters at 85% of viewport, 1 when its middle passes 45%
      var progress = clamp((vh * 0.85 - rect.top) / (vh * 0.5), 0, 1);
      var words = node.querySelectorAll(".w");
      var upto = Math.round(progress * words.length);
      words.forEach(function (w, i) { w.classList.toggle("on", i < upto); });
    });
  }

  /* ------------------------------- 4. stack cards: shrink when covered up */
  var stackCards = Array.prototype.slice.call(document.querySelectorAll(".pv-card"));
  function paintStack() {
    if (reduced) return;
    for (var i = 0; i < stackCards.length - 1; i++) {
      var card = stackCards[i];
      var next = stackCards[i + 1];
      var rect = card.getBoundingClientRect();
      var nextRect = next.getBoundingClientRect();
      if (rect.height <= 0) continue;
      // 0 while the next card sits fully below this one, 1 once it reaches it
      var covered = 1 - clamp((nextRect.top - rect.top) / rect.height, 0, 1);
      var scale = 1 - covered * 0.06;
      card.style.transform = "scale(" + scale.toFixed(3) + ")";
      card.style.filter = covered > 0.02 ? "brightness(" + (1 - covered * 0.12).toFixed(3) + ")" : "";
    }
  }

  /* ---------------------------------------------------- 5. reveal-on-view */
  function initReveals() {
    var nodes = document.querySelectorAll(".reveal, .reveal-left");
    if (reduced || !("IntersectionObserver" in window)) {
      nodes.forEach(function (n) { n.classList.add("is-visible"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -35px 0px" });
    nodes.forEach(function (n) { observer.observe(n); });
  }

  /* ------------------------------------------------------------ rAF loop */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      paintHeader();
      paintDeck();
      paintWords();
      paintStack();
      ticking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  paintHeader();
  paintDeck();
  paintWords();
  initReveals();


  /* ------------------------------------------------ 6. mobile menu */
  (function initMobileMenu() {
    var openBtn = document.querySelector("[data-menu-open]");
    var panel = document.querySelector("[data-mobile-menu]");
    var closeBtn = document.querySelector("[data-menu-close]");
    if (!openBtn || !panel) return;
    function setOpen(open) {
      panel.classList.toggle("is-open", open);
      panel.setAttribute("aria-hidden", open ? "false" : "true");
      openBtn.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
    }
    openBtn.addEventListener("click", function () { setOpen(true); });
    if (closeBtn) closeBtn.addEventListener("click", function () { setOpen(false); });
    panel.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { setOpen(false); });
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
  })();

  // Cards render async from window.PROJECTS — re-arm once the grid fills.
  var grid = document.querySelector("#projects-grid, #home-projects");
  if (grid && "MutationObserver" in window) {
    var mo = new MutationObserver(function () {
      stackCards = Array.prototype.slice.call(document.querySelectorAll(".pv-card"));
      initReveals();
      paintStack();
    });
    mo.observe(grid, { childList: true, attributes: true, attributeFilter: ["hidden"], subtree: true });
  }
})();
