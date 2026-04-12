import { LogLevel, RegisteredTaskHandler, RunTaskMessage } from "./types.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setupWorker(handlers: RegisteredTaskHandler<any, any>[], logLevel: LogLevel = LogLevel.INFO) {
  const handlerMap = new Map();
  for (const { handlerId, handler } of handlers) {
    handlerMap.set(handlerId, handler);
  }

  self.onmessage = async function(event: MessageEvent<RunTaskMessage>) {
    const { type, id, handlerId, payload } = event.data;

    if (type === "runTask" && handlerMap.has(handlerId)) {
      log(LogLevel.DEBUG, "Handler invoked:", type, handlerId);
      const handler = handlerMap.get(handlerId);
      const result = await handler!(payload);
      self.postMessage({ id, payload: result });
    } else {
      log(LogLevel.WARN, "Unrecognized message type or handler:", type, handlerId);
    }
  };

  log(LogLevel.INFO, "Worker setup complete with handlers:", Array.from(handlerMap.keys()));

  function log(level: LogLevel, ...args: unknown[]) {
    if (level <= logLevel) {
      console.log("[WORKER]", ...args);
    }
  }
}
