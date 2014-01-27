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
var center_control_config = {
    div_id:             "center_control_vis",
    title_id:           "center_control_title_text",
    change_event:       "evtCentralControlChange",
    visibility:         "hidden",    // we start hidden
    height:             300,
    width:              300,
    max_range:          1000,
    fgColor:            'blue',
    defaultValue:       500
};

function CenterControl(canvasCtx){

    this.canvasCtx = canvasCtx;
    this.element = document.getElementById(center_control_config.div_id);
    this.visible = false;

    function Init(element) {
        // init gui visibility
        console.log("Control init")

        // center control is a generic change controller
        // where the user selects what it configures and it then sends change events
        // to audio manager. Audio manager configures audio based on change type
        // and manages persistence
        var evtck = document.createEvent("Event");
        evtck.initEvent(center_control_config.change_event, true, true);

        function CentralControlChange(value) {
            //console.log("change : " + value);
            evtck.cbTitle = CenterControlTitle;
            evtck.what = "masterGain";
            evtck.maxRange = center_control_config.max_range;
            evtck.value = value;
            document.dispatchEvent(evtck);
        }

        var myKnob = $(".dial").knob({
            'value':        center_control_config.defaultValue,
            'min':          0,
            'max':          center_control_config.max_range,
            'readOnly':     false,
            'width':        center_control_config.width,
            'height':       center_control_config.height,
            'fgColor':      center_control_config.fgColor,
            'dynamicDraw':  true,
            'thickness':    0.35,
            'skin':         'tron',
            'lineCap':      'round',
            'displayInput': false,
            'angleOffset':  -145,
            'angleArc':     290,
            change:         CentralControlChange
        });

        // some day I'll figure out how to bind to the change event in the knob
        //$('.dial').on('change', function(v) {console.log("vol: " + v) });

    }

    function CenterControlTitle(title) {
        $("#" + center_control_config.title_id).text(title);
    }

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


    this.CenterOnCanvas = function () {
        var lPos = (this.canvasCtx.canvas.offsetLeft + this.canvasCtx.canvas.width / 2) - this.element.offsetWidth / 2 + "px";
        this.element.style.marginLeft = lPos;
        var tPos = (this.canvasCtx.canvas.offsetTop + this.canvasCtx.canvas.height / 2) - this.element.offsetHeight / 2 + "px";
        this.element.style.marginTop = tPos;
    }

    this.draw = function() {

        // keep visible always for now,
        // implement visible when user touchaes canvas, then have it fade off after no use
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


    this.Visible = function() {
        //this.element.style.visibility = 'visible';
        $(this.element).fadeIn("slow","swing");
        this.visible = true;
        this.CenterOnCanvas();
    }

    this.Hidden = function() {
        $(this.element).fadeOut("slow","swing");
        this.visible = false;
        //this.element.style.visibility = 'hidden';
    }

    this.ToggleVisible = function() {
        if (this.visible) {
            this.Hidden();
        } else {
            this.Visible();
        }
    }


    Init();
    this.Hidden();
    this.CenterOnCanvas();
    TouchPanelInit();
    //$('.dial').val(500).trigger('change');

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
