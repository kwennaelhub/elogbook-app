#!/bin/bash
export PATH="$HOME/.local/nodejs/bin:$PATH"
cd "$(dirname "$0")"
npx next dev --turbopack --port 3000
