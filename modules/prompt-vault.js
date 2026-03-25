/*
 * ChatGPT Conversation Toolkit - Prompt library
 */
// ============ Prompt Library ============

const createPromptId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const toSafeText = (value) => (typeof value === "string" ? value.trim() : "");
const normalizeCategory = (value) => toSafeText(value) || t("prompt.uncategorized");

const getPromptStorageArea = () => getExtensionStorageArea();

const buildPromptStoragePayload = (items) => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  prompts: items,
});

const normalizePromptItem = (raw) => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const content = toSafeText(raw.content ?? raw.text);
  if (!content) {
    return null;
  }

  const singleLineContent = content.replace(/\s+/g, " ").trim();
  const title = toSafeText(raw.title) || singleLineContent.slice(0, 24) || t("prompt.untitled");
  const category = normalizeCategory(raw.category);
  const createdAt = Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now();
  const updatedAt = Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : createdAt;
  const id = toSafeText(raw.id) || createPromptId();

  return {
    id,
    title,
    category,
    content,
    createdAt,
    updatedAt,
  };
};

const extractPromptItems = (payload) => {
  const source = Array.isArray(payload)
    ? payload
    : payload && Array.isArray(payload.prompts)
      ? payload.prompts
      : [];

  return source
    .map((item) => normalizePromptItem(item))
    .filter(Boolean);
};

