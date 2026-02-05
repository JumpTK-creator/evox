#!/bin/bash
while true; do
  ./scripts/task-factory.sh
  echo "⏳ Next run in 5 minutes..."
  sleep 300
done
