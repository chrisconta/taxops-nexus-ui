-- Update sync_requests table to allow 'file_import' as a valid sync_type
ALTER TABLE public.sync_requests 
DROP CONSTRAINT sync_requests_sync_type_check;

ALTER TABLE public.sync_requests 
ADD CONSTRAINT sync_requests_sync_type_check 
CHECK (sync_type IN ('automatic', 'historical', 'file_import'));