import { NamedTaskHandler, TaskHandler } from "./types.ts";

export function createTaskHandler<Input, Output>(
  name: string,
  handler: TaskHandler<Input, Output>
): NamedTaskHandler<Input, Output> {
  return {
    name,
    handler,
  };
}
