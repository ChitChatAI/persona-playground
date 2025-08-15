// static/js/scripts.js — slim, no sidebar/settings, mirrors input to both panels

document.addEventListener("DOMContentLoaded", () => {
  /* ======================
     Elements
  ====================== */
  const messagesLeft = document.getElementById("messages");
  const messagesRight = document.getElementById("messagesVanilla");

  const inputEl = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");

  const loadingLeft = document.getElementById("loadingIndicator");
  const loadingRight = document.getElementById("loadingIndicatorVanilla");

  const suggestionChips = document.getElementById("suggestionChips");
  const voiceInputBtn = document.getElementById("voiceInputBtn");
  const imageUploadBtn = document.getElementById("imageUploadBtn");
  const imageInput = document.getElementById("imageInput");

  const personaTitleEl = document.getElementById("personaTitle");
  const offlineBadgeLeft = document.getElementById("offlineBadge");
  const offlineBadgeRight = document.getElementById("offlineBadgeVanilla");

  const toneIndicatorLeft = document.getElementById("toneIndicator");
  const toneTextLeft = document.getElementById("toneText");

  const toneIndicatorRight = document.getElementById("toneIndicatorVanilla");
  const toneTextRight = document.getElementById("toneTextVanilla");

  const clearLeftBtn = document.getElementById("clearLeftBtn");

  // Upload modal elements
  const uploadForm = document.getElementById("uploadPersonaForm");
  const personaNameInput = document.getElementById("personaNameInput");
  const personaFilesInput = document.getElementById("personaFilesInput");
  const uploadStatus = document.getElementById("uploadStatus");

  /* ======================
     State
  ====================== */
  let currentPersonaName = ""; // after upload; empty => default
  const personaSessionId = "persona-" + Date.now();
  const vanillaSessionId = "vanilla-" + Date.now();

  // Basic online/offline indicator
  function updateOnlineBadges() {
    const online = navigator.onLine;
    if (offlineBadgeLeft) offlineBadgeLeft.style.display = online ? "none" : "inline-block";
    if (offlineBadgeRight) offlineBadgeRight.style.display = online ? "none" : "inline-block";
  }
  window.addEventListener("online", updateOnlineBadges);
  window.addEventListener("offline", updateOnlineBadges);
  updateOnlineBadges();

  /* ======================
     Helpers
  ====================== */
  function slugify(name) {
    return (name || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function titleCaseFromSlug(slug) {
    return (slug || "Persona").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function setPersonaTitle(name) {
    if (personaTitleEl) {
      personaTitleEl.textContent = titleCaseFromSlug(slugify(name) || "Persona");
    }
  }

  // Tone
  function detectTone(text) {
    const t = (text || "").toLowerCase();
    if (/error|fail|issue|problem|debug|api/.test(t)) return "technical";
    if (/angry|frustrated|annoyed|upset/.test(t)) return "frustrated";
    if (/happy|great|awesome|cool|nice|thanks|thank you/.test(t)) return "optimistic";
    if (/calm|relaxed|peaceful|chill/.test(t)) return "calm";
    if (/reflect|think|consider|ponder/.test(t)) return "reflective";
    if (/energy|excited|let's go|go!|rush/.test(t)) return "energized";
    return "casual";
  }

  function applyTone(panel, tone) {
    const icons = {
      optimistic: "happy-outline",
      neutral: "remove-outline",
      reflective: "eye-outline",
      energized: "flash-outline",
      calm: "leaf-outline",
      casual: "happy-outline",
      frustrated: "sad-outline",
      technical: "construct-outline",
    };
    const labels = {
      optimistic: "Optimistic",
      neutral: "Neutral",
      reflective: "Reflective",
      energized: "Energized",
      calm: "Calm",
      casual: "Casual",
      frustrated: "Frustrated",
      technical: "Technical",
    };

    if (panel === "left") {
      if (toneTextLeft) toneTextLeft.textContent = labels[tone] || "Neutral";
      if (toneIndicatorLeft) {
        const icon = toneIndicatorLeft.querySelector("ion-icon");
        if (icon) icon.setAttribute("name", icons[tone] || "remove-outline");
      }
    } else {
      if (toneTextRight) toneTextRight.textContent = labels[tone] || "Neutral";
      if (toneIndicatorRight) {
        const icon = toneIndicatorRight.querySelector("ion-icon");
        if (icon) icon.setAttribute("name", icons[tone] || "remove-outline");
      }
    }
  }

  /* ======================
     Message DOM
  ====================== */
  function appendMessage(panelEl, role, html, withActions = true) {
    if (!panelEl) return;

    const group = document.createElement("div");
    group.className = `message-group ${role === "user" ? "user-group" : "ai-group"} mb-3`;

    const msg = document.createElement("div");
    msg.className = `message ${role === "user" ? "user-message" : "ai-message"}`;
    const messageId = "msg_" + Math.random().toString(36).slice(2);
    msg.dataset.messageId = messageId;

    // Actions for user message: Edit / Delete
    if (role === "user" && withActions) {
      const actions = document.createElement("div");
      actions.className = "message-actions";
      actions.innerHTML = `
        <button class="btn btn-sm btn-outline-secondary me-1" data-action="edit" title="Edit">
          <ion-icon name="create-outline"></ion-icon>
        </button>
        <button class="btn btn-sm btn-outline-secondary" data-action="delete" title="Delete">
          <ion-icon name="trash-outline"></ion-icon>
        </button>
      `;
      msg.appendChild(actions);

      actions.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const act = btn.dataset.action;
        const msgContent = msg.querySelector(".message-content");
        if (!msgContent) return;

        if (act === "edit") {
          const currentText = stripHtml(msgContent.innerHTML);
          const next = prompt("Edit your message:", currentText);
          if (next && next.trim()) {
            msgContent.innerText = next.trim();
            // Optionally re-send the edited message
            sendMessage(next.trim());
          }
        } else if (act === "delete") {
          group.remove();
        }
      });
    }

    const msgContent = document.createElement("div");
    msgContent.className = "message-content";
    msgContent.innerHTML = html;

    msg.appendChild(msgContent);
    group.appendChild(msg);
    panelEl.appendChild(group);
    panelEl.scrollTop = panelEl.scrollHeight;

    return messageId;
  }

  function stripHtml(html) {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  }

  function showTyping(panelEl) {
    if (!panelEl) return null;
    const id = "typing_" + Math.random().toString(36).slice(2);
    const el = document.createElement("div");
    el.id = id;
    el.className = "message-group ai-group";
    el.innerHTML = `
      <div class="typing-indicator" style="display:flex;align-items:center;gap:2px;">
        <span class="typing-dot" style="display:inline-block;width:8px;height:8px;background:#bbb;border-radius:50%;animation:typingWave 1.2s infinite 0s;"></span>
        <span class="typing-dot" style="display:inline-block;width:8px;height:8px;background:#bbb;border-radius:50%;animation:typingWave 1.2s infinite 0.2s;"></span>
        <span class="typing-dot" style="display:inline-block;width:8px;height:8px;background:#bbb;border-radius:50%;animation:typingWave 1.2s infinite 0.4s;"></span>
      </div>
    `;
    panelEl.appendChild(el);
    panelEl.scrollTop = panelEl.scrollHeight;
    return id;
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

  function removeTyping(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  /* ======================
     Send message → both panels
  ====================== */
  async function sendMessage(text) {
    const content = (text || "").trim();
    if (!content) return;

    // Append user message to BOTH panels
    appendMessage(messagesLeft, "user", content);
    appendMessage(messagesRight, "user", content);

    // Typing indicators + loading spinners
    const typingLeftId = showTyping(messagesLeft);
    const typingRightId = showTyping(messagesRight);
    if (loadingLeft) loadingLeft.style.display = "flex";
    if (loadingRight) loadingRight.style.display = "flex";

    const creativity = "0.85";

    // Persona call (left)
    const personaBody = new URLSearchParams({
      message: content,
      creativity,
      session_id: personaSessionId,
      persona_name: currentPersonaName || (window.ACTIVE_PERSONA || "samantha"),
    });

    // Vanilla call (right)
    const vanillaBody = new URLSearchParams({
      message: content,
      creativity,
      session_id: vanillaSessionId,
    });

    try {
      if (!navigator.onLine) throw new Error("You are offline. Check your connection.");

      const [personaRes, vanillaRes] = await Promise.allSettled([
        fetch("/chat", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: personaBody }),
        fetch("/vanilla", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: vanillaBody }),
      ]);

      // Left panel response
      if (personaRes.status === "fulfilled" && personaRes.value.ok) {
        const data = await personaRes.value.json();
        removeTyping(typingLeftId);
        appendMessage(messagesLeft, "ai", processCodeBlocks(data.reply || ""));
        applyTone("left", detectTone(data.reply || ""));
      } else {
        removeTyping(typingLeftId);
        appendMessage(
          messagesLeft,
          "ai",
          `<div class="alert alert-danger"><ion-icon name="alert-circle-outline"></ion-icon> Error from persona model.</div>`
        );
        applyTone("left", "technical");
      }

      // Right panel response
      if (vanillaRes.status === "fulfilled" && vanillaRes.value.ok) {
        const data = await vanillaRes.value.json();
        removeTyping(typingRightId);
        appendMessage(messagesRight, "ai", processCodeBlocks(data.reply || ""));
        applyTone("right", detectTone(data.reply || ""));
      } else {
        removeTyping(typingRightId);
        appendMessage(
          messagesRight,
          "ai",
          `<div class="alert alert-danger"><ion-icon name="alert-circle-outline"></ion-icon> Error from vanilla model.</div>`
        );
        applyTone("right", "technical");
      }
    } catch (err) {
      removeTyping(typingLeftId);
      removeTyping(typingRightId);
      appendMessage(
        messagesLeft,
        "ai",
        `<div class="alert alert-danger"><ion-icon name="alert-circle-outline"></ion-icon> ${err.message || "Request failed."}</div>`
      );
      appendMessage(
        messagesRight,
        "ai",
        `<div class="alert alert-danger"><ion-icon name="alert-circle-outline"></ion-icon> ${err.message || "Request failed."}</div>`
      );
    } finally {
      if (loadingLeft) loadingLeft.style.display = "none";
      if (loadingRight) loadingRight.style.display = "none";
    }
  }

  /* ======================
     Code formatting
  ====================== */
  function processCodeBlocks(text) {
    const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)\n```/g;
    return (text || "").replace(codeBlockRegex, (match, language, code) => {
      const lang = language || "plaintext";
      const safe = escapeHtml(code || "");
      return `
        <div class="highlighted-code" style="position:relative;">
          <pre><code class="language-${lang}">${safe}</code></pre>
          <button class="btn btn-sm btn-outline-secondary copy-btn" style="position:absolute; top:5px; right:5px;" onclick="copyCode(this)">
            <ion-icon name="copy-outline"></ion-icon>
          </button>
        </div>
      `;
    });
  }
  function escapeHtml(unsafe) {
    return (unsafe || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  window.copyCode = function (button) {
    const codeBlock = button.parentElement.querySelector("code");
    const text = codeBlock ? codeBlock.textContent : "";
    const prev = button.innerHTML;
    navigator.clipboard.writeText(text || "").then(() => {
      button.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon>';
      setTimeout(() => (button.innerHTML = prev), 1500);
    });
  };

  /* ======================
     Upload persona
  ====================== */
  if (uploadForm) {
    uploadForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!personaNameInput || !personaFilesInput) return;

      const rawName = (personaNameInput.value || "").trim();
      const files = personaFilesInput.files;
      if (!rawName || !files || !files.length) {
        if (uploadStatus) uploadStatus.textContent = "Please provide a persona name and at least one file.";
        return;
      }

      const formData = new FormData();
      formData.append("persona_name", rawName);
      [...files].forEach((f) => formData.append("files", f));

      try {
        if (uploadStatus) uploadStatus.textContent = "Uploading...";
        const res = await fetch("/upload_persona", { method: "POST", body: formData });
        if (!res.ok) throw new Error(`Upload failed (${res.status})`);
        const data = await res.json();

        currentPersonaName = data.persona || slugify(rawName);
        setPersonaTitle(currentPersonaName);

        if (offlineBadgeLeft) offlineBadgeLeft.style.display = "none";

        if (uploadStatus) {
          const filesList = (data.active_current_files || []).join(", ");
          uploadStatus.textContent = `Uploaded. Active files: ${filesList}`;
        }

        // Auto close modal (if Bootstrap present)
        const modalEl = document.getElementById("uploadPersonaModal");
        if (modalEl && window.bootstrap) {
          const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
          setTimeout(() => modal.hide(), 600);
        }
      } catch (err) {
        if (uploadStatus) uploadStatus.textContent = `Error: ${err.message || "Upload failed"}`;
      }
    });
  }

  /* ======================
     Clear button — clears BOTH panels & BOTH backend sessions
  ====================== */
  if (clearLeftBtn) {
    clearLeftBtn.addEventListener("click", async () => {
      if (messagesLeft) messagesLeft.innerHTML = "";
      if (messagesRight) messagesRight.innerHTML = "";
      try {
        await Promise.all([
          fetch("/clear", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ session_id: personaSessionId }),
          }),
          fetch("/clear", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ session_id: vanillaSessionId }),
          }),
        ]);
      } catch (_) {}
    });
  }

  /* ======================
     Input + chips + voice + image
  ====================== */
  if (sendBtn) {
    sendBtn.addEventListener("click", () => {
      const txt = (inputEl?.value || "").trim();
      if (!txt) return;
      sendMessage(txt);
      if (inputEl) {
        inputEl.value = "";
        inputEl.style.height = "auto";
      }
    });
  }

  if (inputEl) {
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const txt = (inputEl.value || "").trim();
        if (!txt) return;
        sendMessage(txt);
        inputEl.value = "";
        inputEl.style.height = "auto";
      }
    });
    inputEl.addEventListener("input", function () {
      if (suggestionChips) suggestionChips.style.display = "none";
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 200) + "px";
    });
    inputEl.addEventListener("focus", function () {
      if (inputEl.value.trim() !== "" && suggestionChips) suggestionChips.style.display = "none";
    });
    inputEl.addEventListener("blur", function () {
      if (inputEl.value.trim() === "" && suggestionChips) suggestionChips.style.display = "flex";
    });
  }

  if (suggestionChips) {
    suggestionChips.addEventListener("click", (e) => {
      const chip = e.target.closest(".suggestion-chip");
      if (!chip || !inputEl) return;
      inputEl.value = chip.innerText;
      inputEl.focus();
      inputEl.style.height = "auto";
      inputEl.style.height = Math.min(inputEl.scrollHeight, 200) + "px";
    });
  }

  // Voice (optional)
  let recognitionAPI = null;
  let isRecording = false;
  if (window.webkitSpeechRecognition || window.SpeechRecognition) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionAPI = new SpeechRecognition();
    recognitionAPI.continuous = false;
    recognitionAPI.interimResults = true;
    recognitionAPI.onresult = (event) => {
      if (!inputEl) return;
      const transcript = event.results[0][0].transcript;
      inputEl.value = transcript;
      inputEl.style.height = "auto";
      inputEl.style.height = Math.min(inputEl.scrollHeight, 200) + "px";
      if (suggestionChips) suggestionChips.style.display = "none";
    };
    recognitionAPI.onend = () => {
      if (voiceInputBtn) {
        voiceInputBtn.innerHTML = '<ion-icon name="mic-outline"></ion-icon>';
        voiceInputBtn.classList.remove("btn-danger");
      }
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

  // Image placeholder
  if (imageUploadBtn && imageInput) {
    imageUploadBtn.addEventListener("click", () => imageInput.click());
    imageInput.addEventListener("change", function () {
      if (this.files && this.files[0]) {
        appendMessage(messagesLeft, "user", "📷 [Image uploaded]");
        appendMessage(messagesRight, "user", "📷 [Image uploaded]");
      }
    });
  }
});
