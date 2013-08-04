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
    var friction = 1.0;
    var delta_t = 0.05;
    var max_veloc = 20;
    var ID = -1; //Used as a unique ID for each circle
    var deletions = 0; //Used to modify the unique ID when deleting an element
    
    function deleteElem(obj,array) {
	console.log('Deleted object #:'+obj.ID);
	array.splice(obj.ID-deletions,1);
	deletions++;
    }

    //Return an integer 0 to max (inclusive)
    function getRandInt(max) { 
	return Math.floor(Math.random()*max);
    }

    //Return a real min to max (inclusive)
    function getUnif(min,max) {
	return Math.random()*(max-min) + min;
    }

    //Emulate a normal distribution - this uses the central limit theorem (the more iterations, the closer to a true normal it will be)
    function getNorm(mean,iterations) {
	var output = 0;
	for (i = 0; i < iterations; i++) {
	    output += Math.random()*mean;
	}
	return output/iterations;
    }

    function setup() {
        document.addEventListener('keydown', function (e) {
            pressed[e.keyCode] = true;
        });
        document.addEventListener('keyup', function (e) {
            pressed[e.keyCode] = false;
        });
    }

    function Circle(x, y, r, red, green, blue, ID) {
        this.x = x;
        this.y = y;
        this.r = r;
	this.color = [];
	this.color.push(red);
	this.color.push(green);
	this.color.push(blue);
	this.alpha = 1;
        this.x_veloc = 0;
        this.y_veloc = 0;
	this.ID = ID;
	this.maxAge = Math.ceil(getNorm(20*60,6)) + 600; //Age measured in frames
	this.age = 0;

        this.draw = function () {
            ctx.fillStyle = 'rgba('+this.color.join(',')+','+this.alpha+')';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
            ctx.fill();
            //ctx.linewidth = 1;
            //ctx.fillStyle = 'rgba(1,1,1,'+this.alpha+')';
            //ctx.stroke();
            //ctx.closePath();
        };

        this.updatePosition = function (scale) {
	    //Update velocities
            this.x_veloc += getUnif(-scale,scale) / this.r;
            this.y_veloc += getUnif(-scale,scale) / this.r;
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
	    this.age++;
	    this.alpha -= (1/this.maxAge);
        };
    }

    function updateGameState() {
        if (pressed[' '.charCodeAt(0)] == true) {
	    ID++;
            Circle_array.push(new Circle(getUnif(0,canv_width), getUnif(0,canv_height), getUnif(3,35), getRandInt(255), getRandInt(255), getRandInt(255), ID));
        }
        for (i = 0; i < Circle_array.length; i++) {
	    if((Circle_array.length > 1) && (Circle_array[i].age === Circle_array[i].maxAge)) {
	    	deleteElem(Circle_array[i],Circle_array);
	    }
	    else {
		Circle_array[i].updatePosition(15);
	    }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canv_width, canv_height);
        for (i = 0; i < Circle_array.length; i++) {	    
	    Circle_array[i].draw();
	    console.log(Circle_array[i].color+','+Circle_array[i].age+','+Circle_array[i].maxAge);
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
