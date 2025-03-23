const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to verify JWT token and attach user object to request
 */
const verifyUser = async (req, res, next) => {
    try {
        const token = req.header('Authorization');

        if (!token) {
            return res.status(401).json({ message: 'Access Denied. No token provided.' });
        }

        // Extract the token from "Bearer <token>" format
        const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;

        const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.user_id).select('-password_hash');

        if (!req.user) {
            return res.status(401).json({ message: 'Invalid token or user not found.' });
        }

        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token.' });
    }
};

/**
 * Middleware to check if the user is a parent
 */
const verifyParent = (req, res, next) => {
    if (!req.user || req.user.role !== 'parent') {
        return res.status(403).json({ message: 'Access Denied. Parent role required.' });
    }
    next();
};

/**
 * Middleware to check if the user is a child
 */
const verifyChild = (req, res, next) => {
    if (!req.user || req.user.role !== 'child') {
        return res.status(403).json({ message: 'Access Denied. Child role required.' });
    }
    next();
};

module.exports = { verifyUser, verifyParent, verifyChild };
