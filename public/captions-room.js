const captionStylesheet = document.createElement("link");
captionStylesheet.rel = "stylesheet";
captionStylesheet.href = "/captions-room.css?v=20260520-2";
document.head.append(captionStylesheet);

const captionPanel = document.querySelector(".caption-health");
const translationSelect = document.querySelector("#translationSelect");
const translationControl = document.querySelector(".translation-control");
const remoteCaption = document.querySelector("#remoteCaption");
const videoStage = document.querySelector(".video-stage");
const captionButton = document.querySelector("#captionButton");
const testCaptionButton = document.querySelector("#testCaptionButton");

window.CIRANDA_CAPTION_SOURCE_LANGUAGE = window.CIRANDA_CAPTION_SOURCE_LANGUAGE || "pt-BR";

function shortLanguage(language) {
  return String(language || "pt-BR").split("-")[0];
}

function cleanCaptionText(text) {
  return String(text || "")
    .replace(/^Voce traduzido:\s*/i, "Voce: ")
    .replace(/^Voce:\s*/i, "Voce: ")
    .trim();
}

function captionKind(text) {
  return cleanCaptionText(text).startsWith("Voce:") ? "Minha legenda" : "Legenda remota";
}

function patchSpeechAndTranslationProviders() {
  const OriginalSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (OriginalSpeechRecognition && !window.CIRANDA_SPEECH_PATCHED) {
    function CirandaSpeechRecognition() {
      const recognition = new OriginalSpeechRecognition();
      const originalStart = recognition.start.bind(recognition);
      recognition.start = () => {
        recognition.lang = window.CIRANDA_CAPTION_SOURCE_LANGUAGE || "pt-BR";
        return originalStart();
      };
      return recognition;
    }

    CirandaSpeechRecognition.prototype = OriginalSpeechRecognition.prototype;
    window.SpeechRecognition = CirandaSpeechRecognition;
    window.webkitSpeechRecognition = CirandaSpeechRecognition;
    window.CIRANDA_SPEECH_PATCHED = true;
  }

  if (window.Translator?.create && !window.CIRANDA_TRANSLATOR_PATCHED) {
    const originalCreate = window.Translator.create.bind(window.Translator);
    window.Translator.create = (options = {}) => originalCreate({
      ...options,
      sourceLanguage: shortLanguage(window.CIRANDA_CAPTION_SOURCE_LANGUAGE),
    });
    window.CIRANDA_TRANSLATOR_PATCHED = true;
  }
}

function detectCaptionProvider() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const hasSpeech = Boolean(SpeechRecognition);
  const hasTranslator = "Translator" in window;

  if (!hasSpeech) {
    return {
      title: "Legendas indisponiveis",
      text: "Este navegador nao expoe reconhecimento de fala para a pagina. Teste no Chrome atualizado.",
    };
  }

  if (!hasTranslator) {
    return {
      title: "Legendas ativas, traducao experimental",
      text: "O Chrome pode captar fala. A traducao automatica precisa da API Translator do navegador ou de um provedor futuro no servidor.",
    };
  }

  return {
    title: "Legendas e traducao do navegador",
    text: "O navegador informa suporte experimental. Se a traducao falhar, sera necessario plugar um provedor no backend.",
  };
}

