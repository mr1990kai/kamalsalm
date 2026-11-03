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

  function initMotion() {
    initReveal();
    initPortraitTilt();
    initMobileMenu();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMotion, { once: true });
  } else {
    initMotion();
  }
})();