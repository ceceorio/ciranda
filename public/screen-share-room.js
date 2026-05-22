const screenButton = document.querySelector("#screenButton");
const localVideo = document.querySelector("#localVideo");
const videoStage = document.querySelector(".video-stage");

const style = document.createElement("style");
style.textContent = `
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

window.addEventListener("beforeunload", hideScreenShare);
