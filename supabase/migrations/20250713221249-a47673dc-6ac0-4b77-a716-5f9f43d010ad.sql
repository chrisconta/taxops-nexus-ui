-- Clear mock/test data for fresh testing
-- This will remove all sync requests, logs, and related data for a clean start

-- Delete sync logs first (due to foreign key constraints)
DELETE FROM public.sync_logs;

-- Delete sync requests
DELETE FROM public.sync_requests;

-- Note: We're keeping client_credentials and clients tables intact
-- as they contain the actual Mercury connection setup