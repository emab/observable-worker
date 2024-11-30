import { LogLevel, NamedTaskHandler } from "./types.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setupWorker(handlers: NamedTaskHandler<any, any>[], logLevel: LogLevel = LogLevel.INFO) {
  const handlerMap = new Map();
  for (const { name, handler } of handlers) {
    handlerMap.set(name, handler);
  }

  self.onmessage = async function(event: MessageEvent) {
    const { type, id, name, payload } = event.data;

    if (type === "runTask" && handlerMap.has(name)) {
      log(LogLevel.DEBUG, "Handler invoked:", type);
      const handler = handlerMap.get(name);
      const result = await handler!(payload);
      self.postMessage({ id, payload: result });
    } else {
      log(LogLevel.WARN, "Unrecognized message type or handler name:", type, name);
    }
  };

  log(LogLevel.INFO, "Worker setup complete with handlers:", Array.from(handlerMap.keys()));

  function log(level: LogLevel, ...args: unknown[]) {
    if (level <= logLevel) {
      console.log("[WORKER]", ...args);
    }
  }
}
