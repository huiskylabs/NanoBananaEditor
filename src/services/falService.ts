import { GenerationRequest, EditRequest, SegmentationRequest } from './geminiService';
import { uploadImageToSupabase } from './supabaseService';
import { BrushStroke } from '../types';

const FAL_KEY = import.meta.env.VITE_FAL_KEY;
const FAL_TEXT_TO_IMAGE_URL = 'https://fal.run/fal-ai/bytedance/seedream/v4/text-to-image';
const FAL_EDIT_URL = 'https://fal.run/fal-ai/bytedance/seedream/v4/edit';

interface FalTextToImageRequest {
  prompt: string;
  num_images?: number;
  image_size?: {
    width: number;
    height: number;
  } | string;
  seed?: number;
  sync_mode?: boolean;
  enable_safety_checker?: boolean;
}

interface FalEditRequest {
  prompt: string;
  image_urls: string[];
  num_images?: number;
  guidance_scale?: number;
  seed?: number;
  sync_mode?: boolean;
  enable_safety_checker?: boolean;
}

interface FalResponse {
  images: Array<{
    url: string;
    width: number;
    height: number;
    content_type: string;
  }>;
  seed: number;
  has_nsfw_concepts?: boolean[];
  prompt?: string;
}

export class FalService {
  private async makeTextToImageRequest(data: FalTextToImageRequest): Promise<FalResponse> {
    if (!FAL_KEY) {
      throw new Error('FAL_KEY environment variable is not set');
    }

    console.log('🌐 FAL Text-to-Image API Call:');
    console.log('📍 Endpoint:', FAL_TEXT_TO_IMAGE_URL);
    console.log('📦 Payload:', JSON.stringify(data, null, 2));

    try {
      const response = await fetch(FAL_TEXT_TO_IMAGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${FAL_KEY}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FAL Text-to-Image API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ FAL Text-to-Image Response:', result);
      return result;
    } catch (error) {
      console.error('❌ FAL Text-to-Image API request failed:', error);
      throw new Error('Failed to communicate with FAL Text-to-Image API. Please check your connection and API key.');
    }
  }

  private async makeEditRequest(data: FalEditRequest): Promise<FalResponse> {
    if (!FAL_KEY) {
      throw new Error('FAL_KEY environment variable is not set');
    }

    console.log('🌐 FAL Edit API Call:');
    console.log('📍 Endpoint:', FAL_EDIT_URL);
    console.log('📦 Payload:', JSON.stringify(data, null, 2));

    try {
      const response = await fetch(FAL_EDIT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${FAL_KEY}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FAL Edit API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ FAL Edit Response:', result);
      return result;
    } catch (error) {
      console.error('❌ FAL Edit API request failed:', error);
      throw new Error('Failed to communicate with FAL Edit API. Please check your connection and API key.');
    }
  }

  private async getImageDimensions(imageUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        reject(new Error('Failed to load image for dimension detection'));
      };
      img.src = imageUrl;
    });
  }

  private convertBrushStrokesToMask(brushStrokes: BrushStroke[], width: number, height: number, visualGridSize: number = 400): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = width;
    canvas.height = height;

    console.log(`🎭 Creating mask: ${width}x${height}, visual grid was: ${visualGridSize}px`);

    // Fill with black background (areas that should not be edited)
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    // Draw white brush strokes (areas that should be edited)
    ctx.fillStyle = 'white';
    ctx.globalCompositeOperation = 'source-over';

    // Calculate scaling factor from visual grid size to actual image size
    const scaleX = width / visualGridSize;
    const scaleY = height / visualGridSize;

    console.log(`🔍 Coordinate scaling: visual ${visualGridSize}px → actual ${width}x${height} (scale: ${scaleX.toFixed(2)}x, ${scaleY.toFixed(2)}x)`);

    brushStrokes.forEach(stroke => {
      if (stroke.points.length < 2) return;

      // Scale brush size proportionally
      const scaledBrushSize = stroke.brushSize * Math.min(scaleX, scaleY);

      ctx.lineWidth = scaledBrushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'white'; // Always white for mask

      ctx.beginPath();

      // Scale and move to first point
      const firstX = stroke.points[0] * scaleX;
      const firstY = stroke.points[1] * scaleY;
      ctx.moveTo(firstX, firstY);

      console.log(`🖊️ Stroke: visual(${stroke.points[0].toFixed(1)}, ${stroke.points[1].toFixed(1)}) → mask(${firstX.toFixed(1)}, ${firstY.toFixed(1)})`);

      // Draw lines to subsequent scaled points
      for (let i = 2; i < stroke.points.length; i += 2) {
        const scaledX = stroke.points[i] * scaleX;
        const scaledY = stroke.points[i + 1] * scaleY;
        ctx.lineTo(scaledX, scaledY);
      }

      ctx.stroke();

      // Also fill circular areas at each scaled point for better coverage
      for (let i = 0; i < stroke.points.length; i += 2) {
        const scaledX = stroke.points[i] * scaleX;
        const scaledY = stroke.points[i + 1] * scaleY;
        ctx.beginPath();
        ctx.arc(scaledX, scaledY, scaledBrushSize / 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // Convert to base64
    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl.split(',')[1]; // Remove data:image/png;base64, prefix
  }

  private buildMaskPrompt(originalPrompt: string): string {
    return `${originalPrompt}

IMPORTANT MASKING INSTRUCTIONS: Apply changes ONLY where the mask image shows white pixels (value 255). Leave all other areas completely unchanged. Respect the mask boundaries precisely and maintain seamless blending at the edges. The mask image shows the exact areas to edit.`;
  }

  private async saveBase64AsFile(base64: string): Promise<string> {
    // Save base64 image to Supabase and return public URL
    try {
      console.log(`🔄 UPLOADING to Supabase...`);

      const publicUrl = await uploadImageToSupabase(base64);

      console.log(`💾 Saved image to Supabase: ${publicUrl}`);

      return publicUrl;
    } catch (error) {
      console.error('Error saving base64 image:', error);
      throw new Error('Failed to save image data');
    }
  }

  private async convertUrlToBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Remove the data:image/jpeg;base64, prefix to get just the base64 string
          const base64 = base64data.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting URL to base64:', error);
      throw new Error('Failed to convert image URL to base64');
    }
  }

  private getImageSizeFromAspectRatio(aspectRatio?: any): { width: number; height: number } {
    if (!aspectRatio) return { width: 1024, height: 1024 };

    // Use the actual dimensions from the aspect ratio
    const { width, height } = aspectRatio;

    // Ensure dimensions are reasonable (FAL supports up to 2K)
    const maxDim = 2048;
    const minDim = 512;

    let finalWidth = Math.max(minDim, Math.min(maxDim, width));
    let finalHeight = Math.max(minDim, Math.min(maxDim, height));

    // Maintain aspect ratio if scaling was needed
    if (width > maxDim || height > maxDim) {
      const ratio = width / height;
      if (width > height) {
        finalWidth = maxDim;
        finalHeight = Math.round(maxDim / ratio);
      } else {
        finalHeight = maxDim;
        finalWidth = Math.round(maxDim * ratio);
      }
    }

    return { width: finalWidth, height: finalHeight };
  }

  async generateImage(request: GenerationRequest & { brushStrokes?: BrushStroke[] }): Promise<string[]> {
    try {
      console.log('🚀 FAL generating image for prompt:', request.prompt);

      // Choose API based on whether we have reference images
      if (request.referenceImages && request.referenceImages.length > 0) {
        // Use Edit API when reference images are provided
        console.log('📝 Using FAL Edit API (reference images provided)');
        console.log('⚠️  Note: Edit API inherits dimensions from reference image, aspect ratio slider ignored');

        const imageUrls = await Promise.all(
          request.referenceImages.map(base64 => this.saveBase64AsFile(base64))
        );

        // Handle brush strokes for masking
        let finalPrompt = request.prompt;
        console.log(`🔍 Brush strokes check: ${request.brushStrokes ? request.brushStrokes.length : 0} strokes`);
        if (request.brushStrokes && request.brushStrokes.length > 0) {
          console.log('🎭 Converting brush strokes to mask for FAL Edit API');
          console.log(`📝 Brush stroke details:`, request.brushStrokes.map(s => ({ id: s.id, pointCount: s.points.length, size: s.brushSize })));

          // Get actual image dimensions from the first reference image
          try {
            const firstImageUrl = imageUrls[0];
            const { width, height } = await this.getImageDimensions(firstImageUrl);
            console.log(`📏 Detected image dimensions: ${width}x${height}`);

            // Use provided visual grid size or fallback to default
            const visualGridSize = (request as any).visualGridSize || 400;
            console.log(`👁️ Using visual grid size: ${visualGridSize}px`);

            const maskBase64 = this.convertBrushStrokesToMask(request.brushStrokes, width, height, visualGridSize);
            const maskUrl = await this.saveBase64AsFile(maskBase64);
            imageUrls.push(maskUrl); // Add mask as additional reference image
            finalPrompt = this.buildMaskPrompt(request.prompt);
            console.log('✅ Mask created and uploaded successfully');
          } catch (error) {
            console.error('❌ Failed to get image dimensions, falling back to 1024x1024:', error);
            const visualGridSize = (request as any).visualGridSize || 400;
            const maskBase64 = this.convertBrushStrokesToMask(request.brushStrokes, 1024, 1024, visualGridSize);
            const maskUrl = await this.saveBase64AsFile(maskBase64);
            imageUrls.push(maskUrl);
            finalPrompt = this.buildMaskPrompt(request.prompt);
            console.log('⚠️ Mask created with fallback dimensions');
          }
        } else {
          console.log('⚠️ No brush strokes found - proceeding without mask');
        }

        const falRequest: FalEditRequest = {
          prompt: finalPrompt,
          image_urls: imageUrls,
          num_images: 1,
          guidance_scale: request.temperature ? Math.max(1, Math.min(20, request.temperature * 20)) : 7.5,
          seed: request.seed,
          sync_mode: true,
          enable_safety_checker: true,
        };

        const response = await this.makeEditRequest(falRequest);

        // Convert the returned image URLs to base64
        const base64Images = await Promise.all(
          response.images.map(img => this.convertUrlToBase64(img.url))
        );

        return base64Images;
      } else {
        // Use Text-to-Image API for pure text prompts
        console.log('🎨 Using FAL Text-to-Image API (pure text prompt)');

        const imageSize = this.getImageSizeFromAspectRatio(request.aspectRatio);

        const falRequest: FalTextToImageRequest = {
          prompt: request.prompt,
          num_images: 1,
          image_size: imageSize,
          seed: request.seed,
          sync_mode: true,
          enable_safety_checker: true,
        };

        const response = await this.makeTextToImageRequest(falRequest);

        // Convert the returned image URLs to base64
        const base64Images = await Promise.all(
          response.images.map(img => this.convertUrlToBase64(img.url))
        );

        return base64Images;
      }
    } catch (error) {
      console.error('Error generating image with FAL:', error);
      throw new Error('Failed to generate image with FAL API. Please try again.');
    }
  }

  async editImage(request: EditRequest & { brushStrokes?: BrushStroke[] }): Promise<string[]> {
    try {
      console.log('✏️ FAL editing image with instruction:', request.instruction);

      // Convert original image to URL
      const originalImageUrl = await this.saveBase64AsFile(request.originalImage);

      let imageUrls = [originalImageUrl];

      // Add reference images if provided
      if (request.referenceImages && request.referenceImages.length > 0) {
        const referenceUrls = await Promise.all(
          request.referenceImages.map(base64 => this.saveBase64AsFile(base64))
        );
        imageUrls = [...imageUrls, ...referenceUrls];
      }

      // Handle brush strokes for masking
      let finalPrompt = request.instruction;
      console.log(`🔍 Edit brush strokes check: ${request.brushStrokes ? request.brushStrokes.length : 0} strokes`);
      if (request.brushStrokes && request.brushStrokes.length > 0) {
        console.log('🎭 Converting brush strokes to mask for FAL Edit API');
        console.log(`📝 Edit brush stroke details:`, request.brushStrokes.map(s => ({ id: s.id, pointCount: s.points.length, size: s.brushSize })));

        // Get actual image dimensions from the original image
        try {
          const originalImageUrl = imageUrls[0]; // First URL is the original image
          const { width, height } = await this.getImageDimensions(originalImageUrl);
          console.log(`📏 Edit - Detected image dimensions: ${width}x${height}`);

          // Use provided visual grid size or fallback to default
          const visualGridSize = (request as any).visualGridSize || 400;
          console.log(`👁️ Edit - Using visual grid size: ${visualGridSize}px`);

          const maskBase64 = this.convertBrushStrokesToMask(request.brushStrokes, width, height, visualGridSize);
          const maskUrl = await this.saveBase64AsFile(maskBase64);
          imageUrls.push(maskUrl); // Add mask as additional reference image
          finalPrompt = this.buildMaskPrompt(request.instruction);
          console.log('✅ Edit mask created and uploaded successfully');
        } catch (error) {
          console.error('❌ Edit - Failed to get image dimensions, falling back to 1024x1024:', error);
          const visualGridSize = (request as any).visualGridSize || 400;
          const maskBase64 = this.convertBrushStrokesToMask(request.brushStrokes, 1024, 1024, visualGridSize);
          const maskUrl = await this.saveBase64AsFile(maskBase64);
          imageUrls.push(maskUrl);
          finalPrompt = this.buildMaskPrompt(request.instruction);
          console.log('⚠️ Edit mask created with fallback dimensions');
        }
      } else {
        console.log('⚠️ No edit brush strokes found - proceeding without mask');
      }

      const falRequest: FalEditRequest = {
        prompt: finalPrompt,
        image_urls: imageUrls,
        num_images: 1,
        guidance_scale: request.temperature ? Math.max(1, Math.min(20, request.temperature * 20)) : 7.5,
        seed: request.seed,
        sync_mode: true,
        enable_safety_checker: true,
      };

      const response = await this.makeEditRequest(falRequest);

      // Convert the returned image URLs to base64
      const base64Images = await Promise.all(
        response.images.map(img => this.convertUrlToBase64(img.url))
      );

      return base64Images;
    } catch (error) {
      console.error('Error editing image with FAL:', error);
      throw new Error('Failed to edit image with FAL API. Please try again.');
    }
  }

  async segmentImage(request: SegmentationRequest): Promise<any> {
    // FAL SeedDream doesn't have segmentation capability
    // This would need to be implemented with a different FAL model or service
    throw new Error('Segmentation is not supported by FAL SeedDream API. Use mock mode for segmentation features.');
  }
}

export const falService = new FalService();