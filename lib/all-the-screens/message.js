//This is an abstract class for the various message types a server or client can send receive.
function Message() {};

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

Message.prototype.toJson = function() {
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

Message.prototype.fromJson = function(obj) {
  this.setAttributesFromObject(obj);

  return true;
};

module.exports = Message;
