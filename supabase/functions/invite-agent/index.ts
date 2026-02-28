import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Create a Supabase client using the caller's JWT to verify who they are
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // 2. Verify the caller is an Admin
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error('[invite-agent] Auth error:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('[invite-agent] Caller user id:', user.id);

    const { data: callerProfile, error: profileError } = await userClient
      .from('profiles')
      .select('role, admin_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[invite-agent] Profile fetch error:', profileError.message);
      return new Response(JSON.stringify({ error: 'Could not verify caller profile: ' + profileError.message }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!callerProfile || callerProfile.role !== 'Admin') {
      console.error('[invite-agent] Caller is not Admin. Role:', callerProfile?.role);
      return new Response(JSON.stringify({ error: 'Only Admins can invite agents' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('[invite-agent] Caller confirmed Admin. admin_id:', callerProfile.admin_id);

    // 3. Parse the invite request body
    const { email, full_name } = await req.json();
    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: 'email and full_name are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('[invite-agent] Inviting:', email, 'as Field Agent under admin:', user.id);

    // 4. Use the service_role client to send the invite
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name,
          admin_id: user.id,
          role: 'Field Agent',
        },
        redirectTo: `${Deno.env.get('SITE_URL')}/accept-invite`,
      }
    );

    if (inviteError) {
      console.error('[invite-agent] inviteUserByEmail error:', inviteError.message);
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('[invite-agent] Invite sent successfully to:', email);

    return new Response(JSON.stringify({ success: true, user: inviteData.user }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
