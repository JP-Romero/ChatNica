package com.chatnica.app.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.chatnica.app.data.local.PreferencesManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class SettingsViewModel(private val preferencesManager: PreferencesManager) : ViewModel() {

    private val _pbUrl = MutableStateFlow(PreferencesManager.DEFAULT_PB_URL)
    val pbUrl: StateFlow<String> = _pbUrl

    private val _savedSuccess = MutableStateFlow(false)
    val savedSuccess: StateFlow<Boolean> = _savedSuccess

    init {
        loadSettings()
    }

    fun loadSettings() {
        viewModelScope.launch {
            _pbUrl.value = preferencesManager.pbUrl.first() ?: PreferencesManager.DEFAULT_PB_URL
        }
    }

    fun savePbUrl(url: String) {
        viewModelScope.launch {
            preferencesManager.savePbUrl(url)
            _pbUrl.value = url
            _savedSuccess.value = true
        }
    }

    fun clearSavedSuccess() { _savedSuccess.value = false }

    class Factory(private val preferencesManager: PreferencesManager) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T =
            SettingsViewModel(preferencesManager) as T
    }
}
