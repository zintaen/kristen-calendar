import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, title, body } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Get user's push tokens
    const { data: tokens, error } = await supabaseClient
      .from('user_push_tokens')
      .select('token, platform')
      .eq('user_id', user_id);

    if (error) throw error;
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No push tokens found for user' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Call Firebase Cloud Messaging API for Android/Web, APNs for iOS
    // (A full implementation would use the Firebase Admin SDK or HTTP v1 API)
    // For now, we will just log it out as requested in a basic setup.
    console.log(`Sending push notification to ${tokens.length} devices for user ${user_id}`);
    console.log(`Title: ${title}, Body: ${body}`);
    console.log(`Tokens:`, tokens);

    // Mock successful push delivery
    return new Response(
      JSON.stringify({ message: 'Push notifications queued successfully', deviceCount: tokens.length }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
