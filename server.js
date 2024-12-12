const express = require('express');
const session = require('express-session');
const app = express();
const path = require('path')
const PORT = 3000;
const mongoose = require('mongoose');
const crypto = require('crypto');


// ======================== Static Setup ========================
app.use(express.json())
app.use(express.static('public_html'));
app.use(session({
    secret: 'd9fbc9729a1ebd6c57a3a99157bc830ace827bd7e274ec2f4f432bc6fd123b6d',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false}
}))


// ======================== Password Constants ========================
const SALT_LENGTH = 16;
const HASH_LENGTH = 64;
const ITERATIONS = 100000;
const DIGEST = 'sha256';


// ======================== Database ========================
// url for database
const URL = "mongodb://127.0.0.1/new_db";

// create the new player schema
const PlayerSchema = new mongoose.Schema({
    acct_name: { type: String, required: true, unique: true },
    acct_password: { type: String, required: true },
    email: { type: String, default: null },
    real_name: { type: String, default: null },
    bio: { type: String, default: null },
    profile_picture: { type: String, default: null }, // Consistent with `/update-profile`
    stats: { type: Object, default: {} }
});


const Player = mongoose.model("Player", PlayerSchema);

// connect the database
mongoose.connect(URL)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.log(err));


// ======================== Utility ========================
// add a new player to the database
async function addPlayer(user, password) {
    const new_player = new Player({ acct_name: user, acct_password: password });
    await new_player.save();
}

// used to search the database for a player's account details
async function findPlayer(username) {
    try {
        const player = await Player.findOne({ acct_name: username });
        return player;
    } catch (err) {
        console.error('Error: User not found in database: ', err)
        throw err;
    }
}

// hashes a user's password with a salt
// uses pbkdf2 to help orevent brute force attacks
function hash(password, salt) {
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, ITERATIONS, HASH_LENGTH, DIGEST, (err, derivedKey) => {
            if (err) reject(err);
            else resolve(derivedKey.toString('hex'));
        })
    })
}


function isLoggedIn(req, res, next) {
    if (req.session.username) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized: Please log in' });
    }
}

// ======================== API Handling ========================
// used for logging in an existing user
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const player = await findPlayer(username);
        if (!player) {
            return res.status(404).json({ message: 'User not found' });
        }

        const [salt, storedHash] = player.acct_password.split(':');
        const hashedPassword = await hash(password, salt);

        if (hashedPassword === storedHash) {
            // Save the username to the session
            req.session.username = username;

            res.status(200).json({ message: 'Login successful' });
        } else {
            res.status(401).json({ message: 'Invalid password' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error logging in, try again' });
    }
});

// used for registering a new user
// will call the hashing function to hash the user's password
// NOTE: password is currently not being stored anywhere
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        console.log(`Missing username or password`)
        return res.status(400).json({ message: 'Username and password are required' });
    }

    const existingPlayer = await findPlayer(username);
    if (existingPlayer) {
        console.log(`${username} already exists`)
        return res.status(400).json({ message: 'Username already exists' });
    }

    const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
    const hashedPassword = await hash(password, salt);

    await addPlayer(username, `${salt}:${hashedPassword}`);
    console.log(`${username} registered successfully`)
    res.status(200).json({ message: 'User registered successfully' });
});


app.post('/get-profile', isLoggedIn, async (req, res) => {
    const username = req.session.username;

    if (!username) {
        return res.status(401).json({ message: 'Unauthorized: No active session' });
    }

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


app.post('/update-profile', async (req, res) => {
    const { username, email, name, picture, bio } = req.body;

    try {
        const player = await Player.findOne({ acct_name: username });
        if (!player) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update the user's profile fields
        player.email = email;
        player.real_name = name; // Fixed typo
        player.profile_picture = picture; // Ensure schema uses this field name
        player.bio = bio;

        // Save changes to the database
        await player.save();

        console.log(`User ${username} updated`);
        return res.status(200).json({ message: 'User profile updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating profile' });
    }
});


app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Error logging out' });
        }
        res.clearCookie('connect.sid'); // Clear session cookie
        res.status(200).json({ message: 'Logged out successfully' });
    });
});


// ======================== Server Startup ========================
// run the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});