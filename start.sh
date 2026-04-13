#!/bin/bash
cd server
NODE_ENV=production PORT=${PORT:-5000} node dist/index.js
