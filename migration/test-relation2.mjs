/**
 * Test step-by-step: create collection, then add relation field
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
  console.log('Users collection:', JSON.stringify({ id: usersCollection.id, name: usersCollection.name }, null, 2));

  // Step 1: Create collection with just a text field
  console.log('\nStep 1: Create collection with text field...');
  const createRes = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'test_rel',
      type: 'base',
      fields: [
        { name: 'status', type: 'text' },
      ],
    }),
  });

  if (!createRes.ok) {
    console.error('Failed to create:', await createRes.text());
    return;
  }

  const created = await createRes.json();
  console.log('Created collection:', created.id);
  console.log('Fields:', JSON.stringify(created.fields, null, 2));

  // Step 2: Try to add relation field
  console.log('\nStep 2: Add relation field...');
  const relationField = {
    name: 'requester',
    type: 'relation',
    required: true,
    options: {
      collectionId: usersCollection.id,
      cascadeDelete: true,
      maxSelect: 1,
      minSelect: 1,
    },
  };
  console.log('Relation field to add:', JSON.stringify(relationField, null, 2));

  const updateRes = await fetch(`${PB_URL}/api/collections/${created.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      fields: [
        ...created.fields,
        relationField,
      ],
    }),
  });

  if (!updateRes.ok) {
    console.error('Failed to update:', await updateRes.text());
  } else {
    const updated = await updateRes.json();
    console.log('Updated successfully');
    console.log('Fields:', JSON.stringify(updated.fields, null, 2));
  }

  // Cleanup
  await fetch(`${PB_URL}/api/collections/test_rel`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('\nCleaned up');
}

main();
