const fixedRoomsView = document.querySelector("#fixedRoomsView");
const entryView = document.querySelector("#entryView");
const roomView = document.querySelector("#roomView");
const fixedRoomList = document.querySelector("#fixedRoomList");
const fixedRoomForm = document.querySelector("#fixedRoomForm");
const refreshRoomsButton = document.querySelector("#refreshRoomsButton");
const fixedRoomDetail = document.querySelector("#fixedRoomDetail");
const fixedRoomDetailName = document.querySelector("#fixedRoomDetailName");
const fixedRoomDetailSlug = document.querySelector("#fixedRoomDetailSlug");
const fixedRoomDetailDescription = document.querySelector("#fixedRoomDetailDescription");
const fixedParticipantName = document.querySelector("#fixedParticipantName");
const enterFixedRoomButton = document.querySelector("#enterFixedRoomButton");
const settingsRoomName = document.querySelector("#settingsRoomName");
const settingsRoomDescription = document.querySelector("#settingsRoomDescription");
const settingsRecordingPolicy = document.querySelector("#settingsRecordingPolicy");
const settingsDriveFolderId = document.querySelector("#settingsDriveFolderId");
const driveStatusText = document.querySelector("#driveStatusText");
const fixedSessionList = document.querySelector("#fixedSessionList");
const fixedFileList = document.querySelector("#fixedFileList");
const fixedTabs = document.querySelectorAll("[data-fixed-tab]");
const backToRoomsButton = document.querySelector("#backToRoomsButton");
const joinForm = document.querySelector("#joinForm");
const participantName = document.querySelector("#participantName");
const roomName = document.querySelector("#roomName");

let fixedRooms = [];
let currentRoom = null;

function show(view) {
  fixedRoomsView?.classList.toggle("hidden", view !== "fixed");
  entryView?.classList.toggle("hidden", view !== "entry");
  roomView?.classList.toggle("hidden", view !== "room");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Nao foi possivel concluir a acao.");
  }

  return data;
}

function empty(target, text) {
  target.textContent = "";
  const message = document.createElement("p");
  message.className = "fixed-empty";
  message.textContent = text;
  target.append(message);
}

function roomUrl(slug) {
  return `/rooms/${encodeURIComponent(slug)}`;
}

function setTab(name) {
  for (const button of fixedTabs) {
    const active = button.dataset.fixedTab === name;
    button.setAttribute("aria-pressed", String(active));
  }

  for (const panel of document.querySelectorAll(".fixed-tab-panel")) {
    panel.classList.toggle("hidden", panel.id !== `fixedTab${name[0].toUpperCase()}${name.slice(1)}`);
  }
}

function renderRooms() {
  fixedRoomList.textContent = "";

  if (!fixedRooms.length) {
    empty(fixedRoomList, "Nenhuma sala fixa criada ainda.");
    return;
  }

  for (const room of fixedRooms) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "fixed-room-item";
    item.dataset.slug = room.slug;

    const title = document.createElement("strong");
    title.textContent = room.name;

    const meta = document.createElement("span");
    meta.textContent = `${room.client_name || "Sem cliente"} · ${room.sessions_count || 0} sessoes`;

    item.append(title, meta);
    item.addEventListener("click", () => selectRoom(room.slug));
    fixedRoomList.append(item);
  }
}

async function loadRooms() {
  const data = await api("/api/fixed-rooms");
  fixedRooms = data.rooms || [];
  renderRooms();
  return fixedRooms;
}

function renderSessions(sessions) {
  fixedSessionList.textContent = "";

  if (!sessions.length) {
    empty(fixedSessionList, "Nenhuma reuniao registrada nesta sala ainda.");
    return;
  }

  for (const session of sessions) {
    const item = document.createElement("article");
    item.className = "history-item";

    const title = document.createElement("strong");
    title.textContent = session.title;

    const meta = document.createElement("span");
    meta.textContent = `${session.status} · ${new Date(session.started_at).toLocaleString("pt-BR")}`;

    item.append(title, meta);
    fixedSessionList.append(item);
  }
}

function renderFiles(files) {
  fixedFileList.textContent = "";
  const groups = [
    ["Gravacoes", files.recordings || []],
    ["Transcricoes", files.transcripts || []],
    ["Legendas", files.captions || []],
  ];
  const total = groups.reduce((sum, [, list]) => sum + list.length, 0);

  if (!total) {
    empty(fixedFileList, "Arquivos de gravacao, transcricao e legenda aparecerao aqui.");
    return;
  }

  for (const [label, list] of groups) {
    for (const file of list) {
      const item = document.createElement("article");
      item.className = "history-item";

      const title = document.createElement("strong");
      title.textContent = label;

      const meta = document.createElement("span");
      meta.textContent = file.status || "pendente";

      item.append(title, meta);
      fixedFileList.append(item);
    }
  }
}

