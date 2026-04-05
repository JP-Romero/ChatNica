package com.chatnica.app.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val DarkColorScheme = darkColorScheme(
    primary = Teal500,
    onPrimary = OnDarkSurface,
    primaryContainer = Teal700,
    onPrimaryContainer = OnDarkSurface,
    secondary = Blue500,
    onSecondary = OnDarkSurface,
    secondaryContainer = Blue700,
    onSecondaryContainer = OnDarkSurface,
    background = DarkBackground,
    onBackground = OnDarkSurface,
    surface = DarkSurface,
    onSurface = OnDarkSurface,
    surfaceVariant = DarkSurfaceVariant,
    onSurfaceVariant = OnDarkSurfaceVariant,
    error = ErrorColor,
    onError = OnDarkSurface
)

private val LightColorScheme = lightColorScheme(
    primary = Teal700,
    onPrimary = OnDarkSurface,
    primaryContainer = Teal200,
    onPrimaryContainer = DarkBackground,
    secondary = Blue700,
    onSecondary = OnDarkSurface,
    secondaryContainer = Blue200,
    onSecondaryContainer = DarkBackground,
    background = OnDarkSurface,
    onBackground = DarkBackground,
    surface = OnDarkSurface,
    onSurface = DarkBackground,
    surfaceVariant = OnDarkSurfaceVariant,
    onSurfaceVariant = DarkBackground,
    error = ErrorColor
)

@Composable
fun ChatNicaTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
