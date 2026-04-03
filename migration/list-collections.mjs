/**
 * List all PocketBase collections
 */

const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'mcalebr04@gmail.com';
const ADMIN_PASSWORD = 'Juan290683';

async function main() {
  const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  if (!authRes.ok) {
    console.error('Failed to authenticate:', await authRes.text());
    process.exit(1);
  }

  const authData = await authRes.json();
  const token = authData.token;

  const collectionsRes = await fetch(`${PB_URL}/api/collections`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const collectionsData = await collectionsRes.json();

  console.log('Existing collections:');
  for (const c of collectionsData.items) {
    console.log(`  - ${c.name} (type: ${c.type}, id: ${c.id})`);
  }
}

main();
