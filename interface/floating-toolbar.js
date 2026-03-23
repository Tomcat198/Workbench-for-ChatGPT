/*
 * ChatGPT Conversation Toolkit - Toolbar and drag behavior
 */
const FLOATING_EDGE_MARGIN = 16;
const TOOLBAR_DRAG_MARGIN = 10;
const TOOLBAR_DRAG_THRESHOLD = 5;
const TOOLBAR_FALLBACK_WIDTH = 248;
const TOOLBAR_DEFAULT_TOP = 72;
const TOOLBAR_DEFAULT_RIGHT = 16;

const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);

const clampFloatingButtonPosition = (left, top, width, height) => {
  const maxLeft = Math.max(FLOATING_EDGE_MARGIN, window.innerWidth - width - FLOATING_EDGE_MARGIN);
  const maxTop = Math.max(FLOATING_EDGE_MARGIN, window.innerHeight - height - FLOATING_EDGE_MARGIN);
  return {
    left: clampValue(left, FLOATING_EDGE_MARGIN, maxLeft),
    top: clampValue(top, FLOATING_EDGE_MARGIN, maxTop),
  };
};

const getEdgePlacementDistance = (rect) => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const distances = {
    left: rect.left,
    right: viewportWidth - rect.right,
    top: rect.top,
    bottom: viewportHeight - rect.bottom,
  };

  return Object.entries(distances).reduce((closest, entry) => {
    if (!closest || entry[1] < closest[1]) {
      return entry;
    }
    return closest;
  }, null)?.[0] || "right";
};

const getSnappedFloatingButtonPlacement = (left, top, width, height) => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const clamped = clampFloatingButtonPosition(left, top, width, height);
  const rect = {
    left: clamped.left,
    top: clamped.top,
    right: clamped.left + width,
    bottom: clamped.top + height,
  };
  const edge = getEdgePlacementDistance(rect);

  if (edge === "left" || edge === "right") {
    return {
      edge,
      offset: Math.round(clampValue(clamped.top, FLOATING_EDGE_MARGIN, viewportHeight - height - FLOATING_EDGE_MARGIN)),
    };
  }

  return {
    edge,
    offset: Math.round(clampValue(clamped.left, FLOATING_EDGE_MARGIN, viewportWidth - width - FLOATING_EDGE_MARGIN)),
  };
};

const applySnappedFloatingButtonPlacement = (button, placement, savePosition = true) => {
  if (!(button instanceof HTMLElement) || !placement) {
    return;
  }

  const width = button.offsetWidth || 48;
  const height = button.offsetHeight || 48;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const verticalOffset = clampValue(
    Number(placement.offset) || FLOATING_EDGE_MARGIN,
    FLOATING_EDGE_MARGIN,
    Math.max(FLOATING_EDGE_MARGIN, viewportHeight - height - FLOATING_EDGE_MARGIN),
  );
  const horizontalOffset = clampValue(
    Number(placement.offset) || FLOATING_EDGE_MARGIN,
    FLOATING_EDGE_MARGIN,
    Math.max(FLOATING_EDGE_MARGIN, viewportWidth - width - FLOATING_EDGE_MARGIN),
  );

  button.style.transform = "";
  button.style.left = "auto";
  button.style.right = "auto";
  button.style.top = "auto";
  button.style.bottom = "auto";

  switch (placement.edge) {
    case "left":
      button.style.left = `${FLOATING_EDGE_MARGIN}px`;
      button.style.top = `${Math.round(verticalOffset)}px`;
      break;
    case "right":
      button.style.right = `${FLOATING_EDGE_MARGIN}px`;
      button.style.top = `${Math.round(verticalOffset)}px`;
      break;
    case "top":
      button.style.top = `${FLOATING_EDGE_MARGIN}px`;
      button.style.left = `${Math.round(horizontalOffset)}px`;
      break;
    case "bottom":
      button.style.bottom = `${FLOATING_EDGE_MARGIN}px`;
      button.style.left = `${Math.round(horizontalOffset)}px`;
      break;
    default:
      button.style.right = `${FLOATING_EDGE_MARGIN}px`;
      button.style.top = `${Math.round(verticalOffset)}px`;
      break;
  }

  if (savePosition) {
    const normalized = {
      edge: ["left", "right", "top", "bottom"].includes(placement.edge) ? placement.edge : "right",
      offset: Math.round(placement.edge === "left" || placement.edge === "right" ? verticalOffset : horizontalOffset),
    };
    state.minimizedButtonPositionV2 = normalized;
    saveMinimizedPositionV2(normalized);
    saveMinimizedPosition({
      edge: normalized.edge === "left" || normalized.edge === "right" ? normalized.edge : "right",
      top: normalized.edge === "left" || normalized.edge === "right" ? normalized.offset : FLOATING_EDGE_MARGIN,
    });
  }
};

