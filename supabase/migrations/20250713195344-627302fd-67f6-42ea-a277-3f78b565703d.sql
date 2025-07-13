-- Create sync_requests table for tracking Mercury sync operations
CREATE TABLE public.sync_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    connection_code TEXT NOT NULL,
    client_ids UUID[] NOT NULL,
    sync_type TEXT NOT NULL CHECK (sync_type IN ('automatic', 'historical')),
    frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    start_date DATE,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled')),
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sync_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for sync_requests
CREATE POLICY "Users can view their own sync requests" 
ON public.sync_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sync requests" 
ON public.sync_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync requests" 
ON public.sync_requests 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sync requests" 
ON public.sync_requests 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sync_requests_updated_at
BEFORE UPDATE ON public.sync_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create sync_logs table for detailed sync execution logs
CREATE TABLE public.sync_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sync_request_id UUID NOT NULL REFERENCES public.sync_requests(id) ON DELETE CASCADE,
    client_id UUID NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security for sync_logs
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for sync_logs
CREATE POLICY "Users can view sync logs for their requests" 
ON public.sync_logs 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.sync_requests 
    WHERE sync_requests.id = sync_logs.sync_request_id 
    AND sync_requests.user_id = auth.uid()
));

CREATE POLICY "System can insert sync logs" 
ON public.sync_logs 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_sync_requests_user_id_status ON public.sync_requests(user_id, status);
CREATE INDEX idx_sync_requests_next_run_at ON public.sync_requests(next_run_at) WHERE status = 'pending';
CREATE INDEX idx_sync_logs_sync_request_id ON public.sync_logs(sync_request_id);