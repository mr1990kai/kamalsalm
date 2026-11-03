/* Progressive 3D project stack for the portfolio hero.
   Three.js is loaded only when the hero approaches the viewport. */
(function () {
  "use strict";

  var host = document.getElementById("hero3d");
  if (!host) return;

  var visual = host.closest(".ph");
  if (!visual) return;

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var saveData = navigator.connection && navigator.connection.saveData;
  var lowMemory = navigator.deviceMemory && navigator.deviceMemory <= 2;
  if (reduceMotion || saveData || lowMemory) {
    visual.classList.add("is-static-visual");
    return;
  }

  var started = false;

  async function boot() {
    if (started) return;
    started = true;

    try {
      var THREE = await import("https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js");
      if (!visual.isConnected) return;

      var coarsePointer = window.matchMedia &&
        window.matchMedia("(pointer: coarse)").matches;

      var renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !coarsePointer,
        powerPreference: "low-power"
      });

      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarsePointer ? 1.2 : 1.6));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.domElement.setAttribute("aria-hidden", "true");
      host.appendChild(renderer.domElement);

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
      camera.position.set(0, 0, 6.2);

      scene.add(new THREE.AmbientLight(0xffffff, 1.65));

      var keyLight = new THREE.DirectionalLight(0xfff2d9, 2.25);
      keyLight.position.set(-3.5, 4.5, 5);
      scene.add(keyLight);

      var rimLight = new THREE.PointLight(0xc7a66a, 13, 12);
      rimLight.position.set(3, -1, 3);
      scene.add(rimLight);

      var stage = new THREE.Group();
      scene.add(stage);

      var orbit = new THREE.Mesh(
        new THREE.TorusGeometry(2.05, 0.009, 8, 120),
        new THREE.MeshBasicMaterial({
          color: 0xc7a66a,
          transparent: true,
          opacity: 0.55
        })
      );
      orbit.rotation.set(0.92, -0.26, -0.18);
      orbit.position.z = -1.15;
      stage.add(orbit);

      var orbit2 = new THREE.Mesh(
        new THREE.TorusGeometry(1.74, 0.006, 8, 100),
        new THREE.MeshBasicMaterial({
          color: 0xe5d2ad,
          transparent: true,
          opacity: 0.3
        })
      );
      orbit2.rotation.set(1.12, 0.38, 0.24);
      orbit2.position.z = -1.3;
      stage.add(orbit2);

      var allProjects = window.PROJECTS || [];
      var preferredSlugs = ["vamilano", "kenz", "nmkids"];
      var projects = preferredSlugs.map(function (slug) {
        return allProjects.find(function (project) { return project.slug === slug; });
      }).filter(Boolean);
      if (!projects.length) projects = allProjects.slice(0, 3);
      if (!projects.length) {
        projects = [
          { cover: "06.jpg", title: { ar: "Ladyland", en: "Ladyland" } },
          { cover: "02.jpg", title: { ar: "Kenz", en: "Kenz" } },
          { cover: "08.jpg", title: { ar: "Back Support", en: "Back Support" } }
        ];
      }

      var loader = new THREE.TextureLoader();
      var panels = [];

      function makePanel(item, index) {
        var isMain = index === 0;
        var width = isMain ? 1.78 : 1.48;
        var height = isMain ? 1.18 : 0.99;
        var card = new THREE.Group();

        var shell = new THREE.Mesh(
          new THREE.BoxGeometry(width, height, 0.075),
          new THREE.MeshStandardMaterial({
            color: 0xf8f4ec,
            roughness: 0.36,
            metalness: 0.16
          })
        );
        card.add(shell);

        var screen = new THREE.Mesh(
          new THREE.PlaneGeometry(width - 0.085, height - 0.085),
          new THREE.MeshBasicMaterial({ color: 0xddd4c6 })
        );
        screen.position.z = 0.043;
        card.add(screen);

        var edge = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(width, height, 0.076)),
          new THREE.LineBasicMaterial({
            color: 0xc7a66a,
            transparent: true,
            opacity: 0.7
          })
        );
        card.add(edge);

        if (item.cover) {
          loader.load(
            item.cover,
            function (texture) {
              texture.colorSpace = THREE.SRGBColorSpace;
              texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
              screen.material = new THREE.MeshBasicMaterial({
                map: texture,
                toneMapped: false
              });
              screen.material.needsUpdate = true;
            },
            undefined,
            function () {
              /* Keep the clean neutral screen as a graceful fallback. */
            }
          );
        }

        var layout = [
          { x: 0.02, y: -0.02, z: 0.35, scale: 1.04, ry: -0.045, rx: -0.025 },
          { x: -1.24, y: 0.34, z: -0.44, scale: 0.78, ry: 0.31, rx: -0.07 },
          { x: 1.22, y: -0.34, z: -0.62, scale: 0.8, ry: -0.32, rx: 0.07 }
        ][index];

        card.position.set(layout.x, layout.y, layout.z);
        card.scale.setScalar(layout.scale);
        card.rotation.set(layout.rx, layout.ry, 0.015 * (index - 1));
        card.userData.baseY = layout.y;
        card.userData.phase = index * 1.5;
        stage.add(card);
        panels.push(card);
      }

      projects.forEach(makePanel);

      /* Small restrained metallic details, kept behind the project cards. */
      var beadGeometry = new THREE.SphereGeometry(0.027, 12, 12);
      var beadMaterial = new THREE.MeshStandardMaterial({
        color: 0xd5b77f,
        metalness: 0.75,
        roughness: 0.25
      });
      [
        [-1.78, 0.95, -0.8],
        [1.82, 0.78, -0.5],
        [1.78, -1.05, -0.7],
        [-1.7, -0.9, -0.4]
      ].forEach(function (position) {
        var bead = new THREE.Mesh(beadGeometry, beadMaterial);
        bead.position.set(position[0], position[1], position[2]);
        stage.add(bead);
      });

      var targetX = 0;
      var targetY = 0;
      var active = false;
      var frame = 0;
      var resizeObserver;

      function resize() {
        var rect = host.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        var compact = rect.width < 500;
        renderer.setSize(rect.width, rect.height, false);
        camera.aspect = rect.width / rect.height;
        camera.position.z = compact ? 8.5 : 6.2;
        camera.updateProjectionMatrix();
        stage.scale.setScalar(compact ? 0.88 : 1);

        if (compact) {
          var mobileLayout = [
            { x: 0, y: -0.02, scale: 0.94 },
            { x: -0.82, y: 0.34, scale: 0.66 },
            { x: 0.82, y: -0.34, scale: 0.66 }
          ];
          panels.forEach(function (panel, index) {
            var item = mobileLayout[index];
            if (!item) return;
            panel.position.x = item.x;
            panel.scale.setScalar(item.scale);
          });
        } else {
          panels.forEach(function (panel, index) {
            var desktopLayout = [
              { x: 0.02, scale: 1.04 },
              { x: -1.24, scale: 0.78 },
              { x: 1.22, scale: 0.8 }
            ][index];
            if (!desktopLayout) return;
            panel.position.x = desktopLayout.x;
            panel.scale.setScalar(desktopLayout.scale);
          });
        }
      }

      function animate(time) {
        frame = 0;
        if (!active || document.hidden) return;

        var t = time * 0.001;
        stage.rotation.y += (targetY + Math.sin(t * 0.24) * 0.026 - stage.rotation.y) * 0.035;
        stage.rotation.x += (targetX + Math.cos(t * 0.2) * 0.018 - stage.rotation.x) * 0.035;

        panels.forEach(function (panel) {
          panel.position.y = panel.userData.baseY +
            Math.sin(t * 0.72 + panel.userData.phase) * 0.035;
        });

        renderer.render(scene, camera);
        frame = window.requestAnimationFrame(animate);
      }

      function start() {
        if (!active || document.hidden || frame) return;
        frame = window.requestAnimationFrame(animate);
      }

      function stop() {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
      }

      visual.addEventListener("pointermove", function (event) {
        if (coarsePointer) return;
        var rect = visual.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        targetY = ((event.clientX - rect.left) / rect.width - 0.5) * 0.22;
        targetX = ((event.clientY - rect.top) / rect.height - 0.5) * -0.14;
      }, { passive: true });

      visual.addEventListener("pointerleave", function () {
        targetX = 0;
        targetY = 0;
      }, { passive: true });

      resize();
      if ("ResizeObserver" in window) {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
      } else {
        window.addEventListener("resize", resize, { passive: true });
      }

      var observer = new IntersectionObserver(function (entries) {
        active = !!entries[0].isIntersecting;
        if (active) start();
        else stop();
      }, { threshold: 0.01 });
      observer.observe(visual);

      document.addEventListener("visibilitychange", function () {
        if (document.hidden) stop();
        else start();
      });

      visual.classList.add("is-3d");
      renderer.render(scene, camera);
    } catch (error) {
      visual.classList.add("is-3d-fallback");
      if (window.console && console.info) {
        console.info("3D showcase unavailable; using the static hero image.", error);
      }
    }
  }

  if ("IntersectionObserver" in window) {
    var lazyObserver = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        lazyObserver.disconnect();
        boot();
      }
    }, { rootMargin: "180px 0px" });
    lazyObserver.observe(visual);
  } else {
    boot();
  }
})();