//sign in using laura, she receives all of the messages

var async = require('async');
var oaktree = require('./app.js');
var request = require('supertest');

//dummy data to populate for demo
var f0 = {
  username: 'hatch',
  password: 'hatchpass',
  phone: '12063732928'
};
var f1 = {
  username: 'svnh',
  password: 'svnh',
  phone: '13840294736'
};
var f2 = {
  username: 'guy',
  password: 'guy',
  phone: '19023948372'
};
var user0 = {
  username: 'bob',
  password: 'bobpass',
  phone: '1(206)2320928'
};
var user1 = {
  username: 'tom',
  password: 'tompass',
  phone: '18301320399'
};

var user2 = {
  username: 'laura',
  password: 'laurapass',
  phone: '18496323933'
};

var user3 = {
  username: 'sally',
  password: 'sallypass',
  phone: '12183920901'
};

var defaultUsrArray = [f0, f1, f2];
var usersArray = [user0, user1, user2, user3];
var userIds = [];

userIds = [];
oaktree.User.remove({}, function(){
  oaktree.User.create(defaultUsrArray, function(err, f0, f1, f2) {
    userIds.push(f0._id);
    userIds.push(f1._id);
    userIds.push(f2._id);

  async.eachSeries(usersArray,
    function(userObj, callback){
      request(oaktree.server)
        .post('/user/new/')
        .set('content-type', 'application/json')
        .send(JSON.stringify(userObj))
        .end(function(err, res){
          userIds.push(JSON.parse(res.res.text)._id);
          callback();
        });
    },
    function(err){
      createMessages(userIds);
    });
  });
});

var createMessages = function(userIds){
  var message0 = {
    sender_id: userIds[1],
    sender_name: 'Savannah',
    deviceToken: '11',
    receiver_ids: [userIds[5]],
    title: 'hey, hey, hey!',
    content: 'world',
    latlng: {
      lat: 37.785385,
      lng: -122.429747
    }
  };
  var message1 = {
    sender_id: userIds[1],
    sender_name: 'Savannah',
    deviceToken: '12121',
    receiver_ids: [userIds[5]],
    title: 'sup dude',
    content: 'you know how it is',
    latlng: {
      lat: 37.760317,
      lng: -122.426845
    }
  };
  var message2 = {
    sender_id: userIds[0],
    sender_name: 'Guy',
    deviceToken: '121',
    receiver_ids: [userIds[5]],
    title: 'shalom princess',
    content: 'wassup',
    latlng: {
      lat: 58,
      lng: -82
    }
  };
  var message3 = {
    sender_id: userIds[0],
    sender_name: 'Guy',
    deviceToken: '121',
    receiver_ids: [userIds[5]],
    title: 'lol look at this!!!!',
    content: 'super funny pic',
    latlng: {
      lat: 37.792355,
      lng: -122.411889
    }
  };
  var message4 = {
    sender_id: userIds[5],
    sender_name: 'Laura',
    deviceToken: '121',
    receiver_ids: [userIds[0]],
    title: 'have fun at the gym!',
    content: 'wahhoooo',
    latlng: {
      lat: 37.783715,
      lng: -122.408976
    }
  };
  var message5 = {
    sender_id: userIds[5],
    sender_name: 'Laura',
    deviceToken: '121',
    receiver_ids: [userIds[0]],
    title: 'hope you enjoy this',
    content: 'check it out',
    latlng: {
      lat: 37.784775,
      lng: -122.402490
    }
  };
  var message6 = {
    sender_id: userIds[1],
    sender_name: 'Savannah',
    deviceToken: '121',
    receiver_ids: [userIds[5]],
    title: 'have a nice day',
    content: 'in the city',
    latlng: {
      lat: 37.780501,
      lng: -122.432081
    }
  };
  var message7 = {
    sender_id: userIds[0],
    sender_name: 'Guy',
    deviceToken: '121',
    receiver_ids: [userIds[5]],
    title: 'enjoy',
    content: 'this gift I bought you',
    latlng: {
      lat: 37.783079,
      lng: -122.414142
    }
  };
  var message8 = {
    sender_id: userIds[1],
    sender_name: 'Savannah',
    deviceToken: '121',
    receiver_ids: [userIds[5]],
    title: 'don\'t forget to buy this at the store',
    content: 'milk',
    latlng: {
      lat: 37.783085,
      lng: -122.414140
    }
  };
  var message9 = {
    sender_id: userIds[5],
    sender_name: 'Laura',
    deviceToken: '121',
    receiver_ids: [userIds[1]],
    title: 'so excited to see you here',
    content: 'at the zoo',
    latlng: {
      lat: 37.78309,
      lng: -122.41410
    }
  };
  var message10 = {
    sender_id: userIds[5],
    sender_name: 'Laura',
    deviceToken: '121',
    receiver_ids: [userIds[0]],
    title: 'you have to see this',
    content: 'cool stuff',
    latlng: {
      lat: 37.78775,
      lng: -122.2490
    }
  };


  var messageArray = [message0, message1, message2, message3, message4, message5, message6, message7, message8, message9, message10];
  var messageRes = [];
  oaktree.Message.remove({}, function(){
    messageRes = [];
    async.eachSeries(messageArray,
      function(message, callback){
        request(oaktree.server)
          .post('/message/')
          .set('content-type', 'application/json')
          .send(JSON.stringify(message))
          .end(function(err, res){
            messageRes.push(JSON.parse(res.res.text)[0]._id);
            callback();
          });
      },
      function(err){
        if (err){
          console.log('error in populating dummy msgs: ', err);
        } else {
          console.log('populated dummy messages');
        }
      });
  });
};