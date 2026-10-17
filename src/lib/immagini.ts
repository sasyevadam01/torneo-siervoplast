// Ritaglia al centro in un quadrato 480x480 e comprime in JPEG (~40-60 KB); restituisce un data URL
export async function preparaFoto(file: File, lato = 480): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const s = Math.min(bitmap.width, bitmap.height)
  // per le foto verticali (tipo figurina) si tiene la parte alta, dove c'è il viso
  const sx = (bitmap.width - s) / 2
  const sy = bitmap.height > bitmap.width ? Math.max(0, (bitmap.height - s) * 0.15) : (bitmap.height - s) / 2
  const canvas = document.createElement('canvas')
  canvas.width = lato
  canvas.height = lato
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, sx, sy, s, s, 0, 0, lato, lato)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}
