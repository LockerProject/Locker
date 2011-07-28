
	window.onload = function initialLoad(){
		updateOrientation();
	}
	
	function updateOrientation(){
		var contentType = "show_";
		switch(window.orientation){
			case 0:
			contentType += "normal";
			break;
			
			case -90:
			contentType += "right";
			break;
			
			case 90:
			contentType += "left";
			break;
			
			case 180:
			contentType += "flipped";
			break;
		}
	document.getElementById("page_wrapper").setAttribute("class", contentType);
	}