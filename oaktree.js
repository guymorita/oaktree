exports.oaktree = function(){
  var restify = require('restify');
  var _ = require('underscore');
  var async = require('async');
  var db = require('./db-schema.js').mongodb();

  var mongoose = require('mongoose');
  mongoose.connect('mongodb://nodejitsu_deeznutz:ltsjl1gumo383aabbrkai8rsvp@ds027718.mongolab.com:27718/nodejitsu_deeznutz_nodejitsudb535751632');

  function _findAndPluck(array, field, match) {
    var i;
    for(i=0; i<array.length; i++) {
      if(array[i][field].toString() === match.toString()) {
        break;
      }
    }
    return array.splice(i, 1);
  }

  function _getSenderAndReceiver(sender_id, receiver_id, callback) {
    var query = {_id: {$in: [sender_id, receiver_id]}};

    db.User.find(query, function(err, collection){
      if(collection && collection.length === 2) {
        if(collection[0]._id.toString() === sender_id.toString()) {
          sender = collection[0];
          receiver = collection[1];
        } else {
          sender = collection[1];
          receiver = collection[0];
        }

        callback(sender, receiver);
      }
    });
  }

  function defaultResponse(req, res, next) {
    res.send('oaktree is ready.');
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

  var showMessages = function(req, res, next){
    db.Message.find({}, function(err, collection){
      res.send(collection);
    });
  };

  var newMessage = function(req, res, next){
    var stream = '';

    req.on('data', function(chunk){
      stream += chunk;
    });

    req.on('end', function(){
      var message = JSON.parse(stream);

      var receiver_ids = message.receiver_ids.slice();
      delete message['receiver_ids'];

        // called as a iterator for async.each below
      function saveMessage(receiver_id, callback) {
        message.receiver_id = receiver_id;

        var messagedb = new db.Message(message);
        messagedb.save(function(err, item){
          if(item) {
            console.log("message sent to receiver ", item);
            callback();
          }
        });
      }

      async.each(receiver_ids, saveMessage, function(err){
        if(err) {console.log(err);}
        console.log("all messages sent!");
        res.send("message sent");
      });
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
        senderObject = {},
        receiverObject = {};

    var query = {_id: {$in: [sender_id, receiver_id]}};

    _getSenderAndReceiver(sender_id, receiver_id, function(sender, receiver){
      var alreadyFriend = _.find(sender.friends, function(friend){
        return (friend._id.toString() === receiver_id.toString());
      });

      if(typeof alreadyFriend === 'undefined') {
        sender.friends.push({_id: receiver_id, status: 0, username: receiver.username});
        receiver.friends.push({_id: sender_id, status: 1, username: sender.username});

        senderObject.friends = sender.friends;
        receiverObject.friends = receiver.friends;

        db.User.update({_id:sender_id}, {$set: senderObject}, function(err, count) {
          if(count === 1){
            //console.log(sender.username +' has sent a friend request.');
            db.User.update({_id:receiver_id}, {$set: receiverObject}, function(err, count) {
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
      } else {
        if(alreadyFriend.status===1) {
          res.send(alreadyFriend.username +' is already pending a friendship request.');
        } else {
          res.send(alreadyFriend.username +' is already a friend.');
        }
      }
    });
  };

  var acceptFriend = function(req, res, next) {
    var sender_id = req.params.sender_id,
        receiver_id = req.params.receiver_id,
        senderObject = {},
        receiverObject = {};

    var query = {_id: {$in: [sender_id, receiver_id]}};

    _getSenderAndReceiver(sender_id, receiver_id, function(sender, receiver){

      var rFriend = _findAndPluck(sender.friends, '_id', receiver._id)[0];
      var sFriend = _findAndPluck(receiver.friends, '_id', sender._id)[0];

      rFriend.status = 2;
      sFriend.status = 2;

      sender.friends.push(rFriend);
      receiver.friends.push(sFriend);

      senderObject.friends = sender.friends;
      receiverObject.friends = receiver.friends;

      db.User.update({_id:sender_id}, {$set: senderObject}, function(err, count) {
        if(count === 1){
          db.User.update({_id:receiver_id}, {$set: receiverObject}, function(err, count) {
            if(count === 1) {
              res.status(201);
              res.send('Friendship made for '+ sender.username +' and '+ receiver.username);
            }
          });
        }
      });
    });
  };

  var listFriends = function(req, res, next){
    var query = {_id: req.params.user_id};

    db.User.findOne(query, function(err, item){
      console.log("Sending friends for "+ item.username);
      res.send(item.friends);
    });
  };

  // var optionsRequest = function(req, res, next){
  //   console.log('req body', req.body);
  // };

  var server = restify.createServer();
  server.use(restify.CORS());
  server.use(restify.fullResponse());
  //server.use(restify.bodyParser({mapParams:false}));

  server.get('/', defaultResponse);

  server.get('/user', listUsers);
  server.get('/user/new/:username/:password', newUser);
  server.get('/user/login/:username/:password', loginUser);

  server.post('/message', newMessage);
  server.opts(/\.*/, function (req, res, next) {
    console.log('req body', req.body);
    res.send(200);
    next();
  });
  server.get('/message/PRISM', showMessages);
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