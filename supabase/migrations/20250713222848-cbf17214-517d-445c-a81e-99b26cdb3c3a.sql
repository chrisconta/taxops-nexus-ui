-- Clear test data for fresh Mercury API testing
-- This removes all sync requests and logs while preserving Mercury credentials

-- Delete sync logs first (due to foreign key constraints)
DELETE FROM public.sync_logs;

-- Delete sync requests
DELETE FROM public.sync_requests;

-- Keep client_credentials and clients tables intact for Mercury connection