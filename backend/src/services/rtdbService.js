const socketConfig = require("../config/socket");

// In-memory state replacing Firebase RTDB
const liveState = {
  rvm_status: {},
  processing_status: {},
  rvm_display: {},
  system_status: {}
};

function broadcast() {
  const io = socketConfig.getIo();
  if (io) {
    io.emit("liveState", liveState);
  }
}

async function setRvmStatus(rvmCode, data) {
  liveState.rvm_status[rvmCode] = {
    ...(liveState.rvm_status[rvmCode] || {}),
    ...data,
    last_seen_at: data.last_seen_at || new Date().toISOString(),
  };
  broadcast();
}

async function setProcessingStatus(rvmCode, data) {
  liveState.processing_status[rvmCode] = {
    ...data,
    updated_at: new Date().toISOString(),
  };
  broadcast();
}

async function clearProcessingStatus(rvmCode) {
  delete liveState.processing_status[rvmCode];
  broadcast();
}

async function setRvmDisplayContent(rvmCode, content) {
  liveState.rvm_display[rvmCode] = {
    ...content,
    updated_at: new Date().toISOString(),
  };
  broadcast();
}

async function setSystemStatus(data) {
  liveState.system_status = {
    ...liveState.system_status,
    ...data,
    updated_at: new Date().toISOString(),
  };
  broadcast();
}

async function getLiveSnapshot() {
  return liveState;
}

module.exports = {
  setRvmStatus,
  setProcessingStatus,
  clearProcessingStatus,
  setRvmDisplayContent,
  setSystemStatus,
  getLiveSnapshot,
};
