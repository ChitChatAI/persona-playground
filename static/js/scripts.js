// static/js/scripts.js (updated to match FastAPI endpoints)

// DOM elements
const messagesDiv = document.getElementById("messages");
const textarea = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const suggestionChips = document.getElementById("suggestionChips");
const voiceInputBtn = document.getElementById("voiceInputBtn");
const imageUploadBtn = document.getElementById("imageUploadBtn");
const imageInput = document.getElementById("imageInput");
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebar = document.getElementById("sidebar");
const searchInput = document.getElementById("searchInput");
const chatHistory = document.getElementById("chatHistory");
const newChatBtn = document.getElementById("newChatBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const lightIcon = document.getElementById("lightIcon");
const darkIcon = document.getElementById("darkIcon");
const darkModeSwitch = document.getElementById("darkModeSwitch");
const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const settingsClose = document.getElementById("settingsClose");
const saveHistorySwitch = document.getElementById("saveHistorySwitch");
const clearDataBtn = document.getElementById("clearDataBtn");
const loadingIndicator = document.getElementById("loadingIndicator");
const offlineBadge = document.getElementById("offlineBadge");
const privacyModal = document.getElementById("privacyModal");
const closePrivacyModal = document.getElementById("closePrivacyModal");
const acceptPrivacyBtn = document.getElementById("acceptPrivacyBtn");
const privacyPolicyBtn = document.getElementById("privacyPolicyBtn");
const messageContextMenu = document.getElementById("messageContextMenu");
const editMenuItem = document.getElementById("editMenuItem");
const copyMenuItem = document.getElementById("copyMenuItem");
const regenerateMenuItem = document.getElementById("regenerateMenuItem");
const deleteMenuItem = document.getElementById("deleteMenuItem");
const encryptionSwitch = document.getElementById("encryptionSwitch");
const encryptionPasswordDiv = document.getElementById("encryptionPasswordDiv");
const encryptionPassword = document.getElementById("encryptionPassword");
const exportDataBtn = document.getElementById("exportDataBtn");
const exportOptions = document.getElementById("exportOptions");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const exportTextBtn = document.getElementById("exportTextBtn");
const exportHtmlBtn = document.getElementById("exportHtmlBtn");
const messageSpacingSelect = document.getElementById("messageSpacingSelect");
const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
const toneIndicator = document.getElementById("toneIndicator");
const toneText = document.getElementById("toneText");

// ===== Persona wiring =====
// If you later add a dropdown, set window.ACTIVE_PERSONA = "arin" | "samantha" etc.
// For now default to Samantha to match your backend defaults.
const ACTIVE_PERSONA = (window.ACTIVE_PERSONA || "samantha");

// State variables
let currentChatId = "chat-" + Date.now();         // we'll also use this as session_id on the backend
let conversations = {};
let lastUserMessage = null;
let isRecording = false;
let recognitionAPI = null;
let isProcessing = false;
let selectedMessageElement = null;
let selectedMessageId = null;
let userPreferences = {
  darkMode: false,
  saveHistory: true,
  encryptChats: false,
  encryptionPassword: "",
  messageSpacing: "comfortable",
  privacyPolicyAccepted: false,
  lastActiveChat: null,
  sidebarVisible: true,
  streamResponses: true,
  chatTheme: "default",
  fontFamily: "Satoshi",
  aiCreativity: 0.7,
};

// Network status monitoring
window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);

function updateOnlineStatus() {
  if (!offlineBadge) return;
  if (navigator.onLine) offlineBadge.style.display = "none";
  else offlineBadge.style.display = "inline-block";
}

// Initialize chat and settings
function init() {
  // Load user preferences
  const savedPreferences = localStorage.getItem("userPreferences");
  if (savedPreferences) {
    try {
      userPreferences = JSON.parse(savedPreferences);
      if (userPreferences.sidebarVisible === undefined) {
        userPreferences.sidebarVisible = true;
      }
      applyUserPreferences();
    } catch (e) {
      console.error("Error parsing user preferences:", e);
      userPreferences = {
        darkMode: false,
        saveHistory: true,
        encryptChats: false,
        encryptionPassword: "",
        messageSpacing: "comfortable",
        privacyPolicyAccepted: false,
        lastActiveChat: null,
        sidebarVisible: true,
        streamResponses: true,
        chatTheme: "default",
        fontFamily: "Satoshi",
        aiCreativity: 0.7,
      };
    }
  }

  // Apply sidebar visibility
  applySidebarVisibility();

  // Initialize chat history if enabled
  if (userPreferences.saveHistory) {
    initChat();
  } else {
    createNewChat();
  }

  // Check online status
  updateOnlineStatus();
}

