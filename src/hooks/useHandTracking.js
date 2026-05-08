import { useState, useEffect, useRef } from 'react';
import { FilesetResolver, HandLandmarker, ImageSegmenter } from '@mediapipe/tasks-vision';

export const useHandTracking = (videoRef) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const landmarkerRef = useRef(null);
  const segmenterRef = useRef(null);

  useEffect(() => {
    let active = true;

    const initModels = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        const landmarkerPromise = HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.6,
          minHandPresenceConfidence: 0.6,
          minTrackingConfidence: 0.6
        });

        const segmenterPromise = ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-tasks/image_segmenter/selfie_segmentation.tflite",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          outputCategoryMask: false,
          outputConfidenceMasks: true
        });

        const [landmarker, segmenter] = await Promise.all([landmarkerPromise, segmenterPromise]);

        if (active) {
          landmarkerRef.current = landmarker;
          segmenterRef.current = segmenter;
          window.currentSegmenter = segmenter;
          setIsLoaded(true);
        }
      } catch (err) {
        console.error("Error initializing MediaPipe:", err);
        if (active) setError(err);
      }
    };

    initModels();

    return () => {
      active = false;
      if (landmarkerRef.current) landmarkerRef.current.close();
      if (segmenterRef.current) segmenterRef.current.close();
      window.currentSegmenter = null;
    };
  }, []);

  const detectHands = (timeInMs) => {
    if (!landmarkerRef.current || !videoRef.current || videoRef.current.readyState < 2) {
      return null;
    }
    return landmarkerRef.current.detectForVideo(videoRef.current, timeInMs);
  };

  return { isLoaded, error, detectHands };
};
