async function transcribeSession(sessionId) {
  console.warn("[ciranda:transcription] Transcription provider is not configured yet.", {
    session_id: sessionId,
  });

  return {
    status: "pending_provider",
    session_id: sessionId,
    message: "Transcricao preparada para provedor futuro.",
  };
}

async function translateTranscript(transcriptId, targetLanguage) {
  console.warn("[ciranda:translation] Translation provider is not configured yet.", {
    transcript_id: transcriptId,
    target_language: targetLanguage,
  });

  return {
    status: "pending_provider",
    transcript_id: transcriptId,
    target_language: targetLanguage,
    message: "Traducao preparada para provedor futuro.",
  };
}

module.exports = {
  transcribeSession,
  translateTranscript,
};
