Users = require('./users.js');
Messages = require('./messages.js');
Friends = require('./friends.js');
ErrorLog = require('./errorlog.js');

module.exports = function(server) {

  function defaultResponse(req, res) {
    res.send('oaktree is ready.');
  }

  server.get('/', defaultResponse);

  server.get('/user', Users.listUsers);
  server.post('/user/new', Users.newUser);
  server.post('/user/login', Users.loginUser);
  server.get('/user/token/:user_id/:deviceToken', Users.setUserToken);
  server.post('/user/phonefind', Users.phoneFind);

  server.post('/message', Messages.newMessage);
  server.get('/message/PRISM', Messages.showMessages);
  server.get('/message/retrieve/:user_id', Messages.retrieveMessages);
  server.get('/message/clear/:user_id', Messages.clearMessages);
  server.get('/message/read/:message_id', Messages.readMessages);
  server.post('/image', Messages.newImage);

  server.get('/friends/:user_id', Friends.listFriends);
  server.get('/friends/add/:sender_id/:receiver_id', Friends.addFriend);
  server.get('/friends/accept/:sender_id/:receiver_id', Friends.acceptFriend);
  server.get('/friends/deny/:sender_id/:receiver_id', Friends.denyFriend);

  server.post('/error/:user_id', ErrorLog.newError);
};