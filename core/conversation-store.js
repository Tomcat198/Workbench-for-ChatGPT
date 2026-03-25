/*
 * ChatGPT Conversation Toolkit - Unified message + turn + group store
 */
const messageStoreState = {
  initialized: false,
  conversationKey: "",
  messages: [],
  byKey: new Map(),
  turns: [],
  turnByKey: new Map(),
  groups: [],
  groupByKey: new Map(),
  messageToGroupKey: new Map(),
  turnToGroupKey: new Map(),
  lastTurnSignature: "",
  lastGroupSignature: "",
  lastRefreshAt: 0,
};

const initMessageStore = () => {
  if (messageStoreState.initialized) {
    return messageStoreState;
  }
  messageStoreState.initialized = true;
  messageStoreState.conversationKey =
    typeof getConversationKey === "function" ? getConversationKey() : "";
  messageStoreState.messages = [];
  messageStoreState.byKey = new Map();
  messageStoreState.turns = [];
  messageStoreState.turnByKey = new Map();
  messageStoreState.groups = [];
  messageStoreState.groupByKey = new Map();
  messageStoreState.messageToGroupKey = new Map();
  messageStoreState.turnToGroupKey = new Map();
  messageStoreState.lastTurnSignature = "";
  messageStoreState.lastGroupSignature = "";
  messageStoreState.lastRefreshAt = 0;
  return messageStoreState;
};

const clearSemanticStateForConversationSwitch = () => {
  messageStoreState.turns = [];
  messageStoreState.turnByKey = new Map();
  messageStoreState.groups = [];
  messageStoreState.groupByKey = new Map();
  messageStoreState.messageToGroupKey = new Map();
  messageStoreState.turnToGroupKey = new Map();
  messageStoreState.lastTurnSignature = "";
  messageStoreState.lastGroupSignature = "";

  if (typeof state !== "undefined") {
    state.collapsedGroupKeys = [];
    state.collapsedTurnKeys = [];
    state.collapsedMessageKeys = [];
    state.isCollapsed = false;
  }

  if (typeof timelineState !== "undefined") {
    timelineState.items = [];
    timelineState.sourceNodes = [];
    timelineState.sourceSignature = "";
    timelineState.totalUserCount = 0;
    timelineState.activeIndex = -1;
    timelineState.hoverIndex = -1;
    timelineState.signature = "";
    timelineState.contentHeight = 0;
    timelineState.rendered = false;
  }
};

const resetMessageStore = () => {
  initMessageStore();
  messageStoreState.messages = [];
  messageStoreState.byKey = new Map();
  messageStoreState.turns = [];
  messageStoreState.turnByKey = new Map();
  messageStoreState.groups = [];
  messageStoreState.groupByKey = new Map();
  messageStoreState.messageToGroupKey = new Map();
  messageStoreState.turnToGroupKey = new Map();
  messageStoreState.lastTurnSignature = "";
  messageStoreState.lastGroupSignature = "";
  messageStoreState.lastRefreshAt = Date.now();
};

const isMessageHidden = (node) => {
  if (!(node instanceof HTMLElement)) {
    return false;
  }
  if (node.hidden) {
    return true;
  }
  if (node.getAttribute("aria-hidden") === "true") {
    return true;
  }
  if (node.classList.contains("is-hidden")) {
    return true;
  }
  const style = window.getComputedStyle(node);
  return style.display === "none" || style.visibility === "hidden";
};

const buildStoreMessage = (node, index, conversationKey) => {
  const key = getMessageDomKey(node, index);
  const role = getMessageRoleFromDom(node);
  const semantic =
    typeof getMessageSemanticFromDom === "function"
      ? getMessageSemanticFromDom(node)
      : null;
  const text = semantic?.text || getMessageTextFromDom(node);
  const domTurnKey =
    typeof getMessageTurnKeyFromDom === "function"
      ? getMessageTurnKeyFromDom(node)
      : "";
  return {
    key,
    index: index + 1,
    role,
    text,
    rawText: semantic?.rawText || "",
    syntheticText: semantic?.syntheticText || "",
    semanticKind: semantic?.semanticKind || "",
    hasSemanticContent: Boolean(semantic?.hasSemanticContent || text),
    isSynthetic: Boolean(semantic?.isSynthetic && !semantic?.rawText),
    turnKey: domTurnKey,
    node,
    conversationKey,
    isHidden: isMessageHidden(node),
  };
};

