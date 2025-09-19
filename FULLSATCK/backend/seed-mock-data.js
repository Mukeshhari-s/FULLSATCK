const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Order = require('./models/Order');
const DISHES = [
  { title: 'Idli', price: 40 },
  { title: 'Dosa', price: 60 },
  { title: 'Vada', price: 35 },
  { title: 'Upma', price: 45 },
  { title: 'Pongal', price: 50 },
  { title: 'Sambar Rice', price: 70 },
  { title: 'Lemon Rice', price: 60 },
  { title: 'Curd Rice', price: 55 },
  { title: 'Rasam Rice', price: 65 },
  { title: 'Medu Vada', price: 35 },
  { title: 'Mysore Pak', price: 50 },
  { title: 'Payasam', price: 60 },
  { title: 'Filter Coffee', price: 30 },
  { title: 'Masala Chai', price: 25 }
];

const STATUSES = ['placed', 'accepted', 'preparing', 'ready', 'completed'];

const FRESH = process.argv.includes('--fresh');

async function connect() {
  await mongoose.connect('mongodb://localhost:27017/restaurant-app', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Connected to MongoDB');
}

async function upsertUser({ name, email, password, role }) {
  let user = await User.findOne({ email });
  if (!user) {
    const hashed = await bcrypt.hash(password, 10);
    user = await User.create({ name, email, password: hashed, role });
    console.log(`Created user: ${email} (${role})`);
  } else {
    // ensure role is correct; do not change password silently
    if (user.role !== role) {
      user.role = role;
      await user.save();
      console.log(`Updated role for ${email} -> ${role}`);
    }
  }
  return user;
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

function buildItems() {
  const count = randInt(1, 3);
  const items = [];
  const used = new Set();
  for (let i = 0; i < count; i++) {
    let dish;
    // avoid duplicates in a tiny order for variety
    do { dish = pick(DISHES); } while (used.has(dish.title) && used.size < DISHES.length);
    used.add(dish.title);
    items.push({ title: dish.title, price: dish.price, note: '' });
  }
  const totalAmount = items.reduce((s, it) => s + it.price, 0);
  return { items, totalAmount };
}

function dateAtHour(dateBase, hour) {
  const d = new Date(dateBase);
  d.setHours(hour, randInt(0, 59), randInt(0, 59), 0);
  return d;
}

async function seedOrders({ chefUser, todayCount = 20, yesterdayCount = 8 }) {
  const now = new Date();
  const todayBase = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayBase = new Date(todayBase.getTime() - 24 * 60 * 60 * 1000);

  const makeOrder = async (createdAt, status) => {
    const { items, totalAmount } = buildItems();
    const tableNumber = randInt(1, 12);
    const doc = new Order({
      tableNumber,
      items,
      status,
      chefId: ['accepted', 'preparing', 'ready', 'completed'].includes(status) ? chefUser._id : undefined,
      totalAmount,
      createdAt,
      updatedAt: createdAt
    });
    await doc.save();
  };

  // Seed today across business hours 9:00 - 21:00
  const hoursToday = Array.from({ length: todayCount }, () => randInt(9, 21));
  for (const h of hoursToday) {
    const status = pick(STATUSES);
    await makeOrder(dateAtHour(todayBase, h), status);
  }

  // Seed yesterday for comparison
  const hoursYest = Array.from({ length: yesterdayCount }, () => randInt(9, 21));
  for (const h of hoursYest) {
    const status = pick(STATUSES);
    await makeOrder(dateAtHour(yesterdayBase, h), status);
  }
}

async function main() {
  try {
    await connect();

    if (FRESH) {
      await Order.deleteMany({});
      console.log('Cleared existing orders');
    }

    // Create baseline users
    const admin = await upsertUser({ name: 'Admin', email: 'admin@example.com', password: 'admin123', role: 'admin' });
    const chef = await upsertUser({ name: 'Chef', email: 'chef@example.com', password: 'chef123', role: 'chef' });
    await upsertUser({ name: 'Alice', email: 'alice@example.com', password: 'customer123', role: 'customer' });
    await upsertUser({ name: 'Bob', email: 'bob@example.com', password: 'customer123', role: 'customer' });

    await seedOrders({ chefUser: chef, todayCount: 18, yesterdayCount: 10 });

    console.log('\nMock data seeded successfully!');
    console.log('Login test accounts:');
    console.log('  Admin -> admin@example.com / admin123');
    console.log('  Chef  -> chef@example.com  / chef123');
    console.log('  User  -> alice@example.com / customer123');
    console.log('  User  -> bob@example.com   / customer123');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
