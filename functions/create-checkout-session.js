// ============================================
// RoyalSpl Florist - 創建 Stripe Checkout Session
// ============================================

export async function onRequestPost(context) {
  const { request, env } = context;
  
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
    const {
      items,
      recipientName,
      recipientPhone,
      recipientAddress,
      deliveryDate,
      deliveryTimeSlot,
      deliveryHour,
      deliveryArea,
      deliveryFee,
      subtotal,
      totalAmount,
      orderId,
      orderCode
    } = body;

    // 構建 Stripe Checkout Session
    const formData = new URLSearchParams();
    formData.append('mode', 'payment');
    formData.append('success_url', 'https://royalspl.pages.dev/order-success.html');
    formData.append('cancel_url', 'https://royalspl.pages.dev/checkout.html');
    formData.append('line_items[0][price_data][currency]', 'hkd');
    formData.append('line_items[0][price_data][product_data][name]', 'RoyalSpl Florist 花禮訂單');
    formData.append('line_items[0][price_data][unit_amount]', Math.round(totalAmount * 100));
    formData.append('line_items[0][quantity]', '1');
    
    // 附加訂單資訊到 metadata
    formData.append('metadata[recipient_name]', recipientName);
    formData.append('metadata[recipient_phone]', recipientPhone);
    formData.append('metadata[recipient_address]', recipientAddress);
    formData.append('metadata[delivery_date]', deliveryDate);
    formData.append('metadata[delivery_time_slot]', deliveryTimeSlot || '');
    formData.append('metadata[delivery_hour]', deliveryHour || '');
    formData.append('metadata[delivery_area]', deliveryArea || '');
    formData.append('metadata[delivery_fee]', String(deliveryFee));
    formData.append('metadata[subtotal]', String(subtotal));
    formData.append('metadata[items]', JSON.stringify(items));
    if (orderId) formData.append('metadata[order_id]', String(orderId));
    if (orderCode) formData.append('metadata[order_code]', orderCode);

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const sessionData = await stripeResponse.json();

    if (sessionData.error) {
      return new Response(JSON.stringify({ error: sessionData.error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ url: sessionData.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}