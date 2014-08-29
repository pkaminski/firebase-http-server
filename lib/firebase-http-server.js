var fs = require('fs'),
    path = require('path'),
    colors = require('colors'),
    union = require('union'),
    ecstatic = require('ecstatic'),
    minimatch = require('minimatch');

var HTTPServer = exports.HTTPServer = function(options) {

  var firebaseConfig;
  function parseFirebaseConfig() {
    firebaseConfig = JSON.parse(fs.readFileSync(options.firebaseJson));
  }

  function addCustomHeaders(originalUrl, setHeader) {
    firebaseConfig.headers.forEach(function(header) {
      if (minimatch(originalUrl, header.source)) {
        header.headers.forEach(function(headerPair) {
          setHeader(headerPair.key, headerPair.value);
        });
      }
    });
  }

  fs.watch(options.firebaseJson, {persistent: false}, function() {
    if (fs.existsSync(options.firebaseJson)) parseFirebaseConfig();
  });
  parseFirebaseConfig();
  this.root = options.root ||
    path.resolve(path.dirname(options.firebaseJson), firebaseConfig.public) || './';

  this.server = union.createServer({
    before: [
      function(req, res) {
        if (firebaseConfig.headers) {
          var originalSetHeader = res.setHeader.bind(res);
          res.setHeader = function(key, value) {
            originalSetHeader(key, value);
            // Hack: ecstatic will set cache-control at just the right time when serving response
            if (key === 'cache-control') addCustomHeaders(req.originalUrl, originalSetHeader);
          };
        }
        if (options.logFn) options.logFn(req, res);
        if (firebaseConfig.redirect) {
          for (var i = 0; i < firebaseConfig.redirect.length; i++) {
            var redirect = firebaseConfig.redirect[i];
            if (minimatch(req.url, redirect.source)) {
              options.log(
                'redirect with '.yellow + redirect.type.toString().cyan + ' to '.yellow +
                redirect.destination.cyan);
              res.statusCode = redirect.type;
              res.setHeader('location', redirect.destination);
              return res.end();
            }
          }
        }
        if (firebaseConfig.ignore && firebaseConfig.ignore.some(function(glob) {
          return minimatch(req.url, '/' + glob);
        })) {
          options.log('ignore '.yellow + ' ' + req.url.cyan);
          req.url = '/***bogus***';
        }
        res.emit('next');
      },
      ecstatic({
        root: this.root,
        cache: 3600,
        showDir: false,
        autoIndex: true,
        handleError: false,
      }),
      function(req, res) {
        if (firebaseConfig.rewrites) {
          for (var j = 0; j < firebaseConfig.rewrites.length; j++) {
            var rewrite = firebaseConfig.rewrites[j];
            if (minimatch(req.originalUrl, rewrite.source)) {
              options.log('rewrite to '.yellow + rewrite.destination.cyan);
              req.url = rewrite.destination;
              res.statusCode = 200;
              break;
            }
          }
        }
        res.emit('next');
      },
      ecstatic({
        root: this.root,
        cache: 3600,
        showDir: false,
        autoIndex: true,
        handleError: false,
      }),
      function(req, res) {
        res.statusCode = 404;
        req.url = req.originalUrl = '/404.html';
        res.emit('next');
      },
      ecstatic({
        root: this.root,
        cache: 3600,
        showDir: false,
        autoIndex: true,
        handleError: false,
      }),
    ]
  });

  return this;
};

HTTPServer.prototype.listen = function() {
  this.server.listen.apply(this.server, arguments);
};

HTTPServer.prototype.close = function() {
  return this.server.close();
};

exports.createServer = function (options) {
  return new HTTPServer(options);
};
