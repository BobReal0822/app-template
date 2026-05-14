/**
 * Tests for `subscribeSse`.
 *
 * Focuses on the escalation behavior added after a regression where persistent
 * connection failures (readyState stuck in CONNECTING) silently suppressed
 * `onError` forever, leaving consumer hooks stuck in a loading state.
 */

type SseEventListener = (event: Event) => void;

class FakeEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSED = 2;

  url: string;
  withCredentials: boolean;
  readyState: number = FakeEventSource.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;

  private listeners = new Map<string, Set<SseEventListener>>();

  constructor(url: string, init?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = init?.withCredentials ?? false;
  }

  addEventListener(type: string, listener: SseEventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  close(): void {
    this.readyState = FakeEventSource.CLOSED;
    this.closed = true;
  }

  // Test helpers
  simulateOpen(): void {
    this.readyState = FakeEventSource.OPEN;
    this.onopen?.(new Event('open'));
  }

  simulateMessage(data: string): void {
    this.readyState = FakeEventSource.OPEN;
    this.onmessage?.({ data } as MessageEvent<string>);
  }

  simulateRecoverableError(): void {
    this.readyState = FakeEventSource.CONNECTING;
    this.onerror?.(new Event('error'));
  }

  simulateTerminalError(): void {
    this.readyState = FakeEventSource.CLOSED;
    this.onerror?.(new Event('error'));
  }
}

const originalEventSource = (globalThis as { EventSource?: unknown })
  .EventSource;

beforeAll(() => {
  (globalThis as { EventSource: unknown }).EventSource = FakeEventSource;
});

afterAll(() => {
  (globalThis as { EventSource?: unknown }).EventSource = originalEventSource;
});

let warnSpy: jest.SpyInstance;

beforeEach(() => {
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  warnSpy.mockRestore();
  // Reset to the base fake so each test starts from a clean prototype chain
  // instead of accumulating one `Capturing` subclass per test.
  (globalThis as { EventSource: unknown }).EventSource = FakeEventSource;
});

function captureNextEventSource(): FakeEventSource {
  const created: FakeEventSource[] = [];
  const Original = (
    globalThis as unknown as { EventSource: typeof FakeEventSource }
  ).EventSource;
  class Capturing extends Original {
    constructor(url: string, init?: { withCredentials?: boolean }) {
      super(url, init);
      created.push(this);
    }
  }
  (globalThis as { EventSource: unknown }).EventSource = Capturing;
  // The capturing class stays installed for the rest of the test; `afterEach`
  // restores `globalThis.EventSource` to the base fake so the next test does
  // not extend the previous test's `Capturing` subclass.
  return new Proxy({} as FakeEventSource, {
    get(_, prop) {
      const instance = created[0];
      if (!instance) throw new Error('No EventSource was created yet');
      const value = instance[prop as keyof FakeEventSource];
      return typeof value === 'function' ? value.bind(instance) : value;
    },
  });
}

describe('subscribeSse — recoverable error escalation', () => {
  it('suppresses the first two recoverable errors and escalates on the third', async () => {
    const onError = jest.fn();
    const onMessage = jest.fn();

    const fake = captureNextEventSource();
    const { subscribeSse } = await import('../client');
    subscribeSse({ url: '/api/test', onMessage, onError });

    fake.simulateRecoverableError();
    fake.simulateRecoverableError();
    expect(onError).not.toHaveBeenCalled();

    fake.simulateRecoverableError();
    expect(onError).toHaveBeenCalledTimes(1);

    // Further errors while still in the same failure burst do not flood the
    // caller with duplicate `onError` calls.
    fake.simulateRecoverableError();
    fake.simulateRecoverableError();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('resets the error counter after a successful onopen', async () => {
    const onError = jest.fn();
    const fake = captureNextEventSource();
    const { subscribeSse } = await import('../client');
    subscribeSse({ url: '/api/test', onMessage: jest.fn(), onError });

    fake.simulateRecoverableError();
    fake.simulateRecoverableError();
    fake.simulateOpen();

    fake.simulateRecoverableError();
    fake.simulateRecoverableError();
    expect(onError).not.toHaveBeenCalled();

    fake.simulateRecoverableError();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('resets the error counter after a successful message', async () => {
    const onError = jest.fn();
    const onMessage = jest.fn();
    const fake = captureNextEventSource();
    const { subscribeSse } = await import('../client');
    subscribeSse({ url: '/api/test', onMessage, onError });

    fake.simulateRecoverableError();
    fake.simulateRecoverableError();
    fake.simulateMessage(JSON.stringify({ ok: true }));

    expect(onMessage).toHaveBeenCalledWith({ ok: true });

    fake.simulateRecoverableError();
    fake.simulateRecoverableError();
    expect(onError).not.toHaveBeenCalled();
  });

  it('re-escalates after the connection recovers and fails again', async () => {
    const onError = jest.fn();
    const fake = captureNextEventSource();
    const { subscribeSse } = await import('../client');
    subscribeSse({ url: '/api/test', onMessage: jest.fn(), onError });

    fake.simulateRecoverableError();
    fake.simulateRecoverableError();
    fake.simulateRecoverableError();
    expect(onError).toHaveBeenCalledTimes(1);

    fake.simulateOpen();

    fake.simulateRecoverableError();
    fake.simulateRecoverableError();
    fake.simulateRecoverableError();
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it('forwards terminal errors (CLOSED) to the caller immediately', async () => {
    const onError = jest.fn();
    const fake = captureNextEventSource();
    const { subscribeSse } = await import('../client');
    subscribeSse({ url: '/api/test', onMessage: jest.fn(), onError });

    fake.simulateTerminalError();
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe('subscribeSse — log sanitization', () => {
  it('never includes query string or hash in any console.warn payload', async () => {
    const fake = captureNextEventSource();
    const { subscribeSse } = await import('../client');
    subscribeSse({
      url: '/api/test?token=secret&other=ok#frag',
      onMessage: jest.fn(),
      onError: jest.fn(),
    });

    // Two recoverable errors keep us under the escalation threshold so any
    // logging path (production-gated or not) has a chance to run.
    fake.simulateRecoverableError();
    fake.simulateRecoverableError();

    for (const call of warnSpy.mock.calls) {
      const serialized = JSON.stringify(call);
      expect(serialized).not.toContain('secret');
      expect(serialized).not.toContain('frag');
      expect(serialized).not.toContain('token=');
    }
  });
});
