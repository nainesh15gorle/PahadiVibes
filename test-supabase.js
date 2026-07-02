const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  const dbOrder = {
    id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    order_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    user_id: null,
    customer_name: "Test User",
    email: "test@example.com",
    phone: "1234567890",
    address: "123 Test St",
    city: "Test City",
    state: "Test State",
    pincode: "123456",
    total: 100,
    status: "Pending",
    items: [],
    created_at: new Date().toISOString(),
    payment_method: "Razorpay",
    payment_status: "Pending",
    razorpay_order_id: "order_123",
    razorpay_payment_id: null
  };

  console.log("Attempting insert...");
  const { data, error } = await supabase.from('orders').insert(dbOrder).select();
  if (error) {
    console.error("Direct insert error:", error);
    
    // Try fallback
    delete dbOrder.payment_method;
    delete dbOrder.payment_status;
    delete dbOrder.razorpay_order_id;
    delete dbOrder.razorpay_payment_id;
    
    console.log("Attempting fallback insert...");
    const { data: fbData, error: fbError } = await supabase.from('orders').insert(dbOrder).select();
    console.error("Fallback insert error:", fbError);
  } else {
    console.log("Insert success!");
    await supabase.from('orders').delete().eq('id', dbOrder.id);
  }
}

test();
