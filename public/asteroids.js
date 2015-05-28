//Some global variables
var canvas = document.getElementById('can');
var ctx = canvas.getContext('2d');
var pressed = {};
var asteroids = [];
var bullets = [];
var particles = [];
var touched = false;
var delta_t = 0.05;
var muted = true;
var mute_lock = false;
var mobile = false;
//var thrust  = new Audio();
// var splode1 = new Audio();
// var splode2 = new Audio();
// var splode3 = new Audio();
// var fire    = new Audio();
// thrust.src = 'sound_effects/thrust_fade.wav';
// splode1.src = 'sound_effects/explode1.wav';
// splode2.src = 'sound_effects/explode2.wav';
// splode3.src = 'sound_effects/explode3.wav';
// fire.src = 'sound_effects/fire.wav';
//thrust.load();
// splode1.load();
// splode2.load();
// splode3.load();
// fire.load();
var DEBUG_DRAW = false;

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
var nlog = Math.log;
var exp = Math.exp;

//Return a real min to max (inclusive)
var getUnif = function(a, b) {
    return rand() * (b - a) + a;
};


//Return an integer min to max (inclusive)
var getRandInt = function(a,b) {
    return round(getUnif(a,b));
};


//Runs every frame to adjust to resizing windows
var body_height;
var body_width;
var getSetStageSize = function (vert_percent, horz_percent) {
    body_height = window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight;
    body_width = window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth;

    canvas.width = horz_percent * body_width;
    canvas.height = vert_percent * body_height;
};


function player(x,y) {
    this.respawn_time = 2.5*60; //secs*60
    this.death_timer = 0;
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
    this.last_theta_dir = 0;
    this.min_dtheta =  (2*pi/(60*3.0)); // measured time it takes to do a full rotation
    this.max_dtheta =  (2*pi/(60*3)); // measured time it takes to do a full rotation
    this.frames_to_max_dtheta = 0.05*60; //measured in seconds*60
    this.theta_b = nlog(this.max_dtheta/this.min_dtheta)/this.frames_to_max_dtheta;
    this.num_consecutive_turn = 0;
    this.num_verts = 4;
    this.alpha = 1;
    this.color = [1, 1, 1];
    this.dx = 0;
    this.dy = 0;
    this.theta = -pi/2;
    this.max_speed = 120;
    this.score = 0;
    this.thrusting = false;
    this.thrust_x_shape = [-14, -16, -14, -17, -14, -16, -14];
    this.thrust_y_shape = [-3, -2, -1, 0, 1, 2, 3];
    this.thrust_x_adds = [];
    this.thrust_y_adds = [];
    this.thrust_flicker_frames = 3;
    this.thrust_lock = this.thrust_flicker_frames-1;
    this.vert_rs = [];
    this.death_rotation_speeds = [];
    this.death_thetas = [];
    this.x_death_drifts = [];
    this.y_death_drifts = [];
    this.x_adds_midpoints = [];
    this.y_adds_midpoints = [];
    this.shape_thetas = [];
    for(var i = 0; i<this.x_shape.length; i++) {
	this.vert_rs.push(sqrt(this.x_shape[i] * this.x_shape[i] + this.y_shape[i] * this.y_shape[i]));
	this.shape_thetas.push(circConstrain(atan2(this.y_shape[i]-this.y,this.x_shape[i]-this.x)));
    }
    this.max_r = Math.max.apply(Math,this.vert_rs);
    this.min_r = Math.min.apply(Math,this.vert_rs);
    for(i = 0; i<this.x_shape.length-1; i++) {
	this.x_adds_midpoints.push(0);
	this.y_adds_midpoints.push(0);
	this.death_rotation_speeds.push(0);
	this.death_thetas.push(0);
	this.x_death_drifts.push(0);
	this.y_death_drifts.push(0);
    }
    this.frames_since_last_shot = 0;
}

player.prototype.move = function(accel,theta_dir) {

    var speed;
    var temp_dx;
    var temp_dy;

    this.theta = circConstrain(this.theta + theta_dir * this.max_dtheta);

    temp_dx = this.dx + accel * cos(this.theta);
    temp_dy = this.dy + accel * sin(this.theta);
    speed = temp_dx * temp_dx + temp_dy * temp_dy;

    if(speed <= this.max_speed) {
	this.dx = temp_dx;
	this.dy = temp_dy;
    }
    else { 
	this.dx = this.max_speed * temp_dx/speed;
	this.dy = this.max_speed * temp_dy/speed;	
    }

};

