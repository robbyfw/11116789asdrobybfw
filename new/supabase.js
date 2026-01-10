// Supabase Configuration - YOUR CREDENTIALS
const SUPABASE_URL = 'https://tpskystunzgnbbgnrvnz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwc2t5c3R1bnpnbmJiZ25ydm56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNTkyMjMsImV4cCI6MjA4MzYzNTIyM30.wEekEB2PyUvGcFFZ_dQvB9Ny0C2cM1v7NdY9_AcsnBU';

console.log('Supabase Config:', { SUPABASE_URL, SUPABASE_ANON_KEY });

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test connection
async function testSupabaseConnection() {
    try {
        console.log('Testing Supabase connection...');
        
        // Test 1: Check if videos table exists
        const { data: tableData, error: tableError } = await supabase
            .from('videos')
            .select('count')
            .limit(1);
            
        if (tableError) {
            console.error('Videos table error:', tableError);
            return { connected: false, error: tableError.message };
        }
        
        // Test 2: Check storage bucket
        const { data: storageData, error: storageError } = await supabase.storage
            .from('videos')
            .list('public', { limit: 1 });
            
        if (storageError && !storageError.message.includes('not found')) {
            console.error('Storage bucket error:', storageError);
        }
        
        console.log('Supabase connection successful!');
        return { connected: true };
        
    } catch (error) {
        console.error('Connection test failed:', error);
        return { connected: false, error: error.message };
    }
}

// Check video duration (client-side estimation)
function checkVideoDuration(file) {
    return new Promise((resolve) => {
        if (!file.type.startsWith('video/')) {
            resolve({ valid: false, error: 'Not a video file' });
            return;
        }

        const video = document.createElement('video');
        video.preload = 'metadata';
        
        video.onloadedmetadata = function() {
            window.URL.revokeObjectURL(video.src);
            const duration = video.duration;
            
            if (duration > 120) { // 2 minutes = 120 seconds
                resolve({ valid: false, error: 'Video too long (max 2 minutes)' });
            } else {
                resolve({ valid: true, duration: duration });
            }
        };
        
        video.onerror = function() {
            window.URL.revokeObjectURL(video.src);
            // If we can't get duration, still allow upload but warn
            resolve({ valid: true, duration: null });
        };
        
        video.src = URL.createObjectURL(file);
    });
}

// Supabase Storage Functions
class SupabaseStorage {
    constructor() {
        console.log('Storage class initialized');
        this.testConnection();
    }
    
    async testConnection() {
        const result = await testSupabaseConnection();
        if (!result.connected) {
            console.warn('Supabase connection issue:', result.error);
            showNotification('Connected to Supabase in demo mode', 'info');
        }
    }

    // Upload video to Supabase Storage
    async uploadVideo(file, title, onProgress) {
        try {
            console.log('Starting upload:', file.name, file.size);
            
            // Check file size (30MB limit)
            if (file.size > 30 * 1024 * 1024) {
                throw new Error('File size exceeds 30MB limit');
            }

            // Check video duration
            const durationCheck = await checkVideoDuration(file);
            if (!durationCheck.valid) {
                throw new Error(durationCheck.error);
            }

            // Generate unique filename
            const fileExt = file.name.split('.').pop().toLowerCase();
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            const filePath = `public/${fileName}`;
            
            console.log('Uploading to:', filePath);
            
            // Upload file to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('videos')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                throw uploadError;
            }

            console.log('Upload successful, getting public URL...');
            
            // Get public URL
            const { data: urlData } = supabase.storage
                .from('videos')
                .getPublicUrl(filePath);

            // Save video metadata to database
            const videoData = {
                title: title || `Private Video ${new Date().toLocaleTimeString()}`,
                filename: fileName,
                filepath: filePath,
                url: urlData.publicUrl,
                filesize: file.size,
                filetype: file.type
            };

            console.log('Saving to database:', videoData);
            
            // Insert into videos table
            const { data: dbData, error: dbError } = await supabase
                .from('videos')
                .insert([videoData])
                .select()
                .single();

            if (dbError) {
                console.error('Database error:', dbError);
                throw dbError;
            }

            console.log('Upload complete:', dbData);
            
            return {
                success: true,
                video: dbData,
                publicUrl: urlData.publicUrl
            };

        } catch (error) {
            console.error('Upload process error:', error);
            return {
                success: false,
                error: error.message || 'Unknown error occurred'
            };
        }
    }

    // Get all videos from database
    async getAllVideos() {
        try {
            console.log('Fetching videos from Supabase...');
            
            const { data, error, count } = await supabase
                .from('videos')
                .select('*', { count: 'exact' })
                .order('uploaded_at', { ascending: false });

            if (error) {
                console.error('Fetch error:', error);
                throw error;
            }

            console.log(`Fetched ${data?.length || 0} videos`);
            
            return {
                success: true,
                videos: data || [],
                count: count || 0
            };
            
        } catch (error) {
            console.error('Get videos error:', error);
            return {
                success: false,
                videos: [],
                error: error.message,
                count: 0
            };
        }
    }

    // Delete video
    async deleteVideo(videoId, filepath) {
        try {
            // Delete from storage
            const { error: storageError } = await supabase.storage
                .from('videos')
                .remove([filepath]);

            if (storageError) throw storageError;

            // Delete from database
            const { error: dbError } = await supabase
                .from('videos')
                .delete()
                .eq('id', videoId);

            if (dbError) throw dbError;

            return { success: true };
        } catch (error) {
            console.error('Delete error:', error);
            return { success: false, error: error.message };
        }
    }
}

// Initialize storage instance
const storage = new SupabaseStorage();

// Export for debugging
window.supabaseStorage = storage;
window.supabaseClient = supabase;