// Apply user preferences to UI
function applyUserPreferences() {
  if (userPreferences.darkMode) {
    document.body.setAttribute("data-theme", "dark");
    if (lightIcon) lightIcon.style.display = "none";
    if (darkIcon) darkIcon.style.display = "inline-block";
    const light = document.getElementById("hljs-light-theme");
    const dark = document.getElementById("hljs-dark-theme");
    if (light) light.disabled = true;
    if (dark) dark.disabled = false;
  } else {
    document.body.removeAttribute("data-theme");
    if (lightIcon) lightIcon.style.display = "inline-block";
    if (darkIcon) darkIcon.style.display = "none";
    const light = document.getElementById("hljs-light-theme");
    const dark = document.getElementById("hljs-dark-theme");
    if (light) light.disabled = false;
    if (dark) dark.disabled = true;
  }

  if (saveHistorySwitch) saveHistorySwitch.checked = userPreferences.saveHistory;

  if (encryptionSwitch) encryptionSwitch.checked = userPreferences.encryptChats;
  if (encryptionPasswordDiv) encryptionPasswordDiv.style.display = userPreferences.encryptChats ? "block" : "none";
  if (encryptionPassword) encryptionPassword.value = userPreferences.encryptionPassword || "";

  if (messageSpacingSelect) {
    messageSpacingSelect.value = userPreferences.messageSpacing || "comfortable";
    applyMessageSpacing();
  }

  const creativitySlider = document.getElementById("aiCreativitySlider");
  if (creativitySlider) {
    creativitySlider.value = userPreferences.aiCreativity ?? 0.7;
    const val = document.getElementById("creativityValue");
    if (val) val.textContent = Math.round((userPreferences.aiCreativity ?? 0.7) * 100) + "%";
  }

  if (userPreferences.chatTheme) {
    applyChatTheme(userPreferences.chatTheme);
  }

  if (userPreferences.fontFamily) {
    document.documentElement.style.setProperty("--main-font", userPreferences.fontFamily);
  }
}

function saveUserPreferences() {
  localStorage.setItem("userPreferences", JSON.stringify(userPreferences));
}

// Initialize chats from localStorage
function initChat() {
  const savedConversations = localStorage.getItem("chatConversations");
  if (savedConversations) {
    try {
      let parsedData;
      if (userPreferences.encryptChats && userPreferences.encryptionPassword) {
        const decrypted = CryptoJS.AES.decrypt(savedConversations, userPreferences.encryptionPassword)
          .toString(CryptoJS.enc.Utf8);
        parsedData = JSON.parse(decrypted);
      } else {
        parsedData = JSON.parse(savedConversations);
      }
      conversations = parsedData;
      updateChatHistorySidebar();
    } catch (e) {
      console.error("Failed to load conversations:", e);
      alert("Failed to load your saved conversations. The data might be corrupted.");
      localStorage.removeItem("chatConversations");
      conversations = {};
    }
  }

  if (Object.keys(conversations).length === 0) {
    createNewChat();
  } else if (userPreferences.lastActiveChat && conversations[userPreferences.lastActiveChat]) {
    currentChatId = userPreferences.lastActiveChat;
    loadChat(currentChatId);
  } else {
    currentChatId = Object.keys(conversations)[0];
    loadChat(currentChatId);
  }
}

function createNewChat() {
  currentChatId = "chat-" + Date.now();
  conversations[currentChatId] = {
    title: "New Conversation",
    messages: [],
    createdAt: new Date().toISOString(),
  };
  if (userPreferences.saveHistory) saveConversations();
  updateChatHistorySidebar();
  clearChatMessages();
}

