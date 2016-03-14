var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('selftalk-client');
var util = require('util');
var net = require('net');


var createClient = function(port, host) {
  if (!(this instanceof createClient)) {
     return new createClient(port, host);
  }
  EventEmitter.call(this);
  var self = this;
  var host = host || '127.0.0.1';
  var delimiter = new Buffer(1);
  delimiter[0] = 0xc1;

  var last = null;
  this.client = net.connect({port: port, host: host}, function() {
    debug('client connected');
    self.emit('connect');
  });

  this.client.on('data', function(now) {
    //debug(now.toString());
    var data = last ? Buffer.concat([last, now]) : now;
    var lastPosition = 0;
    var i = 0;

    while(i < data.length) {
      if (data[i] === 0xc1) {
        try {
          var json = JSON.parse(data.slice(lastPosition, i).toString());
          self.emit('message', json.r, json.m )
        } catch(e) {
          debug(e);
          self.emit('error', new Error('unknown data received'));
        }

        lastPosition = ++i;
      }
      i++;
    }

    if (lastPosition === 0) {
      last = data;
    } else {
      if (lastPosition < data.length)
        last = data.slice(lastPosition, data.length);
      else
        last = null;
    }
  });

  this.client.on('error', function(e) {
    debug('client error');
    self.emit('error', e);
  });

  this.client.on('end', function() {
    debug('client disconnected');
    self.emit('disconnect');
  });

  this.publish = function(room, msg) {
    var data = {p : room, m : msg};

    return this.client.write(Buffer.concat([new Buffer(JSON.stringify(data)), delimiter]));
  };

  this.subscribe = function(room, cb) {
    var data = {s : room};

    // FIXME : checking more
    if (!this.client.writable)
      return cb(new Error('not writable'));

    return this.client.write(Buffer.concat([new Buffer(JSON.stringify(data)), delimiter]), function(){
      return cb(null);  //FIXME : wrong cb
    });
  }

  this.unsubscribe = function(room, cb) {
    var data = {u : room};

    // FIXME : checking more
    if (!this.client.writable)
      return cb(new Error('not writable'));

    return this.client.write(Buffer.concat([new Buffer(JSON.stringify(data)), delimiter]), function(){
      return cb(null);  //FIXME : wrong cb
    });
  }
}
util.inherits(createClient, EventEmitter);

module.exports.createClient = createClient;