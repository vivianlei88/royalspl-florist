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
    const { action, orderId, amount, orderCode } = await request.json();
    const stripeKey = env.STRIPE_SECRET_KEY;

    if (action === 'create_payment') {
      // 創建收款連結
      const formData = new URLSearchParams();
      formData.append('mode', 'payment');
      formData.append('success_url', 'https://royalspl.shop/order-success.html');
      formData.append('cancel_url', 'https://royalspl.shop/admin.html');
      formData.append('line_items[0][price_data][currency]', 'hkd');
      formData.append('line_items[0][price_data][product_data][name]', '訂單 ' + orderCode);
      formData.append('line_items[0][price_data][unit_amount]', Math.round(amount * 100));
      formData.append('line_items[0][quantity]', '1');
      formData.append('metadata[order_id]', String(orderId));

      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + stripeKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });
      const session = await response.json();
      return new Response(JSON.stringify({ url: session.url }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'refund') {
      // 發起退款（支援 Apple Pay / Google Pay / 信用卡，全部經 Stripe PaymentIntent 原路退回）
      const paymentIntentId = body.paymentIntentId || body.orderId;
      if (!paymentIntentId) {
        return new Response(JSON.stringify({ success: false, error: '缺少 paymentIntentId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const refundAmount = parseFloat(body.refundAmount || 0);
      const formData = new URLSearchParams();
      formData.append('payment_intent', paymentIntentId);
      // 有金額就按金額退（全額/部分都支援）；冇金額就全額退
      if (refundAmount > 0) formData.append('amount', String(Math.round(refundAmount * 100)));
      const response = await fetch('https://api.stripe.com/v1/refunds', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + stripeKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });
      const refund = await response.json();
      if (refund.error) {
        return new Response(JSON.stringify({ success: false, error: refund.error.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: true, refund }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: '無效操作' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}