const snapToEdge = (button, savePosition = true) => {
  const rect = button.getBoundingClientRect();
  const placement = getSnappedFloatingButtonPlacement(rect.left, rect.top, rect.width, rect.height);
  applySnappedFloatingButtonPlacement(button, placement, savePosition);
};

const ensureButtonVisible = (button) => {
  if (!(button instanceof HTMLElement)) {
    return;
  }

  const placement = state.minimizedButtonPositionV2 || loadMinimizedPositionV2();
  if (placement) {
    applySnappedFloatingButtonPlacement(button, placement, true);
    return;
  }

  snapToEdge(button, true);
};

const clampToolbarPosition = (left, top, width, height) => {
  const maxLeft = Math.max(TOOLBAR_DRAG_MARGIN, window.innerWidth - width - TOOLBAR_DRAG_MARGIN);
  const maxTop = Math.max(TOOLBAR_DRAG_MARGIN, window.innerHeight - height - TOOLBAR_DRAG_MARGIN);
  return {
    left: clampValue(left, TOOLBAR_DRAG_MARGIN, maxLeft),
    top: clampValue(top, TOOLBAR_DRAG_MARGIN, maxTop),
  };
};

const applyToolbarPosition = (toolbar, left, top, savePosition = false) => {
  if (!(toolbar instanceof HTMLElement)) {
    return;
  }
  const rect = toolbar.getBoundingClientRect();
  const width = rect.width || toolbar.offsetWidth || TOOLBAR_FALLBACK_WIDTH;
  const height = rect.height || toolbar.offsetHeight || 420;
  const next = clampToolbarPosition(left, top, width, height);
  toolbar.style.right = "auto";
  toolbar.style.bottom = "auto";
  toolbar.style.left = `${Math.round(next.left)}px`;
  toolbar.style.top = `${Math.round(next.top)}px`;
  toolbar.style.transform = "";

  if (savePosition) {
    state.toolbarPosition = { left: Math.round(next.left), top: Math.round(next.top) };
    saveToolbarPosition(state.toolbarPosition);
  }
};

const applyStoredToolbarPosition = (toolbar) => {
  if (!(toolbar instanceof HTMLElement)) {
    return false;
  }
  const stored = loadToolbarPosition();
  if (!stored) {
    return false;
  }
  state.toolbarPosition = stored;
  applyToolbarPosition(toolbar, stored.left, stored.top, false);
  return true;
};

const applyDefaultToolbarAnchorPosition = (toolbar) => {
  if (!(toolbar instanceof HTMLElement)) {
    return;
  }

  const rect = toolbar.getBoundingClientRect();
  const width = rect.width || toolbar.offsetWidth || TOOLBAR_FALLBACK_WIDTH;
  const left = window.innerWidth - width - TOOLBAR_DEFAULT_RIGHT;
  applyToolbarPosition(toolbar, left, TOOLBAR_DEFAULT_TOP, false);
};

const ensureToolbarVisible = () => {
  const toolbar = document.getElementById(TOOLKIT_ID);
  if (!(toolbar instanceof HTMLElement)) {
    return;
  }
  const rect = toolbar.getBoundingClientRect();
  const next = clampToolbarPosition(
    rect.left,
    rect.top,
    rect.width || toolbar.offsetWidth || TOOLBAR_FALLBACK_WIDTH,
    rect.height || toolbar.offsetHeight || 420,
  );
  applyToolbarPosition(toolbar, next.left, next.top, Boolean(state.toolbarPosition));
  if (typeof window.repositionPromptCompanion === "function") {
    window.repositionPromptCompanion();
  }
};
const setToolbarVisibility = (isVisible, options = {}) => {
  const { clearSearch = false, closeSettings = false } = options;
  const toolbar = document.getElementById(TOOLKIT_ID);
  const minimized = ensureMinimizedButton();
  if (!(toolbar instanceof HTMLElement) || !(minimized instanceof HTMLButtonElement)) {
    return;
  }

  minimized.classList.add("is-visible");

  if (isVisible) {
    toolbar.classList.remove("is-hidden");
    state.isMinimized = false;
    return;
  }

  if (clearSearch && typeof resetSearchSession === "function") {
    resetSearchSession({ reason: "panel-minimize", clearInput: true });
  }
  if (closeSettings && typeof closeSettingsModal === "function") {
    closeSettingsModal();
  }

  toolbar.classList.add("is-hidden");
  state.isMinimized = true;
};