function saveConversations() {
  if (!userPreferences.saveHistory) return;
  let dataToSave = JSON.stringify(conversations);
  if (userPreferences.encryptChats && userPreferences.encryptionPassword) {
    dataToSave = CryptoJS.AES.encrypt(dataToSave, userPreferences.encryptionPassword).toString();
  }
  localStorage.setItem("chatConversations", dataToSave);
}

function formatDateWithoutSeconds(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function updateChatHistorySidebar() {
  if (!chatHistory) return;
  chatHistory.innerHTML = "";
  Object.keys(conversations).forEach((chatId) => {
    const chat = conversations[chatId];
    const historyItem = document.createElement("div");
    historyItem.classList.add("history-item");
    if (chatId === currentChatId) historyItem.classList.add("active");
    historyItem.innerHTML = `
      <div>${chat.title}</div>
      <small class="text-muted">${formatDateWithoutSeconds(chat.createdAt)}</small>
    `;
    historyItem.onclick = () => loadChat(chatId);
    chatHistory.appendChild(historyItem);
  });
}

function loadChat(chatId) {
  currentChatId = chatId;
  userPreferences.lastActiveChat = chatId;
  saveUserPreferences();
  clearChatMessages();
  const chat = conversations[chatId];
  chat.messages.forEach((msg) => {
    appendMessage(msg.role === "ai" ? "ai" : "user", msg.content, msg.id || generateMessageId());
  });
  updateChatHistorySidebar();
}

function clearChatMessages() {
  if (messagesDiv) messagesDiv.innerHTML = "";
}

// ====== BACKEND CALLS ======

// Send message to API and handle response (POST /chat)
async function sendMessage(userMessage) {
  if (isProcessing) return;

  const userMessageId = generateMessageId();
  const msgObj = { role: "user", content: userMessage, id: userMessageId, timestamp: new Date().toISOString() };

  if (!conversations[currentChatId]) createNewChat();
  conversations[currentChatId].messages.push(msgObj);

  // Detect user vibe and set Samantha's tone (your existing helpers)
  const userVibe = detectUserVibe(userMessage);
  setSamanthaTone(userVibe);

  // First user message → set chat title
  if (conversations[currentChatId].messages.filter((m) => m.role === "user").length === 1) {
    conversations[currentChatId].title = userMessage.substring(0, 30) + (userMessage.length > 30 ? "..." : "");
  }

  saveConversations();
  updateChatHistorySidebar();

  const typingIndicatorId = showTypingIndicator();
  isProcessing = true;
  if (loadingIndicator) loadingIndicator.style.display = "flex";

  try {
    if (!navigator.onLine) throw new Error("You are currently offline. Please check your internet connection and try again.");

    // IMPORTANT: backend expects: message, creativity, session_id, persona_name
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        message: userMessage,
        creativity: String(userPreferences.aiCreativity ?? 0.7),
        session_id: currentChatId,          // was `chat_id` before — fixed
        persona_name: ACTIVE_PERSONA,       // NEW: ensures correct persona prompt
      }),
    });

    removeTypingIndicator(typingIndicatorId);

    if (!res.ok) throw new Error(`Server responded with status ${res.status}`);

    const data = await res.json();

    if (data.tone) setSamanthaTone(data.tone);

    const aiMessageId = generateMessageId();
    simulateStreamingResponse(data.reply, aiMessageId);

    conversations[currentChatId].messages.push({
      role: "ai",
      content: data.reply,
      id: aiMessageId,
      timestamp: new Date().toISOString(),
    });

    saveConversations();
  } catch (error) {
    console.error("Error sending message:", error);
    removeTypingIndicator(typingIndicatorId);

    const errorMessageId = generateMessageId();
    appendMessage(
      "ai",
      `<div class="alert alert-danger">
        <ion-icon name="alert-circle-outline"></ion-icon> Error: ${error.message || "There was an error processing your request."}
        <button class="btn btn-sm btn-outline-danger ms-2" onclick="retryMessage('${userMessageId}')">
          <ion-icon name="refresh-outline"></ion-icon> Retry
        </button>
      </div>`,
      errorMessageId
    );

    conversations[currentChatId].messages.push({
      role: "ai",
      content: `<div class="alert alert-danger">Error: ${error.message || "There was an error processing your request."}</div>`,
      id: errorMessageId,
      timestamp: new Date().toISOString(),
      isError: true,
    });

    saveConversations();
  } finally {
    isProcessing = false;
    if (loadingIndicator) loadingIndicator.style.display = "none";
  }
}

