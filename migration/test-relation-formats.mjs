/**
 * Test different relation field formats for PocketBase 0.36
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

  // Test different formats
  const tests = [
    {
      name: 'test_format1',
      fields: [{
        name: 'rel',
        type: 'relation',
        options: {
          collectionId: U,
          cascadeDelete: false,
          maxSelect: 1,
        },
      }],
    },
    {
      name: 'test_format2',
      fields: [{
        type: 'relation',
        name: 'rel',
        required: false,
        presentable: false,
        options: {
          collectionId: U,
          cascadeDelete: false,
          maxSelect: 1,
          minSelect: null,
        },
      }],
    },
    {
      name: 'test_format3',
      fields: [{
        type: 'relation',
        name: 'rel',
        options: {
          collectionId: U,
          cascadeDelete: false,
          maxSelect: 1,
          minSelect: null,
          displayFields: ['id'],
        },
      }],
    },
  ];

  for (const test of tests) {
    console.log(`\nTesting ${test.name}...`);
    console.log('Fields:', JSON.stringify(test.fields, null, 2));

    const res = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: test.name,
        type: 'base',
        fields: test.fields,
      }),
    });

    if (!res.ok) {
      console.error('Failed:', await res.text());
    } else {
      const data = await res.json();
      console.log('Success!');
      await fetch(`${PB_URL}/api/collections/${test.name}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      break;
    }
  }
}

main();
