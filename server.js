const express = require('express');
const session = require('express-session');
const app = express();
const path = require('path');
const PORT = 3000;
const mongoose = require('mongoose');
const crypto = require('crypto');
// ======================== Static Setup ========================
app.use(express.json());
app.use(express.static('public_html'));
app.use(session({
    secret: 'd9fbc9729a1ebd6c57a3a99157bc830ace827bd7e274ec2f4f432bc6fd123b6', 
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true, // Prevent JavaScript access to cookies
    }
}));

// ======================== Password Constants ========================
const SALT_LENGTH = 16;
const HASH_LENGTH = 64;
const ITERATIONS = 100000;
const DIGEST = 'sha256';

// ======================== Database Setup ========================
const URL = "mongodb://127.0.0.1/new_db";

const PlayerSchema = new mongoose.Schema({
    acct_name: { type: String, required: true, unique: true },
    acct_password: { type: String, required: true },
    email: { type: String, default: "" }, // Default to an empty string
    real_name: { type: String, default: "" }, // Default to an empty string
    bio: { type: String, default: "" }, // Default to an empty string
    profile_picture: { type: String, default: "" }, // Default to an empty string
    stats: { type: Object, default: {} }
});

const Player = mongoose.model("Player", PlayerSchema);

mongoose.connect(URL)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.log(err));

// ======================== Utility Functions ========================
// Add a new player to the database
async function addPlayer(user, password) {
    const newPlayer = new Player({ acct_name: user, acct_password: password });
    await newPlayer.save();
}

// Find a player's account details in the database
async function findPlayer(username) {
    try {
        const player = await Player.findOne({ acct_name: username });
        return player;
    } catch (err) {
        console.error('Error: User not found in database: ', err);
        throw err;
    }
}

// Hash a user's password with a salt
function hash(password, salt) {
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, ITERATIONS, HASH_LENGTH, DIGEST, (err, derivedKey) => {
            if (err) reject(err);
            else resolve(derivedKey.toString('hex'));
        });
    });
}

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
    if (req.session.username) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized: Please log in' });
    }
}

// ======================== API Routes ========================
// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        // Fetch the user from the database
        const player = await Player.findOne({ acct_name: username });
        if (!player) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Extract salt and stored hash from the database
        const [salt, storedHash] = player.acct_password.split(':');
        
        // Hash the incoming password using the same salt
        const hashedPassword = await hash(password, salt);

        // Compare the computed hash with the stored hash
        if (hashedPassword === storedHash) {
            // Store user data in the session
            req.session.user = {
                username: player.acct_name,
                realName: player.real_name || "Anonymous",
                email: player.email || "",
                bio: player.bio || "",
                profilePicture: player.profile_picture || "",
            };
            return res.status(200).json({ message: 'Login successful' });
        } else {
            return res.status(401).json({ message: 'Invalid password' });
        }
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Registration route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    const existingPlayer = await findPlayer(username);
    if (existingPlayer) {
        return res.status(400).json({ message: 'Username already exists' });
    }

    const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
    const hashedPassword = await hash(password, salt);

    await addPlayer(username, `${salt}:${hashedPassword}`);
    res.status(200).json({ message: 'User registered successfully' });
});

// Get profile data (protected route)
app.post('/get-profile', isLoggedIn, async (req, res) => {
    const username = req.session.username;

    try {
        const player = await Player.findOne({ acct_name: username });
        if (!player) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            username: player.acct_name,
            email: player.email || '',
            realName: player.real_name || '',
            bio: player.bio || '',
            profilePicture: player.profile_picture || '',
            stats: player.stats || {}
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching profile data' });
    }
});

// Update profile route
app.post('/update-profile', isLoggedIn, async (req, res) => {
    const { email, name, picture, bio } = req.body;
    const username = req.session.username;

    try {
        const player = await Player.findOne({ acct_name: username });
        if (!player) {
            return res.status(404).json({ message: 'User not found' });
        }

        player.email = email;
        player.real_name = name;
        player.profile_picture = picture;
        player.bio = bio;

        await player.save();
        res.status(200).json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating profile' });
    }
});

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Error logging out' });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Logged out successfully' });
    });
});

app.get('/session', (req, res) => {
    if (req.session && req.session.user) {
        res.status(200).json(req.session.user); // Send user data
    } else {
        res.status(401).json({ message: 'Unauthorized' }); // Send 401 if no session
    }
});
app.get('/session', (req, res) => {
    if (req.session && req.session.username) {
        res.json({ loggedIn: true, username: req.session.username });
    } else {
        res.status(401).json({ loggedIn: false });
    }
});

app.get('/getUsername', (req, res) => {
    if (req.session && req.session.username) {
        res.json({ username: req.session.username });
    } else {
        res.status(401).json({ error: 'User not logged in' });
    }
});

const comments = []; // In-memory comments array for simplicity
let commentId = 1;

// Post a new comment
app.post('/postComment', (req, res) => {
    console.log("Session object on /postComment:", req.session);

    if (req.session && req.session.user && req.session.user.username) {
        const username = req.session.user.username;
        const realName = req.session.user.realName || "Anonymous"; // Ensure this is now a string
        const text = req.body.comment;

        if (text) {
            const newComment = { 
                id: commentId++, 
                username, 
                realName, 
                text, 
                likes: 0, 
                likedBy: [], 
                timestamp: Date.now() 
            };
            comments.push(newComment);

            return res.json({ success: true, comment: newComment });
        } else {
            return res.status(400).json({ error: 'Comment text is required' });
        }
    } else {
        return res.status(401).json({ error: 'User not logged in' });
    }
});

// Like a comment
app.post('/likeComment/:id', (req, res) => {
    if (!req.session || !req.session.user || !req.session.user.username) {
        return res.status(401).json({ error: 'User not logged in' });
    }

    const username = req.session.user.username; // Get the logged-in user's username
    const comment = comments.find(c => c.id === parseInt(req.params.id));

    if (comment) {
        if (comment.likedBy && comment.likedBy.includes(username)) {
            return res.status(400).json({ error: 'You have already liked this comment' });
        }

        // Add the user to the likedBy array
        comment.likedBy = comment.likedBy || [];
        comment.likedBy.push(username);
        comment.likes++;

        return res.json({ success: true, likes: comment.likes });
    } else {
        return res.status(404).json({ error: 'Comment not found' });
    }
});

// Get all comments
app.get('/getComments', (req, res) => {
    const sort = req.query.sort;
    let sortedComments = [...comments];

    if (sort === 'likes') {
        sortedComments.sort((a, b) => b.likes - a.likes);
    } else if (sort === 'newest') {
        sortedComments.sort((a, b) => b.timestamp - a.timestamp);
    }

    res.json(sortedComments);
});


// ======================== Server Startup ========================
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});