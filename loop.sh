#!/bin/sh

while true; do
    
    TMET=https://docs.google.com/spreadsheets/d/1OztTXf_OyhsznlT6nPrvQ1XAVX824bgsSFOpybCrOFs

    rm -rf generated

    mkdir generated
    time ./command.js --out generated/index.html

    mkdir generated/tmetdev
    time ./command.js --out generated/tmetdev/index.html $TMET

    sleep 1

done
