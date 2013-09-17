var AllTheScreens = require("./lib/allthescreens.js");

var port = 8080;

var server = new AllTheScreens.Server(port);

server.start();

server.pingAllClientsPeriodically();
server.updateAllClientTimesPeriodically();
server.sendAllHeartbeatsPeriodically();
