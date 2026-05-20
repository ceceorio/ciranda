const entryView = document.querySelector("#entryView");
const roomView = document.querySelector("#roomView");
const joinForm = document.querySelector("#joinForm");
const participantName = document.querySelector("#participantName");
const roomName = document.querySelector("#roomName");
const activeRoomName = document.querySelector("#activeRoomName");
const connectionStatus = document.querySelector("#connectionStatus");
const localVideo = document.querySelector("#localVideo");
const remoteVideo = document.querySelector("#remoteVideo");
const localEmpty = document.querySelector("#localEmpty");
const remoteEmpty = document.querySelector("#remoteEmpty");
const localNameTag = document.querySelector("#localNameTag");
const participantCount = document.querySelector("#participantCount");
const participantList = document.querySelector("#participantList");
const roomLink = document.querySelector("#roomLink");
const copyLinkButton = document.querySelector("#copyLinkButton");
const chatMessages = document.querySelector("#chatMessages");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const micButton = document.querySelector("#micButton");
const cameraButton = document.querySelector("#cameraButton");
const screenButton = document.querySelector("#screenButton");
const captionButton = document.querySelector("#captionButton");
const translationSelect = document.querySelector("#translationSelect");
const voiceTranslationButton = document.querySelector("#voiceTranslationButton");
const leaveButton = document.querySelector("#leaveButton");
const remoteCaption = document.querySelector("#remoteCaption");

let roomId = "";
let peerId = "";
let localName = "";
let lastMessageId = "";
let localStream = null;
let remoteStream = null;
let screenStream = null;
let connection = null;
let pollTimer = null;
let recognition = null;
let makingOffer = false;
let ignoreOffer = false;
let polite = false;
let translationWarningShown = false;
let remoteCaptionSequence = 0;
let voiceTranslationEnabled = false;

const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const languageNames = {
  en: "Ingles",
  es: "Espanhol",
};

const speechLanguages = {
  off: "pt-BR",
  en: "en-US",
  es: "es-ES",
};

const initialRoom = new URLSearchParams(window.location.search).get("room");
if (initialRoom) {
  roomName.value = initialRoom;
}

function setStatus(text, state = "waiting") {
  connectionStatus.dataset.state = state;
  connectionStatus.lastChild.textContent = text;
}

function getRoomUrl(id = roomId) {
  const url = new URL(window.location.href);
  url.pathname = "/";
  url.searchParams.set("room", id);
  return url.toString();
}

function updateRoomLink() {
  if (!roomId) {
    roomLink.value = "";
    return;
  }

  const shareUrl = getRoomUrl();
  roomLink.value = shareUrl;
  window.history.replaceState({}, "", shareUrl);
}

async function copyRoomLink() {
  if (!roomLink.value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(roomLink.value);
    setStatus("Link da sala copiado.", "ready");
  } catch {
    roomLink.select();
    document.execCommand("copy");
    setStatus("Link da sala copiado.", "ready");
  }
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Algo deu errado.");
  }

  return data;
}

async function sendSignal(payload) {
  await api("/api/signal", {
    method: "POST",
    body: JSON.stringify({ roomId, from: peerId, payload }),
  });
}

function renderParticipants(participants = []) {
  participantList.textContent = "";
  participantCount.textContent = String(participants.length);

  for (const participant of participants) {
    const item = document.createElement("li");
    item.textContent = participant.id === peerId ? `${participant.name} (voce)` : participant.name;
    participantList.append(item);
  }
}

function resetChat() {
  chatMessages.textContent = "";
  const empty = document.createElement("p");
  empty.className = "chat-empty";
  empty.textContent = "A conversa da roda aparece aqui.";
  chatMessages.append(empty);
}

