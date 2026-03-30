#!/usr/bin/env bash
        set -euo pipefail

        if [ "$#" -lt 2 ]; then
          printf 'Usage: %s <user_id> <message>
' "$0" >&2
          exit 1
        fi

        SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
        USER_ID="$1"
        shift
        MESSAGE="$*"

        cd "$REPO_ROOT"
        node --no-warnings=ExperimentalWarning --experimental-strip-types scripts/send-apns-notification.ts "$USER_ID" "$MESSAGE"
