const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  rollNo: { type: String, required: true },
  type: { type: String, enum: ['order', 'top-up'], required: true },
  amount: { type: Number, required: true }, // Negative for orders, positive for top-ups
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: false },
  timestamp: { type: Date, default: Date.now } // Note: app.js uses timestamp, not date
});

module.exports = mongoose.model('Transaction', transactionSchema);