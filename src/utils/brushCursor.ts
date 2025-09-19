/**
 * Creates a custom cursor image for the brush tool with the specified size
 * @param size - Brush size in pixels
 * @param zoom - Canvas zoom level to scale the cursor accordingly
 * @returns CSS cursor string
 */
export const createBrushCursor = (size: number, zoom: number = 1): string => {
  // Calculate actual cursor size based on zoom
  const cursorSize = Math.max(8, Math.min(64, size * zoom));
  const center = cursorSize / 2;

  // Create a canvas element to draw the cursor
  const canvas = document.createElement('canvas');
  canvas.width = cursorSize;
  canvas.height = cursorSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) return 'crosshair';

  // Clear the canvas
  ctx.clearRect(0, 0, cursorSize, cursorSize);

  // Draw outer circle (border)
  ctx.beginPath();
  ctx.arc(center, center, center - 1, 0, 2 * Math.PI);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw inner circle (shadow/contrast)
  ctx.beginPath();
  ctx.arc(center, center, center - 2, 0, 2 * Math.PI);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Add center dot for precision
  ctx.beginPath();
  ctx.arc(center, center, 1, 0, 2 * Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Convert canvas to data URL
  const dataUrl = canvas.toDataURL('image/png');

  // Return CSS cursor string with hotspot at center
  return `url("${dataUrl}") ${center} ${center}, crosshair`;
};

/**
 * Debounced version of createBrushCursor to avoid excessive cursor updates
 */
let cursorCache = new Map<string, string>();

export const createBrushCursorCached = (size: number, zoom: number = 1): string => {
  const key = `${size}-${zoom.toFixed(2)}`;

  if (cursorCache.has(key)) {
    return cursorCache.get(key)!;
  }

  const cursor = createBrushCursor(size, zoom);
  cursorCache.set(key, cursor);

  // Limit cache size
  if (cursorCache.size > 50) {
    const firstKey = cursorCache.keys().next().value;
    cursorCache.delete(firstKey);
  }

  return cursor;
};