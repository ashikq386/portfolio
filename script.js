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
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
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
