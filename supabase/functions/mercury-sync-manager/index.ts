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
      console.error('No authorization header provided')
      throw new Error('No authorization header')
    }

    // Get user from JWT token
    const token = authHeader.replace('Bearer ', '')
    console.log('Extracting user from token...')
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    console.log('User extracted:', { userId: user?.id, email: user?.email })
    
    if (authError) {
      console.error('Auth error:', authError)
    }

    if (authError || !user) {
      throw new Error(`Authentication failed: ${authError?.message || 'No user found'}`)
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    console.log('Action requested:', action, 'Method:', req.method)

    if (req.method === 'POST') {
      if (action === 'create-sync') {
        return await createSyncRequest(req, supabaseClient, user.id)
      } else if (action === 'execute-sync') {
        return await executeSyncRequest(req, supabaseClient, user.id)
      }
    } else if (req.method === 'GET') {
      if (action === 'list-syncs') {
        return await listSyncRequests(supabaseClient, user.id)
      } else if (action === 'get-sync-details') {
        const syncId = url.searchParams.get('sync_id')
        if (!syncId) {
          throw new Error('sync_id parameter required for get-sync-details')
        }
        return await getSyncDetails(supabaseClient, user.id, syncId)
      } else if (action === 'transactions') {
        const syncId = url.searchParams.get('sync_id')
        if (!syncId) {
          throw new Error('sync_id parameter required for transactions')
        }
        return await getTransactionData(supabaseClient, user.id, syncId)
      } else if (action === 'process-scheduled') {
        return await processScheduledSyncs(supabaseClient)
      }
    } else if (req.method === 'DELETE') {
      if (action === 'cancel-sync') {
        const syncId = url.searchParams.get('sync_id')
        return await cancelSyncRequest(supabaseClient, user.id, syncId)
      }
    }

    console.error('Invalid action or method combination:', { action, method: req.method })
    return new Response(
      JSON.stringify({ error: 'Invalid action or method' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in mercury-sync-manager:', error)
    console.error('Error stack:', error.stack)
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
  console.log('Listing sync requests for user:', userId)
  
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

  console.log('Query result:', { data, error })

  if (error) {
    console.error('Database query error:', error)
    throw new Error(`Failed to fetch sync requests: ${error.message}`)
  }

  return new Response(
    JSON.stringify({ sync_requests: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function cancelSyncRequest(supabaseClient: any, userId: string, syncId: string | null) {
  console.log('Cancelling sync request:', { userId, syncId })
  
  if (!syncId) {
    throw new Error('Sync ID is required')
  }

  const { error } = await supabaseClient
    .from('sync_requests')
    .update({ status: 'cancelled' })
    .eq('id', syncId)
    .eq('user_id', userId)

  if (error) {
    console.error('Cancel sync error:', error)
    throw new Error(`Failed to cancel sync: ${error.message}`)
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Sync cancelled successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getSyncDetails(supabaseClient: any, userId: string, syncId: string) {
  console.log('Getting sync details for:', { userId, syncId })
  
  // First verify the sync request belongs to the user
  const { data: syncRequest, error: syncError } = await supabaseClient
    .from('sync_requests')
    .select('*')
    .eq('id', syncId)
    .eq('user_id', userId)
    .single()

  if (syncError || !syncRequest) {
    throw new Error('Sync request not found or access denied')
  }

  // Get sync logs for this request
  const { data: syncLogs, error: logsError } = await supabaseClient
    .from('sync_logs')
    .select('*')
    .eq('sync_request_id', syncId)
    .order('created_at', { ascending: false })

  if (logsError) {
    console.error('Error fetching sync logs:', logsError)
  }

  return new Response(JSON.stringify({ 
    sync_request: syncRequest,
    sync_logs: syncLogs || [] 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  })
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
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getTransactionData(supabaseClient: any, userId: string, syncId: string) {
  console.log('Getting transaction data for sync:', { userId, syncId })
  
  // First verify the sync request belongs to the user
  const { data: syncRequest, error: syncError } = await supabaseClient
    .from('sync_requests')
    .select('*')
    .eq('id', syncId)
    .eq('user_id', userId)
    .single()

  if (syncError || !syncRequest) {
    throw new Error('Sync request not found or access denied')
  }

  // Get client credentials for Mercury API
  const clientId = syncRequest.client_ids[0] // Use first client for now
  const { data: credentials, error: credError } = await supabaseClient
    .from('client_credentials')
    .select('credentials')
    .eq('client_id', clientId)
    .eq('code', 'mercury')
    .eq('status', 'connected')
    .single()

  if (credError || !credentials) {
    throw new Error('No valid Mercury credentials found for this sync request')
  }

  try {
    // Get Mercury API token - using the correct field name
    const mercuryToken = credentials.credentials?.api_token
    if (!mercuryToken) {
      throw new Error('Mercury API token not found in credentials')
    }

    console.log('Using Mercury token for API calls')
    
    // Helper function for Mercury API headers with proper authentication
    function mercuryHeaders(rawToken: string) {
      const bearer = rawToken.startsWith('secret-token:') ? rawToken : `secret-token:${rawToken}`;
      return {
        'Authorization': `Bearer ${bearer}`,
        'accept': 'application/json'
      };
    }

    // Helper function to fetch all transactions with pagination
    async function fetchAllTransactions(accountId: string, token: string, startDate: string, endDate: string) {
      let url = `https://api.mercury.com/api/v1/account/${accountId}/transactions?start_date=${startDate}&end_date=${endDate}&page_size=500`;
      const allTransactions: any[] = [];
      let pageCount = 0;
      
      console.log(`Fetching transactions for account ${accountId} from ${startDate} to ${endDate}`);
      
      while (url) {
        pageCount++;
        console.log(`Fetching page ${pageCount} for account ${accountId}:`, url);
        
        const response = await fetch(url, { 
          method: 'GET',
          headers: mercuryHeaders(token) 
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Transaction API error for account ${accountId}: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        const transactions = data.transactions || [];
        allTransactions.push(...transactions);
        
        console.log(`Page ${pageCount} fetched: ${transactions.length} transactions (total: ${allTransactions.length})`);
        
        // Check for next page
        if (data.next_page_token) {
          const baseUrl = `https://api.mercury.com/api/v1/account/${accountId}/transactions`;
          url = `${baseUrl}?page_token=${data.next_page_token}&start_date=${startDate}&end_date=${endDate}&page_size=500`;
        } else {
          url = null;
        }
      }
      
      console.log(`Finished fetching account ${accountId}: ${allTransactions.length} total transactions across ${pageCount} pages`);
      return allTransactions;
    }

    // Helper function for simple Mercury API calls
    const mercuryFetch = async (endpoint: string) => {
      const url = `https://api.mercury.com/api/v1${endpoint}`
      console.log('Calling Mercury API:', url)
      
      return await fetch(url, {
        method: 'GET',
        headers: mercuryHeaders(mercuryToken)
      })
    }

    // Step 1: Get all Mercury accounts
    const accountsResponse = await mercuryFetch('/accounts')
    
    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text()
      throw new Error(`Mercury accounts API error: ${accountsResponse.status} ${accountsResponse.statusText} - ${errorText}`)
    }

    const accountsData = await accountsResponse.json()
    console.log('Mercury accounts fetched:', { count: accountsData?.accounts?.length })
    
    const accounts = accountsData.accounts || []
    let allTransactions: any[] = []

    // Step 2: Get transactions for each account with pagination and server-side date filtering
    const startISO = syncRequest.start_date || '2025-01-01';
    const endISO = syncRequest.end_date || '2025-12-31';
    
    for (const account of accounts) {
      try {
        console.log(`Fetching all transactions for account ${account.id} from ${startISO} to ${endISO}`);
        const accountTransactions = await fetchAllTransactions(account.id, mercuryToken, startISO, endISO);
        allTransactions.push(...accountTransactions);
        console.log(`Account ${account.id}: ${accountTransactions.length} transactions fetched`);
      } catch (error) {
        console.warn(`Error fetching transactions for account ${account.id}:`, error);
      }
    }

    // Step 3: Transform Mercury API data to our format
    const transactions = allTransactions
      .map((tx: any) => ({
        id: tx.id,
        postedAt: tx.postedAt,
        amount: tx.amount, // Mercury amount in cents
        counterpartyName: tx.counterpartyName || 'Unknown',
        note: tx.note || '',
        status: tx.status || 'posted'
      }))
      .sort((a: any, b: any) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())

    console.log('Total transactions processed:', transactions.length)

    return new Response(JSON.stringify({ 
      transactions,
      total_count: transactions.length,
      sync_request_id: syncId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Error fetching Mercury transactions:', error)
    
    // Return the actual error instead of falling back to mock data
    throw new Error(`Mercury API error: ${error.message}`)
  }
}

function generateMockTransactions(syncId: string, startDate?: string, endDate?: string) {
  const start = new Date(startDate || '2025-06-01')
  const end = new Date(endDate || '2025-06-30')
  
  const transactions = []
  const transactionTypes = [
    'Payment received', 'Wire transfer', 'ACH deposit', 'Check deposit',
    'Payment sent', 'Wire sent', 'ACH transfer', 'Service fee',
    'Interest earned', 'Dividend payment', 'Refund received', 'Subscription payment'
  ]
  
  const companies = [
    'Acme Corp', 'Global Industries', 'Tech Solutions Inc', 'Marketing Partners',
    'Supply Chain Co', 'Professional Services', 'Digital Agency', 'Consulting Group'
  ]

  for (let i = 0; i < 50; i++) {
    const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime())
    const transactionDate = new Date(randomTime)
    const amount = (Math.random() - 0.3) * 20000
    const isCredit = amount > 0
    
    transactions.push({
      id: `txn_${syncId.substring(0, 8)}_${i.toString().padStart(3, '0')}`,
      date: transactionDate.toISOString().split('T')[0],
      description: `${transactionTypes[Math.floor(Math.random() * transactionTypes.length)]} - ${companies[Math.floor(Math.random() * companies.length)]}`,
      amount: Math.abs(amount).toFixed(2),
      type: isCredit ? 'credit' : 'debit',
      status: Math.random() > 0.05 ? 'completed' : 'pending',
      category: isCredit ? 'income' : 'expense',
      balance_after: (50000 + Math.random() * 100000).toFixed(2)
    })
  }

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}