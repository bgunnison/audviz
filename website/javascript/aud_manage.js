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

    console.log('Audio Manager');
    // so private functions can get to this
    var that = this;

    var audioLoop = false;

    var scriptProcessorSizes = [256, 512, 1024, 2048, 4096, 8192, 16384];
    var defaultScriptProcessorSize = scriptProcessorSizes[2];
    var defaultSmoothingTimeConstant = 0.3;
    var defaultNoiseFloor = -110;
    var noiseFloorMax = -90;
    var noiseFloorMin = -140;
    var fftLengths = [1024, 2048];
    var defaultFftLength = fftLengths[1];

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
   // iOS = true;

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
    this.audioState = 'init';

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
        if (audioGraphInfo.microphone == false) {
            if (useAudioStream) {
                audioStream.play();
            } else {
                audioGraphInfo.audioSource.start(0, pauseTime);
            }
        }

        that.audioState = 'playing';
        playTime = audioContext.currentTime;
        canvasManager.canvasLog('Play started');
        canvasManager.startAnimation();
    }

    function audioUserPlay() {
        if (spinner) {
            StopSpinner(spinner);
            spinner = null;
            canvasManager.clearCanvas();
        }

        if (audioGraphInfo.microphone == false) {
            canvasManager.canvasLog('Waiting for play');
            that.audioState = 'userstartplay';
        } else {
            that.audioState = 'playing';
        }
        canvasManager.startAnimation();
        canvasManager.canvasShowLog();
    }

    // connects audio for your listening pleasure
    function audioGraphConnect() {
        if (audioGraphInfo.audioSource == null) {
            canvasManager.fatalError('Cannot connect - audio source is null');
            return;
        }

        audioGraphInfo.audioSource.connect(audioGraphInfo.masterGain);
        audioGraphInfo.masterGain.connect(audioContext.destination);

        canvasManager.canvasLog('Audio connected');
        that.audioState = 'connected';

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
            canvasManager.fatalError('cannot connect - audio source is null');
            return;
        }

        audioGraphInfo.audioSource.connect(audioGraphInfo.analyser);
        audioGraphInfo.audioSource.connect(audioGraphInfo.stereoTimeDomainNode);
        audioGraphInfo.stereoTimeDomainNode.connect(audioGraphInfo.blackHoleGain);
        audioGraphInfo.blackHoleGain.connect(audioContext.destination);
    }


    function audioBuffer(buffer) {
        if (buffer == null) {
            canvasManager.fatalError('Decoded buffer is null');
            return;
        }

        canvasManager.canvasLog('Audio decoded');
        that.audioState = 'decoded';

        audioGraphInfo.audioSource = audioContext.createBufferSource();
        audioGraphInfo.audioSource.buffer = buffer;

        audioVizGraphConnect();
        audioGraphConnect();
    }

    function audioDecode() {
        if (soundBuffer == null) {
            canvasManager.canvasLog('Sound buffer is null');
            return;
        }

        audioContext.decodeAudioData(soundBuffer, audioBuffer,
            function () {
                alert('Error decoding!');
            });

        that.audioState = 'decoding';
    }

    function audioLoaded(arrayBuffer) {
        that.audioState = 'loaded';
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
    audioGraphInfo.masterGainValue = defaultGuiMasterGain/guiMasterGainMaxRange;
    audioGraphInfo.scriptProcessorSize = defaultScriptProcessorSize;
    audioGraphInfo.smoothingTimeConstant = defaultSmoothingTimeConstant;
    audioGraphInfo.minDecibels = defaultNoiseFloor;
    audioGraphInfo.fftLength = defaultFftLength;
    audioGraphInfo.microphone = false;

    function audioStartMicrophone(stream) {
        audioGraphInfo.audioSource = audioContext.createMediaStreamSource(stream);
        audioGraphInfo.microphone = true;
        canvasManager.canvasLog('Audio microphone ready');
        that.audioState = 'loaded';
        audioVizGraphConnect();
        audioGraphConnect();
    }

    function listAudioInputs() {

        if (typeof MediaStreamTrack === 'undefined'){
            console.log('MediaStreamTrack unsupported');
            return;
        }
        // in chrome://flags/
        // enable this, but in chrome 32.0.1700.107 m and canary
        // get 'Functionality not implemented yet" exception

        MediaStreamTrack.getSources(function(sourceInfos) {
            var audioSource = null;
            var videoSource = null;

            for (var i = 0; i != sourceInfos.length; ++i) {
                var sourceInfo = sourceInfos[i];
                if (sourceInfo.kind === 'audio') {
                    console.log(sourceInfo.id, sourceInfo.label || 'microphone');
                    audioSource = sourceInfo.id;
                }
            }

        //sourceSelected(audioSource, videoSource);
        });

    }


    function audioMicrophone() {
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
        canvasManager.canvasLog('Connecting microphone');
        try {
            navigator.getUserMedia({ audio: true }, audioStartMicrophone, function (e) {
                canvasManager.fatalError('User audio not available: ' + e.name);
            });
        } catch (e) {
            alert('User audio is not supported in this browser');
        }
    }

    function audioLoad() {

        // We really want to stream the file so we don't have to wait for it all to download
        var url = localStorage.getItem('audToPlay');
        if (!url) {
            canvasManager.fatalError('No audio URL');
        } 

        that.audioState = 'loading';

        if (url === 'userStream') {
            listAudioInputs();
            audioMicrophone();
            return;
        }
            
        spinner = StartSpinner(canvasManager.canvasCtx, canvasManager.canvasShowLog);

        if (useAudioStream) {

            audioStream = new Audio(url);

            audioStream.addEventListener('loadedmetadata', function(e) {
                canvasManager.canvasLog('Audio length: ' + Math.round(audioStream.duration) + ' secs');
            });

            audioStream.addEventListener('canplay', function(e) {
                canvasManager.canvasLog('Audio can play');
            });

            audioStream.addEventListener('canplaythrough', function(e) {
                audioGraphInfo.audioSource = audioContext.createMediaElementSource(audioStream);
                canvasManager.canvasLog('Audio stream ready');
                that.audioState = 'loaded';
                audioVizGraphConnect();
                audioGraphConnect();
            });

            audioStream.addEventListener('ended', function () {
                canvasManager.playEnded();
                if (that.audioLoop) {
                    setTimeout(audioLoad, 10);
                }
            }, false);

            audioStream.addEventListener('error', function() {
                canvasManager.fatalError('Audio error: ' + url);
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
                canvasManager.fatalError('Audio request error');
            }

            try {
                request.send();
            } catch (e) {
                request.onerror();
            }
        }

        canvasManager.canvasLog('Audio request sent');
    }

    //
    // Audio GUI hooks
    function changeMasterGainValue(parm) {
        if (audioGraphInfo.masterGain) {
            var linearGain = parm.value/parm.maxRange;
            // human perception in general is logarithmic
            var expGain = (Math.exp(linearGain)-1)/(Math.E-1);
            audioGraphInfo.masterGain.gain.value = expGain;
            audioGraphInfo.masterGainValue = expGain;
            parm.cbTitle('Gain: ' + Math.round(expGain * 100) + ' %');
        }
    }

    function masterGainSelect(parm) {
        parm.cbTitle('Gain: ' + Math.round( audioGraphInfo.masterGainValue * 100) + ' %');
    }

    function audioSelect(client) {
       // nothing to do yet
    }

    // canvas owns controls for now
    canvasManager.centerControl.addClient('Audio', audioSelect);

    canvasManager.centerControl.addClientParm(
        'Audio',
        'Gain',
        defaultGuiMasterGain ,
        guiMasterGainMaxRange ,
        changeMasterGainValue,
        masterGainSelect);

    function changeNoiseFloorValue(parm) {
        if (audioGraphInfo.analyser) {
            var noiseFloor = noiseFloorMin + parm.value;
            audioGraphInfo.analyser.minDecibels = noiseFloor;
            audioGraphInfo.minDecibels = noiseFloor;
            parm.cbTitle('Noise floor: ' + noiseFloor + ' dB');
        }
    }

    function noiseFloorSelect(parm) {
        parm.cbTitle('Noise floor: ' + audioGraphInfo.minDecibels + ' dB');
    }

    // -140 to -90, range
    //              -90             -140
    var nfRange = noiseFloorMax - noiseFloorMin;
    var nfgui = noiseFloorMax - audioGraphInfo.minDecibels;

    // make sure canvas has already added this client
    canvasManager.centerControl.addClientParm(
        'Spectrum',
        'noiseFloor',
        nfgui ,
        nfRange ,
        changeNoiseFloorValue,
        noiseFloorSelect);


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
        audioGraphInfo.analyser = audioContext.createAnalyser(audioGraphInfo.fftLength);
        audioGraphInfo.analyser.DefaultSmoothingTimeConstant = audioGraphInfo.smoothingTimeConstant;
        audioGraphInfo.analyser.minDecibels = audioGraphInfo.minDecibels; //-110;
        that.realTimeInfo.analyser = audioGraphInfo.analyser;

        // We can see float data of both channels 
        // Looks like this must have an output channel and it must be attached to destination
        // so we use a gain node set to 0
        audioGraphInfo.stereoTimeDomainNode = audioContext.createScriptProcessor(audioGraphInfo.scriptProcessorSize, 2, 2);

        // we have two async loops, animate at frame rate and audio process at sample rate/buffer size rate
        // we can animate at audio rate, but this does not use requestAnimationFrame,
        // which is friendlier say if the canvas is in the background
        // so we do a copy of the realtime data
        audioGraphInfo.stereoTimeDomainNode.onaudioprocess = audioCaptureTimeDomain;

        // script processor node needs to go somewhere to process
        audioGraphInfo.blackHoleGain = audioContext.createGain();
        audioGraphInfo.blackHoleGain.gain.value = 0;

        canvasManager.canvasLog('Visualization nodes created');
    }
    

    // create the audio graph for listening
    function audioGraphCreate() {

        audioGraphInfo.masterGain = audioContext.createGain();
        audioGraphInfo.masterGain.gain.value = audioGraphInfo.masterGainValue;

        canvasManager.canvasLog('Audio nodes created');
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


