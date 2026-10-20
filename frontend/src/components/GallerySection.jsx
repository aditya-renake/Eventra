import React, { useState } from 'react';
import { Image, ArrowLeft, Maximize2, X, Sparkles, ChevronRight, Layers } from 'lucide-react';

export const GallerySection = () => {
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [activePhoto, setActivePhoto] = useState(null);

  const albums = [
    {
      id: 'hs01',
      title: 'HackSeries 01 Edition',
      subtitle: 'Opening Ceremony & Ideation Phase',
      tag: 'FLAGSHIP',
      images: [
        '/gallery/1.jpeg',
        '/gallery/2.jpeg',
        '/gallery/3.jpeg',
        '/gallery/4.jpeg',
        '/gallery/5.jpeg',
        '/gallery/12.jpeg',
        '/gallery/13.jpeg',
        '/gallery/14.jpeg',
      ]
    },
    {
      id: 'hs01-hackathon',
      title: 'HackSeries 01 Hackathon',
      subtitle: 'Midnight Coding, Mentorship & Pitches',
      tag: '48H SPRINT',
      images: [
        '/gallery/9.jpeg',
        '/gallery/7.jpeg',
        '/gallery/8.jpeg',
        '/gallery/6.jpeg',
        '/gallery/10.jpeg',
        '/gallery/11.jpeg',
      ]
    },
    {
      id: 'git-session',
      title: 'Git & GitHub Hands-on',
      subtitle: 'Collaborative Open Source Workshop',
      tag: 'WORKSHOP',
      images: [
        '/gallery/12.jpeg',
        '/gallery/13.jpeg',
      ]
    },
    {
      id: 'hs00-roadmap',
      title: 'HackSeries 00 Roadmap',
      subtitle: 'Technical Foundations & Keynote',
      tag: 'ORIENTATION',
      images: [
        '/gallery/14.jpeg',
        '/gallery/15.jpeg',
        '/gallery/16.jpeg',
        '/gallery/17.jpeg',
        '/gallery/18.jpeg',
        '/gallery/19.jpeg',
      ]
    }
  ];

  return (
    <section id="gallery-section" style={{ margin: '0 0 70px 0', position: 'relative', zIndex: 1 }}>
      
      {/* Section Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(209, 165, 80, 0.12)', border: '1px solid rgba(209, 165, 80, 0.4)', borderRadius: '999px', padding: '4px 16px', fontSize: '11px', color: '#f7d070', fontWeight: '800', marginBottom: '10px', letterSpacing: '0.5px' }}>
          <Sparkles size={13} color="#d1a550" /> ARCHIVE & HIGHLIGHTS
        </div>
        <h2 style={{ fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.5px' }}>
          Event Gallery & Moments
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '600px', margin: '4px auto 0 auto' }}>
          Relive past editions of HackSeries at Dr. D. Y. Patil Institute of Technology. Select an album to explore photos.
        </p>
      </div>

      {/* Main Container */}
      <div className="glass-card" style={{ padding: '28px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        
        {/* If an album is selected, show back button and breadcrumb */}
        {selectedAlbum && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '16px' }}>
            <button
              onClick={() => setSelectedAlbum(null)}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(209, 165, 80, 0.3)' }}
            >
              <ArrowLeft size={15} color="#f7d070" /> Back to All Albums
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: '900', color: '#fff' }}>{selectedAlbum.title}</span>
              <span className="badge badge-gold">{selectedAlbum.images.length} Photos</span>
            </div>
          </div>
        )}

        {/* Album Overview Grid */}
        {!selectedAlbum ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {albums.map((album) => (
              <div
                key={album.id}
                onClick={() => setSelectedAlbum(album)}
                style={{
                  position: 'relative',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: '#0d111d',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                className="gallery-album-card"
              >
                <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden' }}>
                  <img
                    src={album.images[0]}
                    alt={album.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      transition: 'transform 0.5s ease',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(3,7,18,0.85) 100%)',
                    }}
                  />
                  <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                    <span className="badge badge-gold" style={{ fontSize: '10px', padding: '2px 8px' }}>
                      {album.tag}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>{album.title}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{album.subtitle}</p>
                  </div>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(209, 165, 80, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f7d070', flexShrink: 0 }}>
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Album Photos Grid */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {selectedAlbum.images.map((src, index) => (
              <div
                key={index}
                onClick={() => setActivePhoto(src)}
                style={{
                  position: 'relative',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  aspectRatio: '4/3',
                  cursor: 'pointer',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                }}
                className="gallery-photo-card"
              >
                <img
                  src={src}
                  alt={`${selectedAlbum.title} ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 0.4s ease',
                  }}
                />
                <div
                  className="photo-overlay"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(178, 43, 47, 0.25)',
                    opacity: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  <div style={{ background: '#1a1a1a', padding: '8px', borderRadius: '50%', color: '#ffffff' }}>
                    <Maximize2 size={16} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* High-Res Photo Lightbox Modal */}
      {activePhoto && (
        <div
          className="modal-overlay"
          onClick={() => setActivePhoto(null)}
          style={{ zIndex: 3000, background: 'rgba(0, 0, 0, 0.88)' }}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActivePhoto(null)}
              style={{
                position: 'absolute',
                top: '-42px',
                right: '0',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>
            <img
              src={activePhoto}
              alt="Expanded preview"
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            />
          </div>
        </div>
      )}

    </section>
  );
};
