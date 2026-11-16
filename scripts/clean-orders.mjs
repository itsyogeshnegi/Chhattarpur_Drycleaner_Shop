import dns from 'node:dns';
import mongoose from 'mongoose';

// Configure public DNS to prevent c-ares SRV lookup errors on Windows
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://alharamdrycleaners2023_db_user:XPcjz9Z1Rnb0M3ia@cluster0.bqskbaa.mongodb.net/alharam_drycleaners?retryWrites=true&w=majority';

async function cleanOrderInvoices() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  const db = mongoose.connection.db;
  console.log(`Connected to database: "${db.databaseName}"`);

  // Target collection: orderinvoices ONLY
  const orderInvoicesCollection = db.collection('orderinvoices');
  const countBefore = await orderInvoicesCollection.countDocuments();
  console.log(`Current documents in "orderinvoices": ${countBefore}`);

  // Safety check: confirm other collections exist and are untouched
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map((c) => c.name);
  console.log('Existing collections in database:', collectionNames.join(', '));

  console.log('Deleting all documents from "orderinvoices" only...');
  const result = await orderInvoicesCollection.deleteMany({});
  console.log(`Deleted ${result.deletedCount} documents from "orderinvoices".`);

  const countAfter = await orderInvoicesCollection.countDocuments();
  console.log(`Remaining documents in "orderinvoices": ${countAfter}`);

  // Verify other collections remain intact
  for (const name of ['users', 'serviceitems', 'shopsettings', 'reviews']) {
    if (collectionNames.includes(name)) {
      const cnt = await db.collection(name).countDocuments();
      console.log(`Verified untouched collection "${name}": ${cnt} documents.`);
    }
  }

  await mongoose.disconnect();
  console.log('Disconnected. Clean operation completed successfully.');
}

cleanOrderInvoices().catch((err) => {
  console.error('Error cleaning orderinvoices collection:', err);
  process.exit(1);
});

