var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;
var async = require('async');
var Q = require('q');

var oaktree = require('../app.js');

var request = require('supertest');


describe('New user creation', function(){
  var user1 = {
    username: 'bob',
    password: 'bobpass'
  };
  beforeEach(function(done){
    oaktree.User.find().remove({});
    request(oaktree.server)
      .post('/user/new/')
      .set('content-type', 'application/json')
      .send(JSON.stringify(user1))
      .end(function(err, res){
        done();
      });
  });
  it('should create a new user when it receives a post request to make a user', function(done){
    oaktree.User.findOne({username:'bob'}, function(err, res){
      assert.equal(res.username, 'bob');
      done();
    });
  });
  it('should return an error code if a username already exists', function(done){
    request(oaktree.server)
      .post('/user/new/')
      .set('content-type', 'application/json')
      .send(JSON.stringify(user1))
      .end(function(err, res){
        assert.equal(res.statusCode, "400");
        done();
    });
  });
  it('should return an error message if a username already exists', function(done){
    request(oaktree.server)
      .post('/user/new/')
      .set('content-type', 'application/json')
      .send(JSON.stringify(user1))
      .end(function(err, res){
        assert.equal(res.text, "Username already exists, please choose another name.");
        done();
    });
  });
});

describe('User login', function(){
  oaktree.User.find().remove({});
  var user2 = {
    username: 'tom',
    password: 'tompass'
  };
  beforeEach(function(done){
    request(oaktree.server)
      .post('/user/new/')
      .set('content-type', 'application/json')
      .send(JSON.stringify(user2))
      .end(function(err, res){
        done();
      });
  });
  it('should return status code 200 when a user provides a valid user/password combination', function(done){
    request(oaktree.server)
      .post('/user/login/')
      .set('content-type', 'application/json')
      .send(JSON.stringify(user2))
      .end(function(err, res){
        assert.equal(res.statusCode, "200");
        done();
    });
  });
  it('should return status code 401 when a user provides a invalid user/password combination', function(done){
    user2.password = 'noprease';
    request(oaktree.server)
      .post('/user/login/')
      .set('content-type', 'application/json')
      .send(JSON.stringify(user2))
      .end(function(err, res){
        assert.equal(res.statusCode, "401");
        done();
    });
  });
});

describe('Sent messages', function(){
  var message = {
    sender_id: 132,
    sender_name: 'Al',
    receiver_ids: [555],
    content: "message from al",
    title: "hi herro prease",
    latlng: {"lat":37.785385,"lng":-122.429747}
  };
  var message_id = null;
  beforeEach(function(done){
    oaktree.Message.find().remove({});
    request(oaktree.server)
      .post('/message/')
      .set('content-type', 'application/json')
      .send(JSON.stringify(message))
      .end(function(err, res){
        message_id = JSON.parse(res.res.text)[0]._id;
        done();
      });
  });
  it('should embed the correct sender id to the message', function(done){
    oaktree.Message.findOne({_id: message_id }, function(err, item) {
      assert.equal(item.sender_id, 132);
      assert.notEqual(item.sender_id, 555);
      done();
    });
  });
  it('should embed the correct receiver id to the message', function(done){
    oaktree.Message.findOne({_id: message_id }, function(err, item) {
      assert.equal(item.receiver_id, 555);
      assert.notEqual(item.receiver_id, 666);
      done();
    });
  });
  it('should embed the correct message', function(done){
    // oaktree.User.findOne({name:'bob'}, function(err, res){
      oaktree.Message.findOne({_id: message_id }, function(err, item) {
        assert.equal(item.content, "message from al");
        assert.notEqual(item.content, "hello");
        done();
      });
  });
  it('should set the message to unread', function(done){
    // oaktree.User.findOne({name:'bob'}, function(err, res){
      oaktree.Message.findOne({_id: message_id }, function(err, item) {
        assert.equal(item.status, 0);
        done();
      });
  });
  it('should not be cleared', function(done){
    // oaktree.User.findOne({name:'bob'}, function(err, res){
      oaktree.Message.findOne({_id: message_id }, function(err, item) {
        assert.equal(item.cleared, false);
        done();
      });
  });
});

