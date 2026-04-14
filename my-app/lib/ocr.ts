/**
 * Local OCR module (Tesseract to be implemented).
 * Provides text extraction from meter reading images and helpers to parse readings.
 */

export interface OCRResult {
  text: string;
  confidence?: number;
}

/**
 * Performs OCR on an image. Implement with Tesseract for local (offline) OCR.
 * @param imageUri - URI of the image to process (local file path or data URI)
 * @returns OCR result with extracted text
 */
export async function performOCR(imageUri: string): Promise<OCRResult> {
  // TODO: Implement with Tesseract for local OCR
  throw new Error(
    "Local OCR not yet implemented. Add Tesseract in performOCR."
  );
}

/**
 * Extracts numeric values from OCR text.
 * @param ocrText - Text from OCR result
 * @returns Array of potential numeric readings
 */
export function extractNumbers(ocrText: string): number[] {
  const numberRegex = /\d+\.?\d*/g;
  const matches = ocrText.match(numberRegex);
  if (!matches) return [];
  return matches.map((m) => parseFloat(m)).filter((n) => !isNaN(n));
}

/**
 * Attempts to extract a meter reading from OCR text (e.g. largest number).
 * @param ocrText - Text from OCR result
 * @returns Extracted meter reading or null
 */
export function extractMeterReading(ocrText: string): number | null {
  const numbers = extractNumbers(ocrText);
  if (numbers.length === 0) return null;
  return Math.max(...numbers);
}
