/* Shared case-study renderer — Legion-inspired preview.
   Layout: red-dot case hero, big hero image, pinned info column with
   scrolling media gallery, dark next-project card. Data contract
   (window.PROJECT / window.PROJECTS / window.PACKAGES) unchanged. */
(function () {
  "use strict";

  // The old pages pull in Font Awesome; the preview uses zero icons.
  document.querySelectorAll('link[href*="font-awesome"]').forEach(function (link) { link.remove(); });

  var P = window.PROJECT;
  if (!P) return;

  var lang = "ar";
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (selector, root) { return (root || document).querySelector(selector); };
  var $$ = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };

  var UI = {
    case: ["دراسة مشروع", "CASE STUDY"],
    client: ["العميل", "CLIENT"],
    services: ["الخدمات", "SERVICES"],
    workType: ["نوع المشروع", "PROJECT TYPE"],
    platform: ["المنصة", "PLATFORM"],
    year: ["سنة التنفيذ", "YEAR"],
    live: ["زيارة المتجر ↗", "VISIT STORE ↗"],
    brief: ["الفكرة والتحدي", "THE BRIEF"],
    built: ["ما تم تنفيذه", "THE BUILD"],
    review: ["انطباع العميل", "CLIENT FEEDBACK"],
    packs: ["عندك مشروع مشابه؟", "HAVE A SIMILAR PROJECT?"],
    packsp: ["راجع الباقات أو ابعت تفاصيل مشروعك وخلينا نحدد النطاق المناسب.", "Explore the packages or send your project details so we can define the right scope."],
    all: ["استعرض الباقات", "EXPLORE PACKAGES"],
    next: ["المشروع التالي", "NEXT PROJECT"],
    allWork: ["معرض الأعمال", "ALL PROJECTS"],
    whatsapp: ["ابدأ مشروعك على واتساب", "START A PROJECT ON WHATSAPP"]
  };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }
  function translated(ar, en, tag, cls) {
    return '<' + (tag || "span") + (cls ? ' class="' + cls + '"' : '') +
      ' data-ar="' + esc(ar) + '" data-en="' + esc(en) + '">' + esc(ar) + '</' + (tag || "span") + '>';
  }
  function label(key, tag, cls) { return translated(UI[key][0], UI[key][1], tag, cls); }
  function paired(value, tag, cls) { return translated(value.ar, value.en, tag, cls); }

  var projectIndex = 0;
  var nextProject = null;
  var allProjects = window.PROJECTS || [];
  var projectRecord = allProjects.find(function (item) { return item.slug === P.slug; });
  allProjects.forEach(function (project, index) {
    if (project.slug === P.slug) projectIndex = index;
  });
  if (allProjects.length) {
    var next = allProjects[projectIndex + 1];
    nextProject = next
      ? { href: next.href, title: next.title }
      : { href: "projects.html", title: { ar: UI.allWork[0], en: UI.allWork[1] }, isAll: true };
  } else if (P.next) {
    nextProject = P.next;
  }

  function renderHero() {
    return '<section class="pv-case-hero case-reveal">' +
      '<span class="case-kicker">' + label("case") + ' / ' + String(projectIndex + 1).padStart(2, "0") + '</span>' +
      '<h1>' + paired(P.title) + '</h1>' +
      '<p class="case-tagline">' + paired(P.tagline) + '</p>' +
      '</section>' +
      '<div class="pv-case-heroimg case-reveal"><img src="' + esc(P.hero) + '" alt="' + esc(P.title.en) + '" fetchpriority="high" onerror="this.remove()"></div>';
  }

  function renderInfo() {
    var briefParagraphs = (P.brief && P.brief.ar || []).map(function (line, index) {
      return translated(line, (P.brief.en || [])[index] || line, "p");
    }).join("");

    var builtItems = (P.built && P.built.ar || []).map(function (line, index) {
      return translated(line, (P.built.en || [])[index] || line, "li");
    }).join("");

    var quote = "";
    if (P.review && P.review.quote) {
      quote = '<blockquote class="case-quote"><p>' + paired(P.review.quote) + '</p>' +
        (P.review.author ? '<cite>' + paired(P.review.author) + '</cite>' : '') + '</blockquote>';
    }

    var meta = [
      '<div><dt>' + label("client") + '</dt><dd>' + paired(P.client) + '</dd></div>',
      '<div><dt>' + label("services") + '</dt><dd>' + paired(P.services) + '</dd></div>'
    ];
    if (projectRecord && projectRecord.workType) meta.push('<div><dt>' + label("workType") + '</dt><dd>' + paired(projectRecord.workType) + '</dd></div>');
    if (P.platform) meta.push('<div><dt>' + label("platform") + '</dt><dd>' + esc(P.platform) + '</dd></div>');
    if (P.year) meta.push('<div><dt>' + label("year") + '</dt><dd>' + esc(P.year) + '</dd></div>');
    if (P.live) meta.push('<div><dt></dt><dd><a href="' + esc(P.live) + '" target="_blank" rel="noopener">' + label("live") + '</a></dd></div>');

    return '<div class="pv-case-info">' +
      '<span class="case-kicker">' + label("brief") + '</span>' +
      '<h2>' + translated("من المطلوب إلى تجربة أوضح.", "From the brief to a clearer experience.", "span") + '</h2>' +
      briefParagraphs +
      '<span class="case-kicker" style="margin-top:26px">' + label("built") + '</span>' +
      '<ul>' + builtItems + '</ul>' +
      quote +
      '<dl class="pv-case-meta">' + meta.join("") + '</dl>' +
      '</div>';
  }

  function renderGallery() {
    var videos = (P.video || []).filter(Boolean);
    var gallery = (P.gallery || []).filter(Boolean);
    var reviews = (P.reviews || []).filter(Boolean);
    var cardCover = projectRecord && projectRecord.cover;
    if (cardCover && cardCover !== P.hero && gallery.indexOf(cardCover) === -1) {
      gallery.unshift(cardCover);
    }

    var out = '<div class="pv-case-gallery">';

    if (videos.length) {
      out += '<div class="case-video-frame" id="case-video-frame"><video id="case-video" muted loop playsinline controls preload="none" poster="' + esc(P.hero) + '">' +
        videos.map(function (source) {
          var ext = source.split(".").pop().toLowerCase();
          return '<source src="' + esc(source) + '" type="video/' + (ext === "webm" ? "webm" : "mp4") + '">';
        }).join("") + '</video></div>';
    }

    out += gallery.map(function (source) {
      return '<figure><img src="' + esc(source) + '" alt="' + esc(P.title.en) + '" loading="lazy" data-lightbox onerror="this.remove()"></figure>';
    }).join("");

    out += reviews.map(function (source) {
      return '<figure><img src="' + esc(source) + '" alt="Client feedback" loading="lazy" data-lightbox onerror="this.remove()"></figure>';
    }).join("");

    return out + '</div>';
  }

  function renderPricing() {
    if (!window.PACKAGES || !window.INTERNATIONAL_PACKAGES || !window.PACKAGES.length || !window.INTERNATIONAL_PACKAGES.length) return "";
    var egp = window.PACKAGES.map(function (item) { return Number(item.price); }).filter(Number.isFinite);
    var usd = window.INTERNATIONAL_PACKAGES.map(function (item) { return Number(item.usd); }).filter(Number.isFinite);
    if (!egp.length || !usd.length) return "";
    var egpRange = Math.min.apply(null, egp).toLocaleString("en-US") + "–" + Math.max.apply(null, egp).toLocaleString("en-US") + " EGP";
    var usdRange = "$" + Math.min.apply(null, usd) + "–$" + Math.max.apply(null, usd);
    return '<section class="case-pricing case-reveal"><h2>' + label("packs") + '</h2><p>' + label("packsp") + '</p>' +
      '<div class="case-pricing-grid">' +
      '<div class="case-price-card"><b>' + translated("داخل مصر", "Inside Egypt") + '</b><strong>' + esc(egpRange) + '</strong><small>' + translated("الأسعار بالجنيه المصري", "Prices in Egyptian pounds") + '</small></div>' +
      '<div class="case-price-card"><b>' + translated("خارج مصر والخليج", "Outside Egypt & Gulf") + '</b><strong>' + esc(usdRange) + '</strong><small>' + translated("الأسعار بالدولار الأمريكي", "Prices in US dollars") + '</small></div>' +
      '</div><p><a class="section-link" href="packages.html">' + label("all") + '</a></p></section>';
  }

  function renderNext() {
    if (!nextProject) return "";
    var title = nextProject.isAll ? { ar: UI.allWork[0], en: UI.allWork[1] } : nextProject.title;
    return '<a class="pv-case-next case-reveal" href="' + esc(nextProject.href) + '">' +
      '<div class="pv-next-card"><span>' + label(nextProject.isAll ? "allWork" : "next") + '</span>' +
      '<b>' + paired(title) + '</b></div></a>';
  }

  $("#app").innerHTML =
    renderHero() +
    '<section class="pv-case-grid">' + renderInfo() + renderGallery() + '</section>' +
    '<section class="case-cta case-reveal"><div class="case-cta-inner"><div>' +
    '<span class="case-kicker">' + label("packs") + '</span>' +
    '<h2>' + translated("خلينا نبني تجربة مناسبة لعلامتك.", "Let's build an experience that fits your brand.", "span") + '</h2>' +
    '<p>' + label("packsp") + '</p></div>' +
    '<a class="btn" href="https://wa.me/201123449977" target="_blank" rel="noopener">' + label("whatsapp") + '</a></div></section>' +
    '<div class="wrap" style="max-width:1280px;margin-inline:auto;padding-inline:clamp(18px,6vw,90px)">' + renderPricing() + '</div>' +
    renderNext();

  function applyLanguage() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.body.classList.toggle("en", lang === "en");
    $$("[data-ar][data-en]").forEach(function (node) {
      node.textContent = node.getAttribute("data-" + lang);
    });
    $("#lang").textContent = lang === "ar" ? "EN" : "AR";
    document.title = P.title[lang] + " | Kamal Elnhrawy";
  }

  $("#lang").addEventListener("click", function () {
    lang = lang === "ar" ? "en" : "ar";
    applyLanguage();
  });
  applyLanguage();

  /* floating pill header */
  var header = document.querySelector("header");
  function paintHeader() {
    if (header) header.classList.toggle("is-pilled", window.scrollY > 60);
  }
  window.addEventListener("scroll", paintHeader, { passive: true });
  paintHeader();

  function initReveal() {
    var elements = $$(".case-reveal");
    if (reduced || !("IntersectionObserver" in window)) {
      elements.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.06, rootMargin: "0px 0px -30px 0px" });
    elements.forEach(function (element) { observer.observe(element); });
  }

  function initVideo() {
    var video = $("#case-video");
    var frame = $("#case-video-frame");
    if (!video || !frame) return;
    video.addEventListener("loadedmetadata", function () {
      if (video.videoHeight > video.videoWidth * 1.1) frame.classList.add("is-portrait");
    });
    video.addEventListener("error", function () {
      frame.hidden = true;
    });
    if (!("IntersectionObserver" in window)) return;
    var saveData = navigator.connection && navigator.connection.saveData;
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        video.preload = "metadata";
        if (!saveData && !reduced) {
          var playPromise = video.play();
          if (playPromise && playPromise.catch) playPromise.catch(function () {});
        }
      } else {
        video.pause();
      }
    }, { threshold: 0.25 });
    observer.observe(frame);
  }

  function initLightbox() {
    $$("[data-lightbox]").forEach(function (image) {
      image.addEventListener("click", function () {
        if (!image.src || image.hidden) return;
        var lightbox = document.createElement("div");
        lightbox.className = "case-lightbox";
        lightbox.setAttribute("role", "dialog");
        lightbox.setAttribute("aria-modal", "true");
        lightbox.setAttribute("aria-label", "Image preview");
        var close = document.createElement("button");
        close.type = "button";
        close.textContent = "×";
        close.setAttribute("aria-label", "Close image");
        var full = document.createElement("img");
        full.src = image.src;
        full.alt = image.alt || "";
        function dismiss() {
          lightbox.remove();
          document.removeEventListener("keydown", onKey);
        }
        function onKey(event) {
          if (event.key === "Escape") dismiss();
        }
        close.addEventListener("click", dismiss);
        lightbox.addEventListener("click", function (event) {
          if (event.target === lightbox) dismiss();
        });
        lightbox.appendChild(close);
        lightbox.appendChild(full);
        document.body.appendChild(lightbox);
        close.focus();
        document.addEventListener("keydown", onKey);
      });
    });
  }

  initReveal();
  initVideo();
  initLightbox();
})();
