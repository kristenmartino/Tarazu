import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, useState } from "react";
import { ErrorBoundary } from "./ErrorBoundary";

// We can't use React Testing Library (not installed), so test the class directly

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    const boundary = new ErrorBoundary({ name: "Test", children: "hello" });
    boundary.state = { hasError: false, error: null };
    const result = boundary.render();
    expect(result).toBe("hello");
  });

  it("getDerivedStateFromError returns error state", () => {
    const err = new Error("boom");
    const state = ErrorBoundary.getDerivedStateFromError(err);
    expect(state).toEqual({ hasError: true, error: err });
  });

  it("componentDidCatch logs the error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const boundary = new ErrorBoundary({ name: "TestPanel" });
    const err = new Error("test error");
    boundary.componentDidCatch(err, { componentStack: "stack" });
    expect(spy).toHaveBeenCalledWith(
      "[ErrorBoundary:TestPanel]",
      err,
      { componentStack: "stack" }
    );
    spy.mockRestore();
  });

  it("handleReset clears error state", () => {
    const boundary = new ErrorBoundary({ name: "Test" });
    boundary.state = { hasError: true, error: new Error("oops") };
    boundary.setState = vi.fn((s) => { boundary.state = s; });
    boundary.handleReset();
    expect(boundary.setState).toHaveBeenCalledWith({ hasError: false, error: null });
  });

  it("renders fallback UI with error message when hasError", () => {
    const boundary = new ErrorBoundary({ name: "Canvas" });
    boundary.state = { hasError: true, error: new Error("Something broke") };
    const result = boundary.render();
    // Delegates to the themed <ErrorFallback> (a function component using useC()).
    expect(result).toBeTruthy();
    expect(typeof result.type).toBe("function");
    expect(result.props.name).toBe("Canvas");
    expect(result.props.message).toBe("Something broke");
    expect(typeof result.props.onReset).toBe("function");
  });

  it("uses default name and message when not provided", () => {
    const boundary = new ErrorBoundary({});
    boundary.state = { hasError: true, error: null };
    const result = boundary.render();
    expect(result.props.name).toBe("Panel");
    expect(result.props.message).toBe("Something went wrong");
  });
});
