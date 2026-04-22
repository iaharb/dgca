package com.dgca.passengerflow

import android.annotation.SuppressLint
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions

enum class LivenessChallenge {
    BLINK, SMILE
}

class LivenessAnalyzer(
    private val challenge: LivenessChallenge,
    private val onSuccess: (Face) -> Unit
) : ImageAnalysis.Analyzer {

    private val options = FaceDetectorOptions.Builder()
        .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
        .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
        .build()

    private val detector = FaceDetection.getClient(options)
    private var isCompleted = false

    @SuppressLint("UnsafeOptInUsageError")
    override fun analyze(imageProxy: ImageProxy) {
        if (isCompleted) {
            imageProxy.close()
            return
        }

        val mediaImage = imageProxy.image
        if (mediaImage != null) {
            val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
            
            detector.process(image)
                .addOnSuccessListener { faces ->
                    for (face in faces) {
                        when (challenge) {
                            LivenessChallenge.BLINK -> {
                                val leftEye = face.leftEyeOpenProbability ?: 1.0f
                                val rightEye = face.rightEyeOpenProbability ?: 1.0f
                                if (leftEye < 0.2f && rightEye < 0.2f) {
                                    onChallengeSuccess(face)
                                }
                            }
                            LivenessChallenge.SMILE -> {
                                val smile = face.smilingProbability ?: 0.0f
                                if (smile > 0.7f) {
                                    onChallengeSuccess(face)
                                }
                            }
                        }
                    }
                }
                .addOnCompleteListener {
                    imageProxy.close()
                }
        } else {
            imageProxy.close()
        }
    }

    private fun onChallengeSuccess(face: Face) {
        if (!isCompleted) {
            isCompleted = true
            onSuccess(face)
        }
    }
}