player.prototype.updatePosition = function() {

    if(this.death_timer > 0) {
	this.death_timer++;
	if(this.death_timer > this.respawn_time) {
	    this.death_timer = 0;
	    this.respawn();
	}
    }

    this.invulnerability = this.invulnerability > 0 ? this.invulnerability-1 : 0;

    this.x += this.dx;
    this.y += this.dy;

    for(var i = 0; i < this.num_verts + 1; i++) {
	this.x_adds[i] = this.x_shape[i] * cos(this.theta) - this.y_shape[i] * sin(this.theta);
	this.y_adds[i] = this.x_shape[i] * sin(this.theta) + this.y_shape[i] * cos(this.theta);
    }

    if(this.death_timer > 0) {
	for(i = 0; i < this.x_adds_midpoints.length; i++) {
	    this.x_adds_midpoints[i] = (this.x_adds[i]+this.x_adds[i+1])/2;
	    this.y_adds_midpoints[i] = (this.y_adds[i]+this.y_adds[i+1])/2;
	}
    }

    if(this.thrusting) {
	for(i = 0; i < this.thrust_x_shape.length; i++) {
	    this.thrust_x_adds[i] = this.thrust_x_shape[i] * cos(this.theta) - this.thrust_y_shape[i] * sin(this.theta);
	    this.thrust_y_adds[i] = this.thrust_x_shape[i] * sin(this.theta) + this.thrust_y_shape[i] * cos(this.theta);
	}
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
};

player.prototype.draw = function () {

    var ang = 2*pi*(this.invulnerability % this.visibility_cycle)/this.visibility_cycle;
    this.visible = cos(ang) > this.visibility_cutoff;

    if(this.visible) {
	//draw player's ship
	ctx.lineWidth = 1.5;

	//player is in the middle of a death animation
	if(this.death_timer > 0) {
	    var x1,x2,y1,y2,tmp_x1,tmp_x2,tmp_y1,tmp_y2,prc;
	    prc = ((this.respawn_time-this.death_timer+1)/this.respawn_time);
	    ctx.strokeStyle="rgba(255,255,255,"+prc+")";
	    for(var i = 0; i<this.x_adds_midpoints.length; i++) {

		//Update death angles
		this.death_thetas[i] = circConstrain(this.death_thetas[i] + this.death_rotation_speeds[i]);
		
		//Shift relative to midpoint for rotation
		tmp_x1 = (this.x_adds[i] - this.x_adds_midpoints[i]);
		tmp_x2 = (this.x_adds[i+1] - this.x_adds_midpoints[i]);
		tmp_y1 = (this.y_adds[i] - this.y_adds_midpoints[i]);
		tmp_y2 = (this.y_adds[i+1] - this.y_adds_midpoints[i]);

		//apply rotation matrix
		x1 = tmp_x1 * cos(this.death_thetas[i]) - tmp_y1 * sin(this.death_thetas[i]);
		x2 = tmp_x2 * cos(this.death_thetas[i]) - tmp_y2 * sin(this.death_thetas[i]);
		y1 = tmp_x1 * sin(this.death_thetas[i]) + tmp_y1 * cos(this.death_thetas[i]);
		y2 = tmp_x2 * sin(this.death_thetas[i]) + tmp_y2 * cos(this.death_thetas[i]);

		//Shift back relative to midpoints
		x1 = (x1 + this.x_adds_midpoints[i] + (1 - prc) * this.x_death_drifts[i]);
		x2 = (x2 + this.x_adds_midpoints[i] + (1 - prc) * this.x_death_drifts[i]);
		y1 = (y1 + this.y_adds_midpoints[i] + (1 - prc) * this.y_death_drifts[i]);
		y2 = (y2 + this.y_adds_midpoints[i] + (1 - prc) * this.y_death_drifts[i]);

		//Draw line
		ctx.beginPath();
		ctx.moveTo(x1 + p.x, y1 + p.y);
		ctx.lineTo(x2 + p.x, y2 + p.y);
		ctx.stroke();
	    }
	}
	
	//player is normal or has just respawned
	else {
	    ctx.strokeStyle = "#ffffff";
	    ctx.beginPath();
	    ctx.moveTo(this.x + this.x_adds[0], this.y + this.y_adds[0]);
	    for(i=0; i<this.num_verts; i++){
    		ctx.lineTo(this.x + this.x_adds[i+1], this.y + this.y_adds[i+1]);
	    }
	    ctx.stroke();
	    
	    //draw afterburners if player is thrusting
	    if(this.thrusting) {
		this.thrust_lock++;
		if((this.thrust_lock %= this.thrust_flicker_frames) === 0) {
		    ctx.beginPath();
		    ctx.moveTo(this.x + this.thrust_x_adds[0], this.y + this.thrust_y_adds[0]);
		    for(i = 1; i<this.thrust_x_shape.length; i++) {
			ctx.lineTo(this.x + this.thrust_x_adds[i], this.y + this.thrust_y_adds[i]);
		    }
		    ctx.stroke();
		}
	    }
	}
	ctx.lineWidth = 1;
    }

    
    this.displayScore();
    this.displayLives();
};

player.prototype.displayVeloc = function () {
    ctx.strokeStyle = "#FF0000";
    ctx.beginPath();
    ctx.moveTo(this.x,this.y);
    ctx.lineTo(this.x + 8*this.dx,this.y + 8*this.dy);
    ctx.stroke();
};

player.prototype.displayTheta = function (th,color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(this.x,this.y);
    ctx.lineTo(this.x + (32 + this.x_shape[0])*cos(th),this.y + (32 + this.x_shape[0])*sin(th));
    ctx.stroke();
};

player.prototype.shoot = function() {
    if (this.frames_since_last_shot >= frames_between_shots) {
	this.frames_since_last_shot = 0;
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
	
	if (!muted) {
	    new Audio('sound_effects/fire.wav').play();
	}
    }

};

//This could be more complicated...
player.prototype.addScore = function(points) {
    this.score += points;
};

player.prototype.displayScore = function() {
    ctx.font = "20px Impact";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(this.score.toString(),canvas.width/2,30);
};

player.prototype.displayLives = function() {
    ctx.font = "20px Impact";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("Extra lives: "+this.extra_lives.toString(),canvas.width/4,30);
};

player.prototype.die = function () {
    this.death_timer++;
    for(var i = 0; i<this.x_adds_midpoints.length; i++) {
	this.death_rotation_speeds[i] = getUnif(-0.03,0.03);
	this.death_thetas[i] = 0;
	//First, calc angle between midpoint and player location
	var ang = circConstrain(atan2(this.y_adds_midpoints[i],this.x_adds_midpoints[i]));
	ang += getUnif((-30/360)*2*pi,(30/360)*2*pi);
	var speed = getUnif(70,100);
	this.x_death_drifts[i] = speed * cos(ang);
	this.y_death_drifts[i] = speed * sin(ang);
    }

    if (!muted) {
	new Audio('sound_effects/explode1.wav').play();
    }

};

var indexInOrderedArray = function(elem,array) {
    for(var i=0; i<array.length; i++) {
	if (elem <= array[i])
	    return i;
    }
    return i;
};

player.prototype.ai = function() {
    //Should return an "inputs" object which emulate keypresses/screen touches.
    var inputs = {};
    inputs.up = 0; //not going to implement movement at first.
    inputs.left = 0;
    inputs.right = 0;
    inputs.shoot = false;

    

    //Need to decide what to aim at. Rank asteroids in order of their threat.
    //Asteroids on a collision course obviously get the highest ranking.
    //Asteroids not on a collision course are ranked somehow and gotten to if there are no current threats
    var threats = []; //asteroids on a collision course
    var threat_times = []; //time til collision for each asteroid on a collision course
    var targets = []; //asteroids just there to shoot
    var target_angles = []; //Distance from current theta for each non threatening target

    for(var i=0; i<asteroids.length; i++) {
	var ast = asteroids[i];
	if (ast === null || ast.death_timer > 0)
	    continue;

	//Check if a shot right now would hit.
	var check = this.shot_min_dist(ast);
	if (check.min_dist < ast.min_r)
	    inputs.shoot = true;

	var threat_analysis = this.determineIfThreat(ast);
	if(!inputs.shoot && this.shot_min_dist(ast) <= ast.min_r)
	    inputs.shoot = true;
	if (threat_analysis.is_threat) {
	    //put in right place in ordered list of threats
	    var ind = indexInOrderedArray(threat_analysis.time_til_impact,threat_times);
	    threat_times.splice(ind, 0, threat_analysis.time_til_impact);
	    threats.splice(ind, 0, i);
	    //console.log(threat_analysis.time_til_impact,threats,threat_times);
	}
	else {
	    //rank targets by angular distance
	    var ang = circConstrain(atan2(ast.y-p.y,ast.x-p.x));
	    var theta_dist = circConstrain(abs(this.theta - ang));
	    var ind = indexInOrderedArray(theta_dist,target_angles);
	    target_angles.splice(ind, 0, theta_dist);
	    targets.splice(ind, 0, i);
	}
    }

    //Accounting - figure out which asteroid each bullet will hit first

    //Array of length(asteroids) with an int representing how many bullets are on a collision course with that ast
    //Asteroids on a collision course with the player need special treatment because it's not good enough that a bullet
    //will hit them at some point. That bullet needs to hit them before that asteroid hits the player!
    var asteroid_hits = new Array(asteroids.length); 
    for(var i=0; i<asteroid_hits.length; i++){asteroid_hits[i]=0;} //initialize to 0
    for (var i=0; i<bullets.length; i++) {
	var bul = bullets[i];
	if (bul === null)
	    continue;
	
	var min_t = false;
	var ast_ind = false;
	for(var k=0; k<asteroids.length; k++) {
	    var ast = asteroids[k];
	    if (ast === null || ast.death_timer > 0)
		continue;

	    var temp_t = bul.min_dist(ast);
	    if (asteroid_hits[k] >= this.calc_shots_needed(ast.r) || temp_t !== false && (min_t === false || temp_t < min_t)) {
		ast_ind = k;
		min_t = temp_t;
	    }
	}
	if (ast_ind !== false) {
	    var threat_ind = threats.indexOf(ast_ind);
	    if ( threat_ind> -1) { //ast is on threats list
		if (temp_t < threat_times[threat_ind])
		    asteroid_hits[ast_ind]++;
		//else, this asteroid is going to hit the player first, so it shouldn't be treated as safe
	    }
	    else {
		asteroid_hits[ast_ind]++;
	    }
	}
    }


    //Now that the list of threats has been determined, start to deal with them.
    //Turn the ship to aim at the asteroid and shoot when optimal.
	
    //Check if there are already enough bullets heading towards this ast. If so, move down the
    //list - or move on to the next list.
    var ast = false;
    for (var i=0; i<threats.length; i++) {
	if (asteroid_hits[threats[i]] < this.calc_shots_needed(asteroids[threats[i]].r)) {
	    ast = asteroids[threats[i]];
	    i=threats.length;
	}
    }
    if (ast === false) {
	for (var i=0; i<targets.length; i++) {
	    if (asteroid_hits[targets[i]] < this.calc_shots_needed(asteroids[targets[i]].r)) {
		ast = asteroids[targets[i]];
		i=targets.length;
	    }
	}
    }
    
    //Figure out if turning right or left makes the shot better.
    //If both seem to suck, try turning towards it manually based
    //on the angle between the ship and ast.
    var check = this.shot_min_dist(ast);
    if (ast !== false && check.min_dist > ast.min_r) {
	var if_turn_right = this.shot_min_dist(ast,this.max_dtheta);
	var if_turn_left = this.shot_min_dist(ast,-this.max_dtheta);
	if (if_turn_right.min_dist < if_turn_left.min_dist && !check.t_neg)
    	    inputs.right = 1;
	else if (if_turn_right.min_dist >= if_turn_left.min_dist && !check.t_neg)
    	    inputs.left = 1;
	else if (check.t_neg && if_turn_right.min_dist < if_turn_left.min_dist) {
    	    inputs.left = 1;	
	}
	else {
    	    inputs.right = 1;
	}
    }

    return inputs;
};

player.prototype.calc_shots_needed = function(r) {
    //Should return the estimated maximum shots needed to deal with an asteroid
    //(Based on its size)
    //Spawning code:
    // if (this.r >= 20) {
    // 	var n = getRandInt(2,3) + floor(this.r/40);
    // 	for(var i = 0; i < n; i++) {
    // 	    //spawnAsteroid(stuff);
    //      // where r = max(getUnif(this.r/n,this.r*(n-1)/n),15)
    // 	}
    // }
    
    var self = this;
    if (r < 20)
	return 1;
    var n = 3 + floor(r/40);
    return 3 + self.calc_shots_needed(r*(n-1)/n);
};

player.prototype.shot_min_dist = function(ast,theta_correction) {
    //This function returns the minimum distance a bullet will ever
    //reach between itself and an asteroid. This does NOT take the
    //torus universe effect into account.
    theta_correction = theta_correction || 0;
    
    //Calc velocity of bullet:
    var vx;
    var vy;
    var speed = sqrt(this.dx*this.dx,this.dy*this.dy);
    speed = max(5,speed);
    vx = (speed + 5) * cos(this.theta + theta_correction) + this.dx;
    vy = (speed + 5) * sin(this.theta + theta_correction) + this.dy;
    
    //Check if shot would get within min_r of ast
    var a = this.x + this.x_adds[0];
    var b = vx;
    var c = ast.x;
    var d = ast.dx;
    var e = this.y + this.y_adds[0];
    var f = vy;
    var g = ast.y;
    var h = ast.dy;
    var t_min = (a*(d-b) + b*c - (c*d) - (e*f) + (e*h) + (f*g) - (g*h))/((b*b) - (2*b*d) + (d*d) + (f-h)*(f-h));
    if (DEBUG_DRAW) {
	ctx.fillStyle = "#ff7700";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.arc(a+b*t_min,e+f*t_min,4,0,2*pi);
	ctx.fill();
    }
    var x_part = (a + b * t_min - c - d * t_min)*(a + b * t_min - c - d * t_min);
    var y_part = (e + f * t_min - g - h * t_min)*(e + f * t_min - g - h * t_min);
    var min_dist = sqrt(x_part + y_part);
    return {min_dist: min_dist, t_neg: t_min<0, t_min: t_min};
};

player.prototype.determineIfThreat = function(ast){
    var p_r = this.max_r;
    var ast_r = ast.max_r;
    
    //Check if shot would get within min_r of ast
    var a = this.x;
    var b = this.dx;
    var c = ast.x;
    var d = ast.dx;
    var e = this.y;
    var f = this.dy;
    var g = ast.y;
    var h = ast.dy;
    var t_min = (a*(d-b) + b*c - (c*d) - (e*f) + (e*h) + (f*g) - (g*h))/((b*b) - (2*b*d) + (d*d) + (f-h)*(f-h));
    var x_part = (a + b * t_min - c - d * t_min)*(a + b * t_min - c - d * t_min);
    var y_part = (e + f * t_min - g - h * t_min)*(e + f * t_min - g - h * t_min);
    var min_dist = sqrt(x_part + y_part);
    var will_hit = (min_dist - p_r - ast_r < 0) && t_min > 0;

    if (DEBUG_DRAW) {
	if (will_hit) {
	    var stroke = "#ff00ff";
	    ctx.beginPath();
	    ctx.strokeStyle = stroke;
	    ctx.moveTo(this.x,this.y);
	    ctx.lineTo(ast.x,ast.y);
	    ctx.stroke();
	}
    }

    var threat_analysis = {};
    threat_analysis.is_threat = will_hit;
    var dist_p_to_ast = sqrt((this.y - ast.y)*(this.y - ast.y) + (this.x - ast.x)*(this.x - ast.x));
    var v_mag = sqrt(ast.dx*ast.dx + ast.dy*ast.dy);
    threat_analysis.time_til_impact = (dist_p_to_ast - p_r - ast_r) / v_mag;
    return(threat_analysis);
};

player.prototype.respawn = function() {
    this.extra_lives--;
    this.x = canvas.width/2;
    this.y = canvas.height/2;
    this.dx = 0;
    this.dy = 0;
    this.theta = -pi/2;
    this.invulnerability += 2*60;    
};


function bullet(x,y,r,dx,dy,id) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.dx = dx;
    this.dy = dy;
    this.id = id;
    this.crossings = 0;
}

