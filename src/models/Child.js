const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ChildSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    age: { type: Number, required: true },
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    balance: { type: Number, default: 0.0 },
    spendingLimit: { type: Number, default: 0.0 }, // Changed key for consistency
    active: { type: Boolean, default: true }, // Changed status enum to boolean (active/inactive)
    avatar: { type: String, default: function () { return this.name.charAt(0); } }, // Auto-generate avatar
    transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }], // Track purchases
    created_at: { type: Date, default: Date.now }
});

// Hash password before saving
ChildSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

module.exports = mongoose.model('Child', ChildSchema);
