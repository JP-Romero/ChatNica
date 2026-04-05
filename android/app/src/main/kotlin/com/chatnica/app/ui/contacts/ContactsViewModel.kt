package com.chatnica.app.ui.contacts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.chatnica.app.data.local.PreferencesManager
import com.chatnica.app.data.models.Contact
import com.chatnica.app.data.models.User
import com.chatnica.app.data.repository.ContactsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class ContactsViewModel(
    private val repository: ContactsRepository,
    private val preferencesManager: PreferencesManager
) : ViewModel() {

    private val _contacts = MutableStateFlow<List<Contact>>(emptyList())
    val contacts: StateFlow<List<Contact>> = _contacts

    private val _searchResults = MutableStateFlow<List<User>>(emptyList())
    val searchResults: StateFlow<List<User>> = _searchResults

    private val _pendingRequests = MutableStateFlow<List<Contact>>(emptyList())
    val pendingRequests: StateFlow<List<Contact>> = _pendingRequests

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    init {
        loadContacts()
    }

    fun loadContacts() {
        viewModelScope.launch {
            _isLoading.value = true
            val userId = preferencesManager.userId.first() ?: run {
                _isLoading.value = false
                return@launch
            }
            repository.getContacts(userId)
                .onSuccess { allContacts ->
                    _contacts.value = allContacts.filter { it.status == "accepted" }
                    _pendingRequests.value = allContacts.filter {
                        it.status == "pending" && it.recipient == userId
                    }
                }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }

    fun searchUsers(query: String) {
        if (query.isBlank()) {
            _searchResults.value = emptyList()
            return
        }
        viewModelScope.launch {
            repository.searchUsers(query)
                .onSuccess { _searchResults.value = it }
                .onFailure { _error.value = it.message }
        }
    }

    fun sendRequest(recipientId: String) {
        viewModelScope.launch {
            val requesterId = preferencesManager.userId.first() ?: return@launch
            repository.sendContactRequest(requesterId, recipientId)
                .onFailure { _error.value = it.message }
        }
    }

    fun accept(contactId: String) {
        viewModelScope.launch {
            repository.acceptContact(contactId)
                .onSuccess { loadContacts() }
                .onFailure { _error.value = it.message }
        }
    }

    fun reject(contactId: String) {
        viewModelScope.launch {
            repository.rejectContact(contactId)
                .onSuccess { loadContacts() }
                .onFailure { _error.value = it.message }
        }
    }

    fun clearError() { _error.value = null }

    class Factory(
        private val repository: ContactsRepository,
        private val preferencesManager: PreferencesManager
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T =
            ContactsViewModel(repository, preferencesManager) as T
    }
}
