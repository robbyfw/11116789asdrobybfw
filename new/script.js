// DOM Elements
const warningModal = document.getElementById('warningModal');
const mainApp = document.getElementById('mainApp');
const acceptBtn = document.getElementById('acceptBtn');
const declineBtn = document.getElementById('declineBtn');
const openUploadModal = document.getElementById('openUploadModal');
const uploadModal = document.getElementById('uploadModal');
const closeUploadModal = document.getElementById('closeUploadModal');
const cancelUpload = document.getElementById('cancelUpload');
const uploadArea = document.getElementById('uploadArea');
const videoInput = document.getElementById('videoInput');
const uploadBtn = document.getElementById('uploadBtn');
const videoTitle = document.getElementById('videoTitle');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const fileInfo = document.getElementById('fileInfo');
const videoGrid = document.getElementById('videoGrid');
const videoCount = document.getElementById('videoCount');
const videoModal = document.getElementById('videoModal');
const videoPlayer = document.getElementById('videoPlayer');
const closeVideoModal = document.getElementById('closeVideoModal');
const modalVideoTitle = document.getElementById('modalVideoTitle');
const modalUploadTime = document.getElementById('modalUploadTime');
const copyLinkBtn = document.getElementById('copyLinkBtn');

// State
let currentVideoFile = null;
let currentPlayingVideo = null;

// Warning Modal Logic
acceptBtn.addEventListener('click', () => {
    warningModal.style.display = 'none';
    mainApp.classList.remove('hidden');
    loadVideosFromSupabase();
});

declineBtn.addEventListener('click', () => {
    window.location.href = 'https://fwrobby.site';
});

// Upload Modal Logic
openUploadModal.addEventListener('click', () => {
    uploadModal.classList.remove('hidden');
    resetUploadUI();
});

closeUploadModal.addEventListener('click', () => {
    uploadModal.classList.add('hidden');
    resetUploadUI();
});

cancelUpload.addEventListener('click', () => {
    uploadModal.classList.add('hidden');
    resetUploadUI();
});

// File Upload Logic
uploadArea.addEventListener('click', () => {
    videoInput.click();
});

videoInput.addEventListener('change', (e) => {
    handleFileSelection(e.target.files[0]);
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#444';
    uploadArea.style.background = '#252525';
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#333';
    uploadArea.style.background = '#222';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#333';
    uploadArea.style.background = '#222';
    
    const file = e.dataTransfer.files[0];
    if (file) {
        handleFileSelection(file);
    }
});

function handleFileSelection(file) {
    if (!file) return;
    
    currentVideoFile = file;
    
    // Display file info
    fileInfo.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-file-video" style="color: #666;"></i>
            <div style="flex: 1;">
                <div style="color: #e0e0e0; margin-bottom: 0.2rem;">${file.name}</div>
                <div style="color: #666; font-size: 0.85rem;">
                    ${formatBytes(file.size)} • ${file.type}
                </div>
            </div>
            <button id="removeFileBtn" style="background: none; border: none; color: #666; cursor: pointer;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add remove file button event
    document.getElementById('removeFileBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        resetFileSelection();
    });
    
    // Enable upload button
    uploadBtn.disabled = false;
}

function resetFileSelection() {
    currentVideoFile = null;
    videoInput.value = '';
    fileInfo.innerHTML = '';
    uploadBtn.disabled = true;
}

