document.addEventListener("DOMContentLoaded", () => {
  const settingsForm = document.getElementById("settingsForm");
  const promptsContainer = document.getElementById("promptsContainer");
  const modelsContainer = document.getElementById("modelsContainer");
  const addPromptButton = document.getElementById("addPromptButton");
  const addModelButton = document.getElementById("addModelButton");
  const modelSelect = document.getElementById("model");

  // Load existing settings from storage
  function loadSettings() {
    chrome.storage.sync.get(["apiKey", "model", "models", "customPrompts"], (result) => {
      // Load API key
      document.getElementById("apiKey").value = result.apiKey || "";

      // Load models into the dropdown
      const models = result.models || ["gpt-4o", "gpt-4o-mini", "o1-mini"];
      modelSelect.innerHTML = ""; // Clear dropdown
      models.forEach((model) => {
        const option = document.createElement("option");
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
      });
      modelSelect.value = result.model || models[0]; // Set default

      // Add models to the editable list
      models.forEach(addModelToUI);

      // Load prompts
      const prompts = result.customPrompts || [];
      prompts.forEach(addPromptToUI);
    });
  }

  // Save settings to storage
  function saveSettings(e) {
    e.preventDefault();

    const apiKey = document.getElementById("apiKey").value;
    const selectedModel = modelSelect.value;

    const models = Array.from(modelsContainer.children).map((container) =>
      container.querySelector(".model-name").value.trim()
    ).filter((model) => model); // Remove empty models

    const prompts = Array.from(promptsContainer.children).map((container) => ({
      name: container.querySelector(".prompt-name").value.trim(),
      body: container.querySelector(".prompt-body").value.trim(),
    })).filter((prompt) => prompt.name && prompt.body); // Remove empty prompts

    chrome.storage.sync.set({ apiKey, model: selectedModel, models, customPrompts: prompts }, () => {
      alert("Settings saved successfully!");
    });
  }

  // Add a new model to the UI
  function addModelToUI(model = "") {
    const container = document.createElement("div");
    container.className = "model-container";

    container.innerHTML = `
      <input type="text" class="model-name" placeholder="Enter model name (e.g., 'gpt-4')" value="${model}" />
      <button type="button" class="delete-button">Delete</button>
    `;

    container.querySelector(".delete-button").addEventListener("click", () => {
      container.remove();
      updateModelDropdown();
    });

    modelsContainer.appendChild(container);
  }

  // Add a new prompt to the UI
  function addPromptToUI(prompt = { name: "", body: "" }) {
    const container = document.createElement("div");
    container.className = "prompt-container";

    container.innerHTML = `
      <input type="text" class="prompt-name" placeholder="Enter prompt name" value="${prompt.name}" />
      <textarea class="prompt-body" placeholder="Enter prompt body">${prompt.body}</textarea>
      <button type="button" class="delete-button">Delete</button>
    `;

    container.querySelector(".delete-button").addEventListener("click", () => {
      container.remove();
    });

    promptsContainer.appendChild(container);
  }

  // Update the model dropdown after adding/removing models
  function updateModelDropdown() {
    const models = Array.from(modelsContainer.children).map((container) =>
      container.querySelector(".model-name").value.trim()
    ).filter((model) => model); // Remove empty models

    modelSelect.innerHTML = ""; // Clear dropdown
    models.forEach((model) => {
      const option = document.createElement("option");
      option.value = model;
      option.textContent = model;
      modelSelect.appendChild(option);
    });

    if (models.length > 0) {
      modelSelect.value = models[0]; // Default to the first model
    }
  }

  // Event listeners
  addModelButton.addEventListener("click", () => {
    addModelToUI();
    updateModelDropdown();
  });

  addPromptButton.addEventListener("click", () => addPromptToUI());
  settingsForm.addEventListener("submit", saveSettings);

  // Initial load
  loadSettings();
});
