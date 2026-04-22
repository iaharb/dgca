package com.dgca.passengerflow

import android.util.Log
import io.ktor.client.call.body
import io.ktor.client.request.header
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.Serializable
import java.time.Instant

@Serializable
data class PassengerProfile(
    val id: String? = null,
    val full_name: String? = null,
    val document_number: String? = null,
    val document_type: String? = null,
    val nationality: String? = null,
    val date_of_birth: String? = null,
    val gender: String? = null
)

@Serializable
data class BiometricEnrollment(
    val full_name: String,
    val document_id: String,
    val biometric_hash: String,
    val passenger_id: String,
    val nationality: String? = null,
    val date_of_birth: String? = null,
    val gender: String? = null,
    val issuing_country: String? = null,
    val metadata: Map<String, String>,
    val enrolled_at: String
)

class EnrollmentRepository {
    
    suspend fun submitEnrollment(name: String, id: String, hash: String, metadata: Map<String, String>): Boolean {
        return try {
            val detectedType = metadata["document_type"] ?: "PASSPORT"
            val docType = if (detectedType == "CIVIL_ID" || detectedType == "PASSPORT") detectedType else "PASSPORT"
            
            val formattedDob = formatDob(metadata["dob"])

            // 1. Check if profile exists
            val profiles: List<PassengerProfile> = SupabaseClient.httpClient.get("${SupabaseClient.SUPABASE_URL}/rest/v1/passenger_profiles") {
                header("apikey", SupabaseClient.SUPABASE_KEY)
                header("Authorization", "Bearer ${SupabaseClient.SUPABASE_KEY}")
                url {
                    parameters.append("document_number", "eq.$id")
                    parameters.append("select", "*")
                }
            }.body()

            val passengerId = if (profiles.isNotEmpty()) {
                profiles[0].id!!
            } else {
                // Create new profile with full biographic data
                val newProfile = PassengerProfile(
                    full_name = name,
                    document_number = id,
                    document_type = docType,
                    nationality = metadata["nationality"],
                    date_of_birth = formattedDob,
                    gender = metadata["sex"]
                )
                val response = SupabaseClient.httpClient.post("${SupabaseClient.SUPABASE_URL}/rest/v1/passenger_profiles") {
                    header("apikey", SupabaseClient.SUPABASE_KEY)
                    header("Authorization", "Bearer ${SupabaseClient.SUPABASE_KEY}")
                    contentType(ContentType.Application.Json)
                    header("Prefer", "return=representation")
                    setBody(newProfile)
                }.body<List<PassengerProfile>>()
                response[0].id!!
            }

            // 2. Link biometric template to the profile with detailed columns
            val enrollment = BiometricEnrollment(
                full_name = name,
                document_id = id,
                biometric_hash = hash,
                passenger_id = passengerId,
                nationality = metadata["nationality"],
                date_of_birth = formatDob(metadata["dob"]), // Formats YYMMDD to YYYY-MM-DD
                gender = metadata["sex"],
                issuing_country = metadata["issuing_country"],
                metadata = metadata,
                enrolled_at = Instant.now().toString()
            )

            val enrollmentResponse = SupabaseClient.httpClient.post("${SupabaseClient.SUPABASE_URL}/rest/v1/biometric_enrollments") {
                header("apikey", SupabaseClient.SUPABASE_KEY)
                header("Authorization", "Bearer ${SupabaseClient.SUPABASE_KEY}")
                contentType(ContentType.Application.Json)
                header("Prefer", "return=minimal")
                setBody(enrollment)
            }
            
            enrollmentResponse.status.value in 200..299
        } catch (e: Exception) {
            Log.e("EnrollmentRepo", "Profile & Biometric sync failed: ${e.message}", e)
            false
        }
    }

    private fun formatDob(mrzDob: String?): String? {
        if (mrzDob == null || mrzDob.length != 6) return null
        val yearPart = mrzDob.take(2).toInt()
        val month = mrzDob.substring(2, 4)
        val day = mrzDob.substring(4, 6)
        
        // Pivot year calculation (standard ICAO logic)
        val currentYearShort = (Instant.now().toString().substring(2, 4).toInt())
        val century = if (yearPart > currentYearShort + 10) "19" else "20"
        
        return "$century$yearPart-$month-$day"
    }
}
