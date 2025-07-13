import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MercuryAccount {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface MercuryApiResponse {
  accounts: MercuryAccount[];
}

Deno.serve(async (req) => {
  console.log('Test Mercury connection function called')

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { connectionId } = await req.json()
    console.log('Testing connection for ID:', connectionId)

    if (!connectionId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Connection ID is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Fetch the connection credentials from the database
    const { data: connection, error: fetchError } = await supabase
      .from('client_credentials')
      .select('credentials, code, name')
      .eq('id', connectionId)
      .single()

    if (fetchError || !connection) {
      console.error('Error fetching connection:', fetchError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Connection not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify this is a Mercury connection
    if (connection.code !== 'mercury') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'This function only supports Mercury connections' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extract API token from credentials
    const apiToken = connection.credentials?.api_token
    if (!apiToken) {
      console.error('No API token found in credentials')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Mercury API token not found in connection credentials' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Making request to Mercury API with token:', apiToken.substring(0, 10) + '...')

    // Test the Mercury API connection
    const mercuryResponse = await fetch('https://backend.mercury.com/api/v1/accounts', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('Mercury API response status:', mercuryResponse.status)

    if (!mercuryResponse.ok) {
      const errorText = await mercuryResponse.text()
      console.error('Mercury API error:', errorText)
      
      let errorMessage = 'Failed to connect to Mercury API'
      if (mercuryResponse.status === 401) {
        errorMessage = 'Invalid or expired Mercury API token'
      } else if (mercuryResponse.status === 403) {
        errorMessage = 'Mercury API token does not have required permissions'
      } else if (mercuryResponse.status >= 500) {
        errorMessage = 'Mercury API is currently unavailable'
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          statusCode: mercuryResponse.status
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const mercuryData: MercuryApiResponse = await mercuryResponse.json()
    console.log('Mercury API success, accounts found:', mercuryData.accounts?.length || 0)

    // Update connection status to connected if test is successful
    const { error: updateError } = await supabase
      .from('client_credentials')
      .update({ 
        status: 'connected',
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    if (updateError) {
      console.error('Error updating connection status:', updateError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully connected to Mercury. Found ${mercuryData.accounts?.length || 0} accounts.`,
        accountCount: mercuryData.accounts?.length || 0
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error in test Mercury connection:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An unexpected error occurred while testing the connection' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})