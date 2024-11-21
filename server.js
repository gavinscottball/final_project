const express = require('express');
const app = express();
const port = 3000;


const mongoose = require('mongoose');
const URL = "mongodb://127.0.0.1/new_db";

const PlayerSchema = new mongoose.Schema({
    acct_name: String
});

const Player = mongoose.model("Player", PlayerSchema);

let new_player = new Player({
    acct_nane: "Baller"
});
await new_player.save();

async function main(){
    await mongoose.connect(URL);
}

app.get('/', (req,res) => {
    res.send('Placeholder')
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});