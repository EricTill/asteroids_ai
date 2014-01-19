//Some global variables
var canvas = document.getElementById('can');
var ctx = canvas.getContext('2d');
var pressed = {};
var asteroids = [];
var bullets = [];
var touched = false;
var delta_t = 0.05;

//Alias some mathematics functions/constants
var pi = Math.PI;
var min = Math.min;
var max = Math.max;
var cos = Math.cos;
var sin = Math.sin;
var asin = Math.asin;
var acos = Math.acos;
var rand = Math.random;
var round = Math.round;
var sqrt = Math.sqrt;
var pow = Math.pow;
var abs = Math.abs;
var floor = Math.floor;
var atan2 = Math.atan2;

//Some thought should be given to these. They are bad. They make me feel bad.
var ast_id = -1; //Used as a unique id for each asteroid
var bul_id = -1;
//var deletions = 0; //Used to modify the unique id when deleting an element


//This function should be changed!
var deleteElem = function(obj, array) {
    array.splice(array.indexOf(obj),1);
}
//It's a bad function!

//Commonly used functions:

//Return a real min to max (inclusive)
var getUnif = function(a, b) {
    return rand() * (b - a) + a;
}


//Return an integer min to max (inclusive)
var getRandInt = function(a,b) {
    return round(getUnif(a,b));
}


