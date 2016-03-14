var net = require('net');
var debug = require('debug')('selftalk-server');

var createServer = function(port, host, opt) {
  if (!(this instanceof createServer)) {
     return new createServer(port, host, opt);
  }
  var server = null;
  var rooms = {};
  var sockets = [];
  var delimiter = new Buffer(1);
  delimiter[0] = 0xc1;

  server = net.createServer(function(socket) {
    var last = null;

    var removeSocketInChannel = function(socket) {
      //remove in channels
      var keys = Object.keys(rooms);
      for(var i in keys) {
        var arr = rooms[keys[i]];
        for (var j in arr) {
          if (socket === arr[j]) {
            arr.splice(j,1);
            break;
          }
        }

        if (rooms[keys[i]].length === 0)
          delete rooms[keys[i]];
      }

      //remove in sockets array
      for(var i in sockets) {
        if (socket === sockets[i]) {
          sockets.splice(i,1);
          break;
        }
      }
    };

    var processData = function(data) {
      try {
        var json = JSON.parse(data.toString());
        if (json.p) { //publish
          var r = json.p;
          if (!rooms.hasOwnProperty(r)) { //empty
            debug('publish canceled. no one in room : %s', r);
            return;
          }

          var arr = rooms[r] || [];
          var data ={r:r, m:json.m};
          var buffer = Buffer.concat([new Buffer(JSON.stringify(data)), delimiter]);
          for (var i in arr) {
            arr[i].write(buffer);
          }
          debug('publish done. room : %s', r);
        } else if (json.s) { //subscribe
          var r = json.s;
          if (!rooms.hasOwnProperty(r)) //empty
            rooms[r] = [];

          if (rooms[r].indexOf(socket) === -1)
            rooms[r].push(socket);

          debug('subscribe done. room : %s', r);
        } else if (json.u) { //unsubscribe
          var r = json.u;
          if (!rooms[r]) return;

          var i = rooms[r].indexOf(socket);
          if (i !== -1)
            rooms[r].splice(i,1);

          if (rooms[r].length === 0)
            delete rooms[r];

          debug('unsubscribe done. room : %s', r);
        } else {
          debug(data);
          throw new Error('unknown data');
        }
      } catch(e) {
        debug(data);
        debug(e);
      }
    };

    debug('socket connected. remotePort : %s', socket.remotePort);
    sockets.push(socket);

    socket.on('end', function() {
      debug('socket disconnected. remotePort : %s', socket.remotePort);
      removeSocketInChannel(socket);
    });

    socket.on('error', function(e){
      debug(e);
      removeSocketInChannel(socket);
    });

    socket.on('data', function(now) {
      var data = last ? Buffer.concat([last, now]) : now;
      var lastPosition = 0;
      var i = 0;

      while(i < data.length) {
        if (data[i] === 0xc1) {
          processData(data.slice(lastPosition, i))
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

    // end of createServer
  });

  server.on('error', function(e) {
    debug(e);
  });

  server.listen(port, host, function() {
    debug('selftalk listen in');
    debug(server.address());
  });
}

module.exports.createServer = createServer;