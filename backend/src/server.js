const app = require('./app');
const http = require('http');
const { initSocket } = require('./socket');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
  console.log(`RunSphere server running on port ${PORT}`);
});