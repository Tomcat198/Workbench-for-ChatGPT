/*
 * ChatGPT Conversation Toolkit - Conversation collapse
 */
const TOOLKIT_COLLAPSED_ATTR = "data-toolkit-collapsed";
const TOOLKIT_COLLAPSED_CLASS = "chatgpt-toolkit-collapsed-message";

const getConfiguredKeepLatest = () => {
  const settingsValue = Number(state?.settings?.keepLatest);
  if (Number.isFinite(settingsValue)) {
    return Math.max(0, Math.round(settingsValue));
  }
  const legacyValue = Number(state?.keepLatest);
  if (Number.isFinite(legacyValue)) {
    return Math.max(0, Math.round(legacyValue));
  }
  return DEFAULT_SETTINGS.keepLatest;
};

const setMessageCollapsedFlag = (node, collapsed) => {
  if (!(node instanceof HTMLElement)) {
    return;
  }
  if (collapsed) {
    node.setAttribute(TOOLKIT_COLLAPSED_ATTR, "1");
    node.classList.add(TOOLKIT_COLLAPSED_CLASS);
  } else {
    node.removeAttribute(TOOLKIT_COLLAPSED_ATTR);
    node.classList.remove(TOOLKIT_COLLAPSED_CLASS);
  }
};

const rebuildCollapsedDerivedKeysFromGroups = () => {
  const collapsedTurnSet = new Set();
  const collapsedMessageSet = new Set();

  (Array.isArray(state.collapsedGroupKeys) ? state.collapsedGroupKeys : []).forEach((groupKey) => {
    const group = typeof getGroupByKey === "function" ? getGroupByKey(groupKey) : null;
    if (!group) {
      return;
    }

    (Array.isArray(group.turnKeys) ? group.turnKeys : []).forEach((turnKey) => {
      if (turnKey) {
        collapsedTurnSet.add(turnKey);
      }
    });

    (Array.isArray(group.messageKeys) ? group.messageKeys : []).forEach((messageKey) => {
      if (messageKey) {
        collapsedMessageSet.add(messageKey);
      }
    });
  });

  state.collapsedTurnKeys = Array.from(collapsedTurnSet);
  state.collapsedMessageKeys = Array.from(collapsedMessageSet);
};

const replayCollapsedMessageVisibility = () => {
  if (!Array.isArray(state.collapsedGroupKeys) || state.collapsedGroupKeys.length === 0) {
    state.collapsedTurnKeys = [];
    state.collapsedMessageKeys = [];
    state.isCollapsed = false;
    return;
  }

  const nextGroupKeys = [];

  state.collapsedGroupKeys.forEach((groupKey) => {
    const group = typeof getGroupByKey === "function" ? getGroupByKey(groupKey) : null;
    if (!group || !Array.isArray(group.messageKeys) || group.messageKeys.length === 0) {
      return;
    }

    let hasConnectedNode = false;
    group.messageKeys.forEach((messageKey) => {
      const message = typeof getMessageByKey === "function" ? getMessageByKey(messageKey) : null;
      if (!(message?.node instanceof HTMLElement) || !message.node.isConnected) {
        return;
      }
      hasConnectedNode = true;
      setMessageCollapsedFlag(message.node, true);
    });

    if (hasConnectedNode) {
      nextGroupKeys.push(groupKey);
    }
  });

  state.collapsedGroupKeys = nextGroupKeys;
  rebuildCollapsedDerivedKeysFromGroups();
  state.isCollapsed = nextGroupKeys.length > 0;
};

