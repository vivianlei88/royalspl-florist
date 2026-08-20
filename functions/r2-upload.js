export async function onRequestPost(context) {
  const request = context.request;
  const env = context.env;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(JSON.stringify({ error: '沒有檔案' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const fileExt = file.name.includes('.') ? file.name.split('.').pop() : 'png';
    const fileName = 'royalspl-florist/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + fileExt;

    await env.IMAGES.put(fileName, file.stream(), {
      httpMetadata: {
        contentType: file.type || 'image/jpeg'
      }
    });

    const publicUrl = 'https://pub-ebfb5c01afbe4b9c938f7f160be93eb3.r2.dev/' + fileName;

    return new Response(JSON.stringify({ url: publicUrl }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}