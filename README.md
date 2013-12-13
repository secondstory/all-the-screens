# All The Screens

## Intro

All The Screens is a time-adjusting, latency-aware, node-based synchronization
client/server software system. In Plain English (TM), All The Screens tries to
make sure that various client applications on a network know what "frame" they
are supposed to be on. It attempts to mitigate clock slew and variable network
latency issues.

This was developed primarily as a way to synchronize animations on displays run
on separate computers over a local network.  However, it runs quite well over
higher latency situations such as over the internet.  

The primary goal of the software is to maintain frame synchronization across
clients _even at the expense of absolute time_. So, for example, while an
animation may have a target frame rate, it is considered more important to make
sure that the animation is in sync across various clients than for the
animation to last a specific, precise amount of time.

## How does it work?

1. Client registers

The client connects to the server using socket.io and registers its clientId.

2. Server polls for client's RTT

The server then proceeds to ping it periodically and maintains the client's
Round Trip Time (RTT). An assumption is made that each leg of the trip, to and
from the client takes up half of the RTT, which we'll call the client's
latency. 

3. The client clock's are reset

The server sends messages to all the clients indicating that their times should
be the server's time plus the client's latency. The clients set their times
accordingly and update their clocks as time passes independently. The clients
also receives a target framerate which they store.

4. The clients' times are updated using a version of the Berkley algorithm

The server periodically asks all the clients for their times. When all clients
have responded--clients that don't respond within a certain amount of time are
ignored--each client's latency is added to their respective time.  Those times,
and the server's own time, are added together and averaged. Then, the server
sends out the deviation from the average to each client and the client updates
their time appropriately.  In order to preserve the monotonicity of time, any
negative adjustments are handled by the client by halting their clocks for that
duration of time.

5. Clients receive a periodic heartbeat that indicates what frame they should
be at at a specific time. Then, given their synchronized clocks, and the target
framerate they are able to determine which frame they should be at.

## Show me some code

```javascript
//Run the All The Screens node server
var AllTheScreens = require("all-the-screens");

var port = 8080;

var server = new AllTheScreens.Server(port);

server.setFramesPerSecond(60);

server.start();

server.pingAllClientsPeriodically();
server.updateAllClientTimesPeriodically();
server.sendAllHeartbeatsPeriodically();

```

```html
//Run the appropriate All The Screens client
<html>
  <script src="/js/allthescreens.js"></script>
  <script src="/js/socket.io.min.js"></script>
  <script>
      //io is a reference to socket.io
      var clientId = "MyUniqueClientId";
      var port = 8080;
      var client = new AllTheScreens.Client(clientId, io, "crackle", 8080);
      client.connect();
      client.register();

      //It doesn't matter how often we update
      setInterval(
        function() {
          var frame = client.getFrame();
          
          //Do stuff using the frame number
        }, 10;
      );

  </script>
  ...
```
