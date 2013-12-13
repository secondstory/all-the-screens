var RegisterClientMessage = require("./message/registerclientmessage.js");
var RemoveClientMessage = require("./message/removeclientmessage.js");
var RestartClockMessage = require("./message/restartclockmessage.js");
var RequestTimeMessage = require("./message/requesttimemessage.js");
var ResponseTimeMessage = require("./message/responsetimemessage.js");
var UpdateTimeMessage = require("./message/updatetimemessage.js");
var PingMessage = require("./message/pingmessage.js");
var HeartbeatMessage = require("./message/heartbeatmessage.js");
var Clock = require("./clock.js");
var clientDataTemplate = require("./clientdata.json");

var uuid = require("node-uuid");
var io = require("socket.io");
var defer = require("node-promise").defer;
var when = require("node-promise").when;
var all = require("node-promise").all;
var Promise = require("node-promise").Promise;

//The Server class is responsbile for keeping a set of clients synced.
function Server(portParameter) {

  //CONSTRUCTION

  var that = this;

  if(portParameter === undefined)
  {
    throw new Error("The first parameter provided must be the port number");
  }

  //PRIVATE ATTRIBUTES

  //A set of clientId => ClientData pairs
  var clientDataMap = {};

  var clientPingRequests = {};
  var clientTimeRequests = {};

  var clientRegistrationCount = 0;

  //The ping interval if one is needed
  var pingInterval = null;

  var updateClientTimesInterval = null;

  var heartbeatInterval = null;

  //A string indicating the current state, which is one of Server.States. Defaults to "inactive".
  var state = "inactive";

  //An instance of a Clock object.
  var clock = new Clock();

  //Port to listen to
  var port = portParameter;

  //Ping weight factor, value between 0 and 1
  var pingWeightFactor = 0.5;

  //The frame rate in integer frames per second.
  var framesPerSecond = 60;



  //PUBLIC ATTRIBUTES

  //The interval in integer milliseconds at which clients are pinged, defaults to 1000.
  this.pingIntervalDuration = 1000;

  //Timeout before a client is considered unresponsive and is ignored
  this.timeout = 250;

  //The number of times a client is sequentially unresponsive before they are dropped
  this.timeoutAttempts = 10;

  //The interval in integer milliseconds at which client clocks are updated,
  //defaults to 1000. This prevents clock skew on individual clients.
  this.updateClientTimesIntervalDuration = 1000;

  //The interval in integer milliseconds at which client clocks are updated, defaults to 1000. This prevents clock skew on individual clients.
  this.heartbeatIntervalDuration = 1000;



  //PRIVATE FUNCTIONS

  //utility method to test if an object is empty
  var isEmpty = function(obj) {
    for(var prop in obj) {
      if(obj.hasOwnProperty(prop))
      {
        return false;
      }
    }

    return true;
  };

  var getClientDataByClientId = function(clientId) {
    if(clientDataMap[clientId] === undefined)
    {
      throw new Error("Couldn't find a client data for clientId " + clientId);
    }
    return clientDataMap[clientId];
  };

  //PRIVILEGED FUNCTIONS

  this.setFramesPerSecond = function(framesPerSecond) {
    if(this.state != "inactive")
    {
      throw new Error("Cannot set framesPerSecond while the server is running");
    }
    this.framesPerSecond = framesPerSecond;
    return true;
  };

  //Resets and starts the current clock and sets the current frame to 0.

  this.restartClock = function() {
    clock.reset();
  };

  this.start = function() {
    if(port == null)
    {
      throw new Error("Cannot set port while the server is running");
    }

    this.restartClock();

    io = io.listen(port);

    io.set('log level', 0);


    var that = this;
    io.sockets.on('connection', function(socket) {
      socket.on('register client', that._getRegisterClientMessageFunction(that, socket));

      socket.on('remove client', that._getRemoveClientMessageFunction(that));

      socket.on('ping response', that._getPingResponseFunction(that));

      socket.on('response time', that._getClientRespondedTimeFunction(that, socket));
    });

    return true;
  };

  this.pingAllClientsPeriodically = function(pingIntervalDurationParameter) {
    if(pingIntervalDurationParameter !== undefined)
    {
      this.pingIntervalDuration = pingIntervalDurationParameter;
    }

    if(this.pingIntervalDuration === null)
    {
      throw new Error("pingIntervalDurationParameter must be provided the first time that pingAllClientsPeriodically is called");
    }

    var that = this;
    pingInterval = setInterval(function() {
      that.pingAllClients();
    }, this.pingIntervalDuration);
  };

  this.stopPingingAllClientsPeriodically = function() {
    clearInterval(pingInterval);
    pingInterval = null
  };

  this.pingAllClients = function() {
    var promiseList = [];
    var that = this;

    for(var clientId in clientDataMap)
    {
      var clientData = clientDataMap[clientId];
      if(!clientData.nonResponsive)
      {
        var clientPromise = that.pingClient(clientId);
        promiseList.push(clientPromise);
      }
    }

    return all(promiseList);
  };

  this.pingClient = function(clientId) {
    var clientData = getClientDataByClientId(clientId);

    var pingRequestId = uuid.v4();
    var clientPromise = new Promise();
    clientPingRequests[pingRequestId] = {time: new Date().getTime(), promise: clientPromise};

    var message = new PingMessage();
    message.setClientId(clientId);
    message.setPingRequestId(pingRequestId);

    var that = this;
    var socket = clientData.socket;
    socket.volatile.emit("ping request", message.toJson());
    setTimeout(function() {
      if(clientPingRequests[pingRequestId] !== undefined)
      {
        delete clientPingRequests[pingRequestId];
        if(clientPromise !== undefined)
        {
          clientPromise.resolve();
        }
        clientData.timeoutCount++;
        clientData.timedOut = true;
        if(this.timeoutAttempts != 0 && this.timeoutAttempts != null && clientData.timeoutCount >= this.timeoutAttempts)
        {
          clientData.nonResponsive = true;
          that._removeClientByClientId(clientId);
        }
      }
    }, this.timeout);

    return clientPromise;
  };

  this.restartClientClock = function(clientId) {
    var clientData = getClientDataByClientId(clientId);

    if(clientData.timedOut)
    {
      return;
    }

    var rtt = getClientDataByClientId(clientId).rtt;
    //Create a new restart clock message
    var message = new RestartClockMessage();
    message.setClientId(clientId);
    message.setTime(clock.getTime() + (rtt / 2));
    message.setFramerate(framesPerSecond);

    var socket = clientData.socket;
    socket.volatile.emit("restart clock", message.toJson());
  };

  this.restartAllClientClocks = function() {
    for(var clientId in clientDataMap)
    {
      var clientData = clientDataMap[clientId];
      var socket = clientData.socket;
      this.restartClientClock(clientId);
    }
  };

  this.updateAllClientTimesPeriodically = function(updateClientTimesIntervalDurationParameter) {
    if(updateClientTimesIntervalDurationParameter !== undefined)
    {
      this.updateClientTimesIntervalDuration = updateClientTimesIntervalDurationParameter;
    }

    if(this.updateClientTimesIntervalDuration === null)
    {
      throw new Error("updateClientTimesIntervalDurationParameter must be provided the first time that pingAllClientsPeriodically is called");
    }

    var that = this;
    updateClientTimesInterval = setInterval(function() {
      that.updateAllClientTimes();
    }, this.updateClientTimesIntervalDuration);
  };

  this.stopUpdatingAllClientsPeriodically = function() {
    clearInterval(updateClientTimesInterval);
    updateClientTimesInterval = null
  };

  this.updateAllClientTimes = function() {
    var clientTimeRequestBatchId = uuid.v4();
    clientTimeRequests[clientTimeRequestBatchId] = {clients: {}, time: null};
    var promiseList = [];
    for(var clientId in clientDataMap)
    {
      var clientPromise = new Promise();
      var clientData = clientDataMap[clientId];
      if(!clientData.timedOut)
      {
        promiseList.push(clientPromise);
        clientTimeRequests[clientTimeRequestBatchId].clients[clientId] = {time: null, promise: clientPromise};
      }
    }

    clientTimeRequests[clientTimeRequestBatchId].time = clock.getTime();
    for(var clientId in clientDataMap)
    {
      var clientData = clientDataMap[clientId];
      var socket = clientData.socket;
      if(!clientData.timedOut)
      {
        var message = new RequestTimeMessage();
        message.setClientId(clientId);
        message.setRequestBatchId(clientTimeRequestBatchId);
        socket.volatile.emit("request time", message.toJson());
      }
      (function(clientId) {
        setTimeout(function() {
          var undefinedCondition = (clientTimeRequests[clientTimeRequestBatchId] !== undefined) && (clientTimeRequests[clientTimeRequestBatchId].clients[clientId] !== undefined);
          if(undefinedCondition)
          {
            var time = clientTimeRequests[clientTimeRequestBatchId].clients[clientId].time;
            if(time === null)
            {
              clientPromise = clientTimeRequests[clientTimeRequestBatchId].clients[clientId].promise;
              if(clientPromise !== undefined)
              {
                clientPromise.resolve();
              }
              //clientData.timeoutCount++;
              //clientData.timedOut = true;
              if(that.timeoutAttempts != 0 && that.timeoutAttempts != null && clientData.timeoutCount >= that.timeoutAttempts)
              {
                clientData.nonResponsive = true;
              }

              //We should test whether we update the times here; this could be the last
              //request that hasn't responded.
              if(that._testAllClientTimesResponded(clientTimeRequestBatchId))
              {
                that._updateTime(clientTimeRequestBatchId);
              }

              delete clientTimeRequests[clientTimeRequestBatchId].clients[clientId];
              if(isEmpty(clientTimeRequests[clientTimeRequestBatchId].clients))
              {
                delete clientTimeRequests[clientTimeRequestBatchId];
              }

            }
          }
        }, that.timeout);
      })(clientId);
    }

    return all(promiseList);
  };

  this.sendAllHeartbeatsPeriodically = function(heartbeatIntervalDurationParameter) {
    if(heartbeatIntervalDurationParameter !== undefined)
    {
      this.heartbeatIntervalDuration = heartbeatIntervalDurationParameter;
    }

    if(this.heartbeatIntervalDuration === null)
    {
      throw new Error("heartbeatIntervalDurationParameter must be provided the first time that heartbeatAllClientsPeriodically is called");
    }

    var that = this;
    heartbeatInterval = setInterval(function() {
      that.sendAllHeartbeats();
    }, this.heartbeatIntervalDuration);
  };

  this.stopSendingHeartbeatsPeriodically = function() {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null
  };

  this.sendAllHeartbeats = function() {
    var message = new HeartbeatMessage();

    message.setTime(clock.getTime());
    message.setFrame(Math.floor(clock.getTime() * framesPerSecond / 1000));

    for(var clientId in clientDataMap)
    {
      var clientData = clientDataMap[clientId];
      if(!clientData.nonResponsive)
      {
        var socket = clientData.socket;
        message.setClientId(clientId);
        socket.volatile.emit("heartbeat", message.toJson());
      }
    }
  };

  this.sendHeartbeat = function(clientId) {
    var message = new HeartbeatMessage();

    message.setTime(clock.getTime());
    message.setFrame(Math.floor(clock.getTime() * framesPerSecond / 1000));

    message.setClientId(clientId);
    var clientData = clientDataMap[clientId];
    if(!clientData.nonResponsive)
    {
      socket.volatile.emit("heartbeat", message.toJson());
    }
  };

  this.getClientCount = function(nonTimedOut) {
    if(nonTimedOut === undefined)
    {
      nonTimedOut = true;
    }
    var count = 0;

    for(clientId in clientDataMap)
    {
      if(nonTimedOut == false || clientDataMap[clientId].timedOut == false)
      {
        count++;
      }
    }

    return count;
  };

  this.getClientIndex = function(clientId, nonTimedOut) {
    if(nonTimedOut === undefined)
    {
      nonTimedOut = true;
    }

    var clients = [];
    for(myClientId in clientDataMap)
    {
      if(nonTimedOut == false || clientDataMap[myClientId].timedOut == false)
      {
        clients.push({clientId: myClientId, index: clientDataMap[myClientId].index});
      }
    }

    clients.sort(function(a,b) { return a.index - b.index; });

    for(var i = 0; i < clients.length; i++)
    {
      if(clients[i].clientId == clientId)
      {
        return i;
      }
    }

    return null;
  };

  //PRIVILEGE FUNCTION FOR INTERNAL USE ONLY

  this._registerClient = function(registerClientMessage, socket) {
    if(!(registerClientMessage instanceof RegisterClientMessage))
    {
      throw new Error("The parameter supplied to registerClient must be an instance of RegisterClientMessage");
    }

    var clientId = registerClientMessage.getClientId();

    if(clientDataMap[clientId] !== undefined)
    {
      throw new Error("A client with clientId " + clientId + " is already registered");
    }

    //Clone the clientData object

    var newClientData = {};
    for(var attribute in clientDataTemplate)
    {
      newClientData[attribute] = clientDataTemplate[attribute];
    }

    newClientData.clientId = clientId;
    newClientData.socket = socket;
    newClientData.index = clientRegistrationCount;

    clientDataMap[clientId] = newClientData;

    clientRegistrationCount++;

    when(that.pingClient(clientId), function() {
      that.restartClientClock(clientId);
    });

    return true;
  };

  this._removeClient = function(removeClientMessage) {
    if(!(removeClientMessage instanceof RemoveClientMessage))
    {
      throw new Error("The parameter supplied to removeClient must be an instance of RemoveClientMessage");
    }

    var clientId = removeClientMessage.getClientId();

    try
    {
      this._removeClientByClientId(clientId);
    }
    catch(err)
    {
      return false;
    }

    return true;
  };

  this._removeClientByClientId = function(clientId) {
    if(clientDataMap[clientId] === undefined)
    {
      throw new Error("A client with clientId " + clientId + " could not be found to remove.");
    }

    delete clientDataMap[clientId];
    for(var clientTimeRequestBatchId in clientTimeRequests)
    {
      delete clientTimeRequests[clientTimeRequestBatchId].clients[clientId];
    }

    return true;
  };

  this._getPingResponseFunction = function(that) {
    return function(messageObject) {
      var message = new PingMessage();
      message.fromJson(messageObject);

      var clientId = message.getClientId();
      var pingRequestId = message.getPingRequestId();
      var clientData = getClientDataByClientId(clientId);

      //This may be undefined because we received a ping response after the timeout.
      //In this case we can't update the ping time because we got rid of it but we
      //can assume the client is back online and that they are no longer non-responsive
      if(clientPingRequests[pingRequestId] !== undefined)
      {
        var pingData = clientPingRequests[pingRequestId];
        var newRtt = new Date().getTime() - pingData.time;
        if(pingData.promise !== null)
        {
          pingData.promise.resolve();
        }
        clientData.rtt = (pingWeightFactor * clientData.rtt) + ((1 - pingWeightFactor) * newRtt);
        delete clientPingRequests[pingRequestId];
      }

      clientData.timeoutCount = 0;
      clientData.timedOut = false;
      clientData.nonResponsive = false;
    }
  };

  this._getRegisterClientMessageFunction = function(that, socket) {
    return function(messageObject, callback)
    {
      var message = new RegisterClientMessage();
      message.fromJson(messageObject);
      try
      {
        if(that._registerClient(message, socket) && callback !== undefined)
        {
          callback('Client successfully registered');
        }
      }
      catch(err)
      {
        console.log(err.message);
      }
    }
  };

  this._getRemoveClientMessageFunction = function(that, socket) {
    return function(messageObject, callback)
    {
      var message = new RemoveClientMessage();
      message.fromJson(messageObject);
      if(that._removeClient(message))
      {
        if(callback !== undefined)
        {
          callback('Client successfully removed');
        }
      }
      else
      {
        if(callback !== undefined)
        {
          callback('Client did not exist');
        }
      }
    }
  };

  this._getClientRespondedTimeFunction = function(that) {
    return function(messageObject) {
      var message = new ResponseTimeMessage();
      message.fromJson(messageObject);

      var clientTimeRequestBatchId = message.getRequestBatchId();
      var clientId = message.getClientId();
      var time = message.getTime();

      if(
        clientTimeRequests[clientTimeRequestBatchId] !== undefined &&
        clientTimeRequests[clientTimeRequestBatchId].clients[clientId] !== undefined)
      {
        clientTimeRequests[clientTimeRequestBatchId].clients[clientId].time = message.getTime();
        clientTimeRequests[clientTimeRequestBatchId].clients[clientId].promise.resolve();
      }

      if(time == -1)
      {
        that.restartClientClock(clientId);
      }
      else
      {
        if(that._testAllClientTimesResponded(clientTimeRequestBatchId))
        {
          that._updateTime(clientTimeRequestBatchId);
        }
      }
    }
  };

  this._testAllClientTimesResponded = function(clientTimeRequestBatchId) {
    if(clientTimeRequests[clientTimeRequestBatchId] !== undefined)
    {
      var clientTimes = clientTimeRequests[clientTimeRequestBatchId].clients;
      for(var clientId in clientTimes)
      {
        if(clientTimes[clientId].time === undefined || clientTimes[clientId].time == null)
        {
          return false;
        }
      }
      return true;
    }
    return false;
  };

  this._updateTime = function(clientTimeRequestBatchId) {

    var clientTimes = clientTimeRequests[clientTimeRequestBatchId].clients;
    var serverTime = clientTimeRequests[clientTimeRequestBatchId].time;
    delete clientTimeRequests[clientTimeRequestBatchId];

    //console.log("Server Time: " + serverTime);

    var counter = 1;
    var timeSum = serverTime;
    for(var clientId in clientTimes)
    {
      var time = clientTimes[clientId].time;
      if(time >= 0)
      {
        var rtt = getClientDataByClientId(clientId).rtt;
        var clientTime = clientTimes[clientId].time - (rtt / 2);
        //console.log("Client Time: " + clientTime);
        //console.log("Client Latency: " + (rtt / 2));
        //console.log("Difference: " + (serverTime - clientTime));
        timeSum += clientTime;
        counter++;
      }
    }

    var averageTime = Math.round(timeSum / counter);

    clock.adjust(averageTime - serverTime);
    //console.log("Average Time: " + averageTime);

    for(var clientId in clientTimes)
    {
      var clientData = clientDataMap[clientId];
      var socket = clientData.socket;
      var rtt = getClientDataByClientId(clientId).rtt;
      var clientTime = clientTimes[clientId].time - (rtt / 2);
      if(time >= 0)
      {
        var message = new UpdateTimeMessage();
        message.setDrift(averageTime - clientTime);
        message.setClientId(clientId);

        socket.volatile.emit("update time", message.toJson());
      }
    }
  };
};

Server.States = ["inactive", "preparing", "syncing"];

module.exports = Server;
