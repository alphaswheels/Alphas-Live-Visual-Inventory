import { createClient } from '@supabase/supabase-js';

// Configuration
// Using the provided project details
const SUPABASE_URL = 'https://vytaokjhhmzgleasjoro.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GCHMY2_tstste2S_Wo5tFg_IYdqS8Qb';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

export interface ItemOverride {
  id: string; // Text PK
  is_hidden: boolean; // Bool
  product_image: string | null; // Text Nullable
}

export const supabaseService = {
  // Fetch all overrides on load
  async getOverrides(): Promise<ItemOverride[]> {
    const { data, error } = await supabase
      .from('inventory_overrides')
      .select('id, is_hidden, product_image');
    
    if (error) {
      console.error('Supabase: Error fetching overrides:', error);
      return [];
    }
    return data || [];
  },

  // Toggle visibility (Upsert)
  async toggleVisibility(id: string, newHiddenStatus: boolean): Promise<boolean> {
    console.log(`Supabase: Toggling visibility for ${id} to ${newHiddenStatus}`);
    
    // Using upsert to handle both insert and update.
    // We strictly map to the schema: id (text), is_hidden (bool).
    // Note: product_image is preserved by standard SQL upsert behavior on conflict if not specified.
    const { data, error } = await supabase
      .from('inventory_overrides')
      .upsert(
        { id: id, is_hidden: newHiddenStatus }, 
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Supabase: Error toggling visibility:', error);
      throw error;
    }

    // If RLS allows write but not read of the written row, data might be null, but error is null.
    // However, usually we want to confirm the write.
    if (!data) {
      console.warn('Supabase: Upsert successful but no data returned. Check RLS policies.');
    } else {
      console.log('Supabase: Persisted override:', data);
    }

    return newHiddenStatus;
  },

  // Upload image and save URL
  async uploadImage(id: string, file: File): Promise<string> {
    try {
      // 1. Upload to Storage
      // Sanitize filename
      const fileExt = file.name.split('.').pop();
      const cleanId = id.replace(/[^a-zA-Z0-9-_]/g, '_');
      const fileName = `${cleanId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Supabase: Storage upload error:', uploadError);
        throw uploadError;
      }

      // 2. Get Public URL
      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);
      
      const publicUrl = data.publicUrl;

      // 3. Save to Database (Upsert to preserve is_hidden if exists)
      // We pass only the fields we want to change/set.
      const { error: dbError } = await supabase
        .from('inventory_overrides')
        .upsert(
          { id: id, product_image: publicUrl }, 
          { onConflict: 'id' }
        )
        .select();

      if (dbError) {
        console.error('Supabase: Database image link error:', dbError);
        throw dbError;
      }

      return publicUrl;
    } catch (error) {
      console.error('Supabase: Error uploading image:', error);
      throw error;
    }
  }
};