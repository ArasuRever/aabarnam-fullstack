const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'aabarnam_super_secret_key_2026';

const verifyAdmin = (req, res, next) => {
    // 1. Look for the "Badge" in the request headers
    const token = req.header('Authorization')?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access Denied: No security token provided.' });
    }

    try {
        // 2. Verify the badge is real and hasn't been forged
        const verified = jwt.verify(token, JWT_SECRET);
        
        // 3. Ensure the person holding the badge is actually an ADMIN
        if (verified.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access Denied: Admin privileges required.' });
        }
        
        // Let them pass
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid or expired token.' });
    }
};

module.exports = { verifyAdmin };