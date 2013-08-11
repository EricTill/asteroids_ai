var canvas = document.getElementById('can');
var ctx = canvas.getContext('2d');
var pressed = {};
var circles = [];
var converter = new colConvert();

//Should be global attributes
var friction = 1;
var delta_t = 0.05;
var min_alpha = 0.1;
var avg_lifespan = 600; //measured in frames
var avg_decay = Math.pow(min_alpha,1/avg_lifespan);
var border_percent = 1/3; //percent of radius used to make border


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
        this.delta_t = delta_t;
        this.max_veloc = max_veloc;
        this.alpha = alpha;
        this.color = color;
        this.x_veloc = 0;
        this.y_veloc = 0;
        this.id = id
	this.decayRate = avg_decay + 0.01*(Math.random()-0.5);
    }


circle.prototype.draw = function () {

    //----Disks with shaded edges----//
    var inner_r = Math.ceil(this.r*(1-border_percent));
    ctx.fillStyle = "rgba(" + this.color[0] + "," + this.color[1] + "," + this.color[2] + "," + this.alpha + ")";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.closePath();

    var temp_alpha = 1;
    var rho = Math.pow(this.alpha,(1/(this.r*border_percent)));
    for (var i = 0; i <= this.r-1; i++) {
        temp_alpha *= rho;
        ctx.strokeStyle = "rgba(" + this.color[0] + "," + this.color[1] + "," + this.color[2] + "," + temp_alpha + ")";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r - i, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.closePath();
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
    this.alpha = Math.max(this.alpha*this.decayRate,min_alpha) ;
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
        var r = getRandInt(3,35);
        //console.log(x + " " + y);
        //var color = "rgb(" + Math.floor(Math.random() * 256) + "," + Math.floor(Math.random() * 256) + "," + Math.floor(Math.random() * 256) + ")";
        var color = [getRandInt(0,255), getRandInt(0,255), getRandInt(0,255)]
        circles.push(new circle(x, y, r, 20, 1, id, color))
    }

    for (i = 0; i < circles.length; i++) {
        if ((circles.length > 1) && (circles[i].alpha <= min_alpha)) {
            deleteElem(circles[i], circles);
        } else {
            circles[i].updatePosition(15);
            circles[i].draw();
        };
    }
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