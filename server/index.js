require('newrelic');
const PORT      = 3000;
const cassandra = require('cassandra-driver');
const express   = require('express');
const router    = require('./routes.js');
const poll = require('../queue/getAnalyticsQueue');

const server = express()
  .use(router)
  .listen(PORT, () => console.log(`Server listening on port ${PORT}`));

module.exports = server;
