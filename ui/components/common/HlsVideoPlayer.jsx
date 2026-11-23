import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

export default function HlsVideoPlayer({ src, initialTime = 0, onTimeUpdate, onLoadedMetadata }) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const [levels, setLevels] = useState([])
  const [selectedLevel, setSelectedLevel] = useState(-1) // -1 = auto
  const initialTimeRef = useRef(initialTime)

  useEffect(() => { initialTimeRef.current = initialTime }, [initialTime])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    if (Hls.isSupported()) {
      const hls = new Hls()
      hlsRef.current = hls
      hls.loadSource(src)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const mapped = hls.levels
          .map((l, idx) => ({ idx, height: l.height || 0 }))
          .filter(l => l.height > 0)
          .sort((a, b) => b.height - a.height)
        setLevels(mapped)
      })
    } else {
      video.src = src
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [src])

  useEffect(() => {
    const hls = hlsRef.current
    if (!hls) return
    hls.currentLevel = selectedLevel
  }, [selectedLevel])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      const dur = video.duration
      if (dur && isFinite(dur)) onLoadedMetadata?.(dur)
      const t = initialTimeRef.current
      if (t > 5 && dur && t < dur - 2) video.currentTime = t
    }

    const handleTimeUpdate = () => {
      const dur = video.duration
      if (dur && isFinite(dur)) onTimeUpdate?.(video.currentTime, dur)
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    if (video.readyState >= 1) handleLoadedMetadata()

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [src, onTimeUpdate, onLoadedMetadata])

  return (
    <div className="video-player-wrap">
      <video ref={videoRef} controls playsInline />
      {levels.length > 0 && (
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 3 }}>
          <select
            className="form-control"
            value={selectedLevel}
            onChange={e => setSelectedLevel(parseInt(e.target.value, 10))}
            style={{ height: 34, padding: '4px 10px', fontSize: 12, minWidth: 96, background: 'rgba(15, 23, 42, 0.85)', color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}
          >
            <option value={-1}>Auto</option>
            {levels.map(l => (
              <option key={l.idx} value={l.idx}>{l.height}p</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
