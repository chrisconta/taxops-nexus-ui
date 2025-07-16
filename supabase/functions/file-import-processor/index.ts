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
  data?: any[]; // Parsed CSV data rows
}

interface ColumnMapping {
  fileColumn: string;
  targetField: string;
  isNewColumn?: boolean;
  newColumnName?: string;
  newColumnType?: string;
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

    console.log('Received import request:', {
      fileCount: files?.length,
      mappingCount: Object.keys(mappings || {}).length,
      connectionType,
      clientIds
    })

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
  
  console.log(`Processing file: ${file.name} with ${file.data?.length || 0} rows`)
  
  // Get the actual file data (should be passed from the frontend)
  const fileData = file.data || []
  const totalRecords = fileData.length
  
  console.log(`Total records to process: ${totalRecords}`)
  
  // Create a mapping lookup for faster processing
  const mappingLookup = new Map<string, ColumnMapping>()
  mappings.forEach(mapping => {
    mappingLookup.set(mapping.fileColumn, mapping)
  })
  
  console.log('Mapping lookup:', Array.from(mappingLookup.entries()))
  console.log('Sample row structure:', fileData[0] ? Object.keys(fileData[0]) : 'No data')
  
  // Process each row of data
  for (let i = 0; i < totalRecords; i++) {
    try {
      const row = fileData[i]
      const transformedRow: any = {}
      let hasValidData = false
      let rowErrors: ImportError[] = []
      
      // Apply column mappings
      for (const [sourceColumn, value] of Object.entries(row)) {
        const mapping = mappingLookup.get(sourceColumn)
        if (mapping && mapping.targetField !== 'none') {
          console.log(`Processing column '${sourceColumn}' -> '${mapping.targetField}' with value:`, value)
          try {
            // Transform the value based on target field
            let transformedValue = value
            
            // Mercury-specific fields go to a separate object
            const mercuryFields = ['category_code', 'account_number', 'merchant_name']
            
            if (mercuryFields.includes(mapping.targetField)) {
              // Store Mercury-specific fields separately
              if (!transformedRow._mercury) {
                transformedRow._mercury = {}
              }
              transformedRow._mercury[mapping.targetField] = value
              hasValidData = true
            } else {
              // Handle amount transformation (convert to cents)
              if (mapping.targetField === 'amount_cents') {
                if (value && typeof value === 'string') {
                  const numValue = parseFloat(value.replace(/[,$]/g, ''))
                  if (isNaN(numValue)) {
                    rowErrors.push({
                      row: i + 1,
                      column: sourceColumn,
                      error: 'Invalid amount format',
                      value: value as string
                    })
                    continue
                  }
                  transformedValue = Math.round(numValue * 100) // Convert to cents
                } else {
                  transformedValue = 0
                }
              }
              
              // Handle date transformations
              if (mapping.targetField.includes('_at') || mapping.targetField.includes('_date')) {
                if (value && typeof value === 'string') {
                  const dateValue = new Date(value)
                  if (isNaN(dateValue.getTime())) {
                    rowErrors.push({
                      row: i + 1,
                      column: sourceColumn,
                      error: 'Invalid date format',
                      value: value as string
                    })
                    continue
                  }
                  transformedValue = dateValue.toISOString()
                }
              }
              
              transformedRow[mapping.targetField] = transformedValue
              hasValidData = true
            }
          } catch (error) {
            rowErrors.push({
              row: i + 1,
              column: sourceColumn,
              error: `Transformation error: ${error.message}`,
              value: value as string
            })
          }
        } else {
          console.log(`No mapping found for column '${sourceColumn}' or targetField is 'none'`)
        }
      }
      
      console.log(`Row ${i + 1} - hasValidData: ${hasValidData}, rowErrors: ${rowErrors.length}, transformedRow:`, transformedRow)
      
      // Add any row-level errors to the main errors array
      errors.push(...rowErrors)
      
      // If there were errors or no valid data, skip this row
      if (rowErrors.length > 0 || !hasValidData) {
        console.log(`Skipping row ${i + 1} - rowErrors: ${rowErrors.length}, hasValidData: ${hasValidData}`)
        recordsSkipped++
        continue
      }
      
      // Extract Mercury data from the _mercury object
      const mercuryData = transformedRow._mercury || {}
      
      // Remove _mercury from the object before inserting into transactions
      const { _mercury, ...transactionData } = transformedRow
      
      // Add required fields
      transactionData.sync_request_id = syncRequestId
      transactionData.client_id = clientId
      transactionData.connection_code = 'mercury'
      transactionData.transaction_type = 'mercury'
      
      // Add mercury_transaction_id if not present
      if (!transactionData.mercury_transaction_id) {
        transactionData.mercury_transaction_id = `imported_${syncRequestId}_${i}`
      }
      
      console.log(`Inserting row ${i + 1}:`, JSON.stringify(transactionData, null, 2))
      
      // Insert into transactions table
      const { data: insertedTransaction, error: insertError } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single()
      
      if (insertError) {
        console.error(`Insert error for row ${i + 1}:`, insertError)
        errors.push({
          row: i + 1,
          column: 'general',
          error: `Database insert error: ${insertError.message}`,
          value: ''
        })
        recordsSkipped++
      } else {
        recordsInserted++
        console.log(`Successfully inserted transaction ${insertedTransaction.id}`)
        
        // Insert Mercury-specific data if this is a Mercury transaction
        if (insertedTransaction && insertedTransaction.id && Object.keys(mercuryData).length > 0) {
          const mercuryInsertData = {
            transaction_id: insertedTransaction.id,
            account_number: mercuryData.account_number || null,
            merchant_name: mercuryData.merchant_name || null,
            category_code: mercuryData.category_code || null
          }
          
          console.log(`Inserting Mercury data for transaction ${insertedTransaction.id}:`, mercuryInsertData)
          
          const { error: mercuryError } = await supabase
            .from('transactions_mercury')
            .insert(mercuryInsertData)
          
          if (mercuryError) {
            console.error(`Mercury data insert error for row ${i + 1}:`, mercuryError)
            // Don't fail the whole transaction for Mercury data errors
          } else {
            console.log(`Successfully inserted Mercury data for transaction ${insertedTransaction.id}`)
          }
        }
      }
      
    } catch (error) {
      console.error(`Processing error for row ${i + 1}:`, error)
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