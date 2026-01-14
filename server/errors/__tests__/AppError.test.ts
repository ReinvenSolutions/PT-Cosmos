import { describe, it, expect } from "vitest";
import { AppError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from "../AppError";

describe("AppError", () => {
  it("should create AppError with status code", () => {
    const error = new AppError(400, "Test error");
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe("Test error");
    expect(error.isOperational).toBe(true);
  });

  it("should create ValidationError", () => {
    const error = new ValidationError("Invalid data", [
      { field: "email", message: "Invalid email" }
    ]);
    expect(error.statusCode).toBe(400);
    expect(error.errors).toBeDefined();
  });

  it("should create NotFoundError", () => {
    const error = new NotFoundError("User");
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe("User not found");
  });

  it("should create UnauthorizedError", () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
  });

  it("should create ForbiddenError", () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
  });
});
