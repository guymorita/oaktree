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

describe('Messages', function(){
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
    // oaktree.User.findOne({name:'bob'}, function(err, res){
      oaktree.Message.findOne({_id: message_id }, function(err, item) {
        assert.equal(item.sender_id, 132);
        done();
      });
  });
  it('should embed the correct receiver id to the message', function(done){
    // oaktree.User.findOne({name:'bob'}, function(err, res){
      oaktree.Message.findOne({_id: message_id }, function(err, item) {
        assert.equal(item.receiver_id, 555);
        done();
      });
  });
  it('should embed the correct message', function(done){
    // oaktree.User.findOne({name:'bob'}, function(err, res){
      oaktree.Message.findOne({_id: message_id }, function(err, item) {
        assert.equal(item.message_body, "helloworld");
        done();
      });
  });
  // it('should embed the correct receipient id to the message', function(done){
  //   request(oaktree.server)
  //     .get('/user/login/bob/bobpassddd')
  //     .end(function(err, res){
  //       assert.equal(res.statusCode, "401");
  //       done();
  //   });
  // });
});