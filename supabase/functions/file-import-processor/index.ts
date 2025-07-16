import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { action, ...params } = await req.json()

    switch (action) {
      case 'add_column':
        return await addColumn(supabase, params)
      case 'bulk_import':
        return await bulkImport(supabase, params)
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function addColumn(supabase: any, params: any) {
  const { table_name, column_name, column_type } = params
  
  // Add column to database
  const { error } = await supabase.rpc('execute_dynamic_sql', {
    query: `ALTER TABLE ${table_name} ADD COLUMN IF NOT EXISTS ${column_name} ${column_type}`
  })
  
  if (error) throw error
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function bulkImport(supabase: any, params: any) {
  // Implementation for bulk import would go here
  return new Response(JSON.stringify({ success: true, records_imported: 0 }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}