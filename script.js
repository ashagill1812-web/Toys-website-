/* Antigravity Toys — Vanilla JS Interactions
   - Lightweight star/particle background (canvas)
   - Mouse parallax for hero + lab floaters
   - Product card tilt + glow tracking
   - Scroll reveal via IntersectionObserver
   - Drag module (pointer-based, touch friendly)
   - Tiny cart counter + toasts + newsletter feedback
*/

(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = {
    reduceMotion: prefersReducedMotion(),
    cartCount: 0,
  };

  /* ----------------------------- Motion toggle ----------------------------- */
  function applyReduceMotion(on) {
    state.reduceMotion = !!on;
    document.body.classList.toggle("reduce-motion", state.reduceMotion);

    const btn = $("#toggleReduceMotion");
    if (btn) btn.setAttribute("aria-pressed", String(state.reduceMotion));
  }

  function initMotionToggle() {
    applyReduceMotion(state.reduceMotion);
    const btn = $("#toggleReduceMotion");
    if (!btn) return;
    btn.addEventListener("click", () => {
      applyReduceMotion(!state.reduceMotion);
      toast({
        title: state.reduceMotion ? "Motion reduced" : "Motion on",
        text: state.reduceMotion ? "Animations are minimized." : "Neon motion effects are enabled.",
        icon: state.reduceMotion ? "fa-person-walking" : "fa-wand-magic-sparkles",
      });
    });
  }

  /* -------------------------------- Toasts -------------------------------- */
  const toastRoot = () => $("#toasts");

  function toast({ title, text, icon = "fa-sparkles", timeoutMs = 2800 } = {}) {
    const root = toastRoot();
    if (!root) return;

    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `
      <div class="toast__icon" aria-hidden="true"><i class="fa-solid ${icon}"></i></div>
      <div class="toast__body">
        <div class="toast__title"></div>
        <div class="toast__text"></div>
      </div>
      <button class="toast__x" type="button" aria-label="Dismiss notification">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
    $(".toast__title", el).textContent = title || "Saved";
    $(".toast__text", el).textContent = text || "Done.";

    const remove = () => {
      el.style.transition = "opacity 220ms ease, transform 220ms ease";
      el.style.opacity = "0";
      el.style.transform = "translateY(8px)";
      window.setTimeout(() => el.remove(), 240);
    };

    $(".toast__x", el).addEventListener("click", remove);
    root.appendChild(el);

    // Enter animation
    el.animate(
      [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 260, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
    );

    if (timeoutMs > 0) window.setTimeout(remove, timeoutMs);
  }

  /* --------------------------- Scroll reveal init -------------------------- */
  function initReveal() {
    const els = $$(".reveal");
    if (!els.length) return;

    if (state.reduceMotion) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -10% 0px" }
    );
    els.forEach((el) => io.observe(el));
  }

  /* ------------------------------ Card tracking ---------------------------- */
  function initCardGlowTracking() {
    const cards = $$(".card");
    if (!cards.length) return;

    const setVars = (card, clientX, clientY) => {
      const r = card.getBoundingClientRect();
      const x = clamp(((clientX - r.left) / r.width) * 100, 0, 100);
      const y = clamp(((clientY - r.top) / r.height) * 100, 0, 100);
      card.style.setProperty("--mx", `${x}%`);
      card.style.setProperty("--my", `${y}%`);
    };

    cards.forEach((card) => {
      card.addEventListener("pointermove", (e) => setVars(card, e.clientX, e.clientY));
      card.addEventListener("pointerleave", () => {
        card.style.removeProperty("--mx");
        card.style.removeProperty("--my");
      });
    });
  }

  function initTiltCards() {
    const els = $$("[data-tilt]");
    if (!els.length) return;
    if (state.reduceMotion) return;

    const maxDeg = 7;
    els.forEach((el) => {
      let raf = 0;
      let last = null;

      const update = () => {
        raf = 0;
        if (!last) return;
        const r = el.getBoundingClientRect();
        const px = (last.x - r.left) / r.width; // 0..1
        const py = (last.y - r.top) / r.height; // 0..1
        const rx = (0.5 - py) * maxDeg;
        const ry = (px - 0.5) * maxDeg;
        el.style.transform = `translateY(-10px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      };

      el.addEventListener("pointermove", (e) => {
        last = { x: e.clientX, y: e.clientY };
        if (!raf) raf = requestAnimationFrame(update);
      });
      el.addEventListener("pointerleave", () => {
        last = null;
        el.style.transform = "";
      });
    });
  }

  /* ------------------------------- Parallax -------------------------------- */
  function parallaxBind(container, selector = "[data-depth]") {
    if (!container) return () => {};
    const layers = $$(selector, container);
    if (!layers.length) return () => {};
    if (state.reduceMotion) return () => {};

    let raf = 0;
    let target = { x: 0, y: 0 };
    let cur = { x: 0, y: 0 };

    const onMove = (e) => {
      const r = container.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / r.width; // -0.5..0.5-ish
      const dy = (e.clientY - cy) / r.height;
      target.x = clamp(dx, -0.6, 0.6);
      target.y = clamp(dy, -0.6, 0.6);
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const tick = () => {
      raf = 0;
      cur.x = lerp(cur.x, target.x, 0.14);
      cur.y = lerp(cur.y, target.y, 0.14);

      for (const layer of layers) {
        const depth = Number(layer.getAttribute("data-depth") || "0.12");
        const tx = cur.x * depth * 90;
        const ty = cur.y * depth * 90;
        layer.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      }
    };

    container.addEventListener("pointermove", onMove, { passive: true });
    container.addEventListener(
      "pointerleave",
      () => {
        target = { x: 0, y: 0 };
        if (!raf) raf = requestAnimationFrame(tick);
      },
      { passive: true }
    );

    return () => container.removeEventListener("pointermove", onMove);
  }

  /* ---------------------------- Drag interaction --------------------------- */
  function initDraggable() {
    const arena = $("#arena");
    const el = $("#draggableToy");
    if (!arena || !el) return;

    const origin = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    let dragging = false;
    let pointerId = null;
    let start = { x: 0, y: 0 };
    let base = { x: 0, y: 0 };

    function updateTransform() {
      // Keep the original centering translate(-50%, -50%) and add our offsets
      el.style.transform = `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`;
    }

    function snapBack() {
      if (state.reduceMotion) {
        pos.x = 0;
        pos.y = 0;
        updateTransform();
        return;
      }

      const startX = pos.x;
      const startY = pos.y;
      const t0 = performance.now();
      const dur = 520;

      const animate = (t) => {
        const p = clamp((t - t0) / dur, 0, 1);
        // spring-ish ease out
        const eased = 1 - Math.pow(1 - p, 3);
        pos.x = lerp(startX, origin.x, eased);
        pos.y = lerp(startY, origin.y, eased);
        updateTransform();
        if (p < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }

    el.addEventListener("pointerdown", (e) => {
      dragging = true;
      pointerId = e.pointerId;
      el.setPointerCapture(pointerId);
      el.style.transition = "none";
      start = { x: e.clientX, y: e.clientY };
      base = { x: pos.x, y: pos.y };
    });

    window.addEventListener(
      "pointermove",
      (e) => {
        if (!dragging || e.pointerId !== pointerId) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        const r = arena.getBoundingClientRect();

        // Keep it inside arena bounds softly
        const maxX = r.width * 0.36;
        const maxY = r.height * 0.30;
        pos.x = clamp(base.x + dx, -maxX, maxX);
        pos.y = clamp(base.y + dy, -maxY, maxY);
        updateTransform();
      },
      { passive: true }
    );

    const end = (e) => {
      if (!dragging || e.pointerId !== pointerId) return;
      dragging = false;
      pointerId = null;
      el.style.transition = "";
      snapBack();
      toast({ title: "Nice!", text: "Rocket released back into orbit.", icon: "fa-rocket", timeoutMs: 1800 });
    };

    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }

  /* ------------------------------- Cart logic ------------------------------ */
  function readCartCount() {
    const raw = localStorage.getItem("agt_cart_count");
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  function writeCartCount(n) {
    state.cartCount = Math.max(0, Math.floor(n));
    localStorage.setItem("agt_cart_count", String(state.cartCount));
    const el = $("#cartCount");
    if (el) el.textContent = String(state.cartCount);
  }

  function initCart() {
    writeCartCount(readCartCount());

    $$("button[data-add][data-price]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const name = btn.getAttribute("data-add") || "Toy";
        const price = btn.getAttribute("data-price") || "?";
        writeCartCount(state.cartCount + 1);

        // Micro feedback
        if (!state.reduceMotion) {
          btn.animate(
            [{ transform: "translateY(0)" }, { transform: "translateY(-3px)" }, { transform: "translateY(0)" }],
            { duration: 220, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
          );
        }

        toast({
          title: "Added to cart",
          text: `${name} • $${price}`,
          icon: "fa-bag-shopping",
        });
      });
    });

    const openCart = $("#openCart");
    if (openCart) {
      openCart.addEventListener("click", () => {
        const c = state.cartCount;
        toast({
          title: "Cart snapshot",
          text: c === 0 ? "Your cart is empty (for now)." : `You have ${c} item${c === 1 ? "" : "s"} ready to float home.`,
          icon: "fa-bag-shopping",
        });
      });
    }
  }

  /* ------------------------------ Newsletter ------------------------------- */
  function initNewsletter() {
    const form = $("#newsletterForm");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = $("#email")?.value?.trim() || "";
      if (!email) return;
      form.reset();
      toast({
        title: "Welcome aboard!",
        text: `Subscribed: ${email}`,
        icon: "fa-paper-plane",
      });
    });
  }

  /* ----------------------------- Starfield FX ------------------------------ */
  function initStarfield() {
    const canvas = $("#starfield");
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;

    const stars = [];
    const particles = [];

    const rnd = (min, max) => min + Math.random() * (max - min);

    const palette = [
      { r: 179, g: 107, b: 255 }, // purple
      { r: 0, g: 229, b: 255 }, // cyan
      { r: 255, g: 79, b: 216 }, // pink
      { r: 90, g: 167, b: 255 }, // blue
    ];

    function resize() {
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      w = Math.floor(window.innerWidth);
      h = Math.floor(window.innerHeight);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seed() {
      stars.length = 0;
      particles.length = 0;

      const starCount = Math.floor((w * h) / 14000);
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: rnd(0.6, 1.8),
          a: rnd(0.25, 0.85),
          tw: rnd(0.006, 0.02),
        });
      }

      // A few drifting neon particles (subtle)
      const pCount = Math.floor((w * h) / 90000) + 14;
      for (let i = 0; i < pCount; i++) {
        const c = palette[Math.floor(Math.random() * palette.length)];
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: rnd(-0.08, 0.08),
          vy: rnd(-0.05, 0.05),
          r: rnd(1.6, 3.4),
          a: rnd(0.14, 0.32),
          c,
        });
      }
    }

    function draw(timeMs) {
      raf = 0;
      ctx.clearRect(0, 0, w, h);

      // Soft vignette
      const g = ctx.createRadialGradient(w * 0.5, h * 0.15, 80, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
      g.addColorStop(0, "rgba(255,255,255,0.03)");
      g.addColorStop(1, "rgba(0,0,0,0.10)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Stars
      for (const s of stars) {
        const tw = 0.65 + 0.35 * Math.sin(timeMs * s.tw);
        ctx.globalAlpha = s.a * tw;
        ctx.fillStyle = "rgba(255,255,255,1)";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Neon particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -40) p.x = w + 40;
        if (p.x > w + 40) p.x = -40;
        if (p.y < -40) p.y = h + 40;
        if (p.y > h + 40) p.y = -40;

        ctx.globalAlpha = p.a;
        const gg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 7);
        gg.addColorStop(0, `rgba(${p.c.r},${p.c.g},${p.c.b},0.85)`);
        gg.addColorStop(1, `rgba(${p.c.r},${p.c.g},${p.c.b},0)`);
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      if (!state.reduceMotion) raf = requestAnimationFrame((t) => draw(t));
    }

    const onResize = () => {
      resize();
      seed();
      if (!state.reduceMotion) {
        if (!raf) raf = requestAnimationFrame((t) => draw(t));
      } else {
        // Draw a single frame for reduced motion
        draw(performance.now());
      }
    };

    window.addEventListener("resize", onResize, { passive: true });
    onResize();
  }

  /* ---------------------------- Misc small bits ---------------------------- */
  function initYear() {
    const y = $("#year");
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* ----------------------------- Chat widget ------------------------------ */
  function initChatWidget() {
    const root = $("#chatWidget");
    const fab = $("#chatWidgetFab");
    const panel = $("#chatWidgetPanel");
    const close = $("#chatWidgetClose");
    if (!root || !fab || !panel || !close) return;

    const KEY = "agt_chat_open";

    const setOpen = (open) => {
      const on = !!open;
      root.classList.toggle("is-open", on);
      fab.setAttribute("aria-expanded", String(on));
      try {
        localStorage.setItem(KEY, on ? "1" : "0");
      } catch {
        // ignore
      }
    };

    const toggle = () => setOpen(!root.classList.contains("is-open"));

    fab.addEventListener("click", toggle);
    close.addEventListener("click", () => setOpen(false));

    // Escape to close
    window.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!root.classList.contains("is-open")) return;
      setOpen(false);
    });

    // Restore previous state
    try {
      const wasOpen = localStorage.getItem(KEY) === "1";
      setOpen(wasOpen);
    } catch {
      setOpen(false);
    }
  }

  /* ------------------------------- Boot up -------------------------------- */
  function boot() {
    initYear();
    initMotionToggle();
    initStarfield();
    initReveal();
    initCardGlowTracking();
    initTiltCards();
    initCart();
    initNewsletter();
    initDraggable();
    initChatWidget();

    // Parallax layers
    parallaxBind($("#parallax"), "[data-depth]");
    parallaxBind($("#arena"), "[data-depth]");

    // Friendly first ping
    window.setTimeout(() => {
      toast({ title: "Welcome!", text: "Move your mouse—watch the toys float.", icon: "fa-sparkles", timeoutMs: 2200 });
    }, 600);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();

