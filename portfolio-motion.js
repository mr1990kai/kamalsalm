(function () {
  "use strict";

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

  function revealFallback() {
    var nodes = document.querySelectorAll(".reveal, .reveal-left");
    if (!("IntersectionObserver" in window)) {
      nodes.forEach(function (node) { node.classList.add("is-visible"); });
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
    nodes.forEach(function (node) { observer.observe(node); });
  }

  function initPortraitTilt() {
    var stage = document.querySelector("[data-portrait-tilt]");
    if (!stage || coarse || reduced) return;

    var card = stage.querySelector(".hero-photo-card");
    if (!card) return;

    var raf = 0;
    var targetX = 0;
    var targetY = 0;
    var currentX = 0;
    var currentY = 0;

    function paint() {
      raf = 0;
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      card.style.transform =
        "perspective(1200px) rotateX(" + currentY.toFixed(2) +
        "deg) rotateY(" + currentX.toFixed(2) + "deg) translateY(-3px)";
      if (Math.abs(targetX - currentX) > .04 || Math.abs(targetY - currentY) > .04) {
        raf = window.requestAnimationFrame(paint);
      }
    }

    stage.addEventListener("pointermove", function (event) {
      var rect = stage.getBoundingClientRect();
      var x = (event.clientX - rect.left) / rect.width - .5;
      var y = (event.clientY - rect.top) / rect.height - .5;
      targetX = x * 7;
      targetY = y * -6;
      if (!raf) raf = window.requestAnimationFrame(paint);
    }, { passive: true });

    stage.addEventListener("pointerleave", function () {
      targetX = 0;
      targetY = 0;
      if (!raf) raf = window.requestAnimationFrame(paint);
    }, { passive: true });
  }

  function initMobileMenu() {
    var menu = document.querySelector("[data-menu-open]");
    var panel = document.querySelector("[data-mobile-menu]");
    var close = document.querySelector("[data-menu-close]");
    if (!menu || !panel) return;

    function setOpen(open) {
      panel.classList.toggle("is-open", open);
      panel.setAttribute("aria-hidden", open ? "false" : "true");
      menu.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
    }

    menu.addEventListener("click", function () { setOpen(true); });
    if (close) close.addEventListener("click", function () { setOpen(false); });
    panel.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { setOpen(false); });
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setOpen(false);
    });
  }

  function initReveal() {
    var nodes = document.querySelectorAll(".reveal, .reveal-left");
    if (!nodes.length) return;

    if (!reduced && window.gsap && window.ScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      window.gsap.utils.toArray(".reveal, .reveal-left").forEach(function (node) {
        window.gsap.fromTo(node,
          { y: 22, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: .85,
            ease: "power2.out",
            scrollTrigger: {
              trigger: node,
              start: "top 88%",
              once: true
            }
          }
        );
      });
      return;
    }

    revealFallback();
  }


  function initProjectMotion() {
    var cards = document.querySelectorAll(".project-stack .work-card, .project-stack .project-card");
    if (!cards.length || reduced) return;
    cards.forEach(function (card) {
      var image = card.querySelector(".work-card-visual img, .project-card-visual img");
      if (!image || coarse || !window.gsap || !window.ScrollTrigger) return;
      window.gsap.fromTo(image, { scale: 1.07, yPercent: 2 }, {
        scale: 1, yPercent: 0, ease: "none",
        scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: 0.65 }
      });
    });
  }

  function initCardPointer() {
    if (coarse || reduced) return;
    document.querySelectorAll(".work-card, .project-card").forEach(function (card) {
      card.addEventListener("pointermove", function (event) {
        var rect = card.getBoundingClientRect();
        var x = (event.clientX - rect.left) / rect.width - 0.5;
        var y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty("--pointer-x", (x * 8).toFixed(2) + "px");
        card.style.setProperty("--pointer-y", (y * 5).toFixed(2) + "px");
      }, { passive: true });
      card.addEventListener("pointerleave", function () {
        card.style.setProperty("--pointer-x", "0px");
        card.style.setProperty("--pointer-y", "0px");
      }, { passive: true });
    });
  }


  function initProofCarousel() {
    var carousel = document.querySelector("[data-proof-carousel]");
    if (!carousel) return;
    var track = carousel.querySelector("[data-proof-track]");
    var cards = Array.prototype.slice.call(track.querySelectorAll(".proof-card"));
    var dotsWrap = carousel.querySelector("[data-proof-dots]");
    var prev = carousel.querySelector("[data-proof-prev]");
    var next = carousel.querySelector("[data-proof-next]");
    if (!track || cards.length < 2 || !dotsWrap || !prev || !next) return;

    var index = 0;
    var timer = 0;
    var mobile = window.matchMedia("(max-width: 680px)");
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    dotsWrap.innerHTML = cards.map(function (_, i) {
      return '<button type="button" aria-label="عرض رأي العميل ' + (i + 1) + '" aria-current="' + (i === 0 ? "true" : "false") + '"></button>';
    }).join("");
    var dots = Array.prototype.slice.call(dotsWrap.querySelectorAll("button"));

    function setActive(nextIndex, shouldScroll) {
      index = (nextIndex + cards.length) % cards.length;
      dots.forEach(function (dot, i) {
        dot.setAttribute("aria-current", i === index ? "true" : "false");
      });
      if (shouldScroll && mobile.matches) {
        cards[index].scrollIntoView({
          block: "nearest",
          inline: "center",
          behavior: reducedMotion ? "auto" : "smooth"
        });
      }
    }

    function stop() {
      if (timer) window.clearInterval(timer);
      timer = 0;
    }
    function start() {
      stop();
      if (!mobile.matches || reducedMotion || document.hidden) return;
      timer = window.setInterval(function () { setActive(index + 1, true); }, 4800);
    }

    prev.addEventListener("click", function () { setActive(index - 1, true); start(); });
    next.addEventListener("click", function () { setActive(index + 1, true); start(); });
    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () { setActive(i, true); start(); });
    });

    var scrollFrame = 0;
    track.addEventListener("scroll", function () {
      if (!mobile.matches) return;
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      scrollFrame = window.requestAnimationFrame(function () {
        var center = track.getBoundingClientRect().left + track.clientWidth / 2;
        var closest = 0, distance = Infinity;
        cards.forEach(function (card, i) {
          var rect = card.getBoundingClientRect();
          var d = Math.abs((rect.left + rect.width / 2) - center);
          if (d < distance) { distance = d; closest = i; }
        });
        setActive(closest, false);
      });
    }, { passive: true });

    carousel.addEventListener("mouseenter", stop);
    carousel.addEventListener("mouseleave", start);
    carousel.addEventListener("focusin", stop);
    carousel.addEventListener("focusout", start);
    document.addEventListener("visibilitychange", start);
    if (mobile.addEventListener) mobile.addEventListener("change", start);
    setActive(0, false);
    start();
  }

  function initMotion() {
    initReveal();
    initProjectMotion();
    initCardPointer();
    initPortraitTilt();
    initProofCarousel();
    initMobileMenu();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMotion, { once: true });
  } else {
    initMotion();
  }
})();