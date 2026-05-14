export const PASSWORD_MIN_LENGTH = 8;

export function hasLetterAndNumber(password: string): boolean {
  return /[A-Za-z]/.test(password) && /\d/.test(password);
}

export function isStrongPassword(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH && hasLetterAndNumber(password);
}
