/*
 * ChatGPT Conversation Toolkit - Unified DOM selectors
 */
const getMainContainer = () =>
  document.querySelector("main") ||
  document.querySelector('[data-testid="conversation-view"]') ||
  document.body;

const getConversationKeyForSelectors = () =>
  typeof state !== "undefined" && state?.conversationKey
    ? state.conversationKey
    : typeof getConversationKey === "function"
      ? getConversationKey()
      : window.location.pathname;

const normalizeMessageElement = (node) => {
  if (!(node instanceof Element)) {
    return null;
  }
  return (
    node.closest('[data-testid^="conversation-turn-"]') ||
    node.closest("article") ||
    node
  );
};

const getMessageConversationIdFromDom = (node) => {
  if (!(node instanceof Element)) {
    return null;
  }
  return (
    node.getAttribute("data-conversation-id") ||
    node.dataset?.conversationId ||
    node.querySelector("[data-conversation-id]")?.getAttribute("data-conversation-id") ||
    null
  );
};

const getTurnContainer = (node) => {
  if (!(node instanceof Element)) {
    return null;
  }
  return node.closest('[data-testid^="conversation-turn-"]') || node.closest("[data-turn-id]") || null;
};

const getTurnKeyFromContainer = (turnNode) => {
  if (!(turnNode instanceof Element)) {
    return "";
  }
  const turnId = turnNode.getAttribute("data-turn-id");
  if (turnId) {
    return `turn:${turnId}`;
  }
  const testId = turnNode.getAttribute("data-testid");
  if (testId) {
    return `turn:${testId}`;
  }
  return "";
};

const getMessageTurnContainer = (node) => getTurnContainer(node);

const getMessageTurnKeyFromDom = (node) => {
  const turnNode = getTurnContainer(node);
  return getTurnKeyFromContainer(turnNode);
};

const getTurnRoleNodesFromContainer = (turnNode, role) => {
  if (!(turnNode instanceof Element) || !role) {
    return [];
  }
  return Array.from(turnNode.querySelectorAll(`[data-message-author-role="${role}"]`));
};

const getMessageDomKey = (node, index = -1) => {
  if (!(node instanceof Element)) {
    return index >= 0 ? `message-${index}` : "";
  }

  const messageId =
    node.getAttribute("data-message-id") ||
    node.querySelector("[data-message-id]")?.getAttribute("data-message-id");
  if (messageId) {
    return `mid:${messageId}`;
  }

  const testId = node.getAttribute("data-testid");
  if (testId) {
    return `tid:${testId}`;
  }

  const roleNode = node.matches("[data-message-author-role]")
    ? node
    : node.querySelector("[data-message-author-role]");
  const role = roleNode?.getAttribute("data-message-author-role") || "unknown";
  const text = getMessageTextFromDom(node).slice(0, 60);
  const conversationKey = getConversationKeyForSelectors();
  return `fallback:${conversationKey}:${role}:${index}:${text}`;
};

