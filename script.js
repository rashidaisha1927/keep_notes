const STORAGE_KEY = "keep-notes-app-notes";
const THEME_KEY = "keep-notes-app-theme";

const elements = {
  themeToggle: document.querySelector("#themeToggle"),
  themeIcon: document.querySelector("#themeIcon"),
  newNoteButton: document.querySelector("#newNoteButton"),
  searchInput: document.querySelector("#searchInput"),
  pinnedList: document.querySelector("#pinnedList"),
  otherList: document.querySelector("#otherList"),
  pinnedCount: document.querySelector("#pinnedCount"),
  otherCount: document.querySelector("#otherCount"),
  emptyList: document.querySelector("#emptyList"),
  createdDay: document.querySelector("#createdDay"),
  createdDate: document.querySelector("#createdDate"),
  pinButton: document.querySelector("#pinButton"),
  deleteButton: document.querySelector("#deleteButton"),
  editorCard: document.querySelector("#editorCard"),
  titleInput: document.querySelector("#titleInput"),
  bodyInput: document.querySelector("#bodyInput"),
  saveStatus: document.querySelector("#saveStatus"),
  updatedAt: document.querySelector("#updatedAt")
};

let notes = loadNotes();
let activeNoteId = notes[0]?.id || null;
let saveTimer = null;

function loadNotes() {
  try {
    const savedNotes = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(savedNotes) ? savedNotes : [];
  } catch {
    return [];
  }
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  elements.saveStatus.textContent = "Saved locally";
}

function createNote() {
  const now = new Date().toISOString();
  const note = {
    id: createId(),
    title: "",
    body: "",
    pinned: false,
    createdAt: now,
    updatedAt: now
  };

  notes.unshift(note);
  activeNoteId = note.id;
  saveNotes();
  render();
  elements.titleInput.focus();
}

function formatDay(dateValue) {
  return new Intl.DateTimeFormat("en", { weekday: "long" }).format(new Date(dateValue));
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(dateValue));
}

function formatTime(dateValue) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(dateValue));
}

function getActiveNote() {
  return notes.find((note) => note.id === activeNoteId) || null;
}

function sortNotes(noteGroup) {
  return [...noteGroup].sort((first, second) => new Date(second.updatedAt) - new Date(first.updatedAt));
}

function getFilteredNotes() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const filtered = query
    ? notes.filter((note) => {
        const title = note.title.toLowerCase();
        const body = note.body.toLowerCase();
        return title.includes(query) || body.includes(query);
      })
    : notes;

  return {
    pinned: sortNotes(filtered.filter((note) => note.pinned)),
    other: sortNotes(filtered.filter((note) => !note.pinned))
  };
}

function renderNoteCard(note) {
  const button = document.createElement("button");
  const title = note.title.trim() || "Untitled note";
  const preview = note.body.trim() || "No note text yet.";

  button.type = "button";
  button.className = `note-card${note.id === activeNoteId ? " active" : ""}${note.pinned ? " pinned" : ""}`;
  button.dataset.noteId = note.id;
  button.innerHTML = `
    <div class="note-card-title">
      <h2>${escapeHtml(title)}</h2>
      ${note.pinned ? '<span class="pin-badge">Pinned</span>' : ""}
    </div>
    <p class="note-preview">${escapeHtml(preview)}</p>
    <div class="note-meta">
      <span>${formatDay(note.createdAt)}</span>
      <span>${formatDate(note.createdAt)}</span>
    </div>
  `;

  button.addEventListener("click", () => {
    activeNoteId = note.id;
    render();
  });

  return button;
}

function renderNoteList(target, noteGroup) {
  target.replaceChildren();
  noteGroup.forEach((note) => target.appendChild(renderNoteCard(note)));
}

function renderSidebar() {
  const { pinned, other } = getFilteredNotes();

  renderNoteList(elements.pinnedList, pinned);
  renderNoteList(elements.otherList, other);

  elements.pinnedCount.textContent = pinned.length;
  elements.otherCount.textContent = other.length;
  elements.emptyList.classList.toggle("visible", notes.length > 0 && pinned.length + other.length === 0);
}

function renderEditor() {
  const note = getActiveNote();
  const hasNote = Boolean(note);

  elements.editorCard.classList.toggle("disabled", !hasNote);
  elements.pinButton.classList.toggle("disabled", !hasNote);
  elements.deleteButton.classList.toggle("disabled", !hasNote);
  elements.pinButton.disabled = !hasNote;
  elements.deleteButton.disabled = !hasNote;
  elements.titleInput.disabled = !hasNote;
  elements.bodyInput.disabled = !hasNote;

  if (!note) {
    elements.createdDay.textContent = "No note selected";
    elements.createdDate.textContent = "Create a note to begin";
    elements.titleInput.value = "";
    elements.bodyInput.value = "";
    elements.pinButton.textContent = "Pin";
    elements.pinButton.classList.remove("active");
    elements.updatedAt.textContent = "";
    return;
  }

  elements.createdDay.textContent = formatDay(note.createdAt);
  elements.createdDate.textContent = formatDate(note.createdAt);
  elements.titleInput.value = note.title;
  elements.bodyInput.value = note.body;
  elements.pinButton.textContent = note.pinned ? "Unpin" : "Pin";
  elements.pinButton.classList.toggle("active", note.pinned);
  elements.updatedAt.textContent = `Edited ${formatDate(note.updatedAt)} at ${formatTime(note.updatedAt)}`;
}

function render() {
  renderSidebar();
  renderEditor();
}

function updateActiveNote(changes, refreshEditor = false) {
  const note = getActiveNote();
  if (!note) return;

  Object.assign(note, changes, { updatedAt: new Date().toISOString() });
  elements.saveStatus.textContent = "Saving...";
  elements.updatedAt.textContent = `Edited ${formatDate(note.updatedAt)} at ${formatTime(note.updatedAt)}`;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveNotes();
    if (refreshEditor) {
      render();
    } else {
      renderSidebar();
    }
  }, 250);
}

function deleteActiveNote() {
  const note = getActiveNote();
  if (!note) return;

  const shouldDelete = window.confirm("Delete this note?");
  if (!shouldDelete) return;

  notes = notes.filter((item) => item.id !== note.id);
  activeNoteId = notes[0]?.id || null;
  saveNotes();
  render();
}

function togglePin() {
  const note = getActiveNote();
  if (!note) return;

  updateActiveNote({ pinned: !note.pinned }, true);
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  elements.themeIcon.textContent = theme === "dark" ? "Light" : "Dark";
  elements.themeToggle.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
}

function initializeTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  applyTheme(savedTheme || preferredTheme);
}

elements.newNoteButton.addEventListener("click", createNote);
elements.searchInput.addEventListener("input", render);
elements.titleInput.addEventListener("input", (event) => updateActiveNote({ title: event.target.value }));
elements.bodyInput.addEventListener("input", (event) => updateActiveNote({ body: event.target.value }));
elements.pinButton.addEventListener("click", togglePin);
elements.deleteButton.addEventListener("click", deleteActiveNote);
elements.themeToggle.addEventListener("click", () => {
  const currentTheme = document.documentElement.dataset.theme || "light";
  applyTheme(currentTheme === "dark" ? "light" : "dark");
});

initializeTheme();

if (notes.length === 0) {
  createNote();
} else {
  render();
}
