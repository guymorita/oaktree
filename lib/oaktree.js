exports.oaktree = function() {
  var express = require('express');
  var mongoose = require('mongoose');
  var _ = require('underscore');
  var async = require('async');
  var db = require('./db-schema.js').mongodb();
  var azure = require('azure');
  var fs = require('fs');
  var Grid = mongoose.mongo.Grid;

  mongoose.connect('mongodb://localhost/squirrel');
  //mongoose.connect('nodejitsu:4854e223ab01979d863bc6fbfe8307da@paulo.mongohq.com:10071/nodejitsudb3191592064');

  var blobService = azure.createBlobService();

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

    db.User.find(query, function(err, collection) {
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

  function defaultResponse(req, res) {
    res.send('oaktree is ready.');
  }

  var listUsers = function(req, res) {
    db.User.find({}, function(err, collection) {
      res.send(collection);
    });
  };

  var newUser = function(req, res) {
    // create a user in the mongo db
    var code = req.params.username.substring(0,1) + '' + Math.floor(Math.random()*Date.now());

    var newbie = {
      username: req.params.username,
      password: req.params.password,
      confirm_code: code
    };
    var user = new db.User(newbie);
    user.save(function(err, item) {
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
        console.log("New user "+ item.username +" created");
        res.send(item);
      }
    });
  };

  var loginUser = function(req, res) {
    var visitor = {
      username: req.params.username,
      password: req.params.password
    };
    db.User.findOne(visitor, function(err, item) {
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

  var confirmUser = function(req, res) {

  };

  var retrieveAll = function(req, res) {
    retrieveMessages();
    retrieveContacts();
  };

  var showMessages = function(req, res) {
    db.Message.find({}, function(err, collection) {
      res.send(collection);
    });
  };

  var newMessage = function(req, res) {
    var stream = '';

    req.on('data', function(chunk) {
      stream += chunk;
    });

    req.on('end', function() {
      var message = JSON.parse(stream);

      var receiver_ids = message.receiver_ids.slice();
      delete message['receiver_ids'];

        // called as a iterator for async.each below
      function saveMessage(receiver_id, callback) {
        message.receiver_id = receiver_id;

        var messagedb = new db.Message(message);
        messagedb.save(function(err, item) {
          if(item) {
            console.log("message sent to receiver ", item);
            callback();
          }
        });
      }

      async.each(receiver_ids, saveMessage, function(err) {
        if(err) {console.log(err);}
        console.log("all messages sent!");
        res.send("message sent");
      });
    });
  };

  var newImage = function(req, res) {
    console.log("called new image");

    var newFile = fs.createWriteStream("./image.tmp");
    req.pipe(newFile);

    req.on('end', function() {
      newFile.end();
      console.log('streaming ended');
      console.log(newFile);

      blobService.createContainerIfNotExists("imagestore", {publicAccessLevel : 'container'}, function(error){
        if(!error){
          console.log("container created");

          blobService.createBlockBlobFromFile('imagestore', 'test1.jpg', './image.tmp', function(error){
              console.log("error", error);
              if(!error){
                console.log("file saved");
                res.send("blah");
              }
          });
        }
      });
    });
  };

  var getImage = function(req, res) {
    blobService.getBlobToStream('imagestore', 'test1.jpg', res, function(error){
        if(!error){
          console.log('wrote to response');
        }
    });
  };

  var retrieveMessages = function(req, res) {
    var val = {
      receiver_id: req.params.user_id,
      cleared: false
    };
    db.Message.find(val, function(err, item) {
      if(item) {
        res.send(item);
        console.log("Retrieving messages for "+ val.receiver_id);
      }
    });
  };

  var readMessages = function(req, res) {
    var query = { _id: req.params.message_id };
    db.Message.findOne(query, function(err, item) {
      if(item.status === 0) {
        db.Message.update(query, {$set: {status: 1}}, function(err, count) {
          if(count === 1) {
            res.status(201);
            console.log("Message sent and marked as read.");
            res.send(item);
          }
        });
      } else {
        res.status(401);
        res.send("Message has already been read.");
      }
    });
  };

  var addFriend = function(req, res) {
    var sender_id = req.params.sender_id,
        receiver_id = req.params.receiver_id,
        senderObject = {},
        receiverObject = {};

    var query = {_id: {$in: [sender_id, receiver_id]}};

    _getSenderAndReceiver(sender_id, receiver_id, function(sender, receiver) {
      var alreadyFriend = _.find(sender.friends, function(friend) {
        return (friend._id.toString() === receiver_id.toString());
      });

      if(typeof alreadyFriend === 'undefined') {
        sender.friends.push({_id: receiver_id, status: 0, username: receiver.username});
        receiver.friends.push({_id: sender_id, status: 1, username: sender.username});

        senderObject.friends = sender.friends;
        receiverObject.friends = receiver.friends;

        db.User.update({_id:sender_id}, {$set: senderObject}, function(err, count) {
          if(count === 1) {
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

  var acceptFriend = function(req, res) {
    var sender_id = req.params.sender_id,
        receiver_id = req.params.receiver_id,
        senderObject = {},
        receiverObject = {};

    var query = {_id: {$in: [sender_id, receiver_id]}};

    _getSenderAndReceiver(sender_id, receiver_id, function(sender, receiver) {

      var rFriend = _findAndPluck(sender.friends, '_id', receiver._id)[0];
      var sFriend = _findAndPluck(receiver.friends, '_id', sender._id)[0];

      rFriend.status = 2;
      sFriend.status = 2;

      sender.friends.push(rFriend);
      receiver.friends.push(sFriend);

      senderObject.friends = sender.friends;
      receiverObject.friends = receiver.friends;

      db.User.update({_id:sender_id}, {$set: senderObject}, function(err, count) {
        if(count === 1) {
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

  var listFriends = function(req, res) {
    var query = {_id: req.params.user_id};
    db.User.findOne(query, function(err, item) {
      console.log("Sending friends for "+ item.username);
      res.send(item.friends);
    });
  };

  var server = express();

  var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Accept, Origin, Referer, User-Agent, Content-Type, Authorization');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.send(200);
    }
    else {
      next();
    }
  };

  server.configure(function() {
    server.use(allowCrossDomain);
    server.use(server.router);
  });

  server.get('/', defaultResponse);

  server.get('/user', listUsers);
  server.get('/user/new/:username/:password', newUser);
  server.get('/user/login/:username/:password', loginUser);

  server.post('/message', newMessage);
  server.get('/message/PRISM', showMessages);
  server.get('/message/retrieve/:user_id', retrieveMessages);
  server.get('/message/read/:message_id', readMessages);

  server.post('/image', newImage);
  server.get('/getimage', getImage);

  server.get('/friends/:user_id', listFriends);
  server.get('/friends/add/:sender_id/:receiver_id', addFriend);
  server.get('/friends/accept/:sender_id/:receiver_id', acceptFriend);

  server.listen(8080, function() {
    console.log('%s listening at 8080', server.name);
  });

  return {
    server: server,
    User: db.User,
    Message: db.Message
  };
};