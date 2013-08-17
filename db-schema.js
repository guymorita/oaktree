exports.mongodb = function(){

  var mongoose = require('mongoose');

  var userSchema = mongoose.Schema({
    name: {type: String, index: { unique: true }},
    password: String
  });

  var User = mongoose.model('User', userSchema);

  return { User: User };
};