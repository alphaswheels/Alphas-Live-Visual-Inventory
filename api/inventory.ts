export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const sheetId = url.searchParams.get('sheetId');
  
  // CORS Headers for client-side access
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  if (!sheetId) {
    return new Response(JSON.stringify({ error: 'Missing sheetId parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  // Strategy: Try GVIZ first (faster, better CSV formatting), fallback to Export
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

  const fetchOptions = {
    headers: {
      'User-Agent': 'VisualInventory/1.0',
    }
  };

  const successHeaders = {
    'Content-Type': 'text/csv; charset=utf-8',
    'Cache-Control': 's-maxage=30, stale-while-revalidate=59',
    ...corsHeaders
  };

  try {
    // Attempt 1: GVIZ API
    const response = await fetch(gvizUrl, fetchOptions);
    if (response.ok) {
      const text = await response.text();
      return new Response(text, { status: 200, headers: successHeaders });
    }
  } catch (e) {
    console.error('GVIZ fetch failed:', e);
  }

  try {
    // Attempt 2: Standard Export
    const response = await fetch(exportUrl, fetchOptions);
    if (response.ok) {
      const text = await response.text();
      return new Response(text, { status: 200, headers: successHeaders });
    }
  } catch (e) {
    console.error('Export fetch failed:', e);
  }

  return new Response(JSON.stringify({ error: 'Failed to retrieve inventory sheet. Ensure it is public or the link is correct.' }), {
    status: 502,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}