const readPromptPayloadFromLocal = () => {
  let raw = null;
  try {
    raw = localStorage.getItem(PROMPT_LOCAL_FALLBACK_KEY);
  } catch (error) {
    return null;
  }

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

const writePromptPayloadToLocal = (payload) => {
  try {
    localStorage.setItem(PROMPT_LOCAL_FALLBACK_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    return false;
  }
};

const readPromptPayload = async () => {
  const storage = getPromptStorageArea();
  if (storage) {
    return new Promise((resolve) => {
      storage.get([PROMPT_STORAGE_KEY], (result) => {
        if (chrome?.runtime?.lastError) {
          resolve(readPromptPayloadFromLocal());
          return;
        }
        const payload = result?.[PROMPT_STORAGE_KEY];
        if (payload !== undefined && payload !== null) {
          resolve(payload);
          return;
        }
        resolve(readPromptPayloadFromLocal());
      });
    });
  }

  return readPromptPayloadFromLocal();
};

const writePromptPayload = async (payload) => {
  const storage = getPromptStorageArea();
  if (storage) {
    const hasError = await new Promise((resolve) => {
      storage.set({ [PROMPT_STORAGE_KEY]: payload }, () => {
        resolve(Boolean(chrome?.runtime?.lastError));
      });
    });
    if (!hasError) {
      return;
    }
  }
  const saved = writePromptPayloadToLocal(payload);
  if (!saved) {
    console.warn("[ChatGPT Toolkit] Failed to persist prompt library.");
  }
};

const compareText = (left, right) =>
  left.localeCompare(right, getCurrentLanguage() === "zh-CN" ? "zh-CN" : "en", {
    sensitivity: "base",
  });

const DEFAULT_PROMPT_SEED_ITEMS = [
  {
    title: "专业润色与改写",
    category: "写作",
    content: `你是一名专业写作助手。请对我提供的内容进行优化，要求如下：
1. 保留原意，不要随意增加未经说明的信息；
2. 提升语言流畅度、逻辑性和表达准确性；
3. 根据我的目标调整语气，可选：正式 / 自然 / 简洁 / 有说服力；
4. 如原文存在错别字、病句、重复表达，请一并修正；
5. 输出两个版本：
   - 优化版
   - 更简洁版
6. 最后用一句话说明你主要做了哪些修改。

待优化内容：
{{在这里粘贴原文}}`,
  },
  {
    title: "长文本总结提炼",
    category: "总结",
    content: `你是一名信息整理助手。请对我提供的文本进行结构化总结，要求如下：
1. 提炼核心主题；
2. 用简洁语言概括主要内容；
3. 列出 3-5 个关键要点；
4. 如果文本中包含结论、建议或行动项，请单独列出；
5. 输出格式清晰，适合快速阅读；
6. 不要遗漏重要信息，也不要加入原文没有的内容。

请按以下格式输出：
- 主题：
- 一句话总结：
- 关键要点：
- 结论 / 建议 / 行动项：

待总结文本：
{{在这里粘贴文本}}`,
  },
  {
    title: "问题分析与解决方案",
    category: "分析",
    content: `你是一名擅长分析问题和制定方案的助手。针对我提出的问题，请按以下步骤回答：
1. 先明确问题本质；
2. 分析可能原因；
3. 给出可执行的解决方案；
4. 按“优先级高 / 中 / 低”排序；
5. 如果有风险点或常见误区，请额外提醒；
6. 输出尽量具体，不要只讲空泛道理。

请按以下格式输出：
- 问题本质：
- 可能原因：
- 解决方案：
  - 高优先级：
  - 中优先级：
  - 低优先级：
- 风险与误区：

我的问题：
{{在这里描述问题}}`,
  },
  {
    title: "请用中文回答",
    category: "通用",
    content: `请默认使用中文回答，除非我明确要求使用其他语言。
如果涉及英文术语，请优先用中文解释，再附上对应英文。
回答时保持表达清晰、自然、易懂。`,
  },
];

const buildDefaultPromptItems = () => {
  const now = Date.now();
  return DEFAULT_PROMPT_SEED_ITEMS.map((seed, index) =>
    normalizePromptItem({
      ...seed,
      id: createPromptId(),
      createdAt: now + index,
      updatedAt: now + index,
    })
  ).filter(Boolean);
};

const PROMPT_AUTO_ATTACH_TRIGGER_EACH = "beforeSendEach";
const PROMPT_AUTO_ATTACH_SEND_DEBOUNCE_MS = 240;

const getPromptBehaviorSettings = () => {
  const source =
    promptState.behaviorSettings && typeof promptState.behaviorSettings === "object"
      ? promptState.behaviorSettings
      : DEFAULT_PROMPT_BEHAVIOR_SETTINGS;

  const clickAction = source.clickAction === "copy" ? "copy" : "insert";
  const autoAttachEnabled = Boolean(source.autoAttachEnabled);
  const autoAttachDedupEnabled =
    typeof source.autoAttachDedupEnabled === "boolean" ? source.autoAttachDedupEnabled : true;
  const autoAttachTrigger =
    source.autoAttachTrigger === PROMPT_AUTO_ATTACH_TRIGGER_EACH ||
    source.autoAttachTrigger === "beforeSendFirstInConversation"
      ? PROMPT_AUTO_ATTACH_TRIGGER_EACH
      : PROMPT_AUTO_ATTACH_TRIGGER_EACH;
  const autoAttachPromptIds = Array.isArray(source.autoAttachPromptIds)
    ? source.autoAttachPromptIds
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    : [];

  return {
    ...DEFAULT_PROMPT_BEHAVIOR_SETTINGS,
    clickAction,
    autoAttachEnabled,
    autoAttachTrigger,
    autoAttachPromptIds,
    autoAttachDedupEnabled,
  };
};

const ensurePromptBehaviorSettingsLoaded = () => {
  if (promptState.behaviorLoaded) {
    return;
  }

  if (typeof loadPromptBehaviorSettings === "function") {
    promptState.behaviorSettings = loadPromptBehaviorSettings();
  } else {
    promptState.behaviorSettings = { ...DEFAULT_PROMPT_BEHAVIOR_SETTINGS };
  }

  promptState.behaviorLoaded = true;
};

const persistPromptBehaviorSettings = () => {
  const normalized = getPromptBehaviorSettings();
  if (Array.isArray(promptState.items) && promptState.items.length > 0) {
    const validIds = new Set(promptState.items.map((item) => item.id));
    normalized.autoAttachPromptIds = normalized.autoAttachPromptIds.filter((id) => validIds.has(id));
  }
  promptState.behaviorSettings = normalized;
  if (typeof savePromptBehaviorSettings === "function") {
    savePromptBehaviorSettings(normalized);
  }
};

const applyPromptFilters = () => {
  const keyword = promptState.searchText.trim().toLowerCase();
  let result = [...promptState.items];

  if (keyword) {
    result = result.filter((item) =>
      `${item.title} ${item.category} ${item.content}`.toLowerCase().includes(keyword)
    );
  }

  if (promptState.category !== "all") {
    result = result.filter((item) => item.category === promptState.category);
  }

  result.sort((a, b) => b.updatedAt - a.updatedAt);

  promptState.filteredItems = result;
  if (!result.some((item) => item.id === promptState.selectedId)) {
    promptState.selectedId = result.length > 0 ? result[0].id : null;
  }
};

const savePromptItems = async (items) => {
  promptState.items = items;
  applyPromptFilters();
  await writePromptPayload(buildPromptStoragePayload(items));
};

const ensurePromptLibraryLoaded = async () => {
  if (promptState.loaded) {
    return;
  }

  const payload = await readPromptPayload();
  const items = extractPromptItems(payload);
  if (items.length === 0) {
    promptState.items = buildDefaultPromptItems();
    await writePromptPayload(buildPromptStoragePayload(promptState.items));
  } else {
    promptState.items = items;
  }

  promptState.loaded = true;
  applyPromptFilters();
};

const getPromptModalElements = () => {
  const modal = document.getElementById(PROMPT_MODAL_ID);
  if (!modal) {
    return null;
  }

  return {
    modal,
    toast: modal.querySelector(`#${PROMPT_TOAST_ID}`),
    searchInput: modal.querySelector("#chatgpt-toolkit-prompt-search"),
    categorySelect: modal.querySelector("#chatgpt-toolkit-prompt-category-filter"),
    settingsToggle: modal.querySelector('[data-prompt-action="open-settings"]'),
    behaviorPanel: modal.querySelector("#chatgpt-toolkit-prompt-behavior-panel"),
    clickInsertRadio: modal.querySelector('input[name="chatgpt-toolkit-prompt-click-action"][value="insert"]'),
    clickCopyRadio: modal.querySelector('input[name="chatgpt-toolkit-prompt-click-action"][value="copy"]'),
    autoAttachEnabledInput: modal.querySelector("#chatgpt-toolkit-prompt-auto-attach-enabled"),
    autoAttachDedupInput: modal.querySelector("#chatgpt-toolkit-prompt-auto-attach-dedup"),
    autoAttachList: modal.querySelector("#chatgpt-toolkit-prompt-auto-attach-list"),
    listContainer: modal.querySelector("#chatgpt-toolkit-prompt-list"),
    emptyTip: modal.querySelector("#chatgpt-toolkit-prompt-empty"),
    countLabel: modal.querySelector("#chatgpt-toolkit-prompt-count"),
    addTitle: modal.querySelector("#chatgpt-toolkit-prompt-add-title"),
    addCategory: modal.querySelector("#chatgpt-toolkit-prompt-add-category"),
    addContent: modal.querySelector("#chatgpt-toolkit-prompt-add-content"),
    fileInput: modal.querySelector(`#${PROMPT_FILE_INPUT_ID}`),
  };
};

const PROMPT_COMPANION_GAP = 8;
const PROMPT_COMPANION_MARGIN = 16;
const PROMPT_COMPANION_MIN_HEIGHT = 260;
const PROMPT_COMPANION_DRAG_MARGIN = 10;
const PROMPT_COMPANION_DRAG_THRESHOLD = 5;
const PROMPT_COMPANION_DEFAULT_WIDTH = 248;
const PROMPT_POSITION_MODE_ANCHORED = "anchored";
const PROMPT_POSITION_MODE_MANUAL = "manual";

let promptCompanionOutsideClickBound = false;
let promptCompanionResizeBound = false;
let promptSettingsOutsidePointerBound = false;
let promptAutoAttachListenersBound = false;
const PROMPT_SETTINGS_POPOVER_VIEWPORT_MARGIN = 10;
const PROMPT_SETTINGS_POPOVER_GAP = 8;
const PROMPT_SETTINGS_POPOVER_MIN_WIDTH = 236;
const PROMPT_SETTINGS_POPOVER_MIN_HEIGHT = 120;
const promptDragState = {
  pointerDown: false,
  dragging: false,
};

const clampPromptCompanionValue = (value, min, max) => Math.min(Math.max(value, min), max);

const getPromptCompanionAnchorRect = () => {
  const toolbar = document.getElementById(TOOLKIT_ID);
  if (!(toolbar instanceof HTMLElement) || toolbar.classList.contains("is-hidden")) {
    return null;
  }
  return toolbar.getBoundingClientRect();
};

const applyPromptCompanionManualPosition = (left, top) => {
  const elements = getPromptModalElements();
  const modal = elements?.modal;
  if (!(modal instanceof HTMLElement)) {
    return;
  }

  const panel = modal.querySelector(".chatgpt-toolkit-prompt-panel");
  if (!(panel instanceof HTMLElement)) {
    return;
  }

  const rect = panel.getBoundingClientRect();
  const width = rect.width || panel.offsetWidth || PROMPT_COMPANION_DEFAULT_WIDTH;
  const maxLeft = Math.max(PROMPT_COMPANION_DRAG_MARGIN, window.innerWidth - width - PROMPT_COMPANION_DRAG_MARGIN);
  const nextLeft = clampPromptCompanionValue(left, PROMPT_COMPANION_DRAG_MARGIN, maxLeft);
  const maxTop = Math.max(PROMPT_COMPANION_DRAG_MARGIN, window.innerHeight - PROMPT_COMPANION_MIN_HEIGHT - PROMPT_COMPANION_DRAG_MARGIN);
  const nextTop = clampPromptCompanionValue(top, PROMPT_COMPANION_DRAG_MARGIN, maxTop);
  const nextMaxHeight = Math.max(
    180,
    window.innerHeight - Math.round(nextTop) - PROMPT_COMPANION_MARGIN,
  );

  panel.style.left = `${Math.round(nextLeft)}px`;
  panel.style.top = `${Math.round(nextTop)}px`;
  panel.style.width = `${Math.round(width)}px`;
  panel.style.maxHeight = `${Math.round(nextMaxHeight)}px`;
};

const savePromptCompanionManualPosition = (left, top) => {
  promptState.positionMode = PROMPT_POSITION_MODE_MANUAL;
  promptState.manualPosition = { left: Math.round(left), top: Math.round(top) };
  savePromptPanelPosition({
    mode: PROMPT_POSITION_MODE_MANUAL,
    left: Math.round(left),
    top: Math.round(top),
  });
};

const resetPromptCompanionToAnchor = () => {
  promptState.positionMode = PROMPT_POSITION_MODE_ANCHORED;
  promptState.manualPosition = null;
  savePromptPanelPosition(null);
  repositionPromptCompanion({ force: true });
};

const repositionPromptCompanion = (options = {}) => {
  const { force = false } = options;
  if (!force && promptState.positionMode === PROMPT_POSITION_MODE_MANUAL && promptState.manualPosition) {
    applyPromptCompanionManualPosition(promptState.manualPosition.left, promptState.manualPosition.top);
    return;
  }

  const elements = getPromptModalElements();
  const modal = elements?.modal;
  if (!(modal instanceof HTMLElement)) {
    return;
  }

  const panel = modal.querySelector(".chatgpt-toolkit-prompt-panel");
  if (!(panel instanceof HTMLElement)) {
    return;
  }

  const anchorRect = getPromptCompanionAnchorRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  if (!anchorRect) {
    return;
  }

  const panelWidth = Math.min(
    anchorRect.width || PROMPT_COMPANION_DEFAULT_WIDTH,
    Math.max(220, viewportWidth - PROMPT_COMPANION_MARGIN * 2),
  );
  const left = clampPromptCompanionValue(
    anchorRect.left,
    PROMPT_COMPANION_MARGIN,
    Math.max(PROMPT_COMPANION_MARGIN, viewportWidth - panelWidth - PROMPT_COMPANION_MARGIN),
  );

  let top = anchorRect.bottom + PROMPT_COMPANION_GAP;
  let maxHeight = viewportHeight - top - PROMPT_COMPANION_MARGIN;
  if (maxHeight < PROMPT_COMPANION_MIN_HEIGHT) {
    top = Math.max(PROMPT_COMPANION_MARGIN, viewportHeight - PROMPT_COMPANION_MARGIN - PROMPT_COMPANION_MIN_HEIGHT);
    maxHeight = viewportHeight - top - PROMPT_COMPANION_MARGIN;
  }

  panel.style.left = `${Math.round(left)}px`;
  panel.style.top = `${Math.round(top)}px`;
  panel.style.width = `${Math.round(panelWidth)}px`;
  panel.style.maxHeight = `${Math.max(180, Math.round(maxHeight))}px`;
};

if (typeof window !== "undefined") {
  window.repositionPromptCompanion = repositionPromptCompanion;
  window.resetPromptCompanionToAnchor = resetPromptCompanionToAnchor;
}

const handlePromptCompanionOutsidePointerDown = (event) => {
  if (!promptState.isOpen || promptDragState.pointerDown || promptDragState.dragging) {
    return;
  }

  const modal = document.getElementById(PROMPT_MODAL_ID);
  if (!(modal instanceof HTMLElement)) {
    return;
  }

  const panel = modal.querySelector(".chatgpt-toolkit-prompt-panel");
  if (!(panel instanceof HTMLElement)) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }

  if (panel.contains(target)) {
    return;
  }

  const toolbar = document.getElementById(TOOLKIT_ID);
  if (toolbar instanceof HTMLElement && toolbar.contains(target)) {
    return;
  }

  const triggerButton = document.querySelector(`#${TOOLKIT_ID} [data-action="prompt-library"]`);
  if (triggerButton instanceof HTMLElement && triggerButton.contains(target)) {
    return;
  }

  closePromptModal();
};

const ensurePromptCompanionGlobalListeners = () => {
  if (!promptCompanionResizeBound) {
    window.addEventListener("resize", () => {
      if (promptState.isOpen) {
        repositionPromptCompanion();
        if (promptState.settingsOpen) {
          positionPromptSettingsPopover();
        }
      }
    });
    promptCompanionResizeBound = true;
  }
};

const teardownPromptCompanionOutsideClickListener = () => {
  if (!promptCompanionOutsideClickBound) {
    return;
  }
  document.removeEventListener("pointerdown", handlePromptCompanionOutsidePointerDown, true);
  promptCompanionOutsideClickBound = false;
};

const ensurePromptBehaviorPanelHost = (modal) => {
  if (!(modal instanceof HTMLElement)) {
    return;
  }
  const panel = modal.querySelector("#chatgpt-toolkit-prompt-behavior-panel");
  if (!(panel instanceof HTMLElement)) {
    return;
  }
  if (panel.parentElement === modal) {
    return;
  }
  modal.appendChild(panel);
};

const positionPromptSettingsPopover = () => {
  const elements = getPromptModalElements();
  const toggle = elements?.settingsToggle;
  const panel = elements?.behaviorPanel;
  if (!(toggle instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
    return;
  }
  if (!promptState.settingsOpen) {
    return;
  }

  panel.style.width = "";
  panel.style.maxHeight = "";

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxViewportWidth = Math.max(
    160,
    viewportWidth - PROMPT_SETTINGS_POPOVER_VIEWPORT_MARGIN * 2,
  );
  const minReadableWidth = Math.min(PROMPT_SETTINGS_POPOVER_MIN_WIDTH, maxViewportWidth);

  const contentWidth = Math.ceil(panel.scrollWidth + 2);
  const nextWidth = Math.min(
    maxViewportWidth,
    Math.max(minReadableWidth, contentWidth),
  );

  const anchorRect = toggle.getBoundingClientRect();
  let left = anchorRect.right - nextWidth;
  const minLeft = PROMPT_SETTINGS_POPOVER_VIEWPORT_MARGIN;
  const maxLeft = Math.max(minLeft, viewportWidth - nextWidth - PROMPT_SETTINGS_POPOVER_VIEWPORT_MARGIN);
  left = clampPromptCompanionValue(left, minLeft, maxLeft);

  const belowTop = anchorRect.bottom + PROMPT_SETTINGS_POPOVER_GAP;
  const belowSpace = viewportHeight - belowTop - PROMPT_SETTINGS_POPOVER_VIEWPORT_MARGIN;
  const aboveBottom = anchorRect.top - PROMPT_SETTINGS_POPOVER_GAP;
  const aboveSpace = aboveBottom - PROMPT_SETTINGS_POPOVER_VIEWPORT_MARGIN;
  const maxViewportHeight = Math.max(
    96,
    viewportHeight - PROMPT_SETTINGS_POPOVER_VIEWPORT_MARGIN * 2,
  );

  const openAbove = aboveSpace >= PROMPT_SETTINGS_POPOVER_MIN_HEIGHT || aboveSpace > belowSpace;
  const availableHeight = Math.min(
    maxViewportHeight,
    Math.max(PROMPT_SETTINGS_POPOVER_MIN_HEIGHT, openAbove ? aboveSpace : belowSpace),
  );

  const panelNaturalHeight = Math.max(panel.scrollHeight, PROMPT_SETTINGS_POPOVER_MIN_HEIGHT);
  const panelHeight = Math.min(panelNaturalHeight, availableHeight);
  const topCandidate = openAbove
    ? Math.max(PROMPT_SETTINGS_POPOVER_VIEWPORT_MARGIN, anchorRect.top - PROMPT_SETTINGS_POPOVER_GAP - panelHeight)
    : Math.min(
        viewportHeight - PROMPT_SETTINGS_POPOVER_VIEWPORT_MARGIN - panelHeight,
        anchorRect.bottom + PROMPT_SETTINGS_POPOVER_GAP,
      );
  const minTop = PROMPT_SETTINGS_POPOVER_VIEWPORT_MARGIN;
  const maxTop = Math.max(minTop, viewportHeight - panelHeight - PROMPT_SETTINGS_POPOVER_VIEWPORT_MARGIN);
  const top = clampPromptCompanionValue(topCandidate, minTop, maxTop);

  panel.style.left = `${Math.round(left)}px`;
  panel.style.top = `${Math.round(top)}px`;
  panel.style.width = `${Math.round(nextWidth)}px`;
  panel.style.maxHeight = `${Math.round(availableHeight)}px`;
};

const setPromptSettingsOpen = (open) => {
  const next = Boolean(open);
  promptState.settingsOpen = next;

  const elements = getPromptModalElements();
  const toggle = elements?.settingsToggle;
  const panel = elements?.behaviorPanel;

  if (toggle instanceof HTMLButtonElement) {
    toggle.setAttribute("aria-expanded", next ? "true" : "false");
  }
  if (panel instanceof HTMLElement) {
    panel.classList.toggle("is-open", next);
    if (next) {
      requestAnimationFrame(() => {
        positionPromptSettingsPopover();
      });
    } else {
      panel.style.left = "";
      panel.style.top = "";
      panel.style.width = "";
      panel.style.maxHeight = "";
    }
  }
};

const handlePromptSettingsOutsidePointerDown = (event) => {
  if (!promptState.isOpen || !promptState.settingsOpen) {
    return;
  }

  const modal = document.getElementById(PROMPT_MODAL_ID);
  if (!(modal instanceof HTMLElement)) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }

  const behaviorPanel = modal.querySelector("#chatgpt-toolkit-prompt-behavior-panel");
  const settingsToggle = modal.querySelector('[data-prompt-action="open-settings"]');
  if (behaviorPanel instanceof HTMLElement && behaviorPanel.contains(target)) {
    return;
  }
  if (settingsToggle instanceof HTMLElement && settingsToggle.contains(target)) {
    return;
  }

  setPromptSettingsOpen(false);
};

const ensurePromptSettingsOutsidePointerListener = () => {
  if (promptSettingsOutsidePointerBound) {
    return;
  }
  document.addEventListener("pointerdown", handlePromptSettingsOutsidePointerDown, true);
  promptSettingsOutsidePointerBound = true;
};

const enablePromptCompanionDrag = () => {
  const elements = getPromptModalElements();
  const modal = elements?.modal;
  if (!(modal instanceof HTMLElement)) {
    return;
  }
  if (modal.dataset.dragEnabled === "1") {
    return;
  }

  const panel = modal.querySelector(".chatgpt-toolkit-prompt-panel");
  const header = modal.querySelector(".chatgpt-toolkit-prompt-header");
  if (!(panel instanceof HTMLElement) || !(header instanceof HTMLElement)) {
    return;
  }

  modal.dataset.dragEnabled = "1";
  let isDragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  const onPointerMove = (event) => {
    if (!isDragging) {
      return;
    }
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (!moved) {
      const distanceSquared = deltaX * deltaX + deltaY * deltaY;
      if (distanceSquared < PROMPT_COMPANION_DRAG_THRESHOLD * PROMPT_COMPANION_DRAG_THRESHOLD) {
        return;
      }
      moved = true;
      promptDragState.dragging = true;
      panel.classList.add("is-dragging");
      panel.style.willChange = "left, top";
      document.documentElement.style.userSelect = "none";
    }
    applyPromptCompanionManualPosition(startLeft + deltaX, startTop + deltaY);
  };

  const stopDragging = () => {
    if (!isDragging) {
      return;
    }
    isDragging = false;
    promptDragState.pointerDown = false;
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", stopDragging);
    document.removeEventListener("pointercancel", stopDragging);
    panel.classList.remove("is-dragging");
    panel.style.willChange = "";
    document.documentElement.style.userSelect = "";

    if (moved) {
      const rect = panel.getBoundingClientRect();
      savePromptCompanionManualPosition(rect.left, rect.top);
      if (promptState.settingsOpen) {
        positionPromptSettingsPopover();
      }
    }

    promptDragState.dragging = false;
    moved = false;
  };

  header.style.touchAction = "none";
  header.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (
      event.button !== 0 ||
      (target instanceof Element && target.closest("button, input, select, textarea, a"))
    ) {
      return;
    }

    event.preventDefault();
    const rect = panel.getBoundingClientRect();
    startX = event.clientX;
    startY = event.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    moved = false;
    isDragging = true;
    promptDragState.pointerDown = true;
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", stopDragging);
    document.addEventListener("pointercancel", stopDragging);
  });
};

