#!/bin/bash
set -e

echo "Starting ChillImport using '$GITHUB_SHA'..."

docker run -d -p 8000:8000 fraunhoferiosb/chillimport:"$GITHUB_SHA"
sleep 10
printf "Chillimport started \n"

tmpfile=$(mktemp /tmp/docker_test_header_XXXXXX.txt)

url=http://localhost:8000
curl "$url" -I -o tmpfile -s

cat tmpfile

success=false

if grep -q 'HTTP/1.1 200' tmpfile; then
  printf "OK \n"
  success=true
else
  printf "Cannot connect to Chillimport \n"
  success=false
fi

rm "$tmpfile"

docker stop "$(docker ps -a -q)"
docker rm "$(docker ps -a -q)"

if [ "$success" == false ]; then
  printf "exit \n"
  exit 1
fi
