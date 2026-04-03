/**
 * Test creating collection with relation using collection NAME instead of ID
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
  console.log('Authenticated');

  // Test: Create collection with relation using collection NAME
  console.log('\nTest: Creating collection with relation using collection NAME...');
  const testRes = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'test_contacts',
      type: 'base',
      fields: [
        { name: 'status', type: 'text' },
        {
          name: 'requester',
          type: 'relation',
          required: true,
          options: {
            collectionId: 'users',  // Using NAME instead of ID
            cascadeDelete: true,
            maxSelect: 1,
            minSelect: 1,
          },
        },
      ],
    }),
  });

  if (!testRes.ok) {
    console.error('Failed:', await testRes.text());
  } else {
    const result = await testRes.json();
    console.log(`Created: ${result.id}`);
    console.log('Fields:', result.fields.map(f => `${f.name}(${f.type}) colId=${f.options?.collectionId}`).join(', '));

    // Cleanup
    await fetch(`${PB_URL}/api/collections/test_contacts`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('Cleaned up');
  }
}

main();
