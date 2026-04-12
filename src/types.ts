import { Observable } from "rxjs";

export type TaskHandler<Input, Output> = (data: Input) => Output | Promise<Output> | Observable<Output>;
export type RegisteredTaskHandler<Input, Output> = {
  handlerId: string;
  handler: TaskHandler<Input, Output>;
};

export type RunTaskMessage = {
  type: "runTask";
  id: string;
  handlerId: string;
  payload: unknown;
}

export type TaskResponseMessage = {
  id: string;
  payload: unknown;
};

export enum LogLevel {
  NONE,
  WARN,
  INFO,
  DEBUG,
}