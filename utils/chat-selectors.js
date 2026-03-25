/*
 * ChatGPT Conversation Toolkit - Unified DOM selectors
 */
const TURN_CONTAINER_SELECTORS = [
  'section[data-testid^="conversation-turn-"]',
  "section[data-turn-id]",
  "section[data-turn]",
  "[data-message-author-role]",
  "article",
];

const TURN_CONTAINER_SELECTOR = TURN_CONTAINER_SELECTORS.join(",");
const MESSAGE_CONTENT_ROOT_SELECTOR = ".markdown, .prose, [data-message-content]";
const LEAF_BLOCK_SELECTOR = "p, li, pre, code, h1, h2, h3, h4, h5, h6, blockquote, td, th";

const PURE_UI_NOISE_SELECTORS = [
  "svg",
  "use",
  ".sr-only",
  '[data-testid*="action-bar"]',
  '[data-testid*="message-actions"]',
  '[data-testid*="composer-action"]',
  '[data-testid*="quick-action"]',
  '[class*="action-bar"]',
  '[class*="message-action"]',
  '[class*="toolbar-actions"]',
];

const ACTION_KEYWORD_RE =
  /^(copy|like|dislike|more|share|regenerate|retry|edit message|read aloud|source|sources|\u590d\u5236|\u559c\u6b22|\u4e0d\u559c\u6b22|\u66f4\u591a\u64cd\u4f5c|\u5206\u4eab|\u91cd\u8bd5|\u6765\u6e90)$/i;
const ACTION_KEYWORD_FRAGMENT_RE =
  /(copy|like|dislike|more|share|regenerate|retry|edit message|read aloud|\u590d\u5236|\u559c\u6b22|\u4e0d\u559c\u6b22|\u66f4\u591a\u64cd\u4f5c|\u5206\u4eab|\u91cd\u8bd5)/i;

const THOUGHT_TIMER_RE = /^thought\s+for\s*\d+\s*[smh]?$/i;
const THOUGHT_TIMER_ZH_RE = /^\u5df2\u601d\u8003\s*\d+\s*[\u79d2\u5206\u65f6]?$/i;
const FILE_NAME_RE = /(?:^|[\s(/\\])[\w.-]+\.[a-z0-9]{1,8}(?:$|[\s),])/i;
const INTERNAL_SCHEME_RE = /internal:\/\/([^/?#]+)/i;

const syntheticTurnKeyByNode = new WeakMap();

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

const getCurrentSemanticLocale = () => {
  if (typeof getCurrentLanguage === "function") {
    return String(getCurrentLanguage() || "").toLowerCase();
  }
  return String(window?.navigator?.language || "").toLowerCase();
};

const isChineseLocale = () => /^zh\b/i.test(getCurrentSemanticLocale());

const localizeSemantic = (key, params = {}) => {
  const zh = isChineseLocale();
  if (key === "deepResearch") {
    return zh ? "\u6df1\u5ea6\u7814\u7a76" : "Deep Research";
  }
  if (key === "embeddedApp") {
    const appName = params.appName || "internal";
    return zh ? `\u5d4c\u5165\u5e94\u7528\uff1a${appName}` : `[Embedded app: ${appName}]`;
  }
  if (key === "uploadedImage") {
    return zh ? "\u5df2\u4e0a\u4f20\u56fe\u7247" : "Uploaded image";
  }
  if (key === "uploadedImageCount") {
    const count = Number(params.count) || 1;
    return zh ? `\u5df2\u4e0a\u4f20\u56fe\u7247 (${count})` : `Uploaded image (${count})`;
  }
  if (key === "generatedImage") {
    return zh ? "\u56fe\u7247\u5df2\u521b\u5efa" : "Generated image";
  }
  if (key === "generatedImageCount") {
    const count = Number(params.count) || 1;
    return zh ? `\u56fe\u7247\u5df2\u521b\u5efa (${count})` : `Generated image (${count})`;
  }
  if (key === "attachments") {
    const value = params.value || "";
    return zh ? `\u9644\u4ef6\uff1a${value}` : `Attachments: ${value}`;
  }
  if (key === "sources") {
    const value = params.value || "";
    return zh ? `\u6765\u6e90\uff1a${value}` : `Sources: ${value}`;
  }
  return "";
};

const normalizeTextForMerge = (value) => (value || "").replace(/\s+/g, " ").trim();

const normalizeRoleValue = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  if (normalized === "assistant" || normalized === "user") {
    return normalized;
  }
  return normalized;
};

const sortElementsByDomOrder = (elements) =>
  (Array.isArray(elements) ? elements : [])
    .filter((element) => element instanceof Element)
    .sort((left, right) => {
      if (left === right) {
        return 0;
      }
      const position = left.compareDocumentPosition(right);
      if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        return 1;
      }
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
        return -1;
      }
      return 0;
    });