bullet.prototype.min_dist = function(ast) {
    //Returns the time at which the minimum distance between
    //the bullet and asteroid will reach their minimum distance
    //IF that minimum dist is less than the minimum ast radius.
    //Otherwise, return false

    var vx = this.dx;
    var vy = this.dy;
    
    //Check if shot would get within min_r of ast
    var a = this.x;
    var b = vx;
    var c = ast.x;
    var d = ast.dx;
    var e = this.y;
    var f = vy;
    var g = ast.y;
    var h = ast.dy;
    var t_min = (a*(d-b) + b*c - (c*d) - (e*f) + (e*h) + (f*g) - (g*h))/((b*b) - (2*b*d) + (d*d) + (f-h)*(f-h));
    // if (DEBUG_DRAW) {
    // 	ctx.fillStyle = "#ff0077";
    // 	ctx.lineWidth = 1;
    // 	ctx.beginPath();
    // 	ctx.arc(a+b*t_min,e+f*t_min,4,0,2*pi);
    // 	ctx.fill();
    // }
    var x_part = (a + b * t_min - c - d * t_min)*(a + b * t_min - c - d * t_min);
    var y_part = (e + f * t_min - g - h * t_min)*(e + f * t_min - g - h * t_min);
    var min_dist = sqrt(x_part + y_part);
    if (t_min < 0 || min_dist > ast.min_r)
	return false;
    else
	return t_min;
};

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

};

