exports.oaktree = function() {
  var express = require('express');
  var mongoose = require('mongoose');
  var _ = require('underscore');
  var async = require('async');
  var db = require('./db-schema.js').mongodb();
  var azure = require('azure');
  var fs = require('fs');
  var http = require('http');
  var apn = require('apn');
  var url = require('url');
  var ObjectId = mongoose.mongo.ObjectID;

  //mongoose.connect('mongodb://localhost/squirrel');
  mongoose.connect('mongodb://nodejitsu:fc00bd5ee1b39c25b03a005f518d8192@paulo.mongohq.com:10001/nodejitsudb6474200130');

  var blobService = azure.createBlobService();

    // adds and object to an array and returns a sorted array by a key (string)
  function _addAndSort(obj, arr, key) {
    arr.push(obj);
    return _.sortBy(arr, function(element) {
      return element[key];
    });
  }


  function _findAndPluck(array, field, match) {
    var i;
    for(i=0; i<array.length; i++) {
      if(array[i][field].toString() === match.toString()) {
        break;
      }
    }
    return array.splice(i, 1);
  }

  function _findSenderReceiver(sender_id, receiver_id, callback) {
    if(sender_id) { sender_id = sender_id.toString(); }
    if(receiver_id) { receiver_id = receiver_id.toString(); }
    if(sender_id === receiver_id) {
      callback("The sender and the receiver are the same.");
      return;
    }

    var query = {_id: {$in: [sender_id, receiver_id]}};

    db.User.find(query, function(err, collection) {
      if(err) { console.log('Finding sender/receiver error:', err); }
      if(collection && collection.length === 2) {
        if(collection[0]._id.toString() === sender_id.toString()) {
          sender = collection[0];
          receiver = collection[1];
        } else {
          sender = collection[1];
          receiver = collection[0];
        }
        callback(sender, receiver);
      } else if(collection && collection.length === 1) {
        if(collection[0]._id.toString() === sender_id.toString()) {
          callback("Only the sender was found");
        } else {
          callback("Only the receiver was found");
        }
      } else {
        callback("No users were found with the user IDs: "+ sender_id +', '+ receiver_id);
      }
      return;
    });
  }

  function _updateSenderReceiver(sender_id, senderObj, receiver_id, receiverObj, callback) {
    if(sender_id) { sender_id = sender_id.toString(); }
    if(receiver_id) { receiver_id = receiver_id.toString(); }
    if(sender_id === receiver_id) {
      callback("The sender and the receiver are the same.");
      return;
    }

    db.User.update({_id:sender_id}, {$set: senderObj}, function(err, count) {
      if(err) { console.log('Sender update error:', err); }
      if(count === 1) {
        console.log('Updated sender '+ sender_id + ' successfully.');
        if(typeof receiver_id !== 'undefined') {
          db.User.update({_id:receiver_id}, {$set: receiverObj}, function(err, count) {
            if(err) { console.log('Receiver update error:', err); }
            if(count === 1) {
              console.log('Updated receiver '+ receiver_id + ' successfully.');
              callback();
            }
          });
        } else {
          callback();
        }
      }
    });
  }

  Array.prototype.reverse = function(){
    if(Array.isArray(this)) {
      var swap, len = this.length;
      for(var i=0; i<Math.floor(len/2); i++){
        swap = this[i];
        this[i] = this[len-1-i];
        this[len-1-i] = swap;
      }
      return this;
    } else {
      console.log("Not an array.");
    }
  };

  function _sortMessages(messages) {
    _.sortBy(messages, function(msg){
      return msg.date;
    });
    return messages.reverse();
  }


  function defaultResponse(req, res) {
    res.send('oaktree is ready.');
  }

  var firePush = function(token, body, sender){
    sender = sender || "Hatch";
    var device = new apn.Device(token);
    var note = new apn.Notification();
    note.badge = 1;
    note.sound  ='notification-beep.wav';
    note.alert = {'body': body};
    note.payload = {'messageFrom': sender};

    note.device = device;

    var cb = function(err, notification){
      console.log('Error is ', err);
      console.log('notification', notification);
    };

    var options = {
      gateway: 'gateway.sandbox.push.apple.com',
      errorCallback: cb,
      cert: './hatchcert.pem',
      key: './hatchkey.pem',
      passphrase: 'squirrelEgg5',
      port: 2195,
      enhanced: true,
      cacheLength: 100
    };
    // console.log('firepush options', options);
    // console.log('firepush notes', note);
    console.log('Firing push '+ body +' from '+ sender +' to '+ token);
    var apnsConnection = new apn.Connection(options);
    apnsConnection.sendNotification(note);
  };

  var listUsers = function(req, res) {
    db.User.find({}, function(err, collection) {
      res.send(collection);
    });
  };

  var newUser = function(req, res) {
    var code = req.params.username.substring(0,1) + '' + Math.floor(Math.random()*Date.now());

    var newUserObj = {
      username: req.params.username,
      password: req.params.password,
      confirm_code: code
    };
    var user = new db.User(newUserObj);
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
        res.send(JSON.stringify(obj));
      }
    });
  };

  var setUserToken = function(req, res) {
    var user_id = req.params.user_id;
    var tokenProperty = { deviceToken: req.params.deviceToken };

    db.User.update({_id:user_id}, {$set: tokenProperty }, function(err, count) {
      if(err) { res.send(err); }
      if(count === 1) {
        console.log("Updated token for "+ user_id);
        res.status(201);
        res.send("Token updated.");
      } else {
        console.log("Token was not updated for "+ user_id);
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
    var message = req.body;

    var receiver_ids = message.receiver_ids.slice();
    delete message['receiver_ids'];

    var sentMessages = [];

      // called as a iterator for async.each below
    function saveMessage(receiver_id, callback) {
      message.receiver_id = receiver_id;

      var messagedb = new db.Message(message);
      messagedb.save(function(err, item) {
        if(err) { console.log("saveMessage db.save error", err); }
        if(item) {
          db.User.findOne({_id: receiver_id}, function(err, receiver){
            if (err){console.log('Finding receiver ID error', receiver_id);}
            if (receiver){
              if (receiver.deviceToken){
                // console.log('Message sent push notification for '+ receiver.username +' ('+ receiver.deviceToken +')');
                firePush(receiver.deviceToken, message.title, message.sender_name);
              }
            }
          });
          sentMessages.push(item);
          callback();
        }
      });
    }

    async.each(receiver_ids, saveMessage, function(err) {
      if(err) {console.log("Async.each message send error", err);}
      console.log("All messages sent for", (message.sender_name) ? message.sender_name : message.sender_id);
      res.send(JSON.stringify(sentMessages));
    });
  };

  var newImage = function(req, res) {
    var fileId = new ObjectId();
    var filename = fileId +'.jpg';
    var filepath = './'+ filename;

    var newFile = fs.createWriteStream(filepath);
    req.pipe(newFile);

    req.on('end', function() {
      newFile.end();

      blobService.createContainerIfNotExists("imagestore", {publicAccessLevel : 'container'}, function(error){
          if(!error){
            blobService.createBlockBlobFromFile('imagestore', filename, filepath, function(err){
                if(err) {
                  console.log("Blob write error:", err);
                } else {
                  console.log(filename +' writen to Azure.');
                  res.send('http://squirreleggs.blob.core.windows.net/imagestore/'+ filename);
                  fs.unlink(filepath, function(){
                    console.log('Local temp copy of '+ filename +' deleted.');
                  });
                }
            });
          } else {
            console.log("Container creation error", error);
          }
      });
    });
  };

  function _saveOnBlob(containername, blobname, localpath, callback) {
    if(typeof containername === 'string' && typeof blobname === 'string' && typeof localpath ==='string') {
      blobname = blobname.toString();
      var blobpath = 'http://squirreleggs.blob.core.windows.net/'+ containername.toString() +'/'+ blobname;

      blobService.createBlockBlobFromFile(containername, blobname, localpath, function(err){
          if(err) {
            console.log("Blob write error:", err);
          } else {
            console.log('Written to Azure as '+ blobname);
            callback(blobpath);
          }
      });
    } else {
      return 'Invalid parameters.';
    }
  }

  function updateMessage(msg_id, updateObj, callback) {
    if(msg_id && updateObj) {
      var query = { _id: msg_id.toString() };
      db.Message.update(query, {$set: updateObj}, function(err, count) {
        if(err) { console.log("Message update error:", err); }
        if(count === 1) {
          console.log('Message '+ msg_id +' updated with properties: '+ Object.keys(updateObj));
          if(callback) { callback(); }
         } else {
          console.log('Failed to update message '+ msg_id);
        }
      });
    }
  }

  var newImageTest = function(req, res) {
    console.log("image test function called");

    console.log("req query", req.query);

    var message_ids = [];

    if(typeof req.query !== 'undefined') {
      for(var key in req.query) {
        var msg = req.query[key];
        if(msg.length>25) {
          message_ids.push(msg.substr(1,24));
        } else if(msg.length === 24) {
          message_ids.push(msg);
        }
      }
    }

    if(message_ids.length > 0) {
      if(typeof req.files === 'undefined' || typeof req.files.photo === 'undefined') {

        var regex = /^data:.+\/(.+);base64,(.*)$/;
        var datBase64 = req.body.photo.match(regex);

        var origExt = datBase64[1];
        var tempId = new ObjectId();
        var tempFile = tempId.toString +'.'+ origExt;
        var tempPath = './tmp/'+ tempFile;

        var containername = 'imagestore2';

        var b = fs.writeFile(tempPath, new Buffer(datBase64[2], "base64"), 'binary', function(err){
          if(err) {
            console.log('Writing temp file '+ tempPath +' error:'+ err);
          } else {
            blobService.createContainerIfNotExists(containername, {publicAccessLevel : 'container'}, function(error){
                if(!error){
                  console.log('Azure container "'+ containername + '" created.');
                  async.each(message_ids, function(message_id, hollerIfYaHearMe) {
                      var bname = message_id + '.' + origExt;
                      _saveOnBlob(containername, bname, tempPath, function(picpath) {
                        updateMessage(message_id, {pic_url: picpath}, function() {
                          hollerIfYaHearMe();
                        });
                      });
                    }, function(err) {
                      if(err) {console.log("Async.each message update error", err);}
                      console.log("Photo URLs added to messages: ", message_ids);
                      fs.unlink(tempPath, function(){
                        console.log('Temp image "'+ tempPath +'" deleted.');
                      });
                      res.status(201);
                      res.send("Images attached to messages.");
                  });
                } else {
                  console.log("Container creation error", error);
                }
            });
          }
        });
      }
    }
  };

  var getImage = function(req, res) {
    var imagename = req.params.imagename;
    blobService.getBlobToStream('imagestore', imagename, res, function(error){
        if(error) {
          console.log('Get image error', error);
        } else {
          console.log('Streaming '+ imagename + ' from Azure to user.');
        }
    });
  };

  var showImagePath = function(req, res) {
    var imagename = req.params.imagename;
    res.send('http://squirreleggs.blob.core.windows.net/imagestore/'+ imagename);
  };

  var retrieveMessages = function(req, res) {
    var user_id = req.params.user_id;
    var allMessages = {};
    var query = {
      receiver_id: user_id,
      cleared: false
    };
    db.Message.find(query, function(err, incoming) {
      if(err) { console.log('Retrieving inbox error for '+ user_id +':'+ err); }
      if(incoming) {
        allMessages.inbox = sortMessages(incoming.slice());

        var query = {
          sender_id: user_id,
          cleared: false
        };
        db.Message.find(query, function(err, outgoing) {
          if(err) { console.log('Retrieving outbox error for '+ user_id +':'+ err); }
          if(outgoing) {
            allMessages.outbox = sortMessages(outgoing.slice());
            res.send(allMessages);
          }
        });
      }
    });
  };

  var readMessages = function(req, res) {
    var query = { _id: req.params.message_id };
    db.Message.findOne(query, function(err, msg) {
      if(err) { console.log("Retrieving message from db error", err); }
      if(msg.status === 0) {
        db.Message.update(query, {$set: {status: 1}}, function(err, count) {
          if(count === 1) {
            console.log("Message sent and marked as read.");

            _findSenderReceiver(msg.sender_id, msg.receiver_id, function(sender, receiver) {
              if(sender.deviceToken) {
                console.log('Firing push to '+ sender.username +' about '+ receiver.username +' reading message '+ query._id);
                firePush(sender.deviceToken, receiver.username + ' has read your message!', receiver.username);
                res.status(201);
                res.send(msg);
              }
            });
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
        senderObj = {},
        receiverObj = {};

    var query = {_id: {$in: [sender_id, receiver_id]}};

    _findSenderReceiver(sender_id, receiver_id, function(sender, receiver) {
      if(typeof sender === 'string') {
        console.log(sender);
        res.send(sender);
      } else {
        var existingFriend = _.find(sender.friends, function(friend) {
          return (friend._id.toString() === receiver_id.toString());
        });

        if(typeof existingFriend === 'undefined') {
          senderObj.friends = _addAndSort({_id: receiver_id, status: 0, username: receiver.username}, sender.friends, 'username');
          receiverObj.friends = _addAndSort({_id: sender_id, status: 1, username: sender.username}, receiver.friends, 'username');

          _updateSenderReceiver(sender_id, senderObj, receiver_id, receiverObj, function(){
            if(receiver.deviceToken) {
              firePush(receiver.deviceToken, sender.username + ' wants to be friends!', sender.username);
            }
            console.log(sender.username +' has sent '+ receiver.username +' a friend request.');
            res.status(201);
            res.send(sender.friends);     // sends the sender an updated friends list
          });
        } else {
          var fakeReq = { params: {} };
          switch(parseInt(existingFriend.status, 10)) {
            case -2:
              fakeReq.params.sender_id = receiver_id;
              fakeReq.params.receiver_id = sender_id;
              console.log(sender.username +'('+ sender_id +') has friended previously denied '+ receiver.username);
              acceptFriend(fakeReq, res);
              break;
            case -1:
              res.send('Why are you so creepy?');
              break;
            case 0:
              res.send('You have already sent a friend request to '+ existingFriend.username);
              break;
            case 1:
              fakeReq.params.sender_id = receiver_id;
              fakeReq.params.receiver_id = sender_id;
              acceptFriend(fakeReq, res);
              break;
            default:
              res.send('You are already friends with '+ existingFriend.username);
              break;
          }
        }
      }
    });
  };

  var acceptFriend = function(req, res) {
    var sender_id = req.params.sender_id,
        receiver_id = req.params.receiver_id,
        senderObj = {},
        receiverObj = {};

    _findSenderReceiver(sender_id, receiver_id, function(sender, receiver) {
      var friendInSender = _findAndPluck(sender.friends, '_id', receiver._id)[0];
      var friendinReceiver = _findAndPluck(receiver.friends, '_id', sender._id)[0];

      friendInSender.status = 2;
      friendinReceiver.status = 2;

      senderObj.friends = _addAndSort(friendInSender, sender.friends, 'username');
      receiverObj.friends = _addAndSort(friendinReceiver, receiver.friends, 'username');

      _updateSenderReceiver(sender_id, senderObj, receiver_id, receiverObj, function(){
        if(sender.deviceToken) {
          firePush(sender.deviceToken, receiver.username + ' is now your friend!', receiver.username);
        }
        res.status(201);
        res.send(receiver.friends);
      });
    });
  };

  var denyFriend = function(req, res) {
    var sender_id = req.params.sender_id,
        receiver_id = req.params.receiver_id,
        senderObj = {},
        receiverObj = {};

    _findSenderReceiver(sender_id, receiver_id, function(sender, receiver) {
      var friendInSender = _findAndPluck(sender.friends, '_id', receiver._id)[0];
      var friendinReceiver = _findAndPluck(receiver.friends, '_id', sender._id)[0];

      friendInSender.status = -1;
      friendinReceiver.status = -2;

      senderObj.friends = _addAndSort(friendInSender, sender.friends, 'username');
      receiverObj.friends = _addAndSort(friendinReceiver, receiver.friends, 'username');

      _updateSenderReceiver(sender_id, senderObj, receiver_id, receiverObj, function(){
        res.status(201);
        res.send(receiver.friends);
      });
    });
  };

  var listFriends = function(req, res) {
    var query = {_id: req.params.user_id};
    db.User.findOne(query, function(err, item) {
      console.log("Sending friends for "+ item.username +' ('+ item._id +')');
      res.send(item.friends);
    });
  };

  var server = express();

  var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST');
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
    server.use(express.limit('8mb'));
    server.use(express.bodyParser({ keepExtensions: true, uploadDir: './tmp' }));
    server.use(server.router);
  });

  server.get('/', defaultResponse);

  server.get('/user', listUsers);
  server.get('/user/new/:username/:password', newUser);
  server.get('/user/login/:username/:password', loginUser);
  server.get('/user/token/:user_id/:deviceToken', setUserToken);

  server.post('/message', newMessage);
  server.get('/message/PRISM', showMessages);
  server.get('/message/retrieve/:user_id', retrieveMessages);
  server.get('/message/read/:message_id', readMessages);

  server.post('/image', newImage);
  server.post('/imagetest', newImageTest);
  server.get('/image/:imagename', showImagePath);
  server.get('/getImage/:imagename', getImage);

  server.get('/friends/:user_id', listFriends);
  server.get('/friends/add/:sender_id/:receiver_id', addFriend);
  server.get('/friends/accept/:sender_id/:receiver_id', acceptFriend);
  server.get('/friends/deny/:sender_id/:receiver_id', denyFriend);

  server.listen(8080, function() {
    console.log('%s listening at 8080', server.name);
  });

  return {
    server: server,
    User: db.User,
    Message: db.Message
  };
};