// Real Upload to Supabase
uploadBtn.addEventListener('click', async () => {
    if (!currentVideoFile) return;
    
    // Disable upload button during upload
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    
    // Show progress
    uploadProgress.classList.remove('hidden');
    
    try {
        // Upload to Supabase
        const result = await storage.uploadVideo(
            currentVideoFile,
            videoTitle.value || '',
            (progress) => {
                progressFill.style.width = `${progress}%`;
                progressText.textContent = `${progress}%`;
            }
        );
        
        if (result.success) {
            showNotification('Video uploaded anonymously!', 'success');
            
            // Close upload modal
            uploadModal.classList.add('hidden');
            resetUploadUI();
            
            // Reload videos
            await loadVideosFromSupabase();
            
            // Auto-play the uploaded video
            playVideoInModal(result.video);
        } else {
            throw new Error(result.error || 'Upload failed');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showNotification(`Upload failed: ${error.message}`, 'error');
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Anonymously';
    }
});

function resetUploadUI() {
    resetFileSelection();
    videoTitle.value = '';
    uploadProgress.classList.add('hidden');
    progressFill.style.width = '0%';
    progressText.textContent = '0%';
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Anonymously';
}

// Load videos from Supabase
async function loadVideosFromSupabase() {
    console.log('Loading videos...');
    
    videoGrid.innerHTML = `
        <div class="loading" style="grid-column: 1/-1;">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading private videos...</p>
        </div>
    `;
    
    try {
        const result = await storage.getAllVideos();
        console.log('Load result:', result);
        
        if (result.success) {
            displayVideos(result.videos);
            videoCount.textContent = `${result.count || result.videos.length} videos`;
        } else {
            throw new Error(result.error || 'Failed to load videos');
        }
    } catch (error) {
        console.error('Load error:', error);
        videoGrid.innerHTML = `
            <div class="loading" style="grid-column: 1/-1;">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading videos: ${error.message}</p>
                <p style="font-size: 0.8rem; margin-top: 1rem; color: #666;">
                    Make sure you've run the SQL in Supabase SQL Editor
                </p>
            </div>
        `;
        videoCount.textContent = 'Error';
    }
}

function displayVideos(videos) {
    videoGrid.innerHTML = '';
    videoCount.textContent = `${videos.length} videos`;
    
    if (videos.length === 0) {
        videoGrid.innerHTML = `
            <div class="loading" style="grid-column: 1/-1;">
                <i class="fas fa-video-slash"></i>
                <p>No videos yet. Upload the first one!</p>
            </div>
        `;
        return;
    }
    
    videos.forEach(video => {
        const videoElement = createVideoCard(video);
        videoGrid.appendChild(videoElement);
    });
}

function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.dataset.id = video.id;
    
    const timeAgo = getTimeAgo(video.uploaded_at);
    
    card.innerHTML = `
        <div class="video-thumbnail">
            <i class="fas fa-play"></i>
        </div>
        <div class="video-info">
            <h3>${video.title}</h3>
            <div class="video-meta">
                <span><i class="fas fa-clock"></i> ${timeAgo}</span>
                <span><i class="fas fa-user-secret"></i> Anonymous</span>
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

// Video Player Modal Functions
function playVideoInModal(video) {
    try {
        // Set current playing video
        currentPlayingVideo = video;
        
        // Set video source
        videoPlayer.src = video.url;
        videoPlayer.load();
        
        // Update modal info
        modalVideoTitle.textContent = video.title;
        modalUploadTime.textContent = getTimeAgo(video.uploaded_at);
        
        // Update copy link button
        copyLinkBtn.onclick = () => copyVideoLink(video.url);
        
        // Show modal
        videoModal.classList.remove('hidden');
        
        // Play video
        videoPlayer.play().catch(e => {
            console.log('Autoplay prevented:', e);
            showNotification('Click the play button to start video', 'info');
        });
        
    } catch (error) {
        console.error('Play error:', error);
        showNotification('Failed to play video', 'error');
    }
}

function copyVideoLink(url) {
    navigator.clipboard.writeText(url)
        .then(() => {
            showNotification('Video link copied', 'success');
        })
        .catch(err => {
            console.error('Copy failed:', err);
            showNotification('Failed to copy link', 'error');
        });
}

closeVideoModal.addEventListener('click', () => {
    closeVideoPlayer();
});

videoModal.addEventListener('click', (e) => {
    if (e.target === videoModal) {
        closeVideoPlayer();
    }
});

function closeVideoPlayer() {
    videoModal.classList.add('hidden');
    videoPlayer.pause();
    videoPlayer.src = '';
    currentPlayingVideo = null;
}

// Utility Functions
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
    
    let interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + "mo ago";
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + "d ago";
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + "h ago";
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + "m ago";
    
    return "just now";
}

function showNotification(message, type = 'info') {
    const colors = {
        success: '#333',
        error: '#222',
        info: '#222'
    };
    
    const borderColors = {
        success: '#444',
        error: '#333',
        info: '#333'
    };
    
    const icon = {
        success: 'fa-check',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    }[type];
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: #e0e0e0;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        border: 1px solid ${borderColors[type]};
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.8rem;
        max-width: 400px;
        backdrop-filter: blur(10px);
    `;
    
    notification.innerHTML = `
        <i class="fas ${icon}" style="color: #666;"></i>
        <div>${message}</div>
    `;
    
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(el => el.remove());
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add notification styles
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(notificationStyle);

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Private Videos initialized');
});