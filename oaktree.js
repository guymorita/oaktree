exports.oaktree = function(){
  var restify = require('restify');
  var db = require('./db-schema.js').mongodb();

  var mongoose = require('mongoose');
  mongoose.connect('mongodb://localhost/squirrel');

  function defaultResponse(req, res, next) {
    res.send('oaktree is ready for squirrel');
  }

  var listUsers = function(req, res, next){
    db.User.find({}, function(err, collection){
      res.send(collection);
    });
  };

  var newUser = function(req, res, next){
    // create a user in the mongo db
    var code = req.params.username.substring(0,1) + '' + Math.floor(Math.random()*Date.now());

    var newbie = {
      username: req.params.username,
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
        res.status(201);
        item['password'] = undefined;
        res.send(item);
        console.log("New user "+ req.params.username +" created");
      }
    });
  };

  var loginUser = function(req, res, next){
    var visitor = {
      username: req.params.username,
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

  var addFriend = function(req, res, next) {
    var sender_id = req.params.sender_id,
        receiver_id = req.params.receiver_id,
        sender = {},
        receiver = {};

    var query = {_id: {$in: [sender_id, receiver_id]}};

    db.User.find(query, function(err, items){
      console.log(items);
      if(items.length === 2) {
        if(items[0]._id === sender) {
          sender.friends = items[0].friends;
          receiver.friends = items[1].friends;
        } else {
          sender.friends = items[1].friends;
          receiver.friends = items[0].friends;
        }
        sender.friends.push({_id: receiver_id, status: 0});
        receiver.friends.push({_id: sender_id, status: 1});

        db.User.update({_id:sender_id}, {$set: sender}, function(err, count) {
          if(count === 1){
            console.log("Friend request sent for "+ sender_id);
            db.User.update({_id:receiver_id}, {$set: receiver}, function(err, count) {
              if(count === 1) {
                console.log("Friend request received for "+ receiver_id);

                db.User.find({}, function(err, collection){
                  console.log("users in db", collection);
                });
              }
            });
          }
        });
      }
    });
  };

  var listFriends = function(){};

  var server = restify.createServer();
  server.use(restify.CORS());
  server.use(restify.fullResponse());

  server.get('/', defaultResponse);

  server.get('/user', listUsers);
  server.get('/user/new/:username/:password', newUser);
  server.get('/user/login/:name/:password', loginUser);

  server.get('/message/send/:sender_id/:receiver_id/:message_body', newMessage);
  server.get('/message/retrieve/:user_id', retrieveMessages);
  server.get('/message/read/:message_id', readMessages);

  server.get('/friends', listFriends);
  server.get('/friends/add/:sender_id/:receiver_id', addFriend);

  server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
  });

  return {
    server: server,
    User: db.User,
    Message: db.Message
  };
};