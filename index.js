var AllTheScreens = require("./lib/all-the-screens.js");

var port = 8080;

var server = new AllTheScreens.Server(port);

server.start();

server.pingAllClientsPeriodically();
server.updateAllClientTimesPeriodically();
server.sendAllHeartbeatsPeriodically();
