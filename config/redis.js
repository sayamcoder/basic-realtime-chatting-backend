const {createClient} = require('redis')

const createRedisClient = () => {
    const client = createClient({ url: process.env.REDIS_URL});
    client.on('error', (err) => console.error('Redis Client Error:', err));
    return client;
}

module.exports = createRedisClient;