var Clock = require("./clock.js");
var ioClient = require("socket.io-client");
var RegisterClientMessage = require("./message/registerclientmessage.js");
var RestartClockMessage = require("./message/restartclockmessage.js");
var RequestTimeMessage = require("./message/requesttimemessage.js");
var ResponseTimeMessage = require("./message/responsetimemessage.js");
var UpdateTimeMessage = require("./message/updatetimemessage.js");
var PingMessage = require("./message/pingmessage.js");
var HeartbeatMessage = require("./message/heartbeatmessage.js");

// The client is responsible for maintaining its own time, communicating its
// time to the server when asked, and listening for a heartbeat
function Client(identifierParameter, ioClient, serverAddressParameter, serverPortParameter) {
  if(identifierParameter === undefined)
  {
    throw new Error("The first parameter provided must be the client identifier");
  }

  if(serverAddressParameter === undefined)
  {
    throw new Error("The second parameter provided must be the server address");
  }

  if(serverPortParameter === undefined)
  {
    throw new Error("The third parameter provided must be the server port");
  }

  //PRIVATE VARIABLES

  //A Clock object to use for timing
  var clock = new Clock();

  //The url or ip of the server
  var identifier = identifierParameter;

  //The domain name or ip of the server
  var serverAddress = serverAddressParameter;

  //The server port
  var serverPort = serverPortParameter;

  //Socket.io connection
  var socket = null;

  var framerate = null;

  var heartbeatCallback;

  var updateTimeCallback;

  var currentFrame;

  var lastHeartbeatTime = null;
  var lastHeartbeatFrame = null;

  var testLatency = null;

  //PUBLIC VARIABLES

  //PRIVATE METHODS

  //PRIVILEGED METHODS

  this.connect = function() {
    var that = this;
    socket = ioClient.connect("http://" + serverAddress + ":" + serverPort);

    socket.on("ping request", function(messageString) {
      var message = new PingMessage();
      message.fromJson(messageString);
      if(testLatency !== null)
      {
        setTimeout(function() {
          that._pingBack(message);
        }, testLatency);
      }
      else
      {
        that._pingBack(message);
      }
    });

    socket.on("restart clock", function(messageString) {
      var message = new RestartClockMessage();
      message.fromJson(messageString);
      if(message.getClientId() == identifier)
      {
        if(testLatency !== null)
        {
          setTimeout(function() {
            that._restartClock(message);
          }, testLatency / 2);
        }
        else
        {
          that._restartClock(message);
        }
      }
    });

    socket.on("request time", function(messageString) {
      var message = new RequestTimeMessage();
      message.fromJson(messageString);
      if(message.getClientId() == identifier)
      {
        if(testLatency !== null)
        {
          setTimeout(function() {
            that._respondTime(message);
          }, testLatency / 2);
        }
        else
        {
          that._respondTime(message);
        }
      }
    });

    socket.on("update time", function(messageString) {
      var message = new UpdateTimeMessage();
      message.fromJson(messageString);
      if(message.getClientId() == identifier)
      {
        if(testLatency !== null)
        {
          setTimeout(function() {
            that._updateTime(message);
          }, testLatency / 2);
        }
        else
        {
          that._updateTime(message);
        }
      }
    });

    socket.on("heartbeat", function(messageString) {
      var message = new HeartbeatMessage();
      message.fromJson(messageString);
      if(message.getClientId() == identifier)
      {
        if(testLatency !== null)
        {
          setTimeout(function() {
            that._heartbeat(message);
          }, testLatency / 2);
        }
        else
        {
          that._heartbeat(message);
        }
      }
    });
  };

  this.register = function(callback) {
    var message = new RegisterClientMessage();
    message.setClientId(identifier);
    socket.emit("register client", message.toJson(), callback);
  };

  this.setHeartbeatCallback = function(callback) {
    heartbeatCallback = callback;
  };

  this.setUpdateTimeCallback = function(callback) {
    updateTimeCallback = callback;
  };

  this.getFrame = function() {
    //Given the heartbeat time and the heartbeat frame let's calculate the current frame
    return lastHeartbeatFrame + Math.floor((clock.getTime() - lastHeartbeatTime) * framerate / 1000);
  };

  //PRIVILEGED METHODS FOR INTERNAL USE ONLY

  this._restartClock = function(restartClockMessage) {
    clock.reset();
    clock.setTime(restartClockMessage.getTime());
    clock.start();

    framerate = restartClockMessage.getFramerate();
  };

  this._respondTime = function(requestTimeMessage) {
    var message = new ResponseTimeMessage();
    message.setClientId(identifier);
    message.setRequestBatchId(requestTimeMessage.getRequestBatchId());
    if(clock.isStarted)
    {
      message.setTime(clock.getTime());
    }
    else
    {
      message.setTime(-1);
    }

    if(testLatency !== null)
    {
      setTimeout(function() {
        socket.emit("response time", message.toJson());
      }, testLatency/2);
    }
    else
    {
      socket.emit("response time", message.toJson());
    }
  }

  this._updateTime = function(message) {
    if(message.getClientId() == identifier)
    {
      clock.adjust(message.getDrift());
      if(updateTimeCallback !== undefined)
      {
        updateTimeCallback({drift: message.getDrift()});
      }
    }
  };

  this._getTime = function() {
    return clock.getTime();
  }

  this._pingBack = function(message) {
    if(message.getClientId() == identifier)
    {
      socket.emit("ping response", message.toJson());
    }
  }

  this._heartbeat = function(message) {
    if(message.getClientId() == identifier)
    {
      lastHeartbeatTime = message.getTime();      
      lastHeartbeatFrame = message.getFrame();
      if(heartbeatCallback !== undefined)
      {
        heartbeatCallback({time: message.getTime(), frame: message.getFrame()});
      }
    }
  };

  this._setTestLatency = function(latency) {
    testLatency = latency;
  };
}

module.exports = Client;
