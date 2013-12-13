var AllTheScreens = require("all-the-screens");

var server = new AllTheScreens.Server(8090);

server.setFramesPerSecond(30);

server.start();

server.pingAllClientsPeriodically();
server.updateAllClientTimesPeriodically();
server.sendAllHeartbeatsPeriodically();

var io = require('socket.io').listen(8091);

io.sockets
  .on('connection', function (socket) {
    socket.on('forward', function (data) {
      io.sockets.emit('forwarded', data);
    });
  });
