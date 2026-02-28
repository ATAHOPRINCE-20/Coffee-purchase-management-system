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
    if (!callerProfile || callerProfile.role !== 'Admin') {
      return respond({ error: 'Only Admins can invite agents.' });
    }

    // 3. Parse body
    const { email, full_name } = await req.json();
    if (!email || !full_name) return respond({ error: 'Email and full name are required.' });
    console.log('[invite-agent] Inviting:', email, 'under admin:', user.id);

    // 4. Generate invite link via Supabase admin (no email sent by Supabase)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        data: { full_name, admin_id: user.id, role: 'Field Agent' },
        redirectTo: `${Deno.env.get('SITE_URL')}/accept-invite`,
      },
    });

    if (linkError) {
      console.error('[invite-agent] generateLink error:', linkError.message);
      return respond({ error: linkError.message });
    }

    const inviteUrl = linkData.properties?.action_link;
    if (!inviteUrl) return respond({ error: 'Failed to generate invite link.' });
    console.log('[invite-agent] Invite link generated for:', email);

    // 5. Send the invite email via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Coffee Management System <onboarding@resend.dev>',
        to: [email],
        subject: "You've been invited to Coffee Management System",
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f8fafc;">
            <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #14532D; border-radius: 14px; margin-bottom: 16px;">
                  <span style="font-size: 28px;">☕</span>
                </div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #111827;">You're invited!</h1>
                <p style="margin: 8px 0 0; color: #6B7280; font-size: 14px;">
                  You've been added as a <strong>Field Agent</strong> on Coffee Management System.
                </p>
              </div>
              <p style="color: #374151; font-size: 14px; line-height: 1.6;">
                Hi <strong>${full_name}</strong>, click the button below to set up your account and get started.
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${inviteUrl}" style="display: inline-block; background: #14532D; color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px;">
                  Accept Invitation
                </a>
              </div>
              <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin: 0;">
                This link expires in 24 hours. If you did not expect this invitation, you can ignore this email.
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!resendRes.ok) {
      const resendError = await resendRes.text();
      console.error('[invite-agent] Resend error:', resendError);
      return respond({ error: 'Failed to send email: ' + resendError });
    }

    console.log('[invite-agent] Email sent via Resend to:', email);
    return respond({ success: true });

  } catch (err: any) {
    console.error('[invite-agent] Uncaught error:', err.message);
    return respond({ error: 'Internal error: ' + err.message });
  }
});
