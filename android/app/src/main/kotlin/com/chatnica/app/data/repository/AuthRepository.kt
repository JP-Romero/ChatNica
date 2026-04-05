package com.chatnica.app.data.repository

import com.chatnica.app.data.api.PocketBaseService
import com.chatnica.app.data.local.PreferencesManager
import com.chatnica.app.data.models.AuthRecord
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class AuthRepository(
    private val service: PocketBaseService,
    private val preferencesManager: PreferencesManager
) {
    suspend fun login(email: String, password: String): Result<AuthRecord> =
        service.authWithEmail(email, password).mapCatching { authResponse ->
            preferencesManager.saveToken(authResponse.token)
            preferencesManager.saveUserId(authResponse.record.id)
            preferencesManager.saveEmail(authResponse.record.email)
            preferencesManager.saveName(authResponse.record.name)
            preferencesManager.saveAvatar(authResponse.record.avatar)
            authResponse.record
        }

    suspend fun register(email: String, password: String, name: String): Result<AuthRecord> =
        service.createAccount(email, password, name).mapCatching { authResponse ->
            preferencesManager.saveToken(authResponse.token)
            preferencesManager.saveUserId(authResponse.record.id)
            preferencesManager.saveEmail(authResponse.record.email)
            preferencesManager.saveName(authResponse.record.name)
            preferencesManager.saveAvatar(authResponse.record.avatar)
            authResponse.record
        }

    suspend fun logout() {
        preferencesManager.clearAll()
    }

    fun isLoggedIn(): Flow<Boolean> =
        preferencesManager.token.map { !it.isNullOrBlank() }

    fun getCurrentUserId(): Flow<String?> =
        preferencesManager.userId
}
