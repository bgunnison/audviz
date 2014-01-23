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

// script processor goes out of scope and stops
var stereo = null;
function audioCaptureTimeDomain(event) {
    console.log("audio process event!")
}

function aud_manage() {

    console.log("Audio Manager")

    // iOS requires a user to start playing rather than as soon as we can
    var iOS = false;
    var platform = navigator.platform;
    console.log(platform);
    if( platform === 'iPad' || platform === 'iPhone' || platform === 'iPod' ){
        iOS = true;
    }

    //iOS = true;

    var audioContext = null;

    // Check for non Web Audio API browsers.
    try {
        // Fix up for prefixing
        window.AudioContext = window.AudioContext||window.webkitAudioContext;
        audioContext = new AudioContext();
    }
    catch(e) {
        alert('Web Audio API is not supported in this browser');
        return;
    }

    if (audioContext == null){
        alert('Web Audio context error');
        return;
    }

    var canvas = document.getElementById('viz_canvas1');
    var canvasCtx = canvas.getContext('2d');
    canvas.width = document.body.clientWidth / 1.4;
    canvas.style.border = "#D0D0D0 3px solid";
    canvas.style.boxShadow = "3px 5px 3px #A0A0A0";
    var canvasBackgroundColor = "#000000";

    function ClearCanvas() {
        canvasCtx.fillStyle =  canvasBackgroundColor;
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ClearCanvas();

    var logMsgs = [];

    canvasLog("Canvas created");
    //console.log(canvas.width);

    function canvasShowLog() {
        canvasCtx.font = "10pt Arial Bold";
        canvasCtx.fillStyle = "#A0A0A0"
        var yPos = 10;
        for (var i = 0; i < logMsgs.length; i++)  {
            canvasCtx.fillText(logMsgs[i],10, yPos);
            yPos += 11;
        }
    }

    function canvasLog(msg) {
        logMsgs.push(msg);
        console.log(msg);
        canvasShowLog();
    }

    function FatalError(msg) {
        ClearCanvas();
        canvasLog(msg);
        canvasShowLog();
    }

    // GUI
    var centerControl = new CenterControl(canvasCtx);

    window.onresize = function() {
        canvas.width = document.body.clientWidth/1.4;
        ClearCanvas();
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

            switch (audioState) {
                case "userstartplay":
                    // unlocks web audio for iOS
                    PlayStart();
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

    var soundBuffer = null;
    var playControls = null;
    var audioState = "init";
    var audioSource = null;
    var spinner = null;
    var playTime = 0;
    var pauseTime = 0;
    var useAudioStream = !iOS;
    var audioStream = null;

    function PlayStart() {
        if (useAudioStream) {
            audioStream.play();
        } else {
            audioSource.start(0, pauseTime);
        }
        audioState = "playing";
        playTime = audioContext.currentTime;
        canvasLog("Play started");
    }

    function AudioUserPlay() {
        if (spinner) {
            StopSpinner(spinner);
            spinner = null;
            ClearCanvas();
        }

        playControls = new PlayControls(canvasCtx);
        playControls.drawPlayButton();

        canvasLog("Waiting for play");
        audioState = "userstartplay";

        canvasShowLog();
    }

    function AudioConnect() {
        if (audioSource == null) {
            FatalError("can't connect audio source is null")
            return;
        }

        audioSource.connect(analyser);
        audioSource.connect(stereo);
        stereo.connect(blackHoleGainNode);
        blackHoleGainNode.connect(audioContext.destination);

        if (!useScriptProcForTimeDomain) {
            stereo.connect(leftAnal,0);
            stereo.connect(rightAnal,1);
        }

        audioSource.connect(masterGainNode);
        masterGainNode.connect(audioContext.destination);

        canvasLog("Audio connected");
        audioState = "connected";

        if (spinner) {
            StopSpinner(spinner);
            spinner = null;
            ClearCanvas();
        }

        if(iOS) {
         // we need user to start
            AudioUserPlay();
        } else {
            PlayStart();
        }
        canvasLog("Animation started");
        rafCallback();
    }


    function AudioBuffer(buffer) {
        if (buffer == null) {
            FatalError("decoded buffer is null");
            return;
        }

        canvasLog("Audio decoded");
        audioState = "decoded";

        audioSource = audioContext.createBufferSource();
        audioSource.buffer = buffer;

        AudioConnect();
    }

    function AudioDecode() {
        if (soundBuffer == null) {
            canvasLog("sound buffer is null");
            return;
        }

        audioContext.decodeAudioData(soundBuffer, AudioBuffer,
            function () { alert("error decoding!"); });

        audioState = "decoding";
    }

    function AudioLoaded(arrayBuffer) {
        audioState = "loaded";
        soundBuffer = arrayBuffer;
        AudioDecode();
    }

    function updateAudFileDownloadProgress(evt) {
        if (evt.lengthComputable) {

            console.log(evt.loaded)
        }
    }


    function AudioLoad() {

        // We really want to stream the file so we don't have to wait for it all to download
        var url = localStorage.getItem("audToPlay");
        if (!url) {
            FatalError("No audio URL");
        }

        spinner = StartSpinner(canvasCtx, canvasShowLog);
        audioState = "loading";
        if (useAudioStream) {

            audioStream = new Audio(url);

            audioStream.addEventListener('loadedmetadata', function(e) {
                canvasLog("Audio length: " + Math.round(audioStream.duration) + " secs");
            });

            audioStream.addEventListener('canplay', function(e) {
                canvasLog("Audio can play");
            });

            audioStream.addEventListener('canplaythrough', function(e) {
                audioSource = audioContext.createMediaElementSource(audioStream);
                canvasLog("Audio stream ready");
                audioState = "loaded";
                AudioConnect();
            });

            audioStream.addEventListener('ended', function() {
                ClearCanvas();
                canvasLog("Play end");
                canvasLog("Peak anim: " + rtData.AnimPeak.toFixed(4));
                var ave = rtData.AnimTotal / rtData.AnimCount;
                canvasLog("Ave anim: " + ave.toFixed(4));
                canvasShowLog();
            }, false);

            audioStream.addEventListener('error', function() {
                FatalError("Audio error: " + url);
            }, false);

            audioStream.load(); // needed for play on iOS

        } else {

            var request = new XMLHttpRequest();
            request.onprogress=updateAudFileDownloadProgress;

            request.open('GET', url, true);
            request.responseType = 'arraybuffer';
            request.onload = function(e) {
                AudioLoaded(request.response);
            };

            request.onerror = function() {
                // if there is an error, switch the sound to HTML Audio
                FatalError("Audio request error");
            }

            try {
                request.send();
            } catch (e) {
                request.onerror();
            }
        }

        canvasLog("Audio request sent");
    }

    function EvtHandlerCentralControlChange(evt) {
        if (masterGainNode) {
            var linearGain = evt.masterVolume/1000.0;
            // human perception in general is logarithmic
            var expGain = (Math.exp(linearGain)-1)/(Math.E-1);
            masterGainNode.gain.value = expGain;
        }
    }

    document.addEventListener("evtCentralControlChange", EvtHandlerCentralControlChange, false);

    var scriptProcessorSize = 1024;
    var defaultMasterGain = 0.5;

    var masterGainNode = audioContext.createGainNode();
    masterGainNode.gain.value = defaultMasterGain;

    var analyser = audioContext.createAnalyser();
    analyser.DefaultSmoothingTimeConstant = 0.3;
    analyser.minDecibels = -110;

    var timeDomainConfig = {};
    timeDomainConfig.ldata = new Float32Array(scriptProcessorSize);
    timeDomainConfig.rdata = new Float32Array(scriptProcessorSize);

    timeDomainConfig.canvasCtx = canvasCtx;
    // script processor node needs to go somewhere to process
    var blackHoleGainNode = null;

    // see if we can replace two analyzers with the real thing
    var useScriptProcForTimeDomain = 1;
    timeDomainConfig.useScriptNode = useScriptProcForTimeDomain;
    if (useScriptProcForTimeDomain) {
        // We can see float data of both channels and animate at audio buffer rate
        // adjust buffer size by sample rate in future, 44100 -> 192000
        // Looks like this must have an output channel and it must be attached to destination
        // so we use a gain node set to 0
        // 256, 512, 1024, 2048, 4096, 8192, 16384
        //
        stereo = audioContext.createScriptProcessor(scriptProcessorSize, 2, 2);
        blackHoleGainNode = audioContext.createGainNode();
        blackHoleGainNode.gain.value = 0;

        // we have two async loops, animate at frame rate and audio process at sample rate/buffer size rate
        // we can animate at audio rate, but this does not use requestAnimationFrame,
        // which is friendlier say if the canvas is in the background
        // so we do a copy of the realtime data
        //stereo.onaudioprocess = audioCanvasAnimate;
        stereo.onaudioprocess = audioCaptureTimeDomain;
    } else {
        // we get low rez 8 bit time domain in stereo
        // and we look at it at animation frame rate which can't be right
        stereo = audioContext.createChannelSplitter(2);
        var leftAnal = audioContext.createAnalyser();
        var rightAnal = audioContext.createAnalyser();
        timeDomainConfig.left = leftAnal;
        timeDomainConfig.right = rightAnal;
        leftAnal.minDecibels = rightAnal.minDecibels = analyser.minDecibels;
    }
    canvasLog("Audio nodes created");

    var toType = function(obj) {
        return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase()
    }

    function audioCaptureTimeDomain(event) {
        // these values are only valid in the scope of the onaudioprocess event
        var ldata = event.inputBuffer.getChannelData(0);
        var rdata = event.inputBuffer.getChannelData(1);

        // have to copy here as the buffers are potentially undefined outside this event
        // be nice to use splice...
        for (var i = 0; i < scriptProcessorSize; i++) {
            timeDomainConfig.ldata[i] = ldata[i];
            timeDomainConfig.rdata[i] = rdata[i];
        }
    }

    // gather some real-time data
    var rtData = {
        AnimCount:    0,
        AnimTotal:    0,
        AnimPeak:     0
    };

    function rtAnimationMeasure(start) {
        var dur = audioContext.currentTime - start;
        if (dur > rtData.AnimPeak) {
            rtData.AnimPeak = dur;
        }
        rtData.AnimCount++;
        rtData.AnimTotal += dur;
    }

    function audioCanvasAnimate(event) {

        var rtAnimationStart = audioContext.currentTime;

        ClearCanvas();

        centerControl.Draw();

        if (audioState == "userstartplay") {
            if (playControls) {
                playControls.drawPlayButton();
            }
            canvasShowLog();
            return;
        }


        if (audioState != 'playing') {
            canvasShowLog();
            return;
        }

        // currently the sample rate is set by the audio card, it can be really high 192,000 for example
        DisplaySpectrum(canvasCtx, analyser, audioContext.sampleRate);

        DisplayLissajousScript(timeDomainConfig);

        DisplayOscilloscope(timeDomainConfig);

        canvasShowLog();

        rtAnimationMeasure(rtAnimationStart);

    }


    // runs at animate rate
    function rafCallback(time) {
        window.webkitRequestAnimationFrame(rafCallback, canvas);

        audioCanvasAnimate(time);
    }

    // start ball rolling
    AudioLoad();
}

function onLoad(e) {
    // Note: the audio graph must be connected after the page is loaded.
    // Otherwise, the Audio tag just plays normally and ignores the audio
    // context. More info: crbug.com/112368
    console.log("Page Loaded");
    aud_manage();
}

window.addEventListener('load', onLoad, false);
