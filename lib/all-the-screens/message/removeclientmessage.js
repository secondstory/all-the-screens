var util = require("util");
var Message = require("../message.js");

// This message inherits from the Message base class and is responsible for
// indicating to the server to remove a specific client.
function RemoveClientMessage()
{
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

util.inherits(RemoveClientMessage, Message);
