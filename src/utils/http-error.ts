export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    // Restore prototype chain for instanceof checks
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}