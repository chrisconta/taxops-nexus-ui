import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImportFile {
  id: string;
  name: string;
  type: string;
  columns: string[];
}

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  transform?: string;
}

interface ImportError {
  row: number;
  column: string;
  error: string;
  value: string;
}

interface ImportResult {
  fileId: string;
  fileName: string;
  status: 'success' | 'error' | 'partial';
  recordsInserted: number;
  recordsSkipped: number;
  totalRecords: number;
  errors: ImportError[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    const { files, mappings, connectionType, clientIds } = await req.json()

    if (!files || !Array.isArray(files)) {
      throw new Error('Invalid files data')
    }

    if (!mappings || typeof mappings !== 'object') {
      throw new Error('Invalid mappings data')
    }

    if (!clientIds || !Array.isArray(clientIds)) {
      throw new Error('Invalid client IDs')
    }

    // Create a sync request for file import
    const { data: syncRequest, error: syncError } = await supabase
      .from('sync_requests')
      .insert({
        user_id: user.id,
        connection_code: connectionType,
        client_ids: clientIds,
        sync_type: 'file_import',
        status: 'running'
      })
      .select()
      .single()

    if (syncError) {
      throw new Error(`Failed to create sync request: ${syncError.message}`)
    }

    // Process each file
    const results: ImportResult[] = []

    for (const file of files) {
      try {
        const result = await processFile(supabase, file, mappings[file.id] || [], syncRequest.id, clientIds[0])
        results.push(result)
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)
        results.push({
          fileId: file.id,
          fileName: file.name,
          status: 'error',
          recordsInserted: 0,
          recordsSkipped: 0,
          totalRecords: 0,
          errors: [{
            row: 0,
            column: 'general',
            error: error.message,
            value: ''
          }]
        })
      }
    }

    // Update sync request status
    const overallSuccess = results.every(r => r.status === 'success')
    const hasPartialSuccess = results.some(r => r.status === 'partial')
    
    await supabase
      .from('sync_requests')
      .update({
        status: overallSuccess ? 'success' : hasPartialSuccess ? 'partial' : 'failed',
        last_run_at: new Date().toISOString()
      })
      .eq('id', syncRequest.id)

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function processFile(
  supabase: any, 
  file: ImportFile, 
  mappings: ColumnMapping[], 
  syncRequestId: string, 
  clientId: string
): Promise<ImportResult> {
  const errors: ImportError[] = []
  let recordsInserted = 0
  let recordsSkipped = 0
  
  // This is a placeholder - in a real implementation, you would:
  // 1. Parse the actual file content from storage or base64 data
  // 2. Apply the column mappings
  // 3. Validate and transform the data
  // 4. Insert into the transactions table
  
  // For now, simulate processing
  const totalRecords = Math.floor(Math.random() * 100) + 1
  
  for (let i = 0; i < totalRecords; i++) {
    try {
      // Simulate data processing and insertion
      // In reality, you'd transform the data according to mappings
      // and insert into the appropriate tables
      
      // Simulate some records being skipped due to validation errors
      if (Math.random() < 0.05) { // 5% error rate
        errors.push({
          row: i + 1,
          column: 'amount',
          error: 'Invalid amount format',
          value: 'invalid_value'
        })
        recordsSkipped++
      } else {
        recordsInserted++
      }
    } catch (error) {
      errors.push({
        row: i + 1,
        column: 'general',
        error: error.message,
        value: ''
      })
      recordsSkipped++
    }
  }

  // Create sync log entry
  await supabase
    .from('sync_logs')
    .insert({
      sync_request_id: syncRequestId,
      client_id: clientId,
      status: errors.length === 0 ? 'success' : errors.length < totalRecords ? 'partial' : 'failed',
      records_processed: recordsInserted,
      error_message: errors.length > 0 ? `${errors.length} validation errors` : null
    })

  return {
    fileId: file.id,
    fileName: file.name,
    status: errors.length === 0 ? 'success' : errors.length < totalRecords ? 'partial' : 'error',
    recordsInserted,
    recordsSkipped,
    totalRecords,
    errors
  }
}