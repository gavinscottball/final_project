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
        sameSite: 'lax',
    }
}));

// ======================== Password Constants ========================
const SALT_LENGTH = 16;
const HASH_LENGTH = 64;
const ITERATIONS = 100000;
const DIGEST = 'sha256';

// ======================== Database Setup ========================
const URL = "mongodb://127.0.0.1/new_db";

// Schema responsible for saving the leaderboard
const PlayerSchema = new mongoose.Schema({
    acct_name: { type: String, required: true, unique: true },
    acct_password: { type: String, required: true },
    email: { type: String, default: "" },
    real_name: { type: String, default: "" },
    bio: { type: String, default: "" },
    profile_picture: { type: String, default: "imgs/default.png" },
    stats: { type: [{ score: Number, time: Number }], default: [] } // Define as an array of objects
});

const Player = mongoose.model("Player", PlayerSchema);

// Schema responsible for saving the leaderboard
const LeaderboardSchema = new mongoose.Schema({
    board: { type: [{ username: String, score: Number, time: Number }], default: [] }
});

const Leaderboard = mongoose.model("Leaderboard", LeaderboardSchema);
let leaderboard = new Leaderboard();

// Schema responsible for saving comments and their replies
const CommentSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    username: { type: String, required: true },
    realName: { type: String, required: true },
    text: { type: String, required: true },
    likes: { type: Number, default: 0 },
    likedBy: { type: [String], default: [] }, // Store usernames or user IDs
    replies: [{
        username: { type: String, required: true },
        realName: { type: String, required: true },
        text: { type: String, required: true },
        likes: { type: Number, default: 0 },
        timestamp: { type: Date, default: Date.now }
    }],
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

async function addComment(id, username, realName, text, timestamp){
    const newComment = new Comment({id: id, username: username, realName: realName, text: text, timestamp: timestamp});
    await newComment.save();
}


async function findComment(id){
    try{
        const comment = await Comment.findOne({id: id});
        return comment;
    } catch (err){
        console.error('Error: Comment not found');
        throw err;
    }
}
async function addReply(comment, username, realName, likes, text) {
    if (!username || !realName || !text) {
        throw new Error("All fields (username, realName, text) are required.");
    }

    comment.replies.push({
        username,
        realName,
        text,
        likes,
        timestamp: new Date(),
    });

    await comment.save();
}

// Hash a user's password with a salt
/**
 * Function hash - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

function hash(password, salt) {
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, ITERATIONS, HASH_LENGTH, DIGEST, (err, derivedKey) => {
            if (err) reject(err);
            else resolve(derivedKey.toString('hex'));
        });
    });
}

// Middleware to check if user is logged in
/**
 * Function isLoggedIn - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

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
                profilePicture: player.profile_picture || "imgs/default.png",
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

// Update stats route
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
    const { bio, picture } = req.body;
    const username = req.session.username;

    try {
        const player = await Player.findOne({ acct_name: username });
        if (!player) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (bio) player.bio = bio;
        if (picture) player.profile_picture = picture;

        await player.save();

        // Update the session object with the new data
        req.session.user.bio = player.bio;
        req.session.user.profilePicture = player.profile_picture;

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

// Session route
app.get('/session', (req, res) => {
    if (req.session && req.session.user) {
        res.status(200).json(req.session.user); // Send user data
    } else {
        res.status(401).json({ message: 'Unauthorized' }); // Send 401 if no session
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
    await addComment(new Date().getTime(), username, realName, comment, new Date());
    res.status(201).json({ messag: 'Successfully posted comment' });
});

// Post a reply to a comment
app.post('/postReply', async (req, res) => {
    const { commentId, text } = req.body;
    const username = req.session.user?.username || "Anonymous";
    const realName = req.session.user?.realName || "Anonymous";

    if (!commentId || !text) {
        return res.status(400).json({ error: 'Comment ID and text are required.' });
    }

    try {
        const comment = await findComment(commentId);
        if (!comment) {
            return res.status(404).json({ error: 'Parent comment not found.' });
        }

        await addReply(comment, username, realName, 0, text);
        res.status(200).json({ success: true, reply: { username, realName, text } });
    } catch (err) {
        console.error('Error posting reply:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Like a comment
app.post('/likeComment', async (req, res) => {
    if (!req.session || !req.session.user || !req.session.user.username) {
        return res.status(401).json({ error: 'User not logged in' });
    }

    const username = req.session.user.username; // Logged-in user's username
    const { id } = req.body; // Comment ID

    try {
        const comment = await findComment(id); // Fetch the comment
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        // Check if the user has already liked the comment
        if (comment.likedBy.includes(username)) {
            return res.status(400).json({ error: 'You have already liked this comment' });
        }

        // Add the user to likedBy array and increment likes
        comment.likedBy.push(username);
        comment.likes += 1;

        await comment.save();
        res.json({ success: true, likes: comment.likes });
    } catch (err) {
        console.error('Error liking comment:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get comments
app.get('/getComments', async (req, res) => {
    const sort = req.query.sort || 'newest'; // Default to 'newest'
    const comments = await Comment.find();

    // Fetch and sort MongoDB-stored comments if they exist
    try {
        if (comments .length > 0) {
            let sortedComments = [...comments];
            if (sort === 'likes') {
                sortedComments.sort((a, b) => b.likes - a.likes);
            } else if (sort === 'newest') {
                sortedComments.sort((a, b) => b.timestamp - a.timestamp);
            }
            return res.status(200).json(sortedComments)
        }
    } catch (err) {
        console.error('Error fetching MongoDB comments:', err);
        return res.status(500).json( {error: 'Error finding comments'})
    }

});

// Get leaderboard
app.get('/get-leaderboard', async (req, res) => {
    try {
        // Fetch all players
        const players = await Player.find();

        if (!players || players.length === 0) {
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