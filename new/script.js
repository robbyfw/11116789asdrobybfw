// Simulated database (Replace with Supabase later)
let videosDB = JSON.parse(localStorage.getItem('vidshare_videos') || '[]');
let currentVideoFile = null;

// DOM Elements
const warningModal = document.getElementById('warningModal');
const mainApp = document.getElementById('mainApp');
const acceptBtn = document.getElementById('acceptBtn');
const declineBtn = document.getElementById('declineBtn');
const uploadArea = document.getElementById('uploadArea');
const videoInput = document.getElementById('videoInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const uploadBtn = document.getElementById('uploadBtn');
const videoTitle = document.getElementById('videoTitle');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const videoGrid = document.getElementById('videoGrid');
const videoCount = document.getElementById('videoCount');
const videoModal = document.getElementById('videoModal');
const videoPlayer = document.getElementById('videoPlayer');
const closeModal = document.getElementById('closeModal');
const modalVideoTitle = document.getElementById('modalVideoTitle');
const modalUploadTime = document.getElementById('modalUploadTime');
const modalViewCount = document.getElementById('modalViewCount');
const copyLinkBtn = document.getElementById('copyLinkBtn');

// Warning Modal Logic
acceptBtn.addEventListener('click', () => {
    warningModal.style.display = 'none';
    mainApp.classList.remove('hidden');
    loadVideos();
});

declineBtn.addEventListener('click', () => {
    // Redirect to a safe site
    window.location.href = 'https://www.youtube.com';
});

// File Upload Logic
selectFileBtn.addEventListener('click', () => {
    videoInput.click();
});

videoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 100 * 1024 * 1024) { // 100MB limit
            alert('File too large! Maximum size is 100MB');
            return;
        }
        
        if (!file.type.startsWith('video/')) {
            alert('Please select a video file!');
            return;
        }
        
        currentVideoFile = file;
        uploadBtn.disabled = false;
        
        // Update UI
        uploadArea.innerHTML = `
            <i class="fas fa-file-video" style="color: #4CAF50;"></i>
            <h3>${file.name}</h3>
            <p>${formatBytes(file.size)} • ${file.type}</p>
            <button id="changeFileBtn" class="btn btn-upload">
                <i class="fas fa-exchange-alt"></i> Change Video
            </button>
        `;
        
        // Add change file button event
        document.getElementById('changeFileBtn').addEventListener('click', () => {
            videoInput.click();
        });
    }
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#45a049';
    uploadArea.style.background = 'rgba(76, 175, 80, 0.1)';
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#4CAF50';
    uploadArea.style.background = 'rgba(76, 175, 80, 0.05)';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#4CAF50';
    uploadArea.style.background = 'rgba(76, 175, 80, 0.05)';
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
        videoInput.files = e.dataTransfer.files;
        videoInput.dispatchEvent(new Event('change'));
    }
});

// Upload Simulation
uploadBtn.addEventListener('click', async () => {
    if (!currentVideoFile) return;
    
    // Show progress
    uploadProgress.classList.remove('hidden');
    
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        progressFill.style.width = `${i}%`;
        progressText.textContent = `${i}%`;
    }
    
    // Create video object
    const video = {
        id: generateId(),
        title: videoTitle.value || generateRandomTitle(),
        filename: currentVideoFile.name,
        size: currentVideoFile.size,
        type: currentVideoFile.type,
        uploadDate: new Date().toISOString(),
        views: 0,
        // In real app: upload to server and get URL
        // For demo: Create object URL
        url: URL.createObjectURL(currentVideoFile)
    };
    
    // Add to database
    videosDB.unshift(video);
    localStorage.setItem('vidshare_videos', JSON.stringify(videosDB));
    
    // Reset UI
    resetUploadUI();
    
    // Reload videos
    loadVideos();
    
    // Show success message
    showNotification('Video uploaded anonymously!');
});

// Load and Display Videos
function loadVideos() {
    videoGrid.innerHTML = '';
    videoCount.textContent = `${videosDB.length} videos`;
    
    if (videosDB.length === 0) {
        videoGrid.innerHTML = `
            <div class="loading" style="grid-column: 1/-1;">
                <i class="fas fa-video-slash"></i>
                <p>No videos yet. Be the first to upload!</p>
            </div>
        `;
        return;
    }
    
    videosDB.forEach(video => {
        const videoElement = createVideoCard(video);
        videoGrid.appendChild(videoElement);
    });
}

