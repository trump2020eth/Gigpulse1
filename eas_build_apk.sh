#!/usr/bin/env bash
set -e
npm i -g eas-cli
npm i
if ! eas whoami >/dev/null 2>&1; then
  eas login
fi
eas build -p android --profile preview