const buildStableFallbackTurnKey = (conversationKey, turnMessages) => {
  if (!Array.isArray(turnMessages) || turnMessages.length === 0) {
    return "";
  }

  const firstKey = turnMessages[0]?.key || "none";
  const lastKey = turnMessages[turnMessages.length - 1]?.key || firstKey;
  const roleSignature = turnMessages
    .map((message) => {
      if (message?.role === "assistant") {
        return "a";
      }
      if (message?.role === "user") {
        return "u";
      }
      return "x";
    })
    .join("");

  return `turn:fallback:${conversationKey || "unknown"}:${firstKey}:${lastKey}:${roleSignature}`;
};

const shouldStartNewFallbackTurn = (currentTurnMessages, nextMessage) => {
  if (!Array.isArray(currentTurnMessages) || currentTurnMessages.length === 0) {
    return true;
  }
  if (!nextMessage) {
    return false;
  }

  const lastRole = currentTurnMessages[currentTurnMessages.length - 1]?.role || "unknown";
  const nextRole = nextMessage.role || "unknown";

  if (nextRole === "user") {
    return true;
  }

  if (lastRole === "unknown" && nextRole !== "unknown") {
    return true;
  }

  return false;
};

const finalizeTurn = (turnKey, turnMessages, conversationKey, turnIndex) => {
  if (!Array.isArray(turnMessages) || turnMessages.length === 0) {
    return null;
  }

  const messageKeys = [];
  const assistantMessageKeys = [];
  let userMessageKey = null;
  const nodes = [];

  turnMessages.forEach((message) => {
    if (!message?.key) {
      return;
    }
    message.turnKey = turnKey;
    messageKeys.push(message.key);
    if (message.role === "user" && !userMessageKey) {
      userMessageKey = message.key;
    }
    if (message.role === "assistant") {
      assistantMessageKeys.push(message.key);
    }
    if (message.node instanceof HTMLElement && !nodes.includes(message.node)) {
      nodes.push(message.node);
    }
  });

  if (messageKeys.length === 0) {
    return null;
  }

  const anchorMessageKey = userMessageKey || messageKeys[0] || null;
  const anchorMessage = anchorMessageKey ? turnMessages.find((item) => item.key === anchorMessageKey) : null;
  const anchorNode = anchorMessage?.node instanceof HTMLElement ? anchorMessage.node : nodes[0] || null;
  const isHidden = turnMessages.every((message) => message?.isHidden);

  return {
    turnKey,
    conversationKey,
    index: turnIndex + 1,
    messageKeys,
    userMessageKey,
    assistantMessageKeys,
    anchorMessageKey,
    anchorNode,
    nodes,
    isHidden,
  };
};

const buildTurnsFromMessages = (messages, conversationKey) => {
  const turns = [];
  let pendingFallbackMessages = [];
  let fallbackTurnCounter = 0;

  const flushFallbackTurn = () => {
    if (pendingFallbackMessages.length === 0) {
      return;
    }
    const stableKey = buildStableFallbackTurnKey(conversationKey, pendingFallbackMessages);
    const turnKey = stableKey || `turn:fallback:${conversationKey || "unknown"}:${fallbackTurnCounter}`;
    const turn = finalizeTurn(turnKey, pendingFallbackMessages, conversationKey, turns.length);
    if (turn) {
      turns.push(turn);
      fallbackTurnCounter += 1;
    }
    pendingFallbackMessages = [];
  };

  messages.forEach((message) => {
    const domTurnKey = message.turnKey || "";
    if (domTurnKey) {
      flushFallbackTurn();
      const lastTurn = turns[turns.length - 1] || null;
      if (lastTurn && lastTurn.turnKey === domTurnKey) {
        const mergedMessages = lastTurn.messageKeys
          .map((key) => messages.find((item) => item.key === key))
          .filter(Boolean)
          .concat(message);
        const rebuilt = finalizeTurn(domTurnKey, mergedMessages, conversationKey, turns.length - 1);
        if (rebuilt) {
          turns[turns.length - 1] = rebuilt;
        }
        return;
      }
      const turn = finalizeTurn(domTurnKey, [message], conversationKey, turns.length);
      if (turn) {
        turns.push(turn);
      }
      return;
    }

    if (shouldStartNewFallbackTurn(pendingFallbackMessages, message) && pendingFallbackMessages.length > 0) {
      flushFallbackTurn();
    }
    pendingFallbackMessages.push(message);
  });

  flushFallbackTurn();
  return turns;
};

