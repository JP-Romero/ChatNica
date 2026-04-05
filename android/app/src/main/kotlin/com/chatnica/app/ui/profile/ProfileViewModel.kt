package com.chatnica.app.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.chatnica.app.data.local.PreferencesManager
import com.chatnica.app.data.models.User
import com.chatnica.app.data.repository.AuthRepository
import com.chatnica.app.data.api.PocketBaseService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class ProfileViewModel(
    private val service: PocketBaseService,
    private val authRepository: AuthRepository,
    private val preferencesManager: PreferencesManager
) : ViewModel() {

    private val _profile = MutableStateFlow<User?>(null)
    val profile: StateFlow<User?> = _profile

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    private val _updateSuccess = MutableStateFlow(false)
    val updateSuccess: StateFlow<Boolean> = _updateSuccess

    init {
        viewModelScope.launch {
            val userId = preferencesManager.userId.first()
            if (!userId.isNullOrBlank()) loadProfile(userId)
        }
    }

    fun loadProfile(userId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            service.getUser(userId)
                .onSuccess { _profile.value = it }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }

    fun updateProfile(name: String, bio: String, city: String) {
        viewModelScope.launch {
            _isLoading.value = true
            val userId = preferencesManager.userId.first() ?: run {
                _isLoading.value = false
                return@launch
            }
            service.updateUser(userId, name, bio, city)
                .onSuccess { updatedUser ->
                    _profile.value = updatedUser
                    preferencesManager.saveName(updatedUser.name)
                    _updateSuccess.value = true
                }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }

    fun logout(onLoggedOut: () -> Unit) {
        viewModelScope.launch {
            authRepository.logout()
            onLoggedOut()
        }
    }

    fun clearError() { _error.value = null }
    fun clearUpdateSuccess() { _updateSuccess.value = false }

    class Factory(
        private val service: PocketBaseService,
        private val authRepository: AuthRepository,
        private val preferencesManager: PreferencesManager
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T =
            ProfileViewModel(service, authRepository, preferencesManager) as T
    }
}