const getToolbarLanguageOptionsMarkup = () => {
  const selectedPreference = getLanguagePreference();
  const options = [
    {
      value: TOOLKIT_LANGUAGE_AUTO,
      label: getLanguageMenuLabel(TOOLKIT_LANGUAGE_AUTO),
    },
    {
      value: "en",
      label: t("language.english"),
    },
    {
      value: "zh-CN",
      label: t("language.chinese"),
    },
  ];

  return options
    .map(
      (option) =>
        `<option value="${option.value}"${option.value === selectedPreference ? " selected" : ""}>${option.label}</option>`,
    )
    .join("");
};

const refreshMinimizedButtonLocalization = () => {
  const button = document.getElementById(MINIMIZED_ID);
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }
  button.setAttribute("aria-label", t("toolbar.expandAria"));
};

const refreshToolbarLocalization = () => {
  const toolbar = document.getElementById(TOOLKIT_ID);
  if (!(toolbar instanceof HTMLElement)) {
    refreshMinimizedButtonLocalization();
    return;
  }

  const title = toolbar.querySelector(".chatgpt-toolkit-title");
  if (title instanceof HTMLElement) {
    title.textContent = t("toolbar.title");
  }

  const subtitle = toolbar.querySelector(".chatgpt-toolkit-subtitle");
  if (subtitle instanceof HTMLElement) {
    subtitle.textContent = t("toolbar.subtitle");
  }

  const minimizeButton = toolbar.querySelector('[data-action="minimize"]');
  if (minimizeButton instanceof HTMLButtonElement) {
    minimizeButton.textContent = t("toolbar.minimize");
    minimizeButton.setAttribute("aria-label", t("toolbar.minimizeAria"));
  }

  const languageLabel = toolbar.querySelector(".chatgpt-toolkit-language-label");
  if (languageLabel instanceof HTMLElement) {
    languageLabel.textContent = t("language.label");
  }

  const languageSelect = toolbar.querySelector("#chatgpt-toolkit-language-select");
  if (languageSelect instanceof HTMLSelectElement) {
    languageSelect.innerHTML = getToolbarLanguageOptionsMarkup();
    languageSelect.value = getLanguagePreference();
    languageSelect.setAttribute("aria-label", t("language.label"));
  }

  const collapseButton = toolbar.querySelector('[data-action="collapse"]');
  if (collapseButton instanceof HTMLButtonElement) {
    collapseButton.textContent = t("toolbar.collapse");
  }

  const restoreButton = toolbar.querySelector('[data-action="restore"]');
  if (restoreButton instanceof HTMLButtonElement) {
    restoreButton.textContent = t("toolbar.restore");
  }

  const exportButton = toolbar.querySelector('[data-action="export-toggle"]');
  if (exportButton instanceof HTMLButtonElement) {
    exportButton.textContent = t("toolbar.export");
  }

  const exportJsonButton = toolbar.querySelector('[data-action="export-json"]');
  if (exportJsonButton instanceof HTMLButtonElement) {
    exportJsonButton.textContent = t("toolbar.exportJson");
  }

  const exportMarkdownButton = toolbar.querySelector('[data-action="export-markdown"]');
  if (exportMarkdownButton instanceof HTMLButtonElement) {
    exportMarkdownButton.textContent = t("toolbar.exportMarkdown");
  }

  const promptButton = toolbar.querySelector('[data-action="prompt-library"]');
  if (promptButton instanceof HTMLButtonElement) {
    promptButton.textContent = t("toolbar.promptLibrary");
  }

  const settingsButton = toolbar.querySelector('[data-action="settings"]');
  if (settingsButton instanceof HTMLButtonElement) {
    settingsButton.textContent = t("toolbar.settings");
    settingsButton.setAttribute("aria-label", t("toolbar.settingsAria"));
  }

  const searchTitle = toolbar.querySelector(".chatgpt-toolkit-search-title");
  if (searchTitle instanceof HTMLElement) {
    searchTitle.textContent = t("toolbar.searchSection");
  }

  const searchInput = toolbar.querySelector("#chatgpt-toolkit-search-input");
  if (searchInput instanceof HTMLInputElement) {
    searchInput.placeholder = t("toolbar.searchPlaceholder");
  }

  const searchButton = toolbar.querySelector('[data-action="search"]');
  if (searchButton instanceof HTMLButtonElement) {
    searchButton.textContent = t("toolbar.search");
    searchButton.title = t("toolbar.searchTitle");
  }

  const prevButton = toolbar.querySelector('[data-action="search-prev"]');
  if (prevButton instanceof HTMLButtonElement) {
    prevButton.textContent = t("toolbar.searchPrev");
    prevButton.title = t("toolbar.searchPrevTitle");
  }

  const nextButton = toolbar.querySelector('[data-action="search-next"]');
  if (nextButton instanceof HTMLButtonElement) {
    nextButton.textContent = t("toolbar.searchNext");
    nextButton.title = t("toolbar.searchNextTitle");
  }

  const tip = toolbar.querySelector(".chatgpt-toolkit-tip");
  if (tip instanceof HTMLElement) {
    tip.textContent = t("toolbar.tip");
  }

  refreshStatusLocalization();
  refreshMinimizedButtonLocalization();
  updateSearchUI();
  updateTimelineToggleButton();
};

