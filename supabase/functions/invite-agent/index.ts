import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    // 1. Verify caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return respond({ error: 'Not authenticated. Please log in again.' });

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error('[invite-agent] Auth error:', authError?.message);
      return respond({ error: 'Not authenticated. Please log in again.' });
    }

    // 2. Verify caller is an Admin
    const { data: callerProfile, error: profileError } = await userClient
      .from('profiles')
      .select('role, admin_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[invite-agent] Profile error:', profileError.message);
      return respond({ error: 'Profile error: ' + profileError.message });
    }
    // Any active user can now invite a sub-agent in the pyramid model
    if (!callerProfile) {
      return respond({ error: 'Caller profile not found.' });
    }

    // 3. Parse body
    const { email, full_name, phone, role } = await req.json();
    if (!email || !full_name) return respond({ error: 'Email and full name are required.' });
    
    // Validate role if provided, otherwise default to "Field Agent"
    const finalRole = role && ['Admin', 'Manager', 'Field Agent'].includes(role) ? role : 'Field Agent';
    
    console.log(`[invite-agent] Inviting: ${email} as ${finalRole} under parent: ${user.id}`);

    // 4. Generate invite link via Supabase admin
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        data: { 
          full_name, 
          phone, 
          admin_id: callerProfile.admin_id || user.id, // Preserve the root branch ID
          parent_id: user.id, // Direct inviter
          role: finalRole 
        },
        redirectTo: `${Deno.env.get('SITE_URL')}/accept-invite`,
      },
    });

    if (linkError) {
      console.error('[invite-agent] generateLink error:', linkError.message);
      return respond({ error: linkError.message });
    }

    const actionLink = linkData.properties?.action_link;
    if (!actionLink) return respond({ error: 'Failed to generate invite token.' });
    
    // 5. Create a Pending profile row so they show up in the staff list immediately
    const { error: profileError2 } = await adminClient
      .from('profiles')
      .upsert({
        id: linkData.user.id,
        full_name,
        phone,
        role: finalRole,
        admin_id: callerProfile.admin_id || user.id,
        parent_id: user.id,
        status: 'Pending'
      });

    if (profileError2) {
      console.error('[invite-agent] Pending profile creation error:', profileError2.message);
      // We don't fail the whole request, but we log the error.
    }

    // 6. Construct the invite link...
    let hashedToken = '';
    try {
      const parsedUrl = new URL(actionLink);
      hashedToken = parsedUrl.searchParams.get('token_hash') || parsedUrl.searchParams.get('token') || '';
    } catch {
      // Fallback manual regex if URL parsing fails on a relative path
      const match = actionLink.match(/token(?:_hash)?=([^&]+)/);
      hashedToken = match ? match[1] : '';
    }

    if (!hashedToken) return respond({ error: 'Failed to extract token hash from action link.' });
    
    // Construct the invite link to hit our frontend specifically with token_hash
    const inviteUrl = `${Deno.env.get('SITE_URL')}/accept-invite?token_hash=${hashedToken}&type=invite`;
    console.log('[invite-agent] Invite link generated for:', email);

    // Return the invite link directly to the client (to be shared via WhatsApp)
    console.log('[invite-agent] WHATSAPP INVITE LINK RETURNED:', inviteUrl);
    return respond({ success: true, inviteUrl });

  } catch (err: any) {
    console.error('[invite-agent] Uncaught error:', err.message);
    return respond({ error: 'Internal error: ' + err.message });
  }
});
