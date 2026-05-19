const base = 'http://localhost:5002/api';

async function postJson(url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };
  return data;
}

async function getJson(url, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'GET', headers });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };
  return data;
}

async function main() {
  try {
    const email = `ci-tester+${Date.now()}@example.com`;
    const reg = await postJson(`${base}/auth/register`, {
      name: 'CI Tester',
      email,
      password: 'Password123!',
      passwordConfirm: 'Password123!'
    });
    console.log('REGISTERED:', reg);
    const token = reg.token;

    const claim = await postJson(`${base}/claim/add10`, {}, token);
    console.log('CLAIM RESPONSE:', claim);

    const profile = await getJson(`${base}/auth/profile`, token);
    console.log('PROFILE:', profile);
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
}

main();
