
function DepthOfFieldCalculator() {
    this.coc;

    this.FORMATS = {
	"apsc": [15, 22.5],
	"35mm": [24, 36],
	"mf645": [56, 42],
	"mf66": [56, 56],
	"mf67": [56, 69],
	"mf69": [56, 84],
	"mf612": [56, 112],
	"mf617": [56, 168],
	"4x5": [102, 127],
	"5x7": [127, 178],
	"8x10": [203, 254]
    };

    this.COOKIE = {"formats": {}};

    this.FOCAL_LENGTHS = [11, 15, 20, 21, 24, 28, 35, 40, 50, 55, 75, 85, 90, 100, 105,
			  135, 150, 180, 200, 210, 240, 250, 270, 350, 400, 450, 600, 720,
			  1000, 1200, 1700, 2000];

    this.APERTURES = [1, 1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22, 32, 45];
    this.HALF_STOP_APERTURES = [1, 1.2, 1.4, 1.7, 2, 2.4, 2.8, 3.3, 4, 4.8, 5.6, 6.7, 8,
				9.5, 11, 13, 16, 19, 22, 27, 32, 38, 45];
    this.THIRD_STOP_APERTURES = [1, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8,
				 3.2, 3.5, 4, 4.5, 5.0, 5.6, 6.3, 7.1, 8,
				 9, 10, 11, 13, 14, 16, 18, 20, 22, 25, 29, 32, 36, 40, 45];

    this.FOCUS_RING = [
		       document.querySelector("input[name=distance]"),
		       document.querySelector("input[name=aperture]"),
		       document.querySelector("input[name=focal_length]"),
		       ];
    this.FOCUS_INDEX = 0;

    this.FOCUS_STOPS = [
			[10, 1, 0.1],
			[this.APERTURES, this.HALF_STOP_APERTURES, this.THIRD_STOP_APERTURES],
			[this.FOCAL_LENGTHS, 1, 0.1],
			];
}


DepthOfFieldCalculator.prototype.init = function() {
    var self = this;

    self.read_cookie();

    for (var k in self.COOKIE['formats']) {
	let f = self.COOKIE['formats'][k];
	self.add_format(k, f[0], f[1]);
    }

    var dofinput = document.querySelectorAll("input.dofinput");
    for (var i = 0; i < dofinput.length; i++) {
	dofinput[i].setAttribute("readonly", true);
	dofinput[i].oninput = function() {
	    self.calculate();
	}
	dofinput[i].onclick = function() {
	    this.removeAttribute("readonly");

	    for (j = 0; j < self.FOCUS_RING.length; j++) {
		if (this === self.FOCUS_RING[j]) {
		    self.FOCUS_INDEX = j;
		    break;
		}
	    }
	}
    }

    var dofselect = document.querySelector(".dofselect");
    dofselect.onchange = function() {
	if (this.value == "add") {
	    document.querySelector("input.addinput[name=name]").value = "";
	    document.querySelector("input.addinput[name=dim1]").value = "";
	    document.querySelector("input.addinput[name=dim2]").value = "";
	    document.getElementById("format-param").style.display = "none";
	    document.getElementById("add-format").style.display = "inline";
	    document.querySelector("input.addinput[name=name]").focus();
	} else {
	    self.circle_of_confusion();
	    self.calculate();
	}
    }

    document.querySelector("select[name=denominator]").onchange = function() {
	self.circle_of_confusion();
	self.calculate();
    }

    document.getElementById("add-format-btn").onclick = function() {
	var fmtname = document.querySelector("input.addinput[name=name]").value;
	if (fmtname.length == 0 || self.FORMATS[fmtname]) {
	    return;
	}
	var dim1 = Number(document.querySelector("input.addinput[name=dim1]").value);
	if (isNaN(dim1) || dim1 < 1) {
	    return;
	}
	var dim2 = Number(document.querySelector("input.addinput[name=dim2]").value);
	if (isNaN(dim2) || dim2 < 1) {
	    return;
	}

	self.COOKIE["formats"][fmtname] = [dim1, dim2];
	self.write_cookie();

	self.add_format(fmtname, dim1, dim2);

	dofselect.selectedIndex = dofselect.options.length - 1;
	document.getElementById("add-format").style.display = "none";
	document.getElementById("format-param").style.display = "inline";

	self.circle_of_confusion();
	self.calculate();
    }

    document.getElementById("cancel-add-format-btn").onclick = function() {
	dofselect.value = "35mm";
	document.getElementById("add-format").style.display = "none";
	document.getElementById("format-param").style.display = "inline";

	self.circle_of_confusion();
	self.calculate();
    }

    document.getElementById("help-btn").onclick = function() {
	var help = document.getElementById("help");
	if (help.style.display == "block") {
	    help.style.display = "none";
	} else {
	    help.style.display = "block";
	}
    }

    document.getElementById("touch-btn").onclick = function() {
	var touch = document.getElementById("touch");
	if (touch.style.display == "none") {
	    touch.style.display = "block";
	} else {
	    touch.style.display = "none";
	}
    }

    var topic_label = document.querySelectorAll(".topic-label");
    for (var i = 0; i < topic_label.length; i++) {
	topic_label[i].onclick = function(e) {
	    var cont = e.target.nextElementSibling;
	    if (cont.style.display == "block") {
		cont.style.display = "none";
	    } else {
		cont.style.display = "block";
	    }
	}
    }

    document.getElementById("touch-center").onclick = function() {
	self.next_focus(true);
    }

    document.getElementById("touch-left").onclick = function() {
	self.set_next_stop(false, 0);
    }

    document.getElementById("touch-left-2").onclick = function() {
	self.set_next_stop(false, 1);
    }

    document.getElementById("touch-left-3").onclick = function() {
	self.set_next_stop(false, 2);
    }

    document.getElementById("touch-right").onclick = function() {
	self.set_next_stop(true, 0);
    }

    document.getElementById("touch-right-2").onclick = function() {
	self.set_next_stop(true, 1);
    }

    document.getElementById("touch-right-3").onclick = function() {
	self.set_next_stop(true, 2);
    }

    this.setup_keyboard_handling();

    document.querySelector("select[name=format]").value = "35mm";
    this.circle_of_confusion();
    document.querySelector("input[name=focal_length]").value = this.FOCAL_LENGTHS[8];
    document.querySelector("input[name=aperture]").value = this.APERTURES[6];
    self.calculate();

    document.querySelector("input[name=distance]").value = "";
    document.querySelector("input[name=distance]").focus();
}


