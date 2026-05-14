/**
 * Clipboard helpers — UI feedback (e.g. toast + i18n) stays at the call site.
 */

export interface CopyTextFeedback {
  onUnavailable: () => void;
  onSuccess: () => void;
  onError: () => void;
}

/**
 * Writes text to the clipboard and invokes caller-provided feedback.
 * No-op when `text` is empty (caller may toast separately if needed).
 */
export async function copyTextWithFeedback(
  text: string,
  feedback: CopyTextFeedback,
): Promise<void> {
  if (!text) return;

  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    feedback.onUnavailable();
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    feedback.onSuccess();
  } catch {
    feedback.onError();
  }
}
