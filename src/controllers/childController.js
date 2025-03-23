const Child = require('../models/Child');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Transaction = require('../models/Transaction'); // Assuming you have a transaction model

// Register a new child account
exports.registerChild = async (req, res) => {
    try {
        const { name, email, password, age, spendingLimit } = req.body;
        const parent_id = req.user._id;

        console.log("Child registration request");
        console.log(req.user);
        console.log(`Parent ID: ${parent_id}`);

        // Check if child already exists
        let child = await Child.findOne({ email });
        if (child) return res.status(400).json({ message: "Child already exists" });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create child
        child = new Child({
            name,
            email,
            password: hashedPassword,
            age,
            parent_id,
            spendingLimit,
            balance: 0.0,
            active: true, // Default active
            avatar: name.charAt(0) // Auto-generate avatar
        });

        await child.save();
        res.status(201).json({ message: "Child account created successfully", child });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

// Child login
exports.loginChild = async (req, res) => {
    try {
        const { email, password } = req.body;
        const child = await Child.findOne({ email });

        if (!child) return res.status(404).json({ message: "Child not found" });

        const isMatch = await bcrypt.compare(password, child.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        // Generate token
        const token = jwt.sign({ id: child._id, role: "child" }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({
            token,
            childId: child._id,
            name: child.name,
            avatar: child.avatar,
            balance: child.balance,
            spendingLimit: child.spendingLimit,
            active: child.active
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

// Get child profile
exports.getChildProfile = async (req, res) => {
    try {
        const child = await Child.findById(req.params.id).select('-password');
        if (!child) return res.status(404).json({ message: "Child not found" });

        res.status(200).json(child);
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

// Update child's spending limit (by parent)
exports.updateSpendingLimit = async (req, res) => {
    try {
        const { spendingLimit } = req.body;
        const child = await Child.findById(req.params.id);
        if (!child) return res.status(404).json({ message: "Child not found" });

        child.spendingLimit = spendingLimit;
        await child.save();

        res.status(200).json({ message: "Spending limit updated", spendingLimit: child.spendingLimit });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

// Add balance (by parent)
exports.addBalance = async (req, res) => {
    try {
        const { amount } = req.body;
        const child = await Child.findById(req.params.id);
        if (!child) return res.status(404).json({ message: "Child not found" });

        child.balance += amount;
        await child.save();

        res.status(200).json({ message: "Balance updated", balance: child.balance });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

// Child makes a purchase
exports.makePurchase = async (req, res) => {
    try {
        const { childId, amount, description } = req.body;

        const child = await Child.findById(childId);
        if (!child) return res.status(404).json({ message: "Child not found" });

        if (amount > child.spendingLimit) {
            return res.status(400).json({ message: "Amount exceeds spending limit" });
        }

        if (amount > child.balance) {
            return res.status(400).json({ message: "Insufficient balance" });
        }

        // Deduct amount
        child.balance -= amount;
        await child.save();

        // Create transaction
        const transaction = new Transaction({
            childId,
            amount,
            description,
            date: new Date()
        });

        await transaction.save();

        res.status(200).json({ message: "Purchase successful", balance: child.balance });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};
