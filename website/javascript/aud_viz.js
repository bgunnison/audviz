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

/*
 Strict mode makes several changes to normal JavaScript semantics.
 First, strict mode eliminates some JavaScript silent errors by changing them to throw errors.
 Second, strict mode fixes mistakes that make it difficult for JavaScript engines to perform optimizations:
 strict mode code can sometimes be made to run faster than identical code that's not strict mode.
 Third, strict mode prohibits some syntax likely to be defined in future versions of ECMAScript.
 */
 "use strict";


var peakMag = 1.0;


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

var peakVolAnal = 1.0;

function DisplayLissajous(canvasCtx, leftAnal, rightAnal) {
    var datal = new Uint8Array(leftAnal.frequencyBinCount);
    leftAnal.getByteTimeDomainData(datal);
    var datar = new Uint8Array(rightAnal.frequencyBinCount);
    rightAnal.getByteTimeDomainData(datar);

    var xc = canvasCtx.canvas.width/2;
    var yc = canvasCtx.canvas.height/2;

    var scaler = canvasCtx.canvas.height/(peakVolAnal * 2);

    // maake the hue follow the beat
    var h = 0.0;
    var hinc = 1.0/canvasCtx.canvas.height;

    for (var i = 0; i < leftAnal.frequencyBinCount; ++i) {

        var ld = datal[i] - 128;
        var rd = datar[i] - 128;
        var fx = (ld * scaler) + xc;
        var fy = (rd * scaler) + yc;

        if (ld > peakVolAnal) {
            peakVolAnal = ld;
            //console.log(peakMag);
        }

        var x = Math.round(fx);
        var y = Math.round(fy);

        h = Math.sqrt(rd * rd + ld * ld) / 64.0;
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
}

var peakVolScript = .001;
    // pass in object with everything we need
function DisplayLissajousScript(timeDomainConfig) {

    var canvasCtx = timeDomainConfig["canvasCtx"];
    var ldata = timeDomainConfig["ldata"];
    var rdata = timeDomainConfig["rdata"];

    var xc = canvasCtx.canvas.width/2;
    var yc = canvasCtx.canvas.height/2;

    var scaler = canvasCtx.canvas.height/(peakVolScript * 2);

    // make the hue follow the beat
    var h = 0.0;
    var hinc = 1.0/canvasCtx.canvas.height;

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
}

function DrawScope(canvasCtx, dataBuf, hue) {
    var xPix = canvasCtx.canvas.width;
    var yPixh = canvasCtx.canvas.height / 2;
    var scaler = yPixh / peakVolScope;
    var lcolor = 'hsla(' + hue + ', 100%,50%, 0.8)';

    canvasCtx.strokeStyle = lcolor;

    hue += 10;
    canvasCtx.shadowColor = 'hsla(' + hue + ', 100%,50%, 1)';

    canvasCtx.beginPath();

    if (xPix < dataBuf.Length) {
        var skip = Math.ceil(xPix / (dataBuf.Length - xPix));
    }

    var d = 0;

    for (var i = 0; i < xPix - 1; i++) {

        var ldf = yPixh - Math.round(dataBuf[d] * scaler);
        var ldt = yPixh - Math.round(dataBuf[d + 1] * scaler);

        canvasCtx.moveTo(i, ldf);
        canvasCtx.lineTo(i + 1, ldt);

        d += 1;
        if (d >= dataBuf.Length - 1) {
            break;
        }

        if (dataBuf[d] > peakVolScope) {
            peakVolScope = dataBuf[d];
        }
    }

    canvasCtx.stroke();
}

var peakVolScope = .001;
// pass in object with everything we need
function DisplayOscilloscope(timeDomainConfig) {

    var canvasCtx = timeDomainConfig["canvasCtx"];
    var ldata = timeDomainConfig["ldata"];
    var rdata = timeDomainConfig["rdata"];

    var dataLength = ldata.length;
    if(dataLength < 32) {
        return;
    }

    canvasCtx.save();

    canvasCtx.shadowBlur = 30;
    canvasCtx.lineWidth = 3;
   
    
    canvasCtx.lineJoin = "round";
    //canvasCtx.strokeStyle = gradient;
    DrawScope(canvasCtx, ldata, 200);
    DrawScope(canvasCtx, rdata, 100);

    canvasCtx.restore();
}
