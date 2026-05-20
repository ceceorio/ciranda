export function createVideoProvider() {
  return {
    name: "direct-webrtc",
    description: "Modo inicial: estrutura preparada para WebRTC direto, sem SDK externo.",
    async connect({ roomName, participantName }) {
      console.info("[Ciranda] Direct WebRTC provider prepared", {
        roomName,
        participantName,
      });
    },
    async disconnect() {
      console.info("[Ciranda] Direct WebRTC provider disconnected");
    },
  };
}
