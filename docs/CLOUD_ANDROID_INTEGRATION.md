# NewView Cloud Android — free-tier-first, opt-in integration

**Status: NewView Cloud Android UI and fail-closed API were deployed to the existing Cloudflare Worker; no Oracle VPS, Android instance, or browser viewer has been verified or deployed.** The endpoint fails closed until an operator configures authentication and a working private viewer. Google Play certification or subscription pricing is not guaranteed.

## Architecture and safety

- Preserve Home, Watch, Discover, Settings navigation; Cloud Android is an optional **Watch** action.
- Worker `GET /api/android/session` returns a configured HTTPS viewer URL **only after** verified Cloudflare Access. It does not proxy ADB, execute commands, or send Android credentials.
- The **viewer must independently enforce Cloudflare Access**. Never treat access to the session metadata API as authorization for the viewer.
- Existing encrypted `NEWVIEW_SYNC_ROOMS` only synchronizes dashboard layout; keep Android credentials and control sessions separate.
- Use a dedicated VPS. ReDroid needs privileged container access and compatible Binder kernel support.

## Oracle ARM64 operator preflight

1. Confirm an eligible Oracle Always Free Ampere A1 instance is available and within current account quotas. Verify network, storage and billing before creation; do not assume every region has capacity.
2. On a dedicated Ubuntu ARM64 VM, install and configure Docker following reviewed vendor instructions, using SSH keys, firewall rules and regular security updates.
3. On the dedicated ARM64 host, first review `redroid/redroid:14.0.0_64only-latest`, pull it, and verify the returned image digest and actual image architecture (`arm64`). Do not trust a mutable `-latest` tag for deployment. Record an approved immutable `redroid/redroid@sha256:<64 hex characters>` reference in `infra/cloud-android/.env` (start from `.env.example`, which deliberately contains an invalid placeholder). Do not commit `.env`.
4. Run `cd infra/cloud-android && bash preflight.sh`. It fails closed if `.env`, the locally pulled immutable image digest, ARM64 architecture, Binder support, Docker, RAM or storage prerequisites are unavailable. On success, run `docker compose config --images`, then `docker compose up -d`, `docker compose ps`, and `docker compose logs --tail=100 android`. A passing preflight does **not** verify Android boots.
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

- Oracle tenant/VM: not supplied or accessible; VM provisioning not attempted.
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
ssh -i "$env:USERPROFILE\.ssh\id_ed25519" -N -L 15555:127.0.0.1:5555 ubuntu@YOUR_ORACLE_VM_IP
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
