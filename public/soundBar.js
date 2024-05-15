const soundBar = {
  MAX_GAIN : 100,
  PROGRESS : 5,
  isDragging: false,
  lastX: 0, // Last X position, used to calculate movement
  stepSize: 5, // Step size as a percentage
  lastInvocation: 0, // Time of the last function call
  moved : false,
  licenseRegex : /<a[^>]*href="https:\/\/creativecommons\.org\/[^>]*>([^<]*)<\/a>/i,
  
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

    // Function to extract the license type
    extractLicense:  function  (html) 
    {
        const match = html.match(this.licenseRegex);
        return match ? match[1] : "";
    },

  createProgressBar: function (ambianceSound) {
    const progressBarContainer = document.createElement('div');
    progressBarContainer.className = 'progress-bar-container';
    progressBarContainer.setAttribute('style', 'background-image: url(assets/images/backgrounds/'+ambianceSound.imageFile+')');
    progressBarContainer.draggable = false;

    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.id = 'progress-bar-' + ambianceSound.filename;
    progressBar.draggable = false;
    progressBarContainer.appendChild(progressBar);

    let licence = this.extractLicense(ambianceSound.credit);
    // Add text inside the sound bar
    const soundBarText = document.createElement('div');
    soundBarText.textContent =ambianceSound.display_name;
    soundBarText.className = 'sound-bar-text';
    soundBarText.draggable = false; // Disable dragging for the text

    // Add text inside the sound bar
    const soundLicence = document.createElement('div');
    soundLicence.textContent =licence;
    soundLicence.className = 'sound-bar-licence';
    soundLicence.draggable = false; // Disable dragging for the text

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
    if(licence !== "") progressBarContainer.appendChild(soundLicence);
    var credit = ambianceSound.display_name + " : " + ambianceSound.credit;
    this.initializeDraggableProgressBar(progressBarContainer ,progressBar, credit);
    return progressBarContainer;
  },

  initializeDraggableProgressBar: function (progressBarContainer, progressBar, credit) {
    const getPositionX = (event) => {
        return event.touches ? event.touches[0].clientX : event.clientX;
    };

    let intervalId = null; // To store the interval ID for continuous updates

    const startIncrementing = (direction, progressBar, progressBarContainer) => {
        this.adjustProgress(direction, progressBar, progressBarContainer);
        intervalId = setInterval(() => {
            this.adjustProgress(direction, progressBar, progressBarContainer);
        }, 100); // Increment every 100ms
        createModal(credit); 
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