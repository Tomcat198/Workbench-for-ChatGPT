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

  if (promptState.sortBy === "updated-asc") {
    result.sort((a, b) => a.updatedAt - b.updatedAt);
  } else if (promptState.sortBy === "title-asc") {
    result.sort((a, b) => compareText(a.title, b.title));
  } else if (promptState.sortBy === "title-desc") {
    result.sort((a, b) => compareText(b.title, a.title));
  } else if (promptState.sortBy === "category-asc") {
    result.sort((a, b) => {
      const byCategory = compareText(a.category, b.category);
      if (byCategory !== 0) {
        return byCategory;
      }
      return b.updatedAt - a.updatedAt;
    });
  } else {
    result.sort((a, b) => b.updatedAt - a.updatedAt);
  }

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
    promptState.items = [];
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
    sortSelect: modal.querySelector("#chatgpt-toolkit-prompt-sort"),
    listContainer: modal.querySelector("#chatgpt-toolkit-prompt-list"),
    emptyTip: modal.querySelector("#chatgpt-toolkit-prompt-empty"),
    countLabel: modal.querySelector("#chatgpt-toolkit-prompt-count"),
    addTitle: modal.querySelector("#chatgpt-toolkit-prompt-add-title"),
    addCategory: modal.querySelector("#chatgpt-toolkit-prompt-add-category"),
    addContent: modal.querySelector("#chatgpt-toolkit-prompt-add-content"),
    fileInput: modal.querySelector(`#${PROMPT_FILE_INPUT_ID}`),
  };
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

const renderPromptList = () => {
  const elements = getPromptModalElements();
  if (!elements) {
    return;
  }

  const {
    searchInput,
    categorySelect,
    sortSelect,
    listContainer,
    emptyTip,
    countLabel,
  } = elements;

  if (
    !(searchInput instanceof HTMLInputElement) ||
    !(categorySelect instanceof HTMLSelectElement) ||
    !(sortSelect instanceof HTMLSelectElement) ||
    !(listContainer instanceof HTMLElement) ||
    !(emptyTip instanceof HTMLElement) ||
    !(countLabel instanceof HTMLElement)
  ) {
    return;
  }

  searchInput.value = promptState.searchText;
  sortSelect.value = promptState.sortBy;
  renderPromptCategoryOptions(categorySelect);

  listContainer.innerHTML = "";

  if (promptState.filteredItems.length === 0) {
    emptyTip.style.display = "block";
    countLabel.textContent = t("prompt.count", { visible: 0, total: promptState.items.length });
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
    title.textContent = item.title;

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
    meta.textContent = timestamp
      ? t("prompt.itemMetaWithTime", { category: item.category, time: timestamp })
      : t("prompt.itemMetaNoTime", { category: item.category });

    const content = document.createElement("p");
    content.className = "chatgpt-toolkit-prompt-item-content";
    content.textContent = item.content;

    itemNode.appendChild(header);
    itemNode.appendChild(meta);
    itemNode.appendChild(content);

    fragment.appendChild(itemNode);
  });
  listContainer.appendChild(fragment);
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

const copyPromptById = async (promptId) => {
  const item = promptState.items.find((prompt) => prompt.id === promptId);
  if (!item) {
    updateStatusByKey("status.promptCopyMissing", "info");
    showPromptToastByKey("prompt.toastCopyFailed", "error");
    return;
  }

  promptState.selectedId = item.id;
  renderPromptList();

  const copied = await copyTextToClipboard(item.content);
  if (copied) {
    updateStatusByKey("status.promptCopyDone", "success", { title: item.title });
    showPromptToastByKey("prompt.toastCopyDone", "success");
    return;
  }
  updateStatusByKey("status.promptCopyBlocked", "info");
  showPromptToastByKey("prompt.toastCopyFailed", "error");
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

  const { modal, searchInput, categorySelect, sortSelect, addTitle, addCategory, addContent } = elements;

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
      if (emptyTitle instanceof HTMLElement) {
        emptyTitle.textContent = t("prompt.empty");
      }
      if (emptyHint instanceof HTMLElement) {
        emptyHint.textContent = t("prompt.empty");
      }
    }

    const subtitle = modal.querySelector('[data-prompt-label="subtitle"]');
    if (subtitle instanceof HTMLElement) {
      subtitle.textContent = t("prompt.empty");
    }

    const filtersTitle = modal.querySelector('[data-prompt-label="filters"]');
    if (filtersTitle instanceof HTMLElement) {
      filtersTitle.textContent = t("toolbar.searchSection");
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

  if (sortSelect instanceof HTMLSelectElement) {
    const currentValue = promptState.sortBy;
    sortSelect.innerHTML = `
      <option value="updated-desc">${t("prompt.sortUpdatedDesc")}</option>
      <option value="updated-asc">${t("prompt.sortUpdatedAsc")}</option>
      <option value="title-asc">${t("prompt.sortTitleAsc")}</option>
      <option value="title-desc">${t("prompt.sortTitleDesc")}</option>
      <option value="category-asc">${t("prompt.sortCategoryAsc")}</option>
    `;
    sortSelect.value = currentValue;
  }

  if (categorySelect instanceof HTMLSelectElement) {
    renderPromptCategoryOptions(categorySelect);
  }

  refreshPromptToastLocalization();
  renderPromptList();
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
      closePromptModal();
      return;
    }
    if (action === "add") {
      await addPromptFromModal();
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
  }

  const promptNode =
    target instanceof Element
      ? target.closest("[data-prompt-id]")
      : target instanceof Node && target.parentElement
        ? target.parentElement.closest("[data-prompt-id]")
        : null;

  if (!(promptNode instanceof HTMLElement)) {
    return;
  }

  const promptId = promptNode.dataset.promptId;
  if (promptId) {
    await copyPromptById(promptId);
  }
};

