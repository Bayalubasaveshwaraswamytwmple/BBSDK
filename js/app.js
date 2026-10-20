// Main Application Controller for Sri Bayalu Basaweshwara Swamy Devasthana Portal
document.addEventListener("DOMContentLoaded", () => {
  // Application State
  const state = {
    lang: localStorage.getItem("temple_lang") || "kn", // Default to Kannada as requested
    activeCategory: "all",
    activeCardId: null,
    activeSubcardId: null,
    isDiyaLit: true,
    isFlowerShowerActive: false,
    searchQuery: ""
  };

  // DOM Elements
  const loadingScreen = document.getElementById("loading-screen");
  const enterTempleBtn = document.getElementById("enter-temple-btn");
  const langToggleBtn = document.getElementById("lang-toggle-btn");
  const flowerShowerBtn = document.getElementById("flower-shower-btn");
  const ringBellBtn = document.getElementById("ring-bell-btn");
  const lightDiyaBtn = document.getElementById("light-diya-btn");
  const searchInput = document.getElementById("search-input");
  const cardsContainer = document.getElementById("cards-grid");
  const modalOverlay = document.getElementById("card-detail-modal");
  const modalContent = document.getElementById("modal-body-content");
  const modalCloseBtn = document.getElementById("modal-close-btn");
  const galleryGrid = document.getElementById("gallery-grid");
  const galleryFilterBtns = document.querySelectorAll(".gallery-filter-btn");
  const lightboxModal = document.getElementById("lightbox-modal");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const lightboxClose = document.getElementById("lightbox-close");
  const shareBtn = document.getElementById("share-btn");
  const bellIconHeader = document.getElementById("header-bell-icon");

  // -------------------------------------------------------------
  // 1. Loading Screen & Temple Entrance
  // -------------------------------------------------------------
  const dismissLoadingScreen = () => {
    if (!loadingScreen) return;
    templeAudio.playTempleBell();
    loadingScreen.classList.add("fade-out");
    setTimeout(() => {
      loadingScreen.style.display = "none";
      triggerFlowerShower(40); // Welcome flower shower
    }, 800);
  };

  if (enterTempleBtn) {
    enterTempleBtn.addEventListener("click", () => {
      templeAudio.init();
      dismissLoadingScreen();
    });
  }

  // Auto-dismiss loading screen after timeout if user doesn't click
  setTimeout(() => {
    if (loadingScreen && loadingScreen.style.display !== "none" && !loadingScreen.classList.contains("user-interacted")) {
      // Keep it ready for click, or user can tap anywhere
      loadingScreen.addEventListener("click", () => {
        dismissLoadingScreen();
      }, { once: true });
    }
  }, 1000);

  // -------------------------------------------------------------
  // 2. Language Switching Engine
  // -------------------------------------------------------------
  const setLanguage = (newLang) => {
    state.lang = newLang;
    localStorage.setItem("temple_lang", newLang);
    document.documentElement.lang = newLang;
    
    // Update active button text
    if (langToggleBtn) {
      langToggleBtn.innerHTML = `
        <i class="fa-solid fa-language"></i>
        <span>${templeData.ui.langBtn[state.lang]}</span>
      `;
    }

    // Update all static i18n texts
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      const translation = getNestedTranslation(templeData, key);
      if (translation && translation[state.lang]) {
        el.textContent = translation[state.lang];
      }
    });

    // Update placeholders
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      const key = el.getAttribute("data-i18n-placeholder");
      const translation = getNestedTranslation(templeData, key);
      if (translation && translation[state.lang]) {
        el.setAttribute("placeholder", translation[state.lang]);
      }
    });

    // Re-render dynamic components
    renderCards();
    renderGallery();

    // If modal is open, re-render its content
    if (state.activeCardId && modalOverlay.classList.contains("active")) {
      const card = templeData.cards.find(c => c.id === state.activeCardId);
      if (card) openCardModal(card);
    }
  };

  const getNestedTranslation = (obj, path) => {
    return path.split('.').reduce((prev, curr) => prev ? prev[curr] : null, obj);
  };

  if (langToggleBtn) {
    langToggleBtn.addEventListener("click", () => {
      const nextLang = state.lang === "kn" ? "en" : "kn";
      setLanguage(nextLang);
      templeAudio.playFlowerChime();
    });
  }

  // -------------------------------------------------------------
  // 3. Realistic Flower Shower Physics (HTML5 Canvas)
  // -------------------------------------------------------------
  const canvas = document.getElementById("flower-canvas");
  const ctx = canvas ? canvas.getContext("2d") : null;
  let particles = [];
  let animationFrameId = null;

  const resizeCanvas = () => {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  class FlowerPetal {
    constructor() {
      this.reset();
      this.y = Math.random() * -canvas.height; // start above screen
    }

    reset() {
      this.x = Math.random() * canvas.width;
      this.y = -20 - Math.random() * 50;
      this.size = 12 + Math.random() * 16;
      this.speedY = 1.8 + Math.random() * 2.5;
      this.speedX = Math.sin(Math.random() * Math.PI) * 1.5;
      this.angle = Math.random() * 360;
      this.spinSpeed = (Math.random() - 0.5) * 4;
      this.opacity = 0.85 + Math.random() * 0.15;
      this.wobble = Math.random() * Math.PI * 2;
      this.wobbleSpeed = 0.03 + Math.random() * 0.04;
      
      // Petal type: marigold orange, marigold yellow, jasmine white, bilva leaf, sacred red rose
      const types = ['marigold-orange', 'marigold-yellow', 'jasmine', 'bilva', 'rose'];
      this.type = types[Math.floor(Math.random() * types.length)];
    }

    update() {
      this.y += this.speedY;
      this.wobble += this.wobbleSpeed;
      this.x += Math.sin(this.wobble) * 1.2 + this.speedX * 0.3;
      this.angle += this.spinSpeed;

      if (this.y > canvas.height + 30) {
        if (state.isFlowerShowerActive) {
          this.reset();
        }
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate((this.angle * Math.PI) / 180);
      ctx.globalAlpha = this.opacity;

      switch(this.type) {
        case 'marigold-orange':
          ctx.fillStyle = '#ff6b08';
          this.drawPetalShape(this.size, this.size * 0.7);
          break;
        case 'marigold-yellow':
          ctx.fillStyle = '#ffc107';
          this.drawPetalShape(this.size, this.size * 0.75);
          break;
        case 'jasmine':
          ctx.fillStyle = '#fffdf0';
          this.drawStarJasmine(this.size * 0.6);
          break;
        case 'bilva':
          ctx.fillStyle = '#2d6a4f';
          this.drawBilvaLeaf(this.size * 0.8);
          break;
        case 'rose':
        default:
          ctx.fillStyle = '#d90429';
          this.drawRosePetal(this.size, this.size * 0.8);
          break;
      }
      ctx.restore();
    }

    drawPetalShape(w, h) {
      ctx.beginPath();
      ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    drawRosePetal(w, h) {
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.bezierCurveTo(w / 2, -h / 2, w / 2, h / 2, 0, h / 2);
      ctx.bezierCurveTo(-w / 2, h / 2, -w / 2, -h / 2, 0, -h / 2);
      ctx.fill();
    }

    drawStarJasmine(r) {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 2 * Math.PI) / 5;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      // pale golden center
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    drawBilvaLeaf(size) {
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.quadraticCurveTo(size * 0.6, 0, 0, size);
      ctx.quadraticCurveTo(-size * 0.6, 0, 0, -size);
      ctx.fill();
    }
  }

  const triggerFlowerShower = (count = 60) => {
    state.isFlowerShowerActive = true;
    templeAudio.playFlowerChime();

    // Create fresh batch of particles
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push(new FlowerPetal());
    }

    if (!animationFrameId) {
      animateFlowers();
    }

    // Auto-stop spawning after 6 seconds, let existing particles gracefully fall
    setTimeout(() => {
      state.isFlowerShowerActive = false;
    }, 6000);
  };

  const animateFlowers = () => {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      p.draw();

      if (p.y > canvas.height + 40 && !state.isFlowerShowerActive) {
        particles.splice(i, 1);
      }
    }

    if (particles.length > 0 || state.isFlowerShowerActive) {
      animationFrameId = requestAnimationFrame(animateFlowers);
    } else {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  let lastFlowerTrigger = 0;
  if (flowerShowerBtn) {
    flowerShowerBtn.addEventListener("click", () => {
      const now = Date.now();
      if (now - lastFlowerTrigger >= 1400) {
        lastFlowerTrigger = now;
        triggerFlowerShower(75);
      }
    });
  }

  // -------------------------------------------------------------
  // 4. Temple Bell & Diya Interactions
  // -------------------------------------------------------------
  if (ringBellBtn) {
    ringBellBtn.addEventListener("click", () => {
      templeAudio.playTempleBell();
      if (bellIconHeader) {
        bellIconHeader.classList.remove("swing-bell");
        void bellIconHeader.offsetWidth; // trigger reflow
        bellIconHeader.classList.add("swing-bell");
      }
    });
  }

  if (lightDiyaBtn) {
    lightDiyaBtn.addEventListener("click", () => {
      state.isDiyaLit = !state.isDiyaLit;
      document.body.classList.toggle("diya-glow", state.isDiyaLit);
      templeAudio.playFlowerChime();
      lightDiyaBtn.classList.toggle("active", state.isDiyaLit);
    });
  }

  // -------------------------------------------------------------
  // 5. Render 7 Cards & Subcards
  // -------------------------------------------------------------
  const renderCards = () => {
    if (!cardsContainer) return;
    cardsContainer.innerHTML = "";

    const query = state.searchQuery.toLowerCase().trim();

    templeData.cards.forEach(card => {
      // Check search match
      const cardTitle = card.title[state.lang].toLowerCase();
      const cardTagline = card.tagline[state.lang].toLowerCase();
      
      let matchesSearch = !query || cardTitle.includes(query) || cardTagline.includes(query);

      // Check subcard matches
      if (card.subcards) {
        const subMatch = card.subcards.some(sc => {
          const title = sc.title[state.lang].toLowerCase();
          const summary = sc.summary[state.lang].toLowerCase();
          const content = sc.content ? sc.content[state.lang].toLowerCase() : "";
          return title.includes(query) || summary.includes(query) || content.includes(query);
        });
        if (subMatch) matchesSearch = true;
      }

      if (!matchesSearch) return;

      const cardEl = document.createElement("article");
      cardEl.className = "temple-card";
      cardEl.id = `card-elem-${card.number}`;

      // Card Header
      const headerHTML = `
        <div class="card-top-bar">
          <span class="card-number-badge">
            <span class="kannada-num">${state.lang === 'kn' ? getKannadaNumber(card.number) : '#' + card.number}</span>
          </span>
          <div class="card-icon-wrap">
            <i class="fa-solid ${card.icon}"></i>
          </div>
        </div>
        <h3 class="card-title">${card.title[state.lang]}</h3>
        <p class="card-tagline">${card.tagline[state.lang]}</p>
      `;

      // Subcards Preview or Gallery Preview
      let bodyHTML = "";

      if (card.subcards && card.subcards.length > 0) {
        bodyHTML = `
          <div class="subcards-preview-list">
            ${card.subcards.map((sc, idx) => `
              <div class="subcard-item" onclick="window.openSubcard('${card.id}', '${sc.id}')">
                <div class="subcard-header">
                  <span class="subcard-badge">${sc.badge[state.lang]}</span>
                  <h4 class="subcard-title">${sc.title[state.lang]}</h4>
                </div>
                <p class="subcard-summary">${sc.summary[state.lang]}</p>
                <div class="subcard-action-row">
                  <span class="read-more-link">
                    ${state.lang === 'kn' ? 'ಸಂಪೂರ್ಣ ಓದಿ & ಆಲಿಸಿ' : 'Read Full Story & Listen'} 
                    <i class="fa-solid fa-arrow-right"></i>
                  </span>
                </div>
              </div>
            `).join("")}
          </div>
        `;
      } else if (card.galleryItems) {
        bodyHTML = `
          <div class="card-gallery-preview">
            <div class="gallery-thumb-grid">
              ${card.galleryItems.slice(0, 6).map(item => `
                <div class="thumb-wrap" onclick="window.openGalleryLightbox('${item.id}')">
                  <img src="${item.image}" alt="${item.title[state.lang]}" loading="lazy">
                  <span class="thumb-title">${item.title[state.lang]}</span>
                </div>
              `).join("")}
            </div>
            <button class="view-gallery-btn" onclick="window.scrollToGallery()">
              <i class="fa-solid fa-images"></i>
              <span>${state.lang === 'kn' ? 'ಎಲ್ಲಾ ೨೪ ಛಾಯಾಚಿತ್ರಗಳನ್ನು ವೀಕ್ಷಿಸಿ' : 'View All 24 Original Photos'}</span>
            </button>
          </div>
        `;
      }

      cardEl.innerHTML = headerHTML + bodyHTML;

      // Card action footer
      const footerBtn = document.createElement("div");
      footerBtn.className = "card-footer-action";
      footerBtn.innerHTML = `
        <button class="card-expand-btn" onclick="window.openCardModalById('${card.id}')">
          <i class="fa-solid fa-feather-pointed"></i>
          <span>${state.lang === 'kn' ? 'ವಿವರವಾದ ದರ್ಶನ ವೀಕ್ಷಿಸಿ' : 'Explore Detailed View'}</span>
        </button>
      `;
      cardEl.appendChild(footerBtn);

      cardsContainer.appendChild(cardEl);
    });
  };

  const getKannadaNumber = (num) => {
    const knDigits = ['೦', '೧', '೨', '೩', '೪', '೫', '೬', '೭', '೮', '೯'];
    return 'ಕಾರ್ಡ್ ' + num.toString().split('').map(d => knDigits[parseInt(d)]).join('');
  };

  // -------------------------------------------------------------
  // 6. Modal / Detail Drawer
  // -------------------------------------------------------------
  const openCardModal = (card, focusSubcardId = null) => {
    state.activeCardId = card.id;
    templeAudio.playFlowerChime();

    let contentHTML = `
      <div class="modal-card-header">
        <div class="modal-card-badge">
          <i class="fa-solid ${card.icon}"></i>
          <span>${state.lang === 'kn' ? getKannadaNumber(card.number) : 'CARD #' + card.number}</span>
        </div>
        <h2 class="modal-card-title">${card.title[state.lang]}</h2>
        <p class="modal-card-subtitle">${card.tagline[state.lang]}</p>
      </div>
    `;

    if (card.subcards) {
      contentHTML += `<div class="modal-subcards-wrapper">`;

      card.subcards.forEach((sc, idx) => {
        const isFocused = focusSubcardId === sc.id;
        contentHTML += `
          <div class="modal-subcard-box ${isFocused ? 'focused-subcard' : ''}" id="modal-${sc.id}">
            <div class="modal-subcard-top">
              <span class="subcard-pill">${sc.badge[state.lang]}</span>
              <h3 class="modal-subcard-heading">${sc.title[state.lang]}</h3>
            </div>
            
            <div class="modal-subcard-summary-box">
              <i class="fa-solid fa-quote-left quote-icon"></i>
              <p class="subcard-highlight">${sc.summary[state.lang]}</p>
            </div>

            ${sc.content ? `
              <div class="modal-subcard-narrative">
                <p>${sc.content[state.lang]}</p>
              </div>
            ` : ''}

            <!-- Sub-sub cards if any (like Card 5 Jatre) -->
            ${sc.subsubcards ? `
              <div class="sub-subcards-grid">
                ${sc.subsubcards.map(ssc => `
                  <div class="sub-subcard-card">
                    <h5 class="sub-subcard-title">
                      <i class="fa-solid fa-om sacred-symbol"></i>
                      ${ssc.title[state.lang]}
                    </h5>
                    <p class="sub-subcard-desc">${ssc.desc[state.lang]}</p>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <!-- Subcard audio listen button -->
            <div class="subcard-listen-bar">
              <button class="listen-story-btn" onclick="window.narrateSubcard('${card.id}', '${sc.id}')">
                <i class="fa-solid fa-volume-high"></i>
                <span>${templeData.ui.readAloud[state.lang]}</span>
              </button>
              <button class="stop-story-btn" onclick="window.stopNarration()" style="display:none;">
                <i class="fa-solid fa-stop"></i>
                <span>${templeData.ui.stopAudio[state.lang]}</span>
              </button>
            </div>
          </div>
        `;
      });

      contentHTML += `</div>`;
    } else if (card.galleryItems) {
      contentHTML += `
        <div class="modal-gallery-wrapper">
          <p class="modal-gallery-note">${state.lang === 'kn' ? 'ಚಿತ್ರದ ಮೇಲೆ ಕ್ಲಿಕ್ ಮಾಡಿ ಪೂರ್ಣ ಗಾತ್ರದಲ್ಲಿ ವೀಕ್ಷಿಸಿ:' : 'Click on any image to view in full resolution:'}</p>
          <div class="modal-gallery-grid">
            ${card.galleryItems.map(item => `
              <div class="modal-gal-item" onclick="window.openGalleryLightbox('${item.id}')">
                <img src="${item.image}" alt="${item.title[state.lang]}" loading="lazy">
                <div class="modal-gal-caption">
                  <h4>${item.title[state.lang]}</h4>
                  <p>${item.caption[state.lang]}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    modalContent.innerHTML = contentHTML;
    modalOverlay.classList.add("active");
    document.body.style.overflow = "hidden";

    // Scroll to focused subcard if specified
    if (focusSubcardId) {
      setTimeout(() => {
        const el = document.getElementById(`modal-${focusSubcardId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  };

  const closeModal = () => {
    modalOverlay.classList.remove("active");
    document.body.style.overflow = "";
    templeAudio.stopSpeech();
    state.activeCardId = null;
  };

  if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  // Window helper methods for inline click handlers
  window.openCardModalById = (cardId) => {
    const card = templeData.cards.find(c => c.id === cardId);
    if (card) openCardModal(card);
  };

  window.openSubcard = (cardId, subcardId) => {
    const card = templeData.cards.find(c => c.id === cardId);
    if (card) openCardModal(card, subcardId);
  };

  const buildStoryText = (sc, lang) => {
    let t = `${sc.title[lang] || ''}. ${sc.summary[lang] || ''}. `;
    if (sc.content && sc.content[lang]) {
      t += sc.content[lang];
    } else if (sc.subsubcards) {
      sc.subsubcards.forEach(ssc => {
        t += `${ssc.title[lang] || ''}. ${ssc.desc[lang] || ''}. `;
      });
    }
    return t;
  };

  window.narrateSubcard = (cardId, subcardId) => {
    const card = templeData.cards.find(c => c.id === cardId);
    if (!card) return;
    const sc = card.subcards.find(s => s.id === subcardId);
    if (!sc) return;

    const primaryText = buildStoryText(sc, state.lang);
    const fallbackText = buildStoryText(sc, state.lang === 'kn' ? 'en' : 'kn');

    const box = document.getElementById(`modal-${subcardId}`);
    const listenBtn = box ? box.querySelector(".listen-story-btn") : null;
    const stopBtn = box ? box.querySelector(".stop-story-btn") : null;

    if (listenBtn && stopBtn) {
      listenBtn.style.display = "none";
      stopBtn.style.display = "inline-flex";
    }

    templeAudio.speakText(primaryText, state.lang, () => {
      if (listenBtn && stopBtn) {
        listenBtn.style.display = "inline-flex";
        stopBtn.style.display = "none";
      }
    }, fallbackText);
  };

  window.stopNarration = () => {
    templeAudio.stopSpeech();
    document.querySelectorAll(".listen-story-btn").forEach(b => b.style.display = "inline-flex");
    document.querySelectorAll(".stop-story-btn").forEach(b => b.style.display = "none");
  };

  // -------------------------------------------------------------
  // Record Visitor Count (Increments on every temple portal visit)
  // -------------------------------------------------------------
  const recordVisitorHit = () => {
    try {
      const trackerImg = new Image();
      trackerImg.src = `https://visitor-badge.laobi.icu/badge?page_id=Bayalubasaveshwaraswamytwmple.BBSDK&t=${Date.now()}`;
    } catch (e) {
      console.warn("Visitor tracker:", e);
    }
  };
  recordVisitorHit();

  window.scrollToGallery = () => {
    closeModal();
    const galSection = document.getElementById("gallery-section");
    if (galSection) {
      galSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  // -------------------------------------------------------------
  // 7. Render Photo Gallery & Lightbox
  // -------------------------------------------------------------
  const renderGallery = () => {
    if (!galleryGrid) return;
    galleryGrid.innerHTML = "";

    const card7 = templeData.cards.find(c => c.id === "card-7");
    if (!card7 || !card7.galleryItems) return;

    const items = card7.galleryItems.filter(item => {
      if (state.activeCategory === "all") return true;
      return item.category === state.activeCategory;
    });

    items.forEach(item => {
      const el = document.createElement("div");
      el.className = "gallery-card";
      el.onclick = () => window.openGalleryLightbox(item.id);

      el.innerHTML = `
        <div class="gallery-img-wrapper">
          <img src="${item.image}" alt="${item.title[state.lang]}" loading="lazy">
          <div class="gallery-overlay">
            <span class="gallery-zoom-icon"><i class="fa-solid fa-magnifying-glass-plus"></i></span>
            <span class="gallery-cat-badge">${item.category.toUpperCase()}</span>
          </div>
        </div>
        <div class="gallery-info">
          <h4>${item.title[state.lang]}</h4>
          <p>${item.caption[state.lang]}</p>
        </div>
      `;

      galleryGrid.appendChild(el);
    });
  };

  galleryFilterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      galleryFilterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.activeCategory = btn.getAttribute("data-category");
      renderGallery();
    });
  });

  window.openGalleryLightbox = (itemId) => {
    const card7 = templeData.cards.find(c => c.id === "card-7");
    if (!card7) return;
    const item = card7.galleryItems.find(i => i.id === itemId);
    if (!item) return;

    lightboxImg.src = item.image;
    lightboxCaption.innerHTML = `
      <h3>${item.title[state.lang]}</h3>
      <p>${item.caption[state.lang]}</p>
    `;
    lightboxModal.classList.add("active");
    templeAudio.playFlowerChime();
  };

  const closeLightbox = () => {
    lightboxModal.classList.remove("active");
  };

  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightboxModal) {
    lightboxModal.addEventListener("click", (e) => {
      if (e.target === lightboxModal) closeLightbox();
    });
  }

  // -------------------------------------------------------------
  // 8. Cybersecurity Defense & Input Sanitization
  // -------------------------------------------------------------
  const sanitizeSearchInput = (inputStr) => {
    if (typeof inputStr !== "string") return "";
    // Strip all HTML tags, script syntax, quotes, and control chars to prevent XSS injection
    // Whitelist English alphanumeric, Unicode Kannada range (\u0C80-\u0CFF), and safe punctuation
    return inputStr
      .replace(/<[^>]*>/g, "")
      .replace(/[<>'";&`$\\]/g, "")
      .replace(/[^a-zA-Z0-9 \u0C80-\u0CFF\-_]/g, "")
      .slice(0, 80) // Limit max length against buffer/memory exhaustion attacks
      .trim();
  };

  if (searchInput) {
    let debounceTimer = null;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.searchQuery = sanitizeSearchInput(e.target.value);
        renderCards();
      }, 120);
    });
  }

  // Initialize Language & Renders
  setLanguage(state.lang);
  document.body.classList.add("diya-glow");
});
