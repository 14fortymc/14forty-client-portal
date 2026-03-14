import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// JWT verification is intentionally disabled for this function (consistent with project pattern).
// @ts-ignore
export const config = { verify_jwt: false };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASANA_PROJECT_GID = '1213671625700407';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const {
      work_request_id,
      client_name,
      subject,
      request_category,
      request_type,
      billing_type,
      description,
      portal_url,
      is_emergency,
    } = await req.json();

    if (!work_request_id || !client_name || !subject) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const asanaToken = Deno.env.get('ASANA_ACCESS_TOKEN');
    if (!asanaToken) throw new Error('ASANA_ACCESS_TOKEN secret not configured');

    // Format task name: [Client Name] — Request Subject
    const taskName = `${client_name} — ${subject}`;

    // Format billing type for display
    const billingLabels: Record<string, string> = {
      included: 'Included',
      hourly: 'Hourly',
      flat_rate: 'Flat Rate',
    };
    const billingLabel = billingLabels[billing_type] || billing_type || 'Unknown';

    // Format category for display
    const categoryLabel = request_category === 'website_update' ? 'Website Update'
      : request_category === 'ad_hoc' ? 'Ad Hoc Work'
      : request_category || '';

    // Build notes/description
    const submittedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const lines = [
      `Client: ${client_name}`,
      `Type: ${categoryLabel}${request_type ? ` — ${request_type}` : ''}`,
      `Billing: ${billingLabel}`,
      is_emergency ? `Priority: EMERGENCY` : null,
      ``,
      `Details: ${description || '(none)'}`,
      ``,
      `Submitted: ${submittedDate}`,
      `Portal: ${portal_url || ''}`,
    ].filter(line => line !== null);

    const notes = lines.join('\n');

    // Create Asana task
    const asanaRes = await fetch('https://app.asana.com/api/1.0/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${asanaToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        data: {
          name: taskName,
          notes,
          projects: [ASANA_PROJECT_GID],
        },
      }),
    });

    if (!asanaRes.ok) {
      const errBody = await asanaRes.text();
      throw new Error(`Asana API error ${asanaRes.status}: ${errBody}`);
    }

    const asanaData = await asanaRes.json();
    const taskGid = asanaData?.data?.gid;
    const taskUrl = taskGid ? `https://app.asana.com/0/${ASANA_PROJECT_GID}/${taskGid}` : null;

    // Write asana_task_id and asana_task_url back to work_requests
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    await supabaseAdmin
      .from('work_requests')
      .update({ asana_task_id: taskGid, asana_task_url: taskUrl })
      .eq('id', work_request_id);

    return new Response(
      JSON.stringify({ success: true, asana_task_id: taskGid, asana_task_url: taskUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('create-asana-task error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
