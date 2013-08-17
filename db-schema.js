exports.mongodb = function(){

  var mongoose = require('mongoose');

  var userSchema = mongoose.Schema({
    name: String,
    password: String
  });

  var User = mongoose.model('User', userSchema);

  return { User: User };
};