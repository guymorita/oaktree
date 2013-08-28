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
  var pass = require('pwd');
  var md5 = require('MD5');     // md5 hash used to create random confirmation codes

  // local env
  // mongoose.connect('mongodb://localhost/squirrel');

  // staging env
  // mongoose.connect(process.env.MONGO_STAGINGDB);
  mongoose.connect('mongodb://nodejitsu_deeznutz:147iso2dksto8gbbq9klpk7i75@ds039267.mongolab.com:39267/nodejitsu_deeznutz_nodejitsudb2687562622');

  // production env
  // mongoose.connect(process.env.MONGO_PRODUCTIONDB);


  // var blobService = azure.createBlobService();
  var blobService = azure.createBlobService('squirreleggs','87vFqzuCuRlgVQrfpub/4V5R38tQX/57TA9GrcJFUhVp1tMANbDYsq4KTlUHvJ6P3Ui6HZub+05m+nSk9ZAJ7Q==');
    // adds an object to an array and returns a sorted array by a key (string)
  function _addAndSort(obj, arr, key) {
    arr.push(obj);
    return _.sortBy(arr, function(element) {
      return element[key];
    });
  }

    // goes through an array of objects, searchs object by the key "field" for match, and removes the first match
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
      callback('The sender and the receiver are the same.');
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
          callback('Only the sender was found');
        } else {
          callback('Only the receiver was found');
        }
      } else {
        callback('No users were found with the user IDs: '+ sender_id +', '+ receiver_id);
      }
      return;
    });
  }

  function _updateSenderReceiver(sender_id, senderObj, receiver_id, receiverObj, callback) {
    if(sender_id) { sender_id = sender_id.toString(); }
    if(receiver_id) { receiver_id = receiver_id.toString(); }
    if(sender_id === receiver_id) {
      callback('The sender and the receiver are the same.');
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
    console.log('Firing push '+ body +' from '+ sender +' to device: '+ token);
    var apnsConnection = new apn.Connection(options);
    apnsConnection.sendNotification(note);
  };

  // lists all users
  var listUsers = function(req, res) {
    db.User.find({}, function(err, users) {
      var allUsers = [];
      for(var i=0; i<users.length; i++) {
        var user = users[i];
        user.password = undefined;
        user.salt = undefined;
        user.deviceToken = undefined;
        //user.friends = undefined;      // for debugging, show a user's friends, but eventually take out
        allUsers.push(user);
      }
      res.send(200, allUsers);
    });
  };

  var newUser = function(req, res) {
    var uname = (req.params.username).toLowerCase();
    var upass = req.params.password;
    var code = md5(Math.floor(Math.random()*Date.now()).toString()).substring(0,6);     // for sms confirmation
    var uphone = req.params.phone || 5555555555;

    var newUserObj = {
      username: uname,
      confirm_code: code,
      phone: uphone
    };

    pass.hash(upass, function(err, salt, hash){
      if(err) {
        console.log('Hashing password error:', err);
        res.send(500, 'User not created, please try again.');
      } else {
        newUserObj.salt = salt;
        newUserObj.password = hash;

        var user = new db.User(newUserObj);
        user.save(function(err, newUser) {
          if(err) {
            if(err.code === 11000) {
              res.send(400, 'Username already exists, please choose another name.');
            } else {
              console.log("New user creation error:", err);
              res.send(500, 'User not created, please try again.');
            }
          } else if(newUser) {
            newUser.password = undefined;
            newUser.salt = undefined;
            console.log('New user '+ newUser.username +' created.');
            forceFriend(newUser);   // to auto-friend to founders
            res.send(201, newUser);
          } else {
            console.log('User creation error for:', newUserObj.uname);
            res.send(500, 'User not created, please try again.');
          }
        });
      }
    });
  };

  var loginUser = function(req, res) {

    var uname = (req.params.username).toLowerCase();
    var upass = req.params.password;

    var visitorObj = {
      username: uname
    };

    db.User.findOne(visitorObj, function(err, user) {
      if(err) {
        console.log('Login flow could not find user error:', err);
        res.send(500, 'Could not log in, please try again.');
      } else if(user) {
          pass.hash(upass, user.salt, function(err, hash) {
            if(hash.toString() === (user.password).toString()) {
              visitorObj = user;
              visitorObj.password = undefined;
              visitorObj.salt = undefined;
              visitorObj.confirm_code = undefined;

              res.header('content-type', 'application/json');
              res.send(200, visitorObj);
            } else {
              console.log("Invalid login error: "+ user.username +' ('+ user._id +')');
              res.send(401, 'Invalid username/password combination.');
            }
          });
      } else {
        console.log('User not found: '+ visitorObj.username);
        res.send(401, 'Invalid username/password combination.');    // this is vague on purpose for security
      }
    });
  };

  var setUserToken = function(req, res) {
    var user_id = req.params.user_id;
    var tokenProperty = { deviceToken: req.params.deviceToken };

    db.User.update({_id:user_id}, {$set: tokenProperty }, function(err, count) {
      if(err) {
        console.log('Token update db error:', err);
        res.send(500, 'Could not update token, please try again.');
      } else if(count === 1) {
        console.log('Updated token for user '+ user_id);
        res.send(201, 'Token updated.');
      } else {
        console.log('Supplied user_id ('+ user_id +') does not exist.');
        res.send(400, 'Could not update token, please try again.');
      }
    });
  };

  var confirmUser = function(req, res) {

  };

  var retrieveAll = function(req, res) {
    retrieveMessages();
    retrieveContacts();
  };

    // we need to take this out eventually.. used for PRISM right now
  var showMessages = function(req, res) {
    db.Message.find({}, function(err, collection) {
      res.send(collection);
    });
  };

  var newMessage = function(req, res) {
    var message = req.body;

    var receiver_ids = message.receiver_ids.slice();
    delete message.receiver_ids;

    var sentMessages = [];

      // called as a iterator for async.each below, took out to avoid callback ugliness
    function saveMessage(receiver_id, callback) {
      message.receiver_id = receiver_id;

      var messagedb = new db.Message(message);
      messagedb.save(function(err, item) {
        if(err) {
          console.log('saveMessage db.save error:', err);
          res.send(500, 'Messages were not successfully sent, please try again.');
        } else if(item) {
            // not critical -- fires a push notification to each recipient
          db.User.findOne({_id: receiver_id}, function(err, receiver){
            if (err) { console.log('Finding receiver ID error', receiver_id); }
            if (receiver && receiver.deviceToken) {
                // console.log('Message sent push notification for '+ receiver.username +' ('+ receiver.deviceToken +')');
                firePush(receiver.deviceToken, message.title, message.sender_name);
            }
          });
          sentMessages.push(item);
          callback();
        } else {
          console.log('Other saveMessage error.. dunno.');
          res.send(500, 'Messages were not successfully sent, please try again.');
        }
      });
    }

    async.each(receiver_ids, saveMessage, function(err) {
      if(err) {
        console.log('Async.each message send error:', err);
        res.send(500, 'Messages were not successfully sent, please try again.');
      }
      console.log("All messages sent for", (message.sender_name) ? message.sender_name : message.sender_id);
      if(res) { res.send(201, JSON.stringify(sentMessages)); }
    });
  };

    // used for image posting
  function _saveOnBlob(containername, blobname, localpath, callback) {
    if(typeof containername === 'string' && typeof blobname === 'string' && typeof localpath ==='string') {
      var blobpath = 'http://squirreleggs.blob.core.windows.net/'+ containername +'/'+ blobname;

      blobService.createBlockBlobFromFile(containername, blobname, localpath, function(err){
          if(err) {
            console.log('Blob write error:', err);
          } else {
            console.log('Written to Azure as '+ blobname);
            callback(blobpath);
          }
      });
    } else {
      console.log('Save on Blob invalid parameters error:', arguments);
      return 'Invalid parameters. Not saving on Azure Blob.';
    }
  }

    // used for image posting
  function updateMessage(msg_id, updateObj, callback) {
    if(msg_id && updateObj) {
      var query = { _id: msg_id.toString() };
      db.Message.update(query, {$set: updateObj}, function(err, count) {
        if(err) {
          console.log('Message image update error:', err);
        } else if(count === 1) {
          console.log('Message '+ msg_id +' updated with properties: '+ Object.keys(updateObj));
          if(callback) { callback(); }
        } else {
          console.log('Message does not existing for updating: '+ msg_id);
        }
      });
    }
  }

  var newImageTest = function(req, res) {
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
      var origExt, tempFile, tempPath;

      //  trying to incorporate old method with new.. need to table for now
      // if(req.files.photo && req.files.photo.size > 1000 && (req.files.photo.type === 'image/jpeg' || req.files.photo.type === 'image/png' || req.files.photo.type === 'image/gif')) {
      //   console.log(req.files.photo.name + ' is a valid attachment.');

      //   origExt = req.files.photo.name.split('.').pop();
      //   tempPath = req.files.photo.path;
      // }

      if(typeof req.files === 'undefined' || typeof req.files.photo === 'undefined') {
        var regex = /^data:.+\/(.+);base64,(.*)$/;
        var datBase64 = req.body.photo.match(regex);

        if(datBase64.length > 2) {
          origExt = datBase64[1];   // original extension of file
          tempFile = (new ObjectId()).toString() +'.'+ origExt;
          tempPath = './tmp/'+ tempFile;


          fs.writeFile(tempPath, new Buffer(datBase64[2], "base64"), 'binary', function(err){
            if(err) {
              console.log('Writing temp file to '+ tempPath +' error:'+ err);
              res.send(500, 'Did not successfully attach image to messages.');
            } else {

                // azure container names must be lowercase and contain only alphanumerics
                // stored this way to split images up into different days of the month
              var containerbase = 'imagestore';
              var dt = new Date();
              var containername = containerbase + dt.getDate();

              blobService.createContainerIfNotExists(containername, {publicAccessLevel : 'container'}, function(error){
                  if(!error){
                    console.log('Azure container "'+ containername + '" created/accessed.');
                    async.each(message_ids, function(message_id, hollerIfYaHearMe) {
                        var bname = message_id + '.' + origExt;
                        _saveOnBlob(containername, bname, tempPath, function(picpath) {
                          updateMessage(message_id, {pic_url: picpath}, function() {
                            hollerIfYaHearMe();
                          });
                        });
                      }, function(err) {
                        if(err) {
                          console.log('Async.each message update error:', err);
                          res.send(500, 'Did not successfully attach image to messages.');
                        } else {
                          res.send(201, 'Images successfully sent with messages.');
                          console.log('Photo URLs added to messages:', message_ids);
                          fs.unlink(tempPath, function(){
                            console.log('Temp image "'+ tempPath +'" deleted.');
                          });
                        }
                    });
                  } else {
                    console.log('Container creation error:', error);
                    res.send(500, 'Did not successfully attach image to messages.');
                  }
              });
            }
          });
        } else {
          res.send(400, 'Did not receive an image to attach to messages.');
        }
      }
    } else {
      res.send(400, 'Message IDs were not supplied in a valid format.');
    }
  };

  var retrieveMessages = function(req, res) {
    var user_id = req.params.user_id;
    var allMessages = {};
    var query = {
      receiver_id: user_id,
      cleared: false
    };
    db.Message.find(query, function(err, incoming) {
      if(err) {
        console.log('Retrieving inbox error for '+ user_id +':'+ err);
        res.send(500, 'Failed to retrieve mailbox, please try again.');
      } else if(incoming) {
        allMessages.inbox = _sortMessages(incoming.slice());

        var query = {
          sender_id: user_id,
          cleared: false
        };
        db.Message.find(query, function(err, outgoing) {
          if(err) { console.log('Retrieving outbox error for '+ user_id +':'+ err); }
          if(outgoing) {
            allMessages.outbox = _sortMessages(outgoing.slice());
            res.send(200, allMessages);
          }
        });
      } else {
        console.log('Did not find a mailbox for user id:', user_id);
        res.send(400, 'No mailbox exists for this user.');
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
            res.send(201, msg);
            console.log("Message delivered to user and marked as read.");
            _findSenderReceiver(msg.sender_id, msg.receiver_id, function(sender, receiver) {
              if(sender.deviceToken) {
                console.log('Firing push to '+ sender.username +' about '+ receiver.username +' reading message '+ query._id);
                firePush(sender.deviceToken, receiver.username + ' has read your message!', receiver.username);
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
        // sender should not be a string, if it is, there's an error
      if(typeof sender === 'string') {
        console.log(sender);
        res.send(400, sender);
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
            res.send(201, sender.friends);     // sends the sender an updated friends list
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
        res.send(201, receiver.friends);
      });
    });
  };

  var forceFriend = function(sender) {
    var svnh_id = '521c0a3d259c840000000002',     // if the db changes, these values need to be updated
        guy_id = '521c0a3d259c840000000003',
        senderObj = {},
        svnhObj = {},
        guyObj = {};

    var query = {_id: {$in: [svnh_id, guy_id]}};
    db.User.find(query, function(err, founders) {
      if(err) { console.log('Finding svnh/guy error:', err); }
      if(founders && founders.length === 2) {

        senderObj.friends = [{_id: svnh_id, status: 2, username: 'svnh'},{_id: guy_id, status: 2, username: 'guy'}];

        svnhObj.friends = _addAndSort({_id: sender._id, status: 2, username: sender.username}, founders[0].friends, 'username');
        guyObj.friends = _addAndSort({_id: sender._id, status: 2, username: sender.username}, founders[1].friends, 'username');

        _updateSenderReceiver(sender._id, senderObj, svnh_id, svnhObj, function(){
          _updateSenderReceiver(sender._id, senderObj, guy_id, guyObj, function(){
            console.log('Auto-friended new user:', sender.username);
            if(sender.deviceToken) {
              firePush(sender.deviceToken, 'Welcome to Hatch! You are now friends with Savannah and Guy!', 'Hatch');
            }

            var fakeMessage = {};
            fakeMessage.body = {
              sender_id: "521c0a3c259c840000000001",
              sender_name: "Hatch",
              receiver_ids: [sender._id],
              title: "Welcome to Hatch!",
              latlng: {"lat":37.783715,"lng":-122.408976},
              content: "Hi, thanks for signing up! Try adding some friends and dropping some messages. Cheers!"
            };
            newMessage(fakeMessage);
          });
        });
      }
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
        res.send(201, receiver.friends);
      });
    });
  };

  var listFriends = function(req, res) {
    var query = {_id: req.params.user_id};
    db.User.findOne(query, function(err, item) {
      console.log("Sending friends for "+ item.username +' ('+ item._id +')');
      res.send(200, item.friends);
    });
  };

  var newError = function(req, res) {
    var user_id = req.params.user_id;
    var error = req.body.error || req.body;

    console.log('req.body.error', req.body.error);

    var errorObj = {
      user_id: user_id,
      error: error
    };

    var dt = new Date();
    var dtString = dt.getMonth() +'.'+ dt.getDate() +' '+ dt.getHours() +':'+ dt.getMinutes() +':'+ dt.getSeconds();

    var errorz = new db.ErrorLog(errorObj);
    errorz.save(function(err, item) {
      if(err) {
        console.log('Logging error, error:', err);
        res.send(500, 'Error not logged.');
      } else if(item) {
        console.log(dtString + ': Logged error for: User '+ item.user_id + ' ('+ item._id +')');
        res.send(201, 'Error logged, thanks.');
      } else {
        console.log("wtf, didn't log error..");
        res.send(500, 'Error not logged.');
      }
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

  server.post('/image', newImageTest);
  server.post('/imagetest', newImageTest);

  server.get('/friends/:user_id', listFriends);
  server.get('/friends/add/:sender_id/:receiver_id', addFriend);
  server.get('/friends/accept/:sender_id/:receiver_id', acceptFriend);
  server.get('/friends/deny/:sender_id/:receiver_id', denyFriend);

  server.post('/error/:user_id', newError);

  server.listen(8080, function() {
    console.log('%s listening at 8080', server.name);
  });

  return {
    server: server,
    User: db.User,
    Message: db.Message
  };
};