DepthOfFieldCalculator.prototype.add_format = function(fmtname, dim1, dim2) {
    let dofselect = document.querySelector(".dofselect");
    this.FORMATS[fmtname] = [dim1, dim2];

    if (!dofselect.classList.contains("format_added")) {
	let divider = document.createElement("option");
	divider.text = '---';
	divider.disabled = true;
	dofselect.add(divider);
    }
    let opt = document.createElement("option");
    opt.value = fmtname;
    opt.text = fmtname + '  (' + dim1 + 'x' + dim2 + ')';
    dofselect.add(opt);
    dofselect.classList.add("format_added");
}


DepthOfFieldCalculator.prototype.write_cookie = function() {
    document.cookie = "data=" + btoa(JSON.stringify(this.COOKIE)) + ";";
}


DepthOfFieldCalculator.prototype.read_cookie = function() {
    let cookie = document.cookie;
    cookie = cookie.replace(/data=(.*);?$/, "$1");
    if (cookie) {
	this.COOKIE = JSON.parse(atob(cookie));
    }
}


DepthOfFieldCalculator.prototype.circle_of_confusion = function() {
    var fdims = this.FORMATS[document.querySelector("select[name=format]").value];
    var diagonal = Math.sqrt(Math.pow(fdims[0], 2) + Math.pow(fdims[1], 2));
    var denom = Number(document.querySelector("select[name=denominator]").value);
    this.coc = diagonal / denom;

    document.getElementById("diagonal").innerHTML = diagonal.toFixed(2) + "mm";
    document.getElementById("acoc").innerHTML = this.coc.toFixed(3) + "mm";
}


DepthOfFieldCalculator.prototype.set_next_stop = function(up, offset) {
    var cf = this.current_focus();
    cf.focus();
    var stops = this.current_stop_list();
    if (stops.length == 0) {
	return;
    }
    var i = Math.min(offset, stops.length-1);
    cf.value = this.find_next_value(up, cf.value, stops[i]);
    this.calculate();
}

DepthOfFieldCalculator.prototype.find_over = function(val, stops) {
    return this.find_next_value(true, val, stops);
}


DepthOfFieldCalculator.prototype.find_under = function(val, stops) {
    return this.find_next_value(false, val, stops);
}


DepthOfFieldCalculator.prototype.find_next_value = function(over, val, stops) {
    if (!Array.isArray(stops)) {
	// this nonsense because of floating math mess - sheesh
	var nval = Number(val);
	var parts = stops.toString().split('.');
	var dp = (parts.length < 2) ? 0 : parts[1].length;
	var xer = Math.pow(10, dp);
	var valx = Math.round(nval * xer);
	var stopx = Math.round(stops * xer);
	if (over) {
	    if (dp > 0) {
		return Number((valx + stopx) / xer).toFixed(dp);
	    } else {
		return Number(Math.floor((Number(val) + stops) / stops) * stops).toFixed(dp);
	    }
	} else {
	    return Math.max(0, Number(Math.floor((Number(val) - stops/10) / stops) * stops).toFixed(dp));
	}
    }
    var i = Number(stops.length/2).toFixed(0);
    var vn = Number(val);
    var going_up = stops[i] < val;
    while (true) {
	if (i < 0) {
	    i = 0;
	    break;
	}
	if (i > stops.length - 1) {
	    i = stops.length - 1;
	    break;
	}
	if (stops[i] < val) {
	    if (going_up) {
		i++;
	    } else {
		if (over) {
		    i++;
		}
		break;
	    }
	} else if (stops[i] > val) {
	    if (going_up) {
		if (!over) {
		    i--;
		}
		break;
	    } else {
		i--;
	    }
	} else {
	    if (over) {
		i++;
	    } else {
		i--;
	    }
	    going_up = over;
	}
    }
    return stops[i];
}