const restorePromptCompanionPosition = () => {
  const stored = loadPromptPanelPosition();
  if (stored?.mode === PROMPT_POSITION_MODE_MANUAL) {
    promptState.positionMode = PROMPT_POSITION_MODE_MANUAL;
    promptState.manualPosition = { left: stored.left, top: stored.top };
    applyPromptCompanionManualPosition(stored.left, stored.top);
    return;
  }

  promptState.positionMode = PROMPT_POSITION_MODE_ANCHORED;
  promptState.manualPosition = null;
  repositionPromptCompanion({ force: true });
};

const hidePromptToast = () => {
  const elements = getPromptModalElements();
  const toast = elements?.toast;
  if (!(toast instanceof HTMLElement)) {
    return;
  }
  toast.classList.remove("is-visible");
  toast.textContent = "";
  delete toast.dataset.i18nKey;
  delete toast.dataset.i18nParams;
};

const showPromptToast = (message, tone = "success") => {
  const elements = getPromptModalElements();
  const toast = elements?.toast;
  if (!(toast instanceof HTMLElement)) {
    return;
  }

  if (promptToastTimer) {
    clearTimeout(promptToastTimer);
  }

  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.classList.add("is-visible");

  promptToastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
    promptToastTimer = null;
  }, 1600);
};

const showPromptToastByKey = (key, tone = "success", params = {}) => {
  const elements = getPromptModalElements();
  const toast = elements?.toast;
  if (!(toast instanceof HTMLElement)) {
    return;
  }

  toast.dataset.i18nKey = key;
  toast.dataset.i18nParams = JSON.stringify(params);
  showPromptToast(t(key, params), tone);
};

const refreshPromptToastLocalization = () => {
  const elements = getPromptModalElements();
  const toast = elements?.toast;
  if (!(toast instanceof HTMLElement)) {
    return;
  }

  const key = toast.dataset.i18nKey;
  if (!key) {
    return;
  }

  let params = {};
  try {
    params = toast.dataset.i18nParams ? JSON.parse(toast.dataset.i18nParams) : {};
  } catch (error) {
    params = {};
  }

  toast.textContent = t(key, params);
};

const renderPromptCategoryOptions = (categorySelect) => {
  if (!(categorySelect instanceof HTMLSelectElement)) {
    return;
  }

  const categories = Array.from(new Set(promptState.items.map((item) => item.category)))
    .filter(Boolean)
    .sort((a, b) => compareText(a, b));

  categorySelect.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = t("prompt.allCategories");
  categorySelect.appendChild(allOption);

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });

  if (promptState.category !== "all" && !categories.includes(promptState.category)) {
    promptState.category = "all";
    applyPromptFilters();
  }

  categorySelect.value = promptState.category;
};

