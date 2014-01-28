//Some global variables
var canvas = document.getElementById('can');
var ctx = canvas.getContext('2d');
var pressed = {};
var asteroids = [];
var bullets = [];
var particles = [];
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
var exp = Math.exp;


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


function player(x,y) {
    this.visibility_cycle = 0.25*60; //measured in secs*60
    this.visibility_cutoff = 0;
    this.visible = true;
    this.invulnerability = 0;
    this.extra_lives = 3;
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
    this.score = 0;
    this.thrusting = false;
    this.thrust_x_shape = [-14, -16, -14, -17, -14, -16, -14];
    this.thrust_y_shape = [-3, -2, -1, 0, 1, 2, 3];
    this.thrust_x_adds = [];
    this.thrust_y_adds = [];
    this.thrust_flicker_frames = 3;
    this.thrust_lock = this.thrust_flicker_frames-1;
    this.vert_rs = [];
    for(var i = 0; i<this.x_shape.length; i++) {
	this.vert_rs.push(sqrt(this.x_shape[i] * this.x_shape[i] + this.y_shape[i] * this.y_shape[i]))
    }
    this.max_r = Math.max.apply(Math,this.vert_rs);
    this.min_r = Math.min.apply(Math,this.vert_rs);
}

player.prototype.move = function(accel,dtheta) {

    var tar_dx,tar_dy,speed,non_zero_v,theta_func,veloc_theta;
    var angular_v;

    //Update angle
    this.theta += dtheta;
    this.theta = circConstrain(this.theta);

    this.dx = this.dx + accel * cos(this.theta);
    this.dy = this.dy + accel * sin(this.theta); 
}

