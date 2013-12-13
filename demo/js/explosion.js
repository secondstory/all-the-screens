function Explosion(options) {
  var defaults = {
    startX: 0,
    startY: 0,
    startFrame: 0,
    numberOfRadii: 10,
    radius: 15,
    maxAngleChange: Math.PI / 4,
    numberOfParticles: 5,
    duration: 3,
    particleEmitOffset: 0.01,
    smallestCircleRadius: 5,
    largestCircleRadius: 20,
    fps: 30,
    seed: Math.random(),
    circlePool: null
  };

  var options = _.extend({}, defaults, options);

  var totalFrames = Math.ceil((options.duration - (options.particleEmitOffset * (options.numberOfParticles - 1))) * options.fps);

  Math.seedrandom(options.seed);

  function drawPath() {
      var currentRadius = 0;
      var pathString = "M " + options.startX + " " + options.startY + "R ";
      var currentAngle = Math.random() * 2 * Math.PI;
      for (var i = 0; i < options.numberOfRadii; i++) {
          var angle = currentAngle + (Math.random() * options.maxAngleChange - (options.maxAngleChange / 2));
          currentAngle = angle;
          var x = options.startX + (Math.cos(angle) * currentRadius)
          var y = options.startY + (Math.sin(angle) * currentRadius);
          pathString += x + " " + y + " ";
          currentRadius += options.radius * (i + 1) * 0.25;
      }
      var p = Explosion.Paper.path(pathString);
      p.attr({
          stroke: "none",
          "stroke-width": 0
      });
      return p;
  }

  function getRandomColorHexString() {
      var letters = '0123456789ABCDEF'.split('');
      var color = '#';
      var colors = [];
      for (var i = 0; i < 6; i++) {
          colors.push(letters[Math.round(Math.random() * 15)]);
      }
      color += colors.join("");;
      return color;
  }

  function drawPaths() {
    var circlesAndPaths = [];
    for (var i = 0; i < options.numberOfParticles; i++) {
        var path = drawPath();
        var circleRadius = Math.random() * (options.largestCircleRadius - options.smallestCircleRadius) + options.smallestCircleRadius;
        var circle;
        if(options.circlePool == null)
        {
          circle = Explosion.Paper.circle(0, 0, 1);
        }
        else
        {
          if(options.circlePool.length == 0)
          {
            break;
          }
          else
          {
            circle = options.circlePool.shift();
          }
        }
        circle.data("circleRadius", circleRadius); 
        circle.hide();
        circle.attr({"fill": getRandomColorHexString(), "stroke": "none"});
        circlesAndPaths.push({"path": path, "circle": circle, "pathLength": path.getTotalLength(), "origin": path.getPointAtLength(0)});
    }
    return circlesAndPaths;
  }

  var circlesAndPaths = drawPaths();

  //calculate individual particle animation duration

  return  {
    animate: function(frame, testStartFrame) {
      var startFrame = options.startFrame;
      if(testStartFrame !== undefined)
      {
        startFrame = testStartFrame;
      }
      var currentFrame = frame - startFrame;

      if(currentFrame > totalFrames)
      {
        this.destroy();
      }
      else
      {
        for(var i = 0; i < circlesAndPaths.length; i++)
        {
          var circleAndPath = circlesAndPaths[i];
          var circle = circleAndPath.circle;
          var path = circleAndPath.path;
          var pathLength = circleAndPath.pathLength;
          var origin = circleAndPath.origin;

          //Offset frame 
          offsetFrame = currentFrame - (i * options.particleEmitOffset) * options.fps;
          
          if(offsetFrame < 0)
          {
            circle.hide();
          }
          else if(offsetFrame > totalFrames)
          {
            circle.hide();
            if(options.circlePool != null)
            {
              if($.inArray(circle, options.circlePool) == -1)
              {
                console.log('here');
                options.circlePool.push(circle);
                circle.transform("");
              }
            }
          }
          else
          {
            circle.show();
            var translationBlend = Raphael.easing_formulas["<"](offsetFrame / totalFrames);
            var scaleBlend = 0;
            if(offsetFrame <= totalFrames / 2)
            {
              scaleBlend = Raphael.easing_formulas[">"](offsetFrame / (totalFrames / 2));
            }
            else
            {
              scaleBlend = 1 - Raphael.easing_formulas["<"]((offsetFrame - (totalFrames / 2))/ (totalFrames / 2));
            }

            var pointAtLength = path.getPointAtLength(translationBlend * pathLength);
            var newX = pointAtLength.x;
            var newY = pointAtLength.y;

            var circleRadius = circle.data("circleRadius");
             
            circle.transform("T" + newX + "," + newY + " " + "s" + (scaleBlend * circleRadius));
          }
        }
      }
    },

    intervalAnimation: null, 
    intervalFrame: 0,

    startIntervalAnimation: function(getFrameCallback) {
      var that = this;
      this.intervalAnimation = setInterval(function() {
        var frame = that.intervalFrame;
        var startFrame = 0;
        if(getFrameCallback !== undefined)
        {
          frame = getFrameCallback();
          startFrame = options.startFrame;
        }
        var currentFrame = frame - options.startFrame;
        that.animate(frame, startFrame);
        if(getFrameCallback === undefined)
        {
          that.intervalFrame++;
        }
        if(currentFrame >= options.fps * options.duration)
        {
          that.stopIntervalAnimation();
        }
      }, 1000 / options.fps);
    },

    stopIntervalAnimation: function() {
      clearInterval(this.intervalAnimation); 
      this.destroy();
    },

    destroy: function() {
      for(var i = 0; i < circlesAndPaths.length; i++)
      {
        var circleAndPath = circlesAndPaths[i];
        if(options.circlePool == null)
        {
          circleAndPath.circle.remove();
        }
        else
        {
          circleAndPath.circle.hide();
          if($.inArray(circleAndPath.circle, options.circlePool) == -1)
          {
            options.circlePool.push(circleAndPath.circle);
            circleAndPath.circle.transform("");
          }
        }
        circleAndPath.path.remove();
      }
    }
  }
}

