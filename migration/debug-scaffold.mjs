/**
 * Debug: Check scaffold format and existing relation fields
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

  const authData = await authRes.json();
  const token = authData.token;

  // Get scaffolds
  const scaffoldsRes = await fetch(`${PB_URL}/api/collections/meta/scaffolds`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const scaffolds = await scaffoldsRes.json();
  
  console.log('=== BASE COLLECTION SCAFFOLD ===');
  console.log(JSON.stringify(scaffolds.base, null, 2));
  
  console.log('\n=== AUTH COLLECTION SCAFFOLD ===');
  console.log(JSON.stringify(scaffolds.auth, null, 2));
}

main();
