package com.healthdashboard.sync.work

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.healthdashboard.sync.data.SettingsRepo
import com.healthdashboard.sync.health.HealthReader
import com.healthdashboard.sync.net.Api
import kotlinx.coroutines.flow.first
import java.util.concurrent.TimeUnit

class SyncWorker(appContext: Context, params: WorkerParameters) :
    CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val settings = SettingsRepo(applicationContext).flow.first()
        if (!settings.isComplete) return Result.failure()
        return try {
            val payload = HealthReader.readSince(applicationContext, days = 30)
            val res = Api(settings.serverUrl, settings.ingestToken).ingest(payload)
            if (res.ok) Result.success() else Result.retry()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    companion object {
        const val UNIQUE = "health-sync-daily"

        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = PeriodicWorkRequestBuilder<SyncWorker>(6, TimeUnit.HOURS)
                .setConstraints(constraints)
                .build()
            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(UNIQUE, ExistingPeriodicWorkPolicy.UPDATE, request)
        }
    }
}
