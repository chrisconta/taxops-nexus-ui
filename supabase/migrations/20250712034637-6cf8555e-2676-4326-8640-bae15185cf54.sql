-- Try inserting just one connection to see what the issue is
INSERT INTO public.connections (connection_type, title, category, description, enabled) 
VALUES ('quickbooks', 'QuickBooks Online', 'Accounting', 'Connect to QuickBooks Online for accounting data sync', true);