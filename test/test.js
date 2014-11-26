var when = require("node-promise").when;
var should = require('should');
var sinon = require('sinon');
var Promise = require("node-promise").Promise;
var all = require("node-promise").all;
var AllTheScreens = require("../lib/all-the-screens.js");
var UpdateTimeMessage = require("../lib/all-the-screens/message/updatetimemessage");
var ioClient = require("socket.io-client");

var numberOfClients = 10;
var server = "localhost";
var port = 8080;

describe("AllTheScreens", function() {
  before(function(done) {
    this.errors = {};
    this.clients = [];
    try {
      this.server = new AllTheScreens.Server(port);
    }
    catch(err) {
      this.errors["server"] = err.message;
    }

    try {
      for(var i = 0; i < numberOfClients; i++)
      {
        this.clients[i] = new AllTheScreens.Client(i, ioClient, server, port);
      }
    }
    catch(err) {
      this.errors["clients"] = err.message;
    }
    done();
  });

  it('should be able to create a server', function() {
    should.exist(this.server);
  });

  it('should be able to create clients', function() {
    for(var i = 0; i < numberOfClients; i++)
    {
      should.exist(this.clients[i]);
    }
  });

  it('should be able to start the server', function() {
    this.server.start().should.be.true;
  });

  it('should be able to register all the clients', function(done) {
    var testsDone = 0;
    var aTestIsDone = function() {
      testsDone++;
      if(testsDone == numberOfClients)
      {
        done();
      }
    };
    for(var i = 0; i < numberOfClients; i++)
    {
      this.clients[i].connect();
      this.clients[i].register(function(data) {
        data.should.equal("Client successfully registered");
        if(data == "Client successfully registered") aTestIsDone();
      });
    }
  });

  it('should be able to ping all the clients', function(done) {
    var promise = this.server.pingAllClients();

    when(promise, function() {
      done();
    });
  });

  it('should be able to update the client clocks', function(done) {
    var promise = this.server.updateAllClientTimes();
    when(promise, function() {
      done();
    });
  });

  it('should be able to update the client clocks with an appropriate value', function(done) {
    var message = new UpdateTimeMessage();
    message.setClientId(0);
    message.setDrift(100);
    this.clients[0]._updateTime(message);
    this.clients[0]._getTime();
    var spies = [];
    for(var i = 0; i < numberOfClients; i++)
    {
      spies.push(sinon.spy(this.clients[i], "_updateTime"));
    }

    this.server.updateAllClientTimes();
    var that = this;
    var allTimesUpdated = new Promise();

    var callCount = 0;
    for(var i = 0; i < numberOfClients; i++)
    {
      (function(i) {
        var myInterval = setInterval(function() {
          if(spies[i].callCount == 1)
          {
            callCount++;
            clearInterval(myInterval);
            if(callCount == numberOfClients)
            {
              allTimesUpdated.resolve();
            }
          }
        }, 50);
      })(i);
    }

    var totalDrift = 0;
    when(allTimesUpdated, function() {
      for(var i = 0; i < numberOfClients; i++)
      {
        totalDrift += Math.abs(spies[i].getCall(0).args[0].getDrift());
        that.clients[i]._updateTime.restore();
      }
      (totalDrift > 100).should.be.true;
      done();
    });
  });

  it('should be able to ping clients despite timedout clients', function(done) {
    var stub = sinon.stub(this.clients[0], "_pingBack");

    var promise = this.server.pingAllClients();

    var that = this;
    when(promise, function() {
      that.clients[0]._pingBack.restore();
      done();
    });
  });

  it('should be able update times despite timedout clients', function(done) {
    var stub = sinon.stub(this.clients[0], "_pingBack");
    var spies = [];
    for(var i = 0; i < numberOfClients; i++)
    {
      spies.push(sinon.spy(this.clients[i], "_updateTime"));
    }

    this.server.updateAllClientTimes();

    var that = this;
    var allTimesUpdated = new Promise();

    var callCount = 0;
    for(var i = 0; i < numberOfClients; i++)
    {
      (function(i) {
        var myInterval = setInterval(function() {
          if(spies[i].callCount == 1)
          {
            callCount++;
            clearInterval(myInterval);
            if(callCount == numberOfClients - 1)
            {
              allTimesUpdated.resolve();
            }
          }
        }, 50);
      })(i);
    }

    var totalDrift = 0;
    when(allTimesUpdated, function() {
      that.clients[0]._pingBack.restore();
      for(var i = 0; i < numberOfClients; i++)
      {
        that.clients[i]._updateTime.restore();
      }
      done();
    });
  })

  it('should be able to receive heartbeats', function(done) {
    var heartbeatPromises = [];
    for(var i = 0; i < numberOfClients; i++)
    {
      var promise = new Promise();
      heartbeatPromises.push(promise);

      this.clients[i].setHeartbeatCallback(function(promise) {
        return function(response)
        {
          promise.resolve();
        }
      }(promise));
    }

    this.server.sendAllHeartbeats();

    when(all(heartbeatPromises), function() {
      done();
    });
  });
});
