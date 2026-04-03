/**
 * Test: Create collection with relation using proper PocketBase 0.36 format
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

  // Get users collection
  const collectionsRes = await fetch(`${PB_URL}/api/collections`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const collectionsData = await collectionsRes.json();
  const usersCollection = collectionsData.items.find(c => c.name === 'users');
  console.log('Users collection ID:', usersCollection.id);

  // Create target collection first
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
    console.error('Failed to create target:', await targetRes.text());
    return;
  }

  const target = await targetRes.json();
  console.log('Created target:', target.id);

  // Now create source with relation using the target's actual ID
  console.log('\nCreating source with relation to:', target.id);
  
  const body = {
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
  };
  
  console.log('Request body:', JSON.stringify(body, null, 2));

  const sourceRes = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!sourceRes.ok) {
    const errorText = await sourceRes.text();
    console.error('Failed to create source:', errorText);
    
    // Try with just the collection name
    console.log('\nTrying with collection name instead of ID...');
    const body2 = {
      name: 'test_source2',
      type: 'base',
      fields: [
        { name: 'status', type: 'text' },
        {
          name: 'target',
          type: 'relation',
          required: true,
          options: {
            collectionId: 'test_target',
            cascadeDelete: true,
            maxSelect: 1,
            minSelect: 1,
          },
        },
      ],
    };
    
    const sourceRes2 = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body2),
    });

    if (!sourceRes2.ok) {
      console.error('Failed with name too:', await sourceRes2.text());
    } else {
      const source2 = await sourceRes2.json();
      console.log('Created with name! ID:', source2.id);
      await fetch(`${PB_URL}/api/collections/test_source2`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } else {
    const source = await sourceRes.json();
    console.log('Created source:', source.id);
    console.log('Fields:', source.fields.map(f => `${f.name}(${f.type}) colId=${f.options?.collectionId}`).join(', '));
    await fetch(`${PB_URL}/api/collections/test_source`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // Cleanup
  await fetch(`${PB_URL}/api/collections/test_target`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('\nCleaned up');
}

main();
