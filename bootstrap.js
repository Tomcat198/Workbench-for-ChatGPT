/*
 * ChatGPT Conversation Toolkit - Bootstrap and DOM observers
 */
if (!window[TOOLKIT_BOOTSTRAP_FLAG]) {
  window[TOOLKIT_BOOTSTRAP_FLAG] = true;

  const hasAnySavedLayoutState = () => {
    try {
      // Prompt panel mode/position record takes highest priority:
      // once this key exists (manual/anchored/legacy), it's no longer first-run.
      if (localStorage.getItem(PROMPT_PANEL_POSITION_KEY) !== null) {
        return true;
      }
    } catch (error) {
      // Ignore storage read failures and continue with runtime checks.
    }

    if (loadToolbarPosition()) {
      return true;
    }
    if (loadPromptPanelPosition()) {
      return true;
    }
    if (loadTimelinePosition()) {
      return true;
    }
    if (loadMinimizedPositionV2()) {
      return true;
    }

    try {
      if (localStorage.getItem(TIMELINE_VISIBLE_KEY) !== null) {
        return true;
      }
    } catch (error) {
      // Ignore storage read failures.
    }

    return false;
  };

  timelineState.visible = loadTimelineVisibility();
  timelineState.manualPosition = loadTimelinePosition();

  const syncLegacySettingsFields = () => {
    state.keepLatest = state.settings.keepLatest;
    if (Object.prototype.hasOwnProperty.call(state, "timelineMaxNodes")) {
      state.timelineMaxNodes = state.settings.timelineMaxNodes;
    }
  };

  const applySettingsWithFallback = (nextSettings) => {
    const candidate = nextSettings && typeof nextSettings === "object" ? nextSettings : {};
    state.settings = {
      ...DEFAULT_SETTINGS,
      ...candidate,
    };
    syncLegacySettingsFields();
  };

  const initializeSettings = () => {
    const fallback = () => {
      applySettingsWithFallback(DEFAULT_SETTINGS);
    };

    try {
      if (typeof loadSettings !== "function") {
        fallback();
        return;
      }

      Promise.resolve(loadSettings())
        .then((loadedSettings) => {
          applySettingsWithFallback(loadedSettings);
        })
        .catch(() => {
          fallback();
        });
    } catch (error) {
      fallback();
    }
  };

  const clampInteger = (value, fallback, min = 1, max = 5000) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, Math.round(numeric)));
  };

  const normalizeSettingsInput = (input) => {
    const timelineMaxNodes = clampInteger(
      input?.timelineMaxNodes,
      DEFAULT_SETTINGS.timelineMaxNodes,
      1,
      5000,
    );
    const timelineSampleNodes = clampInteger(
      input?.timelineSampleNodes,
      DEFAULT_SETTINGS.timelineSampleNodes,
      1,
      5000,
    );

    return {
      autoOptimizeEnabled:
        typeof input?.autoOptimizeEnabled === "boolean"
          ? input.autoOptimizeEnabled
          : DEFAULT_SETTINGS.autoOptimizeEnabled,
      autoOptimizeThreshold: clampInteger(
        input?.autoOptimizeThreshold,
        DEFAULT_SETTINGS.autoOptimizeThreshold,
        1,
        5000,
      ),
      keepLatest: clampInteger(input?.keepLatest, DEFAULT_SETTINGS.keepLatest, 1, 5000),
      timelineMaxNodes,
      // Ensure UI value and runtime value are consistent.
      timelineSampleNodes: Math.min(timelineSampleNodes, timelineMaxNodes),
    };
  };

  const getSettingsModalElement = () => document.getElementById(SETTINGS_MODAL_ID);

  const syncSettingsThresholdState = () => {
    const modal = getSettingsModalElement();
    if (!(modal instanceof HTMLElement)) {
      return;
    }
    const enabledInput = modal.querySelector('input[name="autoOptimizeEnabled"]');
    const thresholdInput = modal.querySelector('input[name="autoOptimizeThreshold"]');
    if (!(enabledInput instanceof HTMLInputElement) || !(thresholdInput instanceof HTMLInputElement)) {
      return;
    }
    thresholdInput.disabled = !enabledInput.checked;
  };

  const syncSettingsFormWithState = () => {
    const modal = getSettingsModalElement();
    if (!(modal instanceof HTMLElement)) {
      return;
    }
    const form = modal.querySelector(".chatgpt-toolkit-settings-form");
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const normalized = normalizeSettingsInput(state.settings || DEFAULT_SETTINGS);

    const autoEnabledInput = form.elements.namedItem("autoOptimizeEnabled");
    if (autoEnabledInput instanceof HTMLInputElement) {
      autoEnabledInput.checked = normalized.autoOptimizeEnabled;
    }

    const thresholdInput = form.elements.namedItem("autoOptimizeThreshold");
    if (thresholdInput instanceof HTMLInputElement) {
      thresholdInput.value = String(normalized.autoOptimizeThreshold);
    }

    const keepLatestInput = form.elements.namedItem("keepLatest");
    if (keepLatestInput instanceof HTMLInputElement) {
      keepLatestInput.value = String(normalized.keepLatest);
    }

    const timelineMaxInput = form.elements.namedItem("timelineMaxNodes");
    if (timelineMaxInput instanceof HTMLInputElement) {
      timelineMaxInput.value = String(normalized.timelineMaxNodes);
    }
    const timelineSampleInput = form.elements.namedItem("timelineSampleNodes");
    if (timelineSampleInput instanceof HTMLInputElement) {
      timelineSampleInput.value = String(normalized.timelineSampleNodes);
    }

    syncSettingsThresholdState();
  };

  const collectSettingsFormValue = () => {
    const modal = getSettingsModalElement();
    if (!(modal instanceof HTMLElement)) {
      return normalizeSettingsInput(state.settings || DEFAULT_SETTINGS);
    }
    const form = modal.querySelector(".chatgpt-toolkit-settings-form");
    if (!(form instanceof HTMLFormElement)) {
      return normalizeSettingsInput(state.settings || DEFAULT_SETTINGS);
    }

    const autoEnabledInput = form.elements.namedItem("autoOptimizeEnabled");
    const thresholdInput = form.elements.namedItem("autoOptimizeThreshold");
    const keepLatestInput = form.elements.namedItem("keepLatest");
    const timelineMaxInput = form.elements.namedItem("timelineMaxNodes");
    const timelineSampleInput = form.elements.namedItem("timelineSampleNodes");

    return normalizeSettingsInput({
      autoOptimizeEnabled: autoEnabledInput instanceof HTMLInputElement ? autoEnabledInput.checked : false,
      autoOptimizeThreshold:
        thresholdInput instanceof HTMLInputElement
          ? thresholdInput.value
          : DEFAULT_SETTINGS.autoOptimizeThreshold,
      keepLatest: keepLatestInput instanceof HTMLInputElement ? keepLatestInput.value : DEFAULT_SETTINGS.keepLatest,
      timelineMaxNodes:
        timelineMaxInput instanceof HTMLInputElement
          ? timelineMaxInput.value
          : DEFAULT_SETTINGS.timelineMaxNodes,
      timelineSampleNodes:
        timelineSampleInput instanceof HTMLInputElement
          ? timelineSampleInput.value
          : DEFAULT_SETTINGS.timelineSampleNodes,
    });
  };

  const applySavedSettingsRuntime = (settings) => {
    applySettingsWithFallback(settings);

    if (!state.settings.autoOptimizeEnabled) {
      autoOptimizeState.hasAutoOptimized = false;
    }

    if (typeof renderTimeline === "function") {
      renderTimeline();
    }
  };

  const refreshSettingsModalLocalization = () => {
    const modal = getSettingsModalElement();
    if (!(modal instanceof HTMLElement)) {
      return;
    }

    modal.setAttribute("aria-label", t("settings.title"));

    const title = modal.querySelector(".chatgpt-toolkit-settings-title");
    if (title instanceof HTMLElement) {
      title.textContent = t("settings.title");
    }

    const automationGroupTitle = modal.querySelector('[data-settings-group="automation"]');
    if (automationGroupTitle instanceof HTMLElement) {
      automationGroupTitle.textContent = t("settings.groupAutomation");
    }

    const conversationGroupTitle = modal.querySelector('[data-settings-group="conversation"]');
    if (conversationGroupTitle instanceof HTMLElement) {
      conversationGroupTitle.textContent = t("settings.groupConversation");
    }

    const closeBtn = modal.querySelector('[data-settings-action="close"]');
    if (closeBtn instanceof HTMLButtonElement) {
      closeBtn.textContent = t("settings.close");
      closeBtn.setAttribute("aria-label", t("settings.close"));
    }

    const autoLabel = modal.querySelector('[data-settings-label="auto"]');
    if (autoLabel instanceof HTMLElement) {
      autoLabel.textContent = t("settings.autoOptimizeEnabled");
    }

    const thresholdLabel = modal.querySelector('[data-settings-label="threshold"]');
    if (thresholdLabel instanceof HTMLElement) {
      thresholdLabel.textContent = `${t("settings.autoOptimizeThreshold")} (${t("settings.unitQaGroups")})`;
    }

    const keepLatestLabel = modal.querySelector('[data-settings-label="keep-latest"]');
    if (keepLatestLabel instanceof HTMLElement) {
      keepLatestLabel.textContent = `${t("settings.keepLatest")} (${t("settings.unitQaGroups")})`;
    }

    const timelineLabel = modal.querySelector('[data-settings-label="timeline-max"]');
    if (timelineLabel instanceof HTMLElement) {
      timelineLabel.textContent = `${t("settings.timelineMaxNodes")} (${t("settings.unitQaNodes")})`;
    }

    const timelineSampleLabel = modal.querySelector('[data-settings-label="timeline-sample"]');
    if (timelineSampleLabel instanceof HTMLElement) {
      timelineSampleLabel.textContent = `${t("settings.timelineSampleNodes")} (${t("settings.unitQaNodes")})`;
    }

    const defaultsBtn = modal.querySelector('[data-settings-action="defaults"]');
    if (defaultsBtn instanceof HTMLButtonElement) {
      defaultsBtn.textContent = t("settings.restoreDefaults");
    }

    const resetUiSettingsBtn = modal.querySelector('[data-settings-action="reset-ui-settings"]');
    if (resetUiSettingsBtn instanceof HTMLButtonElement) {
      resetUiSettingsBtn.textContent = t("settings.resetUiAndSettings");
    }

    const saveBtn = modal.querySelector('[data-settings-action="save"]');
    if (saveBtn instanceof HTMLButtonElement) {
      saveBtn.textContent = t("settings.save");
    }
  };

  const closeSettingsModal = () => {
    const modal = getSettingsModalElement();
    if (modal instanceof HTMLElement) {
      modal.classList.remove("is-visible");
    }
    settingsUiState.isOpen = false;
  };

  const saveSettingsFromModal = async () => {
    const values = collectSettingsFormValue();
    let persisted = values;

    if (typeof saveSettings === "function") {
      try {
        persisted = await saveSettings(values);
      } catch (error) {
        persisted = values;
      }
    }

    applySavedSettingsRuntime(persisted);
    updateStatusByKey("status.settingsSaved", "success");
    closeSettingsModal();
  };

  const clearLayoutStateStorage = () => {
    const keys = [
      TOOLBAR_POSITION_KEY,
      MINIMIZED_POSITION_V2_KEY,
      POSITION_KEY,
      PROMPT_PANEL_POSITION_KEY,
      TIMELINE_POSITION_KEY,
      TIMELINE_VISIBLE_KEY,
    ];

    keys.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        // Ignore storage clear failures.
      }
    });
  };

  const resetPromptBehaviorSettingsToDefault = () => {
    const defaults = { ...DEFAULT_PROMPT_BEHAVIOR_SETTINGS };
    promptState.behaviorSettings = defaults;
    promptState.behaviorLoaded = true;

    if (typeof savePromptBehaviorSettings === "function") {
      savePromptBehaviorSettings(defaults);
    }

    if (promptState.isOpen) {
      if (typeof renderPromptBehaviorSettings === "function") {
        renderPromptBehaviorSettings();
      }
      if (typeof renderPromptList === "function") {
        renderPromptList();
      }
    }
  };

  const applyDefaultLayoutRuntime = () => {
    if (typeof setToolbarVisibility === "function") {
      setToolbarVisibility(true);
    }

    const toolbar = document.getElementById(TOOLKIT_ID);
    if (toolbar instanceof HTMLElement) {
      state.toolbarPosition = null;
      if (typeof applyDefaultToolbarAnchorPosition === "function") {
        applyDefaultToolbarAnchorPosition(toolbar);
      } else if (typeof ensureToolbarVisible === "function") {
        ensureToolbarVisible();
      }
    }

    const minimized = ensureMinimizedButton();
    if (minimized instanceof HTMLElement) {
      state.minimizedButtonPositionV2 = null;
      if (typeof applyMinimizedPosition === "function") {
        applyMinimizedPosition(minimized);
      } else if (typeof ensureButtonVisible === "function") {
        ensureButtonVisible(minimized);
      }
    }

    if (typeof window.resetPromptCompanionToAnchor === "function") {
      window.resetPromptCompanionToAnchor();
    } else {
      promptState.positionMode = "anchored";
      promptState.manualPosition = null;
      if (typeof window.repositionPromptCompanion === "function") {
        window.repositionPromptCompanion({ force: true });
      }
    }

    timelineState.manualPosition = null;
    const defaultTimelineVisible = loadTimelineVisibility();
    if (typeof setTimelineVisibility === "function") {
      setTimelineVisibility(defaultTimelineVisible, { persist: false });
    }
    if (typeof updateTimelinePosition === "function") {
      updateTimelinePosition();
    }
  };

  const resetUiAndSettingsState = async () => {
    let persisted = { ...DEFAULT_SETTINGS };

    if (typeof saveSettings === "function") {
      try {
        persisted = await saveSettings(DEFAULT_SETTINGS);
      } catch (error) {
        persisted = { ...DEFAULT_SETTINGS };
      }
    }

    applySavedSettingsRuntime(persisted);
    syncSettingsFormWithState();

    clearLayoutStateStorage();
    resetPromptBehaviorSettingsToDefault();

    if (typeof window.applyInitialLayoutPresetOnce === "function") {
      try {
        window.applyInitialLayoutPresetOnce();
      } catch (error) {
        // Ignore preset failures and continue fallback.
      }
    }

    applyDefaultLayoutRuntime();
    updateStatusByKey("status.resetUiAndSettingsDone", "success");
  };

  const restoreDefaultSettingsFromModal = async () => {
    let persisted = { ...DEFAULT_SETTINGS };

    if (typeof saveSettings === "function") {
      try {
        persisted = await saveSettings(DEFAULT_SETTINGS);
      } catch (error) {
        persisted = { ...DEFAULT_SETTINGS };
      }
    }

    applySavedSettingsRuntime(persisted);
    syncSettingsFormWithState();
    updateStatusByKey("status.settingsRestored", "success");
  };

  const buildSettingsModal = () => {
    const modal = document.createElement("section");
    modal.id = SETTINGS_MODAL_ID;
    modal.className = "chatgpt-toolkit-settings-modal";
    modal.setAttribute("aria-label", t("settings.title"));

    modal.innerHTML = `
      <div class="chatgpt-toolkit-settings-backdrop" data-settings-action="close"></div>
      <div class="chatgpt-toolkit-settings-panel" role="dialog" aria-modal="true">
        <div class="chatgpt-toolkit-settings-header">
          <strong class="chatgpt-toolkit-settings-title">${t("settings.title")}</strong>
          <button type="button" class="chatgpt-toolkit-settings-close" data-settings-action="close" aria-label="${t("settings.close")}">${t("settings.close")}</button>
        </div>
        <form class="chatgpt-toolkit-settings-form">
          <div class="chatgpt-toolkit-settings-group">
            <p class="chatgpt-toolkit-settings-group-title" data-settings-group="automation">${t("settings.groupAutomation")}</p>
            <label class="chatgpt-toolkit-settings-field chatgpt-toolkit-settings-toggle">
              <span data-settings-label="auto">${t("settings.autoOptimizeEnabled")}</span>
              <input type="checkbox" name="autoOptimizeEnabled" />
            </label>
            <label class="chatgpt-toolkit-settings-field">
              <span data-settings-label="threshold">${t("settings.autoOptimizeThreshold")} (${t("settings.unitQaGroups")})</span>
              <input type="number" name="autoOptimizeThreshold" min="1" step="1" />
            </label>
          </div>
          <div class="chatgpt-toolkit-settings-group">
            <p class="chatgpt-toolkit-settings-group-title" data-settings-group="conversation">${t("settings.groupConversation")}</p>
            <label class="chatgpt-toolkit-settings-field">
              <span data-settings-label="keep-latest">${t("settings.keepLatest")} (${t("settings.unitQaGroups")})</span>
              <input type="number" name="keepLatest" min="1" step="1" />
            </label>
            <label class="chatgpt-toolkit-settings-field">
              <span data-settings-label="timeline-max">${t("settings.timelineMaxNodes")} (${t("settings.unitQaNodes")})</span>
              <input type="number" name="timelineMaxNodes" min="1" step="1" />
            </label>
            <label class="chatgpt-toolkit-settings-field">
              <span data-settings-label="timeline-sample">${t("settings.timelineSampleNodes")} (${t("settings.unitQaNodes")})</span>
              <input type="number" name="timelineSampleNodes" min="1" step="1" />
            </label>
          </div>
          <div class="chatgpt-toolkit-settings-footer">
            <button type="button" class="chatgpt-toolkit-button" data-settings-action="defaults">${t("settings.restoreDefaults")}</button>
            <button type="button" class="chatgpt-toolkit-button" data-settings-action="reset-ui-settings">${t("settings.resetUiAndSettings")}</button>
            <button type="submit" class="chatgpt-toolkit-button primary" data-settings-action="save">${t("settings.save")}</button>
          </div>
        </form>
      </div>
    `;

    modal.addEventListener("click", (event) => {
      const target = event.target;
      const actionTarget =
        target instanceof Element
          ? target.closest("[data-settings-action]")
          : target instanceof Node && target.parentElement
            ? target.parentElement.closest("[data-settings-action]")
            : null;

      if (!(actionTarget instanceof HTMLElement)) {
        return;
      }

      const action = actionTarget.dataset.settingsAction;
      if (action === "close") {
        closeSettingsModal();
        return;
      }
      if (action === "defaults") {
        void restoreDefaultSettingsFromModal();
        return;
      }
      if (action === "reset-ui-settings") {
        const confirmed = window.confirm(t("settings.resetUiAndSettingsConfirm"));
        if (!confirmed) {
          return;
        }
        void resetUiAndSettingsState();
      }
    });

    modal.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeSettingsModal();
      }
    });

    const form = modal.querySelector(".chatgpt-toolkit-settings-form");
    if (form instanceof HTMLFormElement) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        void saveSettingsFromModal();
      });

      form.addEventListener("change", (event) => {
        const target = event.target;
        if (target instanceof HTMLInputElement && target.name === "autoOptimizeEnabled") {
          syncSettingsThresholdState();
        }
      });
    }

    return modal;
  };

  const ensureSettingsModal = () => {
    const existing = getSettingsModalElement();
    if (existing instanceof HTMLElement) {
      return existing;
    }

    if (!document.body) {
      return null;
    }

    const modal = buildSettingsModal();
    document.body.appendChild(modal);
    syncToolkitTheme();
    return modal;
  };

  const openSettingsModal = () => {
    const modal = ensureSettingsModal();
    if (!(modal instanceof HTMLElement)) {
      return;
    }

    syncSettingsFormWithState();
    refreshSettingsModalLocalization();
    modal.classList.add("is-visible");
    settingsUiState.isOpen = true;
  };

  window.openSettingsModal = openSettingsModal;
  window.closeSettingsModal = closeSettingsModal;
  window.refreshSettingsModalLocalization = refreshSettingsModalLocalization;

  const getCurrentConversationKey = () =>
    state.conversationKey || (typeof getConversationKey === "function" ? getConversationKey() : "");

  const resetAutoOptimizeStateForConversation = (conversationKey) => {
    autoOptimizeState.conversationKey = conversationKey || "";
    autoOptimizeState.hasAutoOptimized = false;
    autoOptimizeState.blockedByManualRestore = false;
    if (autoOptimizeState.timerId) {
      clearTimeout(autoOptimizeState.timerId);
      autoOptimizeState.timerId = null;
    }
  };

  const isLikelyStreamingResponse = () =>
    Boolean(
      document.querySelector(
        'button[data-testid="stop-button"], [data-testid="composer-stop-button"], button[aria-label*="Stop"], button[aria-label*="停止"]',
      ),
    );

  const getAutoOptimizeThreshold = () =>
    clampInteger(state?.settings?.autoOptimizeThreshold, DEFAULT_SETTINGS.autoOptimizeThreshold, 1, 5000);

  const scheduleAutoOptimizeCheck = () => {
    if (autoOptimizeState.timerId) {
      clearTimeout(autoOptimizeState.timerId);
    }

    autoOptimizeState.timerId = setTimeout(() => {
      autoOptimizeState.timerId = null;

      if (!state?.settings?.autoOptimizeEnabled) {
        return;
      }
      if (autoOptimizeState.hasAutoOptimized || autoOptimizeState.blockedByManualRestore) {
        return;
      }
      if (isLikelyStreamingResponse()) {
        return;
      }

      const groups = typeof getAllGroups === "function" ? getAllGroups() : [];
      const threshold = getAutoOptimizeThreshold();
      if (groups.length < threshold) {
        return;
      }

      if (typeof collapseOldMessages === "function") {
        autoOptimizeState.hasAutoOptimized = true;
        collapseOldMessages();
        updateStatusByKey("status.autoOptimizeTriggered", "info");
      }
    }, 450);
  };

  window.markAutoOptimizeManualRestore = () => {
    autoOptimizeState.blockedByManualRestore = true;
    autoOptimizeState.hasAutoOptimized = true;
  };

  initializeSettings();
  initI18n();
  if (typeof initMessageStore === "function") {
    initMessageStore();
  }
  if (typeof refreshMessageStore === "function") {
    refreshMessageStore();
  }
  observeThemeOnBodyIfNeeded();

  let resizeListenerAdded = false;

  const setupResizeListener = () => {
    if (resizeListenerAdded) {
      return;
    }
    resizeListenerAdded = true;

    window.addEventListener("resize", () => {
      const btn = document.getElementById(MINIMIZED_ID);
      if (btn && !minimizedButtonState.pointerDown && !minimizedButtonState.dragging) {
        ensureButtonVisible(btn);
      }
      if (typeof ensureToolbarVisible === "function" && !toolbarDragState.pointerDown && !toolbarDragState.dragging) {
        ensureToolbarVisible();
      }
      if (timelineState.pointerDown || timelineState.dragging) {
        timelineState.refreshPending = true;
      } else {
        updateTimelinePosition();
        scheduleTimelineRefresh();
      }
      closeFolderMenu();
      scheduleFolderRefresh();
    });
  };

  setupThemeSync();
  initFolders();
  attachToolbar();
  ensureSettingsModal();
  renderTimeline();

  if (!hasAnySavedLayoutState() && typeof window.applyInitialLayoutPresetOnce === "function") {
    window.applyInitialLayoutPresetOnce();
  }

  setupResizeListener();

  let observerRafId = 0;
  let observerNeedsPresenceCheck = false;
  let observerNeedsTimelineRefresh = false;
  let observerNeedsFolderRefresh = false;
  let observerNeedsStoreRefresh = false;
  let storeRefreshTimer = null;
  let lastObservedConversationKey =
    typeof getConversationKey === "function" ? getConversationKey() : state.conversationKey;

  resetAutoOptimizeStateForConversation(lastObservedConversationKey || "");

  const scheduleMessageStoreRefresh = () => {
    if (storeRefreshTimer) {
      return;
    }
    storeRefreshTimer = setTimeout(() => {
      storeRefreshTimer = null;
      ensureConversationState();
      const currentConversationKey = getCurrentConversationKey();
      const conversationSwitched =
        Boolean(lastObservedConversationKey) &&
        Boolean(currentConversationKey) &&
        lastObservedConversationKey !== currentConversationKey;
      if (conversationSwitched && typeof resetSearchSession === "function") {
        resetSearchSession({ reason: "conversation-switch", clearInput: true });
      }
      if (conversationSwitched) {
        resetAutoOptimizeStateForConversation(currentConversationKey);
      }
      lastObservedConversationKey = currentConversationKey || lastObservedConversationKey;

      if (typeof refreshMessageStore === "function") {
        refreshMessageStore();
      }
      if (
        Array.isArray(state.collapsedGroupKeys) && state.collapsedGroupKeys.length > 0 &&
        typeof replayCollapsedMessageVisibility === "function"
      ) {
        replayCollapsedMessageVisibility();
        if (typeof refreshMessageStore === "function") {
          refreshMessageStore();
        }
      }

      if (state?.settings?.autoOptimizeEnabled) {
        scheduleAutoOptimizeCheck();
      }
    }, 120);
  };

  const getObservedElement = (node) => {
    if (node instanceof Element) {
      return node;
    }
    if (node instanceof Text) {
      return node.parentElement;
    }
    return null;
  };

  const isToolkitMutationNode = (node) => {
    const element = getObservedElement(node);
    if (!(element instanceof Element)) {
      return false;
    }
    return Boolean(
      element.closest(
        [
          `#${TOOLKIT_ID}`,
          `#${MINIMIZED_ID}`,
          `#${TIMELINE_ID}`,
          `#${PROMPT_MODAL_ID}`,
          `#${SETTINGS_MODAL_ID}`,
          `#${FOLDER_MANAGER_ID}`,
          `#${FOLDER_MENU_ID}`,
        ].join(", "),
      ),
    );
  };

  const isConversationMutationNode = (node) => {
    const element = getObservedElement(node);
    return element instanceof Element && Boolean(element.closest("main"));
  };

  const isSidebarMutationNode = (node) => {
    const element = getObservedElement(node);
    if (!(element instanceof Element)) {
      return false;
    }
    if (element.id === "history") {
      return true;
    }
    return Boolean(
      element.closest('#history, nav[aria-label], aside, [data-testid*="sidebar"], [class*="sidebar"]'),
    );
  };

  const markObserverWorkFromNode = (node) => {
    if (isToolkitMutationNode(node)) {
      return;
    }

    observerNeedsPresenceCheck = true;

    if (isConversationMutationNode(node)) {
      observerNeedsTimelineRefresh = true;
      observerNeedsStoreRefresh = true;
    }

    if (isSidebarMutationNode(node)) {
      observerNeedsFolderRefresh = true;
    }
  };

  const observerCallback = () => {
    const needsPresenceCheck = observerNeedsPresenceCheck;
    const needsTimelineRefresh = observerNeedsTimelineRefresh;
    const needsFolderRefresh = observerNeedsFolderRefresh;
    const needsStoreRefresh = observerNeedsStoreRefresh;

    observerNeedsPresenceCheck = false;
    observerNeedsTimelineRefresh = false;
    observerNeedsFolderRefresh = false;
    observerNeedsStoreRefresh = false;

    if (needsPresenceCheck) {
      const toolbar = document.getElementById(TOOLKIT_ID);
      const minimizedButton = document.getElementById(MINIMIZED_ID);
      const timeline = document.getElementById(TIMELINE_ID);
      const promptModal = document.getElementById(PROMPT_MODAL_ID);
      const settingsModal = document.getElementById(SETTINGS_MODAL_ID);

      if (!toolbar) {
        attachToolbar();
      }

      if (!minimizedButton) {
        ensureMinimizedButton();
      }

      if (!timeline) {
        ensureTimeline();
      }

      if (promptState.isOpen && !promptModal) {
        const restoredModal = ensurePromptModal();
        if (restoredModal) {
          restoredModal.classList.add("is-visible");
          renderPromptList();
        }
      }

      if (settingsUiState.isOpen && !settingsModal) {
        const restoredSettings = ensureSettingsModal();
        if (restoredSettings) {
          restoredSettings.classList.add("is-visible");
          syncSettingsFormWithState();
        }
      }

      observeThemeOnBodyIfNeeded();
    }

    if (needsFolderRefresh) {
      scheduleFolderRefresh();
    }

    if (needsTimelineRefresh) {
      if (timelineState.pointerDown || timelineState.dragging) {
        timelineState.refreshPending = true;
      } else {
        scheduleTimelineRefresh();
      }
    }

    if (needsStoreRefresh) {
      scheduleMessageStoreRefresh();
    }
  };

  const observer = new MutationObserver((mutations) => {
    // Skip DOM mutations triggered by toolkit rendering itself.
    if (window.__toolkitIsRendering) {
      return;
    }

    mutations.forEach((mutation) => {
      markObserverWorkFromNode(mutation.target);
      mutation.addedNodes.forEach((node) => {
        markObserverWorkFromNode(node);
      });
      mutation.removedNodes.forEach((node) => {
        markObserverWorkFromNode(node);
      });
    });

    if (
      !observerNeedsPresenceCheck &&
      !observerNeedsTimelineRefresh &&
      !observerNeedsFolderRefresh &&
      !observerNeedsStoreRefresh
    ) {
      return;
    }

    // Use requestAnimationFrame throttling to avoid frequent execution.
    if (observerRafId) {
      return;
    }
    observerRafId = requestAnimationFrame(() => {
      observerRafId = 0;
      observerCallback();
    });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}
