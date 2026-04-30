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

const countWords = (text) => {
  if (!text || typeof text !== "string") {
    return 0;
  }
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  const chineseMatch = trimmed.match(/[\u4e00-\u9fa5]/g) || [];
  const nonChinesePart = trimmed.replace(/[\u4e00-\u9fa5]/g, " ");
  const englishWords = nonChinesePart.split(/\s+/).filter((w) => w.length > 0);
  return chineseMatch.length + englishWords.length;
};

const calculateConversationStats = () => {
  if (typeof messageStoreState === "undefined" || !Array.isArray(messageStoreState.messages)) {
    return null;
  }

  const messages = messageStoreState.messages;
  let totalWords = 0;
  let totalCharacters = 0;
  let userMessages = 0;
  let assistantMessages = 0;
  let userWords = 0;
  let assistantWords = 0;
  let userCharacters = 0;
  let assistantCharacters = 0;

  messages.forEach((msg) => {
    const text = msg.text || "";
    const wordCount = countWords(text);
    const charCount = text.length;

    totalWords += wordCount;
    totalCharacters += charCount;

    if (msg.role === "user") {
      userMessages++;
      userWords += wordCount;
      userCharacters += charCount;
    } else if (msg.role === "assistant") {
      assistantMessages++;
      assistantWords += wordCount;
      assistantCharacters += charCount;
    }
  });

  const stats = {
    totalWords,
    totalCharacters,
    totalMessages: messages.length,
    userMessages,
    assistantMessages,
    userWords,
    assistantWords,
    userCharacters,
    assistantCharacters,
    lastCalculatedAt: Date.now(),
  };

  Object.assign(conversationStatsState, stats);

  return stats;
};

const formatStatsForDisplay = (stats) => {
  if (!stats) {
    return null;
  }

  const formatNumber = (num) => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return String(num);
  };

  return {
    totalWords: formatNumber(stats.totalWords),
    totalCharacters: formatNumber(stats.totalCharacters),
    totalMessages: formatNumber(stats.totalMessages),
    userMessages: formatNumber(stats.userMessages),
    assistantMessages: formatNumber(stats.assistantMessages),
    userWords: formatNumber(stats.userWords),
    assistantWords: formatNumber(stats.assistantWords),
    userCharacters: formatNumber(stats.userCharacters),
    assistantCharacters: formatNumber(stats.assistantCharacters),
    avgUserWordsPerMessage: stats.userMessages > 0
      ? formatNumber(Math.round(stats.userWords / stats.userMessages))
      : "0",
    avgAssistantWordsPerMessage: stats.assistantMessages > 0
      ? formatNumber(Math.round(stats.assistantWords / stats.assistantMessages))
      : "0",
  };
};

const getMessageKeywords = (text, limit = 10) => {
  if (!text || typeof text !== "string") {
    return [];
  }

  const chinesePattern = /[\u4e00-\u9fa5]{2,}/g;
  const englishPattern = /[a-zA-Z]{3,}/g;

  const chineseMatches = text.match(chinesePattern) || [];
  const englishMatches = text.match(englishPattern) || [];

  const allKeywords = [...chineseMatches, ...englishMatches];

  const freqMap = new Map();
  const stopWords = new Set([
    "的", "了", "是", "在", "我", "有", "和", "就", "不", "人", "都", "一", "一个", "上", "也", "很", "到", "说", "要", "去",
    "你", "会", "着", "没有", "看", "好", "自己", "这", "那", "它", "他", "她", "什么", "怎么", "为什么", "如何",
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "must", "shall", "can", "need", "dare", "ought", "used",
    "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after",
    "above", "below", "between", "under", "again", "further", "then", "once", "and", "but", "or", "nor", "so",
    "yet", "both", "either", "neither", "not", "only", "just", "very", "this", "that", "these", "those", "i", "you",
    "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his", "its", "our", "their",
    "if", "because", "as", "until", "while", "although", "though", "after", "before", "when", "where", "why", "how",
    "all", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so",
    "than", "too", "very", "just", "also", "now", "here", "there", "then", "once", "well", "about", "any", "can",
    "will", "up", "out", "off", "over", "under", "again", "further", "still", "yet", "ever", "never", "always",
    "sometimes", "often", "usually", "rarely", "hardly", "scarcely", "barely", "really", "actually", "truly",
    "certainly", "definitely", "probably", "possibly", "perhaps", "maybe", "likely", "unlikely", "surely",
  ]);

  allKeywords.forEach((word) => {
    const lowerWord = word.toLowerCase();
    if (stopWords.has(lowerWord)) {
      return;
    }
    const count = freqMap.get(lowerWord) || 0;
    freqMap.set(lowerWord, count + 1);
  });

  const sorted = Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);

  return sorted;
};

const calculateTextSimilarity = (text1, text2) => {
  if (!text1 || !text2) {
    return 0;
  }

  const keywords1 = getMessageKeywords(text1, 20);
  const keywords2 = getMessageKeywords(text2, 20);

  if (keywords1.length === 0 || keywords2.length === 0) {
    return 0;
  }

  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) {
    return 0;
  }

  return intersection.size / union.size;
};

