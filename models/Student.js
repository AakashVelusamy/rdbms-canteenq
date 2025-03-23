const mongoose = require('mongoose');
const studentSchema = new mongoose.Schema({
  rollNo: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 500 },
  name: String,
});
module.exports = mongoose.model('Student', studentSchema);