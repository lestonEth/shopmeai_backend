const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    childId: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Parent linked to child
    type: { type: String, enum: ['purchase', 'balance_add'], required: true },
    amount: { type: Number, required: true },
    productName: { type: String, default: null },
    description: { type: String, default: null }, // Additional details on transaction
    previousBalance: { type: Number, required: true }, // Balance before transaction
    newBalance: { type: Number, required: true }, // Balance after transaction
    status: { type: String, enum: ['completed', 'declined'], required: true },
}, { timestamps: true }); // Adds `createdAt` and `updatedAt` automatically

module.exports = mongoose.model('Transaction', TransactionSchema);
