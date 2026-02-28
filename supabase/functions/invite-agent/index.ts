import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Always respond with HTTP 200 so supabase.functions.invoke always populates `data`.
// Check data.error on the frontend to handle failures.
const respond = (payload: object) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[invite-agent] No auth header');
      return respond({ error: 'Not authenticated. Please log in again.' });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify caller identity
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error('[invite-agent] Auth error:', authError?.message);
      return respond({ error: 'Not authenticated. Please log in again.' });
    }
    console.log('[invite-agent] Caller:', user.id);

    // Verify caller is an Admin
    const { data: callerProfile, error: profileError } = await userClient
      .from('profiles')
      .select('role, admin_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[invite-agent] Profile error:', profileError.message);
      return respond({ error: 'Profile error: ' + profileError.message });
    }
    if (!callerProfile || callerProfile.role !== 'Admin') {
      console.error('[invite-agent] Not admin. Role:', callerProfile?.role);
      return respond({ error: 'Only Admins can invite agents.' });
    }
    console.log('[invite-agent] Admin confirmed:', user.id);

    // Parse body
    const { email, full_name } = await req.json();
    if (!email || !full_name) {
      return respond({ error: 'Email and full name are required.' });
    }
    console.log('[invite-agent] Inviting:', email);

    // Send invite via service role
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: { full_name, admin_id: user.id, role: 'Field Agent' },
        redirectTo: `${Deno.env.get('SITE_URL')}/accept-invite`,
      }
    );

    if (inviteError) {
      console.error('[invite-agent] Invite error:', inviteError.message);
      return respond({ error: inviteError.message });
    }

    console.log('[invite-agent] Invite sent to:', email);
    return respond({ success: true });

  } catch (err: any) {
    console.error('[invite-agent] Uncaught error:', err.message);
    return respond({ error: 'Internal error: ' + err.message });
  }
});
