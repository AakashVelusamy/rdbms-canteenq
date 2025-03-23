const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect('mongodb://localhost/canteen')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Models
const Feedback = require('./models/Feedback');
const Student = require('./models/Student');
const Admin = require('./models/Admin');
const MenuItem = require('./models/MenuItem');
const Order = require('./models/Order');
const Transaction = require('./models/Transaction');

// Student Routes
app.post('/api/student/login', async (req, res) => {
  const { rollNo, password } = req.body;
  const admin = await Admin.findOne({ username: rollNo });
  if (admin && await bcrypt.compare(password, admin.password)) {
    return res.json({ role: 'admin', redirect: '/admin.html' });
  }
  const student = await Student.findOne({ rollNo });
  if (student && await bcrypt.compare(password, student.password)) {
    return res.json({ role: 'student', redirect: '/food.html', rollNo });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

app.get('/api/student/food', async (req, res) => {
  const rollNo = req.query.rollNo;
  if (!rollNo) return res.status(400).json({ error: 'Roll number required' });

  const student = await Student.findOne({ rollNo });
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const categories = await MenuItem.distinct('category');
  const menu = {};
  for (let category of categories) {
    menu[category] = await MenuItem.find({ category, stock: { $gt: 0 } });
  }
  res.json({ menu, balance: student.balance });
});

app.post('/api/student/order', async (req, res) => {
  const { rollNo, orders } = req.body;
  const student = await Student.findOne({ rollNo });
  if (!student) return res.status(404).json({ error: 'Student not found' });

  let totalAmount = 0;
  for (let category in orders) {
    for (let { itemId, quantity } of orders[category]) {
      const item = await MenuItem.findById(itemId);
      if (!item || item.stock < quantity) {
        return res.status(400).json({ error: `${item?.name || 'Item'} out of stock` });
      }
      const cost = item.price * quantity;
      totalAmount += cost;
    }
  }
  if (student.balance < totalAmount) {
    return res.status(400).json({ error: 'Low balance', redirect: '/food.html' });
  }
  totalAmount = 0;
  const receipts = {};
  for (let category in orders) {
    let categoryTotal = 0;
    const items = [];
    for (let { itemId, quantity } of orders[category]) {
      const item = await MenuItem.findById(itemId);
      const cost = item.price * quantity;
      categoryTotal += cost;
      items.push({ itemId, name: item.name, category, quantity, price: item.price });
      item.stock -= quantity;
      await item.save();
    }
    totalAmount += categoryTotal;
    receipts[category] = { items, total: categoryTotal };
    const order = await Order.create({ rollNo, items, totalAmount: categoryTotal });
    await Transaction.create({ rollNo, type: 'order', amount: -categoryTotal, orderId: order._id });
  }
  student.balance -= totalAmount;
  await student.save();
  res.json({ message: 'Order placed', receipts });
});

app.get('/api/student/transactions', async (req, res) => {
  const rollNo = req.query.rollNo;
  if (!rollNo) return res.status(400).json({ error: 'Roll number required' });

  const transactions = await Transaction.find({ rollNo }).sort({ timestamp: -1 });
  res.json(transactions);
});

// Admin Routes
app.post('/api/admin/add-item', async (req, res) => {
  const { name, category, price, stock } = req.body;
  const item = new MenuItem({ name, category, price, stock });
  await item.save();
  res.json({ message: 'Item added', item });
});

app.get('/api/admin/items', async (req, res) => {
  const items = await MenuItem.find();
  res.json(items);
});

app.put('/api/admin/restock/:id', async (req, res) => {
  const { quantity } = req.body;
  const item = await MenuItem.findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  item.stock += quantity;
  await item.save();
  res.json({ message: 'Item restocked', item });
});

app.put('/api/admin/update-price/:id', async (req, res) => {
  const { price } = req.body;
  const item = await MenuItem.findByIdAndUpdate(req.params.id, { price }, { new: true });
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json({ message: 'Price updated', item });
});

app.delete('/api/admin/delete-item/:id', async (req, res) => {
  const item = await MenuItem.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json({ message: 'Item deleted' });
});

app.get('/api/admin/transactions', async (req, res) => {
  const orders = await Order.find().sort({ timestamp: -1 });
  res.json(orders);
});

app.post('/api/admin/add-student', async (req, res) => {
  const { rollNo, password, name, balance } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const student = new Student({
      rollNo,
      password: hashedPassword,
      name,
      balance: balance || 500,
    });
    await student.save();
    res.json({ message: 'Student added successfully' });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Roll number already exists' });
    } else {
      res.status(500).json({ error: 'Failed to add student' });
    }
  }
});

app.post('/api/admin/update-balance', async (req, res) => {
  const { rollNo, amount } = req.body;
  if (!rollNo || !amount) return res.status(400).json({ error: 'Roll number and amount are required' });
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) return res.status(400).json({ error: 'Amount must be a positive number' });

  const student = await Student.findOne({ rollNo });
  if (!student) return res.status(404).json({ error: 'Wrong credentials: Roll number not found' });

  student.balance += amountNum;
  await student.save();
  await Transaction.create({ rollNo, type: 'top-up', amount: amountNum });
  res.json({ message: `Balance updated successfully. New balance: ₹${student.balance}` });
});

app.get('/getTransactions', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ date: -1 });
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error.stack);
    res.status(500).json({ message: 'Server error while fetching transactions.' });
  }
});

app.post('/submitFeedback', async (req, res) => {
  const { rollNo, feedback } = req.body;
  if (!rollNo || !feedback) {
    return res.status(400).json({ message: 'Roll number and feedback are required.' });
  }
  try {
    const newFeedback = new Feedback({ rollNo, feedback });
    await newFeedback.save();
    res.status(200).json({ message: 'Feedback submitted successfully.' });
  } catch (error) {
    console.error('Error saving feedback:', error.stack);
    res.status(500).json({ message: 'Server error while saving feedback.' });
  }
});

app.get('/getFeedback', async (req, res) => {
  try {
    const feedbackList = await Feedback.find().sort({ date: -1 });
    res.status(200).json(feedbackList);
  } catch (error) {
    console.error('Error fetching feedback:', error.stack);
    res.status(500).json({ message: 'Server error while fetching feedback.' });
  }
});

app.delete('/clearFeedback', async (req, res) => {
  try {
    await Feedback.deleteMany({});
    res.status(200).json({ message: 'Feedback cleared successfully.' });
  } catch (error) {
    console.error('Error clearing feedback:', error.stack);
    res.status(500).json({ message: 'Server error while clearing feedback.', error: error.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));