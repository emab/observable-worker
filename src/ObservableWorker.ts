import { from, Observable, Subject } from "rxjs";
import { AddHandlerMessage, LogLevel, RunTaskMessage, SetLogLevelMessage, VersionMessage } from "./workerTypes.ts";

export { LogLevel };

export type WorkerHandler<Input, Output> = (
  data: Input
) => Output | Promise<Output> | Observable<Output>;

export class ObservableWorker {
  private worker: Worker;
  private messageHandlers = new Map<string, Subject<unknown>>();
  private currentLogLevel: LogLevel = LogLevel.INFO;

  constructor(workerUrl: URL) {
    this.worker = new Worker(workerUrl, { type: "module" });
    this.worker.onmessage = this.handleMessage.bind(this);
    this.worker.postMessage({ type: "version" } satisfies VersionMessage);
  }

  /**
   * Adds a handler to the worker dynamically.
   */
  private addHandler<Input, Output>(
    name: string,
    handler: WorkerHandler<Input, Output>
  ) {
    const handlerString = handler.toString();
    this.worker.postMessage({
      type: "addHandler",
      payload: { handlerName: name, handlerFunction: handlerString }
    } satisfies AddHandlerMessage);
    this.log(LogLevel.INFO, "Handler added:", name);
  }

  /**
   * Runs a task in the worker and returns an Observable for the response.
   */
  private runTask<Input, Output>(
    handlerName: string,
    payload: Input
  ): Observable<Output> {
    const subject = new Subject<Output>();

    const id = this.generateUniqueId();
    this.messageHandlers.set(id, subject as Subject<unknown>);
    this.log(LogLevel.INFO, "Task started:", handlerName, id);
    this.worker.postMessage({ type: "runTask", id, name: handlerName, payload } satisfies RunTaskMessage);

    return subject.asObservable();
  }

  /**
   * Encapsulates the creation of a handler and its runner.
   */
  createWorkerTask<Input, Output>(
    name: string,
    handler: WorkerHandler<Input, Output>
  ): (payload: Input) => Observable<Output> {
    this.addHandler(name, handler);

    return (payload: Input): Observable<Output> => {
      const taskObservable = this.runTask<Input, Output>(name, payload);
      return from(taskObservable);
    };
  }

  /**
   * Handles incoming messages from the worker.
   */
  private handleMessage(event: MessageEvent) {
    const { id, type, payload } = event.data;

    if (type === "version") {
      this.log(LogLevel.INFO, "Worker version:", payload);
      if (payload !== __APP_VERSION__) {
        throw new Error(
          `ObservableWorker version mismatch! Expected ${__APP_VERSION__} but got ${payload}. Make sure the worker code is up to date.`
        );
      }
      return;
    }

    if (this.messageHandlers.has(id)) {
      const subject = this.messageHandlers.get(id)!;
      subject.next(payload);
      subject.complete();
      this.messageHandlers.delete(id);
      this.log(LogLevel.DEBUG, "Response received for task:", id);
    } else {
      this.log(LogLevel.WARN, "Unrecognized response ID:", id);
    }
  }

  /**
   * Generates a unique ID for request tracking.
   */
  private generateUniqueId() {
    return crypto.randomUUID();
  }

  /**
   * Terminates the worker instance.
   */
  terminate() {
    this.worker.terminate();
    this.log(LogLevel.INFO, "Worker terminated");
  }

  /**
   * Logs messages based on the current log level.
   */
  private log(level: LogLevel, ...args: unknown[]) {
    if (level <= this.currentLogLevel) {
      console.log("[MAIN]", ...args);
    }
  }

  /**
   * Sets the log level for the WorkerManager.
   */
  setLogLevel(level: LogLevel) {
    this.currentLogLevel = level;
    this.worker.postMessage({ type: "setLogLevel", payload: level } satisfies SetLogLevelMessage);
    this.log(
      LogLevel.INFO,
      "Log level set to:",
      LogLevel[this.currentLogLevel]
    );
  }
}
