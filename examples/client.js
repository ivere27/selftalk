var crypto = require('crypto');
var selftalk = require('..').createClient;
var debug = require('debug')('client');

var client = selftalk(6378);

var stress = null;
var roomName = 'test';
client.on('connect', function() {
  client.subscribe(roomName, function(){
    console.log('subscribe done')
  });

  stress = setInterval(function() {
    var l = Number('0x'+crypto.pseudoRandomBytes(1).toString('HEX'));
    l *= Number('0x'+crypto.pseudoRandomBytes(1).toString('HEX'));

    var data = crypto.pseudoRandomBytes(l).toString();
    client.publish('test', data);
  },100);
});

client.on('error', function(e) {
  console.log('error')
  console.log(e)
  process.exit(1);
});

client.on('disconnect', function() {
  clearInterval(stress);
  process.exit(1);
});

client.on('message',function(room, message){
  debug(room);
  debug(message);
});

// setTimeout(function(){
//   c.unsubscribe('aa', function(){
//     console.log('unsubscribe done')
//   });
// }, 1000)