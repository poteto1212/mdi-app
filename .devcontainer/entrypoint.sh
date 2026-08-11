#!/bin/bash
set -e

# Docker Volumeとしてマウントされたnode_modulesを
# nodeユーザーで使用できるようにする
if [ -d "/workspace/node_modules" ]; then
    sudo chown -R node:node /workspace/node_modules
fi

exec "$@"