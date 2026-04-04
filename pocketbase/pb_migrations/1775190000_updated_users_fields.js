migrate((db) => {
  const collection = db.findCollectionByNameOrId("users");

  const fields = [
    new Field({
      name: "displayName",
      type: "text",
      required: false,
      options: {}
    }),
    new Field({
      name: "photoURL",
      type: "file",
      required: false,
      options: {
        mimeTypes: ["image/jpeg", "image/png", "image/webp"],
        maxSelect: 1,
        maxSize: 5242880
      }
    }),
    new Field({
      name: "color",
      type: "text",
      required: false,
      options: {}
    }),
    new Field({
      name: "bio",
      type: "text",
      required: false,
      options: {}
    }),
    new Field({
      name: "city",
      type: "text",
      required: false,
      options: {}
    }),
    new Field({
      name: "department",
      type: "text",
      required: false,
      options: {}
    })
  ];

  fields.forEach(f => collection.fields.add(f));

  return db.save(collection);
}, (db) => {
  const collection = db.findCollectionByNameOrId("users");
  ["displayName","photoURL","color","bio","city","department"].forEach(name => {
    collection.fields.removeByName(name);
  });
  return db.save(collection);
});
