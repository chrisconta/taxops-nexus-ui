
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Report keywords for intent detection
const REPORT_KEYWORDS = {
  // Financial statements
  'profit-loss':    ['profit and loss', 'p&l', 'income statement', 'profit loss'],
  'balance-sheet':  ['balance sheet', 'balance sheet statement'],
  'cash-flow':      ['cash flow', 'cash flow statement', 'cash-flow'],

  // Tax returns
  'form-1040':      ['form 1040', '1040', 'individual income tax'],
  'form-1065':      ['form 1065', '1065', 'partnership return'],
  'form-1120':      ['form 1120', '1120', 'corporation income tax']
};

// Available report types with display names
const AVAILABLE_REPORTS = [
  // Financial statements
  { key: 'profit-loss',    name: 'Profit & Loss Statement'    },
  { key: 'balance-sheet',  name: 'Balance Sheet Statement'    },
  { key: 'cash-flow',      name: 'Cash Flow Statement'        },

  // Tax returns
  { key: 'form-1040',      name: 'IRS Form 1040 (Individual)' },
  { key: 'form-1065',      name: 'IRS Form 1065 (Partnership)'},
  { key: 'form-1120',      name: 'IRS Form 1120 (C Corp)'     }
];

// Check if message is a report intent
function isReportIntent(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return Object.values(REPORT_KEYWORDS)
    .flat()
    .some(keyword => lowerMessage.includes(keyword)) ||
    lowerMessage.includes('report') ||
    lowerMessage.includes('generate') ||
    lowerMessage.includes('create');
}

// Detect specific report type from message
function detectReportType(message: string): string | null {
  const lowerMessage = message.toLowerCase();
  
  for (const [reportKey, keywords] of Object.entries(REPORT_KEYWORDS)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      return reportKey;
    }
  }
  
  return null;
}

// Extract parameters from message using regex
function extractParamsFromMessage(message: string): { 
  reportType?: string, 
  clientId?: string, 
  startDate?: string, 
  endDate?: string 
} {
  const params: { reportType?: string, clientId?: string, startDate?: string, endDate?: string } = {};
  
  // Detect report type
  params.reportType = detectReportType(message);
  
  // Try to extract dates (YYYY-MM-DD format)
  const dateRegex = /(\d{4}-\d{2}-\d{2})/g;
  const dates = message.match(dateRegex);
  if (dates && dates.length >= 2) {
    params.startDate = dates[0];
    params.endDate = dates[1];
  }
  
  // Try to extract client name (basic patterns)
  const clientPatterns = [
    /client\s+(\w+)/i,
    /for\s+(\w+)/i,
    /company\s+(\w+)/i
  ];
  
  for (const pattern of clientPatterns) {
    const match = message.match(pattern);
    if (match) {
      params.clientId = match[1];
      break;
    }
  }
  
  return params;
}

// Load and filter transaction data
async function loadTransactionData(
  supabaseClient: any, 
  clientId: string, 
  startDate: string, 
  endDate: string, 
  filters?: any
) {
  const { data: transactions, error } = await supabaseClient
    .from('transactions')
    .select('posted_at, amount_cents, counterparty, note, status, connection_code')
    .eq('client_id', clientId)
    .gte('posted_at', startDate)
    .lte('posted_at', endDate + 'T23:59:59')
    .order('posted_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  const formattedTransactions = (transactions || []).map(tx => ({
    date: tx.posted_at?.split('T')[0],
    amount: tx.amount_cents / 100,
    counterparty: tx.counterparty,
    note: tx.note,
    status: tx.status,
    connection: tx.connection_code
  }));

  return applyFilters(formattedTransactions, filters);
}

// Apply filters to transaction data
function applyFilters(transactions: any[], filters?: any): any[] {
  if (!filters) return transactions;
  
  return transactions.filter(tx => {
    // Drop zero amounts if specified
    if (filters.dropZeroAmounts && tx.amount === 0) return false;
    
    // Min amount filter
    if (filters.minAmount && tx.amount < filters.minAmount) return false;
    
    // Transaction type filter
    if (filters.allowedTransactionTypes && 
        !filters.allowedTransactionTypes.includes(tx.type)) return false;
    
    return true;
  });
}

