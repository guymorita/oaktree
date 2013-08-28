var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;
var async = require('async');

var oaktree = require('../lib/oaktree.js').oaktree();

var request = require('supertest');


describe('New user creation', function(){
  beforeEach(function(done){
    oaktree.User.find().remove({});
    request(oaktree.server)
      .get('/user/new/bob/bobpass')
      .end(function(err, res){
        done();
      });
  });
  it('should create a new user when it receives a get request for a new user', function(done){
    oaktree.User.findOne({username:'bob'}, function(err, res){
      assert.equal(res.username, 'bob');
      done();
    });
  });
  it('should return an error code if a username already exists', function(done){
    request(oaktree.server)
      .get('/user/new/bob/bobpass22')
      .end(function(err, res){
        assert.equal(res.statusCode, "400");
        done();
    });
  });
  it('should return an error message if a username already exists', function(done){
    request(oaktree.server)
      .get('/user/new/bob/bobpass22')
      .end(function(err, res){
        assert.equal(res.text, "Username already exists, please choose another name.");
        done();
    });
  });
});

describe('User login', function(){
  beforeEach(function(done){
    oaktree.User.find().remove({});
    request(oaktree.server)
      .get('/user/new/bob/bobpass')
      .end(function(err, res){
        done();
      });
  });
  it('should return status code 200 when a user provides a valid user/password combination', function(done){
    request(oaktree.server)
      .get('/user/login/bob/bobpass')
      .end(function(err, res){
        assert.equal(res.statusCode, "200");
        done();
    });
  });
  it('should return status code 401 when a user provides a invalid user/password combination', function(done){
    request(oaktree.server)
      .get('/user/login/bob/bobpassddd')
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
    sender_name: 'Savannah',
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
        done();
      }
      );
  });
  it('should retrieve messages for the user.', function(done){
    request(oaktree.server).get('/message/retrieve/555')
      .end(function(err, res){
        expect(JSON.parse(res.res.text).inbox.length).to.eql(2);
        assert.equal(JSON.parse(res.res.text).inbox[1]._id, messageRes[0]);
        assert.equal(JSON.parse(res.res.text).inbox[0]._id, messageRes[1]);
        assert.equal(JSON.parse(res.res.text).inbox[1].receiver_id, 555);
        assert.notEqual(JSON.parse(res.res.text).inbox[1]._id, messageRes[1]);
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
        assert.equal(resInbox[0]._id, messageRes[1]);
        assert.equal(resInbox[1]._id, messageRes[0]);
        assert.equal(resInbox[1].status, 1);
        assert.equal(resInbox[0].status, 0);
        done();
      });
  });
  it('should not affect message retrieval count.', function(done){
    request(oaktree.server).get('/message/retrieve/555')
      .end(function(err, res){
        expect(JSON.parse(res.res.text).inbox.length).to.eql(2);
        assert.equal(JSON.parse(res.res.text).inbox[0]._id, messageRes[1]);
        assert.equal(JSON.parse(res.res.text).inbox[1]._id, messageRes[0]);
        done();
      });
  });
});