bullet.prototype.displayTheta = function (th,color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(this.x,this.y);
    ctx.lineTo(this.x + 32*cos(th),this.y + 32*sin(th));
    ctx.stroke();
};

bullet.prototype.draw = function () {
    ctx.fillStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x,this.y,this.r,0,2*pi);
    ctx.fill();
    //this.displayTheta(atan2(this.dy,this.dx),"#ff3300");
};

//Asteroid object definition:
function asteroid(x, y, r, dx, dy, id) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.max_veloc = 40;
    this.dx = dx;
    this.dy = dy;
    this.id = id;
    this.friction = 1;
    
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
    for(i = 0; i<this.num_verts; i++){
	this.r_offsets[i] = getUnif(-this.r/5,this.r/5);
    }

    //Convert them into cartesian offsets
    this.x_adds = [];
    this.y_adds = [];
    for(i = 0; i<this.num_verts; i++){
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
    //death animation stuff
    this.death_timer = 0;
    this.death_anim_time = 0.5*60; //secs*60
    this.x_adds_midpoints = [];
    this.y_adds_midpoints = [];
    this.death_rotation_speeds = [];
    this.death_thetas = [];
    this.x_death_drifts = [];
    this.y_death_drifts = [];
    for(i = 0; i<this.x_adds.length-1; i++) {
	this.x_adds_midpoints.push(0);
	this.y_adds_midpoints.push(0);
	this.death_rotation_speeds.push(0);
	this.death_thetas.push(0);
	this.x_death_drifts.push(0);
	this.y_death_drifts.push(0);
    }
    //console.log("new ast created:",this.id,this);
}



