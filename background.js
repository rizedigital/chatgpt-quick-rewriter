// Listen for when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  createContextMenus(); // Initialize context menus on install
  createToolbarButton(); // Initialize the toolbar button
});

// Listen for changes to stored settings
chrome.storage.onChanged.addListener((changes) => {
  if (changes.customPrompts) {
    createContextMenus(); // Refresh context menus whenever prompts are updated
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId.startsWith("prompt-")) {
    const promptIndex = parseInt(info.menuItemId.split("-")[1]);
    await handleRewriteRequest(tab.id, promptIndex);
  }
});

// Handle toolbar button clicks
chrome.action.onClicked.addListener(async (tab) => {
  console.log("Toolbar button clicked.");
  await handleToolbarRewrite(tab.id);
});

// Handle text rewrite requests from context menu
async function handleRewriteRequest(tabId, promptIndex = 0) {
  const settings = await getSettings();
  const apiKey = settings.apiKey;
  const model = settings.model || "gpt-4o-mini";
  const prompts = settings.customPrompts || [];
  const customPrompt = prompts[promptIndex]?.body || "Rewrite this text in plain UK English";

  const selectedText = await getSelectedText(tabId);

  if (!apiKey) {
    showNotification("ChatGPT - Quick Rewriter", "Please set your OpenAI API key in the options page.");
    return;
  }

  if (!selectedText) {
    showNotification("ChatGPT - Quick Rewriter", "Please select some text to rewrite.");
    return;
  }

  await rewriteText(tabId, customPrompt, selectedText, apiKey, model);
}

// Handle text rewrite for the toolbar button
async function handleToolbarRewrite(tabId) {
  const settings = await getSettings();
  const apiKey = settings.apiKey;
  const model = settings.model || "gpt-4o-mini";
  const customPrompt = "Rewrite this text in plain UK English";

  const selectedText = await getSelectedText(tabId);

  if (!apiKey) {
    showNotification("ChatGPT - Quick Rewriter", "Please set your OpenAI API key in the options page.");
    return;
  }

  if (!selectedText) {
    showNotification("ChatGPT - Quick Rewriter", "Please select some text to rewrite.");
    return;
  }

  await rewriteText(tabId, customPrompt, selectedText, apiKey, model);
}

// Rewrite text using OpenAI API
async function rewriteText(tabId, customPrompt, selectedText, apiKey, model) {
  const fullPrompt = `${customPrompt}\n\n${selectedText}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: fullPrompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      showNotification("ChatGPT - Quick Rewriter", errorData.error.message || "API request failed.");
      return;
    }

    const data = await response.json();
    let rewrittenText = data.choices[0]?.message?.content || "Error rewriting text.";
    rewrittenText = rewrittenText.replace(/^"|"$/g, "");

    chrome.scripting.executeScript({
      target: { tabId },
      func: (text) => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        const span = document.createElement("span");
        span.style.whiteSpace = "pre-wrap";
        span.textContent = text;
        range.deleteContents();
        range.insertNode(span);
      },
      args: [rewrittenText],
    });
  } catch (error) {
    console.error("Error processing text rewrite:", error.message);
    showNotification("ChatGPT - Quick Rewriter", error.message);
  }
}

// Get selected text from the current tab
async function getSelectedText(tabId) {
  return new Promise((resolve) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        func: () => {
          const selection = window.getSelection();
          return selection ? selection.toString() : "";
        },
      },
      (results) => {
        resolve(results[0]?.result || "");
      }
    );
  });
}

// Create dynamic context menus based on stored prompts
async function createContextMenus() {
  chrome.contextMenus.removeAll();

  const settings = await getSettings();
  const prompts = settings.customPrompts || [];

  if (prompts.length > 0) {
    chrome.contextMenus.create({
      id: "root",
      title: "ChatGPT - Quick Rewriter",
      contexts: ["selection"],
    });

    prompts.forEach((prompt, index) => {
      chrome.contextMenus.create({
        id: `prompt-${index}`,
        parentId: "root",
        title: prompt.name,
        contexts: ["selection"],
      });
    });
  }
}

// Add toolbar button functionality
function createToolbarButton() {
  chrome.action.setPopup({ popup: "" }); // No popup, directly triggers rewrite
}

// Get stored settings
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["apiKey", "model", "customPrompts"], (result) => {
      resolve(result || {});
    });
  });
}

// Show notification
function showNotification(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon48.png",
    title: title,
    message: message,
  });
}
