package com.healthdashboard.sync.net

import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.headers
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class DailyMetric(
    val date: String,
    val steps: Int? = null,
    val activeMinutes: Int? = null,
    val restingHr: Int? = null,
    val caloriesOut: Int? = null,
)

@Serializable
data class SleepEntry(
    val date: String,
    val startedAt: String,
    val endedAt: String,
    val durationSec: Int,
    val deepSec: Int? = null,
    val remSec: Int? = null,
    val lightSec: Int? = null,
    val awakeSec: Int? = null,
)

@Serializable
data class WorkoutEntry(
    val externalId: String,
    val sport: String,
    val startedAt: String,
    val durationSec: Int? = null,
    val distanceM: Double? = null,
    val avgHr: Int? = null,
    val maxHr: Int? = null,
    val calories: Int? = null,
    val name: String? = null,
)

@Serializable
data class IngestPayload(
    val daily: List<DailyMetric>,
    val sleep: List<SleepEntry>,
    val workouts: List<WorkoutEntry>,
)

@Serializable
data class IngestResult(
    val ok: Boolean = false,
    val dailyUpserts: Int = 0,
    val sleepUpserts: Int = 0,
    val workoutUpserts: Int = 0,
    val error: String? = null,
)

class Api(private val baseUrl: String, private val token: String) {
    private val client = HttpClient(CIO) {
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true; encodeDefaults = true })
        }
    }

    suspend fun ingest(payload: IngestPayload): IngestResult {
        val response = client.post("$baseUrl/api/ingest/health-connect") {
            headers { append(HttpHeaders.Authorization, "Bearer $token") }
            contentType(ContentType.Application.Json)
            setBody(payload)
        }
        if (!response.status.isSuccess()) {
            return IngestResult(ok = false, error = "HTTP ${response.status.value}: ${response.bodyAsText()}")
        }
        return Json { ignoreUnknownKeys = true }.decodeFromString(
            IngestResult.serializer(),
            response.bodyAsText(),
        )
    }
}
