import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MercuryTokenRequest {
  token: string;
}

interface MercuryAccount {
  id: string;
  name: string;
  accountNumber: string;
  type: string;
  status: string;
}

interface MercuryAccountsResponse {
  accounts: MercuryAccount[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token }: MercuryTokenRequest = await req.json()

    if (!token) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          isReadOnly: false,
          error: 'Token is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate token format (basic check)
    if (!token.startsWith('mercury_')) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          isReadOnly: false,
          error: 'Invalid Mercury token format' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Test the token by making a read-only API call to Mercury
    const mercuryResponse = await fetch('https://api.mercury.com/api/v1/accounts', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!mercuryResponse.ok) {
      const errorText = await mercuryResponse.text()
      console.error('Mercury API error:', errorText)
      
      if (mercuryResponse.status === 401) {
        return new Response(
          JSON.stringify({ 
            isValid: false, 
            isReadOnly: false,
            error: 'Invalid or expired token' 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          isValid: false, 
          isReadOnly: false,
          error: 'Failed to validate token with Mercury API' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const accountsData: MercuryAccountsResponse = await mercuryResponse.json()

    // Test if token has write permissions by attempting a read-only operation
    // that would fail if the token has write permissions (Mercury's security model)
    let isReadOnly = true;
    
    try {
      // Try to access token permissions endpoint if available
      const permissionsResponse = await fetch('https://api.mercury.com/api/v1/permissions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (permissionsResponse.ok) {
        const permissions = await permissionsResponse.json()
        // Check if token has write permissions
        if (permissions.permissions && Array.isArray(permissions.permissions)) {
          const hasWritePermissions = permissions.permissions.some((perm: string) => 
            perm.includes('write') || perm.includes('create') || perm.includes('update') || perm.includes('delete')
          )
          isReadOnly = !hasWritePermissions
        }
      }
    } catch (permError) {
      // If permissions endpoint fails, assume read-only (safer default)
      console.log('Permissions check failed, assuming read-only:', permError)
      isReadOnly = true
    }

    // Extract account information
    let accountInfo = null
    if (accountsData.accounts && accountsData.accounts.length > 0) {
      const primaryAccount = accountsData.accounts[0]
      accountInfo = {
        id: primaryAccount.id,
        name: primaryAccount.name || 'Mercury Account'
      }
    }

    return new Response(
      JSON.stringify({
        isValid: true,
        isReadOnly,
        accountInfo
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error validating Mercury token:', error)
    return new Response(
      JSON.stringify({ 
        isValid: false, 
        isReadOnly: false,
        error: 'Internal server error during token validation' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})