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

Hatchers.setUserToken = function(req, res) {
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

Hatchers.confirmUser = function(req, res) {

};