// ============================================
// RoyalSpl Florist - Stripe Webhook
// 支付成功後保存訂單到 Supabase
// ============================================

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
    const payload = await request.text();
    const event = JSON.parse(payload);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata || {};

      const orderCode = 'RS' + Date.now().toString().slice(-8);

      const supabaseUrl = env.SUPABASE_URL;
      const supabaseKey = env.SUPABASE_Secret_keys || env.SUPABASE_PUBLISHABLE_KEY;

      const orderData = {
        order_code: orderCode,
        recipient_name: metadata.recipient_name || 'N/A',
        recipient_phone: metadata.recipient_phone || 'N/A',
        recipient_address: metadata.recipient_address || 'N/A',
        delivery_date: metadata.delivery_date || new Date().toISOString().split('T')[0],
        delivery_time_slot: metadata.delivery_time_slot || null,
        delivery_hour: metadata.delivery_hour || null,
        delivery_area: metadata.delivery_area || null,
        delivery_fee: parseFloat(metadata.delivery_fee) || 0,
        subtotal: parseFloat(metadata.subtotal) || 0,
        total_amount: session.amount_total ? session.amount_total / 100 : 0,
        status: 'paid'
      };

      const orderResponse = await fetch(supabaseUrl + '/rest/v1/orders', {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': 'Bearer ' + supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(orderData)
      });

      if (!orderResponse.ok) {
        console.error('保存訂單失敗:', await orderResponse.text());
        return new Response(JSON.stringify({ error: '保存訂單失敗' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const orderResult = await orderResponse.json();
      const orderId = orderResult[0] ? orderResult[0].id : null;

      if (orderId) {
        const items = JSON.parse(metadata.items || '[]');
        for (const item of items) {
          const itemData = {
            order_id: orderId,
            product_id: item.productId || null,
            product_name: item.name || '商品',
            price: parseFloat(item.price) || 0,
            quantity: item.quantity || 1,
            addons: JSON.stringify(item.addons || [])
          };
          await fetch(supabaseUrl + '/rest/v1/order_items', {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': 'Bearer ' + supabaseKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(itemData)
          });
        }
      }

      console.log('✅ 訂單保存成功:', orderCode);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Webhook 處理失敗:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}