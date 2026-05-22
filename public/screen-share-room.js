const screenButton = document.querySelector("#screenButton");
const micButton = document.querySelector("#micButton");
const cameraButton = document.querySelector("#cameraButton");
const captionButton = document.querySelector("#captionButton");
const testCaptionButton = document.querySelector("#testCaptionButton");
const voiceTranslationButton = document.querySelector("#voiceTranslationButton");
const leaveButton = document.querySelector("#leaveButton");
const localVideo = document.querySelector("#localVideo");
const videoStage = document.querySelector(".video-stage");
const sidePanel = document.querySelector(".side-panel");

const style = document.createElement("style");
style.textContent = `
  .controls {
    position: sticky;
    bottom: 14px;
    z-index: 30;
    width: fit-content;
    max-width: min(100%, 980px);
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
    border: 1px solid rgba(255, 204, 0, 0.14);
    border-radius: 999px;
    background: rgba(5, 5, 5, 0.78);
    box-shadow: 0 18px 52px rgba(0, 0, 0, 0.38);
    padding: 10px 12px;
    backdrop-filter: blur(18px);
  }

  .control {
    min-width: 0;
    min-height: 44px;
    border: 1px solid rgba(255, 204, 0, 0.24);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.07);
    color: var(--text);
    padding: 0 15px;
    font-size: 13px;
    font-weight: 900;
    line-height: 1;
    white-space: nowrap;
  }

  .control.is-on {
    border-color: rgba(255, 204, 0, 0.64);
    background: rgba(255, 204, 0, 0.16);
    color: var(--yellow);
  }

  .control.is-off {
    border-color: rgba(228, 87, 87, 0.58);
    background: rgba(228, 87, 87, 0.16);
    color: #ffd9d9;
  }

  .control.danger {
    min-width: 78px;
    border-color: rgba(228, 87, 87, 0.7);
    background: linear-gradient(180deg, #dc625b, #d94d4d);
    color: #ffffff;
  }

  #voiceTranslationButton:not(.is-on) {
    color: var(--muted);
  }

  #testCaptionButton {
    color: var(--muted);
  }

  .side-panel .panel {
    transition: opacity 160ms ease, max-height 180ms ease;
  }

  .side-panel .panel-title {
    cursor: pointer;
    gap: 12px;
  }

  .side-panel .panel-title::after {
    content: "Recolher";
    margin-left: auto;
    color: var(--yellow);
    font-size: 11px;
    font-weight: 900;
  }

  .side-panel .panel.panel-collapsed > :not(.panel-title) {
    display: none !important;
  }

  .side-panel .panel.panel-collapsed .panel-title {
    margin-bottom: 0;
  }

  .side-panel .panel.panel-collapsed .panel-title::after {
    content: "Abrir";
  }

  .screen-share-tile {
    position: relative;
    min-width: 0;
    aspect-ratio: 16 / 10;
    overflow: hidden;
    border: 1px solid rgba(255, 204, 0, 0.42);
    border-radius: 24px;
    background: rgba(5, 5, 5, 0.84);
    box-shadow: var(--shadow);
  }

  .screen-share-tile video {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
    background: #050505;
  }

  .screen-share-tile .tile-name {
    left: 14px;
    bottom: 14px;
  }

  .screen-share-tile.hidden {
    display: none;
  }

  .video-stage.has-screen-share {
    grid-template-columns: minmax(220px, 0.8fr) minmax(320px, 1.35fr);
  }

  .video-stage.has-screen-share .screen-share-tile {
    grid-column: 1 / -1;
    aspect-ratio: 16 / 7.5;
  }

  @media (max-width: 900px) {
    .controls {
      position: static;
      width: 100%;
      border-radius: 22px;
      justify-content: stretch;
    }

    .control {
      flex: 1 1 calc(50% - 8px);
      padding: 0 10px;
    }

    .control.danger {
      flex-basis: 100%;
    }

    .video-stage.has-screen-share {
      grid-template-columns: 1fr;
    }

    .video-stage.has-screen-share .screen-share-tile {
      grid-column: auto;
      aspect-ratio: 16 / 10;
    }
  }
`;
document.head.append(style);