// Clear current session on the backend too (POST /clear)
async function clearBackendSession(sessionId) {
  try {
    await fetch("/clear", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ session_id: sessionId }),
    });
  } catch (e) {
    console.warn("Failed to clear backend session:", sessionId, e);
  }
}

// ====== Typing indicator ======
function showTypingIndicator() {
  const indicatorId = "typing-" + Date.now();
  const typingDiv = document.createElement("div");
  typingDiv.id = indicatorId;
  typingDiv.classList.add("message-group", "ai-group");
  typingDiv.innerHTML = `
    <div class="typing-indicator" style="display:flex;align-items:center;gap:2px;">
      <span class="typing-dot" style="display:inline-block;width:8px;height:8px;background:#bbb;border-radius:50%;animation:typingWave 1.2s infinite 0s;"></span>
      <span class="typing-dot" style="display:inline-block;width:8px;height:8px;background:#bbb;border-radius:50%;animation:typingWave 1.2s infinite 0.2s;"></span>
      <span class="typing-dot" style="display:inline-block;width:8px;height:8px;background:#bbb;border-radius:50%;animation:typingWave 1.2s infinite 0.4s;"></span>
    </div>
  `;
  messagesDiv.appendChild(typingDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  return indicatorId;
}

(function ensureTypingWaveStyle() {
  if (!document.getElementById("typingWaveStyle")) {
    const style = document.createElement("style");
    style.id = "typingWaveStyle";
    style.innerHTML = `
      @keyframes typingWave {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.6; }
        40% { transform: translateY(-8px); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
})();

function removeTypingIndicator(indicatorId) {
  const indicator = document.getElementById(indicatorId);
  if (indicator) indicator.remove();
}

// ====== Streaming simulation & helpers ======
function simulateStreamingResponse(fullResponse, messageId) {
  appendMessage("ai", "", messageId);
  const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
  const processedResponse = processCodeBlocks(fullResponse);
  let currentText = "";
  const sentences = processedResponse.split(/([.!?]\s+)/);
  let currentIndex = 0;

  function addNextChunk() {
    if (currentIndex < sentences.length) {
      const chunk = sentences[currentIndex];
      currentText += chunk;
      const shouldPause = Math.random() < 0.15 && currentIndex > 0 && currentIndex < sentences.length - 1;

      if (messageElement) {
        if (shouldPause) {
          messageElement.innerHTML = currentText + '<span class="typing-effect">...</span>';
          setTimeout(() => {
            messageElement.innerHTML = currentText;
            currentIndex++;
            const delay = Math.floor(Math.random() * 100) + 300;
            setTimeout(addNextChunk, delay);
          }, 700);
        } else {
          messageElement.innerHTML = currentText;
          currentIndex++;
          const baseDelay = 50;
          const randomFactor = Math.random() * 100;
          const delay = baseDelay + randomFactor + chunk.length * 2;
          setTimeout(addNextChunk, delay);
        }
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }
    } else {
      if (messageElement) {
        messageElement.innerHTML = currentText;
        document.querySelectorAll("pre code").forEach((el) => hljs.highlightElement(el));
      }
    }
  }
  addNextChunk();
}

function processCodeBlocks(text) {
  const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)\n```/g;
  return text.replace(codeBlockRegex, (match, language, code) => {
    const lang = language || "plaintext";
    let highlightedCode = `<div class="highlighted-code">`;
    highlightedCode += `<pre><code class="language-${lang}">${escapeHtml(code)}</code></pre>`;
    highlightedCode += `<button class="btn btn-sm btn-outline-secondary copy-btn" style="position: absolute; top: 5px; right: 5px;" onclick="copyToClipboard(this)">
      <ion-icon name="copy-outline"></ion-icon>
    </button>`;
    highlightedCode += `</div>`;
    return highlightedCode;
  });
}

// FIXED: escapeHtml regex typos
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.copyToClipboard = function (button) {
  const codeBlock = button.parentElement.querySelector("code");
  const text = codeBlock.textContent;
  const originalHtml = button.innerHTML;
  navigator.clipboard.writeText(text).then(() => {
    button.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon>';
    setTimeout(() => { button.innerHTML = originalHtml; }, 2000);
  });
};

window.retryMessage = function (userMessageId) {
  const userMessage = conversations[currentChatId].messages.find((m) => m.id === userMessageId);
  if (!userMessage) return;

  const msgIndex = conversations[currentChatId].messages.findIndex((m) => m.id === userMessageId);
  if (msgIndex >= 0 && msgIndex < conversations[currentChatId].messages.length - 1) {
    const errorMsg = conversations[currentChatId].messages[msgIndex + 1];
    if (errorMsg.isError) {
      conversations[currentChatId].messages.splice(msgIndex + 1, 1);
      const errorElement = document.querySelector(`.message[data-message-id="${errorMsg.id}"]`);
      if (errorElement) errorElement.closest(".message-group").remove();
    }
  }
  sendMessage(userMessage.content);
};

function generateMessageId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function initToastContainer() {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  return container;
}

function showToast(message, type = "info", duration = 3000) {
  const container = initToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast-notification ${type}`;
  let icon = "";
  switch (type) {
    case "success": icon = '<ion-icon name="checkmark-circle-outline"></ion-icon>'; break;
    case "warning": icon = '<ion-icon name="alert-circle-outline"></ion-icon>'; break;
    case "error": icon = '<ion-icon name="close-circle-outline"></ion-icon>'; break;
    case "info":
    default: icon = '<ion-icon name="information-circle-outline"></ion-icon>'; break;
  }
  toast.innerHTML = `${icon} <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

function appendMessage(role, content, messageId = generateMessageId()) {
  const messageGroupDiv = document.createElement("div");
  messageGroupDiv.classList.add("message-group", role === "user" ? "user-group" : "ai-group");
  messageGroupDiv.classList.add(
    userPreferences.messageSpacing === "compact" ? "mb-2" : userPreferences.messageSpacing === "comfortable" ? "mb-3" : "mb-4"
  );

  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", role === "user" ? "user-message" : "ai-message");
  messageDiv.setAttribute("data-message-id", messageId);

  if (role === "user" && userPreferences.encryptChats && userPreferences.encryptionPassword) {
    const encryptionNotice = document.createElement("div");
    encryptionNotice.classList.add("encryption-notice");
    encryptionNotice.innerHTML = `<ion-icon name="lock-closed-outline"></ion-icon> End-to-end encrypted`;
    messageGroupDiv.appendChild(encryptionNotice);
  } else if (role === "user" && userPreferences.saveHistory) {
    showToast("Message saved locally", "info");
  }

  if (role === "user") {
    lastUserMessage = content;
    const messageActions = document.createElement("div");
    messageActions.classList.add("message-actions");
    messageActions.innerHTML = `
      <button class="btn btn-sm btn-outline-secondary delete-btn" title="Delete message">
        <ion-icon name="trash-outline"></ion-icon>
      </button>
    `;
    messageDiv.appendChild(messageActions);
    const deleteBtn = messageActions.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", () => {
      if (confirm("Do you want to delete this message?")) deleteMessage(messageId);
    });
  } else if (role === "ai") {
    const messageActions = document.createElement("div");
    messageActions.classList.add("message-actions");
    messageActions.innerHTML = `
      <button class="btn btn-sm btn-outline-secondary share-btn" title="Share response">
        <ion-icon name="share-social-outline"></ion-icon>
      </button>
    `;
    messageDiv.appendChild(messageActions);
    const shareBtn = messageActions.querySelector(".share-btn");
    shareBtn.addEventListener("click", () => {
      if (navigator.share) {
        navigator.share({ title: "Chat with Samantha AI", text: stripHtml(content) }).catch(console.error);
      } else {
        navigator.clipboard.writeText(stripHtml(content));
        shareBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon>';
        setTimeout(() => { shareBtn.innerHTML = '<ion-icon name="share-social-outline"></ion-icon>'; }, 2000);
      }
    });

    const feedbackDiv = document.createElement("div");
    feedbackDiv.classList.add("message-feedback");
    feedbackDiv.innerHTML = `
      <button class="feedback-btn thumbs-up" title="This was helpful">
        <ion-icon name="thumbs-up-outline"></ion-icon>
      </button>
      <button class="feedback-btn thumbs-down" title="This wasn't helpful">
        <ion-icon name="thumbs-down-outline"></ion-icon>
      </button>
    `;
    const thumbsUp = feedbackDiv.querySelector(".thumbs-up");
    const thumbsDown = feedbackDiv.querySelector(".thumbs-down");
    thumbsUp.addEventListener("click", () => { thumbsUp.classList.toggle("active"); thumbsDown.classList.remove("active"); });
    thumbsDown.addEventListener("click", () => { thumbsDown.classList.toggle("active"); thumbsUp.classList.remove("active"); });
    messageGroupDiv.appendChild(feedbackDiv);
  }

  if (content.includes("alert-danger")) {
    content = content.replace('<i class="fa fa-exclamation-triangle"></i>', '<ion-icon name="alert-circle-outline"></ion-icon>');
    content = content.replace('<i class="fa fa-refresh"></i>', '<ion-icon name="refresh-outline"></ion-icon>');
  }

  messageDiv.innerHTML += content;
  messageGroupDiv.appendChild(messageDiv);
  messagesDiv.appendChild(messageGroupDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  setTimeout(() => {
    document.querySelectorAll("pre code").forEach((el) => hljs.highlightElement(el));
  }, 100);

  return messageId;
}

function stripHtml(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || "";
}

function deleteMessage(messageId) {
  const msgIndex = conversations[currentChatId].messages.findIndex((m) => m.id === messageId);
  if (msgIndex >= 0) {
    conversations[currentChatId].messages.splice(msgIndex, 1);
    saveConversations();
    const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (messageElement) messageElement.closest(".message-group").remove();
  }
}

function deleteMessageAndResponse(messageId) {
  const msgIndex = conversations[currentChatId].messages.findIndex((m) => m.id === messageId);
  if (msgIndex >= 0) {
    if (msgIndex < conversations[currentChatId].messages.length - 1 && conversations[currentChatId].messages[msgIndex + 1].role === "ai") {
      const responseId = conversations[currentChatId].messages[msgIndex + 1].id;
      conversations[currentChatId].messages.splice(msgIndex, 2);
      const responseElement = document.querySelector(`.message[data-message-id="${responseId}"]`);
      if (responseElement) responseElement.closest(".message-group").remove();
    } else {
      conversations[currentChatId].messages.splice(msgIndex, 1);
    }
    saveConversations();
    const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (messageElement) messageElement.closest(".message-group").remove();
  }
}

function regenerateResponse(messageId) {
  const msgIndex = conversations[currentChatId].messages.findIndex((m) => m.id === messageId);
  if (msgIndex > 0 && conversations[currentChatId].messages[msgIndex].role === "ai") {
    const userMessage = conversations[currentChatId].messages[msgIndex - 1];
    conversations[currentChatId].messages.splice(msgIndex, 1);
    saveConversations();
    const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (messageElement) messageElement.closest(".message-group").remove();
    sendMessage(userMessage.content);
  }
}

function applyMessageSpacing() {
  const spacing = userPreferences.messageSpacing;
  const messageGroups = document.querySelectorAll(".message-group");
  messageGroups.forEach((group) => {
    group.classList.remove("mb-2", "mb-3", "mb-4");
    if (spacing === "compact") group.classList.add("mb-2");
    else if (spacing === "comfortable") group.classList.add("mb-3");
    else if (spacing === "spacious") group.classList.add("mb-4");
  });
}

function downloadFile(content, fileName, contentType) {
  const file = new Blob([content], { type: contentType });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
}

// ====== EVENTS ======
if (suggestionChips) {
  suggestionChips.addEventListener("click", (e) => {
    if (e.target.classList.contains("suggestion-chip")) {
      textarea.value = e.target.innerText;
      textarea.focus();
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    }
  });
}

if (textarea) {
  textarea.addEventListener("input", function () {
    if (suggestionChips) suggestionChips.style.display = "none";
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 200) + "px";
  });

  textarea.addEventListener("focus", function () {
    if (textarea.value.trim() !== "" && suggestionChips) suggestionChips.style.display = "none";
  });

  textarea.addEventListener("blur", function () {
    if (textarea.value.trim() === "" && suggestionChips) suggestionChips.style.display = "flex";
  });

  textarea.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (textarea.value.trim()) {
        appendMessage("user", textarea.value.trim());
        sendMessage(textarea.value.trim());
        textarea.value = "";
        textarea.style.height = "auto";
      }
    }
  });
}

