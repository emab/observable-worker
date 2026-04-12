import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ObservableWorker } from "./ObservableWorker";

type WorkerMock = {
    onmessage: ((event: MessageEvent) => void) | null;
    postMessage: ReturnType<typeof vi.fn>;
    terminate: ReturnType<typeof vi.fn>;
};

function createWorkerMock(): WorkerMock {
    return {
        onmessage: null,
        postMessage: vi.fn(),
        terminate: vi.fn(),
    };
}

describe("ObservableWorker", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("posts a runTask message and emits the worker response", () => {
        const worker = createWorkerMock();
        vi.stubGlobal("crypto", {
            randomUUID: vi.fn(() => "task-1"),
        } as Partial<Crypto>);

        const observableWorker = new ObservableWorker(worker as unknown as Worker);

        const next = vi.fn();
        const complete = vi.fn();

        observableWorker
            .runTask({ handlerId: "test-handler" }, { value: 123 })
            .subscribe({
                next,
                complete,
            });

        expect(worker.postMessage).toHaveBeenCalledTimes(1);
        expect(worker.postMessage).toHaveBeenCalledWith({
            type: "runTask",
            id: "task-1",
            handlerId: "test-handler",
            payload: { value: 123 },
        });

        worker.onmessage?.({
            data: { id: "task-1", payload: { ok: true } },
        } as MessageEvent);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith({ ok: true });
        expect(complete).toHaveBeenCalledTimes(1);
    });

    it("routes multiple task responses to the correct subscribers", () => {
        const worker = createWorkerMock();
        vi.stubGlobal("crypto", {
            randomUUID: vi
                .fn()
                .mockReturnValueOnce("task-1")
                .mockReturnValueOnce("task-2"),
        } as Partial<Crypto>);

        const observableWorker = new ObservableWorker(worker as unknown as Worker);

        const next1 = vi.fn();
        const complete1 = vi.fn();
        const next2 = vi.fn();
        const complete2 = vi.fn();

        observableWorker.runTask({ handlerId: "first" }, "a").subscribe({
            next: next1,
            complete: complete1,
        });

        observableWorker.runTask({ handlerId: "second" }, "b").subscribe({
            next: next2,
            complete: complete2,
        });

        expect(worker.postMessage).toHaveBeenNthCalledWith(1, {
            type: "runTask",
            id: "task-1",
            handlerId: "first",
            payload: "a",
        });

        expect(worker.postMessage).toHaveBeenNthCalledWith(2, {
            type: "runTask",
            id: "task-2",
            handlerId: "second",
            payload: "b",
        });

        worker.onmessage?.({
            data: { id: "task-2", payload: "response-2" },
        } as MessageEvent);

        expect(next1).not.toHaveBeenCalled();
        expect(complete1).not.toHaveBeenCalled();
        expect(next2).toHaveBeenCalledWith("response-2");
        expect(complete2).toHaveBeenCalledTimes(1);

        worker.onmessage?.({
            data: { id: "task-1", payload: "response-1" },
        } as MessageEvent);

        expect(next1).toHaveBeenCalledWith("response-1");
        expect(complete1).toHaveBeenCalledTimes(1);
    });

    it("does not emit duplicate responses for the same task id", () => {
        const worker = createWorkerMock();
        vi.stubGlobal("crypto", {
            randomUUID: vi.fn(() => "task-1"),
        } as Partial<Crypto>);

        const observableWorker = new ObservableWorker(worker as unknown as Worker);

        const next = vi.fn();
        const complete = vi.fn();

        observableWorker.runTask({ handlerId: "once" }, null).subscribe({
            next,
            complete,
        });

        worker.onmessage?.({
            data: { id: "task-1", payload: "first-response" },
        } as MessageEvent);

        worker.onmessage?.({
            data: { id: "task-1", payload: "second-response" },
        } as MessageEvent);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith("first-response");
        expect(complete).toHaveBeenCalledTimes(1);
    });

    it("assigns the worker onmessage handler in the constructor", () => {
        const worker = createWorkerMock();

        new ObservableWorker(worker as unknown as Worker);

        expect(worker.onmessage).toBeTypeOf("function");
    });

    it("terminates the underlying worker", () => {
        const worker = createWorkerMock();
        const observableWorker = new ObservableWorker(worker as unknown as Worker);

        observableWorker.terminate();

        expect(worker.terminate).toHaveBeenCalledTimes(1);
    });

    it("logs a warning for unrecognized response IDs", () => {
        const worker = createWorkerMock();
        const consoleSpy = vi.spyOn(console, "log");
        
        const observableWorker = new ObservableWorker(worker as unknown as Worker);

        worker.onmessage?.({
            data: { id: "unknown-task-id", payload: "response" },
        } as MessageEvent);

        expect(consoleSpy).toHaveBeenCalledWith(
            "[MAIN]",
            "Unrecognized response ID:",
            "unknown-task-id"
        );
        
        consoleSpy.mockRestore();
    });

    it("handles null or undefined payload in worker response", () => {
        const worker = createWorkerMock();
        vi.stubGlobal("crypto", {
            randomUUID: vi.fn(() => "task-1"),
        } as Partial<Crypto>);

        const observableWorker = new ObservableWorker(worker as unknown as Worker);

        const next = vi.fn();
        const complete = vi.fn();

        observableWorker.runTask({ handlerId: "test" }, null).subscribe({
            next,
            complete,
        });

        worker.onmessage?.({
            data: { id: "task-1", payload: null },
        } as MessageEvent);

        expect(next).toHaveBeenCalledWith(null);
        expect(complete).toHaveBeenCalledTimes(1);
    });

    it("handles multiple unrecognized response IDs without affecting valid tasks", () => {
        const worker = createWorkerMock();
        vi.stubGlobal("crypto", {
            randomUUID: vi.fn(() => "task-1"),
        } as Partial<Crypto>);

        const observableWorker = new ObservableWorker(worker as unknown as Worker);

        const next = vi.fn();
        const complete = vi.fn();

        observableWorker.runTask({ handlerId: "valid" }, "data").subscribe({
            next,
            complete,
        });

        worker.onmessage?.({
            data: { id: "invalid-1", payload: "ignored" },
        } as MessageEvent);

        worker.onmessage?.({
            data: { id: "task-1", payload: "valid-response" },
        } as MessageEvent);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith("valid-response");
        expect(complete).toHaveBeenCalledTimes(1);
    });
});