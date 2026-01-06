#!/usr/bin/env bash
set -euo pipefail

dotnet test

dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura /p:Threshold=95 /p:ThresholdType=branch
