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

// State variables
let currentChatId = "chat-" + Date.now();
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
  aiCreativity: 0.7, // Default creativity level
};

// Network status monitoring
window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);

function updateOnlineStatus() {
  if (navigator.onLine) {
    offlineBadge.style.display = "none";
  } else {
    offlineBadge.style.display = "inline-block";
  }
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
      // Reset preferences if corrupt
      userPreferences = {
        darkMode: false,
        saveHistory: true,
        encryptChats: false,
        encryptionPassword: "",
        messageSpacing: "comfortable",
        privacyPolicyAccepted: false,
        lastActiveChat: null,
        sidebarVisible: true,
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
  // Apply dark mode setting
  if (userPreferences.darkMode) {
    document.body.setAttribute("data-theme", "dark");
    lightIcon.style.display = "none";
    darkIcon.style.display = "inline-block";
    document.getElementById("hljs-light-theme").disabled = true;
    document.getElementById("hljs-dark-theme").disabled = false;
  } else {
    document.body.removeAttribute("data-theme");
    lightIcon.style.display = "inline-block";
    darkIcon.style.display = "none";
    document.getElementById("hljs-light-theme").disabled = false;
    document.getElementById("hljs-dark-theme").disabled = true;
  }

  // Apply history saving preference
  saveHistorySwitch.checked = userPreferences.saveHistory;

  // Apply encryption settings
  encryptionSwitch.checked = userPreferences.encryptChats;
  encryptionPasswordDiv.style.display = userPreferences.encryptChats ? "block" : "none";
  encryptionPassword.value = userPreferences.encryptionPassword || "";

  // Apply message spacing
  messageSpacingSelect.value = userPreferences.messageSpacing || "comfortable";
  applyMessageSpacing();

  // Apply AI creativity slider value if present
  const creativitySlider = document.getElementById("aiCreativitySlider");
  if (creativitySlider) {
    creativitySlider.value = userPreferences.aiCreativity ?? 0.7;
    document.getElementById("creativityValue").textContent =
      Math.round((userPreferences.aiCreativity ?? 0.7) * 100) + "%";
  }

  // Apply chat theme if available
  if (userPreferences.chatTheme) {
    applyChatTheme(userPreferences.chatTheme);
  }

  // Apply font family if set
  if (userPreferences.fontFamily) {
    document.documentElement.style.setProperty("--main-font", userPreferences.fontFamily);
  }
}

// Save user preferences
function saveUserPreferences() {
  localStorage.setItem("userPreferences", JSON.stringify(userPreferences));
}

// Initialize chat (load history from localStorage if available)
function initChat() {
  const savedConversations = localStorage.getItem("chatConversations");
  if (savedConversations) {
    try {
      let parsedData;

      // Try to decrypt if encryption is enabled
      if (userPreferences.encryptChats && userPreferences.encryptionPassword) {
        try {
          const decrypted = CryptoJS.AES.decrypt(
            savedConversations,
            userPreferences.encryptionPassword
          ).toString(CryptoJS.enc.Utf8);
          parsedData = JSON.parse(decrypted);
        } catch (e) {
          console.error("Failed to decrypt conversations:", e);
          alert("Failed to decrypt conversations. Please check your encryption password.");
          return;
        }
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

  // Create a new chat if none exists
  if (Object.keys(conversations).length === 0) {
    createNewChat();
  } else if (userPreferences.lastActiveChat && conversations[userPreferences.lastActiveChat]) {
    // Load the last active chat
    currentChatId = userPreferences.lastActiveChat;
    loadChat(currentChatId);
  } else {
    // Load the most recent chat
    currentChatId = Object.keys(conversations)[0];
    loadChat(currentChatId);
  }
}

// Create a new chat
function createNewChat() {
  currentChatId = "chat-" + Date.now();
  conversations[currentChatId] = {
    title: "New Conversation",
    messages: [], // Empty array instead of starting with an AI greeting
    createdAt: new Date().toISOString(),
  };
  if (userPreferences.saveHistory) {
    saveConversations();
  }
  updateChatHistorySidebar();
  clearChatMessages();
}

// Save conversations to localStorage
function saveConversations() {
  if (!userPreferences.saveHistory) return;

  let dataToSave = JSON.stringify(conversations);

  // Encrypt if enabled
  if (userPreferences.encryptChats && userPreferences.encryptionPassword) {
    dataToSave = CryptoJS.AES.encrypt(dataToSave, userPreferences.encryptionPassword).toString();
  }

  localStorage.setItem("chatConversations", dataToSave);
}

// Format date without seconds
function formatDateWithoutSeconds(dateString) {
  const date = new Date(dateString);
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleString(undefined, options);
}

// Update the chat history sidebar
function updateChatHistorySidebar() {
  chatHistory.innerHTML = "";
  Object.keys(conversations).forEach((chatId) => {
    const chat = conversations[chatId];
    const historyItem = document.createElement("div");
    historyItem.classList.add("history-item");
    if (chatId === currentChatId) {
      historyItem.classList.add("active");
    }
    historyItem.innerHTML = `
      <div>${chat.title}</div>
      <small class="text-muted">${formatDateWithoutSeconds(chat.createdAt)}</small>
    `;
    historyItem.onclick = () => loadChat(chatId);
    chatHistory.appendChild(historyItem);
  });
}

// Load a specific chat
function loadChat(chatId) {
  currentChatId = chatId;
  userPreferences.lastActiveChat = chatId;
  saveUserPreferences();
  clearChatMessages();
  const chat = conversations[chatId];
  chat.messages.forEach((msg) => {
    appendMessage(msg.role, msg.content, msg.id || generateMessageId());
  });
  updateChatHistorySidebar();
}

// Clear all messages from the UI
function clearChatMessages() {
  messagesDiv.innerHTML = "";
}

// Send message to API and handle response
async function sendMessage(userMessage) {
  if (isProcessing) return;

  const userMessageId = generateMessageId();
  const msgObj = {
    role: "user",
    content: userMessage,
    id: userMessageId,
    timestamp: new Date().toISOString(),
  };

  // Add to conversation state
  if (!conversations[currentChatId]) {
    createNewChat();
  }
  conversations[currentChatId].messages.push(msgObj);

  // Detect user vibe and set Samantha's tone
  const userVibe = detectUserVibe(userMessage);
  setSamanthaTone(userVibe);

  // If this is the first user message, update the chat title
  if (conversations[currentChatId].messages.filter((m) => m.role === "user").length === 1) {
    conversations[currentChatId].title = userMessage.substring(0, 30) + (userMessage.length > 30 ? "..." : "");
  }

  saveConversations();
  updateChatHistorySidebar();

  // Show typing indicator
  const typingIndicatorId = showTypingIndicator();

  // Show loading indicator
  isProcessing = true;
  loadingIndicator.style.display = "flex";

  try {
    // Check if we're offline
    if (!navigator.onLine) {
      throw new Error("You are currently offline. Please check your internet connection and try again.");
    }

    // Use form URL encoding to match the Form parameters on the backend
    const res = await fetch("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        message: userMessage,
        chat_id: currentChatId,
        creativity: userPreferences.aiCreativity ?? "0.7", // Fallback
      }),
    });

    // Remove typing indicator
    removeTypingIndicator(typingIndicatorId);

    if (!res.ok) {
      throw new Error(`Server responded with status ${res.status}`);
    }

    const data = await res.json();

    // Update tone indicator
    if (data.tone) {
      setSamanthaTone(data.tone);
    }

    const aiMessageId = generateMessageId();

    // To simulate streaming, we'll split the response and gradually reveal it
    simulateStreamingResponse(data.reply, aiMessageId);

    // Save AI response to conversation (complete version)
    conversations[currentChatId].messages.push({
      role: "ai",
      content: data.reply,
      id: aiMessageId,
      timestamp: new Date().toISOString(),
    });

    saveConversations();
  } catch (error) {
    console.error("Error sending message:", error);

    // Remove typing indicator
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

    // Save the error message to conversation
    conversations[currentChatId].messages.push({
      role: "ai",
      content: `<div class="alert alert-danger">Error: ${error.message || "There was an error processing your request."}</div>`,
      id: errorMessageId,
      timestamp: new Date().toISOString(),
      isError: true,
    });

    saveConversations();
  } finally {
    // Hide loading indicator
    isProcessing = false;
    loadingIndicator.style.display = "none";
  }
}

// Show typing indicator (wavy three dots)
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

// Add CSS animation for wavy dots (if not already present)
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

// Remove typing indicator
function removeTypingIndicator(indicatorId) {
  const indicator = document.getElementById(indicatorId);
  if (indicator) {
    indicator.remove();
  }
}

// Simulate streaming response with more humanized pacing
function simulateStreamingResponse(fullResponse, messageId) {
  // Create initial message container
  appendMessage("ai", "", messageId);
  const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);

  // Process for code blocks first
  const processedResponse = processCodeBlocks(fullResponse);
  let currentText = "";

  // Split into sentences for more natural pacing
  const sentences = processedResponse.split(/([.!?]\s+)/);
  let currentIndex = 0;

  function addNextChunk() {
    if (currentIndex < sentences.length) {
      // Add the next sentence (with punctuation)
      const chunk = sentences[currentIndex];
      currentText += chunk;

      // Occasionally add "typing" pauses for humanization
      const shouldPause = Math.random() < 0.15 && currentIndex > 0 && currentIndex < sentences.length - 1;

      // Append the current text to the message
      if (messageElement) {
        if (shouldPause) {
          // Show thinking effect occasionally
          messageElement.innerHTML = currentText + '<span class="typing-effect">...</span>';
          setTimeout(() => {
            messageElement.innerHTML = currentText;
            currentIndex++;
            const delay = Math.floor(Math.random() * 100) + 300;
            setTimeout(addNextChunk, delay);
          }, 700); // Pause duration
        } else {
          messageElement.innerHTML = currentText;
          currentIndex++;

          // Randomized delay between chunks for realistic typing effect
          // Varying speed based on chunk length
          const baseDelay = 50;
          const randomFactor = Math.random() * 100;
          const chunkLength = chunk.length;
          const delay = baseDelay + randomFactor + chunkLength * 2;
          setTimeout(addNextChunk, delay);
        }

        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }
    } else {
      // When done, apply syntax highlighting and remove any typing effect
      if (messageElement) {
        messageElement.innerHTML = currentText;
        document.querySelectorAll("pre code").forEach((el) => {
          hljs.highlightElement(el);
        });
      }
    }
  }

  // Start adding chunks
  addNextChunk();
}

