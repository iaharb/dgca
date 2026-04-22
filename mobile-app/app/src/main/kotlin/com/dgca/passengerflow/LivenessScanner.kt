package com.dgca.passengerflow

import android.util.Log
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import com.google.mlkit.vision.face.Face
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import java.util.concurrent.Executors

@Composable
fun LivenessScanner(
    onScanComplete: (Face) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val cameraProviderFuture = remember { ProcessCameraProvider.getInstance(context) }
    
    // Randomize challenge on entry
    val currentChallenge = remember { LivenessChallenge.entries.toTypedArray().random() }
    var isSuccess by remember { mutableStateOf(false) }

    val challengeText = when (currentChallenge) {
        LivenessChallenge.BLINK -> "PLEASE BLINK"
        LivenessChallenge.SMILE -> "GIVE US A SMILE"
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(
            factory = { ctx ->
                val previewView = PreviewView(ctx)
                val executor = ContextCompat.getMainExecutor(ctx)
                cameraProviderFuture.addListener({
                    val cameraProvider = cameraProviderFuture.get()
                    val preview = Preview.Builder().build().also {
                        it.setSurfaceProvider(previewView.surfaceProvider)
                    }

                    val imageAnalysis = ImageAnalysis.Builder()
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build()
                        .also {
                            it.setAnalyzer(Executors.newSingleThreadExecutor(), LivenessAnalyzer(currentChallenge) { face ->
                                if (!isSuccess) {
                                    isSuccess = true
                                    onScanComplete(face)
                                }
                            })
                        }

                    try {
                        cameraProvider.unbindAll()
                        cameraProvider.bindToLifecycle(
                            lifecycleOwner,
                            CameraSelector.DEFAULT_FRONT_CAMERA, // Front camera for liveness
                            preview,
                            imageAnalysis
                        )
                    } catch (e: Exception) {
                        Log.e("LivenessScanner", "Binding failed", e)
                    }
                }, executor)
                previewView
            },
            modifier = Modifier.fillMaxSize()
        )

        LivenessOverlay(isSuccess)

        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 80.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = if (isSuccess) "VERIFIED" else challengeText,
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontWeight = FontWeight.Black,
                    color = if (isSuccess) Color.Green else Color.White,
                    letterSpacing = 2.sp
                )
            )
            if (!isSuccess) {
                Text(
                    text = "Ensure your face is within the circle",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        color = Color.White.copy(alpha = 0.7f)
                    )
                )
            }
        }
    }
}

@Composable
fun LivenessOverlay(isSuccess: Boolean) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseSize by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 10f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )

    Canvas(modifier = Modifier.fillMaxSize()) {
        val overlayColor = Color.Black.copy(alpha = 0.8f)
        val radius = size.width * 0.35f
        val center = Offset(size.width / 2, size.height * 0.45f)

        // Draw darkened background with a hole
        drawRect(color = overlayColor)
        drawCircle(
            color = Color.Transparent,
            radius = radius,
            center = center,
            blendMode = BlendMode.Clear
        )

        // Draw Circle border
        drawCircle(
            color = if (isSuccess) Color.Green else Color(0xFF2563EB),
            radius = radius + if (isSuccess) 0f else pulseSize.dp.toPx(),
            center = center,
            style = Stroke(width = 4.dp.toPx())
        )
    }
}