const formatPromptTime = (timestamp) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString(getCurrentLanguage() === "zh-CN" ? "zh-CN" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const buildPromptHighlightFragment = (text, keyword) => {
  const source = typeof text === "string" ? text : String(text ?? "");
  const query = typeof keyword === "string" ? keyword.trim() : "";
  const fragment = document.createDocumentFragment();

  if (!query) {
    fragment.appendChild(document.createTextNode(source));
    return fragment;
  }

  const sourceLower = source.toLocaleLowerCase();
  const queryLower = query.toLocaleLowerCase();
  const matchLength = query.length;
  let cursor = 0;
  let matchIndex = sourceLower.indexOf(queryLower, cursor);

  while (matchIndex >= 0) {
    if (matchIndex > cursor) {
      fragment.appendChild(document.createTextNode(source.slice(cursor, matchIndex)));
    }

    const mark = document.createElement("mark");
    mark.className = "chatgpt-toolkit-prompt-highlight";
    mark.textContent = source.slice(matchIndex, matchIndex + matchLength);
    fragment.appendChild(mark);

    cursor = matchIndex + matchLength;
    matchIndex = sourceLower.indexOf(queryLower, cursor);
  }

  if (cursor < source.length) {
    fragment.appendChild(document.createTextNode(source.slice(cursor)));
  }

  return fragment;
};

const setPromptNodeText = (node, text, keyword) => {
  if (!(node instanceof HTMLElement)) {
    return;
  }
  node.replaceChildren(buildPromptHighlightFragment(text, keyword));
};

const renderPromptEmptyState = (emptyTip, hasFilteredOutItems) => {
  if (!(emptyTip instanceof HTMLElement)) {
    return;
  }

  const emptyTitle = emptyTip.querySelector(".chatgpt-toolkit-prompt-empty-title");
  const emptyHint = emptyTip.querySelector(".chatgpt-toolkit-prompt-empty-hint");
  const emptyActions = emptyTip.querySelector(".chatgpt-toolkit-prompt-empty-actions");

  if (!(emptyTitle instanceof HTMLElement) || !(emptyHint instanceof HTMLElement)) {
    emptyTip.textContent = hasFilteredOutItems ? t("prompt.emptyNoMatch") : t("prompt.title");
    return;
  }

  if (emptyActions instanceof HTMLElement) {
    emptyActions.style.display = hasFilteredOutItems ? "flex" : "none";
  }

  if (hasFilteredOutItems) {
    emptyTitle.textContent = t("prompt.emptyNoMatch");
    emptyHint.textContent = t("prompt.emptyNoMatchHint");
    return;
  }

  emptyTitle.textContent = t("prompt.title");
  emptyHint.textContent = t("prompt.emptyHint");
};

const renderPromptList = () => {
  const elements = getPromptModalElements();
  if (!elements) {
    return;
  }

  const {
    searchInput,
    categorySelect,
    listContainer,
    emptyTip,
    countLabel,
  } = elements;

  if (
    !(searchInput instanceof HTMLInputElement) ||
    !(categorySelect instanceof HTMLSelectElement) ||
    !(listContainer instanceof HTMLElement) ||
    !(emptyTip instanceof HTMLElement) ||
    !(countLabel instanceof HTMLElement)
  ) {
    return;
  }

  searchInput.value = promptState.searchText;
  renderPromptCategoryOptions(categorySelect);
  const keyword = promptState.searchText.trim();
  const settings = getPromptBehaviorSettings();
  const actionLabel =
    settings.clickAction === "copy" ? t("prompt.itemActionCopy") : t("prompt.itemActionInsert");
  const isEmptyLibrary = promptState.items.length === 0;
  countLabel.classList.toggle("is-empty-library", isEmptyLibrary);

  listContainer.innerHTML = "";

  if (promptState.filteredItems.length === 0) {
    emptyTip.style.display = "block";
    renderPromptEmptyState(emptyTip, !isEmptyLibrary);
    countLabel.textContent = t("prompt.count", { visible: 0, total: promptState.items.length });
    renderPromptBehaviorSettings();
    return;
  }

  emptyTip.style.display = "none";
  countLabel.textContent = t("prompt.count", {
    visible: promptState.filteredItems.length,
    total: promptState.items.length,
  });

  const fragment = document.createDocumentFragment();
  promptState.filteredItems.forEach((item) => {
    const itemNode = document.createElement("article");
    itemNode.className = "chatgpt-toolkit-prompt-item";
    if (item.id === promptState.selectedId) {
      itemNode.classList.add("is-selected");
    }
    itemNode.dataset.promptId = item.id;

    const header = document.createElement("div");
    header.className = "chatgpt-toolkit-prompt-item-header";

    const title = document.createElement("h4");
    title.className = "chatgpt-toolkit-prompt-item-title";
    setPromptNodeText(title, item.title, keyword);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "chatgpt-toolkit-prompt-delete";
    deleteBtn.dataset.promptAction = "delete";
    deleteBtn.dataset.promptId = item.id;
    deleteBtn.textContent = t("prompt.delete");

    header.appendChild(title);
    header.appendChild(deleteBtn);

    const meta = document.createElement("p");
    meta.className = "chatgpt-toolkit-prompt-item-meta";
    const timestamp = formatPromptTime(item.updatedAt);
    const metaText = timestamp
      ? t("prompt.itemMetaWithTime", { category: item.category, time: timestamp, action: actionLabel })
      : t("prompt.itemMetaNoTime", { category: item.category, action: actionLabel });
    setPromptNodeText(meta, metaText, keyword);

    const content = document.createElement("p");
    content.className = "chatgpt-toolkit-prompt-item-content";
    setPromptNodeText(content, item.content, keyword);

    itemNode.appendChild(header);
    itemNode.appendChild(meta);
    itemNode.appendChild(content);

    fragment.appendChild(itemNode);
  });
  listContainer.appendChild(fragment);
  renderPromptBehaviorSettings();
};

const copyTextToClipboard = async (text) => {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      // Fallback below.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch (error) {
    copied = false;
  }

  textarea.remove();
  return copied;
};

const copyPromptById = async (promptId, options = {}) => {
  const { silent = false } = options;
  const item = promptState.items.find((prompt) => prompt.id === promptId);
  if (!item) {
    if (!silent) {
      updateStatusByKey("status.promptCopyMissing", "info");
      showPromptToastByKey("prompt.toastCopyFailed", "error");
    }
    return false;
  }

  promptState.selectedId = item.id;
  renderPromptList();

  const copied = await copyTextToClipboard(item.content);
  if (copied) {
    if (!silent) {
      updateStatusByKey("status.promptCopyDone", "success", { title: item.title });
      showPromptToastByKey("prompt.toastCopyDone", "success");
    }
    return true;
  }

  if (!silent) {
    updateStatusByKey("status.promptCopyBlocked", "info");
    showPromptToastByKey("prompt.toastCopyFailed", "error");
  }
  return false;
};

const getComposerElement = () => {
  const selectors = [
    'div.ProseMirror#prompt-textarea[contenteditable="true"][role="textbox"]',
    '#prompt-textarea[contenteditable="true"]',
    '[data-type="unified-composer"] div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"][role="textbox"]',
    'textarea[name="prompt-textarea"]:not([style*="display: none"])',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element instanceof HTMLElement || element instanceof HTMLTextAreaElement) {
      return element;
    }
  }

  return null;
};

const normalizeComposerText = (value) =>
  (value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ");

const getComposerText = (element) => {
  if (element instanceof HTMLTextAreaElement) {
    return normalizeComposerText(element.value || "");
  }

  if (element instanceof HTMLElement) {
    const text = element.textContent || element.innerText || "";
    return normalizeComposerText(text);
  }

  return "";
};

const isContentEditableComposer = (element) =>
  element instanceof HTMLElement && element.isContentEditable;

const getLeadingComposerText = (element, limit = 512) => {
  if (!(element instanceof HTMLElement)) {
    return "";
  }

  let output = "";
  const stack = Array.from(element.childNodes);
  while (stack.length > 0 && output.length < limit) {
    const node = stack.shift();
    if (!node) {
      continue;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      output += node.textContent || "";
      continue;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node;
      if (el.tagName === "BR" || el.tagName === "P" || el.tagName === "DIV") {
        output += "\n";
      }
      if (el.childNodes.length > 0) {
        stack.unshift(...Array.from(el.childNodes));
      }
    }
  }

  return normalizeComposerText(output.slice(0, limit));
};

const focusComposerToEnd = (element) => {
  if (element instanceof HTMLTextAreaElement) {
    const end = element.value.length;
    element.focus();
    element.setSelectionRange(end, end);
    return;
  }

  if (!(element instanceof HTMLElement)) {
    return;
  }

  element.focus();
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
};

const writeTextareaValue = (textarea, value) => {
  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value");
  if (descriptor?.set) {
    descriptor.set.call(textarea, value);
  } else {
    textarea.value = value;
  }

  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
  focusComposerToEnd(textarea);
  return true;
};

const dispatchComposerInputEvent = (element, text) => {
  try {
    const event = new InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: text,
    });
    element.dispatchEvent(event);
  } catch (error) {
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }
};

