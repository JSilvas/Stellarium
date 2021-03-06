import React from 'react';
import './Sandbox.css';

class Sandbox extends React.Component {
  constructor(props) {
    super(props);
    this.canvasRef = React.createRef();
  }

  componentDidMount() {
    // setup canvas
    const canvas = this.canvasRef.current;
    const ctx = canvas.getContext('2d');
    // context.fillRect(0, 0, canvas.width, canvas.height);

    var width = canvas.width = window.innerWidth;
    var height = canvas.height = window.innerHeight;

    // const colors = [
    //   '#2185C5',
    //   '#7ECEFD',
    //   '#FFF6E5',
    //   '#FF7F66'
    // ];
    
    // let gravity = 0.2;
    // let friction = 0.98;
  
    // Event Listeners
    // window.addEventListener("resize", function() {
    //   canvas.width = window.innerWidth;	
    //   canvas.height = window.innerHeight;
    //   init();
    // });

    // Helper Functions
    // const randomColor = colors => {
    //   return colors[Math.floor(Math.random() * colors.length)];
    // }

    // easy check of viewport resolution
    // const view = (width + ' x ' + height);

    // All balls forever!
    const balls = [];

    // Ball Constructor
    function Ball(x, y, velX, velY, color, size) {
      this.x = x;
      this.y = y;
      this.velX = velX;
      this.velY = velY;
      this.color = color;
      this.size = size;
    }

    Ball.maxBalls = 100;
    Ball.spawnCount = 0;

    // ###########################
    // Functions!!!
    // ###########################

    // function to generate random number
    function random(min,max) {
      var num = Math.floor(Math.random()*(max-min)) + min;
      return num;
    }
    Ball.prototype.draw = function() {
      ctx.beginPath();
      ctx.fillStyle = this.color;
      ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Calc Window Edge Collision for balls
    Ball.prototype.update = function() {
      if ((this.x + this.size) >= width) {
        this.velX = -(this.velX);
      }

      if ((this.x - this.size) <= 0) {
        this.velX = -(this.velX);
      }

      if ((this.y + this.size) >= height) {
        this.velY = -(this.velY);
      }

      if ((this.y - this.size) <= 0) {
        this.velY = -(this.velY);
      }

      this.x += this.velX;
      this.y += this.velY;
    }

    Ball.prototype.collisionDetect = function() {
      for (var j = 0; j < balls.length; j++) {
        if (!(this === balls[j])) { // sphere collision check
          var dx = this.x - balls[j].x;
          var dy = this.y - balls[j].y;
          var distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < this.size + balls[j].size) {
            
            if (balls.length < Ball.maxBalls) {
              while (Ball.spawnCount < 5) {
                Ball.spawnCount += 1;
                let ball = new Ball(
                  balls[j].x,
                  balls[j].y,
                  random(-7,7), // X axis velocity
                  random(-7,7), // Y axis velocity
                  'rgb(' + random(0,255) + ',' + random(0,255) + ',' + random(0,255) +')',
                  random(1,30) // Ball size range in px
                );
                balls.push(ball);
              }
            }

            balls[j].color = this.color = 'rgb(' + random(0, 255) + ',' + random(0, 255) + ',' + random(0, 255) +')';
            balls.splice(j,1);
            Ball.spawnCount = 0;
          }
        }
      }
    }

    function spawnBalls() { // Spawn random balls
      var ball = new Ball(
        random(0,width),
        random(0,height),
        random(-7,7), // X axis velocity
        random(-7,7), // Y axis velocity
        'rgb(' + random(0,255) + ',' + random(0,255) + ',' + random(0,255) +')',
        random(5,50) // Ball size range in px
      );
      balls.push(ball);
    }

    // Animation Loop
    function loop() {
      ctx.fillStyle = 'rgba(0, 5, 25, 0.25)';  // draws new window background. Last param adjusts transparency
      ctx.fillRect(0, 0, width, height);

      while (balls.length < 10) { // max number of balls at a time
        spawnBalls();
      }

      for (var i = 0; i < balls.length; i++) {  // renders new ball positions
        balls[i].draw();
        balls[i].update();
        balls[i].collisionDetect();
      }

      requestAnimationFrame(loop); // loops each new frame
    }

    function countOrbs() {
      console.log('Orbs count:', balls.length);
    }

    // #######################
    // Function calls
    // #######################

    loop();

    setInterval(countOrbs, 2000);


    // ============================================

    // const script = document.createElement('script');
    // script.async = true;
    // script.src = Sandbox;
    
    // For the head
    // document.head.appendChild(script);
    
    // For the body
    // document.body.appendChild(script);
  }
    
  render() {
    return (
      <div className="Sandbox">
        <canvas ref={this.canvasRef} />
      </div>
    );
  }
}

export default Sandbox;
