/* qb-sea-lite.js — fondo del template (version ligera para paginas internas).
   Ondas teal suaves + polvo, SIN websocket (intensidad fija baja).
   Pausa con document.hidden, respeta prefers-reduced-motion. */
(function () {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  function start() {
    if (document.getElementById("qb-sea-lite")) return;
    var c = document.createElement("canvas");
    c.id = "qb-sea-lite";
    document.body.prepend(c);
    var ctx = c.getContext("2d");
    var W, H, DPR = devicePixelRatio || 1;
    function fit() { W = c.width = innerWidth * DPR; H = c.height = innerHeight * DPR; }
    addEventListener("resize", fit); fit();

    var dust = [];
    for (var i = 0; i < 30; i++) dust.push({ x: Math.random(), y: Math.random(), s: .2 + Math.random() * .7 });
    var t0 = Date.now();

    (function step() {
      if (document.hidden) { setTimeout(function () { requestAnimationFrame(step); }, 800); return; }
      ctx.clearRect(0, 0, W, H);
      var t = (Date.now() - t0) / 1000;
      for (var L = 0; L < 3; L++) {
        var yB = H * (0.35 + L * 0.2), amp = 9 * DPR * (1 - L * 0.2);
        ctx.beginPath();
        for (var x = 0; x <= W; x += 6 * DPR) {
          var ph = t * (0.35 + L * 0.14) + x / (190 * DPR) + L * 2;
          var y = yB + Math.sin(ph) * amp * 0.6 + Math.sin(ph * 2.6) * amp * 0.3;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "rgba(60,230,172," + (0.035 + L * 0.015) + ")";
        ctx.lineWidth = 1 * DPR; ctx.stroke();
      }
      for (var d of dust) {
        d.y -= 0.00012 * d.s; if (d.y < 0) { d.y = 1; d.x = Math.random(); }
        ctx.beginPath(); ctx.arc(d.x * W, d.y * H, d.s * DPR, 0, 7);
        ctx.fillStyle = "rgba(60,230,172,0.08)"; ctx.fill();
      }
      requestAnimationFrame(step);
    })();
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", start) : start();
})();
