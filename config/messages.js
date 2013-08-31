var Helpers = require('./helpers.js');
var Hatchlings = module.exports = {};

    // we need to take this out eventually.. used for PRISM right now
Hatchlings.showMessages = function(req, res) {
    db.Message.find({}, function(err, collection) {
      res.send(collection);
    });
  };

Hatchlings.newMessage = function(req, res) {
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

Hatchlings.newImage = function(req, res) {
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

Hatchlings.retrieveMessages = function(req, res) {
  var user_id = req.params.user_id;
  var allMessages = {};
  var query = {
    receiver_id: user_id,
    receiver_cleared: false
  };
  db.Message.find(query, function(err, incoming) {
    if(err) {
      console.log('Retrieving inbox error for '+ user_id +':'+ err);
      res.send(500, 'Failed to retrieve mailbox, please try again.');
    } else if(incoming) {
      allMessages.inbox = Helpers.sortMessages(incoming.slice());

      var query2 = {
        sender_id: user_id,
        sender_cleared: false
      };
      db.Message.find(query2, function(err, outgoing) {
        if(err) { console.log('Retrieving outbox error for '+ user_id +':'+ err); }
        if(outgoing) {
          allMessages.outbox = Helpers.sortMessages(outgoing.slice());
          res.send(200, allMessages);
        }
      });
    } else {
      console.log('Did not find a mailbox for user id:', user_id);
      res.send(400, 'No mailbox exists for this user.');
    }
  });
};

Hatchlings.clearMessages = function(req, res) {
  console.log('clear called');
  var user_id = req.params.user_id;

  var query = {
    receiver_id: user_id,
    status: 1,
    receiver_cleared: false
  };

  db.Message.update(query, {$set: {receiver_cleared: true}}, {multi: true}, function(err, count) {
    if(err) {
      console.log('Clear inbox error:', err);
    } else {
      if(count > 0) { console.log('Cleared '+ count +' messages from inbox for '+ user_id); }

      var query2 = {
        sender_id: user_id,
        sender_cleared: false
      };

      db.Message.update(query2, {$set: {sender_cleared: true}}, {multi: true}, function(err, count) {
        if(err) {
          console.log('Clear outbox error:', err);
        } else {
          if(count > 0) { console.log('Cleared '+ count +' messages from outbox for '+ user_id); }
          res.send(201, 'Cleared inbox and outbox for user.');
        }
      });
    }
  });
};

Hatchlings.readMessages = function(req, res) {
    var query = { _id: req.params.message_id };
    db.Message.findOne(query, function(err, msg) {
      if(err) { console.log("Retrieving message from db error", err); }
      if(msg.status === 0) {
        var messageObj = {
          status: 1,
          pic_url: ''
        };
        msg.status = 1;
        msg.pic_url = '';
        db.Message.update(query, {$set: messageObj}, function(err, count) {
          if(count === 1) {
            res.send(201, msg);
            console.log('Message delivered to user and marked as read.');
          } else {
            console.log('Failed to update message:', req.params.message_id);
            res.send(500);
          }
        });
      } else if(msg.status === 1) {
        res.send(400, 'Message has already been read.');
      } else {
        res.send(400, 'Failed to locate your message.');
      }
    });
  };