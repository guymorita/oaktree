var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;

var oaktree = require('../oaktree.js').oaktree();

var request = require('supertest');


describe('creates new user', function(){
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
        assert.equal(res.text, '"Duplicate username."');
        assert.equal(res.statusCode, "400");
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