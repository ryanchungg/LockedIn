export type ApiResult<T> = {
  data: T | null;
  error: Error | null;
};

export function toApiError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String((error as { message: unknown }).message));
  }
  return new Error(String(error));
}
