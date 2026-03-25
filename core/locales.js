/*
 * ChatGPT Conversation Toolkit - Internationalization
 */
const DEFAULT_TOOLKIT_LANGUAGE = "en";
const TOOLKIT_LANGUAGE_AUTO = "auto";
const TOOLKIT_SUPPORTED_LANGUAGES = ["en", "zh-CN"];

const i18nState = {
  preference: TOOLKIT_LANGUAGE_AUTO,
  detected: DEFAULT_TOOLKIT_LANGUAGE,
  locale: DEFAULT_TOOLKIT_LANGUAGE,
};

const I18N_MESSAGES = {
  en: {
    "language.label": "Language",
    "language.auto": "Auto (follow browser)",
    "language.autoWithLocale": "Auto (follow browser: {language})",
    "language.english": "English",
    "language.chinese": "Chinese (Simplified)",

    "toolbar.title": "ChatGPT Toolkit",
    "toolbar.subtitle": "Organize long conversations with clear navigation.",
    "toolbar.minimize": "Hide",
    "toolbar.minimizeAria": "Hide toolkit",
    "toolbar.expandAria": "Open ChatGPT Toolkit",
    "toolbar.collapse": "Organize Conversation",
    "toolbar.restore": "Expand All",
    "toolbar.export": "Export Conversation",
    "toolbar.exportJson": "Export JSON",
    "toolbar.exportMarkdown": "Export Markdown",
    "toolbar.promptLibrary": "Prompt Library",
    "toolbar.timelineShow": "Conversation Navigation",
    "toolbar.timelineHide": "Collapse Navigation",
    "toolbar.settings": "Preferences",
    "toolbar.settingsAria": "Open preferences",
    "toolbar.searchPlaceholder": "Search current conversation",
    "toolbar.search": "Search",
    "toolbar.searchTitle": "Search",
    "toolbar.searchSection": "Search",
    "toolbar.sectionPrimary": "Core Actions",
    "toolbar.sectionWorkspace": "Workspace Tools",
    "toolbar.searchPrev": "Prev",
    "toolbar.searchPrevTitle": "Previous match",
    "toolbar.searchNext": "Next",
    "toolbar.searchNextTitle": "Next match",
    "toolbar.ready": "Ready.",
    "toolbar.tip": "Tip: optimization hides older messages, but export still includes them.",

    "settings.title": "Preferences",
    "settings.autoOptimizeEnabled": "Auto organize",
    "settings.autoOptimizeThreshold": "Auto organize threshold",
    "settings.keepLatest": "Keep latest QA groups",
    "settings.timelineMaxNodes": "Navigation max nodes",
    "settings.timelineSampleNodes": "Navigation sample nodes",
    "settings.unitQaGroups": "QA groups",
    "settings.unitQaNodes": "QA group nodes",
    "settings.save": "Save",
    "settings.restoreDefaults": "Restore defaults",
    "settings.resetUiAndSettings": "Reset UI & Settings",
    "settings.resetUiAndSettingsConfirm": "Reset layout and preferences now? This will not delete your prompt/content data.",
    "settings.close": "Close",
    "settings.groupAutomation": "Automation",
    "settings.groupConversation": "Conversation View",

    "status.collapseNoNeed": "There are not enough messages to optimize.",
    "status.collapseDone": "Conversation organized, hid {count} groups.",
    "status.restoreNone": "There are no hidden messages to restore.",
    "status.restoreDone": "All content has been expanded.",
    "status.exportStarted": "Export started. Check your downloads.",
    "status.exportMarkdownStarted": "Markdown export started. Check your downloads.",
    "status.exportMarkdownUnavailable": "Markdown export unavailable: unable to locate high-fidelity message content.",
    "status.searchRestoreFirst": "Restore hidden messages before using search.",
    "status.searchNoMatch": "No matches found.",
    "status.settingsSaved": "Preferences saved.",
    "status.settingsRestored": "Defaults restored.",
    "status.resetUiAndSettingsDone": "Layout and preferences have been reset.",
    "status.autoOptimizeTriggered": "Conversation organized automatically.",
    "status.promptCopyMissing": "Copy failed: prompt not found.",
    "status.promptCopyBlocked": "Copy failed: clipboard access is not available.",
    "status.promptCopyDone": "Copied prompt: {title}",
    "status.promptInsertDone": "Inserted prompt: {title}",
    "status.promptInsertBlocked": "Insert failed: composer not found or write failed.",
    "status.promptInsertFallbackCopied": "Composer unavailable, copied to clipboard: {title}",
    "status.promptAddEmpty": "Add failed: prompt content cannot be empty.",
    "status.promptAddDone": "Prompt added.",
    "status.promptDeleteDone": "Prompt deleted.",
    "status.promptExportDone": "Prompt library exported as JSON.",
    "status.promptImportEmpty": "Import failed: the JSON file has no usable prompts.",
    "status.promptImportNoNew": "Import complete: nothing new was added.",
    "status.promptImportDone": "Import complete: added {count} prompts.",
    "status.promptImportInvalid": "Import failed: invalid JSON format.",

    "search.noMatch": "No matches",

    "timeline.title": "Conversation Navigation",
    "timeline.ariaLabel": "Conversation navigation",
    "timeline.hintNoMore": "No more messages.",
    "timeline.hintRestore": "Restore hidden messages first.",
    "timeline.countAria": "Current node {current}, total user messages {total}",
    "timeline.jumpAria": "Jump to user message {index}",
    "timeline.previewFallback": "User message {index}",

    "prompt.untitled": "Untitled Prompt",
    "prompt.uncategorized": "Uncategorized",
    "prompt.toastCopyDone": "Copied",
    "prompt.toastCopyFailed": "Copy failed",
    "prompt.toastInsertDone": "Inserted",
    "prompt.toastInsertFailed": "Insert failed",
    "prompt.title": "Prompt Library",
    "prompt.modalAria": "Prompt library",
    "prompt.close": "Close",
    "prompt.searchPlaceholder": "Search prompts (title / content / category)",
    "prompt.allCategories": "All categories",
    "prompt.sortUpdatedDesc": "Recently updated",
    "prompt.sortUpdatedAsc": "Oldest updated",
    "prompt.sortTitleAsc": "Title A-Z",
    "prompt.sortTitleDesc": "Title Z-A",
    "prompt.sortCategoryAsc": "Category",
    "prompt.empty": "No prompts available yet.",
    "prompt.emptyHint": "Add one below or import a JSON prompt library.",
    "prompt.emptyNoMatch": "No matching prompts.",
    "prompt.emptyNoMatchHint": "Try another keyword or change category filter.",
    "prompt.emptyActionClearSearch": "Clear search",
    "prompt.emptyActionResetCategory": "Reset category",
    "prompt.titlePlaceholder": "Title (optional)",
    "prompt.categoryPlaceholder": "Category (optional)",
    "prompt.contentPlaceholder": "Enter prompt content",
    "prompt.add": "Add Prompt",
    "prompt.count": "{visible} / {total}",
    "prompt.behaviorOpen": "Prompt behavior settings",
    "prompt.behaviorClickTitle": "Default click behavior",
    "prompt.behaviorClickInsert": "Single click inserts",
    "prompt.behaviorClickCopy": "Single click copies",
    "prompt.behaviorAutoAttachTitle": "Auto-attach before send",
    "prompt.behaviorAutoAttachEnabled": "Enable auto-attach",
    "prompt.behaviorAutoAttachDedup": "Deduplicate auto-attach prefix",
    "prompt.behaviorAutoAttachListTitle": "Prompts included (in order)",
    "prompt.behaviorNoItems": "No prompt items available.",
    "prompt.itemActionInsert": "Click to insert",
    "prompt.itemActionCopy": "Click to copy",
    "prompt.importJson": "Import JSON",
    "prompt.exportJson": "Export JSON",
    "prompt.delete": "Delete",
    "prompt.itemMetaWithTime": "{category} · {time} · {action}",
    "prompt.itemMetaNoTime": "{category} · {action}",
    "prompt.deleteConfirm": "Delete prompt “{title}”?",

    "folder.defaultName": "New Folder {index}",
    "folder.managerLabel": "Folders",
    "folder.ungrouped": "Ungrouped",
    "folder.create": "New",
    "folder.menuRename": "Rename",
    "folder.menuDelete": "Delete",
    "folder.menuOpenAria": "Open folder menu",
    "folder.emptyHint": "Drop conversations here",
    "folder.createPrompt": "Enter a folder name",
    "folder.renamePrompt": "Rename folder",
    "folder.deleteConfirm": "Delete folder “{name}”? Conversations inside it will move back to Ungrouped.",
  },
  "zh-CN": {
    "language.label": "语言",
    "language.auto": "\u81ea\u52a8\uff08\u8ddf\u968f\u6d4f\u89c8\u5668\uff09",
    "language.autoWithLocale": "\u81ea\u52a8\uff08\u8ddf\u968f\u6d4f\u89c8\u5668\uff1a{language}\uff09",
    "language.english": "English",
    "language.chinese": "简体中文",

    "toolbar.title": "ChatGPT 工具",
    "toolbar.subtitle": "\u6574\u7406\u957f\u5bf9\u8bdd\uff0c\u67e5\u627e\u66f4\u8f7b\u677e",
    "toolbar.minimize": "收起",
    "toolbar.minimizeAria": "收起工具",
    "toolbar.expandAria": "展开 ChatGPT 工具",
    "toolbar.collapse": "\u6574\u7406\u5bf9\u8bdd",
    "toolbar.restore": "\u5c55\u5f00\u5168\u90e8",
    "toolbar.export": "\u5bfc\u51fa\u4f1a\u8bdd",
    "toolbar.exportJson": "\u5bfc\u51fa JSON",
    "toolbar.exportMarkdown": "\u5bfc\u51fa Markdown",
    "toolbar.promptLibrary": "\u63d0\u793a\u8bcd\u5e93",
    "toolbar.timelineShow": "\u5bf9\u8bdd\u5bfc\u822a",
    "toolbar.timelineHide": "\u6536\u8d77\u5bfc\u822a",
    "toolbar.settings": "\u504f\u597d\u8bbe\u7f6e",
    "toolbar.settingsAria": "\u6253\u5f00\u504f\u597d\u8bbe\u7f6e",
    "toolbar.searchPlaceholder": "\u641c\u7d22\u5f53\u524d\u5bf9\u8bdd",
    "toolbar.search": "\u641c\u7d22",
    "toolbar.searchTitle": "\u641c\u7d22",
    "toolbar.sectionWorkspace": "\u5de5\u4f5c\u533a\u529f\u80fd",
    "toolbar.sectionPrimary": "\u4e3b\u64cd\u4f5c",
    "toolbar.searchSection": "\u641c\u7d22",
    "toolbar.searchPrev": "上一条",
    "toolbar.searchPrevTitle": "上一条",
    "toolbar.searchNext": "下一条",
    "toolbar.searchNextTitle": "下一条",
    "toolbar.ready": "准备就绪。",
    "toolbar.tip": "提示：优化会隐藏旧消息，导出时会自动包含隐藏内容。",

    "settings.title": "\u504f\u597d\u8bbe\u7f6e",
    "settings.autoOptimizeEnabled": "\u81ea\u52a8\u6574\u7406",
    "settings.autoOptimizeThreshold": "\u81ea\u52a8\u6574\u7406\u9608\u503c",
    "settings.keepLatest": "\u4fdd\u7559\u6700\u8fd1 QA \u7ec4\u6570",
    "settings.timelineMaxNodes": "\u5bfc\u822a\u6700\u5927\u8282\u70b9\u6570",
    "settings.timelineSampleNodes": "\u5bfc\u822a\u91c7\u6837\u8282\u70b9\u6570",
    "settings.unitQaGroups": "QA \u7ec4",
    "settings.unitQaNodes": "QA \u7ec4\u70b9\u6570",
    "settings.save": "\u4fdd\u5b58",
    "settings.restoreDefaults": "\u6062\u590d\u9ed8\u8ba4",
    "settings.resetUiAndSettings": "\u91cd\u7f6e\u754c\u9762\u4e0e\u8bbe\u7f6e",
    "settings.resetUiAndSettingsConfirm": "\u786e\u5b9a\u7acb\u5373\u91cd\u7f6e\u5e03\u5c40\u4e0e\u504f\u597d\u8bbe\u7f6e\uff1f\u4e0d\u4f1a\u5220\u9664\u63d0\u793a\u8bcd/\u5185\u5bb9\u6570\u636e\u3002",
    "settings.close": "\u5173\u95ed",
    "settings.groupConversation": "\u5bf9\u8bdd\u663e\u793a",
    "settings.groupAutomation": "\u81ea\u52a8\u6574\u7406",

    "status.collapseNoNeed": "当前消息数量较少，无需优化。",
    "status.collapseDone": "\u5df2\u6574\u7406\u5f53\u524d\u5bf9\u8bdd\uff0c\u9690\u85cf {count} \u7ec4\u5185\u5bb9\u3002",
    "status.restoreNone": "没有需要恢复的消息。",
    "status.restoreDone": "\u5df2\u6062\u590d\u5168\u90e8\u5185\u5bb9\u3002",
    "status.exportStarted": "导出已开始，请检查下载文件。",
    "status.exportMarkdownStarted": "Markdown 导出已开始，请检查下载文件。",
    "status.exportMarkdownUnavailable": "Markdown 导出不可用：无法定位高保真消息内容。",
    "status.searchRestoreFirst": "请先恢复隐藏消息，才能使用搜索功能。",
    "status.searchNoMatch": "未找到匹配。",
    "status.settingsSaved": "\u504f\u597d\u8bbe\u7f6e\u5df2\u4fdd\u5b58\u3002",
    "status.settingsRestored": "已恢复默认设置。",
    "status.resetUiAndSettingsDone": "\u754c\u9762\u5e03\u5c40\u4e0e\u504f\u597d\u8bbe\u7f6e\u5df2\u91cd\u7f6e\u3002",
    "status.autoOptimizeTriggered": "\u5df2\u81ea\u52a8\u6574\u7406\u5f53\u524d\u5bf9\u8bdd\u3002",
    "status.promptCopyMissing": "复制失败：未找到对应提示词。",
    "status.promptCopyBlocked": "复制失败：浏览器不允许访问剪贴板。",
    "status.promptCopyDone": "已复制提示词：{title}",
    "status.promptInsertDone": "已插入提示词：{title}",
    "status.promptInsertBlocked": "插入失败：未找到输入框或写入失败。",
    "status.promptInsertFallbackCopied": "未找到输入框，已复制到剪贴板：{title}",
    "status.promptAddEmpty": "新增失败：提示词内容不能为空。",
    "status.promptAddDone": "已添加提示词。",
    "status.promptDeleteDone": "已删除提示词。",
    "status.promptExportDone": "提示词库已导出为 JSON。",
    "status.promptImportEmpty": "导入失败：JSON 文件中没有可用提示词。",
    "status.promptImportNoNew": "导入完成：没有新增内容。",
    "status.promptImportDone": "导入完成：新增 {count} 条提示词。",
    "status.promptImportInvalid": "导入失败：请检查 JSON 格式。",

    "search.noMatch": "未找到匹配",

    "timeline.title": "\u5bf9\u8bdd\u5bfc\u822a",
    "timeline.ariaLabel": "\u5bf9\u8bdd\u5bfc\u822a",
    "timeline.hintNoMore": "已经没有消息了",
    "timeline.hintRestore": "请恢复隐藏消息",
    "timeline.countAria": "当前节点 {current}，总用户节点 {total}",
    "timeline.jumpAria": "跳转到第 {index} 条用户消息",
    "timeline.previewFallback": "用户消息 {index}",

    "prompt.untitled": "未命名提示词",
    "prompt.uncategorized": "未分类",
    "prompt.toastCopyDone": "已复制",
    "prompt.toastCopyFailed": "复制失败",
    "prompt.toastInsertDone": "已插入",
    "prompt.toastInsertFailed": "插入失败",
    "prompt.title": "提示词库",
    "prompt.modalAria": "提示词库",
    "prompt.close": "关闭",
    "prompt.searchPlaceholder": "搜索提示词（标题/内容/分类）",
    "prompt.allCategories": "全部分类",
    "prompt.sortUpdatedDesc": "最近更新",
    "prompt.sortUpdatedAsc": "最早更新",
    "prompt.sortTitleAsc": "标题 A-Z",
    "prompt.sortTitleDesc": "标题 Z-A",
    "prompt.sortCategoryAsc": "分类排序",
    "prompt.empty": "暂无可用提示词",
    "prompt.emptyHint": "可在下方新增，或导入 JSON 提示词库。",
    "prompt.emptyNoMatch": "未找到匹配的提示词",
    "prompt.emptyNoMatchHint": "请尝试其他关键词或切换分类筛选。",
    "prompt.emptyActionClearSearch": "清空搜索",
    "prompt.emptyActionResetCategory": "恢复全部分类",
    "prompt.titlePlaceholder": "标题（选填）",
    "prompt.categoryPlaceholder": "分类（选填）",
    "prompt.contentPlaceholder": "输入提示词内容",
    "prompt.add": "添加提示词",
    "prompt.count": "{visible} / {total}",
    "prompt.behaviorOpen": "提示词行为设置",
    "prompt.behaviorClickTitle": "默认点击行为",
    "prompt.behaviorClickInsert": "单击插入",
    "prompt.behaviorClickCopy": "单击复制",
    "prompt.behaviorAutoAttachTitle": "发送前自动添加",
    "prompt.behaviorAutoAttachEnabled": "启用自动添加",
    "prompt.behaviorAutoAttachDedup": "自动添加前缀去重",
    "prompt.behaviorAutoAttachListTitle": "参与自动添加的提示词（可排序）",
    "prompt.behaviorNoItems": "暂无可选提示词。",
    "prompt.itemActionInsert": "单击插入",
    "prompt.itemActionCopy": "单击复制",
    "prompt.importJson": "导入 JSON",
    "prompt.exportJson": "导出 JSON",
    "prompt.delete": "删除",
    "prompt.itemMetaWithTime": "{category} · {time} · {action}",
    "prompt.itemMetaNoTime": "{category} · {action}",
    "prompt.deleteConfirm": "确认删除提示词「{title}」吗？",

    "folder.defaultName": "新文件夹 {index}",
    "folder.managerLabel": "文件夹",
    "folder.ungrouped": "未分组",
    "folder.create": "新建",
    "folder.menuRename": "重命名",
    "folder.menuDelete": "删除",
    "folder.menuOpenAria": "打开文件夹菜单",
    "folder.emptyHint": "拖动聊天到这里",
    "folder.createPrompt": "输入文件夹名称",
    "folder.renamePrompt": "重命名文件夹",
    "folder.deleteConfirm": "删除文件夹“{name}”？其中会话会回到未分组。",
  },
};

