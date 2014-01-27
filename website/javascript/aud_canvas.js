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

// everything about the canvas for audio visualization
function AudioCanvas() {

    console.log("Canvas Manager")
    // a stupid way for private functions to get to this
    var that = this;

    var canvas = document.getElementById('viz_canvas1');
    var canvasCtx = canvas.getContext('2d');
    this.canvasCtx = canvasCtx;
    var canvasWidthProportion = 1.2;
    canvas.width = document.body.clientWidth / canvasWidthProportion;
    canvas.style.border = "#D0D0D0 3px solid";
    canvas.style.boxShadow = "3px 5px 3px #A0A0A0";
    var canvasBackgroundColor = "#000000";

    this.clearCanvas = function () {
        canvasCtx.fillStyle =  canvasBackgroundColor;
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    }

    this.clearCanvas();

    // a collection of debug log msgs
    var logMsgs = [];

    // displays all log msgs on canvas
    this.canvasShowLog = function () {
        canvasCtx.save();
        canvasCtx.font = "10pt Arial Bold";
        canvasCtx.fillStyle = "#A0A0A0"
        var yPos = 10;
        for (var i = 0; i < logMsgs.length; i++) {
            canvasCtx.fillText(logMsgs[i], 10, yPos);
            yPos += 11;
        }
        canvasCtx.restore();
    }

    // adds a msg to the log
    this.canvasLog = function (msg) {
        logMsgs.push(msg);
        console.log(msg);
        this.canvasShowLog();
    }

    this.canvasLog("Canvas created");
    
    // need to do something to recover out of here. 
    this.fatalError = function (msg) {
        this.clearCanvas();
        this.canvasLog(msg);
        this.canvasShowLog();
    }

    // GUI
    var centerControl = new CenterControl(canvasCtx);

    window.onresize = function () {
        var width = document.body.clientWidth / canvasWidthProportion;
        if (width > canvas.height) {
            canvas.width = width;
        }
        that.clearCanvas();
        centerControl.CenterOnCanvas();
    };

    var touchstart = 'mousedown';
    var touchmove = 'mousemove';
    var touchend = 'mouseup';

    canvas.addEventListener(touchstart, function(e) {
        function handle(x, y) {
            // the absolute geometry of an element
            // use a small patch upper right to activate central control
            var rect = canvas.getBoundingClientRect();
            var xc = x - rect.left;
            var yc = y - rect.top;
            if (yc < 100 && xc > canvas.width - 50) {
                centerControl.ToggleVisible();
            }
        }

        if(e.changedTouches) {
            for(var i=0; i < e.changedTouches.length; i++) {
                var touch = e.changedTouches[i];
                handle(touch.pageX, touch.pageY, touch);
            }
        } else {

            handle(e.pageX, e.pageY);

            switch (audioManager.audioState) {
                case "userstartplay":
                    // unlocks web audio for iOS
                   audioManager.PlayStart();
                   break;

                case "playing":
                    // ramp down volume
                    //audioState = "paused";
                    break;

                case "paused":
                    // ramp up volume
                    //audioState = "playing";
                    break;

                default:
                    break;
            }
         }
    });


    var audioManager = new AudioManager(this);
    audioManager.realTimeInfo.canvasCtx = canvasCtx;

    // called by audio manager when audio stops
    this.playEnded = function () {
        this.clearCanvas();
        this.canvasLog("Play end");
        this.canvasLog("Peak anim: " + rtData.AnimPeak.toFixed(4));
        var ave = rtData.AnimTotal / rtData.AnimCount;
        this.canvasLog("Ave anim: " + ave.toFixed(4));
        this.canvasShowLog();
    }

    var playControls = new PlayControls(canvasCtx);

    // gather some real-time data
    var rtData = {
        AnimCount: 0,
        AnimTotal: 0,
        AnimPeak: 0
    };

    function rtAnimationMeasure(start) {
        var dur = audioManager.currentTime() - start;
        if (dur > rtData.AnimPeak) {
            rtData.AnimPeak = dur;
        }
        rtData.AnimCount++;
        rtData.AnimTotal += dur;
    }

    // main animation loop
    function canvasAnimate(event) {

        var rtAnimationStart = audioManager.currentTime();

        that.clearCanvas();

        centerControl.draw();

        if (audioManager && audioManager.audioState == "userstartplay") {
            if (playControls) {
                playControls.drawPlayButton();
            }
            that.canvasShowLog();
            return;
        }


        if (audioManager.audioState != 'playing') {
            that.canvasShowLog();
            return;
        }

        // currently the sample rate is set by the audio card, it can be really high 192,000 for example
        DisplaySpectrum(audioManager.realTimeInfo);

        DisplayLissajousScript(audioManager.realTimeInfo);

        DisplayOscilloscope(audioManager.realTimeInfo);

        that.canvasShowLog();

        rtAnimationMeasure(rtAnimationStart);

    }


    // runs at animate rate
    function rafCallback(time) {
        window.webkitRequestAnimationFrame(rafCallback, canvas);

        canvasAnimate(time);
    }

    // start animation
    rafCallback();
}

var audioCanvas = null;

function onLoad(e) {
    console.log("Page Loaded");
    audioCanvas = new AudioCanvas();
}

window.addEventListener('load', onLoad, false);
