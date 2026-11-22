#!/usr/bin/env bash
# Read-only compatibility checks. No kernel or system changes.
set -euo pipefail
fail=0
# Compose resolves a reviewed digest from .env; never silently follow mutable tags.
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if [[ ! -f "$script_dir/.env" ]];then
 echo 'ERROR: .env absent; set REDROID_IMAGE to an approved image digest'
 fail=1
elif ! grep -Eq '^REDROID_IMAGE=redroid/redroid@sha256:[[:xdigit:]]{64}if [[ "$(uname -s)" != Linux ]];then echo 'ERROR: Linux required';exit 1;fi
case "$(uname -m)" in aarch64|arm64)echo 'PASS: ARM64 Linux';;*)echo 'ERROR: ARM64 host required';fail=1;;esac
if ! command -v docker >/dev/null 2>&1;then echo 'ERROR: Docker unavailable';fail=1
elif ! docker info >/dev/null 2>&1;then echo 'ERROR: Docker daemon inaccessible';fail=1
else
 echo 'PASS: Docker available'
 image_ref="$(sed -n 's/^REDROID_IMAGE=//p' "$script_dir/.env" 2>/dev/null | tail -n 1)"
 if [[ "$image_ref" =~ ^redroid/redroid@sha256:[a-fA-F0-9]{64}$ ]];then
  if ! arch="$(docker image inspect "$image_ref" --format '{{.Architecture}}' 2>/dev/null)";then
   echo 'ERROR: approved digest is not pulled locally; inspect and pull it before preflight';fail=1
  elif [[ "$arch" != arm64 ]];then
   echo "ERROR: image architecture is $arch, not arm64";fail=1
  else echo 'PASS: approved local image is ARM64';fi
 fi
fi
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
 "$script_dir/.env";then
 echo 'ERROR: REDROID_IMAGE must be redroid/redroid@sha256:<64 hex chars>'
 fail=1
fi
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
