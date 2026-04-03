/**
 * Create all remaining collections for ChatNica
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
  console.log('Authenticated as superuser');

  // Get existing collections
  const collectionsRes = await fetch(`${PB_URL}/api/collections`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const collectionsData = await collectionsRes.json();

  const usersCollection = collectionsData.items.find(c => c.name === 'users');
  if (!usersCollection) {
    console.error('Users collection not found!');
    process.exit(1);
  }
  const U = usersCollection.id; // users
  console.log(`Users collection ID: ${U}`);

  // Create collections in dependency order
  // 1. contacts (depends on: users)
  // 2. conversations (depends on: users)
  // 3. messages (depends on: users, conversations, messages)
  // 4. posts (depends on: users)
  // 5. stories (depends on: users)
  // 6. presence (depends on: users)
  // 7. typing (depends on: conversations)

  const collections = [
    {
      name: 'contacts',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != "" && requester = @request.auth.id',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'requester', type: 'relation', required: true, options: { collectionId: U, cascadeDelete: true, maxSelect: 1, minSelect: 1 } },
        { name: 'target', type: 'relation', required: true, options: { collectionId: U, cascadeDelete: true, maxSelect: 1, minSelect: 1 } },
        { name: 'status', type: 'select', required: true, options: { values: ['pending', 'accepted'], maxSelect: 1 } },
      ]
    },
    {
      name: 'conversations',
      type: 'base',
      listRule: '@request.auth.id != "" && participants.id ?= @request.auth.id',
      viewRule: '@request.auth.id != "" && participants.id ?= @request.auth.id',
      createRule: '@request.auth.id != "" && participants.id ?= @request.auth.id',
      updateRule: '@request.auth.id != "" && participants.id ?= @request.auth.id',
      deleteRule: '@request.auth.id != "" && createdBy = @request.auth.id',
      fields: [
        { name: 'type', type: 'select', required: true, options: { values: ['direct', 'group'], maxSelect: 1 } },
        { name: 'participants', type: 'relation', required: true, options: { collectionId: U, maxSelect: 100, cascadeDelete: false } },
        { name: 'name', type: 'text', required: false },
        { name: 'createdBy', type: 'relation', required: true, options: { collectionId: U, cascadeDelete: false, maxSelect: 1, minSelect: 1 } },
        { name: 'lastMessage', type: 'text', required: false },
        { name: 'lastMessageTime', type: 'date', required: false },
      ]
    },
    {
      name: 'posts',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != "" && uid = @request.auth.id',
      updateRule: '@request.auth.id != "" && uid = @request.auth.id',
      deleteRule: '@request.auth.id != "" && uid = @request.auth.id',
      fields: [
        { name: 'uid', type: 'relation', required: true, options: { collectionId: U, cascadeDelete: true, maxSelect: 1, minSelect: 1 } },
        { name: 'text', type: 'text', required: false },
        { name: 'images', type: 'file', required: false, options: { maxSelect: 10, maxSize: 5242880, mimeTypes: ['image/jpeg','image/png','image/gif','image/webp'] } },
        { name: 'likes', type: 'json', required: false },
        { name: 'comments', type: 'json', required: false },
      ]
    },
    {
      name: 'stories',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != "" && uid = @request.auth.id',
      updateRule: '@request.auth.id != "" && uid = @request.auth.id',
      deleteRule: '@request.auth.id != "" && uid = @request.auth.id',
      fields: [
        { name: 'uid', type: 'relation', required: true, options: { collectionId: U, cascadeDelete: true, maxSelect: 1, minSelect: 1 } },
        { name: 'type', type: 'select', required: true, options: { values: ['image', 'text'], maxSelect: 1 } },
        { name: 'image', type: 'file', required: false, options: { maxSelect: 1, maxSize: 5242880, mimeTypes: ['image/jpeg','image/png','image/gif','image/webp'] } },
        { name: 'text', type: 'text', required: false },
        { name: 'expiresAt', type: 'date', required: true },
        { name: 'views', type: 'json', required: false },
      ]
    },
    {
      name: 'presence',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != "" && user = @request.auth.id',
      updateRule: '@request.auth.id != "" && user = @request.auth.id',
      deleteRule: '@request.auth.id != "" && user = @request.auth.id',
      fields: [
        { name: 'user', type: 'relation', required: true, options: { collectionId: U, cascadeDelete: true, maxSelect: 1, minSelect: 1 } },
        { name: 'online', type: 'bool', required: false },
        { name: 'lastSeen', type: 'date', required: false },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_presence_user ON presence (user)']
    },
  ];

  let collectionIds = {};

  // First pass: create collections that only depend on users
  for (const c of collections) {
    const existing = collectionsData.items.find(col => col.name === c.name);
    if (existing) {
      console.log(`Collection "${c.name}" already exists`);
      collectionIds[c.name] = existing.id;
      continue;
    }

    const createRes = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: c.name,
        type: c.type,
        listRule: c.listRule,
        viewRule: c.viewRule,
        createRule: c.createRule,
        updateRule: c.updateRule,
        deleteRule: c.deleteRule,
        fields: c.fields,
        indexes: c.indexes || [],
      }),
    });

    if (!createRes.ok) {
      console.error(`Failed to create "${c.name}":`, await createRes.text());
      continue;
    }

    const result = await createRes.json();
    collectionIds[c.name] = result.id;
    console.log(`Created "${c.name}" (id: ${result.id})`);
  }

  // Now create messages (depends on: users, conversations, messages self-ref)
  const C = collectionIds.conversations;
  if (!C) {
    console.error('Conversations collection not found!');
    process.exit(1);
  }

  // Create messages with a temporary self-ref, then fix it
  const messagesFields = [
    { name: 'conversation', type: 'relation', required: true, options: { collectionId: C, cascadeDelete: true, maxSelect: 1, minSelect: 1 } },
    { name: 'text', type: 'text', required: false },
    { name: 'image', type: 'file', required: false, options: { maxSelect: 1, maxSize: 10485760, mimeTypes: ['image/jpeg','image/png','image/gif','image/webp'] } },
    { name: 'video', type: 'file', required: false, options: { maxSelect: 1, maxSize: 10485760, mimeTypes: ['video/mp4','video/webm','video/quicktime'] } },
    { name: 'audio', type: 'file', required: false, options: { maxSelect: 1, maxSize: 10485760, mimeTypes: ['audio/*'] } },
    { name: 'user', type: 'relation', required: true, options: { collectionId: U, cascadeDelete: false, maxSelect: 1, minSelect: 1 } },
    { name: 'replyTo', type: 'relation', required: false, options: { collectionId: C, cascadeDelete: false, maxSelect: 1 } }, // temp: point to conversations
    { name: 'replyToUserName', type: 'text', required: false },
    { name: 'reactions', type: 'json', required: false },
    { name: 'status', type: 'select', required: false, options: { values: ['sent', 'delivered', 'read'], maxSelect: 1 } },
  ];

  const existingMessages = collectionsData.items.find(c => c.name === 'messages');
  if (existingMessages) {
    console.log('Collection "messages" already exists');
    collectionIds.messages = existingMessages.id;
  } else {
    const createRes = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'messages',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != "" && user = @request.auth.id',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != "" && user = @request.auth.id',
        fields: messagesFields,
      }),
    });

    if (!createRes.ok) {
      console.error('Failed to create "messages":', await createRes.text());
    } else {
      const result = await createRes.json();
      collectionIds.messages = result.id;
      console.log(`Created "messages" (id: ${result.id})`);
    }
  }

  // Create typing (depends on: conversations)
  const existingTyping = collectionsData.items.find(c => c.name === 'typing');
  if (existingTyping) {
    console.log('Collection "typing" already exists');
    collectionIds.typing = existingTyping.id;
  } else {
    const createRes = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'typing',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'conversation', type: 'relation', required: true, options: { collectionId: C, cascadeDelete: true, maxSelect: 1, minSelect: 1 } },
          { name: 'typers', type: 'json', required: false },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_typing_conv ON typing (conversation)']
      }),
    });

    if (!createRes.ok) {
      console.error('Failed to create "typing":', await createRes.text());
    } else {
      const result = await createRes.json();
      collectionIds.typing = result.id;
      console.log(`Created "typing" (id: ${result.id})`);
    }
  }

  // Fix messages.replyTo to point to messages (self-reference)
  const M = collectionIds.messages;
  if (M) {
    const getRes = await fetch(`${PB_URL}/api/collections/${M}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const col = await getRes.json();

    const updatedFields = col.fields.map(f => {
      if (f.name === 'replyTo' && f.type === 'relation') {
        return { ...f, options: { ...f.options, collectionId: M } };
      }
      return f;
    });

    const updateRes = await fetch(`${PB_URL}/api/collections/${M}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fields: updatedFields }),
    });

    if (!updateRes.ok) {
      console.error('Failed to fix messages.replyTo:', await updateRes.text());
    } else {
      console.log('Fixed messages.replyTo -> messages (self-reference)');
    }
  }

  console.log('\nDone! All collections created/updated successfully.');
  console.log('\nCollection IDs:');
  console.log(`  users: ${U}`);
  for (const [name, id] of Object.entries(collectionIds)) {
    console.log(`  ${name}: ${id}`);
  }
}

main();