DepthOfFieldCalculator.prototype.current_stop_list = function() {
    return this.FOCUS_STOPS[this.FOCUS_INDEX];
}

DepthOfFieldCalculator.prototype.current_focus = function() {
    return this.FOCUS_RING[this.FOCUS_INDEX];
}

DepthOfFieldCalculator.prototype.next_focus = function(readonly) {
    
    this.FOCUS_INDEX++;
    if (this.FOCUS_INDEX >= this.FOCUS_RING.length) {
	this.FOCUS_INDEX = 0;
    }
    if (readonly) {
	this.FOCUS_RING[this.FOCUS_INDEX].setAttribute("readonly", true);
    } else {
	this.FOCUS_RING[this.FOCUS_INDEX].removeAttribute("readonly");
    }
    this.FOCUS_RING[this.FOCUS_INDEX].focus();
}


DepthOfFieldCalculator.prototype.setup_keyboard_handling = function() {
    var self = this;

    document.onkeydown = function(e) {
	if (e.keyCode == 13) {
            if (document.getElementById("add-format").style.display == "inline") {
		document.getElementById("add-format-btn").click();
	    } else {
		self.next_focus();
	    }
	}
    }

    var fl = document.querySelector("input[name=focal_length]");
    fl.onkeydown = function(e) {
	if (e.keyCode == 38) {
	    //console.log("UP");
	    fl.value = self.find_over(fl.value, self.FOCAL_LENGTHS);
	    self.calculate();
	} else if (e.keyCode == 40) {
	    //console.log("DOWN");
	    fl.value = self.find_under(fl.value, self.FOCAL_LENGTHS);
	    self.calculate();
	}
    }

    var ap = document.querySelector("input[name=aperture]");
    ap.onkeydown = function(e) {
	if (e.keyCode == 38) {
	    //console.log("UP");
	    var stops = e.shiftKey ? self.HALF_STOP_APERTURES
	                : e.altKey ? self.THIRD_STOP_APERTURES : self.APERTURES;
	    ap.value = self.find_over(ap.value, stops);
	    self.calculate();
	} else if (e.keyCode == 40) {
	    //console.log("DOWN");
	    var stops = e.shiftKey ? self.HALF_STOP_APERTURES
	                : e.altKey ? self.THIRD_STOP_APERTURES : self.APERTURES;
	    ap.value = self.find_under(ap.value, stops);
	    self.calculate();
	}
    }

}


DepthOfFieldCalculator.prototype.fmt = function(val) {
    if (val == Infinity) {
	return "&infin;";
    } else if (val < 1) {
	return (val * 1000).toFixed(0) + "mm";
    } else if (val < 10) {
	return val.toFixed(2) + "m";
    } else {
	return val.toFixed(1) + "m";
    }
}


DepthOfFieldCalculator.prototype.calculate = function() {
    //fdims = this.FORMATS[document.querySelector("select[name=format]").value];
    //var diagonal = Math.sqrt(Math.pow(fdims[0], 2) + Math.pow(fdims[1], 2));
    //var coc = diagonal / 1730;

    var fl = Number(document.querySelector("input[name=focal_length]").value);
    var ap = Number(document.querySelector("input[name=aperture]").value);
    var hf = Math.pow(fl, 2) / (ap * this.coc) / 1000;

    var di = Number(document.querySelector("input[name=distance]").value);
    if (di <= 0) {
	di = hf;
	//document.querySelector("input[name=distance]").value = di.toFixed(2);
    } else if (di < fl * 0.002) {
	di = fl * 0.002;
	//document.querySelector("input[name=distance]").value = di.toFixed(2);
    }

    var dofn, doff;
    if (di < hf) {
	dofn = (hf * di) / (hf + di);
	doff = (hf * di) / (hf - di);
    } else {
	dofn = di / 2;
	doff = Infinity;
    }

    var hf_result = document.getElementById("hf_result");
    hf_result.innerHTML = this.fmt(hf);

    var dof_dist = document.getElementById("dof_dist");
    dof_dist.innerHTML = this.fmt(dofn) + " -- " + this.fmt(di) + " -- " + this.fmt(doff);
    var dof_range = document.getElementById("dof_range");
    dof_range.innerHTML = this.fmt(di - dofn) + " --+-- " + this.fmt(doff - di);

}

function init() {
    new DepthOfFieldCalculator().init();
}


window.onload = init;
