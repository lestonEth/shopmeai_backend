const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const nodemailer = require('nodemailer');

// Register a new user (Parent or Child)
const register = async (req, res) => {
    try {
        const { username, email, password, role, parent_id } = req.body;

        if (role === 'parent') {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            email: role === 'parent' ? email : null,
            password_hash: hashedPassword,
            role,
            parent_id: parent_id || null,
        });

        await newUser.save();
        res.status(201).json({ message: 'User registered successfully', user: { username, email, role } });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
};

// Login User
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ user_id: user._id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '7d',
        });

        res.json({ message: 'Login successful', token, user: { username: user.username, email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ message: 'Login error', error: error.message });
    }
};

// Forgot Password - Send Reset Email
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User with this email does not exist' });
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

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }, // Token must not be expired
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
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
    