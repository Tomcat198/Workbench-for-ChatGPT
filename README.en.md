[简体中文](./README.md) | English

# Conversation Workbench for ChatGPT 🧰✨

🧩 A browser extension focused on improving long ChatGPT conversations by reducing lag through conversation cleanup, with timeline navigation, search, export, prompt management, folder management, and preference settings.


---

## 🙌 Acknowledgements 💖

This project was inspired by [bujue3709/chatgpt-Long-conversation-optimization](https://github.com/bujue3709/chatgpt-Long-conversation-optimization).  
Built on top of the original idea, this repository has been substantially refactored and expanded into an independently maintained derivative improvement.

Many thanks to the original author for the open-source work and inspiration ❤️  
This project is **not** the official continuation of the original repository and does not represent the original author’s position. If you are looking for the original version, please visit the original repository first.

---

## ✨ Overview 🌟

### What problem does this project solve? 🤔💬

If you use ChatGPT as a daily workbench, you have probably run into some of these issues:

- 🐢 Long conversations become increasingly laggy and harder to browse
- 🧭 Older context becomes difficult to find
- 📍 There is no intuitive way to jump between conversation segments
- 📦 Exporting chats, reusing prompts, and managing workflows feel fragmented
- 🧠 Deep-thinking split replies, image-generation chats, and multi-part responses can make the reading experience feel broken

**Conversation Workbench for ChatGPT** is designed to systematically improve these long-conversation workflow problems.

### What has been reworked and improved compared with the original project? 🔧🚀

This project is **not** a small visual tweak or a minor patch on top of the original implementation. It has been **substantially refactored and expanded** in several key areas:

- 🧠 **Reworked semantics**: the project evolved from a more DOM/message-oriented approach into a clearer `message → turn → QA group` model, so cleanup, navigation, search positioning, and auto-cleanup operate on a more stable semantic unit.
- 🚀 **Improved long-conversation experience**: the cleanup flow, group-level timeline navigation, and search positioning were redesigned to better address lag, readability, and navigation issues in long chats.
- 🧩 **Better compatibility with complex cases**: the current version handles deep-thinking split replies, image-generation conversations, and multi-part assistant responses more reliably.
- 📚 **Expanded feature scope**: preferences, auto-cleanup, prompt library, group-level navigation, export, folder management, and localization are now more systematically integrated.
- 🎨 **Rebuilt UI and product language**: instead of keeping the original utility-panel feel, the interface, naming, hierarchy, and visual system have been redesigned into a more productized experience.
- 🖱️ **Improved interaction model**: the floating icon and panel now support more flexible dragging and position persistence, making the extension feel more like a long-term workspace than a temporary utility.

For this reason, the project is better understood as an **independently maintained derivative improvement**, rather than a simple reskin of the original repository.

### Who is this for? 👀🎯

This project is especially useful for:

- 💼 heavy ChatGPT users
- 🧵 people who often work with long threads and long conversations
- 📍 users who need fast context navigation
- 🔍 users who rely on search, navigation, export, and prompt reuse
- 🛠️ people who want to use ChatGPT as a knowledge desk / workbench / long-thread collaboration tool

---

## 🖼️ Screenshot 🎨

Below is a preview of the current interface, showing the toolbar, conversation navigation, search, and the overall workbench-style interaction:

![Screenshot Preview](./image/icon_128.png)

![Screenshot Preview](./image/preview.png)

---

## 🚀 Installation & Quick Start 🛠️

### Supported Sites 🌐

- 💬 `https://chat.openai.com/*`
- 🤖 `https://chatgpt.com/*`

### Supported Browsers 🧭

- 🌈 Chrome
- 🌐 Edge
- 🦊 Firefox (temporary loading)

### Install on Chrome 🌈

1. Open `chrome://extensions/`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select the project root folder

### Install on Edge 🌐

1. Open `edge://extensions/`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select the project root folder

### Install on Firefox 🦊

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select the `manifest.json` file in the project root

---

## ▶️ How to Use 📝

### 1. Open the toolbar 🧰

After the page loads, the **ChatGPT Toolkit** panel appears on the side of the page.  
When minimized, it becomes a draggable floating icon that can snap to screen edges. Clicking the icon brings the panel back while keeping the icon itself visible as a stable entry point.

### 2. Clean up long conversations 🧹

Click **Clean Up Conversation** to hide older parts of the current chat and keep only the most recent groups visible. This reduces lag and makes long conversations easier to browse.

The cleanup logic is based on **QA groups**, not just loose message counts.

### 3. Expand everything ♻️

Click **Expand All** to restore the previously hidden content so you can review the entire conversation again. The extension tries to preserve your reading position as much as possible.

### 4. Use conversation navigation 🕒

Open **Conversation Navigation** to jump quickly to a specific part of the chat through the timeline panel.

The timeline supports:

- 👀 preview snippets
- 🎯 click-to-jump
- ✨ active-node highlight
- 🖱️ mouse wheel scrolling
- 🧲 dragging and repositioning
- 🧩 QA-group-based navigation instead of message-only dots

### 5. Search the current conversation 🔍

Use the search box to search within the current chat.

Features include:

- 🔎 keyword matching
- ✨ text highlighting
- ↕️ previous / next navigation
- 🧩 more stable positioning in multimodal, image-generation, and split-reply scenarios
- 📌 message-level matching with group-level positioning when appropriate

### 6. Export a conversation 📦

Click **Export Conversation** to export the current chat as JSON.

Even if cleanup has already been applied, export still tries to preserve the complete conversation content as much as possible.

### 7. Use the prompt library 📚

Click **Prompt Library** to manage your local prompt collection.

Supported actions:

- ➕ create
- 🗑️ delete
- 🔍 search
- 🗂️ categorize
- ↕️ sort
- 📥 import JSON
- 📤 export JSON
- 📋 one-click copy

### 8. Use preferences ⚙️

Click **Preferences** to configure key behaviors of the extension, such as:

- 🤖 auto-cleanup toggle
- 📏 auto-cleanup threshold
- 🧾 number of recent QA groups to keep
- 🕒 maximum timeline node count
- 🌐 language switching, including browser-follow mode

### 9. Use folder management 📁

The folder feature adds local organization on top of the existing sidebar.

It supports:

- ➕ create folder
- ✏️ rename
- 🗑️ delete
- 📂 collapse / expand
- 🧲 drag-and-drop grouping
- ↕️ sorting
- 💾 restoring local structure after refresh

---

## 🧰 Features ✨

### 1. Conversation cleanup (reduce lag in long chats) 🧹

This is one of the core features of the project.

Its goal is not to delete history, but to hide older content and keep recent content visible so long conversations remain smooth to browse.

Useful when:

- 🐢 the chat has become noticeably laggy
- 🎯 you only need recent context for now
- ⚡ you want a smoother reading experience before deciding whether to expand everything

### 2. Conversation navigation (timeline / group navigation) 🕒

Navigation is not built as a loose message-dot overlay. It is organized around more stable conversation semantics.

In the current version, it is closer to **QA-group-based navigation**, so “one question + its corresponding answer” feels like a single unit.

Features:

- ⚡ fast jumping
- 👀 preview content
- ✨ active-node tracking
- 🧲 draggable positioning
- 🧵 better usability for long threads

### 3. Search within the current conversation 🔍

Search supports:

- 🔎 keyword matching
- ✨ text highlight
- ↔️ previous / next navigation
- 🧩 integration with cleanup and navigation

Complex scenarios such as deep-thinking split replies and image-generation chats are handled more robustly to reduce mismatched jumps.

### 4. Export conversation 📦

Export the current conversation as JSON for:

- 🗃️ local archiving
- 📊 later analysis
- 🧾 data organization
- 🔁 review and downstream processing

### 5. Prompt library 📚

The prompt library lets you manage reusable prompt templates locally, with import/export support.

Useful for:

- ✍️ writing templates
- 💻 code review templates
- 📄 reporting / summary templates
- 🔬 research and analysis templates

### 6. Preferences ⚙️

Preferences turn the extension from a fixed utility into a configurable product.

You can adjust:

- ✅ whether auto-cleanup is enabled
- ⏱️ when auto-cleanup should trigger
- 🧩 how many recent QA groups should remain visible
- 🕘 how many timeline nodes to display
- 🌍 which language mode to use

### 7. Auto-cleanup 🤖

Auto-cleanup can trigger automatically under the right conditions, reducing repetitive manual clicks.

Current behavior is designed around:

- 🙋 explicit user enablement
- 🎯 threshold-based triggering
- 🔁 avoiding repeated auto-triggering in the same conversation
- 🛑 avoiding premature triggering during streaming responses
- ♻️ not immediately re-collapsing after manual restore in the same conversation

### 8. Conversation folders 📁

The folder feature adds an extra local management layer to the existing sidebar.

It supports:

- ➕ create
- ✏️ rename
- 🗑️ delete
- 📂 collapse / expand
- 🧲 drag-and-drop grouping
- ↕️ sort
- 💾 restore local structure after refresh

It does not replace ChatGPT’s original conversation list; it adds a local classification layer on top of it.

### 9. Localization and theme sync 🌐🎨

Currently supported:

- 🇨🇳 Simplified Chinese
- 🇺🇸 English
- 🌐 Auto (follow browser)

The toolbar, timeline, prompt library, preferences, and related panels also follow the page’s light/dark theme.

### 10. Floating icon and draggable workbench 🪄

The current version provides a more complete floating workbench experience instead of a single minimize button:

- 🖱️ the panel is draggable
- 📍 the floating icon is draggable and can snap to the top, bottom, left, or right edge of the page
- 💾 icon and panel positions are persisted
- 📌 the icon and panel can stay visible at the same time

---

## ⚙️ Preferences 🛠️

### Auto cleanup 🤖

Enable or disable automatic cleanup.

### Auto cleanup threshold 📏

Automatically trigger cleanup when the current conversation reaches a certain size.

### Keep recent QA groups 🧾

After cleanup, keep the most recent QA groups visible.

### Timeline max nodes 🕘

Limit how many navigation nodes are shown in the timeline to avoid overcrowding.

### Language 🌍

Supported modes:

- 🌐 Auto (follow browser)
- 🇺🇸 English
- 🇨🇳 Simplified Chinese

---

## 🏗️ Architecture Overview 🧠

> This section is mainly for developers 👨‍💻

One of the key design choices in this project is the separation of conversation semantics into three layers:

### 1. `message` 💬

The lowest-level unit, used for text extraction, matching, export, and other low-level capabilities.

### 2. `turn` 🔄

A middle semantic layer, closer to page structure and one round of message organization.

### 3. `QA group` 🧩

A higher-level semantic unit that is closer to how users actually think about a conversation. Cleanup, navigation, search positioning, and auto-cleanup are more heavily organized around this layer.

Why this matters:

- 🔗 reduces direct coupling to raw DOM structure
- 🧭 makes cleanup and navigation more stable
- 🧩 makes image-generation chats, deep-thinking split replies, and multipart assistant outputs easier to support

---

## 🧑‍💻 Developer Notes 🛠️

### Project characteristics ✨

- 📦 no bundler dependency
- 🧩 injected into the ChatGPT page as content scripts
- 💾 primarily based on local state and local storage
- 👨‍💻 suitable for direct source reading and module-level maintenance

### Recommended reading order 📚

If you want to understand the project, a good reading order is:

1. toolbar and main interaction entry
2. cleanup / restore logic
3. search and navigation logic
4. prompt library and folders
5. localization, state management, and theme sync

### Suggested module directions 🧭

- 🧰 toolbar and floating interactions
- 🧹 conversation cleanup
- 🔍 search and positioning
- 🕒 timeline / conversation navigation
- 📦 export
- 📚 prompt library
- 📁 folder management
- 🌐 localization and theme sync
- 💾 state management and persistence

> Actual file names and directory structure should follow the current repository version.

---

## ⚠️ Known Limitations 🚧

- 🕒 The timeline only works with content that is already loaded in the page. It does not actively fetch earlier hidden history from ChatGPT.
- 📁 Folder management depends on the current sidebar DOM structure and stores relationships locally; it does not sync to ChatGPT servers.
- 🧱 The ChatGPT page structure may continue to change. If the DOM changes significantly, selectors and mounting points may need future updates.
- 🧪 Multimodal, image-generation, and deep-thinking scenarios have been improved, but it is still recommended to verify exported content before relying on it.
- 🧭 Drag position persistence depends on the current viewport and layout; extreme layout changes may trigger safe fallback positioning.

---

## 🛣️ Roadmap 🚀

The current version already includes:

- 🧹 long-conversation cleanup
- 🕒 conversation navigation
- 🔍 search
- 📦 export
- 📚 prompt library
- 📁 folder management
- 🌐 localization and theme sync
- ⚙️ preferences
- 🤖 basic auto-cleanup capability
- 🎨 productized Chinese UI redesign
- 🖱️ panel and icon dragging
- 📍 four-edge snapping and position persistence for the floating icon

Possible future improvements:

- ⭐ bookmarks / favorites
- 🔎 richer search results view
- 📤 more export formats
- ⚙️ finer-grained auto-cleanup rules
- 🎨 further UI polish
- 🏪 browser store release preparation

---

## ☕ Support 💖

If this project helps you, feel free to support its continued development ✨  
Your support helps with future features, UI refinements, and compatibility maintenance.

Suggestions, bug reports, and improvement ideas are also welcome through Issues and PRs 💌

<table>
  <tr>
    <td align="center">
      <strong>WeChat Support</strong><br/>
      <img src="./微信收款码.jpg" alt="WeChat support QR code" width="260" />
    </td>
    <td align="center">
      <strong>Alipay Support</strong><br/>
      <img src="./支付宝收款码.jpg" alt="Alipay support QR code" width="260" />
    </td>
  </tr>
</table>

---

## 📄 License ⚖️

This project is licensed under the [MIT License](./LICENSE).

You may use, modify, publish, distribute, or adapt it for commercial use as long as the license notice is retained.

### Additional note 📝

Please do not misrepresent the original project name, the original author’s identity, or the branding relationship.  
If you distribute a modified, derivative, or unofficial version, please state that clearly.
