var Helpers = require('./helpers.js');
var Comrades = require('./friends.js');

var Hatchers = module.exports = {};

Hatchers.listUsers = function(req, res) {
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

Hatchers.phoneFind = function(req, res) {
  console.log('phonefind called');
  if(req.body.contacts && req.body.contacts.length > 0) {
    var cleanedNumbers = [];
    _.each(req.body.contacts, function(contact){
      if(contact.phoneNumbers && contact.phoneNumbers.length > 0){
        _.each(contact.phoneNumbers, function(phoneObj){
          var ph = Helpers.sanitizePhone(phoneObj.value);
          if(ph.length > 5) {
            cleanedNumbers.push(ph);
          }
        });
      }
    });

    var query = {phone: {$in: cleanedNumbers}};
    db.User.find(query, function(err, collection) {
      var users = Helpers.sanitizeUsers(collection);
      if(err) {
        console.log('phoneFind lookup error:', err);
        res.send(500, 'Could not find users, please try again.');
      } else if(collection) {
        res.send(200, users);
      } else {
        res.send(400, 'Sorry, none of your contacts were found.');
      }
    });
  } else {
    res.send(400);
  }
};

Hatchers.newUser = function(req, res) {
  var uname = (req.body.username).toLowerCase();
  var upass = req.body.password;
  var code = Helpers.smsCode();     // for sms confirmation
  var uphone = (req.body.phone) ? Helpers.sanitizePhone(req.body.phone) : '15555555555';

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
          console.log('err', err);
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
          Comrades.forceFriend(newUser);   // to auto-friend to founders
          res.send(201, newUser);
        } else {
          console.log('User creation error for:', newUserObj.uname);
          res.send(500, 'User not created, please try again.');
        }
      });
    }
  });
};

Hatchers.loginUser = function(req, res) {

  var uname = (req.body.username).toLowerCase();
  var upass = req.body.password;

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

Hatchers.setUserToken = function(req, res) {
  var user_id = req.params.user_id;
  var tokenProperty = { deviceToken: req.params.deviceToken };

  if(user_id.length === 24 && tokenProperty.deviceToken.length === 64) {
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
  } else {
    res.send(400, 'Invalid device token format, please try again.');
  }
};

Hatchers.confirmUser = function(req, res) {
  var user_id = req.params.user_id;
  var code = req.params.confirm_code;

  if(user_id.length === 24 && parseInt(code, 10) > 999 && parseInt(code, 10) < 10000) {
    db.User.findOne({_id:user_id}, function(err, user) {
      if(err) {
        console.log('Confirm user lookup db error:', err);
        res.send(500, 'Could not confirm your phone number at this moment, please try again.');
      } else if(user) {
        if(code.toString() === user.confirm_code.toString()) {
          var confirmed = {confirm_code: 'confirmed'};
          db.User.update({_id:user_id}, {$set: confirmed}, function(err, count) {
            if(err) {
              console.log('User confirm status update error:', err);
              res.send(500, 'Could not confirm your phone number at this moment, please try again.');
            } else if(count === 1) {
              console.log(user.username +' has confirmed his/her phone number.');
              res.send(201, 'Your phone number has been confirmed, thank you.');
            } else {
              console.log('Supplied user_id ('+ user_id +') does not exist.');
              res.send(500, 'Could not confirm your phone number at this moment, please try again.');
            }
          });
        }
      } else {
        console.log('Could not find user '+ user_id +' to confirm phone number.');
        res.send(400, 'Could not confirm your phone number at this moment, please try again.');
      }
    });
  } else {
    res.send(400, 'Invalid confirmation format, please try again.');
  }
};