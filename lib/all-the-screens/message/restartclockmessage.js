var util = require("util");
var Message = require("../message.js");

//This message inherits from the Message base class and contains information
//provided to a client from the server for restarting the client's clock.
function RestartClockMessage()
{
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
  this.getFramerate = function() {
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

util.inherits(RestartClockMessage, Message);

module.exports = RestartClockMessage;