const buildPromptPrefixFragment = (promptText) => {
  const fragment = document.createDocumentFragment();
  const lines = normalizeComposerText(promptText).split("\n");

  if (lines.length === 0) {
    const empty = document.createElement("p");
    empty.appendChild(document.createElement("br"));
    fragment.appendChild(empty);
  }

  lines.forEach((line) => {
    const paragraph = document.createElement("p");
    if (line.length === 0) {
      paragraph.appendChild(document.createElement("br"));
    } else {
      paragraph.textContent = line;
    }
    fragment.appendChild(paragraph);
  });

  const separator = document.createElement("p");
  separator.appendChild(document.createElement("br"));
  fragment.appendChild(separator);

  return fragment;
};

const isPromptAlreadyPrependedContentEditable = (element, promptText) => {
  const prompt = normalizeComposerText(promptText).trim();
  if (!prompt) {
    return false;
  }
  const sample = getLeadingComposerText(element, Math.max(prompt.length * 3, 256));
  return sample.trimStart().startsWith(prompt);
};

const prependPromptByExecCommand = (element, promptText) => {
  try {
    element.focus();
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    const inserted = document.execCommand("insertText", false, `${promptText}\n\n`);
    if (!inserted) {
      return false;
    }
    dispatchComposerInputEvent(element, promptText);
    focusComposerToEnd(element);
    return true;
  } catch (error) {
    return false;
  }
};

const prependPromptToContentEditable = (element, promptText) => {
  if (!isContentEditableComposer(element)) {
    return { success: false, reason: "composer-write-failed" };
  }

  if (isPromptAlreadyPrependedContentEditable(element, promptText)) {
    focusComposerToEnd(element);
    return { success: true, reason: "already-inserted" };
  }

  try {
    const fragment = buildPromptPrefixFragment(promptText);
    const firstChild = element.firstChild;
    if (firstChild) {
      element.insertBefore(fragment, firstChild);
    } else {
      element.appendChild(fragment);
    }

    dispatchComposerInputEvent(element, promptText);
    focusComposerToEnd(element);
    return { success: true, reason: "inserted" };
  } catch (error) {
    const fallbackInserted = prependPromptByExecCommand(element, promptText);
    if (!fallbackInserted) {
      return { success: false, reason: "composer-write-failed" };
    }
    return { success: true, reason: "inserted" };
  }
};

const setComposerText = (element, value) => {
  const text = normalizeComposerText(value);
  if (element instanceof HTMLTextAreaElement) {
    return writeTextareaValue(element, text);
  }
  return false;
};

const prependPromptToComposer = (promptText) => {
  const composer = getComposerElement();
  if (!(composer instanceof HTMLElement || composer instanceof HTMLTextAreaElement)) {
    return { success: false, reason: "composer-not-found" };
  }

  const prompt = toSafeText(promptText);
  if (!prompt) {
    return { success: false, reason: "prompt-empty" };
  }

  if (composer instanceof HTMLTextAreaElement) {
    const currentText = getComposerText(composer);
    const trimmedCurrent = currentText.trim();
    const trimmedPrompt = prompt.trim();

    if (trimmedCurrent.startsWith(trimmedPrompt)) {
      focusComposerToEnd(composer);
      return { success: true, reason: "already-inserted" };
    }

    const nextText = trimmedCurrent ? `${prompt}\n\n${currentText}` : prompt;
    const written = setComposerText(composer, nextText);
    if (!written) {
      return { success: false, reason: "composer-write-failed" };
    }
    return { success: true, reason: "inserted" };
  }

  return prependPromptToContentEditable(composer, prompt);
};

const insertPromptById = async (promptId) => {
  const item = promptState.items.find((prompt) => prompt.id === promptId);
  if (!item) {
    updateStatusByKey("status.promptCopyMissing", "info");
    showPromptToastByKey("prompt.toastInsertFailed", "error");
    return;
  }

  promptState.selectedId = item.id;
  renderPromptList();

  const insertResult = prependPromptToComposer(item.content);
  if (insertResult.success) {
    updateStatusByKey("status.promptInsertDone", "success", { title: item.title });
    showPromptToastByKey("prompt.toastInsertDone", "success");
    return;
  }

  const copied = await copyPromptById(promptId, { silent: true });
  if (copied) {
    updateStatusByKey("status.promptInsertFallbackCopied", "info", { title: item.title });
    showPromptToastByKey("prompt.toastCopyDone", "success");
    return;
  }

  updateStatusByKey("status.promptInsertBlocked", "info", { title: item.title });
  showPromptToastByKey("prompt.toastInsertFailed", "error");
};

const runPromptPrimaryAction = async (promptId) => {
  ensurePromptBehaviorSettingsLoaded();
  const settings = getPromptBehaviorSettings();
  if (settings.clickAction === "copy") {
    await copyPromptById(promptId);
    return;
  }
  await insertPromptById(promptId);
};

const getAutoAttachItemsInOrder = () => {
  ensurePromptBehaviorSettingsLoaded();
  const settings = getPromptBehaviorSettings();
  const byId = new Map(promptState.items.map((item) => [item.id, item]));

  return settings.autoAttachPromptIds
    .map((id) => byId.get(id))
    .filter(Boolean);
};

const buildAutoAttachPrefixBlock = (items) => {
  const segments = Array.isArray(items)
    ? items
        .map((item) => toSafeText(item?.content))
        .filter(Boolean)
    : [];
  if (segments.length === 0) {
    return "";
  }
  return `${segments.join("\n\n")}\n\n`;
};

const normalizeAutoAttachComparableText = (value) =>
  normalizeComposerText(value || "")
    .replace(/[ \t]+/g, " ")
    .trimStart();

const hasAutoAttachPrefixByNormalizedCompare = (bodyText, prefixBlock) => {
  const normalizedPrefix = normalizeAutoAttachComparableText(prefixBlock).trimEnd();
  if (!normalizedPrefix) {
    return false;
  }
  const normalizedBody = normalizeAutoAttachComparableText(bodyText);
  return normalizedBody.startsWith(normalizedPrefix);
};

const composeTextWithPrefix = (originalBody, prefixBlock) => {
  if (!prefixBlock) {
    return originalBody || "";
  }
  if (!originalBody) {
    return prefixBlock.trimEnd();
  }
  return `${prefixBlock}${originalBody}`;
};

const getCurrentPromptConversationKey = () => {
  const keyFromState = typeof state === "object" && state ? toSafeText(state.conversationKey) : "";
  const keyFromGetter = typeof getConversationKey === "function" ? toSafeText(getConversationKey()) : "";
  const conversationKey = keyFromGetter || keyFromState;
  if (conversationKey) {
    return `conversation:${conversationKey}`;
  }

  if (!promptState.pageSessionFallbackKey) {
    promptState.pageSessionFallbackKey = `page:${location.pathname}:${Date.now()}`;
  }
  return promptState.pageSessionFallbackKey;
};

const writeContentEditableText = (element, value) => {
  if (!(element instanceof HTMLElement) || !element.isContentEditable) {
    return false;
  }

  try {
    element.focus();
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(element);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const inserted = document.execCommand("insertText", false, value);
    if (!inserted) {
      return false;
    }

    dispatchComposerInputEvent(element, value);
    focusComposerToEnd(element);
    return true;
  } catch (error) {
    return false;
  }
};

const tryApplyAutoAttachToComposer = () => {
  ensurePromptBehaviorSettingsLoaded();
  const settings = getPromptBehaviorSettings();
  if (!settings.autoAttachEnabled || settings.autoAttachTrigger !== PROMPT_AUTO_ATTACH_TRIGGER_EACH) {
    return;
  }

  const autoAttachItems = getAutoAttachItemsInOrder();
  const prefixBlock = buildAutoAttachPrefixBlock(autoAttachItems);
  if (!prefixBlock) {
    return;
  }

  const composer = getComposerElement();
  if (!(composer instanceof HTMLElement || composer instanceof HTMLTextAreaElement)) {
    return;
  }

  const originalBody =
    composer instanceof HTMLTextAreaElement ? composer.value || "" : getComposerText(composer);

  if (settings.autoAttachDedupEnabled && hasAutoAttachPrefixByNormalizedCompare(originalBody, prefixBlock)) {
    return;
  }

  const nextValue = composeTextWithPrefix(originalBody, prefixBlock);
  if (nextValue === originalBody) {
    return;
  }

  const written =
    composer instanceof HTMLTextAreaElement
      ? setComposerText(composer, nextValue)
      : writeContentEditableText(composer, nextValue);

  if (!written) {
    return;
  }
};

const shouldHandleSendByKeyboard = (event) => {
  if (!(event instanceof KeyboardEvent)) {
    return false;
  }
  if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) {
    return false;
  }
  if (event.isComposing) {
    return false;
  }
  const target = event.target;
  if (target instanceof HTMLTextAreaElement) {
    return true;
  }
  return target instanceof HTMLElement && target.isContentEditable;
};

const looksLikeSendButton = (target) => {
  if (!(target instanceof Element)) {
    return false;
  }
  return Boolean(
    target.closest(
      [
        'button[data-testid="send-button"]',
        'button[data-testid="composer-send-button"]',
        'button[aria-label*="Send"]',
        'button[aria-label*="鍙戦€?]',
        'button[type="submit"][aria-label]',
      ].join(", ")
    )
  );
};

const ensurePromptAutoAttachListeners = () => {
  if (promptAutoAttachListenersBound) {
    return;
  }

  const tryRunAutoAttach = () => {
    const now = Date.now();
    if (now - promptState.autoAttachLastAttemptAt < PROMPT_AUTO_ATTACH_SEND_DEBOUNCE_MS) {
      return;
    }
    promptState.autoAttachLastAttemptAt = now;
    tryApplyAutoAttachToComposer();
  };

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (looksLikeSendButton(event.target)) {
        tryRunAutoAttach();
      }
    },
    true,
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (shouldHandleSendByKeyboard(event)) {
        tryRunAutoAttach();
      }
    },
    true,
  );

  promptAutoAttachListenersBound = true;
};

