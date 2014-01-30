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

// created by the canvas, does everything to play audio and capture 
// realtime info for visualization
function AudioManager(canvasManager) {

    console.log("Audio Manager");
    // so private functions can get to this
    var that = this;

    // 
    var scriptProcessorSize = 1024;
    var defaultMasterGain = 0.5;
    // used via central control to set gain
    // big enough so no zipper noise
    var masterGainMaxRange = 1000;

    // iOS requires a user to start playing rather than as soon as we can
    var iOS = false;
    var platform = navigator.platform;
    console.log(platform);
    if( platform === 'iPad' || platform === 'iPhone' || platform === 'iPod' ){
        iOS = true;
    }

    // set for test on desktop
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
   
    // public fields
    this.audioState = "init";

    // represents a realtime clock that goes forever
    this.currentTime = function () {
        return audioContext.currentTime;
    }

    var soundBuffer = null;
    var audioSource = null;
    var spinner = null;
    var playTime = 0;
    var pauseTime = 0;
    var useAudioStream = !iOS;
    var audioStream = null;

    this.PlayStart = function() {
        if (useAudioStream) {
            audioStream.play();
        } else {
            audioSource.start(0, pauseTime);
        }
        that.audioState = "playing";
        playTime = audioContext.currentTime;
        canvasManager.canvasLog("Play started");
    }

    function AudioUserPlay() {
        if (spinner) {
            StopSpinner(spinner);
            spinner = null;
            canvasManager.clearCanvas();
        }

        canvasManager.canvasLog("Waiting for play");
        that.audioState = "userstartplay";

        canvasManager.canvasShowLog();
    }

    function AudioConnect() {
        if (audioSource == null) {
            canvasManager.fatalError("can't connect audio source is null")
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

        canvasManager.canvasLog("Audio connected");
        that.audioState = "connected";

        if (spinner) {
            StopSpinner(spinner);
            spinner = null;
            canvasManager.clearCanvas();
        }

        if(iOS) {
         // we need user to start
            AudioUserPlay();
        } else {
            that.PlayStart();
        }
        
    }


    function AudioBuffer(buffer) {
        if (buffer == null) {
            canvasManager.fatalError("decoded buffer is null");
            return;
        }

        canvasManager.canvasLog("Audio decoded");
        that.audioState = "decoded";

        audioSource = audioContext.createBufferSource();
        audioSource.buffer = buffer;

        AudioConnect();
    }

    function AudioDecode() {
        if (soundBuffer == null) {
            canvasManager.canvasLog("sound buffer is null");
            return;
        }

        audioContext.decodeAudioData(soundBuffer, AudioBuffer,
            function () {
                alert("error decoding!");
            });

        that.audioState = "decoding";
    }

    function AudioLoaded(arrayBuffer) {
        that.audioState = "loaded";
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
            canvasManager.fatalError("No audio URL");
        }

        spinner = StartSpinner(canvasManager.canvasCtx, canvasManager.canvasShowLog);
        that.audioState = "loading";
        if (useAudioStream) {

            audioStream = new Audio(url);

            audioStream.addEventListener('loadedmetadata', function(e) {
                canvasManager.canvasLog("Audio length: " + Math.round(audioStream.duration) + " secs");
            });

            audioStream.addEventListener('canplay', function(e) {
                canvasManager.canvasLog("Audio can play");
            });

            audioStream.addEventListener('canplaythrough', function(e) {
                audioSource = audioContext.createMediaElementSource(audioStream);
                canvasManager.canvasLog("Audio stream ready");
                that.audioState = "loaded";
                AudioConnect();
            });

            audioStream.addEventListener('ended', function () {
                canvasManager.playEnded();
            }, false);

            audioStream.addEventListener('error', function() {
                canvasManager.fatalError("Audio error: " + url);
            }, false);

            audioStream.load(); // needed for play on iOS

        } else {

            var request = new XMLHttpRequest();
            request.onprogress = updateAudFileDownloadProgress;

            request.open('GET', url, true);
            request.responseType = 'arraybuffer';
            request.onload = function(e) {
                AudioLoaded(request.response);
            };

            request.onerror = function() {
                // if there is an error, switch the sound to HTML Audio
                canvasManager.fatalError("Audio request error");
            }

            try {
                request.send();
            } catch (e) {
                request.onerror();
            }
        }

        canvasManager.canvasLog("Audio request sent");
    }


    function changeMasterGainValue(evt) {
        if (masterGainNode) {
            var linearGain = evt.value/evt.maxRange;
            // human perception in general is logarithmic
            var expGain = (Math.exp(linearGain)-1)/(Math.E-1);
            masterGainNode.gain.value = expGain;
            if (evt.cbTitle) {
                evt.cbTitle("Gain: " + Math.round(expGain * 100) + " %");
            }
        }
    }


    function changeMasterGainType(evt) {
        if (evt.cbTitle) {
            if (masterGainNode) {
                evt.cbTitle("Gain: " + Math.round(masterGainNode.gain.value * 100) + " %");
            } else {
                evt.cbTitle("Not Used");
            }
        }
        if (evt.cbMaxRange) {
            evt.cbMaxRange(masterGainMaxRange);
        }
    }

    var centralControlHooks = {
        "typeChange": {
            "masterGain": changeMasterGainType
        },
        "valueChange": {
            "masterGain": changeMasterGainValue
        }
    }

    function EvtAudioHandlerCentralControlChange(evt) {
        // The center control is configured to change selected parameters by the user
        // we get change events here and can control audio config
        // Also we (will) save config to cookie and restore at page load

        try {
            centralControlHooks[evt.what][evt.controlType](evt);
        } catch(err) {
            //console.log("control not supported: " + err.message);
        }
    }

    document.addEventListener("evtCentralControlChange", EvtAudioHandlerCentralControlChange, false);

    // a database of all info needed by visualization
    this.realTimeInfo = {};
    this.realTimeInfo.sampleRate = audioContext.sampleRate;
    this.realTimeInfo.ldata = new Float32Array(scriptProcessorSize);
    this.realTimeInfo.rdata = new Float32Array(scriptProcessorSize);

    var masterGainNode = audioContext.createGainNode();
    masterGainNode.gain.value = defaultMasterGain;

    var analyser = audioContext.createAnalyser();
    analyser.DefaultSmoothingTimeConstant = 0.3;
    analyser.minDecibels = -110;
    this.realTimeInfo.analyser = analyser;
        
    // script processor node needs to go somewhere to process
    var blackHoleGainNode = null;

    // see if we can replace two analyzers with the real thing
    var useScriptProcForTimeDomain = 1;
    
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
        this.realTimeInfo.leftAnal = leftAnal;
        this.realTimeInfo.rightAnal = rightAnal;
        leftAnal.minDecibels = rightAnal.minDecibels = analyser.minDecibels;
    }
    canvasManager.canvasLog("Audio nodes created");

   

    function audioCaptureTimeDomain(event) {
        // these values are only valid in the scope of the onaudioprocess event
        var ldata = event.inputBuffer.getChannelData(0);
        var rdata = event.inputBuffer.getChannelData(1);

        // have to copy here as the buffers are potentially undefined outside this event
        // be nice to use splice...
        for (var i = 0; i < scriptProcessorSize; i++) {
            that.realTimeInfo.ldata[i] = ldata[i];
            that.realTimeInfo.rdata[i] = rdata[i];
        }
    }

    // start ball rolling
    AudioLoad();
}


