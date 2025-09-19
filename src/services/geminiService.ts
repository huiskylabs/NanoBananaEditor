import { GoogleGenAI } from '@google/genai';
import { AspectRatio } from '../types';

// Note: In production, this should be handled via a backend proxy
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'demo-key';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || !API_KEY || API_KEY === 'demo-key';
const genAI = new GoogleGenAI({ apiKey: API_KEY });

export interface GenerationRequest {
  prompt: string;
  referenceImages?: string[]; // base64 array
  temperature?: number;
  seed?: number;
  aspectRatio?: AspectRatio;
}

export interface EditRequest {
  instruction: string;
  originalImage: string; // base64
  referenceImages?: string[]; // base64 array
  maskImage?: string; // base64
  temperature?: number;
  seed?: number;
}

export interface SegmentationRequest {
  image: string; // base64
  query: string; // "the object at pixel (x,y)" or "the red car"
}

export class GeminiService {
  private mockImages = [
    'https://picsum.photos/1024/1024?random=1',
    'https://picsum.photos/1024/1024?random=2',
    'https://picsum.photos/1024/1024?random=3',
    'https://picsum.photos/1024/1024?random=4',
    'https://picsum.photos/1024/1024?random=5',
    'https://picsum.photos/1024/1024?random=6',
    'https://picsum.photos/1024/1024?random=7',
    'https://picsum.photos/1024/1024?random=8',
  ];

  private async getRandomMockImage(): Promise<string> {
    const randomIndex = Math.floor(Math.random() * this.mockImages.length);
    const imageUrl = this.mockImages[randomIndex];

    try {
      // Fetch the image and convert to base64
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Remove the data:image/jpeg;base64, prefix to get just the base64 string
          const base64 = base64data.split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error fetching mock image:', error);
      // Return a simple base64 placeholder if fetch fails
      return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }
  }

  async generateImage(request: GenerationRequest): Promise<string[]> {
    if (USE_MOCK) {
      // Mock delay to simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

      console.log('🎨 Mock generating image for prompt:', request.prompt);
      if (request.aspectRatio) {
        console.log('🖼️ Mock aspect ratio:', request.aspectRatio.label);
      }

      // Return a random mock image
      const mockImage = await this.getRandomMockImage();
      return [mockImage];
    }

    try {
      const enhancedPrompt = this.buildGenerationPrompt(request);
      const contents: any[] = [{ text: enhancedPrompt }];

      // Add reference images if provided
      if (request.referenceImages && request.referenceImages.length > 0) {
        request.referenceImages.forEach(image => {
          contents.push({
            inlineData: {
              mimeType: "image/png",
              data: image,
            },
          });
        });
      }

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash-image-preview",
        contents,
      });

      const images: string[] = [];

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          images.push(part.inlineData.data);
        }
      }

      return images;
    } catch (error) {
      console.error('Error generating image:', error);
      throw new Error('Failed to generate image. Please try again.');
    }
  }

  async editImage(request: EditRequest): Promise<string[]> {
    if (USE_MOCK) {
      // Mock delay to simulate API call
      await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800));

      console.log('✏️ Mock editing image with instruction:', request.instruction);

      // Return a different random mock image for edits
      const mockImage = await this.getRandomMockImage();
      return [mockImage];
    }

    try {
      const contents = [
        { text: this.buildEditPrompt(request) },
        {
          inlineData: {
            mimeType: "image/png",
            data: request.originalImage,
          },
        },
      ];

      // Add reference images if provided
      if (request.referenceImages && request.referenceImages.length > 0) {
        request.referenceImages.forEach(image => {
          contents.push({
            inlineData: {
              mimeType: "image/png",
              data: image,
            },
          });
        });
      }

      if (request.maskImage) {
        contents.push({
          inlineData: {
            mimeType: "image/png",
            data: request.maskImage,
          },
        });
      }

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash-image-preview",
        contents,
      });

      const images: string[] = [];

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          images.push(part.inlineData.data);
        }
      }

      return images;
    } catch (error) {
      console.error('Error editing image:', error);
      throw new Error('Failed to edit image. Please try again.');
    }
  }

  async segmentImage(request: SegmentationRequest): Promise<any> {
    try {
      const prompt = [
        { text: `Analyze this image and create a segmentation mask for: ${request.query}

Return a JSON object with this exact structure:
{
  "masks": [
    {
      "label": "description of the segmented object",
      "box_2d": [x, y, width, height],
      "mask": "base64-encoded binary mask image"
    }
  ]
}

Only segment the specific object or region requested. The mask should be a binary PNG where white pixels (255) indicate the selected region and black pixels (0) indicate the background.` },
        {
          inlineData: {
            mimeType: "image/png",
            data: request.image,
          },
        },
      ];

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash-image-preview",
        contents: prompt,
      });

      const responseText = response.candidates[0].content.parts[0].text;
      return JSON.parse(responseText);
    } catch (error) {
      console.error('Error segmenting image:', error);
      throw new Error('Failed to segment image. Please try again.');
    }
  }

  private buildGenerationPrompt(request: GenerationRequest): string {
    let prompt = request.prompt;

    // Add aspect ratio specification if provided
    if (request.aspectRatio) {
      const { width, height, label } = request.aspectRatio;
      prompt += `\n\nIMPORTANT: Generate the image with aspect ratio ${label} (${width}×${height} pixels). Ensure the composition works well within this specific dimension.`;
    }

    return prompt;
  }

  private buildEditPrompt(request: EditRequest): string {
    const maskInstruction = request.maskImage
      ? "\n\nIMPORTANT: Apply changes ONLY where the mask image shows white pixels (value 255). Leave all other areas completely unchanged. Respect the mask boundaries precisely and maintain seamless blending at the edges."
      : "";

    return `Edit this image according to the following instruction: ${request.instruction}

Maintain the original image's lighting, perspective, and overall composition. Make the changes look natural and seamlessly integrated.${maskInstruction}

Preserve image quality and ensure the edit looks professional and realistic.`;
  }
}

export const geminiService = new GeminiService();