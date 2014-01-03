


var drawSpinner = function(ctx, lines, date) {
    var cW = ctx.canvas.width/4,
        cH = ctx.canvas.height/4;
    var rotation = parseInt(((new Date() - date) / 1000) * lines) / lines;
    ctx.save();
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
    ctx.rotate(Math.PI * 2 * rotation);
    ctx.lineCap = "round";
    for (var i = 0; i < lines; i++) {

        ctx.beginPath();
        ctx.rotate(Math.PI * 2 / lines);
        ctx.moveTo(cW / 10, 0);
        ctx.lineTo(cW / 4.5, 0);
        ctx.lineWidth = cW / 20;
        ctx.strokeStyle = "rgba(255, 255, 255," + i / lines + ")";
        ctx.stroke();
    }
    ctx.restore();
};

function startSpinner(canvasCtx) {
    var date = new Date();
    return window.setInterval(function() { drawSpinner(canvasCtx, 12, date);}, 1000 / 30);
}

function stopSpinner(timerId) {
    window.clearInterval(timerId);
}