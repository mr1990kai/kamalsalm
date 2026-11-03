/* Shared case-study renderer. All content comes from the page's window.PROJECT data. */
(function () {
  "use strict";
  var P = window.PROJECT;
  if (!P) return;

  var lang = "ar";
  var $ = function (selector, root) { return (root || document).querySelector(selector); };
  var $$ = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };

  var UI = {
    case: ["دراسة مشروع", "CASE STUDY"],
    client: ["العميل", "CLIENT"],
    services: ["الخدمات", "SERVICES"],
    workType: ["نوع المشروع", "PROJECT TYPE"],
    platform: ["المنصة", "PLATFORM"],
    year: ["سنة التنفيذ", "YEAR"],
    live: ["زيارة المتجر", "VISIT STORE"],
    brief: ["الفكرة والتحدي", "THE BRIEF"],
    built: ["ما تم تنفيذه", "THE BUILD"],
    briefIntro: ["كل مشروع بيبدأ بفهم المطلوب والمشكلة اللي التصميم لازم يحلها.", "Every project starts by understanding the brief and the problem the design needs to solve."],
    buildIntro: ["الحلول والعناصر اللي اتنفذت ضمن نطاق المشروع.", "The solutions and elements delivered within this project scope."],
    tour: ["شاهد المتجر أثناء الاستخدام", "THE STORE IN MOTION"],
    tourp: ["جولة مصورة من داخل تجربة المتجر.", "A recorded walkthrough of the storefront experience."],
    gallery: ["لقطات من المشروع", "PROJECT DETAILS"],
    review: ["انطباع العميل", "CLIENT FEEDBACK"],
    tap: ["اضغط على الصورة لعرضها بحجم أكبر", "Select an image to view it larger"],
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

  function renderParagraphs(arList, enList) {
    return (arList || []).map(function (line, index) {
      return translated(line, (enList || [])[index] || line, "p");
    }).join("");
  }

  function renderBuildList(arList, enList) {
    return "<ul>" + (arList || []).map(function (line, index) {
      return translated(line, (enList || [])[index] || line, "li");
    }).join("") + "</ul>";
  }

  function renderHero() {
    var meta = [
      '<div><dt>' + label("client") + '</dt><dd>' + paired(P.client) + '</dd></div>',
      '<div><dt>' + label("services") + '</dt><dd>' + paired(P.services) + '</dd></div>'
    ];
    if (projectRecord && projectRecord.workType) meta.push('<div><dt>' + label("workType") + '</dt><dd>' + paired(projectRecord.workType) + '</dd></div>');
    if (P.platform) meta.push('<div><dt>' + label("platform") + '</dt><dd>' + esc(P.platform) + '</dd></div>');
    if (P.year) meta.push('<div><dt>' + label("year") + '</dt><dd>' + esc(P.year) + '</dd></div>');
    if (P.live) meta.push('<div><dt></dt><dd><a href="' + esc(P.live) + '" target="_blank" rel="noopener">' + label("live") + ' ↗</a></dd></div>');

    return '<section class="wrap case-hero">' +
      '<div class="case-hero-copy">' +
      '<span class="case-kicker">' + label("case") + ' / ' + String(projectIndex + 1).padStart(2, "0") + '</span>' +
      '<h1>' + paired(P.title) + '</h1>' +
      '<p class="case-tagline">' + paired(P.tagline) + '</p>' +
      '<dl class="case-meta">' + meta.join("") + '</dl>' +
      '</div>' +
      '<div class="case-hero-visual"><span class="case-image-index">' + String(projectIndex + 1).padStart(2, "0") + ' / ' + String(Math.max(allProjects.length, 1)).padStart(2, "0") + '</span>' +
      '<img src="' + esc(P.hero) + '" alt="' + esc(P.title.en) + '" fetchpriority="high" onerror="this.remove()"></div>' +
      '</section>';
  }

  function renderStory() {
    return '<section class="case-body"><div class="wrap case-overview">' +
      '<div class="case-section-heading"><span class="case-kicker">' + label("brief") + '</span>' +
      '<h2>' + translated("من المطلوب إلى تجربة رقمية أوضح.", "From the brief to a clearer digital experience.", "span") + '</h2>' +
      '<p>' + label("briefIntro") + '</p></div>' +
      '<div class="case-story-grid">' +
      '<article class="case-story-card"><span class="story-index">01 / THE BRIEF</span><h3>' + label("brief") + '</h3>' +
      renderParagraphs(P.brief && P.brief.ar, P.brief && P.brief.en) + '</article>' +
      '<article class="case-story-card is-dark"><span class="story-index">02 / THE BUILD</span><h3>' + label("built") + '</h3>' +
      renderBuildList(P.built && P.built.ar, P.built && P.built.en) + '</article>' +
      '</div></div></section>';
  }

  function renderShowcase() {
    var videos = (P.video || []).filter(Boolean);
    var gallery = (P.gallery || []).filter(Boolean);
    var cardCover = projectRecord && projectRecord.cover;
    if (cardCover && cardCover !== P.hero && gallery.indexOf(cardCover) === -1) {
      gallery.unshift(cardCover);
    }
    if (!videos.length && !gallery.length) return "";

    var out = '<section class="case-showcase"><div class="wrap">' +
      '<div class="case-section-heading"><div><span class="case-kicker">' + (videos.length ? label("tour") : label("gallery")) + '</span>' +
      '<h2>' + translated(videos.length ? "تفاصيل التجربة على أرض الواقع." : "نظرة أقرب على تنفيذ المشروع.", videos.length ? "A closer look at the finished experience." : "A closer look at the project execution.", "span") + '</h2></div>' +
      '<p>' + (videos.length ? label("tourp") : translated("صور فعلية من ملفات المشروع المتاحة.", "Available project visuals.", "span")) + '</p></div>';

    if (videos.length) {
      out += '<div class="case-video-frame" id="case-video-frame"><video id="case-video" muted loop playsinline controls preload="none" poster="' + esc(P.hero) + '">' +
        videos.map(function (source) {
          var ext = source.split(".").pop().toLowerCase();
          return '<source src="' + esc(source) + '" type="video/' + (ext === "webm" ? "webm" : "mp4") + '">';
        }).join("") +
        '</video></div>';
    }

    if (gallery.length) {
      out += '<div class="case-media-grid">' + gallery.map(function (source) {
        return '<figure class="case-gallery-item"><img src="' + esc(source) + '" alt="' + esc(P.title.en) + '" loading="lazy" data-lightbox onerror="this.remove()"></figure>';
      }).join("") + '</div>';
    }
    return out + '</div></section>';
  }

  function renderReviews() {
    var hasQuote = !!(P.review && P.review.quote);
    var reviews = (P.reviews || []).filter(Boolean);
    if (!hasQuote && !reviews.length) return "";

    var out = '<section class="case-review"><div class="wrap case-review-grid">' +
      '<div class="case-review-copy"><span class="case-kicker">' + label("review") + '</span>' +
      '<h2>' + translated("رأي العميل جزء من قصة المشروع.", "The client's feedback is part of the project story.", "span") + '</h2>' +
      '<p>' + translated("بنحتفظ بالمراجعات كما وصلت، علشان تشوف التجربة من منظور صاحب المشروع.", "Original client feedback, shared as received, offers another view of the project experience.", "span") + '</p>';

    if (hasQuote) {
      out += '<blockquote class="case-quote"><p>' + paired(P.review.quote) + '</p>' +
        (P.review.author ? '<cite>' + paired(P.review.author) + '</cite>' : '') + '</blockquote>';
    }
    out += '</div>';

    if (reviews.length) {
      out += '<div class="case-proof-grid">' + reviews.map(function (source) {
        return '<img src="' + esc(source) + '" alt="Client feedback" loading="lazy" data-lightbox onerror="this.remove()">';
      }).join("") + '<p class="case-proof-note">' + label("tap") + '</p></div>';
    }
    return out + '</div></section>';
  }

  function renderPricing() {
    if (!window.PACKAGES || !window.INTERNATIONAL_PACKAGES || !window.PACKAGES.length || !window.INTERNATIONAL_PACKAGES.length) return "";
    var egp = window.PACKAGES.map(function (item) { return Number(item.price); }).filter(Number.isFinite);
    var usd = window.INTERNATIONAL_PACKAGES.map(function (item) { return Number(item.usd); }).filter(Number.isFinite);
    if (!egp.length || !usd.length) return "";
    var egpRange = Math.min.apply(null, egp).toLocaleString("en-US") + "–" + Math.max.apply(null, egp).toLocaleString("en-US") + " EGP";
    var usdRange = "$" + Math.min.apply(null, usd) + "–$" + Math.max.apply(null, usd);
    return '<section class="case-pricing"><h2>' + label("packs") + '</h2><p>' + label("packsp") + '</p>' +
      '<div class="case-pricing-grid">' +
      '<div class="case-price-card"><b>' + translated("داخل مصر", "Inside Egypt") + '</b><strong>' + esc(egpRange) + '</strong><small>' + translated("الأسعار بالجنيه المصري", "Prices in Egyptian pounds") + '</small></div>' +
      '<div class="case-price-card"><b>' + translated("خارج مصر والخليج", "Outside Egypt & Gulf") + '</b><strong>' + esc(usdRange) + '</strong><small>' + translated("الأسعار بالدولار الأمريكي", "Prices in US dollars") + '</small></div>' +
      '</div><p><a class="section-link" href="packages.html">' + label("all") + ' ↗</a></p></section>';
  }

  function renderNext() {
    if (!nextProject) return "";
    var title = nextProject.isAll ? { ar: UI.allWork[0], en: UI.allWork[1] } : nextProject.title;
    return '<a class="wrap case-next" href="' + esc(nextProject.href) + '">' +
      '<span><small>' + label(nextProject.isAll ? "allWork" : "next") + '</small><strong>' + paired(title) + '</strong></span>' +
      '<span class="next-arrow">↗</span></a>';
  }

  $("#app").innerHTML =
    renderHero() +
    renderStory() +
    renderShowcase() +
    renderReviews() +
    '<section class="case-cta"><div class="wrap case-cta-inner"><div>' +
    '<span class="case-kicker">' + label("packs") + '</span>' +
    '<h2>' + translated("خلينا نبني تجربة مناسبة لعلامتك.", "Let's build an experience that fits your brand.", "span") + '</h2>' +
    '<p>' + label("packsp") + '</p></div>' +
    '<a class="btn" href="https://wa.me/201123449977" target="_blank" rel="noopener">' + label("whatsapp") + ' ↗</a></div></section>' +
    '<div class="wrap">' + renderPricing() + renderNext() + '</div>';

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

  function initReveal() {
    var elements = $$(".case-section-heading, .case-story-card, .case-video-frame, .case-media-grid, .case-review-grid, .case-cta-inner, .case-next, .case-pricing");
    if (!("IntersectionObserver" in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("case-reveal", "is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -30px 0px" });
    elements.forEach(function (element) {
      element.classList.add("case-reveal");
      observer.observe(element);
    });
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
        if (!saveData && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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