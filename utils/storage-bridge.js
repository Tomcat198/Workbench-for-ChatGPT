/*
 * ChatGPT Conversation Toolkit - Storage utilities
 */
const getExtensionStorageArea = () =>
  typeof chrome !== "undefined" && chrome?.storage?.local ? chrome.storage.local : null;

const SETTINGS_STORAGE_KEY = "chatgpt-toolkit-settings-v1";
const TOOLBAR_POSITION_KEY = "chatgpt-toolkit-toolbar-position-v1";
const MINIMIZED_POSITION_V2_KEY = "chatgpt-toolkit-minimized-position-v2";

const normalizePromptBehaviorSettings = (rawSettings) => {
  const source = rawSettings && typeof rawSettings === "object" ? rawSettings : {};
  const clickAction = source.clickAction === "copy" ? "copy" : "insert";
  const autoAttachEnabled = sanitizeBooleanSettingsValue(source.autoAttachEnabled, false);
  const autoAttachDedupEnabled = sanitizeBooleanSettingsValue(source.autoAttachDedupEnabled, true);
  const autoAttachTrigger =
    source.autoAttachTrigger === "beforeSendEach" ||
    source.autoAttachTrigger === "beforeSendFirstInConversation"
      ? "beforeSendEach"
      : "beforeSendEach";
  const autoAttachPromptIds = Array.isArray(source.autoAttachPromptIds)
    ? source.autoAttachPromptIds
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    : [];

  return {
    ...DEFAULT_PROMPT_BEHAVIOR_SETTINGS,
    clickAction,
    autoAttachEnabled,
    autoAttachTrigger,
    autoAttachPromptIds,
    autoAttachDedupEnabled,
  };
};

const saveMinimizedPosition = (position) => {
  try {
    localStorage.setItem(POSITION_KEY, JSON.stringify(position));
  } catch (error) {
    // Ignore storage write failures.
  }
};

const saveToolbarPosition = (position) => {
  try {
    localStorage.setItem(TOOLBAR_POSITION_KEY, JSON.stringify(position));
  } catch (error) {
    // Ignore storage write failures.
  }
};

const loadToolbarPosition = () => {
  try {
    const stored = localStorage.getItem(TOOLBAR_POSITION_KEY);
    if (!stored) {
      return null;
    }
    const parsed = JSON.parse(stored);
    const left = Number(parsed?.left);
    const top = Number(parsed?.top);
    if (!Number.isFinite(left) || !Number.isFinite(top)) {
      return null;
    }
    return { left, top };
  } catch (error) {
    return null;
  }
};

const savePromptPanelPosition = (position) => {
  try {
    if (!position) {
      localStorage.removeItem(PROMPT_PANEL_POSITION_KEY);
      return;
    }
    localStorage.setItem(PROMPT_PANEL_POSITION_KEY, JSON.stringify(position));
  } catch (error) {
    // Ignore storage write failures.
  }
};

const loadPromptPanelPosition = () => {
  try {
    const stored = localStorage.getItem(PROMPT_PANEL_POSITION_KEY);
    if (!stored) {
      return null;
    }
    const parsed = JSON.parse(stored);
    const left = Number(parsed?.left);
    const top = Number(parsed?.top);
    if (!Number.isFinite(left) || !Number.isFinite(top)) {
      return null;
    }
    return {
      mode: parsed?.mode === "manual" ? "manual" : "anchored",
      left: Math.round(left),
      top: Math.round(top),
    };
  } catch (error) {
    return null;
  }
};

const saveMinimizedPositionV2 = (position) => {
  try {
    localStorage.setItem(MINIMIZED_POSITION_V2_KEY, JSON.stringify(position));
  } catch (error) {
    // Ignore storage write failures.
  }
};

const normalizeMinimizedPositionV2 = (rawValue) => {
  const edge = typeof rawValue?.edge === "string" ? rawValue.edge : "";
  const offset = Number(rawValue?.offset);
  if (!["left", "right", "top", "bottom"].includes(edge) || !Number.isFinite(offset)) {
    return null;
  }
  return {
    edge,
    offset: Math.max(0, Math.round(offset)),
  };
};

