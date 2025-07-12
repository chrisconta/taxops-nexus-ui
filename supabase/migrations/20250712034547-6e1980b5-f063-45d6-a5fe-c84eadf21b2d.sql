-- Insert default connection types
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
('salesforce', 'Salesforce CRM', 'crm', 'Connect to Salesforce for customer relationship data', true)
ON CONFLICT (connection_type) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  enabled = EXCLUDED.enabled;