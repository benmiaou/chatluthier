const soundBar = {
  isDragging: false,
  lastX: 0, // Last X position, used to calculate movement
  stepSize: 10, // Step size as a percentage
  lastInvocation: 0, // Time of the last function call
  
  createProgressBar: function (fileName) {
    const progressBarContainer = document.createElement('div');
    progressBarContainer.className = 'progress-bar-container';
    progressBarContainer.draggable = false;

    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.id = 'progress-bar-' + fileName;
    progressBar.draggable = false;
    progressBarContainer.appendChild(progressBar);

      // Add text inside the sound bar
      const soundBarText = document.createElement('div');
      const capitalizedFileName = fileName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');
      soundBarText.textContent =capitalizedFileName;
      soundBarText.className = 'sound-bar-text';
      soundBarText.draggable = false; // Disable dragging for the text


      const icon = document.createElement('img');
      icon.classList.add('icon');
      icon.setAttribute('src', 'assets/images/icons/'+fileName+'.svg');
      icon.setAttribute('alt', 'Icon for ' + fileName);
      icon.draggable = false; // Disable dragging for the icon


      progressBarContainer.appendChild(soundBarText);
      progressBarContainer.appendChild(icon);

    this.initializeDraggableProgressBar(progressBarContainer ,progressBar);

    return progressBarContainer;
  },

  initializeDraggableProgressBar: function (progressBarContainer, progressBar) {
    // Helper function to abstract getting cursor/touch position
    const getPositionX = (event) => {
        // Check if touch event, then get touch position, otherwise get mouse position
        return event.touches ? event.touches[0].clientX : event.clientX;
    };

    progressBarContainer.addEventListener('mousedown', (e) => {
        this.isDragging = true;
        this.lastX = getPositionX(e); // Use helper to get initial position
    });

    progressBarContainer.addEventListener('touchstart', (e) => {
        this.isDragging = true;
        this.lastX = getPositionX(e); // Use helper to get initial position
        e.preventDefault(); // Prevent scrolling when touching
    }, { passive: false });

    document.addEventListener('mouseup', () => {
        this.isDragging = false;
    });

    document.addEventListener('touchend', () => {
        this.isDragging = false;
    });

    progressBarContainer.addEventListener('mousemove', (e) => {
        if (this.isDragging) {
            const movementX = getPositionX(e) - this.lastX;
            if (Math.abs(movementX) >= progressBar.offsetWidth / 10) {
                this.setProgress(e, progressBar, movementX, progressBarContainer);
                this.lastX = getPositionX(e); // Update last position
            }
            e.preventDefault(); // Prevent scrolling when dragging
        }
    });

    progressBarContainer.addEventListener('touchmove', (e) => {
        if (this.isDragging) {
            const movementX = getPositionX(e) - this.lastX;
            if (Math.abs(movementX) >= progressBar.offsetWidth / 10) {
                this.setProgress(e, progressBar, movementX, progressBarContainer);
                this.lastX = getPositionX(e); // Update last position
            }
            e.preventDefault(); // Prevent scrolling when dragging
        }
    }, { passive: false });

    progressBarContainer.addEventListener('mouseleave', () => {
        this.isDragging = false;
    });

    progressBarContainer.addEventListener('touchcancel', () => {
        this.isDragging = false;
    });
},
  setProgress: function (e, progressBar, movementX, progressBarContainer) {
    if (!movementX) return; // Only run calculations if there is movement
    const now = Date.now();
    if (now - this.lastInvocation < 5) return; // Throttle updates to every 100ms
    this.lastInvocation  = now;
    const rect = progressBar.getBoundingClientRect();
    const totalWidth = rect.width;
    const currentProgress = parseInt(progressBar.style.width, 10) || 0;
    let newProgress = currentProgress + (movementX > 0 ? this.stepSize : -this.stepSize);
    newProgress = Math.min(100, Math.max(0, newProgress));
    progressBar.style.width = newProgress + '%'; // Clamp between 0 and 100
        // Dispatch custom event when value changes
    const event = new CustomEvent('soundBarValueChanged');
    progressBarContainer.dispatchEvent(event);
  },

  getVolumeFromProgressBar: function (progressBarContainer) {
    const progressBar = progressBarContainer.querySelector('.progress-bar');
    const widthPercentage = progressBar.style.width || '0%';
    return parseFloat(widthPercentage) / 100; // Convert the percentage string to a float
  }
};