if (sendBtn) {
  sendBtn.addEventListener("click", () => {
    const text = textarea.value.trim();
    if (!text) return;
    appendMessage("user", text);
    sendMessage(text);
    textarea.value = "";
    textarea.style.height = "auto";
  });
}

// Voice input
if (window.webkitSpeechRecognition || window.SpeechRecognition) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognitionAPI = new SpeechRecognition();
  recognitionAPI.continuous = false;
  recognitionAPI.interimResults = true;

  recognitionAPI.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    textarea.value = transcript;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    if (suggestionChips) suggestionChips.style.display = "none";
  };

  recognitionAPI.onend = () => {
    voiceInputBtn.innerHTML = '<ion-icon name="mic-outline"></ion-icon>';
    voiceInputBtn.classList.remove("btn-danger");
    isRecording = false;
  };
} else if (voiceInputBtn) {
  voiceInputBtn.style.display = "none";
}

if (voiceInputBtn) {
  voiceInputBtn.addEventListener("click", () => {
    if (!recognitionAPI) return;
    if (!isRecording) {
      recognitionAPI.start();
      voiceInputBtn.innerHTML = '<ion-icon name="stop-outline"></ion-icon>';
      voiceInputBtn.classList.add("btn-danger");
      isRecording = true;
    } else {
      recognitionAPI.stop();
    }
  });
}

