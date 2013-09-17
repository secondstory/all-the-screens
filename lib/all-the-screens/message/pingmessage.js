var util = require("util");
var Message = require("../message.js");

function PingMessage()
{
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

util.inherits(PingMessage, Message);

module.exports = PingMessage;
