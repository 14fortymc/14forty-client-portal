import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { email, portal_url } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Missing required field: email' }), {
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

    // Generate a password reset link via Supabase admin (no email sent by Supabase)
    const portalLink = portal_url || 'https://portal.14forty.mc';
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${portalLink}/reset-password` },
    });
    if (linkError) throw new Error(linkError.message);

    const resetLink = linkData.properties?.action_link;
    if (!resetLink) throw new Error('Failed to generate reset link');

    // Send branded email via Resend
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@14forty.mc';

    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your 14Forty Portal Password</title>
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
                Reset your password
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#67768e;line-height:1.6;">
                We received a request to reset the password for your <strong style="color:#1e293b;">14Forty</strong> client portal account. Click the button below to choose a new password.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#ee9d4c;border-radius:8px;">
                    <a href="${resetLink}" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">
                      Reset password →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ede4;border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#67768e;">Or copy this link into your browser</p>
                    <p style="margin:0;font-size:12px;color:#497891;word-break:break-all;">${resetLink}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#67768e;line-height:1.6;">
                This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password won't change.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 0 0;">
              <p style="margin:0;font-size:12px;color:#a0aec0;">
                © ${new Date().getFullYear()} 14Forty · You're receiving this because a password reset was requested for ${email}.
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
        to: [email],
        subject: 'Reset your 14Forty portal password',
        html: emailHtml,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error('Resend email failed:', emailRes.status, errBody);
      throw new Error(`Failed to send email: ${errBody}`);
    }

    console.log('Password reset email sent to', email);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('send-password-reset error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
