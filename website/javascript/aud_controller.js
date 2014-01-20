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

// a database of gui control config
// used by app to hook to gui and manage gui layout
var gui_config = {
    "central_knob_div_id":          "central_control_vis",
    "central_knob_change_event":    "evtChange",
    "central_knob_visibility":      "hidden",    // we start hidden
    "central_knob_height":          240,
    "central_knob_width":           240,
    "central_knob_max_range":       1000
};

function CenterControl(canvas){

    this.canvas = canvas;
    this.element = document.getElementById('central_control_vis');

    function Init(element) {
        // init gui visibility
        console.log("Control init")

        var evtck = document.createEvent("Event");
        evtck.initEvent("evtCentralControlChange", true, true);

        function CentralControlChange(value) {
            //console.log("change : " + value);
            evtck.masterVolume = value;
            document.dispatchEvent(evtck);
        }

        var myColor = 'blue';
        var myKnob = $(".dial").knob({
            'min':0,
            'max':1000,
            'readOnly': false,
            'width': 320,
            'height': 320,
            'fgColor': myColor,
            'dynamicDraw': true,
            'thickness': 0.35,
            //'tickColorizeValues': true,
            'skin':'tron',
            'lineCap':'round',
            'displayInput': false,
            'angleOffset': -145,
            'angleArc': 290,
            //'displayPrevious':true
            change : CentralControlChange
        });

        // some day I'll figure out how to bind to the change event in the knob
        //$('.dial').on('change', function(v) {console.log("vol: " + v) });

    }


    this.CenterOnCanvas = function () {
        var lPos = (this.canvas.offsetLeft + this.canvas.width / 2) - this.element.offsetWidth / 2 + "px";
        this.element.style.marginLeft = lPos;
        var tPos = (this.canvas.offsetTop + this.canvas.height / 2) - this.element.offsetHeight / 2 + "px";
        this.element.style.marginTop = tPos;
    }

    this.Visible = function() {
        this.element.style.visibility = 'visible';
    }

    this.Hidden = function() {
        this.element.style.visibility = 'hidden';
    }



    Init();
    this.Hidden();
    this.CenterOnCanvas();
    $('.dial').val(500).trigger('change');

}
