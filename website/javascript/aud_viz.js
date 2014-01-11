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

var peakMag = 1.0;
var peakVolAnal = 1.0;

function DisplaySpectrum(canvasCtx, analyser, sampleRate) {
    var freqFloatData = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(freqFloatData);

    var barWidth = 1;
    var barAveNum = 1.0;

    var lastBin = analyser.frequencyBinCount;
    var fbin = sampleRate/(2.0 * lastBin);    // frequency range per bin
    // not plotting frequencies over 20 kHz
    var numBars = Math.round(22100/fbin);

    if (numBars > canvasCtx.canvas.width ) {
        // average to fit info in small window
        barAveNum = 2.0;
        numBars /= 2;
    }

    if (numBars <= canvasCtx.canvas.width/2) {
        barWidth = 2;
    }

    if (numBars <= canvasCtx.canvas.width / 4) {
        barWidth = 4;
    }

    if (numBars <= canvasCtx.canvas.width / 8) {
        barWidth = 8;
    }

    canvasCtx.lineCap = 'round';

    // Draw rectangle for each frequency bin.
    var bin = 0;
    var hue = 0.0;
    // http://www.w3.org/TR/css3-color/#hsla-color
    var hinc = 270.0/numBars;

    for (var i = 0; i < numBars; ++i) {
        if (i > canvasCtx.canvas.width) {
            //don't render if outside the canvas
            break;
        }

        var magnitude = 0;
        for (var b = 0; b < barAveNum; b++) {
            magnitude += freqFloatData[bin++];
        }
        magnitude /= barAveNum;

        magnitude = (magnitude - analyser.minDecibels) * (analyser.maxDecibels - analyser.minDecibels);
        if (magnitude > peakMag) {
            peakMag = magnitude;
            //console.log(peakMag);
        }

        hue += hinc;

        canvasCtx.fillStyle = 'hsl(' + Math.round(hue) + ', 100%,50%)';

        var bh = canvasCtx.canvas.height * magnitude/peakMag;

        canvasCtx.fillRect(i * barWidth, canvasCtx.canvas.height, barWidth, -bh);

    }
}

// ave frequency over low mid high, scale 3 LR lissas
function DisplayLissajous(canvasCtx, leftAnal, rightAnal) {
    var datal = new Uint8Array(leftAnal.frequencyBinCount);
    leftAnal.getByteTimeDomainData(datal);
    var datar = new Uint8Array(rightAnal.frequencyBinCount);
    rightAnal.getByteTimeDomainData(datar);

    var xc = canvasCtx.canvas.width/2;
    var yc = canvasCtx.canvas.height/2;

    var scaler = canvasCtx.canvas.height/(peakVol * 2);
   
    // maake the hue follow the beat
    var h = 0.0;
    var hinc = 1.0/canvasCtx.canvas.height;

    for (var i = 0; i < leftAnal.frequencyBinCount; ++i) {

        var ld = datal[i] - 128;
        var rd = datar[i] - 128;
        var fx = (ld * scaler) + xc;
        var fy = (rd * scaler) + yc;

        if (ld > peakVol) {
            peakVol = ld;
            //console.log(peakMag);
        }

        var x = Math.round(fx);
        var y = Math.round(fy);

        h = Math.sqrt(rd * rd + ld * ld) / 64.0;
        var hue = Math.round(h * 360);

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
}

var peakVolScript = .001;
    // pass in object with everything we need
function DisplayLissajousScript(timeDomainConfig) {

    var canvasCtx = timeDomainConfig["canvasCtx"];
    var e = timeDomainConfig["event"];

    // these values are only valid in the scope of the onaudioprocess event
    var datal = e.inputBuffer.getChannelData(0);
    var datar = e.inputBuffer.getChannelData(1);

    var xc = canvasCtx.canvas.width/2;
    var yc = canvasCtx.canvas.height/2;

    var scaler = canvasCtx.canvas.height/(peakVolScript * 2);

    // make the hue follow the beat
    var h = 0.0;
    var hinc = 1.0/canvasCtx.canvas.height;

    for (var i = 0; i < datal.length; i++) {

        var ld = datal[i];
        var rd = datar[i];
        var fx = (ld * scaler) + xc;
        var fy = (rd * scaler) + yc;

        if (ld > peakVolScript) {
            peakVolScript = ld;
            //console.log(peakMag);
        }

        var x = Math.round(fx);
        var y = Math.round(fy);

        h = Math.sqrt(rd * rd + ld * ld);
        var hue = Math.round(h * 360);

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
}
