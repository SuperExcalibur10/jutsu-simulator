// Calculate Euclidean distance between two vectors
const euclideanDistance = (v1, v2) => {
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    sum += Math.pow(v1[i] - v2[i], 2);
  }
  return Math.sqrt(sum);
};

// Flatten landmarks into a scale-invariant vector
export const extractFeatures = (handLandmarksArray) => {
  if (!handLandmarksArray || handLandmarksArray.length === 0) return null;

  // Prendi solo la prima mano rilevata per supportare i sigilli a una mano
  const landmarks = handLandmarksArray[0];
  if (!landmarks) return null;

  let features = [];
  const wrist = landmarks[0];
  const middleBase = landmarks[9];
  
  const scale = Math.sqrt(
    Math.pow(wrist.x - middleBase.x, 2) + 
    Math.pow(wrist.y - middleBase.y, 2) + 
    Math.pow(wrist.z - middleBase.z, 2)
  ) || 1;

  for (let i = 1; i < 21; i++) {
    const pt = landmarks[i];
    features.push((pt.x - wrist.x) / scale);
    features.push((pt.y - wrist.y) / scale);
    features.push((pt.z - wrist.z) / scale);
  }
  
  return features;
};

export const classifySeal = (currentFeatures, calibratedSeals, threshold = 0.45) => {
  if (!currentFeatures || Object.keys(calibratedSeals).length === 0) return null;

  let bestMatch = null;
  let minDistance = Infinity;

  for (const [sealName, savedFeatures] of Object.entries(calibratedSeals)) {
    if (!savedFeatures) continue;
    // Skip comparison if vector lengths don't match (e.g. calibrated with 1 hand, now 2)
    if (savedFeatures.length !== currentFeatures.length) continue;
    // Normalize by sqrt(length) so threshold is independent of vector dimensionality
    const raw = euclideanDistance(currentFeatures, savedFeatures);
    const dist = raw / Math.sqrt(currentFeatures.length);
    if (dist < minDistance) {
      minDistance = dist;
      bestMatch = sealName;
    }
  }

  return minDistance < threshold ? bestMatch : null;
};
