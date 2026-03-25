/*
 * ChatGPT Conversation Toolkit - Conversation export
 */
const normalizeExportText = (value) => (value || "").replace(/\s+/g, " ").trim();
const MARKDOWN_CONTENT_SELECTOR = ".markdown, .prose, [data-message-content]";
const SEMANTIC_BLOCK_SELECTOR = "h1, h2, h3, h4, h5, h6, p, ul, ol, pre, table, blockquote, code";
const MARKDOWN_EXPORT_NOISE_SELECTORS = [
  "button",
  '[role="button"]',
  '[data-testid*="action"]',
  '[aria-label*="copy" i]',
  '[aria-label*="like" i]',
  '[aria-label*="dislike" i]',
  '[aria-label*="more" i]',
  '[aria-label*="share" i]',
  '[aria-label*="actions" i][role="group"]',
  '[aria-label*="\u64cd\u4f5c" i][role="group"]',
  ".sr-only",
  '[class*="sr-only"]',
  "svg",
  "use",
];
const MARKDOWN_ARTIFACT_CONSUMED_ATTR = "data-md-artifact-consumed";
const MARKDOWN_CODE_LANGUAGE_ALIASES = {
  plaintext: "",
  text: "",
  txt: "",
  js: "javascript",
  ts: "typescript",
  py: "python",
  shell: "bash",
  sh: "bash",
  yml: "yaml",
};
const MARKDOWN_CODE_LANGUAGE_SET = new Set([
  "bash",
  "c",
  "cpp",
  "csharp",
  "css",
  "diff",
  "dockerfile",
  "go",
  "graphql",
  "html",
  "ini",
  "java",
  "javascript",
  "json",
  "jsx",
  "kotlin",
  "lua",
  "markdown",
  "md",
  "objective-c",
  "perl",
  "php",
  "powershell",
  "python",
  "r",
  "ruby",
  "rust",
  "scala",
  "sql",
  "swift",
  "toml",
  "typescript",
  "tsx",
  "xml",
  "yaml",
  "vue",
]);
const getExactOverlapLength = (base, next) => {
  const maxOverlap = Math.min(base.length, next.length);
  for (let len = maxOverlap; len > 0; len -= 1) {
    if (base.slice(-len) === next.slice(0, len)) {
      return len;
    }
  }
  return 0;
};

const appendAssistantSegment = (base, segment) => {
  const current = normalizeExportText(base);
  const next = normalizeExportText(segment);
  if (!next) {
    return current;
  }
  if (!current) {
    return next;
  }
  if (current === next) {
    return current;
  }
  // Exact containment only (conservative).
  if (current.includes(next)) {
    return current;
  }
  if (next.includes(current)) {
    return next;
  }

  // Exact suffix/prefix overlap only.
  const overlap = getExactOverlapLength(current, next);
  if (overlap <= 0) {
    // Keep both segments when there is no exact overlap to avoid dropping tail content.
    return `${current}\n\n${next}`;
  }

  const tail = next.slice(overlap).trim();
  if (!tail) {
    return current;
  }
  return `${current}\n\n${tail}`;
};

const mergeSemanticKinds = (base, next) => {
  const values = new Set();
  [base, next].forEach((value) => {
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => values.add(item));
  });
  return Array.from(values).join(",");
};

const mergeImageAssets = (baseImages, nextImages) => {
  const merged = [];
  const seen = new Set();
  [baseImages, nextImages].forEach((images) => {
    (Array.isArray(images) ? images : []).forEach((image) => {
      if (!image || !image.src) {
        return;
      }
      const key = `${image.src}::${image.kind || ""}::${image.alt || ""}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      merged.push(image);
    });
  });
  return merged;
};

const mergeEmbedAssets = (baseEmbeds, nextEmbeds) => {
  const merged = [];
  const seen = new Set();
  [baseEmbeds, nextEmbeds].forEach((embeds) => {
    (Array.isArray(embeds) ? embeds : []).forEach((embed) => {
      if (!embed || !embed.type) {
        return;
      }
      const key = `${embed.type}::${embed.src || ""}::${embed.title || ""}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      merged.push(embed);
    });
  });
  return merged;
};

const isLikelyDecorativeExportImage = (img) => {
  if (!(img instanceof HTMLImageElement)) {
    return true;
  }
  if (img.getAttribute("aria-hidden") === "true") {
    return true;
  }
  const src = String(img.currentSrc || img.src || "").trim();
  if (!src || /^data:image\/svg/i.test(src) || /google\.com\/s2\/favicons/i.test(src)) {
    return true;
  }
  const className = String(img.className || "");
  if (/(icon|avatar|emoji|favicon)/i.test(className)) {
    return true;
  }
  const width = Number(img.naturalWidth || img.width || img.getAttribute("width") || 0);
  const height = Number(img.naturalHeight || img.height || img.getAttribute("height") || 0);
  const alt = normalizeExportText(img.alt || "");
  if (width > 0 && height > 0 && width <= 48 && height <= 48 && !/(image|图片|上传|生成)/i.test(alt)) {
    return true;
  }
  return false;
};

const detectImageAssetKind = (img, role = "unknown") => {
  const alt = normalizeExportText(img?.alt || "").toLowerCase();
  const generatedHint =
    /(generated|image created|created image|已生成|图片已创建|生成图片)/i.test(alt) ||
    Boolean(img?.closest?.('[class*="imagegen"], [class*="image-gen"], [id^="image-"]'));
  if (generatedHint) {
    return "generated";
  }
  const uploadedHint = role === "user" || /(uploaded|upload|已上传|上传的图片)/i.test(alt);
  if (uploadedHint) {
    return "uploaded";
  }
  return "inline";
};

const extractImageAssetsFromMessageNode = (node, role = "unknown") => {
  if (!(node instanceof Element)) {
    return [];
  }
  const images = [];
  const seenSrc = new Set();
  node.querySelectorAll("img").forEach((imgNode) => {
    if (!(imgNode instanceof HTMLImageElement) || isLikelyDecorativeExportImage(imgNode)) {
      return;
    }
    const src = String(imgNode.currentSrc || imgNode.src || "").trim();
    if (!src || seenSrc.has(src)) {
      return;
    }
    seenSrc.add(src);

    const width = Number(imgNode.naturalWidth || imgNode.width || imgNode.getAttribute("width") || 0);
    const height = Number(imgNode.naturalHeight || imgNode.height || imgNode.getAttribute("height") || 0);
    const item = {
      src,
      alt: normalizeExportText(imgNode.alt || ""),
      kind: detectImageAssetKind(imgNode, role),
    };
    if (width > 0) {
      item.width = width;
    }
    if (height > 0) {
      item.height = height;
    }
    images.push(item);
  });
  return images;
};

