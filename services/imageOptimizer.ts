export const getOptimizedImageUrl = (url: string | undefined, type: 'thumb' | 'full'): string => {
  if (!url) return '';

  // Handle Google Drive Links
  // Patterns: drive.google.com/file/d/ID/view, drive.google.com/open?id=ID
  const driveMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/) || url.match(/id=([a-zA-Z0-9-_]+)/);
  
  if (driveMatch && driveMatch[1]) {
    const id = driveMatch[1];
    if (type === 'thumb') {
      // Google Drive specific thumbnail endpoint (width 250px)
      return `https://drive.google.com/thumbnail?id=${id}&sz=w250`;
    } else {
      // Direct image link for full size (avoids the Google Drive viewer UI)
      return `https://drive.google.com/uc?export=view&id=${id}`;
    }
  }

  // Handle Google Photos / User Content (lh3.googleusercontent.com, etc)
  if (url.includes('googleusercontent.com')) {
    // These URLs usually end in =sXX or =wXX-hXX
    // We strip existing parameters and append our own
    const baseUrl = url.split('=')[0];
    if (type === 'thumb') {
      return `${baseUrl}=s250`; // 250px width
    } else {
      return `${baseUrl}=s1000`; // Max 1000px width/height
    }
  }

  // Fallback for other image hosts (Cloudinary, S3, etc.)
  // If we can't optimize via URL manipulation, we return the original
  return url;
};