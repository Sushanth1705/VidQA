import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom React Hook for embedding and controlling the YouTube IFrame Player.
 */
export const useYouTubePlayer = (containerId, videoId) => {
  const playerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  // Load YouTube IFrame API script once globally
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize or reinitialize player when container and videoId are available
  useEffect(() => {
    if (!videoId || !containerId) return;

    let isMounted = true;

    const initPlayer = () => {
      // Destroy existing instance if any
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying player:', e);
        }
      }

      setIsReady(false);
      setError(null);

      try {
        playerRef.current = new window.YT.Player(containerId, {
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (isMounted) setIsReady(true);
            },
            onError: (e) => {
              console.error('YouTube Player Error:', e.data);
              if (isMounted) setError(`YouTube player error code ${e.data}`);
            },
          },
        });
      } catch (err) {
        console.error('Failed to create YT.Player:', err);
        if (isMounted) setError('Failed to initialize YouTube player.');
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCallback === 'function') prevCallback();
        if (isMounted) initPlayer();
      };
    }

    return () => {
      isMounted = false;
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [containerId, videoId]);

  const seekTo = useCallback((seconds, allowSeekAhead = true) => {
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      try {
        playerRef.current.seekTo(seconds, allowSeekAhead);
        if (typeof playerRef.current.playVideo === 'function') {
          playerRef.current.playVideo();
        }
      } catch (err) {
        console.error('Error seeking video:', err);
      }
    } else {
      console.warn('YouTube player not ready for seekTo.');
    }
  }, []);

  const play = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
      playerRef.current.playVideo();
    }
  }, []);

  const pause = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
      playerRef.current.pauseVideo();
    }
  }, []);

  return { isReady, error, seekTo, play, pause };
};

export default useYouTubePlayer;
