/**
 * Project-standard server logger.
 *
 * Writes directly to stdout/stderr so that:
 *   - `Error` arguments are unwrapped to `{ message, stack, cause }` before
 *     being printed.
 *   - All call sites accept `(message, ...args)` like `console.log`, so adding
 *     structured context to a log line never requires custom formatting.
 *   - Production builds can keep `compiler.removeConsole` enabled for browser
 *     bundles without stripping server logs.
 *
 * Output goes to stdout/stderr, which Vercel forwards to its platform log
 * stream automatically. Use this module from any server-side code. Use
 * {@link debug} for diagnostic detail that is suppressed on Vercel production
 * (`VERCEL_ENV === 'production'`).
 */

function formatErrorLike(arg: unknown): unknown {
  if (arg instanceof Error) {
    return {
      message: arg.message,
      stack: arg.stack,
      ...(arg.cause !== undefined ? { cause: String(arg.cause) } : {}),
    };
  }
  return arg;
}

function formatArgs(message: string, args: unknown[]): unknown[] {
  if (args.length === 0) return [message];
  return [message, ...args.map(formatErrorLike)];
}

function stringifyArg(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  if (typeof arg === 'bigint') return arg.toString();
  if (arg === undefined) return 'undefined';

  try {
    return JSON.stringify(arg);
  } catch {
    return '[Unserializable log argument]';
  }
}

function writeLine(
  stream: NodeJS.WriteStream,
  message: string,
  args: unknown[],
): void {
  const line = formatArgs(message, args).map(stringifyArg).join(' ');

  try {
    stream.write(`${line}\n`);
  } catch {
    // Logging must never break request handling.
  }
}

export function debug(message: string, ...args: unknown[]): void {
  if (process.env.VERCEL_ENV === 'production') return;
  writeLine(process.stdout, message, args);
}

export function info(message: string, ...args: unknown[]): void {
  writeLine(process.stdout, message, args);
}

export function log(message: string, ...args: unknown[]): void {
  writeLine(process.stdout, message, args);
}

export function warn(message: string, ...args: unknown[]): void {
  writeLine(process.stderr, message, args);
}

export function error(message: string, ...args: unknown[]): void {
  writeLine(process.stderr, message, args);
}
