const express = require('express');
const app = express();
const PORT = 3000;
const mongoose = require('mongoose');


app.use(express.static('public_html'));

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
    const new_player = new Player({acct_name: acct_name});
    await new_player.save();
    res.send(`User: ${acct_name} has been added to the database`);
});


app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

//comments