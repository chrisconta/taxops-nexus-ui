
// Helper functions for extracting parameters from conversation history

export interface ExtractedParameters {
  [key: string]: any;
}

export function extractClientRegistrationParams(messages: Array<{ role: string; content: string }>): ExtractedParameters {
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content).join(' ');
  const params: ExtractedParameters = {};
  
  console.log('Extracting client registration parameters from:', userMessages);
  
  // Extract name - various patterns
  const namePatterns = [
    /(?:name[:\s]*(?:is)?[:\s]*)([\w\s]+?)(?:[,.\n]|$)/i,
    /(?:client['\s]*s?\s*name[:\s]*(?:is)?[:\s]*)([\w\s]+?)(?:[,.\n]|$)/i,
    /(?:called|named)[:\s]+([\w\s]+?)(?:[,.\n]|$)/i,
    /(?:the\s+name\s+is[:\s]*)([\w\s]+?)(?:[,.\n]|$)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = userMessages.match(pattern);
    if (match && match[1]) {
      params.name = match[1].trim();
      break;
    }
  }
  
  // Extract email
  const emailMatch = userMessages.match(/(?:email[:\s]*(?:is)?[:\s]*)([^\s,.\n]+@[^\s,.\n]+)/i);
  if (emailMatch) {
    params.email = emailMatch[1].trim();
  }
  
  // Extract EIN - various formats
  const einPatterns = [
    /(?:ein[:\s]*(?:is)?[:\s]*)([0-9]{2}-[0-9]+)/i,
    /(?:employer\s+identification\s+number[:\s]*(?:is)?[:\s]*)([0-9]{2}-[0-9]+)/i,
    /([0-9]{2}-[0-9]{4,7})/,
    /(?:tax\s+id[:\s]*(?:is)?[:\s]*)([0-9]{2}-[0-9]+)/i
  ];
  
  for (const pattern of einPatterns) {
    const match = userMessages.match(pattern);
    if (match && match[1]) {
      params.ein = match[1].trim();
      break;
    }
  }
  
  console.log('Extracted client registration parameters:', params);
  return params;
}

export function extractConnectionParams(messages: Array<{ role: string; content: string }>): ExtractedParameters {
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content).join(' ');
  const params: ExtractedParameters = {};
  
  console.log('Extracting connection parameters from:', userMessages);
  
  // Extract client name/reference
  const clientPatterns = [
    /(?:client[:\s]*(?:is)?[:\s]*)([\w\s]+?)(?:[,.\n]|$)/i,
    /(?:for\s+(?:the\s+)?client[:\s]*)([\w\s]+?)(?:[,.\n]|$)/i,
    /(?:for\s+)([\w\s]+?)(?:[,.\n]|$)/i
  ];
  
  for (const pattern of clientPatterns) {
    const match = userMessages.match(pattern);
    if (match && match[1]) {
      params.clientName = match[1].trim();
      break;
    }
  }
  
  // Extract connection type
  const connectionPatterns = [
    /(?:connect\s+to\s+)([\w\s]+?)(?:[,.\n]|$)/i,
    /(?:connection[:\s]*(?:to)?[:\s]*)([\w\s]+?)(?:[,.\n]|$)/i,
    /(mercury|quickbooks|stripe|paypal)/i
  ];
  
  for (const pattern of connectionPatterns) {
    const match = userMessages.match(pattern);
    if (match && match[1]) {
      params.connectionType = match[1].trim().toLowerCase();
      break;
    }
  }
  
  console.log('Extracted connection parameters:', params);
  return params;
}

export function extractParametersForTool(messages: Array<{ role: string; content: string }>, tool: string): ExtractedParameters {
  switch (tool) {
    case 'register_client':
      return extractClientRegistrationParams(messages);
    case 'create_connection':
      return extractConnectionParams(messages);
    default:
      return {};
  }
}
