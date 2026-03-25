English | [简体中文](./README.md)

# Conversation Workbench for ChatGPT 🧰✨💬🚀

A browser extension for ChatGPT, continuously refined around **prompt management, long-conversation cleanup, timeline navigation, and export-based review**.  
It is not just a small utility for “reducing the burden of long chats,” but more like a real **ChatGPT workbench** built for long-term everyday use. 🛠️📚

If you often use ChatGPT as a writing desk, research desk, coding desk, or review desk, this project is built for exactly that kind of workflow. (*´▽｀)ﾉﾉ

---

## 📚 Table of Contents 🗂️✨

- [✨ What is this](#overview)
- [🤔 Why I made this](#why)
- [🔥 What this project currently focuses on](#highlights)
- [🧩 Core features in detail](#features)
  - [1. Prompt Library / Prompt Companion](#feature-prompt)
  - [2. Conversation Cleanup](#feature-cleanup)
  - [3. Timeline Navigation](#feature-timeline)
  - [4. Search Current Conversation](#feature-search)
  - [5. Export Conversation](#feature-export)
  - [6. Settings and Workbench Experience](#feature-settings)
- [🖼 Preview](#preview)
- [🚀 Installation](#install)
- [📝 Usage](#usage)
- [⚙️ Current Default Settings](#defaults)
- [📌 Known Notes](#known-issues)
- [🙌 Acknowledgements and Notes](#acknowledgements)
- [💖 Support This Project](#support)

---

<a id="overview"></a>
## ✨ What is this ૮ ˶ᵔ ᵕ ᵔ˶ ა

**Conversation Workbench for ChatGPT** is a browser extension designed for long-conversation workflows. 💬🧰

What it mainly addresses is not just “one button being inconvenient,” but a set of more realistic problems like these:

- As conversations get longer, the page becomes slower and harder to scroll or review 🐢
- Historical content gets messier over time, key points become harder to locate, and revisiting context becomes painful 🌀
- Frequently used prompts are scattered everywhere, so you keep copying and pasting them manually 📋
- When you want to review, archive, or export conversations, the output is often not clean or stable enough 📦
- ChatGPT is increasingly being used like a workbench, but the native interface is not always ideal for heavy use 🖥️

This project was built step by step around those problems.  
The goal is straightforward: **make ChatGPT feel more like a smooth, stable, reusable, and well-organized workbench.** ✨🛠️

---

<a id="why"></a>
## 🤔 Why I made this ( •̀ ω •́ )✧

At the beginning, this project was indeed inspired by the open-source project  
[bujue3709/chatgpt-Long-conversation-optimization](https://github.com/bujue3709/chatgpt-Long-conversation-optimization). 🙏

But at this point, it is no longer just “a few minor tweaks on top of the original idea.”  
Over time, I have continued to refactor and expand it around:

- **Prompt workbench** 📝
- **Export capabilities** 📤
- **Timeline navigation** 🕒
- **Settings experience** ⚙️
- **Overall UI productization** 🎨

So a more accurate description now would be:

> This is a derivative improvement project that started from the idea of “long conversation optimization” and gradually evolved into an independent workflow tool. ✨

I would much rather have it understood as a **Workbench for heavy ChatGPT users**, rather than just a script for “improving laggy scrolling.” 🧠💼

---

<a id="highlights"></a>
## 🔥 What this project currently focuses on ✨(ง •_•)ง

At the moment, the three parts I most want to highlight are also the most distinctive parts of the project:

### 1. The prompt library is not just for storing prompts — it is built as a real Companion 📚💡
This is not a simple “local notepad-style prompt list,” but a more complete prompt workbench:

- Supports search, categorization, empty-state distinctions, and result highlighting 🔍✨
- Supports both single-click insert and single-click copy behaviors 🖱️
- Supports automatic prepend before sending, with deduplication and order control 🔁
- Includes 4 built-in general templates for new users or empty libraries, so it works out of the box 🌱
- More stable insertion of long text into the chat input, with fewer formatting issues and less lag 🧩

Its goal is not just to “store prompts,” but to make prompts truly part of your daily workflow. 📌

### 2. Conversation cleanup does not delete content — it makes long chats usable again 🧹💬
This feature is one of the core foundations of the whole workbench experience.

What it does is not aggressive content cutting, but organizing the view around more stable **QA group** semantics:

- Hide earlier content 🙈
- Keep recent conversation visible 🧷
- Reduce page lag ⚡
- Improve scrolling smoothness 🌊
- Help you focus on the current context first 🎯

You can always expand everything again, so this is more like a “temporary cleaned-up view,” not destructive editing of the original conversation. 🪄

### 3. Timeline navigation is not just mechanical checkpoints — it follows reading intuition better 🕒🧭
Many navigation features simply place rigid anchors on every message.  
But in real usage, users care more about a **grouped Q&A exchange** than an isolated message.

So the navigation here is designed more around **QA groups**:

- More intuitive click-to-jump behavior 🎯
- Current node highlighting that follows your position ✨
- Larger hit areas for nodes, making them easier to click 🔘
- More flexible timeline length behavior 📏
- Supports linked configuration between maximum node count and sampled node count ⚙️

It feels more like a real “conversation timeline” rather than a row of cold anchors. 🧵

---

<a id="features"></a>
## 🧩 Core features in detail 🪄📘

<a id="feature-prompt"></a>
### 1. Prompt Library / Prompt Companion 📚🌟

This is one of the modules I have spent the most time refining recently. 🛠️

The current prompt library is no longer a small auxiliary feature, but a more complete **Companion panel**.  
It fits high-frequency use cases such as:

- Writing templates ✍️
- Code review templates 💻
- Reporting / summarization templates 📊
- Research analysis templates 🔬
- Fixed-format reply templates 📨
- Persistent prefix prompts in multi-turn conversations 📌

Current capabilities include:

- ➕ Add / edit / delete prompts
- 🔍 Search
- 🗂️ Categories
- ✨ Match highlighting
- 📋 Single-click copy
- ✍️ Single-click insert into chat input
- 🔁 Automatic prepend before sending
- 🧹 Automatic deduplication
- ↕️ Order control
- 📥 JSON import
- 📤 JSON export
- 🌱 Default templates for new users

The core value of this module can be summarized in one sentence:

> **Turn frequently used prompts from scattered material into real workflow assets you can call at any time.** ✨

---

<a id="feature-cleanup"></a>
### 2. Conversation Cleanup 🧹💬

If you often work in long threads, this feature makes a very noticeable difference. 👀

Its idea is not to “clear history,” but to:

- Keep recent conversations first 🧷
- Collapse earlier content 📚
- Restore the current thread to a readable, scrollable, and navigable state 🧭

Key traits:

- Organizes around more stable **QA group** semantics instead of hard-cutting by scattered message counts 🧩
- Better suited for long conversations, deep discussions, and multi-round follow-up exchanges 💬
- After cleanup, you can still **expand all** at any time 🔓
- Tries to preserve your current reading position and avoid sudden page jumps 🎯
- Can work together with automatic cleanup strategies ⚙️

You can think of it as:

> **A temporary narrowing of a long conversation, bringing your attention back to the current context.** 🪄

---

<a id="feature-timeline"></a>
### 3. Timeline Navigation 🕒✨

This is another feature that strongly reinforces the “workbench” feel. 🧰

As conversations get longer, “scrolling around to find something” becomes one of the least efficient ways to navigate.  
The meaning of timeline navigation is to help you quickly answer two questions:

- Where am I in this conversation right now? 📍
- If I want to jump back to a previous Q&A group, what is the fastest way? ↩️

In the current version, timeline navigation supports:

- 👀 Node preview
- 🎯 Click to jump
- ✨ Current node highlighting
- 🧲 Draggable positioning
- 📏 More flexible length behavior
- 🔘 Enlarged click areas for nodes
- 🧩 Navigation nodes generated based on QA groups
- ⚙️ Linked configuration for maximum node count / sampled node count

This is not decorative UI — it genuinely changes how long threads are read and revisited. 🚀

---

<a id="feature-search"></a>
### 4. Search Current Conversation 🔍💬

Search works especially well together with conversation cleanup and timeline navigation, forming a more complete experience. 🧩

Supported features:

- Keyword search 🔎
- Result highlighting ✨
- Previous / next navigation between matches ⬆️⬇️
- Coordination with cleanup logic 🧹
- More stable compatibility with rich media, image generation, and multi-part response scenarios 🖼️

In complex conversations, the hardest part of search is not “finding the text,” but “jumping to the right place.”  
This part is also being continuously improved around more stable semantic handling. 🧠

---

<a id="feature-export"></a>
### 5. Export Conversation 📦✨

Export functionality has also been continuously enhanced recently. 🛠️

The export entry has now been upgraded to:

- **Export**
  - **Export JSON**
  - **Export Markdown**

The current export pipeline especially focuses on improving these scenarios:

- Multi-part assistant responses 💬
- Rich text content 📝
- Code blocks 💻
- Image-generation content 🖼️
- Removal of duplicate text and UI noise 🧹
- Compatibility after cleanup-mode export 🔗

Export use cases include:

- 🗃️ Local archiving
- 🔁 Conversation review
- 🧾 Content organization
- 📊 Secondary analysis
- 📝 Markdown-based record keeping

The goal of this module is now very clear:  
**Export as much as possible, and export it as cleanly as possible.** ✨

---

<a id="feature-settings"></a>
### 6. Settings and Workbench Experience ⚙️🪄

Beyond features themselves, this project has also continued improving configurability and overall product experience.

Current key settings include:

- Automatic cleanup toggle 🔁
- Automatic cleanup threshold 🎚️
- Number of recent QA groups to keep 🔢
- Maximum timeline node count 🧭
- Sampled timeline node count 📏
- Language settings 🌐
- Reset layout and settings ♻️

In addition, these interactions have also been continuously refined recently:

- Overall toolbar productization redesign 🧰
- Unified layout between the main panel and the prompt panel 🪟
- Clearer hierarchy in the export menu 📂
- Better grouping, spacing, and footer button layout in the settings modal 🧱
- Folder UI aligned with the overall visual style 🗂️
- Smoother interaction between the floating icon and the panel 🖱️

My goal is that this project will ultimately not just be “a pile of usable features,” but something like this:

> **You open it and it immediately feels natural — and it still feels natural after long-term use.** 🌈

---

<a id="preview"></a>
## 🖼 Preview ✨👀

Below are some previews of the current version, including the main workbench, Prompt Companion, export menu, settings panel, and side utility area.

### Main Workbench
![Main Workbench Preview](./image/preview.png)

### Prompt Library Panel and Timeline Navigation Panel
![Prompt Library Panel and Timeline Navigation Panel Preview](./image/preview_2.png)

### Prompt Library Settings
![Prompt Library Settings Preview](./image/preview_4.png)

### Export and Tool Area
![Export and Tool Area Preview](./image/preview_1.png)

### Settings Panel
![Settings Panel Preview](./image/preview_3.png)

> Preview images are for feature demonstration only. Please refer to the current version for actual interface details.

> Preview images will continue to be updated along with new versions. The current interface has already undergone major adjustments around the toolbar, Prompt Companion, export menu, settings panel, and timeline navigation. 🎨

---

<a id="install"></a>
## 🚀 Installation 🛠️

### Supported Sites 🌐

- 💬 `https://chat.openai.com/*`
- 🤖 `https://chatgpt.com/*`

### Supported Browsers 🧭

- 🌈 Chrome
- 🌐 Edge
- 🦊 Firefox (temporary loading method)

### Install on Chrome 🌈

1. Open `chrome://extensions/`
2. Enable **Developer mode** in the top-right corner
3. Click **Load unpacked**
4. Select the root directory of this project

### Install on Edge 🌐

1. Open `edge://extensions/`
2. Enable **Developer mode** in the top-right corner
3. Click **Load unpacked**
4. Select the root directory of this project

### Install on Firefox 🦊

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `manifest.json` from the root directory of this project

---

<a id="usage"></a>
## 📝 Usage (๑•̀ㅂ•́)و✧

### 1. Open the Workbench
After entering the ChatGPT page, the extension injects the corresponding workbench entry into the page.  
You can open the main panel to clean up, navigate, search, export, and use prompts in the current conversation. 🧰

### 2. Use the Prompt Library
After opening the **Prompt Library / Companion panel**, you can:

- Search prompts 🔍
- Filter by category 🗂️
- Insert into the chat input with one click ✍️
- Copy with one click 📋
- Configure automatic prepend before sending 🔁
- Manage local prompt templates 📚

If your local library is still empty, the extension provides basic templates so you can get started immediately. 🌱

### 3. Clean Up the Current Conversation
After clicking **Conversation Cleanup**, the extension hides earlier content and only keeps the most recent Q&A groups visible, improving the browsing experience for long conversations.  
If you need the full thread again, you can always click **Expand All**. 🔓

### 4. Use Timeline Navigation
After opening **Timeline Navigation**, you can quickly jump to a specific conversation group through timeline nodes.  
Compared with simply scrolling through the page, this works much better for locating and reviewing long threads. 🧭

### 5. Search the Current Conversation
After entering keywords, you can search within the current conversation and switch between matches using previous / next controls.  
Even in complex conversations, it tries to keep navigation as stable as possible. 🎯

### 6. Export the Current Conversation
After clicking **Export**, you can choose:

- **Export JSON**
- **Export Markdown**

This can be used for archiving, reviewing, organizing, analyzing, or secondary processing. 📦

### 7. Open Preferences
In the settings panel, you can configure automatic cleanup, timeline parameters, language, and layout recovery options.  
If the UI position or preferences become messy, you can also directly use **Reset Layout and Settings** to restore the default state. ♻️

---

<a id="defaults"></a>
## ⚙️ Current Default Settings 📌

The current version uses the following default values:

- **Recent QA groups to keep: 10**
- **Maximum timeline nodes: 18**
- **Sampled timeline nodes: 10**

The purpose of these defaults is to strike a more balanced trade-off between  
“keeping enough context” and “avoiding an overly dense timeline or a heavier page load.” ⚖️

---

<a id="known-issues"></a>
## 📌 Known Notes 🛠️

To stay transparent with users, here are the parts that are still being actively improved:

- In complex conversations such as **Deep Research**, the main body may still be incomplete in some export cases 🔬
- Current priority has been to ensure **downloadability** and **basic export usability** first 📥
- The JSON / Markdown export pipeline is still being continuously enhanced, especially for compatibility with complex rich-media structures 🧩

In other words:

> This part is already usable and improving, but it has not yet reached the point where every complex scenario is perfectly covered. ✨

---

<a id="acknowledgements"></a>
## 🙌 Acknowledgements and Notes 💖

This project was originally inspired by  
[bujue3709/chatgpt-Long-conversation-optimization](https://github.com/bujue3709/chatgpt-Long-conversation-optimization).

Thanks to the original author for the open-source work and inspiration. ❤️✨

At the same time, a few notes:

- This project is **not** the official continuation of the original repository 📌
- It does **not** represent the original author's position 🧾
- The current version has already undergone major refactoring and expansion around the **prompt workbench, export capabilities, timeline navigation, settings experience, and overall UI** 🛠️
- It is better understood as an independently maintained derivative improvement project 🌱

---

<a id="support"></a>
## 💖 Support This Project

If this project helps you, welcome to give it a Star ⭐

If you would like to support future development and maintenance, you can also use the payment QR codes below:

### WeChat Pay QR Code
![WeChat Pay QR Code](./微信收款码.jpg)

### Alipay QR Code
![Alipay QR Code](./支付宝收款码.jpg)

Thank you for your support. 🙏  
If this project helps you, a Star is always appreciated ⭐💫  
You are also welcome to continue adapting it to fit your own workflow. ヽ(✿ﾟ▽ﾟ)ノ