const getDeepResearchIframeFromNode = (node) => {
  if (!(node instanceof Element)) {
    return null;
  }
  const direct = node.matches('iframe[title^="internal://deep-research" i]') ? node : null;
  if (direct instanceof HTMLIFrameElement) {
    return direct;
  }
  const nested = node.querySelector('iframe[title^="internal://deep-research" i]');
  return nested instanceof HTMLIFrameElement ? nested : null;
};

const extractDeepResearchEmbedFromMessageNode = (node) => {
  const iframe = getDeepResearchIframeFromNode(node);
  if (!(iframe instanceof HTMLIFrameElement)) {
    return null;
  }
  const title = normalizeExportText(iframe.getAttribute("title") || "");
  const src = String(iframe.getAttribute("src") || "").trim();
  return {
    type: "deep-research",
    title: title || "internal://deep-research",
    src,
  };
};

const buildRichExportPayloadForMessage = async (message) => {
  const node = message?.node;
  const role = message?.role || "unknown";
  const images = extractImageAssetsFromMessageNode(node, role);
  const embeds = [];

  const deepResearchEmbed = extractDeepResearchEmbedFromMessageNode(node);
  if (deepResearchEmbed) {
    embeds.push(deepResearchEmbed);
  }

  const hasRichContent = images.length > 0 || embeds.length > 0;
  return {
    images,
    embeds,
    hasRichContent,
  };
};

const enrichMessagesForJsonExport = async (messages) => {
  const enriched = [];
  const source = Array.isArray(messages) ? messages : [];
  for (const message of source) {
    if (!message) {
      continue;
    }
    try {
      const rich = await buildRichExportPayloadForMessage(message);
      const text = normalizeExportText(message.text || "");
      const syntheticText = normalizeExportText(message.syntheticText || "");
      enriched.push({
        ...message,
        text: text || syntheticText,
        images: Array.isArray(rich.images) ? rich.images : [],
        embeds: Array.isArray(rich.embeds) ? rich.embeds : [],
        hasRichContent: Boolean(rich.hasRichContent),
      });
    } catch (error) {
      console.warn("[conversation-export] Failed to enrich JSON message with rich content.", {
        role: message?.role || "unknown",
        turnKey: message?.turnKey || "",
        error,
      });
      enriched.push({
        ...message,
        text: normalizeExportText(message.text || message.syntheticText || ""),
      });
    }
  }
  return enriched;
};

const toExportJsonMessage = (item, index) => {
  const message = {
    index: index + 1,
    role: item?.role || "unknown",
    text: normalizeExportText(item?.text || item?.syntheticText || ""),
  };
  if (item?.turnKey) {
    message.turnKey = item.turnKey;
  }
  if (item?.semanticKind) {
    message.semanticKind = item.semanticKind;
  }
  if (item?.syntheticText) {
    message.syntheticText = item.syntheticText;
  }
  if (item?.isSynthetic) {
    message.isSynthetic = true;
  }
  if (Array.isArray(item?.images) && item.images.length > 0) {
    message.images = item.images;
  }
  if (Array.isArray(item?.embeds) && item.embeds.length > 0) {
    message.embeds = item.embeds;
  }
  if (item?.hasRichContent) {
    message.hasRichContent = true;
  }
  return message;
};

const mergeAssistantByTurn = (messages) => {
  const merged = [];

  messages.forEach((message) => {
    const role = message?.role || "unknown";
    const text = normalizeExportText(message?.text || message?.syntheticText || "");
    const turnKey = message?.turnKey || "";
    const syntheticText = normalizeExportText(message?.syntheticText || "");
    const semanticKind = String(message?.semanticKind || "").trim();
    const isSynthetic = Boolean(message?.isSynthetic);
    const images = Array.isArray(message?.images) ? message.images : [];
    const embeds = Array.isArray(message?.embeds) ? message.embeds : [];
    const hasRichContent = Boolean(message?.hasRichContent || images.length > 0 || embeds.length > 0);
    if (!text && !hasRichContent) {
      return;
    }

    const current = {
      role,
      text,
      turnKey,
      syntheticText,
      semanticKind,
      isSynthetic,
      images,
      embeds,
      hasRichContent,
    };
    if (merged.length === 0) {
      merged.push(current);
      return;
    }

    const prev = merged[merged.length - 1];
    const canMergeAssistant =
      role === "assistant" &&
      prev.role === "assistant" &&
      Boolean(turnKey) &&
      prev.turnKey === turnKey;

    if (!canMergeAssistant) {
      merged.push(current);
      return;
    }

    prev.text = appendAssistantSegment(prev.text, text);
    prev.syntheticText = appendAssistantSegment(prev.syntheticText, syntheticText);
    prev.semanticKind = mergeSemanticKinds(prev.semanticKind, semanticKind);
    prev.isSynthetic = Boolean(prev.isSynthetic || isSynthetic);
    prev.images = mergeImageAssets(prev.images, images);
    prev.embeds = mergeEmbedAssets(prev.embeds, embeds);
    prev.hasRichContent = Boolean(prev.hasRichContent || hasRichContent);
  });

  return merged.map((item, index) => toExportJsonMessage(item, index));
};

const getRoleNodeFromMessageNode = (node) => {
  if (!(node instanceof Element)) {
    return null;
  }
  return (
    (node.matches("[data-message-author-role]") ? node : null) ||
    node.querySelector("[data-message-author-role]") ||
    node
  );
};

const getTurnContainerForExport = (node) => {
  if (!(node instanceof Element)) {
    return null;
  }
  return (
    (node.matches('[data-testid^="conversation-turn-"], [data-turn-id]') ? node : null) ||
    node.closest('[data-testid^="conversation-turn-"]') ||
    node.closest("[data-turn-id]") ||
    node
  );
};

