import { createVideoProvider } from "./video-provider.js";

const entryView = document.querySelector("#entryView");
const roomView = document.querySelector("#roomView");
const joinForm = document.querySelector("#joinForm");
const participantName = document.querySelector("#participantName");
const roomName = document.querySelector("#roomName");
const activeRoomName = document.querySelector("#activeRoomName");
const connectionStatus = document.querySelector("#connectionStatus");
const localVideo = document.querySelector("#localVideo");
const localEmpty = document.querySelector("#localEmpty");
const localNameTag = document.querySelector("#localNameTag");
const participantCount = document.querySelector("#participantCount");
const participantList = document.querySelector("#participantList");
const providerStatus = document.querySelector("#providerStatus");
const micButton = document.querySelector("#micButton");
const cameraButton = document.querySelector("#cameraButton");
const screenButton = document.querySelector("#screenButton");
const leaveButton = document.querySelector("#leaveButton");

let localStream = null;
let screenStream = null;
let currentParticipantName = "";
let provider = createVideoProvider();

function setStatus(text, state = "waiting") {
  connectionStatus.dataset.state = state;
  connectionStatus.lastChild.textContent = text;
}

function renderParticipants() {
  participantList.textContent = "";
  const item = document.createElement("li");
  item.textContent = `${currentParticipantName} (voce)`;
  participantList.append(item);
  participantCount.textContent = "1";
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

async function enterRoom(event) {
  event.preventDefault();
  currentParticipantName = participantName.value.trim();
  const selectedRoom = roomName.value.trim();

  if (!currentParticipantName || !selectedRoom) {
    return;
  }

  entryView.classList.add("hidden");
  roomView.classList.remove("hidden");
  activeRoomName.textContent = selectedRoom;
  localNameTag.textContent = currentParticipantName;
  renderParticipants();
  setStatus("Pedindo permissao de audio e video", "waiting");

  try {
    const stream = await getLocalStream();
    localVideo.srcObject = stream;
    localEmpty.classList.add("hidden");

    await provider.connect({
      roomName: selectedRoom,
      participantName: currentParticipantName,
      localStream: stream,
    });

    providerStatus.textContent = provider.description;
    setStatus("Sala preparada para conexao de video", "ready");
  } catch (error) {
    console.error(error);
    setStatus("Nao foi possivel acessar audio/video neste navegador", "error");
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

async function toggleScreenShare() {
  if (screenStream) {
    screenStream.getTracks().forEach((track) => track.stop());
    screenStream = null;
    localVideo.srcObject = localStream;
    screenButton.setAttribute("aria-pressed", "false");
    setStatus("Camera local ativa", "ready");
    return;
  }

  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    localVideo.srcObject = screenStream;
    screenButton.setAttribute("aria-pressed", "true");
    setStatus("Compartilhando tela", "ready");
    screenStream.getVideoTracks()[0]?.addEventListener("ended", toggleScreenShare, { once: true });
  } catch (error) {
    console.error(error);
    setStatus("Compartilhamento cancelado", "waiting");
  }
}

async function leaveRoom() {
  await provider.disconnect();
  provider = createVideoProvider();

  screenStream?.getTracks().forEach((track) => track.stop());
  localStream?.getTracks().forEach((track) => track.stop());
  screenStream = null;
  localStream = null;
  localVideo.srcObject = null;
  localEmpty.classList.remove("hidden");

  micButton.setAttribute("aria-pressed", "false");
  cameraButton.setAttribute("aria-pressed", "false");
  screenButton.setAttribute("aria-pressed", "false");
  roomView.classList.add("hidden");
  entryView.classList.remove("hidden");
}

joinForm.addEventListener("submit", enterRoom);
micButton.addEventListener("click", () => toggleTrack("audio", micButton));
cameraButton.addEventListener("click", () => toggleTrack("video", cameraButton));
screenButton.addEventListener("click", toggleScreenShare);
leaveButton.addEventListener("click", leaveRoom);