const getConversationNodes = () => {
  const main = getMainContainer();
  if (!main) {
    return [];
  }

  const candidates = [
    ...Array.from(main.querySelectorAll("[data-message-author-role]")),
    ...Array.from(main.querySelectorAll("article")),
  ];

  const normalized = candidates.map((node) => normalizeMessageElement(node)).filter(Boolean);
  const conversationKey = getConversationKeyForSelectors();

  const filteredByConversation = (() => {
    if (!conversationKey) {
      return normalized;
    }
    const scoped = normalized.filter((node) => {
      const nodeConversationId = getMessageConversationIdFromDom(node);
      return !nodeConversationId || nodeConversationId === conversationKey;
    });
    return scoped.length > 0 ? scoped : normalized;
  })();

  const seen = new Set();
  const uniqueNodes = [];
  filteredByConversation.forEach((node, index) => {
    const key = getMessageDomKey(node, index) || `node-${index}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    uniqueNodes.push(node);
  });
  return uniqueNodes;
};

const getMessageElements = () => getConversationNodes();

const getMessageRoleFromDom = (node) => {
  if (!(node instanceof Element)) {
    return "unknown";
  }

  const explicitRole =
    node.getAttribute("data-message-author-role") || node.dataset?.messageAuthorRole;
  if (explicitRole) {
    return explicitRole;
  }

  if (node.querySelector('[data-message-author-role="assistant"]')) {
    return "assistant";
  }
  if (node.querySelector('[data-message-author-role="user"]')) {
    return "user";
  }
  if (node.querySelector('img[alt*="ChatGPT"], svg[aria-label*="ChatGPT"], svg[aria-label*="Assistant"]')) {
    return "assistant";
  }
  if (node.querySelector('img[alt*="User"], svg[aria-label*="User"]')) {
    return "user";
  }
  return "unknown";
};

const normalizeTextForMerge = (value) => (value || "").replace(/\s+/g, " ").trim();

const removeNoiseNodes = (root) => {
  if (!(root instanceof Element)) {
    return;
  }
  root
    .querySelectorAll(
      [
        "button",
        '[role="button"]',
        '[data-testid*="action"]',
        '[aria-label*="copy" i]',
        '[aria-label*="like" i]',
        '[aria-label*="dislike" i]',
        '[aria-label*="more" i]',
        "svg",
        "use",
      ].join(","),
    )
    .forEach((node) => node.remove());
};

const isUiNoiseLine = (line) => {
  const text = normalizeTextForMerge(line);
  if (!text) {
    return true;
  }

  if (/^thought\s+for\s*\d+\s*[smh]?$/i.test(text)) {
    return true;
  }
  if (/^已思考\s*\d+\s*[秒分时]?$/i.test(text)) {
    return true;
  }
  if (/^(来源|copy|复制|喜欢|不喜欢|更多操作|shared from|source)$/i.test(text)) {
    return true;
  }
  if (/^(README(\.en)?|manifest|contentScript|toolbar|collapse|search|export|timeline|folders|theme)$/i.test(text)) {
    return true;
  }
  return false;
};

const filterUiNoiseText = (value) => {
  const lines = (value || "")
    .split(/\n+/)
    .map((line) => normalizeTextForMerge(line))
    .filter((line) => line && !isUiNoiseLine(line));
  return lines.join("\n");
};

const appendSegmentConservative = (base, segment) => {
  const next = normalizeTextForMerge(segment);
  if (!next) {
    return base;
  }
  if (!base) {
    return next;
  }
  if (base === next) {
    return base;
  }
  if (base.includes(next)) {
    return base;
  }
  if (next.includes(base)) {
    return next;
  }
  if (base.endsWith(next)) {
    return base;
  }

  const maxOverlap = Math.min(base.length, next.length);
  let overlap = 0;
  for (let len = maxOverlap; len > 0; len -= 1) {
    if (base.slice(-len) === next.slice(0, len)) {
      overlap = len;
      break;
    }
  }
  const tail = next.slice(overlap).trim();
  if (!tail) {
    return base;
  }
  return `${base}\n\n${tail}`;
};

const getLeafContentBlocks = (root) => {
  if (!(root instanceof Element)) {
    return [];
  }

  const leafSelector = "p, li, pre, code, h1, h2, h3, h4, h5, h6, blockquote";
  const contentRoots = Array.from(root.querySelectorAll(".markdown, .prose, [data-message-content]"));
  const roots = contentRoots.length > 0 ? contentRoots : [root];

  const blocks = [];
  roots.forEach((contentRoot) => {
    const leafNodes = Array.from(contentRoot.querySelectorAll(leafSelector)).filter(
      (node) => !node.querySelector(leafSelector),
    );

    if (leafNodes.length > 0) {
      blocks.push(...leafNodes);
      return;
    }

    blocks.push(contentRoot);
  });

  return blocks;
};

const extractContentTextFromNode = (node) => {
  if (!(node instanceof Element)) {
    return "";
  }

  const root = node.cloneNode(true);
  if (!(root instanceof Element)) {
    return "";
  }

  removeNoiseNodes(root);

  const blocks = getLeafContentBlocks(root);
  const seenBlockTexts = new Set();

  let text = "";
  blocks.forEach((block) => {
    const blockText = normalizeTextForMerge(block.textContent || "");
    if (!blockText) {
      return;
    }
    if (seenBlockTexts.has(blockText)) {
      return;
    }
    seenBlockTexts.add(blockText);
    text = appendSegmentConservative(text, blockText);
  });
  return filterUiNoiseText(text);
};

const collectRoleNodesFromTurn = (node, role) => {
  const turnNode = getTurnContainer(node);
  if (!(turnNode instanceof Element) || !role || role === "unknown") {
    return [];
  }
  return getTurnRoleNodesFromContainer(turnNode, role);
};

const getMessageTextFromDom = (node) => {
  if (!(node instanceof Element)) {
    return "";
  }

  const role = getMessageRoleFromDom(node);
  const roleNodes = collectRoleNodesFromTurn(node, role);
  const scopedNodes = roleNodes.length > 0 ? roleNodes : [node];

  let merged = "";
  scopedNodes.forEach((roleNode) => {
    const text = extractContentTextFromNode(roleNode);
    if (!text) {
      return;
    }
    merged = appendSegmentConservative(merged, text);
  });

  return normalizeTextForMerge(merged);
};

const getUserMessageElements = () =>
  getMessageElements().filter((node) => getMessageRoleFromDom(node) === "user");