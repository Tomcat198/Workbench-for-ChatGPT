/*
 * ChatGPT Conversation Toolkit - DOM utilities
 */
const getConversationKey = () => {
  const domConversationId =
    document
      .querySelector("[data-conversation-id]")
      ?.getAttribute("data-conversation-id") ||
    document
      .querySelector("[data-message-id][data-conversation-id]")
      ?.getAttribute("data-conversation-id");
  if (domConversationId) {
    return domConversationId;
  }

  const match = window.location.pathname.match(/\/c\/([^/]+)/);
  if (match) {
    return match[1];
  }
  return `${window.location.pathname}${window.location.search}`;
};

const resetConversationState = () => {
  state.isCollapsed = false;
  state.collapsedNodes = [];
  state.cachedNodes = [];
  state.anchorNode = null;
  state.anchorParent = null;
  state.collapsedMessageKeys = [];
  state.searchQuery = '';
  state.searchMatches = [];
  state.searchResults = [];
  state.currentMatchIndex = -1;
  state.searchActiveIndex = -1;

  if (typeof resetMessageStore === "function") {
    resetMessageStore();
  }

  if (typeof timelineState !== "undefined" && timelineState) {
    timelineState.items = [];
    timelineState.sourceNodes = [];
    timelineState.sourceSignature = "";
    timelineState.totalUserCount = 0;
    timelineState.activeIndex = -1;
    timelineState.hoverIndex = -1;
    timelineState.signature = "";
    timelineState.contentHeight = 0;
    timelineState.rendered = false;
    timelineState.refreshPending = false;
  }
};

const ensureConversationState = () => {
  const nextKey = getConversationKey();
  if (state.conversationKey !== nextKey) {
    state.conversationKey = nextKey;
    resetConversationState();
  }
};

const normalizeMessageNode = (node) =>
  typeof normalizeMessageElement === "function"
    ? normalizeMessageElement(node)
    : node?.closest('[data-testid^="conversation-turn-"]') ||
      node?.closest("article") ||
      node;

const getNodeConversationId = (node) =>
  typeof getMessageConversationIdFromDom === "function"
    ? getMessageConversationIdFromDom(node)
    : node?.getAttribute("data-conversation-id") ||
      node?.dataset?.conversationId ||
      node?.querySelector("[data-conversation-id]")?.getAttribute("data-conversation-id") ||
      null;

const getMessageNodes = () => {
  ensureConversationState();
  if (typeof getMessageElements === "function") {
    return getMessageElements();
  }
  return [];
};

const detectRole = (node) => {
  if (typeof getMessageRoleFromDom === "function") {
    return getMessageRoleFromDom(node);
  }
  return "unknown";
};

const extractMessageText = (node) => {
  if (typeof getMessageTextFromDom === "function") {
    return getMessageTextFromDom(node);
  }
  return "";
};

const buildMessagePayload = (nodes) => {
  if (!nodes && typeof getAllMessages === "function") {
    return getAllMessages()
      .filter((message) => message?.text)
      .map((message, index) => ({
        index: index + 1,
        role: message.role || "unknown",
        text: message.text,
      }));
  }

  const seenIds = new Set();
  return nodes
    .map((node) => {
      const roleNode = node.matches("[data-message-author-role]")
        ? node
        : node.querySelector("[data-message-author-role]") || node;
      const messageId = roleNode?.getAttribute("data-message-id") || node.getAttribute("data-message-id");
      if (messageId && seenIds.has(messageId)) {
        return null;
      }
      if (messageId) {
        seenIds.add(messageId);
      }

      const role = detectRole(roleNode);
      const text = extractMessageText(roleNode);

      if (!text) {
        return null;
      }

      return { role, text };
    })
    .filter(Boolean)
    .map((message, index) => ({
      index: index + 1,
      role: message.role,
      text: message.text,
    }));
};

const updateStatus = (message, tone = "info") => {
  const status = document.getElementById(STATUS_ID);
  if (!status) {
    return;
  }
  delete status.dataset.i18nKey;
  delete status.dataset.i18nParams;
  status.textContent = message;
  status.dataset.tone = tone;
};

const updateStatusByKey = (key, tone = "info", params = {}) => {
  const status = document.getElementById(STATUS_ID);
  if (!status) {
    return;
  }
  status.dataset.i18nKey = key;
  status.dataset.i18nParams = JSON.stringify(params);
  status.textContent = t(key, params);
  status.dataset.tone = tone;
};

const refreshStatusLocalization = () => {
  const status = document.getElementById(STATUS_ID);
  if (!status) {
    return;
  }

  const key = status.dataset.i18nKey;
  if (!key) {
    return;
  }

  let params = {};
  try {
    params = status.dataset.i18nParams ? JSON.parse(status.dataset.i18nParams) : {};
  } catch (error) {
    params = {};
  }

  status.textContent = t(key, params);
};

const createRafDragController = (applyPosition) => {
  let frameId = 0;
  let pendingPosition = null;

  const flush = () => {
    frameId = 0;
    if (!pendingPosition) {
      return;
    }
    const nextPosition = pendingPosition;
    pendingPosition = null;
    applyPosition(nextPosition);
  };

  return {
    schedule(position) {
      pendingPosition = position;
      if (frameId) {
        return;
      }
      frameId = requestAnimationFrame(flush);
    },
    flush() {
      if (!pendingPosition) {
        return;
      }
      if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
      const nextPosition = pendingPosition;
      pendingPosition = null;
      applyPosition(nextPosition);
    },
    cancel() {
      if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
      pendingPosition = null;
    },
  };
};

const applyDragTransform = (element, translateX, translateY, baseTransform = "") => {
  if (!(element instanceof HTMLElement)) {
    return;
  }
  const translate = `translate3d(${Math.round(translateX)}px, ${Math.round(translateY)}px, 0)`;
  element.style.transform =
    baseTransform && baseTransform !== "none"
      ? `${baseTransform} ${translate}`
      : translate;
};

const resetDragTransform = (element, baseTransform = "") => {
  if (!(element instanceof HTMLElement)) {
    return;
  }
  element.style.transform = baseTransform && baseTransform !== "none" ? baseTransform : "";
};
