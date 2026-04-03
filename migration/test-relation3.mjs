/**
 * Test: Create two base collections, then add relation between them
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

  // Step 1: Create a base collection to reference
  console.log('\nStep 1: Create base collection "test_target"...');
  const targetRes = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'test_target',
      type: 'base',
      fields: [{ name: 'title', type: 'text' }],
    }),
  });

  if (!targetRes.ok) {
    console.error('Failed:', await targetRes.text());
    return;
  }

  const target = await targetRes.json();
  console.log(`Created "test_target" with id: ${target.id}`);

  // Step 2: Create another collection with relation to test_target
  console.log('\nStep 2: Create "test_source" with relation to test_target...');
  const sourceRes = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'test_source',
      type: 'base',
      fields: [
        { name: 'status', type: 'text' },
        {
          name: 'target',
          type: 'relation',
          required: true,
          options: {
            collectionId: target.id,
            cascadeDelete: true,
            maxSelect: 1,
            minSelect: 1,
          },
        },
      ],
    }),
  });

  if (!sourceRes.ok) {
    console.error('Failed to create with relation:', await sourceRes.text());
  } else {
    const source = await sourceRes.json();
    console.log(`Created "test_source" with id: ${source.id}`);
    console.log('Fields:', source.fields.map(f => `${f.name}(${f.type}) colId=${f.options?.collectionId}`).join(', '));
  }

  // Cleanup
  await fetch(`${PB_URL}/api/collections/test_source`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  await fetch(`${PB_URL}/api/collections/test_target`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  console.log('\nCleaned up');
}

main();
