function colConvert (){
	
	this.rgbToHex=rgbToHex;
	this.hexToRGB=hexToRGB;
	this.rgbToHSL=rgbToHSL;
	this.hslToRGB=hslToRGB;
	
	function rgbToHex(a){
		var hex= a[0]<<16^a[1]<<8^a[2]<<0;
		return hex;
	}
	
	function hexToRGB(a){
		var arr=[Number((a&0xff0000)>>16),Number((a&0x00ff00)>>8),Number((a&0x0000ff))];
		return arr;
	}
	
	function rgbToHSL (a){
		var colR=a[0]/255;
		var colG=a[1]/255;
		var colB=a[2]/255;
		var cMax=Math.max(colR,colG,colB);
		var cMin=Math.min(colR,colG,colB);
		var deltaC=cMax-cMin;
		var hue=0;
		
		switch(cMax){
			case colR:
				hue=60*(((colG-colB)/deltaC)%6);
			break;
			case colG:
				hue=60*(((colB-colR)/deltaC)+2);
			break;
			case colB:
				hue=60*(((colR-colG)/deltaC)+4);
			break;
		}
		
		var l= (cMax+cMin)/2;
		return [hue<0?360+hue:hue>360?hue-360:hue,deltaC==0?0:(deltaC/(1-Math.abs(2*l-1))),l];
	}
	
	function hslToRGB(a){
		a[0]=a[0]<=0?360+a[0]:a[0]>360?a[0]-360:a[0];
		if(a[1]==0){
			return [a[2]*255,a[2]*255,a[2]*255];
		} else {
			var c=(1-Math.abs(2*a[2]-1))*a[1];
			var X=c*(1-Math.abs(((a[0]/60)%2)-1));
			var m =a[2]-c/2;
			var rbg=[0,0,0];
			switch(Math.floor(a[0]/60)){
				case 0:
					rgb=[c,X,0];
				break;
				case 1:
					rgb=[X,c,0];
				break;
				case 2:
					rgb=[0,c,X];
				break;
				case 3:
					rgb=[0,X,c];
				break;
				case 4:
					rgb=[X,0,c];
				break;
				case 5:
					rgb=[c,0,X];
				break;
			}
			rbg=[rgb[0]+m,rbg[1]+m,rbg[2]+m];
			return [rgb[0]*255,rgb[1]*255,rgb[2]*255];
		}
	}
}