// Process text to identify and format code blocks
function processCodeBlocks(text) {
  // Regular expression to find markdown code blocks with language specification
  const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)\n```/g;

  return text.replace(codeBlockRegex, (match, language, code) => {
    // Default to 'plaintext' if no language is specified
    const lang = language || "plaintext";

    // Create a wrapper div for the code block
    let highlightedCode = `<div class="highlighted-code">`;

    // Add the code with syntax highlighting
    highlightedCode += `<pre><code class="language-${lang}">${escapeHtml(code)}</code></pre>`;

    // Add copy button
    highlightedCode += `<button class="btn btn-sm btn-outline-secondary copy-btn" style="position: absolute; top: 5px; right: 5px;" onclick="copyToClipboard(this)">
      <ion-icon name="copy-outline"></ion-icon>
    </button>`;
    highlightedCode += `</div>`;
    return highlightedCode;
  });
}

// Escape HTML characters to prevent XSS
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/<//g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"//g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Copy text to clipboard
window.copyToClipboard = function (button) {
  const codeBlock = button.parentElement.querySelector("code");
  const text = codeBlock.textContent;
  const originalHtml = button.innerHTML;
  navigator.clipboard.writeText(text).then(() => {
    // Change button text temporarily
    button.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon>';
    setTimeout(() => {
      button.innerHTML = originalHtml;
    }, 2000);
  });
};

// Retry a failed message
window.retryMessage = function (userMessageId) {
  // Find the user message by ID
  const userMessage = conversations[currentChatId].messages.find((m) => m.id === userMessageId);
  if (!userMessage) return;

  // Find and remove the error message (should be right after the user message)
  const msgIndex = conversations[currentChatId].messages.findIndex((m) => m.id === userMessageId);
  if (msgIndex >= 0 && msgIndex < conversations[currentChatId].messages.length - 1) {
    const errorMsg = conversations[currentChatId].messages[msgIndex + 1];
    if (errorMsg.isError) {
      // Remove the error message from the conversation
      conversations[currentChatId].messages.splice(msgIndex + 1, 1);

      // Remove from UI
      const errorElement = document.querySelector(`.message[data-message-id="${errorMsg.id}"]`);
      if (errorElement) {
        errorElement.closest(".message-group").remove();
      }
    }
  }

  // Resend the message
  sendMessage(userMessage.content);
};

// Generate unique message ID
function generateMessageId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Create toast container if it doesn't exist
function initToastContainer() {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  return container;
}

// Show a toast notification
function showToast(message, type = "info", duration = 3000) {
  const container = initToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast-notification ${type}`;

  // Icon based on notification type
  let icon = "";
  switch (type) {
    case "success":
      icon = '<ion-icon name="checkmark-circle-outline"></ion-icon>';
      break;
    case "warning":
      icon = '<ion-icon name="alert-circle-outline"></ion-icon>';
      break;
    case "error":
      icon = '<ion-icon name="close-circle-outline"></ion-icon>';
      break;
    case "info":
    default:
      icon = '<ion-icon name="information-circle-outline"></ion-icon>';
      break;
  }

  toast.innerHTML = `${icon} <span>${message}</span>`;
  container.appendChild(toast);

  // Remove toast after animation completes
  setTimeout(() => {
    toast.remove();
  }, duration);
}

