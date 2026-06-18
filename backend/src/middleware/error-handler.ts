import { Elysia } from "elysia";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = "INTERNAL_ERROR"
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, "NOT_FOUND");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, message, "FORBIDDEN");
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, "VALIDATION_ERROR");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, "CONFLICT");
  }
}

export const errorHandler = new Elysia({ name: "error-handler" }).onError(
  ({ error, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return {
        error: error.code,
        message: error.message,
      };
    }

    if (
      error instanceof Error &&
      "status" in error &&
      typeof error.status === "number"
    ) {
      const statusCode = error.status as number;
      set.status = statusCode;

      if (statusCode === 422) {
        return {
          error: "VALIDATION_ERROR",
          message: error.message,
          details: (error as Record<string, unknown>).all as unknown,
        };
      }
    }

    console.error("Unhandled error:", error);
    set.status = 500;
    return {
      error: "INTERNAL_ERROR",
      message: "Something went wrong",
    };
  }
);
