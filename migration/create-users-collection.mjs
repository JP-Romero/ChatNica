/**
 * Create users auth collection in PocketBase
 */

const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'mcalebr04@gmail.com';
const ADMIN_PASSWORD = 'Juan290683';

async function main() {
  // Login as superuser (PocketBase 0.36+ uses _superusers collection)
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

  // Check existing collections
  const collectionsRes = await fetch(`${PB_URL}/api/collections`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const collectionsData = await collectionsRes.json();
  const existing = collectionsData.items?.find(c => c.name === 'users');

  if (existing) {
    console.log(`Collection "users" already exists (type: ${existing.type})`);
    process.exit(0);
  }

  // Create users auth collection
  const createRes = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'users',
      type: 'auth',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: 'id = @request.auth.id',
      deleteRule: '',
      authRule: '',
      manageRule: null,
      authAlert: {
        enabled: true,
        emailTemplate: {
          subject: 'Login from a new location',
          body: '<p>Hello,</p>\n<p>We noticed a login to your {APP_NAME} account from a new location.</p>\n<p>If this was you, you may disregard this email.</p>\n<p><strong>If this was NOT you and you think that someone has gained access to your account, be sure to change your account password as soon as possible to prevent further unauthorized access.</strong></p>\n<p>{APP_NAME} team</p>'
        }
      },
      oauth2: {
        mappedFields: {
          id: '',
          name: 'displayName',
          username: '',
          avatarURL: 'photoURL'
        },
        enabled: false
      },
      passwordAuth: {
        enabled: true,
        identityFields: ['email']
      },
      mfa: { enabled: false, duration: 1800, rule: '' },
      otp: {
        enabled: false,
        duration: 180,
        length: 30,
        emailTemplate: {
          subject: 'OTP for {APP_NAME}',
          body: '<p>Hello,</p>\n<p>Your {APP_NAME} OTP code is <strong>{OTP}</strong></p>\n<p>If you didn\'t ask for this code, you may disregard this email.</p>\n<p>{APP_NAME} team</p>'
        }
      },
      emailAuth: { enabled: false },
      exceptEmailDomains: [],
      onlyVerified: false,
      sendVerification: false,
      resetPasswordTemplate: {
        subject: 'Reset password for {APP_NAME}',
        body: '<p>Hello,</p>\n<p>Click on the button below to reset your {APP_NAME} account password.</p>\n<p>{ACTION_URL}</p>\n<p><i>If you didn\'t ask to reset your password, you may disregard this email.</i></p>\n<p>{APP_NAME} team</p>'
      },
      verifyTemplate: {
        subject: 'Verify your {APP_NAME} email',
        body: '<p>Hello,</p>\n<p>Click on the button below to verify your {APP_NAME} account email address.</p>\n<p>{ACTION_URL}</p>\n<p><i>If you didn\'t sign up for {APP_NAME} you may disregard this email.</i></p>\n<p>{APP_NAME} team</p>'
      },
      confirmEmailChangeTemplate: {
        subject: 'Confirm your {APP_NAME} new email address',
        body: '<p>Hello,</p>\n<p>Click on the button below to confirm your new email address for your {APP_NAME} account.</p>\n<p>{ACTION_URL}</p>\n<p><i>If you didn\'t ask to change your email address, you may disregard this email.</i></p>\n<p>{APP_NAME} team</p>'
      },
      fields: [
        { name: 'displayName', type: 'text', required: false, presentable: false, options: { min: null, max: null, pattern: '' } },
        { name: 'photoURL', type: 'text', required: false, presentable: false, options: { min: null, max: null, pattern: '' } },
        { name: 'color', type: 'text', required: false, presentable: false, options: { min: null, max: null, pattern: '' } },
        { name: 'bio', type: 'text', required: false, presentable: false, options: { min: null, max: null, pattern: '' } },
        { name: 'city', type: 'text', required: false, presentable: false, options: { min: null, max: null, pattern: '' } },
        { name: 'department', type: 'text', required: false, presentable: false, options: { min: null, max: null, pattern: '' } }
      ],
      indexes: [],
      viewQuery: ''
    }),
  });

  if (!createRes.ok) {
    console.error('Failed to create collection:', await createRes.text());
    process.exit(1);
  }

  const result = await createRes.json();
  console.log(`Created auth collection "users" with id: ${result.id}`);

  // Now create the remaining collections
  const usersCollectionId = result.id;

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
        { name: 'requester', type: 'relation', required: true, options: { collectionId: usersCollectionId, cascadeDelete: true, maxSelect: 1, minSelect: 1 } },
        { name: 'target', type: 'relation', required: true, options: { collectionId: usersCollectionId, cascadeDelete: true, maxSelect: 1, minSelect: 1 } },
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
        { name: 'participants', type: 'relation', required: true, options: { collectionId: usersCollectionId, maxSelect: 100, cascadeDelete: false } },
        { name: 'name', type: 'text', required: false },
        { name: 'createdBy', type: 'relation', required: true, options: { collectionId: usersCollectionId, cascadeDelete: false, maxSelect: 1, minSelect: 1 } },
        { name: 'lastMessage', type: 'text', required: false },
        { name: 'lastMessageTime', type: 'date', required: false },
      ]
    },
    {
      name: 'messages',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != "" && user = @request.auth.id',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != "" && user = @request.auth.id',
      fields: [
        { name: 'conversation', type: 'relation', required: true, options: { collectionId: '', cascadeDelete: true, maxSelect: 1, minSelect: 1 } },
        { name: 'text', type: 'text', required: false },
        { name: 'image', type: 'file', required: false, options: { maxSelect: 1, maxSize: 10485760, mimeTypes: ['image/jpeg','image/png','image/gif','image/webp'] } },
        { name: 'video', type: 'file', required: false, options: { maxSelect: 1, maxSize: 10485760, mimeTypes: ['video/mp4','video/webm','video/quicktime'] } },
        { name: 'audio', type: 'file', required: false, options: { maxSelect: 1, maxSize: 10485760, mimeTypes: ['audio/*'] } },
        { name: 'user', type: 'relation', required: true, options: { collectionId: usersCollectionId, cascadeDelete: false, maxSelect: 1, minSelect: 1 } },
        { name: 'replyTo', type: 'relation', required: false, options: { collectionId: '', cascadeDelete: false, maxSelect: 1 } },
        { name: 'replyToUserName', type: 'text', required: false },
        { name: 'reactions', type: 'json', required: false },
        { name: 'status', type: 'select', required: false, options: { values: ['sent', 'delivered', 'read'], maxSelect: 1 } },
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
        { name: 'uid', type: 'relation', required: true, options: { collectionId: usersCollectionId, cascadeDelete: true, maxSelect: 1, minSelect: 1 } },
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
        { name: 'uid', type: 'relation', required: true, options: { collectionId: usersCollectionId, cascadeDelete: true, maxSelect: 1, minSelect: 1 } },
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
        { name: 'user', type: 'relation', required: true, options: { collectionId: usersCollectionId, cascadeDelete: true, maxSelect: 1, minSelect: 1 } },
        { name: 'online', type: 'bool', required: false },
        { name: 'lastSeen', type: 'date', required: false },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_presence_user ON presence (user)']
    },
    {
      name: 'typing',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'conversation', type: 'relation', required: true, options: { collectionId: '', cascadeDelete: true, maxSelect: 1, minSelect: 1 } },
        { name: 'typers', type: 'json', required: false },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_typing_conv ON typing (conversation)']
    }
  ];

  // Get collection IDs for cross-references
  let collectionIds = { users: usersCollectionId };

  for (const c of collections) {
    const existing = collectionsData.items?.find(col => col.name === c.name);
    if (existing) {
      console.log(`Collection "${c.name}" already exists, skipping`);
      collectionIds[c.name] = existing.id;
      continue;
    }

    // Fix relation field collectionIds
    const fields = c.fields.map(f => {
      if (f.type === 'relation') {
        if (f.options.collectionId === '') {
          // Try to resolve from collectionIds
          for (const [name, id] of Object.entries(collectionIds)) {
            if (f.name.includes(name) || name.includes(f.name)) {
              return { ...f, options: { ...f.options, collectionId: id } };
            }
          }
        }
      }
      return f;
    });

    const createColRes = await fetch(`${PB_URL}/api/collections`, {
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
        fields,
        indexes: c.indexes || [],
      }),
    });

    if (!createColRes.ok) {
      console.error(`Failed to create collection "${c.name}":`, await createColRes.text());
      continue;
    }

    const result = await createColRes.json();
    collectionIds[c.name] = result.id;
    console.log(`Created collection "${c.name}" with id: ${result.id}`);
  }

  // Now fix the relation fields that reference other collections created later
  // Update messages.conversation -> conversations
  // Update messages.replyTo -> messages
  // Update typing.conversation -> conversations
  console.log('\nFixing cross-collection relations...');

  const fixRelations = async (collectionName, fieldName, targetCollectionName) => {
    const col = collectionsData.items?.find(c => c.name === collectionName) || 
                (collectionIds[collectionName] ? { id: collectionIds[collectionName] } : null);
    if (!col) return;

    const targetId = collectionIds[targetCollectionName];
    if (!targetId) return;

    // Get current collection schema
    const getRes = await fetch(`${PB_URL}/api/collections/${collectionName}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const currentCol = await getRes.json();

    // Find and update the field
    const updatedFields = currentCol.fields.map(f => {
      if (f.name === fieldName && f.type === 'relation') {
        return { ...f, options: { ...f.options, collectionId: targetId } };
      }
      return f;
    });

    await fetch(`${PB_URL}/api/collections/${currentCol.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fields: updatedFields }),
    });
    console.log(`  Updated ${collectionName}.${fieldName} -> ${targetCollectionName}`);
  };

  await fixRelations('messages', 'conversation', 'conversations');
  await fixRelations('messages', 'replyTo', 'messages');
  await fixRelations('typing', 'conversation', 'conversations');

  console.log('\nAll collections created successfully!');
}

main();
