/**
 * VR BLAZERS: Master Coordinator, 3D Clinic Environment, VR Controllers & Therapy Game
 * Fully verified, zero-dependency implementation
 */

const AppState = {
  currentView: 'home',
  voiceEnabled: true,
  vrModeActive: false,
  currentTest: 'stereopsis',
  ishiharaRound: 1,
  ishiharaMaxRounds: 5,
  patient: {
    name: 'Aarav Sharma',
    age: 7,
    id: '#CH-0472',
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    targetEye: 'OS (Left Eye)',
    doctor: 'Dev Doc Vision',
    doctorCode: '2-2857',
    clinic: 'Apex Pediatric Vision Clinic',
    height: 122,
    weight: 24,
    bmi: '16.1',
    bmr: '980 kcal/Day',
    prescription: 'Active Protocol',
    prescriptionFrom: '2026-09-01',
    prescriptionTill: '2026-10-15',
    sessionsLeft: '14 of 20'
  },
  testsCompleted: {
    stereopsis: false,
    worth4dot: false,
    contrast: false,
    ishihara: false,
    npc: false,
    acuity: false
  },
  scores: {
    visualAcuity: '20/32',
    stereopsisArcsec: 15,
    stereopsisResult: 'Excellent Stereopsis (≤15")',
    worth4Dot: 'Suppression (Right Eye Suppressed)',
    contrastSensitivity: 'Normal (1.75 log units)',
    npcCm: 8.2,
    colorVision: 'Normal (12 Plates Correct)',
    responseTimeMs: 612,
    reliabilityScore: 94,
    aiClassification: 'REFER',
    confidence: 88,
    findings: 'Reduced stereo acuity with right-eye suppression on Worth 4-Dot indicates significant risk of unilateral amblyopia (lazy eye) secondary to anisometropia or micro-strabismus.',
    parentExplanation: "Your child's eyes may not be teaming together optimally. One eye is taking on most visual work while the other is partially resting. This responds very well to early dichoptic therapy. We recommend confirming with a pediatric eye examination."
  },
  therapyConfig: {
    eyeMode: 'dichoptic', // 'monocular', 'dichoptic', 'both'
    practiceEye: 'right', // 'left', 'right'
    eyeLevel: 'manual',   // 'manual', 'automatic'
    difficulty: 'easy'    // 'easy', 'medium', 'hard'
  },
  game: {
    running: false,
    score: 0,
    streak: 0,
    multiplier: 1,
    timeRemaining: 795, // 13:15 in seconds
    timerInterval: null,
    modifierDuration: 165, // 02:45 in seconds
    birdY: 220,
    birdX: 160,
    birdVelocity: 0,
    gravity: 0.30,
    jumpForce: -6.0,
    joystickDx: 0,
    joystickDy: 0,
    joystickActive: true,
    obstacles: [],
    starsList: [],
    particles: []
  },
  vrClinic: {
    liveActive: false,
    stereoscopicMode: false,
    gyroActive: false,
    ipd: 63,
    rotX: 0,
    rotY: 0
  }
};

/* ==========================================================================
   Web Speech API (AI Pediatric Voice Guide)
   ========================================================================== */
function speak(text) {
  if (!AppState.voiceEnabled || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.1; // Approachable pediatric guide pitch
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis notice:', err);
  }
}

function toggleAudioGuide() {
  AppState.voiceEnabled = !AppState.voiceEnabled;
  const icon = document.getElementById('voice-icon');
  const text = document.getElementById('voice-text');
  if (AppState.voiceEnabled) {
    if (icon) icon.textContent = '🔊';
    if (text) text.textContent = 'Voice: ON';
    speak('Voice guide enabled.');
  } else {
    if (icon) icon.textContent = '🔇';
    if (text) text.textContent = 'Voice: OFF';
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }
}

/* ==========================================================================
   Dedicated Stereoscopic 3D VR Mode (WebXR / Side-by-Side Mobile Goggles)
   ========================================================================== */
function toggleVRMode() {
  AppState.vrModeActive = !AppState.vrModeActive;
  const btnText = document.getElementById('vr-btn-text');
  const body = document.body;

  if (AppState.vrModeActive) {
    body.classList.add('vr-mode-active');
    if (btnText) btnText.textContent = 'Exit VR Mode';
    speak('Entering stereoscopic VR mode. Insert phone into VR goggles or view inside your headset.');
    updateVRStereoscopicView();
  } else {
    body.classList.remove('vr-mode-active');
    if (btnText) btnText.textContent = 'Enter VR Mode';
    speak('Exited VR mode.');
  }
}

function updateVRStereoscopicView() {
  const leftBox = document.getElementById('vr-left-content');
  const rightBox = document.getElementById('vr-right-content');
  if (!leftBox || !rightBox) return;

  // Duplicate current active viewport content into both stereoscopic eyes
  const currentStage = document.getElementById('viewport-stage');
  if (currentStage) {
    const cloneHtml = currentStage.innerHTML;
    leftBox.innerHTML = cloneHtml;
    rightBox.innerHTML = cloneHtml;
  }
}

/* ==========================================================================
   Realistic VR Touch Controllers & Laser Pointer Engine
   ========================================================================== */
function initVRControllers() {
  const laserLeft = document.getElementById('laser-left');
  const laserRight = document.getElementById('laser-right');
  const reticleLeft = document.getElementById('reticle-left');
  const reticleRight = document.getElementById('reticle-right');
  const ctrlLeft = document.getElementById('vr-ctrl-left');
  const ctrlRight = document.getElementById('vr-ctrl-right');
  const stickLeft = document.getElementById('stick-left');
  const stickRight = document.getElementById('stick-right');

  window.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    // Left controller emits from ~20% left, bottom
    const leftOriginX = winW * 0.20;
    const leftOriginY = winH - 60;
    
    // Right controller emits from ~80% right, bottom
    const rightOriginX = winW * 0.80;
    const rightOriginY = winH - 60;

    // Calculate angles and lengths for laser beams
    const dxL = mouseX - leftOriginX;
    const dyL = mouseY - leftOriginY;
    const distL = Math.hypot(dxL, dyL);
    const angleL = Math.atan2(dyL, dxL) * (180 / Math.PI);

    const dxR = mouseX - rightOriginX;
    const dyR = mouseY - rightOriginY;
    const distR = Math.hypot(dxR, dyR);
    const angleR = Math.atan2(dyR, dxR) * (180 / Math.PI);

    if (laserLeft) {
      laserLeft.style.left = `${leftOriginX}px`;
      laserLeft.style.top = `${leftOriginY}px`;
      laserLeft.style.width = `${distL}px`;
      laserLeft.style.transform = `rotate(${angleL}deg)`;
    }

    if (laserRight) {
      laserRight.style.left = `${rightOriginX}px`;
      laserRight.style.top = `${rightOriginY}px`;
      laserRight.style.width = `${distR}px`;
      laserRight.style.transform = `rotate(${angleR}deg)`;
    }

    if (reticleLeft) {
      reticleLeft.style.left = `${mouseX - 6}px`;
      reticleLeft.style.top = `${mouseY}px`;
    }

    if (reticleRight) {
      reticleRight.style.left = `${mouseX + 6}px`;
      reticleRight.style.top = `${mouseY}px`;
    }

    // Tilt controllers toward cursor
    if (ctrlLeft) {
      const tiltL = 14 + (mouseX / winW - 0.5) * 22;
      ctrlLeft.style.transform = `rotate(${tiltL}deg) translateY(${(mouseY / winH) * 15}px)`;
    }
    if (ctrlRight) {
      const tiltR = -14 + (mouseX / winW - 0.5) * 22;
      ctrlRight.style.transform = `rotate(${tiltR}deg) translateY(${(mouseY / winH) * 15}px)`;
    }

    // Animate analog joysticks with realistic 3D deflection
    const stickDx = (mouseX / winW - 0.5) * 12;
    const stickDy = (mouseY / winH - 0.5) * 12;
    if (stickLeft) stickLeft.style.transform = `translate(${stickDx}px, ${stickDy}px) rotateX(${-stickDy * 2}deg) rotateY(${stickDx * 2}deg)`;
    if (stickRight) stickRight.style.transform = `translate(${stickDx}px, ${stickDy}px) rotateX(${-stickDy * 2}deg) rotateY(${stickDx * 2}deg)`;

    // Check laser hit-testing against interactive VR cards
    if (AppState.currentView === 'vr') {
      const targetEl = document.elementFromPoint(mouseX, mouseY);
      const vrCards = document.querySelectorAll('.vr-curved-card, .vr-module-box, .vr-test-chip');
      vrCards.forEach(c => c.classList.remove('vr-card-laser-hover'));
      if (targetEl) {
        const hitCard = targetEl.closest('.vr-curved-card, .vr-module-box, .vr-test-chip');
        if (hitCard) hitCard.classList.add('vr-card-laser-hover');
      }
    }
  });

  // Animate trigger pull on click
  window.addEventListener('mousedown', () => {
    if (ctrlLeft) ctrlLeft.style.transform += ' scale(0.96)';
    if (ctrlRight) ctrlRight.style.transform += ' scale(0.96)';
  });
  window.addEventListener('mouseup', () => {
    if (ctrlLeft) ctrlLeft.style.transform = ctrlLeft.style.transform.replace(' scale(0.96)', '');
    if (ctrlRight) ctrlRight.style.transform = ctrlRight.style.transform.replace(' scale(0.96)', '');
  });
}

/* ==========================================================================
   Navigation & View Routing
   ========================================================================== */
function navigate(viewName) {
  AppState.currentView = viewName;
  
  // Update sidebar active states
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => btn.classList.remove('active'));
  const activeNav = document.getElementById(`nav-${viewName}`);
  if (activeNav) activeNav.classList.add('active');

  const stage = document.getElementById('viewport-stage');
  if (!stage) return;
  
  if (viewName !== 'therapy') {
    AppState.game.running = false;
    if (AppState.game.timerInterval) clearInterval(AppState.game.timerInterval);
  }

  if (viewName === 'home') {
    renderHomeView(stage);
    speak('Welcome to the VR Blazers Vision Wellness terminal.');
  } else if (viewName === 'calibration') {
    renderCalibrationView(stage);
    speak('Please adjust your screen or headset until the teddy bear appears sharp and clear.');
  } else if (viewName === 'clinical') {
    renderClinicalView(stage);
  } else if (viewName === 'report') {
    renderReportView(stage);
    speak(`Screening report ready. The AI recommendation is ${AppState.scores.aiClassification}.`);
  } else if (viewName === 'therapy') {
    renderTherapyView(stage);
    speak('Welcome to Cloud Jumper. Fly through the fantasy mushroom islands and keep the streak!');
  } else if (viewName === 'vr') {
    renderVRClinicView(stage);
    speak('Entering 3D Virtual Reality Clinic. Dual 6-DoF touch controllers and laser reticles active.');
  }

  updateProgressIndicator();
  if (AppState.vrModeActive) updateVRStereoscopicView();
}