function addChatMessage({ name, text, own = false }) {
  chatMessages.querySelector(".chat-empty")?.remove();

  const message = document.createElement("article");
  message.className = own ? "chat-message own" : "chat-message";

  const author = document.createElement("span");
  author.className = "chat-author";
  author.textContent = own ? "Voce" : name;

  const content = document.createElement("span");
  content.className = "chat-text";
  content.textContent = text;

  message.append(author, content);
  chatMessages.append(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showCaption(text) {
  remoteCaption.textContent = text;
  remoteCaption.classList.remove("hidden");
  clearTimeout(showCaption.timer);
  showCaption.timer = setTimeout(() => {
    remoteCaption.classList.add("hidden");
    remoteCaption.textContent = "";
  }, 6500);
}

async function translateCaption(text) {
  const targetLanguage = translationSelect.value;
  if (targetLanguage === "off") {
    return { displayText: text, speechText: text, language: "pt-BR" };
  }

  try {
    if (!("Translator" in window)) {
      if (!translationWarningShown) {
        setStatus("Traducao indisponivel neste navegador.", "waiting");
        translationWarningShown = true;
      }
      return { displayText: text, speechText: text, language: "pt-BR" };
    }

    const translator = await window.Translator.create({
      sourceLanguage: "pt",
      targetLanguage,
    });
    const translated = await translator.translate(text);
    return {
      displayText: `${languageNames[targetLanguage]}: ${translated}`,
      speechText: translated,
      language: speechLanguages[targetLanguage],
    };
  } catch (error) {
    console.error(error);
    if (!translationWarningShown) {
      setStatus("Nao consegui traduzir esta legenda.", "waiting");
      translationWarningShown = true;
    }
    return { displayText: text, speechText: text, language: "pt-BR" };
  }
}

function speakCaption(text, language) {
  if (!voiceTranslationEnabled || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  window.speechSynthesis.speak(utterance);
}

async function showTranslatedCaption(text, sequence) {
  const translated = await translateCaption(text);
  if (sequence === remoteCaptionSequence) {
    showCaption(translated.displayText);
    speakCaption(translated.speechText, translated.language);
  }
}

async function getLocalStream() {
  if (localStream) {
    return localStream;
  }

  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  });
  return localStream;
}

function createConnection() {
  connection = new RTCPeerConnection(rtcConfig);
  remoteStream = new MediaStream();
  remoteVideo.srcObject = remoteStream;

  for (const track of localStream.getTracks()) {
    connection.addTrack(track, localStream);
  }

  connection.ontrack = (event) => {
    for (const track of event.streams[0].getTracks()) {
      remoteStream.addTrack(track);
    }
    remoteEmpty.classList.add("hidden");
    setStatus("Conectado.", "ready");
  };

  connection.onicecandidate = ({ candidate }) => {
    if (candidate) {
      sendSignal({ candidate }).catch(console.error);
    }
  };

  connection.onnegotiationneeded = async () => {
    try {
      makingOffer = true;
      await connection.setLocalDescription();
      await sendSignal({ description: connection.localDescription });
    } catch (error) {
      console.error(error);
      setStatus("Nao consegui negociar a chamada.", "error");
    } finally {
      makingOffer = false;
    }
  };

  connection.onconnectionstatechange = () => {
    if (connection.connectionState === "connected") {
      setStatus("Conectado.", "ready");
    }
    if (["failed", "disconnected", "closed"].includes(connection.connectionState)) {
      remoteEmpty.classList.remove("hidden");
      setStatus("A outra pessoa saiu ou a conexao caiu.", "waiting");
    }
  };
}

async function handleSignal({ payload, id, type }) {
  lastMessageId = id;

  if (type === "peer-joined") {
    setStatus("Alguem entrou na Ciranda. Conectando...", "waiting");
    return;
  }

  if (type === "peer-left") {
    remoteEmpty.classList.remove("hidden");
    setStatus("Alguem saiu da Ciranda.", "waiting");
    return;
  }

  if (!payload) {
    return;
  }

  try {
    if (payload.chat) {
      addChatMessage({ name: payload.chat.name || "Pessoa", text: payload.chat.text });
    } else if (payload.caption) {
      const sequence = (remoteCaptionSequence += 1);
      showTranslatedCaption(`${payload.caption.name}: ${payload.caption.text}`, sequence);
    } else if (payload.description) {
      const offerCollision =
        payload.description.type === "offer" &&
        (makingOffer || connection.signalingState !== "stable");

      ignoreOffer = !polite && offerCollision;
      if (ignoreOffer) {
        return;
      }

      await connection.setRemoteDescription(payload.description);

      if (payload.description.type === "offer") {
        await connection.setLocalDescription();
        await sendSignal({ description: connection.localDescription });
      }
    } else if (payload.candidate) {
      try {
        await connection.addIceCandidate(payload.candidate);
      } catch (error) {
        if (!ignoreOffer) {
          throw error;
        }
      }
    }
  } catch (error) {
    console.error(error);
    setStatus("Nao consegui completar a conexao.", "error");
  }
}

async function pollMessages() {
  if (!peerId || !roomId) {
    return;
  }

  try {
    const params = new URLSearchParams({ roomId, peerId, after: lastMessageId });
    const data = await api(`/api/messages?${params.toString()}`);
    renderParticipants(data.participants || []);
    for (const message of data.messages) {
      await handleSignal(message);
    }
  } catch (error) {
    console.error(error);
    setStatus("Problema ao falar com a sala local.", "error");
  }
}

async function enterRoom(event) {
  event.preventDefault();
  localName = participantName.value.trim();
  roomId = roomName.value.trim();

  if (!localName || !roomId) {
    return;
  }

  entryView.classList.add("hidden");
  roomView.classList.remove("hidden");
  activeRoomName.textContent = roomId;
  localNameTag.textContent = localName;
  updateRoomLink();
  resetChat();
  setStatus("Pedindo permissao de audio e video", "waiting");

  try {
    const stream = await getLocalStream();
    localVideo.srcObject = stream;
    localEmpty.classList.add("hidden");

    const data = await api("/api/join", {
      method: "POST",
      body: JSON.stringify({ roomId, name: localName }),
    });

    peerId = data.peerId;
    polite = data.peers > 1;
    createConnection();
    renderParticipants(data.participants || [{ id: peerId, name: localName }]);
    setStatus(data.peers > 1 ? "Conectando a roda..." : "Esperando a roda crescer...", "waiting");
    pollTimer = setInterval(pollMessages, 900);
    await pollMessages();
  } catch (error) {
    console.error(error);
    setStatus("Nao foi possivel acessar audio/video neste navegador.", "error");
  }
}

function toggleTrack(kind, button) {
  const tracks = localStream?.getTracks().filter((track) => track.kind === kind) || [];
  const enabled = tracks.some((track) => track.enabled);

  for (const track of tracks) {
    track.enabled = !enabled;
  }

  button.setAttribute("aria-pressed", String(enabled));
}

async function replaceVideoTrack(track) {
  const sender = connection?.getSenders().find((item) => item.track?.kind === "video");
  if (sender) {
    await sender.replaceTrack(track);
  }
}

async function toggleScreenShare() {
  if (screenStream) {
    const cameraTrack = localStream?.getVideoTracks()[0] || null;
    await replaceVideoTrack(cameraTrack);
    screenStream.getTracks().forEach((track) => track.stop());
    screenStream = null;
    localVideo.srcObject = localStream;
    screenButton.setAttribute("aria-pressed", "false");
    setStatus("Camera local ativa", "ready");
    return;
  }

  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const screenTrack = screenStream.getVideoTracks()[0];
    await replaceVideoTrack(screenTrack);
    localVideo.srcObject = screenStream;
    screenButton.setAttribute("aria-pressed", "true");
    setStatus("Compartilhando tela", "ready");
    screenTrack.addEventListener("ended", toggleScreenShare, { once: true });
  } catch (error) {
    console.error(error);
    setStatus("Compartilhamento cancelado", "waiting");
  }
}

