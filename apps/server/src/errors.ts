/** Typed errors thrown by services and routes; app.ts maps them to HTTP status codes. */
export class HttpError extends Error {
  readonly statusCode: number
  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string) {
    super(400, message)
  }
}
export class UnauthorizedError extends HttpError {
  constructor(message = 'Sign in required') {
    super(401, message)
  }
}
export class ForbiddenError extends HttpError {
  constructor(message: string) {
    super(403, message)
  }
}
export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(404, message)
  }
}
export class ConflictError extends HttpError {
  constructor(message: string) {
    super(409, message)
  }
}
export class GoneError extends HttpError {
  constructor(message: string) {
    super(410, message)
  }
}
export class ServiceUnavailableError extends HttpError {
  constructor(message: string) {
    super(503, message)
  }
}
