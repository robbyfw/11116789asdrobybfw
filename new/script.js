// Fast DOM elements cache
let elements = {};
const elementIds = [
    'warningModal', 'mainApp', 'acceptBtn', 'declineBtn',
    'openUploadModal', 'uploadModal', 'closeUploadModal', 'cancelUpload',
    'uploadArea', 'videoInput', 'uploadBtn', 'videoTitle',
    'uploadProgress', 'progressFill', 'progressText', 'fileInfo',
    'videoGrid', 'videoCount', 'videoModal', 'videoPlayer',
    'closeVideoModal', 'modalVideoTitle', 'modalUploadTime', 'copyLinkBtn',
    'videoLoading'
];

// State
let currentVideoFile = null;
let currentPlayingVideo = null;
let isLoading = false;
let videoCache = new Map();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.time('App init');
    
    // Cache DOM elements
    elements = {};
    elementIds.forEach(id => {
        elements[id] = document.getElementById(id);
    });
    
    // Setup event listeners
    setupEventListeners();
    
    console.timeEnd('App init');
    console.log('App initialized');
});

// Event listeners setup
function setupEventListeners() {
    // Warning modal
    elements.acceptBtn?.addEventListener('click', handleAccept);
    elements.declineBtn?.addEventListener('click', () => {
        window.location.href = 'https://fwrobby.site';
    });
    
    // Upload modal
    elements.openUploadModal?.addEventListener('click', () => {
        showModal(elements.uploadModal);
        resetUploadUI();
    });
    
    elements.closeUploadModal?.addEventListener('click', () => {
        hideModal(elements.uploadModal);
        resetUploadUI();
    });
    
    elements.cancelUpload?.addEventListener('click', () => {
        hideModal(elements.uploadModal);
        resetUploadUI();
    });
    
    // File upload
    elements.uploadArea?.addEventListener('click', () => {
        elements.videoInput?.click();
    });
    
    elements.videoInput?.addEventListener('change', (e) => {
        handleFileSelection(e.target.files[0]);
    });
    
    // Drag and drop
    setupDragAndDrop();
    
    // Upload button
    elements.uploadBtn?.addEventListener('click', handleUpload);
    
    // Video player
    elements.closeVideoModal?.addEventListener('click', closeVideoPlayer);
    elements.videoModal?.addEventListener('click', (e) => {
        if (e.target === elements.videoModal) closeVideoPlayer();
    });
    
    elements.copyLinkBtn?.addEventListener('click', copyVideoLink);
    
    // Video player events for better UX
    elements.videoPlayer?.addEventListener('loadeddata', () => {
        hideLoading(elements.videoLoading);
    });
    
    elements.videoPlayer?.addEventListener('waiting', () => {
        showLoading(elements.videoLoading);
    });
    
    elements.videoPlayer?.addEventListener('playing', () => {
        hideLoading(elements.videoLoading);
    });
}

// Drag and drop setup
function setupDragAndDrop() {
    if (!elements.uploadArea) return;
    
    ['dragover', 'dragleave', 'drop'].forEach(eventName => {
        elements.uploadArea.addEventListener(eventName, (e) => {
            e.preventDefault();
        });
    });
    
    elements.uploadArea.addEventListener('dragover', () => {
        elements.uploadArea.style.borderColor = 'var(--accent-color)';
        elements.uploadArea.style.background = '#222';
    });
    
    elements.uploadArea.addEventListener('dragleave', () => {
        elements.uploadArea.style.borderColor = 'var(--border-color)';
        elements.uploadArea.style.background = 'var(--bg-tertiary)';
    });
    
    elements.uploadArea.addEventListener('drop', (e) => {
        elements.uploadArea.style.borderColor = 'var(--border-color)';
        elements.uploadArea.style.background = 'var(--bg-tertiary)';
        
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelection(file);
    });
}