//Emulate a normal distribution - this uses the central limit theorem (the more iterations, the closer to a true normal it will be)
var getNorm = function(mean, iterations) {
    var output = 0;
    for (var i = 0; i < iterations; i++) {
        output += rand() * mean;
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


//Polygon parent class for every visible object in the game (asteroids, shots and player)
//This class should handle all collision detection and drawing functions


function player(x,y) {
    this.x = x;
    this.y = y;
    this.x_adds = [];
    this.y_adds = [];
    this.x_shape = [14, -14, -7, -14, 14];
    this.y_shape = [0, -7, 0, 7, 0];
    this.num_verts = 4;
    this.color = [1, 1, 1];
    this.dx = 0;
    this.dy = 0;
    this.theta = -pi/2;
    this.max_veloc = 8;
}

player.prototype.move = function(accel,dtheta) {

    var tar_dx,tar_dy,speed,non_zero_v,theta_func,veloc_theta;
    var angular_v;

    //Update angle
    this.theta += dtheta;
    this.theta = circConstrain(this.theta);

    //console.log(this.theta);

    //Handle new velocity. Involves some compliated so that a maximum
    //velocity can be sensibly imposed.
    //First, calculate the new target velocity.
    tar_dx = this.dx + accel * cos(this.theta);
    tar_dy = this.dy + accel * sin(this.theta);
    speed = sqrt(pow(tar_dx,2),pow(tar_dy,2));
    
    //if (speed < this.max_veloc) {
	this.dx = tar_dx;
	this.dy = tar_dy;
    //}; 

    //If your speed is maxed out, but you're thrusting this
    //will allow you to begin to go in the direction that you're pointing.
    non_zero_v = this.dx != 0 ? this.dx : this.dy;
    theta_func = this.dx != 0 ? Math.acos : Math.asin;
    //console.log(theta_func(pi));
    veloc_theta = this.dx != 0 ? Math.acos(this.dx) : Math.asin(this.dy);
    veloc_theta %= pi;
    var test = this.dx != 0 ? 'x' : 'y';
    //console.log(Math.acos(this.dx),Math.asin(this.dy),':',Math.acos(this.dx/speed),Math.asin(this.dy/speed),':',test,this.dx,',',this.dy);
    angular_v = (this.theta - veloc_theta)/2;
    //console.log(veloc_theta,':',this.theta,':',angular_v);
    //p.displayTheta(veloc_theta,"#FFDDFF");
    //p.displayTheta(angular_v + veloc_theta,"#00DDFF");
    //if (speed >= this.max_veloc && (veloc_theta != this.theta)) {
    //	this.dx = speed * cos(veloc_theta + angular_v);
    //	this.dy = speed * sin(veloc_theta + angular_v);
    //};
}

player.prototype.updatePosition = function() {
    this.x += this.dx;
    this.y += this.dy;
    for(var i = 0; i < this.num_verts + 1; i++) {
	this.x_adds[i] = this.x_shape[i] * cos(this.theta) - this.y_shape[i] * sin(this.theta);
	this.y_adds[i] = this.x_shape[i] * sin(this.theta) + this.y_shape[i] * cos(this.theta);
    }

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
}

player.prototype.draw = function () {
    //console.log( 'drawing' );
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(this.x + this.x_adds[0], this.y + this.y_adds[0]);
    for(var i=0; i<this.num_verts; i++){
    	ctx.lineTo(this.x + this.x_adds[i+1], this.y + this.y_adds[i+1]);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
}

player.prototype.displayVeloc = function () {
    ctx.strokeStyle = "#FF0000";
    ctx.beginPath();
    ctx.moveTo(this.x,this.y);
    ctx.lineTo(this.x + 8*this.dx,this.y + 8*this.dy);
    ctx.stroke();
}

player.prototype.displayTheta = function (th,color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(this.x,this.y);
    ctx.lineTo(this.x + (32 + this.x_shape[0])*cos(th),this.y + (32 + this.x_shape[0])*sin(th));
    ctx.stroke();
}

player.prototype.shoot = function(id) {
    var vx;
    var vy;
    var speed = sqrt(pow(this.dx,2),pow(this.dy,2));
    speed = max(5,speed);
    vx = (speed + 5) * cos(this.theta) + this.dx;
    vy = (speed + 5) * sin(this.theta) + this.dy;

    bullets.push(new bullet(this.x+this.x_adds[0],this.y+this.y_adds[0],1.5,vx,vy,id));
}

function bullet(x,y,r,dx,dy,id) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.dx = dx;
    this.dy = dy;
    this.id = id;
    this.crossings = 0;
}

bullet.prototype.updatePosition = function() {
    this.x += this.dx;
    this.y += this.dy;

    if (this.x > canvas.width) {
        this.x %= canvas.width;
	this.crossings++;
    } else if (this.x < 0) {
        this.x = canvas.width;
	this.crossings++;
    };

    if (this.y > canvas.height) {
        this.y %= canvas.height;
	this.crossings++;
    } else if (this.y < 0) {
        this.y = canvas.height;
	this.crossings++;
    };

    if (this.crossings > 1) {
	deleteBullet(this.id);
    }

}

bullet.prototype.draw = function () {
    ctx.fillStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x,this.y,this.r,0,2*pi);
    ctx.fill();
}

var deleteBullet = function(id) {
    bullets[id] = null;
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
    this.max_r;
    this.max_x;
    this.max_y;
    //this.max_x = 0;
    //this.max_y = 0;
    //this.min_x = 0;
    //this.min_y = 0;
    //this.quadrants = [false, false, false, false]; //top right, bottom right, bottom left, top left quadrants
    
    //Randomly generate verticies for craggy-looking asteroid shapes
    //Start with randomly generated r and theta pairs
    this.num_verts = 2*getRandInt(6,9);
    this.thetas = new Array(this.num_verts);
    var scale = ((2*pi)/this.num_verts);
    for(var i = 0; i<this.num_verts; i++){
	this.thetas[i] = circConstrain(i*scale + getUnif(-scale/3,scale/3));
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
	this.x_adds[i] = (this.r + this.r_offsets[i]) * cos(this.thetas[i]);
	this.y_adds[i] = (this.r + this.r_offsets[i]) * sin(this.thetas[i]);
    }
    this.x_adds[this.num_verts] = this.x_adds[0];
    this.y_adds[this.num_verts] = this.y_adds[0];
    this.max_x = Math.max.apply(Math,this.x_adds);
    this.max_y = Math.max.apply(Math,this.y_adds);
    this.max_r = Math.max.apply(Math,this.r_offsets) + this.r;
    this.min_r = Math.min.apply(Math,this.r_offsets) + this.r;
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
    //this.x_veloc = min(this.x_veloc, this.max_veloc);
    //this.y_veloc = min(this.y_veloc, this.max_veloc);
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

asteroid.prototype.displayTheta = function (th,color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(this.x,this.y);
    ctx.lineTo(this.x + (this.max_r + 32)*cos(th),this.y + (this.max_r + 32)*sin(th));
    ctx.stroke();
}

var deleteAsteroid = function(id) {
    asteroids[id] = null;
}

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


var circConstrain = function (theta) {
    return theta-2*pi*floor(theta/(2*pi));
}


var x;
var y;
var r;
var color;
var up;
var down;
var left;
var right;
var shoot_lock = false;
var frame = 0;
var dtheta = (2*pi/(60*1.25)); //measured in sections needed to turn the ship 360 degrees
getSetStageSize(1, 1);
var dist;
var p = new player(canvas.width/2,canvas.height/2);
var updateGameState = function () {

    //ticktock(frame++);
    
    if (pressed['A'.charCodeAt(0)] == true || touched) {
        ast_id++;
        x = getUnif(0,canvas.width);
        y = getUnif(0,canvas.height);
        r = getUnif(20,50);
        color = [1, 1, 1];
        asteroids.push(new asteroid(x, y, r, 20, 1, ast_id, color));
    }

    if (pressed[' '.charCodeAt(0)] == false) {
	shoot_lock = false;
    }
    if (!shoot_lock && pressed[' '.charCodeAt(0)] == true) {
	bul_id++;
	p.shoot(bul_id);
	shoot_lock = true;
    }
    
    up = pressed[38] ? 1 : 0;
    down = pressed[40] ? 1 : 0;
    left = pressed[37] ? 1 : 0;
    right = pressed[39] ? 1 : 0;

    p.move(0.1 * (up - down), dtheta * (right - left));
    p.updatePosition();
    p.draw();
    //p.displayVeloc();
    //p.displayTheta(p.theta);

    if (pressed['S'.charCodeAt(0)] == true) {
	p.dx = 0;
	p.dy = 0;
    }

    //Loop over all (non-null) asteroids, render them, and update their positions
    for (var i = 0; i < asteroids.length; i++) {
	if(asteroids[i] == null) {
	    continue;
	}
        asteroids[i].draw();
        asteroids[i].updatePosition(15);
    }

    //Loop over all (non-null) bullets, perform collision detection on all asteroids, render them and then update their positions
    for(var i = 0; i < bullets.length; i++){
	if(bullets[i] == null) {
	    continue;
	}

	for(var j = 0; j < asteroids.length; j++){
	    if(asteroids[j] == null || bullets[i] == null) {
		continue;
	    }
	    dist = sqrt(pow(bullets[i].x-asteroids[j].x,2)+pow(bullets[i].y-asteroids[j].y,2));
	    if(dist <= asteroids[j].max_r) {
		if(dist <= asteroids[j].min_r) {
		    deleteAsteroid(j);
		    deleteBullet(i);
		    continue;
		}
		else if(preciseCollide(bullets[i],asteroids[j],dist)){
		    deleteAsteroid(j);
		    deleteBullet(i);
		    continue;
		}
	    }
	}
	
	if(bullets[i] == null) {
	    continue;
	}
	bullets[i].draw();
	bullets[i].updatePosition();
    }

}

var preciseCollide = function (bul,ast,dist) {
    var ang;
    //First, find angle between bullet and asteroid (from asteroid's pov)
    ang = circConstrain(atan2(bul.y-ast.y,bul.x-ast.x));
    //ast.displayTheta(ang,"#00FF00"); console.log(ang,':::ast:',ast.x,ast.y,':bul:',bul.x,bul.y);

    //Next, find which two verticies of the asteroid the bullet is between
    var indx = 0;
    while (indx<ast.thetas.length) {
	indx++;
	if(ang == ast.thetas[indx]) {
	    return dist > ast.r_offsets[indx] ? false : true;
	}
	else if (ang > ast.thetas[indx]) {
	    break;
	}
    }

    //Finally, calculate the distance from the center of the asteroid to the point on
    //the correct edge which is in between the bullet and center of the asteroid.
    if(indx < (ast.thetas.length - 1)) {
	var weight = (ang - ast.thetas[indx])/(ast.thetas[indx + 1] - ast.thetas[indx]);
	var edge_dist = ast.r_offsets[indx]*(weight-1) + ast.r_offsets[indx+1]*weight; //IS THIS RIGHT?? Worried about where the weight goes...
	debugger;
	return  dist > edge_dist ? false : true; 
    }
    else {
	var weight = (ang - ast.thetas[indx])/((2*pi + ast.thetas[0]) - ast.thetas[indx]); //Could rework this to eliminate if/else statement with % length and 2*pi switch
	var edge_dist = ast.r_offsets[indx]*(weight-1) + ast.r_offsets[0]*weight;
	console.log("in between");
	debugger;
	return  dist > edge_dist ? false : true;
    }
}

var ticktock = function (frame) {
    if (frame % 60 == 0) {
	console.log('Tick');
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
