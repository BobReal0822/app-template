/**
 * 格式化文件大小（字节）为可读字符串
 * @param bytes - 字节数
 * @param decimals - 小数位数，默认 1
 * @returns 如 "12.5 MB"、"0.0 MB"
 */
export function formatFileSize(
  bytes: number | null | undefined,
  decimals = 1,
): string {
  if (bytes == null || bytes < 0 || !Number.isFinite(bytes)) {
    return '0.0 MB';
  }
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(decimals)} MB`;
}