const loadMinimizedPositionV2 = () => {
  try {
    const storedV2 = localStorage.getItem(MINIMIZED_POSITION_V2_KEY);
    if (storedV2) {
      return normalizeMinimizedPositionV2(JSON.parse(storedV2));
    }
  } catch (error) {
    // Ignore parse failures for v2 data.
  }

  const legacy = loadMinimizedPosition();
  if (!legacy || typeof legacy !== "object") {
    return null;
  }

  let migrated = null;
  if ((legacy.edge === "left" || legacy.edge === "right") && Number.isFinite(Number(legacy.top))) {
    migrated = {
      edge: legacy.edge,
      offset: Math.max(0, Math.round(Number(legacy.top))),
    };
  } else if (Number.isFinite(Number(legacy.left)) && Number.isFinite(Number(legacy.top))) {
    const centerX = Number(legacy.left) + 24;
    const edge = centerX <= window.innerWidth / 2 ? "left" : "right";
    migrated = {
      edge,
      offset: Math.max(0, Math.round(Number(legacy.top))),
    };
  }

  if (migrated) {
    saveMinimizedPositionV2(migrated);
  }

  return migrated;
};
const saveTimelineVisibility = (visible) => {
  try {
    localStorage.setItem(TIMELINE_VISIBLE_KEY, visible ? "1" : "0");
  } catch (error) {
    // Ignore storage write failures.
  }
};

const saveTimelinePosition = (position) => {
  try {
    localStorage.setItem(TIMELINE_POSITION_KEY, JSON.stringify(position));
  } catch (error) {
    // Ignore storage write failures.
  }
};

const loadTimelineVisibility = () => {
  try {
    const stored = localStorage.getItem(TIMELINE_VISIBLE_KEY);
    if (stored === null) {
      return false;
    }
    return stored !== "0" && stored !== "false";
  } catch (error) {
    return false;
  }
};

const loadTimelinePosition = () => {
  try {
    const stored = localStorage.getItem(TIMELINE_POSITION_KEY);
    if (!stored) {
      return null;
    }
    const parsed = JSON.parse(stored);
    const left = Number(parsed?.left);
    const top = Number(parsed?.top);
    if (!Number.isFinite(left) || !Number.isFinite(top)) {
      return null;
    }
    return { left, top };
  } catch (error) {
    return null;
  }
};

const loadMinimizedPosition = () => {
  const stored = localStorage.getItem(POSITION_KEY);
  if (!stored) {
    return null;
  }
  try {
    return JSON.parse(stored);
  } catch (error) {
    return null;
  }
};

const saveFolderSnapshot = (snapshot) => {
  try {
    localStorage.setItem(FOLDER_LOCAL_FALLBACK_KEY, JSON.stringify(snapshot));
  } catch (error) {
    // Ignore storage write failures.
  }

  const storageArea = getExtensionStorageArea();
  if (!storageArea) {
    return;
  }

  try {
    storageArea.set({ [FOLDER_STORAGE_KEY]: snapshot }, () => {
      void chrome?.runtime?.lastError;
    });
  } catch (error) {
    // Ignore storage write failures.
  }
};

const loadFolderSnapshot = () => {
  try {
    const stored = localStorage.getItem(FOLDER_LOCAL_FALLBACK_KEY);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored);
  } catch (error) {
    return null;
  }
};

const loadFolderSnapshotFromExtension = () =>
  new Promise((resolve) => {
    const storageArea = getExtensionStorageArea();
    if (!storageArea) {
      resolve(null);
      return;
    }

    try {
      storageArea.get([FOLDER_STORAGE_KEY], (result) => {
        if (chrome?.runtime?.lastError) {
          resolve(null);
          return;
        }
        resolve(result?.[FOLDER_STORAGE_KEY] || null);
      });
    } catch (error) {
      resolve(null);
    }
  });

const sanitizeSettingsValue = (value, fallback, min = 1, max = 2000) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(numeric)));
};

const sanitizeBooleanSettingsValue = (value, fallback = false) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true" || value === "1" || value === 1) {
    return true;
  }
  if (value === "false" || value === "0" || value === 0) {
    return false;
  }
  return fallback;
};

const normalizeSettings = (rawSettings) => {
  const source = rawSettings && typeof rawSettings === "object" ? rawSettings : {};
  const timelineMaxNodes = sanitizeSettingsValue(
    source.timelineMaxNodes,
    DEFAULT_SETTINGS.timelineMaxNodes,
  );
  const timelineSampleNodes = sanitizeSettingsValue(
    source.timelineSampleNodes,
    DEFAULT_SETTINGS.timelineSampleNodes,
  );

  return {
    autoOptimizeEnabled: sanitizeBooleanSettingsValue(
      source.autoOptimizeEnabled,
      DEFAULT_SETTINGS.autoOptimizeEnabled,
    ),
    autoOptimizeThreshold: sanitizeSettingsValue(
      source.autoOptimizeThreshold,
      DEFAULT_SETTINGS.autoOptimizeThreshold,
      1,
      5000,
    ),
    keepLatest: sanitizeSettingsValue(source.keepLatest, DEFAULT_SETTINGS.keepLatest),
    timelineMaxNodes,
    timelineSampleNodes: Math.min(timelineSampleNodes, timelineMaxNodes),
  };
};

