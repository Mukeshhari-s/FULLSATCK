// Run this script with: node seed-south-indian-menu.js
// Make sure MongoDB is running and you have installed mongoose: npm install mongoose

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/restaurant-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const categorySchema = new mongoose.Schema({
  name: String,
  filter: String,
  dishesPerCategory: Number,
  description: String,
});

const menuItemSchema = new mongoose.Schema({
  categoryId: mongoose.Schema.Types.ObjectId,
  title: String,
  price: Number,
  description: String,
  image: String,
  isActive: Boolean,
});

const Category = mongoose.model('Category', categorySchema);
const MenuItem = mongoose.model('MenuItem', menuItemSchema);

const categories = [
  { name: 'Breakfast', filter: 'breakfast', dishesPerCategory: 10, description: 'South Indian breakfast items' },
  { name: 'Main Course', filter: 'maincourse', dishesPerCategory: 10, description: 'South Indian main course' },
  { name: 'Snacks', filter: 'snacks', dishesPerCategory: 10, description: 'South Indian snacks' },
  { name: 'Sweets', filter: 'sweets', dishesPerCategory: 10, description: 'South Indian sweets' },
  { name: 'Beverages', filter: 'beverages', dishesPerCategory: 10, description: 'South Indian beverages' },
];

const dishes = [
  { title: 'Idli', price: 40, description: 'Steamed rice cakes served with chutney and sambar', category: 'Breakfast' },
  { title: 'Dosa', price: 60, description: 'Crispy rice and lentil crepe served with chutney and sambar', category: 'Breakfast' },
  { title: 'Vada', price: 35, description: 'Fried lentil doughnuts served with chutney', category: 'Breakfast' },
  { title: 'Upma', price: 45, description: 'Savory semolina porridge with vegetables', category: 'Breakfast' },
  { title: 'Pongal', price: 50, description: 'Rice and lentil porridge with pepper and ghee', category: 'Breakfast' },
  { title: 'Sambar Rice', price: 70, description: 'Rice mixed with sambar and vegetables', category: 'Main Course' },
  { title: 'Lemon Rice', price: 60, description: 'Rice flavored with lemon and spices', category: 'Main Course' },
  { title: 'Curd Rice', price: 55, description: 'Rice mixed with yogurt and tempered spices', category: 'Main Course' },
  { title: 'Rasam Rice', price: 65, description: 'Rice served with tangy rasam soup', category: 'Main Course' },
  { title: 'Medu Vada', price: 35, description: 'Crispy fried lentil fritters', category: 'Snacks' },
  { title: 'Mysore Pak', price: 50, description: 'Gram flour and ghee sweet', category: 'Sweets' },
  { title: 'Payasam', price: 60, description: 'Sweet milk pudding with vermicelli', category: 'Sweets' },
  { title: 'Filter Coffee', price: 30, description: 'Traditional South Indian filter coffee', category: 'Beverages' },
  { title: 'Masala Chai', price: 25, description: 'Spiced Indian tea', category: 'Beverages' },
];

async function seed() {
  await MenuItem.deleteMany({});
  await Category.deleteMany({});

  const categoryDocs = {};
  for (const cat of categories) {
    const doc = await Category.create(cat);
    categoryDocs[cat.name] = doc._id;
  }

  for (const dish of dishes) {
    await MenuItem.create({
      categoryId: categoryDocs[dish.category],
      title: dish.title,
      price: dish.price,
      description: dish.description,
      image: '',
      isActive: true,
    });
  }

  console.log('South Indian menu seeded successfully!');
  mongoose.disconnect();
}

seed();
