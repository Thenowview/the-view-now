#!/usr/bin/env bash
# Read-only compatibility checks. No kernel or system changes.
set -euo pipefail
fail=0
if [[ "$(uname -s)" != Linux ]];then echo 'ERROR: Linux required';exit 1;fi
case "$(uname -m)" in aarch64|arm64)echo 'PASS: ARM64 Linux';;*)echo 'ERROR: ARM64 host required';fail=1;;esac
if ! command -v docker >/dev/null 2>&1;then echo 'ERROR: Docker unavailable';fail=1
elif ! docker info >/dev/null 2>&1;then echo 'ERROR: Docker daemon inaccessible';fail=1
else echo 'PASS: Docker available';fi
if [[ -e /dev/binder || -e /dev/binderfs/binder || -e /dev/binder-control || -e /dev/binderfs/binder-control ]] ||
 (test -r /proc/filesystems && grep -qw binder /proc/filesystems) ||
 (test -r /proc/modules && grep -q '^binder_linux ' /proc/modules);then
 echo 'PASS: possible Binder support (boot still requires verification)'
else echo 'ERROR: Binder support not detected';fail=1;fi
mem_kb=$(awk '/^MemTotal:/{print $2}' /proc/meminfo)
if [[ "$mem_kb" -ge 3145728 ]];then echo 'PASS: at least 3 GiB RAM';else echo 'ERROR: insufficient RAM';fail=1;fi
free_kb=$(df -Pk . | awk 'END{print $4}')
if [[ "$free_kb" -ge 4194304 ]];then echo 'PASS: at least 4 GiB free disk';else echo 'ERROR: insufficient free disk';fail=1;fi
if [[ $fail -ne 0 ]];then echo 'BLOCKED: resolve prerequisites before starting';exit 1;fi
echo 'PREFLIGHT PASS: check OCI free quotas and firewall before deployment.'
