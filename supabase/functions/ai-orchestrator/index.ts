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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    const params = parseParams(message);

    const allValid = params.name && validEmail(params.email) && validEin(params.ein);

    const reply = allValid
      ? `Great, I'll proceed with registering ${params.name}.`
      : "Please provide the client name, email, and EIN.";

    const result = {
      intent: "register_client",
      params,
      type: allValid ? "actionable" : "conversational",
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
