/**
 * Created by bgunnison on 1/1/14.
 */



var peakMag = 1.0;
var peakVol = 1.0;

function DisplaySpectrum(canvasCtx, analyser) {
    var freqFloatData = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(freqFloatData);

    var bar_width = 1;
    var barAveNum = 1.0;

    // map to 22 kHz
    var lastBin = analyser.frequencyBinCount;
    var numBars = lastBin;

    if (canvasCtx.canvas.width < lastBin/2) {
        // average to fit info in small window
        barAveNum = 2.0;
        numBars /= 2;
    }

    // Draw rectangle for each frequency bin.
    var bin = 0;
    var h = 0.0;
    var hinc = 1.0/numBars;

    for (var i = 0; i < numBars; ++i) {
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

        var rgb = HSVtoRGB(h,1,1);
        h += hinc;

        canvasCtx.fillStyle = rgbToHex(rgb.r,rgb.g,rgb.b);
        //console.log(bin, ctx.fillStyle);

        var bh = canvasCtx.canvas.height * magnitude/peakMag;

        canvasCtx.fillRect(i , canvasCtx.canvas.height, bar_width, -bh);

    }
}

// ave frequency over low mid high, scale 3 LR lissas
function DisplayLissajous(canvasCtx, leftAnal, rightAnal) {
    var datal = new Uint8Array(leftAnal.frequencyBinCount);
    leftAnal.getByteTimeDomainData(datal);
    var datar = new Uint8Array(rightAnal.frequencyBinCount);
    rightAnal.getByteTimeDomainData(datar);

    canvasCtx.lineCap = 'round';
    var xc = canvasCtx.canvas.width/2;
    var yc = canvasCtx.canvas.height/2;

    var scaler = canvasCtx.canvas.height/(peakVol * 2);
    //console.log(scaler);
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
        h = Math.sqrt(rd*rd + ld*ld)/64.0;
        var rgb = HSVtoRGB(h,1,1);

        var x = Math.round(fx);
        var y = Math.round(fy);
        //var grd = canvasCtx.createRadialGradient(0, 0,1,x+2, y+2,4);
        //grd.addColorStop(0,rgbToHex(rgb.r,rgb.g,rgb.b));
        //grd.addColorStop(1,"#A0A0A0");

        canvasCtx.fillStyle = rgbToHex(rgb.r,rgb.g,rgb.b);

        canvasCtx.fillRect(x , y, 3, 3);
    }

}