async function sendChatMessage(event) {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text || !peerId) {
    return;
  }

  chatInput.value = "";
  addChatMessage({ name: localName, text, own: true });
  await sendSignal({ chat: { name: localName, text } });
}

function createSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return null;
  }

  const speech = new SpeechRecognition();
  speech.lang = "pt-BR";
  speech.continuous = true;
  speech.interimResults = true;

  speech.onresult = (event) => {
    let text = "";
    let hasFinal = false;

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      text += event.results[index][0].transcript;
      hasFinal = hasFinal || event.results[index].isFinal;
    }

    text = text.trim();
    if (text) {
      showCaption(`Voce: ${text}`);
    }

    if (text && hasFinal) {
      sendSignal({ caption: { name: localName, text } }).catch(console.error);
    }
  };

  speech.onerror = (event) => {
    const reason = event.error === "not-allowed" ? "Permissao de microfone bloqueada." : "As legendas nao conseguiram ouvir o microfone.";
    setStatus(reason, "error");
  };
  speech.onend = () => {
    if (captionButton.getAttribute("aria-pressed") === "true") {
      speech.start();
    }
  };

  return speech;
}

function toggleCaptions() {
  if (captionButton.getAttribute("aria-pressed") === "true") {
    recognition?.stop();
    captionButton.setAttribute("aria-pressed", "false");
    setStatus("Legendas desligadas.", "waiting");
    return;
  }

  recognition = recognition || createSpeechRecognition();
  if (!recognition) {
    setStatus("Seu navegador nao tem legendas automaticas nesta API.", "error");
    return;
  }

  try {
    recognition.start();
    captionButton.setAttribute("aria-pressed", "true");
    setStatus("Legendas ligadas. Fale para testar.", "ready");
  } catch (error) {
    console.error(error);
  }
}

