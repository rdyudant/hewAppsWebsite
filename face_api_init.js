window.faceApiReady = false;
window.lastFaceResult = null;

document.addEventListener('DOMContentLoaded', async function () {
  // Tunggu face-api.js termuat (maks 10 detik)
  let waited = 0;
  while (typeof faceapi === 'undefined' && waited < 10000) {
    await new Promise((r) => setTimeout(r, 200));
    waited += 200;
  }

  if (typeof faceapi === 'undefined') {
    console.error('[HEW] face-api.js gagal dimuat.');
    return;
  }

  // Load model dari /models/
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    ]);
    window.faceApiReady = true;
    console.log('[HEW] face-api.js models loaded ✓');
  } catch (e) {
    console.error('[HEW] Gagal load models:', e);
  }
});

/**
 * Deteksi wajah dari elemen <video>.
 * @param {string} videoElementId - ID elemen video di DOM
 * @returns {Promise<Object>} hasil deteksi
 */
window.detectFaceFromVideo = async function (videoElementId = 'hewWebcam') {
  if (!window.faceApiReady) {
    return { error: 'not_ready' };
  }

  const video = document.getElementById(videoElementId);
  if (!video) {
    return { error: 'no_video' };
  }

  // Pastikan video sudah playing
  if (video.readyState < 2) {
    return { faceCount: 0 };
  }

  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.5,
  });

  let detections;
  try {
    detections = await faceapi
      .detectAllFaces(video, options)
      .withFaceLandmarks();
  } catch (e) {
    return { error: 'detect_error' };
  }

  if (!detections || detections.length === 0) {
    return { faceCount: 0 };
  }

  if (detections.length > 1) {
    return { faceCount: detections.length };
  }

  const d = detections[0];
  const box = d.detection.box;
  const videoWidth = video.videoWidth || 320;

  // Ukuran wajah relatif terhadap lebar video
  const faceRatio = box.width / videoWidth;

  // Landmark
  const landmarks = d.landmarks;
  const nosePoints = landmarks.getNose();
  const noseTip = nosePoints[3]; // titik ujung hidung
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();

  function centerOf(pts) {
    return {
      x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
      y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    };
  }

  const leftEyeCenter = centerOf(leftEye);
  const rightEyeCenter = centerOf(rightEye);

  // Roll angle dari garis mata (Z)
  const eyeDx = rightEyeCenter.x - leftEyeCenter.x;
  const eyeDy = rightEyeCenter.y - leftEyeCenter.y;
  const rollAngle = Math.abs(Math.atan2(eyeDy, eyeDx) * (180 / Math.PI));

  // Yaw estimate dari posisi hidung relatif tengah mata (Y)
  const eyeMidX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
  const eyeWidth = Math.abs(rightEyeCenter.x - leftEyeCenter.x);
  const noseOffset = eyeWidth > 0 ? (noseTip.x - eyeMidX) / eyeWidth : 0;
  const yawEstimate = Math.abs(noseOffset) * 60; // approx degrees

  // Eye Aspect Ratio (EAR) — makin kecil = mata makin tertutup
  function ear(eyePts) {
    if (eyePts.length < 6) return 0.3;
    const A = Math.hypot(eyePts[1].x - eyePts[5].x, eyePts[1].y - eyePts[5].y);
    const B = Math.hypot(eyePts[2].x - eyePts[4].x, eyePts[2].y - eyePts[4].y);
    const C = Math.hypot(eyePts[0].x - eyePts[3].x, eyePts[0].y - eyePts[3].y);
    return C > 0 ? (A + B) / (2.0 * C) : 0;
  }

  const leftEAR = ear(leftEye);
  const rightEAR = ear(rightEye);
  const avgEAR = (leftEAR + rightEAR) / 2;

  return {
    faceCount: 1,
    faceRatio: faceRatio,
    rollAngle: rollAngle,
    yawEstimate: yawEstimate,
    eyeAR: avgEAR,
    score: d.detection.score,
  };
};