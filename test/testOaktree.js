var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;
var async = require('async');
var Q = require('q');

var oaktree = require('../app.js');

var request = require('supertest');

/*
describe('New user creation', function(){
  var f0 = {
    username: 'hatch',
    password: 'hatchpass'
  };
  var f1 = {
    username: 'svnh',
    password: 'svnh'
  };
  var f2 = {
    username: 'guy',
    password: 'guy'
  };
  var user0 = {
    username: 'bob',
    password: 'bobpass'
  };

  var usersArray = [f0, f1, f2];
  var userIds = [];

  beforeEach(function(done){
    userIds = [];
    oaktree.User.remove({}, function(){
      oaktree.User.create(usersArray, function(err, f0, f1, f2) {
        userIds.push(f0._id);
        userIds.push(f1._id);
        userIds.push(f2._id);

        request(oaktree.server)
          .post('/user/new/')
          .set('content-type', 'application/json')
          .send(JSON.stringify(user0))
          .end(function(err, res){
            userIds.push(JSON.parse(res.text)._id);
            done();
          });
      });
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
      .send(JSON.stringify(user0))
      .end(function(err, res){
        assert.equal(res.statusCode, "400");
        done();
    });
  });
  it('should return an existing user message if a username already exists', function(done){
    request(oaktree.server)
      .post('/user/new/')
      .set('content-type', 'application/json')
      .send(JSON.stringify(user0))
      .end(function(err, res){
        assert.equal(res.text, "Username already exists, please choose another name.");
        done();
    });
  });
  it('should automatically prepend a "1" to a 10-digit phone number.', function(done){
    var newUser = {
      username: 'phonetest',
      password: 'capncruch',
      phone: '5556661212'
    };
    request(oaktree.server)
      .post('/user/new/')
      .set('content-type', 'application/json')
      .send(JSON.stringify(newUser))
      .end(function(err, res){
        assert.equal(res.body.phone, '15556661212');
        done();
    });
  });
  it('should strip non-numbers from phone numbers.', function(done){
    var newUser = {
      username: 'phonetest2',
      password: 'capncruch',
      phone: '555-666.1212'
    };
    request(oaktree.server)
      .post('/user/new/')
      .set('content-type', 'application/json')
      .send(JSON.stringify(newUser))
      .end(function(err, res){
        assert.equal(res.body.phone, '15556661212');
        done();
    });
  });
  it('should automatically friend the user to svnh, guy, and hatch', function(done){
    var tomasUser = {
      username: 'tomas',
      password: 'capncruch'
    };
    request(oaktree.server)
      .post('/user/new/')
      .set('content-type', 'application/json')
      .send(JSON.stringify(tomasUser))
      .end(function(err, res){
      var tomasId = res.body._id;

        // using a settimeout because the server needs time to auto-friend
      setTimeout(function(){
        request(oaktree.server)
          .get('/friends/' + tomasId)
          .end(function(err, res){
            var friends = res.body;
            assert.equal(friends.length, 3);
            assert.equal(friends[0].status, '2');
            assert.equal(friends[1].status, '2');
            assert.equal(friends[2].status, '2');
            done();
          });
      }, 800);
    });
  });
});


describe('User login', function(){
  oaktree.User.find().remove({});
  var user2 = {
    username: 'tom',
    password: 'tompass'
  };
  before(function(done){
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
  it('should return status code 401 when a user provides the wrong password', function(done){
    var wrongPass = {
      username: 'tom',
      password: 'password'
    };

    request(oaktree.server)
      .post('/user/login/')
      .set('content-type', 'application/json')
      .send(JSON.stringify(wrongPass))
      .end(function(err, res){
        assert.equal(res.statusCode, "401");
        done();
    });
  });
  it('should also return status code 401 when a user provides an invalid username', function(done){
    var invalidUser = {
      username: 'decartes',
      password: 'cogitoergosum'
    };

    request(oaktree.server)
      .post('/user/login/')
      .set('content-type', 'application/json')
      .send(JSON.stringify(invalidUser))
      .end(function(err, res){
        assert.equal(res.statusCode, "401");
        done();
    });
  });
});


describe('Sent messages', function(){
  var message = {
    sender_id: 666,
    sender_name: 'al',
    receiver_ids: [555],
    content: "message from al",
    title: "hi harro prease?",
    latlng: {"lat":37.785385,"lng":-122.429747}
  };
  var message_id = null;
  before(function(done){
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
      assert.equal(item.sender_id, '666');
      assert.notEqual(item.sender_id, '555');
      done();
    });
  });
  it('should embed the correct receiver id to the message', function(done){
    oaktree.Message.findOne({_id: message_id }, function(err, item) {
      assert.equal(item.receiver_id, '555');
      assert.notEqual(item.receiver_id, '666');
      done();
    });
  });
  it('should embed the correct message content', function(done){
      oaktree.Message.findOne({_id: message_id }, function(err, item) {
        assert.equal(item.content, "message from al");
        assert.notEqual(item.content, "hi harro prease?");
        done();
      });
  });
  it('should initialise the message to unread', function(done){
      oaktree.Message.findOne({_id: message_id }, function(err, item) {
        assert.equal(item.status, 0);
        done();
      });
  });
  it('should not be cleared', function(done){
      oaktree.Message.findOne({_id: message_id }, function(err, item) {
        assert.equal(item.cleared, false);
        done();
      });
  });
  it('should be able to send to multiple users', function(done){
    var multi = {
      sender_id: 666,
      sender_name: 'al',
      receiver_ids: [77, 88],
      content: "greetings 77 and 88!",
      title: "hello to two",
      latlng: {"lat":37.785385,"lng":-122.429747}
    };

    setTimeout(function(){
    request(oaktree.server)
      .post('/message/')
      .set('content-type', 'application/json')
      .send(JSON.stringify(multi))
      .end(function(err, res){
        oaktree.Message.findOne({receiver_id: '77' }, function(err, item) {
          assert.equal(item.sender_id, '666');
          assert.notEqual(item.sender_id, '88');
          assert.equal(item.content, 'greetings 77 and 88!');

          request(oaktree.server)
            .post('/message/')
            .set('content-type', 'application/json')
            .send(JSON.stringify(multi))
            .end(function(err, res){
              oaktree.Message.findOne({receiver_id: '88' }, function(err, item) {
                assert.equal(item.sender_id, '666');
                assert.notEqual(item.sender_id, '77');
                assert.equal(item.content, 'greetings 77 and 88!');
                done();
              });
            });
        });
      });
    }, 500);
  });
});

describe('Retrieve messages', function(){
  var message0 = {
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
  var message1 = {
    sender_id: 666,
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
  var message2 = {
    sender_id: 111,
    sender_name: 'Savannah',
    deviceToken: '121',
    receiver_ids: [5],
    title: 'not for 555',
    content: 'test',
    latlng: {
      lat: 58,
      lng: -82
    }
  };
  var message3 = {
    sender_id: 111,
    sender_name: 'Savannah',
    deviceToken: '121',
    receiver_ids: [555, 777],
    title: 'super duper',
    content: 'test',
    latlng: {
      lat: 58,
      lng: -82
    }
  };
  var messageArray = [message0, message1, message2, message3];
  var messageRes = [];
  beforeEach(function(done){
    oaktree.Message.remove({}, function(){
      messageRes = [];
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
        });
    });
  });
  it('should retrieve messages for the user.', function(done){
    request(oaktree.server).get('/message/retrieve/555')
        .end(function(err, res){
          expect(JSON.parse(res.res.text).inbox.length).to.eql(3);
          assert.notEqual(JSON.parse(res.res.text).inbox[0]._id, messageRes[2]);
          assert.notEqual(JSON.parse(res.res.text).inbox[1]._id, messageRes[2]);
          assert.notEqual(JSON.parse(res.res.text).inbox[2]._id, messageRes[2]);
          assert.equal(JSON.parse(res.res.text).inbox[0].receiver_id, '555');
          assert.equal(JSON.parse(res.res.text).inbox[1].receiver_id, '555');
          assert.equal(JSON.parse(res.res.text).inbox[2].receiver_id, '555');
          done();
        });
  });
  it('should retrieve both read and unread messages.', function(done){
    oaktree.Message.update({_id: messageRes[0]}, {$set: {status: 1}}, function(err, count) {
      if(count === 1) {
        request(oaktree.server).get('/message/retrieve/555')
            .end(function(err, res){
              expect(JSON.parse(res.res.text).inbox.length).to.eql(3);
              assert.notEqual(JSON.parse(res.res.text).inbox[0]._id, messageRes[2]);
              assert.notEqual(JSON.parse(res.res.text).inbox[1]._id, messageRes[2]);
              assert.notEqual(JSON.parse(res.res.text).inbox[2]._id, messageRes[2]);
              assert.equal(JSON.parse(res.res.text).inbox[0].receiver_id, '555');
              assert.equal(JSON.parse(res.res.text).inbox[1].receiver_id, '555');
              assert.equal(JSON.parse(res.res.text).inbox[2].receiver_id, '555');
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
              expect(JSON.parse(res.res.text).inbox.length).to.eql(2);
              assert.notEqual(JSON.parse(res.res.text).inbox[0]._id, messageRes[0]);
              assert.notEqual(JSON.parse(res.res.text).inbox[0]._id, messageRes[0]);
              done();
            });
      }
    });
  });
});


describe('Read messages', function(){
  var message0 = {
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
  var message1 = {
    sender_id: 666,
    sender_name: 'Al',
    receiver_ids: [555],
    title: 'sup dude',
    content: 'you know how it is',
    latlng: {
      lat: 23,
      lng: -84
    }
  };
  var message2 = {
    sender_id: 666,
    sender_name: 'Al',
    receiver_ids: [5],
    title: 'super duper',
    content: 'test',
    latlng: {
      lat: 58,
      lng: -82
    }
  };
  var messageArray = [message0, message1, message2];
  var messageRes = [];
  before(function(done){
    oaktree.Message.remove({}, function(){
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
          if(resInbox[i].sender_id === '666') {
            al_index = i;
          }
        }

        assert.equal(resInbox[guy_index]._id, messageRes[0]);
        assert.equal(resInbox[al_index]._id, messageRes[1]);
        assert.equal(resInbox[guy_index].status, '1');
        assert.equal(resInbox[al_index].status, '0');
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


describe('Friend requests', function(){
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
  it('should change the status 2 for both users if the invitee also requests the inviter as a friend.', function(done){
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
  it('should change the status -2 for the inviter if the invitee denies the friend request.', function(done){
    request(oaktree.server)
      .get('/friends/deny/'+ userIds[0] +'/'+ userIds[1])
      .end(function(err, res){
        var friends = JSON.parse(res.res.text);
        assert.equal(friends[0]._id, userIds[0]);
        assert.equal(friends[0].status, '-2');
        done();
     });
  });
  it("should change the status to -1 for the invitee on the inviter's friend list if the invitee rejects the friend request.", function(done){
    request(oaktree.server)
      .get('/friends/deny/'+ userIds[0] +'/'+ userIds[1])
      .end(function(err, res){
        request(oaktree.server)
          .get('/friends/'+ userIds[0])
          .end(function(err, res){
            var friends = JSON.parse(res.res.text);
            assert.equal(friends[0]._id, userIds[1]);
            assert.equal(friends[0].status, '-1');
            done();
          });
     });
  });
  it("should change the status 2 for both users (make them friends) if the invitee friends a previously denied inviter.", function(done){
    request(oaktree.server)
      .get('/friends/deny/'+ userIds[0] +'/'+ userIds[1])
      .end(function(err, res){
        request(oaktree.server)
          .get('/friends/add/'+ userIds[1] +'/'+ userIds[0])
          .end(function(err, res){
            var friends = JSON.parse(res.res.text);
            console.log("NAMMME?", friends[0].username);
            assert.equal(friends[0]._id, userIds[0]);
            assert.equal(friends[0].status, '2');
            done();
          });
     });
  });
});
*/

