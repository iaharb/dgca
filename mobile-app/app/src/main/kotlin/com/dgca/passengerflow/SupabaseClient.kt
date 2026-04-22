package com.dgca.passengerflow

import io.ktor.client.HttpClient
import io.ktor.client.engine.android.Android
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

object SupabaseClient {
    const val SUPABASE_URL = "https://mpntceewzcanqllajvnm.supabase.co"
    const val SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wbnRjZWV3emNhbnFsbGFqdm5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5OTAzNjksImV4cCI6MjA5MTU2NjM2OX0.Hj7E49_fn7Pc0LFJ6KCwDuLw-Y1ZiUGoT4TFGzqltnM"

    val httpClient = HttpClient(Android) {
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                coerceInputValues = true
                explicitNulls = false
            })
        }
    }
}
