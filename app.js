global.express = require('express');
global._ = require('underscore');
global.async = require('async');
global.http = require('http');

global.mongoose = require('mongoose');
global.ObjectId = mongoose.mongo.ObjectID;

global.db = require('./config/db-schema.js').mongodb();
// local env
// mongoose.connect('mongodb://localhost/squirrel');

// staging env
// mongoose.connect(process.env.MONGO_STAGINGDB);
mongoose.connect('mongodb://nodejitsu_deeznutz:kds001m9bp2c43edpfh5kfm6e5@ds039267.mongolab.com:39267/nodejitsu_deeznutz_nodejitsudb2606280623');

// production env
// mongoose.connect(process.env.MONGO_PRODUCTIONDB);

global.server = express();

require('./config/middleware.js')(server);
require('./config/routes.js')(server);

server.listen(8080, function() {
  console.log('%s listening at 8080', server.name);
});

if(typeof module.exports !== 'undefined') {
  module.exports = {
    server: server,
    User: db.User,
    Message: db.Message
  };
}