const ensurePromptModal = () => {
  const existingModal = document.getElementById(PROMPT_MODAL_ID);
  if (existingModal) {
    return existingModal;
  }

  if (!document.body) {
    return null;
  }

  const modal = document.createElement("section");
  modal.id = PROMPT_MODAL_ID;
  modal.className = "chatgpt-toolkit-prompt-modal";
  modal.innerHTML = `
    <div class="chatgpt-toolkit-prompt-backdrop" data-prompt-action="close"></div>
    <div class="chatgpt-toolkit-prompt-panel" role="dialog" aria-modal="true" aria-label="${t("prompt.modalAria")}">
      <div class="chatgpt-toolkit-prompt-header">
        <div class="chatgpt-toolkit-prompt-header-main">
          <strong>${t("prompt.title")}</strong>
          <span class="chatgpt-toolkit-prompt-subtitle" data-prompt-label="subtitle">${t("prompt.empty")}</span>
        </div>
        <button type="button" class="chatgpt-toolkit-prompt-close" data-prompt-action="close">${t("prompt.close")}</button>
      </div>
      <div id="${PROMPT_TOAST_ID}" class="chatgpt-toolkit-prompt-toast" aria-live="polite"></div>
      <div class="chatgpt-toolkit-prompt-filters">
        <p class="chatgpt-toolkit-prompt-filters-title" data-prompt-label="filters">${t("toolbar.searchSection")}</p>
        <div class="chatgpt-toolkit-prompt-filters-grid">
          <input id="chatgpt-toolkit-prompt-search" type="text" placeholder="${t("prompt.searchPlaceholder")}" />
          <select id="chatgpt-toolkit-prompt-category-filter">
            <option value="all">${t("prompt.allCategories")}</option>
          </select>
          <select id="chatgpt-toolkit-prompt-sort">
            <option value="updated-desc">${t("prompt.sortUpdatedDesc")}</option>
            <option value="updated-asc">${t("prompt.sortUpdatedAsc")}</option>
            <option value="title-asc">${t("prompt.sortTitleAsc")}</option>
            <option value="title-desc">${t("prompt.sortTitleDesc")}</option>
            <option value="category-asc">${t("prompt.sortCategoryAsc")}</option>
          </select>
        </div>
      </div>
      <div id="chatgpt-toolkit-prompt-list" class="chatgpt-toolkit-prompt-list"></div>
      <p id="chatgpt-toolkit-prompt-empty" class="chatgpt-toolkit-prompt-empty">
        <span class="chatgpt-toolkit-prompt-empty-title">${t("prompt.empty")}</span>
        <span class="chatgpt-toolkit-prompt-empty-hint">${t("prompt.empty")}</span>
      </p>
      <div class="chatgpt-toolkit-prompt-editor">
        <input id="chatgpt-toolkit-prompt-add-title" type="text" placeholder="${t("prompt.titlePlaceholder")}" />
        <input id="chatgpt-toolkit-prompt-add-category" type="text" placeholder="${t("prompt.categoryPlaceholder")}" />
        <textarea id="chatgpt-toolkit-prompt-add-content" rows="4" placeholder="${t("prompt.contentPlaceholder")}"></textarea>
        <button type="button" class="chatgpt-toolkit-prompt-add" data-prompt-action="add">${t("prompt.add")}</button>
      </div>
      <div class="chatgpt-toolkit-prompt-footer">
        <span id="chatgpt-toolkit-prompt-count" class="chatgpt-toolkit-prompt-footer-count">${t("prompt.count", { visible: 0, total: 0 })}</span>
        <div class="chatgpt-toolkit-prompt-footer-actions">
          <button type="button" data-prompt-action="import">${t("prompt.importJson")}</button>
          <button type="button" data-prompt-action="export">${t("prompt.exportJson")}</button>
        </div>
      </div>
      <input id="${PROMPT_FILE_INPUT_ID}" type="file" accept=".json,application/json" />
    </div>
  `;

  document.body.appendChild(modal);
  syncToolkitTheme();

  modal.addEventListener("click", (event) => {
    void handlePromptModalClick(event);
  });

  modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePromptModal();
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

  if (elements?.sortSelect instanceof HTMLSelectElement) {
    elements.sortSelect.addEventListener("change", () => {
      promptState.sortBy = elements.sortSelect.value || "updated-desc";
      applyPromptFilters();
      renderPromptList();
    });
  }

  if (elements?.fileInput instanceof HTMLInputElement) {
    elements.fileInput.addEventListener("change", () => {
      void importPromptLibrary(elements.fileInput);
    });
  }

  return modal;
};

const openPromptModal = async () => {
  const modal = ensurePromptModal();
  if (!modal) {
    return;
  }

  await ensurePromptLibraryLoaded();
  syncToolkitTheme();
  applyPromptFilters();
  refreshPromptLocalization();

  promptState.isOpen = true;
  modal.classList.add("is-visible");
  hidePromptToast();
};