// Append message to the chat UI
function appendMessage(role, content, messageId = generateMessageId()) {
  const messageGroupDiv = document.createElement("div");
  messageGroupDiv.classList.add("message-group", role === "user" ? "user-group" : "ai-group");
  messageGroupDiv.classList.add(
    userPreferences.messageSpacing === "compact" ? "mb-2" : userPreferences.messageSpacing === "comfortable" ? "mb-3" : "mb-4"
  );

  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", role === "user" ? "user-message" : "ai-message");
  messageDiv.setAttribute("data-message-id", messageId);

  // Add encryption notice if enabled
  if (role === "user" && userPreferences.encryptChats && userPreferences.encryptionPassword) {
    const encryptionNotice = document.createElement("div");
    encryptionNotice.classList.add("encryption-notice");
    encryptionNotice.innerHTML = `<ion-icon name="lock-closed-outline"></ion-icon> End-to-end encrypted`;
    messageGroupDiv.appendChild(encryptionNotice);
  } else if (role === "user" && userPreferences.saveHistory) {
    // Instead of adding the notice to the message, show a toast notification
    showToast("Message saved locally", "info");
  }

  // Add message actions for user messages
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

    // Add delete functionality
    const deleteBtn = messageActions.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", () => {
      if (confirm("Do you want to delete this message?")) {
        deleteMessage(messageId);
      }
    });
  } else if (role === "ai") {
    // Add actions for AI messages (copy, feedback)
    const messageActions = document.createElement("div");
    messageActions.classList.add("message-actions");
    messageActions.innerHTML = `

      <button class="btn btn-sm btn-outline-secondary share-btn" title="Share response">
        <ion-icon name="share-social-outline"></ion-icon>
      </button>
    `;
    messageDiv.appendChild(messageActions);

    // Add share functionality
    const shareBtn = messageActions.querySelector(".share-btn");
    shareBtn.addEventListener("click", () => {
      // Share functionality (simplified)
      if (navigator.share) {
        navigator
          .share({
            title: "Chat with Samantha AI",
            text: stripHtml(content),
          })
          .catch(console.error);
      } else {
        // Fallback
        navigator.clipboard.writeText(stripHtml(content));
        shareBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon>';
        setTimeout(() => {
          shareBtn.innerHTML = '<ion-icon name="share-social-outline"></ion-icon>';
        }, 2000);
      }
    });

    // Add feedback mechanism
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

    // Add feedback functionality
    thumbsUp.addEventListener("click", () => {
      thumbsUp.classList.toggle("active");
      thumbsDown.classList.remove("active");
      // In a real app, you would send feedback to your backend here
    });

    thumbsDown.addEventListener("click", () => {
      thumbsDown.classList.toggle("active");
      thumbsUp.classList.remove("active");
      // In a real app, you would send feedback to your backend here
    });

    messageGroupDiv.appendChild(feedbackDiv);
  }

  // If this is an error message, update the icon
  if (content.includes("alert-danger")) {
    content = content.replace('<i class="fa fa-exclamation-triangle"></i>', '<ion-icon name="alert-circle-outline"></ion-icon>');
    content = content.replace('<i class="fa fa-refresh"></i>', '<ion-icon name="refresh-outline"></ion-icon>');
  }

  messageDiv.innerHTML += content;
  messageGroupDiv.appendChild(messageDiv);
  messagesDiv.appendChild(messageGroupDiv);

  // Auto-scroll to the new message
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  // Apply syntax highlighting to code blocks
  setTimeout(() => {
    document.querySelectorAll("pre code").forEach((el) => {
      hljs.highlightElement(el);
    });
  }, 100);

  return messageId;
}

