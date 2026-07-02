@echo off
echo ==============================================================
echo       AKSA INFINITE CLICKZ - AUTOMATED GALLERY GENERATOR
echo ==============================================================
echo.
echo Scanning drive_images/ and images/ directories...
echo Optimizing image dimensions and file sizes...
echo Generating gallery-data.js configuration...
echo.
python process_and_generate.py
echo.
echo ==============================================================
echo Done! Refresh your browser to see your updated website.
echo ==============================================================
pause
