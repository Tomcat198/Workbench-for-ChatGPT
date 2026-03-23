/*
 * ChatGPT Conversation Toolkit - Storage utilities
 */
const getExtensionStorageArea = () =>
  typeof chrome !== "undefined" && chrome?.storage?.local ? chrome.storage.local : null;

const SETTINGS_STORAGE_KEY = "chatgpt-toolkit-settings-v1";
const TOOLBAR_POSITION_KEY = "chatgpt-toolkit-toolbar-position-v1";
const MINIMIZED_POSITION_V2_KEY = "chatgpt-toolkit-minimized-position-v2";

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
    timelineMaxNodes: sanitizeSettingsValue(source.timelineMaxNodes, DEFAULT_SETTINGS.timelineMaxNodes),
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