const buildToolbar = () => {
  const container = document.createElement("section");
  container.id = TOOLKIT_ID;
  container.innerHTML = `
    <div class="chatgpt-toolkit-header">
      <strong class="chatgpt-toolkit-title">${t("toolbar.title")}</strong>
      <button type="button" class="chatgpt-toolkit-minimize" data-action="minimize" aria-label="${t("toolbar.minimizeAria")}">
        ${t("toolbar.minimize")}
      </button>
      <div class="chatgpt-toolkit-header-meta">
        <span class="chatgpt-toolkit-subtitle">${t("toolbar.subtitle")}</span>
        <label class="chatgpt-toolkit-language" for="chatgpt-toolkit-language-select">
          <span class="chatgpt-toolkit-language-label">${t("language.label")}</span>
          <select id="chatgpt-toolkit-language-select" class="chatgpt-toolkit-language-select" aria-label="${t("language.label")}">
            ${getToolbarLanguageOptionsMarkup()}
          </select>
        </label>
      </div>
    </div>
    <div class="chatgpt-toolkit-actions">
      <button type="button" class="chatgpt-toolkit-button primary" data-action="collapse">
        ${t("toolbar.collapse")}
      </button>
      <button type="button" class="chatgpt-toolkit-button secondary" data-action="restore">
        ${t("toolbar.restore")}
      </button>
      <div class="chatgpt-toolkit-export-group" data-export-group>
        <button
          type="button"
          class="chatgpt-toolkit-button secondary"
          data-action="export-toggle"
          aria-expanded="false"
          aria-controls="chatgpt-toolkit-export-menu"
        >
          ${t("toolbar.export")}
        </button>
        <div id="chatgpt-toolkit-export-menu" class="chatgpt-toolkit-export-menu" data-export-menu>
          <button type="button" class="chatgpt-toolkit-button secondary" data-action="export-json">
            ${t("toolbar.exportJson")}
          </button>
          <button type="button" class="chatgpt-toolkit-button secondary" data-action="export-markdown">
            ${t("toolbar.exportMarkdown")}
          </button>
        </div>
      </div>
      <button type="button" class="chatgpt-toolkit-button entry" data-action="prompt-library">
        ${t("toolbar.promptLibrary")}
      </button>
      <button type="button" class="chatgpt-toolkit-button entry" data-action="timeline-toggle">
        ${timelineState.visible ? t("toolbar.timelineHide") : t("toolbar.timelineShow")}
      </button>
      <button type="button" class="chatgpt-toolkit-button entry" data-action="settings" aria-label="${t("toolbar.settingsAria")}">
        ${t("toolbar.settings")}
      </button>
    </div>
    <div class="chatgpt-toolkit-search">
      <p class="chatgpt-toolkit-search-title">${t("toolbar.searchSection")}</p>
      <div class="chatgpt-toolkit-search-row">
        <input type="text" id="chatgpt-toolkit-search-input" class="chatgpt-toolkit-search-input" placeholder="${t("toolbar.searchPlaceholder")}" />
        <button type="button" class="chatgpt-toolkit-search-btn" data-action="search" title="${t("toolbar.searchTitle")}">${t("toolbar.search")}</button>
      </div>
      <div class="chatgpt-toolkit-search-nav">
        <button type="button" id="chatgpt-toolkit-search-prev" class="chatgpt-toolkit-nav-btn" data-action="search-prev" disabled title="${t("toolbar.searchPrevTitle")}">${t("toolbar.searchPrev")}</button>
        <span id="chatgpt-toolkit-search-result" class="chatgpt-toolkit-search-result"></span>
        <button type="button" id="chatgpt-toolkit-search-next" class="chatgpt-toolkit-nav-btn" data-action="search-next" disabled title="${t("toolbar.searchNextTitle")}">${t("toolbar.searchNext")}</button>
      </div>
    </div>
    <p id="${STATUS_ID}" class="chatgpt-toolkit-status" data-tone="info">${t("toolbar.ready")}</p>
    <p class="chatgpt-toolkit-tip">${t("toolbar.tip")}</p>
  `;
  let isExportMenuOpen = false;
  const setExportMenuOpen = (open) => {
    const next = Boolean(open);
    isExportMenuOpen = next;
    const menu = container.querySelector("[data-export-menu]");
    const toggle = container.querySelector('[data-action="export-toggle"]');
    if (menu instanceof HTMLElement) {
      menu.classList.toggle("is-open", next);
    }
    if (toggle instanceof HTMLButtonElement) {
      toggle.setAttribute("aria-expanded", next ? "true" : "false");
    }
  };

  container.addEventListener("click", (event) => {
    const target = event.target;
    const inExportGroup = target instanceof Element && target.closest("[data-export-group]");
    if (isExportMenuOpen && !inExportGroup) {
      setExportMenuOpen(false);
    }

    const actionTarget =
      target instanceof Element
        ? target.closest("[data-action]")
        : target instanceof Node && target.parentElement
          ? target.parentElement.closest("[data-action]")
          : null;

    if (!(actionTarget instanceof HTMLElement)) {
      return;
    }
    const action = actionTarget.dataset.action;
    if (!action) {
      return;
    }

    const actionHandlers = {
      minimize: () => minimizeToolbar(),
      collapse: () => collapseOldMessages(),
      restore: () => restoreMessages(),
      "export-toggle": () => setExportMenuOpen(!isExportMenuOpen),
      "export-json": () => {
        exportMessages();
        setExportMenuOpen(false);
      },
      "export-markdown": () => {
        exportMessagesAsMarkdown();
        setExportMenuOpen(false);
      },
      "prompt-library": () => void openPromptModal(),
      "timeline-toggle": () => toggleTimelineVisibility(),
      settings: () => { if (typeof openSettingsModal === "function") openSettingsModal(); },
      search: () => {
        const input = document.getElementById('chatgpt-toolkit-search-input');
        if (input) performSearch(input.value);
      },
      "search-prev": () => navigateToPrevMatch(),
      "search-next": () => navigateToNextMatch(),
    };

    const handler = actionHandlers[action];
    if (handler) handler();
  });

  // 监听搜索输入框的回车事件
  container.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target.id === 'chatgpt-toolkit-search-input' && event.key === 'Enter') {
      performSearch(target.value);
    }
  });

  container.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || target.id !== "chatgpt-toolkit-language-select") {
      return;
    }
    setLanguagePreference(target.value, { persist: true, refresh: true });
  });

  return container;
};

