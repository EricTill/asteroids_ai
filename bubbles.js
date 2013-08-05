var canvas = document.getElementById('can');
var ctx = canvas.getContext('2d');
var pressed = {};
var circles = [];
var converter = new colConvert();

//Should be global attributes
var friction = 1;
var delta_t = 0.05;


//Some thought should be given to these. They are bad. They make me feel bad.
var ID = -1; //Used as a unique ID for each circle
var deletions = 0; //Used to modify the unique ID when deleting an element




//Commonly used functions:

//This function should be changed!
function deleteElem(obj, array) {
    console.log('Deleted object #:' + obj.ID);
    array.splice(obj.ID - deletions, 1);
    deletions++;
}
//It's a bad function!

//Return an integer 0 to max (inclusive)
function getRandInt(max) {
    return Math.floor(Math.random() * max);
}

//Return a real min to max (inclusive)
function getUnif(min, max) {
    return Math.random() * (max - min) + min;
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
    $('.body').height(body_height - 100); //we could probably due without this line at some point, but I dont want to really go through the css file.

    canvas.width = horz_percent * body_width;
    canvas.height = vert_percent * (body_height - 100);
}






//Circle object definition:

    function circle(x, y, r, max_veloc, alpha, ID, color) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.delta_t = delta_t;
        this.max_veloc = max_veloc;
        this.alpha = alpha;
        this.color = color;
        this.x_veloc = 0;
        this.y_veloc = 0;
        this.ID = ID
        this.maxAge = Math.ceil(getNorm(20 * 60, 6)) + 600; //Age measured in frames
        this.age = 0;

    }


circle.prototype.draw = function (a, b) {

    //----I changed this to put in fancy gaussians at the edge of each disk. To do plain disks comment out and use senction below---------//
    var backroundColor = converter.rgbToHSL(this.color);
    backroundColor[2] -= 0.05;
    backroundColor = converter.hslToRGB(backroundColor);

    ctx.fillStyle = "rgba(" + Math.floor(backroundColor[0]) + "," + Math.floor(backroundColor[1]) + "," + Math.floor(backroundColor[2]) + "," + this.alpha + ")";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r - 1, 0, 2 * Math.PI);
    ctx.fill();
    ctx.closePath();

    for (var i = 0; i <= this.r / 3; i++) {
        this.alpha = a * Math.pow(Math.E, -1 * (Math.pow((i - b), 2) / Math.pow((2 * (this.r / 10)), 2)));
        ctx.strokeStyle = "rgba(" + Math.floor(this.color[0]) + "," + Math.floor(this.color[1]) + "," + Math.floor(this.color[2]) + "," + this.alpha + ")";
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.floor(this.r - i), 0, 2 * Math.PI);
        ctx.stroke();
        ctx.closePath();
    }
    //-----------------plain jane disks-------------------------//\
    /*ctx.fillStyle =  "rgb(" + Math.floor(this.color[0]) + "," + Math.floor(this.color[1]) + "," + Math.floor(this.color[2]) +")";
	ctx.beginPath();
	ctx.arc(this.x, this.y, this.r-1, 0, 2 * Math.PI);
    ctx.fill();
    ctx.closePath();*/
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
    this.age++;
    this.alpha -= (1 / this.maxAge);

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
        ID++;
        var x = Math.random() * canvas.width;
        var y = Math.random() * canvas.height;
        var r = Math.random() * 35 + 3;
        //console.log(x + " " + y);
        //var color = "rgb(" + Math.floor(Math.random() * 256) + "," + Math.floor(Math.random() * 256) + "," + Math.floor(Math.random() * 256) + ")";
        var color = [getRandInt(255), getRandInt(255), getRandInt(255)]
        circles.push(new circle(x, y, r, 20, 1, ID, color))
    }

    for (i = 0; i < circles.length; i++) {
        if ((circles.length > 1) && (circles[i].age === circles[i].maxAge)) {
            deleteElem(circles[i], circles);
        } else {
            circles[i].updatePosition(15);
            circles[i].draw(0.5, 0.5);
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