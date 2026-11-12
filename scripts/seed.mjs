import dns from 'node:dns';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const PUBLIC_DNS_SERVERS = ['8.8.8.8', '1.1.1.1', '8.8.4.4'];

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://alharamdrycleaners2023_db_user:XPcjz9Z1Rnb0M3ia@cluster0.bqskbaa.mongodb.net/alharam_drycleaners?retryWrites=true&w=majority';

const rateListItems = [
  // --- MEN'S WEAR ---
  { name: "Suit (3 Pcs)", category: "mens", dryCleanRate: 400, steamIronRate: 200, unit: "piece", popular: true },
  { name: "Coat", category: "mens", dryCleanRate: 250, steamIronRate: 100, unit: "piece", popular: true },
  { name: "Jacket", category: "mens", dryCleanRate: 200, steamIronRate: 100, unit: "piece" },
  { name: "Sweatshirt", category: "mens", dryCleanRate: 150, steamIronRate: 25, unit: "piece" },
  { name: "Overcoat", category: "mens", dryCleanRate: 350, steamIronRate: 150, unit: "piece" },
  { name: "Shirt", category: "mens", dryCleanRate: 100, steamIronRate: 25, unit: "piece", popular: true },
  { name: "Pant / Jeans", category: "mens", dryCleanRate: 100, steamIronRate: 25, unit: "piece", popular: true },
  { name: "Lower", category: "mens", dryCleanRate: 100, steamIronRate: 25, unit: "piece" },
  { name: "T-Shirt", category: "mens", dryCleanRate: 100, steamIronRate: 25, unit: "piece" },
  { name: "Kurta Pajama (Cotton)", category: "mens", dryCleanRate: 200, steamIronRate: 0, unit: "piece" },
  { name: "Kurta Pajama (Silk)", category: "mens", dryCleanRate: 250, steamIronRate: 100, unit: "piece", popular: true },
  { name: "Sweater Full Slv", category: "mens", dryCleanRate: 150, steamIronRate: 50, unit: "piece" },
  { name: "Sweater Half Slv", category: "mens", dryCleanRate: 120, steamIronRate: 40, unit: "piece" },
  { name: "Sherwani", category: "mens", dryCleanRate: 500, steamIronRate: 200, unit: "piece", popular: true },
  { name: "Jawar Cut Bundi", category: "mens", dryCleanRate: 150, steamIronRate: 50, unit: "piece" },
  { name: "Gents Shawl (Loi)", category: "mens", dryCleanRate: 250, steamIronRate: 75, unit: "piece" },
  { name: "Tie", category: "mens", dryCleanRate: 50, steamIronRate: 15, unit: "piece" },
  { name: "Shoes", category: "mens", dryCleanRate: 300, steamIronRate: 0, unit: "pair" },
  { name: "Leather Jacket", category: "mens", dryCleanRate: 700, steamIronRate: 0, unit: "piece", popular: true },

  // --- WOMEN'S WEAR ---
  { name: "Suit (3 Pcs)", category: "womens", dryCleanRate: 250, steamIronRate: 100, unit: "piece", popular: true },
  { name: "Suit (2 Pcs)", category: "womens", dryCleanRate: 200, steamIronRate: 100, unit: "piece", popular: true },
  { name: "Cardigan", category: "womens", dryCleanRate: 150, steamIronRate: 50, unit: "piece" },
  { name: "Cardigan Half", category: "womens", dryCleanRate: 100, steamIronRate: 40, unit: "piece" },
  { name: "Shawl", category: "womens", dryCleanRate: 150, steamIronRate: 50, unit: "piece" },
  { name: "Shawl Pashmina", category: "womens", dryCleanRate: 500, steamIronRate: 200, unit: "piece", popular: true },
  { name: "Stole", category: "womens", dryCleanRate: 100, steamIronRate: 50, unit: "piece" },
  { name: "Saree", category: "womens", dryCleanRate: 200, steamIronRate: 100, rateRangeText: "₹200 to ₹600 (Dry-clean) | ₹100 to ₹180 (Iron)", unit: "piece", popular: true },
  { name: "Blouse", category: "womens", dryCleanRate: 70, steamIronRate: 20, unit: "piece" },
  { name: "Overcoat", category: "womens", dryCleanRate: 350, steamIronRate: 150, unit: "piece" },
  { name: "Ladies Coat", category: "womens", dryCleanRate: 200, steamIronRate: 100, unit: "piece" },
  { name: "Leather Jacket", category: "womens", dryCleanRate: 600, steamIronRate: 0, unit: "piece" },
  { name: "Lehenga", category: "womens", dryCleanRate: 600, steamIronRate: 150, rateRangeText: "₹600 to ₹1500 (Dry-clean) | ₹150 to ₹250 (Iron)", unit: "piece", popular: true },
  { name: "Gown", category: "womens", dryCleanRate: 500, steamIronRate: 100, rateRangeText: "₹500 to ₹1500 (Dry-clean) | ₹100 to ₹200 (Iron)", unit: "piece", popular: true },
  { name: "Shoes", category: "womens", dryCleanRate: 300, steamIronRate: 0, unit: "pair" },
  { name: "Shirt", category: "womens", dryCleanRate: 100, steamIronRate: 25, unit: "piece" },
  { name: "Pant / Jeans", category: "womens", dryCleanRate: 100, steamIronRate: 25, unit: "piece" },
  { name: "T-Shirt", category: "womens", dryCleanRate: 100, steamIronRate: 25, unit: "piece" },
  { name: "Lower", category: "womens", dryCleanRate: 100, steamIronRate: 25, unit: "piece" },
  { name: "Suede / Leather Shoes", category: "womens", dryCleanRate: 400, steamIronRate: 0, unit: "pair" },
  { name: "Hand Bag", category: "womens", dryCleanRate: 400, steamIronRate: 0, unit: "piece", popular: true },

  // --- HOME ESSENTIALS ---
  { name: "Blanket (Single)", category: "home", dryCleanRate: 250, steamIronRate: 0, unit: "piece", popular: true },
  { name: "Blanket (Double)", category: "home", dryCleanRate: 400, steamIronRate: 0, unit: "piece", popular: true },
  { name: "Quilt / Razai (Single)", category: "home", dryCleanRate: 250, steamIronRate: 0, unit: "piece" },
  { name: "Quilt / Razai (Double)", category: "home", dryCleanRate: 450, steamIronRate: 0, unit: "piece", popular: true },
  { name: "Carpet", category: "home", dryCleanRate: 35, steamIronRate: 0, unit: "per sq ft.", popular: true },
  { name: "Sofa Set", category: "home", dryCleanRate: 350, steamIronRate: 0, unit: "per seat" },
  { name: "Curtain with Lining", category: "home", dryCleanRate: 150, steamIronRate: 0, unit: "per panel" },
  { name: "Curtain without Lining", category: "home", dryCleanRate: 120, steamIronRate: 0, unit: "per panel" },
  { name: "Laptop Bag", category: "home", dryCleanRate: 200, steamIronRate: 0, unit: "piece" },
  { name: "Leather Bag", category: "home", dryCleanRate: 300, steamIronRate: 0, unit: "piece" },
  { name: "School Bag", category: "home", dryCleanRate: 200, steamIronRate: 0, unit: "piece" },

  // --- LAUNDRY NOTES ---
  { name: "Laundry Washing & Pressing (Per Piece)", category: "laundry", dryCleanRate: 40, steamIronRate: 0, unit: "piece", popular: true },
  { name: "Laundry Washing & Pressing (Per Kg)", category: "laundry", dryCleanRate: 100, steamIronRate: 0, unit: "kg", popular: true },
];