const updateAutoAttachSelection = (promptId, checked) => {
  ensurePromptBehaviorSettingsLoaded();
  const settings = getPromptBehaviorSettings();
  const ids = [...settings.autoAttachPromptIds];
  const hasId = ids.includes(promptId);
  if (checked && !hasId) {
    ids.push(promptId);
  } else if (!checked && hasId) {
    settings.autoAttachPromptIds = ids.filter((id) => id !== promptId);
    promptState.behaviorSettings = settings;
    persistPromptBehaviorSettings();
    return;
  }
  settings.autoAttachPromptIds = ids;
  promptState.behaviorSettings = settings;
  persistPromptBehaviorSettings();
};

const moveAutoAttachPrompt = (promptId, direction) => {
  ensurePromptBehaviorSettingsLoaded();
  const settings = getPromptBehaviorSettings();
  const ids = [...settings.autoAttachPromptIds];
  const index = ids.indexOf(promptId);
  if (index < 0) {
    return;
  }
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= ids.length) {
    return;
  }
  const [moved] = ids.splice(index, 1);
  ids.splice(nextIndex, 0, moved);
  settings.autoAttachPromptIds = ids;
  promptState.behaviorSettings = settings;
  persistPromptBehaviorSettings();
};

const renderAutoAttachPromptList = () => {
  const elements = getPromptModalElements();
  const list = elements?.autoAttachList;
  if (!(list instanceof HTMLElement)) {
    return;
  }

  ensurePromptBehaviorSettingsLoaded();
  const settings = getPromptBehaviorSettings();
  list.innerHTML = "";
  list.classList.toggle("is-disabled", !settings.autoAttachEnabled);

  if (promptState.items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "chatgpt-toolkit-prompt-behavior-empty";
    empty.textContent = t("prompt.behaviorNoItems");
    list.appendChild(empty);
    return;
  }

  const selectedSet = new Set(settings.autoAttachPromptIds);
  const selectedOrder = new Map(settings.autoAttachPromptIds.map((id, index) => [id, index]));
  const sortedItems = [...promptState.items].sort((left, right) => {
    const leftOrder = selectedOrder.has(left.id) ? selectedOrder.get(left.id) : Number.MAX_SAFE_INTEGER;
    const rightOrder = selectedOrder.has(right.id) ? selectedOrder.get(right.id) : Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return right.updatedAt - left.updatedAt;
  });

  const fragment = document.createDocumentFragment();
  sortedItems.forEach((item) => {
    const row = document.createElement("div");
    row.className = "chatgpt-toolkit-prompt-behavior-item";

    const label = document.createElement("label");
    label.className = "chatgpt-toolkit-prompt-behavior-item-label";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.promptBehaviorAction = "toggle-auto-attach-item";
    checkbox.dataset.behaviorPromptId = item.id;
    checkbox.checked = selectedSet.has(item.id);
    checkbox.disabled = !settings.autoAttachEnabled;

    const title = document.createElement("span");
    title.textContent = item.title;

    label.appendChild(checkbox);
    label.appendChild(title);

    const orderButtons = document.createElement("div");
    orderButtons.className = "chatgpt-toolkit-prompt-behavior-order";

    const upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.textContent = "\u2191";
    upBtn.dataset.promptAction = "auto-attach-up";
    upBtn.dataset.behaviorPromptId = item.id;

    const downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.textContent = "\u2193";
    downBtn.dataset.promptAction = "auto-attach-down";
    downBtn.dataset.behaviorPromptId = item.id;

    const selectedIndex = settings.autoAttachPromptIds.indexOf(item.id);
    const isSelected = selectedIndex >= 0;
    upBtn.disabled = !settings.autoAttachEnabled || !isSelected || selectedIndex === 0;
    downBtn.disabled =
      !settings.autoAttachEnabled ||
      !isSelected ||
      selectedIndex === settings.autoAttachPromptIds.length - 1;

    orderButtons.appendChild(upBtn);
    orderButtons.appendChild(downBtn);

    row.appendChild(label);
    row.appendChild(orderButtons);
    fragment.appendChild(row);
  });

  list.appendChild(fragment);
};

const renderPromptBehaviorSettings = () => {
  const elements = getPromptModalElements();
  if (!elements) {
    return;
  }

  ensurePromptBehaviorSettingsLoaded();
  const settings = getPromptBehaviorSettings();

  if (elements.clickInsertRadio instanceof HTMLInputElement) {
    elements.clickInsertRadio.checked = settings.clickAction !== "copy";
  }
  if (elements.clickCopyRadio instanceof HTMLInputElement) {
    elements.clickCopyRadio.checked = settings.clickAction === "copy";
  }
  if (elements.autoAttachEnabledInput instanceof HTMLInputElement) {
    elements.autoAttachEnabledInput.checked = settings.autoAttachEnabled;
  }
  if (elements.autoAttachDedupInput instanceof HTMLInputElement) {
    elements.autoAttachDedupInput.checked = settings.autoAttachDedupEnabled;
    elements.autoAttachDedupInput.disabled = !settings.autoAttachEnabled;
  }

  setPromptSettingsOpen(promptState.settingsOpen);
  renderAutoAttachPromptList();
};

