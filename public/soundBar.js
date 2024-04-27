const soundBar = {
  MAX_GAIN : 100,
  PROGRESS : 10,
  isDragging: false,
  lastX: 0, // Last X position, used to calculate movement
  stepSize: 10, // Step size as a percentage
  lastInvocation: 0, // Time of the last function call
  moved : false,
  
  // Function to initialize touch events
initializeTouchEvents(element) {
    // Touchstart event to simulate hover on touch devices
    element.addEventListener('touchstart', () => {
        element.classList.add('touch-hover'); // Apply hover class on touch
    });

    // Touchend to reset the effect
    element.addEventListener('touchend', () => {
        setTimeout(() => {
            element.classList.remove('touch-hover'); // Remove hover class after touch ends
        }, 300); // Match the transition duration
    });
},

  createProgressBar: function (ambianceSounds) {
    const progressBarContainer = document.createElement('div');
    progressBarContainer.className = 'progress-bar-container';
    progressBarContainer.setAttribute('style', 'background-image: url(assets/images/backgrounds/'+ambianceSounds.imageFile+')');
    progressBarContainer.draggable = false;

    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.id = 'progress-bar-' + ambianceSounds.filename;
    progressBar.draggable = false;
    progressBarContainer.appendChild(progressBar);

    // Add text inside the sound bar
    const soundBarText = document.createElement('div');
    soundBarText.textContent =ambianceSounds.display_name;
    soundBarText.className = 'sound-bar-text';
    soundBarText.draggable = false; // Disable dragging for the text

    const progressBarVolumeMinus = document.createElement('div');
    progressBarVolumeMinus.className = 'progress-bar-volume minus';

    const progressBarVolumePlus = document.createElement('div');
    progressBarVolumePlus.className = 'progress-bar-volume plus';

       // Touchstart event to simulate hover on touch devices
       progressBarVolumeMinus.addEventListener('touchstart', () => {
        progressBarVolumeMinus.classList.add('touch-hover'); // Apply hover class on touch
    });

    // Use the common function to initialize touch events
    this.initializeTouchEvents(progressBarVolumeMinus);
    this.initializeTouchEvents(progressBarVolumePlus);


    progressBarContainer.appendChild(progressBarVolumeMinus);
    progressBarContainer.appendChild(progressBarVolumePlus);

    progressBarContainer.appendChild(soundBarText);
      
    this.initializeDraggableProgressBar(progressBarContainer ,progressBar);

    return progressBarContainer;
  },

  initializeDraggableProgressBar: function (progressBarContainer, progressBar) {
    const getPositionX = (event) => {
        return event.touches ? event.touches[0].clientX : event.clientX;
    };

    let intervalId = null; // To store the interval ID for continuous updates

    const startIncrementing = (direction, progressBar, progressBarContainer) => {
        this.adjustProgress(direction, progressBar, progressBarContainer);
        intervalId = setInterval(() => {
            this.adjustProgress(direction, progressBar, progressBarContainer);
        }, 100); // Increment every 100ms
    };

    const stopIncrementing = () => {
        clearInterval(intervalId); // Stop the interval
        intervalId = null;
    };

    progressBarContainer.addEventListener('mousedown', (e) => {
        const positionX = getPositionX(e);
        const rect = progressBarContainer.getBoundingClientRect();
        const relativePosition = (positionX - rect.left) /  rect.width;
        const direction = relativePosition < 0.5? -this.PROGRESS : this.PROGRESS;
        startIncrementing(direction, progressBar, progressBarContainer);
    });

    progressBarContainer.addEventListener('mouseup', () => {
        stopIncrementing();
    });

    progressBarContainer.addEventListener('mouseleave', () => {
        stopIncrementing();
    });

    progressBarContainer.addEventListener('touchstart', (e) => {
        const positionX = getPositionX(e);
        const rect = progressBarContainer.getBoundingClientRect();
        const relativePosition = (positionX - rect.left) /  rect.width;
        const direction = relativePosition < 0.5? -this.PROGRESS : this.PROGRESS;
        startIncrementing(direction, progressBar, progressBarContainer);
        e.preventDefault();
    }, { passive: false });

    progressBarContainer.addEventListener('touchend', () => {
        stopIncrementing();
    });

    progressBarContainer.addEventListener('touchcancel', () => {
        stopIncrementing();
    });
},

adjustProgress: function (adjustment, progressBar, progressBarContainer) {
    let currentProgress = parseInt(progressBar.style.width, 10) || 0;
    let newProgress = Math.min(this.MAX_GAIN, Math.max(0, currentProgress + adjustment));
    progressBar.style.width = newProgress + '%'; // Clamp between 0 and this.MAX_GAIN%

    const event = new CustomEvent('soundBarValueChanged');
    progressBarContainer.dispatchEvent(event); // Dispatch event when value changes
},


  getVolumeFromProgressBar: function (progressBarContainer) {
    const progressBar = progressBarContainer.querySelector('.progress-bar');
    const widthPercentage = progressBar.style.width || '0%';
    return parseFloat(widthPercentage) / this.MAX_GAIN; // Convert the percentage string to a float
  }
};