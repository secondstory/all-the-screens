var util = require("util");
var Message = require("../message.js");

//This message inherits from the Message base class and contains a drift time
//value in milliseconds provided to the client from the server.
function HeartbeatMessage()
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

util.inherits(HeartbeatMessage, Message);

module.exports = HeartbeatMessage;
