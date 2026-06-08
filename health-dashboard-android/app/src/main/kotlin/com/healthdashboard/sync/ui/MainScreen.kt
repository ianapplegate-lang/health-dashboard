package com.healthdashboard.sync.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import com.healthdashboard.sync.data.SettingsRepo
import com.healthdashboard.sync.health.HealthReader
import com.healthdashboard.sync.net.Api
import com.healthdashboard.sync.work.SyncWorker
import kotlinx.coroutines.launch

@Composable
fun MainScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val repo = remember { SettingsRepo(context) }
    val settings by repo.flow.collectAsState(initial = com.healthdashboard.sync.data.Settings("", ""))

    var serverUrl by remember { mutableStateOf("") }
    var ingestToken by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("Ready") }
    var hasPermission by remember { mutableStateOf(false) }
    var sdkAvailable by remember { mutableStateOf(true) }

    LaunchedEffect(settings) {
        if (serverUrl.isEmpty()) serverUrl = settings.serverUrl
        if (ingestToken.isEmpty()) ingestToken = settings.ingestToken
    }

    LaunchedEffect(Unit) {
        sdkAvailable = HealthReader.availability(context) == HealthConnectClient.SDK_AVAILABLE
        if (sdkAvailable) {
            val granted = HealthReader.client(context).permissionController
                .getGrantedPermissions()
            hasPermission = granted.containsAll(HealthReader.PERMISSIONS)
        }
    }

    val permLauncher = rememberLauncherForActivityResult(
        contract = PermissionController.createRequestPermissionResultContract(),
    ) { granted -> hasPermission = granted.containsAll(HealthReader.PERMISSIONS) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Health Sync", style = androidx.compose.material3.MaterialTheme.typography.headlineSmall)

        if (!sdkAvailable) {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Health Connect not available on this device. Install/enable it via the Play Store.")
                }
            }
        }

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Server")
                OutlinedTextField(
                    value = serverUrl,
                    onValueChange = { serverUrl = it },
                    label = { Text("Base URL (e.g. https://yours.vercel.app)") },
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = ingestToken,
                    onValueChange = { ingestToken = it },
                    label = { Text("Ingest token") },
                    modifier = Modifier.fillMaxWidth(),
                )
                Button(onClick = {
                    scope.launch {
                        repo.update(serverUrl, ingestToken)
                        status = "Settings saved"
                    }
                }) { Text("Save settings") }
            }
        }

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Permissions: ${if (hasPermission) "Granted" else "Not granted"}")
                Button(
                    enabled = sdkAvailable,
                    onClick = { permLauncher.launch(HealthReader.PERMISSIONS) },
                ) { Text(if (hasPermission) "Re-check Health Connect permissions" else "Grant Health Connect permissions") }
            }
        }

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Button(
                    enabled = hasPermission && settings.isComplete,
                    onClick = {
                        scope.launch {
                            status = "Syncing…"
                            try {
                                val payload = HealthReader.readSince(context, days = 30)
                                val res = Api(settings.serverUrl, settings.ingestToken).ingest(payload)
                                status = if (res.ok)
                                    "OK — daily ${res.dailyUpserts}, sleep ${res.sleepUpserts}, workouts ${res.workoutUpserts}, clinical ${res.clinicalUpserts}"
                                else
                                    "Error: ${res.error ?: "unknown"}"
                            } catch (e: Exception) {
                                status = "Error: ${e.message}"
                            }
                        }
                    },
                ) { Text("Sync now") }

                Button(onClick = {
                    SyncWorker.schedule(context)
                    status = "Scheduled background sync (every ~6h)"
                }) { Text("Enable background sync") }

                Text("Status: $status", fontFamily = FontFamily.Monospace)
            }
        }
    }
}