const groupMessagesByTopic = (options = {}) => {
  if (typeof messageStoreState === "undefined" || !Array.isArray(messageStoreState.groups)) {
    return null;
  }

  const { similarityThreshold = 0.3, maxTopics = 10 } = options;

  const groups = messageStoreState.groups;
  if (!Array.isArray(groups) || groups.length === 0) {
    return null;
  }

  const topicGroups = [];
  let currentTopicGroup = null;

  groups.forEach((group, index) => {
    const groupText = (group.messageKeys || [])
      .map((key) => {
        const msg = messageStoreState.byKey?.get(key);
        return msg?.text || "";
      })
      .join(" ");

    const groupKeywords = getMessageKeywords(groupText, 15);

    if (!currentTopicGroup) {
      currentTopicGroup = {
        topicId: `topic-${Date.now()}-${index}`,
        startIndex: index,
        endIndex: index,
        groups: [group],
        keywords: groupKeywords,
        combinedText: groupText,
      };
    } else {
      const similarity = calculateTextSimilarity(currentTopicGroup.combinedText, groupText);

      if (similarity >= similarityThreshold) {
        currentTopicGroup.endIndex = index;
        currentTopicGroup.groups.push(group);
        currentTopicGroup.combinedText += " " + groupText;
        currentTopicGroup.keywords = getMessageKeywords(currentTopicGroup.combinedText, 15);
      } else {
        topicGroups.push(currentTopicGroup);
        currentTopicGroup = {
          topicId: `topic-${Date.now()}-${index}`,
          startIndex: index,
          endIndex: index,
          groups: [group],
          keywords: groupKeywords,
          combinedText: groupText,
        };
      }
    }
  });

  if (currentTopicGroup) {
    topicGroups.push(currentTopicGroup);
  }

  const finalTopics = topicGroups.slice(0, maxTopics).map((tg, idx) => ({
    ...tg,
    topicIndex: idx + 1,
    topicLabel: `话题 ${idx + 1}`,
  }));

  topicGroupsState.groups = finalTopics;
  topicGroupsState.groupByKey = new Map(
    finalTopics.map((tg) => [tg.topicId, tg])
  );
  topicGroupsState.lastGroupedAt = Date.now();

  return finalTopics;
};

const collapseTopicGroup = (topicId) => {
  const topic = topicGroupsState.groupByKey?.get(topicId);
  if (!topic || !Array.isArray(topic.groups)) {
    return false;
  }

  const collapsedGroupKeySet = new Set(
    Array.isArray(state.collapsedGroupKeys) ? state.collapsedGroupKeys : []
  );

  topic.groups.forEach((group) => {
    if (group?.groupKey) {
      collapsedGroupKeySet.add(group.groupKey);
      if (typeof setMessageCollapsedFlag === "function" && Array.isArray(group.nodes)) {
        group.nodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            setMessageCollapsedFlag(node, true);
          }
        });
      }
    }
  });

  state.collapsedGroupKeys = Array.from(collapsedGroupKeySet);
  if (typeof rebuildCollapsedDerivedKeysFromGroups === "function") {
    rebuildCollapsedDerivedKeysFromGroups();
  }
  state.isCollapsed = state.collapsedGroupKeys.length > 0;

  if (typeof renderTimeline === "function") {
    renderTimeline();
  }

  return true;
};

const expandTopicGroup = (topicId) => {
  const topic = topicGroupsState.groupByKey?.get(topicId);
  if (!topic || !Array.isArray(topic.groups)) {
    return false;
  }

  const collapsedGroupKeySet = new Set(
    Array.isArray(state.collapsedGroupKeys) ? state.collapsedGroupKeys : []
  );

  topic.groups.forEach((group) => {
    if (group?.groupKey) {
      collapsedGroupKeySet.delete(group.groupKey);
      if (typeof setMessageCollapsedFlag === "function" && Array.isArray(group.nodes)) {
        group.nodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            setMessageCollapsedFlag(node, false);
          }
        });
      }
    }
  });

  state.collapsedGroupKeys = Array.from(collapsedGroupKeySet);
  if (typeof rebuildCollapsedDerivedKeysFromGroups === "function") {
    rebuildCollapsedDerivedKeysFromGroups();
  }
  state.isCollapsed = state.collapsedGroupKeys.length > 0;

  if (typeof renderTimeline === "function") {
    renderTimeline();
  }

  return true;
};

