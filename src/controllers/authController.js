const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Child = require('../models/Child');
const nodemailer = require('nodemailer');

// Parent Registration Only
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            email,
            password_hash: hashedPassword,
            role: 'parent',
        });

        await newUser.save();
        res.status(201).json({ message: 'Parent registered successfully', user: { username, email, role: 'parent' } });
    } catch (error) {
        res.status(500).json({ message: 'Error registering parent', error: error.message });
    }
};

// Only parent can create a child
const createChild = async (req, res) => {
    try {
        const { _id } = req.user; // Assume middleware decoded token
        const { name, email, password, age, spendingLimit } = req.body;

        console.log("Child registration request", req.body);

        const parent = await User.findById(_id);
        if (!parent || parent.role !== 'parent') {
            return res.status(403).json({ message: 'Only parents can create child accounts' });
        }

        const existingChild = await Child.findOne({ email });
        if (existingChild) {
            return res.status(400).json({ message: 'Child with this email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newChild = new Child({
            name,
            email,
            password: hashedPassword,
            age,
            parent_id: parent._id,
            spendingLimit,
            balance: 0.0,
            active: true,
            avatar: name.charAt(0)
        });


        await newChild.save();

        res.status(201).json({ message: 'Child account created successfully', child: newChild });
    } catch (error) {
        res.status(500).json({ message: 'Error creating child account', error: error.message });
    }
};

// Login for both parent and child
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        let user = await User.findOne({ email });
        let isParent = true;

        if (!user) {
            user = await Child.findOne({ email });
            isParent = false;
            if (!user) {
                return res.status(400).json({ message: 'Invalid email or password' });
            }
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const isMatch = await bcrypt.compare(password, isParent ? user.password_hash : hashedPassword);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { user_id: user._id, role: isParent ? user.role : 'child', parent_id: isParent ? user._id : user.parent_id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username || user.name,
                email: user.email,
                role: isParent ? user.role : 'child',
                parent_id: isParent ? null : user.parent_id
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Login error', error: error.message });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        let user = await User.findOne({ email }) || await Child.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User with this email does not exist' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000;

        await user.save();

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const resetLink = `${ process.env.CLIENT_URL }/reset-password/${ resetToken }`;
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Reset Request',
            text: `Click the link to reset your password: ${ resetLink }`
        });

        res.json({ message: 'Password reset link sent to email' });
    } catch (error) {
        res.status(500).json({ message: 'Error sending reset email', error: error.message });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        let user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        }) || await Child.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

        const salt = await bcrypt.genSalt(10);
        if (user.role === 'parent' || user.username) {
            user.password_hash = await bcrypt.hash(newPassword, salt);
        } else {
            user.password = await bcrypt.hash(newPassword, salt);
        }

        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;

        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ message: 'Error resetting password', error: error.message });
    }
};

const logout = (req, res) => {
    res.json({ message: 'Logout successful' });
};

module.exports = { register, login, logout, forgotPassword, resetPassword, createChild };