asteroid.prototype.displayVeloc = function () {
    ctx.strokeStyle="#FF0000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x,this.y);
    ctx.lineTo(this.x + 10000*this.dx,this.y + 10000*this.dy);
    ctx.stroke();
};

asteroid.prototype.displayThreat = function() {
    ctx.strokeStyle="#00FF00";
    ctx.lineWidth = 1;
    var v_mag = sqrt(this.dx*this.dx + this.dy*this.dy);
    
    ctx.beginPath();
    var x1 = this.x - (this.max_r * (this.dy/v_mag)) - (this.max_r * this.dx/v_mag);
    var y1 = this.y + (this.max_r * (this.dx/v_mag)) - (this.max_r * this.dy/v_mag);
    ctx.moveTo(x1,y1);
    ctx.lineTo(x1 + 10000*this.dx,y1 + 10000*this.dy);
    ctx.stroke();
    
    ctx.beginPath();
    var x2 = this.x + (this.max_r * (this.dy/v_mag)) - (this.max_r * this.dx/v_mag);
    var y2 = this.y - (this.max_r * (this.dx/v_mag)) - (this.max_r * this.dy/v_mag);
    ctx.moveTo(x2,y2);
    ctx.lineTo(x2 + 10000*this.dx,y2 + 10000*this.dy);
    ctx.stroke();
};

