AllTheScreens = (function() {
  var inherits = function(ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };

  //This class is responsible for keeping millsecond accurate time.

  var Clock = function() {
    //PRIVATE ATTRIBUTES

    // Variable used for determining the time
    var systemTime = new Date().getTime();

    //The time at which the clock was started
    var startTime = 0;

    //The current time;
    var time = 0;

    //Whether the clock has been started or not.
    var started = false;

    var lastGetTime = 0;

    var adjustment = 0;

    //PUBLIC METHODS

    this.start = function() {
      this.started = true;
    };

    this.stop = function() {
      this.started = false;
    };

    this.reset = function() {
      startTime = 0;
      time = 0;
      systemTime = new Date().getTime();
      adjustment = 0;
    };

    this.restart = function() {
      this.reset();
      this.start();
    };

    this.setTime = function(newTime) {
      if(!newTime.toString().match(/\d+/))
      {
        return new Error("Time must be a positive integer");
      }
      startTime = newTime;
      time = newTime;
      systemTime = new Date().getTime();
    };

    this.getTime = function() {

      //Time right now
      time = new Date().getTime() - systemTime + startTime;

      if(adjustment > 0)
      {
        this.setTime(time + adjustment);
        adjustment = 0;
      }
      else if(adjustment < 0)
      {
        //To respect monotonicity of time
        if(time + adjustment >= lastGetTime)
        {
          this.setTime(time + adjustment);
          adjustment = 0;
        }
        else
        {
          adjustment += time - lastGetTime;
          time = lastGetTime;
        }
      }

      lastGetTime = time;
      return time;
    };

    this.getStartTime = function() {
      return startTime;
    };

    this.isStarted = function() {
      return started;
    }

    this.adjust = function(drift) {
      adjustment += drift;
    }
  };


  //This is an abstract class for the various message types a server or client can send receive.
  var Message = function() {};

  Message.prototype.setAttributesFromObject = function(obj) {
    for(var i = 0; i < this.attributes.length; i++)
    {
      var attribute = this.attributes[i];
      if(obj[attribute] === undefined || obj[attribute] === "")
      {
        throw new Error("The message provided to set attributes from is missing the attribute " + attribute);
      }
    }

    for(var i = 0; i < this.attributes.length; i++)
    {
      var attribute = this.attributes[i];
      var setterName = "set" + attribute.charAt(0).toUpperCase() + attribute.slice(1);
      this[setterName](obj[attribute]);
    }
  };

  Message.prototype.toJSON = function() {
    //Construct a json object from this message
    var messageAsObject = {};

    for(var i = 0; i < this.attributes.length; i++)
    {
      var attribute = this.attributes[i];
      var getterName = "get" + attribute.charAt(0).toUpperCase() + attribute.slice(1);
      messageAsObject[attribute] = this[getterName]();
    };

    return messageAsObject;
  };

  Message.prototype.fromJSON = function(obj) {
    this.setAttributesFromObject(obj);

    return true;
  };

  //This message inherits from the Message base class and is responsible for
  //registering the client's id to the server.
  var RegisterClientMessage = function() {
    //A string identifier that uniquely represents the client
    this.clientId = null;

    //The list of attributes that this message has
    this.attributes = ["clientId"];

    //PRIVILEGED METHODS
    //Getter for clientId
    this.getClientId = function() {
      return this.clientId;
    };

    //Setter for clientId
    this.setClientId = function(clientId) {
      this.clientId = clientId;
    };
  }

  inherits(RegisterClientMessage, Message);

  //This message inherits from the Message base class and contains information
  //provided to a client from the server for restarting the client's clock.
  var RestartClockMessage = function() {
    //A string identifier that uniquely represents the client
    this.clientId = null;

    //The time to set the clock to in milliseconds
    this.time = null;

    this.framerate = null;

    //The list of attributes that this message has
    this.attributes = ["clientId", "time", "framerate"];

    //PRIVILEGED METHODS

    //Getter for clientId
    this.getClientId = function() {
      return this.clientId;
    };

    //Setter for clientId
    this.setClientId = function(clientId) {
      this.clientId = clientId;
    };

    //Getter for time
    this.getTime = function() {
      return this.time;
    };

    //Setter for time
    this.setTime = function(time) {
      if(!time.toString().match(/\d+/))
      {
        return new Error("Time must be an integer");
      }
      this.time = time;
    };

    //Getter for framerate
    this.getFramerate= function() {
      return this.framerate;
    };

    //Setter for framerate
    this.setFramerate = function(framerate) {
      if(framerate !== null)
      {
        if(!framerate.toString().match(/^\d*\.?\d*$/) && !framerate.toString().match(/\d+/))
        {
          return new Error("framerate must be an decimal");
        }
        this.framerate = framerate;
      }
    };
  }

  inherits(RestartClockMessage, Message);

  //This message inherits from the Message base class and simply informs the client to respond with their time.
  var RequestTimeMessage = function() {
    //A string identifier that uniquely represents the client
    this.clientId = null;

    //A string representing a unique identifier for the request batch
    this.requestBatchId = null;

    //The list of attributes that this message has
    this.attributes = ["clientId", "requestBatchId"];

    //PRIVILEGED METHODS

    //Getter for clientId
    this.getClientId = function() {
      return this.clientId;
    };

    //Setter for clientId
    this.setClientId = function(clientId) {
      this.clientId = clientId;
    };


    //Getter for requestBatchId
    this.getRequestBatchId = function() {
      return this.requestBatchId;
    };

    //Setter for requestBatchId
    this.setRequestBatchId = function(requestBatchId) {
      this.requestBatchId = requestBatchId;
    };
  }

  inherits(RequestTimeMessage, Message);

  // This message inherits from the Message base class and contains the time
  // provided to the server from the client in response to a RequestTimeMessage. The
  // client can respond with a time of -1 if it's clock hasn't been started.
  var ResponseTimeMessage = function() {
    //A string identifier that uniquely represents the client
    this.clientId = null;

    //A string representing a unique identifier for the request batch
    this.requestBatchId = null;

    //The list of attributes that this message has
    this.attributes = ["clientId", "requestBatchId", "time"];

    //PRIVILEGED METHODS

    //Getter for clientId
    this.getRequestBatchId = function() {
      return this.requestBatchId;
    };

    //Setter for clientId
    this.setRequestBatchId = function(requestBatchId) {
      this.requestBatchId = requestBatchId;
    };

    //Getter for clientId
    this.getClientId = function() {
      return this.clientId;
    };

    //Setter for clientId
    this.setClientId = function(clientId) {
      this.clientId = clientId;
    };

    //Getter for time
    this.getTime = function() {
      return this.time;
    };

    //Setter for time
    this.setTime = function(time) {
      if(!time.toString().match(/-?\d+/))
      {
        return new Error("Time must be an integer");
      }
      this.time = time;
    };
  }

  inherits(ResponseTimeMessage, Message);

  //This message inherits from the Message base class and contains a drift time
  //value in milliseconds provided to the client from the server.
  var UpdateTimeMessage = function() {
    //An integer indicating the amount by which a client must adjust their clock, according to the server, in milliseconds.
    this.drift = null;

    //The list of attributes that this message has
    this.attributes = ["clientId", "drift"];

    //Getter for clientId
    this.getClientId = function() {
      return this.clientId;
    };

    //Setter for clientId
    this.setClientId = function(clientId) {
      this.clientId = clientId;
    };

    //Getter for drift
    this.getDrift = function() {
      return this.drift;
    };

    //Setter for drift
    this.setDrift = function(drift) {
      if(!drift.toString().match(/-?\d+/))
      {
        return new Error("Drift must be an integer");
      }
      this.drift = drift;
    };
  }

  inherits(UpdateTimeMessage, Message);

  var PingMessage = function() {
    //A string identifier that uniquely represents the client
    this.clientId = null;

    this.pingRequestId = null;

    //The list of attributes that this message has
    this.attributes = ["clientId", "pingRequestId"];

    //PRIVILEGED METHODS

    //Getter for clientId
    this.getClientId = function() {
      return this.clientId;
    };

    //Setter for clientId
    this.setClientId = function(clientId) {
      this.clientId = clientId;
    };

    //Getter for pingRequestId
    this.getPingRequestId = function() {
      return this.pingRequestId;
    };

    //Setter for pingRequestId
    this.setPingRequestId = function(pingRequestId) {
      this.pingRequestId = pingRequestId;
    };
  }

  inherits(PingMessage, Message);

  //This message inherits from the Message base class and contains a drift time
  //value in milliseconds provided to the client from the server.
  var HeartbeatMessage = function()
  {
    //A string identifier that uniquely represents the client
    this.clientId = null;

    //An integer indicating the amount by which a client must adjust their clock, according to the server, in milliseconds.
    this.drift = null;

    //The list of attributes that this message has
    this.attributes = ["clientId", "time", "frame"];

    //PRIVILEGED METHODS

    //Getter for clientId
    this.getClientId = function() {
      return this.clientId;
    };

    //Setter for clientId
    this.setClientId = function(clientId) {
      this.clientId = clientId;
    };

    //Getter for time
    this.getTime = function() {
      return this.time;
    };

    //Setter for time
    this.setTime = function(time) {
      if(!time.toString().match(/\d+/))
      {
        return new Error("Time must be an integer");
      }
      this.time = time;
    };

    //Getter for frame
    this.getFrame = function() {
      return this.frame;
    };

    //Setter for frame
    this.setFrame = function(frame) {
      if(!frame.toString().match(/\d+/))
      {
        return new Error("Frame must be an integer");
      }
      this.frame = frame;
    };
  }

  inherits(HeartbeatMessage, Message);

  // The client is responsible for maintaining its own time, communicating its
  // time to the server when asked, and listening for a heartbeat
  var Client = function(identifierParameter, ioClient, serverAddressParameter, serverPortParameter) {
    if(identifierParameter === undefined)
    {
      throw new Error("The first parameter provided must be the client identifier");
    }

    if(ioClient === undefined)
    {
      throw new Error("The second parameter provided must be the socket io client");
    }

    if(serverAddressParameter === undefined)
    {
      throw new Error("The third parameter provided must be the server address");
    }

    if(serverPortParameter === undefined)
    {
      throw new Error("The fourth parameter provided must be the server port");
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
        message.fromJSON(messageString);
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
        message.fromJSON(messageString);
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
        message.fromJSON(messageString);
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
        message.fromJSON(messageString);
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
        message.fromJSON(messageString);
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
      socket.emit("register client", message.toJSON(), callback);
    };

    this.setCallback = function(callback) {
      heartbeatCallback = callback;
    }
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
          socket.emit("response time", message.toJSON());
        }, testLatency/2);
      }
      else
      {
        socket.emit("response time", message.toJSON());
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
        socket.emit("ping response", message.toJSON());
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

  return {
    Clock: Clock,
    Message: Message,
    RegisterClientMessage: RegisterClientMessage,
    RestartClockMessage: RestartClockMessage,
    RequestTimeMessage: ResponseTimeMessage,
    RequestTimeMessage: RequestTimeMessage,
    UpdateTimeMessage: UpdateTimeMessage,
    PingMessage: PingMessage,
    HeartbeatMessage: HeartbeatMessage,
    Client: Client
  };
})();