const controlLabels = new Map([
  [micButton, { on: "Mic ligado", off: "Mic desligado", onWhenPressed: false }],
  [cameraButton, { on: "Camera ligada", off: "Camera desligada", onWhenPressed: false }],
  [screenButton, { on: "Tela ativa", off: "Tela", onWhenPressed: true }],
  [captionButton, { on: "Legendas ligadas", off: "Legendas", onWhenPressed: true }],
  [voiceTranslationButton, { on: "Audio traducao", off: "Audio traducao", onWhenPressed: true }],
]);

function applyControlState(button, config) {
  if (!button || !config) return;
  const pressed = button.getAttribute("aria-pressed") === "true";
  const isOn = config.onWhenPressed ? pressed : !pressed;

  button.classList.toggle("is-on", isOn);
  button.classList.toggle("is-off", !isOn && button !== screenButton && button !== captionButton && button !== voiceTranslationButton);
  button.textContent = isOn ? config.on : config.off;
}

function updateControls() {
  for (const [button, config] of controlLabels.entries()) {
    applyControlState(button, config);
  }
  testCaptionButton && (testCaptionButton.textContent = "Teste legenda");
  leaveButton && (leaveButton.textContent = "Sair");
}

function observeControls() {
  updateControls();
  const observer = new MutationObserver(updateControls);
  for (const button of controlLabels.keys()) {
    if (button) observer.observe(button, { attributes: true, attributeFilter: ["aria-pressed"] });
  }
}

function makePanelsCollapsible() {
  if (!sidePanel) return;
  const panels = [...sidePanel.querySelectorAll(".panel")];

  for (const panel of panels) {
    const title = panel.querySelector(".panel-title") || panel.querySelector("h3");
    if (!title || title.dataset.toggleReady === "true") continue;

    title.dataset.toggleReady = "true";
    title.setAttribute("role", "button");
    title.setAttribute("tabindex", "0");
    title.addEventListener("click", () => panel.classList.toggle("panel-collapsed"));
    title.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        panel.classList.toggle("panel-collapsed");
      }
    });
  }
}

function ensureScreenTile() {
  let tile = document.querySelector("#screenShareTile");
  if (tile || !videoStage) return tile;

  tile = document.createElement("article");
  tile.id = "screenShareTile";
  tile.className = "screen-share-tile hidden";
  tile.innerHTML = `
    <video id="screenSharePreview" autoplay playsinline muted></video>
    <span class="tile-name">Tela compartilhada</span>
  `;
  videoStage.append(tile);
  return tile;
}

function showScreenShare(stream) {
  const tile = ensureScreenTile();
  const preview = document.querySelector("#screenSharePreview");
  if (!tile || !preview || !stream) return;

  preview.srcObject = stream;
  tile.classList.remove("hidden");
  videoStage?.classList.add("has-screen-share");
}

function hideScreenShare() {
  const tile = document.querySelector("#screenShareTile");
  const preview = document.querySelector("#screenSharePreview");
  if (preview) preview.srcObject = null;
  tile?.classList.add("hidden");
  videoStage?.classList.remove("has-screen-share");
}

function waitForScreenStream(cameraStream, startedAt = Date.now()) {
  const currentStream = localVideo?.srcObject;
  const isSharing = screenButton?.getAttribute("aria-pressed") === "true";

  if (currentStream && currentStream !== cameraStream && isSharing) {
    showScreenShare(currentStream);
    localVideo.srcObject = cameraStream;
    return;
  }

  if (!isSharing) {
    hideScreenShare();
    return;
  }

  if (Date.now() - startedAt < 15000) {
    window.setTimeout(() => waitForScreenStream(cameraStream, startedAt), 250);
  }
}

screenButton?.addEventListener(
  "click",
  () => {
    const cameraStream = localVideo?.srcObject || null;

    window.setTimeout(() => {
      if (screenButton.getAttribute("aria-pressed") === "false") {
        hideScreenShare();
        return;
      }

      waitForScreenStream(cameraStream);
    }, 50);
  },
  true,
);

observeControls();
makePanelsCollapsible();
window.addEventListener("beforeunload", hideScreenShare);
