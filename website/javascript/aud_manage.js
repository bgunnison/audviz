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
    var p = navigator.platform;
    console.log(p);
    if( p === 'iPad' || p === 'iPhone' || p === 'iPod' ){
        iOS = true;
    }

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

    function center_div_on_canvas(div_id) {
        var lPos = canvas.width / 2 - document.getElementById(div_id).offsetWidth / 2 + "px";
        document.getElementById(div_id).style.marginLeft = lPos;
        var tPos = canvas.height / 2 - document.getElementById(div_id).offsetHeight / 2 + "px";
        document.getElementById(div_id).style.marginTop = tPos;
    }

    center_div_on_canvas("aud_center_control_vis");

    function ClearCanvas() {
        canvasCtx.fillStyle =  canvasBackgroundColor;
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ClearCanvas();

    var logMsgs = [];

    canvasLog("Canvas created");
    console.log(canvas.width);

    function canvasShowLog() {
        canvasCtx.font = "10pt Arial Bold";
        canvasCtx.fillStyle = "#A0A0A0"
        var yPos = 10;
        for (var i = 0; i < logMsgs.length; i++)  {
            canvasCtx.fillText(logMsgs[i],10, yPos);
            yPos += 10;
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

    // center the center control
    //console.log(center_control.width);

    window.onresize = function() {
        canvas.width = document.body.clientWidth/1.4;
        ClearCanvas();
        center_div_on_canvas("aud_center_control_vis");
    };

    var touchstart = 'mousedown';
    var touchmove = 'mousemove';
    var touchend = 'mouseup';

    canvas.addEventListener(touchstart, function(e) {
        function handle(x, y, touch) {

        }

        if(e.changedTouches) {
            for(var i=0; i < e.changedTouches.length; i++) {
                var touch = e.changedTouches[i];
                handle(touch.pageX, touch.pageY, touch);
            }
        }
        else {

            handle(e.pageX, e.pageY);

            if (audioSource != null) {
                switch (audioState) {
                    case "connected":
                        // unlocks web audio for iOS
                        if(iOS) {
                            playStart();
                        }

                    break;

                    case "playing":
                        // ramp down volume
                        audioState = "paused";
                        break;

                    case "paused":
                        // ramp up volume
                        audioState = "playing";
                        break;

                    default:
                        canvasLog("Unknown play state");
                        break;
                }
            }
            else {
                canvasLog("audioSource is null");
            }

        }
    });

    var soundBuffer = null;
    var playControls = new PlayControls(canvasCtx);
    var audioState = "init";
    var audioSource = null;
    var spinner = null;
    var playTime = 0;
    var pauseTime = 0;
    var useAudioStream = true;
    var audioStream = null;

    function playStart() {
        if (useAudioStream) {
            audioStream.play();
        } else {
            audioSource.start(0, pauseTime);
        }
        audioState = "playing";
        playTime = audioContext.currentTime;
        canvasLog("Play started");
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
            stopSpinner(spinner);
        }

        // rafCallback();

        canvasLog("Animation started");

        if(!iOS) {
            playStart();
        }
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
            //evt.loaded the bytes browser receive
            //evt.total the total bytes seted by the header
            // we will get the total once we implenment the JSON file info transaction
            //var percentComplete = (evt.loaded / evt.total)*100;
            console.log(evt.loaded)
        }
    }


    function AudioLoad() {

        // We really want to stream the file so we don't have to wait for it all to download
        var url = localStorage.getItem("audToPlay");
        if (!url) {
            FatalError("No audio URL");
        }

        spinner = startSpinner(canvasCtx);

        if (useAudioStream) {

            audioStream = new Audio(url);
            audioStream.addEventListener('canplaythrough', function(e) {
                audioSource = audioContext.createMediaElementSource(audioStream);
                canvasLog("Audio stream ready")
                AudioConnect();
            });

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
                canvasLog("Audio request error");
            }

            try {
                request.send();
            } catch (e) {
                request.onerror();
            }
        }

        canvasLog("Audio request sent");
    }

    function EvtHandlerMasterGain(evt) {
        if (masterGainNode){
            //console.log("Gain: " + evt.masterVolume);
            masterGainNode.gain.value = evt.masterVolume/1000.0;
        }
    }

    var masterGainNode = audioContext.createGainNode();
    masterGainNode.gain.value = 0.5;
    document.addEventListener("evtMasterVolume",EvtHandlerMasterGain,false);

    var analyser = audioContext.createAnalyser();
    analyser.DefaultSmoothingTimeConstant = 0.3;
    analyser.minDecibels = -110;

    var timeDomainConfig = {};
    timeDomainConfig["canvasCtx"] = canvasCtx;
    // script processor node needs to go somewhere to process
    var blackHoleGainNode = null;

    // see if we can replace two analyzers with the real thing
    var useScriptProcForTimeDomain = 1;
    timeDomainConfig["useScriptNode"] = useScriptProcForTimeDomain;
    if (useScriptProcForTimeDomain) {
        // We can see float data of both channels and animate at audio buffer rate
        // adjust buffer size by sample rate in future, 44100 -> 192000
        // Looks like this must have an output channel and it must be attached to destination
        // so we use a gain node set to 0
        // 256, 512, 1024, 2048, 4096, 8192, 16384
        //
        stereo = audioContext.createScriptProcessor(1024, 2, 2);
        blackHoleGainNode = audioContext.createGainNode();
        blackHoleGainNode.gain.value = 0;

        // we have two async loops, animate at frame rate and audio process at sample rate/buffer size rate
        // can we animate at audio rate?
        stereo.onaudioprocess = audioCanvasAnimate;
        //stereo.onaudioprocess = audioCaptureTimeDomain;
    } else {
        // we get low rez 8 bit time domain in stereo
        // and we look at it at animation frame rate which can't be right
        stereo = audioContext.createChannelSplitter(2);
        var leftAnal = audioContext.createAnalyser();
        var rightAnal = audioContext.createAnalyser();
        timeDomainConfig["left"] = leftAnal;
        timeDomainConfig["right"] = rightAnal;
        leftAnal.minDecibels = rightAnal.minDecibels = analyser.minDecibels;
    }
    canvasLog("AudioContext created");
    //console.log(leftAnal.frequencyBinCount)
    //console.log(analyser.maxDecibels);
    //console.log(analyser.minDecibels);

    function audioCanvasAnimate(event) {

        ClearCanvas();

        if (audioState != 'playing') {
            playControls.drawPlayButton();
            canvasShowLog();
            return;
        }

        // currently the sample rate is set by the audio card, it can be really high 192,000 for example
        DisplaySpectrum(canvasCtx, analyser, audioContext.sampleRate);

        timeDomainConfig["event"] = event;

        DisplayLissajousScript( timeDomainConfig);

        canvasShowLog();
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

    // make canvas appear
    //$(".viz_canvas").toggleClass("viz_canvas_appear");

    // Note: the audio graph must be connected after the page is loaded.
    // Otherwise, the Audio tag just plays normally and ignores the audio
    // context. More info: crbug.com/112368
    console.log("Page Loaded");
    aud_manage();
}

window.addEventListener('load', onLoad, false);
