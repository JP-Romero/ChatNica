package com.chatnica.app.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.chatnica.app.ChatNicaApplication
import com.chatnica.app.data.api.ApiClient
import com.chatnica.app.data.api.PocketBaseService
import com.chatnica.app.data.repository.AuthRepository
import com.chatnica.app.data.repository.ContactsRepository
import com.chatnica.app.data.repository.ConversationsRepository
import com.chatnica.app.data.repository.FeedRepository
import com.chatnica.app.ui.auth.AuthViewModel
import com.chatnica.app.ui.auth.LoginScreen
import com.chatnica.app.ui.chat.ChatScreen
import com.chatnica.app.ui.chat.ChatViewModel
import com.chatnica.app.ui.contacts.ContactsScreen
import com.chatnica.app.ui.contacts.ContactsViewModel
import com.chatnica.app.ui.conversations.ConversationsScreen
import com.chatnica.app.ui.conversations.ConversationsViewModel
import com.chatnica.app.ui.feed.FeedScreen
import com.chatnica.app.ui.feed.FeedViewModel
import com.chatnica.app.ui.profile.ProfileScreen
import com.chatnica.app.ui.profile.ProfileViewModel
import com.chatnica.app.ui.settings.SettingsScreen
import com.chatnica.app.ui.settings.SettingsViewModel

@Composable
fun NavGraph() {
    val navController = rememberNavController()
    val app = ChatNicaApplication.instance
    val prefsManager = app.preferencesManager

    // Shared dependencies
    val apiClient = ApiClient(prefsManager)
    val service = PocketBaseService(apiClient)
    val authRepository = AuthRepository(service, prefsManager)
    val conversationsRepository = ConversationsRepository(service)
    val contactsRepository = ContactsRepository(service)
    val feedRepository = FeedRepository(service)

    // Determine start destination based on saved token
    val token by prefsManager.token.collectAsState(initial = null)
    val startDestination = if (token.isNullOrBlank()) "login" else "conversations"

    NavHost(navController = navController, startDestination = startDestination) {

        composable("login") {
            val authViewModel: AuthViewModel = viewModel(
                factory = object : androidx.lifecycle.ViewModelProvider.Factory {
                    @Suppress("UNCHECKED_CAST")
                    override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T =
                        AuthViewModel(authRepository) as T
                }
            )
            LoginScreen(navController = navController, viewModel = authViewModel)
        }

        composable("conversations") {
            val vm: ConversationsViewModel = viewModel(
                factory = ConversationsViewModel.Factory(conversationsRepository, prefsManager)
            )
            ConversationsScreen(navController = navController, viewModel = vm)
        }

        composable(
            route = "chat/{conversationId}",
            arguments = listOf(navArgument("conversationId") { type = NavType.StringType })
        ) { backStackEntry ->
            val conversationId = backStackEntry.arguments?.getString("conversationId") ?: ""
            val vm: ChatViewModel = viewModel(
                factory = ChatViewModel.Factory(conversationsRepository, prefsManager)
            )
            ChatScreen(
                navController = navController,
                viewModel = vm,
                conversationId = conversationId,
                conversationName = "Chat"
            )
        }

        composable("contacts") {
            val vm: ContactsViewModel = viewModel(
                factory = ContactsViewModel.Factory(contactsRepository, prefsManager)
            )
            ContactsScreen(navController = navController, viewModel = vm)
        }

        composable("feed") {
            val vm: FeedViewModel = viewModel(
                factory = FeedViewModel.Factory(feedRepository, prefsManager)
            )
            FeedScreen(navController = navController, viewModel = vm)
        }

        composable("profile") {
            val vm: ProfileViewModel = viewModel(
                factory = ProfileViewModel.Factory(service, authRepository, prefsManager)
            )
            ProfileScreen(navController = navController, viewModel = vm)
        }

        composable("settings") {
            val vm: SettingsViewModel = viewModel(
                factory = SettingsViewModel.Factory(prefsManager)
            )
            SettingsScreen(navController = navController, viewModel = vm)
        }
    }
}
