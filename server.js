const express = require('express');
const app = express();
const path = require('path')
const PORT = 3000;
const mongoose = require('mongoose');
const crypto = require('crypto');


// ======================== Static Setup ========================
app.use(express.json())
app.use(express.static('public_html'));


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
    stats: { type: Object, default: {} } // Example: stats can store scores, levels, etc.
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

// ======================== API Handling ========================
// used for logging in an existing user
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // make sure the user input both credentials
    if (!username || !password) {
        console.log('Missing username or password')
        return res.status(400).json({ message: 'Username and password are required' })
    }
    try {
        // query the database for the player with that username
        const player = await (findPlayer(username));
        if (!player) {
            console.log(`User: ${username} not found`)
            return res.status(404).json({ message: 'User not found' });
        }
        // split the stored salt and hash up
        const [salt, storedHash] = player.acct_password.split(':');
        // hash the input password with the known salt
        const hashedPassword = await hash(password, salt);

        // if the password given hashes to what is in the database, log them in
        if (hashedPassword == storedHash) {
            console.log('Good credentials')
            res.status(200).json({ message: 'Login successful' })
        }
        // otherwise the password is bad
        else {
            console.log('Bad password')
            res.status(401).json({ message: 'Password invalid' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error logging in, try again' });
    }
})

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


// ======================== Server Startup ========================
// run the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});