import { describe, it, expect } from "@jest/globals";
import { withRetry } from "../lib/retry.js";

describe("withRetry", () => {
  it("should return result on first successful attempt", async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      return "success";
    };

    const result = await withRetry(fn, "test");

    expect(result).toBe("success");
    expect(callCount).toBe(1);
  });

  it("should retry on failure and succeed", async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error(`fail ${callCount}`);
      }
      return "success";
    };

    const result = await withRetry(fn, "test", { delayMs: 10 });

    expect(result).toBe("success");
    expect(callCount).toBe(3);
  });

  it("should throw after max attempts exceeded", async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      throw new Error("always fails");
    };

    await expect(
      withRetry(fn, "test", { maxAttempts: 2, delayMs: 10 })
    ).rejects.toThrow("always fails");

    expect(callCount).toBe(2);
  });

  it("should call onRetry callback on each retry", async () => {
    let callCount = 0;
    let retryCount = 0;
    const fn = async () => {
      callCount++;
      if (callCount < 2) {
        throw new Error("fail");
      }
      return "success";
    };

    const onRetry = () => {
      retryCount++;
    };

    await withRetry(fn, "test", { delayMs: 10, onRetry });

    expect(retryCount).toBe(1);
  });

  it("should apply exponential backoff", async () => {
    let callCount = 0;
    const timestamps: number[] = [];

    const fn = async () => {
      timestamps.push(Date.now());
      callCount++;
      if (callCount < 3) {
        throw new Error(`fail ${callCount}`);
      }
      return "success";
    };

    await withRetry(fn, "test", {
      delayMs: 50,
      backoffMultiplier: 2,
    });

    expect(callCount).toBe(3);

    // Verify delays increase (first delay ~50ms, second ~100ms)
    const delay1 = timestamps[1] - timestamps[0];
    const delay2 = timestamps[2] - timestamps[1];

    expect(delay1).toBeGreaterThanOrEqual(40);
    expect(delay2).toBeGreaterThan(delay1);
  });
});
