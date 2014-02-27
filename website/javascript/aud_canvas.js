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

    console.log('Canvas Manager');
    // a stupid way for private functions to get to this
    var that = this;

    // set false to see logs on canvas for debug
    var canvasLogDisable = false;

    var canvas = document.getElementById('viz_canvas1');
    var canvasCtx = canvas.getContext('2d');
    this.canvasCtx = canvasCtx;
    var canvasWidthProportion = 1.2;
    canvas.width = document.body.clientWidth / canvasWidthProportion;
    canvas.style.border = '#D0D0D0 3px solid';
    canvas.style.boxShadow = '3px 5px 3px #A0A0A0';
    var canvasBackgroundColor = '#000000';

    this.clearCanvas = function () {
        canvasCtx.fillStyle = canvasBackgroundColor;
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    }

    this.clearCanvas();

    // a collection of debug log msgs
    var logMsgs = [];

    // displays all log msgs on canvas
    this.canvasShowLog = function () {
        if (canvasLogDisable) {
            return;
        }
        canvasCtx.save();
        canvasCtx.font = '10pt Arial Bold';
        canvasCtx.fillStyle = '#A0A0A0';
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

    this.canvasLog('Canvas created');
    
    // need to do something to recover out of here. 
    this.fatalError = function (msg) {
        this.clearCanvas();
        this.canvasLog(msg);
        this.canvasShowLog();
    }


    window.onresize = function () {
        var width = document.body.clientWidth / canvasWidthProportion;
        if (width > canvas.height) {
            canvas.width = width;
        }
        that.clearCanvas();
        that.centerControl.centerOnCanvas();
    };

    var touchstart = 'mousedown';
    var touchmove = 'mousemove';
    var touchend = 'mouseup';

    canvas.addEventListener(touchstart, function(e) {
        function handle(x, y) {
            // the absolute geometry of an element
            // user touches canvas to activate central control
            var rect = canvas.getBoundingClientRect();
            var xc = x - rect.left;
            var yc = y - rect.top;
            // use upper right corner to activate
            //if (yc < 100 && xc > canvas.width - 50) {
            //    that.centerControl.toggleVisible();
            //}
            // use entire canvas to activate
            that.centerControl.toggleVisible();
        }

        if (e.changedTouches) {
            for (var i = 0; i < e.changedTouches.length; i++) {
                var touch = e.changedTouches[i];
                handle(touch.pageX, touch.pageY, touch);
            }
        } else {

            if (audioManager.audioState == 'playing') {
                handle(e.pageX, e.pageY);
            }

            switch (audioManager.audioState) {
                case 'userstartplay':
                    // unlocks web audio for iOS
                   audioManager.playStart();
                   break;

                case 'playing':
                    // ramp down volume
                    //audioState = 'paused';
                    break;

                case 'paused':
                    // ramp up volume
                    //audioState = "playing';
                    break;

                default:
                    break;
            }
         }
    });

    // instantiate audio manager
    var audioManager = new AudioManager(this);
    audioManager.realTimeInfo.canvasCtx = canvasCtx;
    audioManager.realTimeInfo.zeroCrossingSamples = 0;
    audioManager.realTimeInfo.scopeTriggerLevel = 0.0;
    audioManager.realTimeInfo.scopeAudioDataToDisplay = 1024;

    // instantiate GUI
    var playControls = new PlayControls(canvasCtx);
    this.centerControl = new CenterControl(canvasCtx);

    var currentVizMethod = displaySpectrum;

    // hook up GUI to scroll thru viz types and their parms
    this.centerControl.addClient('Spectrum', function (client) {
        audioManager.audioConnect('Spectrum');
        currentVizMethod = displaySpectrum;
    });

    this.centerControl.addClient('Lissajous', function(client) {
        audioManager.audioConnect('Audio Data');
        currentVizMethod = displayLissajousScript;
    });

    this.centerControl.addClient('Oscilloscope', function(client) {
        audioManager.audioConnect('Audio Data');
        currentVizMethod = displayOscilloscope;
    });

    this.centerControl.addClient('Envelope', function (client) {
        audioManager.audioConnect('Envelope');
        currentVizMethod = displayEnvelope;
    });

    /*
    // make sure canvas has already added this client
    this.centerControl.addClientParm(
        'Oscilloscope',
        'bufferSize',
        1024,
        16384,
        function(parm) {
            if (parm.value < 512) {
                parm.vale = 512;
            }
            audioManager.realTimeInfo.scopeAudioDataToDisplay = parm.value;
            parm.cbTitle('Display Samples: ' + audioManager.realTimeInfo.scopeAudioDataToDisplay);
        },
        function(parm) {
            parm.cbTitle('Display Samples: ' + audioManager.realTimeInfo.scopeAudioDataToDisplay);
        });
    */

    // make sure canvas has already added this client
    this.centerControl.addClientParm(
        'Oscilloscope',
        'triggerLevel',
        0 ,
        1000,
        function(parm) {
            audioManager.realTimeInfo.scopeTriggerLevel = parm.value / parm.maxRange;
            parm.cbTitle('Trigger level: ' + audioManager.realTimeInfo.scopeTriggerLevel.toFixed(3));
        },
        function(parm) {
            parm.cbTitle('Trigger level: ' + audioManager.realTimeInfo.scopeTriggerLevel.toFixed(3));
        });


    /* not really useful
    function zeroThresholdSelect(parm) {
         parm.cbTitle('Zero Threshold: ' + audioManager.realTimeInfo.zeroCrossingSamples);
    }

    function changeZeroThresholdValue(parm) {
        audioManager.realTimeInfo.zeroCrossingSamples = parm.value;
        parm.cbTitle('Zero Threshold: ' + audioManager.realTimeInfo.zeroCrossingSamples);
    }

    // make sure canvas has already added this client
    this.centerControl.addClientParm(
        'Oscilloscope',
        'zeroThreshold',
        0 ,
        100 ,
        changeZeroThresholdValue,
        zeroThresholdSelect);
    */


    // depends on clients above
    audioManager.addControls();

    // we are done adding controls, set startup controls
    this.centerControl.startup('Spectrum', 'noiseFloor');

    // called by audio manager when audio stops (sometimes)
    this.playEnded = function () {
        this.clearCanvas();
        this.canvasLog('Play end');
        console.log('Peak anim: ' + rtData.animPeak.toFixed(4));
        var ave = rtData.animTotal / rtData.animCount;
        console.log('Ave anim: ' + ave.toFixed(4));
        console.log('Buffer overruns:  ' + audioManager.realTimeInfo.audioBuffersOverRun);
        console.log('Buffer underruns: ' + audioManager.realTimeInfo.audioBuffersUnderRun);
        this.canvasShowLog();
    }

    // gather some real-time data
    var rtData = {
        animCount: 0,
        animTotal: 0,
        animPeak: 0
    };

    function rtAnimationMeasure(start) {

        // this can run faster than we get new audio data
        // we could save some realtime if we only animate a bit faster
        // than the new data, but thats on faster platforms
        // on mobile its much slower so it doesn't matter.
        var dur = audioManager.currentTime() - start;
        if (dur > rtData.animPeak) {
            rtData.animPeak = dur;
        }
        rtData.animCount++;
        rtData.animTotal += dur;
    }

    // main animation loop
    function canvasAnimate(event) {

        var rtAnimationStart = audioManager.currentTime();

        that.clearCanvas();

        if (audioManager && audioManager.audioState == 'userstartplay') {
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

        // audio animation
        currentVizMethod(audioManager.realTimeInfo);

        that.canvasShowLog();

        rtAnimationMeasure(rtAnimationStart);
    }


    // runs at animate rate
    function rafCallback(time) {
        window.requestAnimationFrame(rafCallback, canvas);
        canvasAnimate(time);
    }

    // start animation
    this.startAnimation = function() {
        rafCallback();
    }
}

var audioCanvas = null;

function onLoad(e) {
    console.log('Page Loaded');
    audioCanvas = new AudioCanvas();
}

window.addEventListener('load', onLoad, false);
