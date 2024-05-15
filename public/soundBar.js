class SoundBar 
{
    constructor(ambianceSound) 
    {
        this.ambianceSound = ambianceSound;
        this.MAX_GAIN = 100;
        this.PROGRESS = 5;
        this.isDragging = false;
        this.lastX = 0;
        this.stepSize = 5;
        this.lastInvocation = 0;
        this.moved = false;
        this.licenseRegex = /<a[^>]*href="https:\/\/creativecommons\.org\/[^>]*>([^<]*)<\/a>/i;
        this.soudPlayer = new AudioPlayer();
        this.soudPlayer.playSound("assets/ambiance/" +  this.ambianceSound.filename);
        this.soudPlayer.setLoop(true);
        this.soudPlayer.setVolume(0);

        this.progressBarContainer = document.createElement('div');
        this.progressBarContainer.className = 'progress-bar-container';
        this.progressBarContainer.setAttribute('style', 'background-image: url(assets/images/backgrounds/' +  this.ambianceSound.imageFile + ')');
        this.progressBarContainer.draggable = false;

        this.progressBar = document.createElement('div');
        this.progressBar.className = 'progress-bar';
        this.progressBar.id = 'progress-bar-' +  this.ambianceSound.filename;
        this.progressBar.draggable = false;
        this.progressBarContainer.appendChild( this.progressBar);

        this.license = this.extractLicense( this.ambianceSound.credit);
        this.soundBarText = document.createElement('div');
        this.soundBarText.textContent =  this.ambianceSound.display_name;
        this.soundBarText.className = 'sound-bar-text';
        this.soundBarText.draggable = false;

        this.soundLicense = document.createElement('div');
        this.soundLicense.textContent = this.license;
        this.soundLicense.className = 'sound-bar-licence';
        this.soundLicense.draggable = false;

        this.progressBarVolumeMinus = document.createElement('div');
        this. progressBarVolumeMinus.className = 'progress-bar-volume minus';
        this.progressBarVolumePlus = document.createElement('div');
        this.progressBarVolumePlus.className = 'progress-bar-volume plus';

        this.initializeTouchEvents(this.progressBarVolumeMinus);
        this.initializeTouchEvents(this.progressBarVolumePlus);

        this.progressBarContainer.appendChild(this.progressBarVolumeMinus);
        this.progressBarContainer.appendChild(this.progressBarVolumePlus);
        this.progressBarContainer.appendChild(this.soundBarText);
        if (this.license !== "")  this.progressBarContainer.appendChild(this.soundLicense);
        this.credit = this.ambianceSound.display_name + " : " +  this.ambianceSound.credit;
        this.initializeDraggableProgressBar();
    }

    getElement()
    {
        return this.progressBarContainer;
    }

    initializeTouchEvents(element) {
        element.addEventListener('touchstart', () => {
            element.classList.add('touch-hover');
        });

        element.addEventListener('touchend', () => {
            setTimeout(() => {
                element.classList.remove('touch-hover');
            }, 300);
        });
    }

    extractLicense(html) {
        const match = html.match(this.licenseRegex);
        return match ? match[1] : "";
    }

  initializeDraggableProgressBar() {
    const getPositionX = (event) => {
        return event.touches ? event.touches[0].clientX : event.clientX;
    };

    let intervalId = null; // To store the interval ID for continuous updates

    const startIncrementing = (direction, progressBar,  progressBarContainer) => {
        this.adjustProgress(direction, progressBar, progressBarContainer);
        intervalId = setInterval(() => {
            this.adjustProgress(direction, progressBar, progressBarContainer);
        }, 100); // Increment every 100ms
        createModal(this.credit); 
    };

    const stopIncrementing = () => {
        clearInterval(intervalId); // Stop the interval
        intervalId = null;
    };

    this.progressBarContainer.addEventListener('mousedown', (e) => {
        const positionX = getPositionX(e);
        const rect = this.progressBarContainer.getBoundingClientRect();
        const relativePosition = (positionX - rect.left) /  rect.width;
        const direction = relativePosition < 0.5? -this.PROGRESS : this.PROGRESS;
        startIncrementing(direction, this.progressBar, this.progressBarContainer);
    });

    this.progressBarContainer.addEventListener('mouseup', () => {
        stopIncrementing();
    });

    this.progressBarContainer.addEventListener('mouseleave', () => {
        stopIncrementing();
    });

    this.progressBarContainer.addEventListener('touchstart', (e) => {
        const positionX = getPositionX(e);
        const rect = this.progressBarContainer.getBoundingClientRect();
        const relativePosition = (positionX - rect.left) /  rect.width;
        const direction = relativePosition < 0.5? -this.PROGRESS : this.PROGRESS;
        startIncrementing(direction, this.progressBar, this.progressBarContainer);
        e.preventDefault();
    }, { passive: false });

    this.progressBarContainer.addEventListener('touchend', () => {
        stopIncrementing();
    });

    this.progressBarContainer.addEventListener('touchcancel', () => {
        stopIncrementing();
    });
}

    adjustProgress(adjustment, progressBar, progressBarContainer) {
        let currentProgress = parseInt(progressBar.style.width, 10) || 0;
        let newProgress = Math.min(this.MAX_GAIN, Math.max(0, currentProgress + adjustment));
        progressBar.style.width = newProgress + '%';

        const event = new CustomEvent('soundBarValueChanged');
        progressBarContainer.dispatchEvent(event);
        let volume = this.getVolume();
        this.soudPlayer.setVolume(volume);
        if(volume > 0)
            this.soudPlayer.play()
        else
            this.soudPlayer.pause()
    }

    getVolume() {
        const widthPercentage = this.progressBar.style.width || '0%';
        return parseFloat(widthPercentage) / this.MAX_GAIN;
    }
}