describe('Retrieve messages', function(){
  var message1 = {
    sender_id: 132,
    sender_name: 'Guy',
    deviceToken: '11',
    receiver_ids: [555],
    title: 'herro',
    content: 'world',
    latlng: {
      lat: 132,
      lng: -54
    }
  };
  var message2 = {
    sender_id: 111,
    sender_name: 'Al',
    deviceToken: '12121',
    receiver_ids: [555],
    title: 'sup dude',
    content: 'you know how it is',
    latlng: {
      lat: 23,
      lng: -84
    }
  };
  var message3 = {
    sender_id: 111,
    sender_name: 'Savannah',
    deviceToken: '121',
    receiver_ids: [5],
    title: 'super duper',
    content: 'test',
    latlng: {
      lat: 58,
      lng: -82
    }
  };
  var messageArray = [message1, message2, message3];
  var messageRes;
  beforeEach(function(done){
    messageRes = [];
    oaktree.Message.find().remove({});
    async.eachSeries(messageArray,
      function(message, callback){
        request(oaktree.server)
          .post('/message/')
          .set('content-type', 'application/json')
          .send(JSON.stringify(message))
          .end(function(err, res){
            messageRes.push(JSON.parse(res.res.text)[0]._id);
            callback();
          });
      },
      function(err){
        done();
      }
      );
  });
  it('should retrieve messages for the user.', function(done){
    request(oaktree.server).get('/message/retrieve/555')
      .end(function(err, res){
        expect(JSON.parse(res.res.text).inbox.length).to.eql(2);
        assert.notEqual(JSON.parse(res.res.text).inbox[0]._id, messageRes[2]);
        assert.notEqual(JSON.parse(res.res.text).inbox[1]._id, messageRes[2]);
        assert.equal(JSON.parse(res.res.text).inbox[1].receiver_id, 555);
        done();
      });
  });
  it('should retrieve both read and unread messages.', function(done){
    oaktree.Message.update({_id: messageRes[0]}, {$set: {status: 1}}, function(err, count) {
      if(count === 1) {
        request(oaktree.server).get('/message/retrieve/555')
            .end(function(err, res){
              expect(JSON.parse(res.res.text).inbox.length).to.eql(2);
              assert.equal(JSON.parse(res.res.text).inbox[1]._id, messageRes[0]);
              assert.equal(JSON.parse(res.res.text).inbox[0]._id, messageRes[1]);
              assert.equal(JSON.parse(res.res.text).inbox[1].receiver_id, 555);
              assert.notEqual(JSON.parse(res.res.text).inbox[1]._id, messageRes[1]);
              done();
            });
      }
    });
  });
  it('should not retrieve cleared messages.', function(done){
    oaktree.Message.update({_id: messageRes[0]}, {$set: {cleared: true}}, function(err, count) {
      if(count === 1) {
        request(oaktree.server).get('/message/retrieve/555')
            .end(function(err, res){
              expect(JSON.parse(res.res.text).inbox.length).to.eql(1);
              assert.equal(JSON.parse(res.res.text).inbox[0]._id, messageRes[1]);
              assert.equal(JSON.parse(res.res.text).inbox[1], undefined);
              done();
            });
      }
    });
  });
});

describe('Read messages', function(){
  var message1 = {
    sender_id: 132,
    sender_name: 'Guy',
    receiver_ids: [555],
    title: 'herro',
    content: 'world',
    latlng: {
      lat: 132,
      lng: -54
    }
  };
  var message2 = {
    sender_id: 111,
    sender_name: 'Al',
    receiver_ids: [555],
    title: 'sup dude',
    content: 'you know how it is',
    latlng: {
      lat: 23,
      lng: -84
    }
  };
  var message3 = {
    sender_id: 111,
    sender_name: 'Al',
    receiver_ids: [5],
    title: 'super duper',
    content: 'test',
    latlng: {
      lat: 58,
      lng: -82
    }
  };
  var messageArray = [message1, message2, message3];
  var messageRes = [];
  before(function(done){
    oaktree.Message.find().remove({});
    async.eachSeries(messageArray,
      function(message, callback){
        request(oaktree.server)
          .post('/message/')
          .set('content-type', 'application/json')
          .send(JSON.stringify(message))
          .end(function(err, res){
            messageRes.push(JSON.parse(res.res.text)[0]._id);
            callback();
          });
      },
      function(err){
        request(oaktree.server)
          .get('/message/read/' + messageRes[0])
          .end(function(err, res){
            done();
          });
      }
    );
  });
  it('should mark the message as read.', function(done){
    request(oaktree.server).get('/message/retrieve/555')
      .end(function(err, res){
        resInbox = JSON.parse(res.res.text).inbox;

        var guy_index, al_index;
        for(var i=0; i<resInbox.length; i++) {
          if(resInbox[i].sender_id === '132') {
            guy_index = i;
          }
          if(resInbox[i].sender_id === '111') {
            al_index = i;
          }
        }

        assert.equal(resInbox[guy_index]._id, messageRes[0]);
        assert.equal(resInbox[al_index]._id, messageRes[1]);
        assert.equal(resInbox[guy_index].status, 1);
        assert.equal(resInbox[al_index].status, 0);
        done();
      });
  });
  it('should not affect message retrieval count.', function(done){
    request(oaktree.server).get('/message/retrieve/555')
      .end(function(err, res){
        expect(JSON.parse(res.res.text).inbox.length).to.eql(2);
        done();
      });
  });
});

