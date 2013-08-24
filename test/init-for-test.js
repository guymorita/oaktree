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
                    setTokenToGuy(users);
                    //makeMessages(users);
                    //makeFriends(users);
                    //makeImage(users);
                  });
                });
            });
        });
    });
};

var setTokenToGuy = function(users){
  for (var i = 0; i < users.length; i++){
    request(oaktree.server).get('/user/token/'+users[i].id+'/'+'35ab8d9f3955d77e44554e1a7e2d8b6582d1a2a639fcb6999aa54d257cb4828b')
      .end(function(err, res){
        console.log('set token res', res.body);
      });
  }
  setTimeout(function(){
    makeMessages(users);
    makeFriends(users);
  }, 3000);
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

var makeImage = function(users) {
  message = {
    sender_id: users[2].id,
    sender_name: users[2].username,
    receiver_ids: [users[3].id],
    content: "hello jill",
    title: "image attachment test",
    latlng: {"lat":37.783715,"lng":-122.408976}
  };
  request(oaktree.server).post('/message')
    .set('content-type', 'application/json')
    .send(JSON.stringify(message))
    .end(function(err, res){
      if(!err) {
        var message = JSON.parse(res.text)[0]._id;

        console.log("sending fucks");
        request(oaktree.server).post('/imagetest/?0=' + message)
          .attach('photo','./test/morita.jpg')
          .send()
          .end(function(err, res){
            console.log("attach image err", err);
            console.log("attach image res", res.text);
          });
      }
    });
};

makeUsers();