async function seed() {
  console.log('Connecting to MongoDB Atlas...');
  if (MONGODB_URI.startsWith('mongodb+srv://')) {
    const servers = dns.getServers();
    if (servers.length === 0 || servers.every((addr) => addr.startsWith('127.') || addr === '::1')) {
      dns.setServers(PUBLIC_DNS_SERVERS);
    }
  }
  try {
    await mongoose.connect(MONGODB_URI);
  } catch (err) {
    if (err?.syscall === 'querySrv' || String(err?.message || '').includes('querySrv')) {
      dns.setServers(PUBLIC_DNS_SERVERS);
      await mongoose.connect(MONGODB_URI);
    } else {
      throw err;
    }
  }
  console.log('Connected successfully!');

  const db = mongoose.connection;

  // 1. Seed Service Items
  console.log('Seeding Service Items...');
  const ServiceItemCollection = db.collection('serviceitems');
  await ServiceItemCollection.deleteMany({});
  const itemsToInsert = rateListItems.map((item) => ({
    ...item,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  await ServiceItemCollection.insertMany(itemsToInsert);
  console.log(`Successfully seeded ${itemsToInsert.length} items from rate card.`);

  // 2. Seed Default Admin User
  console.log('Seeding Default Admin User...');
  const UserCollection = db.collection('users');
  await UserCollection.deleteMany({ userId: 'alharam_admin' });
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('AlHaram@2026', salt);

  await UserCollection.insertOne({
    userId: 'alharam_admin',
    name: 'Al Haram Management',
    passwordHash,
    role: 'admin',
    phone: '+918700548416',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('Default Admin user created: userId="alharam_admin", password="AlHaram@2026"');

  // 3. Seed Default Shop Settings
  console.log('Seeding Shop Settings...');
  const ShopSettingsCollection = db.collection('shopsettings');
  await ShopSettingsCollection.deleteMany({});
  await ShopSettingsCollection.insertOne({
    storeName: "AL-HARAM Drycleaner's And Launderettes",
    tagline: "Premium Dry Cleaning, Steam Pressing & Fabric Care in Chattarpur",
    address: "A-1/67, Birla Farm Colony, Chattarpur, New Delhi-110074",
    phone1: "+91 87005 48416",
    phone2: "+91 88513 07434",
    whatsappNumber: "918700548416",
    email: "contact@alharamdrycleaners.com",
    invoicePrefix: "AHDC",
    defaultTaxRate: 0,
    maxDiscountPercentage: 30,
    termsAndConditions: [
      "Please inspect clothes at the time of delivery.",
      "We take utmost care with all garments; however, manufacturer color-run is not warranted.",
      "Deliveries must be collected within 30 days of completion.",
      "Dry cleaning & steam press tariff subject to fabric condition.",
    ],
    openingHours: "Monday - Sunday: 9:00 AM – 9:00 PM",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('Shop Settings seeded successfully.');

  // 4. Seed Initial Customer Reviews (only when reviews collection is empty so live reviews are preserved)
  const ReviewCollection = db.collection('reviews');
  const existingReviewCount = await ReviewCollection.countDocuments();
  if (existingReviewCount === 0) {
    console.log('Seeding starter customer reviews...');
    const now = new Date();
    await ReviewCollection.insertMany([
      {
        name: 'Rohit Sharma',
        role: 'Chattarpur Resident',
        serviceType: 'Suit & Sherwani Dry Cleaning',
        rating: 5,
        comment:
          'Excellent stain removal on my formal blazers and woollen coats. Returned crisp, fresh, and neatly packaged right on schedule.',
        isVerifiedCustomer: true,
        isApproved: true,
        editedByAdmin: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'Priya Mehta',
        role: 'Regular Customer',
        serviceType: 'Saree & Ethnic Care',
        rating: 5,
        comment:
          'Super careful with heavy silk sarees and delicate embroidery. Free doorstep pickup and WhatsApp live tracking with OTP delivery makes it effortless.',
        isVerifiedCustomer: true,
        isApproved: true,
        editedByAdmin: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'Aman Verma',
        role: 'Vasant Kunj Enclave',
        serviceType: 'Steam Ironing & Blankets',
        rating: 5,
        comment:
          'Reliable turnaround every week for office shirts and winter blankets. Transparent digital billing and very courteous doorstep staff.',
        isVerifiedCustomer: true,
        isApproved: true,
        editedByAdmin: false,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    console.log('Seeded 3 starter customer reviews.');
  } else {
    console.log(`Skipping review seed (${existingReviewCount} existing reviews found).`);
  }

  await mongoose.disconnect();
  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