const uniqueElements = (elements) => {
  const seen = new Set();
  const result = [];
  (Array.isArray(elements) ? elements : []).forEach((element) => {
    if (!(element instanceof Element) || seen.has(element)) {
      return;
    }
    seen.add(element);
    result.push(element);
  });
  return result;
};

const normalizeMessageElement = (node) => {
  if (!(node instanceof Element)) {
    return null;
  }
  return (
    node.closest('section[data-testid^="conversation-turn-"], section[data-turn-id], section[data-turn], article') ||
    node.closest("[data-message-author-role]") ||
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
  return (
    node.closest('section[data-testid^="conversation-turn-"], section[data-turn-id], section[data-turn], article') ||
    node.closest("[data-message-author-role]") ||
    null
  );
};

const getElementPathSignature = (node, boundary = null) => {
  if (!(node instanceof Element)) {
    return "";
  }
  const stopNode = boundary instanceof Element ? boundary : getMainContainer();
  const segments = [];
  let current = node;
  while (current && current !== stopNode) {
    const parent = current.parentElement;
    if (!parent) {
      break;
    }
    const index = Array.prototype.indexOf.call(parent.children, current);
    segments.push(`${current.tagName.toLowerCase()}:${Math.max(0, index)}`);
    current = parent;
    if (segments.length >= 10) {
      break;
    }
  }
  return segments.reverse().join("/");
};

const buildSyntheticTurnKey = (turnNode, indexHint = -1) => {
  const conversationKey = getConversationKeyForSelectors() || "unknown";
  const roleSeed = normalizeRoleValue(turnNode.getAttribute("data-turn")) || "unknown";
  const pathSeed = getElementPathSignature(turnNode);
  const indexSeed = indexHint >= 0 ? `:${indexHint}` : "";
  return `turn:synthetic:${conversationKey}:${roleSeed}:${pathSeed}${indexSeed}`;
};

const assignSyntheticTurnKeys = (turnNodes, conversationKey) => {
  const seed = `${conversationKey || "unknown"}:${turnNodes.length}`;
  turnNodes.forEach((turnNode, index) => {
    if (!(turnNode instanceof Element)) {
      return;
    }
    if (turnNode.getAttribute("data-turn-id") || turnNode.getAttribute("data-testid")) {
      return;
    }
    if (syntheticTurnKeyByNode.has(turnNode) && seed === syntheticTurnKeyByNode.get(turnNode)?.seed) {
      return;
    }
    syntheticTurnKeyByNode.set(turnNode, {
      key: buildSyntheticTurnKey(turnNode, index),
      seed,
    });
  });
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
  const cached = syntheticTurnKeyByNode.get(turnNode);
  if (cached?.key) {
    return cached.key;
  }
  return buildSyntheticTurnKey(turnNode);
};

const getMessageTurnContainer = (node) => getTurnContainer(node);

const getMessageTurnKeyFromDom = (node) => {
  const turnNode = getTurnContainer(node);
  if (!(turnNode instanceof Element)) {
    return "";
  }
  return getTurnKeyFromContainer(turnNode);
};

const getTurnRoleNodesFromContainer = (turnNode, role) => {
  if (!(turnNode instanceof Element) || !role) {
    return [];
  }
  return Array.from(turnNode.querySelectorAll(`[data-message-author-role="${role}"]`));
};

const getConversationNodes = () => {
  const main = getMainContainer();
  if (!main) {
    return [];
  }

  const candidates = [];
  TURN_CONTAINER_SELECTORS.forEach((selector) => {
    candidates.push(...Array.from(main.querySelectorAll(selector)));
  });

  const normalized = sortElementsByDomOrder(
    uniqueElements(candidates.map((node) => normalizeMessageElement(node)).filter(Boolean)),
  );

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

  const uniqueNodes = sortElementsByDomOrder(uniqueElements(filteredByConversation));
  assignSyntheticTurnKeys(uniqueNodes, conversationKey);
  return uniqueNodes;
};

const getMessageElements = () => getConversationNodes();

const getRoleFromNodeOrDataset = (node) =>
  normalizeRoleValue(node?.getAttribute?.("data-message-author-role") || node?.dataset?.messageAuthorRole);

const getMessageRoleFromDom = (node) => {
  if (!(node instanceof Element)) {
    return "unknown";
  }

  const explicitRole = getRoleFromNodeOrDataset(node);
  if (explicitRole) {
    return explicitRole;
  }

  const dataTurnRole = normalizeRoleValue(node.getAttribute("data-turn") || node.dataset?.turn);
  if (dataTurnRole) {
    return dataTurnRole;
  }

  const turnNode = getTurnContainer(node);
  const roleFromInner = normalizeRoleValue(
    turnNode?.querySelector?.("[data-message-author-role]")?.getAttribute?.("data-message-author-role"),
  );
  if (roleFromInner) {
    return roleFromInner;
  }

  const turnRole = normalizeRoleValue(turnNode?.getAttribute?.("data-turn") || turnNode?.dataset?.turn);
  if (turnRole) {
    return turnRole;
  }

  if (node.querySelector('img[alt*="ChatGPT" i], svg[aria-label*="ChatGPT" i], svg[aria-label*="Assistant" i]')) {
    return "assistant";
  }
  if (node.querySelector('img[alt*="User" i], svg[aria-label*="User" i]')) {
    return "user";
  }
  return "unknown";
};

const isPureActionNode = (node) => {
  if (!(node instanceof Element)) {
    return false;
  }
  const label = normalizeTextForMerge(
    node.getAttribute("aria-label") ||
      node.getAttribute("data-testid") ||
      node.getAttribute("title") ||
      node.textContent ||
      "",
  ).toLowerCase();
  if (!label) {
    return false;
  }
  if (ACTION_KEYWORD_RE.test(label)) {
    return true;
  }
  if (ACTION_KEYWORD_FRAGMENT_RE.test(label) && /action|copy|like|dislike|more|share|retry/i.test(label)) {
    return true;
  }
  if (!node.matches('button, [role="button"]')) {
    return false;
  }
  if (node.querySelector("img, picture, video, canvas, figure, table, pre, code")) {
    return false;
  }
  return ACTION_KEYWORD_RE.test(label);
};

const removeNoiseNodes = (root) => {
  if (!(root instanceof Element)) {
    return;
  }

  root.querySelectorAll(PURE_UI_NOISE_SELECTORS.join(",")).forEach((node) => node.remove());

  root.querySelectorAll('button, [role="button"], [data-testid*="action"]').forEach((node) => {
    if (!isPureActionNode(node)) {
      return;
    }
    node.remove();
  });
};

const isUiNoiseLine = (line) => {
  const text = normalizeTextForMerge(line);
  if (!text) {
    return true;
  }
  if (THOUGHT_TIMER_RE.test(text) || THOUGHT_TIMER_ZH_RE.test(text)) {
    return true;
  }
  return ACTION_KEYWORD_RE.test(text);
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

  const contentRoots = Array.from(root.querySelectorAll(MESSAGE_CONTENT_ROOT_SELECTOR));
  const roots = contentRoots.length > 0 ? contentRoots : [root];

  const blocks = [];
  roots.forEach((contentRoot) => {
    const leafNodes = Array.from(contentRoot.querySelectorAll(LEAF_BLOCK_SELECTOR)).filter(
      (node) => !node.querySelector(LEAF_BLOCK_SELECTOR),
    );
    if (leafNodes.length > 0) {
      blocks.push(...leafNodes);
      return;
    }
    blocks.push(contentRoot);
  });

  return blocks;
};

const extractContentTextFromPreparedRoot = (root) => {
  if (!(root instanceof Element)) {
    return "";
  }

  const blocks = getLeafContentBlocks(root);
  const seenBlockTexts = new Set();

  let text = "";
  blocks.forEach((block) => {
    const blockText = normalizeTextForMerge(block.textContent || "");
    if (!blockText || seenBlockTexts.has(blockText)) {
      return;
    }
    seenBlockTexts.add(blockText);
    text = appendSegmentConservative(text, blockText);
  });
  return filterUiNoiseText(text);
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
  return extractContentTextFromPreparedRoot(root);
};

const looksLikeFileLabel = (value) => {
  const text = normalizeTextForMerge(value);
  if (!text) {
    return false;
  }
  if (FILE_NAME_RE.test(text)) {
    return true;
  }
  return /\b(file|attachment|upload)\b/i.test(text) || /[\u9644\u4ef6\u6587\u4ef6\u4e0a\u4f20]/.test(text);
};

const isLikelyDecorativeImage = (img) => {
  if (!(img instanceof HTMLImageElement)) {
    return true;
  }
  if (img.getAttribute("aria-hidden") === "true") {
    return true;
  }
  const className = String(img.className || "").toLowerCase();
  if (/(blur|backdrop|background|placeholder|ghost|shadow)/i.test(className)) {
    return true;
  }
  const src = String(img.currentSrc || img.src || "").toLowerCase();
  if (!src || src.startsWith("data:image/svg")) {
    return true;
  }
  return false;
};

const isLikelyAvatarImage = (img) => {
  if (!(img instanceof HTMLImageElement)) {
    return false;
  }
  const alt = String(img.alt || "").toLowerCase();
  if (/(chatgpt|assistant|avatar|user)/i.test(alt)) {
    return true;
  }
  const width = Number(img.naturalWidth || img.width || 0);
  const height = Number(img.naturalHeight || img.height || 0);
  return width > 0 && height > 0 && width <= 64 && height <= 64;
};

const extractInternalAppName = (iframe) => {
  if (!(iframe instanceof HTMLIFrameElement)) {
    return "";
  }
  const title = iframe.getAttribute("title") || "";
  const src = iframe.getAttribute("src") || "";
  const raw = title || src;
  const match = String(raw).match(INTERNAL_SCHEME_RE);
  return match?.[1] ? match[1].toLowerCase() : "";
};

const extractSyntheticArtifactsFromNode = (root, role, rawText) => {
  if (!(root instanceof Element)) {
    return { syntheticText: "", semanticKinds: [] };
  }

  const syntheticSegments = [];
  const semanticKinds = new Set();

  const iframeLabels = [];
  root.querySelectorAll("iframe").forEach((iframe) => {
    if (!(iframe instanceof HTMLIFrameElement)) {
      return;
    }
    const appName = extractInternalAppName(iframe);
    if (!appName) {
      return;
    }
    semanticKinds.add("iframe");
    if (appName === "deep-research") {
      iframeLabels.push(localizeSemantic("deepResearch"));
      return;
    }
    iframeLabels.push(localizeSemantic("embeddedApp", { appName }));
  });
  const uniqueIframes = Array.from(new Set(iframeLabels));
  if (uniqueIframes.length > 0) {
    syntheticSegments.push(uniqueIframes.join(" | "));
  }

  const imageSet = new Set();
  const imageAlts = [];
  root.querySelectorAll("img").forEach((imgNode) => {
    if (!(imgNode instanceof HTMLImageElement)) {
      return;
    }
    if (isLikelyDecorativeImage(imgNode) || isLikelyAvatarImage(imgNode)) {
      return;
    }
    const src = String(imgNode.currentSrc || imgNode.src || "").trim();
    if (!src || imageSet.has(src)) {
      return;
    }
    imageSet.add(src);
    const alt = normalizeTextForMerge(imgNode.alt || "");
    if (alt && !ACTION_KEYWORD_RE.test(alt)) {
      imageAlts.push(alt);
    }
  });
  const imageCount = imageSet.size;
  if (imageCount > 0) {
    semanticKinds.add("image");
    if (role === "user") {
      syntheticSegments.push(
        imageCount > 1
          ? localizeSemantic("uploadedImageCount", { count: imageCount })
          : localizeSemantic("uploadedImage"),
      );
    } else {
      const statusFromText = normalizeTextForMerge(rawText).match(
        /(image created|generated image|\u56fe\u7247\u5df2\u521b\u5efa|[\u5df2\u751f\u6210]{2}.*\u56fe\u7247)/i,
      );
      const altStatus = imageAlts.find((alt) =>
        /(generated|image|created|\u751f\u6210|\u56fe\u7247|\u521b\u5efa)/i.test(alt),
      );
      if (statusFromText?.[0]) {
        syntheticSegments.push(statusFromText[0]);
      } else if (altStatus) {
        syntheticSegments.push(altStatus);
      } else {
        syntheticSegments.push(
          imageCount > 1
            ? localizeSemantic("generatedImageCount", { count: imageCount })
            : localizeSemantic("generatedImage"),
        );
      }
    }
  }

  const fileLabels = [];
  root
    .querySelectorAll(
      [
        '[class*="file-tile"]',
        '[data-testid*="file"]',
        '[data-testid*="attachment"]',
        "[data-default-action]",
        "a[download]",
      ].join(","),
    )
    .forEach((node) => {
      if (!(node instanceof Element)) {
        return;
      }
      const downloadName = normalizeTextForMerge(node.getAttribute("download") || "");
      const text = normalizeTextForMerge(node.textContent || "");
      const label = downloadName || text;
      if (!looksLikeFileLabel(label)) {
        return;
      }
      fileLabels.push(label);
    });
  const uniqueFiles = Array.from(new Set(fileLabels)).slice(0, 4);
  if (uniqueFiles.length > 0) {
    semanticKinds.add("file");
    syntheticSegments.push(localizeSemantic("attachments", { value: uniqueFiles.join(", ") }));
  }

  const citationLabelSet = new Set();
  const pushCitationLabel = (value) => {
    const text = normalizeTextForMerge(value);
    if (!text) {
      return;
    }
    if (/^(source|sources|来源)$/i.test(text)) {
      citationLabelSet.add(isChineseLocale() ? "来源" : "Sources");
      return;
    }
    if (ACTION_KEYWORD_RE.test(text)) {
      return;
    }
    citationLabelSet.add(text);
  };

  const collectCitationLabelsFromNode = (node) => {
    if (!(node instanceof Element)) {
      return;
    }
    const links = Array.from(node.querySelectorAll("a[href]"));
    if (links.length > 0) {
      links.forEach((link) => {
        const explicitLabel = normalizeTextForMerge(
          link.textContent || link.getAttribute("title") || link.getAttribute("aria-label") || "",
        );
        if (explicitLabel) {
          pushCitationLabel(explicitLabel);
          return;
        }
        const href = link.getAttribute("href") || "";
        try {
          const hostname = new URL(href, window.location.href).hostname.replace(/^www\./i, "");
          pushCitationLabel(hostname);
        } catch (error) {
          pushCitationLabel(href);
        }
      });
      return;
    }

    pushCitationLabel(
      node.getAttribute("aria-label") ||
        node.getAttribute("data-testid") ||
        node.textContent ||
        "",
    );
  };

  root
    .querySelectorAll(
      [
        '[data-testid="webpage-citation-pill"]',
        '[data-testid*="citation-pill"]',
        '[data-testid*="footnote"]',
        '[class*="footnote"]',
        '[aria-label*="source" i]',
        '[aria-label*="来源" i]',
      ].join(","),
    )
    .forEach((node) => collectCitationLabelsFromNode(node));

  const uniqueCitations = Array.from(citationLabelSet).slice(0, 4);
  if (uniqueCitations.length > 0) {
    semanticKinds.add("citation");
    const hasOnlyMarker = uniqueCitations.every((label) => /^(source|sources|来源)$/i.test(label));
    const summary = hasOnlyMarker
      ? isChineseLocale()
        ? "已附带来源"
        : "available"
      : uniqueCitations.join(", ");
    syntheticSegments.push(localizeSemantic("sources", { value: summary }));
  }

  const syntheticText = filterUiNoiseText(
    syntheticSegments
      .map((segment) => normalizeTextForMerge(segment))
      .filter(Boolean)
      .join(" | "),
  );

  return {
    syntheticText,
    semanticKinds: Array.from(semanticKinds),
  };
};

const mergeSemanticText = (rawText, syntheticText) => {
  const raw = normalizeTextForMerge(rawText);
  const synthetic = normalizeTextForMerge(syntheticText);
  if (!raw) {
    return synthetic;
  }
  if (!synthetic) {
    return raw;
  }
  if (raw.includes(synthetic)) {
    return raw;
  }
  if (synthetic.includes(raw)) {
    return synthetic;
  }
  return `${raw} | ${synthetic}`;
};

const collectRoleNodesFromTurn = (node, role) => {
  const turnNode = getTurnContainer(node);
  if (!(turnNode instanceof Element)) {
    return [];
  }
  if (role && role !== "unknown") {
    return getTurnRoleNodesFromContainer(turnNode, role);
  }
  const roleNodes = Array.from(turnNode.querySelectorAll("[data-message-author-role]"));
  return roleNodes;
};

const getMessageSemanticFromDom = (node) => {
  if (!(node instanceof Element)) {
    return {
      text: "",
      rawText: "",
      syntheticText: "",
      semanticKind: "",
      hasSemanticContent: false,
      isSynthetic: false,
    };
  }

  const role = getMessageRoleFromDom(node);
  const roleNodes = collectRoleNodesFromTurn(node, role);
  const scopedNodes = roleNodes.length > 0 ? roleNodes : [node];

  let mergedRawText = "";
  let mergedSyntheticText = "";
  const semanticKinds = new Set();

  scopedNodes.forEach((roleNode) => {
    if (!(roleNode instanceof Element)) {
      return;
    }
    const cloned = roleNode.cloneNode(true);
    if (!(cloned instanceof Element)) {
      return;
    }

    const artifact = extractSyntheticArtifactsFromNode(cloned, role, mergedRawText);
    artifact.semanticKinds.forEach((kind) => semanticKinds.add(kind));
    mergedSyntheticText = appendSegmentConservative(mergedSyntheticText, artifact.syntheticText);

    removeNoiseNodes(cloned);
    const rawText = extractContentTextFromPreparedRoot(cloned);
    mergedRawText = appendSegmentConservative(mergedRawText, rawText);
  });

  if (mergedRawText) {
    semanticKinds.add("text");
  }

  const text = mergeSemanticText(mergedRawText, mergedSyntheticText);
  return {
    text,
    rawText: normalizeTextForMerge(mergedRawText),
    syntheticText: normalizeTextForMerge(mergedSyntheticText),
    semanticKind: Array.from(semanticKinds).join(","),
    hasSemanticContent: Boolean(text),
    isSynthetic: !normalizeTextForMerge(mergedRawText) && Boolean(normalizeTextForMerge(mergedSyntheticText)),
  };
};

const getMessageTextFromDom = (node) => getMessageSemanticFromDom(node).text;

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

  const turnKey = getMessageTurnKeyFromDom(node);
  if (turnKey) {
    const role = getMessageRoleFromDom(node) || "unknown";
    return `msg:${turnKey}:${role}`;
  }

  const roleNode = node.matches("[data-message-author-role]")
    ? node
    : node.querySelector("[data-message-author-role]");
  const role = roleNode?.getAttribute("data-message-author-role") || "unknown";
  const text = getMessageTextFromDom(node).slice(0, 60);
  const conversationKey = getConversationKeyForSelectors();
  return `fallback:${conversationKey}:${role}:${index}:${text}`;
};

const getUserMessageElements = () =>
  getMessageElements().filter((node) => getMessageRoleFromDom(node) === "user");