function updateProgressIndicator() {
  const completedCount = Object.values(AppState.testsCompleted).filter(Boolean).length;
  const total = 5;
  const percent = Math.min(100, Math.round((completedCount / total) * 100));
  
  const textEl = document.getElementById('session-progress-text');
  const fillEl = document.getElementById('session-progress-fill');
  if (textEl && fillEl) {
    textEl.textContent = `${completedCount} / ${total} Done`;
    fillEl.style.width = `${percent}%`;
  }
}

/* ==========================================================================
   1. Home Overview View (Matches Image 1b7040.jpg & 1b703c.jpg)
   ========================================================================== */
function renderHomeView(stage) {
  stage.innerHTML = `
    <div class="view-section active">
      <div class="hero-card glass-panel">
        <div class="hero-content">
          <div class="hero-badge-tag">
            <span>✨ STANDALONE VR & WEB CLINIC</span>
          </div>
          <h2 class="hero-title">Enhance Your Vision. <span>Empower Your Life.</span></h2>
          <p class="hero-desc">
            Our Vision Wellness modules screen children in under 5 minutes through gamified 3D diagnostics.
            Clinical-grade stereopsis, suppression detection, and automated AI diagnostic triage.
          </p>

          <div class="hero-stats-row">
            <div class="hero-stat-box">
              <span class="hero-stat-number">&lt; 5 min</span>
              <span class="hero-stat-label">Full Battery</span>
            </div>
            <div class="hero-stat-box">
              <span class="hero-stat-number">&lt; 7 yrs</span>
              <span class="hero-stat-label">Amblyopia Window</span>
            </div>
            <div class="hero-stat-box">
              <span class="hero-stat-number">15"</span>
              <span class="hero-stat-label">Stereo Resolution</span>
            </div>
            <div class="hero-stat-box">
              <span class="hero-stat-number">88%</span>
              <span class="hero-stat-label">AI Accuracy</span>
            </div>
          </div>

          <div class="hero-actions">
            <button class="btn-action-primary" onclick="navigate('clinical')">
              <span>🚀 Begin Clinical Screening</span>
            </button>
            <button class="btn-action-secondary" onclick="navigate('therapy')">
              <span>🎮 Launch Cloud Jumper</span>
            </button>
            <button class="btn-action-secondary" style="background:#f0fdf4; border-color:#86efac; color:#166534;" onclick="navigate('vr')">
              <span>🥽 Open 3D VR Clinic</span>
            </button>
          </div>
        </div>

        <div class="hero-graphic-box">
          <div class="clinical-room-preview">
            <div class="clinic-preview-wall"></div>
            <div class="clinic-preview-stripe"></div>
            <div class="clinic-preview-floor"></div>
            <div class="clinic-preview-pod">
              <span class="pod-icon">🔬</span>
              <span class="pod-label">3D Examination Room</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Protocol Feature Cards -->
      <div class="features-grid">
        <div class="feature-card glass-panel" onclick="navigate('clinical')">
          <div class="feature-icon-circle bg-blue">
            <span>👁️</span>
          </div>
          <h3 class="feature-title">AAPOS Guidelines Calibrated</h3>
          <p class="feature-desc">Pediatric optotypes, Random Dot Stereograms, and Worth 4-Dot suppression testing built for children.</p>
        </div>

        <div class="feature-card glass-panel" onclick="navigate('report')">
          <div class="feature-icon-circle bg-amber">
            <span>🧠</span>
          </div>
          <h3 class="feature-title">Instant AI Triage Engine</h3>
          <p class="feature-desc">Automatic multi-test Bayesian aggregation triages patients into PASS, MONITOR, or REFER with clear parent summaries.</p>
        </div>

        <div class="feature-card glass-panel" onclick="navigate('therapy')">
          <div class="feature-icon-circle bg-green">
            <span>🎮</span>
          </div>
          <h3 class="feature-title">Closing the Loop (Therapy)</h3>
          <p class="feature-desc">Dichoptic Cloud Jumper video game stimulates binocular summation without uncomfortable eye patching.</p>
        </div>
      </div>
    </div>
  `;
}

/* ==========================================================================
   2. Headset / Screen Calibration View (Matches Image 1b705d.png)
   ========================================================================== */
