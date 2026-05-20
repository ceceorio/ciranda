const captionStylesheet = document.createElement("link");
captionStylesheet.rel = "stylesheet";
captionStylesheet.href = "/captions-room.css?v=20260520-1";
document.head.append(captionStylesheet);

const captionPanel = document.querySelector(".caption-health");
const translationSelect = document.querySelector("#translationSelect");
const translationControl = document.querySelector(".translation-control");
const remoteCaption = document.querySelector("#remoteCaption");
const localTile = document.querySelector(".video-tile.local");
const captionButton = document.querySelector("#captionButton");
const testCaptionButton = document.querySelector("#testCaptionButton");

window.CIRANDA_CAPTION_SOURCE_LANGUAGE = window.CIRANDA_CAPTION_SOURCE_LANGUAGE || "pt-BR";

function shortLanguage(language) {
  return String(language || "pt-BR").split("-")[0];
}

function patchSpeechAndTranslationProviders() {
  const OriginalSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (OriginalSpeechRecognition && !window.CIRANDA_SPEECH_PATCHED) {
    class CirandaSpeechRecognition extends OriginalSpeechRecognition {
      start() {
        this.lang = window.CIRANDA_CAPTION_SOURCE_LANGUAGE || "pt-BR";
        return super.start();
      }
    }

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
      text: "Este navegador nao expõe reconhecimento de fala para a pagina. Teste no Chrome atualizado.",
    };
  }

  if (!hasTranslator) {
    return {
      title: "Legendas ativas, traducao experimental",
      text: "O Chrome pode captar fala. A traducao automatica depende da API Translator do navegador ou de um provedor futuro no servidor.",
    };
  }

  return {
    title: "Legendas e traducao disponiveis",
    text: "Este navegador expõe reconhecimento de fala e traducao local experimental.",
  };
}

function appendCaptionLog(text, kind = "Legenda") {
  const list = document.querySelector("#captionLogList");
  if (!list || !text.trim()) return;

  const empty = list.querySelector(".fixed-empty");
  empty?.remove();

  const item = document.createElement("article");
  item.className = "caption-log-item";

  const label = document.createElement("span");
  label.textContent = `${kind} · ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

  const content = document.createElement("p");
  content.textContent = text.trim();

  item.append(label, content);
  list.prepend(item);

  while (list.children.length > 12) {
    list.lastElementChild.remove();
  }
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

function buildLocalCaptionBubble() {
  if (!localTile || document.querySelector("#localCaption")) return;
  const localCaption = document.createElement("p");
  localCaption.id = "localCaption";
  localCaption.className = "caption-bubble local-caption hidden";
  localTile.append(localCaption);
}

function watchCaptionBubble() {
  if (!remoteCaption) return;
  let lastText = "";
  const observer = new MutationObserver(() => {
    const text = remoteCaption.textContent.trim();
    if (!text || text === lastText || remoteCaption.classList.contains("hidden")) return;
    lastText = text;
    appendCaptionLog(text, text.startsWith("Voce") ? "Minha legenda" : "Legenda remota");

    const localCaption = document.querySelector("#localCaption");
    if (localCaption && text.startsWith("Voce")) {
      localCaption.textContent = text;
      localCaption.classList.remove("hidden");
      clearTimeout(watchCaptionBubble.timer);
      watchCaptionBubble.timer = setTimeout(() => localCaption.classList.add("hidden"), 5200);
    }
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
buildCaptionInterface();
buildLocalCaptionBubble();
watchCaptionBubble();