const buildStableGroupKey = (conversationKey, headTurn, tailTurn, groupMessageKeys) => {
  const firstTurnKey = headTurn?.turnKey || "turn-none";
  const lastTurnKey = tailTurn?.turnKey || firstTurnKey;
  const firstMessageKey = groupMessageKeys[0] || "message-none";
  const lastMessageKey = groupMessageKeys[groupMessageKeys.length - 1] || firstMessageKey;
  return `group:${conversationKey || "unknown"}:${firstTurnKey}:${lastTurnKey}:${firstMessageKey}:${lastMessageKey}`;
};

const finalizeGroup = (groupTurns, conversationKey, groupIndex, byMessageKey) => {
  if (!Array.isArray(groupTurns) || groupTurns.length === 0) {
    return null;
  }

  const messageKeys = [];
  const messageKeySet = new Set();
  const turnKeys = [];
  const assistantMessageKeys = [];
  let userMessageKey = null;
  let anchorMessageKey = null;

  groupTurns.forEach((turn) => {
    if (!turn?.turnKey) {
      return;
    }
    turnKeys.push(turn.turnKey);
    if (turn.userMessageKey && !userMessageKey) {
      userMessageKey = turn.userMessageKey;
    }
    if (!anchorMessageKey && turn.anchorMessageKey) {
      anchorMessageKey = turn.anchorMessageKey;
    }

    const turnMessageKeys = Array.isArray(turn.messageKeys) ? turn.messageKeys : [];
    turnMessageKeys.forEach((messageKey) => {
      if (!messageKey || messageKeySet.has(messageKey)) {
        return;
      }
      messageKeySet.add(messageKey);
      messageKeys.push(messageKey);
    });

    const turnAssistantKeys = Array.isArray(turn.assistantMessageKeys) ? turn.assistantMessageKeys : [];
    turnAssistantKeys.forEach((messageKey) => {
      if (messageKey) {
        assistantMessageKeys.push(messageKey);
      }
    });
  });

  if (!anchorMessageKey) {
    anchorMessageKey = userMessageKey || messageKeys[0] || null;
  }

  const nodes = [];
  const nodeSet = new Set();
  messageKeys.forEach((messageKey) => {
    const message = byMessageKey.get(messageKey);
    const node = message?.node;
    if (node instanceof HTMLElement && !nodeSet.has(node)) {
      nodeSet.add(node);
      nodes.push(node);
    }
  });

  const anchorMessage = anchorMessageKey ? byMessageKey.get(anchorMessageKey) : null;
  const anchorNode = anchorMessage?.node instanceof HTMLElement ? anchorMessage.node : nodes[0] || null;
  const headTurn = groupTurns[0];
  const tailTurn = groupTurns[groupTurns.length - 1];
  const groupKey = buildStableGroupKey(conversationKey, headTurn, tailTurn, messageKeys);
  const isHidden = messageKeys.length > 0 && messageKeys.every((messageKey) => byMessageKey.get(messageKey)?.isHidden);

  return {
    groupKey,
    conversationKey,
    index: groupIndex + 1,
    turnKeys,
    messageKeys,
    userMessageKey,
    assistantMessageKeys,
    anchorMessageKey,
    anchorNode,
    nodes,
    isHidden,
  };
};

const buildGroupsFromTurns = (turns, byMessageKey, conversationKey) => {
  const sortedTurns = (Array.isArray(turns) ? turns : [])
    .slice()
    .sort((left, right) => (Number(left?.index) || 0) - (Number(right?.index) || 0));

  const groups = [];
  let pendingTurns = [];

  const flushPending = () => {
    if (pendingTurns.length === 0) {
      return;
    }
    const group = finalizeGroup(pendingTurns, conversationKey, groups.length, byMessageKey);
    if (group) {
      groups.push(group);
    }
    pendingTurns = [];
  };

  sortedTurns.forEach((turn) => {
    const hasUser = Boolean(turn?.userMessageKey);

    if (pendingTurns.length === 0) {
      pendingTurns.push(turn);
      return;
    }

    if (hasUser) {
      flushPending();
      pendingTurns.push(turn);
      return;
    }

    pendingTurns.push(turn);
  });

  flushPending();
  return groups;
};

