import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseParams(message: string) {
  try {
    const obj = JSON.parse(message);
    return {
      name: obj.name as string | undefined,
      email: obj.email as string | undefined,
      ein: obj.ein as string | undefined,
    };
  } catch {
    const emailMatch = message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const einMatch = message.match(/\b\d{2}-?\d{7}\b/);
    const nameMatch = message.match(/name\s*[:\-]?\s*(\w[\w\s]+)/i);
    return {
      name: nameMatch?.[1],
      email: emailMatch?.[0],
      ein: einMatch?.[0],
    };
  }
}

function validEmail(email?: string) {
  return !!email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function validEin(ein?: string) {
  return !!ein && /^\d{2}-?\d{7}$/.test(ein);
}

const conversationStates = new Map<string, { name?: string; email?: string; ein?: string }>();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversation_id } = await req.json();

    if (!conversation_id) {
      return new Response(JSON.stringify({ error: "conversation_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const existing = conversationStates.get(conversation_id) || {};
    const newParams = parseParams(message);
    const params = { ...existing, ...Object.fromEntries(Object.entries(newParams).filter(([_, v]) => !!v)) };
    conversationStates.set(conversation_id, params);

    let reply = "";
    let type: "conversational" | "actionable" = "conversational";

    if (!params.name) {
      reply = "I can help you register a client. What's the client's name?";
    } else if (!params.email) {
      reply = "Great! Now I need their email address.";
    } else if (!params.ein) {
      reply = "Perfect! Finally, I need their EIN number.";
    } else {
      reply = `I have all the information I need. I'll proceed with registering ${params.name}.`;
      type = "actionable";
      conversationStates.delete(conversation_id);
    }

    const result = {
      intent: "register_client",
      params,
      type,
      reply,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
