package com.chatnica.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.chatnica.app.navigation.NavGraph
import com.chatnica.app.ui.theme.ChatNicaTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ChatNicaTheme {
                NavGraph()
            }
        }
    }
}
