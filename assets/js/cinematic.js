/**
 * Cinematic Portfolio Interactive Engine
 * Apple-style fluid cursor, Before/After Slider, Lightbox & Video Previews
 */

(function () {
  "use strict";

  // Check prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --------------------------------------------------------------------------
     1. Custom Interactive Magnetic Cursor
     -------------------------------------------------------------------------- */
  const cursor = document.querySelector(".custom-cursor");
  if (cursor && !prefersReducedMotion && window.matchMedia("(pointer: fine)").matches) {
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;

    window.addEventListener("pointermove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    // Smooth RAF cursor follow with spring lerp
    function animateCursor() {
      cursorX += (mouseX - cursorX) * 0.18;
      cursorY += (mouseY - cursorY) * 0.18;
      cursor.style.left = `${cursorX}px`;
      cursor.style.top = `${cursorY}px`;
      requestAnimationFrame(animateCursor);
    }
    requestAnimationFrame(animateCursor);

    // Interactive Hover States
    document.querySelectorAll("a, button, .project-card, .slider-wrapper").forEach((el) => {
      el.addEventListener("pointerenter", () => {
        cursor.classList.add("cursor-hover");
        if (el.classList.contains("project-card") || el.dataset.video) {
          cursor.classList.add("cursor-play");
        }
      });
      el.addEventListener("pointerleave", () => {
        cursor.classList.remove("cursor-hover", "cursor-play");
      });
    });
  }

  /* --------------------------------------------------------------------------
     2. Interactive Before / After Split Slider
     -------------------------------------------------------------------------- */
  const sliderWrappers = document.querySelectorAll(".slider-wrapper");
  sliderWrappers.forEach((wrapper) => {
    const beforeLayer = wrapper.querySelector(".slider-before");
    const handle = wrapper.querySelector(".slider-handle");
    if (!beforeLayer || !handle) return;

    let isDragging = false;

    function updateSlider(clientX) {
      const rect = wrapper.getBoundingClientRect();
      let position = ((clientX - rect.left) / rect.width) * 100;
      position = Math.max(0, Math.min(100, position)); // clamp between 0% and 100%

      beforeLayer.style.width = `${position}%`;
      handle.style.left = `${position}%`;
    }

    wrapper.addEventListener("pointerdown", (e) => {
      isDragging = true;
      wrapper.setPointerCapture(e.pointerId);
      updateSlider(e.clientX);
    });

    wrapper.addEventListener("pointermove", (e) => {
      if (!isDragging) return;
      updateSlider(e.clientX);
    });

    wrapper.addEventListener("pointerup", (e) => {
      isDragging = false;
      wrapper.releasePointerCapture(e.pointerId);
    });
  });

  /* --------------------------------------------------------------------------
     3. Lightbox Video Player Modal
     -------------------------------------------------------------------------- */
  const modal = document.getElementById("cinemaModal");
  const modalPlayer = document.getElementById("modalVideoPlayer");
  const closeBtn = document.querySelector(".modal-close");

  function openVideoModal(videoSrc) {
    if (!modal || !modalPlayer) return;

    // Check if it's YouTube, Vimeo, or Local MP4
    if (videoSrc.includes("youtube.com") || videoSrc.includes("youtu.be")) {
      modalPlayer.innerHTML = `
        <iframe 
          src="${videoSrc}?autoplay=1&rel=0&modestbranding=1" 
          width="100%" 
          height="100%" 
          frameborder="0" 
          allow="autoplay; encrypted-media; fullscreen" 
          allowfullscreen>
        </iframe>`;
    } else {
      modalPlayer.innerHTML = `
        <video controls autoplay playsinline class="w-100 h-100 object-fit-cover" style="width:100%; height:100%; object-fit:cover;">
          <source src="${videoSrc}" type="video/mp4">
          Your browser does not support HTML5 video.
        </video>`;
    }

    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeVideoModal() {
    if (!modal || !modalPlayer) return;
    modal.classList.remove("active");
    modalPlayer.innerHTML = "";
    document.body.style.overflow = "";
  }

  if (closeBtn) closeBtn.addEventListener("click", closeVideoModal);
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeVideoModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && modal.classList.contains("active")) {
      closeVideoModal();
    }
  });

  // Attach trigger to buttons and project cards
  document.querySelectorAll("[data-video-modal]").forEach((trigger) => {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      const videoSrc = trigger.getAttribute("data-video-modal");
      if (videoSrc) openVideoModal(videoSrc);
    });
  });

  /* --------------------------------------------------------------------------
     4. Card Hover Video Preview Play / Pause
     -------------------------------------------------------------------------- */
  document.querySelectorAll(".card-media video").forEach((video) => {
    const parentCard = video.closest(".project-card");
    if (!parentCard) return;

    parentCard.addEventListener("pointerenter", () => {
      video.play().catch(() => { });
    });

    parentCard.addEventListener("pointerleave", () => {
      video.pause();
      video.currentTime = 0;
    });
  });

})();
