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

    var defaultScriptProcessorSize = 1024;
    var defaultSmoothingTimeConstant = 0.3;
    var defaultNoiseFloor = -110;
    var noiseFloorMax = -90;
    var noiseFloorMin = -140;

    // used via central control to set gain
    // big enough so no zipper noise
    var guiMasterGainMaxRange = 1000;
    var defaultGuiMasterGain = 500;

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
    var spinner = null;
    var playTime = 0;
    var pauseTime = 0;
    var useAudioStream = !iOS;
    var audioStream = null;

    this.playStart = function() {
        if (useAudioStream) {
            audioStream.play();
        } else {
            audioGraphInfo.audioSource.start(0, pauseTime);
        }
        that.audioState = "playing";
        playTime = audioContext.currentTime;
        canvasManager.canvasLog("Play started");
        canvasManager.startAnimation();

    }

    function audioUserPlay() {
        if (spinner) {
            StopSpinner(spinner);
            spinner = null;
            canvasManager.clearCanvas();
        }

        canvasManager.canvasLog("Waiting for play");
        that.audioState = "userstartplay";
        canvasManager.startAnimation();
        canvasManager.canvasShowLog();
    }

    // connects audio for your listening pleasure
    function audioGraphConnect() {
        if (audioGraphInfo.audioSource == null) {
            canvasManager.fatalError("can't connect - audio source is null")
            return;
        }

        audioGraphInfo.audioSource.connect(audioGraphInfo.masterGainNode);
        audioGraphInfo.masterGainNode.connect(audioContext.destination);

        canvasManager.canvasLog("Audio connected");
        that.audioState = "connected";

        if (spinner) {
            StopSpinner(spinner);
            spinner = null;
            canvasManager.clearCanvas();
        }

        if(iOS) {
         // we need user to start
            audioUserPlay();
        } else {
            that.playStart();
        }
    }

    // connects audio for your viewing pleasure
    function audioVizGraphConnect() {
        if (audioGraphInfo.audioSource == null) {
            canvasManager.fatalError("can't connect - audio source is null")
            return;
        }

        audioGraphInfo.audioSource.connect(audioGraphInfo.analyser);
        audioGraphInfo.audioSource.connect(audioGraphInfo.stereoTimeDomainNode);
        audioGraphInfo.stereoTimeDomainNode.connect(audioGraphInfo.blackHoleGainNode);
        audioGraphInfo.blackHoleGainNode.connect(audioContext.destination);
    }


    function audioBuffer(buffer) {
        if (buffer == null) {
            canvasManager.fatalError("decoded buffer is null");
            return;
        }

        canvasManager.canvasLog("Audio decoded");
        that.audioState = "decoded";

        audioGraphInfo.audioSource = audioContext.createBufferSource();
        audioGraphInfo.audioSource.buffer = buffer;

        audioVizGraphConnect();
        audioGraphConnect();
    }

    function audioDecode() {
        if (soundBuffer == null) {
            canvasManager.canvasLog("sound buffer is null");
            return;
        }

        audioContext.decodeAudioData(soundBuffer, audioBuffer,
            function () {
                alert("error decoding!");
            });

        that.audioState = "decoding";
    }

    function audioLoaded(arrayBuffer) {
        that.audioState = "loaded";
        soundBuffer = arrayBuffer;
        audioDecode();
    }

    function updateAudFileDownloadProgress(evt) {
        if (evt.lengthComputable) {
            console.log(evt.loaded)
        }
    }

    // database of Web audio nodes and their configuration
    var audioGraphInfo = {};
    audioGraphInfo.masterGain = defaultGuiMasterGain/guiMasterGainMaxRange;
    audioGraphInfo.scriptProcessorSize = defaultScriptProcessorSize;
    audioGraphInfo.smoothingTimeConstant = defaultSmoothingTimeConstant;
    audioGraphInfo.minDecibels = defaultNoiseFloor;

    function audioLoad() {

        // We really want to stream the file so we don't have to wait for it all to download
        var url = localStorage.getItem("audToPlay");
        if (!url) {
            canvasManager.fatalError("No audio URL");
        }

        that.audioState = "loading";
        spinner = StartSpinner(canvasManager.canvasCtx, canvasManager.canvasShowLog);

        if (useAudioStream) {

            audioStream = new Audio(url);

            audioStream.addEventListener('loadedmetadata', function(e) {
                canvasManager.canvasLog("Audio length: " + Math.round(audioStream.duration) + " secs");
            });

            audioStream.addEventListener('canplay', function(e) {
                canvasManager.canvasLog("Audio can play");
            });

            audioStream.addEventListener('canplaythrough', function(e) {
                audioGraphInfo.audioSource = audioContext.createMediaElementSource(audioStream);
                canvasManager.canvasLog("Audio stream ready");
                that.audioState = "loaded";
                audioVizGraphConnect();
                audioGraphConnect();
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
                audioLoaded(request.response);
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


    function changeMasterGainValue(client) {
        if (audioGraphInfo.masterGainNode) {
            var linearGain = client.value/client.maxRange;
            // human perception in general is logarithmic
            var expGain = (Math.exp(linearGain)-1)/(Math.E-1);
            audioGraphInfo.masterGainNode.gain.value = expGain;
            audioGraphInfo.masterGain = expGain;
            client.cbTitle(client.name + ": " + Math.round(expGain * 100) + " %");
        }
    }

    function changeMasterGainType(client) {
       audioGraphInfo.masterGain = audioGraphInfo.masterGainNode.gain.value;
       client.cbTitle(client.name + ": " + Math.round(audioGraphInfo.masterGain * 100) + " %");
    }

    // canvas owns control for now
    canvasManager.centerControl.addClient("Gain", defaultGuiMasterGain , guiMasterGainMaxRange , changeMasterGainValue, changeMasterGainType);

    function changeNoiseFloorValue(client) {
        if (audioGraphInfo.analyser) {
            var noiseFloor = noiseFloorMin + client.value;

            audioGraphInfo.analyser.minDecibels = noiseFloor;
            audioGraphInfo.minDecibels = noiseFloor;
            client.cbTitle(client.name + ": " + noiseFloor + " dB");
        }
    }

    function changeNoiseFloorType(client) {
        client.cbTitle(client.name + ": " + audioGraphInfo.minDecibels + " dB");
    }

    // -140 to -90, range
    //              -90             -140
    var nfRange = noiseFloorMax - noiseFloorMin;
    var nfgui = noiseFloorMax - audioGraphInfo.minDecibels;
    canvasManager.centerControl.addClient("Spectrum Noise Floor", nfgui, nfRange, changeNoiseFloorValue, changeNoiseFloorType);


    // a database of all info needed by visualization
    this.realTimeInfo = {};
    // can't change this yet
    this.realTimeInfo.sampleRate = audioContext.sampleRate;

    // create the audio graph for viewing
    function audioVizGraphCreate() {
        // buffers from script thread are copied to here to be sampled by animation thread
        that.realTimeInfo.ldata = new Float32Array(audioGraphInfo.scriptProcessorSize);
        that.realTimeInfo.rdata = new Float32Array(audioGraphInfo.scriptProcessorSize);

        // one spectrum display for now
        audioGraphInfo.analyser = audioContext.createAnalyser();
        audioGraphInfo.analyser.DefaultSmoothingTimeConstant = audioGraphInfo.smoothingTimeConstant;
        audioGraphInfo.analyser.minDecibels = audioGraphInfo.minDecibels; //-110;
        that.realTimeInfo.analyser = audioGraphInfo.analyser;

        // We can see float data of both channels 
        // Looks like this must have an output channel and it must be attached to destination
        // so we use a gain node set to 0
        // sizes: 256, 512, 1024, 2048, 4096, 8192, 16384
        audioGraphInfo.stereoTimeDomainNode = audioContext.createScriptProcessor(audioGraphInfo.scriptProcessorSize, 2, 2);

        // we have two async loops, animate at frame rate and audio process at sample rate/buffer size rate
        // we can animate at audio rate, but this does not use requestAnimationFrame,
        // which is friendlier say if the canvas is in the background
        // so we do a copy of the realtime data
        audioGraphInfo.stereoTimeDomainNode.onaudioprocess = audioCaptureTimeDomain;

        // script processor node needs to go somewhere to process
        audioGraphInfo.blackHoleGainNode = audioContext.createGainNode();
        audioGraphInfo.blackHoleGainNode.gain.value = 0;

        canvasManager.canvasLog("Audio viz nodes created");
    }
    

    // create the audio graph for listening
    function audioGraphCreate() {

        audioGraphInfo.masterGainNode = audioContext.createGainNode();
        audioGraphInfo.masterGainNode.gain.value = audioGraphInfo.masterGain;

        canvasManager.canvasLog("Audio nodes created");
    }
   

    function audioCaptureTimeDomain(event) {
        // these values are only valid in the scope of the onaudioprocess event
        var ldata = event.inputBuffer.getChannelData(0);
        var rdata = event.inputBuffer.getChannelData(1);

        // have to copy here as the buffers are potentially undefined outside this event
        // be nice to use splice...
        for (var i = 0; i < audioGraphInfo.scriptProcessorSize; i++) {
            that.realTimeInfo.ldata[i] = ldata[i];
            that.realTimeInfo.rdata[i] = rdata[i];
        }
    }

    // start ball rolling
    audioGraphCreate();
    audioVizGraphCreate();
    audioLoad();
}


