global.express = require('express');
global.mongoose = require('mongoose');
global._ = require('underscore');
global.async = require('async');
global.azure = require('azure');
global.fs = require('fs');
global.http = require('http');
global.apn = require('apn');
global.url = require('url');
global.ObjectId = mongoose.mongo.ObjectID;
global.pass = require('pwd');
global.md5 = require('MD5');     // md5 hash used to create random confirmation codes

global.db = require('./config/db-schema.js').mongodb();
// local env
// mongoose.connect('mongodb://localhost/squirrel');

// staging env
// mongoose.connect(process.env.MONGO_STAGINGDB);
mongoose.connect('mongodb://nodejitsu_deeznutz:kds001m9bp2c43edpfh5kfm6e5@ds039267.mongolab.com:39267/nodejitsu_deeznutz_nodejitsudb2606280623');

// production env
// mongoose.connect(process.env.MONGO_PRODUCTIONDB);

// var blobService = azure.createBlobService();
global.blobService = azure.createBlobService('squirreleggs','87vFqzuCuRlgVQrfpub/4V5R38tQX/57TA9GrcJFUhVp1tMANbDYsq4KTlUHvJ6P3Ui6HZub+05m+nSk9ZAJ7Q==');

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