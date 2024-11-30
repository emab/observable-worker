import {  Observable, Subject } from "rxjs";
import { LogLevel, NamedTaskHandler, RunTaskMessage } from "./types";

export class ObservableWorker {
  private worker: Worker;
  private messageHandlers = new Map<string, Subject<unknown>>();
  private currentLogLevel: LogLevel = LogLevel.INFO;

  constructor(worker: Worker) {
    this.worker = worker;
    this.worker.onmessage = this.handleMessage.bind(this);
  }

  /**
   * Runs a task in the worker and returns an Observable for the response.
   */
  runTask<Input, Output>(
    task: NamedTaskHandler<Input, Output>,
    payload: Input
  ): Observable<Output> {
    const subject = new Subject<Output>();

    const id = this.generateUniqueId();
    this.messageHandlers.set(id, subject as Subject<unknown>);
    this.log(LogLevel.INFO, "Task started:", task.name, id);
    this.worker.postMessage({ type: "runTask", id, name: task.name, payload } satisfies RunTaskMessage);

    return subject.asObservable();
  }

  /**
   * Handles incoming messages from the worker.
   */
  private handleMessage(event: MessageEvent) {
    const { id, payload } = event.data;

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
}
