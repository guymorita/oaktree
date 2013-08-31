exports.mongodb = function(){

  var mongoose = require('mongoose');

  var userSchema = mongoose.Schema({
    username: {type: String, lowercase: true, trim: true, index: { unique: true }},
    password: String,
    salt: String,
    confirm_code: String,
    phone: Number,
    friends: Array,
    deviceToken: String
  });

  var User = mongoose.model('User', userSchema);

  var messageSchema = mongoose.Schema({
    sender_id: {type: String, index: true},
    sender_name: {type: String},
    receiver_id: {type: String, index: true},
    latlng: Object,
    title: { type: String, default: '' },
    content: String,
    pic_url: String,
    hidden: { type: Boolean, default: false },
    status: { type: Number, default: 0 },
    sender_cleared: { type: Boolean, default: false },
    receiver_cleared: { type: Boolean, default: false },
    date: { type: Date, default: Date.now }
  });

  var Message = mongoose.model('Message', messageSchema);

  var errorSchema = mongoose.Schema({
    user_id: {type: String, index: true},
    error: {type: String},
    error_url: {type: String},
    error_line: {type: String},
    date: { type: Date, default: Date.now }
  });

  var ErrorLog = mongoose.model('ErrorLog', errorSchema);

  return {
    User: User,
    Message: Message,
    ErrorLog: ErrorLog
  };
};