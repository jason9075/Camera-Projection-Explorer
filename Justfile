# Camera Projection Explorer

port := "8080"

# Start local dev server on a configurable port
serve PORT=port:
    python3 -m http.server {{PORT}}

# Watch for file changes and restart the server on a configurable port
dev PORT=port:
    @echo "Server running at http://localhost:{{PORT}}"
    @echo "Watching for changes... (press Ctrl+C to stop)"
    find . -name '*.html' -o -name '*.css' -o -name '*.js' | entr -r python3 -m http.server {{PORT}}
