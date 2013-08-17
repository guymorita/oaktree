exports.oaktree = function(){
  var restify = require('restify');
  var db = require('./db-schema.js').mongodb();

  var mongoose = require('mongoose');
  mongoose.connect('mongodb://localhost/squirrel');

  function respond(req, res, next) {
    res.send('hello ' + req.params.name + req.params.password);
  }

  var newUser = function(req, res, next){
    var newbie = {
      name: req.params.name,
      password: req.params.password
    };
    var user = new db.User(newbie);
    user.save(function(){
      res.send('saved');
    });
    // create a user in the mongo db
  };

  var loginUser = function(req, res, next){

  };

  var confirmUser = function(req, res, next){

  };

  var retrieveAll = function(req, res, next) {
    retrieveMessages();
    retrieveContacts();
  };

  var retrieveMessages = function(req, res, next){

  };

  var readMessages = function(req, res, next) {

  };




  var server = restify.createServer();
  server.get('/user/new/:name/:password', newUser);
  server.get('/user/login/:name/:password', respond);
  server.get('/user/confirm/:name/:password', retrieveAll);

  server.post('/messages/send/:user_id', respond);
  server.get('/messages/retrieve/:user_id', respond);
  server.get('/messages/read/:user_id/:message_id', respond);
  // server.head('/hello/:name', respond);

  server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
  });

  return {
    server: server,
    User: db.User
  };
};