const pushUniqueElement = (buffer, seen, node) => {
  if (!(node instanceof Element) || seen.has(node)) {
    return;
  }
  seen.add(node);
  buffer.push(node);
};

const getRoleNodesForExport = (message) => {
  const node = message?.node;
  if (!(node instanceof Element)) {
    return [];
  }

  const role = String(message?.role || "").trim();
  const turnNode = getTurnContainerForExport(node);
  const roleNodes =
    role && role !== "unknown" && turnNode instanceof Element
      ? Array.from(turnNode.querySelectorAll(`[data-message-author-role="${role}"]`))
      : [];
  if (roleNodes.length > 0) {
    return roleNodes;
  }

  const fallbackRoleNode = getRoleNodeFromMessageNode(node);
  return fallbackRoleNode instanceof Element ? [fallbackRoleNode] : [];
};

const getMarkdownRootsForRoleNode = (roleNode, role) => {
  if (!(roleNode instanceof Element)) {
    return [];
  }

  const roots = [];
  const seen = new Set();

  if (roleNode.matches(MARKDOWN_CONTENT_SELECTOR)) {
    pushUniqueElement(roots, seen, roleNode);
  }
  Array.from(roleNode.querySelectorAll(MARKDOWN_CONTENT_SELECTOR)).forEach((root) =>
    pushUniqueElement(roots, seen, root),
  );
  if (roots.length > 0) {
    return roots;
  }

  if (role === "user") {
    const userRoot = roleNode.querySelector(".whitespace-pre-wrap");
    if (userRoot instanceof Element) {
      pushUniqueElement(roots, seen, userRoot);
      return roots;
    }
  }

  if (
    roleNode.matches(SEMANTIC_BLOCK_SELECTOR) ||
    roleNode.querySelector(SEMANTIC_BLOCK_SELECTOR) instanceof Element
  ) {
    pushUniqueElement(roots, seen, roleNode);
    return roots;
  }

  pushUniqueElement(roots, seen, roleNode);
  return roots;
};

const getMarkdownRootsForMessage = (message) => {
  const role = message?.role || "unknown";
  const roots = [];
  const seen = new Set();

  getRoleNodesForExport(message).forEach((roleNode) => {
    const roleRoots = getMarkdownRootsForRoleNode(roleNode, role);
    if (roleRoots.length === 0) {
      pushUniqueElement(roots, seen, roleNode);
      return;
    }
    roleRoots.forEach((root) => pushUniqueElement(roots, seen, root));
  });

  return roots;
};

const getTextWithLineBreaks = (node) => {
  if (!node) {
    return "";
  }
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || "";
  }
  if (!(node instanceof Element)) {
    return "";
  }
  if (node.tagName.toLowerCase() === "br") {
    return "\n";
  }
  return Array.from(node.childNodes)
    .map((child) => getTextWithLineBreaks(child))
    .join("");
};

const normalizeCodeLanguageToken = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9#+-]/g, "");
  if (!normalized) {
    return "";
  }
  const mapped = MARKDOWN_CODE_LANGUAGE_ALIASES[normalized];
  return typeof mapped === "string" ? mapped : normalized;
};

const inferCodeLanguageFromSafeLabel = (node) => {
  if (!(node instanceof Element)) {
    return "";
  }

  const candidates = Array.from(
    node.querySelectorAll(
      '[class*="font-medium"], [class*="language"], [data-language], [data-lang], [lang]',
    ),
  );
  for (const candidate of candidates) {
    if (!(candidate instanceof Element) || candidate.closest("#code-block-viewer")) {
      continue;
    }
    if (candidate.querySelector("button, [role=\"button\"]")) {
      continue;
    }
    const text = normalizeExportText(candidate.textContent || "");
    if (!text || text.length > 24 || /\s/.test(text)) {
      continue;
    }
    const lang = normalizeCodeLanguageToken(text);
    if (lang && MARKDOWN_CODE_LANGUAGE_SET.has(lang)) {
      return lang;
    }
  }
  return "";
};

const extractCodeBlockContent = (preNode) => {
  if (!(preNode instanceof Element)) {
    return { language: "", code: "" };
  }

  const codeNode = preNode.querySelector("code");
  if (codeNode instanceof Element) {
    return {
      language: extractCodeLanguage(codeNode) || extractCodeLanguage(preNode),
      code: (codeNode.textContent || "").replace(/\n+$/, ""),
    };
  }

  const codeViewerContent =
    preNode.querySelector("#code-block-viewer .cm-content") ||
    preNode.querySelector("#code-block-viewer [class*=\"readonly\"]") ||
    preNode.querySelector(".cm-content");
  if (codeViewerContent instanceof Element && codeViewerContent.closest("#code-block-viewer")) {
    return {
      language:
        extractCodeLanguage(codeViewerContent) ||
        extractCodeLanguage(codeViewerContent.closest("#code-block-viewer")) ||
        extractCodeLanguage(preNode) ||
        inferCodeLanguageFromSafeLabel(preNode),
      code: getTextWithLineBreaks(codeViewerContent).replace(/\n+$/, ""),
    };
  }

  return {
    language: extractCodeLanguage(preNode) || inferCodeLanguageFromSafeLabel(preNode),
    code: (preNode.textContent || "").replace(/\n+$/, ""),
  };
};

const stripMarkdownExportUiNoise = (root) => {
  if (!(root instanceof Element)) {
    return;
  }

  root.querySelectorAll(MARKDOWN_EXPORT_NOISE_SELECTORS.join(",")).forEach((node) => {
    node.remove();
  });
};

const cloneNodeForMarkdownExport = (node) => {
  if (!(node instanceof Element)) {
    return null;
  }
  const clone = node.cloneNode(true);
  if (!(clone instanceof Element)) {
    return null;
  }
  return clone;
};

const getMarkdownContentRoot = (message) => {
  const roots = getMarkdownRootsForMessage(message);
  return roots[0] || null;
};

