const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send('<h1>Hello, World!</h1>');
});

app.listen(PORT, () => {
  console.log(`Server running at http://128.199.15.8:${PORT}`);
});