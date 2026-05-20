function getDriveStatus(room) {
  if (!room?.drive_folder_id) {
    return {
      configured: false,
      status: "local_pending_sync",
      message: "Sala sem pasta do Google Drive vinculada.",
    };
  }

  return {
    configured: true,
    status: "drive_linked",
    drive_folder_id: room.drive_folder_id,
    message: "Pasta do Google Drive vinculada. Upload sera conectado em entrega futura.",
  };
}

async function uploadArtifact() {
  return {
    uploaded: false,
    status: "pending_provider",
    message: "Google Drive ainda nao foi conectado. Artefato marcado para sincronizacao futura.",
  };
}

module.exports = {
  getDriveStatus,
  uploadArtifact,
};
