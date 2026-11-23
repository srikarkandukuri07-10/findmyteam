const MAX_INPUT_BYTES = 25 * 1024 * 1024;

/**
 * Shrinks a photo on the phone before it is uploaded: at most 1280 px on the long side, saved as a JPEG.
 * A typical phone photo goes from several MB to a few hundred KB, which keeps the free storage going.
 */
export async function resizePhoto(file: File, maxSide = 1280, quality = 0.82): Promise<{ blob: Blob; previewUrl: string }> {
  if (!file.type.startsWith("image/")) throw new Error("Pick an image file.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("That photo is too large. Pick one under 25 MB.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That photo type isn't supported. Try a JPG or PNG.");
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't read that photo.");
  ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("Couldn't prepare that photo.");
  return { blob, previewUrl: URL.createObjectURL(blob) };
}
