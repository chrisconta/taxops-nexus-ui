-- Rename rfc column to taxid in clients table
ALTER TABLE public.clients RENAME COLUMN rfc TO taxid;