//Asteroid draw function
asteroid.prototype.draw = function () {
    //asteroid is in the middle of a death animation
    if (DEBUG_DRAW) {
	//this.displayVeloc();
	this.displayThreat();
    }
    if(this.death_timer > 0) {
	var x1,x2,y1,y2,tmp_x1,tmp_x2,tmp_y1,tmp_y2,prc;
	prc = ((this.death_anim_time-this.death_timer+1)/this.death_anim_time);
	ctx.strokeStyle="rgba(255,255,255,"+prc+")";
	for(var i = 0; i<this.x_adds_midpoints.length; i++) {
	    
	    //Update death angles
	    this.death_thetas[i] = circConstrain(this.death_thetas[i] + this.death_rotation_speeds[i]);
	    
	    //Shift relative to midpoint for rotation
	    tmp_x1 = (this.x_adds[i] - this.x_adds_midpoints[i]);
	    tmp_x2 = (this.x_adds[i+1] - this.x_adds_midpoints[i]);
	    tmp_y1 = (this.y_adds[i] - this.y_adds_midpoints[i]);
	    tmp_y2 = (this.y_adds[i+1] - this.y_adds_midpoints[i]);
	    
	    //apply rotation matrix
	    x1 = tmp_x1 * cos(this.death_thetas[i]) - tmp_y1 * sin(this.death_thetas[i]);
	    x2 = tmp_x2 * cos(this.death_thetas[i]) - tmp_y2 * sin(this.death_thetas[i]);
	    y1 = tmp_x1 * sin(this.death_thetas[i]) + tmp_y1 * cos(this.death_thetas[i]);
	    y2 = tmp_x2 * sin(this.death_thetas[i]) + tmp_y2 * cos(this.death_thetas[i]);
	    
	    //Shift back relative to midpoints
	    x1 = (x1 + this.x_adds_midpoints[i] + (1 - prc) * this.x_death_drifts[i]);
	    x2 = (x2 + this.x_adds_midpoints[i] + (1 - prc) * this.x_death_drifts[i]);
	    y1 = (y1 + this.y_adds_midpoints[i] + (1 - prc) * this.y_death_drifts[i]);
	    y2 = (y2 + this.y_adds_midpoints[i] + (1 - prc) * this.y_death_drifts[i]);
	    
	    //Draw line
	    ctx.beginPath();
	    ctx.moveTo(x1 + this.x, y1 + this.y);
	    ctx.lineTo(x2 + this.x, y2 + this.y);
	    ctx.stroke();
	}
    }
    
    else {
	ctx.strokeStyle = "#ffffff";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(this.x + this.x_adds[0], this.y + this.y_adds[0]);
	for(var i=0; i<this.num_verts; i++){
    	    ctx.lineTo(this.x + this.x_adds[i+1], this.y + this.y_adds[i+1]);
	}
	ctx.stroke();
    }
};

//Updates the position of an asteroid
asteroid.prototype.updatePosition = function () {
    //this.dx = min(this.dx, this.max_veloc);
    //this.dy = min(this.dy, this.max_veloc);
    this.x += this.dx;
    this.y += this.dy;

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

    if(this.death_timer > 0) {
	this.death_timer++;
	if(this.death_timer >= this.death_anim_time) {
	    //console.log("sent deletion request",this.id);
	    deleteAsteroid(this.id);
	}
    }
};

asteroid.prototype.displayTheta = function (th,color,len) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(this.x,this.y);
    ctx.lineTo(this.x + len*cos(th),this.y + len*sin(th));
    ctx.stroke();
};

asteroid.prototype.die = function (shot) {
    //console.log("asteroid dead",this.id,shot);
    if (shot) {
	p.addScore(5 * (level + round(this.r) - 1));
	//Create new asteroids where the last one blew up if it was big enough
	if (this.r >= 20) {
	    var n = getRandInt(2,3) + floor(this.r/40);
	    for(var i = 0; i < n; i++) {
		//                        x                                        y
		spawnAsteroid(this.x+getUnif(-this.max_r/n,this.max_r/n), this.y+getUnif(-this.max_r/n,this.max_r/n),
			      max(getUnif(this.r/n,this.r*(n-1)/n),15), this.dx+getUnif(-1.5,1.5), this.dy+getUnif(-1.5,1.5), 0);
		//                        r                                         dx                         dy                    min_dist
	    }
	}
    }
    
    if (!muted) {
	new Audio('sound_effects/explode'+getRandInt(2,3)+'.wav').play();
    }

    //death animation stuff
    this.death_timer++;
    for(var i = 0; i<this.x_adds_midpoints.length; i++) {
	this.death_rotation_speeds[i] = getUnif(-0.03,0.03);
	this.death_thetas[i] = 0;
	this.x_death_drifts[i] = getUnif(-45,45);
	this.y_death_drifts[i] = getUnif(-45,45);
    }
};

function particle(x,y,id) {
    this.age = 0;
    this.theta = circConstrain(getUnif(0,2*pi));
    this.alpha = 1;
    this.lifespan = 0.4*60; //seconds_alive*60
    this.speed = getUnif(2,5);
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
    this.alpha = max(this.alpha,0.001);
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

    if(this.age > this.lifespan || this.alpha === 0) {
	this.marked_for_deletion = true;
    }

    if(this.marked_for_deletion) {
	deleteParticle(this.id);
    }
};

particle.prototype.draw = function() {
    ctx.fillStyle = "rgba(255,255,255,"+this.alpha+")";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x,this.y,this.r,0,2*pi);
    ctx.fill();
};


var deleteParticle = function(id) {
    null_pars.push(id);
    particles[id] = null;
};


var deleteAsteroid = function(id) {
    //console.log("deleted:",asteroids[id].id,asteroids[id]);
    null_asts.push(id);
    asteroids[id] = null;
};

var deleteBullet = function(id) {
    if(bullets[id].crossings < 2) {
	for(var i = 0; i <= getRandInt(10,20); i++){
	    spawnParticle(bullets[id].x,bullets[id].y);
	}
    }
    bullets[id] = null;
    null_buls.push(id);
};

var spawnParticle = function(x,y) {
    if(null_pars.length > 0) {
	var curr_id = null_pars.pop();
	particles[curr_id] = new particle(x,y,curr_id);
    }
    else {
	particles.push(new particle(x,y,particles.length));
    }
};

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
	//console.log("spawning new ast:",x, y, r, dx, dy, curr_id);
	asteroids[curr_id] = new asteroid(x, y, r, dx, dy, curr_id);
    }
    else {
	//console.log("spawning new ast:",x, y, r, dx, dy, asteroids.length);
        asteroids.push(new asteroid(x, y, r, dx, dy, asteroids.length));
    }    
};


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
};


