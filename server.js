/**
 * @file server.js
 * @description This file contains the main server-side logic for the game website, 
 *              including route definitions, database interactions, and session management.
 * 
 * @authors [Gavin Ball, Joshua Stambaugh]
 * 
 * @requires express
 * @requires mongoose
 * @requires express-session
 * @requires crypto
 */


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
    email: { type: String, default: "" },
    real_name: { type: String, default: "" },
    bio: { type: String, default: "" },
    profile_picture: { type: String, default: "" },
    stats: { type: [{ score: Number, time: Number }], default: [] } // Define as an array of objects
});

const Player = mongoose.model("Player", PlayerSchema);


const LeaderboardSchema = new mongoose.Schema({
    board: { type: [{ username: String, score: Number, time: Number }], default: [] }
});

const Leaderboard = mongoose.model("Leaderboard", LeaderboardSchema);
let leaderboard = new Leaderboard();

const CommentSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    username: { type: String, required: true },
    realName: { type: String, required: true },
    text: { type: String, required: true },
    likes: { type: Number, default: 0 },
    replies: [
        {
            username: { type: String, required: true },
            realName: { type: String, required: true },
            text: { type: String, required: true },
            likes: { type: Number, default: 0 },
            timestamp: { type: Date, default: Date.now }
        }
    ],
    timestamp: { type: Date, default: Date.now }
});

const Comment = mongoose.model("Comment", CommentSchema);

mongoose.connect(URL)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.log(err));

// ======================== Utility Functions ========================
// Add a new player to the database
async function addPlayer(user, password, email, real_name, picture, bio) {
    const newPlayer = new Player({ acct_name: user, acct_password: password, email: email, real_name: real_name, profile_picture: picture, bio: bio });
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
            req.session.username = player.acct_name;
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
    const { username, password, email, real_name, picture, bio } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    const existingPlayer = await findPlayer(username);
    if (existingPlayer) {
        return res.status(400).json({ message: 'Username already exists' });
    }

    const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
    const hashedPassword = await hash(password, salt);

    await addPlayer(username, `${salt}:${hashedPassword}`, email, real_name, picture, bio);
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


app.post('/update-stats', isLoggedIn, async (req, res) => {
    const { score, time } = req.body;
    const username = req.session.username;

    try {
        const player = await findPlayer(username); // Add 'await' here
        if (!player) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!Array.isArray(player.stats)) {
            player.stats = []; // Ensure stats is initialized as an array
        }

        player.stats.push({ score, time });
        await player.save(); // Save updated player document to the database
        console.log(`${username} saved their stats, scored ${score} points in ${time} seconds`);

        leaderboard.board.push({ username: username, score: score, time: time });
        await leaderboard.save();

        res.status(200).json({ message: 'Stats saved successfully to user and leaderboard' });
    } catch (err) {
        console.error('Error saving stats:', err);
        res.status(500).json({ message: 'Error saving stats' });
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
// Delete later
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
app.post('/postComment', async (req, res) => {
    const { comment } = req.body;
    const username = req.session.user?.username || "Anonymous";
    const realName = req.session.user?.realName || "Anonymous";

    if (!comment) {
        return res.status(400).json({ error: "Comment text is required." });
    }

    const newComment = {
        id: new Date().getTime(), // Unique ID for the comment
        username,
        realName,
        text: comment,
        likes: 0,
        replies: [], // Initialize replies as an empty array
        timestamp: new Date()
    };

    comments.push(newComment); // Assuming comments is your in-memory array
    res.status(201).json({ success: true, comment: newComment });
});

// Post a reply to a comment
app.post('/postReply', async (req, res) => {
    const { commentId, text } = req.body;
    const username = req.session.user?.username || "Anonymous";
    const realName = req.session.user?.realName || "Anonymous";

    if (!commentId || !text) {
        return res.status(400).json({ error: 'Comment ID and text are required.' });
    }

    const parentComment = comments.find(comment => comment.id === parseInt(commentId));
    if (parentComment) {
        // Initialize replies array if it doesn't exist
        parentComment.replies = parentComment.replies || [];

        const reply = {
            id: `${commentId}-${parentComment.replies.length + 1}`, // Unique ID for reply
            username,
            realName,
            text,
            likes: 0,
            timestamp: new Date()
        };

        parentComment.replies.push(reply);

        return res.status(200).json({ success: true, reply });
    }

    // If using a database, handle MongoDB stored comments
    try {
        const parentCommentDb = await Comment.findOne({ id: commentId });
        if (!parentCommentDb) {
            return res.status(404).json({ error: 'Parent comment not found.' });
        }

        // Initialize replies array if it doesn't exist
        parentCommentDb.replies = parentCommentDb.replies || [];

        const reply = {
            username,
            realName,
            text,
            likes: 0,
            timestamp: new Date()
        };

        parentCommentDb.replies.push(reply);
        await parentCommentDb.save();

        res.status(200).json({ success: true, reply });
    } catch (err) {
        console.error('Error posting reply:', err);
        res.status(500).json({ error: 'Internal server error.' });
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

app.get('/getComments', async (req, res) => {
    const sort = req.query.sort || 'newest'; // Default to 'newest'
    let sortedComments = [...comments]; // Clone in-memory comments array

    // Sorting for in-memory comments
    if (sort === 'likes') {
        sortedComments.sort((a, b) => b.likes - a.likes);
    } else if (sort === 'newest') {
        sortedComments.sort((a, b) => b.timestamp - a.timestamp);
    }

    // Fetch and sort MongoDB-stored comments if they exist
    try {
        const dbComments = await Comment.find();
        if (dbComments.length > 0) {
            let mongoComments = [...dbComments];
            if (sort === 'likes') {
                mongoComments.sort((a, b) => b.likes - a.likes);
            } else if (sort === 'newest') {
                mongoComments.sort((a, b) => b.timestamp - a.timestamp);
            }

            // Merge in-memory and MongoDB comments
            sortedComments = sortedComments.concat(mongoComments);
        }
    } catch (err) {
        console.error('Error fetching MongoDB comments:', err);
    }

    res.json(sortedComments);
});

// Get leaderboard
app.get('/get-leaderboard', async (req, res) => {
    try {
        // Fetch all players
        const players = await Player.find();

        if (!players || players.length === 0) {
            console.log("No players found.");
            return res.json([]); // Return an empty array if no players exist
        }

        // Process the data to extract the highest score for each user
        const leaderboard = players
            .filter(player => player.stats && player.stats.length > 0) // Exclude players with no stats
            .map(player => {
                // Find the highest score in the player's stats
                const highestStat = player.stats.reduce((max, stat) => {
                    return stat.score > max.score ? stat : max;
                }, { score: 0, time: Infinity });

                return {
                    username: player.acct_name,
                    score: Math.floor(highestStat.score / 10),
                    time: highestStat.time
                };
            });

        // Sort the leaderboard by score (descending) and time (ascending as a tiebreaker)
        leaderboard.sort((a, b) => b.score - a.score || a.time - b.time);

        res.json(leaderboard);
    } catch (err) {
        console.error('Error fetching leaderboard:', err);
        res.status(500).json({ error: 'Error fetching leaderboard' });
    }
});


// ======================== Server Startup ========================
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});