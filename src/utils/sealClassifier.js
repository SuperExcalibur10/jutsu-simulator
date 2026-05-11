const squaredDistance = (v1, v2) => {
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    const diff = v1[i] - v2[i];
    sum += diff * diff;
  }
  return sum;
};

// Flatten landmarks into a scale-invariant vector
export const extractFeatures = (handLandmarksArray) => {
  if (!handLandmarksArray || handLandmarksArray.length === 0) return null;

  let allFeatures = [];

  // Support up to 2 hands for complex seals
  for (let h = 0; h < Math.min(handLandmarksArray.length, 2); h++) {
    const landmarks = handLandmarksArray[h];
    if (!landmarks) continue;

    const wrist = landmarks[0];
    const middleBase = landmarks[9];
    
    const dx = wrist.x - middleBase.x;
    const dy = wrist.y - middleBase.y;
    const dz = wrist.z - middleBase.z;
    const scale = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

    for (let i = 1; i < 21; i++) {
      const pt = landmarks[i];
      allFeatures.push((pt.x - wrist.x) / scale);
      allFeatures.push((pt.y - wrist.y) / scale);
      allFeatures.push((pt.z - wrist.z) / scale);
    }
  }
  
  return allFeatures;
};

export const classifySeal = (currentFeatures, calibratedSeals, threshold = 0.45) => {
  if (!currentFeatures || Object.keys(calibratedSeals).length === 0) return null;

  let bestMatch = null;
  let minDistanceSq = Infinity;
  // Use squared threshold to avoid Math.sqrt on every frame
  const thresholdSq = threshold * threshold;

  for (const [sealName, savedFeatures] of Object.entries(calibratedSeals)) {
    if (!savedFeatures) continue;
    // Skip comparison if vector lengths don't match (e.g. calibrated with 1 hand, now 2)
    if (savedFeatures.length !== currentFeatures.length) continue;
    
    // Normalize squared distance by length
    const rawSq = squaredDistance(currentFeatures, savedFeatures);
    const distSq = rawSq / currentFeatures.length;
    
    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      bestMatch = sealName;
    }
  }

  return minDistanceSq < thresholdSq ? bestMatch : null;
};
