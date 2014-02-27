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
    // power of two in the range 32 to 2048
    var fftLengths = [512, 1024, 2048];
    var defaultFftLength = fftLengths[2];

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
                audioGraphInfo.nodes['Source'].node.start(0, pauseTime);
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


    // database of Web audio nodes and their configuration
    var audioGraphInfo = {};
    audioGraphInfo.nodes = {};
    audioGraphInfo.microphone = false;

    // create the audio graph nodes
    // kindof overkill, but nodes may have more than one output
    // and we can label our graph connections this way
    // nodes are named as you like
    function audioGraphCreate() {

        // the source
        var node = {};
        node.node = null;   // audio source can come from various inputs
        node.outputs = [];
        audioGraphInfo.nodes['Source'] = node;

        node = {};
        node.node = audioContext.createGain();
        node.node.gain.value = defaultGuiMasterGain/guiMasterGainMaxRange;
        node.outputs = [];
        node.inputs = [];
        audioGraphInfo.nodes['Master Gain'] = node;

        // one spectrum display for now
        node = {};
        node.node = audioContext.createAnalyser(defaultFftLength);
        node.outputs = [];
        node.inputs = [];
        node.fftLength = defaultFftLength;
        node.node.DefaultSmoothingTimeConstant = defaultSmoothingTimeConstant;
        node.node.minDecibels = defaultNoiseFloor; //-110;
        that.realTimeInfo.analyser = node.node;
        audioGraphInfo.nodes['Spectrum'] = node;

        // We can see float data of both channels
        // Looks like this must have an output channel and it must be attached to destination
        // so we use a gain node set to 0
        node = {};
        node.node = audioContext.createScriptProcessor(defaultScriptProcessorSize, 2, 2);
        node.outputs = [];
        node.inputs = [];
        // we have two async loops, animate at frame rate and audio process at sample rate/buffer size rate
        // we can animate at audio rate, but this does not use requestAnimationFrame,
        // which is friendlier say if the canvas is in the background
        // so we do a copy of the realtime data in the callback
        node.node.onaudioprocess = audioOnScriptProcess;
        audioGraphInfo.nodes['Audio Data'] = node;

        // script processor node needs to go somewhere to process
        node = {};
        node.node = audioContext.createGain();
        node.node.gain.value = 0;
        node.outputs = [];
        node.inputs = [];
        audioGraphInfo.nodes['Zero Gain'] = node;

        // dynamics node to visualize envelope follower
        // threshold -  default value is -24, with a nominal range of -100 to 0.
        // knee         default value is 30, with a nominal range of 0 to 40.
        // ratio        default value is 12, with a nominal range of 1 to 20.
        // reduction    current amount of gain reduction that the compressor is applying to the signal. 
        //              If fed no signal the value will be 0 (no gain reduction). The nominal range is -20 to 0.
        // attack       default value is 0.003, with a nominal range of 0 to 1.
        // release      default value is 0.250, with a nominal range of 0 to 1.
        node = {};
        node.node = audioContext.createDynamicsCompressor();
        node.node.threshold.value = -50;
        node.node.attack.value = .001;
        node.node.release.value = .001;
        node.outputs = [];
        node.inputs = [];
        audioGraphInfo.nodes['Dynamics'] = node;
        

        // disconnect disconnects all output connections
        // So to switch between audio data and spectrum (to save real time)
        // we attach Source to a gain node at max gain and that gain node to the viz
        // nodes as needed
        node = {};
        node.node = audioContext.createGain();
        node.node.gain.value = 1.0;
        node.outputs = [];
        node.inputs = [];
        audioGraphInfo.nodes['Viz Gain'] = node;

        // speakers
        node = {};
        node.node = audioContext.destination;
        node.inputs = [];
        audioGraphInfo.nodes['Speakers'] = node;

        canvasManager.canvasLog('Audio nodes created');
    }



    function audioNodeConnect(from, to) {
        var f = audioGraphInfo.nodes[from];
        var t = audioGraphInfo.nodes[to];

        if (!f || !t) {
            console.log('Unknown node name: ' + from + ' or ' + to);
            return;
        }

        if (!f.outputs) {
            console.log('Node ' + from + ' has no output capability');
            return;
        }

        if (!t.inputs) {
            console.log('Node ' + to + ' has no input capability');
            return;
        }

        if (f.outputs.indexOf(to) >= 0) {
            //console.log('Node ' + from + ' is already connected to ' + to);
            return;
        }

        f.node.connect(t.node);
        f.outputs.push(to);
        t.inputs.push(from);
    }


    function audioNodeDisconnect(from, to) {
        var f = audioGraphInfo.nodes[from];
        var t = audioGraphInfo.nodes[to];

        if (!f || !t) {
            console.log('Unknown node name: ' + from + ' or ' + to);
            return;
        }

        if (!f.outputs) {
            console.log('Node ' + from + ' has no outputs');
            return;
        }

        var outputIndex = f.outputs.indexOf(to);

        if ( outputIndex < 0) {
            //console.log('Node ' + from + ' is not connected to ' + to);
            return;
        }

        // disconnects all
        f.node.disconnect();
        f.outputs.splice(to, 1);
        t.inputs.splice(from, 1);
        // simply reconnect
        for (var i = 0; i < f.outputs.length; i++) {
            audioNodeConnect(from, f.outputs[i])
        }
    }

    // connects audio for your listening pleasure
    function audioGraphConnect() {
        if (audioGraphInfo.nodes['Source'].node == null) {
            canvasManager.fatalError('Cannot connect - audio source unavailable');
            return;
        }

        audioNodeConnect('Source',      'Master Gain');
        audioNodeConnect('Source',      'Viz Gain');
        audioNodeConnect('Master Gain', 'Speakers');

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

    function createRealtimeAudioBuffers() {
        // buffers from script thread are copied to here to be sampled by animation thread
        // create four buffers (ping pong stereo)
        var bufs = [];
        for (var i = 0; i < 4; i++) {
            bufs.push(new Float32Array(audioGraphInfo.nodes['Audio Data'].node.bufferSize));
        }

        that.realTimeInfo.audioData = [
            {realTime: 0.0, consumed: true, ldata: bufs[0], rdata: bufs[1]},
            {realTime: 0.0, consumed: true, ldata: bufs[2], rdata: bufs[3]}
            ];

        that.realTimeInfo.captureMethod = audioCaptureTimeDomain;
    }

    function createRealtimeEnvelopeBuffers() {
        // collect 10s worth of data, so the script processor size
        // and sample rate dictate how often we sample the envelope
        var bufSize =  (20 * that.realTimeInfo.sampleRate) / audioGraphInfo.nodes['Audio Data'].node.bufferSize;
        var env = {};
        env.buffer = new Float32Array(bufSize);
        env.index = 0;
        env.min = -1000;
        that.realTimeInfo.audioData = env;
        that.realTimeInfo.captureMethod = audioCaptureEnvelope;
    }

    // connects audio for your viewing pleasure
    function audioVizGraph(action, graph) {

        if (action === 'connect') {
            if (graph === 'Audio Data') {
                audioNodeConnect('Viz Gain',    'Audio Data');
                audioNodeConnect('Audio Data',  'Zero Gain');
                audioNodeConnect('Zero Gain',   'Speakers');
                createRealtimeAudioBuffers();
            }

            if (graph === 'Spectrum') {
                audioNodeConnect('Viz Gain',      'Spectrum');
            }

            if (graph === 'Envelope') {
                // the only way to get audio time based events for sampling dynamics data
                // we don't use the data, just the callback
                audioNodeConnect('Viz Gain', 'Audio Data');
                audioNodeConnect('Audio Data', 'Zero Gain');
                
                audioNodeConnect('Viz Gain',  'Dynamics');
                audioNodeConnect('Dynamics',  'Zero Gain');
                audioNodeConnect('Zero Gain', 'Speakers');
                createRealtimeEnvelopeBuffers();
            }
        }

        if (action === 'disconnect') {
            if (graph === 'Audio Data') {
                // always disconnect speakers first so to not glitch (We are LIVE!)
                audioNodeDisconnect('Zero Gain',    'Speakers');
                audioNodeDisconnect('Audio Data',   'Zero Gain');
                audioNodeDisconnect('Viz Gain',     'Audio Data');

                that.realTimeInfo.audioData = null;
            }

            if (graph === 'Spectrum') {
                audioNodeDisconnect('Viz Gain', 'Spectrum');
            }

            if (graph === 'Envelope') {
                audioNodeDisconnect('Zero Gain', 'Speakers');
                audioNodeDisconnect('Dynamics',  'Zero Gain');
                audioNodeDisconnect('Viz Gain',  'Dynamics');

                audioNodeDisconnect('Audio Data', 'Zero Gain');
                audioNodeDisconnect('Viz Gain',   'Audio Data');

                that.realTimeInfo.audioData = null;
            }
        }
    }


    function audioBuffer(buffer) {
        if (buffer == null) {
            canvasManager.fatalError('Decoded buffer is null');
            return;
        }

        canvasManager.canvasLog('Audio decoded');
        that.audioState = 'decoded';

        audioGraphInfo.nodes['Source'].node = audioContext.createBufferSource();
        audioGraphInfo.nodes['Source'].node.buffer = buffer;

        audioVizGraph('connect', 'Spectrum');
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

    function audioStartMicrophone(stream) {
        audioGraphInfo.nodes['Source'].node = audioContext.createMediaStreamSource(stream);
        audioGraphInfo.microphone = true;
        canvasManager.canvasLog('Audio microphone ready');
        that.audioState = 'loaded';
        audioVizGraph('connect', 'Spectrum');
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
                audioGraphInfo.nodes['Source'].node = audioContext.createMediaElementSource(audioStream);
                canvasManager.canvasLog('Audio stream ready');
                that.audioState = 'loaded';
                audioGraphConnect();
                audioVizGraph('connect', 'Spectrum');

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
    //

    // sets up graph for visualization
    this.audioConnect = function (connection) {
        audioVizGraph('disconnect', 'Spectrum');
        audioVizGraph('disconnect', 'Audio Data');
        audioVizGraph('disconnect', 'Envelope');

        audioVizGraph('connect', connection);
    }

    function changeMasterGainValue(parm) {
        if (audioGraphInfo.nodes['Master Gain']) {
            var linearGain = parm.value/parm.maxRange;
            // human perception in general is logarithmic
            var expGain = (Math.exp(linearGain)-1)/(Math.E-1);
            audioGraphInfo.nodes['Master Gain'].node.gain.value = expGain;
            parm.cbTitle('Gain: ' + Math.round(expGain * 100) + ' %');
        }
    }

    function masterGainSelect(parm) {
        parm.cbTitle('Gain: ' + Math.round( audioGraphInfo.nodes['Master Gain'].node.gain.value * 100) + ' %');
    }

    function audioSelect(client) {
       // nothing to do yet
    }

    function changeNoiseFloorValue(parm) {
        if (audioGraphInfo.nodes['Spectrum']) {
            var noiseFloor = noiseFloorMin + parm.value;
            audioGraphInfo.nodes['Spectrum'].node.minDecibels = noiseFloor;
            parm.cbTitle('Noise floor: ' + noiseFloor + ' dB');
        }
    }

    function noiseFloorSelect(parm) {
        if (audioGraphInfo.nodes['Spectrum']) {
            parm.cbTitle('Noise floor: ' + audioGraphInfo.nodes['Spectrum'].node.minDecibels + ' dB');
        }
    }

    function smoothingSelect(parm) {
        if (audioGraphInfo.nodes['Spectrum']) {
            parm.cbTitle('Smoothing: ' + audioGraphInfo.nodes['Spectrum'].node.smoothingTimeConstant.toFixed(2));
        }
    }

    function changeSmoothingValue(parm) {
        if (audioGraphInfo.nodes['Spectrum']) {
            audioGraphInfo.nodes['Spectrum'].node.smoothingTimeConstant = parm.value/100;
            parm.cbTitle('Smoothing: ' + audioGraphInfo.nodes['Spectrum'].node.smoothingTimeConstant.toFixed(2));
        }
    }

    function envelopeThresholdSelect(parm) {
        if (audioGraphInfo.nodes['Dynamics']) {
            parm.cbTitle('Threshold: ' + audioGraphInfo.nodes['Dynamics'].node.threshold.value.toFixed(2));
        }
    }

    function changeEnvelopeThresholdValue(parm) {
        if (audioGraphInfo.nodes['Dynamics']) {
            audioGraphInfo.nodes['Dynamics'].node.threshold.value = -parm.value;
            parm.cbTitle('Threshold: ' + audioGraphInfo.nodes['Dynamics'].node.threshold.value.toFixed(2));
        }
    }

    // canvas manager creates GUI clients then calls this to attach audio parms to the clients
    this.addControls = function() {

        // canvas owns controls for now
        canvasManager.centerControl.addClient('Audio', audioSelect);

        canvasManager.centerControl.addClientParm(
            'Audio',
            'Gain',
            defaultGuiMasterGain ,
            guiMasterGainMaxRange ,
            changeMasterGainValue,
            masterGainSelect);

        // -140 to -90, range
        //              -90             -140
        var nfRange = noiseFloorMax - noiseFloorMin;
        var nfgui = noiseFloorMax - audioGraphInfo.nodes['Spectrum'].node.minDecibels;

        // make sure canvas has already added this client
        canvasManager.centerControl.addClientParm(
            'Spectrum',
            'noiseFloor',
            nfgui ,
            nfRange ,
            changeNoiseFloorValue,
            noiseFloorSelect);

        // make sure canvas has already added this client
        canvasManager.centerControl.addClientParm(
            'Spectrum',
            'Smoothing',
            100 * defaultSmoothingTimeConstant ,
            100 * 0.8 ,
            changeSmoothingValue,
            smoothingSelect);

        // make sure canvas has already added this client
        canvasManager.centerControl.addClientParm(
            'Envelope',
            'Threshold',
            Math.round(audioGraphInfo.nodes['Dynamics'].node.threshold.value * -1.0),
            100,
            changeEnvelopeThresholdValue,
            envelopeThresholdSelect);
    }

    // a database of all info needed by visualization
    this.realTimeInfo = {};
    // can't change this yet
    this.realTimeInfo.sampleRate = audioContext.sampleRate;
    this.realTimeInfo.captureMethod = null;
    this.realTimeInfo.audioBuffersOverRun = 0;
    this.realTimeInfo.audioBuffersUnderRun = 0;

    function audioCaptureEnvelope(event) {
        var env = that.realTimeInfo.audioData;
        var d = audioGraphInfo.nodes['Dynamics'].node.reduction.value;
        if (d < env.min) {
            env.min = d;
        }
        // translate the data to positive
        env.buffer[env.index] = -d;
        // envelope buffer is a circular buffer of N seconds
        env.index++;
        if (env.index == env.buffer.length) {
            env.index = 0;
        }
    }

    function audioCaptureTimeDomain(event) {
        // ping pong buffers
        // these values are only valid in the scope of the onaudioprocess (this) event
        var fldata = event.inputBuffer.getChannelData(0);
        var frdata = event.inputBuffer.getChannelData(1);

        // if first buffers are consumed copy into those
        // else if second is consumed copy into those
        // if both buffers are not consumed drop the data on the floor
        // as we want the display to sync with what is playing
        var iBuf = -1;

        for (var i = 0; i < that.realTimeInfo.audioData.length; i++) {
            if ( that.realTimeInfo.audioData[i].consumed == true) {
                iBuf = i;
                break;
            }
        }

        if (iBuf == -1) {
            that.realTimeInfo.audioBuffersOverRun++;
            return;
        }

        that.realTimeInfo.audioData[iBuf].realTime = audioContext.currentTime;
        var tldata = that.realTimeInfo.audioData[iBuf].ldata;
        var trdata = that.realTimeInfo.audioData[iBuf].rdata;

        // have to copy here as the buffers are potentially undefined outside this event
        // be nice to use splice...
        for (i = 0; i < audioGraphInfo.nodes['Audio Data'].node.bufferSize; i++) {
            tldata[i] = fldata[i];
            trdata[i] = frdata[i];
        }

        that.realTimeInfo.audioData[iBuf].consumed = false;
    }

    // realtime callback from script node.
    function audioOnScriptProcess(event) {

        if (that.realTimeInfo.captureMethod == null) {
            return;
        }

        that.realTimeInfo.captureMethod(event);
    }

    // start ball rolling
    audioGraphCreate();
    audioLoad();
}