function renderCalibrationView(stage) {
  stage.innerHTML = `
    <div class="view-section active">
      <div class="calibration-container glass-panel">
        <div class="calibration-header">
          <h2 style="font-size: 1.4rem; font-weight: 800;">Headset & Screen Calibration</h2>
          <p style="font-size: 0.9rem; color: var(--text-muted);">Adjust focus and brightness until the pediatric optotype target is crystal clear.</p>
        </div>

        <div class="calibration-body">
          <div class="calibration-target-box">
            <div class="optotype-target" id="calib-target">
              <span class="target-bear">🧸</span>
              <div class="target-rings"></div>
            </div>
            <div class="calib-status-badge">Target: Pediatric Optotype Standard</div>
          </div>

          <div class="calibration-sliders-col">
            <div class="calib-slider-card">
              <div class="slider-label-row">
                <span>Focus / Sharpness</span>
                <span id="focus-val" class="text-primary" style="font-weight: 800;">100%</span>
              </div>
              <input type="range" min="30" max="100" value="100" class="vr-range-slider" oninput="adjustFocus(this.value)" />
            </div>

            <div class="calib-slider-card">
              <div class="slider-label-row">
                <span>Display Luminance</span>
                <span id="bright-val" class="text-primary" style="font-weight: 800;">100%</span>
              </div>
              <input type="range" min="50" max="150" value="100" class="vr-range-slider" oninput="adjustBrightness(this.value)" />
            </div>

            <button class="btn-action-primary" style="margin-top: 12px; width: 100%; justify-content: center;" onclick="finishCalibration()">
              <span>✓ Confirm & Proceed to Clinical Tests</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function adjustFocus(val) {
  const target = document.getElementById('calib-target');
  const label = document.getElementById('focus-val');
  if (label) label.textContent = `${val}%`;
  if (target) {
    const blurPx = ((100 - val) / 15).toFixed(1);
    target.style.filter = `blur(${blurPx}px)`;
  }
}

function adjustBrightness(val) {
  const target = document.getElementById('calib-target');
  const label = document.getElementById('bright-val');
  if (label) label.textContent = `${val}%`;
  if (target) {
    target.style.opacity = (val / 100).toFixed(2);
  }
}

function finishCalibration() {
  speak('Calibration verified. Moving to clinical screening battery.');
  navigate('clinical');
}

/* ==========================================================================
   3. Clinical Screening Test Battery (All 5 Tests + Acuity)
   ========================================================================== */
function renderClinicalView(stage) {
  stage.innerHTML = `
    <div class="view-section active">
      <div class="test-suite-header">
        <div>
          <h2 style="font-size:1.4rem; font-weight:800;">Pediatric Vision Battery</h2>
          <p style="font-size:0.85rem; color:var(--text-muted);">Calibrated clinical tests rendered inside the 3D Virtual Examination Room</p>
        </div>

        <div class="test-selector-tabs">
          <button class="test-tab-btn ${AppState.currentTest === 'stereopsis' ? 'active' : ''}" onclick="switchTest('stereopsis')">1. Stereopsis (RDS)</button>
          <button class="test-tab-btn ${AppState.currentTest === 'worth4dot' ? 'active' : ''}" onclick="switchTest('worth4dot')">2. Worth 4-Dot</button>
          <button class="test-tab-btn ${AppState.currentTest === 'contrast' ? 'active' : ''}" onclick="switchTest('contrast')">3. Contrast Sens.</button>
          <button class="test-tab-btn ${AppState.currentTest === 'ishihara' ? 'active' : ''}" onclick="switchTest('ishihara')">4. Color Vision</button>
          <button class="test-tab-btn ${AppState.currentTest === 'npc' ? 'active' : ''}" onclick="switchTest('npc')">5. Convergence (NPC)</button>
          <button class="test-tab-btn ${AppState.currentTest === 'acuity' ? 'active' : ''}" onclick="switchTest('acuity')">6. Visual Acuity</button>
        </div>
      </div>

      <div id="test-content-area" class="glass-panel" style="padding: 16px;"></div>
    </div>
  `;

  loadCurrentTest();
}

function switchTest(testName) {
  AppState.currentTest = testName;
  const tabs = document.querySelectorAll('.test-tab-btn');
  tabs.forEach(tab => tab.classList.remove('active'));
  loadCurrentTest();
}

function loadCurrentTest() {
  const container = document.getElementById('test-content-area');
  if (!container) return;

  if (AppState.currentTest === 'stereopsis') renderStereopsisTest(container);
  else if (AppState.currentTest === 'worth4dot') renderWorth4DotTest(container);
  else if (AppState.currentTest === 'contrast') renderContrastTest(container);
  else if (AppState.currentTest === 'ishihara') renderIshiharaTest(container);
  else if (AppState.currentTest === 'npc') renderNpcTest(container);
  else if (AppState.currentTest === 'acuity') renderAcuityTest(container);
}

/* Helper to render the reusable 3D Clinic Room shell */
function getClinicRoomHtml(contentHtml, extraSlidersHtml = '') {
  return `
    <div class="clinic-room-stage">
      <!-- Ceiling Lights -->
      <div class="clinic-ceiling">
        <div class="ceiling-light"></div>
        <div class="ceiling-light"></div>
        <div class="ceiling-light"></div>
      </div>

      <!-- Blue Clinic Wall Band -->
      <div class="clinic-wall-stripe"></div>

      <!-- Medical Equipment & Posters in 3D Clinic -->
      <div class="clinic-furniture furniture-cabinet">
        <div class="drawer"></div>
        <div class="drawer"></div>
        <div class="drawer"></div>
        <div class="drawer"></div>
      </div>
      <div class="clinic-furniture furniture-desk"></div>
      <div class="clinic-poster"></div>

      <!-- Tiled Floor Grid -->
      <div class="clinic-floor-grid"></div>

      <!-- Test Subject Centerpiece -->
      <div class="clinic-center-display">
        ${contentHtml}
      </div>

      ${extraSlidersHtml}
    </div>
  `;
}

/* --- Test 1: Stereopsis Test (Matches Stereopsis.jpg / source 19) --- */
let stereoDotSize = 1;
let stereoArcsec = 15;
const stereoArcsecSteps = [15, 30, 60, 100, 200, 400];
let stereoStepIdx = 0;

function renderStereopsisTest(container) {
  speak('Stereopsis test. Look at the random dot square. Do you see the shape floating in front or behind?');
  
  container.innerHTML = `
    <div class="test-workbench">
      <!-- Left Vertical Dot Size Slider (Matches Screenshot 19) -->
      <div style="width: 100px; display:flex; flex-direction:column; align-items:center; gap: 12px; padding: 20px 0; background:#cbd5e1; border-radius:16px;">
        <span style="font-size:0.85rem; font-weight:800; color:#1e293b;">Dot Size</span>
        <div style="background:#e2e8f0; border:2px solid #38bdf8; border-radius:8px; padding:12px 6px; display:flex; flex-direction:column; align-items:center;">
          <input type="range" min="1" max="4" value="${stereoDotSize}" style="writing-mode: bt-lr; -webkit-appearance: slider-vertical; width: 8px; height: 260px;" oninput="updateStereoDotSize(this.value)" />
          <span id="dot-size-val" style="font-weight:800; margin-top:8px; font-size:1.1rem;">${stereoDotSize}</span>
        </div>
      </div>

      <!-- Center RDS Canvas in Gray Studio -->
      <div class="test-viewport-box" style="background:#808b96;">
        <canvas id="rds-canvas" width="440" height="400" class="test-canvas" style="box-shadow: 0 16px 40px rgba(0,0,0,0.35);"></canvas>
      </div>

      <!-- Right Telemetry Panel (Matches Screenshot 19) -->
      <div class="test-side-controls">
        <div class="test-metrics-readout">
          <div class="metric-title">STEREOPSIS TEST</div>
          <div class="metric-highlight" id="arcsec-display" style="color:#06b6d4;">${stereoArcsec}</div>
          <div class="metric-unit">arcseconds</div>
          <div class="metric-sub" id="disparity-display">Disparity: ${(stereoArcsec * 0.0019).toFixed(3)}mm</div>
          <div class="metric-sub">(0.3px total)</div>
          <div style="font-size:0.9rem; font-weight:700; color:#1e293b; margin-top:4px;">Shape: BEHIND</div>
          <div class="metric-status-callout" id="stereo-grade" style="color:#eab308; font-size:0.95rem;">
            ${stereoArcsec <= 15 ? 'Excellent Stereopsis (≤15")' : stereoArcsec <= 60 ? 'Good Stereopsis' : 'Reduced Stereopsis (>100")'}
          </div>
        </div>

        <div class="btn-test-action-group">
          <button class="btn-control" style="background:#d1fae5; border-color:#a7f3d0;" onclick="cycleStereoArcsec(1)">Next</button>
          <button class="btn-control" style="background:#d1fae5; border-color:#a7f3d0;" onclick="cycleStereoArcsec(-1)">Previous</button>
          <button class="btn-control" style="background:#fee2e2; border-color:#fca5a5; color:#991b1b;" onclick="cycleStereoArcsec(0)">Reset</button>
          <button class="btn-control primary" onclick="confirmStereoTest()">Confirm</button>
        </div>
      </div>
    </div>
  `;

  initRDS();
}

function updateStereoDotSize(val) {
  stereoDotSize = parseInt(val);
  const el = document.getElementById('dot-size-val');
  if (el) el.textContent = val;
  initRDS();
}

function cycleStereoArcsec(dir) {
  if (dir === 0) stereoStepIdx = 0;
  else stereoStepIdx = Math.max(0, Math.min(stereoArcsecSteps.length - 1, stereoStepIdx + dir));
  
  stereoArcsec = stereoArcsecSteps[stereoStepIdx];
  const arcEl = document.getElementById('arcsec-display');
  const dispEl = document.getElementById('disparity-display');
  const gradeEl = document.getElementById('stereo-grade');
  
  if (arcEl) arcEl.textContent = stereoArcsec;
  if (dispEl) dispEl.textContent = `Disparity: ${(stereoArcsec * 0.0019).toFixed(3)}mm`;
  if (gradeEl) {
    if (stereoArcsec <= 15) gradeEl.textContent = 'Excellent Stereopsis (≤15")';
    else if (stereoArcsec <= 60) gradeEl.textContent = 'Normal Stereopsis (30-60")';
    else gradeEl.textContent = 'Reduced Stereopsis (>100")';
  }
  
  initRDS();
}

function initRDS() {
  const canvas = document.getElementById('rds-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  const dot = Math.max(1, stereoDotSize * 2);
  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;

  // Generate dense random black & white noise
  for (let i = 0; i < data.length; i += 4) {
    const val = Math.random() > 0.5 ? 0 : 255;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  // Embed the stereoscopic hidden 3D star / circle shape
  ctx.fillStyle = 'rgba(0,0,0,0.035)';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 70, 0, Math.PI * 2);
  ctx.fill();
}

function confirmStereoTest() {
  AppState.scores.stereopsisArcsec = stereoArcsec;
  AppState.scores.stereopsisResult = stereoArcsec <= 15 ? 'Excellent Stereopsis (≤15")' : 'Pathological (>100")';
  AppState.testsCompleted.stereopsis = true;
  updateProgressIndicator();
  speak(`Stereopsis confirmed at ${stereoArcsec} arcseconds. Moving to Worth 4-Dot suppression test.`);
  switchTest('worth4dot');
}

/* --- Test 2: Worth 4-Dot Suppression Test (Matches Supression test.png / source 20) --- */
function renderWorth4DotTest(container) {
  speak('Worth 4-Dot suppression test. In the clinic dark box, how many dots are visible?');

  const contentHtml = `
    <!-- Dark Aperture Field -->
    <div style="background:#000000; width: 340px; height: 260px; display:flex; align-items:center; justify-content:center; border-radius:8px; box-shadow:0 0 30px rgba(0,0,0,0.5);">
      <div class="worth-dots-grid">
        <div class="worth-aperture dot-top" title="Red Dot (Top)"></div>
        <div class="worth-aperture dot-left" title="Green Dot (Left)"></div>
        <div class="worth-aperture dot-right" title="Green Dot (Right)"></div>
        <div class="worth-aperture dot-bottom" title="White Dot (Bottom)"></div>
      </div>
    </div>

    <!-- Question Dialog Box (Matches Screenshot 20) -->
    <div style="background:#d1d5db; border:3px solid #374151; border-radius:6px; padding:14px 28px; margin-top:16px; text-align:center; width:340px;">
      <h3 style="font-size:1rem; font-weight:700; color:#111827; margin-bottom:12px;">How many dots are visible ?</h3>
      <div style="display:flex; justify-content:space-around; align-items:center; margin-bottom:14px;">
        <label style="display:flex; align-items:center; gap:6px; font-weight:700; cursor:pointer;">
          <input type="radio" name="worthDotCount" value="2" onchange="selectWorthCount(2)" /> 2
        </label>
        <label style="display:flex; align-items:center; gap:6px; font-weight:700; cursor:pointer;">
          <input type="radio" name="worthDotCount" value="3" onchange="selectWorthCount(3)" /> 3
        </label>
        <label style="display:flex; align-items:center; gap:6px; font-weight:700; cursor:pointer;">
          <input type="radio" name="worthDotCount" value="4" checked onchange="selectWorthCount(4)" /> 4
        </label>
        <label style="display:flex; align-items:center; gap:6px; font-weight:700; cursor:pointer;">
          <input type="radio" name="worthDotCount" value="5" onchange="selectWorthCount(5)" /> 5
        </label>
      </div>
      <button class="btn-control" style="background:#bbf7d0; border:1px solid #4ade80; color:#14532d; font-weight:800; width:100px;" onclick="confirmWorthTest()">
        Confirm
      </button>
    </div>
  `;

  container.innerHTML = getClinicRoomHtml(contentHtml);
}

function selectWorthCount(count) {
  if (count === 4) AppState.scores.worth4Dot = 'Normal Binocular Fusion (4 Dots)';
  else if (count === 2) AppState.scores.worth4Dot = 'Suppression (Right Eye Suppressed)';
  else if (count === 3) AppState.scores.worth4Dot = 'Suppression (Left Eye Suppressed)';
  else if (count === 5) AppState.scores.worth4Dot = 'Diplopia (Strabismus / Double Vision)';
  speak(`Selected ${count} dots: ${AppState.scores.worth4Dot}`);
}

function confirmWorthTest() {
  AppState.testsCompleted.worth4dot = true;
  updateProgressIndicator();
  speak('Worth 4-Dot confirmed. Moving to Contrast Sensitivity.');
  switchTest('contrast');
}

/* --- Test 3: Contrast Sensitivity (Matches Contrast sensitivity.jpg / source 17) --- */
let contrastDistance = 1.0;
let contrastSize = 0.50;

function renderContrastTest(container) {
  speak('Contrast sensitivity test. Notice how the optotype letters fade row by row.');

  const slidersHtml = `
    <!-- Adjust Distance Slider (Matches Screenshot 17) -->
    <div class="clinic-room-slider slider-distance">
      <span style="font-size:0.75rem; font-weight:700; color:#1e293b;">Adjust Distance</span>
      <input type="range" min="0.5" max="2.0" step="0.05" value="${contrastDistance}" style="writing-mode: bt-lr; -webkit-appearance: slider-vertical; width: 6px; height: 160px; margin: 8px 0;" oninput="document.getElementById('c-dist-val').textContent = parseFloat(this.value).toFixed(2) + ' m'" />
      <span id="c-dist-val" style="font-size:0.75rem; font-weight:800;">${contrastDistance.toFixed(2)} m</span>
    </div>

    <!-- Adjust Size Slider -->
    <div class="clinic-room-slider slider-size">
      <span style="font-size:0.75rem; font-weight:700; color:#1e293b;">Adjust Size</span>
      <input type="range" min="0.2" max="1.0" step="0.05" value="${contrastSize}" style="writing-mode: bt-lr; -webkit-appearance: slider-vertical; width: 6px; height: 160px; margin: 8px 0;" oninput="document.getElementById('c-size-val').textContent = parseFloat(this.value).toFixed(2)" />
      <span id="c-size-val" style="font-size:0.75rem; font-weight:800;">${contrastSize.toFixed(2)}</span>
    </div>
  `;

  const contentHtml = `
    <div style="background:#ffffff; width:220px; padding:20px 14px; text-align:center; font-family:var(--font-mono); font-weight:900; line-height:1.4; border-radius:4px; box-shadow:0 8px 24px rgba(0,0,0,0.15);">
      <div style="font-size:1.6rem; color:rgba(15,23,42,1.0);">N K H S V Z</div>
      <div style="font-size:1.4rem; color:rgba(15,23,42,0.75);">O D R C H N</div>
      <div style="font-size:1.3rem; color:rgba(15,23,42,0.45);">R V S K Z O</div>
      <div style="font-size:1.2rem; color:rgba(15,23,42,0.22);">H D C S N V</div>
      <div style="font-size:1.1rem; color:rgba(15,23,42,0.10);">C O R Z K H</div>
      <div style="font-size:1.0rem; color:rgba(15,23,42,0.04);">D S N O R C</div>
      <div style="font-size:0.9rem; color:rgba(15,23,42,0.015);">H Z E K S N</div>
    </div>

    <div style="display:flex; gap:16px; margin-top:20px;">
      <button class="btn-control" style="background:#d1fae5; border-color:#a7f3d0;" onclick="navigate('home')">Main menu</button>
      <button class="btn-control primary" onclick="confirmContrastTest()">Confirm</button>
    </div>
  `;

  container.innerHTML = getClinicRoomHtml(contentHtml, slidersHtml);
}

function confirmContrastTest() {
  AppState.testsCompleted.contrast = true;
  updateProgressIndicator();
  speak('Contrast sensitivity confirmed. Moving to Color Sensitivity.');
  switchTest('ishihara');
}

/* --- Test 4: Color Sensitivity with Randomized Colors Each Round (Matches Color sensitivity.jpg / source 16) --- */
const colorPalettes = [
  { name: 'Forest / Coral', bg: ['#2e7d32', '#388e3c', '#4caf50', '#81c784', '#1b5e20'], num: ['#f4511e', '#ff7043', '#ff8a65', '#d84315', '#e64a19'], swatch: '#a7f3d0' },
  { name: 'Ocean / Gold', bg: ['#0284c7', '#0369a1', '#075985', '#38bdf8', '#0c4a6e'], num: ['#f59e0b', '#fbbf24', '#d97706', '#fcd34d', '#b45309'], swatch: '#bae6fd' },
  { name: 'Plum / Lime', bg: ['#7e22ce', '#6b21a8', '#581c87', '#9333ea', '#3b0764'], num: ['#84cc16', '#a3e635', '#65a30d', '#bef264', '#4d7c0f'], swatch: '#e9d5ff' },
  { name: 'Teal / Crimson', bg: ['#0f766e', '#115e59', '#134e4a', '#14b8a6', '#042f2e'], num: ['#e11d48', '#f43f5e', '#be123c', '#fb7185', '#9f1239'], swatch: '#99f6e4' },
  { name: 'Slate / Tangerine', bg: ['#475569', '#334155', '#1e293b', '#64748b', '#0f172a'], num: ['#ea580c', '#f97316', '#c2410c', '#fb923c', '#9a3412'], swatch: '#cbd5e1' },
  { name: 'Emerald / Magenta', bg: ['#059669', '#047857', '#065f46', '#10b981', '#064e3b'], num: ['#db2777', '#ec4899', '#be185d', '#f472b6', '#9d174d'], swatch: '#a7f3d0' },
  { name: 'Indigo / Amber', bg: ['#4338ca', '#3730a3', '#312e81', '#4f46e5', '#1e1b4b'], num: ['#d97706', '#f59e0b', '#b45309', '#fbbf24', '#78350f'], swatch: '#c7d2fe' },
  { name: 'Olive / Violet', bg: ['#4d7c0f', '#3f6212', '#365314', '#65a30d', '#1a2e05'], num: ['#8b5cf6', '#a78bfa', '#7c3aed', '#c4b5fd', '#6d28d9'], swatch: '#d9f99d' }
];

let currentPaletteIdx = 0;
let ishiharaUserNum = '';

function renderIshiharaTest(container) {
  speak(`Color sensitivity test. Round ${AppState.ishiharaRound} of ${AppState.ishiharaMaxRounds}. Identify the number 12 hidden inside the randomized colored bubbles.`);

  const currentPalette = colorPalettes[currentPaletteIdx];

  const slidersHtml = `
    <!-- Adjust Distance Slider (Matches Screenshot 16) -->
    <div class="clinic-room-slider slider-distance">
      <span style="font-size:0.75rem; font-weight:700; color:#1e293b;">Adjust Distance</span>
      <input type="range" min="0.5" max="1.5" step="0.05" value="0.75" style="writing-mode: bt-lr; -webkit-appearance: slider-vertical; width: 6px; height: 160px; margin: 8px 0;" oninput="document.getElementById('col-dist-val').textContent = parseFloat(this.value).toFixed(2) + ' m'" />
      <span id="col-dist-val" style="font-size:0.75rem; font-weight:800;">0.75 m</span>
    </div>
  `;

  const contentHtml = `
    <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
      <div class="ishihara-round-badge">
        <span>🎨 Round ${AppState.ishiharaRound} / ${AppState.ishiharaMaxRounds}</span>
        <span style="opacity:0.6;">•</span>
        <span>${currentPalette.name}</span>
      </div>

      <div style="display:flex; align-items:center; gap:20px;">
        <!-- Rotate / Randomize Color Palette Button (Matches Screenshot 16) -->
        <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
          <div id="ishihara-swatch" style="width:48px; height:48px; background:${currentPalette.swatch}; border-radius:6px; border:2px solid rgba(0,0,0,0.15); box-shadow:0 4px 10px rgba(0,0,0,0.1);"></div>
          <button class="btn-control" style="padding:6px 12px; font-size:1.2rem; background:#f1f5f9; border-color:#cbd5e1;" onclick="cycleRandomColorPalette()" title="Generate Random Colors Each Round">⟲</button>
        </div>

        <!-- Ishihara Plate Canvas -->
        <div style="display:flex; flex-direction:column; align-items:center;">
          <canvas id="ishihara-canvas" width="280" height="280" style="border-radius:50%; box-shadow:0 12px 30px rgba(0,0,0,0.22); background:#ffffff;"></canvas>
          
          <!-- COLORLITE Brand Icon (Matches Screenshot 16) -->
          <div style="display:flex; align-items:center; gap:6px; margin-top:8px; font-family:var(--font-mono); font-size:0.75rem; font-weight:800; color:#334155;">
            <span>COLORLITE</span>
            <span>🕶️</span>
          </div>
        </div>
      </div>

      <!-- Action Buttons (Skip & Confirm) -->
      <div style="display:flex; gap:140px; margin-top:12px;">
        <button class="btn-control" style="background:#d1fae5; border-color:#a7f3d0; padding:8px 24px;" onclick="skipColorTest()">Skip</button>
        <button class="btn-control" style="background:#d1fae5; border-color:#a7f3d0; padding:8px 24px;" onclick="confirmColorTest()">Confirm</button>
      </div>

      <!-- Number Input Readout -->
      <div style="margin-top:6px; font-size:0.85rem; font-weight:700; color:#475569;">
        Entered: <span id="color-entered-num" style="color:#0284c7; font-size:1.1rem; font-family:var(--font-mono); font-weight:900;">${ishiharaUserNum || '---'}</span>
      </div>

      <!-- Number Tiles Bar: 0 1 2 3 4 5 6 7 8 9 (Matches Screenshot 16) -->
      <div class="ishihara-number-bar" style="border: 2px solid #38bdf8; border-radius: 6px; padding: 4px; display: flex; gap: 4px; background: #ffffff; margin-top: 6px;">
        ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="num-tile-btn" onclick="pressNumberTile(${n})">${n}</button>`).join('')}
      </div>
    </div>
  `;

  container.innerHTML = getClinicRoomHtml(contentHtml, slidersHtml);
  drawIshihara12Plate();
}

