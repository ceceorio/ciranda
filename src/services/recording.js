const storage = require("../storage");

async function startRecording(sessionId) {
  const recording = storage.createRecording(sessionId, {
    provider: "abstract",
    status: "pending_provider",
  });

  console.warn("[ciranda:recording] Recording provider is not configured yet.", {
    recording_id: recording.id,
    session_id: sessionId,
  });

  return {
    ...recording,
    message: "Arquitetura de gravacao preparada. Provedor real ainda nao configurado.",
  };
}

async function stopRecording(recordingId) {
  const recording = storage.updateRecording(recordingId, {
    status: "stopped_pending_provider",
    stopped_at: new Date().toISOString(),
  });

  return {
    ...recording,
    message: "Gravacao marcada como parada. Arquivo real ainda depende de provedor.",
  };
}

module.exports = {
  startRecording,
  stopRecording,
};
