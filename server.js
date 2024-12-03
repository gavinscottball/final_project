const express = require('express');
const app = express();
const path = require('path')
const PORT = 3000;
const mongoose = require('mongoose');
const crypto = require('crypto');

app.use(express.json())
app.use(express.static('public_html'));

const SALT_LENGTH = 16;
const HASH_LENGTH = 64;
const ITERATIONS = 100000;
const DIGEST = 'sha256';

// hashes a user's password with a salt
// uses pbkdf2 to help orevent brute force attacks
function hash(password, salt) {
    return new Promise((resolve, reject) => [
        crypto.pbkdf2(password, salt, ITERATIONS, HASH_LENGTH, DIGEST, (err, derivedKey) => {
            if (err) reject(err);
            else resolve(derivedKey.toString('hex'));
        })
    ])
}

// used for registering a new user
// will call the hashing function to hash the user's password
// NOTE: password is currently not being stored anywhere
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' })
    }

    const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
    try {
        const hashedPassword = await hash(password, salt);
        console.log("password hashed for user " + username)
        res.status(200).json({ message: 'User ' + username + " has been registered" });
    }
    catch (err) {
        res.status(500).json({ message: 'Error registering user' })
    }
});

const URL = "mongodb://127.0.0.1/new_db";

const PlayerSchema = new mongoose.Schema({
    acct_name: String
});

const Player = mongoose.model("Player", PlayerSchema);

mongoose.connect(URL)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.log(err));

app.use('/new_player/:acct_name', async (req, res) => {
    const { acct_name } = req.params;
    const new_player = new Player({ acct_name: acct_name });
    await new_player.save();
    res.send(`User: ${acct_name} has been added to the database`);
});


app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});