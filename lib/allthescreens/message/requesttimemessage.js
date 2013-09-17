var util = require("util");
var Message = require("../message.js");

//This message inherits from the Message base class and simply informs the client to respond with their time.
function RequestTimeMessage()
{
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

util.inherits(RequestTimeMessage, Message);

module.exports = RequestTimeMessage;
