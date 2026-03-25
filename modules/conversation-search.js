/*
 * ChatGPT Conversation Toolkit - Search
 */
const SEARCH_MARK_CLASS = "chatgpt-toolkit-search-text-match";
const SEARCH_MARK_ACTIVE_CLASS = "chatgpt-toolkit-search-text-active";
const SEARCH_REVEALED_ATTR = "data-toolkit-search-revealed";
const SEARCH_REVEALED_ATTR_VALUE = "1";
const COLLAPSED_ATTR = "data-toolkit-collapsed";
const COLLAPSED_CLASS = "chatgpt-toolkit-collapsed-message";

const getSearchResultCount = () => state.searchResults.length;
const normalizeSearchText = (value) => (value || "").replace(/\s+/g, " ").trim();
const getSearchInputElement = () => document.getElementById("chatgpt-toolkit-search-input");

const trimSummary = (value, max = 72) => {
  const normalized = normalizeSearchText(value);
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, max)}...`;
};

const isMessageInCurrentConversation = (message) => {
  if (!message) {
    return false;
  }
  if (!state.conversationKey) {
    return true;
  }
  return !message.conversationKey || message.conversationKey === state.conversationKey;
};

const markSearchRevealed = (node, revealed) => {
  if (!(node instanceof HTMLElement)) {
    return;
  }
  if (revealed) {
    node.setAttribute(SEARCH_REVEALED_ATTR, SEARCH_REVEALED_ATTR_VALUE);
  } else {
    node.removeAttribute(SEARCH_REVEALED_ATTR);
  }
};

const addTemporarilyRevealedKey = (key) => {
  if (!key) {
    return;
  }
  const existing = Array.isArray(state.searchTemporarilyRevealedKeys)
    ? state.searchTemporarilyRevealedKeys
    : [];
  if (existing.includes(key)) {
    return;
  }
  state.searchTemporarilyRevealedKeys = [...existing, key];
};

const clearSearchHighlight = () => {
  document.querySelectorAll(".chatgpt-toolkit-search-highlight").forEach((el) => {
    el.classList.remove("chatgpt-toolkit-search-highlight");
  });
};

const cleanupSearchMarks = () => {
  const marks = document.querySelectorAll(`mark.${SEARCH_MARK_CLASS}`);
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) {
      return;
    }
    const textNode = document.createTextNode(mark.textContent || "");
    parent.replaceChild(textNode, mark);
    parent.normalize();
  });
};

const updateSearchUI = () => {
  const searchResult = document.getElementById("chatgpt-toolkit-search-result");
  const prevBtn = document.getElementById("chatgpt-toolkit-search-prev");
  const nextBtn = document.getElementById("chatgpt-toolkit-search-next");
  if (!searchResult || !prevBtn || !nextBtn) {
    return;
  }
  const total = getSearchResultCount();
  const activeIndex = state.searchActiveIndex;
  if (total === 0) {
    searchResult.textContent = state.searchQuery ? t("search.noMatch") : "";
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }
  const active = getActiveSearchResult();
  const countLine = `${activeIndex + 1} / ${total}`;
  const contextLine = active?.contextLine || "";
  searchResult.textContent = "";
  const countNode = document.createElement("span");
  countNode.className = "chatgpt-toolkit-search-result-count";
  countNode.textContent = countLine;
  searchResult.appendChild(countNode);
  if (contextLine) {
    const contextNode = document.createElement("span");
    contextNode.className = "chatgpt-toolkit-search-result-context";
    contextNode.textContent = contextLine;
    searchResult.appendChild(contextNode);
  }
  prevBtn.disabled = total <= 1;
  nextBtn.disabled = total <= 1;
};

const clearSearchSession = (options = {}) => {
  const { clearInput = false, marksOnly = false } = options;

  cleanupSearchMarks();
  clearSearchHighlight();

  if (marksOnly) {
    return;
  }

  state.searchQuery = "";
  state.searchResults = [];
  state.searchActiveIndex = -1;
  // Legacy fields kept empty to avoid stale dependencies.
  state.searchMatches = [];
  state.currentMatchIndex = -1;

  if (clearInput) {
    const input = getSearchInputElement();
    if (input instanceof HTMLInputElement) {
      input.value = "";
    }
  }

  updateSearchUI();
};

const clearTextHighlights = () => {
  clearSearchSession({ marksOnly: true });
};

const rebuildCollapsedDerivedKeysFromGroupsForSearch = () => {
  if (typeof rebuildCollapsedDerivedKeysFromGroups === "function") {
    rebuildCollapsedDerivedKeysFromGroups();
    return;
  }
  const turnKeys = new Set();
  const messageKeys = new Set();
  (Array.isArray(state.collapsedGroupKeys) ? state.collapsedGroupKeys : []).forEach((groupKey) => {
    const group = typeof getGroupByKey === "function" ? getGroupByKey(groupKey) : null;
    if (!group) {
      return;
    }
    (Array.isArray(group.turnKeys) ? group.turnKeys : []).forEach((turnKey) => {
      if (turnKey) {
        turnKeys.add(turnKey);
      }
    });
    (Array.isArray(group.messageKeys) ? group.messageKeys : []).forEach((messageKey) => {
      if (messageKey) {
        messageKeys.add(messageKey);
      }
    });
  });
  state.collapsedTurnKeys = Array.from(turnKeys);
  state.collapsedMessageKeys = Array.from(messageKeys);
};
const reconcileTemporarilyRevealedMessages = (keepKeys = null) => {
  const temporaryKeys = Array.isArray(state.searchTemporarilyRevealedKeys)
    ? state.searchTemporarilyRevealedKeys
    : [];
  if (temporaryKeys.length === 0) {
    return false;
  }
  const keepSet = keepKeys instanceof Set ? keepKeys : null;
  const nextTemporaryKeys = [];
  const recoveredGroupKeys = new Set();
  let changed = false;
  temporaryKeys.forEach((key) => {
    if (keepSet && keepSet.has(key)) {
      nextTemporaryKeys.push(key);
      return;
    }
    const message = typeof getMessageByKey === "function" ? getMessageByKey(key) : null;
    if (!message || !(message.node instanceof HTMLElement)) {
      nextTemporaryKeys.push(key);
      return;
    }
    if (!isMessageInCurrentConversation(message)) {
      nextTemporaryKeys.push(key);
      return;
    }
    const node = message.node;
    if (node.getAttribute(SEARCH_REVEALED_ATTR) !== SEARCH_REVEALED_ATTR_VALUE) {
      nextTemporaryKeys.push(key);
      return;
    }
    node.setAttribute(COLLAPSED_ATTR, "1");
    node.classList.add(COLLAPSED_CLASS);
    markSearchRevealed(node, false);
    changed = true;
    const group = typeof getGroupByMessageKey === "function" ? getGroupByMessageKey(key) : null;
    if (group?.groupKey) {
      recoveredGroupKeys.add(group.groupKey);
    }
  });
  state.searchTemporarilyRevealedKeys = nextTemporaryKeys;
  if (recoveredGroupKeys.size > 0) {
    const nextCollapsedGroups = new Set(Array.isArray(state.collapsedGroupKeys) ? state.collapsedGroupKeys : []);
    recoveredGroupKeys.forEach((groupKey) => nextCollapsedGroups.add(groupKey));
    state.collapsedGroupKeys = Array.from(nextCollapsedGroups);
  }
  rebuildCollapsedDerivedKeysFromGroupsForSearch();
  state.isCollapsed = Array.isArray(state.collapsedGroupKeys) && state.collapsedGroupKeys.length > 0;
  return changed;
};

const resetSearchSession = (options = {}) => {
  const { clearInput = true } = options;
  ensureConversationState();
  if (typeof refreshMessageStore === "function") {
    refreshMessageStore();
  }
  const recovered = reconcileTemporarilyRevealedMessages();
  state.searchTemporarilyRevealedKeys = [];
  if (recovered && typeof refreshMessageStore === "function") {
    refreshMessageStore();
  }
  if (recovered && typeof renderTimeline === "function") {
    renderTimeline();
  }
  clearSearchSession({ clearInput });
};

const findMatchRanges = (text, query) => {
  const normalizedText = normalizeSearchText(text);
  const lowerText = normalizedText.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const ranges = [];

  if (!lowerQuery) {
    return ranges;
  }

  let start = 0;
  while (start < lowerText.length) {
    const index = lowerText.indexOf(lowerQuery, start);
    if (index === -1) {
      break;
    }
    ranges.push({ start: index, end: index + lowerQuery.length });
    start = index + lowerQuery.length;
  }
  return ranges;
};

const getPreviousUserSummary = (messages, index) => {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") {
      return trimSummary(messages[i].text);
    }
  }
  return "";
};

const getNextAssistantSummary = (messages, index) => {
  for (let i = index + 1; i < messages.length; i += 1) {
    if (messages[i]?.role === "assistant") {
      return trimSummary(messages[i].text);
    }
  }
  return "";
};

const getMessageSummaryByKey = (key) => {
  if (!key) {
    return "";
  }
  const message = getMessageBySearchKey(key);
  if (!message) {
    return "";
  }
  return trimSummary(message.text || message.syntheticText || "");
};

const getGroupAssistantSummary = (group, excludeKey = "") => {
  if (!group || !Array.isArray(group.assistantMessageKeys)) {
    return "";
  }
  let fallback = "";
  for (const key of group.assistantMessageKeys) {
    if (!key || key === excludeKey) {
      continue;
    }
    const message = getMessageBySearchKey(key);
    if (!message) {
      continue;
    }
    const summary = trimSummary(message.text || message.syntheticText || "");
    if (!summary) {
      continue;
    }
    if (message.hasSemanticContent || message.text) {
      return summary;
    }
    if (!fallback) {
      fallback = summary;
    }
  }
  return fallback;
};

const buildContextLine = (messages, index, message) => {
  const group = typeof getGroupByMessageKey === "function" ? getGroupByMessageKey(message?.key) : null;
  if (group) {
    const groupQuestion = getMessageSummaryByKey(group.userMessageKey);
    const groupAssistant = getGroupAssistantSummary(group, message?.role === "assistant" ? message?.key : "");
    if (message?.role === "assistant") {
      if (groupQuestion) {
        return `Q: ${groupQuestion}`;
      }
    } else {
      const self = trimSummary(message?.text || "");
      const question = self || groupQuestion;
      if (question && groupAssistant) {
        return `Q: ${question} | A: ${groupAssistant}`;
      }
      if (question) {
        return `Q: ${question}`;
      }
      if (groupAssistant) {
        return `A: ${groupAssistant}`;
      }
    }
  }

  if (message?.role === "assistant") {
    const prevUser = getPreviousUserSummary(messages, index);
    return prevUser ? `Q: ${prevUser}` : "";
  }

  const self = trimSummary(message?.text || "");
  const nextAssistant = getNextAssistantSummary(messages, index);
  if (self && nextAssistant) {
    return `Q: ${self} | A: ${nextAssistant}`;
  }
  if (self) {
    return `Q: ${self}`;
  }
  if (nextAssistant) {
    return `A: ${nextAssistant}`;
  }
  return "";
};

const buildSearchResultItem = (messages, message, index) => {
  const text = normalizeSearchText(message?.text || "");
  const ranges = findMatchRanges(text, state.searchQuery);
  if (ranges.length === 0) {
    return null;
  }
  const previewText = text.length > 120 ? `${text.slice(0, 120)}...` : text;
  const group = typeof getGroupByMessageKey === "function" ? getGroupByMessageKey(message?.key) : null;
  return {
    messageKey: message.key,
    messageIndex: message.index,
    groupKey: group?.groupKey || null,
    role: message.role,
    matchCount: ranges.length,
    matchedRanges: ranges,
    activeRange: ranges[0],
    previewText,
    contextLine: buildContextLine(messages, index, message),
  };
};

const getActiveSearchResult = () => {
  const total = getSearchResultCount();
  if (total === 0) {
    return null;
  }
  const index = state.searchActiveIndex;
  if (index < 0 || index >= total) {
    return null;
  }
  return state.searchResults[index] || null;
};

const getMessageBySearchKey = (key) => {
  if (!key || typeof getMessageByKey !== "function") {
    return null;
  }
  const message = getMessageByKey(key);
  return message || null;
};
const getGroupAnchorNodeForSearch = (group) => {
  if (!group) {
    return null;
  }
  if (group.anchorNode instanceof HTMLElement && group.anchorNode.isConnected) {
    return group.anchorNode;
  }
  const fallbackKeys = [];
  if (group.userMessageKey) {
    fallbackKeys.push(group.userMessageKey);
  }
  (Array.isArray(group.messageKeys) ? group.messageKeys : []).forEach((key) => fallbackKeys.push(key));
  for (const key of fallbackKeys) {
    const message = getMessageBySearchKey(key);
    if (message?.node instanceof HTMLElement && message.node.isConnected) {
      return message.node;
    }
  }
  return null;
};
const doesMessageStillMatchActiveQuery = (message) => {
  if (!message) {
    return false;
  }
  const query = normalizeSearchText(state.searchQuery || "").toLowerCase();
  if (!query) {
    return false;
  }
  const messageText = normalizeSearchText(message.text || "").toLowerCase();
  return messageText.includes(query);
};
const getPairedContextKey = (activeMessage) => {
  if (!activeMessage) {
    return null;
  }

  const activeGroup = typeof getGroupByMessageKey === "function" ? getGroupByMessageKey(activeMessage.key) : null;
  if (activeGroup) {
    if (activeMessage.role === "assistant") {
      return activeGroup.userMessageKey || null;
    }
    if (activeMessage.role === "user") {
      const assistantKeys = Array.isArray(activeGroup.assistantMessageKeys)
        ? activeGroup.assistantMessageKeys
        : [];
      for (const key of assistantKeys) {
        if (!key || key === activeMessage.key) {
          continue;
        }
        const message = getMessageBySearchKey(key);
        if (!message) {
          continue;
        }
        if (normalizeSearchText(message.text || message.syntheticText || "") || message.hasSemanticContent) {
          return key;
        }
      }
      return assistantKeys.find((key) => key && key !== activeMessage.key) || null;
    }
  }

  if (typeof getAllMessages !== "function") {
    return null;
  }
  const messages = getAllMessages();
  const activeIndex = messages.findIndex((message) => message?.key === activeMessage.key);
  if (activeIndex === -1) {
    return null;
  }
  if (activeMessage.role === "assistant") {
    const previous = messages[activeIndex - 1];
    return previous?.role === "user" ? previous.key : null;
  }
  if (activeMessage.role === "user") {
    const next = messages[activeIndex + 1];
    return next?.role === "assistant" ? next.key : null;
  }
  return null;
};
const ensureMessageVisibleForSearch = (message) => {
  if (!(message?.node instanceof HTMLElement)) {
    return { node: null, changed: false };
  }
  const group = typeof getGroupByMessageKey === "function" ? getGroupByMessageKey(message.key) : null;
  const targetGroup = group?.groupKey ? group : null;
  if (!targetGroup || !Array.isArray(targetGroup.messageKeys)) {
    const targetNode = message.node;
    const isCollapsedByToolkit =
      targetNode.getAttribute(COLLAPSED_ATTR) === "1" ||
      targetNode.classList.contains(COLLAPSED_CLASS);
    if (!isCollapsedByToolkit) {
      return { node: targetNode, changed: false };
    }
    targetNode.removeAttribute(COLLAPSED_ATTR);
    targetNode.classList.remove(COLLAPSED_CLASS);
    markSearchRevealed(targetNode, true);
    addTemporarilyRevealedKey(message.key);
    return { node: targetNode, changed: true };
  }
  const collapsedGroupSet = new Set(Array.isArray(state.collapsedGroupKeys) ? state.collapsedGroupKeys : []);
  const wasCollapsed = collapsedGroupSet.has(targetGroup.groupKey);
  let changed = false;
  targetGroup.messageKeys.forEach((messageKey) => {
    const current = getMessageBySearchKey(messageKey);
    if (!(current?.node instanceof HTMLElement)) {
      return;
    }
    const node = current.node;
    const isCollapsedByToolkit =
      node.getAttribute(COLLAPSED_ATTR) === "1" ||
      node.classList.contains(COLLAPSED_CLASS);
    if (isCollapsedByToolkit) {
      node.removeAttribute(COLLAPSED_ATTR);
      node.classList.remove(COLLAPSED_CLASS);
      markSearchRevealed(node, true);
      addTemporarilyRevealedKey(messageKey);
      changed = true;
    }
  });
  if (wasCollapsed) {
    collapsedGroupSet.delete(targetGroup.groupKey);
    state.collapsedGroupKeys = Array.from(collapsedGroupSet);
    changed = true;
  }
  if (changed) {
    rebuildCollapsedDerivedKeysFromGroupsForSearch();
    state.isCollapsed = Array.isArray(state.collapsedGroupKeys) && state.collapsedGroupKeys.length > 0;
  }
  const activeMessage = getMessageBySearchKey(message.key);
  return {
    node: activeMessage?.node instanceof HTMLElement ? activeMessage.node : message.node,
    changed,
  };
};
const syncVisibilityForActiveGroup = (active) => {
  if (!active) {
    return { activeNode: null, groupAnchorNode: null };
  }
  const activeMessage = getMessageBySearchKey(active.messageKey);
  if (!activeMessage) {
    return { activeNode: null, groupAnchorNode: null };
  }
  const keepKeys = new Set([active.messageKey]);
  const pairedKey = getPairedContextKey(activeMessage);
  if (pairedKey) {
    keepKeys.add(pairedKey);
  }
  const recovered = reconcileTemporarilyRevealedMessages(keepKeys);
  let revealed = false;
  const activeReveal = ensureMessageVisibleForSearch(activeMessage);
  revealed = revealed || activeReveal.changed;
  if (pairedKey) {
    const pairedMessage = getMessageBySearchKey(pairedKey);
    if (pairedMessage) {
      const pairedReveal = ensureMessageVisibleForSearch(pairedMessage);
      revealed = revealed || pairedReveal.changed;
    }
  }
  if (recovered || revealed) {
    if (typeof refreshMessageStore === "function") {
      refreshMessageStore();
    }
    if (typeof renderTimeline === "function") {
      renderTimeline();
    }
  }
  const refreshedActiveMessage = getMessageBySearchKey(active.messageKey);
  const group =
    active.groupKey && typeof getGroupByKey === "function"
      ? getGroupByKey(active.groupKey)
      : typeof getGroupByMessageKey === "function"
        ? getGroupByMessageKey(active.messageKey)
        : null;
  return {
    activeNode: refreshedActiveMessage?.node instanceof HTMLElement ? refreshedActiveMessage.node : activeReveal.node,
    groupAnchorNode: getGroupAnchorNodeForSearch(group),
  };
};

const injectActiveMatchMark = (containerNode, query) => {
  if (!query || !(containerNode instanceof HTMLElement)) {
    return null;
  }

  const lowerQuery = query.toLowerCase();
  const queryLen = query.length;
  if (!queryLen) {
    return null;
  }

  const walker = document.createTreeWalker(
    containerNode,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.closest(`mark.${SEARCH_MARK_CLASS}`)) {
          return NodeFilter.FILTER_REJECT;
        }
        const tag = parent.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA") {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  let textNode = walker.nextNode();
  while (textNode) {
    const text = textNode.textContent || "";
    const lowerText = text.toLowerCase();
    const matchIndex = lowerText.indexOf(lowerQuery);
    if (matchIndex >= 0) {
      const before = text.slice(0, matchIndex);
      const match = text.slice(matchIndex, matchIndex + queryLen);
      const after = text.slice(matchIndex + queryLen);

      const fragment = document.createDocumentFragment();
      if (before) {
        fragment.appendChild(document.createTextNode(before));
      }
      const mark = document.createElement("mark");
      mark.className = `${SEARCH_MARK_CLASS} ${SEARCH_MARK_ACTIVE_CLASS}`;
      mark.textContent = match;
      fragment.appendChild(mark);
      if (after) {
        fragment.appendChild(document.createTextNode(after));
      }

      textNode.parentNode.replaceChild(fragment, textNode);
      return mark;
    }
    textNode = walker.nextNode();
  }
  return null;
};

const findScrollContainer = (targetNode) => {
  let el = targetNode.parentElement;
  while (el && el !== document.documentElement) {
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
};

const scrollNodeWithTopOffset = (targetNode, ratio = 0.3) => {
  if (!(targetNode instanceof HTMLElement)) {
    return;
  }
  const clampedRatio = Math.min(0.35, Math.max(0.25, ratio));
  const container = findScrollContainer(targetNode);
  const targetRect = targetNode.getBoundingClientRect();

  if (container) {
    const containerRect = container.getBoundingClientRect();
    const delta = targetRect.top - containerRect.top - container.clientHeight * clampedRatio;
    container.scrollTo({
      top: container.scrollTop + delta,
      behavior: "smooth",
    });
    return;
  }

  const absoluteTop = window.scrollY + targetRect.top;
  const desiredTop = absoluteTop - window.innerHeight * clampedRatio;
  window.scrollTo({
    top: Math.max(0, desiredTop),
    behavior: "smooth",
  });
};

const highlightCurrentMatch = () => {
  // Unified cleanup entry for old mark/highlight before rendering new active match.
  clearSearchSession({ marksOnly: true });
  const active = getActiveSearchResult();
  if (!active) {
    return;
  }

  if (typeof refreshMessageStore === "function") {
    refreshMessageStore();
  }

  const { activeNode: targetNode } = syncVisibilityForActiveGroup(active);
  if (!(targetNode instanceof HTMLElement)) {
    return;
  }

  targetNode.classList.add("chatgpt-toolkit-search-highlight");

  const latestMessage = getMessageBySearchKey(active.messageKey);
  if (doesMessageStillMatchActiveQuery(latestMessage)) {
    injectActiveMatchMark(targetNode, state.searchQuery);
  }
};

const scrollToCurrentMatch = () => {
  const active = getActiveSearchResult();
  if (!active) {
    return;
  }
  const group =
    active.groupKey && typeof getGroupByKey === "function"
      ? getGroupByKey(active.groupKey)
      : typeof getGroupByMessageKey === "function"
        ? getGroupByMessageKey(active.messageKey)
        : null;
  const groupAnchor = getGroupAnchorNodeForSearch(group);
  const message = getMessageBySearchKey(active.messageKey);
  const messageNode = message?.node instanceof HTMLElement ? message.node : null;
  const activeMark = messageNode?.querySelector(`mark.${SEARCH_MARK_ACTIVE_CLASS}`) || null;
  const scrollTarget =
    activeMark instanceof HTMLElement
      ? activeMark
      : groupAnchor instanceof HTMLElement
        ? groupAnchor
        : messageNode;
  if (!(scrollTarget instanceof HTMLElement)) {
    return;
  }
  scrollNodeWithTopOffset(scrollTarget, 0.3);
};

const performSearch = (query) => {
  ensureConversationState();

  const normalizedQuery = (query || "").trim().toLowerCase();
  if (!normalizedQuery) {
    resetSearchSession({ clearInput: true });
    return;
  }

  state.searchQuery = normalizedQuery;
  state.searchResults = [];
  state.searchActiveIndex = -1;
  state.searchMatches = [];
  state.currentMatchIndex = -1;

  // Unified cleanup entry (mark/highlight) before rebuilding results.
  clearSearchSession({ marksOnly: true });

  if (typeof refreshMessageStore === "function") {
    refreshMessageStore();
  }
  const messages = typeof getAllMessages === "function" ? getAllMessages() : [];

  const results = [];
  messages.forEach((message, index) => {
    const result = buildSearchResultItem(messages, message, index);
    if (result) {
      results.push(result);
    }
  });

  state.searchResults = results;
  if (results.length > 0) {
    state.searchActiveIndex = 0;
    highlightCurrentMatch();
    scrollToCurrentMatch();
  }

  updateSearchUI();
};

const navigateToPrevMatch = () => {
  const total = getSearchResultCount();
  if (total === 0) {
    return;
  }

  state.searchActiveIndex = (state.searchActiveIndex - 1 + total) % total;
  highlightCurrentMatch();
  scrollToCurrentMatch();
  updateSearchUI();
};

const navigateToNextMatch = () => {
  const total = getSearchResultCount();
  if (total === 0) {
    return;
  }

  state.searchActiveIndex = (state.searchActiveIndex + 1) % total;
  highlightCurrentMatch();
  scrollToCurrentMatch();
  updateSearchUI();
};
