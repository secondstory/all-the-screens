var util = require("util");
var Message = require("../message.js");

//This message inherits from the Message base class and is responsible for
//registering the client's id to the server.
function RegisterClientMessage()
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

util.inherits(RegisterClientMessage, Message);

module.exports = RegisterClientMessage;
