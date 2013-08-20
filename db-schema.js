exports.mongodb = function(){

  var mongoose = require('mongoose');

  var userSchema = mongoose.Schema({
    username: {type: String, lowercase: true, trim: true, index: { unique: true }},
    password: String,
    confirm_code: String,
    phone: Number,
    friends: Array
  });

  var User = mongoose.model('User', userSchema);

  var messageSchema = mongoose.Schema({
    sender_id: {type: String, index: true},
    receiver_id: {type: String, index: true},
    status: { type: Number, default: 0 },
    geo_lat: Number,
    geo_lon: Number,
    hidden: Boolean,
    cleared: { type: Boolean, default: false },
    title: String,
    content: String,
    pic_url: String,
    date: { type: Date, default: Date.now }
  });

  var Message = mongoose.model('Message', messageSchema);

  return {
    User: User,
    Message: Message
  };
};