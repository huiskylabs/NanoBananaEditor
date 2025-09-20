import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

// Use service key if available (bypasses RLS), otherwise use anon key
const keyToUse = supabaseServiceKey || supabaseAnonKey;

if (!supabaseUrl || !keyToUse) {
  console.warn('Supabase credentials not found. Image upload will be disabled.');
}

export const supabase = supabaseUrl && keyToUse
  ? createClient(supabaseUrl, keyToUse)
  : null;

export const uploadImageToSupabase = async (base64: string): Promise<string> => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    // Generate unique filename
    const filename = `fal-images/${Date.now()}_${Math.random().toString(36).substring(2, 15)}.jpg`;

    // Convert base64 to Uint8Array
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('images') // Make sure this bucket exists in your Supabase project
      .upload(filename, byteArray, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Failed to upload to Supabase: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(filename);

    const publicUrl = publicUrlData.publicUrl;
    console.log(`✅ Uploaded to Supabase: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading to Supabase:', error);
    throw new Error('Failed to upload image to Supabase');
  }
};