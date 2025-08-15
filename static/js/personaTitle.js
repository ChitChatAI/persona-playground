// Active persona (persist between reloads)
let ACTIVE_PERSONA = localStorage.getItem("activePersona") || "Persona";

const personaTitleEl = document.getElementById("personaTitle");

// Capitalize helper
function titleize(name) {
  return (name || "persona")
    .split(/[\s-_]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Apply active persona name to the header
function applyPersonaTitle() {
  if (personaTitleEl) personaTitleEl.textContent = titleize(ACTIVE_PERSONA);
}

// Call once on load
applyPersonaTitle();
