package com.chatnica.app.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "chatnica_prefs")

class PreferencesManager(private val context: Context) {

    companion object {
        val KEY_TOKEN = stringPreferencesKey("auth_token")
        val KEY_USER_ID = stringPreferencesKey("user_id")
        val KEY_EMAIL = stringPreferencesKey("user_email")
        val KEY_NAME = stringPreferencesKey("user_name")
        val KEY_AVATAR = stringPreferencesKey("user_avatar")
        val KEY_PB_URL = stringPreferencesKey("pb_url")

        const val DEFAULT_PB_URL = "http://10.0.2.2:8090"
    }

    val token: Flow<String?> = context.dataStore.data.map { it[KEY_TOKEN] }
    val userId: Flow<String?> = context.dataStore.data.map { it[KEY_USER_ID] }
    val email: Flow<String?> = context.dataStore.data.map { it[KEY_EMAIL] }
    val name: Flow<String?> = context.dataStore.data.map { it[KEY_NAME] }
    val avatar: Flow<String?> = context.dataStore.data.map { it[KEY_AVATAR] }
    val pbUrl: Flow<String?> = context.dataStore.data.map { it[KEY_PB_URL] ?: DEFAULT_PB_URL }

    suspend fun saveToken(token: String) {
        context.dataStore.edit { it[KEY_TOKEN] = token }
    }

    suspend fun saveUserId(userId: String) {
        context.dataStore.edit { it[KEY_USER_ID] = userId }
    }

    suspend fun saveEmail(email: String) {
        context.dataStore.edit { it[KEY_EMAIL] = email }
    }

    suspend fun saveName(name: String) {
        context.dataStore.edit { it[KEY_NAME] = name }
    }

    suspend fun saveAvatar(avatar: String) {
        context.dataStore.edit { it[KEY_AVATAR] = avatar }
    }

    suspend fun savePbUrl(url: String) {
        context.dataStore.edit { it[KEY_PB_URL] = url }
    }

    suspend fun clearAll() {
        context.dataStore.edit { it.clear() }
    }
}