// Strip HTML tags from content
function stripHtml(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || "";
}

// Delete a message in the conversation
function deleteMessage(messageId) {
  // Find the message in the conversation
  const msgIndex = conversations[currentChatId].messages.findIndex((m) => m.id === messageId);
  if (msgIndex >= 0) {
    // Remove the message
    conversations[currentChatId].messages.splice(msgIndex, 1);
    saveConversations();

    // Remove from UI
    const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (messageElement) {
      messageElement.closest(".message-group").remove();
    }
  }
}

// Delete a message and its corresponding response
function deleteMessageAndResponse(messageId) {
  // Find the message in the conversation
  const msgIndex = conversations[currentChatId].messages.findIndex((m) => m.id === messageId);
  if (msgIndex >= 0) {
    // If there's a response after this message, delete it too
    if (msgIndex < conversations[currentChatId].messages.length - 1 && conversations[currentChatId].messages[msgIndex + 1].role === "ai") {
      // Get the response ID
      const responseId = conversations[currentChatId].messages[msgIndex + 1].id;

      // Remove both messages
      conversations[currentChatId].messages.splice(msgIndex, 2);

      // Remove from UI
      const responseElement = document.querySelector(`.message[data-message-id="${responseId}"]`);
      if (responseElement) {
        responseElement.closest(".message-group").remove();
      }
    } else {
      // Just remove this message
      conversations[currentChatId].messages.splice(msgIndex, 1);
    }

    saveConversations();

    // Remove from UI
    const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (messageElement) {
      messageElement.closest(".message-group").remove();
    }
  }
}