// Image upload stub
if (imageUploadBtn && imageInput) {
  imageUploadBtn.addEventListener("click", () => imageInput.click());
  imageInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      appendMessage("user", "📷 [Image uploaded]");
    }
  });
}

// Clear data button: clear local + backend session
if (clearDataBtn) {
  clearDataBtn.addEventListener("click", async () => {
    if (!confirm("This will clear all saved chats locally and reset the current server session. Continue?")) return;
    conversations = {};
    localStorage.removeItem("chatConversations");
    clearChatMessages();
    await clearBackendSession(currentChatId); // also clear server-side session
    showToast("All local data cleared and session reset.", "success");
    createNewChat();
  });
}

// New chat button: start a new local chat and reset backend session for the new id
if (newChatBtn) {
  newChatBtn.addEventListener("click", async () => {
    createNewChat();
    await clearBackendSession(currentChatId);
    showToast("New chat started.", "success");
  });
}

// Sidebar visibility (noop guard)
function applySidebarVisibility() {
  if (!sidebar) return;
  sidebar.style.display = userPreferences.sidebarVisible ? "block" : "none";
}

// You may already have these tone helpers; keep stubs if not present
function detectUserVibe(text) {
  const t = (text || "").toLowerCase();
  if (/angry|upset|frustrated/.test(t)) return "frustrated";
  if (/happy|great|awesome|cool|thanks|thank you/.test(t)) return "optimistic";
  if (/calm|relaxed|peaceful|chill/.test(t)) return "calm";
  if (/rush|hurry|fast|quick/.test(t)) return "energized";
  return "casual";
}

function setSamanthaTone(tone) {
  if (!toneIndicator || !toneText) return;
  const toneIcons = {
    optimistic: "happy-outline",
    neutral: "remove-outline",
    reflective: "eye-outline",
    energized: "flash-outline",
    calm: "leaf-outline",
    casual: "happy-outline",
    frustrated: "sad-outline",
    technical: "construct-outline",
  };
  const toneDescriptions = {
    optimistic: "Optimistic",
    neutral: "Neutral",
    reflective: "Reflective",
    energized: "Energized",
    calm: "Calm",
    casual: "Casual",
    frustrated: "Frustrated",
    technical: "Technical",
  };
  toneText.textContent = toneDescriptions[tone] || "Neutral";
  toneIndicator.querySelector("ion-icon").setAttribute("name", toneIcons[tone] || "remove-outline");
}

// Boot
init();
