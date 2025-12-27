const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

let particles = [];
let width, height;
let theme = 'light';
const PARTICLE_COUNT = 150; // Total specific pixels/birds
const CONNECT_DISTANCE = 0; // We might not need connections if it's "flocking pixels"
const MOUSE_REPULSION_RADIUS = 150;
const MOUSE_FORCE = 2;

// Breathing effect
let breathTime = 0;

// Mouse tracking
let mouse = { x: -1000, y: -1000 };

/* Theme colors */
const colors = {
    light: 'rgba(0, 0, 0, 0.8)', // Black particles on white
    dark: 'rgba(255, 255, 255, 0.8)' // White particles on black
};

class Particle {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.size = Math.random() * 2 + 1; // Base size
        this.baseSize = this.size;
        this.phase = Math.random() * Math.PI * 2; // Individual breathing phase
    }

    update() {
        // 1. "Breathing" - Oscillate size slightly
        this.size = this.baseSize + Math.sin(breathTime + this.phase) * 0.5;

        // 2. Flocking / "Like Birds" (Simplified Boids)
        // Cohesion (move towards center of mass - expensive O(N^2), so we skip or aprox)
        // Alignment (match velocity - optional)
        // Separation (avoid others - expensive)
        // Instead, we use a flow field or simple noise + mouse repulsion for performance/visuals
        // User requested: "Group like birds flying"

        // We'll mimic "flocking" with a global flow + local noise
        const time = Date.now() * 0.001;
        this.vx += Math.sin(this.y * 0.01 + time) * 0.02;
        this.vy += Math.cos(this.x * 0.01 + time) * 0.02;

        // Limit speed
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const maxSpeed = 2;
        if (speed > maxSpeed) {
            this.vx = (this.vx / speed) * maxSpeed;
            this.vy = (this.vy / speed) * maxSpeed;
        }

        // 3. Mouse Repulsion
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MOUSE_REPULSION_RADIUS) {
            const force = (MOUSE_REPULSION_RADIUS - dist) / MOUSE_REPULSION_RADIUS;
            const angle = Math.atan2(dy, dx);
            this.vx += Math.cos(angle) * force * MOUSE_FORCE;
            this.vy += Math.sin(angle) * force * MOUSE_FORCE;
        }

        // Move
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around screen
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
    }

    draw() {
        ctx.beginPath();
        // "Water drop pixel" - lets draw a rounded rect or circle with a trail?
        // User asked for "pixel clump", maybe just Rects or Circles.
        // "Water drop shape" -> Circle is fine, maybe slightly elongated in velocity direction?

        // Elongate based on velocity for "drop" effect
        const angle = Math.atan2(this.vy, this.vx);

        ctx.save();
        ctx.translate(this.x, this.y);
        // ctx.rotate(angle); // Rotate to follow path
        // ctx.scale(1 + speed * 0.2, 1 - speed * 0.1); // Stretch

        ctx.fillStyle = theme === 'dark' ? colors.dark : colors.light;
        ctx.globalAlpha = 0.6 + Math.sin(breathTime + this.phase) * 0.2; // Breathing alpha too

        // Draw a "pixel" (square) or circle? User said "pixel clump" (像素团).
        // Let's do small squares for "pixel" look, but rounded for "water drop"? 
        // "Water drop shaped pixel clump" -> Maybe a collection of atoms. 
        // I will stick to Circles for "water drop" feel.
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

function init() {
    resize();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
    }
    animate();
}

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}

function animate() {
    ctx.clearRect(0, 0, width, height);

    // Update Global Breath
    breathTime += 0.03;

    particles.forEach(p => {
        p.update();
        p.draw();
    });

    requestAnimationFrame(animate);
}

// Boids Flocking Logic (More Advanced)
// To really get "flocking", we need neighbor checks. For 150 particles, O(N^2) is fine (22500 checks).
Particle.prototype.update = function () {
    // 1. Separation
    let separationX = 0;
    let separationY = 0;
    let alignX = 0;
    let alignY = 0;
    let cohesionX = 0;
    let cohesionY = 0;
    let neighbors = 0;

    particles.forEach(other => {
        if (other === this) return;
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Separation
        if (dist < 30) {
            separationX += dx / dist; // Push away
            separationY += dy / dist;
        }

        // Alignment & Cohesion
        if (dist < 80) {
            alignX += other.vx;
            alignY += other.vy;
            cohesionX += other.x;
            cohesionY += other.y;
            neighbors++;
        }
    });

    if (neighbors > 0) {
        alignX /= neighbors;
        alignY /= neighbors;
        cohesionX /= neighbors;
        cohesionY /= neighbors;

        // Steer towards cohesion center
        cohesionX = (cohesionX - this.x) * 0.01;
        cohesionY = (cohesionY - this.y) * 0.01;

        // Steer towards alignment
        alignX = (alignX - this.vx) * 0.05;
        alignY = (alignY - this.vy) * 0.05;
    }

    // Apply forces
    this.vx += separationX * 0.05 + alignX + cohesionX;
    this.vy += separationY * 0.05 + alignY + cohesionY;

    // "Breathing" - Global pulse affects velocity slightly? Or just size (done in draw).

    // Mouse Repulsion
    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < MOUSE_REPULSION_RADIUS) {
        const force = (MOUSE_REPULSION_RADIUS - dist) / MOUSE_REPULSION_RADIUS;
        const angle = Math.atan2(dy, dx);
        this.vx += Math.cos(angle) * force * 1.5;
        this.vy += Math.sin(angle) * force * 1.5;
    }

    // Speed Limit
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const maxSpeed = 3;
    if (speed > maxSpeed) {
        this.vx = (this.vx / speed) * maxSpeed;
        this.vy = (this.vy / speed) * maxSpeed;
    }

    // Keep on screen (Bounce or Wrap? "Like birds" usually wrap or turn back)
    // Let's Turn Back from edges
    if (this.x < 50) this.vx += 0.2;
    if (this.x > width - 50) this.vx -= 0.2;
    if (this.y < 50) this.vy += 0.2;
    if (this.y > height - 50) this.vy -= 0.2;

    // Move
    this.x += this.vx;
    this.y += this.vy;
};

// Listeners
window.addEventListener('resize', resize);
window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
window.addEventListener('themeChanged', e => {
    theme = e.detail.isDark ? 'dark' : 'light';
});

// Initial Theme Check
if (document.body.classList.contains('dark-mode')) {
    theme = 'dark';
}

function initBackground() {
    if (document.body.classList.contains('dark-mode')) {
        theme = 'dark';
    } else {
        theme = 'light';
    }
    init();
}
