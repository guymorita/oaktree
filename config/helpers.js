var Helpers = module.exports = {};

// adds an object to an array and returns a sorted array by a key (string)
Helpers.addAndSort = function(obj, arr, key) {
  arr.push(obj);
  return _.sortBy(arr, function(element) {
    return element[key];
  });
};

    // goes through an array of objects, searchs object by the key "field" for match, and removes the first match
Helpers.findAndPluck = function(array, field, match) {
  var i;
  for(i=0; i<array.length; i++) {
    if(array[i][field].toString() === match.toString()) {
      break;
    }
  }
  return array.splice(i, 1);
};

Helpers.findSenderReceiver = function(sender_id, receiver_id, callback) {
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
};

Helpers.updateSenderReceiver = function(sender_id, senderObj, receiver_id, receiverObj, callback) {
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
};

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

Helpers.sortMessages = function(messages) {
  _.sortBy(messages, function(msg){
    return msg.date;
  });
  return messages.reverse();
};

Helpers.firePush = function(token, body, sender){
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

Helpers.sanitizeUsers = function(users) {
  for(var i=0; i<users.length; i++) {
    var user = users[i];
    user.password = undefined;
    user.salt = undefined;
    user.confirm_code = undefined;
    user.friends = undefined;
    user.deviceToken = undefined;
  }
  return users;
};

Helpers.sanitizePhone = function(number) {
  var ph = number + '';
  ph = ph.replace(/\D/g, "");
  if(ph.length === 10 && (ph[0] !== '0' || ph[0] !== '1')) {
      ph = '1' + ph;
  }
  return ph;
};