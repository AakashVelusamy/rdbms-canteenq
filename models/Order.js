const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  rollNo: { type: String, required: true },
  items: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    name: String,
    category: String,
    quantity: Number,
    price: Number
  }],
  totalAmount: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now } // Matches app.js
});

module.exports = mongoose.model('Order', orderSchema);