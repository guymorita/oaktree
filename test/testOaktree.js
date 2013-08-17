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
});