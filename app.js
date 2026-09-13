// DoramaLatAMP — lógica de cliente: sesión de usuario, buscador, filtros por
// género/país y modal de detalle. Habla con la API real en /api/* (server/index.js).
(() => {
  "use strict";

  const COUNTRY_EMOJI = { KR: "🇰🇷", CN: "🇨🇳", JP: "🇯🇵", TW: "🇹🇼", TH: "🇹🇭" };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  async function api(path, options = {}) {
    const res = await fetch(path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      /* respuestas 204 no traen cuerpo */
    }
    if (!res.ok) {
      const message = (data && data.error) || `Error ${res.status}`;
      throw new Error(message);
    }
    return data;
  }

  // ---------------------------------------------------------------------
  // Sesión de usuario
  // ---------------------------------------------------------------------
  let currentUser = null;

  function renderAuthUI() {
    const openBtn = $("#auth-open-btn");
    const initial = $("#auth-avatar-initial");
    const guestIcon = $("#auth-avatar-guest-icon");
    const menuEmail = $("#auth-menu-email");

    if (currentUser) {
      openBtn.classList.add("hidden");
      guestIcon.classList.add("hidden");
      initial.classList.remove("hidden");
      initial.textContent = currentUser.display_name.trim().charAt(0).toUpperCase();
      menuEmail.textContent = currentUser.email;
    } else {
      openBtn.classList.remove("hidden");
      initial.classList.add("hidden");
      guestIcon.classList.remove("hidden");
      menuEmail.textContent = "";
      $("#auth-menu").hidden = true;
    }
  }

  async function refreshSession() {
    try {
      const { user } = await api("/api/auth/me");
      currentUser = user;
    } catch {
      currentUser = null;
    }
    renderAuthUI();
  }

  function initAuthUI() {
    const modal = $("#auth-modal");
    const form = $("#auth-form");
    const errorEl = $("#auth-error");
    const nameField = $("#auth-field-name");
    const submitBtn = $("#auth-submit-btn");
    const tabLogin = $("#auth-tab-login");
    const tabSignup = $("#auth-tab-signup");
    let mode = "login";

    function openModal(preferredMode = "login") {
      setMode(preferredMode);
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      errorEl.classList.add("hidden");
      form.reset();
      $("#auth-email").focus();
    }
    function closeModal() {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
    function setMode(next) {
      mode = next;
      const isLogin = mode === "login";
      tabLogin.classList.toggle("bg-primary-container", isLogin);
      tabLogin.classList.toggle("text-on-surface", isLogin);
      tabLogin.classList.toggle("text-on-surface-variant", !isLogin);
      tabSignup.classList.toggle("bg-primary-container", !isLogin);
      tabSignup.classList.toggle("text-on-surface", !isLogin);
      tabSignup.classList.toggle("text-on-surface-variant", isLogin);
      nameField.classList.toggle("hidden", isLogin);
      nameField.classList.toggle("flex", !isLogin);
      submitBtn.textContent = isLogin ? "Iniciar Sesión" : "Crear Cuenta";
      errorEl.classList.add("hidden");
    }

    $("#auth-open-btn").addEventListener("click", () => openModal("login"));
    $("#auth-modal-close").addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
    tabLogin.addEventListener("click", () => setMode("login"));
    tabSignup.addEventListener("click", () => setMode("signup"));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.classList.add("hidden");
      submitBtn.disabled = true;
      const fd = new FormData(form);
      const payload = {
        email: fd.get("email"),
        password: fd.get("password"),
      };
      if (mode === "signup") payload.displayName = fd.get("displayName");

      try {
        const { user } = await api(`/api/auth/${mode === "login" ? "login" : "signup"}`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        currentUser = user;
        renderAuthUI();
        closeModal();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove("hidden");
      } finally {
        submitBtn.disabled = false;
      }
    });

    // Avatar + menú
    const avatarBtn = $("#auth-avatar-btn");
    const menu = $("#auth-menu");
    avatarBtn.addEventListener("click", () => {
      if (!currentUser) return openModal("login");
      menu.hidden = !menu.hidden;
    });
    document.addEventListener("click", (e) => {
      if (!menu.hidden && !$("#auth-avatar-wrap").contains(e.target)) menu.hidden = true;
    });
    $("#auth-logout-btn").addEventListener("click", async () => {
      await api("/api/auth/logout", { method: "POST" });
      currentUser = null;
      menu.hidden = true;
      renderAuthUI();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  // ---------------------------------------------------------------------
  // Modal de detalle de reseña
  // ---------------------------------------------------------------------
  function ratingBadge(series) {
    if (series.rating == null) return "";
    return `<span class="text-tertiary font-bold flex items-center gap-0.5"><span class="material-symbols-outlined text-[14px]">star</span> ${series.rating.toFixed(1)}</span>`;
  }

  function detailHTML(series) {
    const emoji = COUNTRY_EMOJI[series.country] || "🌏";
    const trailer = series.trailer
      ? `<div class="aspect-video w-full bg-surface-container-lowest rounded-xl overflow-hidden mt-space-md"><iframe allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen class="w-full h-full" loading="lazy" src="${series.trailer}" title="${series.title} — tráiler"></iframe></div>`
      : "";
    return `
      <div class="w-full aspect-video bg-cover bg-center rounded-t-2xl" style="background-image:url('${series.poster}')"></div>
      <div class="p-space-lg flex flex-col gap-space-sm">
        <div class="flex flex-wrap items-center gap-space-xs font-label-badge text-label-badge text-on-surface-variant">
          <span>${emoji} ${series.countryLabel}</span>
          <span class="w-1 h-1 rounded-full bg-outline"></span>
          <span>${series.genre}</span>
          <span class="w-1 h-1 rounded-full bg-outline"></span>
          <span>${series.year}</span>
          ${series.meta ? `<span class="w-1 h-1 rounded-full bg-outline"></span><span>${series.meta}</span>` : ""}
          ${ratingBadge(series)}
        </div>
        <h2 class="font-headline-lg text-headline-lg font-bold text-on-surface">${series.title}</h2>
        <p class="font-body-md text-body-md text-on-surface-variant leading-relaxed">${series.synopsis}</p>
        <a class="mt-2 inline-flex w-fit items-center gap-1.5 px-space-lg py-space-sm rounded-full bg-gradient-to-r from-primary-container to-secondary-container text-on-surface font-headline-sm text-headline-sm font-bold shadow-[0_0_20px_rgba(255,80,112,0.4)]" href="${series.watchUrl}" rel="nofollow sponsored noopener" target="_blank"><span class="material-symbols-outlined text-[20px]">search</span> Ver Dónde Verla</a>
        ${trailer}
      </div>`;
  }

  function initDetailModal() {
    const modal = $("#detail-modal");
    const content = $("#detail-modal-content");

    async function openDetail(slug) {
      content.innerHTML = `<div class="p-space-xl text-center font-body-md text-on-surface-variant">Cargando…</div>`;
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      try {
        const { series } = await api(`/api/series/${encodeURIComponent(slug)}`);
        content.innerHTML = detailHTML(series);
      } catch (err) {
        content.innerHTML = `<div class="p-space-xl text-center font-body-md text-error">${err.message}</div>`;
      }
    }
    function closeDetail() {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }

    $("#detail-modal-close").addEventListener("click", closeDetail);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeDetail();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDetail();
    });

    // Delegación global: cualquier .series-card (presente o futura) abre el detalle,
    // salvo que el clic haya sido sobre un enlace propio (p.ej. "Ver Dónde Verla").
    document.addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (link) return; // deja que los enlaces reales (JustWatch, etc.) funcionen normal
      const card = e.target.closest("[data-slug]");
      if (card) openDetail(card.dataset.slug);
    });

    window.doramalatOpenDetail = openDetail;
  }

  // ---------------------------------------------------------------------
  // Buscador
  // ---------------------------------------------------------------------
  function resultItemHTML(item) {
    const rating = item.rating != null ? `★ ${item.rating.toFixed(1)} · ` : "";
    return `
      <button class="search-result-item flex items-center gap-space-sm p-space-xs rounded-lg hover:bg-surface-variant text-left w-full" data-slug="${item.slug}" type="button">
        <div class="w-10 h-14 shrink-0 rounded bg-cover bg-center" style="background-image:url('${item.poster}')"></div>
        <div class="min-w-0 flex flex-col">
          <span class="font-label-lg text-label-lg font-semibold text-on-surface truncate">${item.title}</span>
          <span class="font-label-badge text-label-badge text-on-surface-variant">${rating}${item.genre} · ${item.year}</span>
        </div>
      </button>`;
  }

  function initSearch() {
    const input = $("#search-input");
    const panel = $("#search-results");
    let debounceTimer = null;

    function hidePanel() {
      panel.hidden = true;
      panel.innerHTML = "";
    }

    async function runSearch(q) {
      if (!q.trim()) return hidePanel();
      try {
        const { results } = await api(`/api/series?q=${encodeURIComponent(q)}&limit=8`);
        panel.innerHTML = results.length
          ? results.map(resultItemHTML).join("")
          : `<p class="p-space-sm font-body-sm text-body-sm text-on-surface-variant">Sin resultados para "${q}".</p>`;
        panel.hidden = false;
      } catch {
        panel.innerHTML = `<p class="p-space-sm font-body-sm text-body-sm text-error">No se pudo buscar. Intenta de nuevo.</p>`;
        panel.hidden = false;
      }
    }

    input.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      const q = input.value;
      debounceTimer = setTimeout(() => runSearch(q), 250);
    });
    input.addEventListener("focus", () => {
      if (input.value.trim()) panel.hidden = false;
    });
    document.addEventListener("click", (e) => {
      if (!$("#search-wrap").contains(e.target)) hidePanel();
    });
    panel.addEventListener("click", (e) => {
      const item = e.target.closest("[data-slug]");
      if (item) {
        hidePanel();
        input.value = "";
        window.doramalatOpenDetail(item.dataset.slug);
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hidePanel();
    });
  }

  // ---------------------------------------------------------------------
  // Filtro por género / país (sección "Explora por Géneros & Países")
  // ---------------------------------------------------------------------
  function filterCardHTML(item) {
    const rating = item.rating != null ? `<span class="font-label-badge text-label-badge text-primary flex items-center gap-0.5"><span class="material-symbols-outlined text-[11px]">star</span> ${item.rating.toFixed(1)} · ${item.year}</span>` : `<span class="font-label-badge text-label-badge text-on-surface-variant">${item.year}</span>`;
    return `
      <div class="group flex flex-col rounded-xl overflow-hidden bg-surface-container shadow-md hover:-translate-y-1 transition-all cursor-pointer series-card" data-slug="${item.slug}">
        <div class="relative aspect-[2/3] w-full bg-cover bg-center overflow-hidden" style="background-image:url('${item.poster}')">
          <span class="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-surface-container-high/90 text-on-surface font-label-badge text-label-badge font-bold">${item.genre}</span>
        </div>
        <div class="p-space-xs flex flex-col gap-0.5">
          ${rating}
          <h4 class="font-headline-sm text-body-sm font-semibold text-on-surface truncate group-hover:text-primary transition-colors">${item.title}</h4>
        </div>
      </div>`;
  }

  function initFilters() {
    const resultsWrap = $("#filter-results");
    const grid = $("#filter-results-grid");
    const empty = $("#filter-results-empty");
    const title = $("#filter-results-title");
    const clearBtn = $("#filter-clear-btn");
    const countryPills = $$(".country-pill");

    function setActivePill(btn) {
      countryPills.forEach((p) => {
        const active = p === btn;
        p.classList.toggle("bg-primary-container", active);
        p.classList.toggle("font-bold", active);
        p.classList.toggle("shadow-md", active);
        p.classList.toggle("bg-surface-container-high", !active);
      });
    }

    async function showResults(label, query) {
      resultsWrap.classList.remove("hidden");
      resultsWrap.classList.add("flex");
      title.textContent = label;
      grid.innerHTML = "";
      empty.classList.add("hidden");
      try {
        const { results } = await api(`/api/series?${query}&limit=18`);
        if (results.length) {
          grid.innerHTML = results.map(filterCardHTML).join("");
        } else {
          empty.classList.remove("hidden");
        }
      } catch {
        empty.textContent = "No se pudo cargar el filtro. Intenta de nuevo.";
        empty.classList.remove("hidden");
      }
      resultsWrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    countryPills.forEach((btn) => {
      btn.addEventListener("click", () => {
        setActivePill(btn);
        const label = btn.textContent.trim();
        showResults(label, `country=${encodeURIComponent(btn.dataset.country)}`);
      });
    });

    $$(".genre-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        e.preventDefault();
        countryPills.forEach((p) => p.classList.remove("bg-primary-container", "font-bold", "shadow-md"));
        const label = card.querySelector("h3").textContent.trim();
        showResults(label, `category=${encodeURIComponent(card.dataset.category)}`);
      });
    });

    clearBtn.addEventListener("click", () => {
      resultsWrap.classList.add("hidden");
      resultsWrap.classList.remove("flex");
      countryPills.forEach((p) => p.classList.remove("bg-primary-container", "font-bold", "shadow-md"));
    });
  }

  // ---------------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    initAuthUI();
    initDetailModal();
    initSearch();
    initFilters();
    refreshSession();
  });
})();
