package com.dgca.passengerflow

import android.annotation.SuppressLint
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions

class TextRecognitionAnalyzer(
    private val onResult: (String, String, Map<String, String>) -> Unit // returns (ID, Name, Metadata)
) : ImageAnalysis.Analyzer {

    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    private val civilIdRegex = Regex("""\b\d{12}\b""")
    private val passportLine1Regex = Regex("""P<[A-Z]{3}[A-Z<]{10,}""") 
    private val passportLine2Regex = Regex("""[A-Z0-9<]{9}[0-9][A-Z]{3}[0-9]{6}[0-9][A-Z][0-9]{6}""")

    @SuppressLint("UnsafeOptInUsageError")
    override fun analyze(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage != null) {
            val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
            
            recognizer.process(image)
                .addOnSuccessListener { visionText ->
                    processText(visionText.text)
                }
                .addOnCompleteListener {
                    imageProxy.close()
                }
        } else {
            imageProxy.close()
        }
    }

    private fun processText(text: String) {
        val cleanText = text.replace(" ", "")
        val lines = text.split("\n").map { it.trim().replace(" ", "") }
        
        var detectedId = ""
        var detectedName = ""
        val metadata = mutableMapOf<String, String>()

        val m1 = passportLine1Regex.find(cleanText)
        val m2 = passportLine2Regex.find(cleanText)

        if (m1 != null) {
            detectedName = parseMrzName(m1.value)
            metadata["issuing_country"] = m1.value.substring(2, 5)
        }

        if (m2 != null) {
            val line2 = m2.value
            detectedId = line2.take(9).replace("<", "")
            
            // Standard ICAO MRZ Slicing
            if (line2.length >= 27) {
                metadata["nationality"] = line2.substring(10, 13)
                metadata["dob"] = line2.substring(13, 19) // YYMMDD
                metadata["sex"] = line2.substring(20, 21)
                metadata["expiry"] = line2.substring(21, 27) // YYMMDD
            }
        }

        // Fallbacks
        if (detectedId.isEmpty() || detectedName.isEmpty()) {
            for (line in lines) {
                if (line.contains("P<") && detectedName.isEmpty()) {
                    detectedName = parseMrzName(line.substring(line.indexOf("P<")))
                }
                if (line.length in 8..15 && line.any { it.isDigit() } && line.any { it.isLetter() } && detectedId.isEmpty()) {
                    detectedId = line.take(9).replace("<", "")
                }
            }
        }

        if (detectedId.isEmpty()) {
            val idMatch = civilIdRegex.find(cleanText)
            if (idMatch != null) {
                detectedId = idMatch.value
                detectedName = parseHeuristicName(text)
                metadata["document_type"] = "CIVIL_ID"
            }
        } else {
            metadata["document_type"] = "PASSPORT"
        }

        if (detectedId.isNotEmpty() && detectedName.isNotEmpty()) {
            onResult(detectedId, detectedName, metadata)
        }
    }

    private fun parseMrzName(line: String): String {
        val pIndex = line.indexOf("P<")
        if (pIndex == -1 || line.length < pIndex + 5) return "Unknown Name"
        
        return line.substring(pIndex + 5)
            .replace("<<", " ")
            .replace("<", " ")
            .replace(Regex("\\s+"), " ")
            .trim()
    }

    private fun parseHeuristicName(text: String): String {
        val lines = text.split("\n")
        for (line in lines) {
            if (line.length > 5 && !line.any { it.isDigit() } && line.all { it.isUpperCase() || it.isWhitespace() }) {
                return line.trim()
            }
        }
        return "Unknown Name"
    }
}