const normalizeToolkitLanguage = (value) => {
  const nextValue = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!nextValue) {
    return null;
  }
  if (nextValue.startsWith("zh")) {
    return "zh-CN";
  }
  if (nextValue.startsWith("en")) {
    return "en";
  }
  return null;
};

const getLanguageDisplayName = (language) => {
  if (language === "zh-CN") {
    return t("language.chinese");
  }
  return t("language.english");
};

const detectToolkitLanguageFromBrowser = () => {
  const candidates = Array.isArray(navigator.languages) && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language];

  for (const candidate of candidates) {
    const normalized = normalizeToolkitLanguage(candidate);
    if (normalized && TOOLKIT_SUPPORTED_LANGUAGES.includes(normalized)) {
      return normalized;
    }
  }

  return DEFAULT_TOOLKIT_LANGUAGE;
};

const loadLanguagePreference = () => {
  try {
    const stored = localStorage.getItem(LANGUAGE_PREFERENCE_KEY);
    if (!stored) {
      return TOOLKIT_LANGUAGE_AUTO;
    }
    if (stored === TOOLKIT_LANGUAGE_AUTO) {
      return TOOLKIT_LANGUAGE_AUTO;
    }
    return normalizeToolkitLanguage(stored) || TOOLKIT_LANGUAGE_AUTO;
  } catch (error) {
    return TOOLKIT_LANGUAGE_AUTO;
  }
};

