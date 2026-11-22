# NewView Cloud Android — free-tier-first, opt-in integration

**Status: NewView Cloud Android UI and fail-closed API are deployed to the existing Cloudflare Worker. No RackNerd or Oracle Android host or browser viewer has been deployed or verified.** The endpoint fails closed until an operator configures authentication and a working private viewer. Google Play certification or subscription pricing is not guaranteed.

## Architecture and safety

- Preserve Home, Watch, Discover, Settings navigation; Cloud Android is an optional **Watch** action.
- Worker `GET /api/android/session` returns a configured HTTPS viewer URL **only after** verified Cloudflare Access. It does not proxy ADB, execute commands, or send Android credentials.
- The **viewer must independently enforce Cloudflare Access**. Never treat access to the session metadata API as authorization for the viewer.
- Existing encrypted `NEWVIEW_SYNC_ROOMS` only synchronizes dashboard layout; keep Android credentials and control sessions separate.
- Use a dedicated VPS. ReDroid needs privileged container access and compatible Binder kernel support.

## VPS operator preflight (RackNerd x86-64 or Oracle ARM64)

1. Provision a host you actually control. For RackNerd, first **win and receive** the LowEndTalk RackNerd × AdminBolt giveaway VPS (3 vCPU, 4 GB RAM, 60 GB disk, 7 TB transfer, free for 12 months if awarded) or use an already authorized VPS. The giveaway is competitive, not a guaranteed free server; confirm the award, terms, renewal behavior, location, CPU architecture and provider policies. Alternatively use an eligible Oracle Always Free Ampere A1 instance. Neither prize eligibility nor Oracle capacity is guaranteed.
2. On a dedicated Ubuntu Linux x86-64/amd64 (RackNerd) or ARM64 (Oracle) VM, first run `bash infra/cloud-android/probe-host.sh` from a trusted checkout. Check kernel Binder support, available memory, CPU architecture, and virtualization environment **before** installing anything. If Binder is missing and cannot be supported within provider policy, stop. Only then install and configure Docker following reviewed vendor instructions with SSH keys, firewall rules and updates. AdminBolt is optional and is not required for ReDroid.
3. On the dedicated Linux host, first review `redroid/redroid:14.0.0_64only-latest`, pull it, and verify the returned image digest and actual image architecture (`amd64` on RackNerd or `arm64` on Oracle). Do not trust a mutable `-latest` tag for deployment. Record an approved immutable `redroid/redroid@sha256:<64 hex characters>` reference in `infra/cloud-android/.env` (start from `.env.example`, which deliberately contains an invalid placeholder). Do not commit `.env`.
4. Run `cd infra/cloud-android && bash preflight.sh`. It fails closed if `.env`, the locally pulled immutable image digest, host-matching amd64/arm64 architecture, Binder support, Docker, RAM or storage prerequisites are unavailable. On success, run `docker compose config --images`, then `docker compose up -d`, `docker compose ps`, and `docker compose logs --tail=100 android`. A passing preflight does **not** verify Android boots.
5. Android data persists under `infra/cloud-android/data/` and must not enter Git. Back it up securely and keep the host isolated; the container runs privileged.
6. ADB is bound to host loopback `127.0.0.1:5555`. Connect only through authenticated SSH forwarding or an approved private VPN. Never open TCP/5555 on the internet.
7. The Compose stack **does not include a browser viewer**. Choose and validate an independently secured browser-compatible viewer before configuring NewView. Remote display and mouse/keyboard controls need separate acceptance testing.

## Worker configuration — only after verified private viewer setup

Configure a dedicated Cloudflare Access application for `/api/android/session` and a separate Cloudflare Access policy at the viewer origin.

- `NEWVIEW_ANDROID_ACCESS_ISSUER`: exact issuer for that application, e.g. a verified team `https://<team>.cloudflareaccess.com`
- `NEWVIEW_ANDROID_ACCESS_AUD`: exact Access application audience
- `NEWVIEW_ANDROID_VIEWER_URL`: full HTTPS viewer URL, with no query, fragment, embedded user info or nonstandard port

Store environment-specific settings through authorized Cloudflare controls, not Git. Every hostname and `workers.dev` alternate requires bypass checks. A Cloudflare Access-protected route must be enforced at the edge as well as validated within the Worker. Metadata endpoint cannot prove the viewer is alive; `status:ready` means *configured*, not tested.

The Worker deliberately does not return access tokens or credentials, and it does not proxy or embed the viewer into NewView. The "Open private Android viewer" link opens a new tab so the viewer can authenticate independently.

