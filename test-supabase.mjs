import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.substring(1, val.length - 1);
    }
    env[key] = val.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    const googleRes = await fetch('https://www.google.com');
    console.log("Google fetch status:", googleRes.status);
  } catch (err) {
    console.log("Google fetch error:", err.message || err);
  }

  const { data, error } = await supabase.from('orders').select('*').limit(1);
  console.log("SELECT error:", error);
  console.log("SELECT data:", data);

  if (data && data.length > 0) {
    console.log("Columns present in first row:");
    console.log(Object.keys(data[0]));
  } else {
    // If table is empty, we can try to insert a dummy record and see what error it throws
    const { error: insertError } = await supabase.from('orders').insert({
      id: "00000000-0000-0000-0000-000000000000",
      order_id: "test",
      user_id: "test",
      customer_name: "test",
      email: "test@test.com",
      phone: "1234567890",
      address: "test",
      city: "test",
      state: "test",
      pincode: "123456",
      total: 100,
      payment_screenshot: null
    });
    console.log("INSERT error:", insertError);
  }
}
test();
