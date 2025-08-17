const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // Check if no token
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = { id: decoded.userId }; // Changed to match the token payload
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

module.exports = auth;