const saveLanguagePreference = (preference) => {
  try {
    localStorage.setItem(LANGUAGE_PREFERENCE_KEY, preference);
  } catch (error) {
    // Ignore storage write failures.
  }
};

const getCurrentLanguage = () => i18nState.locale;
const getLanguagePreference = () => i18nState.preference;

const formatMessageTemplate = (template, params = {}) =>
  template.replace(/\{(\w+)\}/g, (matched, key) => {
    const value = params[key];
    return value === null || value === undefined ? matched : String(value);
  });

const t = (key, params = {}) => {
  const locale = getCurrentLanguage();
  const localized =
    I18N_MESSAGES[locale]?.[key] ||
    I18N_MESSAGES[DEFAULT_TOOLKIT_LANGUAGE]?.[key] ||
    key;
  return formatMessageTemplate(localized, params);
};

const getLanguageMenuLabel = (preference) => {
  if (preference === TOOLKIT_LANGUAGE_AUTO) {
    return t("language.autoWithLocale", {
      language: getLanguageDisplayName(i18nState.detected),
    });
  }

  return getLanguageDisplayName(preference);
};

const refreshLocalizedUi = () => {
  if (typeof refreshToolbarLocalization === "function") {
    refreshToolbarLocalization();
  }
  if (typeof refreshTimelineLocalization === "function") {
    refreshTimelineLocalization();
  }
  if (typeof refreshPromptLocalization === "function") {
    refreshPromptLocalization();
  }
  if (typeof refreshSettingsModalLocalization === "function") {
    refreshSettingsModalLocalization();
  }
  if (typeof refreshFolderLocalization === "function") {
    refreshFolderLocalization();
  }
};

const setLanguagePreference = (preference, options = {}) => {
  const { persist = true, refresh = true } = options;
  const normalizedPreference =
    preference === TOOLKIT_LANGUAGE_AUTO
      ? TOOLKIT_LANGUAGE_AUTO
      : normalizeToolkitLanguage(preference) || DEFAULT_TOOLKIT_LANGUAGE;

  i18nState.preference = normalizedPreference;
  i18nState.detected = detectToolkitLanguageFromBrowser();
  i18nState.locale =
    normalizedPreference === TOOLKIT_LANGUAGE_AUTO ? i18nState.detected : normalizedPreference;

  if (persist) {
    saveLanguagePreference(normalizedPreference);
  }

  if (refresh) {
    refreshLocalizedUi();
  }
};

const initI18n = () => {
  setLanguagePreference(loadLanguagePreference(), {
    persist: false,
    refresh: false,
  });
};
