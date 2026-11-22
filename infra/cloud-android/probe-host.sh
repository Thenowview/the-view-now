#!/usr/bin/env bash
# Read-only Android host capability report (RackNerd amd64 / Oracle arm64).
# Never load kernel modules, install packages, change firewall rules, or reveal credentials.
set -euo pipefail
if [[ "$(uname -s)" != Linux ]];then
 echo 'BLOCKED: this probe requires a Linux VPS'
 exit 2
fi
arch="$(uname -m)"
printf 'Architecture: %s\n' "$arch"
printf 'Kernel: %s\n' "$(uname -r)"
printf 'CPU count: %s\n' "$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo unknown)"
if command -v systemd-detect-virt >/dev/null 2>&1;then
 printf 'Virtualization: %s\n' "$(systemd-detect-virt 2>/dev/null || echo none)"
fi
awk '/^MemTotal:/{printf "RAM: %.1f GiB\n",$2/1048576}' /proc/meminfo
printf 'Disk space: ';df -hP . | awk 'END {print $4" free of "$2}'
printf 'Docker: ';if command -v docker >/dev/null 2>&1;then echo 'installed';else echo 'not installed';fi
binder=no
if [[ -e /dev/binder || -e /dev/binderfs/binder || -e /dev/binder-control || -e /dev/binderfs/binder-control ]] ||
   (test -r /proc/filesystems && grep -qw binder /proc/filesystems) ||
   (test -r /proc/modules && grep -q '^binder_linux ' /proc/modules);then binder=yes;fi
if [[ "$binder" == yes ]];then
 echo 'Binder: detected (Android boot still requires validation)'
else
 echo 'Binder: NOT detected'
 if command -v modinfo >/dev/null 2>&1 && modinfo binder_linux >/dev/null 2>&1;then
  echo 'Binder module metadata: available; loading remains an operator/provider decision'
 else
  echo 'Binder module metadata: not found; ask provider about Binder-capable guest kernel'
 fi
fi
if [[ "$arch" != x86_64 && "$arch" != amd64 && "$arch" != aarch64 && "$arch" != arm64 ]];then
 echo 'BLOCKED: unsupported architecture for this deployment'
 exit 2
fi
if [[ "$binder" != yes ]];then
 echo 'BLOCKED: Binder not available in running kernel. Do not launch privileged ReDroid.'
 exit 2
fi
echo 'HOST PROBE PASS: review host terms and image digest before privileged Docker deployment.'
