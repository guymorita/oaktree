var ErrorLog = module.exports = {};

ErrorLog.newError = function(req, res) {
  var user_id = req.params.user_id;
  var error = req.body.error || req.body;

  var errorObj = {
    user_id: user_id,
    error: error
  };

  var dt = new Date();
  var dtString = dt.getMonth() +'.'+ dt.getDate() +' '+ dt.getHours() +':'+ dt.getMinutes() +':'+ dt.getSeconds();

  var errorz = new db.ErrorLog(errorObj);
  errorz.save(function(err, item) {
    if(err) {
      console.log('Logging error, error:', err);
      res.send(500, 'Error not logged.');
    } else if(item) {
      console.log(dtString + ': Logged error for: User '+ item.user_id + ' ('+ item._id +')');
      res.send(201, 'Error logged, thanks.');
    } else {
      console.log("wtf, didn't log error..");
      res.send(500, 'Error not logged.');
    }
  });
};