const optimizeLongTextForPerformance = (options = {}) => {
  if (typeof messageStoreState === "undefined" || !Array.isArray(messageStoreState.messages)) {
    return null;
  }

  const {
    charThreshold = 8000,
    wordThreshold = 1500,
    collapseThreshold = 5000,
  } = options;

  const messages = messageStoreState.messages;
  const optimizedMessages = [];
  const collapsedForPerformance = new Set();

  messages.forEach((msg) => {
    const text = msg.text || "";
    const charCount = text.length;
    const wordCount = countWords(text);

    if (charCount > charThreshold || wordCount > wordThreshold) {
      if (msg.key && charCount > collapseThreshold) {
        collapsedForPerformance.add(msg.key);
      }
    }

    optimizedMessages.push({
      ...msg,
      performanceMetadata: {
        charCount,
        wordCount,
        isLongText: charCount > charThreshold || wordCount > wordThreshold,
        shouldCollapse: charCount > collapseThreshold,
      },
    });
  });

  lazyLoadState.lazyLoadedKeys = collapsedForPerformance;
  lazyLoadState.lastOptimizedAt = Date.now();

  return {
    totalMessages: messages.length,
    longTextCount: optimizedMessages.filter((m) => m.performanceMetadata?.isLongText).length,
    collapsedCount: collapsedForPerformance.size,
  };
};

const generateConversationSummary = (options = {}) => {
  if (typeof messageStoreState === "undefined" || !Array.isArray(messageStoreState.messages)) {
    return null;
  }

  const messages = messageStoreState.messages;
  if (messages.length === 0) {
    return null;
  }

  const { maxKeyTopics = 5, maxActionItems = 5, maxDecisions = 3 } = options;

  const allText = messages.map((msg) => msg.text || "").join(" ");
  const allKeywords = getMessageKeywords(allText, 30);

  const userMessages = messages.filter((msg) => msg.role === "user");
  const assistantMessages = messages.filter((msg) => msg.role === "assistant");

  const actionItemKeywords = [
    "需要", "必须", "应该", "将要", "计划", "准备", "todo", "TODO", "action", "Action",
    "任务", "事项", "待办", "下一步", "follow", "Follow", "complete", "Complete",
  ];

  const decisionKeywords = [
    "决定", "结论", "所以", "因此", "最终", "选择", "选用", "采用", "决定", "decision",
    "Decision", "decide", "Decide", "choose", "Choose", "select", "Select",
  ];

  const actionItems = [];
  const decisions = [];

  messages.forEach((msg) => {
    const text = msg.text || "";
    const lowerText = text.toLowerCase();

    actionItemKeywords.forEach((keyword) => {
      if (lowerText.includes(keyword.toLowerCase())) {
        const sentences = text.split(/[。！？.!?]+/).filter((s) => s.trim().length > 0);
        sentences.forEach((sentence) => {
          if (sentence.toLowerCase().includes(keyword.toLowerCase())) {
            actionItems.push({
              text: sentence.trim(),
              sourceRole: msg.role,
              keyword,
            });
          }
        });
      }
    });

    decisionKeywords.forEach((keyword) => {
      if (lowerText.includes(keyword.toLowerCase())) {
        const sentences = text.split(/[。！？.!?]+/).filter((s) => s.trim().length > 0);
        sentences.forEach((sentence) => {
          if (sentence.toLowerCase().includes(keyword.toLowerCase())) {
            decisions.push({
              text: sentence.trim(),
              sourceRole: msg.role,
              keyword,
            });
          }
        });
      }
    });
  });

  const uniqueActionItems = Array.from(
    new Map(actionItems.map((item) => [item.text.slice(0, 50), item])).values()
  ).slice(0, maxActionItems);

  const uniqueDecisions = Array.from(
    new Map(decisions.map((item) => [item.text.slice(0, 50), item])).values()
  ).slice(0, maxDecisions);

  const summary = {
    totalMessages: messages.length,
    userMessages: userMessages.length,
    assistantMessages: assistantMessages.length,
    keyTopics: allKeywords.slice(0, maxKeyTopics),
    actionItems: uniqueActionItems,
    decisions: uniqueDecisions,
    conversationFlow: messages.length > 0
      ? `${messages[0]?.role || "unknown"} 发起对话，共进行 ${messages.length} 轮交互`
      : "",
    lastGeneratedAt: Date.now(),
  };

  Object.assign(summaryState, summary);

  return summary;
};

const formatSummaryForDisplay = (summary) => {
  if (!summary) {
    return null;
  }

  return {
    overview: `对话共 ${summary.totalMessages} 条消息（用户 ${summary.userMessages} 条，助手 ${summary.assistantMessages} 条）`,
    keyTopics: summary.keyTopics || [],
    actionItems: (summary.actionItems || []).map((item) => item.text),
    decisions: (summary.decisions || []).map((item) => item.text),
    conversationFlow: summary.conversationFlow || "",
  };
};

if (typeof window !== "undefined") {
  window.calculateConversationStats = calculateConversationStats;
  window.formatStatsForDisplay = formatStatsForDisplay;
  window.countWords = countWords;
  window.getMessageKeywords = getMessageKeywords;
  window.calculateTextSimilarity = calculateTextSimilarity;
  window.groupMessagesByTopic = groupMessagesByTopic;
  window.collapseTopicGroup = collapseTopicGroup;
  window.expandTopicGroup = expandTopicGroup;
  window.optimizeLongTextForPerformance = optimizeLongTextForPerformance;
  window.generateConversationSummary = generateConversationSummary;
  window.formatSummaryForDisplay = formatSummaryForDisplay;
}
