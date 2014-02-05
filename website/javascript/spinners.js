
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


var drawSpinner = function(ctx, lines, date, cbFunc) {
    var cW = ctx.canvas.width/4,
        cH = ctx.canvas.height/4;
    var rotation = parseInt(((new Date() - date) / 1000) * lines) / lines;
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (cbFunc != null) {
        cbFunc();
    }
    ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
    ctx.rotate(Math.PI * 2 * rotation);
    ctx.lineCap = 'round';
    for (var i = 0; i < lines; i++) {

        ctx.beginPath();
        ctx.rotate(Math.PI * 2 / lines);
        ctx.moveTo(cW / 10, 0);
        ctx.lineTo(cW / 4.5, 0);
        ctx.lineWidth = cW / 20;
        ctx.strokeStyle = 'rgba(255, 255, 255,' + i / lines + ')';
        ctx.stroke();
    }
    ctx.restore();
};

function StartSpinner(canvasCtx, cbFunc) {
    var date = new Date();
    return window.setInterval(function() { drawSpinner(canvasCtx, 12, date, cbFunc);}, 1000 / 30);
}

function StopSpinner(timerId) {
    window.clearInterval(timerId);
}

