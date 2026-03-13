import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { name, company_name, billing_email, billing_address, temp_password, portal_url } = await req.json();

    if (!name || !billing_email || !temp_password) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is an authenticated admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify caller is admin
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user: callerUser } } = await callerClient.auth.getUser();
    if (!callerUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: callerRecord } = await supabaseAdmin
      .from('client_users')
      .select('is_admin')
      .eq('user_id', callerUser.id)
      .single();
    if (!callerRecord?.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: billing_email,
      password: temp_password,
      email_confirm: true,
    });
    if (authError) throw new Error(authError.message);
    const newUserId = authData.user.id;

    // 2. Create client record
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert({ name, company_name, billing_email, billing_address })
      .select()
      .single();
    if (clientError) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error(clientError.message);
    }

    // 3. Link client_users
    const { error: linkError } = await supabaseAdmin
      .from('client_users')
      .insert({ user_id: newUserId, client_id: clientData.id, is_admin: false, password_changed: false });
    if (linkError) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      await supabaseAdmin.from('clients').delete().eq('id', clientData.id);
      throw new Error(linkError.message);
    }

    // 4. Send welcome email via Resend (non-blocking — log errors but don't fail)
    try {
      const resendKey = Deno.env.get('RESEND_API_KEY');
      const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@14forty.mc';
      const portalLink = portal_url || 'https://portal.14forty.mc';
      const clientDisplayName = company_name || name;

      const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to the 14Forty Client Portal</title>
</head>
<body style="margin:0;padding:0;background:#f0ede4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ede4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Wordmark -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-size:28px;color:#1e293b;letter-spacing:-0.5px;">
                14Forty<span style="display:inline-block;width:7px;height:7px;background:#ee9d4c;border-radius:50%;margin-left:3px;vertical-align:middle;"></span>
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:14px;padding:40px 40px 36px;box-shadow:0 2px 12px rgba(30,41,59,0.09);">

              <h1 style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:26px;color:#1e293b;font-weight:400;">
                Welcome, ${name}
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#67768e;line-height:1.6;">
                Your client portal account with <strong style="color:#1e293b;">14Forty</strong> is ready. Use the credentials below to log in and view your projects, invoices, and more.
              </p>

              <!-- Credentials box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ede4;border-radius:10px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#67768e;">Your Login Details</p>
                    <p style="margin:0 0 6px;font-size:14px;color:#1e293b;">
                      <span style="color:#67768e;display:inline-block;width:80px;">Portal</span>
                      <a href="${portalLink}" style="color:#497891;text-decoration:none;">${portalLink}</a>
                    </p>
                    <p style="margin:0 0 6px;font-size:14px;color:#1e293b;">
                      <span style="color:#67768e;display:inline-block;width:80px;">Email</span>
                      <strong>${billing_email}</strong>
                    </p>
                    <p style="margin:0;font-size:14px;color:#1e293b;">
                      <span style="color:#67768e;display:inline-block;width:80px;">Password</span>
                      <strong style="font-family:'Courier New',monospace;background:#e5eef3;padding:2px 8px;border-radius:4px;">${temp_password}</strong>
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:13px;color:#67768e;line-height:1.6;">
                You'll be asked to set a new password when you first log in. Keep your credentials safe.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td style="background:#ee9d4c;border-radius:8px;">
                    <a href="${portalLink}" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">
                      Go to your portal →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 0 0;">
              <p style="margin:0;font-size:12px;color:#a0aec0;">
                © ${new Date().getFullYear()} 14Forty · You're receiving this because a portal account was created for ${clientDisplayName}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `14Forty <${fromEmail}>`,
          to: [billing_email],
          subject: `Welcome to the 14Forty Client Portal`,
          html: emailHtml,
        }),
      });

      if (!emailRes.ok) {
        const errBody = await emailRes.text();
        console.error('Resend email failed:', emailRes.status, errBody);
      } else {
        console.log('Welcome email sent to', billing_email);
      }
    } catch (emailErr) {
      console.error('Error sending welcome email:', emailErr);
      // Don't throw — client creation already succeeded
    }

    return new Response(
      JSON.stringify({ success: true, client_id: clientData.id, user_id: newUserId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('create-client-user error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
