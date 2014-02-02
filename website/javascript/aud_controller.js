/*
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.

 Author: Brian Gunnison (bgunnison@gmail.com)
 */


"use strict";

// a database of center control config
// used by app to hook to gui and manage gui layout
var centerControlConfig = {
    div_id:             "center_control_vis",
    title_id:           "center_control_title_text",
    larrow_div:         "larrow",
    rarrow_div:         "rarrow",
    visibility:         "hidden",    // we start hidden
    height:             300,
    width:              300,
    max_range:          1000,
    fgColor:            'blue',
    defaultValue:       500
};



function CenterControl(canvasCtx) {
    var that = this;
    this.canvasCtx = canvasCtx;
    this.element = document.getElementById(centerControlConfig.div_id);
    var isVisible = false;

    function Init(element) {
        // init gui visibility
        console.log("Control init")

        var myKnob = $(".dial").knob({
            'value':        centerControlConfig.defaultValue,
            'min':          0,
            'max':          centerControlConfig.max_range,
            'readOnly':     false,
            'width':        centerControlConfig.width,
            'height':       centerControlConfig.height,
            'fgColor':      centerControlConfig.fgColor,
            'dynamicDraw':  true,
            'thickness':    0.35,
            'skin':         'tron',
            'lineCap':      'round',
            'displayInput': false,
            'angleOffset':  -145,
            'angleArc':     290,
            change:         centralControlChangeValue
        });
    }


    // a list of objects that clients can register their own with to get a control
    var clients = [];
    var currentClient = 0;

    // clients add their control type to this and get it back when the control changes something
    this.addClient = function(name, iValue, maxRange, cbValue, cbType) {
        var  client = {};
        client.name = name;
        // add callback to change control title
        client.cbTitle = centerControlTitle;
        client.cbValueChange = cbValue;
        client.cbTypeChange = cbType;
        client.maxRange = maxRange;
        client.value = iValue;
        clients.push(client);
    }

    // center control is a generic change controller
    // where the user selects what it configures and change events
    // call back into clients that have registered for a control

    // user clicked an arrow
    function centralControlChangedClient(client) {
        // tell client we changed to it
        client.cbTypeChange(client);
        centerControlMaxRangeValue(client.maxRange, client.value);
        centerControlTitle(client.name);
        controlTimeout();
    }

    // user changed value
    function centralControlChangeValue(value) {
        // call the value change callback of the current type
        if (clients.length > 0) {
            var client = clients[currentClient];
            client.value = value;
            if(client.cbValueChange) {
                client.cbValueChange(client);
            }
        }
        controlTimeout();
    }


    // callback from client to set control title
    function centerControlTitle(title) {
        $("#" + centerControlConfig.title_id).text(title);
    }

    // sets current control max and value
    function centerControlMaxRangeValue(max, value) {
        centerControlConfig.maxRange = max;
        $('.dial').trigger('configure', {
            "max": max
            //"fgColor":"#FF0000",
            //"skin":"tron",
            //"cursor":true
        })

        if (value <= max) {
            $('.dial').val(value).trigger('change');
        }
    }

    function rightArrowClick() {
        //console.log("r arrow");
        if (clients.length == 0) {
            return;
        }
        currentClient++;
        if (currentClient >= clients.length) {
            currentClient = 0;
        }
        centralControlChangedClient(clients[currentClient]);
    }

    function leftArrowClick() {
        //console.log("l arrow");
        if (clients.length == 0) {
            return;
        }
        currentClient--;
        if (currentClient < 0) {
            currentClient = clients.length - 1;
        }
        centralControlChangedClient(clients[currentClient]);
    }


    this.centerOnCanvas = function () {
        var ew = this.element.offsetWidth;
        var lPos = (this.canvasCtx.canvas.offsetLeft + this.canvasCtx.canvas.width / 2) - ew / 2 + "px";
        this.element.style.marginLeft = lPos;
        var tPos = (this.canvasCtx.canvas.offsetTop + this.canvasCtx.canvas.height / 2) - this.element.offsetHeight / 2 + "px";
        this.element.style.marginTop = tPos;

        // Arrows initial position is top left of central control
        var ra = document.getElementById(centerControlConfig.rarrow_div);
        var la = document.getElementById(centerControlConfig.larrow_div);
        ra.style.marginTop = tPos;
        la.style.marginTop = tPos;
       
        la.style.marginLeft = (la.style.marginLeft - 80) + "px";
        ra.style.marginLeft = (ew + 20) + "px";
        ra.onclick = rightArrowClick;
        la.onclick = leftArrowClick;
    }

    var controlTimeoutObj = null;

     function controlTimeout() {
         clearTimeout(controlTimeoutObj);
         controlTimeoutObj = setTimeout(makeHidden, 5000);
     }

     function makeVisible() {
        // the style is hidden so it does not flash at load
        that.element.style.visibility = 'visible';
        $(that.element).fadeIn("slow","swing");
        isVisible = true;
         that.centerOnCanvas();

        // hide control after 5 seconds uf no use
         controlTimeout();
     }

     function makeHidden() {
        $(that.element).fadeOut("slow","swing");
         isVisible = false;
        //this.element.style.visibility = 'hidden';
    }

    this.toggleVisible = function() {
        if (isVisible) {
            makeHidden();
        } else {
            makeVisible();
        }
    }

    // displays an image on the canvas
    function LoadImage(imageURL, images) {
        var imageObj = new Image();
        imageObj.onload = function() {
            images.push(this);
        };

        imageObj.src = imageURL;
    }

    var touchPanelImages = [];
    function TouchPanelInit() {
        LoadImage("../art/fporig.png",touchPanelImages)
    }

    this.draw = function() {

        // keep visible always for now,
        // implement visible when user touches canvas, then have it fade off after no use
        if (true) {
            var img = touchPanelImages[0];
            if (img) {
                var width = 50;
                // proportional
                var height = img.height * (width/img.width);
                var x = this.canvasCtx.canvas.width - width;
                this.canvasCtx.save();
                this.canvasCtx.globalAlpha = 0.7;
                this.canvasCtx.drawImage(img,
                    0,      //sx
                    0,      //sy
                    img.width,      //swidth
                    img.height,      //sheight
                    x,      //x
                    0,      //y
                    width,    //width
                    height);   //height

                this.canvasCtx.restore();
            }
        }
    }


    Init();
    makeHidden();
    this.centerOnCanvas();
    //TouchPanelInit();

}