const buildMinimizedButton = () => {
  const button = document.createElement("button");
  button.id = MINIMIZED_ID;
  button.type = "button";
  button.className = "chatgpt-toolkit-minimized";
  button.setAttribute("aria-label", t("toolbar.expandAria"));

  const primaryIconUrl = chrome.runtime.getURL("image/icon_48.png");
  const fallbackIconUrl = chrome.runtime.getURL("image/icon_32.png");

  const icon = document.createElement("img");
  icon.className = "chatgpt-toolkit-minimized-icon";
  icon.src = primaryIconUrl;
  icon.alt = "";
  icon.setAttribute("aria-hidden", "true");
  icon.decoding = "async";
  icon.draggable = false;
  icon.addEventListener("error", () => {
    if (icon.src !== fallbackIconUrl) {
      icon.src = fallbackIconUrl;
    }
  });

  button.appendChild(icon);
  return button;
};

const applyMinimizedPosition = (button) => {
  const position = loadMinimizedPositionV2();
  if (!position) {
    snapToEdge(button, true);
    return;
  }

  state.minimizedButtonPositionV2 = position;
  applySnappedFloatingButtonPlacement(button, position, true);
};

const ensureMinimizedButton = () => {
  const existingButton = document.getElementById(MINIMIZED_ID);
  if (existingButton) {
    existingButton.classList.add("is-visible");
    return existingButton;
  }

  if (!document.body) {
    return null;
  }

  const button = buildMinimizedButton();
  button.classList.add("is-visible");
  document.body.appendChild(button);
  applyMinimizedPosition(button);
  enableMinimizedButtonDrag(button);
  syncToolkitTheme();
  return button;
};

