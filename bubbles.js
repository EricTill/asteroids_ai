$(document).ready(function () {
    var body_height = window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight;
    var body_width = window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth;
    $('.body').height(body_height - 100);


    //Create scaled canvas element
    var vert_percent = 1;
    var horz_percent = 1;
    var canv_width = horz_percent * body_width;
    var canv_height = vert_percent * (body_height - 100);
    var canv_def = "<canvas id='can' height='" + canv_height + "' width='" + canv_width + "'>Sorry, your browser does not support html5:(</canvas>";
    $('.body').append(canv_def);

    var ctx = document.getElementById('can').getContext('2d');
    var pressed = {}; //Used for getting user inputs
    var Circle_array = [];
    var friction = 1.1;
    var delta_t = 0.05;
    var max_veloc = 20;
    var count = -1; //Used as a unique ID for each circle
    var deletions = 0; //Used to modify the unique ID when deleting an element


    function Circle(x, y, r, color, count) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.color = color;
	this.color.push(1);
        this.x_veloc = 0;
        this.y_veloc = 0;
	this.count = count;

        this.draw = function () {
            ctx.fillStyle = 'rgba('+this.color.join(',')+')';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
            ctx.fill();
            ctx.linewidth = 1;
            ctx.fillStyle = "black";
            ctx.stroke();
            ctx.closePath();
        };

        this.updatePosition = function (scale) {
	    //Update velocities
            this.x_veloc += ((scale * Math.random()) - (scale / 2)) / this.r;
            this.y_veloc += ((scale * Math.random()) - (scale / 2)) / this.r;
            this.x_veloc /= friction;
            this.y_veloc /= friction;
            this.x_veloc = Math.min(this.x_veloc, max_veloc);
            this.y_veloc = Math.min(this.y_veloc, max_veloc);
	    //Update positions - make sure dot stays on canvas
            this.x += this.x_veloc * delta_t;
            this.y += this.y_veloc * delta_t;	    
            if (this.x > canv_width) {
                this.x %= canv_width;
            } else if (this.x < 0) {
                this.x = canv_width;
            }
            if (this.y > canv_height) {
                this.y %= canv_height;
            } else if (this.y < 0) {
                this.y = canv_height;
            }
	    //Update alpha
	    this.alpha *= .988514; //Sets half-life to about 1 second (60 frames, hopefully...)
        };
    }
    
    function getRGB() {
	return [Math.floor(Math.random()*256),Math.floor(Math.random()*256),Math.floor(Math.random()*256)];
    }

    function deleteCircle(circle) {
	Cirlce_array.splice(circle.count-deletions,1);
	deletions++;
    }

    function setup() {
        document.addEventListener('keydown', function (e) {
            pressed[e.keyCode] = true;
        });
        document.addEventListener('keyup', function (e) {
            pressed[e.keyCode] = false;
        });
    }

    function updateGameState() {
        if (pressed[' '.charCodeAt(0)] == true) {
	    count++;
            var x = Math.random() * canv_width;
            var y = Math.random() * canv_height;
            var r = Math.random() * 35 + 3;
            Circle_array.push(new Circle(x, y, r, getRGB(), count))
        }
        for (i = 0; i < Circle_array.length; i++) {
	    Circle_array[i].updatePosition();
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canv_width, canv_height);
        for (i = 0; i < Circle_array.length; i++) {
	    if(Circle_array[i].alpha < .01) {
		deleteCircle(Circle_array[i]);
	    }
	    else {
		Circle_array[i].draw();
		console.log(Circle_array[i].color+','+Circle_array[i].count);
	    }
        }
    }

    function gameLoop() {
        updateGameState();
        draw();
        window.requestAnimFrame(gameLoop);
    }

    window.requestAnimFrame = (function () {
        return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
    })();

    setup();
    window.requestAnimFrame(gameLoop);
});
