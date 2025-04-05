const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ['parent', 'child'], required: true },
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