function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.dataset.id = video.id;
    
    const timeAgo = getTimeAgo(video.uploadDate);
    
    card.innerHTML = `
        <div class="video-thumbnail">
            <i class="fas fa-play"></i>
        </div>
        <div class="video-info">
            <h3>${video.title}</h3>
            <div class="video-meta">
                <span><i class="fas fa-clock"></i> ${timeAgo}</span>
                <span><i class="fas fa-eye"></i> ${video.views} views</span>
                <button class="btn-small play-btn">
                    <i class="fas fa-play"></i> Play
                </button>
            </div>
        </div>
    `;
    
    // Add click events
    const playBtn = card.querySelector('.play-btn');
    const thumbnail = card.querySelector('.video-thumbnail');
    
    const playVideo = () => {
        playVideoInModal(video);
    };
    
    playBtn.addEventListener('click', playVideo);
    thumbnail.addEventListener('click', playVideo);
    card.querySelector('h3').addEventListener('click', playVideo);
    
    return card;
}

// Video Modal Functions
function playVideoInModal(video) {
    // Update views
    video.views++;
    localStorage.setItem('vidshare_videos', JSON.stringify(videosDB));
    
    // Set video source
    videoPlayer.src = video.url;
    videoPlayer.load();
    
    // Update modal info
    modalVideoTitle.textContent = video.title;
    modalUploadTime.textContent = getTimeAgo(video.uploadDate);
    modalViewCount.textContent = video.views;
    
    // Show modal
    videoModal.classList.remove('hidden');
    
    // Play video
    videoPlayer.play().catch(e => console.log('Autoplay prevented:', e));
}

closeModal.addEventListener('click', () => {
    videoModal.classList.add('hidden');
    videoPlayer.pause();
    videoPlayer.src = '';
});

copyLinkBtn.addEventListener('click', () => {
    // In real app: Copy shareable URL
    // For demo: Copy current URL
    navigator.clipboard.writeText(window.location.href)
        .then(() => {
            const originalText = copyLinkBtn.innerHTML;
            copyLinkBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                copyLinkBtn.innerHTML = originalText;
            }, 2000);
        });
});

// Close modal on outside click
videoModal.addEventListener('click', (e) => {
    if (e.target === videoModal) {
        videoModal.classList.add('hidden');
        videoPlayer.pause();
        videoPlayer.src = '';
    }
});

// Utility Functions
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function generateRandomTitle() {
    const adjectives = ['Mysterious', 'Anonymous', 'Secret', 'Hidden', 'Unknown', 'Private', 'Covert'];
    const nouns = ['Footage', 'Recording', 'Video', 'Clip', 'Film', 'Tape', 'Reel'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${randomAdj} ${randomNoun} ${Math.floor(Math.random() * 1000)}`;
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + "y ago";
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + "mo ago";
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + "d ago";
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + "h ago";
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + "m ago";
    
    return "just now";
}

function resetUploadUI() {
    currentVideoFile = null;
    uploadBtn.disabled = true;
    videoTitle.value = '';
    uploadProgress.classList.add('hidden');
    progressFill.style.width = '0%';
    progressText.textContent = '0%';
    
    uploadArea.innerHTML = `
        <i class="fas fa-cloud-upload-alt"></i>
        <h3>Drop video here or click to upload</h3>
        <p>MP4, WebM, or MOV up to 100MB</p>
        <button id="selectFileBtn" class="btn btn-upload">
            <i class="fas fa-file-video"></i> Select Video
        </button>
    `;
    
    // Reattach event listener
    document.getElementById('selectFileBtn').addEventListener('click', () => {
        videoInput.click();
    });
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i> ${message}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize with some demo videos
function initializeDemoVideos() {
    if (videosDB.length === 0) {
        const demoVideos = [
            {
                id: 'demo1',
                title: 'Welcome to VidShare',
                filename: 'welcome.mp4',
                size: 5242880,
                type: 'video/mp4',
                uploadDate: new Date(Date.now() - 3600000).toISOString(),
                views: 42,
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
            },
            {
                id: 'demo2',
                title: 'Anonymous Test Clip',
                filename: 'test.mp4',
                size: 10485760,
                type: 'video/mp4',
                uploadDate: new Date(Date.now() - 7200000).toISOString(),
                views: 18,
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
            }
        ];
        
        videosDB = demoVideos;
        localStorage.setItem('vidshare_videos', JSON.stringify(videosDB));
    }
}

// Initialize
initializeDemoVideos();

// Prevent right-click (optional, adds to the mysterious vibe)
document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.video-card') || e.target.closest('.video-player-container')) {
        e.preventDefault();
        showNotification('Right-click disabled for anonymous content');
    }
});