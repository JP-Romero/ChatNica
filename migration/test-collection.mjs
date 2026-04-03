/**
 * Test creating a simple collection with relation field
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
  console.log('Authenticated');

  // Get users collection ID
  const collectionsRes = await fetch(`${PB_URL}/api/collections`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const collectionsData = await collectionsRes.json();
  const usersCollection = collectionsData.items.find(c => c.name === 'users');
  const U = usersCollection.id;
  console.log(`Users collection ID: ${U}`);

  // Test 1: Create a simple base collection first
  console.log('\nTest 1: Creating simple base collection...');
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
      ],
    }),
  });

  if (!testRes.ok) {
    console.error('Failed to create test collection:', await testRes.text());
  } else {
    const result = await testRes.json();
    console.log(`Created test collection: ${result.id}`);

    // Test 2: Add a relation field to the test collection
    console.log('\nTest 2: Adding relation field...');
    const updateRes = await fetch(`${PB_URL}/api/collections/${result.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fields: [
          ...result.fields,
          {
            name: 'requester',
            type: 'relation',
            required: true,
            options: {
              collectionId: U,
              cascadeDelete: true,
              maxSelect: 1,
              minSelect: 1,
            },
          },
        ],
      }),
    });

    if (!updateRes.ok) {
      console.error('Failed to add relation field:', await updateRes.text());
    } else {
      const updated = await updateRes.json();
      console.log('Successfully added relation field');
      console.log('Fields:', updated.fields.map(f => `${f.name}(${f.type})`).join(', '));
    }

    // Cleanup
    await fetch(`${PB_URL}/api/collections/test_contacts`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('\nCleaned up test collection');
  }

  // Test 3: Create collection with relation field in one request
  console.log('\nTest 3: Creating collection with relation field in one request...');
  const test2Res = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'test_contacts2',
      type: 'base',
      fields: [
        { name: 'status', type: 'text' },
        {
          name: 'requester',
          type: 'relation',
          required: true,
          options: {
            collectionId: U,
            cascadeDelete: true,
            maxSelect: 1,
            minSelect: 1,
          },
        },
      ],
    }),
  });

  if (!test2Res.ok) {
    console.error('Failed to create test collection 2:', await test2Res.text());
  } else {
    const result = await test2Res.json();
    console.log(`Created test collection 2: ${result.id}`);
    console.log('Fields:', result.fields.map(f => `${f.name}(${f.type})`).join(', '));

    // Cleanup
    await fetch(`${PB_URL}/api/collections/test_contacts2`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('Cleaned up test collection 2');
  }
}

main();
