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

/*
 Strict mode makes several changes to normal JavaScript semantics.
 First, strict mode eliminates some JavaScript silent errors by changing them to throw errors.
 Second, strict mode fixes mistakes that make it difficult for JavaScript engines to perform optimizations:
 strict mode code can sometimes be made to run faster than identical code that's not strict mode.
 Third, strict mode prohibits some syntax likely to be defined in future versions of ECMAScript.
 */
 "use strict";


var peakMag = 1.0;

function displaySpectrum(realTimeInfo) {

    var analyser =      realTimeInfo.analyser;
    var canvasCtx =     realTimeInfo.canvasCtx;
    var sampleRate =    realTimeInfo.sampleRate;
    // attach these to gui later
    var freqHi = sampleRate/2; // || realTimeInfo.fftFreqHi;
    var freqLo = 0.0; //|| realTimeInfo.fftFreqLow;
    //freqHi = 2000;

    var freqFloatData = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(freqFloatData);

    // plotting a range of frequencies we just limit the bins to plot
    var freqPerBin = sampleRate/(2.0 * analyser.frequencyBinCount);    // frequency range per bin
    var maxBins = analyser.frequencyBinCount; // limit bins = Math.round(22100/freqPerBin);
    var startBin = 0; //Math.round(freqLo/freqPerBin);
    var endBin = maxBins; //Math.round(freqHi/freqPerBin);
    if (endBin <= startBin || endBin > maxBins) {
        return;
    }

    var numBins = endBin - startBin;

    var xPix = canvasCtx.canvas.width;
    var skip = 0;
    var skipInc = xPix / numBins;

    canvasCtx.save();

    //canvasCtx.lineCap = 'round';

    // Draw rectangle for each frequency bin.
    var cx = 0;
    var hue = 0.0;
    // http://www.w3.org/TR/css3-color/#hsla-color
    // the high frequencies are a pretty UV
    var hinc = 270.0 / numBins;

    for (var i = startBin; i < endBin; ++i) {

        var x = Math.round(skip);
        skip += skipInc;
        var x1 = Math.round(skip);
        var barWidth = 1;
        var barAveNum = 1;

        if (skipInc >= 1.0) {
            // if display is larger than our data we use bigger bars
            barWidth = x1 - x;
            if (barWidth == 0) {
                barWidth = 1;
            }
        } else {
            // if display is smaller than our data we average the data
            while (x == x1) {
                barAveNum++;
                skip += skipInc;
                x1 = Math.round(skip);
            }
        }

        var magnitude = 0;
        for (var b = 0; b < barAveNum; b++) {
            magnitude += freqFloatData[i];
            i += b;
        }
        magnitude /= barAveNum;

        magnitude = (magnitude - analyser.minDecibels) * (analyser.maxDecibels - analyser.minDecibels);

        if (magnitude > peakMag) {
            peakMag = magnitude;
            //console.log(peakMag);
        }

        hue = i * hinc;
        canvasCtx.fillStyle = 'hsl(' + Math.round(hue) + ', 100%,50%)';

        var nm = magnitude / peakMag;
        var em = (Math.exp(nm) - 1) / (Math.E - 1);
        var bh = canvasCtx.canvas.height * em;

        canvasCtx.fillRect(x, canvasCtx.canvas.height, barWidth, -bh);

        cx += barWidth;
        if (cx > xPix) {
            break;  // don't plot outside canvas
        }

    }
    canvasCtx.restore();
}

function getAudioData(realTimeInfo) {
    if (realTimeInfo.audioData == null) {
        return null;
    }

    var iBuf = -1;
    for (var i = 0; i < realTimeInfo.audioData.length; i++) {
        if ( realTimeInfo.audioData[i].consumed == false) {
            iBuf = i;
            break;
        }
    }

    // we expect audio to be faster than display, but maybe not.
    // so what to do if no new buffers to display?
    // display old ones else we get blank graphics.
    if (iBuf == -1) {
        realTimeInfo.audioBuffersUnderRun++;
        iBuf = 0;
    }

    var ldata = realTimeInfo.audioData[iBuf].ldata;
    var rdata = realTimeInfo.audioData[iBuf].rdata;

    return [rdata, ldata, iBuf];
}