function toggleVoiceTranslation() {
  voiceTranslationEnabled = !voiceTranslationEnabled;
  voiceTranslationButton.setAttribute("aria-pressed", String(voiceTranslationEnabled));

  if (!voiceTranslationEnabled && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  setStatus(voiceTranslationEnabled ? "Audio de traducao ligado." : "Audio de traducao desligado.", "waiting");
}

async function leaveRoom() {
  clearInterval(pollTimer);
  pollTimer = null;
  recognition?.stop();
  recognition = null;

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  if (peerId && roomId) {
    navigator.sendBeacon?.(
      "/api/leave",
      new Blob([JSON.stringify({ roomId, peerId })], { type: "application/json" }),
    );
  }

  connection?.close();
  connection = null;
  screenStream?.getTracks().forEach((track) => track.stop());
  localStream?.getTracks().forEach((track) => track.stop());
  screenStream = null;
  localStream = null;
  remoteStream = null;
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  localEmpty.classList.remove("hidden");
  remoteEmpty.classList.remove("hidden");
  micButton.setAttribute("aria-pressed", "false");
  cameraButton.setAttribute("aria-pressed", "false");
  screenButton.setAttribute("aria-pressed", "false");
  captionButton.setAttribute("aria-pressed", "false");
  voiceTranslationButton.setAttribute("aria-pressed", "false");
  voiceTranslationEnabled = false;
  peerId = "";
  lastMessageId = "";
  roomLink.value = "";
  resetChat();
  renderParticipants([]);
  roomView.classList.add("hidden");
  entryView.classList.remove("hidden");
}

resetChat();
joinForm.addEventListener("submit", enterRoom);
copyLinkButton.addEventListener("click", copyRoomLink);
micButton.addEventListener("click", () => toggleTrack("audio", micButton));
cameraButton.addEventListener("click", () => toggleTrack("video", cameraButton));
screenButton.addEventListener("click", toggleScreenShare);
chatForm.addEventListener("submit", sendChatMessage);
captionButton.addEventListener("click", toggleCaptions);
translationSelect.addEventListener("change", () => {
  translationWarningShown = false;
  setStatus("Preferencia de traducao atualizada.", "waiting");
});
voiceTranslationButton.addEventListener("click", toggleVoiceTranslation);
leaveButton.addEventListener("click", leaveRoom);
window.addEventListener("beforeunload", leaveRoom);
