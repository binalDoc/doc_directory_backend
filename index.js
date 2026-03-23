const config = require('./config/config');
const app = require('./config/express');

const PORT = config.port || 5000;

app.listen(PORT, () => {
    console.log(`Server Started on Port ${PORT}`);
});