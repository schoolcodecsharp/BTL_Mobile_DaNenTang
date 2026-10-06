param([Parameter(Mandatory=$true)][string]$BackendUrl)
$ErrorActionPreference = 'Stop'
$backend = [Uri]$BackendUrl
if (!$backend.IsAbsoluteUri -or $backend.Scheme -notin @('http', 'https') -or $backend.UserInfo) {
  throw 'BackendUrl must be an absolute HTTP(S) URL without credentials.'
}
$frontendRoot = Split-Path $PSScriptRoot -Parent
$androidRoot = Join-Path $frontendRoot 'android'
$manifestPath = Join-Path $androidRoot 'app/src/main/AndroidManifest.xml'
if (!(Test-Path $manifestPath)) { throw 'Generate the Android project with npx expo prebuild --platform android first.' }
# Permit HTTP only for the chosen internal backend host.
[xml]$manifest = Get-Content -LiteralPath $manifestPath
$manifest.manifest.application.SetAttribute('networkSecurityConfig', 'http://schemas.android.com/apk/res/android', '@xml/local_network_security_config') | Out-Null
$manifest.Save($manifestPath)
$releaseManifestPath = Join-Path $androidRoot 'app/src/release/AndroidManifest.xml'
if (Test-Path $releaseManifestPath) {
  [xml]$releaseManifest = Get-Content -LiteralPath $releaseManifestPath
  $releaseManifest.manifest.application.SetAttribute('networkSecurityConfig', 'http://schemas.android.com/apk/res/android', '@xml/local_network_security_config') | Out-Null
  $releaseManifest.Save($releaseManifestPath)
}
$xmlRoot = Join-Path $androidRoot 'app/src/main/res/xml'
New-Item -ItemType Directory -Force $xmlRoot | Out-Null
$domain = [System.Security.SecurityElement]::Escape($backend.Host)
Set-Content -LiteralPath (Join-Path $xmlRoot 'local_network_security_config.xml') -Value "<network-security-config><base-config cleartextTrafficPermitted=`"false`"/><domain-config cleartextTrafficPermitted=`"true`"><domain includeSubdomains=`"false`">$domain</domain></domain-config></network-security-config>"
$tempRoot = Join-Path $androidRoot '.build-tmp'
New-Item -ItemType Directory -Force $tempRoot | Out-Null
$previousApi = $env:EXPO_PUBLIC_API_URL
$previousJavaOptions = $env:JAVA_TOOL_OPTIONS
try {
  $env:EXPO_PUBLIC_API_URL = $BackendUrl.TrimEnd('/')
  $env:JAVA_TOOL_OPTIONS = "$previousJavaOptions -Djdk.net.unixdomain.tmpdir=$tempRoot".Trim()
  Push-Location $androidRoot
  try {
    # Gradle does not track EXPO_PUBLIC_API_URL as a bundle task input.
    & .\gradlew.bat :app:createBundleReleaseJsAndAssets --rerun assembleRelease --no-daemon --console=plain
    if ($LASTEXITCODE -ne 0) { throw "APK build failed (exit $LASTEXITCODE)." }
  } finally { Pop-Location }
} finally {
  $env:EXPO_PUBLIC_API_URL = $previousApi
  $env:JAVA_TOOL_OPTIONS = $previousJavaOptions
}
Write-Output (Join-Path $androidRoot 'app/build/outputs/apk/release/app-release.apk')
