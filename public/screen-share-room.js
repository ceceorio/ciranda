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
const roomLayout = document.querySelector(".room-layout");

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

  #voiceTranslationButton:not(.is-on),
  #testCaptionButton {
    color: var(--muted);
  }

  .room-layout.drawer-closed {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .side-panel.drawer-mode {
    width: 360px;
    max-width: 34vw;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 12px;
    align-content: stretch;
  }

  .room-layout.drawer-closed .side-panel.drawer-mode {
    width: auto;
    max-width: none;
  }

  .side-tabs {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
    gap: 7px;
    border: 1px solid rgba(255, 204, 0, 0.14);
    border-radius: 999px;
    background: rgba(5, 5, 5, 0.64);
    padding: 7px;
  }

  .side-tab,
  .side-close {
    min-height: 38px;
    border: 1px solid transparent;
    border-radius: 999px;
    background: transparent;
    color: var(--muted);
    padding: 0 10px;
    font-size: 12px;
    font-weight: 900;
    white-space: nowrap;
  }

  .side-tab.active {
    border-color: rgba(255, 204, 0, 0.55);
    background: rgba(255, 204, 0, 0.16);
    color: var(--yellow);
  }

  .side-close {
    border-color: rgba(255, 255, 255, 0.1);
    color: var(--text);
  }

  .side-panel.drawer-mode .panel {
    display: none;
    min-height: 0;
    max-height: calc(100vh - 250px);
    overflow: auto;
  }

  .side-panel.drawer-mode .panel.active-drawer {
    display: block;
  }

  .side-panel.drawer-mode .panel-title,
  .side-panel.drawer-mode .chat-panel > h3 {
    cursor: default;
  }

  .side-panel.drawer-mode .panel-title::after {
    content: none;
  }

  .side-panel.drawer-mode.drawer-hidden {
    width: auto;
  }

  .side-panel.drawer-mode.drawer-hidden .panel {
    display: none !important;
  }

  .side-panel.drawer-mode.drawer-hidden .side-tabs {
    grid-template-columns: auto;
    border-radius: 18px;
  }

  .side-panel.drawer-mode.drawer-hidden .side-tab {
    display: none;
  }

  .side-panel.drawer-mode.drawer-hidden .side-close {
    writing-mode: vertical-rl;
    min-height: 130px;
    border-color: rgba(255, 204, 0, 0.28);
    color: var(--yellow);
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

    .room-layout,
    .room-layout.drawer-closed {
      grid-template-columns: 1fr;
    }

    .side-panel.drawer-mode {
      width: 100%;
      max-width: none;
    }

    .side-panel.drawer-mode .panel {
      max-height: none;
    }

    .side-tabs {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      border-radius: 22px;
    }

    .side-close {
      grid-column: 1 / -1;
    }

    .side-panel.drawer-mode.drawer-hidden .side-close {
      writing-mode: horizontal-tb;
      min-height: 44px;
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

function labelPanel(panel) {
  if (panel.classList.contains("share-panel")) return { key: "link", label: "Link" };
  if (panel.classList.contains("caption-health")) return { key: "captions", label: "Legendas" };
  if (panel.classList.contains("chat-panel")) return { key: "chat", label: "Chat" };
  return { key: "people", label: "Pessoas" };
}

function activateDrawer(key) {
  if (!sidePanel) return;
  sidePanel.classList.remove("drawer-hidden");
  roomLayout?.classList.remove("drawer-closed");

  sidePanel.querySelectorAll(".side-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.drawer === key);
  });

  sidePanel.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.toggle("active-drawer", panel.dataset.drawer === key);
  });

  const closeButton = sidePanel.querySelector(".side-close");
  if (closeButton) closeButton.textContent = "Fechar";
}

function closeDrawer() {
  sidePanel?.classList.add("drawer-hidden");
  roomLayout?.classList.add("drawer-closed");
  sidePanel?.querySelectorAll(".side-tab").forEach((button) => button.classList.remove("active"));
  sidePanel?.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active-drawer"));
  const closeButton = sidePanel?.querySelector(".side-close");
  if (closeButton) closeButton.textContent = "Abrir painel";
}

function makeDrawerTabs() {
  if (!sidePanel || sidePanel.dataset.drawerReady === "true") return;
  sidePanel.dataset.drawerReady = "true";
  sidePanel.classList.add("drawer-mode");

  const panels = [...sidePanel.querySelectorAll(".panel")];
  const tabs = document.createElement("nav");
  tabs.className = "side-tabs";
  tabs.setAttribute("aria-label", "Painel da sala");

  for (const panel of panels) {
    const config = labelPanel(panel);
    panel.dataset.drawer = config.key;
    panel.classList.remove("panel-collapsed");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "side-tab";
    button.dataset.drawer = config.key;
    button.textContent = config.label;
    button.addEventListener("click", () => activateDrawer(config.key));
    tabs.append(button);
  }

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "side-close";
  closeButton.textContent = "Fechar";
  closeButton.addEventListener("click", () => {
    if (sidePanel.classList.contains("drawer-hidden")) {
      activateDrawer("people");
    } else {
      closeDrawer();
    }
  });
  tabs.append(closeButton);

  sidePanel.prepend(tabs);
  activateDrawer("people");
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
makeDrawerTabs();
window.addEventListener("beforeunload", hideScreenShare);
