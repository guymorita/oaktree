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
        receiver = {},
        senderFriends = {},
        receiverFriends = {};

    var query = {_id: {$in: [sender_id, receiver_id]}};

    db.User.find(query, function(err, collection){
      if(collection.length === 2) {
        if(collection[0]._id.toString() === sender_id.toString()) {
          sender = collection[0];
          receiver = collection[1];
        } else {
          sender = collection[1];
          receiver = collection[0];
        }

        sender.friends.push({_id: receiver_id, status: 0, username: receiver.username});
        receiver.friends.push({_id: sender_id, status: 1, username: sender.username});

        senderFriends.friends = sender.friends;
        receiverFriends.friends = receiver.friends;

        db.User.update({_id:sender_id}, {$set: senderFriends}, function(err, count) {
          if(count === 1){
            //console.log(sender.username +' has sent a friend request.');
            db.User.update({_id:receiver_id}, {$set: receiverFriends}, function(err, count) {
              if(count === 1) {
                //console.log(receiver.username +' has received a request.');
                console.log(sender.username +' has sent '+ receiver.username +' a friend request.');
                res.status(201);
                // sends the sender an updated friends list
                res.send(sender.friends);
              }
            });
          }
        });
      }
    });
  };

  var acceptFriend = function(req, res, next) {
    var sender_id = req.params.sender_id,
        receiver_id = req.params.receiver_id,
        sender = {},
        receiver = {},
        senderFriends = {},
        receiverFriends = {};

    var query = {_id: {$in: [sender_id, receiver_id]}};

    function findAndPluck(array, id) {
      console.log("array", array);
      var i;
      for(i=0; i<array.length; i++) {
        console.log("arr", array[i]._id);
        console.log("id", id);
        if(array[i]._id.toString() === id.toString()) {
          console.log("broke");
          break;
        }
      }
      return array.splice(i, 1);
    }

    db.User.find(query, function(err, collection){
      if(collection.length === 2) {
        if(collection[0]._id.toString() === sender_id.toString()) {
          sender = collection[0];
          receiver = collection[1];
        } else {
          sender = collection[1];
          receiver = collection[0];
        }

        var rFriend = findAndPluck(sender.friends, receiver._id)[0];
        var sFriend = findAndPluck(receiver.friends, sender._id)[0];

        rFriend.status = 2;
        sFriend.status = 2;

        sender.friends.push(rFriend);
        receiver.friends.push(sFriend);

        senderFriends.friends = sender.friends;
        receiverFriends.friends = receiver.friends;

        db.User.update({_id:sender_id}, {$set: senderFriends}, function(err, count) {
          if(count === 1){
            db.User.update({_id:receiver_id}, {$set: receiverFriends}, function(err, count) {
              if(count === 1) {
                res.status(201);
                res.send('Friendship made for '+ sender.username +' and '+ receiver.username);
              }
            });
          }
        });
      }
    });
  };

  var listFriends = function(req, res, next){
    var query = {_id: req.params.user_id};

    db.User.findOne(query, function(err, item){
      console.log("Sending friends for "+ item.username);
      res.send(item.friends);
    });
  };

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

  server.get('/friends/:user_id', listFriends);
  server.get('/friends/add/:sender_id/:receiver_id', addFriend);
  server.get('/friends/accept/:sender_id/:receiver_id', acceptFriend);

  server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
  });

  return {
    server: server,
    User: db.User,
    Message: db.Message
  };
};