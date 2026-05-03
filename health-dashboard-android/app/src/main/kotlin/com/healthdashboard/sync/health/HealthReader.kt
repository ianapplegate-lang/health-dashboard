package com.healthdashboard.sync.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.healthdashboard.sync.net.DailyMetric
import com.healthdashboard.sync.net.IngestPayload
import com.healthdashboard.sync.net.SleepEntry
import com.healthdashboard.sync.net.WorkoutEntry
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime
import kotlin.math.roundToInt

object HealthReader {
    val PERMISSIONS: Set<String> = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(RestingHeartRateRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
    )

    fun availability(context: Context): Int = HealthConnectClient.getSdkStatus(context)

    fun client(context: Context): HealthConnectClient = HealthConnectClient.getOrCreate(context)

    suspend fun readSince(
        context: Context,
        days: Int = 30,
    ): IngestPayload {
        val client = client(context)
        val zone = ZoneId.systemDefault()
        val today = LocalDate.now(zone)
        val start = today.minusDays(days.toLong()).atStartOfDay(zone).toInstant()
        val end = Instant.now()

        val daily = mutableListOf<DailyMetric>()
        for (i in 0..days) {
            val day = today.minusDays(i.toLong())
            val dayStart = day.atStartOfDay(zone).toInstant()
            val dayEnd = day.plusDays(1).atStartOfDay(zone).toInstant()
            daily.add(buildDaily(client, day, dayStart, dayEnd))
        }

        val sleep = readSleep(client, start, end, zone)
        val workouts = readWorkouts(client, start, end)

        return IngestPayload(daily = daily, sleep = sleep, workouts = workouts)
    }

    private suspend fun buildDaily(
        client: HealthConnectClient,
        date: LocalDate,
        start: Instant,
        end: Instant,
    ): DailyMetric {
        val steps = client.readRecords(
            ReadRecordsRequest(StepsRecord::class, TimeRangeFilter.between(start, end))
        ).records.sumOf { it.count }

        val cals = client.readRecords(
            ReadRecordsRequest(TotalCaloriesBurnedRecord::class, TimeRangeFilter.between(start, end))
        ).records.sumOf { it.energy.inKilocalories }

        val resting = client.readRecords(
            ReadRecordsRequest(RestingHeartRateRecord::class, TimeRangeFilter.between(start, end))
        ).records.map { it.beatsPerMinute.toDouble() }
            .takeIf { it.isNotEmpty() }
            ?.average()
            ?.roundToInt()

        return DailyMetric(
            date = date.toString(),
            steps = steps.toInt().takeIf { it > 0 },
            activeMinutes = null,
            restingHr = resting,
            caloriesOut = cals.takeIf { it > 0 }?.roundToInt(),
        )
    }

    private suspend fun readSleep(
        client: HealthConnectClient,
        start: Instant,
        end: Instant,
        zone: ZoneId,
    ): List<SleepEntry> {
        val sessions = client.readRecords(
            ReadRecordsRequest(SleepSessionRecord::class, TimeRangeFilter.between(start, end))
        ).records
        return sessions.map { s ->
            val date = ZonedDateTime.ofInstant(s.endTime, zone).toLocalDate().toString()
            val deep = s.stages.filter { it.stage == SleepSessionRecord.STAGE_TYPE_DEEP }
                .sumOf { java.time.Duration.between(it.startTime, it.endTime).seconds }.toInt()
            val rem = s.stages.filter { it.stage == SleepSessionRecord.STAGE_TYPE_REM }
                .sumOf { java.time.Duration.between(it.startTime, it.endTime).seconds }.toInt()
            val light = s.stages.filter { it.stage == SleepSessionRecord.STAGE_TYPE_LIGHT }
                .sumOf { java.time.Duration.between(it.startTime, it.endTime).seconds }.toInt()
            val awake = s.stages.filter { it.stage == SleepSessionRecord.STAGE_TYPE_AWAKE }
                .sumOf { java.time.Duration.between(it.startTime, it.endTime).seconds }.toInt()
            val durationSec = java.time.Duration.between(s.startTime, s.endTime).seconds.toInt()
            SleepEntry(
                date = date,
                startedAt = s.startTime.toString(),
                endedAt = s.endTime.toString(),
                durationSec = durationSec,
                deepSec = deep.takeIf { it > 0 },
                remSec = rem.takeIf { it > 0 },
                lightSec = light.takeIf { it > 0 },
                awakeSec = awake.takeIf { it > 0 },
            )
        }
    }

    private suspend fun readWorkouts(
        client: HealthConnectClient,
        start: Instant,
        end: Instant,
    ): List<WorkoutEntry> {
        val sessions = client.readRecords(
            ReadRecordsRequest(ExerciseSessionRecord::class, TimeRangeFilter.between(start, end))
        ).records
        return sessions.map { e ->
            val durationSec = java.time.Duration.between(e.startTime, e.endTime).seconds.toInt()
            WorkoutEntry(
                externalId = "hc-${e.metadata.id}",
                sport = exerciseLabel(e.exerciseType),
                startedAt = e.startTime.toString(),
                durationSec = durationSec,
                distanceM = null,
                avgHr = null,
                maxHr = null,
                calories = null,
                name = e.title,
            )
        }
    }

    private fun exerciseLabel(type: Int): String = when (type) {
        ExerciseSessionRecord.EXERCISE_TYPE_RUNNING -> "Run"
        ExerciseSessionRecord.EXERCISE_TYPE_BIKING -> "Ride"
        ExerciseSessionRecord.EXERCISE_TYPE_WALKING -> "Walk"
        ExerciseSessionRecord.EXERCISE_TYPE_HIKING -> "Hike"
        ExerciseSessionRecord.EXERCISE_TYPE_YOGA -> "Yoga"
        ExerciseSessionRecord.EXERCISE_TYPE_SOCCER -> "Soccer"
        ExerciseSessionRecord.EXERCISE_TYPE_SNOWBOARDING -> "Snowboard"
        ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING -> "Strength"
        else -> "Workout"
    }
}
