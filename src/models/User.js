const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, unique: true, sparse: true }, // Parent's email (NULL for child accounts)
    password_hash: { type: String, required: true },
    role: { type: String, enum: ['parent', 'child'], required: true },
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Reference to parent if child
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