//when user a friends user b, user b is now in user a's friend list
//with a status 1, user a is now in user b's friend list with a status
//zero, user b should get a friend request

//when user b accepts user a's friend request both users status should be 2

//if user b denies user a, user b is now -1 on user a's friend list and user
//a is now -2 on user b's friend list

//if user b tries to friend user a, they automatically become friends


describe('Friend requests ', function(){
  var user0 = {
    username: 'al',
    password: '123',
    deviceToken: '121'
  };
  var user1 = {
    username: 'svnh',
    password: '234',
    deviceToken: '112'
  };
  var user2 = {
    username: 'guy',
    password: '151',
    deviceToken: '122'
  };
  var usersArray = [user0, user1];
  var userIds;
  beforeEach(function(done){
    userIds = [];
    oaktree.User.find().remove({});
    oaktree.Message.find().remove({});
    async.eachSeries(usersArray,
      function(userObj, callback){
        request(oaktree.server)
          .post('/user/new/')
          .set('content-type', 'application/json')
          .send(JSON.stringify(userObj))
          .end(function(err, res){
            // console.log('username', userObj.username);
            // console.log(res.res.text);
            userIds.push(JSON.parse(res.res.text)._id);
            callback();
          });
      },
      function(err){
            request(oaktree.server)
              .get('/friends/add/'+userIds[0]+'/'+userIds[1])
              .end(function(err, res){
                  console.log('usr', userIds);
                  done();
              });
      });
  });
  it("should add the invitee to the user's friends list with a status of 0", function(done){
    request(oaktree.server)
      .get('/friends/'+ userIds[0])
      .end(function(err, res){
        assert.equal(JSON.parse(res.res.text).length, 1);
        assert.equal(JSON.parse(res.res.text)[0]._id, userIds[1]);
        assert.equal(JSON.parse(res.res.text)[0].status, '0');
        done();
      });
  });
  it("should add the inviter to the invitee's friend list with a status of 1.", function(done){
    request(oaktree.server)
      .get('/friends/'+ userIds[1])
      .end(function(err, res){
        assert.equal(JSON.parse(res.res.text).length, 1);
        assert.equal(JSON.parse(res.res.text)[0]._id, userIds[0]);
        assert.equal(JSON.parse(res.res.text)[0].status, '1');
        done();
      });
  });
  it('should change the status to 2 for both users if the invitee accepts the friend request.', function(done){
    request(oaktree.server)
      .get('/friends/accept/'+ userIds[0]+'/'+userIds[1])
      .end(function(err, res){
        var friends = JSON.parse(res.res.text);
        assert.equal(friends[0]._id, userIds[0]);
        assert.equal(friends[0].status, '2');
        request(oaktree.server)
          .get('/friends/'+ userIds[0])
          .end(function(err, res){
            var friends = JSON.parse(res.res.text);
            assert.equal(friends[0]._id, userIds[1]);
            assert.equal(friends[0].status, '2');
            done();
          });
     });
  });
  it('should change the status 2 for both users if the invitee also adds the inviter as a friend.', function(done){
    request(oaktree.server)
      .get('/friends/add/'+ userIds[1]+'/'+userIds[0])
      .end(function(err, res){
        var friends = JSON.parse(res.res.text);
        assert.equal(friends[0]._id, userIds[0]);
        assert.equal(friends[0].status, '2');
        request(oaktree.server)
          .get('/friends/'+ userIds[0])
          .end(function(err, res){
            var friends = JSON.parse(res.res.text);
            assert.equal(friends[0]._id, userIds[1]);
            assert.equal(friends[0].status, '2');
            done();
          });
     });
  });

  // it('should have the correct statuses for all user 2', function(done){
  //   request(oaktree.server)
  //     .get('/friends/' + userIds[2])
  //     .end(function(err, res){
  //       var response = JSON.parse(res.res.text);
  //       console.log('res', JSON.parse(res.res.text));
  //       assert.equal(response[0].status, -2);
  //       assert.equal(response[1].status, -1);
  //       assert.equal(response[2].status, 2);
  //       done();
  //     });
  // });
});

// var deferred = Q.defer();
// request({
//   method: 'GET',
//   url: endPoint,
//   qs: _.extend(defaults, query) // query properties will override defaults
//   },function(error, response, body){
//     if (error) {
//       deferred.reject(error);
//     } else {
//       deferred.resolve(body);
//     }
// });
// return deferred.promise;