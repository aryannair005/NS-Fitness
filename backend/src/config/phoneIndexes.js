export async function ensurePhoneIndexes(db) {
  for (const name of ['users', 'members']) {
    const collection = db.collection(name);
    // Enforce phone uniqueness before retiring the old login constraint.
    await collection.createIndex({ mobile: 1 }, { unique: true });
    for (const index of await collection.indexes()) {
      if (index.unique && index.key.email === 1 && Object.keys(index.key).length === 1) {
        try {
          await collection.dropIndex(index.name);
        } catch (error) {
          if (error.code !== 27) throw error; // Another instance may already have removed it.
        }
      }
    }
  }
}
