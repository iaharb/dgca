package com.dgca.passengerflow

import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceLandmark
import java.security.MessageDigest

object BiometricHasher {

    fun generateHash(face: Face): String {
        val landmarks = StringBuilder()
        
        // Use landmarks to build a unique feature string
        // Note: For production, we'd use normalized coordinates (0.0 to 1.0) 
        // relative to the bounding box to ensure distance-agnostic hashing.
        val bounds = face.boundingBox
        
        fun addLandmark(type: Int) {
            val landmark = face.getLandmark(type)
            if (landmark != null) {
                val normX = (landmark.position.x - bounds.left) / bounds.width()
                val normY = (landmark.position.y - bounds.top) / bounds.height()
                landmarks.append("%.3f,%.3f;".format(normX, normY))
            }
        }

        addLandmark(FaceLandmark.LEFT_EYE)
        addLandmark(FaceLandmark.RIGHT_EYE)
        addLandmark(FaceLandmark.NOSE_BASE)
        addLandmark(FaceLandmark.MOUTH_LEFT)
        addLandmark(FaceLandmark.MOUTH_RIGHT)
        addLandmark(FaceLandmark.MOUTH_BOTTOM)

        return hashString(landmarks.toString())
    }

    private fun hashString(input: String): String {
        return MessageDigest
            .getInstance("SHA-256")
            .digest(input.toByteArray())
            .fold("") { str, it -> str + "%02x".format(it) }
    }
}
