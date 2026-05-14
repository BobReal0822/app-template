export function dataUrlToFile(dataUrl: string, fileName: string): File | null {
  const parts = dataUrl.split(',');
  if (parts.length !== 2) return null;

  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch?.[1] ?? 'image/png';
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new File([bytes], fileName, { type: mime });
}
