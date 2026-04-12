import { RegisteredTaskHandler, TaskHandler } from "./types.ts";

export function createTaskHandler<Input, Output>(
  handler: TaskHandler<Input, Output>
): RegisteredTaskHandler<Input, Output> {
  return {
    handlerId: crypto.randomUUID(),
    handler,
  };
}
