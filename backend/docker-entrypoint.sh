#!/bin/sh
set -e
redis-server --bind 127.0.0.1 --port 6379 --daemonize yes
exec node dist/index.js