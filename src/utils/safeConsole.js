const SENSITIVE_LOG_PATTERNS = [
  "Closing session: SessionEntry",
  "SessionEntry",
  "currentRatchet",
  "pendingPreKey",
  "remoteIdentityKey",
  "ephemeralKeyPair",
  "privKey",
  "rootKey",
  "chainKey",
  "messageKeys",
  "_chains",
  "registrationId",
  "lastRemoteEphemeralKey",
  "baseKey",
  "signedKeyId",
  "preKeyId"
];

function safeToText(args) {
  return args
    .map((arg) => {
      if (typeof arg === "string") return arg;

      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");
}

function isSensitiveBaileysLog(args) {
  const text = safeToText(args);

  return SENSITIVE_LOG_PATTERNS.some((pattern) => text.includes(pattern));
}

export function installSafeConsoleFilter() {
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalDebug = console.debug;

  console.log = (...args) => {
    if (isSensitiveBaileysLog(args)) return;
    originalLog(...args);
  };

  console.info = (...args) => {
    if (isSensitiveBaileysLog(args)) return;
    originalInfo(...args);
  };

  console.warn = (...args) => {
    if (isSensitiveBaileysLog(args)) return;
    originalWarn(...args);
  };

  console.error = (...args) => {
    if (isSensitiveBaileysLog(args)) return;
    originalError(...args);
  };

  console.debug = (...args) => {
    if (isSensitiveBaileysLog(args)) return;
    originalDebug(...args);
  };
}