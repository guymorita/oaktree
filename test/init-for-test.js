var oaktree = require('../lib/oaktree.js').oaktree();
var request = require('supertest');

// oaktree.User.find().remove({});
// oaktree.Message.find().remove({});

var makeUsers = function(cb) {
  var users = [];
  request(oaktree.server).get('/user/new/hatch/squirrelEgg5')
  .end(function(err, res) {
    request(oaktree.server).get('/user/new/svnh/plantlife')
      .end(function(err, res) {
        users.push({id: res.body._id, username: 'svnh'});
        request(oaktree.server).get('/user/new/guy/plantlife')
          .end(function(err, res) {
            users.push({id: res.body._id, username: 'guy'});
            //setTokenToGuy(users);
            console.log("Made folks");
          });
      });
  });
};

var makeMessages = function(users) {
  var message = {
    sender_id: users[0].id,
    sender_name: users[0].username,
    receiver_ids: [users[1].id, users[2].id, users[3].id],
    content: "message to tom, sally, and jill",
    title: "from bob, japantown test",
    latlng: {"lat":37.785385,"lng":-122.429747}
  };
  request(oaktree.server).post('/message')
    .set('content-type', 'application/json')
    .send(JSON.stringify(message))
    .end(function(err, res){
      if (err) {
        console.log("post err", err);
      }

      message = {
        sender_id: users[1].id,
        sender_name: users[1].username,
        receiver_ids: [users[0].id, users[3].id],
        content: "message to bob and jill.. at dolores park",
        title: "from tom, dolores park",
        latlng: {"lat":37.760317,"lng":-122.426845}
      };
      request(oaktree.server).post('/message')
        .set('content-type', 'application/json')
        .send(JSON.stringify(message))
        .end(function(err, res){

          message = {
            sender_id: users[2].id,
            sender_name: users[2].username,
            receiver_ids: [users[3].id],
            content: "message to jill",
            title: "from sally, nob hill",
            latlng: {"lat":37.792355,"lng":-122.411889}
          };
          request(oaktree.server).post('/message')
            .set('content-type', 'application/json')
            .send(JSON.stringify(message))
            .end(function(err, res){

              message = {
                sender_id: users[2].id,
                sender_name: users[2].username,
                receiver_ids: [users[3].id],
                content: "second message to jill",
                title: "2nd from sally, hack reactor",
                latlng: {"lat":37.783715,"lng":-122.408976}
              };
              request(oaktree.server).post('/message')
                .set('content-type', 'application/json')
                .send(JSON.stringify(message))
                .end(function(err, res){

                  message = {
                    sender_id: users[3].id,
                    sender_name: users[3].username,
                    receiver_ids: [users[1].id, users[2].id],
                    content: "message to tom and sally",
                    title: "from jill, yerba buena",
                    latlng: {"lat":37.784775,"lng":-122.402490}
                  };
                  request(oaktree.server).post('/message')
                    .set('content-type', 'application/json')
                    .send(JSON.stringify(message))
                    .end(function(err, res){

                      message = {
                        sender_id: users[3].id,
                        sender_name: users[3].username,
                        receiver_ids: [users[2].id],
                        content: "from jill",
                        title: "to sally - near fillmore and turk",
                        latlng: {"lat":37.780501,"lng":-122.432081}
                      };
                      request(oaktree.server).post('/message')
                        .set('content-type', 'application/json')
                        .send(JSON.stringify(message))
                        .end(function(err, res){

                          message = {
                            sender_id: users[1].id,
                            sender_name: users[1].username,
                            receiver_ids: [users[2].id],
                            content: "from tom",
                            title: "to sally - near turk and leavenworth",
                            latlng: {"lat":37.783079,"lng":-122.414142}
                          };
                          request(oaktree.server).post('/message')
                            .set('content-type', 'application/json')
                            .send(JSON.stringify(message))
                            .end(function(err, res){

                              console.log("INIT: messages sent");
                            });
                        });
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
                          console.log("INIT: friendships established");
                        });
                    });
                });
            });
        });
    });
};


//makeUsers();