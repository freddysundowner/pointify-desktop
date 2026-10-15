import { AsyncLocalStorage } from "node:async_hooks";

/**
 * The Authorization header of the browser request currently being handled (after attendant sessions have
 * been swapped for their API token, see middleware/upstream-auth.ts). Many routes call the Pointify API
 * without passing a token because the API used to be open; config.ts attaches this one to any upstream
 * call that does not already carry its own.
 */
export const requestAuth = new AsyncLocalStorage<{ authorization?: string }>();