// Handle accept button
async function handleAccept() {
    hideModal(elements.warningModal);
    showElement(elements.mainApp);
    
    // Load videos with skeleton
    elements.videoGrid.innerHTML = `
        <div class="video-card skeleton" style="height: 200px;"></div>
        <div class="video-card skeleton" style="height: 200px;"></div>
        <div class="video-card skeleton" style="height: 200px;"></div>
    `;
    
    try {
        await loadVideosFromSupabase();
    } catch (error) {
        console.error('Failed to load videos:', error);
        showNotification('Failed to load videos', 'error');
    }
}

// Handle file selection
function handleFileSelection(file) {
    if (!file) return;
    
    // Quick validation
    if (!file.type.startsWith('video/')) {
        showNotification('Please select a video file', 'error');
        return;
    }
    
    if (file.size > 30 * 1024 * 1024) {
        showNotification('File too large (max 30MB)', 'error');
        return;
    }
    
    currentVideoFile = file;
    
    // Update UI
    elements.fileInfo.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-check-circle" style="color: var(--success-color);"></i>
            <div style="flex: 1;">
                <div style="color: var(--text-primary); font-size: 14px; font-weight: 500;">
                    ${truncateText(file.name, 30)}
                </div>
                <div style="color: var(--text-secondary); font-size: 12px;">
                    ${formatBytes(file.size)}
                </div>
            </div>
            <button onclick="removeSelectedFile()" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    elements.uploadBtn.disabled = false;
}

// Remove selected file
window.removeSelectedFile = function() {
    currentVideoFile = null;
    elements.videoInput.value = '';
    elements.fileInfo.innerHTML = '';
    elements.uploadBtn.disabled = true;
};

