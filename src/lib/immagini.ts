// Ritaglia al centro in un quadrato 512x512 e comprime in WebP (mantiene lo sfondo trasparente
// dei ritratti disegnati); se il browser non sa fare WebP ripiega su JPEG. Restituisce un data URL.
export async function preparaFoto(file: File, lato = 512): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const s = Math.min(bitmap.width, bitmap.height)
  // per le immagini verticali (tipo figurina) si tiene la parte alta, dove c'è il viso
  const sx = (bitmap.width - s) / 2
  const sy = bitmap.height > bitmap.width ? Math.max(0, (bitmap.height - s) * 0.15) : (bitmap.height - s) / 2
  const canvas = document.createElement('canvas')
  canvas.width = lato
  canvas.height = lato
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, sx, sy, s, s, 0, 0, lato, lato)
  bitmap.close()
  const webp = canvas.toDataURL('image/webp', 0.88)
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.88)
}
