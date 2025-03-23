const User = require('../models/User');
const Child = require('../models/Child');
const mongoose = require('mongoose');

// Get current user profile
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password_hash');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile', error: error.message });
    }
};

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const { username, email } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { username, email },
            { new: true, runValidators: true, select: '-password_hash' }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
};

// Get all children under a parent
const getChildren = async (req, res) => {
    try {
        const children = await Child.find({ parent_id: req.user._id });

        if (children.length === 0) {
            return res.status(200).json({ message: 'No children found', children: [] });
        }

        res.status(200).json({ children });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching children', error: error.message });
    }
};

// Delete a user account (Only parent can delete a child)
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'child' && user.parent_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the parent can delete a child account' });
        }

        await user.deleteOne();
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
};

// Toggle a child's active status (Only parent can activate/deactivate)
const activeStatus = async (req, res) => {
    console.log('Toggling child status');
    try {
        const { childId } = req.params;
        console.log(childId);

        if (!mongoose.Types.ObjectId.isValid(childId)) {
            return res.status(400).json({ message: 'Invalid child ID' });
        }

        const child = await Child.findById(childId);
        console.log(child.parent_id.toString(), req.user._id.toString());

        if (!child) {
            console.log('Child not found');
            return res.status(404).json({ message: 'Child not found' });
        }

        if (child.parent_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the parent can toggle this child’s status' });
        }

        child.active = !child.active; // Toggle active status
        await child.save();

        res.json({ message: `Child ${child.isActive ? 'activated' : 'deactivated'} successfully`, child });
    } catch (error) {
        res.status(500).json({ message: 'Error toggling child status', error: error.message });
    }
};

// Delete a child (Only parent can delete)
const deleteChild = async (req, res) => {
    try {
        const { childId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(childId)) {
            return res.status(400).json({ message: 'Invalid child ID' });
        }

        const child = await Child.findById(childId);
        if (!child) {
            return res.status(404).json({ message: 'Child not found' });
        }

        if (child.parent_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the parent can delete this child' });
        }

        await child.deleteOne();
        res.json({ message: 'Child deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting child', error: error.message });
    }
};

// Update child's profile (Only parent can update)
const updateChild = async (req, res) => {
    try {
        const { childId } = req.params;
        const { name, age, balance, spendingLimit } = req.body;

        console.log(balance + ' ' + spendingLimit);
        if (!mongoose.Types.ObjectId.isValid(childId)) {
            return res.status(400).json({ message: 'Invalid child ID' });
        }

        const child = await Child.findById(childId);
        if (!child) {
            return res.status(404).json({ message: 'Child not found' });
        }

        if (child.parent_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the parent can update this child' });
        }

        child.name = name || child.name;
        child.age = age || child.age;
        child.balance = balance || child.balance;
        child.spendingLimit = spendingLimit || child.spendingLimit;
        await child.save();

        res.json({ message: 'Child updated successfully', child });
    } catch (error) {
        res.status(500).json({ message: 'Error updating child', error: error.message });
    }
};

module.exports = { 
    getProfile, 
    updateProfile, 
    getChildren, 
    deleteUser, 
    activeStatus, 
    deleteChild, 
    updateChild 
};