const minimizeToolbar = () => {
  setToolbarVisibility(false, { clearSearch: true, closeSettings: true });
};

const expandToolbar = () => {
  setToolbarVisibility(true);
};

const toggleToolbarVisibility = () => {
  setToolbarVisibility(state.isMinimized);
};

const enableMinimizedButtonDrag = (button) => {
  const DRAG_THRESHOLD = 5; // 拖拽阈值：超过5px才判定为拖拽
  let isDragging = false;
  let moved = false;
  let suppressClick = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  let pendingLeft = 0;
  let pendingTop = 0;
  let buttonWidth = 48;
  let buttonHeight = 48;
  const baseTransform = "";

  const dragController = createRafDragController(({ translateX, translateY }) => {
    applyDragTransform(button, translateX, translateY, baseTransform);
  });

  const onPointerMove = (event) => {
    if (!isDragging) {
      return;
    }

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    // 只有超过阈值才判定为拖拽
    if (!moved) {
      const distanceSquared = deltaX * deltaX + deltaY * deltaY;
      if (distanceSquared < DRAG_THRESHOLD * DRAG_THRESHOLD) {
        return; // 未超过阈值，不算拖拽
      }
      moved = true; // 超过阈值，标记为拖拽
      suppressClick = true;
      minimizedButtonState.dragging = true;
      button.classList.add("is-dragging");
      button.style.willChange = "transform";
      button.style.pointerEvents = "none";
      document.documentElement.style.userSelect = "none";
    }

    const nextPosition = clampFloatingButtonPosition(
      startLeft + deltaX,
      startTop + deltaY,
      buttonWidth,
      buttonHeight
    );
    pendingLeft = nextPosition.left;
    pendingTop = nextPosition.top;
    dragController.schedule({
      translateX: nextPosition.left - startLeft,
      translateY: nextPosition.top - startTop,
    });
  };

  const onPointerUp = () => {
    if (!isDragging) {
      return;
    }
    isDragging = false;
    minimizedButtonState.pointerDown = false;
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerUp);
    dragController.cancel();
    minimizedButtonState.dragging = false;
    button.classList.remove("is-pointer-down");
    button.classList.remove("is-dragging");
    button.style.willChange = "";
    button.style.pointerEvents = "";
    document.documentElement.style.userSelect = "";

    // 只有实际拖动了才贴合边缘
    if (moved) {
      applySnappedFloatingButtonPlacement(
        button,
        getSnappedFloatingButtonPlacement(pendingLeft, pendingTop, buttonWidth, buttonHeight),
        true
      );
    } else {
      resetDragTransform(button, baseTransform);
    }

    setTimeout(() => {
      moved = false;
      suppressClick = false;
    }, 0);
  };

  button.style.touchAction = "none";
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    isDragging = true;
    minimizedButtonState.pointerDown = true;
    moved = false;
    button.classList.add("is-pointer-down");
    const rect = button.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    pendingLeft = rect.left;
    pendingTop = rect.top;
    buttonWidth = rect.width || button.offsetWidth || 48;
    buttonHeight = rect.height || button.offsetHeight || 48;
    startX = event.clientX;
    startY = event.clientY;
    resetDragTransform(button, baseTransform);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
  });

  button.addEventListener("click", () => {
    if (moved || suppressClick) {
      suppressClick = false;
      return;
    }
    toggleToolbarVisibility();
  });
};

