-- Add unique constraint on connection_type for connections table
CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_type_unique 
ON public.connections (connection_type);

-- Insert default connection types (without ON CONFLICT for now)
DELETE FROM public.connections; -- Clear existing data first

INSERT INTO public.connections (connection_type, title, category, description, enabled) VALUES
('quickbooks', 'QuickBooks Online', 'accounting', 'Connect to QuickBooks Online for accounting data sync', true),
('xero', 'Xero', 'accounting', 'Connect to Xero for accounting data sync', true),
('sat', 'SAT (México)', 'tax', 'Connect to SAT for Mexican tax compliance', true),
('netsuite', 'NetSuite ERP', 'erp', 'Connect to NetSuite for comprehensive business data', true),
('gusto', 'Gusto Payroll', 'payroll', 'Connect to Gusto for payroll management', true),
('adp', 'ADP Workforce', 'payroll', 'Connect to ADP for payroll and HR data', true),
('plaid', 'Plaid Banking', 'banking', 'Connect to banks via Plaid for financial data', true),
('stripe', 'Stripe Payments', 'payments', 'Connect to Stripe for payment processing data', true),
('square', 'Square POS', 'payments', 'Connect to Square for point-of-sale data', true),
('salesforce', 'Salesforce CRM', 'crm', 'Connect to Salesforce for customer relationship data', true);