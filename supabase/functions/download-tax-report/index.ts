import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const { reportId, taxYear, fileName } = await req.json();

    // Query tax reports based on the provided criteria
    let query = supabase
      .from('tax_reports')
      .select('*')
      .eq('user_id', user.id);

    if (reportId) {
      query = query.eq('id', reportId);
    } else if (taxYear) {
      query = query.eq('tax_year', parseInt(taxYear));
    } else if (fileName) {
      // Search in both original_filename and description fields (case-insensitive)
      query = query.or(`original_filename.ilike.%${fileName}%,description.ilike.%${fileName}%`);
    }

    const { data: reports, error: queryError } = await query.order('created_at', { ascending: false }).limit(1);

    if (queryError) {
      throw new Error(`Database query failed: ${queryError.message}`);
    }

    if (!reports || reports.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No tax reports found matching the criteria',
          available_reports: await supabase
            .from('tax_reports')
            .select('id, original_filename, tax_year, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .then(({ data }) => data || [])
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const report = reports[0];

    // Generate a signed URL for downloading the file
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('tax-reports')
      .createSignedUrl(report.storage_path, 3600); // 1 hour expiry

    if (urlError) {
      throw new Error(`Failed to create download URL: ${urlError.message}`);
    }

    // Log the successful tool execution
    await supabase.from('agent_tool_logs').insert({
      user_id: user.id,
      tool_name: 'download_tax_report',
      parameters: { reportId, taxYear, fileName },
      success: true,
      result: {
        report_id: report.id,
        filename: report.original_filename,
        tax_year: report.tax_year,
        file_size: report.file_size
      },
      execution_time_ms: Date.now() - new Date().getTime()
    });

    return new Response(
      JSON.stringify({
        success: true,
        report: {
          id: report.id,
          filename: report.original_filename,
          tax_year: report.tax_year,
          file_size: report.file_size,
          description: report.description,
          upload_date: report.created_at,
          download_url: signedUrlData.signedUrl
        },
        message: `Tax report "${report.original_filename}" is ready for download.`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in download-tax-report function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});