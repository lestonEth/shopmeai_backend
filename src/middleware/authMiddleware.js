const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Child = require('../models/Child');

/**
 * Middleware to verify JWT token and attach user object to request
 */
const verifyUser = async (req, res, next) => {
    try {
        const token = req.header('Authorization');
        if (!token) {
            return res.status(401).json({ message: 'Access Denied. No token provided.' });
        }

        const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
        const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);

        let user;
        if (decoded.role === 'parent') {
            user = await User.findById(decoded.user_id).select('-password_hash');
        } else if (decoded.role === 'child') {
            user = await Child.findById(decoded.user_id).select('-password');
        }

        console.log('Decoded user:', user);

        if (!user) {
            return res.status(401).json({ message: 'Invalid token or user not found.' });
        }

        req.user = user;
        req.role = decoded.role;
        req.parent_id = decoded.parent_id || null;

        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token.' });
    }
};

/**
 * Middleware to check if the user is a parent
 */
const verifyParent = (req, res, next) => {
    if (req.role !== 'parent') {
        return res.status(403).json({ message: 'Access Denied. Parent role required.' });
    }
    next();
};

/**
 * Middleware to check if the user is a child
 */
const verifyChild = (req, res, next) => {
    if (req.role !== 'child') {
        return res.status(403).json({ message: 'Access Denied. Child role required.' });
    }
    next();
};

module.exports = { verifyUser, verifyParent, verifyChild };
