/** Thrown for any non-2xx response so callers get a typed failure, not a raw Response. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: string[],
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }
}
