var oaktree = require('../lib/oaktree.js').oaktree();
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
                    //cb(users);
                    //makeFriends(users);
                    makeImage(users);
                  });
                });
            });
        });
    });
};

var makeMessages = function(users) {
  var message = {
    sender_id: users[0].id,
    receiver_ids: [users[1].id, users[2].id, users[3].id],
    content: "message to tom, sally, and jill",
    title: "from bob, japantown test",
    latlng: {"lat":37.785385,"lng":-122.429747}
  };
  request(oaktree.server).post('/message')
    .send(JSON.stringify(message))
    .end(function(err, res){
      if (err) {
        console.log("post err", err);
        throw new err();
      }

      message = {
        sender_id: users[1].id,
        receiver_ids: [users[0].id, users[3].id],
        content: "message to bob and jill.. at dolores park",
        title: "from tom, dolores park",
        latlng: {"lat":37.760317,"lng":-122.426845}
      };
      request(oaktree.server).post('/message')
        .send(JSON.stringify(message))
        .end(function(err, res){

          message = {
            sender_id: users[2].id,
            receiver_ids: [users[3].id],
            content: "message to jill",
            title: "from sally, nob hill",
            latlng: {"lat":37.792355,"lng":-122.411889}
          };
          request(oaktree.server).post('/message')
            .send(JSON.stringify(message))
            .end(function(err, res){

              message = {
                sender_id: users[2].id,
                receiver_ids: [users[3].id],
                content: "second message to jill",
                title: "2nd from sally, hack reactor",
                latlng: {"lat":37.783715,"lng":-122.408976}
              };
              request(oaktree.server).post('/message')
                .send(JSON.stringify(message))
                .end(function(err, res){

                  message = {
                    sender_id: users[3].id,
                    receiver_ids: [users[1].id, users[2].id],
                    content: "message to tom and sally",
                    title: "from jill, yerba buena",
                    latlng: {"lat":37.784775,"lng":-122.402490}
                  };
                  request(oaktree.server).post('/message')
                    .send(JSON.stringify(message))
                    .end(function(err, res){
                      console.log("init: messages sent");
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
                          console.log("init: friendships established");
                        });
                    });
                });
            });
        });
    });
};

var makeImage = function(users) {
  message = {
    sender_id: users[2].id,
    receiver_ids: [users[3].id],
    content: "hello savannah",
    title: "2nd from sally, hack reactor",
    latlng: {"lat":37.783715,"lng":-122.408976}
  };
  request(oaktree.server).post('/image')
    .send(JSON.stringify(message))
    .end(function(err, res){
      if(!err) { console.log("init: posted image"); }
    });
};

makeUsers(makeMessages);