player.prototype.updatePosition = function() {

    this.invulnerability = this.invulnerability > 0 ? this.invulnerability-1 : 0;

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

    var ang = 2*pi*(this.invulnerability % this.visibility_cycle)/this.visibility_cycle;
    this.visible = cos(ang) > this.visibility_cutoff;

    if(this.visible) {
	//draw player's ship
	ctx.strokeStyle = "#ffffff";
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.moveTo(this.x + this.x_adds[0], this.y + this.y_adds[0]);
	for(var i=0; i<this.num_verts; i++){
    	    ctx.lineTo(this.x + this.x_adds[i+1], this.y + this.y_adds[i+1]);
	}
	ctx.stroke();
	
	//draw afterburners if player is thrusting
	if(this.thrusting) {
	    this.thrust_lock++;
	    if((this.thrust_lock %= this.thrust_flicker_frames) == 0) {
		//ctx.strokeStyle = "#ff7722";
		ctx.beginPath();
		for(var i = 0; i < this.thrust_x_shape.length; i++) {
		    this.thrust_x_adds[i] = this.thrust_x_shape[i] * cos(this.theta) - this.thrust_y_shape[i] * sin(this.theta);
		    this.thrust_y_adds[i] = this.thrust_x_shape[i] * sin(this.theta) + this.thrust_y_shape[i] * cos(this.theta);
		}
		ctx.moveTo(this.x + this.thrust_x_adds[0], this.y + this.thrust_y_adds[0]);
		for(var i = 1; i<this.thrust_x_shape.length; i++) {
		    ctx.lineTo(this.x + this.thrust_x_adds[i], this.y + this.thrust_y_adds[i]);
		}
		ctx.stroke();
	    }
	}
	ctx.lineWidth = 1;
    }

    this.displayScore();
    this.displayLives();
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

player.prototype.shoot = function() {
    var vx;
    var vy;
    var speed = sqrt(this.dx*this.dx,this.dy*this.dy);
    speed = max(5,speed);
    vx = (speed + 5) * cos(this.theta) + this.dx;
    vy = (speed + 5) * sin(this.theta) + this.dy;
    
    if(null_buls.length > 0) {
	var curr_id = null_buls.pop();
	bullets[curr_id] = new bullet(this.x+this.x_adds[0],this.y+this.y_adds[0],1.5,vx,vy,curr_id);
    }
    else {
	bullets.push(new bullet(this.x+this.x_adds[0],this.y+this.y_adds[0],1.5,vx,vy,bullets.length));
    }
}

//This could be more complicated...
player.prototype.addScore = function(points) {
    this.score += points;
}

player.prototype.displayScore = function() {
    ctx.font = "20px LucidaConsole";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(this.score.toString(),canvas.width/2,30);
}

player.prototype.displayLives = function() {
    ctx.font = "20px LucidaConsole";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Extra lives: "+this.extra_lives.toString(),canvas.width/5,30);
}

player.prototype.die = function () {
    this.extra_lives--;
    this.x = canvas.width/2;
    this.y = canvas.height/2;
    this.dx = 0;
    this.dy = 0;
    this.invulnerability += 2*60;
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

//Asteroid object definition:
function asteroid(x, y, r, dx, dy, id) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.max_veloc = 40;
    this.x_veloc = dx;
    this.y_veloc = dy;
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
    this.max_r_indx = this.r_offsets.indexOf(Math.max.apply(Math,this.r_offsets));
    this.min_r_indx = this.r_offsets.indexOf(Math.min.apply(Math,this.r_offsets));
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
asteroid.prototype.updatePosition = function () {
    //this.x_veloc = min(this.x_veloc, this.max_veloc);
    //this.y_veloc = min(this.y_veloc, this.max_veloc);
    this.x += this.x_veloc;
    this.y += this.y_veloc;

    //Edge collision detection
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

asteroid.prototype.displayTheta = function (th,color,len) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(this.x,this.y);
    ctx.lineTo(this.x + len*cos(th),this.y + len*sin(th));
    ctx.stroke();
}

function particle(x,y,id) {
    this.age = 0;
    this.theta = circConstrain(getUnif(0,2*pi));
    this.alpha = 1;
    this.lifespan = 0.2*60; //seconds_alive*60
    this.speed = getUnif(3,7);
    this.x = x;
    this.y = y;
    this.dx = this.speed*cos(this.theta);
    this.dy = this.speed*sin(this.theta);
    this.r = 1.3;
    this.id = id;
    this.marked_for_deletion = false;
}

particle.prototype.updatePosition = function () {
    this.age++;
    this.alpha -= 1/this.lifespan; //linear decay - alpha = 0 after this.lifespan # of frames
    this.alpha = max(this.alpha,0);
    this.x += this.dx;
    this.y += this.dy;

    if (this.x > canvas.width) {
	this.marked_for_deletion = true;
    } else if (this.x < 0) {
	this.marked_for_deletion = true;
    };

    if (this.y > canvas.height) {
	this.marked_for_deletion = true;
    } else if (this.y < 0) {
	this.marked_for_deletion = true;
    };

    if(this.age > this.lifespan || this.alpha == 0) {
	this.marked_for_deletion = true;
    }

    if(this.marked_for_deletion) {
	deleteParticle(this.id);
	null_pars.push(this.id);
    }
}

particle.prototype.draw = function() {
    ctx.fillStyle = "rgba(255,255,255,"+this.alpha+")";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x,this.y,this.r,0,2*pi);
    ctx.fill();
}

var deleteParticle = function(id) {
    particles[id] = null;
}

var deleteAsteroid = function(id,shot) {
    if (shot) {
	p.addScore(1 * (level - 1));
	//Create new asteroids where the last one blew up if it was big enough
	if (asteroids[id].r >= 20) {
	    var ast = asteroids[id];
	    //var n = floor(ast.r/10) + getRandInt(0,2);
	    var n = getRandInt(2,3) + floor(ast.r/40);
	    for(var i = 0; i < n; i++) {
		//                   x                                        y
		spawnAsteroid(ast.x+getUnif(-ast.max_r/n,ast.max_r/n), ast.y+getUnif(-ast.max_r/n,ast.max_r/n),
			      max(getUnif(ast.r/n,ast.r*(n-1)/n),15), ast.x_veloc+getUnif(-1,1), ast.y_veloc+getUnif(-1,1), 0);
		//                     r                                         dx                    dy                  min_dist
	    }
	}
    }
    asteroids[id] = null;
    null_asts.push(id);
}

var deleteBullet = function(id) {
    if(bullets[id].crossings < 2) {
	for(var i = 0; i <= getRandInt(10,20); i++){
	    spawnParticle(bullets[id].x,bullets[id].y);
	}
    }
    bullets[id] = null;
    null_buls.push(id);
}

var spawnParticle = function(x,y) {
    if(null_pars.length > 0) {
	var curr_id = null_pars.pop();
	particles[curr_id] = new particle(x,y,curr_id)
    }
    else {
	particles.push(new particle(x,y,particles.length));
    }
}

var spawnAsteroid = function(x,y,r,dx,dy,min_dist) {
    if (min_dist > 0) {
	var dist = sqrt((x-p.x)*(x-p.x) + (y-p.y)*(y-p.y));
	if(dist - p.max_r - r < min_dist) {
	    x = moveAwayFromPoint(x, p.x, min_dist + p.max_r + r, canvas.width);
	    y = moveAwayFromPoint(y, p.y, min_dist + p.max_r + r, canvas.height);
	}
    }
    //Only push new elements if there aren't any free null ones
    if(null_asts.length > 0) {
	var curr_id = null_asts.pop();
	asteroids[curr_id] = new asteroid(x, y, r, dx, dy, curr_id);
    }
    else {
        asteroids.push(new asteroid(x, y, r, dx, dy, asteroids.length-1));
    }    
}


var moveAwayFromPoint = function(point,orig,dist,dim) {
    var flip = point < orig ? -1 : 1;
    var temp = point + flip * dist;
    if (temp > dim) {
	return dim;
    }
    else if(temp < 0) {
	return 0;
    }
    return temp;
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


var up;
var down;
var left;
var right;
var shoot_lock = false;
var frame = 0;
var dtheta = (2*pi/(60*1.6)); //measured in sections needed to turn the ship 360 degrees
getSetStageSize(1, 1);
var dist;
var p = new player(canvas.width/2,canvas.height/2);
var null_asts = [];
var null_buls = [];
var null_pars = [];
var asts_remaining = 0;
var level = 1;
var transition_time = 0;
var asts_per_level = 5;

var updateGameState = function () {

    if (p.extra_lives >= 0) {

    	//ticktock(frame++);
    	getControlInputs();
    	
    	p.updatePosition();
    	p.draw();
    	
    	//Loop over all (non-null) asteroids, render them, and update their positions
	asts_remaining = 0;
    	for (var i = 0; i < asteroids.length; i++) {
    	    if(asteroids[i] == null) {
    		continue;
    	    }
    	    asteroids[i].draw();
    	    asteroids[i].updatePosition();
	    asts_remaining++;
    	    
    	    //perform hit detection on player
    	    dist = sqrt((p.x-asteroids[i].x)*(p.x-asteroids[i].x) + (p.y-asteroids[i].y) * (p.y-asteroids[i].y));
    	    if(dist - p.max_r < asteroids[i].max_r) {
		//TODO: Add particle blast where contact occurred
		if(p.invulnerability <= 0) {
    		    p.die(); //only die if player isn't invulnerable
		}
    		deleteAsteroid(i,false);
    	    }
	}

	if(asts_remaining <= 0) {
	    startNewLevel(1.5*60,transition_time++); //f(level,wait-time) wait-time measured in secs*60
	}
    	
    	//Loop over all (non-null) bullets, perform collision detection on all asteroids, render them and then update their positions
    	for(var i = 0; i < bullets.length; i++){
    	    
    	    if(bullets[i] == null) { continue; } //Skip any null bullets
    	    
    	    //Perform collision detection on asteroids and bullets
    	    for(var j = 0; j < asteroids.length; j++){
    		
    		if(asteroids[j] == null || bullets[i] == null) { continue; } //Skip any null bullets or asteroids
    		
    		dist = sqrt((bullets[i].x-asteroids[j].x)*(bullets[i].x-asteroids[j].x)+(bullets[i].y-asteroids[j].y)*(bullets[i].y-asteroids[j].y));
    		if(dist <= asteroids[j].max_r) {
    		    if(dist <= asteroids[j].min_r || preciseCollideBulAst(bullets[i],asteroids[j],dist)) {
    			deleteAsteroid(j,true);
    			deleteBullet(i);
    			continue;
    		    }
    		}
    	    }
    	    
    	    if(bullets[i] == null) { continue; } //Skip any null bullets
    	    
    	    //Render and update all non-null bullets
    	    bullets[i].draw();
    	    bullets[i].updatePosition();
    	}
    	
    	//Loop over all particles, update their positions and render them
    	for (var i = 0; i < particles.length; i++) {
    	    if(particles[i] == null) {
    		continue;
    	    }
    	    particles[i].draw();
    	    particles[i].updatePosition();
    	}
    }
    else {
	//death screen
	ctx.font = "50px LucidaConsole";
	ctx.fillStyle = "#ffffff";
	ctx.fillText("Game over! Thanks for playing :)",canvas.width/4,canvas.height/2);
    }
}

var startNewLevel = function(wait,time_passed) {
    //Wait a while to spawn in the asteroids and let player know what level they're on
    if(time_passed < wait) {
	//Display what level you're on
	ctx.font = "20px LucidaConsole";
	ctx.fillStyle = "#ffffff";
	ctx.fillText("Level "+level.toString(),canvas.width/2,canvas.height/4);
    }
    else {
	//Reinitialize some variables
	asteroids = [];
	null_asts = [];
	particles = [];
	null_pars = [];
	transition_time = 0;
	//TODO: Make sure asteroids don't spawn on top of player
	for(var i = 0; i < level * asts_per_level; i++) {
	    //              x,                              y,                    r,               dx,              dy     min_dist
	    spawnAsteroid(getUnif(0,canvas.width), getUnif(0,canvas.height), getUnif(20,50), 1*getUnif(-1,1), 1*getUnif(-1,1),100);
	}
	level++;
    }
}

var getControlInputs = function () {
    //if (pressed['A'.charCodeAt(0)] == true || touched) {
    //	//                    x,                         y,                    r,               dx,              dy
    //	spawnAsteroid(getUnif(0,canvas.width), getUnif(0,canvas.height), getUnif(20,50), 1*getUnif(-1,1), 1*getUnif(-1,1));
    //}

    if (pressed[' '.charCodeAt(0)] == false) {
	shoot_lock = false;
    }
    if (!shoot_lock && pressed[' '.charCodeAt(0)] == true) {
	shoot_lock = true;
	p.shoot();
    }
    
    //use arrow keys to move player around
    up = pressed[38] || pressed['W'.charCodeAt(0)] ? 1 : 0;
    down = pressed[40] || pressed['S'.charCodeAt(0)] ? 1 : 0;
    left = pressed[37] || pressed['A'.charCodeAt(0)] ? 1 : 0;
    right = pressed[39] || pressed['D'.charCodeAt(0)] ? 1 : 0;

    //For thrust "animation" on player
    p.thrusting = up;

    p.move(0.1 * (up - down), dtheta * (right - left));
    //p.displayVeloc();
    //p.displayTheta(p.theta);

    if (pressed['S'.charCodeAt(0)] == true) {
	p.dx = 0;
	p.dy = 0;
    }
}

var preciseCollideBulAst = function (bul,ast,dist) {
    var ang;
    //First, find angle between bullet and asteroid (from asteroid's pov)
    ang = circConstrain(atan2(bul.y-ast.y,bul.x-ast.x));

    //Next, find which two verticies of the asteroid the bullet is between
    var indx = 0;
    while (indx<ast.thetas.length) {
	if(ang == ast.thetas[indx]) {
	    return dist > (ast.r_offsets[indx]+ast.r) ? false : true; //on the off chance that the bullet directly hits a vertex
	}
	else if (ang < ast.thetas[indx]) {
	    break;
	}
	indx++;
    }

    //Finally, calculate the distance from the center of the asteroid to the point on
    //the correct edge which is in between the bullet and center of the asteroid.
    //In order to do this, calculate the slope between the two points to create and use
    //a linear equation (converted to polar form) to solve for this distance.
    var x1 = ast.x_adds[(indx - 1) % ast.num_verts];
    var x2 = ast.x_adds[indx % ast.num_verts];
    var y1 = ast.y_adds[(indx - 1) % ast.num_verts];
    var y2 = ast.y_adds[indx % ast.num_verts];
    //TODO: x1==x2 exception

    var m = (y2-y1)/(x2-x1);
    var edge_r = (y1 - m * x1)/(sin(ang) - (m * cos(ang)));
    return dist > edge_r ? false : true;
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

setup();
window.requestAnimFrame(gameLoop);
