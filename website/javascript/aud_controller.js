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
/*
$(function () {
    // setup master volume
    $("#masterVolumeSlider").slider({
        value: 50,
        orientation: "horizontal",
        range: "min",
        animate: true
    //lide: function (event, ui) {
    //     this.element.trigger('aGuiMasterVolumeChange', ui.value);
    //}
//slide: function (event, ui) {
    //    console.log("slider: " + ui.value);
    //}
});

// setup graphic EQ
$("#eq > span").each(function () {
    // read initial values from markup and remove that
    var value = parseInt($(this).text(), 10);
    $(this).empty().slider({
    value: value,
    range: "min",
    animate: true,
    orientation: "vertical"
    });
});
});

function SeeSlide (event, ui) {
    console.log("slider: " + ui.value);
    }

$("#masterVolumeSlider").on("slide", SeeSlide);

$("#masterVolumeSlider").trigger("slide");
*/


$(document).ready(function (){
    // init gui visibility
    console.log("Control init")
    document.getElementById('aud_gui_control_vis').style.visibility = 'hidden';

    var evtmv = document.createEvent("Event");
    evtmv.initEvent("evtMasterVolume",true,true);

    function masterVolumeChange(value) {
        //console.log("change : " + value);
        evtmv.masterVolume = value;
        document.dispatchEvent(evtmv);
    }

    /*
     $.event.trigger({
     type: "newMessage",
     message: "Hello World!",
     time: new Date()
     });

     Handlers can now subscribe to “newMessage” events, e.g.

     $(document).on("newMessage", newMessageHandler);

     */

    var myColor = 'blue';
    var myKnob = $(".dial").knob({
    'min':0,
    'max':1000,
    'readOnly': false,
    'width': 220,
    'height': 220,
    'fgColor': myColor,
    'dynamicDraw': true,
    'thickness': 0.3,
    'tickColorizeValues': true,
    'skin':'tron',
    'lineCap':'round',
     //'displayPrevious':true
     change : masterVolumeChange
    });

    // some day I'll figure out how to bind to the change event in the knob
    //$('.dial').on('change', function(v) {console.log("vol: " + v) });

    $('.dial').val(500).trigger('change');
});
