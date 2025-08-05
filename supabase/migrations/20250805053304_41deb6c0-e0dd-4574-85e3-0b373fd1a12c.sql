-- Create tax_reports table for storing tax document metadata
CREATE TABLE public.tax_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  tax_year INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tax_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for tax_reports
CREATE POLICY "Users can view their own tax reports" 
ON public.tax_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tax reports" 
ON public.tax_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tax reports" 
ON public.tax_reports 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tax reports" 
ON public.tax_reports 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tax_reports_updated_at
BEFORE UPDATE ON public.tax_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for tax reports if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tax-reports', 'tax-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for tax reports
CREATE POLICY "Users can upload their own tax reports" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'tax-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own tax reports" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'tax-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own tax reports" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'tax-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own tax reports" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'tax-reports' AND auth.uid()::text = (storage.foldername(name))[1]);