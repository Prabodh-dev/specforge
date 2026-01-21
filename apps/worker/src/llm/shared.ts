export const MAX_RETRIES = 3;
export const RETRY_DELAY_MS = 1000;

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
