/**
 * Module dependencies.
 */

var express = require('express')
  , stylus = require('stylus')
  , nib = require('nib')
  , http = require('http')
  , sio = require('socket.io')
  , fs = require('fs');

/**
 * App.
 */

var app = express();

/**
 * App configuration.
 */

app.configure(function () {
  app.use(stylus.middleware({ src: __dirname + '/public', compile: compile }));
  app.use(express.static(__dirname + '/public'));
  app.set('views', __dirname);
  app.set('view engine', 'jade');

  function compile (str, path) {
    return stylus(str)
      .set('filename', path)
      .use(nib());
  };
});

/**
 * App routes.
 */

app.get('/', function (req, res) {
  res.render('index', { layout: false });
});

/**
 * App listen.
 */

var server = http.createServer(app);
 
server.listen(3000);

/**
 * Socket.IO server (single process only)
 */

var data = fs.readFileSync('ip.list');
var iplist = JSON.parse(data);

var io = sio.listen(server)
  , nicknames = {};

io.sockets.on('connection', function (socket) {

  var address = socket.handshake.address.address;
  if (iplist[address]) {
    nicknames[address]=iplist[address];
    socket.emit('nicknames',nicknames);
    socket.nickname=iplist[address];
    socket.broadcast.emit('announcement', socket.nickname + ' connected');
    socket.broadcast.emit('nicknames', nicknames);
  } else {
    socket.emit('disconnect',function () {});
  }  

  socket.on('user message', function (msg) {
    socket.broadcast.emit('user message', socket.nickname, msg);
  });

/**
 * socket.on('nickname', function (nick, fn) {
 *   if (nicknames[nick]) {
 *     fn(true);
 *   } else {
 *     fn(false);
 *     nicknames[nick] = socket.nickname = nick;
 *     socket.broadcast.emit('announcement', nick + ' connected');
 *     io.sockets.emit('nicknames', nicknames);
 *   }
 * });
 */

  socket.on('disconnect', function () {
    if (!socket.nickname) return;

    delete nicknames[address];
    socket.broadcast.emit('announcement', socket.nickname + ' disconnected');
    socket.broadcast.emit('nicknames', nicknames);
  });

});
