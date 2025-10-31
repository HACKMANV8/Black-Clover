const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Admin credentials (In production, this should be in a database)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// Admin login route
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Check credentials
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        // Create token
        const token = jwt.sign(
            { id: 'admin', role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            message: 'Login successful'
        });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

module.exports = router;
