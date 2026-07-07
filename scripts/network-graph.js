/**
 * Network Graph Animation — Interactive cursor-reactive particle network
 * Used in hero sections across the site.
 *
 * Usage:
 *   initNetworkGraph(canvasId, wrapperId)
 *
 * The canvas must already exist in the DOM. The wrapper is used for
 * mouse-event boundaries and sizing.
 */
function initNetworkGraph(canvasId, wrapperId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper) return;

  // ── Config ──
  const CFG = {
    particleCount : 90,
    baseSpeed     : 0.25,
    maxLinkDist   : 160,
    mouseRadius   : 200,
    mouseRepel    : 0.045,
    dotMinR       : 1.2,
    dotMaxR       : 2.8,
    lineAlpha     : 0.22,
    dotAlpha      : 0.65,
    palette       : [
      [192, 132, 252],   // lavender
      [139,  34, 226],   // violet
      [217,  38, 181],   // magenta
      [ 99, 102, 241],   // indigo
      [168,  85, 247],   // purple
      [ 30,  18, 184],   // deep blue
    ],
    pulseSpeed    : 0.002,
  };

  let W, H;
  const particles = [];
  const mouse = { x: -9999, y: -9999, active: false };

  // ── Resize ──
  function resize() {
    W = canvas.width  = wrapper.offsetWidth;
    H = canvas.height = wrapper.offsetHeight;
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(wrapper);

  // ── Particle factory ──
  function makeParticle() {
    const color = CFG.palette[Math.floor(Math.random() * CFG.palette.length)];
    const angle = Math.random() * Math.PI * 2;
    const speed = CFG.baseSpeed * (0.4 + Math.random() * 0.6);
    return {
      x : Math.random() * W,
      y : Math.random() * H,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r : CFG.dotMinR + Math.random() * (CFG.dotMaxR - CFG.dotMinR),
      color,
      phase: Math.random() * Math.PI * 2,
    };
  }

  for (let i = 0; i < CFG.particleCount; i++) particles.push(makeParticle());

  // ── Mouse tracking ──
  wrapper.addEventListener('mousemove', function (e) {
    const rect = wrapper.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  });
  wrapper.addEventListener('mouseleave', function () {
    mouse.active = false;
  });

  // ── Draw loop ──
  let animId;
  function frame(ts) {
    ctx.clearRect(0, 0, W, H);

    // Dark base fill
    ctx.fillStyle = 'rgba(7, 5, 16, 1)';
    ctx.fillRect(0, 0, W, H);

    // Update positions
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Mouse repulsion
      if (mouse.active) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CFG.mouseRadius && dist > 0) {
          const force = (1 - dist / CFG.mouseRadius) * CFG.mouseRepel;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      }

      // Dampen speed back to base
      const currentSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (currentSpeed > CFG.baseSpeed * 2) {
        p.vx *= 0.97;
        p.vy *= 0.97;
      }

      p.x += p.vx;
      p.y += p.vy;

      // Wrap edges (soft wrap with a margin)
      if (p.x < -20) p.x = W + 20;
      if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20;
      if (p.y > H + 20) p.y = -20;
    }

    // ── Draw connections ──
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CFG.maxLinkDist) {
          const t = 1 - dist / CFG.maxLinkDist;
          // Blend the two endpoint colours
          const cr = Math.round((a.color[0] + b.color[0]) / 2);
          const cg = Math.round((a.color[1] + b.color[1]) / 2);
          const cb = Math.round((a.color[2] + b.color[2]) / 2);

          // Brighter near cursor
          let boost = 0;
          if (mouse.active) {
            const mx = (a.x + b.x) / 2 - mouse.x;
            const my = (a.y + b.y) / 2 - mouse.y;
            const md = Math.sqrt(mx * mx + my * my);
            if (md < CFG.mouseRadius) {
              boost = (1 - md / CFG.mouseRadius) * 0.35;
            }
          }

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (t * CFG.lineAlpha + boost) + ')';
          ctx.lineWidth = t * 1.2;
          ctx.stroke();
        }
      }
    }

    // ── Draw particles ──
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const pulse = 0.7 + 0.3 * Math.sin(ts * CFG.pulseSpeed + p.phase);
      const [r, g, b] = p.color;

      // Glow aura
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
      grd.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + (0.15 * pulse) + ')');
      grd.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ', 0)');
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Core dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + CFG.dotAlpha + ')';
      ctx.fill();
    }

    // ── Cursor highlight glow (additive) ──
    if (mouse.active) {
      const grd = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, CFG.mouseRadius);
      grd.addColorStop(0, 'rgba(192, 132, 252, 0.10)');
      grd.addColorStop(0.5, 'rgba(139, 34, 226, 0.04)');
      grd.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, CFG.mouseRadius, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    }

    // Subtle edge vignette
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, Math.max(W, H) * 0.8);
    vig.addColorStop(0, 'rgba(7, 5, 16, 0)');
    vig.addColorStop(1, 'rgba(7, 5, 16, 0.5)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    animId = requestAnimationFrame(frame);
  }

  animId = requestAnimationFrame(frame);
}