//Creates the controler events - used to. Not needed for ai
var setup = function () {
    window.onresize = function(event) {
	getSetStageSize(1,1);
    };
};


var circConstrain = function (theta) {
    return theta-2*pi*floor(theta/(2*pi));
};


var up;
var down;
var left;
var right;
var shoot_lock = false;
var frames_between_shots = 8;
var frame = 0;
//var dtheta = (2*pi/(60*1.6)); //measured in sections needed to turn the ship 360 degrees
getSetStageSize(1, 1);
var dist;
var p = new player(canvas.width/2,canvas.height/2);
var null_asts = [0];
var null_buls = [0];
var null_pars = [0];
var asts_remaining = 0;
var level = 1;
var transition_time = 0;
var asts_per_level = 7;
var new_game = true;
var restart_wait = 300;

var updateGameState = function () {

    if (p.extra_lives >= 0) {

	//Mute controls
	if (pressed['M'.charCodeAt(0)] === false) {
	    mute_lock = false;
	}
	if (!mute_lock && pressed['M'.charCodeAt(0)] === true) {
	    mute_lock = true;
	    muted = muted ? false : true; //toggle 'muted' variable
	}

    	//ticktock(frame++);
	if(p.death_timer <= 0) {
    	    getControlInputs();
    	}
	p.frames_since_last_shot++;
    	p.updatePosition();
    	p.draw();
    	
    	//Loop over all (non-null) asteroids, render them, and update their positions
	asts_remaining = 0;
    	for (var i = 0; i < asteroids.length; i++) {
    	    if(asteroids[i] === null) {
    		continue;
    	    }
    	    asteroids[i].draw();
    	    asteroids[i].updatePosition();
    	    if(asteroids[i] === null) {
    		continue;
    	    }
	    asts_remaining++;
	    //debugger;
    	    
	    if(p.death_timer <= 0) {
    		//perform hit detection on player
		if(asteroids[i].death_timer == 0) {
    		    dist = sqrt((p.x-asteroids[i].x)*(p.x-asteroids[i].x) + (p.y-asteroids[i].y) * (p.y-asteroids[i].y));
		    if(dist <= (asteroids[i].max_r + p.max_r)) {
    			if(preciseCollideAstPlayer(p,asteroids[i]) || dist <= (asteroids[i].min_r + p.min_r)) {
			    //TODO: Add particle blast where contact occurred
			    if(p.invulnerability <= 0) {
    				p.die(); //only die if player isn't invulnerable
			    }
    			    asteroids[i].die(false);
    			}
		    }
		}
	    }
	}

	if(asts_remaining <= 0) {
	    var wait_time = level == 1 ? 0.5 : 0.2;
	    startNewLevel(wait_time*60,transition_time++); //f(level,wait-time) wait-time measured in secs*60
	}
    	
    	//Loop over all (non-null) bullets, perform collision detection on all asteroids, render them and then update their positions
    	for(i = 0; i < bullets.length; i++){
    	    
    	    if(bullets[i] === null) { continue; } //Skip any null bullets
    	    
    	    //Perform collision detection on asteroids and bullets
    	    for(var j = 0; j < asteroids.length; j++){
    		
    		if(asteroids[j] === null || bullets[i] === null) { continue; } //Skip any null bullets or asteroids
    		
    		dist = sqrt((bullets[i].x-asteroids[j].x)*(bullets[i].x-asteroids[j].x)+(bullets[i].y-asteroids[j].y)*(bullets[i].y-asteroids[j].y));
    		if(asteroids[j].death_timer == 0 && dist <= asteroids[j].max_r) {
    		    if(dist <= asteroids[j].min_r || preciseCollideBulAst(bullets[i],asteroids[j],dist)) {
    			asteroids[j].die(true);
			//deleteAsteroid(j,true);
    			deleteBullet(i);
    			continue;
    		    }
    		}
    	    }
    	    
    	    if(bullets[i] === null) { continue; } //Skip any null bullets
    	    
    	    //Render and update all non-null bullets
    	    bullets[i].draw();
    	    bullets[i].updatePosition();
    	}
    	
    	//Loop over all particles, update their positions and render them
    	for (i = 0; i < particles.length; i++) {
    	    if(particles[i] !== null) {
    		particles[i].draw();
    		particles[i].updatePosition();
	    }
    	}
    }
    else {
	//death screen
	ctx.font = "50px Impact";
	ctx.fillStyle = "#ffffff";
	ctx.textAlign = "center";
	ctx.fillText("It scored: " + p.score,canvas.width/2,canvas.height/2);
	    
    for (var i = 0; i < asteroids.length; i++) {
        if(asteroids[i] === null) {
            continue;
        }
        asteroids[i].draw();
        asteroids[i].updatePosition();
        if(asteroids[i] === null) {
            continue;
        }
    }
    for (i = 0; i < particles.length; i++) {
            if(particles[i] !== null) {
            particles[i].draw();
            particles[i].updatePosition();
        }
    }

    while(restart_wait > 0) {
        //restart the game - just reinitialize everything that needs to be (hopefully...)
	restart_wait--;
        shoot_lock = false;
        frame = 0;
        p = new player(canvas.width/2,canvas.height/2);
        null_asts = [0];
        null_buls = [0];
        null_pars = [0];
        asts_remaining = 0;
        level = 1;
        transition_time = 0;
        bullets = [];
        asteroids = [];
        particles = [];
        new_game = false;
    }
    }
};

