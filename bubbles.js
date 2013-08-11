var canvas = document.getElementById('can');
var ctx = canvas.getContext('2d');
var pressed = {};
var circles = [];

//Should be global attributes
var friction = 1;
var delta_t = 0.05;


//Some thought should be given to these. They are bad. They make me feel bad.
var id = -1; //Used as a unique id for each circle
//var deletions = 0; //Used to modify the unique id when deleting an element







//This function should be changed!
function deleteElem(obj, array) {
    //console.log('Deleted object #:' + obj.id + ', Index:' + array.indexOf(obj)  + ', # deletions:' + deletions);
    array.splice(array.indexOf(obj),1);
    //deletions++;
}
//It's a bad function!




//Commonly used functions:

//Return a real min to max (inclusive)
function getUnif(min, max) {
    return Math.random() * (max - min) + min;
}

//Return an integer min to max (inclusive)
function getRandInt(min,max) {
    return Math.round(getUnif(min,max));
}

//Emulate a normal distribution - this uses the central limit theorem (the more iterations, the closer to a true normal it will be)
function getNorm(mean, iterations) {
    var output = 0;
    for (i = 0; i < iterations; i++) {
        output += Math.random() * mean;
    }
    return output / iterations;
}

var getSetStageSize = function (vert_percent, horz_percent) {
    var body_height = window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight;
    var body_width = window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth;

    canvas.width = horz_percent * body_width;
    canvas.height = vert_percent * body_height;
}






//Circle object definition:

function circle(x, y, r, max_veloc, alpha, id, color) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.max_veloc = max_veloc;
    this.alpha = 0;
    this.color = color;
    this.x_veloc = getUnif(-1,1);
    this.y_veloc = getUnif(-1,1);
    this.id = id
    
    //Randomly generate verticies for craggy-looking asteroid shapes
    this.num_verts = getRandInt(9,Math.max(10,Math.round(this.r/2.5)));
    this.generateVerts(); //creates this.verts[num_verticies][2] - for each vertex there's a theta and an r-offset
}

circle.prototype.generateVerts = function () {
    this.thetas = new Array(this.num_verts);
    var scale = ((2*Math.PI)/this.num_verts);
    for(i=0; i<this.num_verts; i++){
	this.thetas[i] = i*scale + getUnif(-scale/3,scale/3);
    }
    this.thetas.sort();
    this.r_offsets = new Array(this.num_verts);
    for(i=0; i<this.num_verts; i++){
	this.r_offsets[i] = getUnif(-this.r/8,this.r/8);
    }
};

circle.prototype.draw = function () {
    
    //----Asteriod circles----//
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = "rgba(" + this.color[0] + "," + this.color[1] + "," + this.color[2] + "," + this.alpha + ")";
    ctx.lineWidth = 1;
    
    //ctx.beginPath();
    //ctx.arc(500,500,20,0,2*Math.PI);
    //ctx.fill();
    //ctx.closePath();

    //First get a set of easy drawing instructions - a vector of x and y values representing where the verticies actually are
    var xs = [];
    var ys = [];
    for(i=0; i<this.num_verts; i++){
    	xs[i] = this.x + (this.r + this.r_offsets[i]) * Math.cos(this.thetas[i]);
    	ys[i] = this.y + (this.r + this.r_offsets[i]) * Math.sin(this.thetas[i]);
    	console.log(this.x+', '+xs[i]);
    }
    xs.push(xs[0]);
    ys.push(ys[0]);
    
    for(i=0; i<this.num_verts; i++){
    	//ctx.beginPath();
    	//ctx.arc(xs[i], ys[i], 20, 0, 2 * Math.PI);
    	//ctx.fill();
    	//ctx.closePath();
    	
    	ctx.beginPath();
    	ctx.moveTo(xs[i], ys[i]);
    	ctx.lineTo(xs[i+1],ys[i+1]);
    	ctx.stroke();                                 
    }
    
/*
    //----Plain jane disks----//
    ctx.fillStyle =  "rgba(" + this.color[0] + "," + this.color[1] + "," + this.color[2] + "," + this.alpha + ")";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r-1, 0, 2 * Math.PI);
    ctx.fill();
    ctx.closePath();
*/
};

circle.prototype.updatePosition = function (scale) {
    this.x_veloc += getUnif(-scale, scale) / this.r;
    this.y_veloc += getUnif(-scale, scale) / this.r;
    this.x_veloc /= friction;
    this.y_veloc /= friction;
    this.x_veloc = Math.min(this.x_veloc, this.max_veloc);
    this.y_veloc = Math.min(this.y_veloc, this.max_veloc);
    //Update positions - make sure dot stays on canvas
    this.x += this.x_veloc * delta_t;
    this.y += this.y_veloc * delta_t;

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







//Running the demo

var setup = function () {
    document.addEventListener('keydown', function (e) {
        pressed[e.keyCode] = true;
    });
    document.addEventListener('keyup', function (e) {
        pressed[e.keyCode] = false;
    });
}

var updateGameState = function () {
    if (pressed[' '.charCodeAt(0)] == true) {
        id++;
        var x = getUnif(0,canvas.width);
        var y = getUnif(0,canvas.height);
        var r = getUnif(20,50);
        //console.log(x + " " + y);
        //var color = "rgb(" + Math.floor(Math.random() * 256) + "," + Math.floor(Math.random() * 256) + "," + Math.floor(Math.random() * 256) + ")";
        var color = [1, 1, 1]
        circles.push(new circle(x, y, r, 20, 1, id, color))
    }

    for (i = 0; i < circles.length; i++) {
        circles[i].updatePosition(15);
        circles[i].draw();
    };
}


var gameLoop = function () {
    getSetStageSize(1, 1);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateGameState();
    window.requestAnimFrame(gameLoop);
}


window.requestAnimFrame = (function () {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (callback) {
        window.setTimeout(callback, 1000 / 60);
    };
})();

$(document).ready(function () {
    setup();
    window.requestAnimFrame(gameLoop);
});