const enableToolbarDrag = (toolbar) => {
  if (!(toolbar instanceof HTMLElement) || toolbar.dataset.dragEnabled === "1") {
    return;
  }

  const header = toolbar.querySelector(".chatgpt-toolkit-header");
  if (!(header instanceof HTMLElement)) {
    return;
  }

  toolbar.dataset.dragEnabled = "1";
  let isDragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  let pendingLeft = 0;
  let pendingTop = 0;
  let dragBounds = null;
  let baseTransform = "";

  const dragController = createRafDragController(({ translateX, translateY, transform }) => {
    applyDragTransform(toolbar, translateX, translateY, transform);
  });

  const onPointerMove = (event) => {
    if (!isDragging) {
      return;
    }

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    if (!moved) {
      const distanceSquared = deltaX * deltaX + deltaY * deltaY;
      if (distanceSquared < TOOLBAR_DRAG_THRESHOLD * TOOLBAR_DRAG_THRESHOLD) {
        return;
      }
      moved = true;
      toolbarDragState.dragging = true;
      toolbar.classList.add("is-dragging");
      toolbar.style.willChange = "transform";
      document.documentElement.style.userSelect = "none";
    }

    if (!dragBounds) {
      return;
    }

    const nextLeft = clampValue(startLeft + deltaX, TOOLBAR_DRAG_MARGIN, dragBounds.maxLeft);
    const nextTop = clampValue(startTop + deltaY, TOOLBAR_DRAG_MARGIN, dragBounds.maxTop);
    pendingLeft = nextLeft;
    pendingTop = nextTop;

    dragController.schedule({
      translateX: nextLeft - startLeft,
      translateY: nextTop - startTop,
      transform: baseTransform,
    });
  };

  const stopDragging = () => {
    if (!isDragging) {
      return;
    }

    isDragging = false;
    toolbarDragState.pointerDown = false;
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", stopDragging);
    document.removeEventListener("pointercancel", stopDragging);
    dragController.cancel();

    if (moved) {
      applyToolbarPosition(toolbar, pendingLeft, pendingTop, true);
    } else {
      resetDragTransform(toolbar, baseTransform);
    }
    if (typeof window.repositionPromptCompanion === "function") {
      window.repositionPromptCompanion();
    }

    toolbarDragState.dragging = false;
    toolbar.classList.remove("is-dragging");
    toolbar.style.willChange = "";
    document.documentElement.style.userSelect = "";
    dragBounds = null;
    baseTransform = "";
    moved = false;
  };

  header.style.touchAction = "none";
  header.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (event.button !== 0 || (target instanceof Element && target.closest("button, input, select, textarea, a"))) {
      return;
    }

    event.preventDefault();
    const rect = toolbar.getBoundingClientRect();
    const width = rect.width || toolbar.offsetWidth || TOOLBAR_FALLBACK_WIDTH;
    const height = rect.height || toolbar.offsetHeight || 420;

    dragBounds = {
      maxLeft: Math.max(TOOLBAR_DRAG_MARGIN, window.innerWidth - width - TOOLBAR_DRAG_MARGIN),
      maxTop: Math.max(TOOLBAR_DRAG_MARGIN, window.innerHeight - height - TOOLBAR_DRAG_MARGIN),
    };

    isDragging = true;
    toolbarDragState.pointerDown = true;
    startX = event.clientX;
    startY = event.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    pendingLeft = rect.left;
    pendingTop = rect.top;
    moved = false;

    baseTransform = toolbar.style.transform && toolbar.style.transform !== "none"
      ? toolbar.style.transform
      : "";
    resetDragTransform(toolbar, baseTransform);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", stopDragging);
    document.addEventListener("pointercancel", stopDragging);
  });
};
const attachToolbar = () => {
  if (document.getElementById(TOOLKIT_ID)) {
    return;
  }
  if (!document.body) {
    return;
  }
  observeThemeOnBodyIfNeeded();
  const toolbar = buildToolbar();
  document.body.appendChild(toolbar);
  const hasStoredPosition = applyStoredToolbarPosition(toolbar);
  if (!hasStoredPosition) {
    applyDefaultToolbarAnchorPosition(toolbar);
  }
  enableToolbarDrag(toolbar);
  updateStatusByKey("toolbar.ready", "info");
  updateTimelineToggleButton();
  ensureMinimizedButton();
  refreshToolbarLocalization();
  syncToolkitTheme();
};

// 标志位：避免重复添加 resize 监听器