var startNewLevel = function(wait,time_passed) {
    //Wait a while to spawn in the asteroids and let player know what level they're on
    if(time_passed < wait) {
	//Display what level you're on
	ctx.font = "20px Impact";
	ctx.fillStyle = "#ffffff";
	ctx.textAlign = "center";
	ctx.fillText("Level "+level.toString(),canvas.width/2,canvas.height/4);
	if (level === 1 && new_game) {
	    ctx.fillText("WAD or arrow keys to move",canvas.width/2,3*canvas.height/4);
	    ctx.fillText("Spacebar or touch screen to shoot",canvas.width/2,3*canvas.height/4+30);
	    ctx.fillText("Press 'M' key to mute/unmute audio",canvas.width/2,3*canvas.height/4+60);
	}
    }
    else {
	//Reinitialize some variables
	//asteroids = [];
	//null_asts = [];
	//particles = [];
	//null_pars = [];
	transition_time = 0;
	//TODO: Make sure asteroids don't spawn on top of player
	for(var i = 0; i < level * asts_per_level; i++) {
	    //              x,                              y,                    r,               dx,              dy           min_dist
	    spawnAsteroid(getUnif(0,canvas.width), getUnif(0,canvas.height), getUnif(20,50), 1*getUnif(-1.5,1.5), 1*getUnif(-1.5,1.5),100);
	}
	level++;
    }
    restart_wait = 300;
};

var getControlInputs = function () {
    
    //Obviously this used to be controlled by the player. Now it has to be controlled by the AI.
    var inputs = p.ai();

    //Determine up, left and right.
    up = inputs.up;
    left = inputs.left;
    right = inputs.right;

    p.thrusting = up;

    p.move(0.1 * up, right - left);
    if (inputs.shoot)
	p.shoot();

    //p.displayVeloc();
    //p.displayTheta(p.theta);

};

var preciseCollideAstPlayer = function(ship,ast) {
    var xa1,xa2,xp1,xp2,ya1,ya2,yp1,yp2,info;
    for(var i = 0; i < ship.x_adds.length - 1; i++) {
	xp1 = ship.x_adds[i] + ship.x;
	xp2 = ship.x_adds[i+1] + ship.x;
	yp1 = ship.y_adds[i] + ship.y;
	yp2 = ship.y_adds[i+1] + ship.y;
	for(var k = 0; k < ast.x_adds.length - 1; k++) {
	    xa1 = ast.x_adds[k] + ast.x;
	    xa2 = ast.x_adds[k+1] + ast.x;
	    ya1 = ast.y_adds[k] + ast.y;
	    ya2 = ast.y_adds[k+1] + ast.y;
	    info = getIntersectionLines(xa1,ya1,xa2,ya2,xp1,yp1,xp2,yp2);
	    if (info.online) {
		for(var n = 0; n <= getRandInt(50,70); n++){
		    spawnParticle(info.x,info.y);
		}
		return true;
	    }
	}
    }
    return false;
};

var getIntersectionLines = function (xa1,ya1,xa2,ya2,xp1,yp1,xp2,yp2) {
    //This function takes in four points and returns:
    //true if there is an intersection of the lines a and p 
    //AND that intersection is on the line segment between these points.
    //false otherwise

    //get slopes of the two lines (note that the determinant is just mp-ma)
    var ma = (ya2-ya1)/(xa2-xa1);
    var mp = (yp2-yp1)/(xp2-xp1);

    if (mp === ma) { return {online: false};} //not entirely true... two line segments could define the same line :(

    //Compute solution for basic linear system
    var xi = ((ya1-ma*xa1)-(yp1-mp*xp1))/(mp-ma);
    var yi = (-ma*(yp1-mp*xp1)+mp*(ya1-ma*xa1))/(mp-ma);

    var xi_in_between = (xi <= max(xa1,xa2) && xi <= max(xp1,xp2) && xi >= min(xa1,xa2) && xi >= min(xp1,xp2));
    var yi_in_between = (yi <= max(ya1,ya2) && yi <= max(yp1,yp2) && yi >= min(ya1,ya2) && yi >= min(yp1,yp2));

    if (xi_in_between && yi_in_between) { return {online: true, x:xi, y:yi}; }
    else { return {online: false, x:xi, y:yi}; }
};

var preciseCollideBulAst = function (bul,ast,dist) {
    var ang;
    //First, find angle between bullet and asteroid (from asteroid's pov)
    ang = circConstrain(atan2(bul.y-ast.y,bul.x-ast.x));

    //Next, find which two verticies of the asteroid the bullet is between
    var indx = 0;
    while (indx<ast.thetas.length) {
	if(ang === ast.thetas[indx]) {
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
    //TODO: x1===x2 exception

    var m = (y2-y1)/(x2-x1);
    var edge_r = (y1 - m * x1)/(sin(ang) - (m * cos(ang)));
    return dist > edge_r ? false : true;
};

var ticktock = function (frame) {
    if (frame % 60 === 0) {
	console.log('Tick');
    }
};


//Main loop
var gameLoop = function () {
    //getSetStageSize(1, 1);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateGameState();
    window.requestAnimFrame(gameLoop);
};


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
