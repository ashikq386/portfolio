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

  /* ---------- soft glow that follows the mouse ---------- */
  var glow = document.getElementById('glow');
  window.addEventListener('mousemove', function (e) {
    glow.style.transform = 'translate(' + (e.clientX - 160) + 'px, ' + (e.clientY - 160) + 'px)';
  });

  /* ---------- nav: transparent over the hero, glass once scrolled ---------- */
  var nav = document.querySelector('.nav');
  function updateNav() { nav.classList.toggle('scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

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

  /* ---------- hero parallax + floating card tilt ----------
     Layers tagged [data-depth] drift with the cursor at different speeds,
     and the glass card tilts toward the pointer with a moving glare. */
  (function () {
    var hero = document.getElementById('home');
    var card = document.getElementById('hero-card');
    if (!hero || !card) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var layers = hero.querySelectorAll('[data-depth]');
    var target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    var photo = createDepthPhoto(hero.querySelector('.hero-portrait > img'), 'assets/portrait-depth.webp');

    hero.addEventListener('mousemove', function (e) {
      var rect = hero.getBoundingClientRect();
      target.x = (e.clientX - rect.left) / rect.width - 0.5;
      target.y = (e.clientY - rect.top) / rect.height - 0.5;
    });
    hero.addEventListener('mouseleave', function () { target.x = 0; target.y = 0; });

    function tick() {
      cur.x += (target.x - cur.x) * 0.08;
      cur.y += (target.y - cur.y) * 0.08;
      for (var i = 0; i < layers.length; i++) {
        var d = parseFloat(layers[i].getAttribute('data-depth'));
        layers[i].style.transform =
          'translate3d(' + (cur.x * d * 40).toFixed(2) + 'px, ' + (cur.y * d * 24).toFixed(2) + 'px, 0)';
      }
      card.style.transform =
        'perspective(900px) rotateX(' + (-cur.y * 22).toFixed(2) + 'deg) rotateY(' + (cur.x * 28).toFixed(2) + 'deg)';
      card.style.setProperty('--gx', (50 + cur.x * 120).toFixed(1) + '%');
      card.style.setProperty('--gy', (40 + cur.y * 120).toFixed(1) + '%');
      if (photo) photo.render(cur.x, cur.y);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();

  /* ---------- 2.5D depth photo ----------
     Draws the portrait on a WebGL canvas and offsets each pixel by a depth map
     (head and hand near, background far), so the photo turns slightly toward
     the cursor. Falls back to the plain <img> if WebGL or the images fail. */
  function createDepthPhoto(img, depthSrc) {
    if (!img) return null;
    var canvas = document.createElement('canvas');
    var gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false });
    if (!gl) return null;

    var vs = 'attribute vec2 p; varying vec2 uv;' +
      'void main(){ uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }';
    var fs = 'precision mediump float; varying vec2 uv;' +
      'uniform sampler2D photo, depth; uniform vec2 offset;' +
      'void main(){' +
      '  vec2 st = uv; float d = texture2D(depth, st).r;' +
      /* a few refinement steps keep edges from smearing */
      '  for (int i = 0; i < 4; i++) { st = uv - offset * (d - 0.6); d = texture2D(depth, st).r; }' +
      '  gl_FragColor = texture2D(photo, clamp(st, 0.001, 0.999));' +
      '}';
    function shader(type, src) {
      var sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh);
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    }
    var v = shader(gl.VERTEX_SHADER, vs), f = shader(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uOffset = gl.getUniformLocation(prog, 'offset');
    gl.uniform1i(gl.getUniformLocation(prog, 'photo'), 0);
    gl.uniform1i(gl.getUniformLocation(prog, 'depth'), 1);

    function texture(unit, image) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    }

    var ready = false, last = null;
    var depthImg = new Image();
    function load(image) {
      return new Promise(function (res, rej) {
        if (image.complete && image.naturalWidth) return res();
        image.addEventListener('load', res); image.addEventListener('error', rej);
      });
    }
    depthImg.src = depthSrc;
    Promise.all([load(img), load(depthImg)]).then(function () {
      texture(0, img); texture(1, depthImg);
      canvas.className = 'hero-photo-canvas';
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', img.alt);
      img.after(canvas);
      img.hidden = true;
      resize(); ready = true; last = null;
    }).catch(function () { /* keep the plain photo */ });

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(img.naturalWidth && canvas.clientWidth ? canvas.clientWidth * dpr : img.naturalWidth);
      canvas.height = Math.round(canvas.width * img.naturalHeight / img.naturalWidth);
      gl.viewport(0, 0, canvas.width, canvas.height);
      last = null;
    }
    window.addEventListener('resize', function () { if (ready) resize(); });

    return {
      render: function (mx, my) {
        if (!ready) return;
        var ox = mx * 0.055, oy = my * 0.03;
        if (last && Math.abs(last[0] - ox) < 1e-5 && Math.abs(last[1] - oy) < 1e-5) return;
        last = [ox, oy];
        gl.uniform2f(uOffset, ox, oy);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    };
  }

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
