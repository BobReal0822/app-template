import { isVercelPreviewOrDevRuntime } from '@/lib/site-url';

export interface SubscribeSseOptions<T> {
  url: string;
  onMessage: (data: T) => void;
  onError?: (error: Event) => void;
}

// Number of consecutive recoverable `onerror` events we tolerate before
// escalating to the caller's `onError`. With a typical 3s browser reconnect
// interval this surfaces persistent failures to the UI in ~9s while still
// hiding momentary blips. The browser keeps retrying in the background, so a
// later successful message will silently clear the error via the consumer
// hook's SSE-origin error scoping.
const MAX_RECOVERABLE_SSE_ERRORS_BEFORE_ESCALATION = 3;

function isRecoverableSseError(source: EventSource): boolean {
  return source.readyState !== EventSource.CLOSED;
}

function shouldLogRecoverableSseWarning(
  hasLoggedRecoverableError: boolean,
): boolean {
  if (hasLoggedRecoverableError) return false;
  return process.env.NODE_ENV !== 'production' || isVercelPreviewOrDevRuntime();
}

// Strip query string before logging so we never leak tokens/auth params that a
// future caller might pass in the URL. Hash fragments aren't sent to servers
// but are dropped here for the same defensive reason.
function sanitizeUrlForLog(url: string): string {
  const queryIndex = url.indexOf('?');
  const hashIndex = url.indexOf('#');
  const cutIndex = [queryIndex, hashIndex]
    .filter((i) => i >= 0)
    .sort((a, b) => a - b)[0];
  return cutIndex === undefined ? url : url.slice(0, cutIndex);
}

function handleEventData<T>(
  data: string,
  onMessage: (payload: T) => void,
): void {
  if (!data || data === ': hb') return;
  try {
    onMessage(JSON.parse(data) as T);
  } catch (error) {
    console.error('[sse] failed to parse payload', error);
  }
}

export function subscribeSse<T>({
  url,
  onMessage,
  onError,
}: SubscribeSseOptions<T>): () => void {
  const source = new EventSource(url, { withCredentials: true });
  let hasLoggedRecoverableError = false;
  let consecutiveRecoverableErrors = 0;
  // Once we've surfaced a persistent failure, suppress further `onError`
  // calls until the connection recovers — otherwise the caller sees a flood
  // of identical errors as the browser keeps retrying every few seconds.
  let hasEscalatedRecoverableError = false;

  const resetConnectionHealth = (): void => {
    hasLoggedRecoverableError = false;
    consecutiveRecoverableErrors = 0;
    hasEscalatedRecoverableError = false;
  };

  source.onopen = () => {
    resetConnectionHealth();
  };

  source.onmessage = (event) => {
    resetConnectionHealth();
    handleEventData(event.data, onMessage);
  };

  source.addEventListener('snapshot', (event) => {
    resetConnectionHealth();
    const customEvent = event as MessageEvent<string>;
    handleEventData(customEvent.data, onMessage);
  });

  source.onerror = (error) => {
    if (!isRecoverableSseError(source)) {
      onError?.(error);
      return;
    }

    consecutiveRecoverableErrors += 1;

    // Reconnection attempts can fail indefinitely while `readyState` stays in
    // CONNECTING, so we must escalate after a threshold to avoid leaving the
    // UI stuck in a loading state with no error indication.
    if (
      consecutiveRecoverableErrors >=
        MAX_RECOVERABLE_SSE_ERRORS_BEFORE_ESCALATION &&
      !hasEscalatedRecoverableError
    ) {
      hasEscalatedRecoverableError = true;
      onError?.(error);
      return;
    }

    if (
      !hasEscalatedRecoverableError &&
      shouldLogRecoverableSseWarning(hasLoggedRecoverableError)
    ) {
      console.warn('[sse] connection interrupted; browser will retry', {
        url: sanitizeUrlForLog(url),
        readyState: source.readyState,
        attempt: consecutiveRecoverableErrors,
      });
      hasLoggedRecoverableError = true;
    }
  };

  return () => source.close();
}
