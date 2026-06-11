async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'oxy8626@gmail.com',
        password: 'OXY@@8626'
      })
    });
    console.log('Status:', res.status);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log('Body text length:', text.length);
    console.log('Body text:', text);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
run();
