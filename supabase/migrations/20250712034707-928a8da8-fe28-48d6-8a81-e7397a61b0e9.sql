-- Clear existing data and insert with correct categories
DELETE FROM public.connections;

-- Insert default connection types with allowed categories
INSERT INTO public.connections (connection_type, title, category, description, enabled) VALUES
('quickbooks', 'QuickBooks Online', 'bookkeeping', 'Connect to QuickBooks Online for accounting data sync', true),
('xero', 'Xero', 'bookkeeping', 'Connect to Xero for accounting data sync', true),
('sat', 'SAT (México)', 'bookkeeping', 'Connect to SAT for Mexican tax compliance', true),
('netsuite', 'NetSuite ERP', 'erp', 'Connect to NetSuite for comprehensive business data', true),
('gusto', 'Gusto Payroll', 'erp', 'Connect to Gusto for payroll management', true),
('adp', 'ADP Workforce', 'erp', 'Connect to ADP for payroll and HR data', true),
('plaid', 'Plaid Banking', 'banks', 'Connect to banks via Plaid for financial data', true),
('stripe', 'Stripe Payments', 'bookkeeping', 'Connect to Stripe for payment processing data', true),
('square', 'Square POS', 'bookkeeping', 'Connect to Square for point-of-sale data', true),
('salesforce', 'Salesforce CRM', 'erp', 'Connect to Salesforce for customer relationship data', true);