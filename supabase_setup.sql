-- 1. Create the overrides table
CREATE TABLE IF NOT EXISTS inventory_overrides (
    id TEXT PRIMARY KEY,
    is_hidden BOOLEAN DEFAULT FALSE,
    product_image TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create Storage Bucket for images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE inventory_overrides ENABLE ROW LEVEL SECURITY;

-- 4. Create Policy: Allow Public Read Access
-- (Everyone can see which items are hidden or have custom images)
CREATE POLICY "Enable read access for all users" 
ON inventory_overrides FOR SELECT 
USING (true);

-- 5. Create Policy: Allow Public Insert/Update (In a real app, you would restrict this to authenticated users)
-- Since this is a demo/internal tool using a client-side key without auth, we allow public writes for now.
CREATE POLICY "Enable insert/update for all users" 
ON inventory_overrides FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Enable update for all users" 
ON inventory_overrides FOR UPDATE 
USING (true);

-- 6. Storage Policies
CREATE POLICY "Give public access to images" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'product-images' );

CREATE POLICY "Allow public upload" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'product-images' );