const collapseOldMessages = () => {
  ensureConversationState();

  if (typeof refreshMessageStore === "function") {
    refreshMessageStore();
  }

  const visibleGroups =
    typeof getVisibleGroups === "function"
      ? getVisibleGroups().filter((group) => Array.isArray(group?.messageKeys) && group.messageKeys.length > 0)
      : [];

  const keepLatest = getConfiguredKeepLatest();

  if (visibleGroups.length <= keepLatest) {
    updateStatusByKey("status.collapseNoNeed", "info");
    return;
  }

  const toCollapseGroups = visibleGroups.slice(0, Math.max(0, visibleGroups.length - keepLatest));
  const collapsedGroupKeySet = new Set(Array.isArray(state.collapsedGroupKeys) ? state.collapsedGroupKeys : []);

  toCollapseGroups.forEach((group) => {
    if (!group?.groupKey || !Array.isArray(group.messageKeys)) {
      return;
    }
    collapsedGroupKeySet.add(group.groupKey);
    group.messageKeys.forEach((messageKey) => {
      const message = typeof getMessageByKey === "function" ? getMessageByKey(messageKey) : null;
      if (message?.node instanceof HTMLElement) {
        setMessageCollapsedFlag(message.node, true);
      }
    });
  });

  state.collapsedGroupKeys = Array.from(collapsedGroupKeySet);
  rebuildCollapsedDerivedKeysFromGroups();
  state.isCollapsed = state.collapsedGroupKeys.length > 0;

  state.cachedNodes = [];
  state.collapsedNodes = [];
  state.anchorNode = null;
  state.anchorParent = null;

  clearTextHighlights();
  clearSearchHighlight();
  state.searchQuery = "";
  state.searchMatches = [];
  state.currentMatchIndex = -1;
  const searchInput = document.getElementById("chatgpt-toolkit-search-input");
  if (searchInput) {
    searchInput.value = "";
  }
  updateSearchUI();

  if (typeof refreshMessageStore === "function") {
    refreshMessageStore();
  }
  updateStatusByKey("status.collapseDone", "success", { count: toCollapseGroups.length });
  renderTimeline();
};

const restoreMessages = () => {
  ensureConversationState();
  if (!state.isCollapsed || !Array.isArray(state.collapsedGroupKeys) || state.collapsedGroupKeys.length === 0) {
    updateStatusByKey("status.restoreNone", "info");
    return;
  }

  if (typeof refreshMessageStore === "function") {
    refreshMessageStore();
  }

  const visibleGroups =
    typeof getVisibleGroups === "function"
      ? getVisibleGroups().filter((group) => group?.anchorNode instanceof HTMLElement && group.anchorNode.isConnected)
      : [];

  const anchorElement = visibleGroups[0]?.anchorNode || null;
  const anchorOffsetTop = anchorElement ? anchorElement.getBoundingClientRect().top : 0;

  state.collapsedGroupKeys.forEach((groupKey) => {
    const group = typeof getGroupByKey === "function" ? getGroupByKey(groupKey) : null;
    if (!group || !Array.isArray(group.messageKeys)) {
      return;
    }
    group.messageKeys.forEach((messageKey) => {
      const message = typeof getMessageByKey === "function" ? getMessageByKey(messageKey) : null;
      if (message?.node instanceof HTMLElement) {
        setMessageCollapsedFlag(message.node, false);
      }
    });
  });

  if (anchorElement) {
    requestAnimationFrame(() => {
      const newRect = anchorElement.getBoundingClientRect();
      const scrollDelta = newRect.top - anchorOffsetTop;
      let scrollContainer = null;
      let el = anchorElement.parentElement;
      while (el && el !== document.documentElement) {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) {
          scrollContainer = el;
          break;
        }
        el = el.parentElement;
      }
      if (scrollContainer) {
        scrollContainer.scrollTop += scrollDelta;
      } else {
        window.scrollBy(0, scrollDelta);
      }
    });
  }

  state.collapsedGroupKeys = [];
  state.collapsedTurnKeys = [];
  state.collapsedMessageKeys = [];
  state.isCollapsed = false;

  state.collapsedNodes = [];
  state.cachedNodes = [];
  state.anchorNode = null;
  state.anchorParent = null;

  if (typeof refreshMessageStore === "function") {
    refreshMessageStore();
  }
  if (typeof window.markAutoOptimizeManualRestore === "function") {
    window.markAutoOptimizeManualRestore();
  }
  updateStatusByKey("status.restoreDone", "success");
  renderTimeline();
};