var peakVolScript = .001;

function displayLissajousScript(realTimeInfo) {

    var canvasCtx = realTimeInfo.canvasCtx;

    var audioData = getAudioData(realTimeInfo);
    if (audioData == null) {
        return;
    }

    var ldata = audioData[1];
    var rdata = audioData[0];

    var xc = canvasCtx.canvas.width/2;
    var yc = canvasCtx.canvas.height/2;

    var scaler = canvasCtx.canvas.height/(peakVolScript * 2);

    // make the hue follow the beat
    var h = 0.0;
    var hinc = 1.0 / canvasCtx.canvas.height;
    canvasCtx.save();

    for (var i = 0; i < ldata.length; i++) {

        var ld = ldata[i];
        var rd = rdata[i];
        var fx = (ld * scaler) + xc;
        var fy = (rd * scaler) + yc;

        if (ld > peakVolScript) {
            peakVolScript = ld;
            //console.log(peakMag);
        }

        var x = Math.round(fx);
        var y = Math.round(fy);

        h = Math.sqrt(rd * rd + ld * ld);
        // low volume is "less hot" so we start with blue to red spectrum
        var hue = 270 - Math.round(h * 360);

        canvasCtx.fillStyle = 'hsla(' + hue + ', 100%,50%, 1)';
        canvasCtx.fillRect(x , y, 1, 1);
        canvasCtx.fillStyle = 'hsla(' + hue + ', 100%,50%, 0.7)';
        canvasCtx.fillRect(x+1, y, 1, 1);
        canvasCtx.fillRect(x-1, y, 1, 1);
        canvasCtx.fillRect(x,   y+1, 1, 1);
        canvasCtx.fillRect(x,   y-1, 1, 1);
        canvasCtx.fillRect(x+1, y+1, 1, 1);
        canvasCtx.fillRect(x+1, y-1, 1, 1);
        canvasCtx.fillRect(x-1, y+1, 1, 1);
        canvasCtx.fillRect(x-1, y-1, 1, 1);

    }

    canvasCtx.restore();
    realTimeInfo.audioData[audioData[2]].consumed = true;
}

// We AGC the peak display
var peakVolScope = .001;

function drawScope(canvasCtx, dataBuf, hue) {
    var xPix = canvasCtx.canvas.width;
    var yPixh = canvasCtx.canvas.height / 2;
    var scaler = yPixh / peakVolScope;
    var lcolor = 'hsla(' + hue + ', 100%,50%, 0.8)';

    canvasCtx.strokeStyle = lcolor;

    hue += 10;
    canvasCtx.shadowColor = 'hsla(' + hue + ', 100%,50%, 1)';

    canvasCtx.beginPath();

    var skip = 0;
    var skipInc = xPix / dataBuf.length;
    var ldf = yPixh - Math.round(dataBuf[0] * scaler);
    var triggered = false;

    for (var d = 1; d < dataBuf.length; d++) {

        var ldt = yPixh - Math.round(dataBuf[d] * scaler);

        var x = Math.round(skip);
        skip += skipInc;
        var x1 = Math.round(skip);
        if (x == x1) {
            // average the two samples
            var ave = (ldf + ldt)/2;
            ldt = ave;
        }

        canvasCtx.moveTo(x, ldf);
        canvasCtx.lineTo(x1, ldt);

        ldf = ldt;

        if (dataBuf[d] > peakVolScope) {
            peakVolScope = dataBuf[d];
        }
    }

    canvasCtx.stroke();
}


function displayOscilloscope(realTimeInfo) {

    var audioData = getAudioData(realTimeInfo);
    if (audioData == null) {
        return;
    }

    realTimeInfo.canvasCtx.save();
    realTimeInfo.canvasCtx.shadowBlur = 30;
    realTimeInfo.canvasCtx.lineWidth = 3;
    realTimeInfo.canvasCtx.lineJoin = 'round';
    //canvasCtx.strokeStyle = gradient;
    drawScope(realTimeInfo.canvasCtx, audioData[0], 200);
    drawScope(realTimeInfo.canvasCtx, audioData[1], 100);
    realTimeInfo.canvasCtx.restore();
    realTimeInfo.audioData[audioData[2]].consumed = true;
}