// Regenerate an AI response
function regenerateResponse(messageId) {
  // Find the AI message
  const msgIndex = conversations[currentChatId].messages.findIndex((m) => m.id === messageId);
  if (msgIndex > 0 && conversations[currentChatId].messages[msgIndex].role === "ai") {
    // Get the previous user message
    const userMessage = conversations[currentChatId].messages[msgIndex - 1];

    // Remove the AI message
    conversations[currentChatId].messages.splice(msgIndex, 1);
    saveConversations();

    // Remove from UI
    const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (messageElement) {
      messageElement.closest(".message-group").remove();
    }

    // Send the user message again to get a new response
    sendMessage(userMessage.content);
  }
}

// Apply message spacing
function applyMessageSpacing() {
  const spacing = userPreferences.messageSpacing;
  const messageGroups = document.querySelectorAll(".message-group");
  messageGroups.forEach((group) => {
    // Remove existing spacing classes
    group.classList.remove("mb-2", "mb-3", "mb-4");

    // Apply new spacing
    if (spacing === "compact") {
      group.classList.add("mb-2");
    } else if (spacing === "comfortable") {
      group.classList.add("mb-3");
    } else if (spacing === "spacious") {
      group.classList.add("mb-4");
    }
  });
}

// Helper function to download files
function downloadFile(content, fileName, contentType) {
  const file = new Blob([content], { type: contentType });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
}

// EVENT LISTENERS

// Handle suggestion chip clicks
suggestionChips.addEventListener("click", (e) => {
  if (e.target.classList.contains("suggestion-chip")) {
    textarea.value = e.target.innerText;
    textarea.focus();
    // Auto-adjust height
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
  }
});

// Hide suggestion chips when typing starts
textarea.addEventListener("input", function () {
  // Always hide suggestions when typing anything
  suggestionChips.style.display = "none"; // Ensure suggestions disappear immediately
  // Auto-resize textarea
  this.style.height = "auto";
  this.style.height = Math.min(this.scrollHeight, 200) + "px";
});

// Also hide suggestions when textarea gets focus (for translate mode or other input methods)
textarea.addEventListener("focus", function () {
  if (textarea.value.trim() !== "") {
    suggestionChips.style.display = "none";
  }
});

// Ensure suggestions reappear if textarea is emptied
textarea.addEventListener("blur", function () {
  if (textarea.value.trim() === "") {
    suggestionChips.style.display = "flex";
  }
});

// Initialize Web Speech API for voice input if available
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
    // Hide suggestions
    suggestionChips.style.display = "none";
  };

  recognitionAPI.onend = () => {
    voiceInputBtn.innerHTML = '<ion-icon name="mic-outline"></ion-icon>';
    voiceInputBtn.classList.remove("btn-danger");
    isRecording = false;
  };
} else {
  voiceInputBtn.style.display = "none";
}

// Voice input button functionality
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

// Image upload button functionality
imageUploadBtn.addEventListener("click", () => {
  imageInput.click();
});

// Handle image upload
imageInput.addEventListener("change", function () {
  if (this.files && this.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      // For now, just mention that an image would be uploaded
      appendMessage("user", "📷 [Image uploaded]");