const loadSettings = async () => {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_SETTINGS };
    }
    const parsed = JSON.parse(stored);
    return normalizeSettings(parsed);
  } catch (error) {
    return { ...DEFAULT_SETTINGS };
  }
};

const saveSettings = async (nextSettings) => {
  const normalized = normalizeSettings(nextSettings);
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    // Ignore storage write failures.
  }
  return normalized;
};

const loadPromptBehaviorSettings = () => {
  try {
    const stored = localStorage.getItem(PROMPT_BEHAVIOR_STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_PROMPT_BEHAVIOR_SETTINGS };
    }
    const parsed = JSON.parse(stored);
    return normalizePromptBehaviorSettings(parsed);
  } catch (error) {
    return { ...DEFAULT_PROMPT_BEHAVIOR_SETTINGS };
  }
};

const savePromptBehaviorSettings = (nextSettings) => {
  const normalized = normalizePromptBehaviorSettings(nextSettings);
  try {
    localStorage.setItem(PROMPT_BEHAVIOR_STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    // Ignore storage write failures.
  }
  return normalized;
};

const ENCRYPTION_KEY_PREFIX = "tk_enc_";
const BACKUP_STORAGE_KEY = "chatgpt-toolkit-backup-v1";
const BACKUP_HISTORY_KEY = "chatgpt-toolkit-backup-history-v1";

const generateDeviceFingerprint = () => {
  try {
    const screenInfo = `${screen.width}x${screen.height}x${screen.colorDepth}`;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    const platform = navigator.platform;
    const vendor = navigator.vendor;
    const maxTouchPoints = navigator.maxTouchPoints || 0;

    const raw = `${screenInfo}|${timeZone}|${language}|${platform}|${vendor}|${maxTouchPoints}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  } catch (error) {
    return "default_fp";
  }
};

const simpleXorEncrypt = (text, key) => {
  if (!text || !key) {
    return text;
  }
  const keyStr = String(key);
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const keyCharCode = keyStr.charCodeAt(i % keyStr.length);
    result += String.fromCharCode(charCode ^ keyCharCode);
  }
  return result;
};

const simpleXorDecrypt = (text, key) => {
  return simpleXorEncrypt(text, key);
};

const encodeForStorage = (data) => {
  try {
    const jsonStr = JSON.stringify(data);
    const fingerprint = generateDeviceFingerprint();
    const encrypted = simpleXorEncrypt(jsonStr, fingerprint);
    const base64Encoded = btoa(encodeURIComponent(encrypted));
    return `${ENCRYPTION_KEY_PREFIX}${base64Encoded}`;
  } catch (error) {
    console.warn("[Storage] Encryption failed, storing as plain text:", error);
    return JSON.stringify(data);
  }
};

const decodeFromStorage = (encoded) => {
  if (!encoded) {
    return null;
  }

  if (encoded.startsWith(ENCRYPTION_KEY_PREFIX)) {
    try {
      const base64Part = encoded.slice(ENCRYPTION_KEY_PREFIX.length);
      const decodedBase64 = decodeURIComponent(atob(base64Part));
      const fingerprint = generateDeviceFingerprint();
      const decrypted = simpleXorDecrypt(decodedBase64, fingerprint);
      return JSON.parse(decrypted);
    } catch (error) {
      console.warn("[Storage] Decryption failed, trying fallback:", error);
    }
  }

  try {
    return JSON.parse(encoded);
  } catch (error) {
    console.warn("[Storage] Parse failed:", error);
    return null;
  }
};

const getAllStorageKeys = () => {
  return [
    SETTINGS_STORAGE_KEY,
    TOOLBAR_POSITION_KEY,
    MINIMIZED_POSITION_V2_KEY,
    POSITION_KEY,
    TIMELINE_VISIBLE_KEY,
    TIMELINE_POSITION_KEY,
    FOLDER_LOCAL_FALLBACK_KEY,
    FOLDER_STORAGE_KEY,
    PROMPT_STORAGE_KEY,
    PROMPT_LOCAL_FALLBACK_KEY,
    PROMPT_PANEL_POSITION_KEY,
    PROMPT_BEHAVIOR_STORAGE_KEY,
    PROMPT_DRAFT_STORAGE_KEY,
    PROMPT_COMBO_STORAGE_KEY,
    PROMPT_TAGS_STORAGE_KEY,
    PROMPT_OPERATION_LOG_KEY,
    CONVERSATION_STATS_STORAGE_KEY,
    TOPIC_GROUPS_STORAGE_KEY,
    CONVERSATION_SUMMARY_STORAGE_KEY,
    LANGUAGE_PREFERENCE_KEY,
  ];
};

const createFullBackup = () => {
  const backup = {
    version: 1,
    createdAt: new Date().toISOString(),
    timestamp: Date.now(),
    data: {},
    metadata: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
    },
  };

  const keys = getAllStorageKeys();
  keys.forEach((key) => {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) {
        backup.data[key] = value;
      }
    } catch (error) {
      console.warn(`[Backup] Failed to read key: ${key}`, error);
    }
  });

  return backup;
};

const saveBackupToStorage = (backup) => {
  try {
    const encoded = encodeForStorage(backup);
    localStorage.setItem(BACKUP_STORAGE_KEY, encoded);

    let history = [];
    try {
      const rawHistory = localStorage.getItem(BACKUP_HISTORY_KEY);
      if (rawHistory) {
        history = decodeFromStorage(rawHistory) || [];
      }
    } catch (error) {
      history = [];
    }

    history.unshift({
      timestamp: backup.timestamp,
      createdAt: backup.createdAt,
      itemCount: Object.keys(backup.data).length,
    });

    if (history.length > 10) {
      history = history.slice(0, 10);
    }

    const encodedHistory = encodeForStorage(history);
    localStorage.setItem(BACKUP_HISTORY_KEY, encodedHistory);

    logPromptOperation("backup-create", { timestamp: backup.timestamp });

    return true;
  } catch (error) {
    console.error("[Backup] Failed to save backup:", error);
    return false;
  }
};

const loadBackupFromStorage = () => {
  try {
    const encoded = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!encoded) {
      return null;
    }
    return decodeFromStorage(encoded);
  } catch (error) {
    console.error("[Backup] Failed to load backup:", error);
    return null;
  }
};

const restoreFromBackup = (backup, options = {}) => {
  if (!backup || !backup.data) {
    return { success: false, error: "Invalid backup" };
  }

  const { clearExisting = true } = options;
  const restoredKeys = [];
  const failedKeys = [];

  if (clearExisting) {
    const keys = getAllStorageKeys();
    keys.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`[Restore] Failed to clear key: ${key}`, error);
      }
    });
  }

  Object.entries(backup.data).forEach(([key, value]) => {
    try {
      localStorage.setItem(key, value);
      restoredKeys.push(key);
    } catch (error) {
      console.error(`[Restore] Failed to restore key: ${key}`, error);
      failedKeys.push(key);
    }
  });

  logPromptOperation("backup-restore", {
    restoredCount: restoredKeys.length,
    failedCount: failedKeys.length,
  });

  return {
    success: true,
    restoredKeys,
    failedKeys,
    restoredCount: restoredKeys.length,
    failedCount: failedKeys.length,
  };
};

const exportBackupToFile = () => {
  const backup = createFullBackup();
  if (!backup) {
    return null;
  }

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const dateTag = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `chatgpt-toolkit-backup-${dateTag}.json`;

  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    logPromptOperation("backup-export", { filename });
    return { success: true, filename };
  } catch (error) {
    console.error("[Export] Failed to export backup:", error);
    return { success: false, error: error.message };
  }
};

const importBackupFromFile = async (file) => {
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  try {
    const content = await file.text();
    const backup = JSON.parse(content);

    if (!backup || !backup.data) {
      return { success: false, error: "Invalid backup file format" };
    }

    const result = restoreFromBackup(backup, { clearExisting: true });

    logPromptOperation("backup-import", {
      filename: file.name,
      restoredCount: result.restoredCount,
    });

    return result;
  } catch (error) {
    console.error("[Import] Failed to import backup:", error);
    return { success: false, error: error.message };
  }
};

const detectStorageIssues = () => {
  const issues = [];

  if (typeof localStorage === "undefined") {
    issues.push({
      type: "critical",
      code: "localstorage-unavailable",
      message: "localStorage 不可用",
      severity: "high",
    });
    return issues;
  }

  try {
    const testKey = "__tk_storage_test__";
    localStorage.setItem(testKey, "test");
    localStorage.removeItem(testKey);
  } catch (error) {
    issues.push({
      type: "critical",
      code: "localstorage-readonly",
      message: "localStorage 处于只读状态",
      severity: "high",
    });
  }

  const keys = getAllStorageKeys();
  keys.forEach((key) => {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) {
        try {
          JSON.parse(value);
        } catch (parseError) {
          if (!value.startsWith(ENCRYPTION_KEY_PREFIX)) {
            issues.push({
              type: "warning",
              code: "corrupted-json",
              message: `存储键 ${key} 包含损坏的 JSON 数据`,
              key,
              severity: "medium",
            });
          }
        }
      }
    } catch (error) {
      issues.push({
        type: "error",
        code: "read-error",
        message: `无法读取存储键 ${key}`,
        key,
        severity: "high",
      });
    }
  });

  try {
    const usedBytes = new Blob(Object.values(localStorage)).size;
    const quotaEstimate = 5 * 1024 * 1024;
    if (usedBytes > quotaEstimate * 0.8) {
      issues.push({
        type: "warning",
        code: "storage-full",
        message: `存储空间使用超过 80% (约 ${(usedBytes / 1024).toFixed(1)}KB)`,
        usedBytes,
        severity: "medium",
      });
    }
  } catch (error) {
    // Ignore size check errors
  }

  return issues;
};

const repairStorageIssues = async (issues) => {
  const repairs = [];

  if (!Array.isArray(issues) || issues.length === 0) {
    return { success: true, repairs: [], message: "没有需要修复的问题" };
  }

  const existingBackup = loadBackupFromStorage();
  if (!existingBackup) {
    const newBackup = createFullBackup();
    saveBackupToStorage(newBackup);
    repairs.push({
      action: "create-backup",
      message: "创建安全备份",
      success: true,
    });
  }

  issues.forEach((issue) => {
    if (issue.code === "corrupted-json" && issue.key) {
      try {
        const key = issue.key;
        const value = localStorage.getItem(key);

        let defaultValue = null;
        if (key === SETTINGS_STORAGE_KEY) {
          defaultValue = { ...DEFAULT_SETTINGS };
        } else if (key === PROMPT_BEHAVIOR_STORAGE_KEY) {
          defaultValue = { ...DEFAULT_PROMPT_BEHAVIOR_SETTINGS };
        } else if (key === PROMPT_STORAGE_KEY || key === PROMPT_LOCAL_FALLBACK_KEY) {
          defaultValue = buildPromptStoragePayload([]);
        }

        if (defaultValue !== null) {
          localStorage.setItem(key, JSON.stringify(defaultValue));
          repairs.push({
            action: "reset-key",
            key,
            message: `重置损坏的配置键: ${key}`,
            success: true,
          });
        }
      } catch (error) {
        repairs.push({
          action: "reset-key",
          key: issue.key,
          message: `重置 ${issue.key} 失败`,
          success: false,
          error: error.message,
        });
      }
    }
  });

  logPromptOperation("storage-repair", {
    issueCount: issues.length,
    repairCount: repairs.length,
  });

  return {
    success: true,
    repairs,
    issueCount: issues.length,
    repairCount: repairs.length,
  };
};

const getBackupHistory = () => {
  try {
    const rawHistory = localStorage.getItem(BACKUP_HISTORY_KEY);
    if (!rawHistory) {
      return [];
    }
    return decodeFromStorage(rawHistory) || [];
  } catch (error) {
    console.error("[Backup] Failed to get backup history:", error);
    return [];
  }
};

const clearAllData = () => {
  const backup = createFullBackup();
  saveBackupToStorage(backup);

  const keys = getAllStorageKeys();
  keys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`[Clear] Failed to remove key: ${key}`, error);
    }
  });

  logPromptOperation("data-clear", { backupCreated: true });

  return { success: true, backupCreated: true };
};

if (typeof window !== "undefined") {
  window.generateDeviceFingerprint = generateDeviceFingerprint;
  window.encodeForStorage = encodeForStorage;
  window.decodeFromStorage = decodeFromStorage;
  window.createFullBackup = createFullBackup;
  window.saveBackupToStorage = saveBackupToStorage;
  window.loadBackupFromStorage = loadBackupFromStorage;
  window.restoreFromBackup = restoreFromBackup;
  window.exportBackupToFile = exportBackupToFile;
  window.importBackupFromFile = importBackupFromFile;
  window.detectStorageIssues = detectStorageIssues;
  window.repairStorageIssues = repairStorageIssues;
  window.getBackupHistory = getBackupHistory;
  window.clearAllData = clearAllData;
  window.getAllStorageKeys = getAllStorageKeys;
}