const normalizeMarkdownSpacing = (value) =>
  (value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const escapeMarkdownText = (value) =>
  String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/([*_`[\]])/g, "\\$1");

const escapeInlineCode = (value) => String(value || "").replace(/`/g, "\\`");

const escapeTableText = (value) =>
  String(value || "")
    .replace(/\|/g, "\\|")
    .replace(/\n+/g, " ")
    .trim();

const isArtifactConsumedNode = (node) =>
  node instanceof Element && node.getAttribute(MARKDOWN_ARTIFACT_CONSUMED_ATTR) === "1";

const markArtifactConsumed = (node) => {
  if (node instanceof Element) {
    node.setAttribute(MARKDOWN_ARTIFACT_CONSUMED_ATTR, "1");
  }
};

const normalizeArtifactLabel = (value) => normalizeExportText(String(value || ""));

const resolveArtifactHref = (node) => {
  if (!(node instanceof Element)) {
    return "";
  }
  const directHref = node.getAttribute("href");
  if (directHref) {
    return String(directHref).trim();
  }
  const anchor = node.querySelector("a[href]");
  if (anchor instanceof HTMLAnchorElement) {
    return String(anchor.getAttribute("href") || anchor.href || "").trim();
  }
  return "";
};

const resolveArtifactLabel = (node) => {
  if (!(node instanceof Element)) {
    return "";
  }
  const aria = normalizeArtifactLabel(node.getAttribute("aria-label") || "");
  if (aria) {
    return aria;
  }
  return normalizeArtifactLabel(node.textContent || "");
};

const pushUniqueArtifact = (list, item, getKey) => {
  const key = getKey(item);
  if (!key) {
    return;
  }
  if (list.some((existing) => getKey(existing) === key)) {
    return;
  }
  list.push(item);
};

const getImageArtifactKey = (image) => {
  const src = String(image?.src || "").trim();
  const alt = normalizeArtifactLabel(image?.alt || "");
  if (!src) {
    return "";
  }
  return `${src}::${alt}`;
};

const toPositiveNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};

const upsertImageArtifact = (images, image) => {
  if (!Array.isArray(images)) {
    return;
  }
  const key = getImageArtifactKey(image);
  if (!key) {
    return;
  }

  const normalizedImage = {
    src: String(image?.src || "").trim(),
    alt: normalizeArtifactLabel(image?.alt || "") || "image",
    caption: normalizeArtifactLabel(image?.caption || ""),
    kind: normalizeArtifactLabel(image?.kind || ""),
    width: toPositiveNumber(image?.width),
    height: toPositiveNumber(image?.height),
  };

  const existing = images.find((item) => getImageArtifactKey(item) === key);
  if (!existing) {
    images.push(normalizedImage);
    return;
  }

  const existingCaption = normalizeArtifactLabel(existing.caption || "");
  if (!existingCaption && normalizedImage.caption) {
    existing.caption = normalizedImage.caption;
  }

  if (!toPositiveNumber(existing.width) && normalizedImage.width) {
    existing.width = normalizedImage.width;
  }
  if (!toPositiveNumber(existing.height) && normalizedImage.height) {
    existing.height = normalizedImage.height;
  }

  const existingKind = normalizeArtifactLabel(existing.kind || "");
  if (!existingKind && normalizedImage.kind) {
    existing.kind = normalizedImage.kind;
  }
};

const extractMarkdownArtifactsFromNode = (root) => {
  const artifacts = {
    captions: [],
    images: [],
    files: [],
    citations: [],
  };
  if (!(root instanceof Element)) {
    return artifacts;
  }

  root.querySelectorAll("img").forEach((imgNode) => {
    if (!(imgNode instanceof HTMLImageElement) || isLikelyDecorativeExportImage(imgNode)) {
      return;
    }
    const src = String(imgNode.currentSrc || imgNode.src || "").trim();
    if (!src) {
      return;
    }
    const alt = normalizeArtifactLabel(imgNode.getAttribute("alt") || imgNode.alt || "") || "image";
    let caption = "";
    const figure = imgNode.closest("figure");
    if (figure instanceof Element) {
      const figcaption = figure.querySelector("figcaption");
      if (figcaption instanceof Element) {
        caption = normalizeArtifactLabel(figcaption.textContent || "");
        markArtifactConsumed(figcaption);
      }
    }
    const width = toPositiveNumber(imgNode.naturalWidth || imgNode.width || imgNode.getAttribute("width") || 0);
    const height = toPositiveNumber(imgNode.naturalHeight || imgNode.height || imgNode.getAttribute("height") || 0);
    const kind = detectImageAssetKind(imgNode, "unknown");
    upsertImageArtifact(artifacts.images, { src, alt, caption, kind, width, height });
    markArtifactConsumed(imgNode);
  });

  root
    .querySelectorAll('[class*="file-tile"], [data-default-action="true"], [data-testid*="attachment"], [data-testid*="file"], a[download]')
    .forEach((candidate) => {
      if (!(candidate instanceof Element) || isArtifactConsumedNode(candidate)) {
        return;
      }
      const href = resolveArtifactHref(candidate);
      const label = resolveArtifactLabel(candidate);
      if (!href && !label) {
        return;
      }
      if (!href) {
        const normalized = label.toLowerCase();
        if (/^(copy|like|dislike|more|share|collapse|export|search|timeline|folder|folders|theme)$/.test(normalized)) {
          return;
        }
        const fileLike = /[./\\]/.test(label) || /(readme|manifest|attachment|file)/i.test(label);
        if (!fileLike) {
          return;
        }
      }
      pushUniqueArtifact(
        artifacts.files,
        {
          href,
          label: label || "Attachment",
        },
        (item) => `${item.href}::${item.label}`,
      );
      markArtifactConsumed(candidate);
    });

  root
    .querySelectorAll('[data-testid="webpage-citation-pill"], [data-testid*="citation-pill"], [class*="citation-pill"]')
    .forEach((candidate) => {
      if (!(candidate instanceof Element) || isArtifactConsumedNode(candidate)) {
        return;
      }
      const href = resolveArtifactHref(candidate);
      const label = resolveArtifactLabel(candidate);
      if (!href && !label) {
        return;
      }
      pushUniqueArtifact(
        artifacts.citations,
        {
          href,
          label,
        },
        (item) => `${item.href}::${item.label}`,
      );
      markArtifactConsumed(candidate);
    });

  root.querySelectorAll("figcaption").forEach((node) => {
    if (!(node instanceof Element) || isArtifactConsumedNode(node)) {
      return;
    }
    const caption = normalizeArtifactLabel(node.textContent || "");
    if (!caption) {
      return;
    }
    pushUniqueArtifact(artifacts.captions, { text: caption }, (item) => item.text);
    markArtifactConsumed(node);
  });

  return artifacts;
};

const removeConsumedNodes = (root) => {
  if (!(root instanceof Element)) {
    return;
  }

  root.querySelectorAll(`[${MARKDOWN_ARTIFACT_CONSUMED_ATTR}="1"]`).forEach((node) => {
    node.remove();
  });

  let changed = true;
  while (changed) {
    changed = false;
    Array.from(root.querySelectorAll("*")).forEach((node) => {
      if (!(node instanceof Element) || node === root) {
        return;
      }
      if (node.childElementCount > 0) {
        return;
      }
      if (normalizeExportText(node.textContent || "")) {
        return;
      }
      node.remove();
      changed = true;
    });
  }
};

const mergeMarkdownArtifacts = (aggregate, next) => {
  const merged = aggregate || { captions: [], images: [], files: [], citations: [] };
  const source = next || { captions: [], images: [], files: [], citations: [] };
  (source.captions || []).forEach((item) =>
    pushUniqueArtifact(merged.captions, item, (entry) => normalizeArtifactLabel(entry?.text || "")),
  );
  (source.images || []).forEach((item) => upsertImageArtifact(merged.images, item));
  (source.files || []).forEach((item) =>
    pushUniqueArtifact(merged.files, item, (entry) => `${entry?.href || ""}::${entry?.label || ""}`),
  );
  (source.citations || []).forEach((item) =>
    pushUniqueArtifact(merged.citations, item, (entry) => `${entry?.href || ""}::${entry?.label || ""}`),
  );
  return merged;
};

const serializeImageArtifact = (artifact) => {
  const src = String(artifact?.src || "").trim();
  if (!src) {
    return "";
  }
  const alt = escapeMarkdownText(artifact?.alt || "image");
  const imageLine = `![${alt || "image"}](${src})`;
  const caption = normalizeArtifactLabel(artifact?.caption || "");
  if (!caption) {
    return imageLine;
  }
  return `${escapeMarkdownText(caption)}\n\n${imageLine}`;
};

const serializeFileArtifact = (artifact) => {
  const label = escapeMarkdownText(normalizeArtifactLabel(artifact?.label || "")) || "Attachment";
  const href = String(artifact?.href || "").trim();
  if (href) {
    return `- [${label}](${href})`;
  }
  return `- Attachment: ${label}`;
};

const serializeArtifactsBody = (artifacts) => {
  const sections = [];
  const captions = (artifacts?.captions || [])
    .map((item) => escapeMarkdownText(normalizeArtifactLabel(item?.text || "")))
    .filter(Boolean);
  if (captions.length > 0) {
    sections.push(captions.join("\n\n"));
  }

  const images = (artifacts?.images || []).map((item) => serializeImageArtifact(item)).filter(Boolean);
  if (images.length > 0) {
    sections.push(images.join("\n\n"));
  }

  const files = (artifacts?.files || []).map((item) => serializeFileArtifact(item)).filter(Boolean);
  if (files.length > 0) {
    sections.push(files.join("\n"));
  }

  return normalizeMarkdownSpacing(sections.join("\n\n"));
};

const serializeCitationArtifacts = (citations) => {
  const lines = (Array.isArray(citations) ? citations : [])
    .map((item) => {
      const label = escapeMarkdownText(normalizeArtifactLabel(item?.label || ""));
      const href = String(item?.href || "").trim();
      if (href) {
        return `- [${label || href}](${href})`;
      }
      if (label) {
        return `- ${label}`;
      }
      return "";
    })
    .filter(Boolean);

  if (lines.length === 0) {
    return "";
  }
  return `### Sources\n${lines.join("\n")}`;
};

const buildSemanticFallbackMarkdown = (message, artifacts) => {
  const deepResearchEmbed = extractDeepResearchEmbedFromMessageNode(message?.node);
  if (deepResearchEmbed) {
    if (deepResearchEmbed.src) {
      return `### Deep Research\n\nSource: ${deepResearchEmbed.src}`;
    }
    return "### Deep Research";
  }

  const artifactsBody = serializeArtifactsBody(artifacts);
  if (artifactsBody) {
    return artifactsBody;
  }

  const citations = serializeCitationArtifacts(artifacts?.citations || []);
  if (citations) {
    return citations;
  }

  const synthetic = normalizeExportText(message?.syntheticText || "");
  if (synthetic) {
    return escapeMarkdownText(synthetic);
  }
  return "";
};

const extractCodeLanguage = (node) => {
  if (!(node instanceof Element)) {
    return "";
  }

  const className = node.className || "";
  const languageMatch = className.match(/(?:^|\s)language-([a-z0-9#+-]+)/i);
  if (languageMatch?.[1]) {
    return languageMatch[1].toLowerCase();
  }

  const dataLanguage =
    node.getAttribute("data-language") ||
    node.getAttribute("data-lang") ||
    node.getAttribute("lang") ||
    "";
  return String(dataLanguage || "").trim().toLowerCase();
};

const KATEX_SELECTOR = ".katex, .katex-display";

const hasKatexAnnotation = (node) =>
  node instanceof Element &&
  node.querySelector('annotation[encoding="application/x-tex"]') instanceof Element;

const hasKatexMathml = (node) =>
  node instanceof Element &&
  node.querySelector(".katex-mathml") instanceof Element;

const hasKatexPayload = (node) =>
  node instanceof Element &&
  (hasKatexAnnotation(node) ||
    hasKatexMathml(node) ||
    Boolean((node.getAttribute("data-tex") || node.getAttribute("data-latex") || "").trim()));

const isStrictKatexRoot = (node) =>
  node instanceof Element &&
  node.matches(KATEX_SELECTOR) &&
  hasKatexPayload(node);

const hasMeaningfulTextChild = (node) =>
  node instanceof Element &&
  Array.from(node.childNodes).some(
    (child) => child.nodeType === Node.TEXT_NODE && Boolean((child.textContent || "").trim()),
  );

const getVisibleElementChildren = (node) =>
  node instanceof Element
    ? Array.from(node.children).filter(
      (child) =>
        !(child instanceof Element) ||
        (child.getAttribute("aria-hidden") !== "true" && !child.matches(".katex-html")),
    )
    : [];

const resolveKatexRoot = (node, depth = 0) => {
  if (!(node instanceof Element)) {
    return null;
  }

  if (isStrictKatexRoot(node)) {
    return node;
  }

  if (depth >= 2 || hasMeaningfulTextChild(node)) {
    return null;
  }

  const visibleChildren = getVisibleElementChildren(node);
  if (visibleChildren.length !== 1) {
    return null;
  }

  return resolveKatexRoot(visibleChildren[0], depth + 1);
};

const isKatexElement = (node) => resolveKatexRoot(node) instanceof Element;

const isKatexDisplayElement = (node) => {
  const katexRoot = resolveKatexRoot(node);
  return katexRoot instanceof Element && katexRoot.matches(".katex-display");
};

const normalizeKatexSource = (value) => {
  const source = String(value || "").trim();
  if (!source) {
    return "";
  }

  if (source.startsWith("$$") && source.endsWith("$$") && source.length >= 4) {
    return source.slice(2, -2).trim();
  }
  if (source.startsWith("$") && source.endsWith("$") && source.length >= 2) {
    return source.slice(1, -1).trim();
  }
  return source;
};

const extractKatexTex = (node) => {
  const katexRoot = resolveKatexRoot(node);
  if (!(katexRoot instanceof Element)) {
    return "";
  }

  const annotation = katexRoot.querySelector('annotation[encoding="application/x-tex"]');
  if (annotation instanceof Element) {
    const tex = normalizeKatexSource(annotation.textContent || "");
    if (tex) {
      return tex;
    }
  }

  const mathmlRoot = katexRoot.querySelector(".katex-mathml");
  if (mathmlRoot instanceof Element) {
    const mathmlText = normalizeKatexSource((mathmlRoot.textContent || "").replace(/\s+/g, " "));
    if (mathmlText) {
      return mathmlText;
    }
  }

  const dataTex =
    katexRoot.getAttribute("data-tex") ||
    katexRoot.getAttribute("data-latex") ||
    "";
  return normalizeKatexSource(dataTex);
};

const shouldSkipKatexRenderLayer = (node) =>
  node instanceof Element &&
  (node.matches(".katex-html") ||
    (node.getAttribute("aria-hidden") === "true" &&
      node.closest(KATEX_SELECTOR) instanceof Element));

const serializeKatexNode = (node, options = {}) => {
  const katexRoot = resolveKatexRoot(node);
  if (!(katexRoot instanceof Element)) {
    return "";
  }

  const tex = extractKatexTex(katexRoot);
  if (!tex) {
    return "";
  }

  const block = Boolean(options.block);
  if (block) {
    return `$$\n${tex}\n$$`;
  }
  return `$${tex}$`;
};

const serializeInlineNodes = (nodes) =>
  Array.from(nodes || [])
    .map((node) => serializeInlineNode(node))
    .join("");

const serializeInlineNode = (node) => {
  if (!node) {
    return "";
  }

  if (node.nodeType === Node.TEXT_NODE) {
    return escapeMarkdownText(node.textContent || "");
  }

  if (!(node instanceof Element)) {
    return "";
  }

  if (isArtifactConsumedNode(node)) {
    return "";
  }

  if (shouldSkipKatexRenderLayer(node)) {
    return "";
  }

  if (isKatexElement(node)) {
    return serializeKatexNode(node, { block: isKatexDisplayElement(node) });
  }

  const tag = node.tagName.toLowerCase();
  if (tag === "br") {
    return "  \n";
  }
  if (tag === "code") {
    const text = escapeInlineCode(node.textContent || "");
    return text ? `\`${text}\`` : "";
  }
  if (tag === "strong" || tag === "b") {
    const inner = serializeInlineNodes(node.childNodes);
    return inner ? `**${inner}**` : "";
  }
  if (tag === "em" || tag === "i") {
    const inner = serializeInlineNodes(node.childNodes);
    return inner ? `*${inner}*` : "";
  }
  if (tag === "a") {
    const label = normalizeMarkdownSpacing(serializeInlineNodes(node.childNodes)) || escapeMarkdownText(node.textContent || "");
    const href = (node.getAttribute("href") || "").trim();
    return href ? `[${label || href}](${href})` : label;
  }
  if (tag === "img") {
    const alt = escapeMarkdownText(node.getAttribute("alt") || "");
    const src = (node.getAttribute("src") || "").trim();
    return src ? `![${alt}](${src})` : alt;
  }

  return serializeInlineNodes(node.childNodes);
};

const serializeListNode = (listNode, depth = 0) => {
  if (!(listNode instanceof Element)) {
    return "";
  }

  const ordered = listNode.tagName.toLowerCase() === "ol";
  const items = Array.from(listNode.children).filter(
    (child) => child instanceof Element && child.tagName.toLowerCase() === "li",
  );
  if (items.length === 0) {
    return "";
  }

  const lines = items
    .map((item, index) => {
      const marker = ordered ? `${index + 1}. ` : "- ";
      const indent = "  ".repeat(depth);
      const childNodes = Array.from(item.childNodes);
      const nestedLists = childNodes.filter(
        (child) =>
          child instanceof Element &&
          (child.tagName.toLowerCase() === "ul" || child.tagName.toLowerCase() === "ol"),
      );
      const contentNodes = childNodes.filter((child) => !nestedLists.includes(child));
      const content = normalizeMarkdownSpacing(serializeInlineNodes(contentNodes));
      let line = `${indent}${marker}${content}`;
      if (!content) {
        line = `${indent}${marker}`.trimEnd();
      }
      if (nestedLists.length === 0) {
        return line;
      }
      const nestedMarkdown = nestedLists
        .map((nestedList) => serializeListNode(nestedList, depth + 1))
        .filter(Boolean)
        .join("\n");
      return nestedMarkdown ? `${line}\n${nestedMarkdown}` : line;
    })
    .filter(Boolean);

  return lines.join("\n");
};

const serializeTableNode = (tableNode) => {
  if (!(tableNode instanceof Element)) {
    return "";
  }

  const rows = Array.from(tableNode.querySelectorAll("tr")).filter((row) => row instanceof Element);
  if (rows.length === 0) {
    return "";
  }

  const toCells = (row) =>
    Array.from(row.children)
      .filter((cell) => cell instanceof Element && (cell.tagName.toLowerCase() === "th" || cell.tagName.toLowerCase() === "td"))
      .map((cell) => escapeTableText(normalizeMarkdownSpacing(serializeInlineNodes(cell.childNodes))));

  const headerCells = toCells(rows[0]);
  if (headerCells.length === 0) {
    return "";
  }

  const bodyRows = rows.slice(1).map((row) => toCells(row));
  const columnCount = Math.max(
    headerCells.length,
    ...bodyRows.map((cells) => cells.length),
  );
  const normalizeCells = (cells) => {
    const next = cells.slice(0, columnCount);
    while (next.length < columnCount) {
      next.push("");
    }
    return next;
  };

  const header = normalizeCells(headerCells);
  const separator = new Array(columnCount).fill("---");
  const body = bodyRows.map((cells) => normalizeCells(cells));

  const toLine = (cells) => `| ${cells.join(" | ")} |`;
  return [toLine(header), toLine(separator), ...body.map((cells) => toLine(cells))].join("\n");
};

const serializeBlockNode = (node) => {
  if (!node) {
    return "";
  }

  if (node.nodeType === Node.TEXT_NODE) {
    const text = normalizeMarkdownSpacing(node.textContent || "");
    return text ? `${escapeMarkdownText(text)}\n\n` : "";
  }

  if (!(node instanceof Element)) {
    return "";
  }

  if (isArtifactConsumedNode(node)) {
    return "";
  }

  if (shouldSkipKatexRenderLayer(node)) {
    return "";
  }

  if (isKatexElement(node)) {
    const katexMarkdown = serializeKatexNode(node, { block: isKatexDisplayElement(node) });
    if (!katexMarkdown) {
      return "";
    }
    return isKatexDisplayElement(node) ? `${katexMarkdown}\n\n` : katexMarkdown;
  }

  const tag = node.tagName.toLowerCase();
  if (tag === "script" || tag === "style") {
    return "";
  }
  if (tag === "hr") {
    return "---\n\n";
  }
  if (tag === "pre") {
    const payload = extractCodeBlockContent(node);
    const language = payload.language || "";
    const rawCode = payload.code || "";
    return `\`\`\`${language}\n${rawCode}\n\`\`\`\n\n`;
  }
  if (/^h[1-6]$/.test(tag)) {
    const level = Number(tag.slice(1));
    const heading = normalizeMarkdownSpacing(serializeInlineNodes(node.childNodes));
    return heading ? `${"#".repeat(level)} ${heading}\n\n` : "";
  }
  if (tag === "p") {
    const paragraph = normalizeMarkdownSpacing(serializeInlineNodes(node.childNodes));
    return paragraph ? `${paragraph}\n\n` : "";
  }
  if (tag === "blockquote") {
    const inner = normalizeMarkdownSpacing(serializeChildBlocks(node));
    if (!inner) {
      return "";
    }
    const quoted = inner
      .split("\n")
      .map((line) => (line ? `> ${line}` : ">"))
      .join("\n");
    return `${quoted}\n\n`;
  }
  if (tag === "ul" || tag === "ol") {
    const listMarkdown = serializeListNode(node, 0);
    return listMarkdown ? `${listMarkdown}\n\n` : "";
  }
  if (tag === "table") {
    const tableMarkdown = serializeTableNode(node);
    return tableMarkdown ? `${tableMarkdown}\n\n` : "";
  }
  if (tag === "code") {
    const inline = normalizeMarkdownSpacing(serializeInlineNode(node));
    return inline ? `${inline}\n\n` : "";
  }
  if (tag === "br") {
    return "\n";
  }

  const hasBlockChildren = Array.from(node.children).some((child) =>
    /^(P|H1|H2|H3|H4|H5|H6|UL|OL|BLOCKQUOTE|PRE|TABLE|HR|DIV|SECTION|ARTICLE)$/.test(child.tagName),
  );
  if (hasBlockChildren) {
    return serializeChildBlocks(node);
  }

  const text = normalizeMarkdownSpacing(serializeInlineNodes(node.childNodes));
  return text ? `${text}\n\n` : "";
};

const serializeChildBlocks = (root) =>
  Array.from(root?.childNodes || [])
    .map((child) => serializeBlockNode(child))
    .join("");

const serializeContentRootToMarkdown = (root) => {
  if (!(root instanceof Element) || isArtifactConsumedNode(root)) {
    return "";
  }
  const blockMarkdown = serializeChildBlocks(root);
  const fallbackInline = normalizeMarkdownSpacing(serializeInlineNodes(root.childNodes));
  return normalizeMarkdownSpacing(blockMarkdown || fallbackInline);
};

const buildMarkdownPayloadForMessage = (message) => {
  const roots = getMarkdownRootsForMessage(message);
  const safeRoots = Array.isArray(roots) ? roots : [];
  const role = message?.role || "unknown";
  const aggregatedArtifacts = {
    captions: [],
    images: [],
    files: [],
    citations: [],
  };

  if (message?.node instanceof Element) {
    const wholeMessageImages = extractImageAssetsFromMessageNode(message.node, role);
    wholeMessageImages.forEach((image) => {
      upsertImageArtifact(aggregatedArtifacts.images, {
        src: image?.src || "",
        alt: image?.alt || "",
        kind: image?.kind || "",
        width: image?.width || 0,
        height: image?.height || 0,
        caption: "",
      });
    });
  }

  const rootSet = new Set(safeRoots);
  getRoleNodesForExport(message).forEach((roleNode) => {
    if (!(roleNode instanceof Element) || rootSet.has(roleNode)) {
      return;
    }
    const roleClone = cloneNodeForMarkdownExport(roleNode);
    if (!(roleClone instanceof Element)) {
      return;
    }
    const roleArtifacts = extractMarkdownArtifactsFromNode(roleClone);
    mergeMarkdownArtifacts(aggregatedArtifacts, roleArtifacts);
  });

  const seen = new Set();
  let bodyMarkdown = "";
  safeRoots.forEach((root) => {
    const clone = cloneNodeForMarkdownExport(root);
    if (!(clone instanceof Element)) {
      return;
    }

    const artifacts = extractMarkdownArtifactsFromNode(clone);
    mergeMarkdownArtifacts(aggregatedArtifacts, artifacts);
    removeConsumedNodes(clone);
    stripMarkdownExportUiNoise(clone);

    const markdown = serializeContentRootToMarkdown(clone);
    if (!markdown || seen.has(markdown)) {
      return;
    }
    seen.add(markdown);
    bodyMarkdown = appendAssistantMarkdownSegment(bodyMarkdown, markdown);
  });

  const normalizedBody = normalizeMarkdownSpacing(bodyMarkdown);
  const artifactsMarkdown = serializeArtifactsBody(aggregatedArtifacts);
  const citationsMarkdown = serializeCitationArtifacts(aggregatedArtifacts.citations);
  const fallbackMarkdown = normalizeMarkdownSpacing(buildSemanticFallbackMarkdown(message, aggregatedArtifacts));
  const parts = [normalizedBody, artifactsMarkdown, citationsMarkdown].filter(Boolean);
  const finalMarkdown = normalizeMarkdownSpacing(parts.length > 0 ? parts.join("\n\n") : fallbackMarkdown);

  return {
    bodyMarkdown: normalizedBody,
    artifactsMarkdown,
    citationsMarkdown,
    fallbackMarkdown,
    finalMarkdown,
  };
};

const serializeMessageNodeToMarkdown = (message) => {
  const payload = buildMarkdownPayloadForMessage(message);
  return normalizeMarkdownSpacing(payload?.finalMarkdown || "");
};

const appendAssistantMarkdownSegment = (base, segment) => {
  const current = normalizeMarkdownSpacing(base);
  const next = normalizeMarkdownSpacing(segment);
  if (!next) {
    return current;
  }
  if (!current) {
    return next;
  }
  if (current === next || current.includes(next)) {
    return current;
  }
  if (next.includes(current)) {
    return next;
  }
  const overlap = getExactOverlapLength(current, next);
  if (overlap > 0) {
    const tail = next.slice(overlap).trim();
    if (!tail) {
      return current;
    }
    return `${current}\n\n${tail}`;
  }
  return `${current}\n\n${next}`;
};

const mergeAssistantMarkdownByTurn = (messages) => {
  const merged = [];
  const assistantIndexByTurnKey = new Map();

  messages.forEach((message) => {
    const role = message?.role || "unknown";
    const turnKey = message?.turnKey || "";
    const markdown = normalizeMarkdownSpacing(message?.markdown || "");
    if (!markdown) {
      return;
    }

    const current = { role, turnKey, markdown };
    if (merged.length === 0) {
      merged.push(current);
      if (role === "assistant" && turnKey) {
        assistantIndexByTurnKey.set(turnKey, 0);
      }
      return;
    }

    if (role === "assistant" && turnKey && assistantIndexByTurnKey.has(turnKey)) {
      const targetIndex = assistantIndexByTurnKey.get(turnKey);
      const target = merged[targetIndex];
      target.markdown = appendAssistantMarkdownSegment(target.markdown, markdown);
      return;
    }

    merged.push(current);
    if (role === "assistant" && turnKey) {
      assistantIndexByTurnKey.set(turnKey, merged.length - 1);
    }
  });

  return merged.map((item, index) => ({
    index: index + 1,
    role: item.role,
    markdown: item.markdown,
  }));
};

const buildMarkdownMessagesFromStore = (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return null;
  }

  const prepared = [];
  for (const message of messages) {
    if (!(message?.node instanceof Element)) {
      console.warn("[conversation-export] Markdown export skipped message: invalid node.", {
        role: message?.role || "unknown",
        turnKey: message?.turnKey || "",
        index: message?.index || -1,
      });
      continue;
    }
    const markdown = serializeMessageNodeToMarkdown(message);
    if (!markdown) {
      console.warn("[conversation-export] Markdown export skipped message: empty markdown.", {
        role: message?.role || "unknown",
        turnKey: message?.turnKey || "",
        index: message?.index || -1,
      });
      continue;
    }
    prepared.push({
      role: message.role || "unknown",
      turnKey: message.turnKey || "",
      markdown,
    });
  }

  if (prepared.length === 0) {
    return null;
  }

  return mergeAssistantMarkdownByTurn(prepared);
};

const buildMarkdownDocument = (messages) => {
  const exportedAt = new Date().toISOString();
  const url = window.location.href;
  const header = [
    "# ChatGPT Conversation Export",
    "",
    `- Exported At: ${exportedAt}`,
    `- URL: ${url}`,
    `- Message Count: ${messages.length}`,
    "",
    "---",
    "",
  ].join("\n");

  const body = messages
    .map((message) => {
      const roleLabel = message.role === "assistant" ? "Assistant" : message.role === "user" ? "User" : "Unknown";
      return `## ${message.index}. ${roleLabel}\n\n${message.markdown}`;
    })
    .join("\n\n");

  return `${header}${body}\n`;
};

const downloadExportFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

const exportMessages = async () => {
  ensureConversationState();

  if (typeof refreshMessageStore === "function") {
    refreshMessageStore();
  }

  const messages = await (async () => {
    if (typeof getAllMessages === "function") {
      const rawMessages = getAllMessages();
      const enriched = await enrichMessagesForJsonExport(rawMessages);
      return mergeAssistantByTurn(enriched);
    }
    return buildMessagePayload(getMessageNodes());
  })();

  const payload = {
    exportedAt: new Date().toISOString(),
    url: window.location.href,
    messageCount: messages.length,
    messages,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });

  const dateTag = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `chatgpt-session-${dateTag}.json`;

  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

  updateStatusByKey("status.exportStarted", "success");
};

const exportMessagesAsMarkdown = () => {
  ensureConversationState();

  if (typeof refreshMessageStore === "function") {
    refreshMessageStore();
  }

  if (typeof getAllMessages !== "function") {
    updateStatusByKey("status.exportMarkdownUnavailable", "info");
    return;
  }

  const rawMessages = getAllMessages();
  const messages = buildMarkdownMessagesFromStore(rawMessages);

  if (!messages || messages.length === 0) {
    updateStatusByKey("status.exportMarkdownUnavailable", "info");
    return;
  }

  const markdown = buildMarkdownDocument(messages);
  const dateTag = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `chatgpt-session-${dateTag}.md`;
  downloadExportFile(markdown, filename, "text/markdown;charset=utf-8");
  updateStatusByKey("status.exportMarkdownStarted", "success");
};
