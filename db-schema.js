exports.mongodb = function(){

  var mongoose = require('mongoose');

  var userSchema = mongoose.Schema({
    username: {type: String, lowercase: true, trim: true, index: { unique: true }},
    password: String,
    confirm_code: String,
    phone: Number,
    friends: Array,
    messages: Array
  });

  var User = mongoose.model('User', userSchema);

  var messageSchema = mongoose.Schema({
    sender_id: String,
    receiver_id: String,
    status: { type: Number, default: 0 },
    geo_lat: Number,
    geo_lon: Number,
    hidden: Boolean,
    cleared: { type: Boolean, default: false },
    title: String,
    message_body: String,
    pic_url: String,
    date: { type: Date, default: Date.now }
  });

  var Message = mongoose.model('Message', messageSchema);

  return {
    User: User,
    Message: Message
  };
};