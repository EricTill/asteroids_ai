var canvas = document.getElementById('can');
var ctx = canvas.getContext('2d');
var pressed = {};
var asteroids = [];
var touched = false;

//Should be global attributes
var delta_t = 0.05;



//Some thought should be given to these. They are bad. They make me feel bad.
var id = -1; //Used as a unique id for each asteroid
//var deletions = 0; //Used to modify the unique id when deleting an element


//This function should be changed!
var deleteElem = function(obj, array) {
    array.splice(array.indexOf(obj),1);
}
//It's a bad function!


//Commonly used functions:

//Return a real min to max (inclusive)
var getUnif = function(min, max) {
    return Math.random() * (max - min) + min;
}


//Return an integer min to max (inclusive)
var getRandInt = function(min,max) {
    return Math.round(getUnif(min,max));
}


//Emulate a normal distribution - this uses the central limit theorem (the more iterations, the closer to a true normal it will be)
var getNorm = function(mean, iterations) {
    var output = 0;
    for (var i = 0; i < iterations; i++) {
        output += Math.random() * mean;
    }
    return output / iterations;
}

//Runs every frame to adjust to resizing windows
var body_height;
var body_width;
var getSetStageSize = function (vert_percent, horz_percent) {
    body_height = window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight;
    body_width = window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth;

    canvas.width = horz_percent * body_width;
    canvas.height = vert_percent * body_height;
}


//Asteroid object definition:
function asteroid(x, y, r, max_veloc, alpha, id, color) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.max_veloc = max_veloc;
    this.alpha = 0;
    this.color = color;
    this.x_veloc = 10*getUnif(-1,1);
    this.y_veloc = 10*getUnif(-1,1);
    this.id = id
    this.friction = 1;
    //this.max_x = 0;
    //this.max_y = 0;
    //this.min_x = 0;
    //this.min_y = 0;
    //this.quadrants = [false, false, false, false]; //top right, bottom right, bottom left, top left quadrants
    
    //Randomly generate verticies for craggy-looking asteroid shapes
    //Start with randomly generated r and theta pairs
    this.num_verts = 2*getRandInt(6,9);
    this.thetas = new Array(this.num_verts);
    var scale = ((2*Math.PI)/this.num_verts);
    for(var i = 0; i<this.num_verts; i++){
	this.thetas[i] = i*scale + getUnif(-scale/3,scale/3);
    }
    this.thetas.sort();
    this.r_offsets = new Array(this.num_verts);
    for(var i = 0; i<this.num_verts; i++){
	this.r_offsets[i] = getUnif(-this.r/5,this.r/5);
    }
    //this.thetas[this.num_verts] = this.thetas[0];
    //this.thetas[this.num_verts] = this.thetas[0];
    //Convert them into cartesian offsets
    this.x_adds = [];
    this.y_adds = [];
    for(var i = 0; i<this.num_verts; i++){
	this.x_adds[i] = (this.r + this.r_offsets[i]) * Math.cos(this.thetas[i]);
	this.y_adds[i] = (this.r + this.r_offsets[i]) * Math.sin(this.thetas[i]);
    }
    this.x_adds[this.num_verts] = this.x_adds[0];
    this.y_adds[this.num_verts] = this.y_adds[0];
    this.max_x = Math.max.apply(Math,this.x_adds);
    this.max_y = Math.max.apply(Math,this.y_adds);
}

//Asteroid draw function
asteroid.prototype.draw = function () {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x + this.x_adds[0], this.y + this.y_adds[0]);
    for(var i=0; i<this.num_verts; i++){
    	ctx.lineTo(this.x + this.x_adds[i+1], this.y + this.y_adds[i+1]);
    }
    ctx.stroke();
};

//Updates the position of an asteroid
asteroid.prototype.updatePosition = function (scale) {
    //Calculate position
    //this.x_veloc += getUnif(-scale, scale) / this.r;
    //this.y_veloc += getUnif(-scale, scale) / this.r;
    //this.x_veloc /= this.friction;
    //this.y_veloc /= this.friction;
    //this.x_veloc = Math.min(this.x_veloc, this.max_veloc);
    //this.y_veloc = Math.min(this.y_veloc, this.max_veloc);
    //Update positions - make sure dot stays on canvas
    this.x += this.x_veloc * delta_t;
    this.y += this.y_veloc * delta_t;

    //Location related
    //this.max_y = this.y + this.max_y;
    //this.max_x = this.x + this.max_x;
    //this.min_y = this.y - this.max_y;
    //this.min_x = this.x - this.max_x;
    //this.quadrants[0] = ((this.max_y > canvas.height/2) && (this.max_x > canvas.width));
    //this.quadrants[1] = 
    //this.quadrants[2] = 
    //this.quadrants[3] = 

    //Collision detection
    if (this.x > canvas.width) {
        this.x %= canvas.width;
    } else if (this.x < 0) {
        this.x = canvas.width;
    };

    if (this.y > canvas.height) {
        this.y %= canvas.height;
    } else if (this.y < 0) {
        this.y = canvas.height;
    };
};

//Creates the controler events
var setup = function () {
    document.addEventListener('keydown', function (e) {
        pressed[e.keyCode] = true;
    });
    document.addEventListener('keyup', function (e) {
        pressed[e.keyCode] = false;
    });
    document.addEventListener('touchstart', function () {
	touched = true;
    });
    document.addEventListener('touchend', function () {
	touched = false;
    });
}


var x;
var y;
var r;
var color;
var updateGameState = function () {
    if (pressed[' '.charCodeAt(0)] == true || touched) {
        id++;
        x = getUnif(0,canvas.width);
        y = getUnif(0,canvas.height);
        r = getUnif(20,50);
        color = [1, 1, 1];
        asteroids.push(new asteroid(x, y, r, 20, 1, id, color));
    }

    for (var i = 0; i < asteroids.length; i++) {
        asteroids[i].updatePosition(15);
        asteroids[i].draw();
    }
}

//Main loop
var gameLoop = function () {
    getSetStageSize(1, 1);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateGameState();
    window.requestAnimFrame(gameLoop);
}


window.requestAnimFrame = (
    window.requestAnimationFrame || 
    window.webkitRequestAnimationFrame || 
    window.mozRequestAnimationFrame || 
    function (callback) {
        window.setTimeout(callback, 1000 / 60);
    }
);

//Old style of calling requestAnimationFrame... not really sure which is best, honestly
//window.requestAnimFrame = (function () {
//    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (callback) {
//        window.setTimeout(callback, 1000 / 60);
//    };
//})();

setup();
window.requestAnimFrame(gameLoop);
