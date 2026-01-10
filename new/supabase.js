// Supabase Configuration
const SUPABASE_URL = 'https://tpskystunzgnbbgnrvnz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwc2t5c3R1bnpnbmJiZ25ydm56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNTkyMjMsImV4cCI6MjA4MzYzNTIyM30.wEekEB2PyUvGcFFZ_dQvB9Ny0C2cM1v7NdY9_AcsnBU';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global storage object - simplified version
const storage = {
    // Upload video to Supabase Storage
    async uploadVideo(file, title, onProgress) {
        console.log('Starting upload:', file.name);
        
        try {
            // Check file size (30MB limit)
            if (file.size > 30 * 1024 * 1024) {
                throw new Error('File size exceeds 30MB limit (max 30MB)');
            }

            // Check if it's a video file
            if (!file.type.startsWith('video/')) {
                throw new Error('Please select a video file (MP4, WebM, MOV, etc.)');
            }

            // Generate unique filename
            const fileExt = file.name.split('.').pop().toLowerCase();
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            const filePath = `public/${fileName}`;
            
            console.log('Uploading to Supabase Storage:', filePath);
            
            // Simulate progress updates
            if (onProgress) {
                setTimeout(() => onProgress(10), 100);
                setTimeout(() => onProgress(30), 300);
                setTimeout(() => onProgress(60), 600);
                setTimeout(() => onProgress(90), 900);
            }
            
            // Upload file to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('videos')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error('Storage upload error:', uploadError);
                throw new Error(`Upload failed: ${uploadError.message}`);
            }

            if (onProgress) {
                setTimeout(() => onProgress(100), 1000);
            }

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

            console.log('Saving metadata to database...');
            
            // Insert into videos table
            const { data: dbData, error: dbError } = await supabase
                .from('videos')
                .insert([videoData])
                .select()
                .single();

            if (dbError) {
                console.error('Database error:', dbError);
                // Still return success if file uploaded but metadata failed
                return {
                    success: true,
                    video: { ...videoData, id: 'temp-id' },
                    publicUrl: urlData.publicUrl
                };
            }

            console.log('Upload complete!');
            
            return {
                success: true,
                video: dbData,
                publicUrl: urlData.publicUrl
            };

        } catch (error) {
            console.error('Upload error:', error);
            return {
                success: false,
                error: error.message || 'Unknown upload error'
            };
        }
    },

    // Get all videos from database
    async getAllVideos() {
        console.log('Fetching videos from Supabase...');
        
        try {
            const { data, error, count } = await supabase
                .from('videos')
                .select('*', { count: 'exact' })
                .order('uploaded_at', { ascending: false });

            if (error) {
                console.error('Database fetch error:', error);
                // Return empty array instead of failing
                return {
                    success: true,
                    videos: [],
                    count: 0
                };
            }

            console.log(`Found ${data?.length || 0} videos`);
            
            return {
                success: true,
                videos: data || [],
                count: count || 0
            };
            
        } catch (error) {
            console.error('Get videos error:', error);
            return {
                success: true, // Still return success with empty array
                videos: [],
                count: 0,
                error: error.message
            };
        }
    },

    // Test connection
    async testConnection() {
        try {
            const { data, error } = await supabase
                .from('videos')
                .select('count')
                .limit(1);
                
            if (error) {
                console.warn('Supabase test failed:', error.message);
                return { connected: false, error: error.message };
            }
            
            return { connected: true };
        } catch (error) {
            console.warn('Supabase test error:', error);
            return { connected: false, error: error.message };
        }
    }
};

// Test connection on load
window.addEventListener('load', async () => {
    const result = await storage.testConnection();
    if (result.connected) {
        console.log('✓ Connected to Supabase successfully');
    } else {
        console.warn('⚠ Supabase connection issue:', result.error);
    }
});

// Make storage available globally for debugging
window.supabaseStorage = storage;
window.supabaseClient = supabase;