// 國家/地區判斷 Function：返回 Cloudflare 注入的訪客國家碼（免費、無第三方 API）
export async function onRequest(context) {
  const country = (context.request.headers.get('CF-IPCountry') || '').toUpperCase();
  return new Response(JSON.stringify({ country }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
