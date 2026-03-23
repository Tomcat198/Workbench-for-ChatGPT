/*
 * ChatGPT Conversation Toolkit - Conversation export
 */
const normalizeExportText = (value) => (value || "").replace(/\s+/g, " ").trim();
const MARKDOWN_CONTENT_SELECTOR = ".markdown, .prose, [data-message-content]";

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
    // Unclear relation: keep the current complete text to avoid duplicate amplification.
    return current;
  }

  const tail = next.slice(overlap).trim();
  if (!tail) {
    return current;
  }
  return `${current}\n\n${tail}`;
};

const mergeAssistantByTurn = (messages) => {
  const merged = [];

  messages.forEach((message) => {
    const role = message?.role || "unknown";
    const text = normalizeExportText(message?.text || "");
    const turnKey = message?.turnKey || "";
    if (!text) {
      return;
    }

    const current = { role, text, turnKey };
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
  });

  return merged.map((item, index) => ({
    index: index + 1,
    role: item.role,
    text: item.text,
  }));
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

const getMarkdownContentRoot = (message) => {
  const node = message?.node;
  if (!(node instanceof Element)) {
    return null;
  }

  const role = message?.role || "unknown";
  const roleNode = getRoleNodeFromMessageNode(node);
  if (!(roleNode instanceof Element)) {
    return null;
  }

  if (roleNode.matches(MARKDOWN_CONTENT_SELECTOR)) {
    return roleNode;
  }

  const richContent = roleNode.querySelector(MARKDOWN_CONTENT_SELECTOR);
  if (richContent instanceof Element) {
    return richContent;
  }

  if (role === "user") {
    const userRoot = roleNode.querySelector(".whitespace-pre-wrap");
    if (userRoot instanceof Element) {
      return userRoot;
    }
  }

  return null;
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
    const codeNode = node.querySelector("code");
    const language = extractCodeLanguage(codeNode || node);
    const rawCode = (codeNode?.textContent || node.textContent || "").replace(/\n+$/, "");
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

const serializeMessageNodeToMarkdown = (message) => {
  const root = getMarkdownContentRoot(message);
  if (!(root instanceof Element)) {
    return "";
  }

  const blockMarkdown = serializeChildBlocks(root);
  const fallbackInline = normalizeMarkdownSpacing(serializeInlineNodes(root.childNodes));
  const markdown = normalizeMarkdownSpacing(blockMarkdown || fallbackInline);
  return markdown;
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
  return `${current}\n\n${next}`;
};

const mergeAssistantMarkdownByTurn = (messages) => {
  const merged = [];

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

    prev.markdown = appendAssistantMarkdownSegment(prev.markdown, markdown);
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
      return null;
    }
    const root = getMarkdownContentRoot(message);
    if (!(root instanceof Element)) {
      return null;
    }
    const markdown = serializeMessageNodeToMarkdown(message);
    if (!markdown) {
      return null;
    }
    prepared.push({
      role: message.role || "unknown",
      turnKey: message.turnKey || "",
      markdown,
    });
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

const exportMessages = () => {
  ensureConversationState();

  if (typeof refreshMessageStore === "function") {
    refreshMessageStore();
  }

  const messages =
    typeof getAllMessages === "function"
      ? mergeAssistantByTurn(getAllMessages())
      : buildMessagePayload(getMessageNodes());

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
