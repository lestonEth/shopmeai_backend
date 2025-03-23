const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Child = require('../models/Child');
const nodemailer = require('nodemailer');

// Register a new user (Parent or Child)
const register = async (req, res) => {
    try {
        const { username, email, password, role, parent_id, name, age, spendingLimit } = req.body;

        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        if (role === 'parent') {
            const newUser = new User({
                username,
                email,
                password_hash: hashedPassword,
                role,
            });

            await newUser.save();
            res.status(201).json({ message: 'Parent registered successfully', user: { username, email, role } });
        } else if (role === 'child') {
            const newChild = new Child({
                name,
                email,
                password: hashedPassword,
                age,
                parent_id,
                spendingLimit,
                balance: 0.0,
                active: true,
                avatar: name.charAt(0)
            });

            await newChild.save();
            res.status(201).json({ message: 'Child registered successfully', child: { name, email, role } });
        } else {
            return res.status(400).json({ message: 'Invalid role' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
};

// Login User (Parent or Child)
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if the user is a parent
        let user = await User.findOne({ email });

        if (!user) {
            // If not a parent, check if the user is a child
            user = await Child.findOne({ email });
            if (!user) {
                return res.status(400).json({ message: 'Invalid email or password' });
            }
        }

        const isMatch = await bcrypt.compare(password, user.password_hash || user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ user_id: user._id, role: user.role || 'child' }, process.env.JWT_SECRET, {
            expiresIn: '7d',
        });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username || user.name,
                email: user.email,
                role: user.role || 'child'
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Login error', error: error.message });
    }
};

// Forgot Password - Send Reset Email
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        let user = await User.findOne({ email });
        if (!user) {
            user = await Child.findOne({ email });
            if (!user) {
                return res.status(400).json({ message: 'User with this email does not exist' });
            }
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiration

        await user.save();

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Reset Request',
            text: `Click the link to reset your password: ${resetLink}`,
        };

        await transporter.sendMail(mailOptions);

        res.json({ message: 'Password reset link sent to email' });
    } catch (error) {
        res.status(500).json({ message: 'Error sending password reset email', error: error.message });
    }
};

// Reset Password
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        let user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }, // Token must not be expired
        });

        if (!user) {
            user = await Child.findOne({
                resetPasswordToken: token,
                resetPasswordExpires: { $gt: Date.now() },
            });
            if (!user) {
                return res.status(400).json({ message: 'Invalid or expired token' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        user.password_hash = await bcrypt.hash(newPassword, salt);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;

        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ message: 'Error resetting password', error: error.message });
    }
};

// Logout (Client-side should handle token removal)
const logout = async (req, res) => {
    res.json({ message: 'Logout successful' });
};

module.exports = { register, login, logout, forgotPassword, resetPassword };