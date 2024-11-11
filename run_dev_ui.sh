#!/bin/bash

docker run -it --rm -v ./ui/src/:/home/node/src/ -p 3000:3000 ghcr.io/mjsully/playlist-ui bash
