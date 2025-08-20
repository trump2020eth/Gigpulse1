#!/usr/bin/env bash
set -e
eas build:list --status finished --platform android --limit 1 --json \
 | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'[]');console.log(j[0]?.artifacts?.buildUrl||'No finished build yet');});"
