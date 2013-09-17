//This class is responsible for keeping millsecond accurate time.
function Clock() {
  //PRIVATE ATTRIBUTES

  // Variable used for determining the time
  var systemTime = new Date().getTime();

  //The time at which the clock was started
  var startTime = 0;

  //The current time;
  var time = 0;

  //Whether the clock has been started or not.
  var started = false;

  var lastGetTime = 0;

  var adjustment = 0;

  //PUBLIC METHODS

  this.start = function() {
    this.started = true;
  };

  this.stop = function() {
    this.started = false;
  };

  this.reset = function() {
    startTime = 0;
    time = 0;
    systemTime = new Date().getTime();
    adjustment = 0;
  };

  this.restart = function() {
    this.reset();
    this.start();
  };

  this.setTime = function(newTime) {
    if(!newTime.toString().match(/\d+/))
    {
      return new Error("Time must be a positive integer");
    }
    time = newTime;
    startTime = newTime;
    systemTime = new Date().getTime();
  };

  this.getTime = function() {

    //Time right now
    time = new Date().getTime() - systemTime + startTime;

    if(adjustment > 0)
    {
      this.setTime(time + adjustment);
      adjustment = 0;
    }
    else if(adjustment < 0)
    {
      //To respect monotonicity of time
      if(time + adjustment >= lastGetTime)
      {
        this.setTime(time + adjustment);
        adjustment = 0;
      }
      else
      {
        adjustment += time - lastGetTime;
        time = lastGetTime;
      }
    }

    lastGetTime = time;
    return time;
  };

  this.getStartTime = function() {
    return startTime;
  };

  this.isStarted = function() {
    return started;
  }

  this.adjust = function(drift) {
    adjustment += drift;
  }
};

module.exports = Clock;
