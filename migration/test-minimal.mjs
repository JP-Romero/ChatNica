/**
 * Minimal test: Create collection with ONLY a relation field
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

  // Get users collection
  const collectionsRes = await fetch(`${PB_URL}/api/collections`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const collectionsData = await collectionsRes.json();
  const usersCollection = collectionsData.items.find(c => c.name === 'users');
  const U = usersCollection.id;

  // Test: Create with ONLY relation field (no other custom fields)
  console.log('Test: Collection with ONLY relation field...');
  const res = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'test_minimal',
      type: 'base',
      fields: [
        {
          name: 'rel',
          type: 'relation',
          options: {
            collectionId: U,
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error('Failed:', await res.text());
  } else {
    const data = await res.json();
    console.log('Success! Fields:', JSON.stringify(data.fields, null, 2));
    await fetch(`${PB_URL}/api/collections/test_minimal`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

main();
