var oaktree = require('../oaktree.js').oaktree();
var request = require('supertest');

oaktree.User.find().remove({});
oaktree.Message.find().remove({});


var makeUsers = function(cb) {
  var users = [];
  request(oaktree.server).get('/user/new/bob/bobpass')
    .end(function(err, res) {
      users.push({id: res.body._id, username: 'bob'});
      request(oaktree.server).get('/user/new/tom/tompass')
        .end(function(err, res) {
          users.push({id: res.body._id, username: 'tom'});
          request(oaktree.server).get('/user/new/sally/sallypass')
            .end(function(err, res) {
              users.push({id: res.body._id, username: 'sally'});
              request(oaktree.server).get('/user/new/jill/jillpass')
                .end(function(err, res) {
                  users.push({id: res.body._id, username: 'jill'});
                  oaktree.User.find({}, function(err, collection){
                    console.log("users in db", collection);
                    cb(users);
                  });
                });
            });
        });
    });
};

var makeMessages = function(users) {
  var u0_u1 = users[0].id + '/'+ users[1].id;
  var u0_u2 = users[0].id + '/'+ users[2].id;
  var u1_u0 = users[1].id + '/'+ users[0].id;
  var u1_u2 = users[1].id + '/'+ users[2].id;
  var u2_u0 = users[2].id + '/'+ users[0].id;
  request(oaktree.server).get('/message/send/' + u0_u1 + '/message_fromUser0toUser1')
    .end(function(err, res){
      request(oaktree.server).get('/message/send/' + u0_u2 + '/message_fromUser0toUser2')
        .end(function(err, res){
          request(oaktree.server).get('/message/send/' + u1_u0 + '/message_fromUser1toUser0')
            .end(function(err, res){
              request(oaktree.server).get('/message/send/' + u1_u2 + '/message_fromUser1toUser2')
                .end(function(err, res){
                  request(oaktree.server).get('/message/send/' + u2_u0 + '/message_fromUser2toUser0')
                    .end(function(err, res){
                      console.log("messages sent");
                      makeFriends(users);
                    });
                });
            });
        });
    });
};

var makeFriends = function(users) {
  request(oaktree.server).get('/friends/add/'+ users[0].id +'/'+ users[1].id)
    .end(function(err, res) {
      request(oaktree.server).get('/friends/accept/'+ users[0].id +'/'+ users[1].id)
        .end(function(err, res) {
          request(oaktree.server).get('/friends/add/'+ users[0].id +'/'+ users[2].id)
            .end(function(err, res) {
              request(oaktree.server).get('/friends/add/'+ users[0].id +'/'+ users[3].id)
                .end(function(err, res) {
                  request(oaktree.server).get('/friends/add/'+ users[1].id +'/'+ users[2].id)
                    .end(function(err, res) {
                      request(oaktree.server).get('/friends/accept/'+ users[1].id +'/'+ users[2].id)
                        .end(function(err, res) {
                          console.log("Friendships established");
                        });
                    });
                });
            });
        });
    });
};

makeUsers(makeMessages);