function appendCaptionLog(text, kind = "Legenda") {
  const list = document.querySelector("#captionLogList");
  const value = cleanCaptionText(text);
  if (!list || !value) return;

  const empty = list.querySelector(".fixed-empty");
  empty?.remove();

  const item = document.createElement("article");
  item.className = "caption-log-item";

  const label = document.createElement("span");
  label.textContent = `${kind} · ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

  const content = document.createElement("p");
  content.textContent = value;

  item.append(label, content);
  list.prepend(item);

  while (list.children.length > 10) {
    list.lastElementChild.remove();
  }
}

function buildCaptionDock() {
  if (!videoStage || document.querySelector("#roomCaptionDock")) return;

  const dock = document.createElement("div");
  dock.id = "roomCaptionDock";
  dock.className = "room-caption-dock";
  dock.innerHTML = `
    <article class="room-caption-card hidden" id="roomCaptionCard">
      <span id="roomCaptionSpeaker">Legenda</span>
      <p id="roomCaptionText"></p>
    </article>
  `;
  videoStage.append(dock);
}

function showDockCaption(text, kind = "Legenda") {
  const card = document.querySelector("#roomCaptionCard");
  const label = document.querySelector("#roomCaptionSpeaker");
  const content = document.querySelector("#roomCaptionText");
  const value = cleanCaptionText(text);
  if (!card || !label || !content || !value) return;

  label.textContent = kind;
  content.textContent = value.replace(/^Voce:\s*/i, "");
  card.classList.remove("hidden");
  clearTimeout(showDockCaption.timer);
  showDockCaption.timer = setTimeout(() => card.classList.add("hidden"), 6500);
}

function buildCaptionInterface() {
  if (!captionPanel || captionPanel.dataset.enhanced === "true") return;
  captionPanel.dataset.enhanced = "true";
  captionPanel.classList.add("enhanced");

  translationControl?.classList.add("compact-hidden");

  const provider = detectCaptionProvider();
  const existingDiagnostics = captionPanel.querySelector("dl");

  const toolbar = document.createElement("div");
  toolbar.className = "caption-toolbar";

  const sourceLabel = document.createElement("label");
  sourceLabel.textContent = "Idioma falado";
  const sourceSelect = document.createElement("select");
  sourceSelect.id = "captionSourceSelect";
  sourceSelect.innerHTML = `
    <option value="pt-BR">Portugues Brasil</option>
    <option value="en-US">Ingles</option>
    <option value="es-ES">Espanhol</option>
  `;
  sourceSelect.value = window.CIRANDA_CAPTION_SOURCE_LANGUAGE;
  sourceLabel.append(sourceSelect);

  const targetLabel = document.createElement("label");
  targetLabel.textContent = "Legenda traduzida";
  const targetSelect = document.createElement("select");
  targetSelect.id = "captionTargetSelect";
  targetSelect.innerHTML = `
    <option value="off">Sem traducao</option>
    <option value="en">Ingles</option>
    <option value="es">Espanhol</option>
  `;
  targetSelect.value = translationSelect?.value || "off";
  targetLabel.append(targetSelect);

  const providerBox = document.createElement("div");
  providerBox.className = "caption-provider";
  providerBox.innerHTML = `<strong>${provider.title}</strong><span>${provider.text}</span>`;

  toolbar.append(sourceLabel, targetLabel, providerBox);

  const log = document.createElement("div");
  log.className = "caption-log";
  log.innerHTML = `
    <header>
      <h4>Historico ao vivo</h4>
      <button type="button" id="clearCaptionLogButton">Limpar</button>
    </header>
    <div class="caption-log-list" id="captionLogList">
      <p class="fixed-empty">As legendas captadas aparecem aqui durante a reuniao.</p>
    </div>
  `;

  existingDiagnostics?.before(toolbar);
  captionPanel.append(log);

  targetSelect.addEventListener("change", () => {
    if (!translationSelect) return;
    translationSelect.value = targetSelect.value;
    translationSelect.dispatchEvent(new Event("change", { bubbles: true }));
  });

  translationSelect?.addEventListener("change", () => {
    targetSelect.value = translationSelect.value;
  });

  sourceSelect.addEventListener("change", () => {
    window.CIRANDA_CAPTION_SOURCE_LANGUAGE = sourceSelect.value;
    appendCaptionLog(`Idioma falado definido para ${sourceSelect.selectedOptions[0].textContent}. Ligue as legendas novamente se elas ja estiverem ativas.`, "Sistema");
  });

  document.querySelector("#clearCaptionLogButton")?.addEventListener("click", () => {
    const list = document.querySelector("#captionLogList");
    list.textContent = "";
    const empty = document.createElement("p");
    empty.className = "fixed-empty";
    empty.textContent = "As legendas captadas aparecem aqui durante a reuniao.";
    list.append(empty);
  });
}

function watchCaptionBubble() {
  if (!remoteCaption) return;
  let lastText = "";
  const observer = new MutationObserver(() => {
    const text = cleanCaptionText(remoteCaption.textContent);
    if (!text || text === lastText) return;
    lastText = text;
    const kind = captionKind(text);
    appendCaptionLog(text, kind);
    showDockCaption(text, kind);
    remoteCaption.classList.add("hidden");
  });

  observer.observe(remoteCaption, { characterData: true, childList: true, subtree: true, attributes: true });
}

captionButton?.addEventListener("click", () => {
  setTimeout(() => {
    if (captionButton.getAttribute("aria-pressed") === "true") {
      appendCaptionLog("Legendas ligadas. Fale perto do microfone para testar a captacao.", "Sistema");
    }
  }, 200);
});

testCaptionButton?.addEventListener("click", () => {
  appendCaptionLog("Teste manual disparado para conferir posicionamento, traducao e latencia visual.", "Sistema");
});

patchSpeechAndTranslationProviders();
buildCaptionDock();
buildCaptionInterface();
watchCaptionBubble();