// implements a canvas based play, pause control
// also exports basic shapes
function PlayControls(ctx) {

    this.ctx = ctx;

    function line(obj, x1, y1, x2, y2) {
        obj.ctx.lineCap = 'round';
        obj.ctx.beginPath();
        obj.ctx.moveTo(x1, y1);
        obj.ctx.lineTo(x2, y2);
        obj.ctx.closePath();
        obj.ctx.stroke();
    }


    function circle(obj, x, y, r, lineWidth, fill) {
        obj.ctx.beginPath();
        obj.ctx.arc(x, y, r, 0, Math.PI * 2, true);
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = "rgba(255, 255, 255, 1)";
        obj.ctx.closePath();
        if (fill) {
            obj.ctx.fillStyle = 'rgba(255,255,255,1)';
            obj.ctx.fill();
            obj.ctx.stroke();
        } else {
            obj.ctx.stroke();
        }
    }

    function rectangle(obj, x, y, w, h) {
        obj.ctx.beginPath();
        obj.ctx.rect(x, y, w, h);
        obj.ctx.closePath();
        if (obj.opt_fill) {
            obj.ctx.fillStyle = 'rgba(255,255,255,1)';
            obj.ctx.fill();
        } else {
            obj.ctx.stroke();
        }
    }

    this.triangle = function (x, y, width, rotate, fill) {
        // Stroked triangle.
        var h = 0.866 * width;
        this.ctx.rotate(Math.PI * rotate / 180.0);
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + (0.5 * h));
        this.ctx.lineTo(x + (0.5 * width), y - (0.5 * h));
        this.ctx.lineTo(x - (0.5 * width), y - (0.5 * h));
        this.ctx.closePath();

        if (fill) {
            this.ctx.fillStyle = 'rgba(255,255,255,1)';
            this.ctx.fill();
        } else {
            this.ctx.stroke();
        }

    }

    function clear(obj) {
        obj.ctx.fillStyle = "#000000";
        obj.ctx.fillRect(0, 0, obj.ctx.canvas.width, obj.ctx.canvas.height);
    }


    this.drawPlayButton = function () {
        var cSize = Math.min(this.ctx.canvas.width, this.ctx.canvas.height) / 4;
        this.ctx.save();
        this.ctx.translate(this.ctx.canvas.width / 2, this.ctx.canvas.height / 2);
        //clear(this);
        circle(this, 0, 0, cSize - this.ctx.lineWidth + 1, 20, false);
        this.triangle(0, 0 + 20, 120, 30, true);

        this.ctx.restore();
    }

    this.drawPauseButton = function () {
        var cSize = Math.min(this.ctx.canvas.width, this.ctx.canvas.height) / 4;
        this.ctx.save();
        this.ctx.translate(this.ctx.canvas.width / 2, this.ctx.canvas.height / 2);
        //clear(this);
        circle(this, cSize, cSize, cSize - this.ctx.lineWidth + 1);
        this.ctx.save();
        this.ctx.lineWidth += 4;
        line(this, cSize * 0.8, cSize / 2, cSize * 0.8, cSize * 1.5);
        line(this, cSize + (cSize / 5), cSize / 2, cSize + (cSize / 5), cSize * 1.5);
        this.ctx.restore();
        this.ctx.restore();
    }
}


