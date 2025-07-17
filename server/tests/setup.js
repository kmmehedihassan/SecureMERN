// server/tests/setup.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

module.exports = {
  setupDB: async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri, {
      // no need for useNewUrlParser / useUnifiedTopology on Mongoose v6+
    });
  },
  teardownDB: async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  }
};
