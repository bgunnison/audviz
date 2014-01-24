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

 Author: Tibor Katelbach https://github.com/oceatoon
 
 */

"use strict";

var bkgnd_effect = function() {
    var canvas = document.getElementById('bkgnd_canvas1');
    var ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var particles = [];
    var patriclesNum = 100;
    var w = canvas.width;
    var h = canvas.height;
    var colors = ['#4b3b52','#25242d','#695b53','#686564','#574d5a'];

    window.onresize = function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        particles = [];
        w = canvas.width;
        h = canvas.height;
        init();
    };

    function findDistance(p1, p2){
        return Math.sqrt( Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2) );
    }

    function particleFactory(){
        this.x =  Math.round( Math.random() * w);
        this.y =  Math.round( Math.random() * h);
        this.rad = Math.round( Math.random() * 1) + 1;
        this.rgba = colors[ Math.round( Math.random() * 3) ];
        this.vx = Math.round( Math.random() * 3) - 1.5;
        this.vy = Math.round( Math.random() * 3) - 1.5;
    }
   
    this.draw = function (){

        ctx.clearRect(0, 0, w, h);
        ctx.save();

        ctx.globalCompositeOperation = 'lighter';
        for(var i = 0; i < patriclesNum; i++){
            var temp = particles[i];
            var factor = 1;
     
            for(var j = 0; j<patriclesNum; j++){
      
                var temp2 = particles[j];
                ctx.linewidth = 0.5;
      
                if(temp.rgba == temp2.rgba && findDistance(temp, temp2)<50){
                    ctx.strokeStyle = temp.rgba;
                    ctx.beginPath();
                    ctx.moveTo(temp.x, temp.y);
                    ctx.lineTo(temp2.x, temp2.y);
                    ctx.stroke();
                    factor++;
                }
            }

            ctx.fillStyle = temp.rgba;
            ctx.strokeStyle = temp.rgba;
    
            ctx.beginPath();
            ctx.arc(temp.x, temp.y, temp.rad*factor, 0, Math.PI*2, true);
            ctx.fill();
            ctx.closePath();
    
            ctx.beginPath();
            ctx.arc(temp.x, temp.y, (temp.rad+5)*factor, 0, Math.PI*2, true);
            ctx.stroke();
            ctx.closePath();

            temp.x += temp.vx;
            temp.y += temp.vy;

            if(temp.x > w)temp.x = 0;
            if(temp.x < 0)temp.x = w;
            if(temp.y > h)temp.y = 0;
            if(temp.y < 0)temp.y = h;
        }
    }

    function init() {
        for(var i = 0; i < patriclesNum; i++) {
            particles.push(new particleFactory);
        }
    }

    init();
}

window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
})();

function run_bkgnd() {
    var bkgnd_fx = new bkgnd_effect;

    (function loop(){
        bkgnd_fx.draw();
    requestAnimFrame(loop);
    })();
}

function onLoad(e) {
    run_bkgnd();
}

window.addEventListener('load', onLoad, false);

  