// Handle upload
async function handleUpload() {
    if (!currentVideoFile || isLoading) return;
    
    isLoading = true;
    elements.uploadBtn.disabled = true;
    elements.uploadBtn.innerHTML = '<span class="spinner"></span> Uploading...';
    showElement(elements.uploadProgress);
    
    try {
        const storage = window.storage;
        if (!storage) throw new Error('Storage not available');
        
        const result = await storage.uploadVideo(
            currentVideoFile,
            elements.videoTitle.value || '',
            (progress) => {
                elements.progressFill.style.width = `${progress}%`;
                elements.progressText.textContent = `${progress}%`;
            }
        );
        
        if (result.success) {
            showNotification('Video uploaded!', 'success');
            hideModal(elements.uploadModal);
            resetUploadUI();
            
            // Invalidate cache and reload
            window._videoCache = null;
            await loadVideosFromSupabase();
            
            if (result.video) {
                await playVideoInModal(result.video);
            }
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Upload error:', error);
        showNotification(`Upload failed: ${error.message}`, 'error');
    } finally {
        isLoading = false;
        elements.uploadBtn.disabled = false;
        elements.uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload';
    }
}

// Reset upload UI
function resetUploadUI() {
    removeSelectedFile();
    elements.videoTitle.value = '';
    hideElement(elements.uploadProgress);
    elements.progressFill.style.width = '0%';
    elements.progressText.textContent = '0%';
}

// Load videos from Supabase
async function loadVideosFromSupabase() {
    if (isLoading) return;
    
    isLoading = true;
    elements.videoCount.textContent = 'Loading...';
    
    try {
        const storage = window.storage;
        if (!storage) throw new Error('Storage not available');
        
        const result = await storage.getAllVideos();
        
        if (result.success) {
            displayVideos(result.videos);
            elements.videoCount.textContent = `${result.count} videos`;
            videoCache.clear(); // Clear old cache
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Load error:', error);
        elements.videoGrid.innerHTML = `
            <div class="loading">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load videos</p>
            </div>
        `;
        elements.videoCount.textContent = 'Error';
    } finally {
        isLoading = false;
    }
}

// Display videos
function displayVideos(videos) {
    if (!videos || videos.length === 0) {
        elements.videoGrid.innerHTML = `
            <div class="loading">
                <i class="fas fa-video-slash"></i>
                <p>No videos yet. Upload the first one!</p>
            </div>
        `;
        return;
    }
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    videos.forEach(video => {
        const videoElement = createVideoCard(video);
        fragment.appendChild(videoElement);
        videoCache.set(video.id, video); // Cache video
    });
    
    elements.videoGrid.innerHTML = '';
    elements.videoGrid.appendChild(fragment);
}

// Create video card
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
            <h3>${truncateText(video.title, 40)}</h3>
            <div class="video-meta">
                <span><i class="fas fa-clock"></i> ${timeAgo}</span>
                <span><i class="fas fa-user-secret"></i> Anon</span>
                <button class="btn-small play-btn">
                    <i class="fas fa-play"></i> Play
                </button>
            </div>
        </div>
    `;
    
    // Add click events with debouncing
    const playVideo = debounce(() => playVideoInModal(video), 300);
    
    card.addEventListener('click', playVideo, { passive: true });
    card.querySelector('.play-btn').addEventListener('click', playVideo);
    
    return card;
}

// Play video in modal
async function playVideoInModal(video) {
    try {
        currentPlayingVideo = video;
        
        // Update UI immediately
        elements.modalVideoTitle.textContent = truncateText(video.title, 60);
        elements.modalUploadTime.textContent = getTimeAgo(video.uploaded_at);
        
        // Show modal with loading
        showModal(elements.videoModal);
        showLoading(elements.videoLoading);
        
        // Set video source with preload
        elements.videoPlayer.src = video.url;
        elements.videoPlayer.load();
        
        // Try to play
        const playPromise = elements.videoPlayer.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                // Autoplay prevented, video will play when user clicks
                hideLoading(elements.videoLoading);
            });
        }
        
    } catch (error) {
        console.error('Play error:', error);
        showNotification('Failed to play video', 'error');
        hideLoading(elements.videoLoading);
    }
}

// Copy video link
function copyVideoLink() {
    if (!currentPlayingVideo?.url) return;
    
    navigator.clipboard.writeText(currentPlayingVideo.url)
        .then(() => {
            showNotification('Link copied', 'success');
        })
        .catch(err => {
            console.error('Copy failed:', err);
            showNotification('Failed to copy', 'error');
        });
}

// Close video player
function closeVideoPlayer() {
    hideModal(elements.videoModal);
    if (elements.videoPlayer) {
        elements.videoPlayer.pause();
        elements.videoPlayer.src = '';
    }
    currentPlayingVideo = null;
}

// Utility functions
function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getTimeAgo(dateString) {
    if (!dateString) return "recently";
    
    try {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return "just now";
        if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
        if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
        if (seconds < 2592000) return Math.floor(seconds / 86400) + "d ago";
        return Math.floor(seconds / 2592000) + "mo ago";
    } catch {
        return "recently";
    }
}

function truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Modal helpers
function showModal(modal) {
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modal) {
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function showElement(element) {
    if (element) element.classList.remove('hidden');
}

function hideElement(element) {
    if (element) element.classList.add('hidden');
}

function showLoading(element) {
    if (element) {
        element.style.display = 'block';
        element.classList.add('skeleton');
    }
}

function hideLoading(element) {
    if (element) {
        element.style.display = 'none';
        element.classList.remove('skeleton');
    }
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <div>${message}</div>
    `;
    
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(el => el.remove());
    
    document.body.appendChild(notification);
    
    // Auto remove
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.2s ease';
            setTimeout(() => notification.remove(), 200);
        }
    }, 3000);
}

// Handle back button for modals
window.addEventListener('popstate', () => {
    if (!elements.videoModal.classList.contains('hidden')) {
        closeVideoPlayer();
    }
    if (!elements.uploadModal.classList.contains('hidden')) {
        hideModal(elements.uploadModal);
        resetUploadUI();
    }
});