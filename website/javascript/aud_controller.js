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

 Author: Brian Gunnison (briang@tekelite.com)
 */


"use strict";

// a database of center control config
// used by app to hook to gui and manage gui layout
var center_control_config = {
    div_id:             "center_control_vis",
    change_event:       "evtCentralControlChange",
    visibility:         "hidden",    // we start hidden
    height:             240,
    width:              240,
    max_range:          1000,
    fgColor:            'blue',
    defaultValue:       500
};

function CenterControl(canvasCtx){

    this.canvasCtx = canvasCtx;
    this.element = document.getElementById(center_control_config.div_id);

    function Init(element) {
        // init gui visibility
        console.log("Control init")

        var evtck = document.createEvent("Event");
        evtck.initEvent(center_control_config.change_event, true, true);

        function CentralControlChange(value) {
            //console.log("change : " + value);
            evtck.masterVolume = value;
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

     function LoadImage(imageURL, images) {
               // load image from data url
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

    this.Draw = function() {

        if (this.element.style.visibility == 'hidden') {
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
        this.element.style.visibility = 'visible';
    }

    this.Hidden = function() {
        this.element.style.visibility = 'hidden';
    }

    this.ToggleVisible = function() {
        if (this.element.style.visibility == 'visible') {
            this.element.style.visibility = 'hidden';
        } else {
            this.element.style.visibility = 'visible';
        }
    }


    Init();
    this.Hidden();
    this.CenterOnCanvas();
    TouchPanelInit();
    //$('.dial').val(500).trigger('change');

}
