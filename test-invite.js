// test-invite.js
const url = "https://ffqihcnkjqgkrjrsztxw.supabase.co/functions/v1/invite-agent";
const key = process.env.VITE_SUPABASE_ANON_KEY;

async function test() {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`
    },
    body: JSON.stringify({ email: "test2@example.com", full_name: "Test User 2" })
  });
  
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

test();
