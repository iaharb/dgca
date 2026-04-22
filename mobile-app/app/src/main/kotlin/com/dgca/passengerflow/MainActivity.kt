package com.dgca.passengerflow

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.mlkit.vision.face.Face

enum class EnrollmentStep {
    SCAN_DOCUMENT, LIVENESS_CHECK, COMPLETE
}

class MainActivity : ComponentActivity() {
    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                var currentStep by remember { mutableStateOf(EnrollmentStep.SCAN_DOCUMENT) }
                var detectedId by remember { mutableStateOf("") }
                var detectedName by remember { mutableStateOf("") }
                var detectedMetadata by remember { mutableStateOf(mapOf<String, String>()) }
                var biometricHash by remember { mutableStateOf("") }
                var showSheet by remember { mutableStateOf(false) }

                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    when (currentStep) {
                        EnrollmentStep.SCAN_DOCUMENT -> {
                            DocumentScanner(onScanComplete = { id, name, metadata ->
                                if (!showSheet) {
                                    detectedId = id
                                    detectedName = name
                                    detectedMetadata = metadata
                                    showSheet = true
                                }
                            })
                        }
                        EnrollmentStep.LIVENESS_CHECK -> {
                            LivenessScanner(onScanComplete = { face ->
                                biometricHash = BiometricHasher.generateHash(face)
                                currentStep = EnrollmentStep.COMPLETE
                            })
                        }
                        EnrollmentStep.COMPLETE -> {
                            var isSyncing by remember { mutableStateOf(true) }
                            var isSuccess by remember { mutableStateOf(false) }
                            val repository = remember { EnrollmentRepository() }

                            LaunchedEffect(Unit) {
                                isSuccess = repository.submitEnrollment(detectedName, detectedId, biometricHash, detectedMetadata)
                                isSyncing = false
                            }

                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                if (isSyncing) {
                                    CircularProgressIndicator(color = Color(0xFF2563EB))
                                } else {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text(
                                            text = if (isSuccess) "Enrollment Confirmed" else "Sync Failed",
                                            style = MaterialTheme.typography.headlineMedium.copy(
                                                fontWeight = FontWeight.Bold,
                                                color = if (isSuccess) Color(0xFF1E3A8A) else Color.Red
                                            )
                                        )
                                        Spacer(modifier = Modifier.height(16.dp))
                                        Button(onClick = { currentStep = EnrollmentStep.SCAN_DOCUMENT }) {
                                            Text(if (isSuccess) "DONE" else "RETRY")
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (showSheet && currentStep == EnrollmentStep.SCAN_DOCUMENT) {
                        ModalBottomSheet(
                            onDismissRequest = { showSheet = false },
                            sheetState = rememberModalBottomSheetState()
                        ) {
                            ScanResultScreen(
                                id = detectedId,
                                name = detectedName,
                                metadata = detectedMetadata,
                                onConfirm = {
                                    showSheet = false
                                    currentStep = EnrollmentStep.LIVENESS_CHECK
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ScanResultScreen(id: String, name: String, metadata: Map<String, String>, onConfirm: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp)
    ) {
        Text(
            text = "Verify Data",
            style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold)
        )
        Spacer(modifier = Modifier.height(16.dp))
        
        ResultField(label = "FULL NAME", value = name)
        ResultField(label = "CIVIL ID / PASSPORT", value = id)

        if (metadata.isNotEmpty()) {
            Row(modifier = Modifier.fillMaxWidth()) {
                Box(modifier = Modifier.weight(1f)) {
                    ResultField(label = "NATIONALITY", value = metadata["nationality"] ?: "---")
                }
                Spacer(modifier = Modifier.width(16.dp))
                Box(modifier = Modifier.weight(1f)) {
                    ResultField(label = "DATE OF BIRTH", value = metadata["dob"] ?: "---")
                }
            }
            ResultField(label = "EXPIRY DATE", value = metadata["expiry"] ?: "---")
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Button(
            onClick = onConfirm,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(8.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))
        ) {
            Text("PROCEED TO LIVENESS CHECK", color = Color.White)
        }
        Spacer(modifier = Modifier.height(32.dp))
    }
}

@Composable
fun ResultField(label: String, value: String) {
    Column(modifier = Modifier.padding(vertical = 8.dp)) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall.copy(
                color = Color.Gray,
                letterSpacing = 1.sp
            )
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyLarge.copy(
                fontWeight = FontWeight.Medium,
                color = Color(0xFF0F172A)
            )
        )
        Divider(modifier = Modifier.padding(top = 4.dp), thickness = 0.5.dp)
    }
}
