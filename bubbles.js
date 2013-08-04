///I have mande several changes
//1.) I reordered your code so that it was not all within a function. now most vars preload, but important things like event listners and loops only load when the window is ready
//2.) I optimized your 'circle' class. most importantly I changed the draw teh move functions to be protoypes of the class, so they are only allocated to memeory once 
///     where as in your version the methods of each class was allocated every time 'new Circle' was called
//3.) I messed around with the draw method of the class circle to make it look pretty 
//4.) optimized some other stuff for speed and memory. (there will be a problem in the future with how you loop, but I did not want to change that with out talking to you first)
//5.) in your css && html documents I changed some divs /div rules and added the canvas element. whereas you had the canvas appended to the DOM when the javascript file loaded. 
//       your way is ok, but I changed it so that it was easer to make the  size of the display dynamic (changes as user moves things around).


var canvas = document.getElementById('can');
var ctx =  canvas.getContext('2d');
var pressed ={};
var circles=[];
var converter= new colConvert();

function circle (x,y,r,friction, delta_t, max_veloc, color){
	this.x = x;
    this.y = y;
    this.r = r;
    this.friction=friction;
    this.delta_t=delta_t;
    this.max_veloc=max_veloc;
	this.color = color;
	this.x_veloc = 0;
	this.y_veloc = 0;
}


circle.prototype.draw = function(a,b){ 
	
	//----I changed this to put in fancy gaussians at the edge of each disk. To do plain disks comment out and use senction below---------//
	var alphaColor=1;
	var backroundColor =converter.rgbToHSL(this.color);
	backroundColor[2]-=0.05;
	backroundColor=converter.hslToRGB(backroundColor);
	
	ctx.fillStyle =  "rgba(" + Math.floor(backroundColor[0]) + "," + Math.floor(backroundColor[1]) + "," + Math.floor(backroundColor[2]) + "," + alphaColor +")";
	ctx.beginPath();
	ctx.arc(this.x, this.y, this.r-1, 0, 2 * Math.PI);
    ctx.fill();
    ctx.closePath();
    
    for(var i=0; i<=this.r/3; i++){
    	alphaColor=a* Math.pow(Math.E,-1*(Math.pow((i-b),2)/Math.pow((2*(this.r/10)),2)));
    	ctx.strokeStyle="rgba(" + Math.floor(this.color[0]) + "," + Math.floor(this.color[1]) + "," + Math.floor(this.color[2]) + "," + alphaColor +")";
    	ctx.beginPath();
		ctx.arc(this.x, this.y, Math.floor(this.r-i), 0, 2 * Math.PI);
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

circle.prototype.updatePosition = function(scale){
 	this.x_veloc += ((scale * Math.random()) - (scale / 2)) / this.r;
 	this.y_veloc += ((scale * Math.random()) - (scale / 2)) / this.r;
 	this.x_veloc /= this.friction;
    this.y_veloc /= this.friction;
    this.x_veloc = Math.min(this.x_veloc, this.max_veloc);
    this.y_veloc = Math.min(this.y_veloc, this.max_veloc);
    this.x += this.x_veloc * this.delta_t;
    this.y += this.y_veloc * this.delta_t;
    
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



var getSetStageSize = function(vert_percent, horz_percent){
	var body_height = window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight;
    var body_width = window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth;
    $('.body').height(body_height - 100);//we could probably due without this line at some point, but I dont want to really go through the css file.
    
    canvas.width= horz_percent * body_width;
    canvas.height= vert_percent * (body_height - 100);
}

var setup = function (){
	document.addEventListener('keydown', function (e) {
		pressed[e.keyCode] = true;
	});
	
	document.addEventListener('keyup', function (e) {
		pressed[e.keyCode] = false;
	});
}

var updateGameState = function (){
	if (pressed[' '.charCodeAt(0)] == true) {
		var x = Math.random() * canvas.width;
		var y = Math.random() * canvas.height;
		var r = Math.random() * 35 + 3;
		//console.log(x + " " + y);
		//var color = "rgb(" + Math.floor(Math.random() * 256) + "," + Math.floor(Math.random() * 256) + "," + Math.floor(Math.random() * 256) + ")";
		var color = [Math.random() * 255,Math.random() * 255,Math.random() * 255]
		circles.push(new circle(x, y, r, 1,0.05,20, color))
	}
	
	for (i = 0; i < circles.length; i++) {
		circles[i].updatePosition(30);
		circles[i].draw(0.5,0.5);
	}
}


var gameLoop= function (){
	getSetStageSize(1,1);
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	updateGameState();
	window.requestAnimFrame(gameLoop);
}


window.requestAnimFrame = (function () {
	return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (callback) { window.setTimeout(callback, 1000 / 60);};
})();

$(document).ready(function () {
	setup();
	window.requestAnimFrame(gameLoop);
});