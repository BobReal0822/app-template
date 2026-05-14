/**
 * Validates a string is safe to use as a task/message/document key.
 * Prevents path traversal and overly long IDs.
 */
export function isSafeDocId(input: unknown): input is string {
  return (
    typeof input === 'string' &&
    input.length > 0 &&
    input.length <= 128 &&
    !input.includes('/')
  );
}

export function isAudioFile(url: string) {
  const reg = /^(.+)\.(mp3|acc|flac|ogg|m4a|wav)$/i;

  return reg.test(url.toLowerCase());
}
