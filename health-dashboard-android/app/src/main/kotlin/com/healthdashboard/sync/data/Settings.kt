package com.healthdashboard.sync.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "settings")

private val SERVER_URL = stringPreferencesKey("server_url")
private val INGEST_TOKEN = stringPreferencesKey("ingest_token")

data class Settings(val serverUrl: String, val ingestToken: String) {
    val isComplete: Boolean
        get() = serverUrl.isNotBlank() && ingestToken.isNotBlank()
}

class SettingsRepo(private val context: Context) {
    val flow: Flow<Settings> = context.dataStore.data.map { p ->
        Settings(
            serverUrl = p[SERVER_URL].orEmpty(),
            ingestToken = p[INGEST_TOKEN].orEmpty(),
        )
    }

    suspend fun update(serverUrl: String, ingestToken: String) {
        context.dataStore.edit { p ->
            p[SERVER_URL] = serverUrl.trim().trimEnd('/')
            p[INGEST_TOKEN] = ingestToken.trim()
        }
    }
}
