var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;

var oaktree = require('../oaktree.js').oaktree();

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
    oaktree.User.findOne({name:'bob'}, function(err, res){
      assert.equal(res.name, 'bob');
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
        assert.equal(res.text, '"Duplicate username."');
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
  var message_id = 1;
  beforeEach(function(done){
    oaktree.Message.find().remove({});
    request(oaktree.server)
      .get('/message/send/132/555/helloworld')
      .end(function(err, res){
        message_id = res.body._id;
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
        assert.equal(item.message_body, "helloworld");
        assert.notEqual(item.message_body, "hello");
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
  var message1_id, message2_id, message3_id;
  beforeEach(function(done){
    oaktree.Message.find().remove({});
    request(oaktree.server).get('/message/send/132/555/helloworld')
      .end(function(err, res){
        message1_id = res.body._id;
        request(oaktree.server).get('/message/send/111/555/helloworld2')
          .end(function(err, res){
            message2_id = res.body._id;
            request(oaktree.server).get('/message/send/111/5/notfor555')
              .end(function(err, res){
                message3_id = res.body._id;
                done();
              });
          });
      });
  });
  it('should retrieve messages.', function(done){
    request(oaktree.server).get('/message/retrieve/555')
      .end(function(err, res){
        expect(res.body.length).to.eql(2);
        assert.equal(res.body[0]._id, message1_id);
        assert.equal(res.body[1]._id, message2_id);
        assert.notEqual(res.body[0]._id, message2_id);
        done();
      });
  });
  it('should retrieve both read and unread messages.', function(done){
    this.timeout(5000);
    oaktree.Message.update({_id: message1_id}, {$set: {status: 1}}, function(err, count) {
      if(count === 1) {
        request(oaktree.server).get('/message/retrieve/555')
            .end(function(err, res){
              expect(res.body.length).to.eql(2);
              assert.equal(res.body[0]._id, message1_id);
              assert.equal(res.body[1]._id, message2_id);
              assert.notEqual(res.body[0]._id, message2_id);
              done();
            });
      }
    });
  });
  it('should not retrieve cleared messages.', function(done){
    this.timeout(5000);
    oaktree.Message.update({_id: message1_id}, {$set: {cleared: true}}, function(err, count) {
      if(count === 1) {
        request(oaktree.server).get('/message/retrieve/555')
            .end(function(err, res){
              expect(res.body.length).to.eql(1);
              assert.notEqual(res.body[0]._id, message1_id);
              assert.equal(res.body[0]._id, message2_id);
              done();
            });
      }
    });
  });
});