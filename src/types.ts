import { Observable } from "rxjs";

export type TaskHandler<Input, Output> = (data: Input) => Output | Promise<Output> | Observable<Output>;
export type NamedTaskHandler<Input, Output> = {
  name: string;
  handler: (data: Input) => Output | Promise<Output> | Observable<Output>;
}

export type RunTaskMessage = {
  type: "runTask";
  id: string;
  name: string;
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