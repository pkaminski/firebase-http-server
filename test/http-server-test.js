var assert = require('assert'),
    path = require('path'),
    fs = require('fs'),
    vows = require('vows'),
    request = require('request'),
    httpServer = require('../lib/firebase-http-server');

var firebaseJson = path.join(__dirname, 'fixtures', 'firebase.json');

function callbackWithFile(filename) {
  return function(res, body) {
    var self = this;
    fs.readFile(
      path.join(__dirname, 'fixtures', 'root', filename), 'utf8', function(err, data) {
        self.callback(err, data, body);
      }
    );
  };
}

vows.describe('http-server').addBatch({
  'When http-server is listening on 8080': {
    topic: function () {
      var server = httpServer.createServer({
        firebaseJson: firebaseJson,
        log: function() {},
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true'
        }
      });
      server.listen(8080);
      this.callback(null, server);
    },
    'it should serve files from root directory': {
      topic: function() {
        request('http://127.0.0.1:8080/file', this.callback);
      },
      'status code should be 200': function(res) {
        assert.equal(res.statusCode, 200);
      },
      'cache-control header should have default age': function(res) {
        assert.equal(res.headers['cache-control'], 'max-age=3600');
      },
      'and file content': {
        topic: callbackWithFile('file'),
        'should match content of served file': function(err, file, body) {
          assert.equal(file.trim(), body.trim());
        }
      }
    },
    'when requesting non-existent file': {
      topic: function() {
        request('http://127.0.0.1:8080/404', this.callback);
      },
      'status code should be 404': function(res) {
        assert.equal(res.statusCode, 404);
      },
      'the 404.html file': {
        topic: callbackWithFile('404.html'),
        'should be served instead': function(err, file, body) {
          assert.equal(file.trim(), body.trim());
        }
      }
    },
    'when requesting redirected file': {
      topic: function() {
        request({url: 'http://127.0.0.1:8080/from/bah/a.js', followRedirect: false}, this.callback);
      },
      'status code should be 302 and location should be destination': function(res) {
        assert.equal(res.statusCode, 302);
        assert.equal(res.headers.location, '/to');
      },
    },
    'when requesting ignored file': {
      topic: function() {
        request('http://127.0.0.1:8080/canYouSeeMe', this.callback);
      },
      'status code should be 404': function(res) {
        assert.equal(res.statusCode, 404);
      }
    },
    'when requesting ignored rewritten file': {
      topic: function() {
        request('http://127.0.0.1:8080/canYouSeeMe2', this.callback);
      },
      'status code should be 200': function(res) {
        assert.equal(res.statusCode, 200);
      },
      'the destination file': {
        topic: callbackWithFile('file'),
        'should be served instead': function(err, file, body) {
          assert.equal(file.trim(), body.trim());
        }
      }
    },
    'when requesting missing rewritten file': {
      topic: function() {
        request('http://127.0.0.1:8080/something/or/other/foo', this.callback);
      },
      'status code should be 200': function(res) {
        assert.equal(res.statusCode, 200);
      },
      'the destination file': {
        topic: callbackWithFile('file'),
        'should be served instead': function(err, file, body) {
          assert.equal(file.trim(), body.trim());
        }
      }
    },
    'when requesting missing file rewritten to missing file': {
      topic: function() {
        request('http://127.0.0.1:8080/something/bar/or/other', this.callback);
      },
      'status code should be 404': function(res) {
        assert.equal(res.statusCode, 404);
      },
      'the 404.html file': {
        topic: callbackWithFile('404.html'),
        'should be served instead': function(err, file, body) {
          assert.equal(file.trim(), body.trim());
        }
      }
    },
    'when requesting existing file': {
      topic: function() {
        request('http://127.0.0.1:8080/404.html', this.callback);
      },
      'custom headers are added': function(res) {
        assert.equal(res.headers['cache-control'], 'max-age=7200');
      }
    },
    'when requesting rewritten file': {
      topic: function() {
        request('http://127.0.0.1:8080/foo', this.callback);
      },
      'custom headers are added based on original url': function(res) {
        assert.equal(res.headers['access-control-allow-origin'], '*');
      }
    },
    'when requesting missing file': {
      topic: function() {
        request('http://127.0.0.1:8080/missing', this.callback);
      },
      'custom headers are added based on 404.html': function(res) {
        assert.equal(res.headers['cache-control'], 'max-age=7200');
      }
    }
  }
}).export(module);
