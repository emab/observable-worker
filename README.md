# Observable Worker

`observable-worker` is a TypeScript library that provides a simple way to manage web workers and handle their tasks
using RxJS observables. This library allows you to dynamically add handlers to the worker and run tasks, receiving
responses as observables.

## Installation

To install the library, use npm:

```sh
npm install observable-worker
```

## Usage

### Add worker code

The worker code needs to be added to your applications `public` directory. There are two ways of doing this:

1. Manually copy the worker code from the `dist` folder to the `public` directory. This method is not recommended as it
   requires manual intervention every time the worker package is updated.
2. Use a plugin like `rollup-plugin-copy` to automatically copy these files to the `public` directory.

E.g.

```typescript
import { defineConfig } from "vite";
import copy from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [
    copy({
      targets: [
        {
          src: "node_modules/observable-worker/dist/worker.js",
          dest: "public",
        },
      ],
      hook: "buildStart",
    }),
  ],
});
```

### Using the ObservableWorker

Create an instance of `ObservableWorker` and use it to add handlers and run tasks:

```typescript
import { ObservableWorker, WorkerHandler } from "observable-worker";

const worker = new ObservableWorker(new URL("/worker.js", import.meta.url));

const handler: WorkerHandler<number, number> = (data) => {
  return data * 2;
};

worker.createWorkerTask("double", handler);

const task$ = worker
  .runTask<number, number>("double", 5)
  .subscribe((result) => {
    console.log("Result:", result); // Output: Result: 10
  });
```

### Using in a Redux Observable Epic

You can use worker tasks inside Redux Observable epics to easily handle asynchronous tasks:

```typescript
// observableWorker.ts
const observableWorker = new ObservableWorker(new URL("/worker.js", import.meta.url));

export const fibTask = observableWorker.createWorkerTask("fibonacci", (n: number) => {
  const fib = (n: number): number => {
    if (n <= 1) {
      return n;
    }
    return fib(n - 1) + fib(n - 2);
  };

  return fib(n);
});

// epics.ts
const doCalculationEpic: Epic = (action$) => action$.pipe(
  filter(startCalculation.match),
  mergeMap(() => fibTask(20)),
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
