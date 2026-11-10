// Restrict transforms to known image CDNs; preserve signed and arbitrary URLs.
export function imageUrl(source, width = 1200) {
  if (!source) return source;
  try {
    const url = new URL(source);
    if (url.hostname === 'images.unsplash.com') {
      url.searchParams.delete('auto');
      url.searchParams.set('fm', 'webp');
      url.searchParams.set('w', String(width));
      url.searchParams.set('fit', 'crop');
      url.searchParams.set('q', '75');
      return url.href;
    }
    if (url.hostname === 'res.cloudinary.com' && /\/image\/upload\/v\d+\//.test(url.pathname)) {
      url.pathname = url.pathname.replace('/image/upload/', `/image/upload/f_webp,q_auto,c_limit,w_${width}/`);
      return url.href;
    }
  } catch { /* Local paths and data URIs are already usable. */ }
  return source;
}
