# React Native core
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * { @com.facebook.proguard.annotations.DoNotStrip *; }
-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * {
  void set*(***);
  *** get*();
}

-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Hermes
-keep class com.facebook.hermes.unicode.** { *; }

# OkHttp / networking
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Gesture handler
-keep class com.swmansion.gesturehandler.** { *; }

# SVG
-keep public class com.horcrux.svg.** { *; }

# Screens
-keep class com.swmansion.rnscreens.** { *; }

# Safe area
-keep class com.th3rdwave.safeareacontext.** { *; }

# Keychain
-keep class com.oblador.keychain.** { *; }

# Geolocation
-keep class com.reactnativecommunity.geolocation.** { *; }

# Permissions
-keep class com.zoontek.rnpermissions.** { *; }

# Suppress warnings
-dontwarn com.facebook.react.**
-dontwarn com.facebook.flipper.**
-dontwarn java.beans.**