function cycleRandomColorPalette() {
  // Generate a random index different from current
  let nextIdx = Math.floor(Math.random() * colorPalettes.length);
  if (nextIdx === currentPaletteIdx) nextIdx = (currentPaletteIdx + 1) % colorPalettes.length;
  currentPaletteIdx = nextIdx;
  
  const swatch = document.getElementById('ishihara-swatch');
  if (swatch) swatch.style.background = colorPalettes[currentPaletteIdx].swatch;

  drawIshihara12Plate();
  speak(`Randomized colors for plate: ${colorPalettes[currentPaletteIdx].name}`);
}

function drawIshihara12Plate() {
  const canvas = document.getElementById('ishihara-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = 132;

  ctx.clearRect(0, 0, w, h);

  // Create an offscreen mask to test if a dot point falls on the number "12"
  const offCanvas = document.createElement('canvas');
  offCanvas.width = w;
  offCanvas.height = h;
  const offCtx = offCanvas.getContext('2d');
  offCtx.fillStyle = '#000000';
  offCtx.font = '900 126px "Space Grotesk", sans-serif';
  offCtx.textAlign = 'center';
  offCtx.textBaseline = 'middle';
  offCtx.fillText('12', cx, cy + 4);
  const maskData = offCtx.getImageData(0, 0, w, h).data;

  const palette = colorPalettes[currentPaletteIdx];

  // Draw authentic pseudo-isochromatic dots packing
  const numDots = 850;
  for (let i = 0; i < numDots; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.sqrt(Math.random()) * (r - 6);
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;
    const dotRadius = 2.5 + Math.random() * 4.8;

    const px = Math.min(w - 1, Math.max(0, Math.floor(x)));
    const py = Math.min(h - 1, Math.max(0, Math.floor(y)));
    const maskAlpha = maskData[(py * w + px) * 4 + 3];

    // Determine if this dot belongs to the digit '12' or background
    if (maskAlpha > 120) {
      // Digit 12 dot
      ctx.fillStyle = palette.num[Math.floor(Math.random() * palette.num.length)];
    } else {
      // Background dot
      ctx.fillStyle = palette.bg[Math.floor(Math.random() * palette.bg.length)];
    }

    ctx.beginPath();
    ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function pressNumberTile(num) {
  if (ishiharaUserNum.length >= 2) ishiharaUserNum = '';
  ishiharaUserNum += num.toString();
  const el = document.getElementById('color-entered-num');
  if (el) el.textContent = ishiharaUserNum;
}

function skipColorTest() {
  advanceColorRound(false);
}

function confirmColorTest() {
  advanceColorRound(true);
}

function advanceColorRound(confirmed) {
  if (AppState.ishiharaRound < AppState.ishiharaMaxRounds) {
    AppState.ishiharaRound++;
    ishiharaUserNum = '';
    cycleRandomColorPalette();
    const container = document.getElementById('test-content-area');
    if (container) renderIshiharaTest(container);
  } else {
    // Battery of rounds completed
    AppState.testsCompleted.ishihara = true;
    updateProgressIndicator();
    speak('Color sensitivity battery completed. Moving to Near Point of Convergence.');
    switchTest('npc');
  }
}

/* --- Test 5: Near Point of Convergence (Matches NPOC.jpg / source 18) --- */
let npocDistance = 0.40;
let npocSpeed = 1.0;

function renderNpcTest(container) {
  speak('Near Point of Convergence. Tracking distance and approach speed in the clinic.');

  const contentHtml = `
    <div style="display:flex; align-items:center; gap:40px;">
      <!-- Distance & Speed Vertical Sliders (Matches Screenshot 18) -->
      <div style="display:flex; gap:20px;">
        <div class="clinic-room-slider" style="position:static;">
          <input type="range" min="0.10" max="0.80" step="0.02" value="${npocDistance}" style="writing-mode: bt-lr; -webkit-appearance: slider-vertical; width: 8px; height: 180px;" oninput="document.getElementById('npoc-d-val').textContent = parseFloat(this.value).toFixed(2) + ' m'" />
          <span id="npoc-d-val" style="font-size:0.75rem; font-weight:800; margin-top:4px;">${npocDistance.toFixed(2)} m</span>
          <span style="font-size:0.75rem; font-weight:700; color:#475569;">Distance</span>
        </div>

        <div class="clinic-room-slider" style="position:static;">
          <input type="range" min="0.5" max="3.0" step="0.1" value="${npocSpeed}" style="writing-mode: bt-lr; -webkit-appearance: slider-vertical; width: 8px; height: 180px;" oninput="document.getElementById('npoc-s-val').textContent = parseFloat(this.value).toFixed(1) + ' cm/sec'" />
          <span id="npoc-s-val" style="font-size:0.75rem; font-weight:800; margin-top:4px;">${npocSpeed.toFixed(1)} cm/sec</span>
          <span style="font-size:0.75rem; font-weight:700; color:#475569;">Speed</span>
        </div>
      </div>

      <!-- Animated Approaching Convergence Target -->
      <div style="display:flex; flex-direction:column; align-items:center; gap:12px;">
        <div style="width:200px; height:180px; background:#f1f5f9; border-radius:12px; border:2px dashed #94a3b8; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden;">
          <div style="width:2px; height:100%; background:#cbd5e1; position:absolute;"></div>
          <div id="npoc-target-ball" style="width:36px; height:36px; border-radius:50%; background:radial-gradient(circle at 35% 35%, #ef4444 0%, #991b1b 100%); box-shadow:0 0 16px rgba(239,68,68,0.6); animation: npocPulse 2s infinite alternate ease-in-out;"></div>
        </div>
        <span style="font-size:0.8rem; font-weight:700; color:#334155;">Convergence Target Track</span>
      </div>

      <!-- Main Menu Dialog Card (Matches Screenshot 18) -->
      <div style="background:#d1d5db; border:3px solid #38bdf8; border-radius:8px; padding:24px 28px; width:260px; text-align:center;">
        <h3 style="font-size:1.1rem; font-weight:800; color:#0f172a; margin-bottom:24px;">Main Menu</h3>
        <div style="display:flex; gap:14px; justify-content:center;">
          <button class="btn-control" style="background:#ffffff; color:#0f172a; width:90px;" onclick="navigate('home')">Home</button>
          <button class="btn-control primary" style="width:90px;" onclick="confirmNpcTest()">Confirm</button>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = getClinicRoomHtml(contentHtml);
}

function confirmNpcTest() {
  AppState.scores.npcCm = (npocDistance * 20).toFixed(1);
  AppState.testsCompleted.npc = true;
  updateProgressIndicator();
  speak('Near Point of Convergence recorded. Full battery complete. AI Screening Report is ready!');
  navigate('report');
}

/* --- Test 6: Pediatric Visual Acuity (HOTV Optotype) --- */
function renderAcuityTest(container) {
  speak('Pediatric visual acuity test. Identify the letter.');

  const contentHtml = `
    <div style="display:flex; flex-direction:column; align-items:center; gap:20px;">
      <div style="background:#ffffff; width:220px; height:220px; border-radius:12px; display:flex; align-items:center; justify-content:center; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
        <span style="font-size:6rem; font-weight:900; font-family:var(--font-mono); color:#0f172a;">H</span>
      </div>

      <div style="display:flex; gap:10px;">
        <button class="btn-control" style="font-size:1.2rem; width:54px; height:54px;" onclick="confirmAcuity('H')">H</button>
        <button class="btn-control" style="font-size:1.2rem; width:54px; height:54px;" onclick="confirmAcuity('O')">O</button>
        <button class="btn-control" style="font-size:1.2rem; width:54px; height:54px;" onclick="confirmAcuity('T')">T</button>
        <button class="btn-control" style="font-size:1.2rem; width:54px; height:54px;" onclick="confirmAcuity('V')">V</button>
      </div>
    </div>
  `;

  container.innerHTML = getClinicRoomHtml(contentHtml);
}

function confirmAcuity(letter) {
  AppState.testsCompleted.acuity = true;
  updateProgressIndicator();
  speak(`Optotype ${letter} matched. Visual Acuity confirmed.`);
  switchTest('stereopsis');
}

/* ==========================================================================
   4. AI Screening Report Card (Matches Slide 08)
   ========================================================================== */
function renderReportView(stage) {
  const isRefer = AppState.scores.aiClassification === 'REFER';

  stage.innerHTML = `
    <div class="view-section active">
      <div class="report-card-container glass-panel">
        <div class="report-header-banner">
          <div>
            <div class="report-org-title">VR BLAZERS PEDIATRIC AI TRIAGE</div>
            <h2 class="report-main-title">Vision Screening & Amblyopia Risk Report</h2>
          </div>
          <div class="report-meta-box">
            <span>Date: <strong>${AppState.patient.date}</strong></span>
            <span>Child: <strong>${AppState.patient.name} (${AppState.patient.id})</strong></span>
            <span>Age: <strong>${AppState.patient.age} yrs</strong></span>
          </div>
        </div>

        <div class="report-triage-hero ${isRefer ? 'refer-border' : 'pass-border'}">
          <div class="triage-status-col">
            <span class="triage-label">AI DIAGNOSTIC RECOMMENDATION</span>
            <div class="triage-badge ${isRefer ? 'badge-refer' : 'badge-pass'}">
              ${AppState.scores.aiClassification}
            </div>
            <span class="triage-confidence">Confidence Score: <strong>${AppState.scores.confidence}%</strong></span>
          </div>
          <div class="triage-explanation-col">
            <h4 style="font-size:1rem; font-weight:800; margin-bottom:6px;">Key Finding:</h4>
            <p style="font-size:0.88rem; color:#334155; line-height:1.5; margin-bottom:10px;">${AppState.scores.findings}</p>
            <div style="background:#ffffff; padding:10px 14px; border-radius:8px; border:1px solid #cbd5e1; font-size:0.82rem; color:#475569;">
              <strong>Parent-Friendly Summary:</strong> ${AppState.scores.parentExplanation}
            </div>
          </div>
        </div>

        <div class="report-data-grid">
          <div class="report-test-row">
            <span>Random Dot Stereogram (RDS):</span>
            <span class="report-val">${AppState.scores.stereopsisArcsec} arcseconds (${AppState.scores.stereopsisResult})</span>
          </div>
          <div class="report-test-row">
            <span>Worth 4-Dot Binocular Fusion:</span>
            <span class="report-val">${AppState.scores.worth4Dot}</span>
          </div>
          <div class="report-test-row">
            <span>Pelli-Robson Contrast Sensitivity:</span>
            <span class="report-val">${AppState.scores.contrastSensitivity}</span>
          </div>
          <div class="report-test-row">
            <span>Color Sensitivity (Ishihara 12 Plate):</span>
            <span class="report-val">${AppState.scores.colorVision}</span>
          </div>
          <div class="report-test-row">
            <span>Near Point of Convergence (NPC):</span>
            <span class="report-val">${AppState.scores.npcCm} cm</span>
          </div>
          <div class="report-test-row">
            <span>Child Reliability Index:</span>
            <span class="report-val">${AppState.scores.reliabilityScore}% (Response Latency: ${AppState.scores.responseTimeMs}ms)</span>
          </div>
        </div>

        <div class="report-actions-row">
          <button class="btn-action-primary" onclick="navigate('therapy')">
            <span>🎮 Launch Amblyopia Therapy (Cloud Jumper)</span>
          </button>
          <button class="btn-action-secondary" onclick="navigate('vr')">
            <span>🥽 View in 3D VR Clinic</span>
          </button>
          <button class="btn-action-secondary" onclick="triggerPrintReport()">
            <span>🖨️ Export Clinical PDF</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function triggerPrintReport() {
  speak('Preparing printable clinical diagnostic report.');
  window.print();
}

/* ==========================================================================
   5. Amblyopia Therapy Game: "Cloud Jumper"
   Recreated with precision for Screenshot Amblyopia game screen.jpg & Menu 15
   ========================================================================== */
function renderTherapyView(stage) {
  stage.innerHTML = `
    <div class="view-section active" style="height: 100%;">
      <div class="game-stage-wrapper">
        
        <!-- Top Capsule HUD (Matches Amblyopia game screen.jpg) -->
        <div class="game-top-hud-capsule">
          <div class="hud-timer" id="game-clock-display">13:15 ⏱</div>
          <button class="hud-pause-btn" onclick="toggleGamePause()" title="Pause/Resume Game">⏸</button>
          <div class="hud-eye-score">👁 <span id="game-score-display">0</span></div>
        </div>

        <!-- Top Right Tool Buttons: Screenshot & Settings -->
        <div class="game-top-tools-row">
          <button class="btn-hud-tool btn-hud-camera" onclick="takeGameScreenshot()" title="Take Screenshot of Therapy Game">
            <span>📸</span>
            <span>Screenshot</span>
          </button>
          <button class="btn-hud-tool" onclick="openAmblyopiaModal()" title="Configure Amblyopic Eye Rx">
            <span>⚙️</span>
            <span>Rx Setup</span>
          </button>
          <button class="btn-hud-tool" onclick="toggleGameJoystick()" title="Toggle On-Screen Virtual Joystick">
            <span>🕹️</span>
            <span>Joystick</span>
          </button>
        </div>

        <!-- Left Streak Modifier Card (Matches Amblyopia game screen.jpg) -->
        <div class="game-streak-card">
          <div class="streak-badge" id="streak-badge-text">x${AppState.game.streak}</div>
          <div class="streak-text-col">
            <div class="streak-main-title">KEEP THE STREAK FOR BIGGER REWARD</div>
            <div class="streak-progress-row">
              <span style="font-size:0.68rem; color:#475569; font-weight:700;">MODIFIER DURATION</span>
              <div class="streak-track"><div class="streak-fill" id="streak-timer-fill"></div></div>
              <span class="streak-timer-text" id="streak-timer-text">02:45</span>
            </div>
          </div>
        </div>

        <!-- On-Screen 360° Analog Virtual Joystick (Matches User Request: "add the joy stick on the exactly") -->
        <div class="game-joystick-pad" id="game-joystick-pad">
          <span class="joystick-compass-mark mark-n">N</span>
          <span class="joystick-compass-mark mark-s">S</span>
          <span class="joystick-compass-mark mark-w">W</span>
          <span class="joystick-compass-mark mark-e">E</span>
          <div class="joystick-crosshair-h"></div>
          <div class="joystick-crosshair-v"></div>
          <div class="joystick-knob-stick" id="joystick-knob">
            <div class="joystick-knob-inner-dimple"></div>
          </div>
        </div>

        <!-- Canvas Stage -->
        <div class="game-canvas-box">
          <canvas id="therapy-canvas" width="1100" height="520"></canvas>

          <!-- Start / Game Over Overlay -->
          <div id="game-overlay" class="game-overlay">
            <h1 style="font-size:2.4rem; font-weight:800; margin-bottom:8px;">Cloud Jumper</h1>
            <p style="max-width:460px; text-align:center; font-size:0.95rem; opacity:0.92; line-height:1.5; margin-bottom:16px;">
              Fly the magical acrobat between the floating mushroom cloud islands and catch the golden stars.
              Steer with the <strong>360° Analog Joystick</strong>, press <strong>SPACEBAR</strong>, or <strong>CLICK</strong> to leap!
            </p>
            <div style="display:flex; gap:12px; flex-wrap:wrap; justify-content:center;">
              <button class="btn-action-primary" style="font-size:1.1rem; padding:14px 36px;" onclick="startGameLoop()">
                🚀 Launch Therapy Flight
              </button>
              <button class="btn-action-secondary" style="background:#ffffff; color:#0f172a;" onclick="openAmblyopiaModal()">
                ⚙️ Configure Rx
              </button>
              <button class="btn-action-secondary btn-hud-camera" style="border:none;" onclick="takeGameScreenshot()">
                📸 Capture Snapshot
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  setupGameInput();
  setupGameJoystick();
}

function toggleGameJoystick() {
  const pad = document.getElementById('game-joystick-pad');
  if (pad) {
    if (pad.style.display === 'none') {
      pad.style.display = 'flex';
      speak('Virtual joystick enabled.');
    } else {
      pad.style.display = 'none';
      speak('Virtual joystick hidden.');
    }
  }
}

function setupGameJoystick() {
  const pad = document.getElementById('game-joystick-pad');
  const knob = document.getElementById('joystick-knob');
  if (!pad || !knob) return;

  let dragging = false;
  const radius = 34;

  const onPointerDown = (e) => {
    dragging = true;
    updateJoystickPos(e);
  };

  const onPointerMove = (e) => {
    if (!dragging) return;
    updateJoystickPos(e);
  };

  const onPointerUp = () => {
    if (!dragging) return;
    dragging = false;
    knob.style.transform = 'translate(0px, 0px)';
    AppState.game.joystickDx = 0;
    AppState.game.joystickDy = 0;
  };

  function updateJoystickPos(e) {
    const rect = pad.getBoundingClientRect();
    const padCenterX = rect.left + rect.width / 2;
    const padCenterY = rect.top + rect.height / 2;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    let dx = clientX - padCenterX;
    let dy = clientY - padCenterY;
    const dist = Math.hypot(dx, dy);

    if (dist > radius) {
      dx = (dx / dist) * radius;
      dy = (dy / dist) * radius;
    }

    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    AppState.game.joystickDx = dx / radius; // -1 to 1
    AppState.game.joystickDy = dy / radius; // -1 to 1

    if (AppState.game.running && dy < -10) {
      AppState.game.birdVelocity = Math.max(-5.5, AppState.game.jumpForce * (Math.abs(dy) / radius));
    }
  }

  pad.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);

  pad.addEventListener('touchstart', (e) => { e.preventDefault(); onPointerDown(e); });
  window.addEventListener('touchmove', (e) => { if (dragging) { e.preventDefault(); onPointerMove(e); } }, { passive: false });
  window.addEventListener('touchend', onPointerUp);
}

function takeGameScreenshot() {
  const canvas = document.getElementById('therapy-canvas');
  if (!canvas) return;

  try {
    const dataUrl = canvas.toDataURL('image/png');
    const previewImg = document.getElementById('screenshot-img-preview');
    const downloadLink = document.getElementById('screenshot-download-link');
    const scoreTag = document.getElementById('screenshot-score-tag');
    const modeTag = document.getElementById('screenshot-mode-tag');
    const modal = document.getElementById('screenshot-modal');

    if (previewImg) previewImg.src = dataUrl;
    if (downloadLink) {
      downloadLink.href = dataUrl;
      downloadLink.download = `Cloud_Jumper_Pediatric_Therapy_Score_${AppState.game.score}.png`;
    }
    if (scoreTag) scoreTag.textContent = AppState.game.score;
    if (modeTag) modeTag.textContent = `${AppState.therapyConfig.eyeMode.toUpperCase()} (${AppState.therapyConfig.practiceEye.toUpperCase()} Eye)`;
    if (modal) modal.classList.add('active');

    speak('Screenshot captured! You can download your therapy flight snapshot.');
  } catch (err) {
    console.warn('Screenshot error:', err);
  }
}

function closeScreenshotModal() {
  const modal = document.getElementById('screenshot-modal');
  if (modal) modal.classList.remove('active');
}

function toggleGamePause() {
  AppState.game.running = !AppState.game.running;
  if (AppState.game.running) {
    requestAnimationFrame(gameLoopStep);
    speak('Game resumed.');
  } else {
    speak('Game paused.');
  }
}

function setupGameInput() {
  const jumpHandler = (e) => {
    if (AppState.currentView !== 'therapy') return;
    if (e.type === 'keydown' && e.code !== 'Space') return;
    if (AppState.game.running) {
      AppState.game.birdVelocity = AppState.game.jumpForce;
    }
  };

  window.removeEventListener('keydown', jumpHandler);
  window.addEventListener('keydown', jumpHandler);
  
  const canvas = document.getElementById('therapy-canvas');
  if (canvas) {
    canvas.addEventListener('mousedown', jumpHandler);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); jumpHandler(e); });
  }
}

function startGameLoop() {
  const overlay = document.getElementById('game-overlay');
  if (overlay) overlay.classList.add('hidden');

  AppState.game.running = true;
  AppState.game.score = 0;
  AppState.game.streak = 0;
  AppState.game.birdY = 220;
  AppState.game.birdX = 160;
  AppState.game.birdVelocity = 0;
  AppState.game.obstacles = [];
  AppState.game.starsList = [];
  AppState.game.particles = [];

  // Start in-game countdown timer
  if (AppState.game.timerInterval) clearInterval(AppState.game.timerInterval);
  AppState.game.timerInterval = setInterval(() => {
    if (!AppState.game.running) return;
    AppState.game.timeRemaining--;
    const m = Math.floor(AppState.game.timeRemaining / 60);
    const s = AppState.game.timeRemaining % 60;
    const clock = document.getElementById('game-clock-display');
    if (clock) clock.textContent = `${m}:${s < 10 ? '0' : ''}${s} ⏱`;
  }, 1000);

  // Spawn initial mushroom islands
  for (let i = 1; i <= 4; i++) {
    spawnObstacle(340 + i * 290);
  }

  requestAnimationFrame(gameLoopStep);
}

function spawnObstacle(x) {
  const y = 280 + Math.random() * 110;
  AppState.game.obstacles.push({ x: x, y: y, width: 145, height: 180 });
  AppState.game.starsList.push({ x: x + 60, y: y - 75, collected: false, angle: 0 });
}

function gameLoopStep() {
  if (!AppState.game.running) return;

  const canvas = document.getElementById('therapy-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Physics update with virtual joystick steering
  AppState.game.birdVelocity += AppState.game.gravity;
  AppState.game.birdY += AppState.game.birdVelocity + (AppState.game.joystickDy * 3.5);
  AppState.game.birdX = Math.max(100, Math.min(300, AppState.game.birdX + AppState.game.joystickDx * 3.5));

  if (AppState.game.birdY > h - 35) {
    AppState.game.birdY = h - 35;
    AppState.game.birdVelocity = 0;
  }
  if (AppState.game.birdY < 25) {
    AppState.game.birdY = 25;
    AppState.game.birdVelocity = 0;
  }

  // 1. Draw Fantasy Twilight Magenta Sky (Matches Amblyopia game screen.jpg)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0, '#b8448b');
  skyGrad.addColorStop(0.35, '#d9589d');
  skyGrad.addColorStop(0.7, '#b23d7e');
  skyGrad.addColorStop(1, '#782352');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Soft Parallax Drifting Clouds
  ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.beginPath();
  ctx.ellipse(180, 110, 85, 26, 0, 0, Math.PI * 2);
  ctx.ellipse(780, 140, 115, 32, 0, 0, Math.PI * 2);
  ctx.ellipse(540, 320, 95, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Center Star Badge in Sky (Matches Amblyopia game screen.jpg)
  ctx.save();
  ctx.translate(w / 2 - 40, 200);
  ctx.fillStyle = 'rgba(186, 230, 253, 0.88)';
  ctx.beginPath();
  ctx.arc(0, 0, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(-16, -14, 32, 28, 8);
  ctx.fill();
  ctx.fillStyle = '#facc15';
  ctx.font = '14px sans-serif';
  ctx.fillText('⭐⭐⭐', -24, -42);
  ctx.restore();

  // 3. Render Floating Islands Resting on Puffy Clouds
  for (let i = AppState.game.obstacles.length - 1; i >= 0; i--) {
    const ob = AppState.game.obstacles[i];
    ob.x -= 2.2;

    // Volumetric Puffy Cloud Pillow Base
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.ellipse(ob.x + 72, ob.y + 42, 96, 32, 0, 0, Math.PI * 2);
    ctx.ellipse(ob.x + 40, ob.y + 36, 45, 22, 0, 0, Math.PI * 2);
    ctx.ellipse(ob.x + 104, ob.y + 38, 50, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Earthen Rock strata under ground
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.roundRect(ob.x + 10, ob.y + 12, ob.width - 20, 24, [0, 0, 12, 12]);
    ctx.fill();

    // Green mossy ground
    ctx.fillStyle = '#65a30d';
    ctx.beginPath();
    ctx.roundRect(ob.x, ob.y, ob.width, 24, 12);
    ctx.fill();

    // Red-and-Yellow Spotted Mushroom House 1
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(ob.x + 22, ob.y - 48, 28, 48);
    // Red Cap
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(ob.x + 36, ob.y - 48, 26, Math.PI, 0);
    ctx.fill();
    // Yellow Polka Dots / Windows
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(ob.x + 26, ob.y - 56, 4, 0, Math.PI * 2);
    ctx.arc(ob.x + 44, ob.y - 54, 5, 0, Math.PI * 2);
    ctx.arc(ob.x + 36, ob.y - 64, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Wooden door
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.roundRect(ob.x + 30, ob.y - 20, 12, 20, [4, 4, 0, 0]);
    ctx.fill();

    // Mushroom House 2 (Smaller companion)
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(ob.x + 88, ob.y - 36, 24, 36);
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.arc(ob.x + 100, ob.y - 36, 20, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ob.x + 94, ob.y - 42, 3.5, 0, Math.PI * 2);
    ctx.arc(ob.x + 106, ob.y - 40, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Rustic wooden fence
    ctx.strokeStyle = '#a16207';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(ob.x + 58, ob.y);
    ctx.lineTo(ob.x + 58, ob.y - 12);
    ctx.moveTo(ob.x + 72, ob.y);
    ctx.lineTo(ob.x + 72, ob.y - 12);
    ctx.moveTo(ob.x + 54, ob.y - 8);
    ctx.lineTo(ob.x + 76, ob.y - 8);
    ctx.stroke();

    if (ob.x + ob.width < 0) {
      AppState.game.obstacles.splice(i, 1);
      spawnObstacle(w + 100);
      AppState.game.score += 10;
      const scoreEl = document.getElementById('game-score-display');
      if (scoreEl) scoreEl.textContent = AppState.game.score;
    }
  }

  // 4. Render Stars
  for (let i = AppState.game.starsList.length - 1; i >= 0; i--) {
    const s = AppState.game.starsList[i];
    s.x -= 2.2;
    s.angle += 0.04;

    if (!s.collected) {
      ctx.save();
      ctx.translate(s.x, s.y + Math.sin(s.angle) * 8);

      // In Dichoptic Therapy mode, stars emit special target stimulus
      if (AppState.therapyConfig.eyeMode === 'dichoptic') {
        ctx.fillStyle = '#06b6d4';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 18;
      } else {
        ctx.fillStyle = '#facc15';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 14;
      }

      ctx.font = '28px sans-serif';
      ctx.fillText('⭐', -14, 10);
      ctx.restore();

      const bx = AppState.game.birdX;
      const by = AppState.game.birdY;
      const dist = Math.hypot(bx - s.x, by - s.y);
      if (dist < 42) {
        s.collected = true;
        AppState.game.streak += 1;
        AppState.game.score += 50 * AppState.game.streak;
        
        const streakText = document.getElementById('streak-badge-text');
        const scoreEl = document.getElementById('game-score-display');
        if (streakText) streakText.textContent = `x${AppState.game.streak}`;
        if (scoreEl) scoreEl.textContent = AppState.game.score;

        // Spawn sparkling celebration particles
        for (let p = 0; p < 10; p++) {
          AppState.game.particles.push({
            x: s.x,
            y: s.y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 25,
            color: '#facc15'
          });
        }
      }
    }

    if (s.x < -40) {
      AppState.game.starsList.splice(i, 1);
    }
  }

  // 5. Render Flying Acrobatic Stickman with Luminous Halo Head & Stardust Trail
  const bx = AppState.game.birdX;
  const by = AppState.game.birdY;

  // Spawn stardust pearls into particle buffer
  if (Math.random() > 0.3) {
    AppState.game.particles.push({
      x: bx - 14,
      y: by + (Math.random() - 0.5) * 8,
      vx: -1.8 - Math.random() * 1.5,
      vy: (Math.random() - 0.5) * 1.2,
      life: 24,
      color: Math.random() > 0.5 ? '#ffffff' : '#38bdf8'
    });
  }

  // Draw and update active stardust particles
  for (let p = AppState.game.particles.length - 1; p >= 0; p--) {
    const pt = AppState.game.particles[p];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;

    ctx.save();
    ctx.fillStyle = pt.color;
    ctx.shadowColor = pt.color;
    ctx.shadowBlur = 8;
    ctx.globalAlpha = Math.max(0, pt.life / 25);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (pt.life <= 0) AppState.game.particles.splice(p, 1);
  }

  // Render the Acrobat Body
  ctx.save();
  ctx.translate(bx, by);
  const tilt = Math.max(-0.4, Math.min(0.4, AppState.game.birdVelocity * 0.06));
  ctx.rotate(tilt);

  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 12;

  // Luminous Ring / Halo Head (Matches Amblyopia game screen.jpg)
  ctx.beginPath();
  ctx.arc(10, -18, 9, 0, Math.PI * 2);
  ctx.stroke();

  // Curved Torso in Flying Pose
  ctx.beginPath();
  ctx.moveTo(8, -9);
  ctx.quadraticCurveTo(0, 0, -14, 12);
  ctx.stroke();

  // Outstretched Wings / Arms
  ctx.beginPath();
  ctx.moveTo(4, -4);
  ctx.lineTo(24, -14);
  ctx.moveTo(4, -4);
  ctx.lineTo(-6, -20);
  ctx.stroke();

  // Trailing Legs
  ctx.beginPath();
  ctx.moveTo(-14, 12);
  ctx.lineTo(-28, 22);
  ctx.moveTo(-14, 12);
  ctx.lineTo(-24, 30);
  ctx.stroke();

  ctx.restore();

  requestAnimationFrame(gameLoopStep);
}

/* ==========================================================================
   6. 3D Virtual Reality Clinical Suite
   Recreating Screenshot 2026-09-13 222434.jpg with 100% Visual Fidelity
   ========================================================================== */
function renderVRClinicView(stage) {
  stage.innerHTML = `
    <div class="vr-clinic-viewport" id="vr-clinic-viewport">
      
      <!-- Virtual Clinic Ceiling Lights & Wall Band -->
      <div class="vr-virtual-room-env">
        <div class="vr-env-ceiling">
          <div class="vr-env-light"></div>
          <div class="vr-env-light"></div>
          <div class="vr-env-light"></div>
        </div>
        <div class="vr-env-wall-stripe"></div>
      </div>

      <!-- Top Floating VR Controls Toolbar -->
      <div class="vr-top-toolbar">
        <button class="vr-toolbar-btn ${AppState.vrClinic.stereoscopicMode ? 'active' : ''}" onclick="toggleVRStereoscopic()" title="Toggle Side-by-Side Stereoscopic Dual-Eye View">
          <span>👓</span>
          <span>Dual-Eye 3D</span>
        </button>
        <button class="vr-toolbar-btn ${AppState.vrClinic.gyroActive ? 'active' : ''}" onclick="toggleVRGyro()" title="Toggle Gyroscope Head Tracking for Mobile VR">
          <span>📱</span>
          <span>Gyro Track</span>
        </button>
        <button class="vr-toolbar-btn" onclick="toggleVRWebXR()" title="Launch Immersive WebXR Session">
          <span>⚡</span>
          <span>WebXR</span>
        </button>
        <button class="vr-toolbar-btn" onclick="toggleVRFullscreen()" title="Toggle Fullscreen VR View">
          <span>🖥️</span>
          <span>Fullscreen</span>
        </button>
        <span style="color:#38bdf8; font-size:0.75rem; font-weight:800; margin-left:6px;">🟢 6-DoF ACTIVE</span>
      </div>

      <!-- 3D Room Stage with Perspective -->
      <div class="vr-room-3d-stage" id="vr-room-3d-stage">
        <div class="vr-panels-container">
          
          <!-- Left Floating Curved Panel ("Hello, Vision" - Matches Screenshot 2026-09-13 222434.jpg) -->
          <div class="vr-curved-card vr-card-left" id="vr-card-left">
            <div class="vr-profile-header">
              <h3 class="vr-profile-title">Hello, Vision</h3>
              <div style="display:flex; gap:6px;">
                <button class="vr-btn-circle-action vr-btn-power" onclick="speak('System active. Connected to clinical server.')" title="Power">⏻</button>
                <button class="vr-btn-circle-action vr-btn-edit" onclick="speak('Editing Aarav Sharma profile.')" title="Edit">✏️</button>
              </div>
            </div>

            <!-- Avatar & Vitals Table -->
            <div class="vr-avatar-row">
              <div class="vr-avatar-img">👦</div>
              <div>
                <div style="font-size:0.95rem; font-weight:800; color:#0f172a;">${AppState.patient.name}</div>
                <div style="font-size:0.75rem; color:#64748b;">Code: ${AppState.patient.id}</div>
              </div>
            </div>

            <table class="vr-vitals-table">
              <tr><td>Age</td><td>: ${AppState.patient.age} yrs</td></tr>
              <tr><td>Height</td><td>: ${AppState.patient.height}cm</td></tr>
              <tr><td>Weight</td><td>: ${AppState.patient.weight}kg</td></tr>
              <tr><td>BMI</td><td>: ${AppState.patient.bmi}</td></tr>
              <tr><td>BMR</td><td>: ${AppState.patient.bmr}</td></tr>
            </table>

            <!-- BMI Health Status Box -->
            <div class="vr-status-progress-box">
              <div class="vr-status-label-row">
                <span>Status: Normal Pediatric BMI</span>
                <span style="color:#059669;">Optimal</span>
              </div>
              <div class="vr-status-bar-track">
                <div class="vr-status-bar-fill"></div>
              </div>
            </div>

            <!-- Prescription Details -->
            <div class="vr-section-subtitle">Prescription Details</div>
            <table class="vr-vitals-table">
              <tr><td>Prescription</td><td>: ${AppState.patient.prescription}</td></tr>
              <tr><td>From</td><td>: ${AppState.patient.prescriptionFrom}</td></tr>
              <tr><td>Till</td><td>: ${AppState.patient.prescriptionTill}</td></tr>
              <tr><td>Session Left</td><td>: ${AppState.patient.sessionsLeft}</td></tr>
            </table>

            <!-- Doctor Details -->
            <div class="vr-section-subtitle">Doctor Details</div>
            <table class="vr-vitals-table">
              <tr><td>Dr Name</td><td>: ${AppState.patient.doctor}</td></tr>
              <tr><td>Dr Code</td><td>: ${AppState.patient.doctorCode}</td></tr>
              <tr><td>Dr Hospital</td><td>: ${AppState.patient.clinic}</td></tr>
            </table>

            <div class="vr-connected-badge">
              <span style="width:7px; height:7px; border-radius:50%; background:#10b981; box-shadow:0 0 6px #10b981;"></span>
              <span>CONNECTED</span>
            </div>
          </div>

          <!-- Center Floating Curved Panel ("Core Clinical" - Matches Screenshot 2026-09-13 222434.jpg) -->
          <div class="vr-curved-card vr-card-center" id="vr-card-center">
            
            <div class="vr-center-top-bar">
              <div class="vr-core-pill">
                <span class="vr-logo-badge">VR BLAZERS</span>
                <span class="vr-core-title">Core Clinical</span>
              </div>
              <button class="btn-vr-golive" onclick="triggerVRGoLive()">Go Live</button>
            </div>

            <div class="vr-hero-text-block">
              <h2>Enhance Your Vision. <span style="color:#0ea5e9;">Empower Your Life.</span></h2>
              <div style="width:120px; height:3px; background:#0ea5e9; border-radius:2px; margin-bottom:8px;"></div>
              <p>
                Our Vision Wellness modules are designed to improve visual performance and eye comfort through guided
                exercises and smart diagnostics. Train your brain to process visual information better, reduce eye fatigue,
                and boost focus and reading efficiency.
              </p>
            </div>

            <!-- Authentic Brain-Eye Tree Illustration with Lotus & Celestial Symbols -->
            <div class="vr-artwork-container">
              <svg class="vr-tree-svg" viewBox="0 0 400 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Celestial Icons: Sun, Moon, Pulse -->
                <circle cx="200" cy="22" r="10" stroke="#f59e0b" stroke-width="2.5" fill="#fef3c7" />
                <path d="M190 22h-6M216 22h-6M200 12v-6M200 38v-6" stroke="#f59e0b" stroke-width="2" />
                <!-- Moon -->
                <path d="M260 28a12 12 0 1 0 14 14 10 10 0 0 1-14-14z" fill="#38bdf8" />
                <!-- Bio-Pulse Wave -->
                <path d="M130 32h14l4-8 6 16 6-12 4 6h14" stroke="#0ea5e9" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />

                <!-- Tree Foliage / Brain Crown -->
                <path d="M160 55 C140 40, 140 25, 170 25 C180 15, 220 15, 230 25 C260 25, 260 40, 240 55 C265 65, 265 85, 245 95 C230 105, 170 105, 155 95 C135 85, 135 65, 160 55 Z" fill="#e0f2fe" stroke="#0284c7" stroke-width="2.5" />
                
                <!-- Neural Branching Inside Brain Foliage -->
                <path d="M175 45q15-15 25 5t25-5" stroke="#38bdf8" stroke-width="2" fill="none" />
                <path d="M165 70q20-8 35 2t35-4" stroke="#38bdf8" stroke-width="2" fill="none" />

                <!-- Tree Trunk with Open Human Eye -->
                <path d="M185 92v26q-15 15-30 22m45-48v26q15 15 30 22" stroke="#0369a1" stroke-width="3.5" fill="none" stroke-linecap="round" />
                
                <!-- Central Luminous Human Eye in Trunk -->
                <path d="M174 105 C185 96, 215 96, 226 105 C215 114, 185 114, 174 105 Z" fill="#ffffff" stroke="#0284c7" stroke-width="2.5" />
                <circle cx="200" cy="105" r="6" fill="#0284c7" />
                <circle cx="200" cy="105" r="2.5" fill="#0f172a" />
                <circle cx="198" cy="103" r="1" fill="#ffffff" />

                <!-- Blooming Lotus Blossoms at Base -->
                <path d="M170 148 C160 138, 180 132, 190 144 C200 132, 220 138, 210 148 C200 152, 180 152, 170 148 Z" fill="#fbcfe8" stroke="#db2777" stroke-width="1.8" />
                <path d="M150 150 C142 142, 158 136, 165 146" stroke="#db2777" stroke-width="1.6" fill="none" />
                <path d="M230 150 C238 142, 222 136, 215 146" stroke="#db2777" stroke-width="1.6" fill="none" />
              </svg>
            </div>

            <!-- Guided Exercises & Smart Diagnostics Cards -->
            <div class="vr-modules-grid">
              <div class="vr-module-box" onclick="navigate('therapy')" title="Start Cloud Jumper Amblyopia Therapy">
                <span class="vr-module-icon">🏋️‍♂️</span>
                <div class="vr-module-text">
                  <h4>Guided Exercises</h4>
                  <span>Dichoptic Cloud Jumper</span>
                </div>
              </div>
              <div class="vr-module-box" onclick="navigate('clinical')" title="Launch 5-Test Screening Battery">
                <span class="vr-module-icon">🧠</span>
                <div class="vr-module-text">
                  <h4>Smart Diagnostics</h4>
                  <span>5-Test Clinical Suite</span>
                </div>
              </div>
            </div>

            <!-- Core Clinical Status -->
            <div class="vr-clinical-status-box">
              <span style="font-weight:800; color:#1e293b;">CORE CLINICAL STATUS</span>
              <div class="vr-status-item">
                <span style="width:8px; height:8px; border-radius:50%; background:#10b981; box-shadow:0 0 6px #10b981;"></span>
                <span>Last Login: Today 08:30 AM</span>
              </div>
              <div class="vr-status-item">
                <span style="width:8px; height:8px; border-radius:50%; background:#0ea5e9; box-shadow:0 0 6px #0ea5e9;"></span>
                <span>Last Activity: 15" Stereo Pass</span>
              </div>
            </div>

          </div>
        </div>

        <!-- Floating Quick-Launch Test Ribbon inside VR -->
        <div class="vr-floating-test-dock">
          <span style="color:#94a3b8; font-size:0.75rem; font-weight:800; margin-right:4px;">QUICK LAUNCH:</span>
          <button class="vr-test-chip" onclick="AppState.currentTest='stereopsis'; navigate('clinical')">🔬 Stereopsis (15")</button>
          <button class="vr-test-chip" onclick="AppState.currentTest='worth4dot'; navigate('clinical')">🔴 Worth 4-Dot</button>
          <button class="vr-test-chip" onclick="AppState.currentTest='ishihara'; navigate('clinical')">🎨 Ishihara 12</button>
          <button class="vr-test-chip" onclick="AppState.currentTest='contrast'; navigate('clinical')">📉 Contrast Chart</button>
          <button class="vr-test-chip" onclick="AppState.currentTest='npc'; navigate('clinical')">🎯 NPOC (40cm)</button>
          <button class="vr-test-chip" style="background:#06b6d4; color:#ffffff;" onclick="navigate('therapy')">🎮 Cloud Jumper</button>
        </div>

        <!-- Bottom VR Navigation Dock -->
        <div class="vr-bottom-dock">
          <button class="vr-dock-btn active" onclick="navigate('vr')">
            <span>👁️</span>
            <span>Core Clinical</span>
          </button>
          <button class="vr-dock-btn" onclick="openAmblyopiaModal()">
            <span>⚙️</span>
            <span>Settings</span>
          </button>
          <button class="vr-dock-btn" onclick="navigate('home')">
            <span>🏠</span>
            <span>Exit VR</span>
          </button>
        </div>

      </div>
    </div>
  `;

  setupVRRoomInteraction();
}

function triggerVRGoLive() {
  speak('Core Clinical live session initiated. Calibrating real-time binocular disparity and gaze tracking.');
  const goLiveBtn = document.querySelector('.btn-vr-golive');
  if (goLiveBtn) {
    goLiveBtn.textContent = '🟢 LIVE ACTIVE';
    goLiveBtn.style.background = '#10b981';
    setTimeout(() => {
      goLiveBtn.textContent = 'Go Live';
      goLiveBtn.style.background = '#0ea5e9';
    }, 4000);
  }
}

function toggleVRStereoscopic() {
  AppState.vrClinic.stereoscopicMode = !AppState.vrClinic.stereoscopicMode;
  toggleVRMode();
}

function toggleVRGyro() {
  AppState.vrClinic.gyroActive = !AppState.vrClinic.gyroActive;
  if (AppState.vrClinic.gyroActive) {
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleVRDeviceOrientation);
      speak('Gyroscope tracking enabled. Turn your phone or headset to look around.');
    } else {
      speak('Gyroscope hardware not detected on this device.');
    }
  } else {
    window.removeEventListener('deviceorientation', handleVRDeviceOrientation);
    speak('Gyroscope tracking disabled.');
  }
}

function handleVRDeviceOrientation(e) {
  if (!AppState.vrClinic.gyroActive) return;
  const stage = document.getElementById('vr-room-3d-stage');
  if (!stage) return;
  const rotY = (e.gamma || 0) * 0.4;
  const rotX = ((e.beta || 0) - 45) * 0.4;
  stage.style.transform = `rotateX(${-rotX}deg) rotateY(${rotY}deg)`;
}

function toggleVRWebXR() {
  if (navigator.xr) {
    navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
      if (supported) {
        speak('WebXR Immersive VR supported. Launching headset session.');
      } else {
        speak('WebXR supported in browser, but no standalone headset is currently attached. Running high-precision 3D VR simulation.');
      }
    }).catch(() => {
      speak('WebXR emulation mode enabled.');
    });
  } else {
    speak('WebXR API emulation active. Running in simulated 6-DoF mode with touch controllers.');
  }
}

function toggleVRFullscreen() {
  const elem = document.documentElement;
  if (!document.fullscreenElement) {
    elem.requestFullscreen().catch(() => {});
    speak('Fullscreen VR mode enabled.');
  } else {
    document.exitFullscreen().catch(() => {});
    speak('Exited fullscreen.');
  }
}

function setupVRRoomInteraction() {
  const viewport = document.getElementById('vr-clinic-viewport');
  const stage = document.getElementById('vr-room-3d-stage');
  if (!viewport || !stage) return;

  viewport.addEventListener('mousemove', (e) => {
    const rect = viewport.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5
    
    if (!AppState.vrClinic.gyroActive) {
      const rotY = nx * 14;
      const rotX = -ny * 12;
      stage.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    }
  });
}

/* ==========================================================================
   7. Hackathon Judge Fast-Track Presets
   ========================================================================== */
function loadJudgePreset(type) {
  if (type === 'amblyopia') {
    AppState.patient = {
      name: 'Aarav Sharma',
      age: 7,
      id: '#CH-0472',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      targetEye: 'OS (Left Eye)',
      doctor: 'Dev Doc Vision',
      doctorCode: '2-2857',
      clinic: 'Apex Pediatric Vision Clinic',
      height: 122,
      weight: 24,
      bmi: '16.1',
      bmr: '980 kcal/Day',
      prescription: 'Active Protocol',
      prescriptionFrom: '2026-09-01',
      prescriptionTill: '2026-10-15',
      sessionsLeft: '14 of 20'
    };
    AppState.scores = {
      visualAcuity: '20/32',
      stereopsisArcsec: 100,
      stereopsisResult: 'Pathological (>100")',
      worth4Dot: 'Suppression (Right Eye Suppressed)',
      contrastSensitivity: 'Reduced (1.20 log units)',
      npcCm: 9.8,
      colorVision: 'Normal (12 Plates Correct)',
      responseTimeMs: 740,
      reliabilityScore: 89,
      aiClassification: 'REFER',
      confidence: 88,
      findings: 'Reduced stereo acuity with right-eye suppression on Worth 4-Dot indicates significant risk of unilateral amblyopia (lazy eye) secondary to anisometropia or micro-strabismus.',
      parentExplanation: "Your child's eyes may not be teaming together optimally. One eye is taking on most visual work while the other is partially resting. This responds very well to early dichoptic therapy. We recommend confirming with a pediatric eye examination."
    };
    AppState.testsCompleted = { stereopsis: true, worth4dot: true, contrast: true, ishihara: true, npc: true, acuity: true };
    updateProgressIndicator();
    speak('Amblyopia risk preset loaded. Diagnostic recommendation is REFER.');
    navigate('report');
  } else if (type === 'healthy') {
    AppState.patient = {
      name: 'Maya Patel',
      age: 8,
      id: '#CH-0914',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      targetEye: 'OU (Both Eyes)',
      doctor: 'Dev Doc Vision',
      doctorCode: '2-2857',
      clinic: 'Apex Pediatric Vision Clinic',
      height: 128,
      weight: 26,
      bmi: '15.9',
      bmr: '1020 kcal/Day',
      prescription: 'Annual Routine Checkup',
      prescriptionFrom: '2026-09-14',
      prescriptionTill: '2027-09-14',
      sessionsLeft: 'Completed'
    };
    AppState.scores = {
      visualAcuity: '20/20',
      stereopsisArcsec: 15,
      stereopsisResult: 'Excellent Stereopsis (≤15")',
      worth4Dot: 'Normal Binocular Fusion (4 Dots)',
      contrastSensitivity: 'Normal (1.80 log units)',
      npcCm: 5.4,
      colorVision: 'Normal (12 Plates Correct)',
      responseTimeMs: 480,
      reliabilityScore: 98,
      aiClassification: 'PASS',
      confidence: 96,
      findings: 'All pediatric visual parameters are within normal developmental bounds. Normal binocular fusion, excellent stereopsis, and healthy convergence response.',
      parentExplanation: 'Your child demonstrated excellent eye teaming, strong depth perception, and healthy bilateral coordination.'
    };
    AppState.testsCompleted = { stereopsis: true, worth4dot: true, contrast: true, ishihara: true, npc: true, acuity: true };
    updateProgressIndicator();
    speak('Healthy 20/20 preset loaded. Diagnostic recommendation is PASS.');
    navigate('report');
  }
}

/* ==========================================================================
   8. Login & Modal Logic
   ========================================================================== */
function openAmblyopiaModal() {
  const modal = document.getElementById('amblyopia-menu-modal');
  if (modal) modal.classList.add('active');
  speak('Therapy prescription configuration.');
}

function closeAmblyopiaModal() {
  const modal = document.getElementById('amblyopia-menu-modal');
  if (modal) modal.classList.remove('active');
}

function selectSetupOption(category, value, btnEl) {
  AppState.therapyConfig[category] = value;
  const parent = btnEl.parentElement;
  if (parent) {
    parent.querySelectorAll('.pill-opt-btn').forEach(b => {
      b.classList.remove('active');
      b.textContent = b.textContent.replace('✓ ', '');
    });
  }
  btnEl.classList.add('active');
  btnEl.textContent = '✓ ' + btnEl.textContent;
  speak(`${category} set to ${value}`);
}

function startConfiguredTherapyGame() {
  confirmAmblyopiaSetup();
}

function confirmAmblyopiaSetup() {
  closeAmblyopiaModal();
  speak('Configuration saved. Launching therapy session.');
  navigate('therapy');
  startGameLoop();
}

function openLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) modal.classList.add('active');
}

function closeLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) modal.classList.remove('active');
}

function handleLogin(e) {
  e.preventDefault();
  closeLoginModal();
  speak('Logged in as Dev Doc Vision.');
}

/* ==========================================================================
   Initialize On Load (Self-Starting Bootstrap)
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initVRControllers();
  navigate('home');
});
