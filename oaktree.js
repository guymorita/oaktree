exports.oaktree = function(){
  var restify = require('restify');
  var db = require('./db-schema.js').mongodb();

  var mongoose = require('mongoose');
  mongoose.connect('mongodb://localhost/squirrel');

  function defaultResponse(req, res, next) {
    res.send('oaktree is ready for squirrel');
  }

  var newUser = function(req, res, next){
    // create a user in the mongo db
    var code = req.params.name.substring(0,1) + '' + Math.floor(Math.random()*Date.now());

    var newbie = {
      name: req.params.name,
      password: req.params.password,
      confirm_code: code
    };
    var user = new db.User(newbie);
    user.save(function(err, item){
      if(err) {
        if(err.code === 11000) {
          res.status(400);
          res.send('Duplicate username.');
        } else {
          res.send(err);
        }
      } else if(item) {
        console.log('user saved');
        res.status(201);
        item['password'] = undefined;
        res.send(item);
        console.log("New user "+ req.params.name +" created");
      }
    });
  };

  var loginUser = function(req, res, next){
    var visitor = {
      name: req.params.name,
      password: req.params.password
    };
    db.User.findOne(visitor, function(err, item){
      if(err) {
        res.send(err);
      } else {
        var obj;
        if(item) {
          obj = item;
          obj['password'] = undefined;
          res.header('content-type', 'application/json');
          res.status(200);
        } else {
          obj = 'Invalid username/password combination.';
          res.status(401);
        }
        res.send(obj);
      }
    });
  };

  var confirmUser = function(req, res, next){

  };

  var retrieveAll = function(req, res, next) {
    retrieveMessages();
    retrieveContacts();
  };

  var newMessage = function(req, res, next){
    var val = {
      sender_id: req.params.sender_id,
      receiver_id: req.params.receiver_id,
      message_body: req.params.message_body
    };
    var message = new db.Message(val);
    message.save(function(err, item){
      if(item){
        res.status(201);
        res.send(item);
        console.log("Message sent from "+ val.sender_id +" to "+ val.receiver_id);
      }
    });
  };

  var retrieveMessages = function(req, res, next){
    var val = {
      receiver_id: req.params.user_id,
      cleared: false
    };
    db.Message.find(val, function(err, item){
      if(item){
        res.status(201);
        res.send(item);
        console.log("Retrieving messages for "+ val.receiver_id);
      }
    });
  };

  var readMessages = function(req, res, next) {
    var val = { _id: req.params.message_id };
    db.Message.update(val, {$set: {status: 1}}, function(err, count, third) {
      if(count === 1) {
        res.status(201);
        res.send("Message read.");
      }
    });
  };

  var server = restify.createServer();
  server.use(restify.CORS());
  server.use(restify.fullResponse());

  server.get('/', defaultResponse);

  server.get('/user/new/:name/:password', newUser);
  server.get('/user/login/:name/:password', loginUser);

  server.get('/message/send/:sender_id/:receiver_id/:message_body', newMessage);
  server.get('/message/retrieve/:user_id', retrieveMessages);
  server.get('/message/read/:message_id', readMessages);
  server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
  });

  return {
    server: server,
    User: db.User,
    Message: db.Message
  };
};