// Simple template replacement
function processTemplate(template: string, context: any): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return String(context[key] || '');
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error(`Authentication failed: ${authError?.message || 'No user found'}`);
    }

    const { message, conversation_id } = await req.json();

    if (!message || message.length > 4000) {
      throw new Error('Invalid message: must be between 1-4000 characters');
    }

    // ===== REPORTS-ONLY ENFORCEMENT =====
    // Check if this is a structured transaction request (bypass intent check)
    let isTransactionRequest = false;
    let transactionParams = null;
    try {
      const parsed = JSON.parse(message);
      if (parsed.clientId && parsed.startDate && parsed.endDate) {
        isTransactionRequest = true;
        transactionParams = parsed;
      }
    } catch {
      // Not a JSON message, continue with intent check
    }

    // If not a transaction request, enforce reports-only
    if (!isTransactionRequest && !isReportIntent(message)) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const content = `I'm specialized solely in generating reports from our predefined list. I can't provide general advice or handle other requests.

Please let me know which report you need:

${AVAILABLE_REPORTS.map((report, i) => `${i + 1}. ${report.name}`).join('\n')}

Please reply with the report name you'd like to generate.`;

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Get DeepSeek API key
    const { data: keyData, error: keyError } = await supabaseClient
      .from('ai_credentials')
      .select('enc_key, iv, ciphertext')
      .eq('provider', 'deepseek')
      .eq('user_id', user.id)
      .single();

    if (keyError || !keyData) {
      throw new Error('DeepSeek API key not configured');
    }

    // Decrypt API key
    const keyBytes = Uint8Array.from(atob(keyData.enc_key), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(keyData.iv), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(keyData.ciphertext), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']
    );

    const decryptedBytes = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv }, cryptoKey, ciphertext
    );

    const apiKey = new TextDecoder().decode(decryptedBytes);

    // Get or create conversation
    let convId = conversation_id;
    if (!convId) {
      const { data: conv, error: convError } = await supabaseClient
        .from('ai_conversations')
        .insert({ 
          user_id: user.id, 
          title: message.slice(0, 60) 
        })
        .select('id')
        .single();
      
      if (convError) throw new Error(`Failed to create conversation: ${convError.message}`);
      convId = conv.id;
    }

    // Get user settings for report rules
    const { data: settings } = await supabaseClient
      .from('user_settings')
      .select('reports_config')
      .eq('user_id', user.id)
      .single();

    // Extract rules for all report types or just general rules
    const config = settings?.reports_config as { rules?: Record<string, string>, markdown?: string } | null;
    const reportRules = config?.rules || {};
    const generalRules = config?.markdown || '';
    
    // Determine which specific rules to use based on the message content or transaction request
    let specificRules = '';
    const reportTypes = ['form-1065', 'form-1120', 'form-1040', 'profit-loss', 'balance-sheet', 'cash-flow'];
    
    // For transaction requests, detect the report type from the request parameters
    if (isTransactionRequest && transactionParams?.reportType) {
      specificRules = reportRules[transactionParams.reportType] || '';
    } else {
      // For regular messages, detect from content
      for (const reportType of reportTypes) {
        if (message.toLowerCase().includes(reportType.replace('-', ' ')) || 
            message.toLowerCase().includes(reportType)) {
          specificRules = reportRules[reportType] || '';
          break;
        }
      }
    }
    
    // Combine general rules with specific rules if available
    const combinedRules = [generalRules, specificRules].filter(Boolean).join('\n\n');

    // ===== PARAMETER VALIDATION =====
    // If not a transaction request, check if we have all required parameters
    if (!isTransactionRequest) {
      // Extract parameters from natural language message
      const extractedParams = extractParamsFromMessage(message);
      
      // Step 1: Check if report type is specified
      if (!extractedParams.reportType) {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            const content = `Sure—which report would you like? We currently support:

${AVAILABLE_REPORTS.map((report, i) => `${i + 1}. ${report.name}`).join('\n')}

Please reply with the report name.`;

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          }
        });

        return new Response(stream, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }

      // Step 2: Check for missing client/date parameters
      const requiredParams = ['clientId', 'startDate', 'endDate'];
      const missingParams = requiredParams.filter(param => !extractedParams[param]);
      
      if (missingParams.length > 0) {
        const reportName = AVAILABLE_REPORTS.find(r => r.key === extractedParams.reportType)?.name;
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            const content = `Great! I'll generate a ${reportName} for you. Please provide:

${missingParams.includes('clientId') ? '• Client name or ID' : ''}
${missingParams.includes('startDate') ? '• Start date (YYYY-MM-DD format)' : ''}
${missingParams.includes('endDate') ? '• End date (YYYY-MM-DD format)' : ''}

Example: "For ACME Corp from 2024-01-01 to 2024-03-31"`;

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'missing_data', 
              message: content,
              missingParams 
            })}\n\n`));
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          }
        });

        return new Response(stream, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }
      
      // Step 3: If we have all parameters, send confirmation and convert to transaction request
      if (extractedParams.reportType && extractedParams.clientId && extractedParams.startDate && extractedParams.endDate) {
        const reportName = AVAILABLE_REPORTS.find(r => r.key === extractedParams.reportType)?.name;
        
        // Send confirmation message first
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            const content = `Great—generating a ${reportName} for ${extractedParams.clientId} from ${extractedParams.startDate} to ${extractedParams.endDate}. This may take a moment...`;
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            controller.close();
          }
        });

        // Then proceed with transaction request
        isTransactionRequest = true;
        transactionParams = extractedParams;
      }
    }

    // Get recent conversation history
    const { data: recentMessages } = await supabaseClient
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(20);

    // Store user message
    await supabaseClient
      .from('ai_messages')
      .insert({ 
        conversation_id: convId, 
        role: 'user', 
        content: message 
      });

    // Construct messages for DeepSeek
    let messages;

    // Handle transaction request
    if (isTransactionRequest && transactionParams) {
      // Fetch transactions
      const { data: transactions, error: txError } = await supabaseClient
        .from('transactions')
        .select('posted_at, amount_cents, counterparty, note, status, connection_code')
        .eq('client_id', transactionParams.clientId)
        .gte('posted_at', transactionParams.startDate)
        .lte('posted_at', transactionParams.endDate + 'T23:59:59')
        .order('posted_at', { ascending: true });

      if (txError) {
        throw new Error(`Failed to fetch transactions: ${txError.message}`);
      }

      // Format transactions for AI
      const formattedTransactions = (transactions || []).map(tx => ({
        date: tx.posted_at?.split('T')[0],
        amount: tx.amount_cents / 100,
        counterparty: tx.counterparty,
        note: tx.note,
        status: tx.status,
        connection: tx.connection_code
      }));

      // Construct enhanced DeepSeek messages with transaction data
      const systemMsg = { role: 'system', content: 'You are TaxOps AI assistant specialized in financial reporting.' };
      const ruleMsg = { role: 'system', content: `Report Rules:\n${combinedRules}` };
      const dataMsg = { role: 'system', content: `Transaction Data (${formattedTransactions.length} transactions):\n${JSON.stringify(formattedTransactions, null, 2)}` };
      const history = (recentMessages || []).slice(0, -2).map(m => ({ // Exclude the last 2 messages (user's missing data request and our response)
        role: m.role, 
        content: m.content 
      }));
      messages = [systemMsg, ruleMsg, dataMsg, ...history, { role: 'user', content: 'Please generate a comprehensive financial report in CSV format using the provided transaction data and report rules. Return the result as a downloadable CSV file.' }];

      // Store the transaction data message
      await supabaseClient
        .from('ai_messages')
        .insert({ 
          conversation_id: convId, 
          role: 'assistant', 
          content: `Found ${formattedTransactions.length} transactions for the specified period. Generating report...`,
          api_logs: {}
        });
    } else {
      // Construct regular messages for DeepSeek
      const systemMsg = { role: 'system', content: 'You are TaxOps AI assistant.' };
      const ruleMsg = { role: 'system', content: `Report Rules:\n${combinedRules}` };
      const history = (recentMessages || []).map(m => ({ 
        role: m.role, 
        content: m.content 
      }));
      messages = [systemMsg, ruleMsg, ...history, { role: 'user', content: message }];
    }

    // Call DeepSeek with streaming
    const requestBody = {
      model: 'deepseek-chat',
      temperature: 0.7,
      max_tokens: 2048,
      stream: true,
      messages
    };

    const dsRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!dsRes.ok) {
      const errorText = await dsRes.text();
      throw new Error(`DeepSeek API error: ${dsRes.status} ${errorText}`);
    }

    // Set up SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let assistantReply = '';
        
        try {
          const reader = dsRes.body?.getReader();
          if (!reader) throw new Error('No response body');

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    assistantReply += content;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }

          // Check for missing data request
          const missingDataKeywords = [
            'provide transaction data',
            'need transaction',
            'missing transaction',
            'which client',
            'what date range',
            'specific client and date',
            'I would need'
          ];
          
          const hasMissingDataRequest = missingDataKeywords.some(keyword => 
            assistantReply.toLowerCase().includes(keyword.toLowerCase())
          );

          if (hasMissingDataRequest && !isTransactionRequest) {
            // Send missing data event
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'missing_data', 
              message: assistantReply 
            })}\n\n`));
          }

          // Handle CSV generation for transaction-based reports
          if (isTransactionRequest && transactionParams) {
            try {
              // Send confirmation message before starting CSV generation
              const reportName = AVAILABLE_REPORTS.find(r => r.key === transactionParams.reportType)?.name || 'Financial Report';
              const confirmationMsg = `\n\nGenerating your ${reportName} for ${transactionParams.clientId} from ${transactionParams.startDate} to ${transactionParams.endDate}… This usually takes a few seconds.`;
              assistantReply += confirmationMsg;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: confirmationMsg })}\n\n`));
              
              // Generate CSV from transactions
              const { data: transactions } = await supabaseClient
                .from('transactions')
                .select('posted_at, amount_cents, counterparty, note, status, connection_code')
                .eq('client_id', transactionParams.clientId)
                .gte('posted_at', transactionParams.startDate)
                .lte('posted_at', transactionParams.endDate + 'T23:59:59')
                .order('posted_at', { ascending: true });

              if (transactions && transactions.length > 0) {
                // Format for CSV
                const csvData = convertTransactionsToCsv(transactions);
                
                // Upload to storage
                const reportName = AVAILABLE_REPORTS.find(r => r.key === transactionParams.reportType)?.name || 'Financial Report';
                const filename = `${reportName.replace(/\s+/g, '_')}_${transactionParams.clientId}_${transactionParams.startDate}_to_${transactionParams.endDate}.csv`;
                const filePath = `${user.id}/${convId}/${filename}`;
                const { error: uploadError } = await supabaseClient.storage
                  .from('reports')
                  .upload(filePath, new Blob([csvData], { type: 'text/csv' }), {
                    upsert: true
                  });

                if (!uploadError) {
                  // Get public URL
                  const { data: urlData } = supabaseClient.storage
                    .from('reports')
                    .getPublicUrl(filePath);

                  // Send download button message
                  const reportName = AVAILABLE_REPORTS.find(r => r.key === transactionParams.reportType)?.name || 'Financial Report';
                  const confirmationMessage = `✅ Here's your ${reportName} for ${transactionParams.clientId} (${transactionParams.startDate} to ${transactionParams.endDate}):`;
                  
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                    type: 'assistant_message',
                    content: {
                      text: confirmationMessage,
                      downloadButton: {
                        label: "Download CSV",
                        url: urlData.publicUrl,
                        filename: filename
                      }
                    }
                  })}\n\n`));
                  
                  // Send closing message
                  const closingMessage = "\n\nLet me know if you need anything else or another report.";
                  assistantReply += confirmationMessage + closingMessage;
                  
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: closingMessage })}\n\n`));
                } else {
                  const errorMsg = `\n\nError uploading report: ${uploadError.message}`;
                  assistantReply += errorMsg;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: errorMsg })}\n\n`));
                }
              } else {
                const noDataMsg = `\n\nNo transactions found for the specified period. Please verify the client name and date range.`;
                assistantReply += noDataMsg;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: noDataMsg })}\n\n`));
              }
            } catch (error) {
              console.error('CSV generation error:', error);
              const errorMsg = `\n\nError generating report: ${error.message}`;
              assistantReply += errorMsg;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: errorMsg })}\n\n`));
            }
          }

          // Check for SQL generation pattern
          const sqlMatch = assistantReply.match(/```json\s*\n\s*\{\s*"sql":\s*"([^"]+)",\s*"filename":\s*"([^"]+)"\s*\}\s*\n\s*```/);
          
          if (sqlMatch) {
            try {
              const [, sql, filename] = sqlMatch;
              
              // Execute SQL
              const { data: sqlResult, error: sqlError } = await supabaseClient.rpc('execute_dynamic_sql', { 
                query: sql 
              });

              if (sqlError) throw sqlError;

              // Convert to CSV
              const csvData = convertToCSV(sqlResult || []);
              
              // Upload to storage
              const filePath = `${user.id}/${convId}/${filename}`;
              const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('reports')
                .upload(filePath, new Blob([csvData], { type: 'text/csv' }), {
                  upsert: true
                });

              if (uploadError) throw uploadError;

              // Get public URL
              const { data: urlData } = supabaseClient.storage
                .from('reports')
                .getPublicUrl(filePath);

              const downloadLink = `\n\n[Download report](${urlData.publicUrl})`;
              assistantReply += downloadLink;
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: downloadLink })}\n\n`));
            } catch (error) {
              console.error('SQL execution error:', error);
              const errorMsg = `\n\nError generating report: ${error.message}`;
              assistantReply += errorMsg;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: errorMsg })}\n\n`));
            }
          }

          // Prepare API logs
          const apiLogs = {
            request: {
              url: 'https://api.deepseek.com/v1/chat/completions',
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey.slice(0, 10)}...`,
                'Content-Type': 'application/json'
              },
              body: requestBody
            },
            response: {
              status: dsRes.status,
              statusText: dsRes.statusText,
              stream: true,
              content: assistantReply
            },
            timestamp: new Date().toISOString()
          };

          // Store assistant reply
          await supabaseClient
            .from('ai_messages')
            .insert({ 
              conversation_id: convId, 
              role: 'assistant', 
              content: assistantReply,
              api_logs: apiLogs
            });

          // Update conversation timestamp
          await supabaseClient
            .from('ai_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', convId);

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();

        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in ai-orchestrator function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    }).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}

function convertTransactionsToCsv(transactions: any[]): string {
  if (!transactions || transactions.length === 0) return '';
  
  const headers = ['Date', 'Amount', 'Counterparty', 'Note', 'Status', 'Connection'];
  const rows = transactions.map(tx => [
    tx.posted_at?.split('T')[0] || '',
    (tx.amount_cents / 100).toFixed(2),
    tx.counterparty || '',
    tx.note || '',
    tx.status || '',
    tx.connection_code || ''
  ]);
  
  const csvRows = rows.map(row => 
    row.map(cell => {
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return String(cell);
    }).join(',')
  );
  
  return [headers.join(','), ...csvRows].join('\n');
}
