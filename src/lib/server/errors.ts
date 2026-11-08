/** Kode galat database yang AMAN ditampilkan ke klien (tanpa rahasia) untuk diagnosis cepat. */
export type DbErrorCode = "network" | "bad_header" | "invalid_api_key" | "forbidden" | "function_missing" | "db_error";

export class DbError extends Error {
  constructor(
    public fn: string,
    public code: DbErrorCode,
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function classifyRpcError(err: { message?: string; code?: string; details?: string }, status: number): DbErrorCode {
  const text = `${err.message ?? ""} ${err.details ?? ""}`;
  if (/invalid header value|invalid character in header|Headers\.append/i.test(text)) return "bad_header";
  if (status === 0 || /fetch failed|ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|UND_ERR|network/i.test(text)) return "network";
  if (status === 401 || /invalid api key|invalid jwt|jwt expired|no api key/i.test(text)) return "invalid_api_key";
  if (err.code === "PGRST202" || /could not find the function/i.test(text)) return "function_missing";
  if (status === 403 || err.code === "42501") return "forbidden";
  return "db_error";
}
