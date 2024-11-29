import { IncomingMessage, LogLevel, ResponseMessage } from "./workerTypes.ts";

type HandlerFunction = (payload: unknown) => unknown | Promise<unknown>;


const handlers = new Map<string, HandlerFunction>();
let currentLogLevel: LogLevel = LogLevel.INFO;

self.onmessage = (event: MessageEvent<IncomingMessage>) => {
  const {  type } = event.data;

  if (type === "version") {
    self.postMessage({ type: "version", payload: __APP_VERSION__ });
  }
  if (type === "addHandler") {
    const { handlerName, handlerFunction } = event.data.payload;
    const deserializedFunction = new Function(
      `return ${handlerFunction}`,
    )() as HandlerFunction;
    handlers.set(handlerName, deserializedFunction);
    log(LogLevel.INFO, "Handler added:", handlerName);
  } else if (type === "setLogLevel") {
    currentLogLevel = event.data.payload;
    log(LogLevel.INFO, "Log level set to:", LogLevel[currentLogLevel]);
  } else if (event.data.type === 'runTask' && handlers.has(type)) {
    const id = event.data.id;
    log(LogLevel.DEBUG, "Handler invoked:", type);
    const result = handlers.get(type)!(event.data.payload);
    if (result instanceof Promise) {
      result.then((response) => sendResponse(id, response));
    } else {
      sendResponse(id, result);
    }
  } else {
    log(LogLevel.WARN, "Unrecognized message type:", type);
  }
};

function sendResponse(id: string, response: unknown) {
  log(LogLevel.DEBUG, "Sending response:", response);
  self.postMessage({ id, payload: response } satisfies ResponseMessage);
}

function log(level: LogLevel, ...args: unknown[]) {
  if (level <= currentLogLevel) {
    console.log("[WORKER]", ...args);
  }
}
