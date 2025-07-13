import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncRequest {
  connection_code: string
  client_ids: string[]
  sync_type: 'automatic' | 'historical'
  frequency?: 'daily' | 'weekly' | 'monthly'
  start_date?: string
  end_date?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader)
    
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Get user from JWT token
    const token = authHeader.replace('Bearer ', '')
    console.log('Extracting user from token...')
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    console.log('User extracted:', { userId: user?.id, email: user?.email })
    console.log('Auth error:', authError)

    if (authError || !user) {
      throw new Error(`Authentication failed: ${authError?.message || 'No user found'}`)
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    if (req.method === 'POST') {
      if (action === 'create-sync') {
        return await createSyncRequest(req, supabaseClient, user.id)
      } else if (action === 'execute-sync') {
        return await executeSyncRequest(req, supabaseClient, user.id)
      }
    } else if (req.method === 'GET') {
      if (action === 'list-syncs') {
        return await listSyncRequests(supabaseClient, user.id)
      } else if (action === 'process-scheduled') {
        return await processScheduledSyncs(supabaseClient)
      }
    } else if (req.method === 'DELETE') {
      if (action === 'cancel-sync') {
        const syncId = url.searchParams.get('sync_id')
        return await cancelSyncRequest(supabaseClient, user.id, syncId)
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in mercury-sync-manager:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function createSyncRequest(req: Request, supabaseClient: any, userId: string) {
  const syncRequest: SyncRequest = await req.json()
  
  console.log('Creating sync request:', { userId, syncRequest })
  
  // Validate required fields
  if (!syncRequest.connection_code || !syncRequest.client_ids || !Array.isArray(syncRequest.client_ids) || syncRequest.client_ids.length === 0) {
    throw new Error('Missing required fields: connection_code and client_ids array')
  }
  
  if (!syncRequest.sync_type || !['automatic', 'historical'].includes(syncRequest.sync_type)) {
    throw new Error('Invalid sync_type. Must be "automatic" or "historical"')
  }
  
  // Calculate next_run_at for automatic syncs
  let nextRunAt = null
  if (syncRequest.sync_type === 'automatic' && syncRequest.frequency) {
    const now = new Date()
    switch (syncRequest.frequency) {
      case 'daily':
        nextRunAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        break
      case 'weekly':
        nextRunAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        break
      case 'monthly':
        nextRunAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
        break
    }
  }

  console.log('Inserting sync request with userId:', userId)
  
  const { data, error } = await supabaseClient
    .from('sync_requests')
    .insert({
      user_id: userId,
      connection_code: syncRequest.connection_code,
      client_ids: syncRequest.client_ids,
      sync_type: syncRequest.sync_type,
      frequency: syncRequest.frequency,
      start_date: syncRequest.start_date,
      end_date: syncRequest.end_date,
      next_run_at: nextRunAt?.toISOString(),
      status: 'pending'
    })
    .select()
    .single()

  console.log('Insert result:', { data, error })

  if (error) {
    console.error('Database insert error:', error)
    throw new Error(`Failed to create sync request: ${error.message}`)
  }

  // For historical syncs, execute immediately
  if (syncRequest.sync_type === 'historical') {
    await executeSyncById(supabaseClient, data.id)
  }

  return new Response(
    JSON.stringify({ success: true, sync_request: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function executeSyncRequest(req: Request, supabaseClient: any, userId: string) {
  const { sync_id } = await req.json()
  
  const { data: syncRequest, error } = await supabaseClient
    .from('sync_requests')
    .select('*')
    .eq('id', sync_id)
    .eq('user_id', userId)
    .single()

  if (error || !syncRequest) {
    throw new Error('Sync request not found')
  }

  return await executeSyncById(supabaseClient, sync_id)
}

async function executeSyncById(supabaseClient: any, syncId: string) {
  console.log('Executing sync request:', syncId)
  
  // Update status to running
  await supabaseClient
    .from('sync_requests')
    .update({ 
      status: 'running',
      last_run_at: new Date().toISOString()
    })
    .eq('id', syncId)

  try {
    // Get sync request details
    const { data: syncRequest } = await supabaseClient
      .from('sync_requests')
      .select('*')
      .eq('id', syncId)
      .single()

    // Process each client
    for (const clientId of syncRequest.client_ids) {
      const startTime = Date.now()
      
      try {
        // Get client credentials for Mercury
        const { data: credentials } = await supabaseClient
          .from('client_credentials')
          .select('credentials')
          .eq('client_id', clientId)
          .eq('code', 'mercury')
          .eq('status', 'connected')
          .single()

        if (!credentials) {
          throw new Error('No valid Mercury credentials found')
        }

        // Simulate Mercury API call for demo
        // In production, this would make actual Mercury API calls
        const recordsProcessed = Math.floor(Math.random() * 100) + 50
        
        // Log successful sync
        await supabaseClient
          .from('sync_logs')
          .insert({
            sync_request_id: syncId,
            client_id: clientId,
            status: 'success',
            records_processed: recordsProcessed,
            execution_time_ms: Date.now() - startTime
          })

      } catch (clientError) {
        console.error('Client sync error:', clientError)
        
        // Log failed sync
        await supabaseClient
          .from('sync_logs')
          .insert({
            sync_request_id: syncId,
            client_id: clientId,
            status: 'failed',
            error_message: clientError.message,
            execution_time_ms: Date.now() - startTime
          })
      }
    }

    // Calculate next run for automatic syncs
    let nextRunAt = null
    if (syncRequest.sync_type === 'automatic' && syncRequest.frequency) {
      const now = new Date()
      switch (syncRequest.frequency) {
        case 'daily':
          nextRunAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
          break
        case 'weekly':
          nextRunAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          break
        case 'monthly':
          nextRunAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
          break
      }
    }

    // Update sync request to completed
    await supabaseClient
      .from('sync_requests')
      .update({ 
        status: 'success',
        next_run_at: nextRunAt?.toISOString()
      })
      .eq('id', syncId)

    return new Response(
      JSON.stringify({ success: true, message: 'Sync completed successfully' }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Sync execution error:', error)
    
    await supabaseClient
      .from('sync_requests')
      .update({ 
        status: 'failed',
        error_message: error.message
      })
      .eq('id', syncId)

    throw error
  }
}

async function listSyncRequests(supabaseClient: any, userId: string) {
  const { data, error } = await supabaseClient
    .from('sync_requests')
    .select(`
      *,
      sync_logs (
        client_id,
        status,
        records_processed,
        error_message,
        created_at
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch sync requests: ${error.message}`)
  }

  return new Response(
    JSON.stringify({ sync_requests: data }),
    { headers: { 'Content-Type': 'application/json' } }
  )
}

async function cancelSyncRequest(supabaseClient: any, userId: string, syncId: string | null) {
  if (!syncId) {
    throw new Error('Sync ID is required')
  }

  const { error } = await supabaseClient
    .from('sync_requests')
    .update({ status: 'cancelled' })
    .eq('id', syncId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to cancel sync: ${error.message}`)
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Sync cancelled successfully' }),
    { headers: { 'Content-Type': 'application/json' } }
  )
}

async function processScheduledSyncs(supabaseClient: any) {
  // This function would be called by a cron job to process scheduled syncs
  const { data: scheduledSyncs, error } = await supabaseClient
    .from('sync_requests')
    .select('*')
    .eq('status', 'pending')
    .lte('next_run_at', new Date().toISOString())

  if (error) {
    throw new Error(`Failed to fetch scheduled syncs: ${error.message}`)
  }

  for (const sync of scheduledSyncs) {
    try {
      await executeSyncById(supabaseClient, sync.id)
    } catch (error) {
      console.error('Failed to execute scheduled sync:', sync.id, error)
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      processed: scheduledSyncs.length,
      message: `Processed ${scheduledSyncs.length} scheduled syncs` 
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
}