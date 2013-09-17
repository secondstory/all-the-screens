var util = require("util");
var Message = require("../message.js");

// This message inherits from the Message base class and contains the time
// provided to the server from the client in response to a RequestTimeMessage. The
// client can respond with a time of -1 if it's clock hasn't been started.
function ResponseTimeMessage()
{
  //A string identifier that uniquely represents the client
  this.clientId = null;

  //A string representing a unique identifier for the request batch
  this.requestBatchId = null;

  this.time = null;

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

util.inherits(ResponseTimeMessage, Message);

module.exports = ResponseTimeMessage;
