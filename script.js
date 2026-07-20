(function () {
  'use strict';

  /* ---------- typewriter ---------- */
  var roles = ['Designer', 'Frontend Developer', 'UI/UX Designer', 'Problem Solver'];
  var typedEl = document.getElementById('typed');
  var typeIndex = 0, charIndex = 0, deleting = false, typeDelay = 0;

  function typeTick() {
    var full = roles[typeIndex];
    if (!deleting) {
      charIndex++;
      typedEl.textContent = full.slice(0, charIndex);
      if (charIndex === full.length) { deleting = true; typeDelay = 1400; }
    } else {
      charIndex--;
      typedEl.textContent = full.slice(0, charIndex);
      if (charIndex === 0) { deleting = false; typeIndex = (typeIndex + 1) % roles.length; }
    }
    var delay = typeDelay || (deleting ? 40 : 90);
    typeDelay = 0;
    setTimeout(typeTick, delay);
  }
  typeTick();

  /* ---------- mobile menu ---------- */
  var mobileMenu = document.getElementById('mobile-menu');
  document.getElementById('menu-btn').addEventListener('click', function () {
    mobileMenu.hidden = !mobileMenu.hidden;
  });
  document.getElementById('menu-close').addEventListener('click', function () {
    mobileMenu.hidden = true;
  });
  mobileMenu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { mobileMenu.hidden = true; });
  });

  /* ---------- cursor + glow ---------- */
  var glow = document.getElementById('glow');
  var cursorDot = document.getElementById('cursor-dot');
  var cursorRing = document.getElementById('cursor-ring');
  var finePointer = window.matchMedia('(pointer: fine)');
  var mouse = {
    cx: window.innerWidth / 2, cy: window.innerHeight / 2,
    ringX: window.innerWidth / 2, ringY: window.innerHeight / 2
  };
  var cursorHover = false;

  window.addEventListener('mousemove', function (e) {
    mouse.cx = e.clientX;
    mouse.cy = e.clientY;
    glow.style.transform = 'translate(' + (e.clientX - 160) + 'px, ' + (e.clientY - 160) + 'px)';
    cursorDot.style.transform = 'translate(' + (e.clientX - 3.5) + 'px, ' + (e.clientY - 3.5) + 'px)';
  });

  document.addEventListener('mouseover', function (e) {
    if (e.target.closest && e.target.closest('a, button, input, textarea')) {
      cursorHover = true;
      cursorRing.style.backgroundColor = 'rgba(255,255,255,0.12)';
    }
  });
  document.addEventListener('mouseout', function (e) {
    if (e.target.closest && e.target.closest('a, button, input, textarea')) {
      cursorHover = false;
      cursorRing.style.backgroundColor = 'transparent';
    }
  });

  function cursorTick() {
    mouse.ringX += (mouse.cx - mouse.ringX) * 0.18;
    mouse.ringY += (mouse.cy - mouse.ringY) * 0.18;
    if (finePointer.matches) {
      var scale = cursorHover ? 2.2 : 1;
      cursorRing.style.transform = 'translate(' + (mouse.ringX - 18) + 'px, ' + (mouse.ringY - 18) + 'px) scale(' + scale + ')';
    }
    requestAnimationFrame(cursorTick);
  }
  requestAnimationFrame(cursorTick);

  /* ---------- reveal on scroll ---------- */
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0) translateX(0) scale(1)';
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('[data-reveal]').forEach(function (el) { revealObserver.observe(el); });

  /* ---------- achievement counters ---------- */
  var counted = false;
  var countObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !counted) {
        counted = true;
        runCounters();
        countObserver.disconnect();
      }
    });
  }, { threshold: 0.4 });
  var achEl = document.getElementById('achievements');
  if (achEl) countObserver.observe(achEl);

  function runCounters() {
    document.querySelectorAll('[data-counter]').forEach(function (el) {
      var target = parseInt(el.getAttribute('data-counter'), 10);
      var suffix = el.getAttribute('data-suffix') || '';
      var start = performance.now();
      var dur = 1400;
      function tick(now) {
        var p = Math.min(1, (now - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  /* ---------- hero particle portrait ----------
     The photo is rendered as a grid of luminance-sampled dots (halftone).
     Dots assemble from random scatter on load, then repel from the cursor
     and spring back home. */
  (function () {
    var canvas = document.getElementById('portrait-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var particles = [];
    var W = 0, H = 0;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var mouse = { x: -9999, y: -9999 };
    var introStart = null;
    var INTRO_MS = reducedMotion ? 0 : 1400;
    var REPEL_RADIUS = reducedMotion ? 0 : 85;

    var img = new Image();
    img.src = 'assets/portrait.webp';
    img.onload = function () {
      build();
      requestAnimationFrame(tick);
    };

    function build() {
      var rect = canvas.parentElement.getBoundingClientRect();
      W = Math.floor(rect.width);
      H = Math.floor(rect.height);
      if (!W || !H) return;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var off = document.createElement('canvas');
      off.width = W; off.height = H;
      var octx = off.getContext('2d');
      var scale = Math.max(W / img.width, H / img.height);
      var dw = img.width * scale, dh = img.height * scale;
      octx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      var data = octx.getImageData(0, 0, W, H).data;

      particles = [];
      var step = 4;
      for (var y = 0; y < H; y += step) {
        for (var x = 0; x < W; x += step) {
          var i = (y * W + x) * 4;
          var lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          lum = Math.pow(lum / 255, 0.62) * 255;   /* lift shadows */
          lum = (lum - 110) * 1.25 + 128;          /* contrast */
          if (lum < 30) continue;

          var fade = 1, fy = y / H;
          if (fy < 0.10) fade *= fy / 0.10;                    /* fade in at top */
          if (fy > 0.70) fade *= Math.max(0, (1 - fy) / 0.30); /* dissolve at bottom */
          var a = Math.min(1, lum / 255) * fade;
          if (a < 0.05) continue;

          particles.push({
            hx: x, hy: y,
            x: x, y: y, vx: 0, vy: 0,
            sx: Math.random() * W, sy: Math.random() * H, /* intro scatter start */
            delay: Math.random() * 500,
            r: 0.7 + (lum / 255) * 1.7,
            a: a,
            settled: false
          });
        }
      }
    }

    var heroSection = document.getElementById('home');
    heroSection.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    heroSection.addEventListener('mouseleave', function () {
      mouse.x = -9999; mouse.y = -9999;
    });

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (img.complete) {
          build();
          particles.forEach(function (p) { p.settled = true; p.x = p.hx; p.y = p.hy; });
        }
      }, 200);
    });

    function tick(now) {
      if (introStart === null) introStart = now;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#fff';

      for (var k = 0; k < particles.length; k++) {
        var p = particles[k];

        if (!p.settled) {
          var t = (now - introStart - p.delay) / INTRO_MS;
          if (t < 0) continue;
          if (t >= 1) {
            p.settled = true;
            p.x = p.hx; p.y = p.hy;
          } else {
            var e = 1 - Math.pow(1 - t, 3);
            var ix = p.sx + (p.hx - p.sx) * e;
            var iy = p.sy + (p.hy - p.sy) * e;
            ctx.globalAlpha = p.a * e;
            ctx.fillRect(ix, iy, p.r, p.r);
            continue;
          }
        }

        var dx = p.x - mouse.x, dy = p.y - mouse.y;
        var dist2 = dx * dx + dy * dy;
        if (dist2 < REPEL_RADIUS * REPEL_RADIUS) {
          var dist = Math.sqrt(dist2) || 1;
          var f = (REPEL_RADIUS - dist) / REPEL_RADIUS;
          p.vx += (dx / dist) * f * 2.4;
          p.vy += (dy / dist) * f * 2.4;
        }
        p.vx += (p.hx - p.x) * 0.02;
        p.vy += (p.hy - p.y) * 0.02;
        p.vx *= 0.86;
        p.vy *= 0.86;
        p.x += p.vx;
        p.y += p.vy;

        ctx.globalAlpha = p.a;
        ctx.fillRect(p.x, p.y, p.r, p.r);
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(tick);
    }
  })();

  /* ---------- project card tilt + case study toggle ---------- */
  document.querySelectorAll('.project-card').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var rect = card.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform =
        'perspective(900px) rotateX(' + (-y * 8).toFixed(2) + 'deg) rotateY(' + (x * 10).toFixed(2) + 'deg) translateY(-6px)';
    });
    card.addEventListener('mouseleave', function () {
      card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0)';
    });

    var bullets = card.querySelector('.project-bullets');
    var btn = card.querySelector('.btn-case');
    btn.addEventListener('click', function () {
      var expanded = !bullets.hidden;
      bullets.hidden = expanded;
      btn.textContent = expanded ? 'Case Study' : 'Hide Details';
    });
  });

  /* ---------- magnetic buttons ---------- */
  document.querySelectorAll('.magnetic').forEach(function (btn) {
    btn.addEventListener('mousemove', function (e) {
      var rect = btn.getBoundingClientRect();
      var x = (e.clientX - rect.left - rect.width / 2) * 0.3;
      var y = (e.clientY - rect.top - rect.height / 2) * 0.3;
      btn.style.transform = 'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px)';
    });
    btn.addEventListener('mouseleave', function () {
      btn.style.transform = 'translate(0,0)';
    });
  });

  /* ---------- contact form ---------- */
  var form = document.getElementById('contact-form');
  var submitBtn = document.getElementById('cf-submit');
  var fields = {
    name: { input: document.getElementById('cf-name'), error: document.getElementById('err-name') },
    email: { input: document.getElementById('cf-email'), error: document.getElementById('err-email') },
    message: { input: document.getElementById('cf-message'), error: document.getElementById('err-message') }
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var errors = {};
    if (!fields.name.input.value.trim()) errors.name = 'Name is required';
    var email = fields.email.input.value;
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Valid email required';
    if (!fields.message.input.value.trim()) errors.message = 'Message is required';

    Object.keys(fields).forEach(function (key) {
      if (errors[key]) {
        fields[key].error.textContent = errors[key];
        fields[key].error.hidden = false;
      } else {
        fields[key].error.hidden = true;
      }
    });

    if (Object.keys(errors).length !== 0) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    fetch('https://api.web3forms.com/submit', { method: 'POST', body: new FormData(form) })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (!json.success) throw new Error(json.message || 'Submission failed');
        submitBtn.textContent = 'Message Sent ✓';
        Object.keys(fields).forEach(function (key) { fields[key].input.value = ''; });
        setTimeout(function () {
          submitBtn.textContent = 'Send Message';
          submitBtn.disabled = false;
        }, 2600);
      })
      .catch(function () {
        submitBtn.textContent = 'Failed — try again';
        submitBtn.disabled = false;
        setTimeout(function () { submitBtn.textContent = 'Send Message'; }, 3000);
      });
  });
})();
