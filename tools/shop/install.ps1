# 오늘밥상물가 상품 갱신을 매일 아침 자동으로 돌리도록 등록해요
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$script = Join-Path $Here 'bapsang-shop.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Daily -At 9:40am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries
Register-ScheduledTask -TaskName 'BapsangShop' -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Write-Host '매일 오전 9시 40분에 자동으로 돌도록 등록했어요. (컴퓨터가 꺼져 있었으면 켜질 때 돌아요)'
Write-Host '지금 한 번 바로 실행해 볼게요...'
& $script
Write-Host ''
Read-Host '엔터를 누르면 닫혀요'