async function selectRoom(slug) {
  const data = await api(`/api/fixed-rooms/${encodeURIComponent(slug)}`);
  currentRoom = data.room;

  fixedRoomDetail.classList.remove("hidden");
  fixedRoomDetailName.textContent = currentRoom.name;
  fixedRoomDetailSlug.textContent = roomUrl(currentRoom.slug);
  fixedRoomDetailDescription.textContent = currentRoom.description || "Sala permanente para encontros da Ciranda.";
  settingsRoomName.value = currentRoom.name;
  settingsRoomDescription.value = currentRoom.description || "";
  settingsRecordingPolicy.value = currentRoom.recording_policy || "manual";
  settingsDriveFolderId.value = currentRoom.drive_folder_id || "";
  driveStatusText.textContent = data.drive?.message || "Google Drive ainda nao configurado.";

  document.querySelectorAll(".fixed-room-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.slug === slug);
  });

  window.history.replaceState({}, "", roomUrl(currentRoom.slug));
  setTab("enter");
  loadSessions();
  loadFiles();
}

async function loadSessions() {
  if (!currentRoom) return;
  const data = await api(`/api/fixed-rooms/${encodeURIComponent(currentRoom.slug)}/sessions`);
  renderSessions(data.sessions || []);
}

async function loadFiles() {
  if (!currentRoom) return;
  const data = await api(`/api/fixed-rooms/${encodeURIComponent(currentRoom.slug)}/files`);
  renderFiles(data.files || {});
}

async function createRoom(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const body = {
    name: form.querySelector("#fixedRoomName").value,
    slug: form.querySelector("#fixedRoomSlug").value,
    client_name: form.querySelector("#fixedRoomClient").value,
    project_name: form.querySelector("#fixedRoomProject").value,
    description: form.querySelector("#fixedRoomDescription").value,
  };

  const data = await api("/api/fixed-rooms", {
    method: "POST",
    body: JSON.stringify(body),
  });

  form.reset();
  await loadRooms();
  await selectRoom(data.room.slug);
}

async function saveSettings(event) {
  event.preventDefault();
  if (!currentRoom) return;

  const data = await api(`/api/fixed-rooms/${encodeURIComponent(currentRoom.slug)}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: settingsRoomName.value,
      description: settingsRoomDescription.value,
      recording_policy: settingsRecordingPolicy.value,
      drive_folder_id: settingsDriveFolderId.value,
    }),
  });

  await loadRooms();
  await selectRoom(data.room.slug);
}

async function enterRoom() {
  if (!currentRoom) return;
  const name = fixedParticipantName.value.trim() || "Convidado";
  const data = await api(`/api/fixed-rooms/${encodeURIComponent(currentRoom.slug)}/sessions`, {
    method: "POST",
    body: JSON.stringify({ title: currentRoom.name }),
  });

  participantName.value = name;
  roomName.value = data.session.technical_room_id;
  show("entry");
  joinForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

async function boot() {
  if (new URLSearchParams(window.location.search).has("room")) {
    show("entry");
    return;
  }

  show("fixed");
  await loadRooms();

  const [, first, slug] = window.location.pathname.split("/");
  if (first === "rooms" && slug) {
    await selectRoom(decodeURIComponent(slug));
  }
}

fixedRoomForm?.addEventListener("submit", createRoom);
document.querySelector("#fixedTabSettings")?.addEventListener("submit", saveSettings);
document.querySelector("#fixedTabDrive")?.addEventListener("submit", saveSettings);
refreshRoomsButton?.addEventListener("click", loadRooms);
enterFixedRoomButton?.addEventListener("click", enterRoom);
backToRoomsButton?.addEventListener("click", () => {
  window.history.replaceState({}, "", "/");
  show("fixed");
});
fixedTabs.forEach((button) => button.addEventListener("click", () => setTab(button.dataset.fixedTab)));

boot().catch((error) => {
  console.error("[ciranda:fixed-rooms]", error);
  show("fixed");
  empty(fixedRoomList, "Nao foi possivel carregar as salas fixas agora.");
});
