/*
 * ChatGPT Conversation Toolkit - Conversation export
 */
const normalizeExportText = (value) => (value || "").replace(/\s+/g, " ").trim();

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
