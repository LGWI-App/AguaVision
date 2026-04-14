/**
 * Google Cloud Vision API OCR Service
 *
 * This service handles OCR requests to Google Cloud Vision API
 * to extract text from meter reading images.
 */

const GOOGLE_VISION_API_URL =
  "https://vision.googleapis.com/v1/images:annotate";

export interface OCRResult {
  text: string;
  confidence?: number;
  fullTextAnnotation?: string;
}

export interface GoogleVisionResponse {
  responses: Array<{
    textAnnotations?: Array<{
      description: string;
      boundingPoly?: {
        vertices: Array<{ x: number; y: number }>;
      };
    }>;
    fullTextAnnotation?: {
      text: string;
      pages?: Array<{
        property?: {
          detectedLanguages?: Array<{
            languageCode: string;
            confidence: number;
          }>;
        };
      }>;
    };
    error?: {
      code: number;
      message: string;
    };
  }>;
}

/**
 * Converts an image URI to base64 string
 * @param uri - Image URI (local file path or data URI)
 * @returns Base64 encoded string without data URI prefix
 */
async function imageToBase64(uri: string): Promise<string> {
  // If it's already a data URI, extract the base64 part
  if (uri.startsWith("data:image")) {
    const base64Match = uri.match(/^data:image\/\w+;base64,(.+)$/);
    if (base64Match) {
      return base64Match[1];
    }
  }

  // For local file URIs in React Native/Expo
  try {
    // Try using expo-file-system if available
    try {
      const { readAsStringAsync, EncodingType } = await import(
        "expo-file-system"
      );
      const base64 = await readAsStringAsync(uri, {
        encoding: EncodingType.Base64,
      });
      return base64;
    } catch {
      // Fallback to fetch for web or if file-system is not available
      const response = await fetch(uri);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Remove data URI prefix if present
          const base64Data = base64.includes(",")
            ? base64.split(",")[1]
            : base64;
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch (error) {
    throw new Error(`Failed to convert image to base64: ${error}`);
  }
}

/**
 * Performs OCR on an image using Google Cloud Vision API
 * @param imageUri - URI of the image to process (local file path or data URI)
 * @param apiKey - Google Cloud Vision API key
 * @returns OCR result with extracted text
 */
export async function performOCR(
  imageUri: string,
  apiKey: string,
): Promise<OCRResult> {
  try {
    // Convert image to base64
    const base64Image = await imageToBase64(imageUri);

    // Prepare the request payload
    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: "TEXT_DETECTION",
              maxResults: 1,
            },
          ],
        },
      ],
    };

    // Make API request
    const response = await fetch(`${GOOGLE_VISION_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Google Vision API error: ${response.status} - ${errorText}`,
      );
    }

    const data: GoogleVisionResponse = await response.json();

    // Check for API errors
    if (data.responses?.[0]?.error) {
      throw new Error(
        `Google Vision API error: ${data.responses[0].error.message}`,
      );
    }

    // Extract text from response
    const textAnnotations = data.responses?.[0]?.textAnnotations;
    const fullTextAnnotation = data.responses?.[0]?.fullTextAnnotation;

    if (!textAnnotations || textAnnotations.length === 0) {
      return {
        text: "",
        fullTextAnnotation: fullTextAnnotation?.text || "",
      };
    }

    // The first annotation contains the entire detected text
    const detectedText = textAnnotations[0].description || "";

    return {
      text: detectedText,
      fullTextAnnotation: fullTextAnnotation?.text || detectedText,
    };
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
}

/**
 * Extracts numeric values from OCR text
 * Useful for finding meter readings in the detected text
 * @param ocrText - Text from OCR result
 * @returns Array of potential numeric readings
 */
export function extractNumbers(ocrText: string): number[] {
  // Match numbers (including decimals) in the text
  const numberRegex = /\d+\.?\d*/g;
  const matches = ocrText.match(numberRegex);

  if (!matches) {
    return [];
  }

  return matches.map((match) => parseFloat(match)).filter((num) => !isNaN(num));
}

/**
 * Attempts to extract a meter reading from OCR text
 * Looks for the largest number (assuming it's the meter reading)
 * @param ocrText - Text from OCR result
 * @returns Extracted meter reading or null
 */
export function extractMeterReading(ocrText: string): number | null {
  const numbers = extractNumbers(ocrText);

  if (numbers.length === 0) {
    return null;
  }

  // Return the largest number (likely the meter reading)
  return Math.max(...numbers);
}
