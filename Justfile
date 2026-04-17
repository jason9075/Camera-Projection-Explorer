# Camera Projection Explorer

# Start local dev server on port 8080
serve:
    python3 -m http.server 8080

# Watch for file changes and auto-reload (open browser at http://localhost:8080)
dev:
    python3 -m http.server 8080 &
    @echo "Server running at http://localhost:8080"
    @echo "Watching for changes... (press Ctrl+C to stop)"
    find . -name '*.html' -o -name '*.css' -o -name '*.js' | entr -r python3 -m http.server 8080
