# Observable Worker

`observable-worker` is a TypeScript library that provides a simple way to manage web workers and handle their tasks
using RxJS observables. This library allows you to dynamically add handlers to the worker and run tasks, receiving
responses as observables.

This has been designed and tested to work with a Vite React project, however it should work as long as the worker
correctly inlines the setup code.

## Installation

To install the library, use npm:

```sh
npm install observable-worker
```

## Usage

### Add task handlers

Task handlers define how a task is processed in the worker. You can create a task handler using the `createTaskHandler`
helper function:

A tasks name should be unique, and is used to identify the task in the worker.

Tasks can also return a promise, which will be resolved in the worker and sent back to the main thread as an observable.

```typescript
import { createTaskHandler } from "observable-worker";

// tasks.ts
export const fibonacci = createTaskHandler("fibonacci", (n: number) => {
  const fib = (n: number): number => {
    if (n <= 1) {
      return n;
    }
    return fib(n - 1) + fib(n - 2);
  };

  return fib(n);
});
```

### Setup worker

Create a file for the worker code. The `setupWorker` function initializes the worker and adds the task handlers:

```typescript
// worker.ts
import { setupWorker } from "observable-worker";
import { fibonacci } from "./tasks";

setupWorker([fibonacci]);
```

### Initialise using ObservableWorker

Initialise your worker, making sure to include `{ type: "module" }` in the worker constructor options. Then pass the
worker to the `ObservableWorker` constructor:

```typescript
import { ObservableWorker, WorkerHandler } from "observable-worker";
import { fibonacci } from "./tasks";

const worker = new Worker(new URL("/worker.ts", import.meta.url), { type: "module" });
const observableWorker = new ObservableWorker(worker);

const fibonacciTask = observableWorker
  .runTask(fibonacci, 10)
  .subscribe((result) => {
    console.log("Result:", result); // Output: Result: 55
  });
```

### Using in a Redux Observable Epic

You can use worker tasks inside Redux Observable epics to easily handle asynchronous tasks:

```typescript
// observableWorker.ts
const observableWorker = new ObservableWorker(new Worker(new URL("/worker.ts", import.meta.url), { type: "module" }));

// epics.ts
const doCalculationEpic: Epic = (action$) => action$.pipe(
  filter(startCalculation.match),
  mergeMap(() => observableWorker.runTask(fibonacci, 10)),
  map(setData)
);
````

### Setting Log Level

You can set the log level for the `ObservableWorker`:

```typescript
worker.setLogLevel(LogLevel.DEBUG);
```

### Terminating the Worker

To terminate the worker instance:

```typescript
worker.terminate();
```
