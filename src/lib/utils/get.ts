import { customAlphabet } from 'nanoid';

export const getRandomId = (length = 10) =>
  customAlphabet(
    '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  )(length);

export function getFileExtension(filePath: string) {
  if (!filePath) {
    return '';
  }

  const reg =
    /^.+\.(avi|acc|aac|flv|mov|m4v|mkv|mp4|mpeg|mpg|webm|qlv|ac3|aiff|caf|flac|m4a|mp3|ogg|wav|w64|rmvb|wma|ts|png|jpg|jpeg)$/i;
  const matches = filePath.match(reg);
  const fileExt = matches?.[1] || '';

  return fileExt;
}