const addPromptFromModal = async () => {
  const elements = getPromptModalElements();
  if (!elements) {
    return;
  }

  const { addTitle, addCategory, addContent } = elements;
  if (
    !(addTitle instanceof HTMLInputElement) ||
    !(addCategory instanceof HTMLInputElement) ||
    !(addContent instanceof HTMLTextAreaElement)
  ) {
    return;
  }

  const content = toSafeText(addContent.value);
  if (!content) {
    updateStatusByKey("status.promptAddEmpty", "info");
    return;
  }

  const timestamp = Date.now();
  const title = toSafeText(addTitle.value) || content.replace(/\s+/g, " ").slice(0, 24) || t("prompt.untitled");
  const category = normalizeCategory(addCategory.value);
  const newItem = {
    id: createPromptId(),
    title,
    category,
    content,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const nextItems = [newItem, ...promptState.items];
  await savePromptItems(nextItems);
  promptState.selectedId = newItem.id;
  renderPromptList();

  addTitle.value = "";
  addCategory.value = "";
  addContent.value = "";

  updateStatusByKey("status.promptAddDone", "success");
};

const deletePromptById = async (promptId) => {
  const item = promptState.items.find((prompt) => prompt.id === promptId);
  if (!item) {
    return;
  }

  if (!window.confirm(t("prompt.deleteConfirm", { title: item.title }))) {
    return;
  }

  const nextItems = promptState.items.filter((prompt) => prompt.id !== promptId);
  await savePromptItems(nextItems);
  renderPromptList();
  updateStatusByKey("status.promptDeleteDone", "success");
};

const exportPromptLibrary = () => {
  const payload = buildPromptStoragePayload(promptState.items);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const dateTag = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `chatgpt-prompts-${dateTag}.json`;
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  updateStatusByKey("status.promptExportDone", "success");
};

const mergeImportedPromptItems = (incomingItems) => {
  const existingSignature = new Set(
    promptState.items.map((item) =>
      `${item.title}\n${item.category}\n${item.content}`.toLowerCase()
    )
  );

  const merged = [...promptState.items];
  let addedCount = 0;

  incomingItems.forEach((item) => {
    const signature = `${item.title}\n${item.category}\n${item.content}`.toLowerCase();
    if (existingSignature.has(signature)) {
      return;
    }
    existingSignature.add(signature);
    merged.unshift({
      ...item,
      id: createPromptId(),
      updatedAt: Date.now(),
    });
    addedCount += 1;
  });

  return { merged, addedCount };
};

const importPromptLibrary = async (fileInput) => {
  if (!(fileInput instanceof HTMLInputElement) || !fileInput.files || fileInput.files.length === 0) {
    return;
  }

  const file = fileInput.files[0];
  try {
    const content = await file.text();
    const parsed = JSON.parse(content);
    const incomingItems = extractPromptItems(parsed);
    if (incomingItems.length === 0) {
      updateStatusByKey("status.promptImportEmpty", "info");
      return;
    }

    const { merged, addedCount } = mergeImportedPromptItems(incomingItems);
    if (addedCount === 0) {
      updateStatusByKey("status.promptImportNoNew", "info");
      return;
    }

    await savePromptItems(merged);
    renderPromptList();
    updateStatusByKey("status.promptImportDone", "success", { count: addedCount });
  } catch (error) {
    updateStatusByKey("status.promptImportInvalid", "info");
  } finally {
    fileInput.value = "";
  }
};

const refreshPromptLocalization = () => {
  const elements = getPromptModalElements();
  if (!elements) {
    return;
  }

  const { modal, searchInput, categorySelect, addTitle, addCategory, addContent } = elements;

  if (modal instanceof HTMLElement) {
    const panel = modal.querySelector(".chatgpt-toolkit-prompt-panel");
    if (panel instanceof HTMLElement) {
      panel.setAttribute("aria-label", t("prompt.modalAria"));
    }

    const title = modal.querySelector(".chatgpt-toolkit-prompt-header strong");
    if (title instanceof HTMLElement) {
      title.textContent = t("prompt.title");
    }

    const close = modal.querySelector('[data-prompt-action="close"]');
    if (close instanceof HTMLButtonElement) {
      close.textContent = t("prompt.close");
    }

    const empty = modal.querySelector("#chatgpt-toolkit-prompt-empty");
    if (empty instanceof HTMLElement) {
      const emptyTitle = empty.querySelector(".chatgpt-toolkit-prompt-empty-title");
      const emptyHint = empty.querySelector(".chatgpt-toolkit-prompt-empty-hint");
      const clearSearchAction = empty.querySelector('[data-prompt-action="clear-search"]');
      const resetCategoryAction = empty.querySelector('[data-prompt-action="reset-category"]');
      if (emptyTitle instanceof HTMLElement) {
        emptyTitle.textContent = t("prompt.title");
      }
      if (emptyHint instanceof HTMLElement) {
        emptyHint.textContent = t("prompt.emptyHint");
      }
      if (clearSearchAction instanceof HTMLButtonElement) {
        clearSearchAction.textContent = t("prompt.emptyActionClearSearch");
      }
      if (resetCategoryAction instanceof HTMLButtonElement) {
        resetCategoryAction.textContent = t("prompt.emptyActionResetCategory");
      }
    }

    const filtersTitle = modal.querySelector('[data-prompt-label="filters"]');
    if (filtersTitle instanceof HTMLElement) {
      filtersTitle.textContent = t("toolbar.searchSection");
    }

    const settingsToggle = modal.querySelector('[data-prompt-action="open-settings"]');
    if (settingsToggle instanceof HTMLButtonElement) {
      settingsToggle.title = t("prompt.behaviorOpen");
      settingsToggle.setAttribute("aria-label", t("prompt.behaviorOpen"));
    }

    const behaviorClickTitle = modal.querySelector('[data-prompt-label="behavior-click-title"]');
    if (behaviorClickTitle instanceof HTMLElement) {
      behaviorClickTitle.textContent = t("prompt.behaviorClickTitle");
    }
    const behaviorClickInsert = modal.querySelector('[data-prompt-label="behavior-click-insert"]');
    if (behaviorClickInsert instanceof HTMLElement) {
      behaviorClickInsert.textContent = t("prompt.behaviorClickInsert");
    }
    const behaviorClickCopy = modal.querySelector('[data-prompt-label="behavior-click-copy"]');
    if (behaviorClickCopy instanceof HTMLElement) {
      behaviorClickCopy.textContent = t("prompt.behaviorClickCopy");
    }
    const behaviorAutoTitle = modal.querySelector('[data-prompt-label="behavior-auto-title"]');
    if (behaviorAutoTitle instanceof HTMLElement) {
      behaviorAutoTitle.textContent = t("prompt.behaviorAutoAttachTitle");
    }
    const behaviorAutoEnabled = modal.querySelector('[data-prompt-label="behavior-auto-enabled"]');
    if (behaviorAutoEnabled instanceof HTMLElement) {
      behaviorAutoEnabled.textContent = t("prompt.behaviorAutoAttachEnabled");
    }
    const behaviorAutoDedup = modal.querySelector('[data-prompt-label="behavior-auto-dedup"]');
    if (behaviorAutoDedup instanceof HTMLElement) {
      behaviorAutoDedup.textContent = t("prompt.behaviorAutoAttachDedup");
    }
    const behaviorAutoListTitle = modal.querySelector('[data-prompt-label="behavior-auto-list-title"]');
    if (behaviorAutoListTitle instanceof HTMLElement) {
      behaviorAutoListTitle.textContent = t("prompt.behaviorAutoAttachListTitle");
    }

    const add = modal.querySelector('[data-prompt-action="add"]');
    if (add instanceof HTMLButtonElement) {
      add.textContent = t("prompt.add");
    }

    const importButton = modal.querySelector('[data-prompt-action="import"]');
    if (importButton instanceof HTMLButtonElement) {
      importButton.textContent = t("prompt.importJson");
    }

    const exportButton = modal.querySelector('[data-prompt-action="export"]');
    if (exportButton instanceof HTMLButtonElement) {
      exportButton.textContent = t("prompt.exportJson");
    }
  }

  if (searchInput instanceof HTMLInputElement) {
    searchInput.placeholder = t("prompt.searchPlaceholder");
  }
  if (addTitle instanceof HTMLInputElement) {
    addTitle.placeholder = t("prompt.titlePlaceholder");
  }
  if (addCategory instanceof HTMLInputElement) {
    addCategory.placeholder = t("prompt.categoryPlaceholder");
  }
  if (addContent instanceof HTMLTextAreaElement) {
    addContent.placeholder = t("prompt.contentPlaceholder");
  }

  if (categorySelect instanceof HTMLSelectElement) {
    renderPromptCategoryOptions(categorySelect);
  }

  refreshPromptToastLocalization();
  renderPromptList();
  renderPromptBehaviorSettings();
};

const closePromptModal = () => {
  const modal = document.getElementById(PROMPT_MODAL_ID);
  if (!modal) {
    return;
  }
  if (promptToastTimer) {
    clearTimeout(promptToastTimer);
    promptToastTimer = null;
  }
  hidePromptToast();
  modal.classList.remove("is-visible");
  promptState.isOpen = false;
  setPromptSettingsOpen(false);
  promptDragState.pointerDown = false;
  promptDragState.dragging = false;
  teardownPromptCompanionOutsideClickListener();
};

const handlePromptModalClick = async (event) => {
  const target = event.target;
  const actionTarget =
    target instanceof Element
      ? target.closest("[data-prompt-action]")
      : target instanceof Node && target.parentElement
        ? target.parentElement.closest("[data-prompt-action]")
        : null;

  if (actionTarget instanceof HTMLElement) {
    const action = actionTarget.dataset.promptAction;
    if (action === "close") {
      if (
        actionTarget.classList.contains("chatgpt-toolkit-prompt-backdrop") &&
        actionTarget.closest(`#${PROMPT_MODAL_ID}`)?.classList.contains("is-companion")
      ) {
        return;
      }
      closePromptModal();
      return;
    }
    if (action === "add") {
      await addPromptFromModal();
      return;
    }
    if (action === "open-settings") {
      setPromptSettingsOpen(!promptState.settingsOpen);
      return;
    }
    if (action === "export") {
      exportPromptLibrary();
      return;
    }
    if (action === "import") {
      const elements = getPromptModalElements();
      const fileInput = elements?.fileInput;
      if (fileInput instanceof HTMLInputElement) {
        fileInput.click();
      }
      return;
    }
    if (action === "delete") {
      const promptId = actionTarget.dataset.promptId;
      if (promptId) {
        await deletePromptById(promptId);
      }
      return;
    }
    if (action === "clear-search") {
      promptState.searchText = "";
      const elements = getPromptModalElements();
      if (elements?.searchInput instanceof HTMLInputElement) {
        elements.searchInput.value = "";
      }
      applyPromptFilters();
      renderPromptList();
      return;
    }
    if (action === "reset-category") {
      promptState.category = "all";
      const elements = getPromptModalElements();
      if (elements?.categorySelect instanceof HTMLSelectElement) {
        elements.categorySelect.value = "all";
      }
      applyPromptFilters();
      renderPromptList();
      return;
    }
    if (action === "auto-attach-up" || action === "auto-attach-down") {
      const promptId = actionTarget.dataset.behaviorPromptId;
      if (!promptId) {
        return;
      }
      moveAutoAttachPrompt(promptId, action === "auto-attach-up" ? "up" : "down");
      renderPromptBehaviorSettings();
      return;
    }
  }

  const insideBehaviorPanel =
    target instanceof Element
      ? Boolean(target.closest("#chatgpt-toolkit-prompt-behavior-panel"))
      : target instanceof Node && target.parentElement
        ? Boolean(target.parentElement.closest("#chatgpt-toolkit-prompt-behavior-panel"))
        : false;
  if (insideBehaviorPanel) {
    return;
  }

  const promptNode =
    target instanceof Element
      ? target.closest(".chatgpt-toolkit-prompt-list [data-prompt-id]")
      : target instanceof Node && target.parentElement
        ? target.parentElement.closest(".chatgpt-toolkit-prompt-list [data-prompt-id]")
        : null;

  if (!(promptNode instanceof HTMLElement)) {
    return;
  }

  const promptId = promptNode.dataset.promptId;
  if (promptId) {
    await runPromptPrimaryAction(promptId);
  }
};

const ensurePromptModal = () => {
  const existingModal = document.getElementById(PROMPT_MODAL_ID);
  if (existingModal) {
    existingModal.classList.add("is-companion");
    ensurePromptBehaviorPanelHost(existingModal);
    ensurePromptSettingsOutsidePointerListener();
    ensurePromptAutoAttachListeners();
    enablePromptCompanionDrag();
    return existingModal;
  }

  if (!document.body) {
    return null;
  }

  const modal = document.createElement("section");
  modal.id = PROMPT_MODAL_ID;
  modal.className = "chatgpt-toolkit-prompt-modal is-companion";
  modal.innerHTML = `
    <div class="chatgpt-toolkit-prompt-backdrop" data-prompt-action="close"></div>
    <div class="chatgpt-toolkit-prompt-panel" role="dialog" aria-modal="true" aria-label="${t("prompt.modalAria")}">
      <div class="chatgpt-toolkit-prompt-header">
        <div class="chatgpt-toolkit-prompt-header-main">
          <strong>${t("prompt.title")}</strong>
                  </div>
        <button type="button" class="chatgpt-toolkit-prompt-close" data-prompt-action="close">${t("prompt.close")}</button>
      </div>
      <div id="${PROMPT_TOAST_ID}" class="chatgpt-toolkit-prompt-toast" aria-live="polite"></div>
      <div class="chatgpt-toolkit-prompt-filters">
        <p class="chatgpt-toolkit-prompt-filters-title" data-prompt-label="filters">${t("toolbar.searchSection")}</p>
        <div class="chatgpt-toolkit-prompt-search-row">
          <input id="chatgpt-toolkit-prompt-search" type="text" placeholder="${t("prompt.searchPlaceholder")}" />
        </div>
        <div class="chatgpt-toolkit-prompt-tools-row">
          <select id="chatgpt-toolkit-prompt-category-filter">
            <option value="all">${t("prompt.allCategories")}</option>
          </select>
          <span id="chatgpt-toolkit-prompt-count" class="chatgpt-toolkit-prompt-footer-count">${t("prompt.count", { visible: 0, total: 0 })}</span>
          <button
            type="button"
            class="chatgpt-toolkit-prompt-settings-toggle"
            data-prompt-action="open-settings"
            aria-expanded="false"
            aria-controls="chatgpt-toolkit-prompt-behavior-panel"
            title="${t("prompt.behaviorOpen")}"
          >
            \u2699
          </button>
        </div>
        <div id="chatgpt-toolkit-prompt-behavior-panel" class="chatgpt-toolkit-prompt-behavior-panel">
          <div class="chatgpt-toolkit-prompt-behavior-group">
            <p class="chatgpt-toolkit-prompt-behavior-title" data-prompt-label="behavior-click-title">${t("prompt.behaviorClickTitle")}</p>
            <label class="chatgpt-toolkit-prompt-behavior-option">
              <input type="radio" name="chatgpt-toolkit-prompt-click-action" value="insert" />
              <span data-prompt-label="behavior-click-insert">${t("prompt.behaviorClickInsert")}</span>
            </label>
            <label class="chatgpt-toolkit-prompt-behavior-option">
              <input type="radio" name="chatgpt-toolkit-prompt-click-action" value="copy" />
              <span data-prompt-label="behavior-click-copy">${t("prompt.behaviorClickCopy")}</span>
            </label>
          </div>
          <div class="chatgpt-toolkit-prompt-behavior-group">
            <p class="chatgpt-toolkit-prompt-behavior-title" data-prompt-label="behavior-auto-title">${t("prompt.behaviorAutoAttachTitle")}</p>
            <label class="chatgpt-toolkit-prompt-behavior-option">
              <input id="chatgpt-toolkit-prompt-auto-attach-enabled" type="checkbox" />
              <span data-prompt-label="behavior-auto-enabled">${t("prompt.behaviorAutoAttachEnabled")}</span>
            </label>
            <label class="chatgpt-toolkit-prompt-behavior-option">
              <input id="chatgpt-toolkit-prompt-auto-attach-dedup" type="checkbox" />
              <span data-prompt-label="behavior-auto-dedup">${t("prompt.behaviorAutoAttachDedup")}</span>
            </label>
            <p class="chatgpt-toolkit-prompt-behavior-title" data-prompt-label="behavior-auto-list-title">${t("prompt.behaviorAutoAttachListTitle")}</p>
            <div id="chatgpt-toolkit-prompt-auto-attach-list" class="chatgpt-toolkit-prompt-behavior-list"></div>
          </div>
        </div>
      </div>
      <div id="chatgpt-toolkit-prompt-list" class="chatgpt-toolkit-prompt-list"></div>
      <p id="chatgpt-toolkit-prompt-empty" class="chatgpt-toolkit-prompt-empty">
        <span class="chatgpt-toolkit-prompt-empty-title">${t("prompt.empty")}</span>
        <span class="chatgpt-toolkit-prompt-empty-hint">${t("prompt.emptyHint")}</span>
        <span class="chatgpt-toolkit-prompt-empty-actions">
          <button type="button" data-prompt-action="clear-search">${t("prompt.emptyActionClearSearch")}</button>
          <button type="button" data-prompt-action="reset-category">${t("prompt.emptyActionResetCategory")}</button>
        </span>
      </p>
      <div class="chatgpt-toolkit-prompt-editor">
        <input id="chatgpt-toolkit-prompt-add-title" type="text" placeholder="${t("prompt.titlePlaceholder")}" />
        <input id="chatgpt-toolkit-prompt-add-category" type="text" placeholder="${t("prompt.categoryPlaceholder")}" />
        <textarea id="chatgpt-toolkit-prompt-add-content" rows="4" placeholder="${t("prompt.contentPlaceholder")}"></textarea>
        <button type="button" class="chatgpt-toolkit-prompt-add" data-prompt-action="add">${t("prompt.add")}</button>
      </div>
      <div class="chatgpt-toolkit-prompt-footer">
        <div class="chatgpt-toolkit-prompt-footer-actions">
          <button type="button" data-prompt-action="import">${t("prompt.importJson")}</button>
          <button type="button" data-prompt-action="export">${t("prompt.exportJson")}</button>
        </div>
      </div>
      <input id="${PROMPT_FILE_INPUT_ID}" type="file" accept=".json,application/json" />
    </div>
  `;

  document.body.appendChild(modal);
  ensurePromptBehaviorPanelHost(modal);
  syncToolkitTheme();

  modal.addEventListener("click", (event) => {
    void handlePromptModalClick(event);
  });

  modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (promptState.settingsOpen) {
        event.preventDefault();
        setPromptSettingsOpen(false);
      } else {
        closePromptModal();
      }
      return;
    }

    const target = event.target;
    const isSingleLineInput =
      target instanceof HTMLInputElement &&
      (target.id === "chatgpt-toolkit-prompt-add-title" || target.id === "chatgpt-toolkit-prompt-add-category");
    const isTextarea = target instanceof HTMLTextAreaElement && target.id === "chatgpt-toolkit-prompt-add-content";
    const isSubmitInTextarea = isTextarea && (event.ctrlKey || event.metaKey) && event.key === "Enter";

    if (isSingleLineInput && event.key === "Enter") {
      event.preventDefault();
      void addPromptFromModal();
    }

    if (isSubmitInTextarea) {
      event.preventDefault();
      void addPromptFromModal();
    }
  });

  const elements = getPromptModalElements();
  if (elements?.searchInput instanceof HTMLInputElement) {
    elements.searchInput.addEventListener("input", () => {
      promptState.searchText = elements.searchInput.value;
      applyPromptFilters();
      renderPromptList();
    });
  }

  if (elements?.categorySelect instanceof HTMLSelectElement) {
    elements.categorySelect.addEventListener("change", () => {
      promptState.category = elements.categorySelect.value || "all";
      applyPromptFilters();
      renderPromptList();
    });
  }

  if (elements?.clickInsertRadio instanceof HTMLInputElement) {
    elements.clickInsertRadio.addEventListener("change", () => {
      ensurePromptBehaviorSettingsLoaded();
      const settings = getPromptBehaviorSettings();
      settings.clickAction = "insert";
      promptState.behaviorSettings = settings;
      persistPromptBehaviorSettings();
      renderPromptList();
    });
  }

  if (elements?.clickCopyRadio instanceof HTMLInputElement) {
    elements.clickCopyRadio.addEventListener("change", () => {
      ensurePromptBehaviorSettingsLoaded();
      const settings = getPromptBehaviorSettings();
      settings.clickAction = "copy";
      promptState.behaviorSettings = settings;
      persistPromptBehaviorSettings();
      renderPromptList();
    });
  }

  if (elements?.autoAttachEnabledInput instanceof HTMLInputElement) {
    elements.autoAttachEnabledInput.addEventListener("change", () => {
      ensurePromptBehaviorSettingsLoaded();
      const settings = getPromptBehaviorSettings();
      settings.autoAttachEnabled = elements.autoAttachEnabledInput.checked;
      promptState.behaviorSettings = settings;
      persistPromptBehaviorSettings();
      renderPromptBehaviorSettings();
    });
  }

  if (elements?.autoAttachDedupInput instanceof HTMLInputElement) {
    elements.autoAttachDedupInput.addEventListener("change", () => {
      ensurePromptBehaviorSettingsLoaded();
      const settings = getPromptBehaviorSettings();
      settings.autoAttachDedupEnabled = elements.autoAttachDedupInput.checked;
      promptState.behaviorSettings = settings;
      persistPromptBehaviorSettings();
      renderPromptBehaviorSettings();
    });
  }

  if (elements?.autoAttachList instanceof HTMLElement) {
    elements.autoAttachList.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      if (target.dataset.promptBehaviorAction !== "toggle-auto-attach-item") {
        return;
      }
      const promptId = target.dataset.behaviorPromptId;
      if (!promptId) {
        return;
      }
      updateAutoAttachSelection(promptId, target.checked);
      renderPromptBehaviorSettings();
    });
  }

  if (elements?.fileInput instanceof HTMLInputElement) {
    elements.fileInput.addEventListener("change", () => {
      void importPromptLibrary(elements.fileInput);
    });
  }

  enablePromptCompanionDrag();
  if (promptState.isOpen) {
    restorePromptCompanionPosition();
    ensurePromptCompanionGlobalListeners();
  }
  ensurePromptSettingsOutsidePointerListener();
  ensurePromptAutoAttachListeners();

  return modal;
};

const openPromptModal = async () => {
  const modal = ensurePromptModal();
  if (!modal) {
    return;
  }

  await ensurePromptLibraryLoaded();
  ensurePromptBehaviorSettingsLoaded();
  syncToolkitTheme();
  applyPromptFilters();
  refreshPromptLocalization();

  promptState.isOpen = true;
  promptState.settingsOpen = false;
  modal.classList.add("is-visible");
  modal.classList.add("is-companion");
  hidePromptToast();
  restorePromptCompanionPosition();
  ensurePromptCompanionGlobalListeners();
  ensurePromptSettingsOutsidePointerListener();
  ensurePromptAutoAttachListeners();
  enablePromptCompanionDrag();
};

