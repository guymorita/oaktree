exports.mongodb = function(){

  var mongoose = require('mongoose');

  var userSchema = mongoose.Schema({
    username: {type: String, lowercase: true, trim: true, index: { unique: true }},
    password: String,
    confirm_code: String,
    phone: Number,
    friends: Array,
    deviceToken: String
  });

  var User = mongoose.model('User', userSchema);

  var messageSchema = mongoose.Schema({
    sender_id: {type: String, index: true },
    receiver_id: {type: String, index: true },
    latlng: Object,
    title: { type: String, default: '' },
    content: String,
    pic_url: String,
    hidden: { type: Boolean, default: false },
    status: { type: Number, default: 0 },
    cleared: { type: Boolean, default: false },
    date: { type: Date, default: Date.now }
  });

  var Message = mongoose.model('Message', messageSchema);

  return {
    User: User,
    Message: Message
  };
};