@echo off
rem KeyFlow needs Node 20+. Put the Program Files Node first on PATH (this machine defaults to Node 14).
set "PATH=C:\Program Files\nodejs;%PATH%"
node node_modules\next\dist\bin\next dev -p 3123
