var util = require("util");
var Message = require("../message.js");

//This message inherits from the Message base class and contains a drift time
//value in milliseconds provided to the client from the server.
function UpdateTimeMessage()
{
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

util.inherits(UpdateTimeMessage, Message);

module.exports = UpdateTimeMessage;
