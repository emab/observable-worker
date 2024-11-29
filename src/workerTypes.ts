export type VersionMessage = {
  type: "version";
};
export type AddHandlerMessage = {
  type: "addHandler";
  payload: {
    handlerName: string;
    handlerFunction: string;
  };
};
export type SetLogLevelMessage = {
  type: "setLogLevel";
  payload: LogLevel;
};
export type RunTaskMessage = {
  type: 'runTask';
  id: string;
  name: string;
  payload: unknown;
}
export type ResponseMessage = {
  id: string;
  payload: unknown;
};

export type IncomingMessage = VersionMessage | AddHandlerMessage | SetLogLevelMessage | RunTaskMessage;

export enum LogLevel {
  NONE,
  WARN,
  INFO,
  DEBUG,
}