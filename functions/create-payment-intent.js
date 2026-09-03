// ============================================
// RoyalSpl Florist - Stripe PaymentIntent
// 結帳頁內嵌付款（信用卡 / Apple Pay / Google Pay）用
// 創建 PaymentIntent 返回 client_secret 俾前端 confirm
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
    const body = await request.json();
    const { amount, orderId, orderCode, recipientName, recipientPhone, recipientAddress, deliveryDate, deliveryTimeSlot } = body;

    const stripeKey = env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'Stripe 未設定' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 創建 PaymentIntent（Apple Pay / Google Pay 透過 card 自動顯示）
    const formData = new URLSearchParams();
    formData.append('amount', String(Math.round(parseFloat(amount) * 100)));
    formData.append('currency', 'hkd');
    formData.append('payment_method_types[]', 'card');
    formData.append('metadata[order_id]', String(orderId || ''));
    formData.append('metadata[order_code]', orderCode || '');
    if (recipientName) formData.append('metadata[recipient_name]', recipientName);
    if (recipientPhone) formData.append('metadata[recipient_phone]', recipientPhone);
    if (recipientAddress) formData.append('metadata[recipient_address]', recipientAddress);
    if (deliveryDate) formData.append('metadata[delivery_date]', deliveryDate);
    if (deliveryTimeSlot) formData.append('metadata[delivery_time_slot]', deliveryTimeSlot);

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + stripeKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const intent = await response.json();

    if (intent.error) {
      return new Response(JSON.stringify({ error: intent.error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 回傳 client_secret + publishable key（前端用）
    return new Response(JSON.stringify({
      clientSecret: intent.client_secret,
      publishableKey: env.STRIPE_PUBLISHABLE_KEY || '',
      amount: intent.amount / 100
    }), {
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