describe('Phone contacts find', function(){

  var phoneBook = {
    contacts: [
      {
        name: 'guy',
        phoneNumbers: [
          {
            type: 'mobile',
            value: '12095552121'
          },
          {
            type: 'work',
            value: '1.415.555.1212'
          }
        ]
      },
      {
        name: 'savannah',
        phoneNumbers: [
          {
            type: 'mobile',
            value: '1 (209) 555-1212'
          }
        ]
      }
    ]
  };

  var f0 = {
    username: 'hatch',
    password: 'hatchpass',
    phone: '12125551212'
  };
  var f1 = {
    username: 'svnh',
    password: 'svnh',
    phone: '12095551212'
  };
  var f2 = {
    username: 'guy',
    password: 'guy',
    phone: '12095552121'
  };
  var user0 = {
    username: 'notinyourbook',
    password: 'anonymous',
    phone: '14152225555'
  };

  var usersArray = [f0, f1, f2, user0];
  var userIds = [];

  before(function(done){
    oaktree.User.remove({}, function(){
      oaktree.User.create(usersArray, function(err, f0, f1, f2, user0) {
        userIds.push(f0._id);
        userIds.push(f1._id);
        userIds.push(f2._id);
        userIds.push(user0._id);
        done();
      });
    });
  });
  it("should return a list of hatch users were are on a person's contact list.", function(done){
    request(oaktree.server)
      .post('/user/phonefind/')
      .set('content-type', 'application/json')
      .send(JSON.stringify(phoneBook))
      .end(function(err, res){
        var friends = res.body;
        assert.equal(friends.length, 2);
        assert.notEqual(friends[0].username, 'notinyourbook');
        assert.notEqual(friends[1].username, 'notinyourbook');
        done();
      });
  });
  it("should be able to accept phone numbers in a multitude of formats.", function(done){
    var alObj = {
      name: 'al',
      phoneNumbers: [
        {
          type: 'mobile',
          value: '+1.212.555.1212'
        },
        {
          type: 'home',
          value: '(510) 555-1212'
        }
      ]
    };
    phoneBook.contacts.push(alObj);

    request(oaktree.server)
      .post('/user/phonefind/')
      .set('content-type', 'application/json')
      .send(JSON.stringify(phoneBook))
      .end(function(err, res){
        var friends = res.body;
        assert.equal(friends.length, 3);
        assert.notEqual(friends[0].username, 'notinyourbook');
        assert.notEqual(friends[1].username, 'notinyourbook');
        assert.notEqual(friends[2].username, 'notinyourbook');
        done();
      });
  });
  it("should return no matches if a user's contacts are not already members.", function(done){
    var noMatches = {
      contacts: [
        {
          name: 'johnsmith',
          phoneNumbers: [
            {
              type: 'mobile',
              value: '12223334444'
            }
          ]
        },
        {
          name: 'not the awesomest savannah',
          phoneNumbers: [
            {
              type: 'mobile',
              value: '1 (209) 222-5555'
            }
          ]
        }
      ]
    };

    request(oaktree.server)
      .post('/user/phonefind/')
      .set('content-type', 'application/json')
      .send(JSON.stringify(noMatches))
      .end(function(err, res){
        assert.equal(res.body.length, 0);
        done();
      });
  });
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