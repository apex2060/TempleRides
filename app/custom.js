var lib = {
	randomInt:function(min, max) {
		if(min!=undefined && max!=undefined)
			return Math.floor(Math.random() * (max - min + 1) + min);
		else
			return Math.floor((Math.random()*100000000)+1);
	},
	//This works with hex: HHH, #HHH, HHHHHH, #HHHHHH
	color:{
		isDark: function(hex){
			var v = this.getV(hex);
			return v<75;
		},
		getV: function(hex){
			var rgb = this.hexToRgb(hex),
			r = rgb.r / 255,
			g = rgb.g / 255,
			b = rgb.b / 255;

			var v = Math.max(r, g, b);
			return Math.round(v*100)
		},
		hexToRgb: function(hex) {
		    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
		    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
		    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
		    	return r + r + g + g + b + b;
		    });

		    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		    return result ? {
		    	r: parseInt(result[1], 16),
		    	g: parseInt(result[2], 16),
		    	b: parseInt(result[3], 16)
		    } : null;
		},
		random:function(){
			return Math.floor(Math.random()*16777215).toString(16);
		}
	},
	timeRange:function(hours){
		function timeDif(start,end){
			var start = 	start.split(':');
			var end = 		end.split(':');
			var hourDif = 	Number(end[0]) - Number(start[0]);
			var minDif = 	Number(end[1]) - Number(start[1]);
			var ttlDif = 	hourDif*60+minDif;
			return ttlDif;
		}
		var firstHour = 	hours[0];
		var secondHour = 	hours[1];
		var lastHour = 		hours[hours.length-1];
		var durationMin =	timeDif(firstHour.start,firstHour.end);
		var offsetMin = 	0; 
		if(secondHour){
			offsetMin = 	timeDif(firstHour.end, secondHour.start);
		}
		var newStartMin = 	Number(lastHour.end.split(':')[1]) + offsetMin;
		var newStartHr = 	Number(lastHour.end.split(':')[0]);
		if(newStartMin>=60){
			var extraHrs = 	Math.floor(newStartMin/60)
			newStartMin = 	newStartMin%60
			newStartHr =	newStartHr + extraHrs;
		}
		var newEndMin = 	newStartMin + durationMin;
		var newEndHr = 		newStartHr
		if(newEndMin>=60){
			var extraHrs = 	Math.floor(newEndMin/60)
			newEndMin = 	newEndMin%60
			newEndHr =		newEndHr + extraHrs;
		}

		if(newStartHr<10)
			newStartHr = '0'+newStartHr;
		if(newStartMin<10)
			newStartMin = '0'+newStartMin;
		if(newEndHr<10)
			newEndHr = '0'+newEndHr;
		if(newEndMin<10)
			newEndMin = '0'+newEndMin;
		var finalStart = 	newStartHr+':'+newStartMin;
		var finalEnd = 		newEndHr+':'+newEndMin;
		return {
			start: 	finalStart,
			end: 	finalEnd
		}
	}
}










var windowState = {
	onActive: null,
	onInactive: null,
	isActive: true,
	hidden: "hidden",
	setActive: function(activeCallback){
		windowState.onActive = activeCallback;
	},
	setInactive: function(inactiveCallback){
		windowState.onInactive = inactiveCallback;
	},
	stateChange: function(evt){
		var v = 'visible', h = 'hidden',
		evtMap = { 
			focus:v, focusin:v, pageshow:v, blur:h, focusout:h, pagehide:h 
		};

		evt = evt || window.event;
		if (((evt.type in evtMap) && evtMap[evt.type]=='hidden') || this[windowState.hidden]){
			windowState.isActive = false;
			if(typeof(windowState.onInactive)=='function')
				windowState.onInactive();
		}else{
			windowState.isActive = true;
			if(typeof(windowState.onActive)=='function')
				windowState.onActive();
		}
	},
	setup:function(){
		if (windowState.hidden in document)
			document.addEventListener("visibilitychange", windowState.stateChange);
		else if ((windowState.hidden = "mozHidden") in document)
			document.addEventListener("mozvisibilitychange", windowState.stateChange);
		else if ((windowState.hidden = "webkitHidden") in document)
			document.addEventListener("webkitvisibilitychange", windowState.stateChange);
		else if ((windowState.hidden = "msHidden") in document)
			document.addEventListener("msvisibilitychange", windowState.stateChange);
		else if ('onfocusin' in document)
			document.onfocusin = document.onfocusout = windowState.stateChange;
		else
			window.onpageshow = window.onpagehide 
				= window.onfocus = window.onblur = windowState.stateChange;
	}
}


















Array.prototype.random = function () {
	return this[Math.floor(Math.random() * this.length)]
}

Array.prototype.randomRemove = function () {
	return this.splice(Math.floor(Math.random() * this.length), 1)[0];
}

Array.prototype.max = function() {
	return Math.max.apply(null, this)
}
Array.prototype.min = function() {
	return Math.min.apply(null, this)
}
Array.prototype.diff = function(a) {
	return this.filter(function(i) {return !(a.indexOf(i) > -1);});
};