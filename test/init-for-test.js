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
  var message = {
    sender_id: users[0].id,
    receiver_ids: [users[1].id,users[2].id],
    content: "omfg",
    title: "hello title"
  };
  console.log('sending message');

  request(oaktree.server).post('/message')
    // .set('Content-Type', 'application/json')
    .send(JSON.stringify(message))
    .end(function(err, res){
      if (err) {
        throw new err();
      }
      console.log("message sent, err ", res);
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