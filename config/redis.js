const { createClient } = require('redis');
const config = require("./config");

const redisClient = createClient({
    username: 'default',
    password: config.redis.password,
    socket: {
        host: config.redis.host,
        port: config.redis.port
    }
});

module.exports = redisClient;