## Verification

Run `npm run verify` and `node --test tests/cloud-android.test.mjs` for source, build and backend checks. Validate 503 without Access config, 401 for unsigned/expired or wrong-audience JWTs, 503 for unsafe/missing viewer URL, 200 for valid config and authentic identity, 405 for mutating methods, no CORS headers, and no leaking private URLs without authorization.

## Outstanding gates

- RackNerd giveaway: no confirmed award, account, IP, or VM access; server provisioning has not been attempted. Oracle remains an alternative.
- ReDroid kernel/boot: not verified; its image architecture and host compatibility must be checked independently.
- Private viewer: not selected, installed or verified.
- Cloudflare Access policy, viewer origin, DNS/SSH: not configured.
- Physical TV/Android WebView 113 and mobile D-pad/touch compatibility: not verified.
- Google billing and regional SKU claims: out of scope; do not use this project to bypass eligibility rules.

No production deploy, secret changes, payment or app signing is authorized by this document.

## Free Windows desktop control (private SSH only)

After Android successfully boots on the dedicated VM, use Windows PowerShell with **ADB** and [scrcpy](https://github.com/Genymobile/scrcpy) installed. These commands require two terminals.

Terminal 1 (keeps a private SSH tunnel open, replace with your authorized VM account, IP and key):

```powershell
ssh -i "$env:USERPROFILE\.ssh\id_ed25519" -N -L 15555:127.0.0.1:5555 ubuntu@YOUR_ANDROID_HOST_IP
```

Terminal 2 (while Terminal 1 is running):

```powershell
adb connect 127.0.0.1:15555
adb -s 127.0.0.1:15555 shell getprop sys.boot_completed
scrcpy -s 127.0.0.1:15555
adb disconnect 127.0.0.1:15555
```

The Android device should report `sys.boot_completed=1` before display testing. These commands do **not** provide browser/TV streaming; that requires a separately evaluated, independently authenticated gateway. Stop the tunnel when not using it. Never expose TCP 5555 publicly or configure a permanent publicly accessible ADB service.

## Release verification and traceability

The Worker build discovers its commit SHA from Cloudflare/GitHub environment variables or the checked-out Git HEAD, and makes it available at `/version` when known. Compare this with the merged GitHub commit and Cloudflare deployment after every release. If build metadata and Git history are missing, the revision remains `null`; do not invent a source revision. The code-only integration is safe to deploy before a VM exists because the Android session endpoint rejects unconfigured or unauthenticated requests.

## RackNerd giveaway eligibility and hardware caveats

Official entry thread: https://lowendtalk.com/discussion/221872/giveaway-by-adminbolt-racknerd-100x-free-vps-for-a-year-20x-lifetime-licenses-lets-talk

- This is a **community giveaway** distributed in batches, not a zero-cost checkout for everyone. Participation does not guarantee a VPS. At the time of research the host advertised up to 150 one-year winners after expanding the initial 100. Follow the current instructions in the official thread and verify that an open entry batch exists. No charge is authorized by this project.
- Advertised winner configuration: 3 vCPU, 4 GB RAM, 60 GB SSD, 7 TB monthly transfer, 1 Gbps port, one IPv4, root access. Its virtualization is KVM; the actual guest CPU architecture and available Linux Binder facilities must be checked after receipt.
- ReDroid is a Docker container, **not a nested KVM VM**. Nested virtualization and /dev/kvm are not required for the ReDroid approach, but Binder support is. A conventional Android emulator using QEMU/KVM would need separate nested-virtualization verification.
- Only one low-resolution 720×1280 Android instance is in scope for the 4 GB budget. No reliability or playable frame-rate claim is made. x86 Android may need translation for ARM-only apps; Play certification and payments cannot be guaranteed.
- Do not expose ports 5555 or any browser viewer directly to the Internet. Do not install payment-automation or SKU-manipulation scripts. Verify remote screen and input privately through SSH + scrcpy before adding an authenticated browser viewer.
- The promotion lasts only for 12 months for recipients. Plan a VM data backup and stop/migrate before the free period ends; do not enable an optional paid renewal without reviewing terms.

## Host readiness without installing Docker

Run `bash infra/cloud-android/probe-host.sh` on the **awarded** VPS. This read-only script reports guest architecture, kernel, Binder status and headroom. It does not load modules, modify firewall rules or request payment information. If the probe reports no Binder support, collect the kernel details and contact the hosting provider before choosing ReDroid. A read-only probe cannot guarantee kernel Binder can be enabled later.