const refreshMessageStore = () => {
  initMessageStore();

  const conversationKey =
    typeof getConversationKey === "function" ? getConversationKey() : messageStoreState.conversationKey;

  const didConversationChange =
    Boolean(messageStoreState.conversationKey) &&
    Boolean(conversationKey) &&
    messageStoreState.conversationKey !== conversationKey;

  if (didConversationChange) {
    clearSemanticStateForConversationSwitch();
  }

  const nodes =
    typeof getMessageElements === "function"
      ? getMessageElements()
      : [];

  const messages = nodes
    .map((node, index) => buildStoreMessage(node, index, conversationKey))
    .filter((item) => item.key && (item.hasSemanticContent || item.text));

  const byKey = new Map(messages.map((item) => [item.key, item]));
  const turns = buildTurnsFromMessages(messages, conversationKey || "");
  const groups = buildGroupsFromTurns(turns, byKey, conversationKey || "");

  const turnByKey = new Map(turns.map((item) => [item.turnKey, item]));
  const groupByKey = new Map(groups.map((item) => [item.groupKey, item]));
  const messageToGroupKey = new Map();
  const turnToGroupKey = new Map();

  groups.forEach((group) => {
    const groupKey = group.groupKey;
    (Array.isArray(group.messageKeys) ? group.messageKeys : []).forEach((messageKey) => {
      if (messageKey) {
        messageToGroupKey.set(messageKey, groupKey);
      }
    });
    (Array.isArray(group.turnKeys) ? group.turnKeys : []).forEach((turnKey) => {
      if (turnKey) {
        turnToGroupKey.set(turnKey, groupKey);
      }
    });
  });

  messageStoreState.conversationKey = conversationKey || "";
  messageStoreState.messages = messages;
  messageStoreState.byKey = byKey;
  messageStoreState.turns = turns;
  messageStoreState.turnByKey = turnByKey;
  messageStoreState.groups = groups;
  messageStoreState.groupByKey = groupByKey;
  messageStoreState.messageToGroupKey = messageToGroupKey;
  messageStoreState.turnToGroupKey = turnToGroupKey;
  messageStoreState.lastTurnSignature = turns.map((turn) => turn.turnKey).join("|");
  messageStoreState.lastGroupSignature = groups.map((group) => group.groupKey).join("|");
  messageStoreState.lastRefreshAt = Date.now();

  return messages;
};

const getAllMessages = () => {
  initMessageStore();
  return messageStoreState.messages.slice();
};

const getVisibleMessages = () => getAllMessages().filter((item) => !item.isHidden);

const getUserMessages = () => getAllMessages().filter((item) => item.role === "user");

const getMessageByKey = (key) => {
  initMessageStore();
  return messageStoreState.byKey.get(key) || null;
};

const getAllTurns = () => {
  initMessageStore();
  return messageStoreState.turns.slice();
};

const getVisibleTurns = () => getAllTurns().filter((turn) => !turn.isHidden);

const getTurnByKey = (turnKey) => {
  initMessageStore();
  return messageStoreState.turnByKey.get(turnKey) || null;
};

const getLatestTurns = (count = 1) => {
  const allTurns = getAllTurns();
  const safeCount = Math.max(0, Math.round(Number(count) || 0));
  if (safeCount <= 0) {
    return [];
  }
  return allTurns.slice(Math.max(0, allTurns.length - safeCount));
};

const getAllGroups = () => {
  initMessageStore();
  return messageStoreState.groups.slice();
};

const getVisibleGroups = () => getAllGroups().filter((group) => !group.isHidden);

const getGroupByKey = (groupKey) => {
  initMessageStore();
  return messageStoreState.groupByKey.get(groupKey) || null;
};

const getLatestGroups = (count = 1) => {
  const allGroups = getAllGroups();
  const safeCount = Math.max(0, Math.round(Number(count) || 0));
  if (safeCount <= 0) {
    return [];
  }
  return allGroups.slice(Math.max(0, allGroups.length - safeCount));
};

const getGroupByMessageKey = (messageKey) => {
  initMessageStore();
  if (!messageKey) {
    return null;
  }
  const groupKey = messageStoreState.messageToGroupKey.get(messageKey);
  return groupKey ? getGroupByKey(groupKey) : null;
};
