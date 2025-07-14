-- Make reports bucket public for download functionality
UPDATE storage.buckets 
SET public = true 
WHERE id = 'reports';