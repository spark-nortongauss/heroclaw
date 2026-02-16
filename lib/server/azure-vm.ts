import { createClient } from '@/lib/supabase/server';

export type VmStatus = 'Running' | 'Stopped' | 'Unknown';

type AzureConfig = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionId: string;
  resourceGroup: string;
  vmName: string;
};

function getAzureConfig(): AzureConfig | null {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
  const resourceGroup = process.env.AZURE_RESOURCE_GROUP;
  const vmName = process.env.AZURE_VM_NAME;

  if (!tenantId || !clientId || !clientSecret || !subscriptionId || !resourceGroup || !vmName) {
    return null;
  }

  return { tenantId, clientId, clientSecret, subscriptionId, resourceGroup, vmName };
}

export async function requireAuthenticatedUser(requireAgentMap = false) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.id) {
    return { ok: false as const, status: 401, error: error?.message ?? 'Unauthorized' };
  }

  if (!requireAgentMap) {
    return { ok: true as const, userId: data.user.id };
  }

  const { data: mapData, error: mapError } = await supabase
    .from('mc_agent_auth_map')
    .select('agent_id')
    .eq('auth_user_id', data.user.id)
    .maybeSingle();

  if (mapError) {
    return { ok: false as const, status: 500, error: mapError.message };
  }

  if (!mapData?.agent_id) {
    return { ok: false as const, status: 403, error: 'You do not have a mapped agent account for VM control.' };
  }

  return { ok: true as const, userId: data.user.id };
}

async function getAzureAccessToken(config: AzureConfig) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: 'https://management.azure.com/.default'
  });

  const response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    cache: 'no-store'
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Azure auth failed (${response.status}): ${details}`);
  }

  const tokenBody = (await response.json()) as { access_token?: string };
  if (!tokenBody.access_token) {
    throw new Error('Azure auth response missing access token.');
  }

  return tokenBody.access_token;
}

function vmUrl(config: AzureConfig) {
  return `https://management.azure.com/subscriptions/${config.subscriptionId}/resourceGroups/${config.resourceGroup}/providers/Microsoft.Compute/virtualMachines/${config.vmName}`;
}

export async function getVmStatus() {
  const config = getAzureConfig();
  if (!config) {
    return { ok: false as const, status: 503, error: 'VM integration not configured' };
  }

  const token = await getAzureAccessToken(config);
  const response = await fetch(`${vmUrl(config)}/instanceView?api-version=2023-09-01`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Azure status request failed (${response.status}): ${details}`);
  }

  const body = (await response.json()) as { statuses?: Array<{ code?: string; displayStatus?: string }> };
  const powerStatus = body.statuses?.find((status) => status.code?.startsWith('PowerState/'));
  const normalized = (powerStatus?.displayStatus ?? powerStatus?.code ?? 'Unknown').toLowerCase();

  let status: VmStatus = 'Unknown';
  if (normalized.includes('running')) status = 'Running';
  if (normalized.includes('deallocated') || normalized.includes('stopped')) status = 'Stopped';

  return { ok: true as const, configured: true, status };
}

export async function restartVm() {
  const config = getAzureConfig();
  if (!config) {
    return { ok: false as const, status: 503, error: 'VM integration not configured' };
  }

  const token = await getAzureAccessToken(config);
  const response = await fetch(`${vmUrl(config)}/restart?api-version=2023-09-01`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    cache: 'no-store'
  });

  if (!(response.status === 200 || response.status === 202 || response.status === 204)) {
    const details = await response.text();
    throw new Error(`Azure restart request failed (${response.status}): ${details}`);
  }

  return { ok: true as const, accepted: true };
}

export function isVmConfigured() {
  return getAzureConfig() !== null;
}
