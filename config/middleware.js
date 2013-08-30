module.exports = function(server) {
  var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Accept, Origin, Referer, User-Agent, Content-Type, Authorization');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.send(200);
    }
    else {
      next();
    }
  };

  server.configure(function() {
    server.use(allowCrossDomain);
    server.use(express.limit('8mb'));
    server.use(express.bodyParser({ keepExtensions: true, uploadDir: './tmp' }));
    server.use(server.router);
  });
};