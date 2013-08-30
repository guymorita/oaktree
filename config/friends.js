var Helpers = require('./helpers.js');
var Hatchlings = require('./messages.js');
var Comrades = module.exports = {};

Comrades.addFriend = function(req, res) {
  var sender_id = req.params.sender_id,
      receiver_id = req.params.receiver_id,
      senderObj = {},
      receiverObj = {};

  var query = {_id: {$in: [sender_id, receiver_id]}};

  Helpers.findSenderReceiver(sender_id, receiver_id, function(sender, receiver) {
      // sender should not be a string, if it is, there's an error
    if(typeof sender === 'string') {
      console.log(sender);
      res.send(400, sender);
    } else {
      var existingFriend = _.find(sender.friends, function(friend) {
        return (friend._id.toString() === receiver_id.toString());
      });

      if(typeof existingFriend === 'undefined') {
        senderObj.friends = Helpers.addAndSort({_id: receiver_id, status: 0, username: receiver.username}, sender.friends, 'username');
        receiverObj.friends = Helpers.addAndSort({_id: sender_id, status: 1, username: sender.username}, receiver.friends, 'username');

        Helpers.updateSenderReceiver(sender_id, senderObj, receiver_id, receiverObj, function(){
          if(receiver.deviceToken) {
            Helpers.firePush(receiver.deviceToken, sender.username + ' wants to be friends!', sender.username);
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
            Comrades.acceptFriend(fakeReq, res);
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
            Comrades.acceptFriend(fakeReq, res);
            break;
          default:
            res.send('You are already friends with '+ existingFriend.username);
            break;
        }
      }
    }
  });
};

Comrades.acceptFriend = function(req, res) {
  var sender_id = req.params.sender_id,
      receiver_id = req.params.receiver_id,
      senderObj = {},
      receiverObj = {};

  Helpers.findSenderReceiver(sender_id, receiver_id, function(sender, receiver) {
    var friendInSender = Helpers.findAndPluck(sender.friends, '_id', receiver._id)[0];
    var friendinReceiver = Helpers.findAndPluck(receiver.friends, '_id', sender._id)[0];

    friendInSender.status = 2;
    friendinReceiver.status = 2;

    senderObj.friends = Helpers.addAndSort(friendInSender, sender.friends, 'username');
    receiverObj.friends = Helpers.addAndSort(friendinReceiver, receiver.friends, 'username');

    Helpers.updateSenderReceiver(sender_id, senderObj, receiver_id, receiverObj, function(){
      if(sender.deviceToken) {
        Helpers.firePush(sender.deviceToken, receiver.username + ' is now your friend!', receiver.username);
      }
      res.send(201, receiver.friends);
    });
  });
};

Comrades.forceFriend = function(sender) {
  var query = {username: {$in: ['svnh','guy','hatch']}};
  db.User.find(query, function(err, founders) {
    if(err) { console.log('Finding svnh/guy error:', err); }
    else if(founders && founders.length === 3) {
      var svnhObj, svnhSend = {};
      var guyObj, guySend = {};
      var alObj, alSend = {};
      var senderObj = {};

      for(var i=0; i<founders.length; i++) {
        if(founders[i].username === 'svnh') {
          svnhObj = founders[i];
        } else if(founders[i].username === 'guy') {
          guyObj = founders[i];
        }
        else if(founders[i].username === 'hatch') {
          alObj = founders[i];
        }
      }

      senderObj.friends = [{_id: svnhObj._id, status: 2, username: 'svnh'},{_id: guyObj._id, status: 2, username: 'guy'}];
      svnhSend.friends = Helpers.addAndSort({_id: sender._id, status: 2, username: sender.username}, svnhObj.friends, 'username');
      guySend.friends = Helpers.addAndSort({_id: sender._id, status: 2, username: sender.username}, guyObj.friends, 'username');
      alSend.friends = Helpers.addAndSort({_id: sender._id, status: 2, username: sender.username}, alObj.friends, 'username');

      Helpers.updateSenderReceiver(sender._id, senderObj, svnhObj._id, svnhSend, function(){
        Helpers.updateSenderReceiver(guyObj._id, guySend, alObj._id, alSend, function(){
          console.log('Auto-friended new user:', sender.username);

          if(sender.deviceToken) {
            Helpers.firePush(sender.deviceToken, 'Welcome to Hatch! You are now friends with Savannah and Guy!', 'Hatch');
          }

          var fakeMessage = {};
          fakeMessage.body = {
            sender_id: alObj._id,
            sender_name: "Hatch",
            receiver_ids: [sender._id],
            title: "Welcome to Hatch!",
            latlng: {"lat":37.783715,"lng":-122.408976},
            content: "Hi, thanks for signing up! Try adding some friends and dropping some messages. Cheers!"
          };
          Hatchlings.newMessage(fakeMessage);

        });
      });

    } else {
      console.log('Could not find all three founders to auto-friend new user:', sender.username);
    }
  });
};

Comrades.denyFriend = function(req, res) {
  var sender_id = req.params.sender_id,
      receiver_id = req.params.receiver_id,
      senderObj = {},
      receiverObj = {};

  Helpers.findSenderReceiver(sender_id, receiver_id, function(sender, receiver) {
    var friendInSender = Helpers.findAndPluck(sender.friends, '_id', receiver._id)[0];
    var friendinReceiver = Helpers.findAndPluck(receiver.friends, '_id', sender._id)[0];

    friendInSender.status = -1;
    friendinReceiver.status = -2;

    senderObj.friends = Helpers.addAndSort(friendInSender, sender.friends, 'username');
    receiverObj.friends = Helpers.addAndSort(friendinReceiver, receiver.friends, 'username');

    Helpers.updateSenderReceiver(sender_id, senderObj, receiver_id, receiverObj, function(){
      res.send(201, receiver.friends);
    });
  });
};

Comrades.listFriends = function(req, res) {
  var query = {_id: req.params.user_id};
  db.User.findOne(query, function(err, user) {
    console.log("Sending friends for "+ user.username +' ('+ user._id +')');

    var friends = _.sortBy(user.friends, function(frnd) {
      return frnd.username;
    });
    res.send(200, friends);
  });
};