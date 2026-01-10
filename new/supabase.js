// Supabase Configuration
const SUPABASE_URL = 'https://tpskystunzgnbbgnrvnz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwc2t5c3R1bnpnbmJiZ25ydm56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNTkyMjMsImV4cCI6MjA4MzYzNTIyM30.wEekEB2PyUvGcFFZ_dQvB9Ny0C2cM1v7NdY9_AcsnBU';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    // Upload video to Supabase Storage
    async uploadVideo(file, title, onProgress) {
        try {
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
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            const filePath = `public/${fileName}`;
            
            // Upload file to Supabase Storage
            const { data, error } = await supabase.storage
                .from('videos')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                    onUploadProgress: (progressEvent) => {
                        if (onProgress) {
                            const percent = Math.round(
                                (progressEvent.loaded / progressEvent.total) * 100
                            );
                            onProgress(percent);
                        }
                    }
                });

            if (error) throw error;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('videos')
                .getPublicUrl(filePath);

            // Save video metadata to database
            const videoData = {
                title: title || `Private Video ${Date.now()}`,
                filename: fileName,
                filepath: filePath,
                url: urlData.publicUrl,
                filesize: file.size,
                filetype: file.type,
                uploaded_at: new Date().toISOString()
            };

            // Insert into videos table
            const { data: dbData, error: dbError } = await supabase
                .from('videos')
                .insert([videoData])
                .select()
                .single();

            if (dbError) throw dbError;

            return {
                success: true,
                video: dbData,
                publicUrl: urlData.publicUrl
            };

        } catch (error) {
            console.error('Upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get all videos from database
    async getAllVideos() {
        try {
            const { data, error } = await supabase
                .from('videos')
                .select('*')
                .order('uploaded_at', { ascending: false });

            if (error) throw error;

            return {
                success: true,
                videos: data || []
            };
        } catch (error) {
            console.error('Fetch error:', error);
            return {
                success: false,
                videos: [],
                error: error.message
            };
        }
    }

    // Delete video (optional)
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