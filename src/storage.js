const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const STORE_VERSION = 1;
const DATA_DIR = process.env.CIRANDA_DATA_DIR || path.join(__dirname, "..", "data");
const STORE_FILE = process.env.CIRANDA_STORE_FILE || path.join(DATA_DIR, "ciranda-store.json");

const emptyStore = {
  version: STORE_VERSION,
  video_rooms: [],
  video_room_members: [],
  video_sessions: [],
  video_session_participants: [],
  video_recordings: [],
  video_transcripts: [],
  video_captions: [],
};

function now() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify(emptyStore, null, 2));
  }
}

function readStore() {
  ensureStore();
  const data = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
  return { ...clone(emptyStore), ...data, version: STORE_VERSION };
}

function writeStore(data) {
  ensureStore();
  const payload = { ...clone(emptyStore), ...data, version: STORE_VERSION };
  const tmpFile = `${STORE_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(payload, null, 2));
  fs.renameSync(tmpFile, STORE_FILE);
  return payload;
}

function updateStore(mutator) {
  const store = readStore();
  const result = mutator(store);
  writeStore(store);
  return result;
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function uniqueSlug(store, desiredSlug, currentRoomId = null) {
  const base = slugify(desiredSlug) || `sala-${Date.now()}`;
  let candidate = base;
  let suffix = 2;

  while (store.video_rooms.some((room) => room.slug === candidate && room.id !== currentRoomId)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function listRooms() {
  const store = readStore();
  return store.video_rooms
    .slice()
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
    .map((room) => ({
      ...room,
      members_count: store.video_room_members.filter((member) => member.room_id === room.id).length,
      sessions_count: store.video_sessions.filter((session) => session.room_id === room.id).length,
    }));
}

function createRoom(input) {
  return updateStore((store) => {
    const timestamp = now();
    const name = String(input.name || "").trim().slice(0, 120);

    if (!name) {
      throw new Error("Informe o nome da sala.");
    }

    const room = {
      id: id("room"),
      slug: uniqueSlug(store, input.slug || name),
      name,
      description: String(input.description || "").trim().slice(0, 600),
      client_name: String(input.client_name || "").trim().slice(0, 160),
      project_name: String(input.project_name || "").trim().slice(0, 160),
      primary_language: String(input.primary_language || "pt-BR").slice(0, 16),
      caption_languages: Array.isArray(input.caption_languages) ? input.caption_languages.slice(0, 8) : ["pt-BR", "en"],
      recording_policy: String(input.recording_policy || "manual").slice(0, 32),
      drive_folder_id: String(input.drive_folder_id || "").trim().slice(0, 220),
      storage_status: input.drive_folder_id ? "drive_linked" : "local_pending_sync",
      is_active: true,
      created_at: timestamp,
      updated_at: timestamp,
    };

    store.video_rooms.push(room);
    return room;
  });
}

function getRoomBySlug(slug) {
  const store = readStore();
  const room = store.video_rooms.find((item) => item.slug === slug);

  if (!room) {
    return null;
  }

  return {
    ...room,
    members: store.video_room_members.filter((member) => member.room_id === room.id),
    sessions: store.video_sessions.filter((session) => session.room_id === room.id),
  };
}

function updateRoom(roomId, input) {
  return updateStore((store) => {
    const room = store.video_rooms.find((item) => item.id === roomId);

    if (!room) {
      throw new Error("Sala nao encontrada.");
    }

    if (input.name !== undefined) {
      const name = String(input.name || "").trim().slice(0, 120);
      if (!name) {
        throw new Error("Informe o nome da sala.");
      }
      room.name = name;
    }

    if (input.slug !== undefined) {
      room.slug = uniqueSlug(store, input.slug, room.id);
    }

    for (const field of ["description", "client_name", "project_name", "primary_language", "recording_policy", "drive_folder_id"]) {
      if (input[field] !== undefined) {
        room[field] = String(input[field] || "").trim().slice(0, 600);
      }
    }

    if (Array.isArray(input.caption_languages)) {
      room.caption_languages = input.caption_languages.slice(0, 8);
    }

    room.storage_status = room.drive_folder_id ? "drive_linked" : "local_pending_sync";
    room.updated_at = now();
    return room;
  });
}

function createSession(roomSlug, input = {}) {
  return updateStore((store) => {
    const room = store.video_rooms.find((item) => item.slug === roomSlug);

    if (!room) {
      throw new Error("Sala fixa nao encontrada.");
    }

    const timestamp = now();
    const session = {
      id: id("session"),
      room_id: room.id,
      room_slug: room.slug,
      technical_room_id: `${room.slug}-${crypto.randomUUID().slice(0, 8)}`,
      title: String(input.title || `Reuniao em ${new Date().toLocaleString("pt-BR")}`).slice(0, 160),
      status: "active",
      started_at: timestamp,
      ended_at: null,
      created_at: timestamp,
      updated_at: timestamp,
    };

    store.video_sessions.push(session);
    room.updated_at = timestamp;
    return session;
  });
}

function listSessions(roomSlug) {
  const store = readStore();
  const room = store.video_rooms.find((item) => item.slug === roomSlug);

  if (!room) {
    return [];
  }

  return store.video_sessions
    .filter((session) => session.room_id === room.id)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

function updateSession(sessionId, input) {
  return updateStore((store) => {
    const session = store.video_sessions.find((item) => item.id === sessionId);

    if (!session) {
      throw new Error("Sessao nao encontrada.");
    }

    Object.assign(session, input, { updated_at: now() });
    return session;
  });
}

function listRoomFiles(roomSlug) {
  const store = readStore();
  const room = store.video_rooms.find((item) => item.slug === roomSlug);

  if (!room) {
    return { recordings: [], transcripts: [], captions: [] };
  }

  const sessionIds = new Set(store.video_sessions.filter((session) => session.room_id === room.id).map((session) => session.id));

  return {
    recordings: store.video_recordings.filter((item) => sessionIds.has(item.session_id)),
    transcripts: store.video_transcripts.filter((item) => sessionIds.has(item.session_id)),
    captions: store.video_captions.filter((item) => sessionIds.has(item.session_id)),
  };
}

function createRecording(sessionId, input = {}) {
  return updateStore((store) => {
    const session = store.video_sessions.find((item) => item.id === sessionId);

    if (!session) {
      throw new Error("Sessao nao encontrada.");
    }

    const timestamp = now();
    const recording = {
      id: id("recording"),
      session_id: sessionId,
      provider: input.provider || "pending",
      status: input.status || "pending",
      local_path: input.local_path || "",
      drive_file_id: input.drive_file_id || "",
      error_message: input.error_message || "",
      started_at: timestamp,
      stopped_at: null,
      created_at: timestamp,
      updated_at: timestamp,
    };

    store.video_recordings.push(recording);
    return recording;
  });
}

function updateRecording(recordingId, input) {
  return updateStore((store) => {
    const recording = store.video_recordings.find((item) => item.id === recordingId);

    if (!recording) {
      throw new Error("Gravacao nao encontrada.");
    }

    Object.assign(recording, input, { updated_at: now() });
    return recording;
  });
}

module.exports = {
  createRecording,
  createRoom,
  createSession,
  getRoomBySlug,
  listRoomFiles,
  listRooms,
  listSessions,
  readStore,
  updateRecording,
  updateRoom,
  updateSession,
};
